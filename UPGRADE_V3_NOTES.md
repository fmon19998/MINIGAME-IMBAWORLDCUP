# Upgrade V3 - Dashboard Admin + Member + Admin Gate

## File yang Di-update

1. `server.js`
   - Menambahkan `ADMIN_PANEL_KEY`.
   - `/admin` sekarang wajib memakai key: `/admin?key=IMBA-ADMIN-2026`.
   - `/admin.html` diblokir agar member tidak bisa membuka login admin langsung.
   - API login admin sekarang wajib membawa header key dari halaman admin.

2. `public/admin.html`
   - Dashboard admin diubah menjadi tampilan Control Center.
   - Sidebar admin dibuat lebih premium.
   - Form generate kode/password dibuat lebih rapi.
   - Area SOP admin ditambahkan.
   - Tabel monitor voucher dan rekap game dibuat lebih jelas.

3. `public/css/style.css`
   - Menambahkan style baru untuk dashboard admin V3.
   - Menambahkan style baru untuk member login card.
   - Menambahkan style access denied admin.
   - Menambahkan responsive mobile untuk admin dan member.

4. `public/js/admin.js`
   - Menambahkan pembacaan `key` dari URL admin.
   - Login admin mengirim `X-Admin-Panel-Key` ke server.
   - Stat card admin diberi ikon dan tampilan baru.

5. `public/index.html`
   - Tombol/link Admin Panel di landing page dihilangkan dari akses member.
   - Landing page diarahkan fokus ke Web Player.

6. `public/member.html`
   - Tampilan login member diperjelas.
   - Menambahkan info kode 1x pakai, target 60, dan wajib screenshot.
   - Member tidak diberi link akses ke dashboard admin.

7. `.env.example`
   - Menambahkan `ADMIN_PANEL_KEY`.

8. `README.md`
   - Dokumentasi admin URL khusus ditambahkan.
   - Cara ganti admin key, password, dan secret diperbarui.

## Link Penting

- Player: `http://localhost:3000/member`
- Admin: `http://localhost:3000/admin?key=IMBA-ADMIN-2026`

## Catatan

Sebelum online, ganti `ADMIN_PASS`, `ADMIN_PANEL_KEY`, dan `APP_SECRET`.
