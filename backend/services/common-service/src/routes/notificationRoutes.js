const express = require('express');
const { sendEmailNotification, sendSmsNotification } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/email', authenticate, authorize('admin', 'doctor', 'patient'), sendEmailNotification);
router.post('/sms', authenticate, authorize('admin', 'doctor', 'patient'), sendSmsNotification);

module.exports = router;
