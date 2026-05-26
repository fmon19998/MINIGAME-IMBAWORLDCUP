# IMBAWORLD CUP - Upgrade V7 Deploy Ready

## File yang di-update
- `server.js`
- `README.md`
- `data/db.json`

## File baru yang ditambahkan
- `.gitignore`
- `.env.production.example`
- `render.yaml`
- `DEPLOY_RENDER_GUIDE.md`
- `UPGRADE_V7_NOTES.md`

## Fitur yang di-upgrade
1. Project dibuat lebih siap upload ke GitHub.
2. `.env` dan `node_modules` dicegah ikut ke GitHub lewat `.gitignore`.
3. Ditambahkan konfigurasi `render.yaml` untuk deploy ke Render.
4. Ditambahkan endpoint `/healthz` untuk health check hosting.
5. `server.js` support `DATA_DIR` dan `DATA_PATH` dari environment variable.
6. `data/db.json` dikosongkan agar data lokal/player sebelumnya tidak ikut terupload.
7. Panduan deploy Render ditambahkan di `DEPLOY_RENDER_GUIDE.md`.

## Yang tidak diubah
- Tampilan game V6 tetap dipertahankan.
- Admin dashboard tetap dipertahankan.
- Sistem voucher tetap sama.
- Sistem admin gate tetap sama.
