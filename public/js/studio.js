(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let myGames = [];
  let userData = null;
  let deleteGameId = null;
  let currentFilter = 'all';
  let currentSort = 'updated';
  let thumbAnimations = {};

  // ==================== AUTH ====================

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      userData = await res.json();

      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;

      startSidebarAvatar();
      return userData;
    } catch (e) {
      window.location.href = '/auth';
      return null;
    }
  }

  // ==================== SIDEBAR AVATAR ====================

  function startSidebarAvatar() {
    const canvas = document.getElementById('sidebar-avatar');
    if (!canvas || !userData) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    function frame(ts) {
      const time = ts / 1000;
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#111';
      c.fillRect(0, 0, W, H);
      TC.draw(c, W / 2 - 8, 2, 16, 28, 1, 'idle', Math.floor(time / 0.5) % 2,
        userData.avatar, null, false, time, {
          equipped: userData.equipped || {}
        });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ==================== LOAD GAMES ====================

  async function loadMyGames() {
    const loading = document.getElementById('studio-loading');

    try {
      const res = await fetch('/api/studio/my-games');
      if (!res.ok) throw new Error();
      myGames = await res.json();

      loading.style.display = 'none';
      document.getElementById('game-count').textContent = myGames.length;

      cancelAllAnimations();
      renderGames();
    } catch (e) {
      loading.innerHTML = '<span style="color:#ef4444">Failed to load games</span>';
    }
  }

  function cancelAllAnimations() {
    Object.keys(thumbAnimations).forEach(key => {
      if (thumbAnimations[key]) cancelAnimationFrame(thumbAnimations[key]);
    });
    thumbAnimations = {};
  }

  // ==================== RENDER ====================

  function renderGames() {
    const empty = document.getElementById('studio-empty');
    const grid = document.getElementById('studio-games-grid');

    let filtered = [...myGames];

    if (currentFilter === 'public') filtered = filtered.filter(g => g.status === 'public');
    else if (currentFilter === 'private') filtered = filtered.filter(g => g.status === 'private');

    switch (currentSort) {
      case 'updated': filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); break;
      case 'created': filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'name': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'plays': filtered.sort((a, b) => (b.plays || 0) - (a.plays || 0)); break;
    }

    if (filtered.length === 0) {
      empty.style.display = 'flex';
      grid.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '';

    cancelAllAnimations();

    filtered.forEach((game, i) => {
      const card = createGameCard(game, i);
      grid.appendChild(card);
    });

    // Start canvas animations after DOM paint
    requestAnimationFrame(() => {
      filtered.forEach(game => {
        const hasThumb = game.thumbnailData && game.thumbnailData.length > 10;
        if (!hasThumb) startThumbAnim(game);
        drawCreatorAvatar(game._id);
      });
    });
  }

  // ==================== GAME CARD ====================

  function createGameCard(game, index) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.style.animationDelay = `${index * 0.05}s`;

    const isPublic = game.status === 'public';
    const timeStr = getTimeAgo(new Date(game.updatedAt));
    const hasThumb = game.thumbnailData && game.thumbnailData.length > 10;
    const thumbId = `thumb-${game._id}`;
    const creatorId = `creator-${game._id}`;

    let thumbContent;
    if (hasThumb) {
      thumbContent = `<img src="${game.thumbnailData}" alt="" class="game-card-thumb-img" loading="lazy">`;
    } else {
      thumbContent = `<canvas id="${thumbId}" width="400" height="225"></canvas>`;
    }

    card.innerHTML = `
      <div class="game-card-thumb">
        ${thumbContent}
        <div class="card-status ${isPublic ? 'card-status-public' : 'card-status-private'}">
          <span class="card-status-dot"></span>
          ${isPublic ? 'Public' : 'Private'}
        </div>
        <div class="card-actions">
          <button class="card-action-btn card-action-edit" data-id="${game._id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="card-action-btn card-action-delete" data-id="${game._id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
        <div class="game-card-creator">
          <canvas id="${creatorId}" width="22" height="22"></canvas>
          <span class="game-card-creator-name">${escapeHtml(userData ? userData.username : '')}</span>
        </div>
        ${game.published ? '<div class="card-published-badge">PUBLISHED</div>' : ''}
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${escapeHtml(game.title)}</div>
        <div class="game-card-desc">${game.description ? escapeHtml(game.description) : 'No description'}</div>
        <div class="game-card-footer">
          <div class="game-card-stat">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ${game.plays || 0} plays
          </div>
          <div class="game-card-time">${timeStr}</div>
        </div>
      </div>
    `;

    card.querySelector('.card-action-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/studio/edit?id=${game._id}`;
    });

    card.querySelector('.card-action-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(game._id, game.title);
    });

    card.addEventListener('click', () => {
      window.location.href = `/studio/edit?id=${game._id}`;
    });

    return card;
  }

  // ==================== CREATOR AVATAR ====================

  function drawCreatorAvatar(gameId) {
    const canvas = document.getElementById(`creator-${gameId}`);
    if (!canvas || !userData) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    c.clearRect(0, 0, W, H);
    c.fillStyle = '#111';
    c.fillRect(0, 0, W, H);

    TC.draw(c, W / 2 - 5, 0, 10, 18, 1, 'idle', 0,
      userData.avatar, null, false, 0, {
        equipped: userData.equipped || {}
      });
  }

  // ==================== THUMBNAIL ANIMATIONS ====================

  function startThumbAnim(game) {
    const canvasId = `thumb-${game._id}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const seed = simpleHash(game._id);
    const style = seed % 3;
    let at = 0;

    function grid() {
      c.strokeStyle = '#0f0f0f';
      c.lineWidth = 0.5;
      for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    }

    function title() {
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(0, 0, W, H);
      c.font = '900 20px Inter';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';

      let t = game.title || 'Untitled';
      const max = W - 60;
      if (c.measureText(t).width > max) {
        while (c.measureText(t + '…').width > max && t.length > 1) t = t.slice(0, -1);
        t += '…';
      }
      c.fillText(t, W / 2, H / 2 - 6);

      c.font = '600 10px Inter';
      c.fillStyle = '#555';
      c.fillText('TuGame', W / 2, H / 2 + 14);
      c.restore();
    }

    const avatar = userData ? userData.avatar : { bodyColor: '#AAA', headColor: '#BBB', eyeColor: '#000' };
    const equipped = userData ? (userData.equipped || {}) : {};

    if (style === 0) {
      // Single idle character
      (function f(ts) {
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 40, W, 40);
        TC.draw(c, W / 2 - 11, H - 78, 22, 34, 1, 'idle', Math.floor(time / 0.5) % 2,
          avatar, null, false, time, { equipped });
        title();
        thumbAnimations[canvasId] = requestAnimationFrame(f);
      })(0);
    } else if (style === 1) {
      // Platformer
      (function f(ts) {
        at += 0.016;
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 35, W, 35);
        c.fillStyle = '#222'; c.fillRect(50, H - 85, 70, 8); c.fillRect(200, H - 110, 70, 8);
        const rx = 55 + Math.sin(time * 1.5) * 18;
        TC.draw(c, rx, H - 123, 22, 34, 1, 'run', Math.floor(at / 0.12) % 4,
          avatar, null, false, time, { equipped });
        const jy = H - 148 + Math.sin(time * 2) * 8;
        TC.draw(c, 210, jy, 22, 34, -1, Math.sin(time * 2) > 0 ? 'jump' : 'idle', 0,
          avatar, null, false, time, { equipped });
        title();
        thumbAnimations[canvasId] = requestAnimationFrame(f);
      })(0);
    } else {
      // PvP
      (function f(ts) {
        at += 0.016;
        const time = ts / 1000;
        c.fillStyle = '#080808'; c.fillRect(0, 0, W, H);
        grid();
        c.fillStyle = '#1a1a1a'; c.fillRect(0, H - 40, W, 40);
        c.fillStyle = '#222'; c.fillRect(W / 2 - 60, H - 85, 120, 8);
        const atk = Math.sin(time * 4) > 0.7;
        TC.draw(c, W / 2 - 30, H - 123, 22, 34, 1, 'idle', Math.floor(time / 0.5) % 2,
          avatar, null, false, time, { equipped, activeItem: 'sword', attacking: atk, attackProgress: atk ? 0.4 : 0 });
        TC.draw(c, W / 2 + 10, H - 123, 22, 34, -1, 'idle', Math.floor(time / 0.5) % 2,
          avatar, null, false, time, { equipped, activeItem: 'sword', attacking: !atk, attackProgress: !atk ? 0.4 : 0 });
        title();
        thumbAnimations[canvasId] = requestAnimationFrame(f);
      })(0);
    }
  }

  function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  }

  // ==================== DELETE MODAL ====================

  function openDeleteModal(id) {
    deleteGameId = id;
    document.getElementById('delete-modal').style.display = 'flex';
  }

  document.getElementById('btn-delete-cancel').addEventListener('click', () => {
    document.getElementById('delete-modal').style.display = 'none';
    deleteGameId = null;
  });

  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') {
      document.getElementById('delete-modal').style.display = 'none';
      deleteGameId = null;
    }
  });

  document.getElementById('btn-delete-confirm').addEventListener('click', async () => {
    if (!deleteGameId) return;
    const btn = document.getElementById('btn-delete-confirm');
    btn.textContent = 'Deleting...';
    btn.disabled = true;

    try {
      await fetch(`/api/studio/game/${deleteGameId}`, { method: 'DELETE' });
      document.getElementById('delete-modal').style.display = 'none';
      deleteGameId = null;
      await loadMyGames();
    } catch (e) {
      alert('Failed to delete');
    }

    btn.textContent = 'Delete Game';
    btn.disabled = false;
  });

  // ==================== CREATE ====================

  async function createNewGame() {
    const btn = document.getElementById('btn-create-game');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>Creating...</span>';
    btn.disabled = true;

    try {
      const res = await fetch('/api/studio/create', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/studio/edit?id=${data.gameId}`;
      } else {
        alert(data.error || 'Failed to create');
        btn.innerHTML = orig;
        btn.disabled = false;
      }
    } catch (e) {
      alert('Failed to create game');
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }

  document.getElementById('btn-create-game').addEventListener('click', createNewGame);
  document.getElementById('btn-create-empty')?.addEventListener('click', createNewGame);

  // ==================== FILTERS & SORT ====================

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderGames();
    });
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderGames();
  });

  // ==================== UTILS ====================

  function getTimeAgo(date) {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ==================== INIT ====================

  async function init() {
    await checkAuth();
    await loadMyGames();
  }

  init();
})();