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
-- schema-v4.sql
ALTER TABLE contact_messages ALTER COLUMN message TYPE VARCHAR(10000);
ALTER TABLE contact_messages ALTER COLUMN subject TYPE VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "promoCode" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;

CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages ALTER COLUMN message TYPE VARCHAR(10000);
ALTER TABLE contact_messages ALTER COLUMN subject TYPE VARCHAR(200);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS message_replies (
  id TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  "toEmail" VARCHAR(254) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  "emailStatus" TEXT NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PERCENT','FIXED')),
  value INTEGER NOT NULL CHECK (value > 0),
  "minOrder" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS replies_message_idx ON message_replies("messageId");