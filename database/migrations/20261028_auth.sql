-- Migration idempotente des sessions et fournisseurs OAuth, compatible PostgreSQL / adaptateur lib/db.ts.
-- Exécuter après le schéma applicatif, sur la même base que DATABASE_URL.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMPTZ;
-- Le schéma historique impose NOT NULL; OAuth crée un compte sans mot de passe local.
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER','MANAGER','ADMIN','OWNER'));
CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google','apple')),
  "providerAccountId" TEXT NOT NULL,
  email VARCHAR(254) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,"providerAccountId"), UNIQUE("userId",provider)
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions("userId");
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions("expiresAt");
COMMIT;
