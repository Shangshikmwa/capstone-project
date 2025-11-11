import express from 'express';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as adminController from '../controllers/adminController.js';
import { protect } from '../middleware/protect.js'; 
import { restrictTo } from '../middleware/restrictTo.js';

const router = express.Router();

router.post('/register', authController.registerUser);
router.get('/verify-email', authController.verifyUserEmail);
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/promote-to-admin', protect, restrictTo('admin'), authController.promoteToAdmin);
router.post('/demote-from-admin', protect, restrictTo('admin'), authController.demoteFromAdmin);
router.get('/get-all-users', protect, restrictTo('admin'), userController.getAllUsers); 
router.get('/get-user/:id', protect, restrictTo('admin'), userController.getUser);
router.get('/get-all-company', protect, restrictTo('admin'), adminController.getAllCompany);
router.get('/get-all-vehicles', protect, restrictTo('admin'), adminController.getAllVehicles);


export default router;