# IMBAWORLD CUP V3.1 Admin Gate Fix

## File yang di-update

- `server.js`
- `public/admin-gate.html` (file baru)
- `public/js/admin-gate.js` (file baru)
- `public/css/style.css`
- `.env.example`
- `README.md`
- `UPGRADE_V3_1_NOTES.md` (file baru)

## Fitur yang diperbaiki

1. `/admin` sekarang bisa dibuka oleh admin sebagai halaman gate.
2. Admin tinggal memasukkan access key untuk lanjut ke dashboard.
3. `/admin.html` tetap diblokir agar member tidak bisa membuka form login dashboard langsung.
4. Console terminal sekarang menampilkan link admin yang benar:
   - `http://localhost:3000/admin`
   - `http://localhost:3000/admin?key=IMBA-ADMIN-2026`
5. `.env` sekarang dibaca langsung oleh server tanpa perlu install package tambahan.

## Cara buka admin

Buka:

```txt
http://localhost:3000/admin
```

Masukkan key default:

```txt
IMBA-ADMIN-2026
```

Lalu login admin:

```txt
Username: admin
Password: imbaworld2026
```
