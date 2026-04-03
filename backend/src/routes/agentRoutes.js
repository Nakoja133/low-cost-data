const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET AGENT WALLET
router.get('/wallet', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const walletResult = await pool.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const walletId = walletResult.rows[0].id;

    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
       FROM transactions WHERE wallet_id = $1`,
      [walletId]
    );

    res.json({ balance: parseFloat(balanceResult.rows[0].balance) });
  } catch (err) {
    console.error('Get wallet error:', err.message);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// GET AGENT ORDERS
router.get('/orders', auth, async (req, res) => {
  const agent_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, reference, customer_phone, customer_name, package_id, amount_paid, status, created_at 
       FROM orders 
       WHERE agent_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [agent_id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get agent orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET AGENT STATISTICS
router.get('/statistics', auth, async (req, res) => {
  const agent_id = req.user.id;
  const { range = 'weekly' } = req.query;

  console.log('📊 Statistics Request:');
  console.log('  Agent ID:', agent_id);
  console.log('  Range:', range);

  try {
    let dateFilter = 'NOW() - INTERVAL \'7 days\'';
    let dateFormat = 'YYYY-MM-DD';
    
    if (range === 'daily') {
      dateFilter = 'NOW() - INTERVAL \'1 day\'';
      dateFormat = 'HH24:00';
    } else if (range === 'monthly') {
      dateFilter = 'NOW() - INTERVAL \'1 month\'';
      dateFormat = 'YYYY-MM-DD';
    } else if (range === 'yearly') {
      dateFilter = 'NOW() - INTERVAL \'1 year\'';
      dateFormat = 'YYYY-MM';
    }

    const ordersResult = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(amount_paid), 0) as total_revenue,
        COALESCE(SUM(amount_paid - dp.base_cost), 0) as total_profit
       FROM orders o
       JOIN data_packages dp ON o.package_id = dp.id
       WHERE o.agent_id = $1 AND o.created_at >= ${dateFilter}`,
      [agent_id]
    );

    const customersResult = await pool.query(
      `SELECT COUNT(DISTINCT customer_phone) as unique_customers
       FROM orders 
       WHERE agent_id = $1 AND created_at >= ${dateFilter}`,
      [agent_id]
    );

    const ordersByDate = await pool.query(
      `SELECT TO_CHAR(o.created_at, '${dateFormat}') as date, COUNT(*) as count
       FROM orders o
       WHERE o.agent_id = $1 AND o.created_at >= ${dateFilter}
       GROUP BY TO_CHAR(o.created_at, '${dateFormat}')
       ORDER BY date`,
      [agent_id]
    );

    const networkDist = await pool.query(
      `SELECT dp.network, COUNT(*) as count
       FROM orders o
       JOIN data_packages dp ON o.package_id = dp.id
       WHERE o.agent_id = $1 AND o.created_at >= ${dateFilter}
       GROUP BY dp.network
       ORDER BY count DESC`,
      [agent_id]
    );

    const recentOrders = await pool.query(
      `SELECT reference, amount_paid, status, created_at
       FROM orders 
       WHERE agent_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [agent_id]
    );

    console.log('✅ Statistics fetched successfully');

    res.json({
      totalOrders: parseInt(ordersResult.rows[0].total_orders) || 0,
      totalRevenue: parseFloat(ordersResult.rows[0].total_revenue) || 0,
      totalProfit: parseFloat(ordersResult.rows[0].total_profit) || 0,
      uniqueCustomers: parseInt(customersResult.rows[0].unique_customers) || 0,
      orders: ordersByDate.rows.map(r => ({ label: r.date, value: parseInt(r.count) })),
      networkDistribution: networkDist.rows.map(r => ({ label: r.network, value: parseInt(r.count) })),
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    console.error('❌ Statistics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch statistics', details: err.message });
  }
});

// ACCEPT TERMS
router.post('/accept-terms', auth, async (req, res) => {
  const userId = req.user.id;

  console.log('✅ Accept Terms Request:');
  console.log('  User ID:', userId);

  try {
    await pool.query(
      `UPDATE users 
       SET terms_accepted = true, terms_accepted_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    console.log('✅ Terms accepted by user:', userId);

    res.json({ message: 'Terms accepted successfully' });
  } catch (err) {
    console.error('❌ Accept terms error:', err.message);
    res.status(500).json({ error: 'Failed to accept terms', details: err.message });
  }
});

// CHECK TERMS STATUS
router.get('/terms-status', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT terms_accepted, terms_accepted_at FROM users WHERE id = $1',
      [userId]
    );

    res.json({ 
      terms_accepted: result.rows[0]?.terms_accepted || false,
      terms_accepted_at: result.rows[0]?.terms_accepted_at || null,
    });
  } catch (err) {
    console.error('Check terms error:', err.message);
    res.status(500).json({ error: 'Failed to check terms status' });
  }
});

module.exports = router;