/**
 * ============================================================
 *  api/chat/websearch.js
 * ------------------------------------------------------------
 *  POST /api/chat/websearch
 *  Body: { text }
 *  Mencari di web via WEB_SEARCH endpoint (configapi.js).
 * ============================================================
 */

const { WEB_SEARCH } = require("../../configapi");
const { callEndpoint } = require("../../lib/fetchEngine");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    const { text } = req.body || {};
    const q = (text || req.query?.text || req.query?.q || req.query?.query || "").toString().trim();

    if (!q) {
      res.status(400).json({ ok: false, error: "Parameter text/q/query wajib diisi" });
      return;
    }

    const result = await callEndpoint(WEB_SEARCH, q);

    if (!result.ok) {
      res.status(502).json({ ok: false, error: `Web search server tidak merespons (${result.error}).` });
      return;
    }

    res.status(200).json({
      ok: true,
      mode: "websearch",
      query: q,
      result: result.text,
      raw: result.raw || null,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error("Web search error:", err);
    res.status(500).json({ ok: false, error: "Terjadi kesalahan internal pada server." });
  }
};
