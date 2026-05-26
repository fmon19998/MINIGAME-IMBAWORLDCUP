# IMBAWORLD CUP - Upgrade V6 Notes

## File yang di-update
- `public/member.html`
- `public/css/style.css`
- `public/js/member.js`
- `public/js/game.js`

## Fitur yang di-upgrade
1. Gameplay disesuaikan agar lebih nyaman di PC, Android, dan iPhone.
2. Tambahan tombol `FIT` untuk auto-sesuaikan ukuran arena dengan device.
3. Tambahan tombol `FULLSCREEN` untuk mode layar penuh. Di iPhone Safari yang membatasi fullscreen, sistem tetap masuk soft-fullscreen fallback.
4. Deteksi otomatis touch device dan orientasi layar.
5. Mode landscape HP dibuat lebih compact agar arena tetap terasa seperti 1 layar game.
6. Mode portrait HP diberi layout yang lebih aman dan tombol kontrol lebih besar.
7. Kontrol touch diperbaiki: drag kiri-kanan lebih stabil, touch-action dimatikan agar layar tidak ikut scroll saat main.
8. Kiper sedikit diperlebar dan kontrol sedikit distabilkan khusus Android/iPhone agar tetap playable.
9. Difficulty HP disesuaikan sedikit tanpa mengubah konsep game super susah.
10. Shortcut PC tetap aktif: A/D atau Arrow Left/Right untuk kontrol, `+` zoom in, `-` zoom out, `0` reset zoom, `F` fullscreen.

## Catatan
- Sistem admin, voucher, login, submit score, dan backend tidak diubah.
- Upgrade ini fokus ke pengalaman main di berbagai device.
