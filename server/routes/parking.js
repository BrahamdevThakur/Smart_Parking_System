const express = require('express');
const { getLots, getLotSlots } = require('../controllers/parkingController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/lots', getLots);
router.get('/lots/:id/slots', getLotSlots);

module.exports = router;
