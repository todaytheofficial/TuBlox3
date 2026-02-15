(function() {
  'use strict';
  const TC = window.TubloxCharacter;
  let userData = null;
  let gameData = null;

  // ==================== AUTH ====================
    function startSidebarAvatar() {
       const canvas = document.getElementById('sidebar-avatar');
       if (!canvas) return;
       const c = canvas.getContext('2d');
       const W = canvas.width, H = canvas.height;
   
       function frame(ts) {
         const time = ts / 1000;
         c.clearRect(0, 0, W, H);
         c.fillStyle = '#0e0e0e';
         c.fillRect(0, 0, W, H);
         TC.draw(c, W / 2 - 8, 2, 16, 28, 1, 'idle', Math.floor(time / 0.5) % 2,
           userData.avatar, null, false, time, { equipped: userData.equipped || {} });
         requestAnimationFrame(frame);
       }
       requestAnimationFrame(frame);
     }

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      userData = await res.json();

      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;

      startSidebarAvatar()
      return userData;
    } catch (e) {
      window.location.href = '/auth';
      return null;
    }
  }

  // ==================== GET SLUG FROM URL ====================

  function getSlugFromUrl() {
    const parts = window.location.pathname.split('/');
    // /games/:slug
    return parts[2] || null;
  }

  // ==================== LOAD GAME DETAILS ====================

  async function loadGameDetails() {
    const loadingEl = document.getElementById('page-loading');
    const errorEl = document.getElementById('page-error');
    const detailsEl = document.getElementById('game-details');

    const slug = getSlugFromUrl();
    if (!slug) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      document.getElementById('error-message').textContent = 'No game specified.';
      return;
    }

    try {
      const res = await fetch(`/api/games/${slug}/details`);
      if (!res.ok) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'flex';
        if (res.status === 404) {
          document.getElementById('error-message').textContent = 'This game doesn\'t exist or has been removed.';
        } else {
          document.getElementById('error-message').textContent = 'Failed to load game information.';
        }
        return;
      }

      gameData = await res.json();

      loadingEl.style.display = 'none';
      detailsEl.style.display = 'block';

      populateGameDetails();
      startThumbnailAnimation();
      drawGameAvatar();
      startOnlineUpdates();

      document.title = `Tublox - ${gameData.name}`;

    } catch (e) {
      console.error('[loadGameDetails]', e);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      document.getElementById('error-message').textContent = 'An error occurred while loading.';
    }
  }

  // ==================== POPULATE ====================

  function populateGameDetails() {
    document.getElementById('game-name').textContent = gameData.name;
    document.getElementById('game-author').textContent = gameData.author;
    document.getElementById('game-description').textContent = gameData.description || 'No description provided.';
    document.getElementById('game-online').textContent = gameData.onlineCount || 0;
    document.getElementById('game-plays').textContent = formatNumber(gameData.totalPlays || 0);
    document.getElementById('game-max-players').textContent = gameData.maxPlayers || 20;
    document.getElementById('game-type').textContent = gameData.type || 'platformer';
    document.getElementById('game-id').textContent = gameData.gameId || gameData.slug;
    document.getElementById('game-slug').textContent = gameData.slug;
    document.getElementById('game-created').textContent = formatDate(gameData.createdAt);
    document.getElementById('game-updated').textContent = formatDate(gameData.updatedAt);
  }

  // ==================== THUMBNAIL ====================

  function startThumbnailAnimation() {
    const canvas = document.getElementById('game-thumbnail');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const thumb = gameData.thumbnail || {};
    const style = thumb.style || 'default';

    // Custom image
    if (style === 'custom' && thumb.customImage) {
      const img = new Image();
      img.onload = () => {
        c.drawImage(img, 0, 0, W, H);
      };
      img.onerror = () => {
        drawDefaultThumbnail(c, W, H);
      };
      img.src = thumb.customImage;
      return;
    }

    // Animated thumbnails
    const label = thumb.label || gameData.name.toUpperCase();
    const sublabel = thumb.sublabel || '';

    function drawGrid() {
      c.strokeStyle = '#0f0f0f';
      c.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }
    }

    function drawLabel() {
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.fillRect(0, 0, W, H);
      c.font = '900 36px Inter';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.fillText(label, W / 2, H / 2 + 8);
      if (sublabel) {
        c.font = '600 14px Inter';
        c.fillStyle = '#555';
        c.fillText(sublabel, W / 2, H / 2 + 32);
      }
    }

    let at = 0;

    if (gameData.type === 'platformer') {
      (function frame(ts) {
        at += 0.016;
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        drawGrid();

        // Floor
        c.fillStyle = '#1a1a1a';
        c.fillRect(0, H - 60, W, 60);

        // Platforms
        c.fillStyle = '#2a2a2a';
        c.fillRect(60, H - 140, 120, 12);
        c.fillRect(240, H - 200, 120, 12);
        c.fillRect(420, H - 140, 120, 12);

        // Characters
        TC.draw(c, 80, H - 180, 28, 42, 1, 'run', Math.floor(at / 0.12) % 4,
          { bodyColor: '#FFF', headColor: '#FFF', eyeColor: '#000' }, null, false, time, {});
        TC.draw(c, 260, H - 245, 28, 42, -1, Math.sin(time * 2) > 0 ? 'jump' : 'idle', 0,
          { bodyColor: '#CCC', headColor: '#DDD', eyeColor: '#000' }, null, false, time, {});

        drawLabel();
        requestAnimationFrame(frame);
      })(0);
    } else if (gameData.type === 'pvp') {
      (function frame(ts) {
        at += 0.016;
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        drawGrid();

        c.fillStyle = '#1a1a1a';
        c.fillRect(0, H - 60, W, 60);

        c.fillStyle = '#2a2a2a';
        c.fillRect(W / 2 - 80, H - 150, 160, 12);

        const atk = Math.sin(time * 4) > 0.7;
        TC.draw(c, W / 2 - 50, H - 195, 28, 42, 1, 'idle', 0,
          { bodyColor: '#FF4444', headColor: '#FF6666', eyeColor: '#000' }, null, false, time,
          { activeItem: 'sword', attacking: atk, attackProgress: atk ? 0.4 : 0 });
        TC.draw(c, W / 2 + 20, H - 195, 28, 42, -1, 'idle', 0,
          { bodyColor: '#4488FF', headColor: '#66AAFF', eyeColor: '#000' }, null, false, time,
          { activeItem: 'sword', attacking: !atk, attackProgress: !atk ? 0.4 : 0 });

        drawLabel();
        requestAnimationFrame(frame);
      })(0);
    } else {
      (function frame(ts) {
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        drawGrid();

        c.fillStyle = '#1a1a1a';
        c.fillRect(0, H - 60, W, 60);

        TC.draw(c, W / 2 - 14, H - 105, 28, 42, 1, 'idle', Math.floor(time / 0.5) % 2,
          { bodyColor: '#AAA', headColor: '#BBB', eyeColor: '#000' }, null, false, time, {});

        drawLabel();
        requestAnimationFrame(frame);
      })(0);
    }
  }

  function drawDefaultThumbnail(c, W, H) {
    c.fillStyle = '#080808';
    c.fillRect(0, 0, W, H);
    c.font = '900 24px Inter';
    c.fillStyle = '#333';
    c.textAlign = 'center';
    c.fillText('NO THUMBNAIL', W / 2, H / 2);
  }

  // ==================== GAME AVATAR ====================

  function drawGameAvatar() {
    const canvas = document.getElementById('game-avatar');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Draw a small character as game icon
    function frame(ts) {
      c.clearRect(0, 0, W, H);

      // Background
      c.fillStyle = '#111';
      c.fillRect(0, 0, W, H);

      // Grid
      c.strokeStyle = '#1a1a1a';
      for (let x = 0; x < W; x += 16) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      for (let y = 0; y < H; y += 16) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }

      // Floor
      c.fillStyle = '#222';
      c.fillRect(0, H - 12, W, 12);

      // Character
      const time = ts / 1000;
      TC.draw(c, W / 2 - 8, H / 2 - 8, 16, 24, 1, 'idle',
        Math.floor(time / 0.5) % 2,
        { bodyColor: '#FFF', headColor: '#FFF', eyeColor: '#000' },
        null, false, time, {});

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ==================== ONLINE UPDATES ====================

  function startOnlineUpdates() {
    if (!gameData) return;

    async function update() {
      try {
        const res = await fetch('/api/online');
        const data = await res.json();
        const el = document.getElementById('game-online');
        if (el) el.textContent = data[gameData.slug] || 0;
      } catch (e) {}
    }

    update();
    setInterval(update, 10000);
  }

  // ==================== PLAY ====================

  function playGame() {
    if (!gameData) return;
    window.location.href = `/game?place=${gameData.slug}`;
  }

  // ==================== COPY ====================

  function copyGameId() {
    if (!gameData) return;
    const id = gameData.gameId || gameData.slug;
    navigator.clipboard.writeText(id).then(() => {
      const btn = document.getElementById('btn-copy-id');
      btn.classList.add('copied');
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy ID
        `;
      }, 2000);
    }).catch(() => {});
  }

  // ==================== UTILS ====================

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  document.addEventListener('click', (e) => {
    // Play buttons
    if (e.target.id === 'btn-play' || e.target.id === 'btn-play-sidebar' ||
        e.target.closest('#btn-play') || e.target.closest('#btn-play-sidebar')) {
      e.preventDefault();
      playGame();
    }
    // Copy button
    if (e.target.id === 'btn-copy-id' || e.target.closest('#btn-copy-id')) {
      e.preventDefault();
      copyGameId();
    }
    // Author name click
    if (e.target.id === 'game-author' || e.target.closest('#game-author')) {
      e.preventDefault();
      if (gameData && gameData.author) {
        window.location.href = `/profile/${gameData.author}`;
      }
    }
  });
  // ==================== INIT ====================

  async function init() {
    await checkAuth();
    await loadGameDetails();
  }

  init();
})();