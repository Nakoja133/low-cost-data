const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const sendEmail = require('../services/emailService');

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Login attempt:', email);

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('❌ Invalid password for:', email);
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
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        phone: user.phone,
        whatsapp_number: user.whatsapp_number,
        store_slug: user.store_slug,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// UPDATE PROFILE (Username, Phone, WhatsApp)
// ============================================
router.put('/profile', auth, async (req, res) => {
  const userId = req.user.id;
  const { username, phone, whatsapp_number, whatsapp_group_link } = req.body;

  console.log('📝 Update Profile Request:');
  console.log('  User ID:', userId);
  console.log('  Username:', username);
  console.log('  Phone:', phone);
  console.log('  WhatsApp:', whatsapp_number);

  try {
    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username), 
           phone = COALESCE($2, phone),
           whatsapp_number = COALESCE($3, whatsapp_number),
           whatsapp_group_link = COALESCE($4, whatsapp_group_link),
           updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, email, username, phone, whatsapp_number, whatsapp_group_link, role, store_slug`,
      [username, phone, whatsapp_number, whatsapp_group_link, userId]
    );

    console.log('✅ Profile updated successfully');

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
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

  console.log('🔐 Change Password Request:');
  console.log('  User ID:', userId);

  try {
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    
    if (!validPassword) {
      console.log('❌ Current password incorrect');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const newHashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHashedPassword, userId]
    );
    
    console.log('✅ Password changed successfully');

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

  console.log('📧 Email Change Request:');
  console.log('  User ID:', userId);
  console.log('  Current Email:', req.user.email);
  console.log('  New Email:', new_email);

  try {
    const userResult = await pool.query(
      'SELECT password_hash, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    
    if (!validPassword) {
      console.log('❌ Current password incorrect');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [new_email]);
    if (existing.rows.length > 0) {
      console.log('❌ Email already in use:', new_email);
      return res.status(400).json({ error: 'Email already in use' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    console.log('✅ Verification code generated:', code);
    console.log('⏰ Code expires at:', expires);

    await pool.query(
      `INSERT INTO email_change_requests (user_id, new_email, verification_code, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE 
       SET new_email = $2, verification_code = $3, expires_at = $4, created_at = NOW()`,
      [userId, new_email, code, expires]
    );

    const emailResult = await sendEmail({
      to: new_email,
      subject: '🔐 Verify Email Change - Low-Cost Data Bundles',
      text: `Your verification code is: ${code}. This code expires in 15 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; }
            .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 1rem; overflow: hidden; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 2.5rem; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 2.5rem; }
            .code-box { background: #f9fafb; border: 2px dashed #6366f1; border-radius: 0.75rem; padding: 1.5rem; text-align: center; margin: 1.5rem 0; }
            .code { font-size: 2.5rem; font-weight: 700; color: #6366f1; letter-spacing: 0.5rem; }
            .footer { background: #f9fafb; padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
              <p>Your verification code:</p>
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              <p>⏰ This code expires in <strong>15 minutes</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 Low-Cost Data Bundles</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send verification email:', emailResult.error);
      return res.status(500).json({ 
        error: 'Failed to send verification email.',
        debug: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    console.log('✅ Verification email sent to:', new_email);

    res.json({ 
      message: 'Verification code sent to new email. Please check your inbox.',
      expires_in: '15 minutes'
    });

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

  console.log('🔐 Confirm Email Change:');
  console.log('  User ID:', userId);
  console.log('  Code:', code);

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
      console.log('❌ Invalid or expired code');
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const new_email = result.rows[0].new_email;
    const old_email = req.user.email;

    await pool.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [new_email, userId]
    );

    await pool.query('DELETE FROM email_change_requests WHERE user_id = $1', [userId]);

    console.log('✅ Email changed successfully:', old_email, '→', new_email);

    await sendEmail({
      to: new_email,
      subject: '✅ Email Changed Successfully',
      text: `Your email has been changed from ${old_email} to ${new_email}.`,
      html: `
        <div style="font-family: Arial; padding: 2rem; background: #d1fae5;">
          <h1 style="color: #10b981;">✅ Email Changed Successfully</h1>
          <p>Old: ${old_email}</p>
          <p>New: ${new_email}</p>
        </div>
      `,
    });

    res.json({ 
      message: 'Email updated successfully',
      old_email,
      new_email 
    });

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
      'SELECT id, email, username, phone, whatsapp_number, whatsapp_group_link, role, store_slug, created_at FROM users WHERE id = $1',
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

module.exports = router;