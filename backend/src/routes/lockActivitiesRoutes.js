const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const lockActivitiesController = require('../controllers/lockActivitiesController');

// Status check (Authenticated)
router.get('/status', auth, lockActivitiesController.getLockActivitiesStatus);

// Password Management (Authenticated)
router.post('/set-password', auth, lockActivitiesController.setLockPassword);
router.put('/change-password', auth, lockActivitiesController.changeLockPassword);

// Toggle Lock Activities (Authenticated)
router.post('/toggle', auth, lockActivitiesController.toggleLockActivities);

// Verify Password for Session (Authenticated)
router.post('/verify', auth, lockActivitiesController.verifyLockPassword);

// Public Reset Flow (No Auth required)
router.post('/forgot-password', lockActivitiesController.forgotLockPassword);
router.post('/reset-password', lockActivitiesController.resetLockPassword);

module.exports = router;