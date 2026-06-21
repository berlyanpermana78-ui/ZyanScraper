/**
 * ============================================================
 *  api/chat/agent.js
 * ------------------------------------------------------------
 *  POST /api/chat/agent
 *  Body: { text }
 *  Mode "AI Agent" — 5 AI dipanggil sekaligus, berdebat, dan
 *  menghasilkan satu jawaban terbaik gabungan.
 * ============================================================
 */

const { runAgentDebate } = require("../../lib/agentEngine");
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
      res.status(400).json({ ok: false, error: "Parameter text/q/prompt wajib diisi" });
      return;
    }

    const debateResult = await runAgentDebate(q);

    const user = getUserFromRequest(req);
    let savedConversationId = conversationId || null;
    if (user) {
      try {
        await ensureSchema();
        if (!savedConversationId) {
          const conv = await query(
            "INSERT INTO conversations (user_id, title, mode) VALUES ($1, $2, 'agent') RETURNING id",
            [user.id, q.slice(0, 60)]
          );
          savedConversationId = conv.rows[0].id;
        }
        await query(
          "INSERT INTO messages (conversation_id, role, content, meta) VALUES ($1, 'user', $2, '{}'), ($1, 'assistant', $3, $4)",
          [
            savedConversationId,
            q,
            debateResult.finalAnswer,
            JSON.stringify({ synthesizedBy: debateResult.synthesizedBy, agentResults: debateResult.agentResults }),
          ]
        );
        await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [savedConversationId]);
      } catch (dbErr) {
        console.error("Gagal menyimpan riwayat agent chat:", dbErr.message);
      }
    }

    res.status(200).json({
      ok: true,
      mode: "agent",
      answer: debateResult.finalAnswer,
      synthesizedBy: debateResult.synthesizedBy,
      usedFallback: debateResult.usedFallback,
      agentResults: debateResult.agentResults.map((r) => ({
        modelName: r.modelName,
        serverName: r.serverName,
        ok: r.ok,
        latencyMs: r.latencyMs,
        preview: r.text ? r.text.slice(0, 200) : null,
        error: r.error,
      })),
      conversationId: savedConversationId,
    });
  } catch (err) {
    console.error("Agent chat error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
