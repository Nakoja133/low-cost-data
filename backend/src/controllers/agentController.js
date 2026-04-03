const pool = require('../config/database');

// SET AGENT PRICE (Override base price)
exports.setAgentPrice = async (req, res) => {
  const { package_id, selling_price } = req.body;
  const agent_id = req.user.id; // From authenticated user

  try {
    // 1. Get base price to ensure agent doesn't go below it
    const packageResult = await pool.query(
      'SELECT base_price FROM data_packages WHERE id = $1',
      [package_id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const base_price = parseFloat(packageResult.rows[0].base_price);

    // 2. Validate: Agent price cannot be below base price
    if (parseFloat(selling_price) < base_price) {
      return res.status(400).json({ 
        error: `Selling price cannot be below base price of GH₵${base_price}` 
      });
    }

    // 3. Upsert (Insert or Update) agent price
    const result = await pool.query(
      `INSERT INTO agent_prices (agent_id, package_id, selling_price) 
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, package_id) 
       DO UPDATE SET selling_price = $3
       RETURNING *`,
      [agent_id, package_id, selling_price]
    );

    res.json({ message: 'Agent price set successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET AGENT'S CUSTOM PRICES
exports.getAgentPrices = async (req, res) => {
  const agent_id = req.params.agent_id;

  try {
    const prices = await pool.query(
      `SELECT ap.*, dp.network, dp.description, dp.base_price 
       FROM agent_prices ap
       JOIN data_packages dp ON ap.package_id = dp.id
       WHERE ap.agent_id = $1`,
      [agent_id]
    );

    res.json({ data: prices.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET ALL PACKAGES WITH PRICES (For Agent Dashboard)
exports.getDashboardPackages = async (req, res) => {
  const agent_id = req.user.id;

  try {
    const packages = await pool.query(
      `SELECT dp.*, ap.selling_price as agent_price
       FROM data_packages dp
       LEFT JOIN agent_prices ap ON dp.id = ap.package_id AND ap.agent_id = $1
       WHERE dp.is_active = true`,
      [agent_id]
    );

    res.json({ data: packages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};