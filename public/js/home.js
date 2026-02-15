(function() {
  'use strict';
  const TC = window.TubloxCharacter;
  let userData = null;
  let gamesData = [];
  let thumbAnimations = {};
  let searchQuery = '';

  // ==================== AUTH ====================

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      userData = await res.json();

      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('welcome-name').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;
      document.getElementById('welcome-urus').textContent = userData.urus;
      document.getElementById('welcome-strikes').textContent = userData.dailyStrikes;

      renderSidebarAvatar();
      startWelcomeAvatar();

      if (userData.dailyReward && userData.dailyReward.rewarded) {
        setTimeout(() => showDailyReward(userData.dailyReward), 150);
      }

      return userData;
    } catch (e) {
      window.location.href = '/auth';
      return null;
    }
  }

  // ==================== SIDEBAR AVATAR (Roblox-style bust) ====================

  function renderSidebarAvatar() {
    const canvas = document.getElementById('sidebar-avatar');
    if (!canvas || !userData) return;

    // Higher resolution for crisp rendering
    canvas.width = 80;
    canvas.height = 80;

    TC.drawSidebar(canvas, userData.avatar, userData.equipped || {});
  }

  // ==================== WELCOME AVATAR ====================

  function startWelcomeAvatar() {
    const canvas = document.getElementById('welcome-avatar');
    if (!canvas || !userData) return;
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    function frame(ts) {
      const time = ts / 1000;
      c.clearRect(0, 0, W, H);

      c.fillStyle = '#080808';
      c.fillRect(0, 0, W, H);

      c.strokeStyle = '#0e0e0e';
      c.lineWidth = 0.5;
      for (let x = 0; x < W; x += 15) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 15) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

      c.fillStyle = '#141414';
      c.fillRect(0, H - 30, W, 30);
      c.fillStyle = 'rgba(255,255,255,0.02)';
      c.fillRect(0, H - 30, W, 1);

      const charW = 45;
      const charH = 80;
      const charX = (W - charW) / 2;
      const charY = H - 30 - charH - 2;

      TC.draw(c, charX, charY, charW, charH, 1, 'idle',
        Math.floor(time / 0.5) % 2,
        userData.avatar, null, true, time,
        { equipped: userData.equipped || {} }
      );

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ==================== LOAD GAMES ====================

  async function loadGames() {
    const loadingEl = document.getElementById('games-loading');
    const emptyEl = document.getElementById('games-empty');
    const gridEl = document.getElementById('games-grid');

    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error('Failed to load games');
      gamesData = await res.json();

      loadingEl.style.display = 'none';

      if (gamesData.length === 0) {
        emptyEl.style.display = 'flex';
        gridEl.style.display = 'none';
        return;
      }

      renderGames();
      updateOnline();

    } catch (e) {
      console.error('[loadGames]', e);
      loadingEl.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <span style="color:#ef4444">Failed to load games</span>
        <button class="btn-retry" onclick="location.reload()">Retry</button>
      `;
    }
  }

  // ==================== RENDER GAMES ====================

  function renderGames() {
    const emptyEl = document.getElementById('games-empty');
    const gridEl = document.getElementById('games-grid');
    const noResults = document.getElementById('search-no-results');

    Object.keys(thumbAnimations).forEach(key => {
      if (thumbAnimations[key]) cancelAnimationFrame(thumbAnimations[key]);
    });
    thumbAnimations = {};

    let filtered = [...gamesData];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
      );
    }

    if (gamesData.length === 0) {
      emptyEl.style.display = 'flex';
      gridEl.style.display = 'none';
      noResults.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';

    if (filtered.length === 0) {
      gridEl.style.display = 'none';
      noResults.style.display = 'flex';
      return;
    }

    noResults.style.display = 'none';
    gridEl.style.display = 'grid';
    gridEl.innerHTML = '';

    filtered.forEach((game, i) => {
      const card = createGameCard(game);
      card.style.animationDelay = `${i * 0.04}s`;
      gridEl.appendChild(card);
    });

    requestAnimationFrame(() => {
      filtered.forEach(game => {
        if (game.status === 'coming_soon') return;
        const canvas = document.getElementById(`thumb-${game.slug}`);
        if (canvas) startThumbnailAnimation(canvas, game);
      });
    });
  }

  // ==================== GAME CARD ====================

  function createGameCard(game) {
    const card = document.createElement('div');
    card.className = `game-card${game.status === 'coming_soon' ? ' game-card-soon' : ''}`;

    if (game.status === 'coming_soon') {
      card.innerHTML = `
        <div class="game-thumb game-thumb-soon">
          <div class="soon-content">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
            <span class="soon-text">COMING SOON</span>
          </div>
        </div>
        <div class="game-info">
          <div class="game-info-left">
            <h3>${escapeHtml(game.name)}</h3>
            <p>${escapeHtml(game.description)}</p>
          </div>
        </div>
      `;
    } else {
      const canvasId = `thumb-${game.slug}`;
      card.innerHTML = `
        <div class="game-thumb">
          <canvas id="${canvasId}" width="400" height="225"></canvas>
          <div class="game-overlay"></div>
        </div>
        <div class="game-info">
          <div class="game-info-left">
            <h3>${escapeHtml(game.name)}</h3>
            <p>${escapeHtml(game.description)}</p>
          </div>
          <div class="game-info-right">
            <span class="online-dot"></span>
            <span class="online-count" id="online-${game.slug}">0</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => { window.location.href = `/games/${game.slug}`; });
    }

    return card;
  }

  // ==================== THUMBNAIL ANIMATIONS ====================

  function startThumbnailAnimation(canvas, game) {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const style = game.thumbnail?.style || 'default';
    const label = game.thumbnail?.label || game.name.toUpperCase();
    const sublabel = game.thumbnail?.sublabel || '';
    let at = 0;

    if (style === 'custom' && game.thumbnail?.customImage) {
      const img = new Image();
      img.onload = () => { c.drawImage(img, 0, 0, W, H); };
      img.onerror = () => { drawDefault(); };
      img.src = game.thumbnail.customImage;
      return;
    }

    function grid() {
      c.strokeStyle = '#0f0f0f'; c.lineWidth = 0.5;
      for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    }

    function drawLabel() {
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, W, H);
      c.font = '900 22px Inter'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, W / 2, H / 2 - 4);
      if (sublabel) { c.font = '600 10px Inter'; c.fillStyle = '#555'; c.fillText(sublabel, W / 2, H / 2 + 16); }
      c.restore();
    }

    function drawDefault() { c.fillStyle = '#080808'; c.fillRect(0, 0, W, H); grid(); drawLabel(); }

    if (style === 'platformer') {
      (function fp(ts) {
        at += 0.016; const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H); grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 40, W, 40);
        c.fillStyle = '#222'; c.fillRect(40, H - 90, 70, 8); c.fillRect(180, H - 115, 70, 8);
        TC.draw(c, 50, H - 90 - 38, 22, 34, 1, 'run', Math.floor(at / 0.12) % 4, { bodyColor: '#FFF', headColor: '#FFF', eyeColor: '#000' }, null, false, time, {});
        TC.draw(c, 190, H - 115 - 38, 22, 34, -1, Math.sin(time * 2) > 0 ? 'jump' : 'idle', 0, { bodyColor: '#CCC', headColor: '#DDD', eyeColor: '#000' }, null, false, time, {});
        drawLabel();
        thumbAnimations[`thumb-${game.slug}`] = requestAnimationFrame(fp);
      })(0);
    } else if (style === 'pvp') {
      (function fp(ts) {
        at += 0.016; const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H); grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 45, W, 45);
        c.fillStyle = '#222'; c.fillRect(W / 2 - 50, H - 90, 100, 8);
        const atk = Math.sin(time * 4) > 0.7;
        TC.draw(c, W / 2 - 30, H - 90 - 38, 22, 34, 1, 'idle', 0, { bodyColor: '#FF4444', headColor: '#FF6666', eyeColor: '#000' }, null, false, time, { activeItem: 'sword', attacking: atk, attackProgress: atk ? 0.4 : 0 });
        TC.draw(c, W / 2 + 8, H - 90 - 38, 22, 34, -1, 'idle', 0, { bodyColor: '#4488FF', headColor: '#66AAFF', eyeColor: '#000' }, null, false, time, { activeItem: 'sword', attacking: !atk, attackProgress: !atk ? 0.4 : 0 });
        drawLabel();
        thumbAnimations[`thumb-${game.slug}`] = requestAnimationFrame(fp);
      })(0);
    } else {
      (function fp(ts) {
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H); grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 45, W, 45);
        TC.draw(c, W / 2 - 11, H - 45 - 38, 22, 34, 1, 'idle', Math.floor(time / 0.5) % 2, { bodyColor: '#AAA', headColor: '#BBB', eyeColor: '#000' }, null, false, time, {});
        drawLabel();
        thumbAnimations[`thumb-${game.slug}`] = requestAnimationFrame(fp);
      })(0);
    }
  }

  // ==================== SEARCH ====================

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderGames();
  });

  // ==================== ONLINE ====================

  async function updateOnline() {
    try {
      const res = await fetch('/api/online');
      const data = await res.json();
      gamesData.forEach(game => {
        const el = document.getElementById(`online-${game.slug}`);
        if (el) el.textContent = data[game.slug] || 0;
      });
    } catch (e) {}
  }

  // ==================== DAILY REWARD ====================

  function showDailyReward(reward) {
    const el = document.getElementById('daily-reward');
    if (!el) return;

    const strikeNum = document.getElementById('daily-strike-num');
    const earnedNum = document.getElementById('daily-earned-num');
    const totalAmount = document.getElementById('daily-total-amount');
    const resetMsg = document.getElementById('streak-reset-msg');
    const barFill = document.getElementById('strike-bar-fill');
    const nextEl = document.getElementById('daily-next');
    const claimBtn = document.getElementById('btn-claim');

    if (strikeNum) strikeNum.textContent = reward.dailyStrikes;
    if (earnedNum) earnedNum.textContent = `+${reward.rewardAmount}`;
    if (totalAmount) totalAmount.textContent = reward.totalUrus;
    if (resetMsg) resetMsg.style.display = reward.streakReset ? 'block' : 'none';

    if (barFill) {
      const pct = Math.min(100, (reward.dailyStrikes / 15) * 100);
      barFill.style.width = '0%';
      setTimeout(() => { barFill.style.width = pct + '%'; }, 200);
    }

    [1, 5, 10, 15].forEach(day => {
      const dot = document.getElementById(`ms-${day}`);
      if (dot) {
        dot.classList.remove('active');
        if (reward.dailyStrikes >= day) setTimeout(() => dot.classList.add('active'), 300 + day * 50);
      }
    });

    if (nextEl) {
      const next = reward.nextMilestone;
      if (next && next.day) {
        const daysLeft = next.day - reward.dailyStrikes;
        nextEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>${daysLeft} day${daysLeft !== 1 ? 's' : ''} until +${next.reward} Urus/day</span>`;
      } else {
        nextEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Max reward! +6 Urus/day</span>`;
      }
    }

    el.style.display = 'block';

    if (claimBtn) {
      const newBtn = claimBtn.cloneNode(true);
      claimBtn.parentNode.replaceChild(newBtn, claimBtn);
      newBtn.addEventListener('click', () => { el.style.display = 'none'; });
    }

    const overlay = el.querySelector('.daily-reward-overlay');
    if (overlay) {
      const newO = overlay.cloneNode(true);
      overlay.parentNode.replaceChild(newO, overlay);
      newO.addEventListener('click', () => { el.style.display = 'none'; });
    }
  }

  // ==================== UTILS ====================

  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  // ==================== LOGOUT ====================

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ==================== INIT ====================

  async function init() {
    await checkAuth();
    await loadGames();
    setInterval(updateOnline, 10000);
  }

  init();
})();