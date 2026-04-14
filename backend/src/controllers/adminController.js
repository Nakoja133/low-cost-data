const pool = require('../config/database');

const generateSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

// ── AUDIT LOG HELPER ──────────────────────────────────────────
const logAudit = async (adminId, action, targetType = null, targetId = null, details = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [adminId, action, targetType, targetId ? String(targetId) : null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

// ── GET ALL WITHDRAWALS ───────────────────────────────────────
const getAllWithdrawals = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT w.*, u.email AS agent_email, u.username AS agent_name FROM withdrawals w JOIN users u ON w.agent_id=u.id ORDER BY w.created_at DESC`
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};

// ── APPROVE WITHDRAWAL ────────────────────────────────────────
const approveWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.params;
  try {
    const r = await pool.query(
      `SELECT w.*, u.email AS agent_email FROM withdrawals w JOIN users u ON w.agent_id=u.id WHERE w.id=$1`,
      [withdrawal_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Withdrawal not found' });

    const w = r.rows[0];
    if (w.status !== 'pending') return res.status(400).json({ error: `Already ${w.status}` });

    await pool.query(
      `UPDATE withdrawals SET status='approved', processed_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [withdrawal_id]
    );

    const wr = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [w.agent_id]);
    if (wr.rows.length) {
      const walletId = wr.rows[0].id;
      const br = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE wallet_id=$1`,
        [walletId]
      );
      const balAfter = parseFloat(br.rows[0].bal) - parseFloat(w.amount);
      await pool.query(
        `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference)
         VALUES ($1, 'debit', $2, $3, 'Withdrawal approved', $4)`,
        [walletId, w.amount, balAfter, w.reference]
      );
    }

    const sendEmail = require('../services/emailService');
    await sendEmail({
      to: w.agent_email,
      subject: '✅ Withdrawal Approved',
      text: `Your withdrawal of GH₵ ${parseFloat(w.net_amount || w.amount).toFixed(2)} has been approved.`,
      html: `<div style="font-family:Arial;padding:2rem;background:#d1fae5;border-radius:10px;">
              <h2 style="color:#065f46;">✅ Withdrawal Approved</h2>
              <p>Net amount: <strong>GH₵ ${parseFloat(w.net_amount || w.amount).toFixed(2)}</strong></p>
              <p>Ref: ${w.reference}</p>
            </div>`,
    });

    await pool.query(
      `INSERT INTO alerts (type, message, severity, created_at) VALUES ($1, $2, $3, NOW())`,
      ['withdrawal_approved', `Your withdrawal of GH₵ ${parseFloat(w.net_amount || w.amount).toFixed(2)} has been approved.`, 'success']
    );

    await logAudit(req.user.id, 'APPROVE_WITHDRAWAL', 'withdrawal', withdrawal_id, {
      agent_email: w.agent_email,
      amount: w.amount,
      net_amount: w.net_amount,
      reference: w.reference,
    });

    res.json({ message: 'Withdrawal approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve', details: err.message });
  }
};

// ── REJECT WITHDRAWAL ─────────────────────────────────────────
const rejectWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.params;
  const { reason } = req.body;

  try {
    const r = await pool.query(
      `SELECT w.*, u.email AS agent_email FROM withdrawals w JOIN users u ON w.agent_id=u.id WHERE w.id=$1`,
      [withdrawal_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (r.rows[0].status !== 'pending') return res.status(400).json({ error: `Already ${r.rows[0].status}` });

    const withdrawal = r.rows[0];
    const reasonText = reason?.trim() || 'No reason provided';

    await pool.query(
      `UPDATE withdrawals SET status='rejected', rejection_reason=$2, processed_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [withdrawal_id, reasonText]
    );

    const refundAmount = parseFloat(withdrawal.charge_amount || 0) + parseFloat(withdrawal.net_amount || withdrawal.amount);
    const walletId = withdrawal.wallet_id;

    if (walletId) {
      const balResult = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE wallet_id=$1`,
        [walletId]
      );
      const balAfter = parseFloat(balResult.rows[0].bal) + refundAmount;
      await pool.query(
        `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference)
         VALUES ($1, 'credit', $2, $3, 'Withdrawal rejected - refund', $4)`,
        [walletId, refundAmount, balAfter, withdrawal.reference]
      );
    }

    const sendEmail = require('../services/emailService');
    await sendEmail({
      to: withdrawal.agent_email,
      subject: '❌ Withdrawal Rejected',
      text: `Your withdrawal was rejected. Reason: ${reasonText}. Your funds have been refunded.`,
      html: `<div style="font-family:Arial;padding:2rem;background:#fee2e2;border-radius:10px;">
              <h2>❌ Withdrawal Rejected</h2>
              <p>Reason: ${reasonText}</p>
              <p>Amount refunded: <strong>GH₵ ${refundAmount.toFixed(2)}</strong></p>
            </div>`,
    });

    await pool.query(
      `INSERT INTO alerts (type, message, severity, created_at) VALUES ($1, $2, $3, NOW())`,
      ['withdrawal_rejected', `Your withdrawal was rejected. Reason: ${reasonText}`, 'error']
    );

    await logAudit(req.user.id, 'REJECT_WITHDRAWAL', 'withdrawal', withdrawal_id, {
      agent_email: withdrawal.agent_email,
      amount: withdrawal.amount,
      refund_amount: refundAmount,
      reason: reasonText,
      reference: withdrawal.reference,
    });

    res.json({ message: 'Withdrawal rejected and funds refunded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject' });
  }
};

// ── CREATE USER ───────────────────────────────────────────────
const createUser = async (req, res) => {
  const { email, password, role, username, phone, whatsapp_number, store_slug, store_name } = req.body;
  try {
    const ex = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (ex.rows.length) return res.status(400).json({ error: 'Email already in use' });

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    let finalSlug = store_slug;
    if (!finalSlug && store_name?.trim()) {
      finalSlug = generateSlug(store_name.trim());
      const sc = await pool.query('SELECT id FROM users WHERE store_slug=$1', [finalSlug]);
      if (sc.rows.length) finalSlug = `${finalSlug}-${Math.random().toString(36).substr(2, 4)}`;
    }

    const r = await pool.query(
      `INSERT INTO users (email, password_hash, role, username, phone, whatsapp_number, store_slug, store_name, is_active, terms_accepted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false) RETURNING id, email, role, username, store_slug, store_name`,
      [email, hash, role || 'agent', username || null, phone || null, whatsapp_number || null, finalSlug || null, store_name || null]
    );
    await pool.query('INSERT INTO wallets (user_id) VALUES ($1)', [r.rows[0].id]);

    await logAudit(req.user.id, 'CREATE_USER', 'user', r.rows[0].id, {
      email,
      role: role || 'agent',
      username: username || null,
    });

    res.status(201).json({ message: 'User created successfully', user: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// ── GET ALL USERS ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, username, phone, whatsapp_number, role, store_slug, store_name, is_active, created_at,
       (SELECT COUNT(*) FROM orders WHERE agent_id=users.id AND status='completed') AS total_orders,
       (SELECT COALESCE(SUM(amount_paid),0) FROM orders WHERE agent_id=users.id AND status='completed') AS total_sales
       FROM users ORDER BY created_at DESC`
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ── GET SUSPENDED AGENTS ──────────────────────────────────────
const getSuspendedAgents = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.username, u.phone, u.store_name, u.store_slug, u.created_at, u.suspended_at, u.suspended_by_inactivity,
       MAX(o.created_at) AS last_order_at, MAX(w.created_at) AS last_withdrawal_at,
       (SELECT COUNT(*) FROM orders WHERE agent_id=u.id) AS total_orders,
       (SELECT COUNT(*) FROM withdrawals WHERE agent_id=u.id) AS total_withdrawals
       FROM users u
       LEFT JOIN orders o ON o.agent_id=u.id
       LEFT JOIN withdrawals w ON w.agent_id=u.id
       WHERE u.role='agent' AND u.is_active = false AND u.suspended_by_inactivity = true
       GROUP BY u.id ORDER BY u.suspended_at DESC`
    );
    res.json({
      data: r.rows.map(row => ({
        ...row,
        total_orders: parseInt(row.total_orders, 10) || 0,
        total_withdrawals: parseInt(row.total_withdrawals, 10) || 0,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch suspended agents' });
  }
};

// ── REACTIVATE SUSPENDED AGENT ────────────────────────────────
const reactivateSuspendedAgent = async (req, res) => {
  const { id } = req.params;
  try {
    const agent = await pool.query('SELECT id, email, username, is_active FROM users WHERE id=$1 AND role=$2', [id, 'agent']);
    if (!agent.rows.length) return res.status(404).json({ error: 'Agent not found' });
    if (agent.rows[0].is_active) return res.status(400).json({ error: 'Agent is already active' });

    await pool.query(
      `UPDATE users SET is_active = true, suspended_at = NULL, suspended_by_inactivity = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logAudit(req.user.id, 'REACTIVATE_AGENT', 'user', id, {
      email: agent.rows[0].email,
      username: agent.rows[0].username,
    });

    res.json({ message: 'Agent reactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reactivate agent' });
  }
};

// ── UPDATE PACKAGE ────────────────────────────────────────────
const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { description, base_price, base_cost, network, api_code, is_active } = req.body;
  try {
    const cr = await pool.query('SELECT * FROM data_packages WHERE id=$1', [id]);
    if (!cr.rows.length) return res.status(404).json({ error: 'Package not found' });
    const c = cr.rows[0];

    const r = await pool.query(
      `UPDATE data_packages SET description=$1, base_price=$2, base_cost=$3, network=$4, api_code=$5, is_active=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        description !== undefined ? description : c.description,
        base_price  !== undefined ? parseFloat(base_price) : c.base_price,
        base_cost   !== undefined ? parseFloat(base_cost)  : c.base_cost,
        network && network.trim() ? network : c.network,
        api_code    !== undefined ? api_code  : c.api_code,
        is_active   !== undefined ? is_active : c.is_active,
        id,
      ]
    );

    await pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES ('packages_last_updated', NOW()::text, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text, updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET package_notif_seen_at=NULL WHERE role='agent'`);

    await logAudit(req.user.id, 'UPDATE_PACKAGE', 'package', id, {
      description: r.rows[0].description,
      base_price:  r.rows[0].base_price,
      base_cost:   r.rows[0].base_cost,
      network:     r.rows[0].network,
      is_active:   r.rows[0].is_active,
    });

    res.json({ message: 'Package updated successfully', package: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update package', details: err.message });
  }
};

// ── CREATE PACKAGE ────────────────────────────────────────────
const createPackage = async (req, res) => {
  const { description, base_price, base_cost, network, api_code, is_active } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO data_packages (description, base_price, base_cost, network, api_code, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [description, base_price, base_cost, network, api_code || null, is_active !== undefined ? is_active : true]
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES ('packages_last_updated', NOW()::text, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text, updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET package_notif_seen_at=NULL WHERE role='agent'`);

    await logAudit(req.user.id, 'CREATE_PACKAGE', 'package', r.rows[0].id, {
      description,
      base_price,
      base_cost,
      network,
      is_active: r.rows[0].is_active,
    });

    res.status(201).json({ message: 'Package created successfully', package: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create package' });
  }
};

// ── GET DASHBOARD STATS ───────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [salesR, ordersR, agentsR, wdR] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(amount_paid),0) AS total FROM orders WHERE status='completed'"),
      pool.query("SELECT COUNT(*) AS count FROM orders WHERE status='completed'"),
      pool.query('SELECT COUNT(DISTINCT agent_id) AS count FROM orders WHERE agent_id IS NOT NULL'),
      pool.query("SELECT COUNT(*) AS count FROM withdrawals WHERE status='pending'"),
    ]);
    res.json({
      totalSales:         parseFloat(salesR.rows[0].total),
      totalOrders:        parseInt(ordersR.rows[0].count),
      activeAgents:       parseInt(agentsR.rows[0].count),
      pendingWithdrawals: parseInt(wdR.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// ── GET TERMS ─────────────────────────────────────────────────
const getTerms = async (req, res) => {
  try {
    const r = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='agent_terms'");
    res.json({ terms: r.rows[0]?.setting_value || '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
};

// ── UPDATE TERMS ──────────────────────────────────────────────
const updateTerms = async (req, res) => {
  const { terms } = req.body;
  try {
    await pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES ('agent_terms', $1, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=$1, updated_at=NOW()`,
      [terms]
    );
    await pool.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES ('terms_last_updated', NOW()::text, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=NOW()::text, updated_at=NOW()`
    );
    await pool.query(`UPDATE users SET terms_accepted=false, terms_accepted_at=NULL, terms_notif_seen_at=NULL WHERE role='agent'`);

    await logAudit(req.user.id, 'UPDATE_TERMS', 'settings', null, {
      note: 'Agent terms updated — all agents must re-accept',
    });

    res.json({ message: 'Terms updated. All agents must re-accept.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update terms' });
  }
};

// ── GET ADMIN PROFIT ──────────────────────────────────────────
const getAdminProfit = async (req, res) => {
  try {
    const salesR        = await pool.query("SELECT COALESCE(SUM(amount_paid),0) AS total FROM orders WHERE status='completed'");
    const marginR       = await pool.query(`SELECT COALESCE(SUM(dp.base_price - dp.base_cost),0) AS margin FROM orders o JOIN data_packages dp ON o.package_id=dp.id WHERE o.status='completed'`);
    const chargeR       = await pool.query("SELECT COALESCE(SUM(charge_amount),0) AS charges FROM withdrawals WHERE status='approved'");
    const manualChargeR = await pool.query("SELECT COALESCE(SUM(charge_amount),0) AS charges FROM manual_withdrawals WHERE status='approved'");
    const payoutsR      = await pool.query("SELECT COALESCE(SUM(net_amount),0) AS total FROM withdrawals WHERE status='approved'");
    const manualPayoutsR= await pool.query("SELECT COALESCE(SUM(net_amount),0) AS total FROM manual_withdrawals WHERE status='approved'");

    const totalSales   = parseFloat(salesR.rows[0].total);
    const adminMargin  = parseFloat(marginR.rows[0].margin);
    const wdCharges    = parseFloat(chargeR.rows[0].charges) + parseFloat(manualChargeR.rows[0].charges);
    const totalPayouts = parseFloat(payoutsR.rows[0].total) + parseFloat(manualPayoutsR.rows[0].total);
    const adminProfit  = adminMargin + wdCharges;
    const platformMargin = totalSales > 0 ? ((adminProfit / totalSales) * 100).toFixed(2) : '0.00';

    res.json({ totalSales, adminMargin, wdCharges, adminProfit, totalPayouts, platformMargin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate profit' });
  }
};

// ── GET CHECK HOLDING ─────────────────────────────────────────
const getCheckHolding = async (req, res) => {
  try {
    const marginR       = await pool.query(`SELECT COALESCE(SUM(dp.base_price - dp.base_cost),0) AS margin FROM orders o JOIN data_packages dp ON o.package_id=dp.id WHERE o.status='completed'`);
    const chargeR       = await pool.query(`SELECT COALESCE(SUM(charge_amount),0) AS c FROM withdrawals WHERE status='approved'`);
    const manualChargeR = await pool.query(`SELECT COALESCE(SUM(charge_amount),0) AS c FROM manual_withdrawals WHERE status='approved'`);
    const payoutsR      = await pool.query(`SELECT COALESCE(SUM(net_amount),0) AS p FROM withdrawals WHERE status='approved'`);
    const manualPayoutsR= await pool.query(`SELECT COALESCE(SUM(net_amount),0) AS p FROM manual_withdrawals WHERE status='approved'`);

    const adminMargin  = parseFloat(marginR.rows[0].margin);
    const charges      = parseFloat(chargeR.rows[0].c) + parseFloat(manualChargeR.rows[0].c);
    const totalPaidOut = parseFloat(payoutsR.rows[0].p) + parseFloat(manualPayoutsR.rows[0].p);
    const adminHolding = adminMargin + charges - totalPaidOut;

    const agentsR = await pool.query(
      `SELECT u.id, u.username, u.email, u.store_name,
              COALESCE((SELECT SUM(CASE WHEN t.type='credit' THEN t.amount ELSE -t.amount END) FROM transactions t JOIN wallets w ON t.wallet_id=w.id WHERE w.user_id=u.id), 0) AS wallet_balance
       FROM users u WHERE u.role='agent' ORDER BY wallet_balance DESC`
    );

    const totalAgentHolding = agentsR.rows.reduce((s, a) => s + parseFloat(a.wallet_balance), 0);

    res.json({
      adminHolding,
      totalAgentHolding,
      grandTotal: adminHolding + totalAgentHolding,
      agents: agentsR.rows.map(a => ({
        id: a.id, username: a.username, email: a.email,
        store_name: a.store_name, wallet_balance: parseFloat(a.wallet_balance),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get holdings' });
  }
};

// ── GET AGENT STATS ───────────────────────────────────────────
const getAgentStats = async (req, res) => {
  const { agent_id } = req.params;
  const { range = 'weekly' } = req.query;
  try {
    let dateFilter = "NOW() - INTERVAL '7 days'";
    if (range === 'daily')   dateFilter = "NOW() - INTERVAL '1 day'";
    if (range === 'monthly') dateFilter = "NOW() - INTERVAL '1 month'";
    if (range === 'yearly')  dateFilter = "NOW() - INTERVAL '1 year'";

    const [ordersR, custR, byDateR, netR, wdR] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total_orders, COALESCE(SUM(o.amount_paid),0) AS total_revenue, COALESCE(SUM(o.amount_paid - dp.base_price),0) AS total_profit
         FROM orders o JOIN data_packages dp ON o.package_id=dp.id
         WHERE o.agent_id=$1 AND o.status='completed' AND o.created_at >= ${dateFilter}`, [agent_id]
      ),
      pool.query(`SELECT COUNT(DISTINCT customer_phone) AS unique_customers FROM orders WHERE agent_id=$1 AND created_at >= ${dateFilter}`, [agent_id]),
      pool.query(`SELECT TO_CHAR(o.created_at,'YYYY-MM-DD') AS date, COUNT(*) AS count FROM orders o WHERE o.agent_id=$1 AND o.created_at >= ${dateFilter} GROUP BY TO_CHAR(o.created_at,'YYYY-MM-DD') ORDER BY date`, [agent_id]),
      pool.query(`SELECT dp.network, COUNT(*) AS count FROM orders o JOIN data_packages dp ON o.package_id=dp.id WHERE o.agent_id=$1 AND o.created_at >= ${dateFilter} GROUP BY dp.network ORDER BY count DESC`, [agent_id]),
      pool.query(`SELECT COUNT(*) AS total_withdrawals, COALESCE(SUM(net_amount),0) AS total_withdrawn FROM (SELECT net_amount FROM withdrawals WHERE agent_id=$1 AND status='approved' UNION ALL SELECT net_amount FROM manual_withdrawals WHERE agent_id=$1 AND status='approved') combined`, [agent_id]),
    ]);

    res.json({
      totalOrders:         parseInt(ordersR.rows[0].total_orders) || 0,
      totalRevenue:        parseFloat(ordersR.rows[0].total_revenue) || 0,
      totalProfit:         parseFloat(ordersR.rows[0].total_profit) || 0,
      uniqueCustomers:     parseInt(custR.rows[0].unique_customers) || 0,
      totalWithdrawals:    parseInt(wdR.rows[0].total_withdrawals) || 0,
      totalWithdrawn:      parseFloat(wdR.rows[0].total_withdrawn) || 0,
      orders:              byDateR.rows.map(r => ({ label: r.date, value: parseInt(r.count) })),
      networkDistribution: netR.rows.map(r => ({ label: r.network, value: parseInt(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent stats' });
  }
};

module.exports = {
  getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
  createUser, getAllUsers, getSuspendedAgents, reactivateSuspendedAgent,
  updatePackage, createPackage, getDashboardStats, getTerms, updateTerms,
  getAdminProfit, getCheckHolding, getAgentStats,
};
