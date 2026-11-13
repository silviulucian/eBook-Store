-- Paperleaf ebook store: PostgreSQL schema (idempotent).
-- Money is stored as integer minor units (cents) to avoid floating point errors.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL CHECK (email = lower(email) AND length(email) <= 254),
  name          text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- Server-side sessions. Only a SHA-256 hash of the opaque cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS categories (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name  text NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text NOT NULL,
  author          text NOT NULL,
  description     text NOT NULL,
  category_id     uuid NOT NULL REFERENCES categories (id),
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  currency        char(3) NOT NULL DEFAULT 'USD',
  pages           integer CHECK (pages > 0),
  published_year  integer,
  isbn            text,
  cover_color     text NOT NULL DEFAULT '#3b5b8c' CHECK (cover_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS books_category_id_idx ON books (category_id);

CREATE TABLE IF NOT EXISTS orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users (id),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  total_cents        integer NOT NULL CHECK (total_cents >= 0),
  currency           char(3) NOT NULL DEFAULT 'USD',
  confirmation_code  text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz,
  CHECK ((status = 'paid') = (confirmation_code IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON orders (user_id, created_at DESC);

-- Title, author and price are snapshotted so history survives catalogue edits.
CREATE TABLE IF NOT EXISTS order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  book_id          uuid NOT NULL REFERENCES books (id),
  title            text NOT NULL,
  author           text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  UNIQUE (order_id, book_id)
);
CREATE INDEX IF NOT EXISTS order_items_book_id_idx ON order_items (book_id);

-- Mocked payments. The full card number and CVC are never stored.
CREATE TABLE IF NOT EXISTS payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider         text NOT NULL DEFAULT 'mock',
  status           text NOT NULL CHECK (status IN ('succeeded', 'declined')),
  amount_cents     integer NOT NULL CHECK (amount_cents >= 0),
  currency         char(3) NOT NULL DEFAULT 'USD',
  card_brand       text NOT NULL,
  card_last4       char(4) NOT NULL,
  transaction_ref  text UNIQUE,
  failure_reason   text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);
