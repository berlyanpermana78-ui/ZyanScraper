/**
 * ============================================================
 *  api/auth/login.js
 * ------------------------------------------------------------
 *  POST /api/auth/login
 *  Body: { identifier, password }  -> identifier = username/email
 * ============================================================
 */

const { query, ensureSchema } = require("../../lib/db");
const { comparePassword, generateToken } = require("../../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    await ensureSchema();

    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ ok: false, error: "Username/email dan password wajib diisi" });
      return;
    }

    const result = await query(
      "SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1 LIMIT 1",
      [identifier]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ ok: false, error: "Akun tidak ditemukan" });
      return;
    }

    const user = result.rows[0];
    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      res.status(401).json({ ok: false, error: "Password salah" });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email });

    res.setHeader(
      "Set-Cookie",
      `tt_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    res.status(200).json({
      ok: true,
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ ok: false, error: "Gagal login. Coba lagi nanti." });
  }
};
