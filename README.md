# TriThink AI

Asisten AI multi-model dengan tema **monokrom liquid glass**. Tiga mode chat murni endpoint (tanpa API key AI berbayar), sidebar bisa dibuka/ditutup, sistem login & daftar dengan database, dan server monitoring real-time.

## ✨ Fitur

- **3 Mode AI** (semua via endpoint, bukan API key OpenAI/Anthropic dsb):
  - 💬 **Daily Chat** — obrolan harian, otomatis pakai 1 dari 2 model (dengan failover otomatis kalau satu down)
  - 🧠 **AI Agent** — 5 model AI dipanggil sekaligus, "berdebat", lalu disintesis jadi satu jawaban terbaik
  - 🎨 **Image Mode** — generate gambar dari deskripsi teks
- 🔍 **Web Search** — tombol khusus di composer, bisa dipakai bareng mode apapun (kecuali image)
- 📊 **Server Monitor** — sidebar menampilkan status tiap server AI: 🟢 hijau (baik) / 🟡 kuning (lambat) / 🔴 merah (down), beserta nama AI, model, dan latency
- 🔐 **Sign In / Sign Up** — autentikasi lengkap (bcrypt + JWT), riwayat chat otomatis tersimpan per user di database
- 🗂️ **Riwayat percakapan** tersimpan & bisa dibuka kembali dari sidebar
- 📱 Sidebar bisa dibuka/ditutup, responsif di mobile
- 🛡️ Anti-bug: failover otomatis, auto-parse berbagai format respons API, timeout per-request

## 📁 Struktur Folder

```
trithink-ai/
├── configapi.js              # ⭐ PUSAT KONFIGURASI semua endpoint AI (7 endpoint + search)
├── server.js                 # Server Express untuk run lokal / VPS / Termux
├── vercel.json                # Konfigurasi deploy Vercel
├── package.json
├── .env.example               # Contoh environment variable
├── api/                       # Serverless functions (dipakai Vercel & server.js)
│   ├── auth/
│   │   ├── register.js        # POST  /api/auth/register
│   │   ├── login.js           # POST  /api/auth/login
│   │   ├── me.js              # GET   /api/auth/me
│   │   └── logout.js          # POST  /api/auth/logout
│   ├── chat/
│   │   ├── daily.js           # POST  /api/chat/daily   (2 model)
│   │   ├── agent.js           # POST  /api/chat/agent   (5 model debat)
│   │   ├── image.js           # POST  /api/chat/image
│   │   └── websearch.js       # POST  /api/chat/websearch
│   ├── conversations/
│   │   ├── index.js           # GET/DELETE /api/conversations
│   │   └── messages.js        # GET   /api/conversations/messages
│   └── monitor.js             # GET   /api/monitor
├── lib/
│   ├── fetchEngine.js         # Engine universal pemanggil endpoint AI manapun
│   ├── agentEngine.js         # Logika "5 AI debat -> 1 jawaban terbaik"
│   ├── serverMonitor.js       # Cek status hijau/kuning/merah tiap server
│   ├── db.js                  # Koneksi PostgreSQL/Supabase
│   └── auth.js                # Hash password & JWT session
├── database/
│   └── schema.sql             # Skema SQL (opsional, auto-dibuat juga oleh app)
└── public/                    # Frontend
    ├── index.html
    ├── css/style.css          # Tema monokrom liquid glass
    └── js/
        ├── api.js             # Wrapper fetch + toast
        ├── auth.js             # Logika modal login/daftar
        ├── monitor.js          # Render status server di sidebar
        ├── chat.js             # Logika chat 3 mode + riwayat
        └── app.js              # Bootstrap & sidebar toggle
```

## ⚙️ Cara Mengatur Endpoint AI (`configapi.js`)

Semua endpoint AI diatur dari **satu file**: `configapi.js`. Ada **7 endpoint AI** total:

| Kategori | Jumlah | Variabel |
|---|---|---|
| Daily Chat | 2 model | `DAILY_CHAT_MODELS` |
| AI Agent (debat) | 5 model | `AGENT_MODELS` |
| Image generation | 1+ model (failover) | `IMAGE_MODELS` |
| Web Search | 1 endpoint | `WEB_SEARCH` |

### Format tiap endpoint

```js
chatgpt: {
  id: "chatgpt",
  serverName: "ChatGPT Server",      // nama yang tampil di Server Monitor
  modelName: "OpenAI GPT-4o-mini",   // nama model yang tampil di chat
  url: "https://api.contoh.com/ai/chatgpt?text={{Q}}",  // {{Q}} = prompt user
  method: "get",                     // "get" atau "post"
  bodyTemplate: null,                // isi object jika method "post"
  responsePath: "data",              // lokasi jawaban di JSON respons (dot notation)
  userAgent: DEFAULT_USER_AGENT,
  timeoutMs: 25000,
  enabled: true,                     // set false untuk menonaktifkan tanpa hapus
}
```

**Cara mengganti URL endpoint:**
1. Ganti `url` dengan endpoint API kamu. Taruh `{{Q}}` di posisi parameter teks — apapun nama parameternya (`text=`, `q=`, `prompt=`, `query=`, dst), tinggal isi dengan `{{Q}}`.
   ```js
   url: "https://api.exel.dev/ai/chatgpt?text={{Q}}"
   url: "https://api.lain.com/ai/gpt?q={{Q}}&apikey=ABC123"
   ```
2. Kalau API butuh `method: "post"`, isi `bodyTemplate`, contoh:
   ```js
   bodyTemplate: { message: "{{Q}}", model: "gpt-4o" }
   ```
3. `responsePath` menunjuk ke lokasi teks jawaban di JSON respons API. Contoh respons API:
   ```json
   { "status": true, "result": { "answer": "Halo!" } }
   ```
   maka `responsePath: "result.answer"`.
   
   **Tidak perlu khawatir salah** — sistem (`lib/fetchEngine.js`) punya **auto-detect fallback**: kalau `responsePath` yang dikonfigurasi tidak ketemu, sistem otomatis mencari field umum seperti `message`, `result`, `answer`, `text`, `data`, dll, supaya chat tidak pernah blank karena salah path.
4. Untuk endpoint **image**, jika API membalas file gambar langsung (bukan JSON), set `responsePath: "BINARY"`.

### Mengganti User Agent
Default ada di `DEFAULT_USER_AGENT` (atas file `configapi.js`). Bisa juga di-override per-endpoint dengan field `userAgent` di masing-masing objek.

## 🗄️ Setup Database (Supabase PostgreSQL)

1. Buat project baru di [supabase.com](https://supabase.com) (gratis).
2. Buka **Project Settings → Database → Connection string**, pilih mode **Transaction** (pakai pgbouncer port `6543`, cocok untuk serverless/Vercel).
3. Salin connection string, isi password aslinya, lalu masukkan ke `.env` sebagai `DATABASE_URL`.
4. **Tidak perlu** menjalankan SQL manual — tabel `users`, `conversations`, `messages` otomatis dibuat saat aplikasi pertama kali dijalankan (lihat `lib/db.js → ensureSchema()`). Tapi kalau mau setup manual, jalankan isi `database/schema.sql` di Supabase SQL Editor.

## 🚀 Cara Menjalankan (Lokal / VPS / Termux)

```bash
# 1. Install dependency
npm install

# 2. Salin file environment
cp .env.example .env
# lalu edit .env: isi DATABASE_URL dan JWT_SECRET

# 3. Jalankan
npm start
# atau untuk development dengan auto-reload:
npm run dev
```

Buka `http://localhost:3000`.

### Khusus Termux (Android)
```bash
pkg install nodejs
npm install
cp .env.example .env
nano .env   # isi DATABASE_URL & JWT_SECRET
npm start
```

## ☁️ Cara Deploy ke Vercel

1. Push project ini ke GitHub repository.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo tersebut.
3. Di tahap **Environment Variables**, tambahkan:
   - `DATABASE_URL` → connection string Supabase kamu
   - `JWT_SECRET` → string rahasia acak (generate dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
4. Klik **Deploy**. Vercel otomatis mendeteksi folder `api/` sebagai serverless functions berkat `vercel.json`.
5. Selesai — aplikasi langsung bisa diakses di domain `*.vercel.app` yang diberikan.

> Project ini **tidak butuh build step** (`vercel-build` hanya placeholder), karena frontend murni HTML/CSS/JS statis dan backend berupa serverless functions.

## 🔒 Catatan Keamanan

- **WAJIB ganti `JWT_SECRET`** sebelum deploy ke production — jangan pakai nilai default di `.env.example`.
- Password user di-hash dengan **bcrypt** (10 rounds), tidak pernah disimpan plain text.
- Token sesi disimpan sebagai JWT (7 hari) di `localStorage` + cookie httpOnly.

## 🧩 Troubleshooting

| Masalah | Solusi |
|---|---|
| Chat menjawab "server tidak merespons" | Endpoint di `configapi.js` mungkin sudah mati/berubah. Cek status di Server Monitor sidebar, ganti `url` endpoint yang bersangkutan. |
| Login gagal terus | Pastikan `DATABASE_URL` benar dan Supabase project aktif (tidak di-pause). |
| Riwayat chat tidak tersimpan | Riwayat hanya tersimpan untuk user yang **sudah login**. Tamu (skip login) tidak punya riwayat persisten. |
| Server Monitor semua merah | Cek koneksi internet server / apakah domain endpoint AI kamu masih aktif. |

---

Dibuat dengan ❤️ — edit bebas sesuai kebutuhanmu. Semua endpoint AI di `configapi.js` adalah **contoh/placeholder**, ganti dengan endpoint API pilihanmu sendiri.
