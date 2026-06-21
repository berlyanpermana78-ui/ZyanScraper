/**
 * ============================================================
 *  public/js/monitor.js
 * ------------------------------------------------------------
 *  Mengambil & menampilkan status server AI di sidebar
 *  (hijau = baik, kuning = lambat, merah = down).
 * ============================================================
 */

const TriMonitor = (() => {
  let intervalId = null;

  function dotColor(status) {
    if (status === "good") return "var(--status-good)";
    if (status === "warn") return "var(--status-warn)";
    return "var(--status-down)";
  }

  function render(data) {
    const list = document.getElementById("monitorList");
    const summaryDot = document.getElementById("monitorSummaryDot");

    if (!data || !data.servers) {
      list.innerHTML = `<div class="monitor-row"><span style="color:var(--text-tertiary);font-size:11px;">Gagal memuat status server.</span></div>`;
      summaryDot.style.background = "var(--status-down)";
      summaryDot.style.color = "var(--status-down)";
      return;
    }

    const { servers, summary } = data;

    let overall = "good";
    if (summary.down > 0 && summary.good === 0 && summary.warn === 0) overall = "down";
    else if (summary.down > 0 || summary.warn > 0) overall = "warn";
    summaryDot.style.background = dotColor(overall);
    summaryDot.style.color = dotColor(overall);

    list.innerHTML = servers
      .map(
        (s) => `
        <div class="monitor-row" title="${s.error ? escapeHtml(s.error) : 'Status baik'}">
          <span class="monitor-status-dot ${s.status}"></span>
          <span class="monitor-row-name">${escapeHtml(s.serverName)}</span>
          <span class="monitor-row-model">${escapeHtml(s.modelName)}</span>
          <span class="monitor-row-latency">${s.status === 'down' ? 'down' : s.latencyMs + 'ms'}</span>
        </div>`
      )
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  async function refresh() {
    const btn = document.getElementById("btnRefreshMonitor");
    btn.classList.add("spinning");
    const res = await TriAPI.get("/api/monitor");
    btn.classList.remove("spinning");
    if (res.ok) {
      render(res);
    } else {
      render(null);
    }
  }

  function startAutoRefresh(everyMs = 60000) {
    refresh();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(refresh, everyMs);
  }

  function initUI() {
    document.getElementById("btnRefreshMonitor").addEventListener("click", (e) => {
      e.stopPropagation();
      refresh();
    });
    startAutoRefresh();
  }

  return { initUI, refresh };
})();
