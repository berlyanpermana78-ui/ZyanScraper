/**
 * ============================================================
 *  api/chat/daily.js
 * ------------------------------------------------------------
 *  POST /api/chat/daily
 *  Body: { text, model } -> model: "chatgpt" | "gemini" (opsional,
 *         default akan pakai model pertama yang enabled)
 *  Mode obrolan harian biasa menggunakan salah satu dari 2 model
 *  di DAILY_CHAT_MODELS (configapi.js).
 * ============================================================
 */

const { DAILY_CHAT_MODELS } = require("../../configapi");
const { callEndpoint } = require("../../lib/fetchEngine");
const { getUserFromRequest } = require("../../lib/auth");
const { query, ensureSchema } = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    const { text, model, conversationId } = req.body || {};
    const q = (text || req.query?.text || req.query?.q || req.query?.prompt || "").toString().trim();

    if (!q) {
      res.status(400).json({ ok: false, error: "Parameter text/q/prompt wajib diisi" });
      return;
    }

    const availableModels = Object.values(DAILY_CHAT_MODELS).filter((m) => m.enabled);
    if (availableModels.length === 0) {
      res.status(503).json({ ok: false, error: "Tidak ada model daily chat yang aktif" });
      return;
    }

    let selected = availableModels.find((m) => m.id === model) || availableModels[0];

    let result = await callEndpoint(selected, q);

    // Failover otomatis ke model kedua jika model pertama gagal
    if (!result.ok && availableModels.length > 1) {
      const fallbackModel = availableModels.find((m) => m.id !== selected.id);
      if (fallbackModel) {
        const fallbackResult = await callEndpoint(fallbackModel, q);
        if (fallbackResult.ok) {
          selected = fallbackModel;
          result = fallbackResult;
        }
      }
    }

    if (!result.ok) {
      res.status(502).json({
        ok: false,
        error: `Server ${selected.serverName} sedang tidak merespons (${result.error}).`,
      });
      return;
    }

    // Simpan riwayat chat jika user login
    const user = getUserFromRequest(req);
    let savedConversationId = conversationId || null;
    if (user) {
      try {
        await ensureSchema();
        if (!savedConversationId) {
          const conv = await query(
            "INSERT INTO conversations (user_id, title, mode) VALUES ($1, $2, 'daily') RETURNING id",
            [user.id, q.slice(0, 60)]
          );
          savedConversationId = conv.rows[0].id;
        }
        await query(
          "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)",
          [savedConversationId, q, result.text]
        );
        await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [savedConversationId]);
      } catch (dbErr) {
        console.error("Gagal menyimpan riwayat chat:", dbErr.message);
      }
    }

    res.status(200).json({
      ok: true,
      mode: "daily",
      answer: result.text,
      modelUsed: selected.modelName,
      serverUsed: selected.serverName,
      latencyMs: result.latencyMs,
      conversationId: savedConversationId,
    });
  } catch (err) {
    console.error("Daily chat error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
