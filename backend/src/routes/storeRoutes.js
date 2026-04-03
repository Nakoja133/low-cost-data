const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const axios = require('axios');

// GET STORE INFO BY SLUG
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  console.log('🏪 Fetching store:', slug);

  try {
    // Get agent info
    const agentResult = await pool.query(
      `SELECT id, email, phone, username, store_slug, whatsapp_number 
       FROM users 
       WHERE store_slug = $1 AND role = 'agent' AND is_active = true`,
      [slug]
    );
    
    if (agentResult.rows.length === 0) {
      console.log('❌ Store not found:', slug);
      return res.status(404).json({ error: 'Store not found' });
    }

    const agent = agentResult.rows[0];

    // Get active packages
    const packagesResult = await pool.query(
      `SELECT id, network, description, base_price, api_code 
       FROM data_packages 
       WHERE is_active = true
       ORDER BY network, base_price ASC`
    );

    // Get agent's custom prices
    const pricesResult = await pool.query(
      `SELECT package_id, selling_price 
      FROM agent_prices 
      WHERE agent_id = $1`,
      [agent.id]
    );

    // Merge packages with custom prices
    const packages = packagesResult.rows.map(pkg => {
      const customPrice = pricesResult.rows.find(p => p.package_id === pkg.id);
      return {
        ...pkg,
        price: customPrice ? customPrice.selling_price : pkg.base_price,
      };
    });

    console.log('✅ Store found with', packages.length, 'packages');

    res.json({
      agent: {
        id: agent.id,
        email: agent.email,
        username: agent.username,
        phone: agent.phone,
        store_slug: agent.store_slug,
        whatsapp_number: agent.whatsapp_number,
      },
      packages,
    });
  } catch (err) {
    console.error('❌ Store fetch error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// CREATE ORDER FROM STORE
router.post('/:slug/order', async (req, res) => {
  const { slug } = req.params;
  const { phone, package_id, customer_name } = req.body;

  console.log('📦 Creating order for store:', slug);
  console.log('  Phone:', phone);
  console.log('  Package:', package_id);

  try {
    // Verify store exists
    const agentResult = await pool.query(
      'SELECT id FROM users WHERE store_slug = $1 AND role = \'agent\' AND is_active = true',
      [slug]
    );
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const agent_id = agentResult.rows[0].id;

    // Get package with agent's custom price
    const pkgResult = await pool.query(
      `SELECT dp.*, ap.selling_price
       FROM data_packages dp
       LEFT JOIN agent_prices ap ON dp.id = ap.package_id AND ap.agent_id = $1
       WHERE dp.id = $2 AND dp.is_active = true`,
      [agent_id, package_id]
    );
    
    if (pkgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = pkgResult.rows[0];
    const final_price = pkg.selling_price || pkg.base_price;

    // Generate reference
    const reference = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (reference, customer_phone, customer_name, agent_id, package_id, amount_paid, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [reference, phone, customer_name || null, agent_id, package_id, final_price]
    );

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: `${phone.replace(/[^0-9]/g, '')}@customer.com`,
        amount: final_price * 100, // Convert to kobo
        reference: reference,
        metadata: {
          order_id: orderResult.rows[0].id,
          phone: phone,
          agent_id: agent_id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Order created:', reference);

    res.json({
      message: 'Order created. Proceed to payment.',
      order: orderResult.rows[0],
      payment_url: paystackResponse.data.data.authorization_url,
    });
  } catch (err) {
    console.error('❌ Store order error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// TRACK ORDER BY PHONE
router.get('/:slug/orders/track', async (req, res) => {
  const { slug } = req.params;
  const { phone, name } = req.query;

  try {
    // Get agent
    const agentResult = await pool.query(
      'SELECT id FROM users WHERE store_slug = $1 AND role = \'agent\'',
      [slug]
    );
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get most recent order
    const orderResult = await pool.query(
      `SELECT o.*, dp.description as package_name
       FROM orders o
       JOIN data_packages dp ON o.package_id = dp.id
       WHERE o.agent_id = $1 
         AND o.customer_phone = $2
         AND ($3::text IS NULL OR o.customer_name = $3)
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [agentResult.rows[0].id, phone, name || null]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'No orders found' });
    }

    res.json(orderResult.rows[0]);
  } catch (err) {
    console.error('Track order error:', err.message);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

module.exports = router;