# IMBAWORLD CUP - Upgrade V9 Notes

## File yang di-update
- `server.js`
- `public/admin.html`
- `public/js/admin.js`
- `public/css/style.css`
- `README.md`
- `UPGRADE_V9_NOTES.md`

## Fitur yang di-upgrade
1. Admin sekarang bisa memilih mode game langsung saat membuat akun/voucher player.
2. Mode yang tersedia:
   - `MODE BAYI (SANGAT MUDAH)`
   - `MODE B AJA (NORMAL)`
   - `MODE NERAKA (SUSAH BANGET)`
3. Mode disimpan di voucher dari awal, bukan dipilih random saat player mulai game.
4. Player tetap tidak melihat nama mode di halaman member atau hasil akhir.
5. Dashboard admin menampilkan mode di tabel voucher dan tabel hasil game.
6. Reset voucher tidak menghapus mode yang sudah dipilih admin.
7. Copy kode/password untuk player tetap tidak mencantumkan mode.

## Catatan penting
Mode tetap mempengaruhi gameplay lewat konfigurasi game yang dikirim ke browser, tetapi nama mode tidak ditampilkan ke player di UI.
