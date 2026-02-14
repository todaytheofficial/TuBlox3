(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let myGames = [];
  let deleteGameId = null;

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      const data = await res.json();
      document.getElementById('sidebar-username').textContent = data.username;
      document.getElementById('sidebar-urus').textContent = data.urus;
      document.getElementById('sidebar-strikes').textContent = data.dailyStrikes;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), data.avatar);
      return data;
    } catch (e) {
      window.location.href = '/auth';
      return null;
    }
  }

  async function loadMyGames() {
    const loading = document.getElementById('studio-loading');
    const empty = document.getElementById('studio-empty');
    const grid = document.getElementById('studio-games-grid');

    try {
      const res = await fetch('/api/studio/my-games');
      if (!res.ok) throw new Error();
      myGames = await res.json();

      loading.style.display = 'none';
      document.getElementById('game-count').textContent = `${myGames.length} / 20`;

      if (myGames.length === 0) {
        empty.style.display = 'flex';
        grid.style.display = 'none';
        return;
      }

      empty.style.display = 'none';
      grid.style.display = 'grid';
      grid.innerHTML = '';

      myGames.forEach(game => {
        grid.appendChild(createGameCard(game));
      });
    } catch (e) {
      loading.innerHTML = '<span style="color:#ef4444">Failed to load games</span>';
    }
  }

  function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'studio-game-card';

    const statusClass = game.status === 'public' ? 'status-public' : 'status-private';
    const statusText = game.status === 'public' ? 'Public' : 'Private';
    const timeAgo = getTimeAgo(new Date(game.updatedAt));

    card.innerHTML = `
      <div class="sgc-thumb">
        ${game.thumbnail
          ? `<img src="${escapeHtml(game.thumbnail)}" alt="" class="sgc-thumb-img">`
          : `<div class="sgc-thumb-placeholder">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5">
                 <rect x="2" y="6" width="20" height="12" rx="2"/>
                 <path d="M6 12h4M8 10v4"/>
               </svg>
             </div>`
        }
        <div class="sgc-status ${statusClass}">
          <span class="sgc-status-dot"></span>
          ${statusText}
        </div>
      </div>
      <div class="sgc-info">
        <h3 class="sgc-title">${escapeHtml(game.title)}</h3>
        <p class="sgc-desc">${game.description ? escapeHtml(game.description) : 'No description'}</p>
        <div class="sgc-meta">
          <span class="sgc-plays">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ${game.plays}
          </span>
          <span class="sgc-time">${timeAgo}</span>
        </div>
      </div>
      <div class="sgc-actions">
        <button class="sgc-btn sgc-btn-edit" data-id="${game._id}" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="sgc-btn sgc-btn-delete" data-id="${game._id}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.sgc-btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/studio/edit?id=${game._id}`;
    });

    card.querySelector('.sgc-btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(game._id);
    });

    card.addEventListener('click', () => {
      window.location.href = `/studio/edit?id=${game._id}`;
    });

    return card;
  }

  function openDeleteModal(id) {
    deleteGameId = id;
    document.getElementById('delete-modal').style.display = 'flex';
  }

  document.getElementById('btn-delete-cancel').addEventListener('click', () => {
    document.getElementById('delete-modal').style.display = 'none';
    deleteGameId = null;
  });

  document.getElementById('btn-delete-confirm').addEventListener('click', async () => {
    if (!deleteGameId) return;
    try {
      await fetch(`/api/studio/game/${deleteGameId}`, { method: 'DELETE' });
      document.getElementById('delete-modal').style.display = 'none';
      deleteGameId = null;
      loadMyGames();
    } catch (e) {}
  });

  async function createNewGame() {
    try {
      const res = await fetch('/api/studio/create', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/studio/edit?id=${data.gameId}`;
      } else {
        alert(data.error || 'Failed to create');
      }
    } catch (e) {
      alert('Failed to create game');
    }
  }

  document.getElementById('btn-create-game').addEventListener('click', createNewGame);
  document.getElementById('btn-create-empty')?.addEventListener('click', createNewGame);

  function getTimeAgo(date) {
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
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

  async function init() {
    await checkAuth();
    await loadMyGames();
  }

  init();
})();