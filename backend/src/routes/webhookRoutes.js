const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const https = require('https'); // ✅ SSL fix
const pool = require('../config/database');

// ============================================
// VERIFY PAYSTACK SIGNATURE
// ============================================
const verifyPaystackSignature = (req) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === req.headers['x-paystack-signature'];
};

// ============================================
// CALL XRAYGH API TO DELIVER DATA TO CUSTOMER
// ============================================
const callXrayghAPI = async (order) => {
  const { network, customer_phone, reference, api_code } = order;

  // Rate limit: 1 request per ~1 second
  await new Promise(resolve => setTimeout(resolve, 1100));

  let requestBody;

  if (network && network.toUpperCase() === 'MTN') {
    requestBody = {
      network: 'MTN',
      order_set: [
        [customer_phone, parseInt(api_code), reference]
      ],
    };
  } else {
    requestBody = {
      network: network ? network.toUpperCase() : '',
      number: customer_phone,
      package: parseInt(api_code),
      reference,
    };
  }

  console.log('📡 XRAYGH Request:', JSON.stringify(requestBody));

  const response = await axios.post(
    'https://de-xraygh.com/api_init',
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${process.env.XRAYGH_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // ✅ SSL fix
    }
  );

  console.log('✅ XRAYGH Response:', JSON.stringify(response.data));

  if (network && network.toUpperCase() === 'MTN') {
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    if (result?.status === 'Success') {
      return { success: true, data: result };
    }
    throw new Error(result?.message || 'MTN order failed');
  } else {
    if (response.data?.code === 200 || response.data?.status === 'Success') {
      return { success: true, data: response.data };
    }
    throw new Error(response.data?.message || 'Order failed');
  }
};

// ============================================
// PAYSTACK WEBHOOK
// ============================================
router.post('/paystack', async (req, res) => {
  console.log('🔔 Webhook received:', req.body?.event);

  if (!verifyPaystackSignature(req)) {
    console.error('❌ Invalid Paystack webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  if (event.event !== 'charge.success') {
    console.log('⚠️ Ignoring event:', event.event);
    return res.json({ status: 'ignored' });
  }

  const { reference, amount } = event.data;
  const amountInGhana = amount / 100;

  console.log(`💰 Payment verified: ${reference} — GH₵${amountInGhana}`);

  try {
    // 1. Fetch order with package details
    const orderResult = await pool.query(
      `SELECT o.*, dp.network, dp.api_code, dp.base_cost, dp.base_price
       FROM orders o
       JOIN data_packages dp ON o.package_id = dp.id
       WHERE o.reference = $1`,
      [reference]
    );

    if (orderResult.rows.length === 0) {
      console.error('❌ Order not found:', reference);
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Prevent duplicate processing
    if (order.status === 'completed' || order.status === 'processing') {
      console.log('⚠️ Order already processed:', reference, '| status:', order.status);
      return res.json({ status: 'already processed' });
    }

    // 2. Mark as processing immediately to prevent duplicates
    await pool.query(
      "UPDATE orders SET status = 'processing', updated_at = NOW() WHERE reference = $1",
      [reference]
    );

    // 3. Call XRAYGH to deliver data to the customer
    let xrayghResponse;
    try {
      xrayghResponse = await callXrayghAPI(order);
      console.log('✅ Data delivered via XRAYGH for order:', reference);
    } catch (xrayErr) {
      console.error('❌ XRAYGH delivery failed:', xrayErr.message);
      await pool.query(
        `UPDATE orders
         SET status = 'failed',
             xraygh_response = $1,
             updated_at = NOW()
         WHERE reference = $2`,
        [JSON.stringify({ error: xrayErr.message }), reference]
      );
      // Still return 200 so Paystack doesn't retry — the failure is logged
      return res.status(200).json({
        received: true,
        warning: 'Payment received but data delivery failed. Manual action required.',
      });
    }

    // 4. Mark order as completed with XRAYGH response
    await pool.query(
      `UPDATE orders
       SET status = 'completed',
           xraygh_response = $1,
           updated_at = NOW()
       WHERE reference = $2`,
      [JSON.stringify(xrayghResponse), reference]
    );

    console.log('✅ Order marked completed:', reference);

    // 5. Credit agent wallet with their profit
    if (order.agent_id) {
      const basePrice  = parseFloat(order.base_price);
      const amountPaid = parseFloat(order.amount_paid);

      // Agent profit = what they charged customer - what admin charges them
      const agentProfit = amountPaid - basePrice;

      if (agentProfit > 0) {
        // Get or create wallet
        let walletId;
        const walletResult = await pool.query(
          'SELECT id FROM wallets WHERE user_id = $1',
          [order.agent_id]
        );

        if (walletResult.rows.length === 0) {
          const newWallet = await pool.query(
            'INSERT INTO wallets (user_id) VALUES ($1) RETURNING id',
            [order.agent_id]
          );
          walletId = newWallet.rows[0].id;
          console.log('✅ New wallet created for agent:', order.agent_id);
        } else {
          walletId = walletResult.rows[0].id;
        }

        // Prevent duplicate transaction
        const existingTxn = await pool.query(
          'SELECT id FROM transactions WHERE reference = $1',
          [order.reference]
        );

        if (existingTxn.rows.length === 0) {
          const balanceResult = await pool.query(
            `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS balance
             FROM transactions WHERE wallet_id = $1`,
            [walletId]
          );
          const balanceBefore = parseFloat(balanceResult.rows[0].balance);
          const balanceAfter  = balanceBefore + agentProfit;

          await pool.query(
            `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference)
             VALUES ($1, 'credit', $2, $3, $4, $5)`,
            [
              walletId,
              agentProfit,
              balanceAfter,
              `Profit from order ${order.reference}`,
              order.reference,
            ]
          );

          console.log(
            `💰 Agent ${order.agent_id} credited GH₵${agentProfit.toFixed(2)}, new balance: GH₵${balanceAfter.toFixed(2)}`
          );
        } else {
          console.log('⚠️ Transaction already exists for:', order.reference);
        }
      } else {
        console.log('⚠️ No agent profit to credit (profit ≤ 0):', agentProfit);
      }
    }

    console.log(`🎉 Order fully completed: ${reference}`);
    res.json({ status: 'success' });

  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    await pool.query(
      "UPDATE orders SET status = 'failed', updated_at = NOW() WHERE reference = $1",
      [reference]
    );
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;