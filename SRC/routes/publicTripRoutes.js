
import express from 'express';
import * as publicTripController from '../controllers/publicTripController.js';
import protect from '../middleware/protect.js';

const router = express.Router();

// public trip listing
router.get('/', publicTripController.getTrips);                 
router.get('/:id', publicTripController.getTripById);          
router.post('/:id/book', protect, publicTripController.bookTrip);       

export default router;
