const fs = require('fs')
const path = require('path')
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })

async function load() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    console.log('Executing schema.sql...')
    await pool.query(sql)
    console.log('Schema executed successfully')
    process.exit(0)
  } catch (err) {
    console.error('Failed to execute schema.sql:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

load()
