require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })

async function run() {
  try {
    const res = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', ['admin@parkingsystem.com'])
    console.log(res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await pool.end()
  }
}

run()
