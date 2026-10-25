import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not configured. Add the PostgreSQL connection string to Eternodes environment variables.')
}

type PostgresCache = { pool: Pool | null }
declare global { var __lunaPostgres: PostgresCache | undefined }
const cache = global.__lunaPostgres ?? { pool: null }
global.__lunaPostgres = cache

export const pool = cache.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
})
cache.pool = pool

export async function query(text: string, values: unknown[] = []) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_MISSING')
  return pool.query(text, values)
}
