const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const axios   = require('axios');

const PAYSTACK_FEE = 0.0195; // 1.95%

// ============================================
// GET STORE INFO BY SLUG
// ============================================
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const agentResult = await pool.query(
      `SELECT id, email, phone, username, store_slug, store_name, whatsapp_number
       FROM users WHERE store_slug=$1 AND role='agent' AND is_active=true`,
      [slug]
    );
    if (!agentResult.rows.length) return res.status(404).json({ error: 'Store not found' });

    const agent = agentResult.rows[0];

    const packagesResult = await pool.query(
      `SELECT id, network, description, base_price, api_code
       FROM data_packages WHERE is_active=true ORDER BY network, base_price ASC`
    );
    const pricesResult = await pool.query(
      'SELECT package_id, selling_price FROM agent_prices WHERE agent_id=$1',
      [agent.id]
    );

    const packages = packagesResult.rows.map(pkg => {
      const custom = pricesResult.rows.find(p => p.package_id === pkg.id);
      return { ...pkg, price: custom ? parseFloat(custom.selling_price) : parseFloat(pkg.base_price) };
    });

    res.json({
      agent: {
        id: agent.id, email: agent.email, username: agent.username,
        phone: agent.phone, store_slug: agent.store_slug,
        store_name: agent.store_name, whatsapp_number: agent.whatsapp_number,
      },
      packages,
    });
  } catch (err) {
    console.error('❌ Store fetch error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// CREATE ORDER FROM STORE
// ============================================
router.post('/:slug/order', async (req, res) => {
  const { slug } = req.params;
  const { phone, package_id, customer_name } = req.body;

  try {
    const agentResult = await pool.query(
      "SELECT id FROM users WHERE store_slug=$1 AND role='agent' AND is_active=true",
      [slug]
    );
    if (!agentResult.rows.length) return res.status(404).json({ error: 'Store not found' });

    const agent_id = agentResult.rows[0].id;

    const pkgResult = await pool.query(
      `SELECT dp.*, ap.selling_price FROM data_packages dp
       LEFT JOIN agent_prices ap ON dp.id=ap.package_id AND ap.agent_id=$1
       WHERE dp.id=$2 AND dp.is_active=true`,
      [agent_id, package_id]
    );
    if (!pkgResult.rows.length) return res.status(404).json({ error: 'Package not found' });

    const pkg         = pkgResult.rows[0];
    const bundle_price = parseFloat(pkg.selling_price || pkg.base_price);

    // ✅ Add 1.95% Paystack fee to the amount charged to the customer
    const total_with_fee = parseFloat((bundle_price * (1 + PAYSTACK_FEE)).toFixed(2));

    const reference = `ORD-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`;

    // Store original bundle_price as amount_paid (what agent earns is based on bundle price)
    const orderResult = await pool.query(
      `INSERT INTO orders (reference, customer_phone, customer_name, agent_id, package_id, amount_paid, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [reference, phone, customer_name || null, agent_id, package_id, bundle_price]
    );

    // Send total_with_fee to Paystack (customer pays bundle + fee)
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email:    `${phone.replace(/[^0-9]/g, '')}@customer.com`,
        amount:   Math.round(total_with_fee * 100), // pesewas, with fee
        reference,
        metadata: {
          order_id:     orderResult.rows[0].id,
          phone,
          agent_id,
          bundle_price,
          fee_added:    (total_with_fee - bundle_price).toFixed(2),
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Order created: ${reference} | Bundle: GH₵${bundle_price} | With fee: GH₵${total_with_fee}`);

    res.json({
      message:     'Order created. Proceed to payment.',
      order:       orderResult.rows[0],
      payment_url: paystackResponse.data.data.authorization_url,
    });
  } catch (err) {
    console.error('❌ Store order error:', err.message);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// ============================================
// TRACK ORDER BY PHONE
// ============================================
router.get('/:slug/orders/track', async (req, res) => {
  const { slug }        = req.params;
  const { phone, name } = req.query;
  try {
    const agentResult = await pool.query(
      "SELECT id FROM users WHERE store_slug=$1 AND role='agent'", [slug]
    );
    if (!agentResult.rows.length) return res.status(404).json({ error: 'Store not found' });

    const orderResult = await pool.query(
      `SELECT o.*, dp.description AS package_name
       FROM orders o JOIN data_packages dp ON o.package_id=dp.id
       WHERE o.agent_id=$1 AND o.customer_phone=$2 AND ($3::text IS NULL OR o.customer_name=$3)
       ORDER BY o.created_at DESC LIMIT 1`,
      [agentResult.rows[0].id, phone, name || null]
    );
    if (!orderResult.rows.length) return res.status(404).json({ error: 'No orders found' });
    res.json(orderResult.rows[0]);
  } catch (err) {
    console.error('Track order error:', err.message);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

module.exports = router;