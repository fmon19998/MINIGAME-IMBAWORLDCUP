# Deploy IMBAWORLD CUP ke Render

## 1. Upload project ke GitHub

Upload **isi folder `imbaworld-cup-minigame`** ke repository GitHub.
Pastikan file ini ada di root repository:

```txt
package.json
server.js
public/
data/
.gitignore
render.yaml
```

Jangan upload file `.env`.

## 2. Buat Web Service di Render

Di Render:

```txt
New + → Web Service → Connect GitHub Repo
```

Setting:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /healthz
```

Kalau `package.json` ada langsung di root repo, **Root Directory dikosongkan**.
Kalau project masih berada di subfolder, isi Root Directory dengan nama folder itu.

## 3. Environment Variables di Render

Isi di Render, bukan di GitHub:

```txt
ADMIN_USER=adminimba
ADMIN_PASS=password-admin-yang-kuat
ADMIN_PANEL_KEY=key-admin-rahasia
APP_SECRET=secret-random-panjang-minimal-32-karakter
DATA_DIR=/var/data
NODE_ENV=production
```

## 4. Link setelah deploy

Player:

```txt
https://NAMA-SERVICE.onrender.com/member
```

Admin:

```txt
https://NAMA-SERVICE.onrender.com/admin
```

Masukkan `ADMIN_PANEL_KEY`, lalu login dengan `ADMIN_USER` dan `ADMIN_PASS`.

## 5. Catatan database

Versi ini masih memakai `db.json`. Untuk test online aman.
Untuk pemakaian serius jangka panjang, gunakan persistent disk Render atau pindah ke database PostgreSQL/MongoDB.

`DATA_DIR=/var/data` sudah disiapkan agar nanti mudah dipakai dengan persistent disk.
