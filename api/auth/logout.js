/**
 * ============================================================
 *  api/auth/logout.js
 * ------------------------------------------------------------
 *  POST /api/auth/logout
 *  Menghapus cookie sesi.
 * ============================================================
 */

module.exports = async (req, res) => {
  res.setHeader("Set-Cookie", "tt_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.status(200).json({ ok: true });
};
