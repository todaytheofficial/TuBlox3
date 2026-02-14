(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let myUserData = null;
  let profileData = null;
  let isOwnProfile = false;

  // ==================== GET USERNAME FROM URL ====================

  function getProfileUsername() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // /profile or /profile/username
    if (parts.length >= 2 && parts[0] === 'profile') {
      return parts[1].toLowerCase();
    }
    return null; // own profile
  }

  // ==================== AUTH (sidebar) ====================

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      myUserData = await res.json();

      document.getElementById('sidebar-username').textContent = myUserData.username;
      document.getElementById('sidebar-urus').textContent = myUserData.urus;
      document.getElementById('sidebar-strikes').textContent = myUserData.dailyStrikes;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), myUserData.avatar);

      return myUserData;
    } catch (e) {
      window.location.href = '/auth';
      return null;
    }
  }

  // ==================== LOAD PROFILE ====================

  async function loadProfile() {
    const loadingEl = document.getElementById('page-loading');
    const errorEl = document.getElementById('page-error');
    const contentEl = document.getElementById('profile-content');

    const targetUsername = getProfileUsername();

    try {
      let data;

      if (!targetUsername || (myUserData && targetUsername === myUserData.username.toLowerCase())) {
        // Own profile — use /api/me data + public profile for extra info
        isOwnProfile = true;

        // Redirect to clean URL if visiting /profile without username (already own)
        if (!targetUsername && myUserData) {
          // Stay on /profile, it's the own profile
        }

        const res = await fetch(`/api/profile/${myUserData.username}`);
        if (!res.ok) throw new Error('Failed to load profile');
        data = await res.json();
      } else {
        // Other user's profile
        isOwnProfile = false;
        const res = await fetch(`/api/profile/${targetUsername}`);
        if (!res.ok) {
          loadingEl.style.display = 'none';
          errorEl.style.display = 'flex';
          if (res.status === 404) {
            document.getElementById('error-message').textContent = `User "${targetUsername}" doesn't exist.`;
          } else {
            document.getElementById('error-message').textContent = 'Failed to load profile.';
          }
          return;
        }
        data = await res.json();
      }

      profileData = data;
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';

      populateProfile();
      startProfileAvatar();

      document.title = `Tublox - ${profileData.username}`;

    } catch (e) {
      console.error('[loadProfile]', e);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      document.getElementById('error-message').textContent = 'An error occurred while loading.';
    }
  }

  // ==================== POPULATE ====================

  function populateProfile() {
    const d = profileData;

    // Username
    document.getElementById('profile-username').textContent = d.username;

    // Own profile badge
    if (isOwnProfile) {
      document.getElementById('own-badge').style.display = 'inline-block';
      document.getElementById('btn-edit-bio').style.display = 'inline-block';

      // Nav active highlight
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        if (item.getAttribute('href') === '/profile') {
          item.classList.add('active');
        }
      });
    } else {
      document.getElementById('own-badge').style.display = 'none';
      document.getElementById('btn-edit-bio').style.display = 'none';

      // Viewing badge
      const badge = document.getElementById('viewing-badge');
      badge.style.display = 'inline-flex';
      document.getElementById('viewing-badge-text').textContent = `Viewing ${d.username}'s profile`;

      // Remove active from Profile nav
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        if (item.getAttribute('href') === '/profile') {
          item.classList.remove('active');
        }
      });
    }

    // Currencies
    document.getElementById('profile-urus').textContent = d.urus;
    document.getElementById('profile-strikes').textContent = d.dailyStrikes;

    // Bio
    document.getElementById('profile-bio-text').textContent = d.bio || 'No bio set';

    // Meta
    const joined = new Date(d.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    document.getElementById('profile-joined').textContent = `Joined: ${joined}`;
    document.getElementById('profile-games').textContent = `Games: ${d.gamesPlayed}`;

    // Online status
    const statusDot = document.querySelector('#profile-status .status-dot');
    const statusText = document.getElementById('profile-status-text');

    if (isOwnProfile) {
      statusDot.className = 'status-dot status-online';
      statusText.className = 'status-text text-online';
      statusText.textContent = 'Online';
    } else if (d.currentGame) {
      statusDot.className = 'status-dot status-ingame';
      statusText.className = 'status-text text-ingame';
      statusText.textContent = 'In Game';

      const playingEl = document.getElementById('profile-playing');
      playingEl.style.display = 'flex';
      const link = document.getElementById('profile-playing-link');
      link.textContent = d.currentGame;
      link.href = `/games/${d.currentGame}`;
    } else if (d.isOnline) {
      statusDot.className = 'status-dot status-online';
      statusText.className = 'status-text text-online';
      statusText.textContent = 'Online';
    } else {
      statusDot.className = 'status-dot status-offline';
      statusText.className = 'status-text';
      statusText.textContent = 'Offline';
    }

    // Stats
    document.getElementById('stat-urus').textContent = d.urus;
    document.getElementById('stat-strikes').textContent = d.dailyStrikes;
    document.getElementById('stat-games').textContent = d.gamesPlayed;
    document.getElementById('stat-joined').textContent = joined;

    // Published games
    if (d.publishedGames && d.publishedGames.length > 0) {
      const section = document.getElementById('published-section');
      section.style.display = 'block';
      document.getElementById('published-count').textContent = d.publishedGames.length;

      const grid = document.getElementById('published-games-grid');
      grid.innerHTML = '';

      d.publishedGames.forEach(game => {
        const card = createPublishedGameCard(game);
        grid.appendChild(card);
      });
    }
  }

  // ==================== PUBLISHED GAME CARD ====================

  function createPublishedGameCard(game) {
    const card = document.createElement('div');
    card.className = 'pub-game-card';
    card.addEventListener('click', () => {
      window.location.href = `/games/${game.slug}`;
    });

    let thumbHtml;
    if (game.thumbnailData) {
      thumbHtml = `<img src="${escapeAttr(game.thumbnailData)}" alt="${escapeHtml(game.title)}">`;
    } else {
      thumbHtml = `
        <div class="pub-game-thumb-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 12h4M8 10v4M14 10h2M14 14h2"/>
          </svg>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="pub-game-thumb">${thumbHtml}</div>
      <div class="pub-game-info">
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description || 'No description')}</p>
        <div class="pub-game-stats">
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            ${formatNumber(game.plays || 0)} plays
          </span>
          <span>${formatDate(game.updatedAt)}</span>
        </div>
      </div>
    `;

    return card;
  }

  // ==================== AVATAR ANIMATION ====================

  function startProfileAvatar() {
    const canvas = document.getElementById('profile-avatar-canvas');
    if (!canvas || !profileData) return;
    const c = canvas.getContext('2d');

    function frame(ts) {
      const time = ts / 1000;
      c.fillStyle = '#0d0d0d';
      c.fillRect(0, 0, 180, 240);

      // Grid
      c.strokeStyle = '#141414';
      c.lineWidth = 1;
      for (let x = 0; x < 180; x += 20) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 240); c.stroke();
      }
      for (let y = 0; y < 240; y += 20) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(180, y); c.stroke();
      }

      // Floor
      c.fillStyle = '#1a1a1a';
      c.fillRect(0, 190, 180, 50);
      c.fillStyle = 'rgba(255,255,255,0.03)';
      c.fillRect(0, 190, 180, 2);

      // Character
      TC.draw(c, 60, 100, 50, 85, 1, 'idle', Math.floor(time / 0.5) % 2,
        profileData.avatar, null, true, time, {});

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ==================== BIO EDITING ====================

  document.getElementById('btn-edit-bio').addEventListener('click', () => {
    if (!isOwnProfile) return;
    document.getElementById('bio-editor').style.display = 'block';
    document.getElementById('btn-edit-bio').style.display = 'none';
    document.getElementById('bio-input').value = profileData?.bio || '';
    document.getElementById('bio-input').focus();
  });

  document.getElementById('btn-cancel-bio').addEventListener('click', () => {
    document.getElementById('bio-editor').style.display = 'none';
    document.getElementById('btn-edit-bio').style.display = 'inline-block';
  });

  document.getElementById('btn-save-bio').addEventListener('click', async () => {
    if (!isOwnProfile) return;
    const bio = document.getElementById('bio-input').value.trim();
    try {
      const res = await fetch('/api/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
      });
      const data = await res.json();
      if (data.success) {
        profileData.bio = bio;
        document.getElementById('profile-bio-text').textContent = bio || 'No bio set';
        document.getElementById('bio-editor').style.display = 'none';
        document.getElementById('btn-edit-bio').style.display = 'inline-block';
      }
    } catch (e) {
      console.error('[saveBio]', e);
    }
  });

  // ==================== UTILS ====================

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ==================== LOGOUT ====================

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ==================== INIT ====================

  async function init() {
    await checkAuth();
    await loadProfile();
  }

  init();
})();