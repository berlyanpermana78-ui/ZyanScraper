/**
 * ============================================================
 *  public/js/api.js
 * ------------------------------------------------------------
 *  Wrapper kecil untuk semua pemanggilan API backend + toast
 *  notification helper. File ini tidak bergantung file lain.
 * ============================================================
 */

const TriAPI = (() => {
  function getToken() {
    return localStorage.getItem("tt_token") || "";
  }

  async function request(path, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(path, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
      });
    } catch (err) {
      return { ok: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet." };
    }

    let data;
    try {
      data = await res.json();
    } catch {
      return { ok: false, error: "Respons server tidak valid." };
    }
    return data;
  }

  return {
    get: (path) => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body }),
    del: (path) => request(path, { method: "DELETE" }),
    getToken,
    setToken: (t) => localStorage.setItem("tt_token", t),
    clearToken: () => localStorage.removeItem("tt_token"),
  };
})();

const Toast = (() => {
  function show(message, type = "default") {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `toast ${type === "default" ? "" : type}`.trim();
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }
  return { show };
})();
