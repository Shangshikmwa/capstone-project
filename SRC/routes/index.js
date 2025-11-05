import express from 'express';
import authRoutes from './auth.routes.js';
import companyRoutes from './companyRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import publicTripRoutes from './publicTripRoutes.js';
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/company', companyRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/trips', publicTripRoutes);
export default router;