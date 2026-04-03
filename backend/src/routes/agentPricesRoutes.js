const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET AGENT'S PRICES
router.get('/', auth, async (req, res) => {
  const agent_id = req.user.id;

  try {
    console.log('🔍 Fetching prices for agent:', agent_id);
    
    const result = await pool.query(
      'SELECT package_id, selling_price, COALESCE(markup_percentage, 0) as markup_percentage FROM agent_prices WHERE agent_id = $1',
      [agent_id]
    );

    console.log('✅ Prices fetched:', result.rows.length);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('❌ Get agent prices error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Failed to fetch prices', details: err.message });
  }
});

// UPDATE/BULK CREATE PRICES
router.post('/bulk', auth, async (req, res) => {
  const agent_id = req.user.id;
  const { prices } = req.body;

  console.log('💰 Update Agent Prices Request:');
  console.log('  Agent ID:', agent_id);
  console.log('  Prices received:', JSON.stringify(prices, null, 2));

  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    console.log('❌ No prices provided');
    return res.status(400).json({ error: 'No prices provided' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const price of prices) {
      console.log('  Processing price:', price);
      
      // Validate price data
      if (!price.package_id || !price.selling_price) {
        throw new Error(`Invalid price data for package: ${JSON.stringify(price)}`);
      }

      const sellingPrice = parseFloat(price.selling_price);
      const markupPercentage = parseFloat(price.markup_percentage) || 0;

      console.log('    - Package ID:', price.package_id);
      console.log('    - Selling Price:', sellingPrice);
      console.log('    - Markup:', markupPercentage);

      await client.query(
        `INSERT INTO agent_prices (agent_id, package_id, selling_price, markup_percentage)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_id, package_id) DO UPDATE
         SET selling_price = $3, markup_percentage = $4, updated_at = NOW()`,
        [agent_id, price.package_id, sellingPrice, markupPercentage]
      );
      
      console.log('    ✅ Saved successfully');
    }

    await client.query('COMMIT');
    console.log('✅ All prices updated successfully');

    res.json({ message: 'Prices updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Update prices error:', err.message);
    console.error('Full error stack:', err.stack);
    console.error('Price data that failed:', JSON.stringify(prices, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to update prices', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    client.release();
  }
});

module.exports = router;