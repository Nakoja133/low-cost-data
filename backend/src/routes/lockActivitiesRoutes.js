const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const lockActivitiesController = require('../controllers/lockActivitiesController');

router.get('/status', auth, lockActivitiesController.getLockActivitiesStatus);
router.post('/set-password', auth, lockActivitiesController.setLockPassword);
router.put('/change-password', auth, lockActivitiesController.changeLockPassword);
router.post('/toggle', auth, lockActivitiesController.toggleLockActivities);
router.post('/verify', auth, lockActivitiesController.verifyLockPassword);
router.post('/forgot-password', lockActivitiesController.forgotLockPassword);
router.post('/reset-password', lockActivitiesController.resetLockPassword);

module.exports = router;
