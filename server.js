const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Loader .env ringan tanpa dependency tambahan.
// Jadi ADMIN_PANEL_KEY, ADMIN_USER, ADMIN_PASS, PORT bisa diganti lewat file .env.
const ENV_PATH = path.join(__dirname, '.env');
if (fs.existsSync(ENV_PATH)) {
  const envRaw = fs.readFileSync(ENV_PATH, 'utf8');
  envRaw.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) return;
    const [key, ...rest] = clean.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').trim().replace(/^['\"]|['\"]$/g, '');
  });
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'imbaworld2026';
const ADMIN_PANEL_KEY = process.env.ADMIN_PANEL_KEY || 'IMBA-ADMIN-2026';
const APP_SECRET = process.env.APP_SECRET || 'IMBAWORLD-CUP-LOCAL-SECRET-CHANGE-ME';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_PATH = process.env.DATA_PATH || path.join(DATA_DIR, 'db.json');
const PUBLIC_PATH = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));

function renderAdminBlockedPage(res) {
  return res.status(403).send(`<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Akses Admin Ditolak</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body class="member-page">
  <main class="member-shell">
    <section class="member-card login-member glow-card access-denied-card">
      <img src="/assets/logo.png" alt="IMBAWORLD CUP" class="login-logo" />
      <p class="eyebrow">ADMIN AREA TERKUNCI</p>
      <h1>Akses Dashboard Admin Ditolak</h1>
      <p class="muted">Halaman login admin hanya bisa dibuka lewat link khusus milik ADMIN IMBASLOT.</p>
      <div class="member-notes">
        <strong>Player:</strong> gunakan halaman player untuk login kode voucher dan bermain minigame.
      </div>
      <div class="hero-actions center-actions">
        <a class="btn primary" href="/member">Masuk Web Player</a>
        <a class="btn secondary" href="/">Kembali ke Landing</a>
      </div>
    </section>
  </main>
</body>
</html>`);
}

app.use((req, res, next) => {
  // Admin tidak dibuka langsung via /admin.html supaya member tidak bisa menemukan form login admin.
  if (req.path === '/admin.html') return renderAdminBlockedPage(res);

  // Kalau admin membuka /admin tanpa key, tampilkan halaman gate untuk memasukkan key.
  // Jadi admin tetap bisa masuk, tapi member tidak langsung melihat login dashboard.
  if (req.path === '/admin' && !req.query.key) {
    return res.sendFile(path.join(PUBLIC_PATH, 'admin-gate.html'));
  }

  // Kalau key salah, tolak.
  if (req.path === '/admin' && String(req.query.key || '') !== ADMIN_PANEL_KEY) {
    return renderAdminBlockedPage(res);
  }

  return next();
});

app.use(express.static(PUBLIC_PATH));

function nowIso() {
  return new Date().toISOString();
}

function readDb() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const db = JSON.parse(raw || '{}');
    db.vouchers ||= [];
    db.results ||= [];
    db.audit ||= [];
    return db;
  } catch (error) {
    return { vouchers: [], results: [], audit: [] };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function audit(action, detail = {}) {
  const db = readDb();
  db.audit.push({ id: crypto.randomUUID(), action, detail, createdAt: nowIso() });
  writeDb(db);
}

function safeUpper(input) {
  return String(input || '').trim().toUpperCase();
}

function safeText(input, max = 80) {
  return String(input || '').trim().replace(/[<>]/g, '').slice(0, max);
}

function randomCode(prefix = 'IMBA') {
  const body = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${body}`;
}

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 8; i += 1) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

const GAME_MODES = {
  BABY: {
    key: 'BABY',
    adminLabel: 'TIER MODE BAYI (SANGAT MUDAH)',
    weight: 34,
    config: {
      spawnMultiplier: 1.68,
      speedMultiplier: 0.62,
      curveMultiplier: 0.42,
      ballSizeBonus: 8,
      keeperWidthBonus: 64,
      doubleSpawnChance: 0.05,
      burstSpawnChance: 0,
      burstSpawnCount: 0,
      staminaDrainMultiplier: 0.55,
      scoreMultiplier: 0.85,
      controlResistance: 0.82,
      targetEdgeBias: 0,
      targetJitter: 0.55,
      chaosMultiplier: 0.62
    }
  },
  NORMAL: {
    key: 'NORMAL',
    adminLabel: 'TIER MODE B AJA (NORMAL)',
    weight: 33,
    config: {
      spawnMultiplier: 0.95,
      speedMultiplier: 1.05,
      curveMultiplier: 1,
      ballSizeBonus: 0,
      keeperWidthBonus: 0,
      doubleSpawnChance: 0.52,
      burstSpawnChance: 0.10,
      burstSpawnCount: 1,
      staminaDrainMultiplier: 1,
      scoreMultiplier: 1,
      controlResistance: 1,
      targetEdgeBias: 0.18,
      targetJitter: 1,
      chaosMultiplier: 1
    }
  },
  HELL: {
    key: 'HELL',
    adminLabel: 'TIER MODE NERAKA (CEPAT & BERKELOK)',
    weight: 33,
    config: {
      spawnMultiplier: 0.88,
      speedMultiplier: 2.85,
      curveMultiplier: 3.65,
      ballSizeBonus: -8,
      keeperWidthBonus: -82,
      doubleSpawnChance: 0.18,
      burstSpawnChance: 0,
      burstSpawnCount: 0,
      staminaDrainMultiplier: 2.55,
      scoreMultiplier: 1.45,
      controlResistance: 2.20,
      targetEdgeBias: 0.86,
      targetJitter: 2.35,
      chaosMultiplier: 3.10
    }
  }
};

function pickHiddenGameMode() {
  const modes = Object.values(GAME_MODES);
  const total = modes.reduce((sum, mode) => sum + Number(mode.weight || 1), 0);
  let roll = Math.random() * total;
  for (const mode of modes) {
    roll -= Number(mode.weight || 1);
    if (roll <= 0) return mode;
  }
  return GAME_MODES.NORMAL;
}

function getGameMode(modeKey) {
  const key = safeUpper(modeKey || 'NORMAL');
  return GAME_MODES[key] || GAME_MODES.NORMAL;
}

function publicGameConfig(mode) {
  return { ...(mode?.config || GAME_MODES.NORMAL.config) };
}

function memberResultPublic(result) {
  if (!result) return null;
  const { gameModeLabel, gameModeKey, gameConfig, ...safeResult } = result;
  return safeResult;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', APP_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', APP_SECRET).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function authHeader(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

function requireAdmin(req, res, next) {
  try {
    const payload = verifyToken(authHeader(req));
    if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'Sesi admin tidak valid. Silakan login ulang.' });
    req.admin = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token admin rusak.' });
  }
}

function requireMember(req, res, next) {
  try {
    const payload = verifyToken(authHeader(req));
    if (!payload || payload.role !== 'member') return res.status(401).json({ error: 'Sesi player tidak valid. Silakan login ulang.' });
    req.member = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token player rusak.' });
  }
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function summarize(db) {
  const today = todayKey();
  const vouchersToday = db.vouchers.filter(v => String(v.createdAt || '').slice(0, 10) === today);
  const resultsToday = db.results.filter(r => String(r.createdAt || '').slice(0, 10) === today);
  const totalRewardToday = resultsToday.reduce((sum, r) => sum + Number(r.reward || 0), 0);
  return {
    totalVouchers: db.vouchers.length,
    ready: db.vouchers.filter(v => v.status === 'READY').length,
    loginUsed: db.vouchers.filter(v => v.status === 'LOGIN_USED').length,
    playing: db.vouchers.filter(v => v.status === 'PLAYING').length,
    finished: db.vouchers.filter(v => v.status === 'FINISHED').length,
    totalResults: db.results.length,
    winners: db.results.filter(r => r.reward > 0).length,
    totalReward: db.results.reduce((sum, r) => sum + Number(r.reward || 0), 0),
    vouchersToday: vouchersToday.length,
    resultsToday: resultsToday.length,
    totalRewardToday
  };
}

function voucherPublic(v) {
  return {
    id: v.id,
    code: v.code,
    password: v.password,
    playerName: v.playerName,
    imbaslotUsername: v.imbaslotUsername,
    telegram: v.telegram,
    voucherType: v.voucherType,
    hasStartedBot: v.hasStartedBot,
    status: v.status,
    createdAt: v.createdAt,
    loginAt: v.loginAt || null,
    gameStartedAt: v.gameStartedAt || null,
    gameEndedAt: v.gameEndedAt || null,
    result: memberResultPublic(v.result) || null
  };
}

function adminVoucherPublic(v) {
  const mode = getGameMode(v.gameModeKey || 'NORMAL');
  return {
    ...voucherPublic(v),
    gameModeKey: v.gameModeKey || mode.key,
    gameModeLabel: v.gameModeLabel || mode.adminLabel,
    result: v.result || null
  };
}

app.get('/healthz', (req, res) => res.json({ ok: true, app: 'IMBAWORLD CUP', time: nowIso() }));

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_PATH, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_PATH, 'admin.html')));
app.get('/member', (req, res) => res.sendFile(path.join(PUBLIC_PATH, 'member.html')));

app.post('/api/admin/login', (req, res) => {
  if (String(req.headers['x-admin-panel-key'] || '') !== ADMIN_PANEL_KEY) {
    return res.status(403).json({ error: 'Akses login admin ditolak. Buka dashboard lewat link admin khusus.' });
  }
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Username atau password admin salah.' });
  }
  const token = signToken({ role: 'admin', username, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 12 });
  return res.json({ token, admin: { username } });
});

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const db = readDb();
  const vouchers = db.vouchers.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(adminVoucherPublic);
  const results = db.results.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ stats: summarize(db), vouchers, results });
});

app.post('/api/admin/vouchers', requireAdmin, (req, res) => {
  const db = readDb();
  const playerName = safeText(req.body.playerName, 80);
  const imbaslotUsername = safeText(req.body.imbaslotUsername, 40);
  const telegram = safeText(req.body.telegram, 60);
  const voucherType = ['FREE', 'DEPOSIT'].includes(req.body.voucherType) ? req.body.voucherType : 'FREE';
  const requestedGameModeKey = safeUpper(req.body.gameModeKey || 'NORMAL');
  const selectedGameMode = GAME_MODES[requestedGameModeKey];
  const hasStartedBot = Boolean(req.body.hasStartedBot);

  if (!playerName) return res.status(400).json({ error: 'Nama player wajib diisi.' });
  if (!imbaslotUsername) return res.status(400).json({ error: 'Username akun IMBASLOT wajib diisi agar limit harian bisa dicek.' });
  if (!telegram) return res.status(400).json({ error: 'Telegram player wajib diisi.' });
  if (!selectedGameMode) return res.status(400).json({ error: 'Mode game tidak valid. Pilih Mode Bayi, B Aja, atau Neraka.' });
  if (!hasStartedBot) return res.status(400).json({ error: 'Player harus /start di bot Telegram admin terlebih dahulu.' });

  const today = todayKey();
  const sameAccountToday = db.vouchers.filter(v =>
    String(v.imbaslotUsername || '').toLowerCase() === imbaslotUsername.toLowerCase() &&
    String(v.createdAt || '').slice(0, 10) === today
  );
  const freeToday = sameAccountToday.filter(v => v.voucherType === 'FREE').length;
  const depositToday = sameAccountToday.filter(v => v.voucherType === 'DEPOSIT').length;

  if (voucherType === 'FREE' && freeToday >= 1) {
    return res.status(409).json({ error: 'Akun ini sudah mendapat 1x voucher gratis hari ini.' });
  }
  if (voucherType === 'DEPOSIT' && depositToday >= 7) {
    return res.status(409).json({ error: 'Akun ini sudah mencapai maksimal 7x voucher deposit hari ini.' });
  }

  let code;
  do {
    code = randomCode(voucherType === 'FREE' ? 'FREE' : 'DP');
  } while (db.vouchers.some(v => v.code === code));

  const voucher = {
    id: crypto.randomUUID(),
    code,
    password: randomPassword(),
    playerName,
    imbaslotUsername,
    telegram,
    voucherType,
    hasStartedBot,
    status: 'READY',
    createdAt: nowIso(),
    loginAt: null,
    gameStartedAt: null,
    gameEndedAt: null,
    gameTokenHash: null,
    gameModeKey: selectedGameMode.key,
    gameModeLabel: selectedGameMode.adminLabel,
    gameConfig: publicGameConfig(selectedGameMode),
    result: null
  };
  db.vouchers.push(voucher);
  db.audit.push({ id: crypto.randomUUID(), action: 'CREATE_VOUCHER', detail: { voucherId: voucher.id, code: voucher.code, voucherType, imbaslotUsername, selectedMode: selectedGameMode.adminLabel }, createdAt: nowIso() });
  writeDb(db);
  res.status(201).json({ voucher: adminVoucherPublic(voucher), stats: summarize(db) });
});

app.post('/api/admin/vouchers/:id/reset', requireAdmin, (req, res) => {
  const db = readDb();
  const voucher = db.vouchers.find(v => v.id === req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
  voucher.status = 'READY';
  voucher.loginAt = null;
  voucher.gameStartedAt = null;
  voucher.gameEndedAt = null;
  voucher.gameTokenHash = null;
  if (!voucher.gameModeKey || !GAME_MODES[voucher.gameModeKey]) {
    const fallbackMode = GAME_MODES.NORMAL;
    voucher.gameModeKey = fallbackMode.key;
    voucher.gameModeLabel = fallbackMode.adminLabel;
    voucher.gameConfig = publicGameConfig(fallbackMode);
  }
  voucher.result = null;
  db.results = db.results.filter(r => r.voucherId !== voucher.id);
  db.audit.push({ id: crypto.randomUUID(), action: 'RESET_VOUCHER', detail: { voucherId: voucher.id, code: voucher.code }, createdAt: nowIso() });
  writeDb(db);
  res.json({ voucher: adminVoucherPublic(voucher), stats: summarize(db) });
});

app.delete('/api/admin/vouchers/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const index = db.vouchers.findIndex(v => v.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
  const [removed] = db.vouchers.splice(index, 1);
  db.results = db.results.filter(r => r.voucherId !== removed.id);
  db.audit.push({ id: crypto.randomUUID(), action: 'DELETE_VOUCHER', detail: { voucherId: removed.id, code: removed.code }, createdAt: nowIso() });
  writeDb(db);
  res.json({ ok: true, stats: summarize(db) });
});

app.post('/api/member/login', (req, res) => {
  const code = safeUpper(req.body.code);
  const password = safeUpper(req.body.password);
  const db = readDb();
  const voucher = db.vouchers.find(v => v.code === code && safeUpper(v.password) === password);
  if (!voucher) return res.status(401).json({ error: 'Kode atau password tidak valid.' });
  if (voucher.status === 'FINISHED') return res.status(409).json({ error: 'Kode ini sudah selesai dipakai dan tidak bisa digunakan lagi.' });
  if (voucher.status === 'PLAYING') return res.status(409).json({ error: 'Kode ini sedang dalam sesi game. Selesaikan dari browser yang sama.' });
  if (voucher.status === 'LOGIN_USED') return res.status(409).json({ error: 'Kode ini sudah pernah login. Demi aturan 1x pakai, hubungi admin jika terjadi kendala.' });

  voucher.status = 'LOGIN_USED';
  voucher.loginAt = nowIso();
  const token = signToken({ role: 'member', voucherId: voucher.id, code: voucher.code, iat: Date.now(), exp: Date.now() + 1000 * 60 * 30 });
  db.audit.push({ id: crypto.randomUUID(), action: 'MEMBER_LOGIN', detail: { voucherId: voucher.id, code: voucher.code }, createdAt: nowIso() });
  writeDb(db);
  res.json({ token, player: voucherPublic(voucher), rules: { durationSeconds: 60, targetScore: 60, maxMissed: 60, rewardSuper: 20000 } });
});

app.post('/api/member/start-game', requireMember, (req, res) => {
  const db = readDb();
  const voucher = db.vouchers.find(v => v.id === req.member.voucherId);
  if (!voucher) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
  if (voucher.status === 'FINISHED') return res.status(409).json({ error: 'Voucher sudah selesai digunakan.' });
  if (!['LOGIN_USED'].includes(voucher.status)) return res.status(409).json({ error: 'Sesi game tidak bisa dimulai dari status saat ini.' });

  const rawGameToken = crypto.randomBytes(32).toString('hex');
  const assignedMode = getGameMode(voucher.gameModeKey || 'NORMAL');
  voucher.gameTokenHash = crypto.createHash('sha256').update(rawGameToken).digest('hex');
  voucher.gameStartedAt = nowIso();
  voucher.gameModeKey = assignedMode.key;
  voucher.gameModeLabel = assignedMode.adminLabel;
  voucher.gameConfig = publicGameConfig(assignedMode);
  voucher.status = 'PLAYING';
  db.audit.push({
    id: crypto.randomUUID(),
    action: 'START_GAME',
    detail: { voucherId: voucher.id, code: voucher.code, assignedMode: assignedMode.adminLabel },
    createdAt: nowIso()
  });
  writeDb(db);
  res.json({
    gameToken: rawGameToken,
    startedAt: voucher.gameStartedAt,
    durationSeconds: 60,
    gameConfig: publicGameConfig(assignedMode)
  });
});

app.post('/api/member/submit-score', requireMember, (req, res) => {
  const db = readDb();
  const voucher = db.vouchers.find(v => v.id === req.member.voucherId);
  if (!voucher) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
  if (voucher.status === 'FINISHED') return res.status(409).json({ error: 'Score sudah pernah disubmit. Voucher otomatis hangus setelah 1x game.' });
  if (voucher.status !== 'PLAYING') return res.status(409).json({ error: 'Game belum dimulai atau sesi sudah tidak valid.' });

  const submittedToken = String(req.body.gameToken || '');
  const submittedHash = crypto.createHash('sha256').update(submittedToken).digest('hex');
  if (!voucher.gameTokenHash || submittedHash !== voucher.gameTokenHash) {
    return res.status(401).json({ error: 'Game token tidak valid.' });
  }

  const started = new Date(voucher.gameStartedAt).getTime();
  const ended = Date.now();
  const duration = Math.round((ended - started) / 1000);
  const saved = Math.max(0, Math.floor(Number(req.body.saved || req.body.score || 0)));
  const missed = Math.max(0, Math.floor(Number(req.body.missed || 0)));
  const totalBalls = saved + missed;

  if (duration < 50) {
    return res.status(400).json({ error: 'Durasi game terlalu pendek. Score ditolak agar tidak ada kecurangan.' });
  }
  if (duration > 90) {
    return res.status(400).json({ error: 'Durasi game terlalu panjang. Sesi dianggap tidak valid.' });
  }
  if (saved > 260 || totalBalls > 420) {
    return res.status(400).json({ error: 'Score melebihi batas normal game. Mohon hubungi admin.' });
  }

  let reward = 0;
  let statusText = 'LOSE';
  const claimEligible = saved > 60 && missed <= 60;
  if (claimEligible) {
    reward = 20000;
    statusText = 'SUPER_WIN';
  }

  const result = {
    id: crypto.randomUUID(),
    voucherId: voucher.id,
    code: voucher.code,
    playerName: voucher.playerName,
    imbaslotUsername: voucher.imbaslotUsername,
    telegram: voucher.telegram,
    voucherType: voucher.voucherType,
    gameModeKey: voucher.gameModeKey || 'UNKNOWN',
    gameModeLabel: voucher.gameModeLabel || 'UNKNOWN',
    saved,
    missed,
    totalBalls,
    duration,
    reward,
    status: statusText,
    createdAt: nowIso(),
    note: reward > 0 ? 'Screenshot hasil dan kirim ke ADMIN IMBASLOT.' : 'Syarat belum terpenuhi: tepis harus lebih dari 60 dan kebobolan maksimal 60.'
  };

  voucher.status = 'FINISHED';
  voucher.gameEndedAt = result.createdAt;
  voucher.result = result;
  voucher.gameTokenHash = null;
  db.results.push(result);
  db.audit.push({ id: crypto.randomUUID(), action: 'SUBMIT_SCORE', detail: { voucherId: voucher.id, code: voucher.code, saved, reward, status: statusText }, createdAt: nowIso() });
  writeDb(db);
  res.json({ result: memberResultPublic(result), stats: summarize(db) });
});

app.get('/api/member/me', requireMember, (req, res) => {
  const db = readDb();
  const voucher = db.vouchers.find(v => v.id === req.member.voucherId);
  if (!voucher) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
  res.json({ player: voucherPublic(voucher) });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API tidak ditemukan.' });
  res.status(404).sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IMBAWORLD CUP running at http://localhost:${PORT}`);
  console.log(`Data path: ${DATA_PATH}`);
  console.log(`Admin gate: http://localhost:${PORT}/admin`);
  console.log(`Admin direct: http://localhost:${PORT}/admin?key=${ADMIN_PANEL_KEY}`);
  console.log(`Member game: http://localhost:${PORT}/member`);
});
