const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── GET LOCK ACTIVITIES STATUS ──────────────────────────────
exports.getLockActivitiesStatus = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'SELECT is_enabled, lock_password_hash FROM lock_activities WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      // First time - create record with disabled status
      await pool.query(
        'INSERT INTO lock_activities (user_id, is_enabled) VALUES ($1, $2)',
        [user_id, false]
      );
      return res.json({ is_enabled: false, first_time: true, password_set: false });
    }

    const lockAct = result.rows[0];
    res.json({ 
      is_enabled: lockAct.is_enabled, 
      first_time: false, 
      password_set: !!lockAct.lock_password_hash 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── SET LOCK ACTIVITIES PASSWORD ────────────────────────────
// Requires account password + new lock activities password
exports.setLockPassword = async (req, res) => {
  const { accountPassword, lockPassword, confirmPassword } = req.body;
  const user_id = req.user.id;

  try {
    // 1. Verify account password
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(accountPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Account password is incorrect' });
    }

    // 2. Validate lock password
    if (!lockPassword || lockPassword.length < 4) {
      return res.status(400).json({ error: 'Lock password must be at least 4 characters' });
    }

    if (lockPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Lock passwords do not match' });
    }

    // 3. Hash and save lock password
    const salt = await bcrypt.genSalt(10);
    const lockPasswordHash = await bcrypt.hash(lockPassword, salt);

    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [lockPasswordHash, user_id]
    );

    res.json({ message: 'Lock password set successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── CHANGE LOCK PASSWORD ────────────────────────────────────
// Requires old lock password + new lock password
exports.changeLockPassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user_id = req.user.id;

  try {
    // 1. Get current lock password hash
    const result = await pool.query(
      'SELECT lock_password_hash FROM lock_activities WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].lock_password_hash) {
      return res.status(400).json({ error: 'Lock password not set' });
    }

    // 2. Verify old password
    const passwordMatch = await bcrypt.compare(oldPassword, result.rows[0].lock_password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Old lock password is incorrect' });
    }

    // 3. Validate new password
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // 4. Hash and save new lock password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [newPasswordHash, user_id]
    );

    res.json({ message: 'Lock password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── TOGGLE LOCK ACTIVITIES ──────────────────────────────────
exports.toggleLockActivities = async (req, res) => {
  const { lockPassword, enabled } = req.body;
  const user_id = req.user.id;

  try {
    // 1. Get lock activities record
    const result = await pool.query(
      'SELECT * FROM lock_activities WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lock activities not initialized' });
    }

    const lockAct = result.rows[0];

    // 2. Check if lock password has been set - ALWAYS require password to toggle
    if (!lockAct.lock_password_hash) {
      return res.status(400).json({ error: 'Lock password not set. Please set up a lock password first in Lock Activities settings.' });
    }

    // 3. Verify lock password
    if (!lockPassword) {
      return res.status(400).json({ error: 'Lock password is required to toggle lock activities' });
    }

    const passwordMatch = await bcrypt.compare(lockPassword, lockAct.lock_password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Lock password is incorrect' });
    }

    // 4. Update status
    await pool.query(
      `UPDATE lock_activities SET is_enabled = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [enabled, user_id]
    );

    res.json({ message: `Lock activities ${enabled ? 'enabled' : 'disabled'}`, is_enabled: enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── VERIFY LOCK PASSWORD ────────────────────────────────────
// Used when accessing protected pages
exports.verifyLockPassword = async (req, res) => {
  const { lockPassword } = req.body;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'SELECT lock_password_hash FROM lock_activities WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].lock_password_hash) {
      return res.status(400).json({ error: 'Lock password not set' });
    }

    const passwordMatch = await bcrypt.compare(lockPassword, result.rows[0].lock_password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Lock password is incorrect' });
    }

    // Generate temporary access token (valid for 30 minutes)
    const tempToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1800000); // 30 minutes

    // Store in session/cache if needed, or return to client to include in header
    res.json({ message: 'Verified', tempToken, expiresAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── FORGOT LOCK PASSWORD ────────────────────────────────────
exports.forgotLockPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      `INSERT INTO password_resets (user_id, reset_type, token, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'lock_activities', resetToken, expiresAt]
    );

    // Send reset email
    const emailService = require('../services/emailService');
    const frontendUrl = (process.env.FRONTEND_URL || req.headers.origin || req.get('origin') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const resetLink = `${frontendUrl}/reset-lock-password?token=${resetToken}`;
    
    const helpCenterEmailResult = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'");
    const helpCenterEmail = helpCenterEmailResult.rows[0]?.setting_value;
    await emailService({
      to: user.email,
      subject: '🔐 Reset Your Lock Activities Password',
      html: `
        <div style="font-family:Arial;padding:2rem;background:#f3f4f6;border-radius:10px;">
          <h2>Reset Lock Activities Password</h2>
          <p>Click the button below to reset your lock activities password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;padding:0.75rem 1.5rem;background:#3b82f6;color:white;text-decoration:none;border-radius:0.5rem;font-weight:600;">Reset Lock Password</a>
          ${helpCenterEmail ? `<p style="margin-top:1rem;color:#334155;">If you have any complaint, email <a href=\"mailto:${helpCenterEmail}\" style=\"color:#2563eb;\">${helpCenterEmail}</a> and wait for feedback.</p>` : ''}
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

// ── RESET LOCK PASSWORD ─────────────────────────────────────
exports.resetLockPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE token = $1 AND reset_type = 'lock_activities' AND is_used = false AND expires_at > NOW()`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const reset = resetResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update lock password
    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1 
       WHERE user_id = $2`,
      [passwordHash, reset.user_id]
    );

    // Mark reset as used
    await pool.query(
      'UPDATE password_resets SET is_used = true WHERE id = $1',
      [reset.id]
    );

    res.json({ message: 'Lock password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
