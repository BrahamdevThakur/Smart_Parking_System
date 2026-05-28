const pool = require('../db');

// GET /api/parking/lots
const getLots = async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         pl.lot_id,
         pl.lot_name,
         pl.total_capacity,
         pl.base_rate,
         COUNT(ps.slot_id) AS total_slots,
         COUNT(ps.slot_id) FILTER (WHERE ps.is_occupied = false) AS available_slots
       FROM parking_lots pl
       LEFT JOIN parking_slots ps ON pl.lot_id = ps.lot_id
       GROUP BY pl.lot_id
       ORDER BY pl.lot_id`
    );
    res.json({ lots: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/parking/lots/:id/slots
const getLotSlots = async (req, res, next) => {
  const { id } = req.params;
  const { start_time, end_time } = req.query;

  try {
    const lotResult = await pool.query(
      'SELECT * FROM parking_lots WHERE lot_id = $1',
      [id]
    );
    if (lotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parking lot not found.' });
    }

    let slotsQuery;
    let queryParams = [id];

    if (start_time && end_time) {
      // Show actual availability for the given time window
      slotsQuery = `
        SELECT
          ps.slot_id,
          ps.slot_number,
          ps.lot_id,
          ps.is_occupied,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM reservations r
              WHERE r.slot_id = ps.slot_id
                AND r.status = 'Active'
                AND r.start_time < $3::timestamp
                AND r.end_time > $2::timestamp
            ) THEN true
            ELSE false
          END AS booked_in_window
        FROM parking_slots ps
        WHERE ps.lot_id = $1
        ORDER BY ps.slot_number
      `;
      queryParams = [id, start_time, end_time];
    } else {
      slotsQuery = `
        SELECT slot_id, slot_number, lot_id, is_occupied, false AS booked_in_window
        FROM parking_slots
        WHERE lot_id = $1
        ORDER BY slot_number
      `;
    }

    const slotsResult = await pool.query(slotsQuery, queryParams);

    res.json({
      lot: lotResult.rows[0],
      slots: slotsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLots, getLotSlots };
