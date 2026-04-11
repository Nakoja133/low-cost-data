const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const auth    = require('../middleware/auth');

const generateSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

// ── WALLET ────────────────────────────────────────────────────
router.get('/wallet', auth, async (req, res) => {
  try {
    const wr = await pool.query('SELECT id FROM wallets WHERE user_id=$1', [req.user.id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Wallet not found' });
    const walletId = wr.rows[0].id;
    const [balR, pendR] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) AS balance FROM transactions WHERE wallet_id=$1`, [walletId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS pending FROM withdrawals WHERE agent_id=$1 AND status='pending'`, [req.user.id]),
    ]);
    const balance = parseFloat(balR.rows[0].balance);
    const pending = parseFloat(pendR.rows[0].pending);
    res.json({ balance, pending_withdrawals: pending, available: balance - pending });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch wallet' }); }
});

// ── ORDERS ────────────────────────────────────────────────────
router.get('/orders', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,reference,customer_phone,customer_name,package_id,amount_paid,status,created_at
       FROM orders WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// ── STATISTICS ────────────────────────────────────────────────
router.get('/statistics', auth, async (req, res) => {
  const { range = 'weekly' } = req.query;
  let dateFilter = "NOW()-INTERVAL '7 days'", dateFormat = 'YYYY-MM-DD';
  if (range === 'daily')   { dateFilter = "NOW()-INTERVAL '1 day'";    dateFormat = 'HH24:00'; }
  if (range === 'monthly') { dateFilter = "NOW()-INTERVAL '1 month'";  dateFormat = 'YYYY-MM-DD'; }
  if (range === 'yearly')  { dateFilter = "NOW()-INTERVAL '1 year'";   dateFormat = 'YYYY-MM'; }
  try {
    const [ordR, custR, byDateR, netR, recentR] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total_orders,
                COALESCE(SUM(o.amount_paid),0) AS total_revenue,
                COALESCE(SUM(o.amount_paid - dp.base_price),0) AS total_profit
         FROM orders o JOIN data_packages dp ON o.package_id=dp.id
         WHERE o.agent_id=$1 AND o.status='completed' AND o.created_at>=${dateFilter}`, [req.user.id]
      ),
      pool.query(`SELECT COUNT(DISTINCT customer_phone) AS c FROM orders WHERE agent_id=$1 AND created_at>=${dateFilter}`, [req.user.id]),
      pool.query(
        `SELECT TO_CHAR(created_at,'${dateFormat}') AS date,COUNT(*) AS count
         FROM orders WHERE agent_id=$1 AND created_at>=${dateFilter}
         GROUP BY TO_CHAR(created_at,'${dateFormat}') ORDER BY date`, [req.user.id]
      ),
      pool.query(
        `SELECT dp.network,COUNT(*) AS count FROM orders o
         JOIN data_packages dp ON o.package_id=dp.id
         WHERE o.agent_id=$1 AND o.created_at>=${dateFilter}
         GROUP BY dp.network ORDER BY count DESC`, [req.user.id]
      ),
      pool.query(`SELECT reference,amount_paid,status,created_at FROM orders WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
    ]);
    res.json({
      totalOrders:         parseInt(ordR.rows[0].total_orders) || 0,
      totalRevenue:        parseFloat(ordR.rows[0].total_revenue) || 0,
      totalProfit:         parseFloat(ordR.rows[0].total_profit) || 0,
      uniqueCustomers:     parseInt(custR.rows[0].c) || 0,
      orders:              byDateR.rows.map(r => ({ label: r.date, value: parseInt(r.count) })),
      networkDistribution: netR.rows.map(r => ({ label: r.network, value: parseInt(r.count) })),
      recentOrders:        recentR.rows,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch statistics', details: err.message }); }
});

// ── WITHDRAWAL HISTORY ────────────────────────────────────────
router.get('/withdrawal-history', auth, async (req, res) => {
  try {
    const [autoR, manualR] = await Promise.all([
      pool.query(
        `SELECT id,amount,net_amount,charge_amount,account_number AS momo_number,account_name,
                status,reference,created_at,'automatic' AS type
         FROM withdrawals WHERE agent_id=$1`, [req.user.id]
      ),
      pool.query(
        `SELECT id,amount,net_amount,charge_amount,momo_number,account_name,
                status,CONCAT('MW-',id::text) AS reference,created_at,'manual' AS type
         FROM manual_withdrawals WHERE agent_id=$1`, [req.user.id]
      ),
    ]);
    // Merge & sort by date desc
    const all = [...autoR.rows, ...manualR.rows].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    res.json({ data: all });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch withdrawal history' }); }
});

// ── TERMS ─────────────────────────────────────────────────────
router.get('/terms', auth, async (req, res) => {
  try {
    const r = await pool.query("SELECT setting_value FROM admin_settings WHERE setting_key='agent_terms'");
    res.json({ terms: r.rows[0]?.setting_value || '' });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch terms' }); }
});

router.post('/accept-terms', auth, async (req, res) => {
  try {
    await pool.query(`UPDATE users SET terms_accepted=true,terms_accepted_at=NOW() WHERE id=$1`, [req.user.id]);
    res.json({ message: 'Terms accepted' });
  } catch (err) { res.status(500).json({ error: 'Failed to accept terms' }); }
});

router.get('/terms-status', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT terms_accepted,terms_accepted_at FROM users WHERE id=$1', [req.user.id]);
    res.json({ terms_accepted: r.rows[0]?.terms_accepted || false, terms_accepted_at: r.rows[0]?.terms_accepted_at || null });
  } catch (err) { res.status(500).json({ error: 'Failed to check terms status' }); }
});

router.get('/settings', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT setting_key,setting_value FROM admin_settings
       WHERE setting_key IN ('whatsapp_group_link','telegram_link','min_withdrawal_amount','help_center_email')`
    );
    const settings = {};
    r.rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent settings' });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
router.get('/notifications', auth, async (req, res) => {
  try {
    const [userR, settR] = await Promise.all([
      pool.query(
        `SELECT terms_notif_seen_at,withdrawal_notif_seen_at,package_notif_seen_at,link_notif_seen_at,username
         FROM users WHERE id=$1`, [req.user.id]
      ),
      pool.query(
        `SELECT setting_key,setting_value FROM admin_settings
         WHERE setting_key IN ('terms_last_updated','min_withdrawal_last_updated','min_withdrawal_amount',
                               'packages_last_updated','links_last_updated','links_updated_detail')`
      ),
    ]);
    const u = userR.rows[0];
    const s = {};
    settR.rows.forEach(r => { s[r.setting_key] = r.setting_value; });

    const notifications = [];

    // Terms
    if (s.terms_last_updated) {
      const updated = new Date(s.terms_last_updated);
      const seen    = u.terms_notif_seen_at ? new Date(u.terms_notif_seen_at) : null;
      if (!seen || updated > seen) notifications.push({ type: 'terms' });
    }
    // Min withdrawal
    if (s.min_withdrawal_last_updated) {
      const updated = new Date(s.min_withdrawal_last_updated);
      const seen    = u.withdrawal_notif_seen_at ? new Date(u.withdrawal_notif_seen_at) : null;
      if (!seen || updated > seen) notifications.push({ type: 'min_withdrawal', new_amount: parseFloat(s.min_withdrawal_amount || 1).toFixed(2) });
    }
    // Packages
    if (s.packages_last_updated) {
      const updated = new Date(s.packages_last_updated);
      const seen    = u.package_notif_seen_at ? new Date(u.package_notif_seen_at) : null;
      if (!seen || updated > seen) notifications.push({ type: 'package_update' });
    }
    // Platform links
    if (s.links_last_updated) {
      const updated = new Date(s.links_last_updated);
      const seen    = u.link_notif_seen_at ? new Date(u.link_notif_seen_at) : null;
      if (!seen || updated > seen) notifications.push({ type: 'link_update', platform: s.links_updated_detail || 'platform links' });
    }

    res.json({ notifications, username: u.username });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

router.post('/notifications/dismiss', auth, async (req, res) => {
  const { type } = req.body;
  try {
    if (type === 'terms')          await pool.query(`UPDATE users SET terms_notif_seen_at=NOW() WHERE id=$1`, [req.user.id]);
    if (type === 'min_withdrawal') await pool.query(`UPDATE users SET withdrawal_notif_seen_at=NOW() WHERE id=$1`, [req.user.id]);
    if (type === 'package_update') await pool.query(`UPDATE users SET package_notif_seen_at=NOW() WHERE id=$1`, [req.user.id]);
    if (type === 'link_update')    await pool.query(`UPDATE users SET link_notif_seen_at=NOW() WHERE id=$1`, [req.user.id]);
    res.json({ message: 'Dismissed' });
  } catch (err) { res.status(500).json({ error: 'Failed to dismiss' }); }
});

// ── STORE NAME ────────────────────────────────────────────────
router.put('/store-name', auth, async (req, res) => {
  const { store_name } = req.body;
  if (!store_name?.trim()) return res.status(400).json({ error: 'Store name is required' });
  try {
    let slug = generateSlug(store_name.trim());
    const sc = await pool.query('SELECT id FROM users WHERE store_slug=$1 AND id!=$2', [slug, req.user.id]);
    if (sc.rows.length) slug = `${slug}-${Math.random().toString(36).substr(2,4)}`;
    const r = await pool.query(
      `UPDATE users SET store_name=$1,store_slug=$2,updated_at=NOW() WHERE id=$3 RETURNING store_name,store_slug`,
      [store_name.trim(), slug, req.user.id]
    );
    res.json({ message: 'Store name updated', store_name: r.rows[0].store_name, store_slug: r.rows[0].store_slug });
  } catch (err) { res.status(500).json({ error: 'Failed to update store name' }); }
});

// ── CREATE SUB-AGENT ──────────────────────────────────────────
router.post('/create-agent', auth, async (req, res) => {
  const { email, password, phone, store_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const ex = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (ex.rows.length) return res.status(400).json({ error: 'Email already in use' });
    const bcrypt = require('bcryptjs');
    const hash   = await bcrypt.hash(password, 10);
    let slug = null;
    if (store_name?.trim()) {
      slug = generateSlug(store_name.trim());
      const sc = await pool.query('SELECT id FROM users WHERE store_slug=$1', [slug]);
      if (sc.rows.length) slug = `${slug}-${Math.random().toString(36).substr(2,4)}`;
    }
    const r = await pool.query(
      `INSERT INTO users (email,password_hash,role,phone,store_slug,store_name,invited_by,is_active,terms_accepted)
       VALUES ($1,$2,'agent',$3,$4,$5,$6,true,false) RETURNING id,email,role,store_slug,store_name`,
      [email, hash, phone || null, slug, store_name || null, req.user.id]
    );
    await pool.query('INSERT INTO wallets (user_id) VALUES ($1)', [r.rows[0].id]);
    res.status(201).json({ message: 'Agent created successfully', user: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create agent', details: err.message }); }
});

module.exports = router;
