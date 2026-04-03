const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET ALL ACTIVE PACKAGES (Public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, network, description, base_cost, base_price, api_code, is_active, created_at
       FROM data_packages
       WHERE is_active = true
       ORDER BY network, base_price ASC`
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get packages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// GET ALL PACKAGES (Admin only)
router.get('/all', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM data_packages ORDER BY network, base_price ASC`
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get all packages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// CREATE PACKAGE (Admin only)
router.post('/', auth, async (req, res) => {
  const { network, description, base_cost, base_price, api_code, is_active } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO data_packages (network, description, base_cost, base_price, api_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [network, description, base_cost, base_price, api_code, is_active !== undefined ? is_active : true]
    );

    res.status(201).json({ message: 'Package created', data: result.rows[0] });
  } catch (err) {
    console.error('Create package error:', err.message);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// UPDATE PACKAGE (Admin only)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { network, description, base_cost, base_price, api_code, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE data_packages 
       SET network = COALESCE($1, network),
           description = COALESCE($2, description),
           base_cost = COALESCE($3, base_cost),
           base_price = COALESCE($4, base_price),
           api_code = COALESCE($5, api_code),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [network, description, base_cost, base_price, api_code, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ message: 'Package updated', data: result.rows[0] });
  } catch (err) {
    console.error('Update package error:', err.message);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// DELETE PACKAGE (Admin only)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM data_packages WHERE id = $1', [id]);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    console.error('Delete package error:', err.message);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

module.exports = router;