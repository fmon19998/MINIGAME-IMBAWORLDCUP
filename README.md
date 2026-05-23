# Catatan V3.1 Admin Gate Fix

Admin sekarang bisa dibuka dengan 2 cara:

1. Buka gate admin:

```txt
http://localhost:3000/admin
```

Lalu masukkan default key:

```txt
IMBA-ADMIN-2026
```

2. Atau buka direct admin link:

```txt
http://localhost:3000/admin?key=IMBA-ADMIN-2026
```

Direct file `http://localhost:3000/admin.html` tetap diblokir agar member tidak bisa membuka form login admin langsung.

---

# IMBAWORLD CUP Mini Game

Project ini berisi web minigame kiper 60 detik dengan dashboard admin dan web player/member yang saling terhubung.

## Fitur Utama

- Kode dan password player 1x pakai.
- Kode langsung terkunci setelah player login.
- Setelah game selesai, kode otomatis menjadi `FINISHED` dan tidak bisa digunakan lagi.
- Admin bisa membuat voucher gratis harian atau voucher deposit.
- Gratis dibatasi 1x per akun IMBASLOT per hari.
- Voucher deposit dibatasi maksimal 7x per akun IMBASLOT per hari.
- Game kiper 60 detik dengan bola cepat dan kontrol berat.
- Target hadiah:
  - Tepisan tepat 60 = Freebet Rp15.000
  - Tepisan lebih dari 60 = Freebet Rp20.000
- Hasil game langsung masuk ke dashboard admin.
- Player mendapat halaman hasil untuk screenshot dan dikirim ke ADMIN IMBASLOT.
- Dashboard admin dilindungi `ADMIN_PANEL_KEY`, jadi member tidak bisa membuka login admin dari link biasa.

## Cara Install di PC Lokal

Pastikan sudah install Node.js minimal versi 18.

```bash
cd imbaworld-cup-minigame
npm install
npm start
```

Buka di browser:

- Landing: `http://localhost:3000`
- Member Game: `http://localhost:3000/member`
- Admin Panel: `http://localhost:3000/admin?key=IMBA-ADMIN-2026`

> Catatan: `/admin` tanpa key dan `/admin.html` akan ditolak, jadi member tidak bisa melihat login dashboard admin.

## Login Admin Default

```txt
Username: admin
Password: imbaworld2026
Admin URL Key: IMBA-ADMIN-2026
```

Ganti username, password, admin key, dan secret sebelum dipakai online.

## Cara Ganti Password dan Link Admin

Windows PowerShell:

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASS="password-baru-kamu"
$env:ADMIN_PANEL_KEY="key-rahasia-baru"
$env:APP_SECRET="secret-panjang-random"
npm start
```

CMD:

```bat
set ADMIN_USER=admin
set ADMIN_PASS=password-baru-kamu
set ADMIN_PANEL_KEY=key-rahasia-baru
set APP_SECRET=secret-panjang-random
npm start
```

Contoh kalau key kamu diganti menjadi `RAHASIA-123`, maka link admin menjadi:

```txt
http://localhost:3000/admin?key=RAHASIA-123
```

## Alur Admin

1. Buka link admin khusus: `/admin?key=IMBA-ADMIN-2026` atau key yang sudah kamu ubah.
2. Login admin.
3. Isi nama player, username akun IMBASLOT, Telegram, jenis voucher, lalu centang bahwa player sudah `/start` di bot Telegram.
4. Klik **Generate Kode Player**.
5. Copy kode + password dan kirim ke player.
6. Setelah player selesai main, hasil akan muncul di tabel **Rekap Game**.

## Alur Player

1. Buka `/member`.
2. Login memakai kode dan password dari admin.
3. Klik mulai game.
4. Jadi kiper dan halangi bola selama 60 detik.
5. Setelah selesai, screenshot hasil dan kirim ke ADMIN IMBASLOT.

## File yang Di-upgrade di V3

- `server.js`
- `public/index.html`
- `public/admin.html`
- `public/member.html`
- `public/css/style.css`
- `public/js/admin.js`
- `.env.example`
- `README.md`

## Catatan Penting Sebelum Online

Project ini sudah cukup untuk demo/lokal. Kalau mau dipakai publik, sebaiknya ditambahkan:

- Database sungguhan seperti PostgreSQL/MySQL.
- HTTPS/SSL.
- Rate limit agar API tidak di-spam.
- Deployment di VPS/domain.
- Validasi anti-cheat yang lebih kuat di server.
