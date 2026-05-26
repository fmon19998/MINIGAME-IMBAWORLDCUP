# Deploy IMBAWORLD CUP Mini Game ke Render

## Kenapa tidak pakai GitHub Pages?
Project ini memakai Node.js + Express (`server.js`). GitHub Pages hanya cocok untuk static HTML/CSS/JS, jadi backend login, voucher, dan database tidak akan jalan di GitHub Pages.

## Cara deploy

### 1. Upload ke GitHub
Pastikan yang diupload adalah isi folder project ini, dan file ini ada di root repo:

- `server.js`
- `package.json`
- `public/`
- `data/`
- `.gitignore`

Jangan upload:

- `.env`
- `node_modules/`

### 2. Buat Web Service di Render
Di Render:

1. Klik **New +**
2. Pilih **Web Service**
3. Connect repo GitHub project ini
4. Setting:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Kalau `server.js` dan `package.json` ada di dalam folder, isi **Root Directory** sesuai nama folder tersebut. Kalau sudah ada di root repo, kosongkan Root Directory.

### 3. Isi Environment Variables di Render
Isi manual di Render, jangan simpan secret di GitHub:

```txt
NODE_ENV=production
ADMIN_USER=adminimbaworld
ADMIN_PASS=password-admin-yang-kuat
ADMIN_PANEL_KEY=key-admin-rahasia
APP_SECRET=secret-panjang-random-banget
DATA_PATH=/opt/render/project/src/data/db.json
```

Untuk Render Free, `DATA_PATH=/opt/render/project/src/data/db.json` bisa dipakai untuk test. Data bisa hilang saat service redeploy/restart karena filesystem Render Free tidak persistent.

Untuk pemakaian serius, pakai Render paid + Persistent Disk lalu set:

```txt
DATA_PATH=/var/data/db.json
```

### 4. Link setelah online
Misalnya Render memberi link:

```txt
https://imbaworld-cup-minigame.onrender.com
```

Player:

```txt
https://imbaworld-cup-minigame.onrender.com/member
```

Admin:

```txt
https://imbaworld-cup-minigame.onrender.com/admin
```

Admin masuk dengan `ADMIN_PANEL_KEY`, lalu login dengan `ADMIN_USER` dan `ADMIN_PASS`.

## Health check
Cek server hidup:

```txt
https://domain-render-lu.onrender.com/health
```

## Catatan database
Versi ini masih pakai file JSON. Untuk skala besar dan pemakaian panjang, upgrade berikutnya sebaiknya migrasi ke PostgreSQL atau MongoDB.
