-- Run once against the empty PostgreSQL database supplied by Eternodes.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','MANAGER','ADMIN','OWNER')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description VARCHAR(2000) NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  "compareAt" INTEGER CHECK ("compareAt" IS NULL OR "compareAt" >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  image TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  email VARCHAR(254) NOT NULL,
  "customerName" VARCHAR(160),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  shipping INTEGER NOT NULL CHECK (shipping >= 0),
  tax INTEGER NOT NULL CHECK (tax >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  "invoiceNumber" TEXT NOT NULL UNIQUE,
  "shippingAddress" JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  "stripeSessionId" TEXT UNIQUE,
  "accessToken" TEXT NOT NULL UNIQUE,
  "paymentIntentId" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL CHECK ("unitPrice" >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  customization JSONB,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message VARCHAR(5000) NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders("userId");
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders("createdAt");
CREATE INDEX IF NOT EXISTS messages_read_idx ON contact_messages(read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON contact_messages("createdAt");