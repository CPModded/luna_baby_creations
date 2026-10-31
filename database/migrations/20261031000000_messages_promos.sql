-- Tables pour les réponses administratives et les codes promotionnels.
CREATE TABLE IF NOT EXISTS message_replies (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'SENT' CHECK (email_status IN ('SENT', 'FAILED')),
  provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS message_replies_message_created_idx ON message_replies (message_id, created_at DESC);
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PERCENT', 'AMOUNT')),
  value INTEGER NOT NULL CHECK (value > 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
