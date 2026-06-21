/**
 * ============================================================
 *  TriThink AI — configapi.js
 * ============================================================
 *  INI ADALAH FILE UTAMA UNTUK MENGATUR SEMUA ENDPOINT API.
 *  Semua API yang dipakai TriThink AI (chat, agent debate,
 *  image generation, web search) diatur dari sini.
 *
 *  CARA EDIT / GANTI ENDPOINT:
 *  1. Cari objek di bawah sesuai kategori (DAILY_CHAT_MODELS,
 *     AGENT_MODELS, IMAGE_MODELS, WEB_SEARCH).
 *  2. Ganti field "url" dengan endpoint API kamu.
 *     - Pakai placeholder {{Q}} di posisi parameter teks/prompt.
 *       Contoh: "https://api.contoh.com/ai/chatgpt?text={{Q}}"
 *     - Kalau API butuh param tambahan (apikey dll), tambahkan
 *       langsung di url, contoh:
 *       "https://api.contoh.com/ai/gpt?text={{Q}}&apikey=ABC123"
 *  3. Ganti "method" jadi "get" atau "post".
 *  4. Kalau method "post", isi "bodyTemplate" (akan di-merge
 *     dengan {{Q}} sebagai isi pesan).
 *  5. "responsePath" = lokasi teks jawaban di dalam JSON respons
 *     API tersebut. Pakai notasi titik.
 *     Contoh respons: { "result": { "data": { "message": "halo" } } }
 *     -> responsePath = "result.data.message"
 *     Kalau respons API berupa string biasa (bukan JSON),
 *     kosongkan responsePath: ""
 *  6. "serverName" = nama yang tampil di sidebar Server Monitor.
 *  7. "modelName" = nama model AI yang tampil di UI (mis. "GPT-4o").
 *  8. "userAgent" = header User-Agent yang dipakai saat fetch.
 *
 *  PLACEHOLDER YANG DIDUKUNG DI URL:
 *  {{Q}}  -> teks/prompt user (otomatis ter-encodeURIComponent)
 *  Sistem ini otomatis mencoba beberapa nama parameter umum
 *  (text=, q=, prompt=, query=, message=) HANYA jika kamu
 *  pakai placeholder {{Q}} di salah satu posisi tsb pada url.
 *  Jadi kamu bebas menamai parameternya text=, q=, prompt=,
 *  apapun, selama isinya {{Q}}.
 * ============================================================
 */

// ------------------------------------------------------------
// USER AGENT GLOBAL (dipakai default kalau endpoint tidak
// menentukan userAgent sendiri)
// ------------------------------------------------------------
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

// ------------------------------------------------------------
// TIMEOUT GLOBAL (ms) untuk setiap pemanggilan endpoint AI
// ------------------------------------------------------------
const REQUEST_TIMEOUT_MS = 25000;

/**
 * ============================================================
 * 1. DAILY CHAT MODELS (2 model)
 * ------------------------------------------------------------
 * Mode "Daily Chat" akan memilih salah satu (atau memberi
 * pilihan) dari 2 model di bawah untuk obrolan harian biasa.
 * ============================================================
 */
const DAILY_CHAT_MODELS = {
  chatgpt: {
    id: "claude ai",
    serverName: "CLAUDE SERVER",
    modelName: "HAIKU-4.5",
    url: "https://api.lexcode.biz.id/api/ai/claude/4-5-haiku?text={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "answer",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
  gemini: {
    id: "unlimited aj",
    serverName: "UNLIMITED AI SERVER",
    modelName: "OpenAi Model",
    url: "https://api.lexcode.biz.id/api/ai/unlimited-ai?text={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "results",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
};

/**
 * ============================================================
 * 2. AGENT MODELS (5 model — dipakai mode "AI Agent Debate")
 * ------------------------------------------------------------
 * Mode ini memanggil ke-5 model di bawah secara paralel,
 * lalu menggabungkan ("debat") jawaban mereka menjadi satu
 * jawaban terbaik (lihat lib/agentEngine.js).
 * ============================================================
 */
const AGENT_MODELS = {
  agent1_gpt: {
    id: "agent1_claude",
    serverName: "Claude Agents",
    modelName: "Sonnet 4.6",
    url: "https://api.lexcode.biz.id/api/ai/claude/4-6-sonnet?text={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "result",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
  agent2_llama: {
    id: "agent2_claude2",
    serverName: "Claude2 Agents",
    modelName: "Opus 4.7",
    url: "https://api.lexcode.biz.id/api/ai/claude/4-7-opus?text={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "result",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
  agent3_deepseek: {
    id: "agent3_gemeni",
    serverName: "Gemeni Agents",
    modelName: "Gemeni",
    url: "https://api-nanzz.my.id/docs/api/ai/gemini.php?text={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "result",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
  agent4_gemini: {
    id: "agent4_copilot",
    serverName: "Agent Copilot",
    modelName: "Microsoft",
    url: "https://api-nanzz.my.id/docs/api/ai/copilot.php?q={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "result.text",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
  agent5_mistral: {
    id: "agent5_claude3",
    serverName: "Agent Claude3",
    modelName: "anthropic/claude-opus-4.8",
    url: "https://api-nanzz.my.id/docs/api/ai/chatday.php?prompt={{Q}}&model=anthropic%2Fclaude-opus-4.8",
    method: "get",
    bodyTemplate: null,
    responsePath: "result.response",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: REQUEST_TIMEOUT_MS,
    enabled: true,
  },
};

/**
 * ============================================================
 * 3. IMAGE AI MODEL(S)
 * ------------------------------------------------------------
 * Mode "Image Mode" memanggil endpoint text-to-image. Bisa
 * lebih dari satu — sistem akan coba urut dari atas ke bawah
 * sampai salah satu berhasil (failover).
 * "responsePath" untuk image diisi dengan path menuju URL
 * gambar di JSON respons API. Kalau API langsung balas berupa
 * gambar biner (image/png, image/jpeg) bukan JSON, set
 * responsePath: "BINARY".
 * ============================================================
 */
const IMAGE_MODELS = {
  flux: {
    id: "flux",
    serverName: "Flux Image Server",
    modelName: "Flux Diffusion",
    url: "https://api.siputzx.my.id/api/ai/flux?prompt={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "BINARY",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: 45000,
    enabled: true,
  },
  sdxl: {
    id: "sdxl",
    serverName: "SDXL Image Server",
    modelName: "Stable Diffusion XL",
    url: "https://api.siputzx.my.id/api/ai/sdxl?prompt={{Q}}",
    method: "get",
    bodyTemplate: null,
    responsePath: "data",
    userAgent: DEFAULT_USER_AGENT,
    timeoutMs: 45000,
    enabled: true,
  },
};

/**
 * ============================================================
 * 4. WEB SEARCH ENDPOINT
 * ============================================================
 */
const WEB_SEARCH = {
  id: "websearch",
  serverName: "Web Search Server",
  modelName: "Web Search Engine",
  url: "https://api.nexray.eu.cc/search/wikipedia?q={{Q}}",
  method: "get",
  bodyTemplate: null,
  responsePath: "result",
  userAgent: DEFAULT_USER_AGENT,
  timeoutMs: 20000,
  enabled: true,
};

/**
 * ============================================================
 * STATUS THRESHOLDS untuk Server Monitor (sidebar)
 * ------------------------------------------------------------
 * Dipakai lib/serverMonitor.js untuk menentukan warna status:
 * - latency di bawah "goodMs"  -> HIJAU (baik)
 * - latency di bawah "warnMs"  -> KUNING (lambat)
 * - lebih dari itu / error     -> MERAH (buruk/down)
 * ============================================================
 */
const MONITOR_THRESHOLDS = {
  goodMs: 4000,
  warnMs: 9000,
};

module.exports = {
  DEFAULT_USER_AGENT,
  REQUEST_TIMEOUT_MS,
  DAILY_CHAT_MODELS,
  AGENT_MODELS,
  IMAGE_MODELS,
  WEB_SEARCH,
  MONITOR_THRESHOLDS,
};
