/**
 * ============================================================
 *  api/conversations/messages.js
 * ------------------------------------------------------------
 *  GET /api/conversations/messages?id=123
 *  Mengambil semua pesan dalam satu percakapan (milik user yang
 *  sedang login).
 * ============================================================
 */

const { query, ensureSchema } = require("../../lib/db");
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

  const conversationId = req.query?.id;
  if (!conversationId) {
    res.status(400).json({ ok: false, error: "Parameter id wajib diisi" });
    return;
  }

  try {
    await ensureSchema();

    const owner = await query(
      "SELECT id, mode FROM conversations WHERE id = $1 AND user_id = $2",
      [conversationId, user.id]
    );
    if (owner.rows.length === 0) {
      res.status(404).json({ ok: false, error: "Percakapan tidak ditemukan" });
      return;
    }

    const messages = await query(
      "SELECT id, role, content, meta, created_at FROM messages WHERE conversation_id = $1 ORDER BY id ASC",
      [conversationId]
    );

    res.status(200).json({
      ok: true,
      mode: owner.rows[0].mode,
      messages: messages.rows,
    });
  } catch (err) {
    console.error("Messages fetch error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
