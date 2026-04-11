const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
exports.register = async (req, res) => {
  const { email, password, phone } = req.body;

  try {
    // 1. Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Insert User (Default role: 'agent')
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, role, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, passwordHash, 'agent', phone]
    );

    const user = newUser.rows[0];

    // 4. Create Wallet for this user automatically
    await pool.query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    // 5. Generate Token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find User
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 3. Generate Token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── FORGOT PASSWORD ─────────────────────────────────────────
// Generate a password reset token and send via email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiry

    await pool.query(
      `INSERT INTO password_resets (user_id, reset_type, token, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'account', resetToken, expiresAt]
    );

    // Send reset email
    const emailService = require('../services/emailService');
    const frontendUrl = (process.env.FRONTEND_URL || req.headers.origin || req.get('origin') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const resetLink = `${frontendUrl}/forgot-password?token=${resetToken}`;
    
    const helpCenterEmailResult = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'");
    const helpCenterEmail = helpCenterEmailResult.rows[0]?.setting_value;
    await emailService({
      to: user.email,
      subject: '🔐 Reset Your Password',
      html: `
        <div style="font-family:Arial;padding:2rem;background:#f3f4f6;border-radius:10px;">
          <h2>Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;padding:0.75rem 1.5rem;background:#3b82f6;color:white;text-decoration:none;border-radius:0.5rem;font-weight:600;">Reset Password</a>          <p style="margin-top:1rem;color:#475569;font-size:0.9rem;line-height:1.5;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;"><a href="${resetLink}" style="color:#2563eb;text-decoration:none;">${resetLink}</a></p>          ${helpCenterEmail ? `<p style="margin-top:1rem;color:#334155;">If you have any complaint, email <a href=\"mailto:${helpCenterEmail}\" style=\"color:#2563eb;\">${helpCenterEmail}</a> and wait for feedback.</p>` : ''}
          <p style="color:#6b7280;font-size:0.85rem;margin-top:1rem;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── RESET PASSWORD ──────────────────────────────────────────
// Verify token and reset password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const reset = resetResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, reset.user_id]
    );

    // Mark reset as used
    await pool.query(
      'UPDATE password_resets SET is_used = true WHERE id = $1',
      [reset.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── VERIFY RESET TOKEN ──────────────────────────────────────
// Check if token is valid (before showing form)
exports.verifyResetToken = async (req, res) => {
  const { token } = req.query;

  try {
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};