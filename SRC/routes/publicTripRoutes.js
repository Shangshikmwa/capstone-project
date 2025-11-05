
import express from 'express';
import * as publicTripController from '../controllers/publicTripController.js';
import protect from '../middleware/protect.js';

const router = express.Router();

// public trip listing
router.get('/', publicTripController.getTrips); 
router.get('/user-trips',protect, publicTripController.getUserTrips);                
router.get('/:id', publicTripController.getTripById);


router.post('/:id/book', protect, publicTripController.bookTrip);
router.post('/:id/verify-payment', protect, publicTripController.verifyBookingPayment);


router.post('/webhook', publicTripController.paymentWebhook);
export default router;
