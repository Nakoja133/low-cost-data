const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const lockActivitiesController = require('../controllers/lockActivitiesController');

// ============================================
// GET LOCK ACTIVITIES STATUS
// ============================================
router.get('/status', auth, lockActivitiesController.getLockActivitiesStatus);

// ============================================
// SET LOCK ACTIVITIES PASSWORD (First time)
// ============================================
router.post('/set-password', auth, lockActivitiesController.setLockPassword);

// ============================================
// CHANGE LOCK PASSWORD
// ============================================
router.put('/change-password', auth, lockActivitiesController.changeLockPassword);

// ============================================
// TOGGLE LOCK ACTIVITIES
// ============================================
router.post('/toggle', auth, lockActivitiesController.toggleLockActivities);

// ============================================
// VERIFY LOCK PASSWORD (For protected pages)
// ============================================
router.post('/verify', auth, lockActivitiesController.verifyLockPassword);

// ============================================
// FORGOT LOCK PASSWORD
// ============================================
router.post('/forgot-password', lockActivitiesController.forgotLockPassword);

// ============================================
// RESET LOCK PASSWORD
// ============================================
router.post('/reset-password', lockActivitiesController.resetLockPassword);

module.exports = router;
