const express   = require('express');
const router    = express.Router();
const pool      = require('../config/database');
const auth      = require('../middleware/auth');
const sendEmail = require('../services/emailService');
const {
  getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
  createUser, getAllUsers, updatePackage, createPackage,
  getDashboardStats, updateTerms, getTerms,
  getAdminProfit, getCheckHolding, getAgentStats,
  getSuspendedAgents, reactivateSuspendedAgent,
} = require('../controllers/adminController');

const getHelpCenterEmail = async () => {
  const res = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='help_center_email'");
  return res.rows[0]?.setting_value || process.env.EMAIL_FROM || '';
};

router.use(auth);
router.use(auth.isAdmin);

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard-stats', getDashboardStats);
router.get('/profit',          getAdminProfit);
router.get('/check-holding',   getCheckHolding);

// ── Users ─────────────────────────────────────────────────────
router.post('/users',    createUser);
router.get('/users',     getAllUsers);
router.get('/users/:agent_id/stats', getAgentStats);
router.get('/suspended-agents', getSuspendedAgents);
router.put('/suspended-agents/:id/reactivate', reactivateSuspendedAgent);

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { confirm_email } = req.body;
  try {
    const r = await pool.query('SELECT email,role FROM users WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    if (confirm_email !== r.rows[0].email) return res.status(400).json({ error: 'Email confirmation failed' });
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ message: 'User deleted', deleted_user: { email: r.rows[0].email, role: r.rows[0].role } });
  } catch (err) { res.status(500).json({ error: 'Failed to delete user' }); }
});

// ── Withdrawals ───────────────────────────────────────────────
router.get('/withdrawals',                        getAllWithdrawals);
router.put('/withdrawals/:withdrawal_id/approve', approveWithdrawal);
router.put('/withdrawals/:withdrawal_id/reject',  rejectWithdrawal);

// ── Manual Withdrawals ────────────────────────────────────────
router.get('/manual-withdrawals', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT mw.*, u.username AS agent_name, u.email AS agent_email
       FROM manual_withdrawals mw JOIN users u ON mw.agent_id=u.id
       ORDER BY mw.created_at DESC`
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch manual withdrawals' }); }
});

router.put('/manual-withdrawals/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      `SELECT mw.*,u.email AS agent_email FROM manual_withdrawals mw JOIN users u ON mw.agent_id=u.id WHERE mw.id=$1`, [id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const mw = r.rows[0];
    if (mw.status !== 'pending') return res.status(400).json({ error: `Already ${mw.status}` });

    await pool.query(`UPDATE manual_withdrawals SET status='approved',processed_at=NOW(),updated_at=NOW() WHERE id=$1`, [id]);

    const wr = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [mw.agent_id]);
    if (wr.rows.length) {
      const walletId = wr.rows[0].id;
      const br = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE wallet_id=$1`, [walletId]
      );
      const newBal = parseFloat(br.rows[0].bal) - parseFloat(mw.amount);
      await pool.query(
        `INSERT INTO transactions (wallet_id,type,amount,balance_after,description,reference)
         VALUES ($1,'debit',$2,$3,'Manual withdrawal approved',$4)`,
        [walletId, mw.amount, newBal, `MW-${id}`]
      );
    }

    const helpEmail = await getHelpCenterEmail();
    const helpText = helpEmail ? `If you have any complaint, email ${helpEmail} and wait for feedback.` : '';
    await sendEmail({
      to: mw.agent_email, subject: '✅ Manual Withdrawal Approved',
      text: `Your withdrawal of GH₵ ${parseFloat(mw.net_amount || mw.amount).toFixed(2)} has been sent to MoMo ${mw.momo_number}. ${helpText}`,
      html: `<div style="font-family:Arial;padding:2rem;background:#d1fae5;border-radius:10px;"><h2 style="color:#065f46;">✅ Withdrawal Processed</h2><p>Net: <strong>GH₵ ${parseFloat(mw.net_amount || mw.amount).toFixed(2)}</strong></p><p>MoMo: ${mw.momo_number} (${mw.account_name})</p>${helpEmail ? `<p style="margin-top:1rem;color:#334155;">If you have any complaint, email <a href=\"mailto:${helpEmail}\" style=\"color:#2563eb;\">${helpEmail}</a> and wait for feedback.</p>` : ''}</div>`,
    });
    res.json({ message: 'Manual withdrawal approved' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to approve' }); }
});

router.put('/manual-withdrawals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const r = await pool.query(
      `SELECT mw.*,u.email AS agent_email FROM manual_withdrawals mw JOIN users u ON mw.agent_id=u.id WHERE mw.id=$1`, [id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    
    const mw = r.rows[0];
    await pool.query(`UPDATE manual_withdrawals SET status='rejected',processed_at=NOW(),updated_at=NOW() WHERE id=$1`, [id]);
    
    // ✅ REFUND THE WALLET: Credit back the full amount (including charges)
    const wallet = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [mw.agent_id]);
    if (wallet.rows.length) {
      const walletId = wallet.rows[0].id;
      const refundAmount = parseFloat(mw.charge_amount || 0) + parseFloat(mw.net_amount || mw.amount);
      
      const balResult = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE wallet_id=$1`, 
        [walletId]
      );
      const balAfter = parseFloat(balResult.rows[0].bal) + refundAmount;
      
      await pool.query(
        `INSERT INTO transactions (wallet_id,type,amount,balance_after,description,reference)
         VALUES ($1,'credit',$2,$3,$4,$5)`,
        [walletId, refundAmount, balAfter, 'Manual withdrawal rejected - refund', `MW-${mw.id}`]
      );
    }
    
    const helpEmail = await getHelpCenterEmail();
    const helpText = helpEmail ? `If you have any complaint, email ${helpEmail} and wait for feedback.` : '';
    await sendEmail({
      to: mw.agent_email, subject: '❌ Manual Withdrawal Rejected',
      text: `Your withdrawal request was rejected. Reason: ${reason || 'No reason provided'}. Your funds have been refunded. ${helpText}`,
      html: `<div style="font-family:Arial;padding:2rem;background:#fee2e2;border-radius:10px;"><h2>❌ Withdrawal Rejected</h2><p>Reason: ${reason || 'No reason provided'}</p><p>Amount refunded: <strong>GH₵ ${(parseFloat(mw.charge_amount || 0) + parseFloat(mw.net_amount || mw.amount)).toFixed(2)}</strong></p>${helpEmail ? `<p style="margin-top:1rem;color:#334155;">If you have any complaint, email <a href=\"mailto:${helpEmail}\" style=\"color:#2563eb;\">${helpEmail}</a> and wait for feedback.</p>` : ''}</div>`,
    });
    res.json({ message: 'Withdrawal rejected and funds refunded' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reject' }); }
});

// ── Packages ──────────────────────────────────────────────────
router.post('/packages',     createPackage);
router.put('/packages/:id',  updatePackage);

// ── Terms ─────────────────────────────────────────────────────
router.get('/terms', getTerms);
router.put('/terms', async (req, res) => {
  const { terms } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('agent_terms',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [terms]
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('terms_last_updated',NOW()::text,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text,updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET terms_accepted=false,terms_accepted_at=NULL,terms_notif_seen_at=NULL WHERE role='agent'`);
    res.json({ message: 'Terms updated. All agents must re-accept.' });
  } catch (err) { res.status(500).json({ error: 'Failed to update terms' }); }
});

// ── Settings ──────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const r = await pool.query('SELECT setting_key,setting_value FROM admin_settings');
    const s = {};
    r.rows.forEach(row => { s[row.setting_key] = row.setting_value; });
    res.json({ settings: s });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.put('/settings/min-withdrawal', async (req, res) => {
  const val = parseFloat(req.body.amount);
  if (isNaN(val) || val < 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('min_withdrawal_amount',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [val.toFixed(2)]
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('min_withdrawal_last_updated',NOW()::text,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text,updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET withdrawal_notif_seen_at=NULL WHERE role='agent'`);
    res.json({ message: `Minimum withdrawal updated to GH₵ ${val.toFixed(2)}` });
  } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
});

// ✅ WhatsApp — notify agents & return new value
router.put('/settings/whatsapp-group', async (req, res) => {
  const { link } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('whatsapp_group_link',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [link || '']
    );
    // Notify agents
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('links_last_updated',NOW()::text,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text,updated_at=NOW()`
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('links_updated_detail','WhatsApp',NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value='WhatsApp',updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET link_notif_seen_at=NULL WHERE role='agent'`);
    res.json({ message: 'WhatsApp group link updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
});

// ✅ Telegram — notify agents
router.put('/settings/telegram-link', async (req, res) => {
  const { link } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('telegram_link',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [link || '']
    );
    // Check if WA was also recently updated (within 1 min — means both updated)
    const waR = await pool.query(
      `SELECT setting_value FROM admin_settings WHERE setting_key='links_updated_detail'`
    );
    const detail = waR.rows[0]?.setting_value === 'WhatsApp' ? 'WhatsApp and Telegram' : 'Telegram';
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('links_last_updated',NOW()::text,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text,updated_at=NOW()`
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('links_updated_detail',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [detail]
    );
    await pool.query(`UPDATE users SET link_notif_seen_at=NULL WHERE role='agent'`);
    res.json({ message: 'Telegram link updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update telegram link' }); }
});

router.put('/settings/help-center-email', async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key,setting_value,updated_at) VALUES ('help_center_email',$1,NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1,updated_at=NOW()`, [email || '']
    );
    res.json({ message: 'Help center email updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update help center email' }); }
});

// ── AUDIT LOGS ───────────────────────────────────────────────
const auditLogController = require('../controllers/auditLogController');

router.get('/audit-logs',                           auditLogController.getAuditLogs);
router.get('/audit-logs/stats',                     auditLogController.getAuditStats);
router.get('/audit-logs/:entityType/:entityId',     auditLogController.getEntityAuditHistory);

module.exports = router;
