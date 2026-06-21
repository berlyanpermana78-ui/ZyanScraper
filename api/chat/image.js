/**
 * ============================================================
 *  api/chat/image.js
 * ------------------------------------------------------------
 *  POST /api/chat/image
 *  Body: { text }  -> prompt deskripsi gambar
 *  Mode Image — generate gambar via endpoint AI image, dengan
 *  failover otomatis antar model di IMAGE_MODELS (configapi.js).
 *  Mengembalikan base64 data-URL (kalau API balas binary) atau
 *  URL gambar langsung (kalau API balas link).
 * ============================================================
 */

const { IMAGE_MODELS } = require("../../configapi");
const { callEndpoint } = require("../../lib/fetchEngine");
const { getUserFromRequest } = require("../../lib/auth");
const { query, ensureSchema } = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    const { text, conversationId } = req.body || {};
    const q = (text || req.query?.text || req.query?.q || req.query?.prompt || "").toString().trim();

    if (!q) {
      res.status(400).json({ ok: false, error: "Parameter text/q/prompt (deskripsi gambar) wajib diisi" });
      return;
    }

    const models = Object.values(IMAGE_MODELS).filter((m) => m.enabled);
    if (models.length === 0) {
      res.status(503).json({ ok: false, error: "Tidak ada model image yang aktif" });
      return;
    }

    let usedModel = null;
    let result = null;

    for (const m of models) {
      const r = await callEndpoint(m, q);
      if (r.ok && (r.binary || r.text)) {
        usedModel = m;
        result = r;
        break;
      }
    }

    if (!result) {
      res.status(502).json({ ok: false, error: "Semua server image AI sedang tidak dapat dihubungi." });
      return;
    }

    let imageUrl;
    if (result.binary) {
      const base64 = result.binary.toString("base64");
      imageUrl = `data:${result.contentType || "image/png"};base64,${base64}`;
    } else {
      imageUrl = result.text;
    }

    const user = getUserFromRequest(req);
    let savedConversationId = conversationId || null;
    if (user) {
      try {
        await ensureSchema();
        if (!savedConversationId) {
          const conv = await query(
            "INSERT INTO conversations (user_id, title, mode) VALUES ($1, $2, 'image') RETURNING id",
            [user.id, q.slice(0, 60)]
          );
          savedConversationId = conv.rows[0].id;
        }
        // Catatan: gambar besar (base64) sengaja tidak disimpan penuh ke DB
        // agar database tidak bengkak — hanya prompt yang dicatat.
        await query(
          "INSERT INTO messages (conversation_id, role, content, meta) VALUES ($1, 'user', $2, '{}'), ($1, 'assistant', '[Gambar dihasilkan]', $3)",
          [savedConversationId, q, JSON.stringify({ modelUsed: usedModel.modelName })]
        );
        await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [savedConversationId]);
      } catch (dbErr) {
        console.error("Gagal menyimpan riwayat image chat:", dbErr.message);
      }
    }

    res.status(200).json({
      ok: true,
      mode: "image",
      imageUrl,
      modelUsed: usedModel.modelName,
      serverUsed: usedModel.serverName,
      latencyMs: result.latencyMs,
      conversationId: savedConversationId,
    });
  } catch (err) {
    console.error("Image chat error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
