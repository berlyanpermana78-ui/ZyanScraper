/**
 * ============================================================
 *  api/monitor.js
 * ------------------------------------------------------------
 *  GET /api/monitor
 *  Mengembalikan status semua server AI (good/warn/down) untuk
 *  ditampilkan di sidebar Server Monitor.
 * ============================================================
 */

const { pingAll } = require("../lib/serverMonitor");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method tidak diizinkan" });
    return;
  }

  try {
    const data = await pingAll();
    res.status(200).json({ ok: true, ...data });
  } catch (err) {
    console.error("Monitor error:", err);
    res.status(500).json({ ok: false, error: "Gagal mengambil status server." });
  }
};
