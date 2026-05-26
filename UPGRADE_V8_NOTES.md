# IMBAWORLD CUP - Upgrade V8 Notes

## File yang di-update
- `server.js`
- `public/member.html`
- `public/js/member.js`
- `public/js/game.js`
- `public/admin.html`
- `public/js/admin.js`

## Fitur yang di-upgrade
1. Ditambahkan 3 mode permainan tersembunyi:
   - MODE BAYI (SANGAT MUDAH)
   - MODE B AJA (NORMAL)
   - MODE NERAKA (SUSAH BANGET)
2. Mode dipilih otomatis secara acak saat player mulai game.
3. Player tidak melihat nama mode di tampilan game atau hasil akhir.
4. Admin bisa melihat mode yang didapat player di tabel hasil dashboard admin.
5. Parameter gameplay berbeda per mode:
   - spawn bola
   - kecepatan bola
   - lengkungan arah bola
   - ukuran bola
   - lebar kiper
   - peluang double spawn
   - drain stamina
   - multiplier skor
6. Anti-cheat score limit disesuaikan agar mode neraka yang lebih brutal tidak tertolak otomatis.
7. Tampilan label player diubah menjadi event/arena rahasia agar mode asli tidak bocor.

## Catatan
Mode tidak dipilih oleh admin atau player. Sistem otomatis memilih mode saat endpoint `/api/member/start-game` dipanggil.
