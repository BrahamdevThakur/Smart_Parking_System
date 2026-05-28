const express = require('express');
const { getMyVehicles, getVehicleTypes, addVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getMyVehicles);
router.get('/types', getVehicleTypes);
router.post('/', addVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
