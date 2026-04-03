const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// CREATE WITHDRAWAL REQUEST
router.post('/', auth, async (req, res) => {
  const { amount, account_number, bank_name, account_name } = req.body;

  console.log('💵 Withdrawal request:', {
    agent_id: req.user.id,
    amount,
    bank_name,
    account_name,
  });

  try {
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const walletResult = await pool.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    if (walletResult.rows.length === 0) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const walletId = walletResult.rows[0].id;

    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
       FROM transactions WHERE wallet_id = $1`,
      [walletId]
    );

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    console.log('Current balance:', currentBalance, 'Withdrawal amount:', amount);

    if (amount > currentBalance) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        current_balance: currentBalance,
        requested_amount: amount
      });
    }

    const reference = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Use agent_id
    const withdrawalResult = await pool.query(
      `INSERT INTO withdrawals (agent_id, amount, account_number, bank_name, account_name, reference, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, amount, account_number, bank_name, account_name, reference]
    );

    console.log('✅ Withdrawal request created:', withdrawalResult.rows[0].id);

    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: withdrawalResult.rows[0],
    });
  } catch (err) {
    console.error('❌ Withdrawal error:', err.message);
    res.status(500).json({ error: 'Failed to submit withdrawal', details: err.message });
  }
});

// GET AGENT'S WITHDRAWALS
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM withdrawals WHERE agent_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get withdrawals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

module.exports = router;