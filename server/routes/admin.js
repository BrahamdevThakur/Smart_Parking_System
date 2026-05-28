const express = require('express');
const { getAllLots, getAllReservations, getStats, createLot } = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Note: For simplicity, admin routes use authenticate only.
// In production, add requireAdmin middleware after checking is_admin column.
router.use(authenticate);

router.get('/lots', getAllLots);
router.post('/lots', createLot);
router.get('/reservations', getAllReservations);
router.get('/stats', getStats);

module.exports = router;
