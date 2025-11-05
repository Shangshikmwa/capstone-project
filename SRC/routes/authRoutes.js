import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import express from 'express';
import { protect } from '../middleware/protect.js'; 
import { restrictTo } from '../middleware/restrictTo.js';

const router = express.Router();

// Register new user
router.post('/register', authController.registerUser);
// Verify user email
router.get('/verify-email', authController.verifyUserEmail);
// Login user
router.post('/login', authController.loginUser);
// Forgot password
router.post('/forgot-password', authController.forgotPassword);
// Reset password
router.post('/reset-password', authController.resetPassword);


// restricted to admin only
router.post('/promote-to-admin', protect, restrictTo('admin'), authController.promoteToAdmin);
router.post('/demote-from-admin', protect, restrictTo('admin'), authController.demoteFromAdmin);
router.get('/get-all-users', protect, restrictTo('admin'), userController.getAllUsers); 
router.get('/get-user/:id', protect, restrictTo('admin'), userController.getUser);


export default router;