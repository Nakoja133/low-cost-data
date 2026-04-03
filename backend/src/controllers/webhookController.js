const crypto = require('crypto');
const pool = require('../config/database');
const axios = require('axios');

// VERIFY PAYSTACK WEBHOOK SIGNATURE
const verifySignature = (req) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === req.headers['x-paystack-signature'];
};

// HANDLE PAYSTACK WEBHOOK
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  
  // Verify webhook signature (security)
  if (!signature || !verifySignature(req)) {
    console.error('⚠️ Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Only process successful payments
  if (event.event !== 'charge.success') {
    console.log('ℹ️ Webhook event ignored:', event.event);
    return res.status(200).json({ received: true });
  }

  const reference = event.data.reference;
  const amount = event.data.amount / 100; // Convert from pesewas

  console.log(`💰 Payment verified: ${reference} - GH₵${amount}`);

  try {
    // 1. Find the order with package details
    const orderResult = await pool.query(
      `SELECT o.*, dp.network, dp.api_code, dp.base_cost, dp.base_price 
       FROM orders o
       JOIN data_packages dp ON o.package_id = dp.id
       WHERE o.reference = $1 FOR UPDATE`,
      [reference]
    );

    if (orderResult.rows.length === 0) {
      console.error(`❌ Order not found: ${reference}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Prevent duplicate processing
    if (order.status !== 'pending') {
      console.log(`ℹ️ Order already processed: ${reference} (status: ${order.status})`);
      return res.status(200).json({ received: true });
    }

    // 2. Update order to 'processing'
    await pool.query(
      'UPDATE orders SET status = $1 WHERE reference = $2',
      ['processing', reference]
    );

    // 3. Call XRAYGH API to deliver data
    console.log(`📡 Calling XRAYGH API for order: ${reference}`);
    
    const xrayghResponse = await callXrayghAPI(order);

    console.log('✅ XRAYGH API response:', JSON.stringify(xrayghResponse, null, 2));

    // 4. Update order to 'completed' and save API response
    await pool.query(
      'UPDATE orders SET status = $1, xraygh_response = $2 WHERE reference = $3',
      ['completed', JSON.stringify(xrayghResponse), reference]
    );

    // 5. Calculate and distribute profits
    await distributeProfits(order, amount);

    console.log(`🎉 Order completed: ${reference}`);
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('❌ Webhook processing error:', err.message);
    
    // Update order to 'failed' if something goes wrong
    await pool.query(
      'UPDATE orders SET status = $1 WHERE reference = $2',
      ['failed', reference]
    );
    
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// CALL XRAYGH API (Handles both MTN and other networks)
const callXrayghAPI = async (order) => {
  const { network, customer_phone, reference, api_code } = order;
  
  // Rate limit: Wait to ensure we don't exceed 1 request per 10 seconds
  await new Promise(resolve => setTimeout(resolve, 1100));

  let requestBody;

  if (network.toUpperCase() === 'MTN') {
    // MTN uses bulk order_set format
    requestBody = {
      network: 'MTN',
      order_set: [
        [customer_phone, parseInt(api_code), reference] // [phone, data_in_MB, reference]
      ]
    };
  } else {
    // Telecel/BigTime/iShare use simple format
    requestBody = {
      network: network.toUpperCase(),
      number: customer_phone,
      package: parseInt(api_code), // data size in MB
      reference: reference
    };
  }

  console.log('📡 XRAYGH Request Details:');
  console.log('  URL:', 'https://de-xraygh.com/api_init');
  console.log('  Network:', network);
  console.log('  Phone:', customer_phone);
  console.log('  Package (MB):', api_code);
  console.log('  Reference:', reference);
  console.log('  Body:', JSON.stringify(requestBody));

  try {
    const response = await axios.post(
      'https://de-xraygh.com/api_init',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${process.env.XRAYGH_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Add Accept header
        },
        timeout: 30000,
      }
    );

    console.log('✅ XRAYGH Response Status:', response.status);
    console.log('✅ XRAYGH Response Data:', JSON.stringify(response.data, null, 2));

    // Parse response based on network
    if (network.toUpperCase() === 'MTN') {
      // MTN returns array of results
      const result = response.data[0];
      if (result?.status === 'Success') {
        return { success: true, data: result };
      } else {
        throw new Error(result?.message || 'MTN order failed');
      }
    } else {
      // Others return single object
      if (response.data?.code === 200 || response.data?.status === 'Success') {
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data?.message || 'Order failed');
      }
    }
  } catch (error) {
    console.error('❌ XRAYGH API Error:');
    console.error('  Status:', error.response?.status);
    console.error('  Message:', error.message);
    console.error('  Response:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Request Headers:', {
      'Authorization': `Bearer ${process.env.XRAYGH_API_KEY?.substring(0, 15)}...`,
      'Content-Type': 'application/json',
    });
    throw error;
  }
};

// DISTRIBUTE PROFITS (Your profit + Agent profit)
const distributeProfits = async (order, amountPaid) => {
  const baseCost = parseFloat(order.base_cost);
  const basePrice = parseFloat(order.base_price);
  const amountPaidFloat = parseFloat(amountPaid);
  
  // Your profit = base_price - base_cost
  const yourProfit = basePrice - baseCost;
  
  // Agent profit = amount_paid - base_price (if agent exists)
  if (order.agent_id) {
    const agentProfit = amountPaidFloat - basePrice;
    
    if (agentProfit > 0) {
      // Credit agent's wallet
      await creditWallet(order.agent_id, agentProfit, `Profit from order ${order.reference}`);
      console.log(`💰 Agent profit: GH₵${agentProfit.toFixed(2)}`);
    }
  }
  
  // Your total profit includes base margin + any agent markup
  const totalYourProfit = yourProfit + (order.agent_id ? Math.max(0, amountPaidFloat - basePrice) : 0);
  console.log(`💰 Your profit: GH₵${totalYourProfit.toFixed(2)}`);
};

// CREDIT WALLET (Add money to user's balance)
const creditWallet = async (userId, amount, description) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get wallet ID
    const walletResult = await client.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    if (walletResult.rows.length === 0) {
      throw new Error('Wallet not found');
    }
    
    const walletId = walletResult.rows[0].id;
    
    // Get current balance (sum of all transactions)
    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
       FROM transactions WHERE wallet_id = $1`,
      [walletId]
    );
    
    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance + amount;
    
    // Create transaction record
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, reference, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        walletId, 
        'credit', 
        amount, 
        newBalance, 
        `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        description
      ]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Wallet credited: GH₵${amount} to user ${userId}`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Wallet credit failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

// GET ORDER STATUS (Helper function)
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