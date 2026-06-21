/**
 * ============================================================
 *  api/auth/me.js
 * ------------------------------------------------------------
 *  GET /api/auth/me
 *  Mengembalikan data user yang sedang login berdasarkan token.
 * ============================================================
 */

const { getUserFromRequest } = require("../../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ ok: false, error: "Belum login" });
    return;
  }

  res.status(200).json({ ok: true, user });
};
