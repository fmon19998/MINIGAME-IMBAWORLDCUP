const tokenKey = 'imbaworld_admin_token';
let dashboardData = { vouchers: [], results: [], stats: {} };
const adminPanelKey = new URLSearchParams(window.location.search).get('key') || '';

const $ = (sel) => document.querySelector(sel);
const rupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(num || 0));
const dateFmt = (iso) => iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function showToast(message, type = 'info') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'error' ? 'rgba(255, 77, 103, .55)' : 'rgba(255, 214, 107, .45)';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (adminPanelKey) headers['X-Admin-Panel-Key'] = adminPanelKey;
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request gagal.');
  return data;
}

function statusBadge(status) {
  const map = {
    READY: ['Siap Dipakai', 'status-ready'],
    LOGIN_USED: ['Login Terkunci', 'status-used'],
    PLAYING: ['Sedang Main', 'status-playing'],
    FINISHED: ['Selesai/Hangus', 'status-finished']
  };
  const [label, cls] = map[status] || [status, '']; 
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function modeBadge(label, key = '') {
  const cls = key === 'BABY' ? 'status-ready' : key === 'HELL' ? 'status-finished' : 'status-used';
  return `<span class="status-badge ${cls}">${label || 'MODE B AJA (NORMAL)'}</span>`;
}

function showDashboard(isLoggedIn) {
  $('#loginBox').classList.toggle('hidden', isLoggedIn);
  $('#dashboardBox').classList.toggle('hidden', !isLoggedIn);
}

function renderStats(stats) {
  const items = [
    ['🎟️', 'Total Voucher', stats.totalVouchers || 0],
    ['✅', 'Siap Dipakai', stats.ready || 0],
    ['🎮', 'Sedang Main', stats.playing || 0],
    ['🏁', 'Selesai', stats.finished || 0],
    ['📅', 'Hasil Hari Ini', stats.resultsToday || 0],
    ['🏆', 'Pemenang', stats.winners || 0],
    ['💰', 'Reward Hari Ini', rupiah(stats.totalRewardToday || 0)],
    ['📊', 'Total Reward', rupiah(stats.totalReward || 0)]
  ];
  $('#statGrid').innerHTML = items.map(([icon, label, value]) => `
    <div class="stat-card admin-stat-card"><i>${icon}</i><span>${label}</span><b>${value}</b></div>
  `).join('');
}

function resultText(v) {
  if (!v.result) return '-';
  return `${v.result.saved} tepis / ${rupiah(v.result.reward)}`;
}

function renderVouchers() {
  const q = ($('#voucherSearch').value || '').toLowerCase().trim();
  const rows = dashboardData.vouchers.filter(v => JSON.stringify(v).toLowerCase().includes(q));
  $('#voucherTable').innerHTML = rows.map(v => `
    <tr>
      <td>${dateFmt(v.createdAt)}</td>
      <td><b>${v.playerName}</b><br><span class="muted">${v.imbaslotUsername} • ${v.telegram}</span></td>
      <td><b>${v.code}</b></td>
      <td><b>${v.password}</b></td>
      <td>${v.voucherType === 'FREE' ? 'Gratis' : 'Deposit'}</td>
      <td>${modeBadge(v.gameModeLabel, v.gameModeKey)}</td>
      <td>${statusBadge(v.status)}</td>
      <td>${resultText(v)}</td>
      <td>
        <div class="table-actions">
          <button class="btn secondary" onclick="copyVoucher('${v.code}', '${v.password}')">Copy</button>
          <button class="btn secondary" onclick="resetVoucher('${v.id}')">Reset</button>
          <button class="btn danger" onclick="deleteVoucher('${v.id}')">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="9">Belum ada data voucher.</td></tr>';
}

function renderResults() {
  $('#resultTable').innerHTML = dashboardData.results.map(r => `
    <tr>
      <td>${dateFmt(r.createdAt)}</td>
      <td><b>${r.playerName}</b><br><span class="muted">${r.imbaslotUsername} • ${r.telegram}</span></td>
      <td>${r.code}</td>
      <td><b>${r.saved}</b></td>
      <td>${r.missed}</td>
      <td>${r.duration}s</td>
      <td>${modeBadge(r.gameModeLabel || 'Mode lama/tidak tercatat', r.gameModeKey)}</td>
      <td>${r.status === 'SUPER_WIN' ? 'MENANG 20RB' : 'KALAH'}</td>
      <td><b>${rupiah(r.reward)}</b></td>
    </tr>
  `).join('') || '<tr><td colspan="9">Belum ada hasil game.</td></tr>';
}

function renderAll() {
  renderStats(dashboardData.stats || {});
  renderVouchers();
  renderResults();
}

async function loadDashboard() {
  try {
    dashboardData = await api('/api/admin/dashboard');
    showDashboard(true);
    renderAll();
  } catch (err) {
    clearToken();
    showDashboard(false);
    showToast(err.message, 'error');
  }
}

async function copyVoucher(code, password) {
  const text = `IMBAWORLD CUP\nKode: ${code}\nPassword: ${password}\nLink main: ${location.origin}/member\n\nKode hanya bisa dipakai 1x. Setelah selesai game, screenshot hasil dan kirim ke ADMIN IMBASLOT.`;
  await navigator.clipboard.writeText(text);
  showToast('Kode dan password berhasil disalin.');
}
window.copyVoucher = copyVoucher;

async function resetVoucher(id) {
  if (!confirm('Reset voucher ini? Hasil sebelumnya akan dihapus.')) return;
  try {
    await api(`/api/admin/vouchers/${id}/reset`, { method: 'POST' });
    showToast('Voucher berhasil direset.');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.resetVoucher = resetVoucher;

async function deleteVoucher(id) {
  if (!confirm('Hapus voucher ini permanen?')) return;
  try {
    await api(`/api/admin/vouchers/${id}`, { method: 'DELETE' });
    showToast('Voucher berhasil dihapus.');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.deleteVoucher = deleteVoucher;

$('#adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try {
    const data = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
    });
    setToken(data.token);
    showToast('Login admin berhasil. Control center aktif.');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

$('#voucherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    playerName: form.get('playerName'),
    imbaslotUsername: form.get('imbaslotUsername'),
    telegram: form.get('telegram'),
    voucherType: form.get('voucherType'),
    gameModeKey: form.get('gameModeKey'),
    hasStartedBot: form.get('hasStartedBot') === 'on'
  };
  try {
    const data = await api('/api/admin/vouchers', { method: 'POST', body: JSON.stringify(payload) });
    const v = data.voucher;
    $('#newVoucherBox').classList.remove('hidden');
    $('#newVoucherBox').innerHTML = `
      <p class="eyebrow">KODE BERHASIL DIBUAT</p>
      <div class="big-code">${v.code}</div>
      <p>Password: <b>${v.password}</b></p>
      <p>Mode Admin: <b>${v.gameModeLabel || 'MODE B AJA (NORMAL)'}</b></p>
      <p class="muted small">Mode tidak ikut tercopy ke player.</p>
      <button class="btn secondary full" onclick="copyVoucher('${v.code}', '${v.password}')">Copy untuk Player</button>
    `;
    e.currentTarget.reset();
    showToast('Voucher player berhasil dibuat.');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

$('#voucherSearch').addEventListener('input', renderVouchers);
$('#refreshBtn').addEventListener('click', loadDashboard);
$('#logoutBtn').addEventListener('click', () => {
  clearToken();
  showDashboard(false);
  showToast('Logout berhasil.');
});

if (getToken()) loadDashboard();
