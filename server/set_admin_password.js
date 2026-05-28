require('dotenv').config()
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })

async function run() {
  try {
    const salt = await bcrypt.genSalt(12)
    const hash = await bcrypt.hash('admin123', salt)
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'admin@parkingsystem.com'])
    console.log('Admin password updated to admin123')
  } catch (err) {
    console.error('Failed to update admin password:', err)
  } finally {
    await pool.end()
  }
}

run()
