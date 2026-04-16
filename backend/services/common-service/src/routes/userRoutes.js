const express = require('express');
const { getUserById, updateUserById, getAllUsers, approveUser, rejectUser, deleteUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), getAllUsers);
router.get('/:id', authenticate, getUserById);
router.patch('/:id', authenticate, updateUserById);
router.post('/:id/approve', authenticate, authorize('admin'), approveUser);
router.post('/:id/reject', authenticate, authorize('admin'), rejectUser);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

module.exports = router;
