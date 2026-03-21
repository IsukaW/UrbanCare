const express = require('express');
const { getUserById, updateUserById } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', authenticate, getUserById);
router.patch('/:id', authenticate, updateUserById);

module.exports = router;
