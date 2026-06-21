/**
 * ============================================================
 *  public/js/auth.js
 * ------------------------------------------------------------
 *  Logika modal Sign In / Sign Up, status sesi user, dan update
 *  tampilan sidebar (logged in / logged out).
 * ============================================================
 */

const TriAuth = (() => {
  let currentUser = null;

  function isLoggedIn() {
    return !!currentUser;
  }

  function getUser() {
    return currentUser;
  }

  async function checkSession() {
    if (!TriAPI.getToken()) {
      renderLoggedOut();
      return null;
    }
    const res = await TriAPI.get("/api/auth/me");
    if (res.ok) {
      currentUser = res.user;
      renderLoggedIn(res.user);
      return res.user;
    } else {
      TriAPI.clearToken();
      renderLoggedOut();
      return null;
    }
  }

  function renderLoggedIn(user) {
    document.getElementById("userLoggedOutView").style.display = "none";
    const loggedInView = document.getElementById("userLoggedInView");
    loggedInView.style.display = "block";
    document.getElementById("userDisplayName").textContent = user.username;
    document.getElementById("userAvatarInitial").textContent = user.username
      .slice(0, 1)
      .toUpperCase();
  }

  function renderLoggedOut() {
    currentUser = null;
    document.getElementById("userLoggedOutView").style.display = "block";
    document.getElementById("userLoggedInView").style.display = "none";
  }

  async function login(identifier, password) {
    const res = await TriAPI.post("/api/auth/login", { identifier, password });
    if (res.ok) {
      TriAPI.setToken(res.token);
      currentUser = res.user;
      renderLoggedIn(res.user);
    }
    return res;
  }

  async function register(username, email, password) {
    const res = await TriAPI.post("/api/auth/register", { username, email, password });
    if (res.ok) {
      TriAPI.setToken(res.token);
      currentUser = res.user;
      renderLoggedIn(res.user);
    }
    return res;
  }

  async function logout() {
    await TriAPI.post("/api/auth/logout", {});
    TriAPI.clearToken();
    renderLoggedOut();
  }

  // ---------------- Modal control ----------------
  function openModal(mode = "login") {
    const backdrop = document.getElementById("authBackdrop");
    backdrop.classList.add("open");
    setAuthTab(mode);
    clearError();
  }
  function closeModal() {
    document.getElementById("authBackdrop").classList.remove("open");
    clearError();
  }
  function clearError() {
    const errBox = document.getElementById("authError");
    errBox.textContent = "";
    errBox.classList.remove("show");
  }
  function showError(msg) {
    const errBox = document.getElementById("authError");
    errBox.textContent = msg;
    errBox.classList.add("show");
  }
  function setAuthTab(mode) {
    document.querySelectorAll(".auth-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === mode)
    );
    document.getElementById("loginForm").style.display = mode === "login" ? "block" : "none";
    document.getElementById("registerForm").style.display = mode === "register" ? "block" : "none";
    document.getElementById("authTitle").textContent =
      mode === "login" ? "Masuk ke TriThink AI" : "Buat Akun TriThink AI";
    document.getElementById("authSub").textContent =
      mode === "login"
        ? "Login untuk menyimpan riwayat percakapanmu."
        : "Daftar gratis, otomatis masuk setelah berhasil.";
    clearError();
  }

  function initUI() {
    document.getElementById("btnOpenAuth").addEventListener("click", () => openModal("login"));
    document.getElementById("authBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "authBackdrop") closeModal();
    });
    document.getElementById("btnSkipAuth").addEventListener("click", closeModal);

    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => setAuthTab(tab.dataset.tab));
    });

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const identifier = document.getElementById("loginIdentifier").value.trim();
      const password = document.getElementById("loginPassword").value;
      const btn = document.getElementById("btnLoginSubmit");
      btn.disabled = true;
      btn.textContent = "Memproses…";
      const res = await login(identifier, password);
      btn.disabled = false;
      btn.textContent = "Masuk";
      if (!res.ok) {
        showError(res.error || "Gagal masuk. Coba lagi.");
        return;
      }
      closeModal();
      Toast.show(`Selamat datang kembali, ${res.user.username}!`, "success");
      if (window.TriChat) window.TriChat.refreshHistory();
    });

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const username = document.getElementById("regUsername").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      const btn = document.getElementById("btnRegisterSubmit");
      btn.disabled = true;
      btn.textContent = "Memproses…";
      const res = await register(username, email, password);
      btn.disabled = false;
      btn.textContent = "Daftar & Masuk";
      if (!res.ok) {
        showError(res.error || "Gagal mendaftar. Coba lagi.");
        return;
      }
      closeModal();
      Toast.show(`Akun berhasil dibuat. Selamat datang, ${res.user.username}!`, "success");
      if (window.TriChat) window.TriChat.refreshHistory();
    });

    document.getElementById("userRow").addEventListener("click", async () => {
      if (confirm("Keluar dari akun TriThink AI?")) {
        await logout();
        Toast.show("Berhasil keluar.", "default");
        if (window.TriChat) window.TriChat.refreshHistory();
      }
    });
  }

  return {
    isLoggedIn,
    getUser,
    checkSession,
    login,
    register,
    logout,
    openModal,
    closeModal,
    initUI,
  };
})();
