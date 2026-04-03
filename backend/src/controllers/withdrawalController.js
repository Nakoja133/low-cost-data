const pool = require('../config/database');

// REQUEST WITHDRAWAL (Agent initiates)
exports.requestWithdrawal = async (req, res) => {
  const { amount, account_number, bank_name, account_name } = req.body;
  const agent_id = req.user.id; // From authenticated user

  try {
    // 1. Validate minimum withdrawal (GH₵ 10)
    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum withdrawal is GH₵ 1' });
    }

    // 2. Get agent's wallet & current balance
    const walletResult = await pool.query(
      'SELECT w.id, w.user_id FROM wallets w WHERE w.user_id = $1',
      [agent_id]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const wallet_id = walletResult.rows[0].id;

    // Calculate current balance from transactions
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
       FROM transactions WHERE wallet_id = $1`,
      [wallet_id]
    );

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    // 3. Check sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({ 
        error: `Insufficient balance. You have GH₵${currentBalance.toFixed(2)}` 
      });
    }

    // 4. Create withdrawal record (status: pending)
    const withdrawalRef = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newWithdrawal = await pool.query(
      `INSERT INTO withdrawals 
       (agent_id, wallet_id, amount, account_number, bank_name, account_name, reference, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [agent_id, wallet_id, amount, account_number, bank_name, account_name, withdrawalRef, 'pending']
    );

    res.status(201).json({
      message: 'Withdrawal request submitted',
      withdrawal: newWithdrawal.rows[0],
      auto_processed: false,
    });

  } catch (err) {
    console.error('Withdrawal request error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET WITHDRAWAL HISTORY (For Agent Dashboard)
exports.getWithdrawals = async (req, res) => {
  const agent_id = req.user.id;

  try {
    const withdrawals = await pool.query(
      `SELECT * FROM withdrawals 
       WHERE agent_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [agent_id]
    );

    res.json({ data: withdrawals.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};