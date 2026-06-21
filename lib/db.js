/**
 * ============================================================
 *  lib/db.js
 * ------------------------------------------------------------
 *  Koneksi PostgreSQL (Supabase) menggunakan driver "pg".
 *  Menyediakan helper untuk operasi user (register, login,
 *  cari user) dan riwayat chat.
 *
 *  ENV VARIABLE YANG DIBUTUHKAN (lihat .env.example):
 *  - DATABASE_URL  -> connection string Supabase Postgres
 *                     (Settings > Database > Connection string
 *                     > "Transaction" pooler mode, cocok untuk
 *                     serverless / Vercel)
 *  - JWT_SECRET    -> string rahasia untuk menandatangani token
 *                     sesi login
 * ============================================================
 */

const { Pool } = require("pg");

let pool;

/**
 * Ambil instance pool koneksi (singleton, supaya tidak membuat
 * koneksi baru di setiap invocation serverless).
 */
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL belum di-set. Tambahkan di file .env (lokal) atau Environment Variables (Vercel)."
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Jalankan query SQL mentah.
 */
async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

/**
 * Buat semua tabel yang dibutuhkan jika belum ada.
 * Dipanggil otomatis sekali saat server start / cold start
 * pertama (lihat api/_init.js & server.js).
 */
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) DEFAULT 'Percakapan Baru',
      mode VARCHAR(20) DEFAULT 'daily',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      meta JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);`);
}

module.exports = { getPool, query, ensureSchema };
