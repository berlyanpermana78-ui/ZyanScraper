/**
 * ============================================================
 *  api/conversations/index.js
 * ------------------------------------------------------------
 *  GET    /api/conversations          -> daftar percakapan user
 *  DELETE /api/conversations?id=123   -> hapus 1 percakapan
 * ============================================================
 */

const { query, ensureSchema } = require("../../lib/db");
const { getUserFromRequest } = require("../../lib/auth");

module.exports = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ ok: false, error: "Belum login" });
    return;
  }

  try {
    await ensureSchema();

    if (req.method === "GET") {
      const result = await query(
        "SELECT id, title, mode, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100",
        [user.id]
      );
      res.status(200).json({ ok: true, conversations: result.rows });
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        res.status(400).json({ ok: false, error: "Parameter id wajib diisi" });
        return;
      }
      await query("DELETE FROM conversations WHERE id = $1 AND user_id = $2", [id, user.id]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
  } catch (err) {
    console.error("Conversations error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
