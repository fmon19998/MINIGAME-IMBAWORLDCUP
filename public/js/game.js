(function () {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => min + Math.random() * (max - min);

  class ImbaKeeperGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
      this.canvas.style.touchAction = 'none';
      this.onTick = options.onTick || (() => {});
      this.onFinish = options.onFinish || (() => {});
      this.duration = options.duration || 60;
      this.width = this.canvas.width;
      this.height = this.canvas.height;
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
      this.inputTarget = this.width / 2;
      this.mobileDir = 0;
      this.keeper = {
        x: this.width / 2,
        y: this.height - 82,
        w: this.isTouchDevice ? 112 : 92,
        h: 28,
        vx: 0
      };
      this.boundFrame = this.frame.bind(this);
      this.installControls();
    }

    installControls() {
      const setTargetFromEvent = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        const x = ((point.clientX - rect.left) / rect.width) * this.width;
        this.inputTarget = clamp(x + rand(-16, 16), 60, this.width - 60);
      };

      this.canvas.addEventListener('pointerdown', (event) => {
        this.pointerActive = true;
        if (this.canvas.setPointerCapture && event.pointerId !== undefined) {
          try { this.canvas.setPointerCapture(event.pointerId); } catch (err) {}
        }
        setTargetFromEvent(event);
      });
      this.canvas.addEventListener('pointermove', (event) => {
        if (this.pointerActive || event.pointerType === 'mouse') setTargetFromEvent(event);
      });
      window.addEventListener('pointerup', () => { this.pointerActive = false; });
      this.canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        setTargetFromEvent(event);
      }, { passive: false });

      window.addEventListener('keydown', (event) => this.keys.add(event.key.toLowerCase()));
      window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));

      const left = document.getElementById('leftBtn');
      const right = document.getElementById('rightBtn');
      const center = document.getElementById('centerBtn');
      const hold = (dir) => { this.mobileDir = dir; };
      const stop = () => { this.mobileDir = 0; };
      if (left && right && center) {
        left.addEventListener('pointerdown', (event) => { event.preventDefault(); hold(-1); });
        right.addEventListener('pointerdown', (event) => { event.preventDefault(); hold(1); });
        center.addEventListener('pointerdown', (event) => { event.preventDefault(); this.inputTarget = this.width / 2; });
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
      requestAnimationFrame(this.boundFrame);
    }

    difficulty(elapsed) {
      const touchSpawnBonus = this.isTouchDevice ? 35 : 0;
      const touchSpeedCut = this.isTouchDevice ? 35 : 0;
      if (elapsed > 48) return { spawn: 250 + touchSpawnBonus, speedMin: 820 - touchSpeedCut, speedMax: 1120 - touchSpeedCut, curve: 175, size: [11, 16] };
      if (elapsed > 36) return { spawn: 300 + touchSpawnBonus, speedMin: 760 - touchSpeedCut, speedMax: 1040 - touchSpeedCut, curve: 150, size: [12, 17] };
      if (elapsed > 22) return { spawn: 360 + touchSpawnBonus, speedMin: 700 - touchSpeedCut, speedMax: 950 - touchSpeedCut, curve: 130, size: [12, 18] };
      if (elapsed > 10) return { spawn: 420 + touchSpawnBonus, speedMin: 650 - touchSpeedCut, speedMax: 870 - touchSpeedCut, curve: 100, size: [13, 18] };
      return { spawn: 500 + touchSpawnBonus, speedMin: 590 - touchSpeedCut, speedMax: 800 - touchSpeedCut, curve: 80, size: [14, 19] };
    }

    spawnBall(elapsed) {
      const diff = this.difficulty(elapsed);
      const targetX = rand(70, this.width - 70);
      const startX = clamp(targetX + rand(-260, 260), 40, this.width - 40);
      const vy = rand(diff.speedMin, diff.speedMax);
      const vx = (targetX - startX) * rand(0.72, 1.2);
      const radius = rand(diff.size[0], diff.size[1]);
      this.balls.push({
        x: startX,
        y: -30,
        vx,
        vy,
        radius,
        spin: rand(-8, 8),
        curve: rand(-diff.curve, diff.curve),
        saved: false,
        missed: false,
        pulse: rand(0, Math.PI * 2)
      });
    }

    updateKeeper(dt) {
      const left = this.keys.has('a') || this.keys.has('arrowleft');
      const right = this.keys.has('d') || this.keys.has('arrowright');
      if (left) this.inputTarget -= 720 * dt;
      if (right) this.inputTarget += 720 * dt;
      if (this.mobileDir) this.inputTarget += this.mobileDir * 780 * dt;
      this.inputTarget = clamp(this.inputTarget, 48, this.width - 48);

      const dx = this.inputTarget - this.keeper.x;
      const acceleration = this.isTouchDevice ? 8.8 : 7.6;
      const maxSpeed = this.isTouchDevice ? 1080 : 980;
      this.keeper.vx += dx * acceleration * dt;
      this.keeper.vx *= Math.pow(0.00085, dt);
      this.keeper.vx = clamp(this.keeper.vx, -maxSpeed, maxSpeed);
      this.keeper.x += this.keeper.vx * dt;
      this.keeper.x = clamp(this.keeper.x, this.keeper.w / 2 + 8, this.width - this.keeper.w / 2 - 8);

      const effort = Math.abs(this.keeper.vx) / 980;
      this.stamina = clamp(this.stamina - effort * 8.5 * dt + 2.1 * dt, 0, 100);
    }

    updateBalls(dt, elapsed) {
      const diff = this.difficulty(elapsed);
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= diff.spawn) {
        this.spawnTimer = 0;
        this.spawnBall(elapsed);
        if (elapsed > 42 && Math.random() > 0.62) this.spawnBall(elapsed);
      }

      for (const ball of this.balls) {
        ball.pulse += dt * 9;
        ball.x += (ball.vx * dt) + Math.sin(ball.pulse) * ball.curve * dt;
        ball.y += ball.vy * dt;
        ball.vy += 115 * dt;
        ball.x = clamp(ball.x, ball.radius, this.width - ball.radius);

        const withinKeeperY = ball.y + ball.radius >= this.keeper.y - 10 && ball.y - ball.radius <= this.keeper.y + this.keeper.h + 12;
        const withinKeeperX = Math.abs(ball.x - this.keeper.x) <= (this.keeper.w / 2 + ball.radius * 0.72);
        if (!ball.saved && !ball.missed && withinKeeperY && withinKeeperX) {
          ball.saved = true;
          this.saved += 1;
          this.combo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.score += 100 + (this.combo * 35);
          this.stamina = clamp(this.stamina + 1.6, 0, 100);
          this.makeParticles(ball.x, ball.y, '#ffd66b', 14);
        }

        if (!ball.saved && !ball.missed && ball.y - ball.radius > this.height - 18) {
          ball.missed = true;
          this.missed += 1;
          this.combo = 0;
          this.score = Math.max(0, this.score - 60);
          this.stamina = clamp(this.stamina - 12, 0, 100);
          this.makeParticles(ball.x, this.height - 20, '#ff4d67', 10);
        }
      }
      this.balls = this.balls.filter(ball => !ball.saved && !ball.missed && ball.y < this.height + 80);

      this.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      this.particles = this.particles.filter(p => p.life > 0);
    }

    makeParticles(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        this.particles.push({
          x, y,
          vx: rand(-210, 210),
          vy: rand(-220, 120),
          r: rand(2, 5),
          life: rand(0.28, 0.68),
          color
        });
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

    drawCrowd() {
      const ctx = this.ctx;
      const w = this.width;
      ctx.fillStyle = 'rgba(5, 14, 31, 0.94)';
      ctx.fillRect(0, 0, w, 84);

      const rows = [18, 36, 54];
      rows.forEach((y, rowIndex) => {
        for (let x = 0; x < w; x += 26) {
          const c = (x / 26 + rowIndex) % 3;
          ctx.fillStyle = c === 0 ? 'rgba(255,216,107,0.55)' : c === 1 ? 'rgba(255,255,255,0.28)' : 'rgba(33,145,255,0.42)';
          ctx.fillRect(x + 4, y, 16, 6);
        }
      });

      const glow = ctx.createLinearGradient(0, 0, 0, 120);
      glow.addColorStop(0, 'rgba(255,255,255,0.18)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, 120);
    }

    drawField() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      sky.addColorStop(0, '#0d2b5f');
      sky.addColorStop(1, '#123a73');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.45);

      const lightLeft = ctx.createLinearGradient(0, 0, 160, h * 0.55);
      lightLeft.addColorStop(0, 'rgba(255,255,255,0.28)');
      lightLeft.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lightLeft;
      ctx.beginPath();
      ctx.moveTo(90, 0);
      ctx.lineTo(220, h * 0.54);
      ctx.lineTo(320, h * 0.54);
      ctx.lineTo(140, 0);
      ctx.closePath();
      ctx.fill();

      const lightRight = ctx.createLinearGradient(w, 0, w - 160, h * 0.55);
      lightRight.addColorStop(0, 'rgba(255,255,255,0.28)');
      lightRight.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lightRight;
      ctx.beginPath();
      ctx.moveTo(w - 90, 0);
      ctx.lineTo(w - 220, h * 0.54);
      ctx.lineTo(w - 320, h * 0.54);
      ctx.lineTo(w - 140, 0);
      ctx.closePath();
      ctx.fill();

      this.drawCrowd();

      const grd = ctx.createLinearGradient(0, h * 0.28, 0, h);
      grd.addColorStop(0, '#2cc56d');
      grd.addColorStop(.6, '#16924c');
      grd.addColorStop(1, '#0e6d39');
      ctx.fillStyle = grd;
      ctx.fillRect(0, h * 0.28, w, h);

      for (let i = 0; i < 12; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
        ctx.fillRect((w / 12) * i, h * 0.28, w / 12, h);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.74)';
      ctx.lineWidth = 4;
      ctx.strokeRect(38, 110, w - 76, h - 146);
      ctx.beginPath();
      ctx.moveTo(w / 2, 110);
      ctx.lineTo(w / 2, h - 36);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 + 40, 74, 0, Math.PI * 2);
      ctx.stroke();

      const postGrad = ctx.createLinearGradient(w / 2 - 220, h - 124, w / 2 + 220, h - 34);
      postGrad.addColorStop(0, '#fefefe');
      postGrad.addColorStop(0.5, '#d7e5f5');
      postGrad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = postGrad;
      ctx.lineWidth = 8;
      ctx.strokeRect(w / 2 - 220, h - 124, 440, 90);

      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 10; i += 1) {
        const x = w / 2 - 220 + i * 44;
        ctx.beginPath();
        ctx.moveTo(x, h - 124);
        ctx.lineTo(x, h - 34);
        ctx.stroke();
      }
      for (let i = 0; i <= 4; i += 1) {
        const y = h - 124 + i * 22.5;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 220, y);
        ctx.lineTo(w / 2 + 220, y);
        ctx.stroke();
      }

      const spotlight = ctx.createRadialGradient(w / 2, 120, 40, w / 2, 160, 420);
      spotlight.addColorStop(0, 'rgba(255,255,255,0.26)');
      spotlight.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, w, h);

      const vignette = ctx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, h * 0.78);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    drawBall(ball) {
      const ctx = this.ctx;
      ctx.save();
      const shadowScale = clamp(ball.y / this.height, 0.25, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(ball.x, Math.min(this.height - 18, ball.y + ball.radius * 1.8), ball.radius * (1.05 + shadowScale * 0.35), ball.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.pulse);

      const trail = ctx.createRadialGradient(-ball.radius * 1.2, -ball.radius * 1.4, 0, 0, 0, ball.radius * 2.5);
      trail.addColorStop(0, 'rgba(255,255,255,0.35)');
      trail.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.arc(-ball.radius * 0.2, -ball.radius * 0.2, ball.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'rgba(0,0,0,.42)';
      ctx.shadowBlur = 12;
      const ballGrad = ctx.createRadialGradient(-ball.radius * .4, -ball.radius * .4, 2, 0, 0, ball.radius * 1.2);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(.65, '#eef4ff');
      ballGrad.addColorStop(1, '#bccbdf');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#0a2348';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-ball.radius, 0);
      ctx.lineTo(ball.radius, 0);
      ctx.moveTo(0, -ball.radius);
      ctx.lineTo(0, ball.radius);
      ctx.stroke();
      ctx.fillStyle = '#0a3e86';
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawKeeper() {
      const ctx = this.ctx;
      const k = this.keeper;
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(clamp(k.vx / 3200, -0.22, 0.22));
      ctx.shadowColor = 'rgba(0,0,0,.38)';
      ctx.shadowBlur = 18;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 38, k.w * 0.72, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyGrad = ctx.createLinearGradient(0, -54, 0, 34);
      bodyGrad.addColorStop(0, '#ffe399');
      bodyGrad.addColorStop(.42, '#ffb433');
      bodyGrad.addColorStop(1, '#ff6f2a');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-30, -34, 60, 58, 18);
      ctx.fill();
      ctx.strokeStyle = '#09214a';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -54, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0b2147';
      ctx.fillRect(-10, -16, 20, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-12, -6, 24, 6);
      ctx.fillStyle = '#072046';
      ctx.beginPath();
      ctx.arc(16, -14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd66b';
      ctx.beginPath();
      ctx.arc(16, -14, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0a1f45';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-28, -18);
      ctx.lineTo(-k.w / 2, 3);
      ctx.moveTo(28, -18);
      ctx.lineTo(k.w / 2, 3);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-k.w / 2 - 3, 3);
      ctx.lineTo(-k.w / 2 - 18, 10);
      ctx.moveTo(k.w / 2 + 3, 3);
      ctx.lineTo(k.w / 2 + 18, 10);
      ctx.stroke();

      ctx.strokeStyle = '#0a1f45';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-12, 24);
      ctx.lineTo(-22, 48);
      ctx.moveTo(12, 24);
      ctx.lineTo(22, 48);
      ctx.stroke();
      ctx.restore();
    }

    draw(elapsed, remaining) {
      const ctx = this.ctx;
      this.drawField();
      this.balls.forEach(ball => this.drawBall(ball));
      this.drawKeeper();

      this.particles.forEach(p => {
        ctx.globalAlpha = clamp(p.life * 2, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(3, 10, 26, 0.78)';
      ctx.fillRect(0, this.height - 32, this.width, 32);
      ctx.fillStyle = '#ffd66b';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText('HALANGI BOLA JANGAN SAMPAI MASUK', 22, this.height - 10);

      if (remaining <= 5) {
        ctx.fillStyle = 'rgba(255, 77, 103, 0.22)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 74px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(remaining)), this.width / 2, this.height / 2);
        ctx.textAlign = 'left';
      }

      if (elapsed < 2.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.fillText('SIAP-SIAP!', this.width / 2, this.height / 2 - 18);
        ctx.fillStyle = '#ffd66b';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.fillText('JAGA GAWANGMU!', this.width / 2, this.height / 2 + 18);
        ctx.textAlign = 'left';
      }
    }
  }

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
      return this;
    };
  }

  window.ImbaKeeperGame = ImbaKeeperGame;
})();
