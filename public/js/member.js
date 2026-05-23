const memberTokenKey = 'imbaworld_member_token';
let memberToken = localStorage.getItem(memberTokenKey);
let currentPlayer = null;
let currentGameToken = null;
let lastScore = { saved: 0, missed: 0 };

const $ = (sel) => document.querySelector(sel);
const rupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(num || 0));

function showToast(message, type = 'info') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'error' ? 'rgba(255, 77, 103, .55)' : 'rgba(255, 214, 107, .45)';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

function setMemberToken(token) {
  memberToken = token;
  localStorage.setItem(memberTokenKey, token);
}

function clearMemberToken() {
  memberToken = null;
  localStorage.removeItem(memberTokenKey);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (memberToken) headers.Authorization = `Bearer ${memberToken}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request gagal.');
  return data;
}

function showOnly(id) {
  ['memberLogin', 'preGame', 'gameStage', 'resultBox'].forEach(sectionId => {
    document.getElementById(sectionId).classList.toggle('hidden', sectionId !== id);
  });
}

function fillPlayer(player) {
  currentPlayer = player;
  $('#playerName').textContent = player.playerName || 'Player';
  $('#playerMeta').textContent = `${player.imbaslotUsername || '-'} • ${player.telegram || '-'} • Kode ${player.code || '-'}`;
}

function rewardInfo(saved) {
  if (saved > 60) return { reward: 20000, goalText: 'Target terlampaui! Kamu masuk hadiah Rp20.000.' };
  if (saved >= 60) return { reward: 15000, goalText: 'Target 60 tercapai! Kamu mengunci hadiah Rp15.000.' };
  const left = Math.max(0, 60 - saved);
  return { reward: 0, goalText: `Kurang ${left} tepis lagi untuk membuka hadiah Rp15.000.` };
}

function updateProgress(saved, remaining) {
  const safeSaved = Number(saved || 0);
  const percent = Math.max(0, Math.min(100, (safeSaved / 60) * 100));
  const info = rewardInfo(safeSaved);
  const timeText = Math.max(0, Math.ceil(remaining || 0));
  $('#targetBar').style.width = `${percent}%`;
  $('#progressText').textContent = `${safeSaved} / 60`;
  $('#rewardPreview').textContent = info.reward > 0 ? rupiah(info.reward) : 'Rp0';
  $('#goalPreview').textContent = `${info.goalText} • Sisa waktu ${timeText} detik`;
}

$('#memberLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try {
    const data = await api('/api/member/login', {
      method: 'POST',
      body: JSON.stringify({ code: form.get('code'), password: form.get('password') })
    });
    setMemberToken(data.token);
    fillPlayer(data.player);
    showToast('Login berhasil. Kode sekarang terkunci untuk sesi ini.');
    showOnly('preGame');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

$('#startGameBtn').addEventListener('click', async () => {
  if (!confirm('Mulai sekarang? Setelah game dimulai, voucher ini akan dihitung sebagai 1x pemakaian.')) return;
  try {
    const data = await api('/api/member/start-game', { method: 'POST', body: JSON.stringify({}) });
    currentGameToken = data.gameToken;
    showOnly('gameStage');
    updateProgress(0, 60);
    startCanvasGame();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function startCanvasGame() {
  const canvas = $('#gameCanvas');
  const game = new window.ImbaKeeperGame({
    canvas,
    duration: 60,
    onTick: ({ remaining, saved, missed }) => {
      lastScore = { saved, missed };
      $('#timeLeft').textContent = Math.ceil(remaining);
      $('#savedCount').textContent = saved;
      $('#missedCount').textContent = missed;
      updateProgress(saved, remaining);
    },
    onFinish: async ({ saved, missed }) => {
      lastScore = { saved, missed };
      $('#timeLeft').textContent = 0;
      $('#savedCount').textContent = saved;
      $('#missedCount').textContent = missed;
      updateProgress(saved, 0);
      await submitScore(saved, missed);
    }
  });
  game.start();
}

async function submitScore(saved, missed) {
  try {
    const data = await api('/api/member/submit-score', {
      method: 'POST',
      body: JSON.stringify({ gameToken: currentGameToken, saved, missed, score: saved })
    });
    clearMemberToken();
    renderResult(data.result);
  } catch (err) {
    showToast(err.message, 'error');
    renderLocalResult(saved, missed, err.message);
  }
}

function statusTitle(result) {
  if (result.status === 'SUPER_WIN') return 'MENANG BESAR: FREEBET 20RB';
  if (result.status === 'WIN') return 'MENANG: FREEBET 15RB';
  return 'BELUM BERHASIL';
}

function applyResultState(mode) {
  const box = $('#resultBox');
  box.classList.remove('result-win', 'result-lose');
  if (mode === 'win') box.classList.add('result-win');
  if (mode === 'lose') box.classList.add('result-lose');
}

function renderResult(result) {
  $('#finalSaved').textContent = result.saved;
  $('#finalMissed').textContent = result.missed;
  $('#finalReward').textContent = rupiah(result.reward);
  $('#resultTitle').textContent = statusTitle(result);

  if (result.reward >= 20000) {
    $('#resultBadge').textContent = 'SUPER WIN';
    applyResultState('win');
  } else if (result.reward >= 15000) {
    $('#resultBadge').textContent = 'WINNER';
    applyResultState('win');
  } else {
    $('#resultBadge').textContent = 'TRY AGAIN';
    applyResultState('lose');
  }

  $('#resultNote').textContent = result.reward > 0
    ? 'Screenshot halaman ini dan kirim ke ADMIN IMBASLOT untuk klaim freebet.'
    : 'Belum mencapai 60 tepisan. Screenshot tetap boleh dikirim sebagai bukti selesai bermain.';

  const summary = [
    'HASIL IMBAWORLD CUP',
    `Nama: ${result.playerName}`,
    `Akun IMBASLOT: ${result.imbaslotUsername}`,
    `Telegram: ${result.telegram}`,
    `Kode: ${result.code}`,
    `Tepis: ${result.saved}`,
    `Bola Masuk: ${result.missed}`,
    `Durasi: ${result.duration} detik`,
    `Status: ${statusTitle(result)}`,
    `Hadiah: ${rupiah(result.reward)}`,
    'Mohon dicek ADMIN IMBASLOT.'
  ].join('\n');
  $('#copyResult').value = summary;
  showOnly('resultBox');
}

function renderLocalResult(saved, missed, errorText) {
  $('#finalSaved').textContent = saved;
  $('#finalMissed').textContent = missed;
  $('#finalReward').textContent = 'Pending';
  $('#resultTitle').textContent = 'Score Lokal Belum Tersimpan';
  $('#resultBadge').textContent = 'PENDING';
  applyResultState('lose');
  $('#resultNote').textContent = `Score lokal tampil, tapi server menolak/terputus: ${errorText}. Screenshot halaman ini dan hubungi admin.`;
  $('#copyResult').value = `HASIL LOKAL IMBAWORLD CUP\nTepis: ${saved}\nBola Masuk: ${missed}\nCatatan: ${errorText}`;
  showOnly('resultBox');
}

$('#copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#copyResult').value);
    showToast('Ringkasan hasil berhasil disalin.');
  } catch (err) {
    showToast('Browser tidak mengizinkan copy otomatis. Salin manual dari kotak teks.', 'error');
  }
});

async function restoreSession() {
  if (!memberToken) return;
  try {
    const data = await api('/api/member/me');
    fillPlayer(data.player);
    if (data.player.status === 'LOGIN_USED') {
      showOnly('preGame');
    } else if (data.player.status === 'FINISHED' && data.player.result) {
      renderResult(data.player.result);
    } else {
      showOnly('memberLogin');
    }
  } catch (err) {
    clearMemberToken();
  }
}
restoreSession();
