const pool = require('../db');

// GET /api/reservations/my
const getMyReservations = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         r.reservation_id,
         r.start_time,
         r.end_time,
         r.status,
         r.created_at,
         ps.slot_number,
         pl.lot_name,
         pl.lot_id,
         pl.base_rate,
         v.plate_number,
         vt.type_name,
         ROUND(
           EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600 * pl.base_rate, 2
         ) AS total_cost
       FROM reservations r
       JOIN parking_slots ps ON r.slot_id = ps.slot_id
       JOIN parking_lots pl ON ps.lot_id = pl.lot_id
       JOIN vehicles v ON r.vehicle_id = v.vehicle_id
       JOIN vehicle_types vt ON v.type_id = vt.type_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );
    res.json({ reservations: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/reservations
const createReservation = async (req, res, next) => {
  const { slot_id, vehicle_id, start_time, end_time } = req.body;

  if (!slot_id || !vehicle_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'slot_id, vehicle_id, start_time, and end_time are required.' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }
  if (end <= start) {
    return res.status(400).json({ error: 'end_time must be after start_time.' });
  }
  if (start < new Date()) {
    return res.status(400).json({ error: 'start_time cannot be in the past.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock the slot row to prevent concurrent booking
    const slotResult = await client.query(
      `SELECT ps.slot_id, ps.slot_number, ps.lot_id, ps.is_occupied, pl.base_rate
       FROM parking_slots ps
       JOIN parking_lots pl ON ps.lot_id = pl.lot_id
       WHERE ps.slot_id = $1
       FOR UPDATE`,
      [slot_id]
    );

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parking slot not found.' });
    }

    const slot = slotResult.rows[0];

    // 2. Check for time overlaps with existing Active reservations
    const overlapResult = await client.query(
      `SELECT reservation_id FROM reservations
       WHERE slot_id = $1
         AND status = 'Active'
         AND start_time < $3
         AND end_time > $2`,
      [slot_id, start_time, end_time]
    );

    if (overlapResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This slot is already booked for the selected time period.' });
    }

    // 3. Verify vehicle belongs to user
    const vehicleResult = await client.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [vehicle_id, req.user.user_id]
    );
    if (vehicleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Vehicle not found or does not belong to you.' });
    }

    // 4. Check user doesn't have another booking for same vehicle in this window
    const userOverlap = await client.query(
      `SELECT r.reservation_id FROM reservations r
       WHERE r.vehicle_id = $1
         AND r.status = 'Active'
         AND r.start_time < $3
         AND r.end_time > $2`,
      [vehicle_id, start_time, end_time]
    );
    if (userOverlap.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This vehicle already has a booking in the selected time period.' });
    }

    // 5. Create reservation
    const hours = (end - start) / (1000 * 60 * 60);
    const reservation = await client.query(
      `INSERT INTO reservations (user_id, slot_id, vehicle_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'Active')
       RETURNING reservation_id, start_time, end_time, status, created_at`,
      [req.user.user_id, slot_id, vehicle_id, start_time, end_time]
    );

    // 6. Update slot occupancy if current time falls within booking
    const now = new Date();
    if (start <= now && end >= now) {
      await client.query(
        'UPDATE parking_slots SET is_occupied = true WHERE slot_id = $1',
        [slot_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Reservation created successfully!',
      reservation: {
        ...reservation.rows[0],
        slot_number: slot.slot_number,
        lot_id: slot.lot_id,
        total_cost: parseFloat((hours * slot.base_rate).toFixed(2)),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/reservations/:id/cancel
const cancelReservation = async (req, res, next) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT r.reservation_id, r.status, r.slot_id, r.start_time, r.user_id
       FROM reservations r
       WHERE r.reservation_id = $1
       FOR UPDATE`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = result.rows[0];

    if (reservation.user_id !== req.user.user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized to cancel this reservation.' });
    }

    if (reservation.status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot cancel a ${reservation.status} reservation.` });
    }

    await client.query(
      "UPDATE reservations SET status = 'Cancelled' WHERE reservation_id = $1",
      [id]
    );

    // Free the slot if it was currently occupied by this reservation
    const now = new Date();
    const start = new Date(reservation.start_time);
    if (start <= now) {
      await client.query(
        'UPDATE parking_slots SET is_occupied = false WHERE slot_id = $1',
        [reservation.slot_id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Reservation cancelled successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getMyReservations, createReservation, cancelReservation };
