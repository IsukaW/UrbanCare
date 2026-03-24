const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { createIntent, getIntent, confirmIntent } = require('../controllers/paymentController');

const router = express.Router();

router.post('/intent', authenticate, authorize('admin', 'doctor', 'patient'), createIntent);
router.post('/intent/:paymentIntentId/confirm', authenticate, authorize('admin', 'doctor', 'patient'), confirmIntent);
router.get('/intent/:paymentIntentId', authenticate, authorize('admin', 'doctor', 'patient'), getIntent);

module.exports = router;
