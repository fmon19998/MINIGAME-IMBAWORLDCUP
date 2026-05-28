(function () {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => min + Math.random() * (max - min);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };

  class ImbaKeeperGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
      this.canvas.style.touchAction = 'none';
      this.canvas.style.webkitUserSelect = 'none';
      this.canvas.style.userSelect = 'none';
      this.onTick = options.onTick || (() => {});
      this.onFinish = options.onFinish || (() => {});
      this.duration = options.duration || 60;
      this.gameConfig = {
        spawnMultiplier: 1,
        speedMultiplier: 1,
        curveMultiplier: 1,
        ballSizeBonus: 0,
        keeperWidthBonus: 0,
        doubleSpawnChance: 0.45,
        burstSpawnChance: 0,
        burstSpawnCount: 0,
        staminaDrainMultiplier: 1,
        scoreMultiplier: 1,
        controlResistance: 1,
        targetEdgeBias: 0,
        targetJitter: 1,
        chaosMultiplier: 1,
        ...(options.gameConfig || {})
      };
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      this.goal = {
        left: this.width * 0.18,
        right: this.width * 0.82,
        top: this.height * 0.18,
        bottom: this.height * 0.58
      };
      this.goal.centerX = (this.goal.left + this.goal.right) / 2;
      this.goal.centerY = (this.goal.top + this.goal.bottom) / 2;
      this.startedAt = 0;
      this.lastFrame = 0;
      this.spawnTimer = 0;
      this.saved = 0;
      this.missed = 0;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.stamina = 100;
      this.running = false;
      this.finished = false;
      this.balls = [];
      this.particles = [];
      this.keys = new Set();
      this.pointerActive = false;
      this.mobileDir = 0;
      const baseCatch = this.isTouchDevice ? 118 : 104;
      this.inputTarget = this.goal.centerX;
      this.keeper = {
        x: this.goal.centerX,
        vx: 0,
        catchW: clamp(baseCatch + Number(this.gameConfig.keeperWidthBonus || 0), 24, 210),
        spriteH: this.isTouchDevice ? 172 : 185,
        lean: 0
      };
      this.keeper.y = this.goal.bottom - this.keeper.spriteH + 24;
      this.assets = {
        keeper: this.loadImage('/assets/keeper-standing.png'),
        keeperDive: this.loadImage('/assets/keeper-dive.png')
      };
      this.boundFrame = this.frame.bind(this);
      this.installControls();
    }

    loadImage(src) {
      const image = new Image();
      image.loaded = false;
      image.onload = () => { image.loaded = true; };
      image.onerror = () => { image.loaded = false; };
      image.src = src;
      return image;
    }

    keeperMinX() { return this.goal.left + 42; }
    keeperMaxX() { return this.goal.right - 42; }

    installControls() {
      const setTargetFromEvent = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        const x = ((point.clientX - rect.left) / rect.width) * this.width;
        this.inputTarget = clamp(x, this.keeperMinX(), this.keeperMaxX());
      };
      this.canvas.addEventListener('pointerdown', (event) => {
        this.pointerActive = true;
        setTargetFromEvent(event);
      });
      this.canvas.addEventListener('pointermove', (event) => {
        if (this.pointerActive || event.pointerType === 'mouse') setTargetFromEvent(event);
      });
      window.addEventListener('pointerup', () => { this.pointerActive = false; });
      this.canvas.addEventListener('touchstart', (event) => {
        this.pointerActive = true;
        event.preventDefault();
        setTargetFromEvent(event);
      }, { passive: false });
      this.canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        setTargetFromEvent(event);
      }, { passive: false });
      this.canvas.addEventListener('touchend', () => { this.pointerActive = false; }, { passive: true });
      this.canvas.addEventListener('touchcancel', () => { this.pointerActive = false; }, { passive: true });
      window.addEventListener('keydown', (event) => this.keys.add(event.key.toLowerCase()));
      window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
      const left = document.getElementById('leftBtn');
      const right = document.getElementById('rightBtn');
      const center = document.getElementById('centerBtn');
      const hold = (dir) => { this.mobileDir = dir; };
      const stop = () => { this.mobileDir = 0; };
      if (left && right && center) {
        left.addEventListener('pointerdown', () => hold(-1));
        right.addEventListener('pointerdown', () => hold(1));
        center.addEventListener('pointerdown', () => { this.inputTarget = this.goal.centerX; });
        [left, right, center].forEach(btn => {
          btn.addEventListener('pointerup', stop);
          btn.addEventListener('pointercancel', stop);
          btn.addEventListener('pointerleave', stop);
        });
      }
    }

    start() {
      this.startedAt = performance.now();
      this.lastFrame = this.startedAt;
      this.running = true;
      this.spawnTimer = 9999;
      requestAnimationFrame(this.boundFrame);
    }

    difficulty(elapsed) {
      let base;
      if (elapsed > 52) base = { spawn: 185, speedMin: 1.18, speedMax: 1.58, curve: 0.18, size: [14, 20] };
      else if (elapsed > 42) base = { spawn: 230, speedMin: 1.05, speedMax: 1.42, curve: 0.15, size: [15, 21] };
      else if (elapsed > 30) base = { spawn: 285, speedMin: 0.92, speedMax: 1.26, curve: 0.12, size: [16, 22] };
      else if (elapsed > 16) base = { spawn: 360, speedMin: 0.78, speedMax: 1.06, curve: 0.10, size: [17, 24] };
      else base = { spawn: 460, speedMin: 0.66, speedMax: 0.88, curve: 0.08, size: [18, 25] };
      const cfg = this.gameConfig;
      const touchEase = this.isTouchDevice ? 1.04 : 1;
      const ballSizeBonus = Number(cfg.ballSizeBonus || 0);
      return {
        spawn: clamp(base.spawn * Number(cfg.spawnMultiplier || 1) * touchEase, 45, 1050),
        speedMin: clamp(base.speedMin * Number(cfg.speedMultiplier || 1) / touchEase, 0.38, 5.2),
        speedMax: clamp(base.speedMax * Number(cfg.speedMultiplier || 1) / touchEase, 0.50, 6.3),
        curve: clamp(base.curve * Number(cfg.curveMultiplier || 1), 0.02, 0.64),
        size: [clamp(base.size[0] + ballSizeBonus, 7, 42), clamp(base.size[1] + ballSizeBonus, 8, 52)],
        doubleSpawnChance: clamp(Number(cfg.doubleSpawnChance || 0.45), 0, 0.99),
        burstSpawnChance: clamp(Number(cfg.burstSpawnChance || 0), 0, 0.99),
        burstSpawnCount: clamp(Number(cfg.burstSpawnCount || 0), 0, 6),
        targetEdgeBias: clamp(Number(cfg.targetEdgeBias || 0), 0, 1),
        targetJitter: clamp(Number(cfg.targetJitter || 1), 0.25, 2.8),
        chaosMultiplier: clamp(Number(cfg.chaosMultiplier || 1), 0.6, 3.4)
      };
    }

    chooseTargetX(diff, forcedSide) {
      if (forcedSide === 'left') return rand(this.goal.left + 28, this.goal.left + (this.goal.right - this.goal.left) * 0.32);
      if (forcedSide === 'right') return rand(this.goal.right - (this.goal.right - this.goal.left) * 0.32, this.goal.right - 28);
      if (Math.random() < diff.targetEdgeBias) {
        return Math.random() < 0.5
          ? rand(this.goal.left + 24, this.goal.left + (this.goal.right - this.goal.left) * 0.27)
          : rand(this.goal.right - (this.goal.right - this.goal.left) * 0.27, this.goal.right - 24);
      }
      return rand(this.goal.left + 60, this.goal.right - 60);
    }

    spawnBall(elapsed, forcedSide = null) {
      const diff = this.difficulty(elapsed);
      const targetX = this.chooseTargetX(diff, forcedSide);
      const targetY = this.keeper.y + this.keeper.spriteH * rand(0.20, 0.40);
      const startX = rand(this.width * 0.28, this.width * 0.72);
      const startY = this.height * rand(0.82, 0.96);
      const apexX = lerp(startX, targetX, 0.48) + rand(-this.width * diff.curve, this.width * diff.curve) * diff.targetJitter;
      const radiusBase = rand(diff.size[0], diff.size[1]);
      this.balls.push({
        startX, startY, apexX, targetX, targetY,
        z: 0,
        speed: rand(diff.speedMin, diff.speedMax),
        radiusBase,
        spin: rand(-6, 6),
        phase: rand(0, Math.PI * 2),
        wobble: rand(2, 12) * diff.chaosMultiplier,
        saved: false,
        missed: false,
        screenX: startX,
        screenY: startY,
        radius: radiusBase * 2.8,
        hot: Math.random() < 0.38
      });
    }

    updateKeeper(dt) {
      const left = this.keys.has('a') || this.keys.has('arrowleft');
      const right = this.keys.has('d') || this.keys.has('arrowright');
      const resistance = clamp(Number(this.gameConfig.controlResistance || 1), 0.65, 4.6);
      const keyboardSpeed = (this.isTouchDevice ? 780 : 880) / resistance;
      const mobileSpeed = 900 / resistance;
      if (left) this.inputTarget -= keyboardSpeed * dt;
      if (right) this.inputTarget += keyboardSpeed * dt;
      if (this.mobileDir) this.inputTarget += this.mobileDir * mobileSpeed * dt;
      this.inputTarget = clamp(this.inputTarget, this.keeperMinX(), this.keeperMaxX());
      const dx = this.inputTarget - this.keeper.x;
      this.keeper.vx += dx * ((this.isTouchDevice ? 11.2 : 10.4) / resistance) * dt;
      this.keeper.vx *= Math.pow(0.0015, dt);
      this.keeper.vx = clamp(this.keeper.vx, -1240 / resistance, 1240 / resistance);
      this.keeper.x += this.keeper.vx * dt;
      this.keeper.x = clamp(this.keeper.x, this.keeperMinX(), this.keeperMaxX());
      this.keeper.lean = lerp(this.keeper.lean, clamp(this.keeper.vx / 1900, -0.26, 0.26), 0.12);
      const effort = Math.abs(this.keeper.vx) / Math.max(120, 1240 / resistance);
      const drain = Number(this.gameConfig.staminaDrainMultiplier || 1);
      this.stamina = clamp(this.stamina - effort * 8.4 * drain * dt + 2.1 * dt, 0, 100);
    }

    updateBalls(dt, elapsed) {
      const diff = this.difficulty(elapsed);
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= diff.spawn) {
        this.spawnTimer = 0;
        this.spawnBall(elapsed);
        if (elapsed > 6 && Math.random() < diff.doubleSpawnChance) {
          const side = Math.random() < 0.5 ? 'left' : 'right';
          setTimeout(() => { if (this.running) this.spawnBall(elapsed, side); }, 55);
        }
        if (elapsed > 9 && diff.burstSpawnCount > 0 && Math.random() < diff.burstSpawnChance) {
          for (let i = 0; i < diff.burstSpawnCount; i += 1) {
            setTimeout(() => { if (this.running) this.spawnBall(elapsed, i % 2 === 0 ? 'left' : 'right'); }, 30 + i * 31);
          }
        }
      }
      for (const ball of this.balls) {
        ball.z += ball.speed * dt;
        const p = clamp(ball.z, 0, 1);
        const q = easeInOut(p);
        const inv = 1 - q;
        ball.screenX = inv * inv * ball.startX + 2 * inv * q * ball.apexX + q * q * ball.targetX;
        ball.screenY = inv * inv * ball.startY + 2 * inv * q * (this.height * 0.55) + q * q * ball.targetY;
        ball.screenX += Math.sin(ball.phase + elapsed * 7) * ball.wobble * (1 - q);
        ball.radius = ball.radiusBase * lerp(2.9, 0.78, q);
        if (!ball.saved && !ball.missed && p >= 0.985) {
          const staminaPenalty = this.stamina < 18 ? 0.70 : 1;
          const catchWidth = this.keeper.catchW * staminaPenalty;
          const catchY = this.keeper.y + this.keeper.spriteH * 0.30;
          const overlap = Math.abs(ball.screenX - this.keeper.x) <= (catchWidth / 2 + ball.radius * 0.22) && Math.abs(ball.screenY - catchY) <= Math.max(23, ball.radius * 0.7);
          if (overlap) {
            ball.saved = true;
            this.saved += 1;
            this.combo += 1;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            const mult = Number(this.gameConfig.scoreMultiplier || 1);
            this.score += Math.round((100 + this.combo * 35) * mult);
            this.stamina = clamp(this.stamina + 1.5, 0, 100);
            this.makeParticles(ball.screenX, ball.screenY, '#ffd66b', 22);
          } else {
            ball.missed = true;
            this.missed += 1;
            this.combo = 0;
            this.score = Math.max(0, this.score - 80);
            this.stamina = clamp(this.stamina - 12 * Number(this.gameConfig.staminaDrainMultiplier || 1), 0, 100);
            this.makeParticles(ball.screenX, ball.screenY, '#ff536e', 18);
          }
        }
      }
      this.balls = this.balls.filter(ball => !ball.saved && !ball.missed && ball.z < 1.08);
      this.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vy += 88 * dt; });
      this.particles = this.particles.filter(p => p.life > 0);
    }

    makeParticles(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        this.particles.push({ x, y, vx: rand(-270, 270), vy: rand(-290, 135), r: rand(2, 6), life: rand(0.25, 0.80), color });
      }
    }

    frame(ts) {
      if (!this.running) return;
      const dt = Math.min(0.033, (ts - this.lastFrame) / 1000);
      this.lastFrame = ts;
      const elapsed = (ts - this.startedAt) / 1000;
      const remaining = Math.max(0, this.duration - elapsed);
      this.updateKeeper(dt);
      this.updateBalls(dt, elapsed);
      this.draw(elapsed, remaining);
      this.onTick({ remaining, saved: this.saved, missed: this.missed, score: this.score, combo: this.combo, stamina: this.stamina, maxCombo: this.maxCombo });
      if (elapsed >= this.duration && !this.finished) {
        this.finished = true;
        this.running = false;
        this.onFinish({ saved: this.saved, missed: this.missed, totalBalls: this.saved + this.missed, score: this.score, combo: this.combo, stamina: this.stamina, maxCombo: this.maxCombo });
        return;
      }
      requestAnimationFrame(this.boundFrame);
    }

    drawScene() {
      const ctx = this.ctx, w = this.width, h = this.height;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#07111e'); sky.addColorStop(0.18, '#0f2d5c'); sky.addColorStop(0.38, '#173f76'); sky.addColorStop(0.68, '#13814a'); sky.addColorStop(1, '#0b592e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(5,10,20,0.86)'; ctx.fillRect(0, 0, w, h * 0.18);
      for (let row = 0; row < 5; row += 1) for (let x = 0; x < w; x += 18) { const tone = (x / 18 + row) % 4; ctx.fillStyle = tone === 0 ? 'rgba(255,216,107,0.54)' : tone === 1 ? 'rgba(255,255,255,0.22)' : tone === 2 ? 'rgba(33,145,255,0.38)' : 'rgba(255,83,110,0.32)'; ctx.fillRect(x + 2, 15 + row * 15, 12, 4); }
      const horizonY = h * 0.18;
      const fieldGrad = ctx.createLinearGradient(0, horizonY, 0, h); fieldGrad.addColorStop(0, '#5bdc85'); fieldGrad.addColorStop(0.42, '#27a75a'); fieldGrad.addColorStop(1, '#0a5c31'); ctx.fillStyle = fieldGrad; ctx.fillRect(0, horizonY, w, h - horizonY);
      for (let i = 0; i < 13; i += 1) { const t1 = i / 13, t2 = (i + 1) / 13; ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.moveTo(lerp(w * 0.47, -w * 0.10, t1), lerp(horizonY, h, t1)); ctx.lineTo(lerp(w * 0.53, w * 1.10, t1), lerp(horizonY, h, t1)); ctx.lineTo(lerp(w * 0.53, w * 1.10, t2), lerp(horizonY, h, t2)); ctx.lineTo(lerp(w * 0.47, -w * 0.10, t2), lerp(horizonY, h, t2)); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w * 0.47, horizonY); ctx.lineTo(-w * 0.08, h); ctx.moveTo(w * 0.53, horizonY); ctx.lineTo(w * 1.08, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.38, h * 0.26); ctx.lineTo(w * 0.62, h * 0.26); ctx.lineTo(w * 0.76, h * 0.62); ctx.lineTo(w * 0.24, h * 0.62); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.43, h * 0.21); ctx.lineTo(w * 0.57, h * 0.21); ctx.lineTo(w * 0.64, h * 0.43); ctx.lineTo(w * 0.36, h * 0.43); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(w / 2, h * 0.78, 5, 0, Math.PI * 2); ctx.fill();
      this.drawGoalNet(); this.drawSpotlights();
    }

    drawSpotlights() {
      const ctx = this.ctx, w = this.width, h = this.height;
      const leftLight = ctx.createLinearGradient(0, 0, w * 0.42, h); leftLight.addColorStop(0, 'rgba(255,255,255,0.20)'); leftLight.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = leftLight; ctx.beginPath(); ctx.moveTo(75, 0); ctx.lineTo(295, h); ctx.lineTo(440, h); ctx.lineTo(140, 0); ctx.closePath(); ctx.fill();
      const rightLight = ctx.createLinearGradient(w, 0, w * 0.58, h); rightLight.addColorStop(0, 'rgba(255,255,255,0.20)'); rightLight.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rightLight; ctx.beginPath(); ctx.moveTo(w - 75, 0); ctx.lineTo(w - 295, h); ctx.lineTo(w - 440, h); ctx.lineTo(w - 140, 0); ctx.closePath(); ctx.fill();
    }

    drawGoalNet() {
      const ctx = this.ctx; const { left, right, top, bottom } = this.goal; const w = this.width, h = this.height; const depthX = w * 0.035;
      ctx.save(); ctx.fillStyle = 'rgba(8,18,36,0.16)'; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.lineTo(right - depthX, bottom); ctx.lineTo(left + depthX, bottom); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,0.35)'; ctx.lineWidth = 1.35;
      for (let i = 0; i <= 13; i += 1) { const t = i / 13; ctx.beginPath(); ctx.moveTo(lerp(left, right, t), top); ctx.lineTo(lerp(left + depthX, right - depthX, t), bottom); ctx.stroke(); }
      for (let i = 0; i <= 8; i += 1) { const t = i / 8; const y = lerp(top, bottom, t); const inset = lerp(0, depthX, t); ctx.beginPath(); ctx.moveTo(left + inset, y); ctx.lineTo(right - inset, y); ctx.stroke(); }
      const postGrad = ctx.createLinearGradient(left, top, right, bottom); postGrad.addColorStop(0, '#ffffff'); postGrad.addColorStop(0.36, '#b9d7ff'); postGrad.addColorStop(0.64, '#ffffff'); postGrad.addColorStop(1, '#d5e6ff');
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(left, top); ctx.lineTo(right, top); ctx.lineTo(right, bottom); ctx.stroke();
      ctx.strokeStyle = postGrad; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(left, top); ctx.lineTo(right, top); ctx.lineTo(right, bottom); ctx.stroke(); ctx.restore();
    }

    drawKeeper() {
      const ctx = this.ctx, k = this.keeper, img = this.assets.keeper; const ratio = img.loaded && img.height ? img.width / img.height : 685 / 1200; const spriteH = k.spriteH; const spriteW = spriteH * ratio; const y = k.y; const x = k.x - spriteW / 2;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(k.x, y + spriteH * 0.91, spriteW * 0.34, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(k.x, y + spriteH * 0.52); ctx.rotate(k.lean); ctx.translate(-k.x, -(y + spriteH * 0.52));
      if (img.loaded) { ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 18; ctx.drawImage(img, x, y, spriteW, spriteH); ctx.shadowBlur = 0; } else this.drawFallbackKeeper(k.x, y, spriteW, spriteH); ctx.restore();
    }

    drawFallbackKeeper(cx, y, w, h) {
      const ctx = this.ctx; ctx.save(); ctx.translate(cx, y + h * 0.5); const bodyGrad = ctx.createLinearGradient(0, -h * 0.25, 0, h * 0.3); bodyGrad.addColorStop(0, '#ffd66b'); bodyGrad.addColorStop(1, '#ff6f2a'); ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.roundRect(-w * 0.25, -h * 0.22, w * 0.5, h * 0.42, 18); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -h * 0.34, w * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#0a1f45'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w * 0.22, -h * 0.09); ctx.lineTo(-w * 0.46, h * 0.03); ctx.moveTo(w * 0.22, -h * 0.09); ctx.lineTo(w * 0.46, h * 0.03); ctx.stroke(); ctx.restore();
    }

    drawBall(ball) {
      const ctx = this.ctx; const p = clamp(ball.z, 0, 1); const r = ball.radius;
      ctx.save(); ctx.globalAlpha = 0.12 + (1 - p) * 0.35; ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(ball.screenX, ball.screenY + r * 0.92, r * 0.84, r * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(ball.screenX, ball.screenY); ctx.rotate(ball.phase + p * ball.spin * 0.18);
      const trailLength = r * (1.1 + (1 - p) * 1.4); const trail = ctx.createLinearGradient(0, trailLength, 0, 0); trail.addColorStop(0, 'rgba(255,255,255,0)'); trail.addColorStop(0.55, ball.hot ? 'rgba(255,130,40,0.18)' : 'rgba(70,170,255,0.13)'); trail.addColorStop(1, 'rgba(255,255,255,0.18)'); ctx.fillStyle = trail; ctx.beginPath(); ctx.ellipse(0, trailLength * 0.55, r * 0.56, trailLength, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 10 + (1 - p) * 18; const ballGrad = ctx.createRadialGradient(-r * 0.26, -r * 0.32, r * 0.10, 0, 0, r * 1.08); ballGrad.addColorStop(0, '#ffffff'); ballGrad.addColorStop(0.70, '#f3f7ff'); ballGrad.addColorStop(1, '#d6dde9'); ctx.fillStyle = ballGrad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#1b67b8'; ctx.beginPath(); ctx.moveTo(-r * 0.10, -r * 0.98); ctx.lineTo(r * 0.30, -r * 0.36); ctx.lineTo(-r * 0.04, r * 0.02); ctx.lineTo(-r * 0.48, -r * 0.34); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.18, -r * 0.08); ctx.lineTo(r * 0.95, -r * 0.12); ctx.lineTo(r * 0.76, r * 0.28); ctx.lineTo(r * 0.24, r * 0.18); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d72f2f'; ctx.beginPath(); ctx.moveTo(-r * 0.92, -r * 0.10); ctx.lineTo(-r * 0.30, -r * 0.06); ctx.lineTo(-r * 0.18, r * 0.30); ctx.lineTo(-r * 0.72, r * 0.38); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(9,24,54,0.88)'; ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.beginPath(); ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.68)'; ctx.beginPath(); ctx.ellipse(-r * 0.30, -r * 0.36, r * 0.26, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    drawParticles() { const ctx = this.ctx; this.particles.forEach(p => { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }

    drawHudHints(remaining) {
      const ctx = this.ctx; ctx.save(); ctx.fillStyle = 'rgba(3,10,26,0.78)'; ctx.fillRect(0, this.height - 34, this.width, 34); ctx.fillStyle = '#ffd66b'; ctx.font = '900 17px system-ui, sans-serif'; ctx.fillText('KIPER DI GAWANG • BOLA DITEMBAK DARI DEPAN MENUJU GAWANG', 22, this.height - 12);
      if (remaining <= 5) { ctx.fillStyle = 'rgba(255, 77, 103, 0.24)'; ctx.fillRect(0, 0, this.width, this.height); ctx.fillStyle = '#fff'; ctx.font = '900 78px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(Math.ceil(remaining)), this.width / 2, this.height / 2); ctx.textAlign = 'left'; }
      const elapsed = (performance.now() - this.startedAt) / 1000; if (elapsed < 2.5) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, this.width, this.height); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 56px system-ui, sans-serif'; ctx.fillText('JAGA GAWANG!', this.width / 2, this.height / 2 - 18); ctx.fillStyle = '#ffd66b'; ctx.font = '900 24px system-ui, sans-serif'; ctx.fillText('TEMBAKAN DATANG DARI DEPAN KIPER', this.width / 2, this.height / 2 + 22); ctx.textAlign = 'left'; }
      ctx.restore();
    }

    draw(elapsed, remaining) {
      const ctx = this.ctx; this.drawScene(); this.drawKeeper(); [...this.balls].sort((a, b) => b.radius - a.radius).forEach(ball => this.drawBall(ball)); this.drawParticles(); const vignette = ctx.createRadialGradient(this.width / 2, this.height / 2, 80, this.width / 2, this.height / 2, this.height * 0.86); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.22)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, this.width, this.height); this.drawHudHints(remaining);
    }
  }

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      this.beginPath(); this.moveTo(x + radius, y); this.arcTo(x + w, y, x + w, y + h, radius); this.arcTo(x + w, y + h, x, y + h, radius); this.arcTo(x, y + h, x, y, radius); this.arcTo(x, y, x + w, y, radius); this.closePath(); return this;
    };
  }
  window.ImbaKeeperGame = ImbaKeeperGame;
})();
