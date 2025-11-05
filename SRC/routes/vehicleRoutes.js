import express from 'express';
import protectCompany from '../middleware/protectCompany.js';
import * as vehicleController from '../controllers/vehicleController.js';
import { createTripForVehicle } from '../controllers/tripController.js';

const router = express.Router();

// All routes require company auth
router.use(protectCompany);

// Vehicles
router.post('/register', vehicleController.registerVehicle);              
router.get('/company-vehicles', vehicleController.listCompanyVehicles);           
router.put('/update-vehicle/:id', vehicleController.updateVehicle);              
router.delete('/delete-vehicle/:id', vehicleController.deleteVehicle);           

// Trips (single)
router.post('/create-trip/:vehicleId', createTripForVehicle); 


export default router;
