/**
 * ============================================================
 *  api/auth/register.js
 * ------------------------------------------------------------
 *  POST /api/auth/register
 *  Body: { username, email, password }
 *  Mendaftarkan user baru, langsung login (mengembalikan token).
 * ============================================================
 */

const { query, ensureSchema } = require("../../lib/db");
const { hashPassword, generateToken } = require("../../lib/auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    await ensureSchema();

    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      res.status(400).json({ ok: false, error: "Username, email, dan password wajib diisi" });
      return;
    }
    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ ok: false, error: "Username harus 3-30 karakter" });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ ok: false, error: "Format email tidak valid" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ ok: false, error: "Password minimal 6 karakter" });
      return;
    }

    const existing = await query(
      "SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1",
      [username, email]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ ok: false, error: "Username atau email sudah terdaftar" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const inserted = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, passwordHash]
    );

    const user = inserted.rows[0];
    const token = generateToken({ id: user.id, username: user.username, email: user.email });

    res.setHeader(
      "Set-Cookie",
      `tt_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ ok: false, error: "Gagal mendaftarkan user. Coba lagi nanti." });
  }
};
