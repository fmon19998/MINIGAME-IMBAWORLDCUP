const memberTokenKey = 'imbaworld_member_token';
let memberToken = localStorage.getItem(memberTokenKey);
let currentPlayer = null;
let currentGameToken = null;
let currentGameConfig = {};
let lastScore = { saved: 0, missed: 0, score: 0, combo: 0, stamina: 100 };

const $ = (sel) => document.querySelector(sel);
const rupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(num || 0));

const zoomStorageKey = 'imbaworld_game_zoom';

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function applyGameZoom(level) {
  const safeLevel = clamp(Number(level || 1), 0.7, 1.5);
  const frame = $('#zoomableFrame');
  const slider = $('#zoomSlider');
  const text = $('#zoomLevelText');
  if (!frame || !slider || !text) return;
  frame.style.setProperty('--canvas-zoom', safeLevel.toFixed(2));
  slider.value = String(Math.round(safeLevel * 100));
  text.textContent = `${Math.round(safeLevel * 100)}%`;
  localStorage.setItem(zoomStorageKey, String(safeLevel));
}

function getRecommendedZoom() {
  const isTouch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  const isLandscape = window.innerWidth > window.innerHeight;
  if (!isTouch) return 1;
  if (isLandscape) return 1;
  if (window.innerWidth <= 390) return 0.75;
  return 0.82;
}

function updateDeviceClasses() {
  const isTouch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  const isLandscape = window.innerWidth > window.innerHeight;
  document.body.classList.toggle('is-touch-device', isTouch);
  document.body.classList.toggle('mobile-landscape-game', isTouch && isLandscape && window.innerHeight <= 520);
}

async function toggleGameFullscreen() {
  const stage = $('#gameStage');
  const fullscreenBtn = $('#fullscreenBtn');
  try {
    if (!document.fullscreenElement && stage && stage.requestFullscreen) {
      await stage.requestFullscreen();
      document.body.classList.add('game-fullscreen-active');
      if (fullscreenBtn) fullscreenBtn.textContent = 'EXIT FULL';
    } else if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      document.body.classList.remove('game-fullscreen-active');
      if (fullscreenBtn) fullscreenBtn.textContent = 'FULLSCREEN';
    } else {
      document.body.classList.toggle('game-fullscreen-active');
      if (fullscreenBtn) fullscreenBtn.textContent = document.body.classList.contains('game-fullscreen-active') ? 'EXIT FULL' : 'FULLSCREEN';
    }
  } catch (err) {
    document.body.classList.toggle('game-fullscreen-active');
    if (fullscreenBtn) fullscreenBtn.textContent = document.body.classList.contains('game-fullscreen-active') ? 'EXIT FULL' : 'FULLSCREEN';
  }
  setTimeout(() => applyGameZoom(Number($('#zoomSlider')?.value || 100) / 100), 120);
}

function setupZoomControls() {
  const frame = $('#zoomableFrame');
  const slider = $('#zoomSlider');
  const outBtn = $('#zoomOutBtn');
  const inBtn = $('#zoomInBtn');
  const resetBtn = $('#zoomResetBtn');
  const fitBtn = $('#fitScreenBtn');
  const fullscreenBtn = $('#fullscreenBtn');
  if (!frame || !slider || !outBtn || !inBtn || !resetBtn) return;

  updateDeviceClasses();
  const saved = Number(localStorage.getItem(zoomStorageKey) || getRecommendedZoom());
  applyGameZoom(saved);

  slider.addEventListener('input', (e) => applyGameZoom(Number(e.target.value) / 100));
  outBtn.addEventListener('click', () => applyGameZoom((Number(slider.value) - 10) / 100));
  inBtn.addEventListener('click', () => applyGameZoom((Number(slider.value) + 10) / 100));
  resetBtn.addEventListener('click', () => applyGameZoom(1));
  if (fitBtn) fitBtn.addEventListener('click', () => applyGameZoom(getRecommendedZoom()));
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleGameFullscreen);

  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    document.body.classList.toggle('game-fullscreen-active', active);
    if (fullscreenBtn) fullscreenBtn.textContent = active ? 'EXIT FULL' : 'FULLSCREEN';
  });

  window.addEventListener('resize', () => {
    updateDeviceClasses();
    if (!localStorage.getItem(zoomStorageKey)) applyGameZoom(getRecommendedZoom());
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateDeviceClasses();
      applyGameZoom(getRecommendedZoom());
    }, 250);
  });

  window.addEventListener('keydown', (e) => {
    if ($('#gameStage').classList.contains('hidden')) return;
    if (e.key === '+' || e.key === '=') applyGameZoom((Number(slider.value) + 10) / 100);
    if (e.key === '-') applyGameZoom((Number(slider.value) - 10) / 100);
    if (e.key === '0') applyGameZoom(1);
    if (e.key.toLowerCase() === 'f') toggleGameFullscreen();
  });
}
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

function updateProgress(saved, remaining, stats = {}) {
  const safeSaved = Number(saved || 0);
  const percent = Math.max(0, Math.min(100, (safeSaved / 60) * 100));
  const info = rewardInfo(safeSaved);
  const timeText = Math.max(0, Math.ceil(remaining || 0));
  $('#targetBar').style.width = `${percent}%`;
  $('#targetCaught').textContent = `${safeSaved} / 60`;
  $('#rewardPreview').textContent = info.reward > 0 ? rupiah(info.reward) : 'Rp0';
  $('#goalPreview').textContent = `${info.goalText} • Sisa waktu ${timeText} detik`;

  $('#scoreCount').textContent = String(Number(stats.score || 0));
  $('#comboCount').textContent = `x${Number(stats.combo || 0)}`;
  $('#staminaText').textContent = `${Math.round(Number(stats.stamina || 100))}%`;
  $('#staminaBar').style.width = `${Math.max(0, Math.min(100, Number(stats.stamina || 100)))}%`;

  const modeLabel = $('#modeLabel');
  const dangerText = $('#dangerText');
  if (modeLabel) {
    if (timeText <= 12 || safeSaved >= 45) modeLabel.textContent = 'ARENA PANAS';
    else if (timeText <= 25 || safeSaved >= 25) modeLabel.textContent = 'FOKUS TINGGI';
    else modeLabel.textContent = 'EVENT RAHASIA';
  }
  if (dangerText) {
    if ((stats.combo || 0) >= 5) dangerText.textContent = 'COMBO PANAS! TERUSKAN!';
    else if (stats.missed > 0) dangerText.textContent = 'JANGAN LEPAS SATU BOLA PUN!';
    else dangerText.textContent = 'BOLA DATANG DARI DEPAN!';
  }
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
    currentGameConfig = data.gameConfig || {};
    showOnly('gameStage');
    document.body.classList.add('playing-game');
    updateDeviceClasses();
    applyGameZoom(getRecommendedZoom());
    updateProgress(0, 60);
    setTimeout(() => $('#gameStage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
    gameConfig: currentGameConfig,
    onTick: ({ remaining, saved, missed, score, combo, stamina }) => {
      lastScore = { saved, missed, score, combo, stamina };
      $('#timeLeft').textContent = String(Math.ceil(remaining)).padStart(2, '0');
      $('#savedCount').textContent = saved;
      $('#missedCount').textContent = missed;
      updateProgress(saved, remaining, { score, combo, stamina, missed });
    },
    onFinish: async ({ saved, missed, score, combo, stamina }) => {
      lastScore = { saved, missed, score, combo, stamina };
      $('#timeLeft').textContent = '00';
      $('#savedCount').textContent = saved;
      $('#missedCount').textContent = missed;
      updateProgress(saved, 0, { score, combo, stamina, missed });
      await submitScore(saved, missed);
    }
  });
  game.start();
}

async function submitScore(saved, missed) {
  try {
    const data = await api('/api/member/submit-score', {
      method: 'POST',
      body: JSON.stringify({ gameToken: currentGameToken, saved, missed, score: Number(lastScore.score || saved) })
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
    `Skor Arena: ${Number(lastScore.score || 0)}`,
    `Combo Tertinggi Sesi: x${Number(lastScore.combo || 0)}`,
    `Durasi: ${result.duration} detik`,
    `Status: ${statusTitle(result)}`,
    `Hadiah: ${rupiah(result.reward)}`,
    'Mohon dicek ADMIN IMBASLOT.'
  ].join('\n');
  $('#copyResult').value = summary;
  document.body.classList.remove('playing-game', 'game-fullscreen-active');
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
  document.body.classList.remove('playing-game', 'game-fullscreen-active');
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
setupZoomControls();
restoreSession();
