(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  const TOTAL_DURATION_MS = ((1 * 60 + 58) * 60 + 30) * 1000;

  let released = false;
  let remainingMs = null;
  let syncedAt = null;
  let isAdmin = false;
  let currentUsername = '';

  function getToken() {
    const m = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return m ? m[1] : null;
  }

  const token = getToken();
  if (!token) { window.location.href = '/auth'; }

  const socket = io();

  // ==================== AUTH ====================
  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return; }
      const data = await res.json();
      currentUsername = data.username;
      document.getElementById('sidebar-username').textContent = data.username;
      document.getElementById('sidebar-urus').textContent = data.urus;
      document.getElementById('sidebar-strikes').textContent = data.dailyStrikes;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), data.avatar);
    } catch (e) {
      window.location.href = '/auth';
    }
  }

  // ==================== SYNC TIME ====================
  async function syncServerTime() {
    try {
      const before = Date.now();
      const res = await fetch('/api/time');
      const after = Date.now();
      const data = await res.json();
      const networkDelay = (after - before) / 2;
      remainingMs = data.remainingMs - networkDelay;
      syncedAt = after;
    } catch (e) {
      if (remainingMs === null) {
        const TARGET = Date.UTC(2026, 1, 14, 9, 25, 30, 0);
        remainingMs = TARGET - Date.now();
        syncedAt = Date.now();
      }
    }
  }

  function getRemainingNow() {
    if (remainingMs === null || syncedAt === null) return null;
    return remainingMs - (Date.now() - syncedAt);
  }

  // ==================== COUNTDOWN ====================
  function updateCountdown() {
    const remaining = getRemainingNow();
    if (remaining === null) return;

    if (remaining <= 0) {
      if (!released) {
        released = true;
        document.getElementById('countdown-container').style.display = 'none';
        document.getElementById('released-container').style.display = 'block';
        startReleaseParticles();
      }
      return;
    }

    // Если было released но теперь не — откатить
    if (released && remaining > 0) {
      released = false;
      document.getElementById('countdown-container').style.display = 'block';
      document.getElementById('released-container').style.display = 'none';
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');

    const elapsed = TOTAL_DURATION_MS - remaining;
    const progress = Math.max(0, Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100));
    document.getElementById('cd-progress').style.width = progress + '%';
  }

  // ==================== SOCKET.IO ====================
  socket.on('connect', () => {
    const statusEl = document.getElementById('studio-status');
    statusEl.classList.add('connected');
    statusEl.querySelector('span:last-child').textContent = 'Connected';

    socket.emit('studio-join', { token });
  });

  socket.on('disconnect', () => {
    const statusEl = document.getElementById('studio-status');
    statusEl.classList.remove('connected');
    statusEl.querySelector('span:last-child').textContent = 'Disconnected';
  });

  socket.on('studio-sync', (data) => {
    remainingMs = data.remainingMs;
    syncedAt = Date.now();
    isAdmin = data.isAdmin;

    if (isAdmin) {
      document.getElementById('admin-panel').style.display = 'block';
      updateOffsetDisplay(data.offsetMs);
    }

    updateCountdown();
  });

  socket.on('studio-timer-update', (data) => {
    remainingMs = data.remainingMs;
    syncedAt = Date.now();

    updateOffsetDisplay(data.offsetMs);
    addLogEntry(data.adjustedBy, data.action, data.amount);
    updateCountdown();
  });

  // ==================== ADMIN FUNCTIONS ====================
  function updateOffsetDisplay(offsetMs) {
    const el = document.getElementById('admin-offset');
    if (!el) return;

    const absMs = Math.abs(offsetMs);
    const sign = offsetMs >= 0 ? '+' : '-';
    const h = Math.floor(absMs / 3600000);
    const m = Math.floor((absMs % 3600000) / 60000);
    const s = Math.floor((absMs % 60000) / 1000);

    let text = sign;
    if (h > 0) text += `${h}h `;
    if (m > 0 || h > 0) text += `${m}m `;
    text += `${s}s`;

    el.textContent = offsetMs === 0 ? '0s (original)' : text.trim();
    el.style.color = offsetMs === 0 ? '#555' : offsetMs > 0 ? '#4ade80' : '#ef4444';
  }

  function addLogEntry(username, action, amount) {
    const list = document.getElementById('admin-log-list');
    const empty = list.querySelector('.admin-log-empty');
    if (empty) empty.remove();

    const actionLabels = {
      'add-hours': `+${amount}h`,
      'sub-hours': `−${amount}h`,
      'add-minutes': `+${amount}m`,
      'sub-minutes': `−${amount}m`,
      'add-seconds': `+${amount}s`,
      'sub-seconds': `−${amount}s`,
      'reset': 'Reset'
    };

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = document.createElement('div');
    item.className = 'admin-log-item';
    item.innerHTML = `<span class="log-action">${actionLabels[action] || action}</span> by ${username} <span class="log-time">${timeStr}</span>`;

    list.insertBefore(item, list.firstChild);

    // Max 20 entries
    while (list.children.length > 20) {
      list.removeChild(list.lastChild);
    }
  }

  // Admin button clicks
  document.querySelectorAll('.admin-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isAdmin) return;
      const action = btn.dataset.action;
      const amount = parseInt(btn.dataset.amount);
      socket.emit('studio-adjust-time', { action, amount });
    });
  });

  // ==================== PARTICLES ====================
  function startBackgroundParticles() {
    const canvas = document.getElementById('studio-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const MAX = 40;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < MAX; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.05
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  function startReleaseParticles() {
    const canvas = document.getElementById('studio-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x: canvas.width / 2, y: canvas.height / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1, life: 1,
        decay: Math.random() * 0.01 + 0.005,
        color: Math.random() > 0.5 ? '#4ade80' : '#fff'
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= p.decay;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (particles.length > 0) requestAnimationFrame(animate);
    }
    animate();
  }

  // ==================== LOGOUT ====================
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ==================== INIT ====================
  async function init() {
    await checkAuth();
    startBackgroundParticles();
    await syncServerTime();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    setInterval(syncServerTime, 5 * 60 * 1000);
  }

  init();
})();