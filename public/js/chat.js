/**
 * ============================================================
 *  public/js/chat.js
 * ------------------------------------------------------------
 *  Logika inti: mengirim pesan ke mode yang aktif (daily / agent
 *  / image), merender bubble chat, mengelola riwayat percakapan
 *  di sidebar, dan toggle web search.
 * ============================================================
 */

const TriChat = (() => {
  let currentMode = "daily"; // "daily" | "agent" | "image"
  let webSearchOn = false;
  let currentConversationId = null;
  let isSending = false;

  const modeLabels = {
    daily: "Daily Chat",
    agent: "AI Agent (5 Model)",
    image: "Image Mode",
  };
  const modeHints = {
    daily: "Mode: Daily Chat — jawaban dari 1 dari 2 model AI",
    agent: "Mode: AI Agent — 5 model AI berdebat untuk jawaban terbaik",
    image: "Mode: Image — deskripsikan gambar yang ingin dibuat",
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // Render markdown super-ringan: **bold**, `code`, ```block```, newline
  function renderRichText(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return safe;
  }

  function clearWelcome() {
    const welcome = document.getElementById("welcomeState");
    if (welcome) welcome.remove();
  }

  function scrollToBottom() {
    const scrollEl = document.getElementById("chatScroll");
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function addUserBubble(text) {
    clearWelcome();
    const chatInner = document.getElementById("chatInner");
    const row = document.createElement("div");
    row.className = "msg-row user";
    row.innerHTML = `
      <div class="msg-avatar">${escapeHtml((TriAuth.getUser()?.username || "U").slice(0, 1).toUpperCase())}</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble">${renderRichText(text)}</div>
      </div>`;
    chatInner.appendChild(row);
    scrollToBottom();
  }

  function addTypingBubble() {
    const chatInner = document.getElementById("chatInner");
    const row = document.createElement("div");
    row.className = "msg-row assistant";
    row.id = "typingRow";
    row.innerHTML = `
      <div class="msg-avatar">T</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>`;
    chatInner.appendChild(row);
    scrollToBottom();
  }

  function removeTypingBubble() {
    const row = document.getElementById("typingRow");
    if (row) row.remove();
  }

  function addAssistantBubble({ text, meta, agentResults, imageUrl, isSearch, searchQuery }) {
    clearWelcome();
    const chatInner = document.getElementById("chatInner");
    const row = document.createElement("div");
    row.className = "msg-row assistant";

    let bubbleContent = "";
    if (imageUrl) {
      bubbleContent = `<img src="${imageUrl}" alt="Gambar hasil generate AI" loading="lazy">`;
    } else if (isSearch) {
      bubbleContent = `
        <div class="search-result-card">
          <span class="src-label">Hasil Web Search: "${escapeHtml(searchQuery)}"</span>
          ${renderRichText(text)}
        </div>`;
    } else {
      bubbleContent = renderRichText(text);
    }

    let agentHtml = "";
    if (agentResults && agentResults.length) {
      agentHtml = `
        <details class="agent-breakdown">
          <summary>Lihat rincian ${agentResults.length} AI agent</summary>
          <div class="agent-breakdown-list">
            ${agentResults
              .map(
                (a) => `
              <div class="agent-breakdown-item">
                <div class="ab-head">
                  <span class="monitor-status-dot ${a.ok ? "good" : "down"}"></span>
                  ${escapeHtml(a.modelName)} · ${a.ok ? a.latencyMs + "ms" : "gagal"}
                </div>
                <div class="ab-preview">${a.ok ? escapeHtml(a.preview) + "…" : escapeHtml(a.error || "Tidak merespons")}</div>
              </div>`
              )
              .join("")}
          </div>
        </details>`;
    }

    let metaHtml = "";
    if (meta) {
      metaHtml = `<div class="msg-meta">${meta
        .map((m) => `<span class="meta-badge">${escapeHtml(m)}</span>`)
        .join("")}</div>`;
    }

    row.innerHTML = `
      <div class="msg-avatar">T</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble">${bubbleContent}</div>
        ${agentHtml}
        ${metaHtml}
      </div>`;
    chatInner.appendChild(row);
    scrollToBottom();
  }

  function addErrorBubble(message) {
    addAssistantBubble({ text: `⚠️ ${message}`, meta: ["error"] });
  }

  // ---------------- Mode & toolbar ----------------
  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("topbarModePill").textContent = modeLabels[mode];
    document.getElementById("composerHint").textContent = modeHints[mode];

    const placeholderMap = {
      daily: "Tanyakan sesuatu ke TriThink AI…",
      agent: "Ajukan pertanyaan untuk didebat 5 AI agent…",
      image: "Deskripsikan gambar yang ingin kamu buat…",
    };
    document.getElementById("chatInput").placeholder = placeholderMap[mode];
  }

  function toggleWebSearch(force) {
    webSearchOn = typeof force === "boolean" ? force : !webSearchOn;
    document.getElementById("toggleWebSearch").classList.toggle("active", webSearchOn);
  }

  // ---------------- Sending ----------------
  async function sendMessage(rawText) {
    const text = (rawText ?? document.getElementById("chatInput").value).trim();
    if (!text || isSending) return;

    isSending = true;
    document.getElementById("btnSend").disabled = true;
    document.getElementById("chatInput").value = "";
    autoResizeTextarea();

    addUserBubble(text);
    addTypingBubble();

    try {
      let res;

      if (webSearchOn && currentMode !== "image") {
        res = await TriAPI.post("/api/chat/websearch", { text });
        removeTypingBubble();
        if (res.ok) {
          addAssistantBubble({
            text: res.result,
            isSearch: true,
            searchQuery: res.query,
            meta: [`${res.latencyMs}ms`],
          });
        } else {
          addErrorBubble(res.error || "Web search gagal.");
        }
        isSending = false;
        document.getElementById("btnSend").disabled = false;
        return;
      }

      if (currentMode === "daily") {
        res = await TriAPI.post("/api/chat/daily", { text, conversationId: currentConversationId });
        removeTypingBubble();
        if (res.ok) {
          currentConversationId = res.conversationId || currentConversationId;
          addAssistantBubble({
            text: res.answer,
            meta: [res.modelUsed, `${res.latencyMs}ms`],
          });
          updateTopbarTitle(text);
          refreshHistory();
        } else {
          addErrorBubble(res.error || "Gagal mendapatkan jawaban.");
        }
      } else if (currentMode === "agent") {
        res = await TriAPI.post("/api/chat/agent", { text, conversationId: currentConversationId });
        removeTypingBubble();
        if (res.ok) {
          currentConversationId = res.conversationId || currentConversationId;
          addAssistantBubble({
            text: res.answer,
            meta: [
              res.synthesizedBy ? `Disusun oleh ${res.synthesizedBy}` : "Gabungan 5 agent",
              res.usedFallback ? "fallback" : "sintesis",
            ],
            agentResults: res.agentResults,
          });
          updateTopbarTitle(text);
          refreshHistory();
        } else {
          addErrorBubble(res.error || "Semua AI agent gagal merespons.");
        }
      } else if (currentMode === "image") {
        res = await TriAPI.post("/api/chat/image", { text, conversationId: currentConversationId });
        removeTypingBubble();
        if (res.ok) {
          currentConversationId = res.conversationId || currentConversationId;
          addAssistantBubble({
            imageUrl: res.imageUrl,
            meta: [res.modelUsed, `${res.latencyMs}ms`],
          });
          updateTopbarTitle(text);
          refreshHistory();
        } else {
          addErrorBubble(res.error || "Gagal membuat gambar.");
        }
      }
    } catch (err) {
      removeTypingBubble();
      addErrorBubble("Terjadi kesalahan tak terduga. Silakan coba lagi.");
      console.error(err);
    } finally {
      isSending = false;
      document.getElementById("btnSend").disabled = false;
    }
  }

  function updateTopbarTitle(text) {
    const title = document.getElementById("topbarTitle");
    if (title.textContent === "Percakapan Baru") {
      title.textContent = text.length > 42 ? text.slice(0, 42) + "…" : text;
    }
  }

  function autoResizeTextarea() {
    const ta = document.getElementById("chatInput");
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function newConversation() {
    currentConversationId = null;
    document.getElementById("topbarTitle").textContent = "Percakapan Baru";
    const chatInner = document.getElementById("chatInner");
    chatInner.innerHTML = `
      <div class="welcome-state" id="welcomeState">
        <div class="welcome-mark">T</div>
        <div class="welcome-title">Selamat datang di TriThink AI</div>
        <div class="welcome-sub">Pilih mode di sidebar: <b>Daily Chat</b> untuk obrolan cepat, <b>AI Agent</b> untuk 5 model AI berdebat mencari jawaban terbaik, atau <b>Image Mode</b> untuk membuat gambar. Aktifkan Web Search kapan saja dari kolom chat.</div>
        <div class="welcome-suggestions">
          <button class="suggestion-card" type="button" data-fill="Jelaskan perbedaan antara REST API dan GraphQL"><b>Tanya teknis</b>Perbedaan REST API dan GraphQL</button>
          <button class="suggestion-card" type="button" data-fill="Buatkan rencana belajar Node.js untuk pemula selama 30 hari"><b>Rencana belajar</b>Roadmap belajar Node.js 30 hari</button>
          <button class="suggestion-card" type="button" data-fill="Apa kabar berita teknologi AI terbaru minggu ini?"><b>Coba Web Search</b>Berita AI terbaru minggu ini</button>
          <button class="suggestion-card" type="button" data-fill="Kucing oranye memakai jaket astronaut, gaya digital art"><b>Coba Image Mode</b>Kucing astronaut digital art</button>
        </div>
      </div>`;
    bindSuggestionCards();
    setActiveHistoryItem(null);
  }

  // ---------------- History sidebar ----------------
  async function refreshHistory() {
    const list = document.getElementById("historyList");
    if (!TriAuth.isLoggedIn()) {
      list.innerHTML = `<div class="history-empty" id="historyEmpty">Belum ada percakapan. Login untuk menyimpan riwayat.</div>`;
      return;
    }
    const res = await TriAPI.get("/api/conversations");
    if (!res.ok || !res.conversations || res.conversations.length === 0) {
      list.innerHTML = `<div class="history-empty">Belum ada percakapan tersimpan.</div>`;
      return;
    }
    const tagMap = { daily: "Chat", agent: "Agent", image: "Image" };
    list.innerHTML = res.conversations
      .map(
        (c) => `
        <div class="history-item ${c.id === currentConversationId ? "active" : ""}" data-id="${c.id}" data-mode="${c.mode}">
          <span class="h-tag">${tagMap[c.mode] || c.mode}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.title)}</span>
          <svg class="h-del" data-id="${c.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
        </div>`
      )
      .join("");

    list.querySelectorAll(".history-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".h-del")) return;
        loadConversation(parseInt(item.dataset.id, 10), item.dataset.mode);
      });
    });
    list.querySelectorAll(".h-del").forEach((delBtn) => {
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = delBtn.dataset.id;
        await TriAPI.del(`/api/conversations?id=${id}`);
        if (parseInt(id, 10) === currentConversationId) newConversation();
        refreshHistory();
      });
    });
  }

  function setActiveHistoryItem(id) {
    document.querySelectorAll(".history-item").forEach((item) => {
      item.classList.toggle("active", parseInt(item.dataset.id, 10) === id);
    });
  }

  async function loadConversation(id, mode) {
    const res = await TriAPI.get(`/api/conversations/messages?id=${id}`);
    if (!res.ok) {
      Toast.show(res.error || "Gagal memuat percakapan.", "error");
      return;
    }
    currentConversationId = id;
    setMode(mode);
    setActiveHistoryItem(id);

    const chatInner = document.getElementById("chatInner");
    chatInner.innerHTML = "";
    let titleSet = false;

    res.messages.forEach((m) => {
      if (m.role === "user") {
        addUserBubble(m.content);
        if (!titleSet) {
          document.getElementById("topbarTitle").textContent =
            m.content.length > 42 ? m.content.slice(0, 42) + "…" : m.content;
          titleSet = true;
        }
      } else {
        const meta = m.meta || {};
        if (mode === "agent" && meta.synthesizedBy) {
          addAssistantBubble({
            text: m.content,
            meta: [`Disusun oleh ${meta.synthesizedBy}`],
            agentResults: meta.agentResults
              ? meta.agentResults.map((a) => ({
                  modelName: a.modelName,
                  ok: a.ok,
                  latencyMs: a.latencyMs,
                  preview: a.text ? a.text.slice(0, 200) : null,
                  error: a.error,
                }))
              : null,
          });
        } else if (mode === "image") {
          addAssistantBubble({ text: m.content, meta: meta.modelUsed ? [meta.modelUsed] : [] });
        } else {
          addAssistantBubble({ text: m.content });
        }
      }
    });
  }

  function bindSuggestionCards() {
    document.querySelectorAll(".suggestion-card").forEach((card) => {
      card.addEventListener("click", () => {
        document.getElementById("chatInput").value = card.dataset.fill;
        autoResizeTextarea();
        document.getElementById("chatInput").focus();
      });
    });
  }

  function initUI() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    document.getElementById("toggleWebSearch").addEventListener("click", () => toggleWebSearch());

    document.getElementById("btnSend").addEventListener("click", () => sendMessage());
    document.getElementById("chatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    document.getElementById("chatInput").addEventListener("input", autoResizeTextarea);

    document.getElementById("btnNewChat").addEventListener("click", newConversation);

    bindSuggestionCards();
    refreshHistory();
  }

  return {
    initUI,
    sendMessage,
    setMode,
    newConversation,
    refreshHistory,
  };
})();
