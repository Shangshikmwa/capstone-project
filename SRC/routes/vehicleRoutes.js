import express from 'express';
import protectCompany from '../middleware/protectCompany.js';
import * as vehicleController from '../controllers/vehicleController.js';
import { createTripForVehicle } from '../controllers/tripController.js';

const router = express.Router();

router.use(protectCompany);

router.post('/register', vehicleController.registerVehicle);              
router.get('/company-vehicles', vehicleController.listCompanyVehicles);           
router.put('/update-vehicle/:id', vehicleController.updateVehicle);              
router.delete('/delete-vehicle/:id', vehicleController.deleteVehicle);           

router.post('/create-trip/:vehicleId', createTripForVehicle); 


export default router;
