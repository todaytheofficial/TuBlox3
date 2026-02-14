(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let userData = null;
  let itemData = null;
  let selectedColor = '';
  let hcaptchaSiteKey = '';
  let purchaseCaptchaId = null;
  let ownedItemIds = new Set();
  let equippedData = {};

  function getItemIdFromURL() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      userData = await res.json();
      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), userData.avatar, userData.equipped || {});
      return userData;
    } catch (e) { window.location.href = '/auth'; return null; }
  }

  async function loadCaptchaKey() {
    try {
      const res = await fetch('/api/market/captcha-key');
      const data = await res.json();
      hcaptchaSiteKey = data.sitekey;
    } catch (e) {
      console.error('[captcha-key]', e);
      setTimeout(loadCaptchaKey, 2000);
    }
  }

  async function loadInventory() {
    try {
      const res = await fetch('/api/market/inventory');
      const data = await res.json();
      ownedItemIds = new Set((data.items || []).map(i => i.item._id));
      equippedData = data.equipped || {};
    } catch (e) { console.error('[inv]', e); }
  }

  async function loadItem() {
    const itemId = getItemIdFromURL();
    if (!itemId || itemId === 'market') {
      showError(); return;
    }

    try {
      const res = await fetch(`/api/market/item/${itemId}`);
      if (!res.ok) { showError(); return; }
      itemData = await res.json();

      document.title = `Tublox - ${itemData.name}`;
      document.getElementById('page-loading').style.display = 'none';
      document.getElementById('page-content').style.display = 'block';

      renderItem();
      loadSimilarItems();
    } catch (e) {
      console.error('[loadItem]', e);
      showError();
    }
  }

  function showError() {
    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('page-error').style.display = 'flex';
  }

  function renderItem() {
    const item = itemData;
    selectedColor = item.colors && item.colors.length > 0 ? item.colors[0] : '';

    // Breadcrumb
    document.getElementById('breadcrumb-cat').textContent = categoryLabel(item.category);
    document.getElementById('breadcrumb-name').textContent = item.name;

    // Title
    document.getElementById('item-name').textContent = item.name;
    document.getElementById('item-description').textContent = item.description || 'No description';

    // Rarity Badge
    const rarityBadge = document.getElementById('hero-rarity');
    rarityBadge.textContent = item.rarity.toUpperCase();
    rarityBadge.className = 'item-rarity-badge rarity-' + item.rarity;

    // Limited Badge
    if (item.isLimited) {
      document.getElementById('hero-limited').style.display = 'inline-block';
    }

    // Stats
    document.getElementById('stat-category').textContent = categoryLabel(item.category);
    document.getElementById('stat-creator').textContent = item.creatorName || 'Tublox';
    document.getElementById('stat-sold').textContent = item.sold || 0;
    document.getElementById('stat-rarity').textContent = capitalize(item.rarity);
    document.getElementById('stat-date').textContent = item.createdAt ? formatDate(item.createdAt) : '-';

    if (item.isLimited && item.stock > 0) {
      document.getElementById('stat-stock-card').style.display = 'block';
      const remaining = item.stock - (item.sold || 0);
      document.getElementById('stat-stock').textContent = `${remaining}/${item.stock}`;
      document.getElementById('stat-stock').style.color = remaining <= 5 ? '#ef4444' : '#ccc';
    }

    // Tags
    if (item.tags && item.tags.length > 0) {
      const tagsDiv = document.getElementById('item-tags');
      tagsDiv.style.display = 'flex';
      tagsDiv.innerHTML = '';
      item.tags.forEach(tag => {
        const el = document.createElement('span');
        el.className = 'item-tag';
        el.textContent = '#' + tag;
        tagsDiv.appendChild(el);
      });
    }

    // Price
    document.getElementById('price-amount').textContent = item.price;
    document.getElementById('user-balance').textContent = userData ? userData.urus : 0;

    // Colors
    if (item.colors && item.colors.length > 0) {
      document.getElementById('color-selector').style.display = 'block';
      const colorsDiv = document.getElementById('color-options');
      colorsDiv.innerHTML = '';
      item.colors.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'color-option' + (col === selectedColor ? ' selected' : '');
        btn.style.background = col;
        btn.addEventListener('click', () => {
          selectedColor = col;
          colorsDiv.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          drawBigPreview();
        });
        colorsDiv.appendChild(btn);
      });
    }

    // Draw Preview
    drawBigPreview();

    // Buttons
    updateButtons();
  }

  function drawBigPreview() {
    const canvas = document.getElementById('item-big-canvas');
    drawItemThumbnail(canvas, itemData, selectedColor || '#888');
  }

  function updateButtons() {
    const isOwned = ownedItemIds.has(itemData._id);
    const equipped = equippedData;
    const isEquipped = equipped[itemData.category] && String(equipped[itemData.category]) === String(itemData._id);

    document.getElementById('btn-purchase').style.display = isOwned ? 'none' : 'flex';
    document.getElementById('btn-owned').style.display = isOwned ? 'flex' : 'none';
    document.getElementById('btn-equip').style.display = isOwned && !isEquipped ? 'flex' : 'none';
    document.getElementById('btn-unequip').style.display = isOwned && isEquipped ? 'flex' : 'none';
  }

  // ======================== PURCHASE FLOW ========================

  document.getElementById('btn-purchase').addEventListener('click', () => {
    if (!itemData || !userData) return;

    const modal = document.getElementById('purchase-modal');
    modal.style.display = 'flex';

    // Show captcha step
    showPurchaseStep('captcha');

    // Fill modal info
    document.getElementById('modal-item-name').textContent = itemData.name;
    document.getElementById('modal-item-rarity').textContent = itemData.rarity.toUpperCase();
    document.getElementById('modal-item-rarity').className = 'purchase-item-rarity rarity-' + itemData.rarity;
    document.getElementById('modal-item-price').textContent = itemData.price;

    // Draw mini preview
    const miniCanvas = document.getElementById('modal-item-canvas');
    drawItemThumbnail(miniCanvas, itemData, selectedColor || '#888');

    // Transaction preview
    const balanceBefore = userData.urus;
    const cost = itemData.price;
    const balanceAfter = balanceBefore - cost;

    document.getElementById('tx-balance-before').textContent = balanceBefore.toLocaleString();
    document.getElementById('tx-cost').textContent = '-' + cost.toLocaleString();
    document.getElementById('tx-balance-after').textContent = balanceAfter.toLocaleString();
    document.getElementById('tx-balance-after').style.color = balanceAfter >= 0 ? '#4ade80' : '#ef4444';

    document.getElementById('purchase-error').textContent = '';

    // Render captcha
    renderPurchaseCaptcha();
  });

  function showPurchaseStep(step) {
    ['captcha', 'processing', 'success', 'error'].forEach(s => {
      document.getElementById('purchase-step-' + s).style.display = s === step ? 'block' : 'none';
    });
  }

  function renderPurchaseCaptcha() {
    const widget = document.getElementById('purchase-hcaptcha');
    widget.innerHTML = '';

    if (!hcaptchaSiteKey || typeof hcaptcha === 'undefined') {
      setTimeout(renderPurchaseCaptcha, 500);
      return;
    }

    try {
      if (purchaseCaptchaId !== null) {
        try { hcaptcha.remove(purchaseCaptchaId); } catch(e) {}
        purchaseCaptchaId = null;
      }
      purchaseCaptchaId = hcaptcha.render(widget, {
        sitekey: hcaptchaSiteKey, theme: 'dark', size: 'normal',
        callback: function() {},
        'expired-callback': function() {},
        'error-callback': function() {}
      });
    } catch (e) {
      console.error('[captcha render]', e);
      setTimeout(renderPurchaseCaptcha, 1000);
    }
  }

  document.getElementById('btn-confirm-purchase').addEventListener('click', async () => {
    if (!itemData) return;
    const errorEl = document.getElementById('purchase-error');

    let captchaToken = '';
    if (typeof hcaptcha !== 'undefined' && purchaseCaptchaId !== null) {
      try { captchaToken = hcaptcha.getResponse(purchaseCaptchaId); } catch(e) {}
    }

    if (!captchaToken) {
      errorEl.textContent = 'Please complete the captcha';
      return;
    }

    if (userData.urus < itemData.price) {
      errorEl.textContent = 'Not enough Urus';
      return;
    }

    // Show processing
    showPurchaseStep('processing');

    try {
      const res = await fetch(`/api/market/buy/${itemData._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken, selectedColor })
      });
      const data = await res.json();

      if (data.success) {
        // Update local data
        userData.urus = data.newBalance;
        document.getElementById('sidebar-urus').textContent = data.newBalance;
        document.getElementById('user-balance').textContent = data.newBalance;
        ownedItemIds.add(itemData._id);

        // Show success
        showPurchaseStep('success');
        document.getElementById('success-item-name').textContent = data.itemName;
        document.getElementById('receipt-item').textContent = data.itemName;
        document.getElementById('receipt-cost').textContent = '-' + itemData.price.toLocaleString() + ' Urus';
        document.getElementById('receipt-balance').textContent = data.newBalance.toLocaleString() + ' Urus';

        updateButtons();
      } else {
        showPurchaseStep('error');
        document.getElementById('error-message').textContent = data.error || 'Purchase failed';
      }
    } catch (e) {
      showPurchaseStep('error');
      document.getElementById('error-message').textContent = 'Network error. Please try again.';
    }

    if (typeof hcaptcha !== 'undefined' && purchaseCaptchaId !== null) {
      try { hcaptcha.reset(purchaseCaptchaId); } catch(e) {}
    }
  });

  // Success actions
  document.getElementById('btn-equip-now').addEventListener('click', async () => {
    if (!itemData) return;
    try {
      const res = await fetch('/api/market/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemData._id, action: 'equip', color: selectedColor })
      });
      const data = await res.json();
      if (data.success) {
        equippedData[itemData.category] = itemData._id;
        closePurchaseModal();
        updateButtons();
        const statusEl = document.getElementById('action-status');
        statusEl.className = 'action-status success';
        statusEl.textContent = 'Equipped successfully!';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }
    } catch(e) {}
  });

  document.getElementById('btn-close-success').addEventListener('click', closePurchaseModal);
  document.getElementById('btn-try-again').addEventListener('click', () => showPurchaseStep('captcha'));

  // Close modal
  document.getElementById('purchase-modal-close').addEventListener('click', closePurchaseModal);
  document.getElementById('purchase-modal').addEventListener('click', (e) => {
    if (e.target.id === 'purchase-modal') closePurchaseModal();
  });

  function closePurchaseModal() {
    document.getElementById('purchase-modal').style.display = 'none';
  }

  // ======================== EQUIP / UNEQUIP ========================

  document.getElementById('btn-equip').addEventListener('click', async () => {
    if (!itemData) return;
    try {
      const res = await fetch('/api/market/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemData._id, action: 'equip', color: selectedColor })
      });
      const data = await res.json();
      if (data.success) {
        equippedData[itemData.category] = itemData._id;
        updateButtons();
        showStatus('Equipped!', 'success');
      }
    } catch(e) { showStatus('Failed to equip', 'error'); }
  });

  document.getElementById('btn-unequip').addEventListener('click', async () => {
    if (!itemData) return;
    try {
      const res = await fetch('/api/market/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemData._id, action: 'unequip' })
      });
      const data = await res.json();
      if (data.success) {
        delete equippedData[itemData.category];
        updateButtons();
        showStatus('Unequipped', 'success');
      }
    } catch(e) { showStatus('Failed to unequip', 'error'); }
  });

  function showStatus(msg, type) {
    const el = document.getElementById('action-status');
    el.className = 'action-status ' + type;
    el.textContent = msg;
    setTimeout(() => { el.textContent = ''; el.className = 'action-status'; }, 3000);
  }

  // ======================== SIMILAR ITEMS ========================

  async function loadSimilarItems() {
    if (!itemData) return;
    try {
      const res = await fetch(`/api/market/items?category=${itemData.category}`);
      const items = await res.json();
      const filtered = items.filter(i => i._id !== itemData._id).slice(0, 6);

      if (filtered.length === 0) return;

      document.getElementById('similar-section').style.display = 'block';
      document.getElementById('similar-cat-name').textContent = categoryLabel(itemData.category);
      const grid = document.getElementById('similar-grid');
      grid.innerHTML = '';

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'similar-card';
        const canvasId = `similar-${item._id}`;
        const col = item.colors && item.colors.length > 0 ? item.colors[0] : '#888';

        card.innerHTML = `
          <div class="similar-card-thumb">
            <canvas id="${canvasId}" width="180" height="130"></canvas>
          </div>
          <div class="similar-card-info">
            <div class="similar-card-name">${escapeHtml(item.name)}</div>
            <div class="similar-card-bottom">
              <div class="similar-card-price">
                <img src="/img/urus.png" alt="U">
                <span>${item.price}</span>
              </div>
              <span class="similar-card-rarity rarity-${item.rarity}">${item.rarity}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          window.location.href = `/market/${item._id}`;
        });

        grid.appendChild(card);

        requestAnimationFrame(() => {
          const canvas = document.getElementById(canvasId);
          if (canvas) drawItemThumbnail(canvas, item, col);
        });
      });
    } catch(e) { console.error('[similar]', e); }
  }

  // ======================== DRAWING ========================

  function drawItemThumbnail(canvas, item, color) {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const dd = item.drawData || {};
    const type = dd.type || 'generic';

    c.fillStyle = '#080808';
    c.fillRect(0, 0, W, H);

    // Grid
    c.strokeStyle = '#0f0f0f';
    c.lineWidth = 0.5;
    for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Rarity glow
    const rarityGlow = {
      common: 'rgba(150,150,150,0.05)', uncommon: 'rgba(74,222,128,0.08)',
      rare: 'rgba(59,130,246,0.08)', epic: 'rgba(168,85,247,0.1)', legendary: 'rgba(255,215,0,0.12)'
    };
    const glow = rarityGlow[item.rarity] || rarityGlow.common;
    const grad = c.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)/2);
    grad.addColorStop(0, glow); grad.addColorStop(1, 'transparent');
    c.fillStyle = grad; c.fillRect(0, 0, W, H);

    c.save(); c.translate(W/2, H/2);
    const col = color || '#888';
    const scale = Math.min(W, H) / 160;
    c.scale(scale, scale);

    switch(item.category) {
      case 'shirt': drawShirtPreview(c, type, col); break;
      case 'pants': drawPantsPreview(c, type, col); break;
      case 'face': drawFacePreview(c, type); break;
      case 'hair': drawHairPreview(c, type, col); break;
      case 'hat': drawHatPreview(c, type, col); break;
      case 'accessory': drawAccessoryPreview(c, type, col); break;
      case 'body_part': drawBodyPartPreview(c, type, col); break;
      default: c.fillStyle = col; c.fillRect(-20, -20, 40, 40);
    }
    c.restore();
  }

  function drawShirtPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'hoodie': c.fillRect(-28, -30, 56, 55); c.fillStyle = darken(col, 30); c.fillRect(-28, -30, 56, 10); c.fillStyle = darken(col, 15); c.fillRect(-8, -10, 16, 20); break;
      case 'jacket': c.fillRect(-28, -25, 56, 50); c.fillStyle = darken(col, 20); c.fillRect(-2, -25, 4, 50); c.fillStyle = lighten(col, 20); c.fillRect(-26, -15, 8, 20); c.fillRect(18, -15, 8, 20); break;
      case 'stripe_shirt': c.fillRect(-24, -25, 48, 45); c.fillStyle = 'rgba(255,255,255,0.2)'; for (let y = -20; y < 20; y += 8) c.fillRect(-24, y, 48, 3); break;
      case 'gold_armor': c.fillStyle = '#FFD700'; c.fillRect(-28, -28, 56, 52); c.fillStyle = '#DAA520'; c.fillRect(-28, -28, 56, 4); c.fillRect(-28, 20, 56, 4); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-20, -20, 8, 30); break;
      case 'tank_top': c.fillRect(-18, -20, 36, 42); c.fillStyle = '#080808'; c.fillRect(-24, -25, 8, 15); c.fillRect(16, -25, 8, 15); break;
      default: c.fillRect(-24, -25, 48, 45); c.fillStyle = lighten(col, 15); c.fillRect(-24, -25, 48, 3);
    }
  }

  function drawPantsPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'shorts': c.fillRect(-22, -10, 20, 30); c.fillRect(2, -10, 20, 30); break;
      case 'cargo': c.fillRect(-22, -15, 20, 50); c.fillRect(2, -15, 20, 50); c.fillStyle = darken(col, 20); c.fillRect(-18, 10, 12, 10); c.fillRect(6, 10, 12, 10); break;
      case 'royal_legs': c.fillStyle = '#4B0082'; c.fillRect(-22, -15, 20, 50); c.fillRect(2, -15, 20, 50); c.fillStyle = '#FFD700'; c.fillRect(-22, -15, 20, 3); c.fillRect(2, -15, 20, 3); c.fillRect(-22, 32, 20, 3); c.fillRect(2, 32, 20, 3); break;
      case 'sweatpants': c.fillRect(-22, -15, 20, 50); c.fillRect(2, -15, 20, 50); c.fillStyle = lighten(col, 10); c.fillRect(-22, -15, 44, 6); break;
      default: c.fillRect(-22, -15, 20, 50); c.fillRect(2, -15, 20, 50);
    }
  }

  function drawFacePreview(c, type) {
    c.fillStyle = '#ddd'; c.beginPath(); c.arc(0, 0, 35, 0, Math.PI*2); c.fill(); c.strokeStyle = '#bbb'; c.lineWidth = 2; c.stroke();
    switch(type) {
      case 'smile': c.fillStyle = '#000'; c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill(); c.beginPath(); c.arc(10, -8, 4, 0, Math.PI*2); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(0, 2, 12, 0.1, Math.PI-0.1); c.stroke(); break;
      case 'cool': c.fillStyle = '#111'; c.fillRect(-22, -14, 44, 12); c.fillStyle = '#333'; c.fillRect(-18, -12, 14, 8); c.fillRect(4, -12, 14, 8); break;
      case 'angry': c.fillStyle = '#000'; c.beginPath(); c.arc(-10, -6, 4, 0, Math.PI*2); c.fill(); c.beginPath(); c.arc(10, -6, 4, 0, Math.PI*2); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -14); c.lineTo(-6, -10); c.stroke(); c.beginPath(); c.moveTo(14, -14); c.lineTo(6, -10); c.stroke(); break;
      case 'wink': c.fillStyle = '#000'; c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(6, -8); c.lineTo(14, -8); c.stroke(); break;
      case 'robot': c.fillStyle = '#00FF00'; c.fillRect(-12, -10, 4, 4); c.fillRect(8, -10, 4, 4); c.fillStyle = '#00CC00'; c.fillRect(-14, 4, 28, 2); break;
      case 'skull': c.fillStyle = '#000'; c.beginPath(); c.arc(-10, -8, 6, 0, Math.PI*2); c.fill(); c.beginPath(); c.arc(10, -8, 6, 0, Math.PI*2); c.fill(); c.fillRect(-3, 0, 6, 8); break;
      default: c.fillStyle = '#000'; c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill(); c.beginPath(); c.arc(10, -8, 4, 0, Math.PI*2); c.fill();
    }
  }

  function drawHairPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'spiky': for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i*10-5, 10); c.lineTo(i*10, -30-Math.abs(i)*4); c.lineTo(i*10+5, 10); c.fill(); } break;
      case 'long': c.beginPath(); c.ellipse(0, -5, 30, 25, 0, 0, Math.PI*2); c.fill(); c.fillRect(-25, -5, 10, 45); c.fillRect(15, -5, 10, 45); break;
      case 'mohawk': c.fillRect(-4, -40, 8, 50); c.fillStyle = lighten(col, 20); c.fillRect(-3, -38, 6, 46); break;
      case 'curly': for (let i = 0; i < 12; i++) { const a = (i/12)*Math.PI*2; c.beginPath(); c.arc(Math.cos(a)*20, Math.sin(a)*18-5, 10, 0, Math.PI*2); c.fill(); } break;
      case 'fire': const cols = ['#FF4500','#FF6600','#FFD700','#FF0000']; for (let i = 0; i < 8; i++) { c.fillStyle = cols[i%cols.length]; c.beginPath(); c.moveTo((i-4)*8, 5); c.lineTo((i-4)*8+4, -25-Math.random()*15); c.lineTo((i-4)*8+8, 5); c.fill(); } break;
      default: c.beginPath(); c.ellipse(0, -10, 28, 22, 0, 0, Math.PI*2); c.fill();
    }
  }

  function drawHatPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'baseball_cap': c.fillRect(-20, -5, 40, 12); c.beginPath(); c.ellipse(0, -5, 22, 8, 0, Math.PI, 0); c.fill(); c.fillRect(-25, 5, 50, 4); break;
      case 'top_hat': c.fillRect(-14, -35, 28, 35); c.fillRect(-22, 0, 44, 6); c.fillStyle = lighten(col, 20); c.fillRect(-12, -10, 24, 3); break;
      case 'crown': c.fillStyle = '#FFD700'; c.fillRect(-20, -5, 40, 15); c.beginPath(); c.moveTo(-20, -5); c.lineTo(-15, -20); c.lineTo(-10, -5); c.lineTo(0, -25); c.lineTo(10, -5); c.lineTo(15, -20); c.lineTo(20, -5); c.fill(); break;
      case 'beanie': c.beginPath(); c.ellipse(0, 0, 22, 18, 0, Math.PI, 0); c.fill(); c.fillRect(-22, 0, 44, 8); break;
      case 'ninja_headband': c.fillRect(-24, -4, 48, 10); c.fillStyle = lighten(col, 15); c.fillRect(-24, -2, 48, 2); break;
      default: c.fillRect(-18, -15, 36, 20);
    }
  }

  function drawAccessoryPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'backpack': c.fillRect(-16, -20, 32, 38); c.fillStyle = darken(col, 20); c.fillRect(-12, -10, 24, 12); break;
      case 'wings': c.globalAlpha = 0.7; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-40, -30, -35, 10); c.quadraticCurveTo(-30, 25, -5, 15); c.fill(); c.beginPath(); c.moveTo(5, 0); c.quadraticCurveTo(40, -30, 35, 10); c.quadraticCurveTo(30, 25, 5, 15); c.fill(); c.globalAlpha = 1; break;
      case 'cape': c.fillRect(-18, -15, 36, 50); c.fillStyle = lighten(col, 15); c.fillRect(-18, -15, 36, 3); break;
      case 'scarf': c.fillRect(-20, -4, 40, 8); c.fillRect(-8, 4, 16, 20); break;
      case 'necklace': c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, -5, 18, 0.3, Math.PI-0.3); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(0, 12, 5, 0, Math.PI*2); c.fill(); break;
      default: c.fillRect(-15, -15, 30, 30);
    }
  }

  function drawBodyPartPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'robot_arms': c.fillRect(-35, -15, 12, 35); c.fillRect(23, -15, 12, 35); c.fillStyle = '#666'; c.fillRect(-33, 0, 8, 4); c.fillRect(25, 0, 8, 4); break;
      case 'claws': for (let i = 0; i < 3; i++) { const x = -8+i*8; c.beginPath(); c.moveTo(x-20, 10); c.lineTo(x-18, -15); c.lineTo(x-16, 10); c.fill(); c.beginPath(); c.moveTo(x+16, 10); c.lineTo(x+18, -15); c.lineTo(x+20, 10); c.fill(); } break;
      case 'tail': c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 15); c.quadraticCurveTo(25, 5, 30, -15); c.quadraticCurveTo(33, -25, 28, -30); c.stroke(); c.fillStyle = lighten(col, 20); c.beginPath(); c.arc(28, -30, 5, 0, Math.PI*2); c.fill(); break;
      default: c.fillRect(-20, -20, 40, 40);
    }
  }

  // ======================== UTILITIES ========================

  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function categoryLabel(cat) {
    const labels = { shirt: 'Shirts', pants: 'Pants', face: 'Faces', hair: 'Hair', hat: 'Hats', accessory: 'Accessories', body_part: 'Body Parts' };
    return labels[cat] || cat;
  }
  function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function lighten(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = Math.min(255, parseInt(hex.substring(0,2),16) + amount);
    const g = Math.min(255, parseInt(hex.substring(2,4),16) + amount);
    const b = Math.min(255, parseInt(hex.substring(4,6),16) + amount);
    return `rgb(${r},${g},${b})`;
  }
  function darken(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = Math.max(0, parseInt(hex.substring(0,2),16) - amount);
    const g = Math.max(0, parseInt(hex.substring(2,4),16) - amount);
    const b = Math.max(0, parseInt(hex.substring(4,6),16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ======================== INIT ========================

  async function init() {
    await checkAuth();
    await loadCaptchaKey();
    await loadInventory();
    await loadItem();
  }
  init();
})();