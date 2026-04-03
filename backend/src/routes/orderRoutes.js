const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET ALL ORDERS
router.get('/', auth, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT o.*, u.email as agent_email 
        FROM orders o
        LEFT JOIN users u ON o.agent_id = u.id
        ORDER BY o.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT * FROM orders 
        WHERE agent_id = $1 
        ORDER BY created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// CREATE ORDER
router.post('/', auth, async (req, res) => {
  const { phone, network, package_id, agent_id, customer_name } = req.body;

  console.log('📦 Creating order:', { phone, network, package_id, agent_id });

  try {
    // Get package details
    const packageResult = await pool.query(
      'SELECT * FROM data_packages WHERE id = $1',
      [package_id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = packageResult.rows[0];
    const sellingAgentId = agent_id || req.user.id;

    // Get agent's selling price (if set) or use base price
    const priceResult = await pool.query(
      'SELECT selling_price FROM agent_prices WHERE agent_id = $1 AND package_id = $2',
      [sellingAgentId, package_id]
    );

    const sellingPrice = priceResult.rows.length > 0 
      ? parseFloat(priceResult.rows[0].selling_price)
      : parseFloat(pkg.base_price);

    // Generate reference
    const reference = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order in database
    const orderResult = await pool.query(
      `INSERT INTO orders (reference, customer_phone, customer_name, agent_id, package_id, amount_paid, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [reference, phone, customer_name || null, sellingAgentId, package_id, sellingPrice]
    );

    const order = orderResult.rows[0];

    console.log('✅ Order created:', order.id);

    // Initialize Paystack payment
    try {
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: `${phone}@customer.com`,
          amount: sellingPrice * 100,
          reference: reference,
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/agent/dashboard`,
          metadata: {
            order_id: order.id,
            phone: phone,
            agent_id: sellingAgentId,
            package_id: package_id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Paystack initialized:', paystackResponse.data.data.authorization_url);

      res.status(201).json({
        message: 'Order created. Proceed to payment.',
        order: order,
        payment_url: paystackResponse.data.data.authorization_url,
      });
    } catch (paystackError) {
      console.error('❌ Paystack error:', paystackError.response?.data || paystackError.message);
      res.status(201).json({
        message: 'Order created but payment initialization failed.',
        order: order,
        payment_url: null,
      });
    }
  } catch (err) {
    console.error('❌ Create order error:', err.message);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

module.exports = router;