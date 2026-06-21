/**
 * ============================================================
 *  lib/fetchEngine.js
 * ------------------------------------------------------------
 *  Engine universal untuk memanggil endpoint AI yang didaftarkan
 *  di configapi.js. Menangani:
 *  - Placeholder {{Q}} di url (auto encodeURIComponent)
 *  - Method GET / POST
 *  - Timeout per-request (AbortController)
 *  - Ekstraksi jawaban via "responsePath" (dot notation)
 *  - Mode BINARY untuk endpoint image yang balas file langsung
 *  - Pengukuran latency (dipakai Server Monitor)
 * ============================================================
 */

/**
 * Ambil nilai dari objek bersarang via dot-notation path.
 * Contoh: getByPath({a:{b:{c:"x"}}}, "a.b.c") -> "x"
 */
function getByPath(obj, path) {
  if (!path) return obj;
  return path
    .split(".")
    .reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
}

/**
 * Cari "jawaban teks" otomatis di dalam objek JSON jika
 * responsePath yang dikonfigurasi tidak ditemukan. Ini sebagai
 * fallback anti-bug supaya UI tidak pernah blank kalau struktur
 * API sedikit berbeda dari yang dikonfigurasi.
 */
function autoFindText(obj, depth = 0) {
  if (depth > 4 || obj === null || obj === undefined) return null;
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = autoFindText(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    const priorityKeys = [
      "message", "result", "response", "answer", "text", "data",
      "content", "output", "reply", "msg",
    ];
    for (const key of priorityKeys) {
      if (key in obj) {
        const found = autoFindText(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const key of Object.keys(obj)) {
      const found = autoFindText(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Bangun URL final dari template + query (mengganti {{Q}}).
 */
function buildUrl(urlTemplate, query) {
  const encoded = encodeURIComponent(query ?? "");
  return urlTemplate.replace(/\{\{Q\}\}/g, encoded);
}

/**
 * Panggil satu endpoint sesuai konfigurasi di configapi.js.
 * @param {object} endpointConfig - salah satu entri dari configapi.js
 * @param {string} query - teks/prompt dari user
 * @returns {Promise<{ok:boolean, text?:string, binary?:Buffer, contentType?:string, latencyMs:number, error?:string, raw?:any}>}
 */
async function callEndpoint(endpointConfig, query) {
  const startedAt = Date.now();
  const {
    url: urlTemplate,
    method = "get",
    bodyTemplate,
    responsePath,
    userAgent,
    timeoutMs = 25000,
  } = endpointConfig;

  const finalUrl = buildUrl(urlTemplate, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        "User-Agent": userAgent || "TriThinkAI/1.0",
        Accept: "*/*",
      },
      signal: controller.signal,
    };

    if (method.toLowerCase() === "post") {
      const body = bodyTemplate
        ? JSON.parse(JSON.stringify(bodyTemplate).replace(/\{\{Q\}\}/g, query))
        : { text: query };
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(finalUrl, fetchOptions);
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} ${res.statusText}`,
        latencyMs,
      };
    }

    const contentType = res.headers.get("content-type") || "";

    // ---- Mode BINARY (untuk image endpoint yang balas file langsung) ----
    if (responsePath === "BINARY" || contentType.startsWith("image/")) {
      const arrayBuf = await res.arrayBuffer();
      return {
        ok: true,
        binary: Buffer.from(arrayBuf),
        contentType: contentType || "image/png",
        latencyMs,
      };
    }

    // ---- Mode JSON / text ----
    const rawText = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Bukan JSON valid -> anggap response adalah teks polos
      return { ok: true, text: rawText.trim(), latencyMs, raw: rawText };
    }

    // Kalau respons JSON tapi sebenarnya berisi link gambar
    const maybeImageUrl =
      getByPath(parsed, responsePath) ||
      parsed.url || parsed.image || parsed.result_url;
    if (
      typeof maybeImageUrl === "string" &&
      /\.(png|jpe?g|webp|gif)(\?|$)/i.test(maybeImageUrl)
    ) {
      return { ok: true, text: maybeImageUrl, isImageUrl: true, latencyMs, raw: parsed };
    }

    let text = getByPath(parsed, responsePath);
    if (typeof text !== "string" || text.trim() === "") {
      text = autoFindText(parsed);
    }

    if (!text) {
      return { ok: false, error: "Respons API kosong / format tidak dikenali", latencyMs, raw: parsed };
    }

    return { ok: true, text: String(text), latencyMs, raw: parsed };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = err.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? "Timeout: server tidak merespons" : `Gagal terhubung: ${err.message}`,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callEndpoint, buildUrl, getByPath, autoFindText };
