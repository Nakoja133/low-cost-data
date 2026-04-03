const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');

// PAYSTACK WEBHOOK
router.post('/paystack', async (req, res) => {
  console.log('🔔 Webhook received:', req.body.event);

  // ⚠️ TEMPORARY: Skip signature validation for local testing
  /*
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.log('❌ Invalid Paystack signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  */
  
  console.log('⚠️ Signature validation skipped (development mode)');

  const event = req.body;

  if (event.event === 'charge.success') {
    try {
      const { reference, amount, metadata } = event.data;
      const amountInGhana = amount / 100;

      console.log('✅ Payment successful:', {
        reference,
        amount: amountInGhana,
        metadata,
      });

      // Find the order
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE reference = $1',
        [reference]
      );

      if (orderResult.rows.length === 0) {
        console.log('❌ Order not found:', reference);
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      // Check if already processed
      if (order.status === 'completed') {
        console.log('⚠️ Order already processed:', reference);
        return res.json({ status: 'already processed' });
      }

      // Update order status to completed
      await pool.query(
        'UPDATE orders SET status = \'completed\', updated_at = NOW() WHERE id = $1',
        [order.id]
      );

      console.log('✅ Order status updated to completed:', order.id);

      // Get package base cost
      const packageResult = await pool.query(
        'SELECT base_cost FROM data_packages WHERE id = $1',
        [order.package_id]
      );

      if (packageResult.rows.length === 0) {
        console.log('❌ Package not found:', order.package_id);
        return res.status(404).json({ error: 'Package not found' });
      }

      const baseCost = parseFloat(packageResult.rows[0].base_cost);
      const amountPaid = parseFloat(order.amount_paid);
      const profit = amountPaid - baseCost;

      console.log('💵 Calculating profit:', {
        amount_paid: amountPaid,
        base_cost: baseCost,
        profit: profit,
        agent_id: order.agent_id,
      });

      // Credit agent's wallet with profit
      if (profit > 0 && order.agent_id) {
        // Find or create wallet
        const walletResult = await pool.query(
          'SELECT id FROM wallets WHERE user_id = $1',
          [order.agent_id]
        );

        let walletId;
        if (walletResult.rows.length === 0) {
          const newWallet = await pool.query(
            'INSERT INTO wallets (user_id) VALUES ($1) RETURNING id',
            [order.agent_id]
          );
          walletId = newWallet.rows[0].id;
          console.log('✅ Created new wallet:', walletId);
        } else {
          walletId = walletResult.rows[0].id;
          console.log('✅ Using existing wallet:', walletId);
        }

        // Check if transaction already exists
        const existingTransaction = await pool.query(
          'SELECT id FROM transactions WHERE reference = $1',
          [order.reference]
        );

        let finalBalance = 0; // ✅ DECLARE OUTSIDE IF BLOCK

        if (existingTransaction.rows.length === 0) {
          // Calculate current balance BEFORE adding this transaction
          const balanceBeforeResult = await pool.query(
            `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
             FROM transactions WHERE wallet_id = $1`,
            [walletId]
          );
          const balanceBefore = parseFloat(balanceBeforeResult.rows[0].balance);
          const balanceAfter = balanceBefore + profit;

          // Add transaction (credit)
          await pool.query(
            `INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference)
             VALUES ($1, 'credit', $2, $3, $4, $5)`,
            [walletId, profit, balanceAfter, `Profit from order ${order.reference}`, order.reference]
          );

          finalBalance = balanceAfter; // ✅ SET VALUE

          console.log('✅ Transaction recorded:', {
            wallet_id: walletId,
            amount: profit,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference: order.reference,
          });
        } else {
          console.log('⚠️ Transaction already exists:', order.reference);
          // Get current balance
          const balanceResult = await pool.query(
            `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance 
             FROM transactions WHERE wallet_id = $1`,
            [walletId]
          );
          finalBalance = parseFloat(balanceResult.rows[0].balance);
        }

        // ✅ NOW THIS WORKS - finalBalance is defined
        console.log('✅ New wallet balance:', finalBalance);

      } else {
        console.log('⚠️ No profit to credit or no agent_id:', { profit, agent_id: order.agent_id });
      }

      res.json({ status: 'success' });
    } catch (err) {
      console.error('❌ Webhook error:', err.message);
      console.error('Full error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  } else {
    console.log('⚠️ Ignoring event:', event.event);
    res.json({ status: 'ignored' });
  }
});

module.exports = router;