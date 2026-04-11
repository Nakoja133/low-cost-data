const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const auth    = require('../middleware/auth');
const axios   = require('axios');

const WITHDRAWAL_CHARGE = 0.009; // 0.9%

const getMinWithdrawal = async () => {
  const r = await pool.query(`SELECT setting_value FROM admin_settings WHERE setting_key='min_withdrawal_amount'`);
  return parseFloat(r.rows[0]?.setting_value || '1.00');
};

const getAvailableBalance = async (agentId) => {
  const wr = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [agentId]);
  if (!wr.rows.length) return { balance: 0, available: 0, pending: 0, walletId: null };
  const walletId = wr.rows[0].id;
  const [balR, pendR] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE wallet_id=$1`, [walletId]),
    pool.query(`SELECT COALESCE(SUM(amount),0) AS pending FROM withdrawals WHERE agent_id=$1 AND status='pending'`, [agentId]),
  ]);
  const balance = parseFloat(balR.rows[0].bal);
  const pending = parseFloat(pendR.rows[0].pending);
  return { balance, pending, available: balance - pending, walletId };
};

// ── HELPER: Calculate charge ──────────────────────────────────
const calcCharge = (amount) => {
  const charge = parseFloat((amount * WITHDRAWAL_CHARGE).toFixed(2));
  const net    = parseFloat((amount - charge).toFixed(2));
  return { charge, net };
};

// ── GET CHARGE PREVIEW (called when agent enters amount) ──────
router.get('/charge-preview', auth, async (req, res) => {
  const amount = parseFloat(req.query.amount);
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  const { charge, net } = calcCharge(amount);
  res.json({ amount, charge_amount: charge, net_amount: net, charge_pct: '0.9%' });
});

// ── PAYSTACK TRANSFER (placeholder — add OTP/key when ready) ──
const paystackTransfer = async ({ amount, accountNumber, bankName, accountName, reference }) => {
  const networkMap = { 'MTN Mobile Money': 'MTN', 'Vodafone Cash': 'VOD', 'AirtelTigo Money': 'ATL' };
  const network    = networkMap[bankName] || 'MTN';

  const recipientRes = await axios.post(
    'https://api.paystack.co/transferrecipient',
    { type: 'mobile_money', name: accountName, account_number: accountNumber, bank_code: network, currency: 'GHS' },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );
  if (!recipientRes.data.status) throw new Error(recipientRes.data.message || 'Failed to create recipient');

  const transferRes = await axios.post(
    'https://api.paystack.co/transfer',
    { source: 'balance', amount: Math.round(amount * 100), recipient: recipientRes.data.data.recipient_code, reason: `Withdrawal - ${reference}`, reference },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );
  if (!transferRes.data.status) throw new Error(transferRes.data.message || 'Transfer failed');
  return transferRes.data.data;
};

// ── POST /withdrawals — Automatic (Paystack) ──────────────────
router.post('/', auth, async (req, res) => {
  const { amount, account_number, bank_name, account_name } = req.body;
  const requested = parseFloat(amount);

  try {
    const minAmount = await getMinWithdrawal();
    if (!amount || isNaN(requested) || requested < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal is GH₵ ${minAmount.toFixed(2)}` });
    }
    if (!account_number || !account_name || !bank_name) {
      return res.status(400).json({ error: 'All payment fields are required' });
    }

    const { balance, available, walletId } = await getAvailableBalance(req.user.id);
    if (!walletId) return res.status(404).json({ error: 'Wallet not found' });
    if (requested > available) {
      return res.status(400).json({ error: `Insufficient balance. Available: GH₵ ${available.toFixed(2)}`, available });
    }

    const { charge, net } = calcCharge(requested);
    const reference = `WD-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`;

    const wRes = await pool.query(
      `INSERT INTO withdrawals (agent_id,amount,net_amount,charge_amount,account_number,bank_name,account_name,reference,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [req.user.id, requested, net, charge, account_number, bank_name, account_name, reference]
    );

    // Attempt Paystack transfer (sends NET amount to agent)
    try {
      await paystackTransfer({ amount: net, accountNumber: account_number, bankName: bank_name, accountName: account_name, reference });

      await pool.query(`UPDATE withdrawals SET status='approved',processed_at=NOW(),updated_at=NOW() WHERE id=$1`, [wRes.rows[0].id]);

      // Debit full requested amount from wallet (charge stays with admin)
      const after = balance - requested;
      await pool.query(
        `INSERT INTO transactions (wallet_id,type,amount,balance_after,description,reference)
         VALUES ($1,'debit',$2,$3,'Automatic withdrawal via Paystack',$4)`,
        [walletId, requested, after, reference]
      );

      res.json({ message: `✅ Withdrawal successful! GH₵ ${net.toFixed(2)} sent to your MoMo (charge: GH₵ ${charge.toFixed(2)}).`, auto: true, reference, net_amount: net });
    } catch (paystackErr) {
      console.error('Paystack transfer error:', paystackErr.response?.data || paystackErr.message);
      await pool.query('DELETE FROM withdrawals WHERE id=$1', [wRes.rows[0].id]);
      return res.status(402).json({
        error:   'Automatic transfer failed. Paystack balance may be insufficient.',
        fallback: true,
        message: 'Please use Manual Withdrawal or try again later.',
      });
    }
  } catch (err) {
    console.error('Withdrawal error:', err.message);
    res.status(500).json({ error: 'Failed to process withdrawal', details: err.message });
  }
});

// ── POST /withdrawals/manual ──────────────────────────────────
router.post('/manual', auth, async (req, res) => {
  const { amount, account_name, momo_number, agent_email } = req.body;
  const requested = parseFloat(amount);

  try {
    const minAmount = await getMinWithdrawal();
    if (!amount || isNaN(requested) || requested < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal is GH₵ ${minAmount.toFixed(2)}` });
    }
    if (!account_name || !momo_number) {
      return res.status(400).json({ error: 'Name and MoMo number are required' });
    }

    const { balance, available, walletId } = await getAvailableBalance(req.user.id);
    if (!walletId) return res.status(404).json({ error: 'Wallet not found' });
    if (requested > available) {
      return res.status(400).json({ error: `Insufficient balance. Available: GH₵ ${available.toFixed(2)}` });
    }

    const { charge, net } = calcCharge(requested);
    const reference = `MWD-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`;
    const agentName  = (await pool.query('SELECT username FROM users WHERE id=$1', [req.user.id])).rows[0]?.username || 'Agent';

    const mwRes = await pool.query(
      `INSERT INTO manual_withdrawals (agent_id,agent_email,amount,net_amount,charge_amount,account_name,momo_number,status,type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','manual') RETURNING *`,
      [req.user.id, agent_email || '', requested, net, charge, account_name, momo_number]
    );

    // Debit wallet immediately (hold the funds)
    const after = balance - requested;
    await pool.query(
      `INSERT INTO transactions (wallet_id,type,amount,balance_after,description,reference)
       VALUES ($1,'debit',$2,$3,'Manual withdrawal pending',$4)`,
      [walletId, requested, after, reference]
    );

    // Email all admins
    const admins = await pool.query(`SELECT email FROM users WHERE role='admin' AND is_active=true`);
    const sendEmail = require('../services/emailService');
    for (const admin of admins.rows) {
      await sendEmail({
        to: admin.email,
        subject: '💰 New Manual Withdrawal Request',
        text: `Agent ${agentName} (${agent_email}) requests GH₵ ${requested.toFixed(2)} withdrawal to MoMo ${momo_number} (${account_name}). Net: GH₵ ${net.toFixed(2)}.`,
        html: `<div style="font-family:Arial;padding:2rem;background:#fef3c7;border-radius:10px;"><h2>💰 Manual Withdrawal Request</h2><p>Agent: <strong>${agentName}</strong> (${agent_email})</p><p>Amount: GH₵ ${requested.toFixed(2)} | Net (after 0.9% charge): GH₵ ${net.toFixed(2)}</p><p>MoMo: ${momo_number} (${account_name})</p><p>Please process and approve in the admin portal.</p></div>`,
      }).catch(() => {});
    }

    res.status(201).json({
      message: `Manual withdrawal submitted. GH₵ ${net.toFixed(2)} will be sent after admin approval (charge: GH₵ ${charge.toFixed(2)}).`,
      reference,
      net_amount: net,
    });
  } catch (err) {
    console.error('Manual withdrawal error:', err.message);
    res.status(500).json({ error: 'Failed to submit manual withdrawal', details: err.message });
  }
});

// ── GET /withdrawals — agent's automatic withdrawals ──────────
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM withdrawals WHERE agent_id=$1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch withdrawals' }); }
});

module.exports = router;
