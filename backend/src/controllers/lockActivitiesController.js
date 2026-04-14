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
      password_set: !!lockAct.lock_password_hash,
    });
  } catch (err) {
    console.error('getLockActivitiesStatus error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── SET LOCK ACTIVITIES PASSWORD ────────────────────────────
// Requires account password + new lock activities password
exports.setLockPassword = async (req, res) => {
  const { accountPassword, lockPassword, confirmPassword } = req.body;
  const user_id = req.user.id;
  
  // Trim to prevent invisible-whitespace mismatches
  const trimmedLockPassword = (lockPassword || '').trim();
  const trimmedConfirmPassword = (confirmPassword || '').trim();

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
    if (!trimmedLockPassword || trimmedLockPassword.length < 4) {
      return res.status(400).json({ error: 'Lock password must be at least 4 characters' });
    }

    if (trimmedLockPassword !== trimmedConfirmPassword) {
      return res.status(400).json({ error: 'Lock passwords do not match' });
    }

    // 3. Hash and save lock password
    const salt = await bcrypt.genSalt(10);
    const lockPasswordHash = await bcrypt.hash(trimmedLockPassword, salt);

    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [lockPasswordHash, user_id]
    );

    res.json({ message: 'Lock password set successfully' });
  } catch (err) {
    console.error('setLockPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── CHANGE LOCK PASSWORD ────────────────────────────────────
// Requires old lock password + new lock password
exports.changeLockPassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user_id = req.user.id;
  const trimmedNew = (newPassword || '').trim();
  const trimmedConfirm = (confirmPassword || '').trim();

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
    if (!trimmedNew || trimmedNew.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    if (trimmedNew !== trimmedConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // 4. Hash and save new lock password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(trimmedNew, salt);

    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [newPasswordHash, user_id]
    );

    res.json({ message: 'Lock password changed successfully' });
  } catch (err) {
    console.error('changeLockPassword error:', err);
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
      return res.status(400).json({
        error: 'Lock password not set. Please set up a lock password first in Lock Activities settings.',
      });
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

    res.json({
      message: `Lock activities ${enabled ? 'enabled' : 'disabled'}`,
      is_enabled: enabled,
    });
  } catch (err) {
    console.error('toggleLockActivities error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── VERIFY LOCK PASSWORD ────────────────────────────────────
// Used when accessing protected pages — stores temp token in DB for server-side verification
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

    // Generate temporary access token valid for 30 minutes
    const tempToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1800000); // 30 minutes

    // Persist token so middleware can verify it server-side
    await pool.query(
      `INSERT INTO lock_activity_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [user_id, tempToken, expiresAt]
    );

    res.json({ message: 'Verified', tempToken, expiresAt });
  } catch (err) {
    console.error('verifyLockPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── FORGOT LOCK PASSWORD ────────────────────────────────────
exports.forgotLockPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    // 1. Find user by email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userResult.rows.length === 0) {
      // Return a generic message to prevent user enumeration
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }
    const user = userResult.rows[0];

    // 2. Confirm lock_activities record exists and a password has been set
    const lockResult = await pool.query(
      'SELECT lock_password_hash FROM lock_activities WHERE user_id = $1',
      [user.id]
    );

    if (lockResult.rows.length === 0 || !lockResult.rows[0].lock_password_hash) {
      // No lock password to reset — still return generic message
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // 3. Invalidate any existing unused lock reset tokens for this user
    await pool.query(
      `UPDATE password_resets SET is_used = true
       WHERE user_id = $1 AND reset_type = 'lock_activities' AND is_used = false`,
      [user.id]
    );

    // 4. Create new reset token (15 minutes expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 900000); // ✅ 15 minutes

    await pool.query(
      `INSERT INTO password_resets (user_id, reset_type, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'lock_activities', resetToken, expiresAt]
    );

    // 5. Send reset email
    const emailService = require('../services/emailService');
    const frontendUrl = (
      process.env.FRONTEND_URL ||
      req.headers.origin ||
      req.get('origin') ||
      `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');

    const resetLink = `${frontendUrl}/reset-lock-password?token=${resetToken}`;

    const helpCenterEmailResult = await pool.query(
      "SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'"
    );
    const helpCenterEmail = helpCenterEmailResult.rows[0]?.setting_value;

    await emailService({
      to: user.email,
      subject: '🔐 Reset Your Lock Activities Password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#f3f4f6;border-radius:12px;">
          <h2 style="color:#1e293b;margin-top:0;">Reset Lock Activities Password</h2>
          <p style="color:#475569;">Click the button below to reset your lock activities password. This link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetLink}"
           style="display:inline-block;padding:0.75rem 1.5rem;background:#f97316;color:#fff;text-decoration:none;border-radius:0.5rem;font-weight:600;margin:0.5rem 0;">
           Reset Lock Password
          </a>
          <p style="color:#64748b;font-size:0.85rem;margin-top:1.5rem;">
           If the button above doesn't work, copy and paste this link into your browser: <br/>
           <a href="${resetLink}" style="color:#2563eb;word-break:break-all;">${resetLink}</a>
          </p>
          ${helpCenterEmail
            ? `<p style="color:#334155;font-size:0.875rem;">
               Need help? Email <a href="mailto:${helpCenterEmail}" style="color:#2563eb;">${helpCenterEmail}</a>
              </p>`
            : ''
          }
          <p style="color:#94a3b8;font-size:0.8rem;margin-top:1rem;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    console.error('forgotLockPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── RESET LOCK PASSWORD ─────────────────────────────────────
exports.resetLockPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  // Validate inputs up-front
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  const trimmedPassword = newPassword.trim();
  if (trimmedPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  try {
    const resetResult = await pool.query(
      `SELECT * FROM password_resets WHERE token = $1 AND reset_type = 'lock_activities' AND is_used = false AND expires_at > NOW()`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const reset = resetResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(trimmedPassword, salt);

    // Update lock password
    await pool.query(
      `UPDATE lock_activities SET lock_password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [passwordHash, reset.user_id]
    );

    // Mark reset token as used
    await pool.query(
      'UPDATE password_resets SET is_used = true WHERE id = $1',
      [reset.id]
    );

    // Invalidate any active lock session tokens for this user
    await pool.query(
      'DELETE FROM lock_activity_tokens WHERE user_id = $1',
      [reset.user_id]
    );

    res.json({ message: 'Lock password reset successfully' });
  } catch (err) {
    console.error('resetLockPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};