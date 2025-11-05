import express from 'express';
import * as companyAuthController from '../controllers/companyAuthController.js';

const router = express.Router();

router.post('/register', companyAuthController.registerCompany);
router.get('/verify-email', companyAuthController.verifyCompanyEmail);
router.post('/login', companyAuthController.loginCompany);
router.post('/forgot-password', companyAuthController.forgotCompanyPassword);
router.post('/reset-password/:token', companyAuthController.resetCompanyPassword);

export default router;
