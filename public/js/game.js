(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  const LERP_SPEED = 0.15;
  const SEND_RATE = 50;
  const ATTACK_DURATION = 400; // ms

  const urlParams = new URLSearchParams(window.location.search);
  const placeName = urlParams.get('place') || 'platformer';

  function getToken() { const m = document.cookie.match(/(?:^|; )token=([^;]*)/); return m ? m[1] : null; }
  const token = getToken();
  if (!token) { window.location.href = '/auth'; return; }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let gameReady = false, myPlayer = null, myId = null, placeData = null;
  let remotePlayers = {}, camera = { x: 0, y: 0 }, keys = {};
  let chatOpen = false, escMenuOpen = false, lastSendTime = 0;
  let frameCount = 0, fps = 60, lastFpsTime = 0, animTime = 0;

  // Death animation
  let deathAnim = { active: false, timer: 0, duration: 1.5 };

  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);

  const socket = io();

  function setLoading(p, t) {
    document.getElementById('loader-fill').style.width = p + '%';
    document.getElementById('loader-text').textContent = t;
  }
  setLoading(20, 'Connecting...');

  socket.on('connect', () => { setLoading(40, 'Authenticating...'); socket.emit('join-game', { token, place: placeName }); });

  socket.on('game-init', (data) => {
    setLoading(60, 'Loading TuGame...');
    placeData = data.place; myPlayer = data.player; myId = data.player.id;
    myPlayer.currentCheckpointIndex = -1;
    myPlayer.attackStartTime = 0;
    remotePlayers = {};
    for (const [id, p] of Object.entries(data.players)) {
      if (id !== myId) remotePlayers[id] = { ...p, targetX: p.x, targetY: p.y, displayX: p.x, displayY: p.y, attackStartTime: 0 };
    }
    document.getElementById('hud-place').textContent = data.place.name;
    updatePlayerCount();
    setLoading(100, 'Ready!');
    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls.style.opacity = '0';
      setTimeout(() => { ls.style.display = 'none'; gameReady = true; addSystem(`Welcome to ${data.place.name}!`); }, 500);
    }, 400);
  });

  socket.on('player-joined', (p) => {
    remotePlayers[p.id] = { ...p, targetX: p.x, targetY: p.y, displayX: p.x, displayY: p.y, attackStartTime: 0 };
    updatePlayerCount(); addSystem(`${p.username} joined`);
  });

  socket.on('player-left', (d) => {
    const p = remotePlayers[d.id]; if (p) addSystem(`${p.username} left`);
    delete remotePlayers[d.id]; updatePlayerCount();
    if (escMenuOpen) updateEscMenu();
  });

  socket.on('player-moved', (d) => {
    const p = remotePlayers[d.id]; if (!p) return;
    p.targetX = d.x; p.targetY = d.y;
    p.vx = d.vx; p.vy = d.vy;
    p.direction = d.direction; p.state = d.state; p.frame = d.frame;
    p.activeSlot = d.activeSlot; p.hp = d.hp;
  });

  socket.on('player-respawn', (d) => {
    if (myPlayer) {
      // Start death animation before respawn
      deathAnim.active = true;
      deathAnim.timer = 0;
      deathAnim.oldX = myPlayer.x;
      deathAnim.oldY = myPlayer.y;
      deathAnim.newX = d.x;
      deathAnim.newY = d.y;
      deathAnim.newHp = d.hp;
    }
  });

  socket.on('player-hit', (d) => {
    if (myPlayer) {
      myPlayer.hp = d.hp;
      myPlayer.vx += d.knockX;
      myPlayer.vy += d.knockY;
    }
  });

  socket.on('player-attack', (d) => {
    const p = remotePlayers[d.id];
    if (p) { p.attacking = true; p.attackStartTime = Date.now(); }
  });

  socket.on('kill-feed', (d) => addSystem(`⚔ ${d.killer} killed ${d.victim}`));
  socket.on('chat-message', (d) => addChat(d.username, d.msg));
  socket.on('error-msg', (m) => { alert(m); window.location.href = '/home'; });

  // INPUT
  window.addEventListener('keydown', (e) => {
    if (chatOpen) {
      if (e.key === 'Enter') { const m = document.getElementById('chat-input').value.trim(); if (m) socket.emit('chat-message', { msg: m }); closeChat(); e.preventDefault(); return; }
      if (e.key === 'Escape') { closeChat(); e.preventDefault(); return; }
      return;
    }
    if (e.key === 'Escape') { toggleEsc(); e.preventDefault(); return; }
    if (escMenuOpen) return;
    if (e.key === 'Enter') { openChat(); e.preventDefault(); return; }
    if (e.key >= '1' && e.key <= '4') {
      const slot = parseInt(e.key) - 1;
      if (myPlayer) { myPlayer.activeSlot = slot; socket.emit('switch-slot', { slot }); }
      e.preventDefault(); return;
    }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { keys = {}; });

  // Attack on click
  canvas.addEventListener('mousedown', (e) => {
    if (!gameReady || escMenuOpen || chatOpen || !myPlayer || deathAnim.active) return;
    if (e.button === 0) {
      const item = myPlayer.inventory?.[myPlayer.activeSlot];
      if (item && item.id === 'sword') {
        const now = Date.now();
        if (now - myPlayer.attackStartTime > ATTACK_DURATION) {
          socket.emit('attack', {});
          myPlayer.attacking = true;
          myPlayer.attackStartTime = now;
        }
      }
    }
  });

  function openChat() { chatOpen = true; document.getElementById('chat-input-container').style.display = 'block'; const ci = document.getElementById('chat-input'); ci.value = ''; ci.focus(); keys = {}; }
  function closeChat() { chatOpen = false; document.getElementById('chat-input-container').style.display = 'none'; document.getElementById('chat-input').blur(); keys = {}; }

  function addChat(u, m) {
    const d = document.createElement('div'); d.className = 'chat-msg';
    d.innerHTML = `<span class="chat-user">${esc(u)}:</span><span class="chat-text">${esc(m)}</span>`;
    const cm = document.getElementById('chat-messages');
    cm.appendChild(d); cm.scrollTop = cm.scrollHeight;
    setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 10000);
  }

  function addSystem(m) {
    const d = document.createElement('div'); d.className = 'chat-msg system'; d.textContent = m;
    const cm = document.getElementById('chat-messages');
    cm.appendChild(d); cm.scrollTop = cm.scrollHeight;
    setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 5000);
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ESC MENU
  function toggleEsc() { escMenuOpen = !escMenuOpen; document.getElementById('esc-menu').style.display = escMenuOpen ? 'block' : 'none'; keys = {}; if (escMenuOpen) updateEscMenu(); }

  function updateEscMenu() {
    const list = document.getElementById('menu-player-list'); list.innerHTML = '';
    const all = []; if (myPlayer) all.push({ ...myPlayer, isMe: true });
    for (const [id, p] of Object.entries(remotePlayers)) all.push({ ...p, isMe: false });
    document.getElementById('menu-player-count').textContent = `(${all.length})`;
    all.forEach(p => {
      const item = document.createElement('div'); item.className = 'player-list-item';
      const av = document.createElement('div'); av.className = 'player-avatar-mini';
      const mc = document.createElement('canvas'); mc.width = 32; mc.height = 32; av.appendChild(mc);
      TC.drawMini(mc, p.avatar);
      const nm = document.createElement('span'); nm.className = 'player-name'; nm.textContent = p.username;
      item.appendChild(av); item.appendChild(nm);
      if (p.isMe) { const y = document.createElement('span'); y.className = 'player-you'; y.textContent = 'YOU'; item.appendChild(y); }
      list.appendChild(item);
    });
  }

  document.getElementById('btn-resume').addEventListener('click', () => toggleEsc());
  document.getElementById('btn-leave').addEventListener('click', () => { window.location.href = '/home'; });

  // RESET button
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!myPlayer || !placeData) return;
    myPlayer.x = placeData.spawnX;
    myPlayer.y = placeData.spawnY;
    myPlayer.vx = 0; myPlayer.vy = 0;
    myPlayer.hp = myPlayer.maxHp || 100;
    myPlayer.currentCheckpointIndex = -1;
    myPlayer.checkpoint = { x: placeData.spawnX, y: placeData.spawnY };
    toggleEsc();
    addSystem('Reset to spawn');
  });

  function updatePlayerCount() { const c = 1 + Object.keys(remotePlayers).length; document.getElementById('hud-players').textContent = `${c} player${c !== 1 ? 's' : ''}`; }

  // PHYSICS
  function updatePlayer(dt) {
    if (!myPlayer || !placeData || !gameReady || escMenuOpen || chatOpen) return;

    // Death animation
    if (deathAnim.active) {
      deathAnim.timer += dt;
      if (deathAnim.timer >= deathAnim.duration) {
        deathAnim.active = false;
        myPlayer.x = deathAnim.newX;
        myPlayer.y = deathAnim.newY;
        myPlayer.vx = 0; myPlayer.vy = 0;
        myPlayer.hp = deathAnim.newHp;
      }
      return;
    }

    const p = myPlayer;
    let mx = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    const wj = keys['KeyW'] || keys['ArrowUp'] || keys['Space'];
    if (mx !== 0) p.direction = mx;
    p.vx = mx * placeData.playerSpeed;
    p.vy += placeData.gravity;
    if (p.vy > placeData.maxFallSpeed) p.vy = placeData.maxFallSpeed;
    if (wj && p.onGround) { p.vy = placeData.jumpForce; p.onGround = false; }
    p.x += p.vx; resolve(p, 'x');
    p.y += p.vy; p.onGround = false; resolve(p, 'y');

    if (!p.onGround) p.state = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 0.5) p.state = 'run'; else p.state = 'idle';
    animTime += dt;
    if (p.state === 'run') p.frame = Math.floor(animTime / 0.1) % 4;
    else if (p.state === 'idle') p.frame = Math.floor(animTime / 0.5) % 2;
    else p.frame = 0;

    // Attack timer
    const now = Date.now();
    if (p.attacking && now - p.attackStartTime > ATTACK_DURATION) {
      p.attacking = false;
    }

    // Checkpoints
    if (placeData.checkpoints) {
      placeData.checkpoints.forEach((cp, i) => {
        if (i > p.currentCheckpointIndex && ov(p.x, p.y, p.width, p.height, cp.x, cp.y, cp.w, cp.h)) {
          p.currentCheckpointIndex = i; p.checkpoint = { x: cp.x, y: cp.y - 10 };
          socket.emit('checkpoint-reached', p.checkpoint); addSystem('Checkpoint!');
        }
      });
    }

    if (now - lastSendTime > SEND_RATE) {
      socket.emit('player-update', { x: p.x, y: p.y, vx: p.vx, vy: p.vy, direction: p.direction, state: p.state, frame: p.frame, onGround: p.onGround, activeSlot: p.activeSlot, attacking: p.attacking });
      lastSendTime = now;
    }
  }

  function resolve(p, axis) {
    if (!placeData.platforms) return;
    for (const pl of placeData.platforms) {
      if (ov(p.x, p.y, p.width, p.height, pl.x, pl.y, pl.w, pl.h)) {
        if (axis === 'x') { if (p.vx > 0) p.x = pl.x - p.width; else if (p.vx < 0) p.x = pl.x + pl.w; p.vx = 0; }
        else { if (p.vy > 0) { p.y = pl.y - p.height; p.vy = 0; p.onGround = true; } else if (p.vy < 0) { p.y = pl.y + pl.h; p.vy = 0; } }
      }
    }
  }

  function ov(x1, y1, w1, h1, x2, y2, w2, h2) { return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2; }

  function updateCamera() {
    if (!myPlayer) return;
    let tx, ty;
    if (deathAnim.active) {
      tx = deathAnim.oldX + myPlayer.width / 2 - canvas.width / 2;
      ty = deathAnim.oldY + myPlayer.height / 2 - canvas.height / 2;
    } else {
      tx = myPlayer.x + myPlayer.width / 2 - canvas.width / 2;
      ty = myPlayer.y + myPlayer.height / 2 - canvas.height / 2;
    }
    camera.x += (tx - camera.x) * 0.08;
    camera.y += (ty - camera.y) * 0.08;
  }

  // RENDER
  function render() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameReady || !placeData || !myPlayer) return;
    const time = Date.now() / 1000;
    const now = Date.now();

    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // Grid — single batch
    const sx = Math.floor(camera.x / 60) * 60, sy = Math.floor(camera.y / 60) * 60;
    const ex = sx + canvas.width + 120, ey = sy + canvas.height + 120;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = sx; x <= ex; x += 60) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
    for (let y = sy; y <= ey; y += 60) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
    ctx.stroke();

    // Checkpoints
    if (placeData.checkpoints) {
      placeData.checkpoints.forEach((cp, i) => {
        const active = myPlayer.currentCheckpointIndex >= i;
        const glow = Math.sin(time * 3) * 0.3 + 0.7;
        ctx.fillStyle = active ? '#4ade80' : '#444';
        ctx.fillRect(cp.x + 18, cp.y - 30, 3, 70);
        ctx.fillStyle = active ? `rgba(74,222,128,${glow})` : 'rgba(100,100,100,0.5)';
        ctx.beginPath(); ctx.moveTo(cp.x + 21, cp.y - 30); ctx.lineTo(cp.x + 45, cp.y - 20); ctx.lineTo(cp.x + 21, cp.y - 10); ctx.fill();
      });
    }

    // Platforms
    placeData.platforms.forEach(pl => {
      if (pl.x + pl.w < camera.x - 50 || pl.x > camera.x + canvas.width + 50) return;
      if (pl.y + pl.h < camera.y - 50 || pl.y > camera.y + canvas.height + 50) return;
      ctx.fillStyle = pl.color || '#333';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(pl.x, pl.y, pl.w, 2);
    });

    // Remote players
    for (const [id, p] of Object.entries(remotePlayers)) {
      p.displayX += (p.targetX - p.displayX) * LERP_SPEED;
      p.displayY += (p.targetY - p.displayY) * LERP_SPEED;

      // Attack progress for remote
      let atkProgress = 0;
      if (p.attacking && p.attackStartTime) {
        atkProgress = Math.min(1, (now - p.attackStartTime) / ATTACK_DURATION);
        if (atkProgress >= 1) p.attacking = false;
      }

      const item = p.inventory?.[p.activeSlot];
      TC.draw(ctx, p.displayX, p.displayY, p.width, p.height, p.direction, p.state, p.frame, p.avatar, p.username, false, time, {
        activeItem: item?.id, attacking: p.attacking, attackProgress: atkProgress,
        hp: p.hp, maxHp: p.maxHp || 100
      });
    }

    // My player
    if (deathAnim.active) {
      // Death animation: spin and fade
      const t = deathAnim.timer / deathAnim.duration;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const deathX = deathAnim.oldX + myPlayer.width / 2;
      const deathY = deathAnim.oldY + myPlayer.height / 2;
      ctx.translate(deathX, deathY - t * 30);
      ctx.rotate(t * Math.PI * 2);
      ctx.translate(-deathX, -(deathY - t * 30));

      TC.draw(ctx, deathAnim.oldX, deathAnim.oldY - t * 30, myPlayer.width, myPlayer.height, myPlayer.direction, 'idle', 0, myPlayer.avatar, myPlayer.username, true, time, { isDead: true });

      ctx.restore();

      // Death particles
      for (let i = 0; i < 5; i++) {
        const px = deathAnim.oldX + myPlayer.width / 2 + Math.sin(time * 10 + i * 1.3) * 30 * t;
        const py = deathAnim.oldY + myPlayer.height / 2 - t * 40 + Math.cos(time * 8 + i * 2) * 20 * t;
        ctx.fillStyle = `rgba(255, 68, 68, ${0.8 - t})`;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    } else {
      let myAtkProgress = 0;
      if (myPlayer.attacking && myPlayer.attackStartTime) {
        myAtkProgress = Math.min(1, (now - myPlayer.attackStartTime) / ATTACK_DURATION);
      }
      const myItem = myPlayer.inventory?.[myPlayer.activeSlot];
      TC.draw(ctx, myPlayer.x, myPlayer.y, myPlayer.width, myPlayer.height, myPlayer.direction, myPlayer.state, myPlayer.frame, myPlayer.avatar, myPlayer.username, true, time, {
        activeItem: myItem?.id, attacking: myPlayer.attacking, attackProgress: myAtkProgress,
        hp: myPlayer.hp, maxHp: myPlayer.maxHp || 100
      });
    }

    ctx.restore();

    // INVENTORY HUD
    if (myPlayer.inventory) drawInventoryHUD();
  }

  function drawInventoryHUD() {
    const inv = myPlayer.inventory;
    const slotSize = 52, gap = 6;
    const totalW = inv.length * slotSize + (inv.length - 1) * gap;
    const startX = canvas.width / 2 - totalW / 2;
    const startY = canvas.height - 70;

    for (let i = 0; i < inv.length; i++) {
      const x = startX + i * (slotSize + gap);
      const active = i === myPlayer.activeSlot;

      ctx.fillStyle = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, startY, slotSize, slotSize);
      ctx.strokeStyle = active ? '#fff' : '#333';
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(x, startY, slotSize, slotSize);

      if (inv[i]) {
        if (inv[i].id === 'sword') {
          ctx.save();
          ctx.translate(x + slotSize / 2, startY + slotSize / 2);
          ctx.rotate(-45 * Math.PI / 180);
          // Handle
          ctx.fillStyle = '#8B6914'; ctx.fillRect(-2, -3, 4, 6);
          // Guard
          ctx.fillStyle = '#CCAA00'; ctx.fillRect(-4, 3, 8, 2);
          // Blade
          ctx.fillStyle = '#CCC'; ctx.fillRect(-1, 5, 3, 16);
          ctx.fillStyle = '#EEE'; ctx.fillRect(-1, 5, 1, 16);
          // Tip
          ctx.fillStyle = '#DDD';
          ctx.beginPath(); ctx.moveTo(-1, 21); ctx.lineTo(2, 21); ctx.lineTo(0.5, 24); ctx.fill();
          ctx.restore();
        }
        ctx.font = '600 8px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#888';
        ctx.fillText(inv[i].name, x + slotSize / 2, startY + slotSize - 4);
      }

      ctx.font = '600 9px Inter'; ctx.textAlign = 'left';
      ctx.fillStyle = active ? '#fff' : '#444';
      ctx.fillText(String(i + 1), x + 4, startY + 12);
    }

    // HP bar
    if (placeData.type === 'pvp' && myPlayer.hp !== undefined) {
      const barW = 200, barH = 8;
      const bx = canvas.width / 2 - barW / 2;
      const by = startY - 20;
      ctx.fillStyle = '#222'; ctx.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, myPlayer.hp / (myPlayer.maxHp || 100));
      ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444';
      ctx.fillRect(bx, by, barW * pct, barH);
      ctx.font = '600 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#888';
      ctx.fillText(`${Math.max(0, Math.round(myPlayer.hp))} HP`, canvas.width / 2, by - 4);
    }
  }

  function updateFps() {
    frameCount++;
    const now = Date.now();
    if (now - lastFpsTime >= 1000) {
      fps = frameCount; frameCount = 0; lastFpsTime = now;
      document.getElementById('hud-fps').textContent = `${fps} FPS`;
    }
  }

  let lastTime = performance.now();
  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    updatePlayer(dt);
    updateCamera();
    render();
    updateFps();
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
})();