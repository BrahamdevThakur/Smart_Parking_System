const pool = require('../db');

// GET /api/vehicles
const getMyVehicles = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT v.vehicle_id, v.plate_number, vt.type_name, vt.type_id
       FROM vehicles v
       JOIN vehicle_types vt ON v.type_id = vt.type_id
       WHERE v.user_id = $1
       ORDER BY v.vehicle_id`,
      [req.user.user_id]
    );
    res.json({ vehicles: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicles/types
const getVehicleTypes = async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vehicle_types ORDER BY type_id');
    res.json({ types: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/vehicles
const addVehicle = async (req, res, next) => {
  const { plate_number, type_id } = req.body;
  try {
    if (!plate_number || !type_id) {
      return res.status(400).json({ error: 'Plate number and vehicle type are required.' });
    }

    const existing = await pool.query(
      'SELECT vehicle_id FROM vehicles WHERE plate_number = $1',
      [plate_number.toUpperCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This plate number is already registered.' });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (user_id, type_id, plate_number)
       VALUES ($1, $2, $3)
       RETURNING vehicle_id, plate_number, type_id`,
      [req.user.user_id, type_id, plate_number.toUpperCase().trim()]
    );

    const typeResult = await pool.query(
      'SELECT type_name FROM vehicle_types WHERE type_id = $1',
      [type_id]
    );

    res.status(201).json({
      message: 'Vehicle added successfully.',
      vehicle: { ...result.rows[0], type_name: typeResult.rows[0]?.type_name },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vehicles/:id
const deleteVehicle = async (req, res, next) => {
  const { id } = req.params;
  try {
    // Check ownership
    const vehicle = await pool.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [id, req.user.user_id]
    );
    if (vehicle.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Check active reservations
    const activeRes = await pool.query(
      `SELECT reservation_id FROM reservations
       WHERE vehicle_id = $1 AND status = 'Active'`,
      [id]
    );
    if (activeRes.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with active reservations.' });
    }

    await pool.query('DELETE FROM vehicles WHERE vehicle_id = $1', [id]);
    res.json({ message: 'Vehicle removed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyVehicles, getVehicleTypes, addVehicle, deleteVehicle };
