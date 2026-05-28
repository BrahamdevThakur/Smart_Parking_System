const pool = require('../db');

// GET /api/admin/lots - with full stats
const getAllLots = async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         pl.lot_id,
         pl.lot_name,
         pl.total_capacity,
         pl.base_rate,
         COUNT(ps.slot_id) AS total_slots,
         COUNT(ps.slot_id) FILTER (WHERE ps.is_occupied = false) AS available_slots,
         COUNT(ps.slot_id) FILTER (WHERE ps.is_occupied = true) AS occupied_slots
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

// GET /api/admin/reservations - all reservations
const getAllReservations = async (req, res, next) => {
  const { status, lot_id } = req.query;
  try {
    let query = `
      SELECT
        r.reservation_id,
        r.start_time,
        r.end_time,
        r.status,
        r.created_at,
        u.full_name,
        u.email,
        ps.slot_number,
        pl.lot_name,
        v.plate_number,
        ROUND(
          EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600 * pl.base_rate, 2
        ) AS total_cost
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN parking_slots ps ON r.slot_id = ps.slot_id
      JOIN parking_lots pl ON ps.lot_id = pl.lot_id
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    if (lot_id) {
      params.push(lot_id);
      query += ` AND pl.lot_id = $${params.length}`;
    }

    query += ' ORDER BY r.created_at DESC LIMIT 200';

    const result = await pool.query(query, params);
    res.json({ reservations: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats
const getStats = async (_req, res, next) => {
  try {
    const [users, reservations, revenue, lots] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM users'),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE status = 'Active') AS active,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
        COUNT(*) AS total
        FROM reservations`),
      pool.query(`SELECT COALESCE(SUM(
        ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 * pl.base_rate, 2)
      ), 0) AS total_revenue
      FROM reservations r
      JOIN parking_slots ps ON r.slot_id = ps.slot_id
      JOIN parking_lots pl ON ps.lot_id = pl.lot_id
      WHERE r.status IN ('Active', 'Completed')`),
      pool.query(`SELECT COUNT(*) AS total_lots,
        SUM(total_capacity) AS total_capacity
        FROM parking_lots`),
    ]);

    res.json({
      stats: {
        users: parseInt(users.rows[0].count),
        reservations: reservations.rows[0],
        revenue: parseFloat(revenue.rows[0].total_revenue),
        lots: lots.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/lots
const createLot = async (req, res, next) => {
  const { lot_name, total_capacity, base_rate, slot_count } = req.body;
  const client = await pool.connect();
  try {
    if (!lot_name || !total_capacity || !base_rate) {
      return res.status(400).json({ error: 'lot_name, total_capacity, and base_rate are required.' });
    }

    await client.query('BEGIN');

    const lotResult = await client.query(
      'INSERT INTO parking_lots (lot_name, total_capacity, base_rate) VALUES ($1, $2, $3) RETURNING *',
      [lot_name, total_capacity, base_rate]
    );
    const lot = lotResult.rows[0];

    // Auto-generate slots
    const numSlots = slot_count || total_capacity;
    const slotInserts = [];
    for (let i = 1; i <= numSlots; i++) {
      slotInserts.push(
        client.query(
          'INSERT INTO parking_slots (lot_id, slot_number) VALUES ($1, $2)',
          [lot.lot_id, `S${String(i).padStart(2, '0')}`]
        )
      );
    }
    await Promise.all(slotInserts);
    await client.query('COMMIT');

    res.status(201).json({ message: 'Parking lot created with slots.', lot });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getAllLots, getAllReservations, getStats, createLot };
