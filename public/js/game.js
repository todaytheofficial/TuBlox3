(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  const LERP = 0.15, SEND_RATE = 50, ATK_DUR = 400, DT_MAX = 0.05, CULL = 80;

  const urlParams = new URLSearchParams(window.location.search);
  const placeName = urlParams.get('place') || 'platformer';

  function getToken() { const m = document.cookie.match(/(?:^|; )token=([^;]*)/); return m ? m[1] : null; }
  const token = getToken();
  if (!token) { window.location.href = '/auth'; return; }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  let ready = false, me = null, myId = null, pd = null;
  let rp = {}, cam = { x: 0, y: 0 }, keys = {};
  let chatOn = false, escOn = false, lastSend = 0;
  let fc = 0, fps = 60, fpsT = 0, anim = 0;
  let death = { on: false, t: 0, dur: 1.5 };
  let wCollect = [], collected = new Set(), fx = {};
  let flOn = true, shOn = true;
  let wModels = [], doors = {}, doorAnim = {}, levers = {}, keycards = {};
  let iCool = 0, iMsgs = [];

  let noteReading = false, noteText = '';
  let collectedNotes = [];

  let H = {
    on: false, bat: 100, maxBat: 100, drain: 0.8, regen: 0.3,
    flicker: false, flickT: 0, breath: 0, shX: 0, shY: 0,
    scares: new Set(), scare: null, scareT: 0,
    chase: null, parts: [], msgs: [], eyes: [], hb: 0, near: false
  };

  const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  let joy = { on: false, sx: 0, sy: 0, dx: 0, dy: 0 };
  let mJump = false, mAtk = false;
  let darkCanvas = null, darkCtx = null;
  let cullL = 0, cullR = 0, cullT = 0, cullB = 0;

  const IV = {
    sword: {
      name: 'Sword', color: '#CCC', tog: false,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 3) * 3); c.rotate(-0.524); c.fillStyle = '#8B6914'; c.fillRect(-2, -4, 4, 8); c.fillStyle = '#CCAA00'; c.fillRect(-6, 4, 12, 3); c.fillStyle = '#CCC'; c.fillRect(-1.5, 7, 3, 18); c.fillStyle = '#EEE'; c.fillRect(-1.5, 7, 1, 18); c.fillStyle = '#DDD'; c.beginPath(); c.moveTo(-1.5, 25); c.lineTo(1.5, 25); c.lineTo(0, 28); c.fill(); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); c.rotate(-0.785); const r = s / 52; c.fillStyle = '#8B6914'; c.fillRect(-2 * r, -3 * r, 4 * r, 6 * r); c.fillStyle = '#CCAA00'; c.fillRect(-4 * r, 3 * r, 8 * r, 2 * r); c.fillStyle = '#CCC'; c.fillRect(-r, 5 * r, 3 * r, 16 * r); c.fillStyle = '#EEE'; c.fillRect(-r, 5 * r, r, 16 * r); c.restore(); }
    },
    flashlight: {
      name: 'Flashlight', color: '#FFE066', tog: true,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 2.5) * 2); c.fillStyle = '#555'; c.fillRect(-4, -8, 8, 16); c.fillStyle = '#FFE066'; c.fillRect(-5, -10, 10, 3); c.fillStyle = 'rgba(255,224,102,0.15)'; c.beginPath(); c.moveTo(-5, -10); c.lineTo(-15, -30); c.lineTo(15, -30); c.lineTo(5, -10); c.fill(); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#555'; c.fillRect(-4 * r, -6 * r, 8 * r, 14 * r); c.fillStyle = '#FFE066'; c.fillRect(-5 * r, -8 * r, 10 * r, 3 * r); c.restore(); },
      dE(c, p, t) { if (H.on) return; const it = p.inventory?.[p.activeSlot]; if (!it || it.id !== 'flashlight') return; const on = p._me ? flOn : (p.iSt?.flashlightOn !== false); if (!on) return; const rad = it.radius || 200, br = it.brightness || 1, px = p.x + p.width / 2, py = p.y + p.height / 2, dir = p.direction || 1, ang = dir === 1 ? 0 : Math.PI; c.save(); const g = c.createRadialGradient(px, py, 10, px + dir * rad * 0.6, py, rad); g.addColorStop(0, `rgba(255,240,180,${0.25 * br})`); g.addColorStop(0.5, `rgba(255,240,180,${0.1 * br})`); g.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(px, py); c.arc(px, py, rad, ang - 0.785, ang + 0.785); c.closePath(); c.fill(); c.restore(); }
    },
    shield: {
      name: 'Shield', color: '#4488CC', tog: true,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 2) * 2); c.fillStyle = '#4488CC'; c.beginPath(); c.moveTo(0, -12); c.lineTo(10, -6); c.lineTo(10, 4); c.lineTo(0, 12); c.lineTo(-10, 4); c.lineTo(-10, -6); c.closePath(); c.fill(); c.strokeStyle = '#66AAEE'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#66AAEE'; c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.fill(); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#4488CC'; c.beginPath(); c.moveTo(0, -10 * r); c.lineTo(8 * r, -5 * r); c.lineTo(8 * r, 3 * r); c.lineTo(0, 10 * r); c.lineTo(-8 * r, 3 * r); c.lineTo(-8 * r, -5 * r); c.closePath(); c.fill(); c.strokeStyle = '#66AAEE'; c.lineWidth = r; c.stroke(); c.restore(); },
      dE(c, p, t) { const it = p.inventory?.[p.activeSlot]; if (!it || it.id !== 'shield') return; const on = p._me ? shOn : (p.iSt?.shieldActive !== false); if (!on) return; const px = p.x + p.width / 2, py = p.y + p.height / 2, a = 0.3 + Math.sin(t * 3) * 0.1; c.save(); c.strokeStyle = `rgba(68,136,204,${a})`; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 28, 0, 6.283); c.stroke(); c.fillStyle = `rgba(68,136,204,${a * 0.15})`; c.fill(); c.restore(); }
    },
    speed_boost: {
      name: 'Speed Boost', color: '#FFD700', tog: false,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 4) * 2); c.fillStyle = '#FFD700'; c.beginPath(); c.moveTo(2, -12); c.lineTo(-4, 0); c.lineTo(0, 0); c.lineTo(-2, 12); c.lineTo(6, 0); c.lineTo(2, 0); c.closePath(); c.fill(); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#FFD700'; c.beginPath(); c.moveTo(2 * r, -10 * r); c.lineTo(-4 * r, 0); c.lineTo(0, 0); c.lineTo(-2 * r, 10 * r); c.lineTo(6 * r, 0); c.lineTo(2 * r, 0); c.closePath(); c.fill(); c.restore(); },
      onC(p, it) { fx.speed = { m: it.multiplier || 1.5, end: Date.now() + (it.duration || 5000) }; sysMsg(`Speed x${it.multiplier || 1.5}!`); },
      dE(c, p, t) { if (!fx.speed || Date.now() > fx.speed.end) { delete fx.speed; return; } const px = p.x + p.width / 2, py = p.y + p.height; for (let i = 0; i < 3; i++) { const o = (t * 200 + i * 40) % 60; c.fillStyle = `rgba(255,215,0,${(1 - o / 60) * 0.4})`; c.fillRect(px - p.direction * (o + 10), py - 10 - i * 8, 12, 2); } }
    },
    jump_boost: {
      name: 'Jump Boost', color: '#44CC44', tog: false,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 3) * 3); c.fillStyle = '#44CC44'; c.fillRect(-6, 4, 12, 4); c.fillStyle = '#66EE66'; c.beginPath(); c.moveTo(0, -14); c.lineTo(5, -8); c.lineTo(-5, -8); c.closePath(); c.fill(); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#44CC44'; c.fillRect(-5 * r, 2 * r, 10 * r, 3 * r); c.fillStyle = '#66EE66'; c.beginPath(); c.moveTo(0, -8 * r); c.lineTo(5 * r, -2 * r); c.lineTo(-5 * r, -2 * r); c.closePath(); c.fill(); c.restore(); },
      onC(p, it) { fx.jump = { m: it.multiplier || 1.5, end: Date.now() + (it.duration || 5000) }; sysMsg(`Jump x${it.multiplier || 1.5}!`); },
      dE(c, p, t) { if (!fx.jump || Date.now() > fx.jump.end) { delete fx.jump; return; } const px = p.x + p.width / 2, py = p.y + p.height; for (let i = 0; i < 4; i++) { const a2 = t * 5 + i * 1.571, r = 8 + Math.sin(t * 8 + i) * 4; c.fillStyle = `rgba(68,204,68,${0.3 + Math.sin(t * 4 + i) * 0.15})`; c.fillRect(px + Math.cos(a2) * r - 1.5, py + Math.sin(t * 6 + i) * 3 - 1.5, 3, 3); } }
    },
    coin: { name: 'Coin', color: '#FFD700', tog: false, dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 3) * 2); const sc = Math.abs(Math.cos(t * 2)) || 0.1; c.scale(sc, 1); c.fillStyle = '#FFD700'; c.beginPath(); c.arc(0, 0, 8, 0, 6.283); c.fill(); c.strokeStyle = '#DAA520'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#DAA520'; c.font = 'bold 8px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, 0); c.restore(); }, dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#FFD700'; c.beginPath(); c.arc(0, 0, 7 * r, 0, 6.283); c.fill(); c.strokeStyle = '#DAA520'; c.lineWidth = r; c.stroke(); c.restore(); }, onC(p, it) { sysMsg(`+${it.value || 1} coin!`); } },
    heart: { name: 'Heart', color: '#EF4444', tog: false, dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 2) * 2); const p = 1 + Math.sin(t * 4) * 0.1; c.scale(p, p); c.fillStyle = '#EF4444'; c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-8, -2, -10, -8, -5, -10); c.bezierCurveTo(-2, -12, 0, -9, 0, -7); c.bezierCurveTo(0, -9, 2, -12, 5, -10); c.bezierCurveTo(10, -8, 8, -2, 0, 4); c.fill(); c.restore(); }, dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#EF4444'; c.beginPath(); c.moveTo(0, 4 * r); c.bezierCurveTo(-7 * r, -2 * r, -9 * r, -7 * r, -4 * r, -9 * r); c.bezierCurveTo(-r, -10 * r, 0, -8 * r, 0, -6 * r); c.bezierCurveTo(0, -8 * r, r, -10 * r, 4 * r, -9 * r); c.bezierCurveTo(9 * r, -7 * r, 7 * r, -2 * r, 0, 4 * r); c.fill(); c.restore(); }, onC(p, it) { const h = it.healAmount || 25; if (p.hp !== undefined) { p.hp = Math.min(p.maxHp || 100, p.hp + h); sysMsg(`+${h} HP!`); } } },
    key: { name: 'Key', color: '#DAA520', tog: false, dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 2) * 2); c.rotate(Math.sin(t * 1.5) * 0.2); c.strokeStyle = '#DAA520'; c.lineWidth = 2; c.beginPath(); c.arc(0, -6, 5, 0, 6.283); c.stroke(); c.fillStyle = 'rgba(218,165,32,0.3)'; c.fill(); c.fillStyle = '#DAA520'; c.fillRect(-1, -1, 2, 14); c.fillRect(1, 9, 4, 2); c.fillRect(1, 5, 3, 2); c.restore(); }, dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.strokeStyle = '#DAA520'; c.lineWidth = 1.5 * r; c.beginPath(); c.arc(0, -5 * r, 4 * r, 0, 6.283); c.stroke(); c.fillStyle = '#DAA520'; c.fillRect(-r, 0, 2 * r, 12 * r); c.fillRect(r, 8 * r, 3 * r, 2 * r); c.restore(); }, onC() { sysMsg('Key collected!'); } },
    battery: { name: 'Battery', color: '#44EE44', tog: false, dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 3) * 2); c.fillStyle = '#333'; c.fillRect(-4, -7, 8, 14); c.fillStyle = '#555'; c.fillRect(-2, -9, 4, 3); c.fillStyle = '#44EE44'; c.fillRect(-2, -4, 4, 8); const ch = 8 * (0.5 + Math.sin(t * 2) * 0.3); c.fillStyle = '#66FF66'; c.fillRect(-2, -4 + (8 - ch), 4, ch); c.restore(); }, dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#333'; c.fillRect(-3 * r, -6 * r, 6 * r, 12 * r); c.fillStyle = '#555'; c.fillRect(-2 * r, -8 * r, 4 * r, 3 * r); c.fillStyle = '#44EE44'; c.fillRect(-2 * r, -3 * r, 4 * r, 7 * r); c.restore(); }, onC(p, it) { const r = it.recharge || 25; H.bat = Math.min(H.maxBat, H.bat + r); sysMsg(`+${r}% battery`); } },
    note: {
      name: 'Note', color: '#CCBB88', tog: false,
      dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 1.5) * 1.5); c.fillStyle = '#CCBB88'; c.fillRect(-6, -8, 12, 16); c.fillStyle = '#AA9966'; c.fillRect(-4, -5, 8, 1); c.fillRect(-4, -2, 6, 1); c.fillRect(-4, 1, 7, 1); c.fillRect(-4, 4, 5, 1); c.restore(); },
      dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#CCBB88'; c.fillRect(-5 * r, -7 * r, 10 * r, 14 * r); c.fillStyle = '#AA9966'; c.fillRect(-3 * r, -4 * r, 6 * r, r); c.fillRect(-3 * r, -r, 5 * r, r); c.fillRect(-3 * r, 2 * r, 6 * r, r); c.restore(); },
      onC(p, it) {
        const t = it.text || 'An old note...';
        collectedNotes.push(t);
        sysMsg('Found a note! Hold to read.');
        if (mobile) updateNoteBtn();
      }
    }
  };

  const UNK = { name: '???', color: '#666', tog: false, dW(c, x, y, t) { c.save(); c.translate(x, y + Math.sin(t * 2) * 2); c.fillStyle = '#444'; c.fillRect(-7, -7, 14, 14); c.fillStyle = '#999'; c.font = 'bold 10px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 0); c.restore(); }, dH(c, x, y, s) { c.save(); c.translate(x + s / 2, y + s / 2); const r = s / 52; c.fillStyle = '#444'; c.fillRect(-6 * r, -6 * r, 12 * r, 12 * r); c.fillStyle = '#999'; c.font = `bold ${8 * r}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 0); c.restore(); } };
  function gv(id) { return IV[id] || UNK; }

  function inView(x, y, w, h) { return x + w > cullL && x < cullR && y + h > cullT && y < cullB; }
  function updateCull() { cullL = cam.x - CULL; cullR = cam.x + canvas.width + CULL; cullT = cam.y - CULL; cullB = cam.y + canvas.height + CULL; }

  const KC = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
  function kcCol(p) { return KC[p?.keycardColor || 'red'] || KC.red; }

  function showNote(text) { noteReading = true; noteText = text; document.getElementById('note-overlay').style.display = 'flex'; document.getElementById('note-text').textContent = text; }
  function hideNote() { noteReading = false; noteText = ''; document.getElementById('note-overlay').style.display = 'none'; }
  function updateNoteBtn() { if (!mobile) return; const nb = document.getElementById('mobile-btn-note'); if (!nb) return; nb.style.display = collectedNotes.length > 0 ? 'flex' : 'none'; }

  function drawDoorFrame(c, x, y, w, h) { c.fillStyle = '#1a1a1a'; c.fillRect(x - 3, y - 3, w + 6, h + 6); c.fillStyle = '#222'; c.fillRect(x, y, w, h); }

  function drawDoorPanel(c, x, y, w, h, color, dt, props, t) {
    c.fillStyle = color; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, y, w, 3);
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x, y + h - 3, w, 3);
    if (dt === 'key') {
      const hx = x + w - 12;
      c.fillStyle = '#B8860B'; c.beginPath(); c.arc(hx, y + h * 0.45, 4, 0, 6.283); c.fill();
      c.fillStyle = '#DAA520'; c.beginPath(); c.arc(hx, y + h * 0.55, 3, 0, 6.283); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(hx, y + h * 0.55, 1.5, 0, 6.283); c.fill();
    } else if (dt === 'keycard') {
      const cc = kcCol(props);
      c.fillStyle = cc; c.fillRect(x, y, 3, h); c.fillRect(x + w - 3, y, 3, h);
      const crX = x + w - 18, crY = y + h / 2 - 14;
      c.fillStyle = '#1a1a1a'; c.fillRect(crX, crY, 14, 28);
      c.fillStyle = cc; c.fillRect(crX + 2, crY + 6, 10, 3);
      c.fillStyle = Math.sin(t * 3) > 0 ? cc : '#222'; c.beginPath(); c.arc(crX + 7, crY + 20, 2.5, 0, 6.283); c.fill();
    } else {
      c.strokeStyle = '#777'; c.lineWidth = 2; c.beginPath(); c.arc(x + w / 2, y + h / 2, 9, 0, 6.283); c.stroke();
      for (let a = 0; a < 6.283; a += 1.047) { c.beginPath(); c.moveTo(x + w / 2 + Math.cos(a + t) * 9, y + h / 2 + Math.sin(a + t) * 9); c.lineTo(x + w / 2 + Math.cos(a + t) * 13, y + h / 2 + Math.sin(a + t) * 13); c.stroke(); }
      c.fillStyle = '#555'; c.beginPath(); c.arc(x + w / 2, y + h / 2, 3, 0, 6.283); c.fill();
    }
  }

  function drawDoor(c, m, t) {
    const mw = m.w || 40, mh = m.h || 80;
    if (!inView(m.x - 5, m.y - 15, mw + 10, mh + 20)) return;
    const a = doorAnim[m.id], raw = a ? a.p : 0;
    const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const dir = m.properties?.direction || 'right';
    const color = m.properties?.color || (m.type === 'door_key' ? '#8B4513' : '#555');
    let dt = 'key'; if (m.type === 'door_keycard') dt = 'keycard'; else if (m.type === 'door_lever') dt = 'lever';
    drawDoorFrame(c, m.x, m.y, mw, mh);
    if (p > 0.01) { c.fillStyle = `rgba(0,0,0,${0.4 + p * 0.4})`; c.fillRect(m.x, m.y, mw, mh); }
    if (p < 0.98) { c.save(); c.beginPath(); c.rect(m.x - 5, m.y - 5, mw + 10, mh + 10); c.clip(); let px = m.x, py = m.y; if (dir === 'right') px += mw * p; else if (dir === 'left') px -= mw * p; else if (dir === 'up') py -= mh * p; else if (dir === 'down') py += mh * p; drawDoorPanel(c, px, py, mw, mh, color, dt, m.properties, t); c.restore(); }
    c.strokeStyle = '#333'; c.lineWidth = 1; c.strokeRect(m.x - 3, m.y - 3, mw + 6, mh + 6);
    c.fillStyle = '#252525'; c.fillRect(m.x - 5, m.y - 6, mw + 10, 4); c.fillRect(m.x - 5, m.y + mh + 3, mw + 10, 3);
    if (p < 0.05) { c.font = 'bold 10px Inter'; c.textAlign = 'center'; c.fillText(dt === 'key' ? '🔒' : dt === 'keycard' ? '💳' : '⚙', m.x + mw / 2, m.y - 12); }
  }

  function drawLever(c, x, y, w, h, act, t) {
    if (!inView(x, y, w, h)) return;
    c.fillStyle = '#444'; c.fillRect(x, y + h - 8, w, 8);
    c.fillStyle = '#666'; c.beginPath(); c.arc(x + w / 2, y + h - 8, 5, 0, 6.283); c.fill();
    const ang = act ? 0.7 : -0.7, lx = x + w / 2 + Math.sin(ang) * (h - 12), ly = y + h - 8 - Math.cos(ang) * (h - 12);
    c.strokeStyle = '#888'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + w / 2, y + h - 8); c.lineTo(lx, ly); c.stroke();
    c.fillStyle = act ? '#44CC44' : '#CC3333'; c.beginPath(); c.arc(lx, ly, 5, 0, 6.283); c.fill();
  }

  function drawKeycard(c, x, y, w, h, props, t) { if (!inView(x - 20, y - 20, w + 40, h + 40)) return; const cc = kcCol(props); c.save(); c.translate(x + w / 2, y + h / 2 + Math.sin(t * 2) * 3); c.rotate(Math.sin(t * 1.5) * 0.1); c.fillStyle = cc; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-w / 2, -h / 2 + h * 0.3, w, h * 0.15); c.fillStyle = '#FFD700'; c.fillRect(-w / 2 + 3, -h / 2 + 3, 6, 4); c.restore(); }

  function getModelBlocks() { const b = []; for (let i = 0; i < wModels.length; i++) { const m = wModels[i]; if (!m.type.startsWith('door_')) continue; const a = doorAnim[m.id], p = a ? a.p : 0; if (p >= 0.95) continue; const mw = m.w || 40, mh = m.h || 80, dir = m.properties?.direction || 'right'; let bx = m.x, by = m.y, bw = mw, bh = mh; if (dir === 'up') { bh = mh * (1 - p); by = m.y + mh * p; } else if (dir === 'down') bh = mh * (1 - p); else if (dir === 'left') { bw = mw * (1 - p); bx = m.x + mw * p; } else bw = mw * (1 - p); if (bw > 1 && bh > 1) b.push({ x: bx, y: by, w: bw, h: bh }); } return b; }

  function nearI() {
    if (!me) return null;
    const px = me.x + me.width / 2, py = me.y + me.height / 2;
    let best = null, bd = Infinity;
    for (let i = 0; i < wModels.length; i++) { const m = wModels[i]; const mw = m.w || 40, mh = m.h || 80; const d = Math.sqrt((px - m.x - mw / 2) ** 2 + (py - m.y - mh / 2) ** 2); const can = m.type === 'lever' || (m.type === 'door_key' && !doors[m.id]) || (m.type === 'door_keycard' && !doors[m.id]); if (can && d < 60 + Math.max(mw, mh) / 2 && d < bd) { best = m; bd = d; } }
    return best;
  }

  function interact() {
    if (!me || iCool > 0) return;
    iCool = 0.3;
    const px = me.x + me.width / 2, py = me.y + me.height / 2;
    for (let i = 0; i < wModels.length; i++) {
      const m = wModels[i], mw = m.w || 40, mh = m.h || 80;
      const d = Math.sqrt((px - m.x - mw / 2) ** 2 + (py - m.y - mh / 2) ** 2);
      if (d > 60 + Math.max(mw, mh) / 2) continue;
      if (m.type === 'lever') { if (!levers[m.id]) { levers[m.id] = true; if (m.properties?.targetId) openD(m.properties.targetId); wModels.forEach(d2 => { if (d2.type === 'door_lever' && d2.properties?.leverId === m.id) openD(d2.id); }); iMsg('Lever activated!'); } else if (!m.properties?.oneTime) { levers[m.id] = false; if (m.properties?.targetId) closeD(m.properties.targetId); wModels.forEach(d2 => { if (d2.type === 'door_lever' && d2.properties?.leverId === m.id) closeD(d2.id); }); iMsg('Lever deactivated'); } return; }
      if (m.type === 'door_key' && !doors[m.id]) { const ki = me.inventory?.findIndex(it => it?.id === 'key'); if (ki !== undefined && ki !== -1) { openD(m.id); me.inventory[ki] = null; iMsg('Door unlocked!'); } else iMsg('You need a key!'); return; }
      if (m.type === 'door_keycard' && !doors[m.id]) { const req = m.properties?.keycardColor || 'red'; if (keycards[req]) { openD(m.id); iMsg(`${req} keycard door opened!`); } else iMsg(`Need ${req} keycard!`); return; }
    }
  }

  function openD(id) { doors[id] = true; doorAnim[id] = { p: doorAnim[id]?.p || 0, open: true }; }
  function closeD(id) { doors[id] = false; doorAnim[id] = { p: doorAnim[id]?.p || 1, open: false }; }
  function iMsg(t) { iMsgs.push({ text: t, timer: 3, alpha: 1 }); sysMsg(t); }
  function updateDoors(dt) { const ids = Object.keys(doorAnim); for (let i = 0; i < ids.length; i++) { const id = ids[i], a = doorAnim[id], m = wModels.find(md => md.id === id), spd = m?.properties?.openSpeed || 2; if (a.open) a.p = Math.min(1, a.p + spd * dt); else a.p = Math.max(0, a.p - spd * dt); } }
  function checkKC() { if (!me) return; const px = me.x + me.width / 2, py = me.y + me.height / 2; for (let i = 0; i < wModels.length; i++) { const m = wModels[i]; if (m.type !== 'keycard' || keycards[m.id]) continue; const mw = m.w || 30, mh = m.h || 20; if (Math.sqrt((px - m.x - mw / 2) ** 2 + (py - m.y - mh / 2) ** 2) < 35) { const c = m.properties?.cardColor || 'red'; keycards[c] = true; keycards[m.id] = true; iMsg(`Collected ${c} keycard!`); } } }

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  const socket = io();
  function setLoad(p, t) { document.getElementById('loader-fill').style.width = p + '%'; document.getElementById('loader-text').textContent = t; }
  setLoad(20, 'Connecting...');

  socket.on('connect', () => { setLoad(40, 'Authenticating...'); socket.emit('join-game', { token, place: placeName }); });

  socket.on('game-init', (data) => {
    setLoad(60, 'Loading TuGame...');
    pd = data.place; me = data.player; myId = data.player.id;
    me.cpIdx = -1; me.atkT = 0; me._me = true;
    wCollect = []; collected = new Set(); fx = {};
    wModels = []; doors = {}; doorAnim = {}; levers = {}; keycards = {};
    flOn = true; shOn = true; collectedNotes = [];

    if (pd.horror || pd.darkness) { H.on = true; H.bat = pd.flashlightBattery || 100; H.maxBat = pd.flashlightBattery || 100; H.drain = pd.batteryDrainRate || 0.8; H.regen = pd.batteryRechargeRate || 0.3; H.scares = new Set(); H.parts = []; H.msgs = []; H.eyes = []; H.chase = null; for (let i = 0; i < 30; i++) H.parts.push({ x: Math.random() * 5600, y: Math.random() * 900, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2, sz: 1 + Math.random() * 2, a: Math.random() * 0.3 }); }
    if (pd.settings && typeof pd.settings === 'object') { const s = pd.settings; if (s.darknessEnabled) { H.on = true; H.bat = s.batteryMax || 100; H.maxBat = s.batteryMax || 100; H.drain = s.batteryDrain || 0.8; H.regen = s.batteryRegen || 0.3; pd.flashlightRadius = pd.flashlightRadius || s.flashlightRadius || 220; pd.flashlightBrightness = pd.flashlightBrightness || s.flashlightBrightness || 1.2; pd.flashlightSpread = pd.flashlightSpread || s.flashlightSpread || 0.45; pd.ambientLight = pd.ambientLight || s.ambientLight || 0.02; pd.flickerChance = pd.flickerChance || s.flickerChance || 0.003; if (s.particles) pd.ambientParticles = true; if (s.breathing) pd.breathingEffect = true; if (s.footstepShake) pd.footstepShake = true; } if (s.fogEnabled) pd.fog = { on: true, color: s.fogColor, density: s.fogDensity, start: s.fogStart, end: s.fogEnd }; if (s.vignette) pd.vignette = { on: true, intensity: s.vignetteIntensity, color: s.vignetteColor }; if (s.tintEnabled) pd.tint = { on: true, color: s.tintColor, opacity: s.tintOpacity }; }
    if (pd.collectibleItems) pd.collectibleItems.forEach((ci, idx) => { wCollect.push({ id: 'wc_' + idx, type: ci.type, x: ci.x, y: ci.y, props: ci.properties || {}, done: false, touch: ci.collectOnTouch !== false }); });
    if (pd.items && Array.isArray(pd.items)) pd.items.forEach((item, idx) => { if (!item) return; if (item.giveOnStart) { if (me.inventory) { const es = me.inventory.findIndex(s => s == null); if (es !== -1) me.inventory[es] = { id: item.type, ...(item.properties || {}) }; } collected.add(item.id); } else wCollect.push({ id: item.id || ('si_' + idx), type: item.type, x: item.x, y: item.y, props: item.properties || {}, done: false, touch: item.collectOnTouch !== false }); });
    if (pd.models) pd.models.forEach(m => { if (!m) return; wModels.push({ id: m.id, type: m.type, x: m.x, y: m.y, w: m.w || (m.type === 'lever' ? 30 : m.type === 'keycard' ? 30 : 40), h: m.h || (m.type === 'lever' ? 40 : m.type === 'keycard' ? 20 : 80), properties: m.properties || {} }); });

    rp = {}; for (const [id, p] of Object.entries(data.players)) { if (id !== myId) rp[id] = { ...p, tx: p.x, ty: p.y, dx: p.x, dy: p.y, atkT: 0, iSt: {} }; }
    document.getElementById('hud-place').textContent = pd.name; updatePC(); updateMB(); updateMS();

    setLoad(100, 'Ready!');
    setTimeout(() => { const ls = document.getElementById('loading-screen'); ls.style.opacity = '0'; setTimeout(() => { ls.style.display = 'none'; ready = true; sysMsg(`Welcome to ${pd.name}!`); if (H.on) sysMsg("It's dark... Press F for flashlight"); if (wModels.length > 0) sysMsg('Press E to interact'); if (mobile) sysMsg('Touch controls enabled'); if (me.inventory) me.inventory.forEach(item => { if (item) sysMsg(`Equipped: ${gv(item.id).name}`); }); }, 500); }, 400);
  });

  socket.on('player-joined', (p) => { rp[p.id] = { ...p, tx: p.x, ty: p.y, dx: p.x, dy: p.y, atkT: 0, iSt: {} }; updatePC(); sysMsg(`${p.username} joined`); });
  socket.on('player-left', (d) => { const p = rp[d.id]; if (p) sysMsg(`${p.username} left`); delete rp[d.id]; updatePC(); });
  socket.on('player-moved', (d) => { const p = rp[d.id]; if (!p) return; p.tx = d.x; p.ty = d.y; p.vx = d.vx; p.vy = d.vy; p.direction = d.direction; p.state = d.state; p.frame = d.frame; p.activeSlot = d.activeSlot; p.hp = d.hp; if (d.itemState) p.iSt = d.itemState; });
  socket.on('player-respawn', (d) => { if (me) { death.on = true; death.t = 0; death.ox = me.x; death.oy = me.y; death.nx = d.x; death.ny = d.y; death.nh = d.hp; } });
  socket.on('player-hit', (d) => { if (me) { const si = me.inventory?.[me.activeSlot]; if (si?.id === 'shield' && shOn && Math.random() < (si.blockChance || 0.5)) { sysMsg('Shield blocked!'); return; } me.hp = d.hp; me.vx += d.knockX; me.vy += d.knockY; } });
  socket.on('player-attack', (d) => { const p = rp[d.id]; if (p) { p.attacking = true; p.atkT = Date.now(); } });
  socket.on('inventory-update', (d) => { if (me) { me.inventory = d.inventory; updateMB(); updateMS(); } });
  socket.on('kill-feed', (d) => sysMsg(`${d.killer} eliminated ${d.victim}`));
  socket.on('chat-message', (d) => addChat(d.username, d.msg));
  socket.on('error-msg', (m) => { alert(m); window.location.href = '/home'; });
  socket.on('kicked', (r) => { ready = false; const o = document.getElementById('kicked-overlay'); if (o) o.style.display = 'flex'; const re = document.getElementById('kicked-reason'); if (re) re.textContent = r || 'Disconnected'; });

  function toggleItem() { if (!me) return; const it = me.inventory?.[me.activeSlot]; if (!it) return; const v = gv(it.id); if (!v.tog) return; if (it.id === 'flashlight') { flOn = !flOn; sysMsg(flOn ? 'Flashlight ON' : 'Flashlight OFF'); } else if (it.id === 'shield') { shOn = !shOn; sysMsg(shOn ? 'Shield raised' : 'Shield lowered'); } updateMU(); }

  function updateMB() { if (!mobile || !me) return; const has = me.inventory?.some(i => i?.id === 'sword'); const ab = document.getElementById('mobile-btn-attack'); if (ab) ab.style.display = (pd?.type === 'pvp' || has) ? 'flex' : 'none'; updateMU(); updateMI(); updateNoteBtn(); }
  function updateMU() { if (!mobile || !me) return; const ub = document.getElementById('mobile-btn-use'); if (!ub) return; const it = me.inventory?.[me.activeSlot]; ub.style.display = (it && gv(it.id).tog) ? 'flex' : 'none'; }
  function updateMI() { if (!mobile) return; const ib = document.getElementById('mobile-btn-interact'); if (ib) ib.style.display = nearI() ? 'flex' : 'none'; }
  function updateMS() { if (!mobile || !me) return; document.querySelectorAll('.mobile-slot').forEach(btn => { const s = parseInt(btn.dataset.slot); const it = me.inventory?.[s]; btn.classList.toggle('active', s === me.activeSlot); btn.classList.toggle('has-item', !!it); const od = btn.querySelector('.mobile-slot-dot'); if (od) od.remove(); if (it) { const v = gv(it.id); btn.textContent = v.name.substring(0, 2).toUpperCase(); btn.style.borderColor = s === me.activeSlot ? v.color : `${v.color}44`; const d = document.createElement('div'); d.className = 'mobile-slot-dot'; d.style.background = v.color; btn.appendChild(d); } else { btn.textContent = String(s + 1); btn.style.borderColor = ''; } }); }

  window.addEventListener('keydown', (e) => {
    if (noteReading) { return; }
    if (chatOn) { if (e.key === 'Enter') { const m = document.getElementById('chat-input').value.trim(); if (m) socket.emit('chat-message', { msg: m }); closeChat(); e.preventDefault(); return; } if (e.key === 'Escape') { closeChat(); e.preventDefault(); return; } return; }
    if (e.key === 'Escape') { toggleEsc(); e.preventDefault(); return; }
    if (escOn) return;
    if (e.key === 'Enter') { openChat(); e.preventDefault(); return; }
    if (e.key >= '1' && e.key <= '4') { const s = parseInt(e.key) - 1; if (me) { me.activeSlot = s; socket.emit('switch-slot', { slot: s }); updateMB(); updateMS(); } e.preventDefault(); return; }
    if (e.key === 'f' || e.key === 'F') { toggleItem(); e.preventDefault(); return; }
    if (e.key === 'e' || e.key === 'E') { interact(); e.preventDefault(); return; }
    if ((e.key === 'n' || e.key === 'N') && collectedNotes.length > 0 && !noteReading) { showNote(collectedNotes[collectedNotes.length - 1]); e.preventDefault(); return; }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; if ((e.key === 'n' || e.key === 'N') && noteReading) hideNote(); });
  window.addEventListener('blur', () => { keys = {}; if (noteReading) hideNote(); });
  canvas.addEventListener('mousedown', (e) => { if (!ready || escOn || chatOn || !me || death.on || mobile || noteReading) return; if (e.button === 0) doAtk(); });

  function doAtk() { if (!me) return; const it = me.inventory?.[me.activeSlot]; if (it?.id === 'sword') { const now = Date.now(); if (now - me.atkT > ATK_DUR) { socket.emit('attack', {}); me.attacking = true; me.atkT = now; } } }

  function initMobile() {
    if (!mobile) return;
    document.getElementById('mobile-controls').style.display = 'block';
    const jz = document.getElementById('mobile-joystick-zone');
    const je = document.getElementById('mobile-joystick');
    const ke = document.getElementById('mobile-joystick-knob');
    const JR = 50, DZ = 10;
    let jtid = null;

    jz.addEventListener('touchstart', (e) => { if (jtid !== null) return; e.preventDefault(); const t = e.changedTouches[0]; jtid = t.identifier; const r = jz.getBoundingClientRect(); const cx = t.clientX - r.left, cy = t.clientY - r.top; je.style.left = (cx - JR) + 'px'; je.style.top = (cy - JR) + 'px'; je.classList.add('active'); joy.on = true; joy.sx = cx; joy.sy = cy; joy.dx = 0; joy.dy = 0; ke.style.transform = 'translate(0px,0px)'; }, { passive: false });
    jz.addEventListener('touchmove', (e) => { e.preventDefault(); for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; if (t.identifier !== jtid) continue; const r = jz.getBoundingClientRect(); let dx = t.clientX - r.left - joy.sx, dy = t.clientY - r.top - joy.sy; const d = Math.sqrt(dx * dx + dy * dy); if (d > JR) { dx = dx / d * JR; dy = dy / d * JR; } joy.dx = Math.abs(dx) > DZ ? dx / JR : 0; joy.dy = Math.abs(dy) > DZ ? dy / JR : 0; ke.style.transform = `translate(${dx}px,${dy}px)`; } }, { passive: false });
    function rj() { jtid = null; joy.on = false; joy.dx = 0; joy.dy = 0; ke.style.transform = 'translate(0px,0px)'; je.classList.remove('active'); }
    jz.addEventListener('touchend', (e) => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === jtid) rj(); });
    jz.addEventListener('touchcancel', (e) => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === jtid) rj(); });

    function btn(el, down, up) { el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('pressed'); down(); }, { passive: false }); el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('pressed'); if (up) up(); }); el.addEventListener('touchcancel', () => { el.classList.remove('pressed'); if (up) up(); }); }

    btn(document.getElementById('mobile-btn-jump'), () => { mJump = true; }, () => { mJump = false; });
    btn(document.getElementById('mobile-btn-attack'), () => { mAtk = true; doAtk(); }, () => { mAtk = false; });
    btn(document.getElementById('mobile-btn-use'), () => { toggleItem(); });
    btn(document.getElementById('mobile-btn-interact'), () => { interact(); });
    btn(document.getElementById('mobile-btn-chat'), () => { if (chatOn) closeChat(); else openChat(); });
    btn(document.getElementById('mobile-btn-menu'), () => { toggleEsc(); });

    const nb = document.getElementById('mobile-btn-note');
    nb.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); nb.classList.add('pressed'); if (collectedNotes.length > 0) showNote(collectedNotes[collectedNotes.length - 1]); }, { passive: false });
    nb.addEventListener('touchend', (e) => { e.preventDefault(); nb.classList.remove('pressed'); hideNote(); });
    nb.addEventListener('touchcancel', () => { nb.classList.remove('pressed'); hideNote(); });

    document.querySelectorAll('.mobile-slot').forEach(b => { b.addEventListener('touchstart', (e) => { e.preventDefault(); const s = parseInt(b.dataset.slot); if (me) { me.activeSlot = s; socket.emit('switch-slot', { slot: s }); updateMB(); updateMS(); } }, { passive: false }); });

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  }

  function openChat() { chatOn = true; document.getElementById('chat-input-container').style.display = 'block'; const ci = document.getElementById('chat-input'); ci.value = ''; ci.focus(); keys = {}; }
  function closeChat() { chatOn = false; document.getElementById('chat-input-container').style.display = 'none'; document.getElementById('chat-input').blur(); keys = {}; }
  function addChat(u, m) { const d = document.createElement('div'); d.className = 'chat-msg'; d.innerHTML = `<span class="chat-user">${esc(u)}:</span><span class="chat-text">${esc(m)}</span>`; const cm = document.getElementById('chat-messages'); cm.appendChild(d); cm.scrollTop = cm.scrollHeight; setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 10000); }
  function sysMsg(m) { const d = document.createElement('div'); d.className = 'chat-msg system'; d.textContent = m; const cm = document.getElementById('chat-messages'); cm.appendChild(d); cm.scrollTop = cm.scrollHeight; setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 5000); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function toggleEsc() { escOn = !escOn; document.getElementById('esc-menu').style.display = escOn ? 'block' : 'none'; keys = {}; if (escOn) updateEsc(); }
  function updateEsc() {
  const l = document.getElementById('menu-player-list');
  l.innerHTML = '';
  const all = [];
  if (me) all.push({ ...me, isMe: true });
  for (const [, p] of Object.entries(rp)) all.push({ ...p, isMe: false });
  document.getElementById('menu-player-count').textContent = `(${all.length})`;

  all.forEach(p => {
    const item = document.createElement('div');
    item.className = 'player-list-item';

    const av = document.createElement('div');
    av.className = 'player-avatar-mini';
    const mc = document.createElement('canvas');
    mc.width = 40;
    mc.height = 40;
    av.appendChild(mc);

    // Draw animated mini character with equipped cosmetics
    const avatarData = p.avatar;
    const equippedData = p.equipped || {};
    const c2 = mc.getContext('2d');
    c2.fillStyle = '#111';
    c2.fillRect(0, 0, 40, 40);
    TC.draw(c2, 12, 2, 16, 28, 1, 'idle', 0, avatarData, null, false, Date.now() / 1000, {
      equipped: equippedData
    });

    const nm = document.createElement('span');
    nm.className = 'player-name';
    nm.textContent = p.username;
    item.appendChild(av);
    item.appendChild(nm);

    if (p.isMe) {
      const y = document.createElement('span');
      y.className = 'player-you';
      y.textContent = 'YOU';
      item.appendChild(y);
    }

    l.appendChild(item);
  });
}
  document.getElementById('btn-resume').addEventListener('click', toggleEsc);
  document.getElementById('btn-leave').addEventListener('click', () => { window.location.href = '/home'; });
  document.getElementById('btn-reset').addEventListener('click', () => { if (!me || !pd) return; me.x = pd.spawnX; me.y = pd.spawnY; me.vx = 0; me.vy = 0; me.hp = me.maxHp || 100; me.cpIdx = -1; me.checkpoint = { x: pd.spawnX, y: pd.spawnY }; fx = {}; flOn = true; shOn = true; doors = {}; doorAnim = {}; levers = {}; keycards = {}; collectedNotes = []; wModels.forEach(m => { if (m.type === 'keycard') delete keycards[m.id]; }); if (H.on) { H.bat = H.maxBat; H.scares = new Set(); H.msgs = []; H.eyes = []; H.chase = null; } updateMB(); toggleEsc(); sysMsg('Reset to spawn'); });
  function updatePC() { const c = 1 + Object.keys(rp).length; document.getElementById('hud-players').textContent = `${c} player${c !== 1 ? 's' : ''}`; }

  function updateH(dt) {
    if (!H.on || !me) return;
    const t = Date.now() / 1000, px = me.x + me.width / 2, py = me.y + me.height / 2;
    if (flOn) { H.bat -= H.drain * dt; if (H.bat <= 0) { H.bat = 0; flOn = false; sysMsg('Battery dead!'); updateMU(); } } else { H.bat += H.regen * dt; if (H.bat > H.maxBat) H.bat = H.maxBat; }
    if (flOn && H.bat < 20 && Math.random() < (pd.flickerChance || 0.003) * (1 + (20 - H.bat) / 10)) { H.flicker = true; H.flickT = 0.05 + Math.random() * 0.15; }
    if (H.flicker) { H.flickT -= dt; if (H.flickT <= 0) H.flicker = false; }
    if (pd.breathingEffect) H.breath += dt * (H.near ? 4 : 1.5);
    if (pd.footstepShake && me.state === 'run' && me.onGround) { H.shX = (Math.random() - 0.5) * 1.5; H.shY = (Math.random() - 0.5); } else { H.shX *= 0.8; H.shY *= 0.8; }
    H.near = false;
    if (pd.scareEvents) { for (const s of pd.scareEvents) { const d = Math.sqrt((px - s.x) ** 2 + (py - s.y) ** 2); if (d < s.triggerRadius * 1.5 && !H.scares.has(s.x + '_' + s.y)) { H.near = true; break; } } for (const s of pd.scareEvents) { const k = s.x + '_' + s.y; if (s.once && H.scares.has(k)) continue; if (Math.sqrt((px - s.x) ** 2 + (py - s.y) ** 2) < s.triggerRadius) { H.scares.add(k); trigScare(s); } } }
    H.hb += dt * (H.near ? 6 : 2);
    if (H.chase) { H.chase.timer -= dt; if (H.chase.timer <= 0) H.chase = null; else { H.chase.x += (px > H.chase.x ? 1 : -1) * H.chase.speed * dt * 60; H.chase.y += (py - H.chase.y) * 0.02; } }
    if (pd.ambientParticles) H.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.a = 0.1 + Math.sin(t * 2 + p.x * 0.01) * 0.15; if (p.x < cam.x - 100) p.x = cam.x + canvas.width + 100; if (p.x > cam.x + canvas.width + 100) p.x = cam.x - 100; });
    H.msgs = H.msgs.filter(m => { m.timer -= dt; m.alpha = Math.min(1, m.timer / 0.5); return m.timer > 0; });
    H.eyes = H.eyes.filter(e => { e.timer -= dt; e.alpha = Math.min(0.8, e.timer / 0.5); return e.timer > 0; });
    if (H.scare) { H.scareT -= dt; if (H.scareT <= 0) H.scare = null; }
  }

  function trigScare(s) {
    if (s.type === 'shadow') { H.msgs.push({ text: s.message || '...', timer: 3, alpha: 1 }); H.flicker = true; H.flickT = 0.3; }
    else if (s.type === 'flicker') { H.scare = 'flicker'; H.scareT = (s.duration || 2000) / 1000; }
    else if (s.type === 'sound_text') { H.msgs.push({ text: s.message || '*....*', timer: 3, alpha: 1 }); H.shX = (Math.random() - 0.5) * 4; H.shY = (Math.random() - 0.5) * 3; }
    else if (s.type === 'eyes') { for (let i = 0; i < 3; i++) H.eyes.push({ x: s.x + (Math.random() - 0.5) * 200, y: s.y + (Math.random() - 0.5) * 100 - 50, timer: 2 + Math.random() * 2, alpha: 0.8, sz: 2 + Math.random() * 2 }); H.msgs.push({ text: 'Something is watching...', timer: 3, alpha: 1 }); }
    else if (s.type === 'chase_shadow') { H.chase = { x: s.x + 300, y: s.y, speed: s.speed || 2, timer: (s.duration || 4000) / 1000 }; H.msgs.push({ text: 'RUN!', timer: 2, alpha: 1 }); }
    else if (s.type === 'blackout') { H.scare = 'blackout'; H.scareT = (s.duration || 3000) / 1000; if (s.message) H.msgs.push({ text: s.message, timer: 3, alpha: 1 }); flOn = false; updateMU(); }
  }

  function updatePlayer(dt) {
    if (!me || !pd || !ready || escOn || chatOn || noteReading) return;
    if (death.on) { death.t += dt; if (death.t >= death.dur) { death.on = false; me.x = death.nx; me.y = death.ny; me.vx = 0; me.vy = 0; me.hp = death.nh; fx = {}; flOn = true; shOn = true; if (H.on) H.bat = H.maxBat; updateMB(); } return; }
    let mx = 0, wj = false;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1; if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    wj = keys['KeyW'] || keys['ArrowUp'] || keys['Space'];
    if (mobile && joy.on) { if (Math.abs(joy.dx) > 0.15) mx = joy.dx > 0 ? 1 : -1; if (joy.dy < -0.5) wj = true; }
    if (mJump) wj = true; if (mx !== 0) me.direction = mx;
    let spd = pd.playerSpeed; if (fx.speed && Date.now() < fx.speed.end) spd *= fx.speed.m;
    me.vx = mx * spd; me.vy += pd.gravity; if (me.vy > pd.maxFallSpeed) me.vy = pd.maxFallSpeed;
    let jf = pd.jumpForce; if (fx.jump && Date.now() < fx.jump.end) jf *= fx.jump.m;
    if (wj && me.onGround) { me.vy = jf; me.onGround = false; }
    me.x += me.vx; resolve(me, 'x'); me.y += me.vy; me.onGround = false; resolve(me, 'y');
    if (!me.onGround) me.state = me.vy < 0 ? 'jump' : 'fall'; else if (Math.abs(me.vx) > 0.5) me.state = 'run'; else me.state = 'idle';
    anim += dt; if (me.state === 'run') me.frame = Math.floor(anim / 0.1) % 4; else if (me.state === 'idle') me.frame = Math.floor(anim / 0.5) % 2; else me.frame = 0;
    const now = Date.now(); if (me.attacking && now - me.atkT > ATK_DUR) me.attacking = false;
    if (pd.checkpoints) for (let i = 0; i < pd.checkpoints.length; i++) { const cp = pd.checkpoints[i]; if (i > me.cpIdx && ov(me.x, me.y, me.width, me.height, cp.x, cp.y, cp.w, cp.h)) { me.cpIdx = i; me.checkpoint = { x: cp.x, y: cp.y - 10 }; socket.emit('checkpoint-reached', me.checkpoint); sysMsg('Checkpoint!'); } }
    checkCollect(); checkKC(); updateDoors(dt); updateH(dt);
    if (iCool > 0) iCool -= dt; if (mobile) updateMI();
    iMsgs = iMsgs.filter(m => { m.timer -= dt; m.alpha = Math.min(1, m.timer / 0.5); return m.timer > 0; });
    if (now - lastSend > SEND_RATE) { socket.emit('player-update', { x: me.x, y: me.y, vx: me.vx, vy: me.vy, direction: me.direction, state: me.state, frame: me.frame, onGround: me.onGround, activeSlot: me.activeSlot, attacking: me.attacking, itemState: { flashlightOn: flOn, shieldActive: shOn } }); lastSend = now; }
  }

  function checkCollect() { if (!me || !wCollect.length) return; const px = me.x + me.width / 2, py = me.y + me.height / 2; for (let i = 0; i < wCollect.length; i++) { const ci = wCollect[i]; if (ci.done || collected.has(ci.id) || ci.touch === false) continue; if (Math.sqrt((px - ci.x) ** 2 + (py - ci.y) ** 2) < 30) { ci.done = true; collected.add(ci.id); const v = gv(ci.type); if (v.onC) v.onC(me, ci.props); else sysMsg(`Collected ${v.name}!`); socket.emit('collect-item', { item: { id: ci.type, name: v.name, ...(ci.props || {}) } }); updateMB(); updateMS(); } } }

  function resolve(p, axis) {
    if (pd.platforms) for (let i = 0; i < pd.platforms.length; i++) { const pl = pd.platforms[i]; if (ov(p.x, p.y, p.width, p.height, pl.x, pl.y, pl.w, pl.h)) { if (axis === 'x') { if (p.vx > 0) p.x = pl.x - p.width; else if (p.vx < 0) p.x = pl.x + pl.w; p.vx = 0; } else { if (p.vy > 0) { p.y = pl.y - p.height; p.vy = 0; p.onGround = true; } else if (p.vy < 0) { p.y = pl.y + pl.h; p.vy = 0; } } } }
    if (pd.blocks) for (let i = 0; i < pd.blocks.length; i++) { const bl = pd.blocks[i]; if (ov(p.x, p.y, p.width, p.height, bl.x, bl.y, bl.w, bl.h)) { if (axis === 'x') { if (p.vx > 0) p.x = bl.x - p.width; else if (p.vx < 0) p.x = bl.x + bl.w; p.vx = 0; } else { if (p.vy > 0) { p.y = bl.y - p.height; p.vy = 0; p.onGround = true; } else if (p.vy < 0) { p.y = bl.y + bl.h; p.vy = 0; } } } }
    const db = getModelBlocks(); for (let i = 0; i < db.length; i++) { const d = db[i]; if (ov(p.x, p.y, p.width, p.height, d.x, d.y, d.w, d.h)) { if (axis === 'x') { if (p.vx > 0) p.x = d.x - p.width; else if (p.vx < 0) p.x = d.x + d.w; p.vx = 0; } else { if (p.vy > 0) { p.y = d.y - p.height; p.vy = 0; p.onGround = true; } else if (p.vy < 0) { p.y = d.y + d.h; p.vy = 0; } } } }
  }
  function ov(x1, y1, w1, h1, x2, y2, w2, h2) { return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2; }

  function updateCam() { if (!me) return; let tx, ty; if (death.on) { tx = death.ox + me.width / 2 - canvas.width / 2; ty = death.oy + me.height / 2 - canvas.height / 2; } else { tx = me.x + me.width / 2 - canvas.width / 2; ty = me.y + me.height / 2 - canvas.height / 2; } cam.x += (tx - cam.x) * 0.08; cam.y += (ty - cam.y) * 0.08; if (H.on) { cam.x += H.shX; cam.y += H.shY; } }

  function render() {
    const isH = H.on, bg = pd?.settings?.bgColor || (isH ? '#000' : '#0a0a0a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!ready || !pd || !me) return;
    const t = Date.now() / 1000, now = Date.now(); updateCull();
    ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    if (!isH) { const sx = Math.floor(cam.x / 60) * 60, sy = Math.floor(cam.y / 60) * 60, ex = sx + canvas.width + 120, ey = sy + canvas.height + 120; ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); for (let gx = sx; gx <= ex; gx += 60) { ctx.moveTo(gx, sy); ctx.lineTo(gx, ey); } for (let gy = sy; gy <= ey; gy += 60) { ctx.moveTo(sx, gy); ctx.lineTo(ex, gy); } ctx.stroke(); }
    if (pd.checkpoints) for (let i = 0; i < pd.checkpoints.length; i++) { const cp = pd.checkpoints[i]; if (!inView(cp.x, cp.y - 30, 50, 70)) continue; const a = me.cpIdx >= i, g = Math.sin(t * 3) * 0.3 + 0.7; ctx.fillStyle = a ? (isH ? '#2a6a2a' : '#4ade80') : '#222'; ctx.fillRect(cp.x + 18, cp.y - 30, 3, 70); ctx.fillStyle = a ? `rgba(74,222,128,${g * (isH ? 0.3 : 1)})` : 'rgba(50,50,50,0.3)'; ctx.beginPath(); ctx.moveTo(cp.x + 21, cp.y - 30); ctx.lineTo(cp.x + 45, cp.y - 20); ctx.lineTo(cp.x + 21, cp.y - 10); ctx.fill(); }
    if (pd.platforms) for (let i = 0; i < pd.platforms.length; i++) { const pl = pd.platforms[i]; if (!inView(pl.x, pl.y, pl.w, pl.h)) continue; ctx.globalAlpha = pl.opacity ?? 1; ctx.fillStyle = pl.color || '#333'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); ctx.fillStyle = isH ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(pl.x, pl.y, pl.w, 2); if (pl.text) { ctx.fillStyle = pl.textColor || '#fff'; ctx.font = `${pl.textSize || 14}px ${pl.textFont || 'Inter'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pl.text, pl.x + pl.w / 2, pl.y + pl.h / 2); } ctx.globalAlpha = 1; }
    if (pd.blocks) for (let i = 0; i < pd.blocks.length; i++) { const bl = pd.blocks[i]; if (!inView(bl.x, bl.y, bl.w, bl.h)) continue; ctx.globalAlpha = bl.opacity ?? 1; ctx.fillStyle = bl.color || '#333'; ctx.fillRect(bl.x, bl.y, bl.w, bl.h); ctx.fillStyle = isH ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(bl.x, bl.y, bl.w, 2); if (bl.text) { ctx.fillStyle = bl.textColor || '#fff'; ctx.font = `${bl.textSize || 14}px ${bl.textFont || 'Inter'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bl.text, bl.x + bl.w / 2, bl.y + bl.h / 2); } ctx.globalAlpha = 1; }

    const ni = nearI();
    for (let i = 0; i < wModels.length; i++) { const m = wModels[i]; if (m.type === 'keycard' && keycards[m.id]) continue; const mw = m.w || 40, mh = m.h || 80; if (m.type.startsWith('door_')) drawDoor(ctx, m, t); else if (m.type === 'lever') drawLever(ctx, m.x, m.y, mw, mh, levers[m.id], t); else if (m.type === 'keycard') drawKeycard(ctx, m.x, m.y, mw, mh, m.properties, t); if (ni && ni.id === m.id) { ctx.fillStyle = 'rgba(245,158,11,0.1)'; ctx.beginPath(); ctx.arc(m.x + mw / 2, m.y + mh / 2, 40 + Math.sin(t * 3) * 5, 0, 6.283); ctx.fill(); if (!mobile) { ctx.fillStyle = 'rgba(245,158,11,0.9)'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('[E] Interact', m.x + mw / 2, m.y - 15); } } }
    for (let i = 0; i < wCollect.length; i++) { const ci = wCollect[i]; if (ci.done || !inView(ci.x - 15, ci.y - 15, 30, 30)) continue; gv(ci.type).dW(ctx, ci.x, ci.y, t); }
    if (isH && pd.ambientParticles) for (let i = 0; i < H.parts.length; i++) { const p = H.parts[i]; if (!inView(p.x, p.y, p.sz, p.sz)) continue; ctx.fillStyle = `rgba(200,200,220,${p.a})`; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
    for (let i = 0; i < H.eyes.length; i++) { const e = H.eyes[i]; ctx.fillStyle = `rgba(255,0,0,${e.alpha})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.sz, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(e.x + 8, e.y, e.sz, 0, 6.283); ctx.fill(); }
    if (H.chase) { const cs = H.chase, p2 = 0.4 + Math.sin(t * 8) * 0.2; ctx.fillStyle = `rgba(0,0,0,${p2})`; ctx.beginPath(); ctx.ellipse(cs.x, cs.y, 25, 40, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = `rgba(255,0,0,${p2 + 0.2})`; ctx.beginPath(); ctx.arc(cs.x - 6, cs.y - 15, 2, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(cs.x + 6, cs.y - 15, 2, 0, 6.283); ctx.fill(); }

    if (!death.on) { me._me = true; const ivK = Object.keys(IV); for (let i = 0; i < ivK.length; i++) { const v = IV[ivK[i]]; if (v.dE) v.dE(ctx, me, t); } }
    const rpIds = Object.keys(rp);
    for (let i = 0; i < rpIds.length; i++) { const p = rp[rpIds[i]]; p.dx += (p.tx - p.dx) * LERP; p.dy += (p.ty - p.dy) * LERP; if (!inView(p.dx - 10, p.dy - 10, (p.width || 32) + 20, (p.height || 48) + 20)) continue; let ap = 0; if (p.attacking && p.atkT) { ap = Math.min(1, (now - p.atkT) / ATK_DUR); if (ap >= 1) p.attacking = false; } p._me = false; const ivK = Object.keys(IV); for (let j = 0; j < ivK.length; j++) { const v = IV[ivK[j]]; if (v.dE) v.dE(ctx, p, t); } const ri = p.inventory?.[p.activeSlot]; TC.draw(ctx, p.dx, p.dy, p.width, p.height, p.direction, p.state, p.frame, p.avatar, p.username, false, t, { activeItem: ri?.id, attacking: p.attacking, attackProgress: ap, hp: p.hp, maxHp: p.maxHp || 100, itemOn: gios(ri, p.iSt), equipped: p.equipped || {} }); }
    if (death.on) { const dt2 = death.t / death.dur; ctx.save(); ctx.globalAlpha = 1 - dt2; const dx2 = death.ox + me.width / 2, dy2 = death.oy + me.height / 2; ctx.translate(dx2, dy2 - dt2 * 30); ctx.rotate(dt2 * 6.283); ctx.translate(-dx2, -(dy2 - dt2 * 30)); TC.draw(ctx, death.ox, death.oy - dt2 * 30, me.width, me.height, me.direction, 'idle', 0, me.avatar, me.username, true, t, { isDead: true, equipped: me.equipped || {} }); ctx.restore(); }
    else { let ma = 0; if (me.attacking && me.atkT) ma = Math.min(1, (now - me.atkT) / ATK_DUR); const mi = me.inventory?.[me.activeSlot]; TC.draw(ctx, me.x, me.y, me.width, me.height, me.direction, me.state, me.frame, me.avatar, me.username, true, t, { activeItem: mi?.id, attacking: me.attacking, attackProgress: ma, hp: me.hp, maxHp: me.maxHp || 100, itemOn: gios(mi, { flashlightOn: flOn, shieldActive: shOn }), equipped: me.equipped || {} }); }
    ctx.restore();

    if (isH && !death.on) renderDark(t);
    if (pd.fog?.on) renderFog(); if (pd.vignette?.on) renderVig();
    if (pd.tint?.on) { ctx.fillStyle = pd.tint.color || '#000'; ctx.globalAlpha = pd.tint.opacity || 0.1; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (me.inventory && !mobile) drawInv(t); if (isH) drawBat(); drawFx(t); drawKcHUD();

    for (let i = 0; i < H.msgs.length; i++) { const m = H.msgs[i]; ctx.save(); ctx.globalAlpha = m.alpha; ctx.font = m.note ? 'italic 600 16px Inter' : '900 28px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = m.note ? '#CCBB88' : '#CC2222'; ctx.shadowColor = m.note ? 'rgba(204,187,136,0.5)' : 'rgba(255,0,0,0.5)'; ctx.shadowBlur = 10; ctx.fillText(m.text, canvas.width / 2, canvas.height / 2 - 60 + i * 40); ctx.shadowBlur = 0; ctx.restore(); }
    for (let i = 0; i < iMsgs.length; i++) { const m = iMsgs[i]; ctx.save(); ctx.globalAlpha = m.alpha; ctx.font = '14px Inter'; ctx.textAlign = 'center'; const y = canvas.height - 100 - i * 30, w = ctx.measureText(m.text).width + 20; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(canvas.width / 2 - w / 2, y - 12, w, 24); ctx.fillStyle = '#F59E0B'; ctx.textBaseline = 'middle'; ctx.fillText(m.text, canvas.width / 2, y); ctx.restore(); }
    if (isH && H.near) { ctx.fillStyle = `rgba(80,0,0,${(Math.sin(H.hb) * 0.5 + 0.5) * 0.15})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (isH && pd.breathingEffect) { const ba = Math.sin(H.breath) * 0.03; if (ba > 0) { ctx.fillStyle = `rgba(0,0,0,${ba})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } }
  }

  function gios(it, is) { if (!it) return true; if (it.id === 'flashlight') return is?.flashlightOn !== false; if (it.id === 'shield') return is?.shieldActive !== false; return true; }
  function renderFog() { const f = pd.fog, c = f.color || '#000000', r = parseInt(c.slice(1, 3), 16) || 0, g = parseInt(c.slice(3, 5), 16) || 0, b = parseInt(c.slice(5, 7), 16) || 0; const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, f.start || 100, canvas.width / 2, canvas.height / 2, f.end || 400); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(${r},${g},${b},${f.density || 0.5})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  function renderVig() { const v = pd.vignette, c = v.color || '#000000', r = parseInt(c.slice(1, 3), 16) || 0, g = parseInt(c.slice(3, 5), 16) || 0, b = parseInt(c.slice(5, 7), 16) || 0; const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, canvas.width / 2, canvas.height / 2, canvas.width * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(${r},${g},${b},${v.intensity || 0.3})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  function renderDark(t) {
    if (!me) return; const W = canvas.width, H2 = canvas.height;
    if (!darkCanvas || darkCanvas.width !== W || darkCanvas.height !== H2) { darkCanvas = document.createElement('canvas'); darkCanvas.width = W; darkCanvas.height = H2; darkCtx = darkCanvas.getContext('2d'); }
    const d = darkCtx, px = me.x + me.width / 2 - cam.x, py = me.y + me.height / 2 - cam.y;
    d.fillStyle = `rgba(0,0,0,${1 - (pd.ambientLight || 0.02)})`; d.fillRect(0, 0, W, H2); d.globalCompositeOperation = 'destination-out';
    const isBO = H.scare === 'blackout', isFL = H.flicker || (H.scare === 'flicker' && Math.sin(t * 30) > 0);
    if (flOn && !isBO && H.bat > 0) { const dir = me.direction || 1, rad = (pd.flashlightRadius || 220) * (H.bat / H.maxBat * 0.5 + 0.5), br = (pd.flashlightBrightness || 1.2) * (isFL ? Math.random() * 0.5 + 0.3 : 1), spread = pd.flashlightSpread || 0.45, ang = dir === 1 ? 0 : Math.PI; const g = d.createRadialGradient(px, py, 5, px + dir * rad * 0.4, py, rad); g.addColorStop(0, `rgba(0,0,0,${br})`); g.addColorStop(0.4, `rgba(0,0,0,${br * 0.7})`); g.addColorStop(0.7, `rgba(0,0,0,${br * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.moveTo(px, py); d.arc(px, py, rad, ang - spread, ang + spread); d.closePath(); d.fill(); const ag = d.createRadialGradient(px, py, 0, px, py, 40); ag.addColorStop(0, 'rgba(0,0,0,0.6)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = ag; d.beginPath(); d.arc(px, py, 40, 0, 6.283); d.fill(); } else { const ag = d.createRadialGradient(px, py, 0, px, py, 25); ag.addColorStop(0, 'rgba(0,0,0,0.2)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = ag; d.beginPath(); d.arc(px, py, 25, 0, 6.283); d.fill(); }
    const rpIds = Object.keys(rp); for (let i = 0; i < rpIds.length; i++) { const p = rp[rpIds[i]]; const ri = p.inventory?.[p.activeSlot]; if (!ri || ri.id !== 'flashlight' || p.iSt?.flashlightOn === false) continue; const rpx = p.dx + (p.width || 20) / 2 - cam.x, rpy = p.dy + (p.height || 40) / 2 - cam.y, rDir = p.direction || 1, rAng = rDir === 1 ? 0 : Math.PI; const rg = d.createRadialGradient(rpx, rpy, 5, rpx + rDir * 45, rpy, 150); rg.addColorStop(0, 'rgba(0,0,0,0.5)'); rg.addColorStop(0.5, 'rgba(0,0,0,0.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = rg; d.beginPath(); d.moveTo(rpx, rpy); d.arc(rpx, rpy, 150, rAng - 0.4, rAng + 0.4); d.closePath(); d.fill(); }
    for (let i = 0; i < wCollect.length; i++) { const ci = wCollect[i]; if (ci.done) continue; const cx = ci.x - cam.x, cy = ci.y - cam.y; if (cx < -50 || cx > W + 50 || cy < -50 || cy > H2 + 50) continue; const gs = ci.type === 'battery' ? 35 : 20; const gg = d.createRadialGradient(cx, cy, 0, cx, cy, gs); gg.addColorStop(0, 'rgba(0,0,0,0.4)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gg; d.beginPath(); d.arc(cx, cy, gs, 0, 6.283); d.fill(); }
    for (let i = 0; i < wModels.length; i++) { const m = wModels[i]; if (m.type === 'keycard' && keycards[m.id]) continue; const mx = m.x + (m.w || 30) / 2 - cam.x, my = m.y + (m.h || 20) / 2 - cam.y; if (mx < -50 || mx > W + 50 || my < -50 || my > H2 + 50) continue; const gs = m.type === 'keycard' ? 30 : m.type === 'lever' ? 25 : 10; const gg = d.createRadialGradient(mx, my, 0, mx, my, gs); gg.addColorStop(0, 'rgba(0,0,0,0.3)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gg; d.beginPath(); d.arc(mx, my, gs, 0, 6.283); d.fill(); }
    d.globalCompositeOperation = 'source-over'; ctx.drawImage(darkCanvas, 0, 0);
    if (flOn && !isBO && H.bat > 0 && !isFL) { const dir = me.direction || 1, rad = (pd.flashlightRadius || 220) * (H.bat / H.maxBat * 0.5 + 0.5), spread = pd.flashlightSpread || 0.45, ang = dir === 1 ? 0 : Math.PI; ctx.save(); ctx.globalAlpha = 0.04; const wg = ctx.createRadialGradient(px, py, 10, px + dir * rad * 0.4, py, rad); wg.addColorStop(0, '#FFE8AA'); wg.addColorStop(0.5, '#FFD466'); wg.addColorStop(1, 'transparent'); ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, rad, ang - spread, ang + spread); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }

  function drawBat() { const bw = mobile ? 100 : 140, bh = 10, bx = canvas.width - bw - 20, by = mobile ? 50 : 50; ctx.font = '600 10px Inter'; ctx.textAlign = 'right'; ctx.fillStyle = H.bat < 20 ? '#ef4444' : '#888'; ctx.fillText('BATTERY', bx - 6, by + 8); ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh); const pct = Math.max(0, H.bat / H.maxBat); ctx.fillStyle = pct > 0.5 ? '#44EE44' : pct > 0.25 ? '#EECC44' : '#EE4444'; ctx.fillRect(bx + 1, by + 1, (bw - 2) * pct, bh - 2); ctx.font = '600 9px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = pct > 0.3 ? '#000' : '#fff'; ctx.fillText(`${Math.round(H.bat)}%`, bx + bw / 2, by + bh - 2); ctx.fillStyle = '#333'; ctx.fillRect(bx + bw, by + 2, 3, bh - 4); if (H.bat < 15 && Math.sin(Date.now() / 300) > 0) { ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#ef4444'; ctx.fillText('LOW BATTERY', canvas.width / 2, by + 35); } }
  function drawKcHUD() { const cols = ['red', 'blue', 'green', 'yellow'].filter(c => keycards[c]); if (!cols.length) return; const sx = 10, sy = mobile ? 90 : 110; ctx.font = '600 9px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#888'; ctx.fillText('KEYCARDS', sx, sy - 4); cols.forEach((c, i) => { const x = sx + i * 30; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 1, sy - 1, 26, 18); ctx.fillStyle = KC[c]; ctx.fillRect(x, sy, 24, 16); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, sy + 5, 24, 2); ctx.fillStyle = '#FFD700'; ctx.fillRect(x + 2, sy + 2, 4, 3); }); }

  function drawInv(t) {
    if (mobile) return; const inv = me.inventory; if (!inv) return;
    const ss = 52, gap = 6, tw = inv.length * ss + (inv.length - 1) * gap, sx = canvas.width / 2 - tw / 2, sy = canvas.height - 70;
    for (let i = 0; i < inv.length; i++) { const x = sx + i * (ss + gap), a = i === me.activeSlot; ctx.fillStyle = a ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.6)'; ctx.fillRect(x, sy, ss, ss); ctx.strokeStyle = a ? '#fff' : '#333'; ctx.lineWidth = a ? 2 : 1; ctx.strokeRect(x, sy, ss, ss); if (inv[i]) { const v = gv(inv[i].id); v.dH(ctx, x, sy, ss); ctx.font = '600 8px Inter'; ctx.textAlign = 'center'; let l = v.name; if (a && inv[i].id === 'flashlight') { l += flOn ? ' ON' : ' OFF'; ctx.fillStyle = flOn ? '#FFE066' : '#555'; } else if (a && inv[i].id === 'shield') { l += shOn ? ' UP' : ' DOWN'; ctx.fillStyle = shOn ? '#66AAEE' : '#555'; } else ctx.fillStyle = '#888'; ctx.fillText(l, x + ss / 2, sy + ss - 4); } ctx.font = '600 9px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = a ? '#fff' : '#444'; ctx.fillText(String(i + 1), x + 4, sy + 12); }
    const ai = inv[me.activeSlot]; if (ai && gv(ai.id).tog) { ctx.font = '500 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('Press F to toggle', canvas.width / 2, sy - 8); }
    if (wModels.length > 0 && nearI() && !mobile) { ctx.font = '500 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(245,158,11,0.6)'; ctx.fillText('Press E to interact', canvas.width / 2, sy - 22); }
    if (collectedNotes.length > 0 && !mobile) { ctx.font = '500 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(204,187,136,0.5)'; ctx.fillText('Hold N to read note', canvas.width / 2, sy - 36); }
    if (me.hp !== undefined) { const bw = 200, bh2 = 8, bx2 = canvas.width / 2 - bw / 2, by2 = sy - (collectedNotes.length > 0 ? 50 : 36); ctx.fillStyle = '#222'; ctx.fillRect(bx2, by2, bw, bh2); const p3 = Math.max(0, me.hp / (me.maxHp || 100)); ctx.fillStyle = p3 > 0.5 ? '#4ade80' : p3 > 0.25 ? '#fbbf24' : '#ef4444'; ctx.fillRect(bx2, by2, bw * p3, bh2); ctx.font = '600 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#888'; ctx.fillText(`${Math.max(0, Math.round(me.hp))} HP`, canvas.width / 2, by2 - 4); }
  }

  function drawFx(t) { const now = Date.now(), el = []; if (fx.speed && now < fx.speed.end) el.push({ name: 'Speed', color: '#FFD700', rem: Math.ceil((fx.speed.end - now) / 1000), m: fx.speed.m }); if (fx.jump && now < fx.jump.end) el.push({ name: 'Jump', color: '#44CC44', rem: Math.ceil((fx.jump.end - now) / 1000), m: fx.jump.m }); if (!el.length) return; const sx = 10; let sy = mobile ? 60 : 80; el.forEach((e, i) => { const y = sy + i * 28; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, y, 120, 22); ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.strokeRect(sx, y, 120, 22); ctx.fillStyle = e.color; ctx.globalAlpha = 0.3; ctx.fillRect(sx, y, 120, 22); ctx.globalAlpha = 1; ctx.font = '600 10px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${e.name} x${e.m}`, sx + 6, y + 14); ctx.textAlign = 'right'; ctx.fillStyle = e.rem <= 2 ? '#ef4444' : '#ccc'; ctx.fillText(`${e.rem}s`, sx + 114, y + 14); }); }

  function updateFps() { fc++; const now = Date.now(); if (now - fpsT >= 1000) { fps = fc; fc = 0; fpsT = now; document.getElementById('hud-fps').textContent = `${fps} FPS`; } }

  let lastT = performance.now();
  function loop(ts) { const dt = Math.min((ts - lastT) / 1000, DT_MAX); lastT = ts; updatePlayer(dt); updateCam(); render(); updateFps(); requestAnimationFrame(loop); }

  initMobile();
  requestAnimationFrame(loop);
})();