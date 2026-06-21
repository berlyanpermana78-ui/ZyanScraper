/**
 * ============================================================
 *  lib/serverMonitor.js
 * ------------------------------------------------------------
 *  Mengecek status "kesehatan" tiap endpoint AI yang terdaftar
 *  di configapi.js, lalu mengembalikan status warna untuk
 *  ditampilkan di sidebar:
 *    - "good"   (hijau)  -> respons cepat & sukses
 *    - "warn"   (kuning) -> respons lambat tapi sukses
 *    - "down"   (merah)  -> gagal / timeout / error
 *
 *  Ping dilakukan dengan query singkat ("hi" / "test") supaya
 *  hemat kuota & cepat.
 * ============================================================
 */

const {
  DAILY_CHAT_MODELS,
  AGENT_MODELS,
  IMAGE_MODELS,
  WEB_SEARCH,
  MONITOR_THRESHOLDS,
} = require("../configapi");
const { callEndpoint } = require("./fetchEngine");

function classifyStatus(ok, latencyMs) {
  if (!ok) return "down";
  if (latencyMs <= MONITOR_THRESHOLDS.goodMs) return "good";
  if (latencyMs <= MONITOR_THRESHOLDS.warnMs) return "warn";
  return "down";
}

function collectAllEndpoints() {
  const list = [];

  Object.values(DAILY_CHAT_MODELS).forEach((cfg) =>
    list.push({ ...cfg, category: "daily" })
  );
  Object.values(AGENT_MODELS).forEach((cfg) =>
    list.push({ ...cfg, category: "agent" })
  );
  Object.values(IMAGE_MODELS).forEach((cfg) =>
    list.push({ ...cfg, category: "image" })
  );
  list.push({ ...WEB_SEARCH, category: "search" });

  return list.filter((e) => e.enabled !== false);
}

/**
 * Ping satu endpoint, kembalikan status ringkas.
 */
async function pingEndpoint(endpointConfig) {
  const pingQuery = endpointConfig.category === "image" ? "a red apple" : "halo";
  const res = await callEndpoint(endpointConfig, pingQuery);
  const status = classifyStatus(res.ok, res.latencyMs);

  return {
    id: endpointConfig.id,
    serverName: endpointConfig.serverName,
    modelName: endpointConfig.modelName,
    category: endpointConfig.category,
    status, // "good" | "warn" | "down"
    latencyMs: res.latencyMs,
    error: res.ok ? null : res.error,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Cek semua endpoint secara paralel.
 */
async function pingAll() {
  const endpoints = collectAllEndpoints();
  const results = await Promise.all(endpoints.map((e) => pingEndpoint(e)));

  const summary = {
    total: results.length,
    good: results.filter((r) => r.status === "good").length,
    warn: results.filter((r) => r.status === "warn").length,
    down: results.filter((r) => r.status === "down").length,
  };

  return { servers: results, summary, generatedAt: new Date().toISOString() };
}

module.exports = { pingAll, pingEndpoint, collectAllEndpoints, classifyStatus };
