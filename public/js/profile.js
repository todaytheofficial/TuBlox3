(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let userData = null;

  async function loadProfile() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return; }
      userData = await res.json();

      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;
      document.getElementById('profile-username').textContent = userData.username;
      document.getElementById('profile-urus').textContent = userData.urus;
      document.getElementById('profile-strikes').textContent = userData.dailyStrikes;
      document.getElementById('profile-bio-text').textContent = userData.bio || 'No bio set';

      const joined = new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      document.getElementById('profile-joined').textContent = `Joined: ${joined}`;
      document.getElementById('profile-games').textContent = `Games: ${userData.gamesPlayed}`;
      document.getElementById('stat-urus').textContent = userData.urus;
      document.getElementById('stat-strikes').textContent = userData.dailyStrikes;
      document.getElementById('stat-games').textContent = userData.gamesPlayed;
      document.getElementById('stat-joined').textContent = joined;

      TC.drawSidebar(document.getElementById('sidebar-avatar'), userData.avatar);
      startProfileAvatar();
    } catch (e) { window.location.href = '/auth'; }
  }

  function startProfileAvatar() {
    const canvas = document.getElementById('profile-avatar-canvas');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    function frame(ts) {
      const time = ts / 1000;
      c.fillStyle = '#0d0d0d'; c.fillRect(0, 0, 180, 240);
      c.strokeStyle = '#141414'; c.lineWidth = 1;
      for (let x = 0; x < 180; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 240); c.stroke(); }
      for (let y = 0; y < 240; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(180, y); c.stroke(); }
      c.fillStyle = '#1a1a1a'; c.fillRect(0, 190, 180, 50);
      c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(0, 190, 180, 2);
      TC.draw(c, 60, 100, 50, 85, 1, 'idle', Math.floor(time / 0.5) % 2, userData.avatar, null, true, time, {});
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.getElementById('btn-edit-bio').addEventListener('click', () => {
    document.getElementById('bio-editor').style.display = 'block';
    document.getElementById('btn-edit-bio').style.display = 'none';
    document.getElementById('bio-input').value = userData?.bio || '';
    document.getElementById('bio-input').focus();
  });

  document.getElementById('btn-cancel-bio').addEventListener('click', () => {
    document.getElementById('bio-editor').style.display = 'none';
    document.getElementById('btn-edit-bio').style.display = 'inline-block';
  });

  document.getElementById('btn-save-bio').addEventListener('click', async () => {
    const bio = document.getElementById('bio-input').value.trim();
    try {
      const res = await fetch('/api/bio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio }) });
      const data = await res.json();
      if (data.success) {
        userData.bio = bio;
        document.getElementById('profile-bio-text').textContent = bio || 'No bio set';
        document.getElementById('bio-editor').style.display = 'none';
        document.getElementById('btn-edit-bio').style.display = 'inline-block';
      }
    } catch (e) {}
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  loadProfile();
})();