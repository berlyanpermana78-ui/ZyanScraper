/**
 * ============================================================
 *  lib/agentEngine.js
 * ------------------------------------------------------------
 *  Logika mode "AI Agent" — memanggil 5 model AI sekaligus,
 *  lalu menggabungkan hasilnya menjadi satu jawaban terbaik
 *  melalui proses "debat" 2 babak:
 *
 *  RONDE 1: Semua agent yang enabled & berhasil merespons
 *           ditanya pertanyaan asli user secara paralel.
 *  RONDE 2 (Sintesis): Salah satu agent yang berhasil di
 *           Ronde 1 (yang paling cepat merespons / paling
 *           reliable) diberi tugas tambahan: membaca SEMUA
 *           jawaban dari Ronde 1, membandingkan, lalu menyusun
 *           SATU jawaban final terbaik yang sudah mengoreksi
 *           kesalahan & menggabungkan poin terbaik tiap agent.
 *
 *  Kalau Ronde 2 gagal (agent sintesis down), sistem fallback
 *  otomatis memilih jawaban terpanjang & paling lengkap dari
 *  Ronde 1 sebagai jawaban final (anti-bug, selalu ada output).
 * ============================================================
 */

const { AGENT_MODELS } = require("../configapi");
const { callEndpoint } = require("./fetchEngine");

/**
 * Panggil semua agent yang enabled secara paralel.
 */
async function runAllAgents(query) {
  const entries = Object.values(AGENT_MODELS).filter((a) => a.enabled);

  const results = await Promise.all(
    entries.map(async (agent) => {
      const res = await callEndpoint(agent, query);
      return {
        agentId: agent.id,
        serverName: agent.serverName,
        modelName: agent.modelName,
        ok: res.ok,
        text: res.ok ? res.text : null,
        error: res.ok ? null : res.error,
        latencyMs: res.latencyMs,
      };
    })
  );

  return results;
}

/**
 * Bangun prompt sintesis: minta satu agent membandingkan semua
 * jawaban dan menyusun jawaban final terbaik (proses "debat").
 */
function buildSynthesisPrompt(originalQuery, agentResults) {
  const successResults = agentResults.filter((r) => r.ok && r.text);

  let prompt = `Kamu adalah moderator debat AI. Berikut pertanyaan asli dari user:\n"${originalQuery}"\n\n`;
  prompt += `Berikut adalah jawaban dari beberapa AI berbeda terhadap pertanyaan tersebut:\n\n`;

  successResults.forEach((r, i) => {
    const trimmed = (r.text || "").slice(0, 1200);
    prompt += `--- Jawaban AI ${i + 1} (${r.modelName}) ---\n${trimmed}\n\n`;
  });

  prompt +=
    `Tugasmu: bandingkan semua jawaban di atas, cek mana yang paling akurat dan ` +
    `lengkap, perbaiki jika ada yang salah, gabungkan poin-poin terbaik dari semua ` +
    `jawaban, lalu tulis SATU jawaban final yang paling baik, jelas, dan akurat untuk ` +
    `pertanyaan user. Jangan menyebutkan proses perbandingan ini di jawabanmu — ` +
    `langsung berikan jawaban final yang matang seolah itu jawabanmu sendiri.`;

  return prompt;
}

/**
 * Fallback jika tahap sintesis gagal: pilih jawaban "terbaik"
 * secara heuristik sederhana (terpanjang & tidak error) dari
 * Ronde 1.
 */
function fallbackBestAnswer(agentResults) {
  const successResults = agentResults.filter((r) => r.ok && r.text);
  if (successResults.length === 0) return null;

  successResults.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
  return successResults[0];
}

/**
 * Jalankan proses lengkap mode Agent Debate.
 * @param {string} query
 * @returns {Promise<{
 *   finalAnswer: string,
 *   synthesizedBy: string|null,
 *   agentResults: Array,
 *   usedFallback: boolean
 * }>}
 */
async function runAgentDebate(query) {
  // RONDE 1
  const agentResults = await runAllAgents(query);
  const successResults = agentResults.filter((r) => r.ok && r.text);

  if (successResults.length === 0) {
    return {
      finalAnswer:
        "Maaf, semua AI agent sedang tidak dapat dihubungi saat ini. Silakan coba lagi beberapa saat lagi, atau cek status server di sidebar.",
      synthesizedBy: null,
      agentResults,
      usedFallback: true,
    };
  }

  // Jika hanya 1 agent yang berhasil, langsung pakai itu (tidak perlu sintesis)
  if (successResults.length === 1) {
    return {
      finalAnswer: successResults[0].text,
      synthesizedBy: successResults[0].modelName,
      agentResults,
      usedFallback: false,
    };
  }

  // RONDE 2: pilih agent tercepat sebagai "moderator" sintesis
  const moderator = [...successResults].sort((a, b) => a.latencyMs - b.latencyMs)[0];
  const moderatorConfig = Object.values(AGENT_MODELS).find((a) => a.id === moderator.agentId);

  const synthesisPrompt = buildSynthesisPrompt(query, agentResults);
  const synthesisRes = await callEndpoint(moderatorConfig, synthesisPrompt);

  if (synthesisRes.ok && synthesisRes.text) {
    return {
      finalAnswer: synthesisRes.text,
      synthesizedBy: moderator.modelName,
      agentResults,
      usedFallback: false,
    };
  }

  // Fallback kalau sintesis gagal
  const best = fallbackBestAnswer(agentResults);
  return {
    finalAnswer: best ? best.text : "Maaf, terjadi kendala saat menyusun jawaban gabungan.",
    synthesizedBy: best ? best.modelName : null,
    agentResults,
    usedFallback: true,
  };
}

module.exports = { runAgentDebate, runAllAgents };
