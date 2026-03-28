const express = require('express');
const { getToken } = require('../controllers/agoraController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../utils/roles');

const router = express.Router();

// POST /video/token
// Generates an Agora RTC token for a video session channel.
// Accessible by doctors and patients (both are video participants).
router.post('/token', authenticate, authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN), getToken);

module.exports = router;
