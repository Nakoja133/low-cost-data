const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const pool       = require('../config/database');
const auth       = require('../middleware/auth');
const sendEmail  = require('../services/emailService');

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔐 Login attempt:', email);

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      const helpR = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'");
      const helpEmail = helpR.rows[0]?.setting_value || process.env.EMAIL_FROM || '';
      const contact = helpEmail ? ` Contact help center at ${helpEmail}.` : ' Contact admin for help.';
      return res.status(403).json({ error: `Your account is suspended due to inactivity.${contact}`, helpCenterEmail: helpEmail });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful:', email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id:               user.id,
        email:            user.email,
        role:             user.role,
        username:         user.username,
        phone:            user.phone,
        whatsapp_number:  user.whatsapp_number,
        store_slug:       user.store_slug,
        store_name:       user.store_name,        // ✅ needed for store header
        terms_accepted:   user.terms_accepted,    // ✅ needed for first-login terms modal
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REGISTER
// ============================================
router.post('/register', async (req, res) => {
  const { email, password, phone } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUserResult = await pool.query(
      'INSERT INTO users (email, password_hash, role, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, passwordHash, 'agent', phone || null]
    );

    const newUser = newUserResult.rows[0];

    await pool.query('INSERT INTO wallets (user_id) VALUES ($1)', [newUser.id]);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        username: newUser.username,
        phone: newUser.phone,
        whatsapp_number: newUser.whatsapp_number,
        store_slug: newUser.store_slug,
        store_name: newUser.store_name,
        terms_accepted: newUser.terms_accepted,
      },
    });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// UPDATE PROFILE
// ============================================
router.put('/profile', auth, async (req, res) => {
  const userId = req.user.id;
  const { username, phone, whatsapp_number, whatsapp_group_link } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET username            = COALESCE($1, username),
           phone               = COALESCE($2, phone),
           whatsapp_number     = COALESCE($3, whatsapp_number),
           whatsapp_group_link = COALESCE($4, whatsapp_group_link),
           updated_at          = NOW()
       WHERE id = $5
       RETURNING id, email, username, phone, whatsapp_number, whatsapp_group_link, role, store_slug, store_name, terms_accepted`,
      [username, phone, whatsapp_number, whatsapp_group_link, userId]
    );

    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('❌ Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// ============================================
// CHANGE PASSWORD
// ============================================
router.put('/change-password', auth, async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('❌ Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password', details: err.message });
  }
});

// ============================================
// REQUEST EMAIL CHANGE (Step 1 of 2)
// ============================================
router.post('/request-email-change', auth, async (req, res) => {
  const userId = req.user.id;
  const { new_email, current_password } = req.body;

  try {
    const userResult = await pool.query('SELECT password_hash, email FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [new_email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO email_change_requests (user_id, new_email, verification_code, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET new_email = $2, verification_code = $3, expires_at = $4, created_at = NOW()`,
      [userId, new_email, code, expires]
    );

    const emailResult = await sendEmail({
      to:      new_email,
      subject: '🔐 Verify Email Change — Low-Cost Data Bundles',
      text:    `Your verification code is: ${code}. Expires in 15 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:2rem;text-align:center;color:white;">
            <h2 style="margin:0;font-size:1.4rem;">🔐 Email Verification</h2>
          </div>
          <div style="padding:2rem;">
            <p style="color:#374151;">Your verification code for changing your email:</p>
            <div style="background:#f9fafb;border:2px dashed #6366f1;border-radius:10px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
              <span style="font-size:2.5rem;font-weight:700;color:#6366f1;letter-spacing:0.5rem;">${code}</span>
            </div>
            <p style="color:#6b7280;font-size:0.875rem;">⏰ Expires in <strong>15 minutes</strong>. Do not share this code.</p>
          </div>
          <div style="background:#f9fafb;padding:1rem;text-align:center;color:#9ca3af;font-size:0.8rem;">© 2026 Low-Cost Data Bundles</div>
        </div>
      `,
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send verification email.' });
    }

    res.json({ message: 'Verification code sent to new email. Check your inbox.', expires_in: '15 minutes' });
  } catch (err) {
    console.error('❌ Request email change error:', err.message);
    res.status(500).json({ error: 'Failed to request email change', details: err.message });
  }
});

// ============================================
// CONFIRM EMAIL CHANGE (Step 2 of 2)
// ============================================
router.post('/confirm-email-change', auth, async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  try {
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }

    const result = await pool.query(
      `SELECT * FROM email_change_requests
       WHERE user_id = $1 AND verification_code = $2 AND expires_at > NOW()`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const new_email = result.rows[0].new_email;
    const old_email = req.user.email;

    await pool.query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [new_email, userId]);
    await pool.query('DELETE FROM email_change_requests WHERE user_id = $1', [userId]);

    await sendEmail({
      to:      new_email,
      subject: '✅ Email Changed Successfully',
      text:    `Your email was changed from ${old_email} to ${new_email}.`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:2rem;background:#d1fae5;border-radius:10px;">
          <h2 style="color:#065f46;">✅ Email Changed</h2>
          <p>Old: ${old_email}</p>
          <p>New: <strong>${new_email}</strong></p>
        </div>
      `,
    });

    res.json({ message: 'Email updated successfully', old_email, new_email });
  } catch (err) {
    console.error('❌ Confirm email change error:', err.message);
    res.status(500).json({ error: 'Failed to confirm email change', details: err.message });
  }
});

// ============================================
// GET CURRENT USER PROFILE
// ============================================
router.get('/profile', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, email, username, phone, whatsapp_number, whatsapp_group_link,
              role, store_slug, store_name, terms_accepted, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ============================================
// FORGOT PASSWORD
// ============================================
router.post('/forgot-password', async (req, res) => {
  const authController = require('../controllers/authController');
  await authController.forgotPassword(req, res);
});

// ============================================
// RESET PASSWORD
// ============================================
router.post('/reset-password', async (req, res) => {
  const authController = require('../controllers/authController');
  await authController.resetPassword(req, res);
});

// ============================================
// VERIFY RESET TOKEN
// ============================================
router.get('/verify-reset-token', async (req, res) => {
  const authController = require('../controllers/authController');
  await authController.verifyResetToken(req, res);
});

module.exports = router;