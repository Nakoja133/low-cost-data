const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { 
  getAllWithdrawals, 
  approveWithdrawal, 
  rejectWithdrawal,
  createUser,
  getAllUsers,
  updatePackage,
  createPackage,
  getDashboardStats,
  updateTerms,
  getTerms,
  getAdminProfit, // ✅ Import
} = require('../controllers/adminController');

router.use(auth);

// Dashboard & Profit
router.get('/dashboard-stats', getDashboardStats);
router.get('/profit', getAdminProfit); // ✅ New Route

// User Management
router.post('/users', createUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { confirm_email } = req.body;

  try {
    const userResult = await pool.query('SELECT email, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    if (!confirm_email || confirm_email !== user.email) {
      return res.status(400).json({ error: 'Please confirm by entering the user\'s email address' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully', deleted_user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:withdrawal_id/approve', approveWithdrawal);
router.put('/withdrawals/:withdrawal_id/reject', rejectWithdrawal);

// Packages
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);

// Terms/Rules
router.get('/terms', getTerms);
router.put('/terms', updateTerms);

module.exports = router;