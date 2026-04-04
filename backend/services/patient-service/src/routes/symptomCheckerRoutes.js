const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { analyseSymptomHandler } = require('../controllers/symptomCheckerController');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.post(
  '/analyse',
  authenticate,
  authorize(ROLES.PATIENT, ROLES.ADMIN),
  analyseSymptomHandler
);

module.exports = router;