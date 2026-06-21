-- ============================================================
--  database/schema.sql
-- ------------------------------------------------------------
--  Skema database TriThink AI untuk PostgreSQL / Supabase.
--  Jalankan file ini di Supabase Dashboard > SQL Editor jika
--  ingin setup manual (opsional — aplikasi akan otomatis
--  membuat tabel ini sendiri saat pertama dijalankan via
--  lib/db.js -> ensureSchema()).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Percakapan Baru',
  mode VARCHAR(20) DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);
