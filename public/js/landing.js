(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  fetch('/api/me').then(res => {
    if (res.ok) {
      document.getElementById('btn-login').style.display = 'none';
      document.getElementById('btn-signup').style.display = 'none';
      document.getElementById('btn-enter').style.display = 'inline-block';
    }
  }).catch(() => {});

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const platforms = [
    { x: 0, y: 260, w: W, h: 60 },
    { x: 40, y: 200, w: 90, h: 14 },
    { x: 180, y: 155, w: 90, h: 14 },
    { x: 320, y: 115, w: 90, h: 14 },
    { x: 170, y: 75, w: 100, h: 14 },
    { x: 30, y: 130, w: 70, h: 14 }
  ];

  function ov(x1,y1,w1,h1,x2,y2,w2,h2) { return x1<x2+w2&&x1+w1>x2&&y1<y2+h2&&y1+h1>y2; }

  function createBot(name, bc, hc, wps, sx, sy) {
    return {
      x: sx, y: sy, w: 26, h: 38, vx: 0, vy: 0,
      onGround: false, direction: 1, state: 'idle', frame: 0,
      username: name,
      avatar: { bodyColor: bc, headColor: hc, eyeColor: '#000' },
      waypoints: wps, wpIndex: 0, jumpCooldown: 0, animTime: 0,
      stuckFrames: 0, lastX: sx, lastY: sy,
      waitTimer: 0
    };
  }

  // Вейпоинты привязаны к платформам (x = середина платформы)
  const bot1 = createBot('Player1', '#FFFFFF', '#FFFFFF', [
    { x: 80, y: 222 },   // ground
    { x: 80, y: 162 },   // plat 1
    { x: 220, y: 117 },  // plat 2
    { x: 360, y: 77 },   // plat 3
    { x: 210, y: 37 },   // plat 4
    { x: 60, y: 92 },    // plat 5
  ], 80, 220);

  const bot2 = createBot('Player2', '#CCCCCC', '#DDDDDD', [
    { x: 380, y: 222 },  // ground right
    { x: 360, y: 77 },   // plat 3
    { x: 220, y: 117 },  // plat 2
    { x: 60, y: 92 },    // plat 5
    { x: 210, y: 37 },   // plat 4
    { x: 380, y: 222 },  // ground
  ], 380, 220);

  const bots = [bot1, bot2];

  const particles = [];
  for (let i = 0; i < 15; i++) {
    particles.push({ x: Math.random()*W, y: Math.random()*H, size: Math.random()*2+0.5, speedY: -(Math.random()*0.15+0.03), alpha: Math.random()*0.12+0.03 });
  }

  function resolveBot(bot, axis) {
    for (const p of platforms) {
      if (ov(bot.x, bot.y, bot.w, bot.h, p.x, p.y, p.w, p.h)) {
        if (axis === 'x') {
          if (bot.vx > 0) bot.x = p.x - bot.w;
          else if (bot.vx < 0) bot.x = p.x + p.w;
          bot.vx = 0;
        } else {
          if (bot.vy > 0) { bot.y = p.y - bot.h; bot.vy = 0; bot.onGround = true; }
          else if (bot.vy < 0) { bot.y = p.y + p.h; bot.vy = 0; }
        }
      }
    }
  }

  function updateBot(bot, dt) {
    // Wait timer (пауза на платформе)
    if (bot.waitTimer > 0) {
      bot.waitTimer -= dt;
      bot.vx = 0;
      bot.state = 'idle';
      bot.animTime += dt;
      bot.frame = Math.floor(bot.animTime / 0.5) % 2;

      // Всё ещё применяем гравитацию
      bot.vy += 0.5;
      if (bot.vy > 10) bot.vy = 10;
      bot.y += bot.vy;
      bot.onGround = false;
      resolveBot(bot, 'y');
      return;
    }

    const target = bot.waypoints[bot.wpIndex];
    const dx = target.x - (bot.x + bot.w / 2);
    const dy = target.y - (bot.y + bot.h);

    // Движение к цели
    let mx = 0;
    if (Math.abs(dx) > 5) mx = dx > 0 ? 1 : -1;
    if (mx !== 0) bot.direction = mx;
    bot.vx = mx * 2.5;

    bot.jumpCooldown -= dt;

    // Проверка застревания
    const movedX = Math.abs(bot.x - bot.lastX);
    const movedY = Math.abs(bot.y - bot.lastY);

    if (movedX < 0.5 && movedY < 0.5 && bot.onGround) {
      bot.stuckFrames++;
    } else {
      bot.stuckFrames = 0;
    }
    bot.lastX = bot.x;
    bot.lastY = bot.y;

    // Если застрял больше 30 кадров — прыгнуть
    if (bot.stuckFrames > 30 && bot.onGround && bot.jumpCooldown <= 0) {
      bot.vy = -10;
      bot.onGround = false;
      bot.jumpCooldown = 0.8;
      bot.stuckFrames = 0;
    }

    // Прыжок к цели которая выше
    if (bot.onGround && bot.jumpCooldown <= 0 && dy < -10) {
      bot.vy = -9.5;
      bot.onGround = false;
      bot.jumpCooldown = 0.7;
    }

    // Гравитация
    bot.vy += 0.5;
    if (bot.vy > 10) bot.vy = 10;

    // Движение
    bot.x += bot.vx;
    resolveBot(bot, 'x');
    bot.y += bot.vy;
    bot.onGround = false;
    resolveBot(bot, 'y');

    // Респавн если упал
    if (bot.y > H + 50) {
      bot.x = bot.waypoints[0].x - bot.w / 2;
      bot.y = 220;
      bot.vx = 0; bot.vy = 0;
      bot.wpIndex = 0;
      bot.stuckFrames = 0;
    }

    // Ограничения по краям
    if (bot.x < 0) bot.x = 0;
    if (bot.x + bot.w > W) bot.x = W - bot.w;

    // Достигли точки?
    const dist = Math.abs(dx);
    if (dist < 12 && bot.onGround) {
      bot.wpIndex = (bot.wpIndex + 1) % bot.waypoints.length;
      // Маленькая пауза
      bot.waitTimer = 0.3 + Math.random() * 0.5;
    }

    // Анимация
    bot.animTime += dt;
    if (!bot.onGround) bot.state = bot.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(bot.vx) > 0.3) bot.state = 'run';
    else bot.state = 'idle';

    if (bot.state === 'run') bot.frame = Math.floor(bot.animTime / 0.1) % 4;
    else if (bot.state === 'idle') bot.frame = Math.floor(bot.animTime / 0.5) % 2;
    else bot.frame = 0;
  }

  let lastT = performance.now();
  function frame(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    const time = ts / 1000;

    bots.forEach(b => updateBot(b, dt));

    c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, W, H);

    // Grid
    c.strokeStyle = '#121212'; c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < W; x += 30) { c.moveTo(x, 0); c.lineTo(x, H); }
    for (let y = 0; y < H; y += 30) { c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();

    // Particles
    particles.forEach(p => {
      p.y += p.speedY; if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
      c.fillStyle = `rgba(255,255,255,${p.alpha})`; c.fillRect(p.x, p.y, p.size, p.size);
    });

    // Platforms
    platforms.forEach(p => {
      c.fillStyle = p.h > 20 ? '#1a1a1a' : '#2a2a2a';
      c.fillRect(p.x, p.y, p.w, p.h);
      c.fillStyle = 'rgba(255,255,255,0.04)';
      c.fillRect(p.x, p.y, p.w, 2);
    });

    // Bots
    bots.forEach(b => TC.draw(c, b.x, b.y, b.w, b.h, b.direction, b.state, b.frame, b.avatar, b.username, false, time, {}));

    // Bottom overlay
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, H - 52, W, 52);
    c.font = '900 20px Inter, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left';
    c.fillText('TUBLOX', 14, H - 24);
    c.font = '600 11px Inter, sans-serif'; c.fillStyle = '#555';
    c.fillText('Multiplayer TuGames', 14, H - 10);

    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    c.fillStyle = `rgba(74,222,128,${pulse})`;
    c.beginPath(); c.arc(W - 22, H - 30, 4, 0, Math.PI * 2); c.fill();
    c.font = '600 10px Inter'; c.fillStyle = '#4ade80'; c.textAlign = 'right';
    c.fillText('LIVE', W - 32, H - 26);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();