/**
 * ============================================================
 *  public/js/app.js
 * ------------------------------------------------------------
 *  Entry point: inisialisasi semua modul saat halaman dimuat,
 *  serta logika buka/tutup sidebar.
 * ============================================================
 */

(function bootstrap() {
  function initSidebarToggle() {
    const sidebar = document.getElementById("sidebar");
    const btn = document.getElementById("btnToggleSidebar");

    const saved = localStorage.getItem("tt_sidebar_collapsed");
    if (saved === "true") sidebar.classList.add("collapsed");

    btn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      localStorage.setItem("tt_sidebar_collapsed", sidebar.classList.contains("collapsed"));
    });

    // Di layar kecil, klik di luar sidebar menutupnya otomatis
    document.addEventListener("click", (e) => {
      if (window.innerWidth > 860) return;
      const isInsideSidebar = sidebar.contains(e.target);
      const isToggleBtn = btn.contains(e.target);
      if (!isInsideSidebar && !isToggleBtn && !sidebar.classList.contains("collapsed")) {
        sidebar.classList.add("collapsed");
      }
    });
  }

  function initMonitorCollapse() {
    const header = document.getElementById("monitorHeader");
    const list = document.getElementById("monitorList");
    header.addEventListener("click", () => {
      const isHidden = list.style.display === "none";
      list.style.display = isHidden ? "flex" : "none";
    });
  }

  async function init() {
    initSidebarToggle();
    initMonitorCollapse();
    TriAuth.initUI();
    TriChat.initUI();
    TriMonitor.initUI();

    const user = await TriAuth.checkSession();
    if (user) {
      TriChat.refreshHistory();
    } else {
      // Tampilkan modal login setelah jeda singkat agar tidak
      // terasa memaksa saat pertama buka halaman
      setTimeout(() => {
        if (!TriAuth.isLoggedIn()) TriAuth.openModal("login");
      }, 900);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
