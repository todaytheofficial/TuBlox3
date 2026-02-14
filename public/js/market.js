(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  let userData = null;
  let allItems = [];
  let inventory = [];
  let equippedData = {};
  let selectedCategory = 'all';
  let selectedItem = null;
  let selectedColor = '';
  let hcaptchaSiteKey = '';
  let hcaptchaWidgetId = null;
  let ownedItemIds = new Set();

  // ==================== AUTH ====================

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) { window.location.href = '/auth'; return null; }
      userData = await res.json();
      document.getElementById('sidebar-username').textContent = userData.username;
      document.getElementById('sidebar-urus').textContent = userData.urus;
      document.getElementById('sidebar-strikes').textContent = userData.dailyStrikes;
      TC.drawSidebar(document.getElementById('sidebar-avatar'), userData.avatar);
      return userData;
    } catch (e) { window.location.href = '/auth'; return null; }
  }

  // ==================== LOAD ====================

  async function loadCaptchaKey() {
    try {
      const res = await fetch('/api/market/captcha-key');
      const data = await res.json();
      hcaptchaSiteKey = data.sitekey;
    } catch (e) { console.error('[captcha-key]', e); }
  }

  async function loadMarketItems() {
    const loadingEl = document.getElementById('market-loading');
    const emptyEl = document.getElementById('market-empty');
    const gridEl = document.getElementById('market-grid');

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      const sort = document.getElementById('market-sort').value;
      const rarity = document.getElementById('market-rarity').value;
      const search = document.getElementById('market-search').value.trim();
      if (sort) params.append('sort', sort);
      if (rarity !== 'all') params.append('rarity', rarity);
      if (search) params.append('search', search);

      const res = await fetch(`/api/market/items?${params}`);
      allItems = await res.json();

      loadingEl.style.display = 'none';

      if (allItems.length === 0) {
        emptyEl.style.display = 'flex';
        gridEl.style.display = 'none';
        return;
      }

      emptyEl.style.display = 'none';
      gridEl.style.display = 'grid';
      gridEl.innerHTML = '';

      allItems.forEach(item => {
        const card = createItemCard(item);
        gridEl.appendChild(card);
      });
    } catch (e) {
      console.error('[loadMarket]', e);
      loadingEl.innerHTML = '<span style="color:#ef4444">Failed to load market</span>';
    }
  }

  async function loadInventory() {
    const loadingEl = document.getElementById('inv-loading');
    const emptyEl = document.getElementById('inv-empty');
    const gridEl = document.getElementById('inv-grid');

    try {
      const res = await fetch('/api/market/inventory');
      const data = await res.json();
      inventory = data.items || [];
      equippedData = data.equipped || {};

      ownedItemIds = new Set(inventory.map(i => i.item._id));

      loadingEl.style.display = 'none';
      document.getElementById('inv-count').textContent = `${inventory.length} items`;

      if (inventory.length === 0) {
        emptyEl.style.display = 'flex';
        gridEl.style.display = 'none';
        return;
      }

      emptyEl.style.display = 'none';
      gridEl.style.display = 'grid';
      gridEl.innerHTML = '';

      inventory.forEach(invItem => {
        const card = createItemCard(invItem.item, true, invItem.equipped);
        gridEl.appendChild(card);
      });
    } catch (e) {
      console.error('[loadInventory]', e);
      loadingEl.innerHTML = '<span style="color:#ef4444">Failed to load inventory</span>';
    }
  }

  // ==================== ITEM CARD ====================

  function createItemCard(item, isOwned, isEquipped) {
    const card = document.createElement('div');
    card.className = 'item-card';
    if (item.isLimited) card.classList.add('item-card-limited');
    if (isOwned || ownedItemIds.has(item._id)) card.classList.add('item-card-owned');
    if (isEquipped) card.classList.add('item-card-equipped');

    const canvasId = `item-thumb-${item._id}`;
    const primaryColor = item.colors && item.colors.length > 0 ? item.colors[0] : '#888';

    card.innerHTML = `
      <div class="item-thumb">
        <canvas id="${canvasId}" width="200" height="160"></canvas>
      </div>
      <div class="item-card-info">
        <div class="item-card-name">${escapeHtml(item.name)}</div>
        <div class="item-card-bottom">
          <div class="item-card-price">
            <img src="/img/urus.png" alt="U">
            <span>${item.price}</span>
          </div>
          <span class="item-card-rarity rarity-${item.rarity}">${item.rarity}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openItemModal(item));

    // Draw thumbnail
    requestAnimationFrame(() => {
      const canvas = document.getElementById(canvasId);
      if (canvas) drawItemThumbnail(canvas, item, primaryColor);
    });

    return card;
  }

  // ==================== ITEM THUMBNAIL DRAWING ====================

  function drawItemThumbnail(canvas, item, color) {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const dd = item.drawData || {};
    const type = dd.type || 'generic';

    c.fillStyle = '#080808';
    c.fillRect(0, 0, W, H);

    // Subtle grid
    c.strokeStyle = '#0f0f0f';
    c.lineWidth = 0.5;
    for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Glow based on rarity
    const rarityGlow = {
      common: 'rgba(150,150,150,0.05)',
      uncommon: 'rgba(74,222,128,0.08)',
      rare: 'rgba(59,130,246,0.08)',
      epic: 'rgba(168,85,247,0.1)',
      legendary: 'rgba(255,215,0,0.12)'
    };
    const glow = rarityGlow[item.rarity] || rarityGlow.common;
    const grad = c.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
    grad.addColorStop(0, glow);
    grad.addColorStop(1, 'transparent');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    c.save();
    c.translate(W/2, H/2);

    const col = color || '#888';

    switch(item.category) {
      case 'shirt':
        drawShirtPreview(c, type, col);
        break;
      case 'pants':
        drawPantsPreview(c, type, col);
        break;
      case 'face':
        drawFacePreview(c, type);
        break;
      case 'hair':
        drawHairPreview(c, type, col);
        break;
      case 'hat':
        drawHatPreview(c, type, col);
        break;
      case 'accessory':
        drawAccessoryPreview(c, type, col);
        break;
      case 'body_part':
        drawBodyPartPreview(c, type, col);
        break;
      default:
        c.fillStyle = col;
        c.fillRect(-20, -20, 40, 40);
    }

    c.restore();
  }

  function drawShirtPreview(c, type, col) {
    // Torso shape
    c.fillStyle = col;
    switch(type) {
      case 'hoodie':
        c.fillRect(-28, -30, 56, 55);
        c.fillStyle = darken(col, 30);
        c.fillRect(-28, -30, 56, 10); // hood
        c.fillStyle = darken(col, 15);
        c.fillRect(-8, -10, 16, 20); // pocket
        break;
      case 'jacket':
        c.fillRect(-28, -25, 56, 50);
        c.fillStyle = darken(col, 20);
        c.fillRect(-2, -25, 4, 50); // zipper
        c.fillStyle = lighten(col, 20);
        c.fillRect(-26, -15, 8, 20); // pocket left
        c.fillRect(18, -15, 8, 20); // pocket right
        break;
      case 'stripe_shirt':
        c.fillRect(-24, -25, 48, 45);
        c.fillStyle = 'rgba(255,255,255,0.2)';
        for (let y = -20; y < 20; y += 8) c.fillRect(-24, y, 48, 3);
        break;
      case 'gold_armor':
        c.fillStyle = '#FFD700';
        c.fillRect(-28, -28, 56, 52);
        c.fillStyle = '#DAA520';
        c.fillRect(-28, -28, 56, 4);
        c.fillRect(-28, 20, 56, 4);
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.fillRect(-20, -20, 8, 30);
        break;
      case 'tank_top':
        c.fillRect(-18, -20, 36, 42);
        c.fillStyle = '#080808';
        c.fillRect(-24, -25, 8, 15); // cut left
        c.fillRect(16, -25, 8, 15); // cut right
        break;
      default: // basic_tee
        c.fillRect(-24, -25, 48, 45);
        c.fillStyle = lighten(col, 15);
        c.fillRect(-24, -25, 48, 3); // collar
    }
  }

  function drawPantsPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'shorts':
        c.fillRect(-22, -10, 20, 30);
        c.fillRect(2, -10, 20, 30);
        break;
      case 'cargo':
        c.fillRect(-22, -15, 20, 50);
        c.fillRect(2, -15, 20, 50);
        c.fillStyle = darken(col, 20);
        c.fillRect(-18, 10, 12, 10); // pocket
        c.fillRect(6, 10, 12, 10);
        break;
      case 'royal_legs':
        c.fillStyle = '#4B0082';
        c.fillRect(-22, -15, 20, 50);
        c.fillRect(2, -15, 20, 50);
        c.fillStyle = '#FFD700';
        c.fillRect(-22, -15, 20, 3);
        c.fillRect(2, -15, 20, 3);
        c.fillRect(-22, 32, 20, 3);
        c.fillRect(2, 32, 20, 3);
        break;
      case 'sweatpants':
        c.fillRect(-22, -15, 20, 50);
        c.fillRect(2, -15, 20, 50);
        c.fillStyle = lighten(col, 10);
        c.fillRect(-22, -15, 44, 6); // waistband
        break;
      default: // jeans
        c.fillRect(-22, -15, 20, 50);
        c.fillRect(2, -15, 20, 50);
        c.fillStyle = lighten(col, 10);
        c.fillRect(-20, 0, 2, 35); // seam
        c.fillRect(18, 0, 2, 35);
    }
  }

  function drawFacePreview(c, type) {
    // Head circle
    c.fillStyle = '#ddd';
    c.beginPath();
    c.arc(0, 0, 35, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#bbb';
    c.lineWidth = 2;
    c.stroke();

    switch(type) {
      case 'smile':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(10, -8, 4, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 2, 12, 0.1, Math.PI - 0.1); c.stroke();
        break;
      case 'cool':
        c.fillStyle = '#111';
        c.fillRect(-22, -14, 44, 12);
        c.fillStyle = '#333';
        c.fillRect(-18, -12, 14, 8);
        c.fillRect(4, -12, 14, 8);
        c.strokeStyle = '#000'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, 6, 8, 0.2, Math.PI-0.2); c.stroke();
        break;
      case 'angry':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-10, -6, 4, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(10, -6, 4, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-14, -14); c.lineTo(-6, -10); c.stroke();
        c.beginPath(); c.moveTo(14, -14); c.lineTo(6, -10); c.stroke();
        c.beginPath(); c.arc(0, 10, 8, Math.PI+0.3, -0.3); c.stroke();
        break;
      case 'wink':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(6, -8); c.lineTo(14, -8); c.stroke();
        c.beginPath(); c.arc(0, 2, 10, 0.1, Math.PI-0.1); c.stroke();
        break;
      case 'robot':
        c.fillStyle = '#00FF00';
        c.fillRect(-12, -10, 4, 4);
        c.fillRect(8, -10, 4, 4);
        c.fillStyle = '#00CC00';
        c.fillRect(-14, 4, 28, 2);
        c.fillRect(-10, 8, 20, 2);
        break;
      case 'skull':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-10, -8, 6, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(10, -8, 6, 0, Math.PI*2); c.fill();
        c.fillRect(-3, 0, 6, 8);
        c.fillStyle = '#888';
        c.fillRect(-10, 14, 4, 6);
        c.fillRect(-2, 14, 4, 6);
        c.fillRect(6, 14, 4, 6);
        break;
      default:
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-10, -8, 4, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(10, -8, 4, 0, Math.PI*2); c.fill();
    }
  }

  function drawHairPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'spiky':
        for (let i = -3; i <= 3; i++) {
          c.beginPath();
          c.moveTo(i*10 - 5, 10);
          c.lineTo(i*10, -30 - Math.abs(i)*4);
          c.lineTo(i*10 + 5, 10);
          c.fill();
        }
        break;
      case 'long':
        c.beginPath();
        c.ellipse(0, -5, 30, 25, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(-25, -5, 10, 45);
        c.fillRect(15, -5, 10, 45);
        break;
      case 'mohawk':
        c.fillRect(-4, -40, 8, 50);
        c.fillStyle = lighten(col, 20);
        c.fillRect(-3, -38, 6, 46);
        break;
      case 'curly':
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          c.beginPath();
          c.arc(Math.cos(angle) * 20, Math.sin(angle) * 18 - 5, 10, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'fire':
        const colors = ['#FF4500', '#FF6600', '#FFD700', '#FF0000'];
        for (let i = 0; i < 8; i++) {
          c.fillStyle = colors[i % colors.length];
          c.beginPath();
          c.moveTo((i-4)*8, 5);
          c.lineTo((i-4)*8 + 4, -25 - Math.random()*15);
          c.lineTo((i-4)*8 + 8, 5);
          c.fill();
        }
        break;
      default:
        c.beginPath();
        c.ellipse(0, -10, 28, 22, 0, 0, Math.PI * 2);
        c.fill();
    }
  }

  function drawHatPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'baseball_cap':
        c.fillRect(-20, -5, 40, 12);
        c.beginPath();
        c.ellipse(0, -5, 22, 8, 0, Math.PI, 0);
        c.fill();
        c.fillRect(-25, 5, 50, 4); // brim
        break;
      case 'top_hat':
        c.fillRect(-14, -35, 28, 35);
        c.fillRect(-22, 0, 44, 6);
        c.fillStyle = lighten(col, 20);
        c.fillRect(-12, -10, 24, 3); // band
        break;
      case 'crown':
        c.fillStyle = '#FFD700';
        c.fillRect(-20, -5, 40, 15);
        c.beginPath();
        c.moveTo(-20, -5);
        c.lineTo(-15, -20);
        c.lineTo(-10, -5);
        c.lineTo(0, -25);
        c.lineTo(10, -5);
        c.lineTo(15, -20);
        c.lineTo(20, -5);
        c.fill();
        c.fillStyle = '#EF4444';
        c.beginPath(); c.arc(0, -20, 3, 0, Math.PI*2); c.fill();
        c.fillStyle = '#3B82F6';
        c.beginPath(); c.arc(-12, -15, 2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(12, -15, 2, 0, Math.PI*2); c.fill();
        break;
      case 'beanie':
        c.beginPath();
        c.ellipse(0, 0, 22, 18, 0, Math.PI, 0);
        c.fill();
        c.fillRect(-22, 0, 44, 8);
        c.fillStyle = darken(col, 20);
        for (let x = -20; x < 20; x += 4) c.fillRect(x, 0, 2, 8);
        break;
      case 'ninja_headband':
        c.fillRect(-24, -4, 48, 10);
        c.fillStyle = lighten(col, 15);
        c.fillRect(-24, -2, 48, 2); // stripe
        // Tail
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(24, -4);
        c.quadraticCurveTo(35, -15, 30, -25);
        c.lineTo(28, -23);
        c.quadraticCurveTo(32, -13, 24, 6);
        c.fill();
        break;
      default:
        c.fillRect(-18, -15, 36, 20);
    }
  }

  function drawAccessoryPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'backpack':
        c.fillRect(-16, -20, 32, 38);
        c.fillStyle = darken(col, 20);
        c.fillRect(-12, -10, 24, 12);
        c.fillStyle = '#888';
        c.fillRect(-8, -22, 4, 4);
        c.fillRect(4, -22, 4, 4);
        break;
      case 'wings':
        c.fillStyle = col;
        c.globalAlpha = 0.7;
        // Left wing
        c.beginPath();
        c.moveTo(-5, 0);
        c.quadraticCurveTo(-40, -30, -35, 10);
        c.quadraticCurveTo(-30, 25, -5, 15);
        c.fill();
        // Right wing
        c.beginPath();
        c.moveTo(5, 0);
        c.quadraticCurveTo(40, -30, 35, 10);
        c.quadraticCurveTo(30, 25, 5, 15);
        c.fill();
        c.globalAlpha = 1;
        break;
      case 'cape':
        c.fillRect(-18, -15, 36, 50);
        c.fillStyle = lighten(col, 15);
        c.fillRect(-18, -15, 36, 3);
        c.fillStyle = darken(col, 10);
        for (let y = -10; y < 35; y += 10) {
          c.beginPath();
          c.moveTo(-18, y);
          c.quadraticCurveTo(0, y+5, 18, y);
          c.stroke();
        }
        break;
      case 'scarf':
        c.fillRect(-20, -4, 40, 8);
        c.fillRect(-8, 4, 16, 20);
        c.fillStyle = darken(col, 15);
        c.fillRect(-8, 18, 16, 6); // fringe
        break;
      case 'necklace':
        c.strokeStyle = col;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, -5, 18, 0.3, Math.PI - 0.3);
        c.stroke();
        c.fillStyle = col;
        c.beginPath(); c.arc(0, 12, 5, 0, Math.PI*2); c.fill();
        break;
      default:
        c.fillRect(-15, -15, 30, 30);
    }
  }

  function drawBodyPartPreview(c, type, col) {
    c.fillStyle = col;
    switch(type) {
      case 'robot_arms':
        c.fillRect(-35, -15, 12, 35);
        c.fillRect(23, -15, 12, 35);
        c.fillStyle = '#666';
        c.fillRect(-33, 0, 8, 4);
        c.fillRect(25, 0, 8, 4);
        c.fillRect(-33, 10, 8, 4);
        c.fillRect(25, 10, 8, 4);
        break;
      case 'claws':
        for (let i = 0; i < 3; i++) {
          c.fillStyle = col;
          const x = -8 + i * 8;
          c.beginPath();
          c.moveTo(x - 20, 10);
          c.lineTo(x - 18, -15);
          c.lineTo(x - 16, 10);
          c.fill();
          c.beginPath();
          c.moveTo(x + 16, 10);
          c.lineTo(x + 18, -15);
          c.lineTo(x + 20, 10);
          c.fill();
        }
        break;
      case 'tail':
        c.strokeStyle = col;
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(0, 15);
        c.quadraticCurveTo(25, 5, 30, -15);
        c.quadraticCurveTo(33, -25, 28, -30);
        c.stroke();
        c.fillStyle = lighten(col, 20);
        c.beginPath(); c.arc(28, -30, 5, 0, Math.PI*2); c.fill();
        break;
      default:
        c.fillRect(-20, -20, 40, 40);
    }
  }

  // ==================== ITEM MODAL ====================

  function openItemModal(item) {
    selectedItem = item;
    selectedColor = item.colors && item.colors.length > 0 ? item.colors[0] : '';

    const modal = document.getElementById('item-modal');
    modal.style.display = 'flex';

    // Fill info
    document.getElementById('item-detail-name').textContent = item.name;
    document.getElementById('item-detail-desc').textContent = item.description;
    document.getElementById('item-detail-price').textContent = item.price;
    document.getElementById('item-detail-cat').textContent = categoryLabel(item.category);
    document.getElementById('item-detail-creator').textContent = item.creatorName || 'Tublox';
    document.getElementById('item-detail-sold').textContent = item.sold || 0;
    document.getElementById('item-balance').textContent = userData ? userData.urus : 0;

    // Rarity badge
    const badge = document.getElementById('item-rarity-badge');
    badge.textContent = item.rarity.toUpperCase();
    badge.className = 'item-rarity-badge rarity-' + item.rarity;

    // Stock
    const stockRow = document.getElementById('item-stock-row');
    if (item.isLimited && item.stock > 0) {
      stockRow.style.display = 'flex';
      document.getElementById('item-detail-stock').textContent = `${item.stock - item.sold}/${item.stock}`;
    } else {
      stockRow.style.display = 'none';
    }

    // Colors
    const colorsSection = document.getElementById('item-colors-section');
    const colorsDiv = document.getElementById('item-color-options');
    if (item.colors && item.colors.length > 0) {
      colorsSection.style.display = 'block';
      colorsDiv.innerHTML = '';
      item.colors.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'color-option' + (col === selectedColor ? ' selected' : '');
        btn.style.background = col;
        btn.addEventListener('click', () => {
          selectedColor = col;
          colorsDiv.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          drawItemThumbnail(document.getElementById('item-preview-canvas'), item, col);
        });
        colorsDiv.appendChild(btn);
      });
    } else {
      colorsSection.style.display = 'none';
    }

    // Preview
    drawItemThumbnail(document.getElementById('item-preview-canvas'), item, selectedColor);

    // Buttons
    const isOwned = ownedItemIds.has(item._id);
    const isEquipped = equippedData[item.category] && String(equippedData[item.category]) === String(item._id);

    document.getElementById('btn-buy-item').style.display = isOwned ? 'none' : 'block';
    document.getElementById('btn-owned-item').style.display = isOwned ? 'block' : 'none';
    document.getElementById('btn-equip-item').style.display = isOwned && !isEquipped ? 'block' : 'none';
    document.getElementById('btn-unequip-item').style.display = isOwned && isEquipped ? 'block' : 'none';

    // Captcha
    const captchaContainer = document.getElementById('captcha-container');
    if (!isOwned) {
      captchaContainer.style.display = 'flex';
      renderCaptcha();
    } else {
      captchaContainer.style.display = 'none';
    }

    // Clear status
    document.getElementById('item-buy-status').textContent = '';
    document.getElementById('item-buy-status').className = 'item-buy-status';
  }

  function renderCaptcha() {
    const widget = document.getElementById('hcaptcha-widget');
    widget.innerHTML = '';
    widget.setAttribute('data-sitekey', hcaptchaSiteKey);
    if (typeof hcaptcha !== 'undefined') {
      try {
        hcaptchaWidgetId = hcaptcha.render('hcaptcha-widget', {
          sitekey: hcaptchaSiteKey,
          theme: 'dark',
          callback: function(token) {
            // Token received
          }
        });
      } catch (e) {
        console.error('[hcaptcha render]', e);
      }
    }
  }

  // ==================== BUY ====================

  document.getElementById('btn-buy-item').addEventListener('click', async () => {
    if (!selectedItem) return;
    const statusEl = document.getElementById('item-buy-status');

    // Get captcha token
    let captchaToken = '';
    if (typeof hcaptcha !== 'undefined' && hcaptchaWidgetId !== null) {
      try { captchaToken = hcaptcha.getResponse(hcaptchaWidgetId); } catch (e) {}
    }

    if (!captchaToken && HCAPTCHA_SITEKEY !== '10000000-ffff-ffff-ffff-000000000000') {
      statusEl.className = 'item-buy-status error';
      statusEl.textContent = 'Please complete the captcha';
      return;
    }

    // Use test token in dev mode
    if (!captchaToken) captchaToken = 'test-token';

    statusEl.className = 'item-buy-status';
    statusEl.textContent = 'Processing...';

    try {
      const res = await fetch(`/api/market/buy/${selectedItem._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken, selectedColor })
      });
      const data = await res.json();

      if (data.success) {
        statusEl.className = 'item-buy-status success';
        statusEl.textContent = `Purchased ${data.itemName}!`;
        userData.urus = data.newBalance;
        document.getElementById('sidebar-urus').textContent = data.newBalance;
        document.getElementById('item-balance').textContent = data.newBalance;
        ownedItemIds.add(selectedItem._id);

        // Update buttons
        document.getElementById('btn-buy-item').style.display = 'none';
        document.getElementById('btn-owned-item').style.display = 'block';
        document.getElementById('btn-equip-item').style.display = 'block';
        document.getElementById('captcha-container').style.display = 'none';

        // Refresh lists
        loadMarketItems();
        loadInventory();
      } else {
        statusEl.className = 'item-buy-status error';
        statusEl.textContent = data.error || 'Purchase failed';
      }
    } catch (e) {
      statusEl.className = 'item-buy-status error';
      statusEl.textContent = 'Network error';
    }

    // Reset captcha
    if (typeof hcaptcha !== 'undefined' && hcaptchaWidgetId !== null) {
      try { hcaptcha.reset(hcaptchaWidgetId); } catch (e) {}
    }
  });

  // ==================== EQUIP ====================

  document.getElementById('btn-equip-item').addEventListener('click', async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/market/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem._id, action: 'equip', color: selectedColor })
      });
      const data = await res.json();
      if (data.success) {
        equippedData[selectedItem.category] = selectedItem._id;
        document.getElementById('btn-equip-item').style.display = 'none';
        document.getElementById('btn-unequip-item').style.display = 'block';
        document.getElementById('item-buy-status').className = 'item-buy-status success';
        document.getElementById('item-buy-status').textContent = 'Equipped!';
        loadInventory();
      }
    } catch (e) {
      console.error('[equip]', e);
    }
  });

  document.getElementById('btn-unequip-item').addEventListener('click', async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/market/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem._id, action: 'unequip' })
      });
      const data = await res.json();
      if (data.success) {
        delete equippedData[selectedItem.category];
        document.getElementById('btn-unequip-item').style.display = 'none';
        document.getElementById('btn-equip-item').style.display = 'block';
        document.getElementById('item-buy-status').className = 'item-buy-status success';
        document.getElementById('item-buy-status').textContent = 'Unequipped!';
        loadInventory();
      }
    } catch (e) {
      console.error('[unequip]', e);
    }
  });

  // ==================== MODAL CLOSE ====================

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('item-modal').style.display = 'none';
    selectedItem = null;
  });

  document.getElementById('item-modal').addEventListener('click', (e) => {
    if (e.target.id === 'item-modal') {
      document.getElementById('item-modal').style.display = 'none';
      selectedItem = null;
    }
  });

  // ==================== TABS ====================

  document.querySelectorAll('.market-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      document.getElementById('tab-shop').style.display = tabName === 'shop' ? 'block' : 'none';
      document.getElementById('tab-inventory').style.display = tabName === 'inventory' ? 'block' : 'none';
      if (tabName === 'inventory') loadInventory();
    });
  });

  // ==================== CATEGORY TABS ====================

  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedCategory = tab.dataset.cat;
      document.getElementById('market-loading').style.display = 'flex';
      document.getElementById('market-grid').style.display = 'none';
      document.getElementById('market-empty').style.display = 'none';
      loadMarketItems();
    });
  });

  // ==================== SEARCH & SORT ====================

  let searchTimer = null;
  document.getElementById('market-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      document.getElementById('market-loading').style.display = 'flex';
      document.getElementById('market-grid').style.display = 'none';
      loadMarketItems();
    }, 400);
  });

  document.getElementById('market-sort').addEventListener('change', () => loadMarketItems());
  document.getElementById('market-rarity').addEventListener('change', () => loadMarketItems());

  // ==================== UTILS ====================

  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function categoryLabel(cat) {
    const labels = { shirt: 'Shirt', pants: 'Pants', face: 'Face', hair: 'Hair', hat: 'Hat', accessory: 'Accessory', body_part: 'Body Part' };
    return labels[cat] || cat;
  }

  function lighten(hex, amount) {
    hex = hex.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0,2),16) + amount);
    const g = Math.min(255, parseInt(hex.substring(2,4),16) + amount);
    const b = Math.min(255, parseInt(hex.substring(4,6),16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amount) {
    hex = hex.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0,2),16) - amount);
    const g = Math.max(0, parseInt(hex.substring(2,4),16) - amount);
    const b = Math.max(0, parseInt(hex.substring(4,6),16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  // ==================== LOGOUT ====================

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // ==================== INIT ====================

  async function init() {
    await checkAuth();
    await loadCaptchaKey();
    await loadInventory(); // Load owned items first for badges
    await loadMarketItems();
  }

  init();
})();