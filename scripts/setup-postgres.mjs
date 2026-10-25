import { readFile } from 'node:fs/promises'
import pg from 'pg'
const { Pool } = pg
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 })
try {
  const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8')
  await pool.query(sql)
  console.log('PostgreSQL schema created or already present.')
} catch (error) {
  console.error('Could not create PostgreSQL schema:', error.message || error)
  process.exitCode = 1
} finally {
  await pool.end()
}
