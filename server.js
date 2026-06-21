/**
 * ============================================================
 *  server.js — Server lokal / VPS / Termux
 * ------------------------------------------------------------
 *  Jalankan dengan: npm start
 *  Server ini membungkus semua file di folder api/ menjadi
 *  route Express, sehingga 1 codebase yang sama bisa dipakai
 *  untuk:
 *  - Run lokal (npm run dev)
 *  - VPS / Termux (npm start / pm2)
 *  - Vercel (otomatis via folder api/, server.js tidak dipakai
 *    di Vercel — lihat vercel.json)
 * ============================================================
 */

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// Helper: bungkus handler gaya Vercel (module.exports = (req,res)=>{})
// agar bisa dipakai sebagai middleware Express biasa.
// ------------------------------------------------------------
function wrap(handlerPath) {
  const handler = require(handlerPath);
  return (req, res) => {
    // Vercel handler membaca req.query dari objek query string
    // bawaan, Express sudah menyediakan req.query secara otomatis
    // jadi tidak perlu adaptasi tambahan.
    return handler(req, res);
  };
}

// ---------------- AUTH ROUTES ----------------
app.post("/api/auth/register", wrap("./api/auth/register"));
app.post("/api/auth/login", wrap("./api/auth/login"));
app.get("/api/auth/me", wrap("./api/auth/me"));
app.post("/api/auth/logout", wrap("./api/auth/logout"));

// ---------------- CHAT ROUTES ----------------
app.post("/api/chat/daily", wrap("./api/chat/daily"));
app.post("/api/chat/agent", wrap("./api/chat/agent"));
app.post("/api/chat/image", wrap("./api/chat/image"));
app.post("/api/chat/websearch", wrap("./api/chat/websearch"));

// ---------------- MONITOR ----------------
app.get("/api/monitor", wrap("./api/monitor"));

// ---------------- CONVERSATIONS ----------------
app.get("/api/conversations", wrap("./api/conversations/index"));
app.delete("/api/conversations", wrap("./api/conversations/index"));
app.get("/api/conversations/messages", wrap("./api/conversations/messages"));

// Fallback ke index.html untuk semua route non-API (SPA-style)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ ok: false, error: "Endpoint tidak ditemukan" });
    return;
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("============================================================");
  console.log(`  TriThink AI berjalan di http://localhost:${PORT}`);
  console.log("  Edit konfigurasi endpoint AI di configapi.js");
  console.log("============================================================");
});
