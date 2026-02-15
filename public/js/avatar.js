(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let userData = null;
  let currentAvatar = { bodyColor: '#FFFFFF', headColor: '#FFFFFF', eyeColor: '#000000' };
  let equippedItems = {};
  let lastFocused = 'body';

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

  async function loadAvatar() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return; }
      userData = await res.json();
      currentAvatar = { ...userData.avatar };
      equippedItems = userData.equipped || {};

      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;
      startSidebarAvatar();

      document.getElementById('color-head').value = currentAvatar.headColor;
      document.getElementById('color-body').value = currentAvatar.bodyColor;
      document.getElementById('color-eyes').value = currentAvatar.eyeColor;
      document.getElementById('hex-head').textContent = currentAvatar.headColor;
      document.getElementById('hex-body').textContent = currentAvatar.bodyColor;
      document.getElementById('hex-eyes').textContent = currentAvatar.eyeColor;

      renderEquippedList();
      startPreview();
    } catch (e) { window.location.href = '/auth'; }
  }

  function renderEquippedList() {
    const section = document.getElementById('equipped-section');
    const list = document.getElementById('equipped-list');
    const cats = ['shirt','pants','face','hair','hat','accessory','body_part'];
    const catLabels = { shirt:'Shirt', pants:'Pants', face:'Face', hair:'Hair', hat:'Hat', accessory:'Accessory', body_part:'Body Part' };
    const hasAny = cats.some(c => equippedItems[c]);

    if (!hasAny) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    list.innerHTML = '';

    cats.forEach(cat => {
      if (!equippedItems[cat]) return;
      const item = equippedItems[cat];
      const el = document.createElement('div');
      el.className = 'equipped-item';
      el.innerHTML = `
        <div class="equipped-item-color" style="background:${item.color || '#888'}"></div>
        <div class="equipped-item-info">
          <span class="equipped-item-cat">${catLabels[cat]}</span>
          <span class="equipped-item-name">${item.name}</span>
        </div>
        <button class="equipped-item-unequip" data-cat="${cat}" data-id="${item.id}">✕</button>
      `;
      el.querySelector('.equipped-item-unequip').addEventListener('click', async (e) => {
        const itemId = e.target.dataset.id;
        try {
          const r = await fetch('/api/market/equip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, action: 'unequip' })
          });
          const data = await r.json();
          if (data.success) {
            delete equippedItems[cat];
            renderEquippedList();
            TC.drawSidebar(document.getElementById('sidebar-avatar'), currentAvatar, equippedItems);
          }
        } catch(err) {}
      });
      list.appendChild(el);
    });
  }

  function startPreview() {
    const canvas = document.getElementById('avatar-preview');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let previewState = 'idle', stateTimer = 0, animTime = 0;

    function frame(ts) {
      const dt = 0.016, time = ts / 1000;
      animTime += dt; stateTimer += dt;
      if (stateTimer > 2.5) { stateTimer = 0; const states = ['idle','run','jump','fall']; previewState = states[(states.indexOf(previewState)+1)%states.length]; }
      let fr = 0;
      if (previewState === 'run') fr = Math.floor(animTime/0.1)%4;
      else if (previewState === 'idle') fr = Math.floor(animTime/0.5)%2;

      c.fillStyle = '#080808'; c.fillRect(0,0,W,H);
      c.strokeStyle = '#0f0f0f'; c.lineWidth = 1;
      for (let x = 0; x < W; x += 20) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
      for (let y = 0; y < H; y += 20) { c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }
      c.fillStyle = '#1a1a1a'; c.fillRect(0, H-60, W, 60);

      const dir = previewState === 'run' ? (Math.sin(time*0.5)>0?1:-1) : 1;
      TC.draw(c, W/2-30, H/2-60, 55, 85, dir, previewState, fr, currentAvatar, userData?.username, true, time, { equipped: equippedItems });

      c.font = '600 10px Inter'; c.textAlign = 'center'; c.fillStyle = '#333';
      c.fillText(previewState.toUpperCase(), W/2, H-20);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  ['head','body','eyes'].forEach(part => {
    const input = document.getElementById(`color-${part}`);
    const hex = document.getElementById(`hex-${part}`);
    input.addEventListener('input', () => {
      const key = part === 'head' ? 'headColor' : part === 'body' ? 'bodyColor' : 'eyeColor';
      currentAvatar[key] = input.value;
      hex.textContent = input.value;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), currentAvatar, equippedItems);
    });
    input.addEventListener('focus', () => { lastFocused = part; });
  });

  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      const key = lastFocused === 'head' ? 'headColor' : lastFocused === 'body' ? 'bodyColor' : 'eyeColor';
      currentAvatar[key] = color;
      document.getElementById(`color-${lastFocused}`).value = color;
      document.getElementById(`hex-${lastFocused}`).textContent = color;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), currentAvatar, equippedItems);
    });
  });

  document.getElementById('btn-save-avatar').addEventListener('click', async () => {
    const msg = document.getElementById('avatar-save-msg');
    try {
      const res = await fetch('/api/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentAvatar) });
      const data = await res.json();
      if (data.success) { msg.className = 'save-msg success'; msg.textContent = 'Avatar saved!'; }
      else { msg.className = 'save-msg error'; msg.textContent = data.error; }
      setTimeout(() => msg.textContent = '', 3000);
    } catch (e) { msg.className = 'save-msg error'; msg.textContent = 'Error'; }
  });

  document.getElementById('btn-reset-avatar').addEventListener('click', () => {
    currentAvatar = { bodyColor: '#FFFFFF', headColor: '#FFFFFF', eyeColor: '#000000' };
    document.getElementById('color-head').value = '#FFFFFF';
    document.getElementById('color-body').value = '#FFFFFF';
    document.getElementById('color-eyes').value = '#000000';
    document.getElementById('hex-head').textContent = '#FFFFFF';
    document.getElementById('hex-body').textContent = '#FFFFFF';
    document.getElementById('hex-eyes').textContent = '#000000';
    TC.drawSidebar(document.getElementById('sidebar-avatar'), currentAvatar, equippedItems);
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  loadAvatar();
})();