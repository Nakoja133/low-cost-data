const pool = require('../config/database');

// CREATE PACKAGE (Admin Only)
exports.createPackage = async (req, res) => {
  const { network, description, base_cost, base_price, api_code } = req.body;

  try {
    const newPackage = await pool.query(
      'INSERT INTO data_packages (network, description, base_cost, base_price, api_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [network, description, base_cost, base_price, api_code]
    );

    res.status(201).json({ message: 'Package created', data: newPackage.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET ALL PACKAGES (Public/Agents)
exports.getPackages = async (req, res) => {
  try {
    const packages = await pool.query('SELECT * FROM data_packages WHERE is_active = true');
    res.json({ data: packages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};