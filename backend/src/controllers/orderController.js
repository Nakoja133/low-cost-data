const pool = require('../config/database');
const axios = require('axios');

// CREATE ORDER (Initialize Payment)
exports.createOrder = async (req, res) => {
  const { phone, network, package_id, agent_id } = req.body;

  // 🔐 DEBUG: Check ALL environment variables
  console.log('=== 🔐 ENVIRONMENT DEBUG ===');
  console.log('PAYSTACK_SECRET_KEY loaded:', !!process.env.PAYSTACK_SECRET_KEY);
  console.log('PAYSTACK_SECRET_KEY length:', process.env.PAYSTACK_SECRET_KEY?.length);
  console.log('PAYSTACK_SECRET_KEY starts with:', process.env.PAYSTACK_SECRET_KEY?.substring(0, 10));
  
  console.log('XRAYGH_API_KEY loaded:', !!process.env.XRAYGH_API_KEY);
  console.log('XRAYGH_API_KEY length:', process.env.XRAYGH_API_KEY?.length);
  
  console.log('XRAYGH_API_URL:', process.env.XRAYGH_API_URL);
  console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
  console.log('==============================');

  try {
    // 1. Get package details
    const packageResult = await pool.query(
      'SELECT * FROM data_packages WHERE id = $1 AND is_active = true',
      [package_id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = packageResult.rows[0];

    // 2. Determine price (Agent price or Base price)
    let final_price = pkg.base_price;

    if (agent_id) {
      // Check if agent has custom price for this package
      const agentPriceResult = await pool.query(
        'SELECT selling_price FROM agent_prices WHERE agent_id = $1 AND package_id = $2',
        [agent_id, package_id]
      );

      if (agentPriceResult.rows.length > 0) {
        final_price = agentPriceResult.rows[0].selling_price;
      }
    }

    // 3. Generate unique reference
    const reference = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 4. Create order in database (status: pending)
    const newOrder = await pool.query(
      `INSERT INTO orders (reference, customer_phone, agent_id, package_id, amount_paid, status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [reference, phone, agent_id || null, package_id, final_price, 'pending']
    );

    // 5. Initialize Paystack Payment
    console.log('Initializing Paystack payment...');
    console.log('Amount:', final_price * 100, 'pesewas');
    console.log('Reference:', reference);

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: `${phone}@customer.com`,
        amount: final_price * 100, // Paystack works in pesewas
        reference: reference,
        metadata: {
          order_id: newOrder.rows[0].id,
          phone: phone,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Paystack response status:', paystackResponse.status);

    res.json({
      message: 'Order created. Proceed to payment.',
      order: newOrder.rows[0],
      payment_url: paystackResponse.data.data.authorization_url,
    });
  } catch (err) {
    console.error('Order creation error:', err.message);
    if (err.response) {
      console.error('Paystack error response:', err.response.data);
      console.error('Paystack error status:', err.response.status);
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// GET ORDER STATUS
exports.getOrderStatus = async (req, res) => {
  const { reference } = req.params;

  try {
    const order = await pool.query('SELECT * FROM orders WHERE reference = $1', [reference]);

    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ data: order.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};