const express = require('express');
const { getMyReservations, createReservation, cancelReservation } = require('../controllers/reservationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/my', getMyReservations);
router.post('/', createReservation);
router.patch('/:id/cancel', cancelReservation);

module.exports = router;
