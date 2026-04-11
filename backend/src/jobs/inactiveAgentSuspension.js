const cron = require('node-cron');
const pool = require('../config/database');
const sendEmail = require('../services/emailService');

const getHelpCenterEmail = async () => {
  const res = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'");
  return res.rows[0]?.setting_value || process.env.EMAIL_FROM || '';
};

const suspendInactiveAgents = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const inactiveAgents = await pool.query(
      `SELECT u.id, u.email, u.username, u.store_name,
              GREATEST(
                COALESCE(MAX(o.created_at),'1970-01-01'::timestamp),
                COALESCE(MAX(w.created_at),'1970-01-01'::timestamp)
              ) AS last_activity_at
       FROM users u
       LEFT JOIN orders o ON o.agent_id = u.id
       LEFT JOIN withdrawals w ON w.agent_id = u.id
       WHERE u.role = 'agent' AND u.is_active = true
       GROUP BY u.id
       HAVING GREATEST(
                COALESCE(MAX(o.created_at),'1970-01-01'::timestamp),
                COALESCE(MAX(w.created_at),'1970-01-01'::timestamp)
              ) < $1`,
      [cutoffDate]
    );

    if (!inactiveAgents.rows.length) {
      return;
    }

    const helpEmail = await getHelpCenterEmail();
    const replyTo = helpEmail || process.env.EMAIL_FROM || 'support@lowcostdata.com';
    const contactText = helpEmail ? `Please contact Low Cost Data Bundles at ${helpEmail} to restore access within 5 days.` : 'Please contact Low Cost Data Bundles support to restore access within 5 days.';

    for (const agent of inactiveAgents.rows) {
      await pool.query(
        `UPDATE users SET is_active = false, suspended_at = NOW(), suspended_by_inactivity = true, updated_at = NOW() WHERE id = $1`,
        [agent.id]
      );

      await sendEmail({
        to: agent.email,
        subject: 'Account Suspended Due to Inactivity',
        text: `Hello ${agent.username || agent.store_name || 'Agent'},\n\nYour Low Cost Data Bundles account has been suspended because you have not recorded any orders or withdrawals in the last 30 days. ${contactText} If you do not restore your account within 5 days, it may be permanently deleted.`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px;background:#f8fafc;border-radius:14px;color:#0f172a;">
                 <h2 style="margin-top:0;color:#dc2626;">Account Suspended Due to Inactivity</h2>
                 <p>Hello ${agent.username || agent.store_name || 'Agent'},</p>
                 <p>Your Low Cost Data Bundles account has been suspended because it has not registered any orders or withdrawals in the past 30 days.</p>
                 <p>${contactText}</p>
                 <p style="font-weight:700;color:#1d4ed8;">If the account is not reinstated within 5 days, it may be permanently deleted.</p>
                 ${helpEmail ? `<p style="margin-top:1rem;">Contact support: <a href=\"mailto:${helpEmail}\" style=\"color:#2563eb;\">${helpEmail}</a></p>` : ''}
               </div>`,
      });
    }

    console.log(`✅ Suspended ${inactiveAgents.rows.length} inactive agent(s)`);
  } catch (err) {
    console.error('❌ Failed to suspend inactive agents:', err.message || err);
  }
};

const deleteExpiredSuspendedAgents = async () => {
  try {
    const result = await pool.query(
      `DELETE FROM users
       WHERE is_active = false
         AND suspended_by_inactivity = true
         AND suspended_at <= NOW() - INTERVAL '5 days'
       RETURNING id`);

    if (result.rows.length) {
      console.log(`✅ Permanently deleted ${result.rows.length} inactive suspended agent(s)`);
    }
  } catch (err) {
    console.error('❌ Failed to delete expired suspended agents:', err.message || err);
  }
};

const runJobs = async () => {
  await suspendInactiveAgents();
  await deleteExpiredSuspendedAgents();
};

runJobs();
cron.schedule('0 2 * * *', () => {
  runJobs();
}, { timezone: 'Africa/Accra' });

module.exports = { runJobs };
