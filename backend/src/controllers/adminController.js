const pool = require('../config/database');

// ============================================
// GET ALL WITHDRAWALS
// ============================================
const getAllWithdrawals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, u.email as agent_email, u.username as agent_name
       FROM withdrawals w
       JOIN users u ON w.agent_id = u.id
       ORDER BY w.created_at DESC`
    );
    
    console.log('✅ Withdrawals fetched:', result.rows.length);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('❌ Get withdrawals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};

// ============================================
// APPROVE WITHDRAWAL
// ============================================
const approveWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.params;

  console.log('✅ Approving withdrawal:', withdrawal_id);

  try {
    const withdrawalResult = await pool.query(
      `SELECT w.*, u.email as agent_email
       FROM withdrawals w
       JOIN users u ON w.agent_id = u.id
       WHERE w.id = $1`,
      [withdrawal_id]
    );

    if (withdrawalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    const withdrawal = withdrawalResult.rows[0];

    await pool.query(
      `UPDATE withdrawals
       SET status = 'approved', processed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [withdrawal_id]
    );

    console.log('✅ Withdrawal status updated to approved');

    const walletResult = await pool.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [withdrawal.agent_id]
    );

    if (walletResult.rows.length === 0) {
      return res.status(400).json({ error: 'Agent wallet not found' });
    }

    const walletId = walletResult.rows[0].id;

    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance
       FROM transactions WHERE wallet_id = $1`,
      [walletId]
    );

    const balanceBefore = parseFloat(balanceResult.rows[0].balance);
    const balanceAfter = balanceBefore - withdrawal.amount;

    await pool.query(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference)
       VALUES ($1, 'debit', $2, $3, $4, $5)`,
      [walletId, withdrawal.amount, balanceAfter, `Withdrawal approved: ${withdrawal.reference}`, withdrawal.reference]
    );

    console.log('✅ Debit transaction recorded');

    const sendEmail = require('../services/emailService');
    await sendEmail({
      to: withdrawal.agent_email,
      subject: '✅ Withdrawal Approved',
      text: `Your withdrawal of GH₵ ${withdrawal.amount} has been approved.`,
      html: `<div style="padding:2rem;background:#d1fae5;"><h2>✅ Approved</h2><p>Amount: GH₵ ${withdrawal.amount}</p></div>`,
    });

    res.json({ message: 'Withdrawal approved successfully', withdrawal: withdrawalResult.rows[0] });

  } catch (err) {
    console.error('❌ Approval error:', err.message);
    res.status(500).json({ error: 'Failed to approve withdrawal', details: err.message });
  }
};

// ============================================
// REJECT WITHDRAWAL
// ============================================
const rejectWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.params;
  const { reason } = req.body;

  try {
    await pool.query(
      `UPDATE withdrawals
       SET status = 'rejected', processed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [withdrawal_id]
    );

    const withdrawalResult = await pool.query(
      `SELECT w.*, u.email as agent_email FROM withdrawals w JOIN users u ON w.agent_id = u.id WHERE w.id = $1`,
      [withdrawal_id]
    );

    if (withdrawalResult.rows.length > 0) {
      const sendEmail = require('../services/emailService');
      await sendEmail({
        to: withdrawalResult.rows[0].agent_email,
        subject: '❌ Withdrawal Rejected',
        text: `Your withdrawal request was rejected. Reason: ${reason || 'No reason provided'}`,
        html: `<div style="padding:2rem;background:#fee2e2;"><h2>❌ Rejected</h2><p>Reason: ${reason || 'No reason provided'}</p></div>`,
      });
    }

    res.json({ message: 'Withdrawal rejected successfully' });
  } catch (err) {
    console.error('❌ Reject withdrawal error:', err.message);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
};

// ============================================
// CREATE USER
// ============================================
const createUser = async (req, res) => {
  const { email, password, role, username, phone, whatsapp_number, store_slug } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, username, phone, whatsapp_number, store_slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, role, username, store_slug`,
      [email, passwordHash, role, username, phone, whatsapp_number, store_slug]
    );

    await pool.query('INSERT INTO wallets (user_id) VALUES ($1)', [result.rows[0].id]);

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    console.error('❌ Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// ============================================
// GET ALL USERS
// ============================================
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, username, phone, whatsapp_number, role, store_slug, created_at,
              (SELECT COUNT(*) FROM orders WHERE agent_id = users.id) as total_orders,
              (SELECT COALESCE(SUM(amount_paid), 0) FROM orders WHERE agent_id = users.id) as total_sales
       FROM users ORDER BY created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('❌ Get users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ============================================
// UPDATE PACKAGE
// ============================================
const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { description, base_price, base_cost, network } = req.body;

  try {
    const result = await pool.query(
      `UPDATE data_packages
       SET description = $1, base_price = $2, base_cost = $3, network = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [description, base_price, base_cost, network, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ message: 'Package updated successfully', package: result.rows[0] });
  } catch (err) {
    console.error('❌ Update package error:', err.message);
    res.status(500).json({ error: 'Failed to update package' });
  }
};

// ============================================
// CREATE PACKAGE
// ============================================
const createPackage = async (req, res) => {
  const { description, base_price, base_cost, network } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO data_packages (description, base_price, base_cost, network)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [description, base_price, base_cost, network]
    );
    res.status(201).json({ message: 'Package created successfully', package: result.rows[0] });
  } catch (err) {
    console.error('❌ Create package error:', err.message);
    res.status(500).json({ error: 'Failed to create package' });
  }
};

// ============================================
// GET DASHBOARD STATS
// ============================================
const getDashboardStats = async (req, res) => {
  try {
    const salesResult = await pool.query(
      'SELECT COALESCE(SUM(amount_paid), 0) as total FROM orders WHERE status = \'completed\''
    );
    const ordersResult = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE status = \'completed\''
    );
    const agentsResult = await pool.query(
      'SELECT COUNT(DISTINCT agent_id) as count FROM orders WHERE agent_id IS NOT NULL'
    );
    const withdrawalsResult = await pool.query(
      'SELECT COUNT(*) as count FROM withdrawals WHERE status = \'pending\''
    );

    res.json({
      totalSales: parseFloat(salesResult.rows[0].total),
      totalOrders: parseInt(ordersResult.rows[0].count),
      activeAgents: parseInt(agentsResult.rows[0].count),
      pendingWithdrawals: parseInt(withdrawalsResult.rows[0].count),
    });
  } catch (err) {
    console.error('❌ Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// ============================================
// GET TERMS
// ============================================
const getTerms = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM admin_settings WHERE setting_key = \'agent_terms\''
    );
    res.json({ terms: result.rows[0]?.setting_value || '' });
  } catch (err) {
    console.error('❌ Get terms error:', err.message);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
};

// ============================================
// UPDATE TERMS
// ============================================
const updateTerms = async (req, res) => {
  const { terms } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at)
       VALUES ('agent_terms', $1, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = NOW()`,
      [terms]
    );
    await pool.query('UPDATE users SET terms_accepted = false, terms_accepted_at = NULL WHERE role = \'agent\'');
    res.json({ message: 'Terms updated successfully. All agents must re-accept.' });
  } catch (err) {
    console.error('❌ Update terms error:', err.message);
    res.status(500).json({ error: 'Failed to update terms' });
  }
};

// ============================================
// GET ADMIN PROFIT ✅ NEW
// ============================================
const getAdminProfit = async (req, res) => {
  try {
    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM orders WHERE status = 'completed'`
    );

    const payoutsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'approved'`
    );

    // Xray costs: Replace with actual tracking table later
    const xrayCosts = 0;

    const totalSales = parseFloat(salesResult.rows[0].total);
    const totalPayouts = parseFloat(payoutsResult.rows[0].total);
    const adminProfit = totalSales - totalPayouts - xrayCosts;

    res.json({
      totalSales,
      totalPayouts,
      xrayCosts,
      adminProfit,
      platformMargin: totalSales > 0 ? ((adminProfit / totalSales) * 100).toFixed(2) : 0,
    });
  } catch (err) {
    console.error('❌ Admin profit error:', err.message);
    res.status(500).json({ error: 'Failed to calculate profit' });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  createUser,
  getAllUsers,
  updatePackage,
  createPackage,
  getDashboardStats,
  getTerms,
  updateTerms,
  getAdminProfit, // ✅ Added
};