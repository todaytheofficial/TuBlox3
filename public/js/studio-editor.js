(function(){
'use strict';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
if (!gameId) { window.location.href = '/studio'; return; }

const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);

let gameData = null, blocks = [], items = [], models = [], avatars = [], settings = {}, assets = [];
let selectedBlock = null, selectedItem = null, selectedModel = null, selectedAvatar = null, selectedKeyframe = null;
let currentTool = 'select';
let camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false, isPanning = false, isScaling = false, scaleHandle = '';
let dragStart = { x: 0, y: 0 }, dragObjStart = { x: 0, y: 0, w: 0, h: 0 };
let newBlockStart = null, unsaved = false;
let pubVisibility = 'public', pubThumbData = '';
let touchStartTime = 0, longPressTimer = null;
let explorerOpen = false;
let avatarAnimPreview = false;

const TOUCH_SELECT_RADIUS = isMobile ? 30 : 12;
const HANDLE_SIZE = isMobile ? 14 : 8;

// ==================== MODEL DEFINITIONS ====================

const MODEL_DEFS = {
  door_simple: { id: 'door_simple', name: 'Door', description: 'Opens with E key', category: 'model', icon: 'door', defaults: { color: '#666666', openSpeed: 2, direction: 'up' } },
  door_key: { id: 'door_key', name: 'Key Door', description: 'Opens with a Key', category: 'model', icon: 'door', defaults: { keyId: '', color: '#8B4513', openSpeed: 2, direction: 'up' } },
  door_keycard: { id: 'door_keycard', name: 'Keycard Door', description: 'Opens with Keycard', category: 'model', icon: 'door_keycard', defaults: { keycardColor: 'red', openSpeed: 2, direction: 'up' } },
  door_lever: { id: 'door_lever', name: 'Lever Door', description: 'Opens with Lever', category: 'model', icon: 'door_lever', defaults: { leverId: '', color: '#555555', openSpeed: 2, direction: 'up' } },
  lever: { id: 'lever', name: 'Lever', description: 'Activates mechanisms', category: 'model', icon: 'lever', defaults: { targetId: '', oneTime: false } },
  keycard: { id: 'keycard', name: 'Keycard', description: 'Opens keycard doors', category: 'model', icon: 'keycard', defaults: { cardColor: 'red' } }
};

// ==================== ITEM VISUALS ====================

const ITEM_VISUALS = {
  sword:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*3)*2);c.rotate(-30*Math.PI/180);const z=s/40;c.fillStyle='#8B6914';c.fillRect(-2*z,-4*z,4*z,8*z);c.fillStyle='#CCAA00';c.fillRect(-6*z,4*z,12*z,3*z);c.fillStyle='#CCC';c.fillRect(-1.5*z,7*z,3*z,18*z);c.fillStyle='#DDD';c.beginPath();c.moveTo(-1.5*z,25*z);c.lineTo(1.5*z,25*z);c.lineTo(0,28*z);c.fill();c.restore();}},
  flashlight:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*2.5)*2);const z=s/40;c.fillStyle='#555';c.fillRect(-4*z,-8*z,8*z,16*z);c.fillStyle='#FFE066';c.fillRect(-5*z,-10*z,10*z,3*z);c.fillStyle='rgba(255,224,102,0.15)';c.beginPath();c.moveTo(-5*z,-10*z);c.lineTo(-15*z,-30*z);c.lineTo(15*z,-30*z);c.lineTo(5*z,-10*z);c.fill();c.restore();}},
  shield:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*2)*2);const z=s/40;c.fillStyle='#4488CC';c.beginPath();c.moveTo(0,-12*z);c.lineTo(10*z,-6*z);c.lineTo(10*z,4*z);c.lineTo(0,12*z);c.lineTo(-10*z,4*z);c.lineTo(-10*z,-6*z);c.closePath();c.fill();c.strokeStyle='#66AAEE';c.lineWidth=1.5*z;c.stroke();c.restore();}},
  speed_boost:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*4)*2);const z=s/40;c.fillStyle='#FFD700';c.beginPath();c.moveTo(2*z,-12*z);c.lineTo(-4*z,0);c.lineTo(0,0);c.lineTo(-2*z,12*z);c.lineTo(6*z,0);c.lineTo(2*z,0);c.closePath();c.fill();c.restore();}},
  jump_boost:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*3)*3);const z=s/40;c.fillStyle='#44CC44';c.fillRect(-6*z,4*z,12*z,4*z);c.fillStyle='#66EE66';c.beginPath();c.moveTo(0,-14*z);c.lineTo(5*z,-8*z);c.lineTo(-5*z,-8*z);c.closePath();c.fill();c.restore();}},
  coin:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*3)*2);const z=s/40;const sx=Math.abs(Math.cos(t*2))||0.1;c.scale(sx,1);c.fillStyle='#FFD700';c.beginPath();c.arc(0,0,8*z,0,Math.PI*2);c.fill();c.strokeStyle='#DAA520';c.lineWidth=1.5*z;c.stroke();c.fillStyle='#DAA520';c.font=`bold ${8*z}px Inter`;c.textAlign='center';c.textBaseline='middle';c.fillText('$',0,0);c.restore();}},
  heart:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*2)*2);const z=s/40;const p=1+Math.sin(t*4)*0.1;c.scale(p,p);c.fillStyle='#EF4444';c.beginPath();c.moveTo(0,4*z);c.bezierCurveTo(-8*z,-2*z,-10*z,-8*z,-5*z,-10*z);c.bezierCurveTo(-2*z,-12*z,0,-9*z,0,-7*z);c.bezierCurveTo(0,-9*z,2*z,-12*z,5*z,-10*z);c.bezierCurveTo(10*z,-8*z,8*z,-2*z,0,4*z);c.fill();c.restore();}},
  key:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*2)*2);c.rotate(Math.sin(t*1.5)*0.2);const z=s/40;c.strokeStyle='#DAA520';c.lineWidth=2*z;c.beginPath();c.arc(0,-6*z,5*z,0,Math.PI*2);c.stroke();c.fillStyle='#DAA520';c.fillRect(-1*z,-1*z,2*z,14*z);c.fillRect(1*z,9*z,4*z,2*z);c.fillRect(1*z,5*z,3*z,2*z);c.restore();}},
  battery:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*3)*2);const z=s/40;c.fillStyle='#333';c.fillRect(-4*z,-7*z,8*z,14*z);c.fillStyle='#555';c.fillRect(-2*z,-9*z,4*z,3*z);c.fillStyle='#44EE44';c.fillRect(-2*z,-4*z,4*z,8*z);c.restore();}},
  note:{drawCanvas(c,x,y,s,t){c.save();c.translate(x,y+Math.sin(t*1.5)*1.5);const z=s/40;c.fillStyle='#CCBB88';c.fillRect(-6*z,-8*z,12*z,16*z);c.fillStyle='#AA9966';c.fillRect(-4*z,-5*z,8*z,1*z);c.fillRect(-4*z,-2*z,6*z,1*z);c.fillRect(-4*z,1*z,7*z,1*z);c.restore();}}
};

const MODEL_VISUALS = {
  door_simple:{drawCanvas(c,x,y,w,h,t,p){c.save();const col=(p&&p.color)||'#666';c.fillStyle='#1a1a1a';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle='rgba(255,255,255,0.08)';c.fillRect(x,y,w,3);c.fillStyle='rgba(0,0,0,0.15)';c.fillRect(x,y+h-3,w,3);const hx=x+w-10,hy=y+h*0.5;c.fillStyle='#999';c.beginPath();c.arc(hx,hy,3.5,0,Math.PI*2);c.fill();c.fillStyle='#bbb';c.fillRect(hx-6,hy-1,6,2);c.restore();}},
  door_key:{drawCanvas(c,x,y,w,h,t,p){c.save();const col=(p&&p.color)||'#8B4513';c.fillStyle='#222';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle='#DAA520';c.beginPath();c.arc(x+w-10,y+h/2,4,0,Math.PI*2);c.fill();c.fillRect(x+w-12,y+h/2,4,8);c.fillStyle='#FFD700';c.font=`${Math.min(10,w/5)}px Inter`;c.textAlign='center';c.fillText('🔑',x+w/2,y-6);c.restore();}},
  door_keycard:{drawCanvas(c,x,y,w,h,t,p){c.save();const cc=(p&&p.keycardColor)||'red';const cols={red:'#EF4444',blue:'#3B82F6',green:'#22C55E',yellow:'#EAB308'};const co=cols[cc]||cols.red;c.fillStyle='#1a1a2e';c.fillRect(x-2,y-2,w+4,h+4);const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'#444');g.addColorStop(0.5,'#666');g.addColorStop(1,'#444');c.fillStyle=g;c.fillRect(x,y,w,h);c.fillStyle='#222';c.fillRect(x+w-18,y+h/2-15,14,30);c.fillStyle=co;c.fillRect(x+w-16,y+h/2-8,10,4);const blink=Math.sin(t*3)>0;c.fillStyle=blink?co:'#333';c.beginPath();c.arc(x+w-11,y+h/2+8,3,0,Math.PI*2);c.fill();c.fillStyle=co;c.fillRect(x,y,4,h);c.restore();}},
  door_lever:{drawCanvas(c,x,y,w,h,t,p){c.save();const col=(p&&p.color)||'#555555';c.fillStyle='#1a1a1a';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle=col;c.fillRect(x,y,w,h);c.strokeStyle='#999';c.lineWidth=2;c.beginPath();c.arc(x+w/2,y+h/2,8,0,Math.PI*2);c.stroke();c.restore();}},
  lever:{drawCanvas(c,x,y,w,h,t,p){c.save();c.fillStyle='#444';c.fillRect(x,y+h-10,w,10);const a=Math.sin(t*0.5)*0.3-0.5;c.strokeStyle='#888';c.lineWidth=4;c.beginPath();c.moveTo(x+w/2,y+h-10);c.lineTo(x+w/2+Math.sin(a)*(h-15),y+h-10-Math.cos(a)*(h-15));c.stroke();c.fillStyle='#CC3333';c.beginPath();c.arc(x+w/2+Math.sin(a)*(h-15),y+h-10-Math.cos(a)*(h-15),5,0,Math.PI*2);c.fill();c.fillStyle='#666';c.beginPath();c.arc(x+w/2,y+h-10,6,0,Math.PI*2);c.fill();c.restore();}},
  keycard:{drawCanvas(c,x,y,w,h,t,p){c.save();const cc=(p&&p.cardColor)||'red';const cols={red:'#EF4444',blue:'#3B82F6',green:'#22C55E',yellow:'#EAB308'};const co=cols[cc]||cols.red;c.translate(x+w/2,y+h/2);const f=Math.sin(t*2)*3;c.translate(0,f);c.fillStyle=co;c.fillRect(-w/2,-h/2,w,h);c.fillStyle='rgba(255,255,255,0.3)';c.fillRect(-w/2,-h/2+h*0.3,w,h*0.15);c.fillStyle='#FFD700';c.fillRect(-w/2+5,-h/2+4,8,6);c.restore();}}
};

const ITEM_SVG_ICONS = {
  sword:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="2" x2="8" y2="18"/><path d="M4 20l4-4"/><path d="M6 16l4 4"/></svg>`,
  flashlight:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>`,
  shield:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  speed_boost:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  jump_boost:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>`,
  coin:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/></svg>`,
  heart:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  key:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  battery:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="7" width="12" height="14" rx="1"/><line x1="10" y1="7" x2="10" y2="4"/><line x1="14" y1="7" x2="14" y2="4"/></svg>`,
  note:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
};

const MODEL_SVG_ICONS = {
  door:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="15" cy="12" r="1.5"/></svg>`,
  door_simple:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="15" cy="12" r="1.5"/><line x1="15" y1="12" x2="13" y2="12"/></svg>`,
  door_keycard:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><rect x="14" y="8" width="4" height="8" rx="0.5"/></svg>`,
  door_lever:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="12" cy="12" r="3"/></svg>`,
  lever:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="18" width="12" height="4" rx="1"/><circle cx="12" cy="18" r="2"/><line x1="12" y1="18" x2="8" y2="6"/><circle cx="8" cy="5" r="2.5"/></svg>`,
  keycard:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><rect x="5" y="9" width="4" height="3" rx="0.5"/></svg>`
};

function getItemSVG(type) { return ITEM_SVG_ICONS[type] || `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg>`; }
function getModelSVG(type) {
  if (MODEL_SVG_ICONS[type]) return MODEL_SVG_ICONS[type];
  const d = MODEL_DEFS[type];
  return MODEL_SVG_ICONS[d ? d.icon : type] || MODEL_SVG_ICONS.door;
}
function getItemVisual(type) { return ITEM_VISUALS[type] || null; }
function getModelVisual(type) { return MODEL_VISUALS[type] || null; }

// ==================== RESIZE ====================

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight - (isMobile ? 104 : 48); }
resize();
window.addEventListener('resize', resize);

// ==================== LOAD / SAVE ====================

async function loadGame() {
  try {
    const r = await fetch(`/api/studio/game/${gameId}`);
    if (!r.ok) { window.location.href = '/studio'; return; }
    gameData = await r.json();
    blocks = gameData.blocks || [];
    items = gameData.items || [];
    models = gameData.models || [];
    avatars = gameData.avatars || [];
    settings = gameData.settings || {};
    document.getElementById('topbar-title').textContent = gameData.title;
    if (gameData.published) {
      const label = document.getElementById('publish-btn-label');
      if (label) label.textContent = 'Update';
    }
  } catch (e) { window.location.href = '/studio'; }
}

async function loadAssets() {
  try { const r = await fetch('/api/assets'); assets = await r.json(); } catch (e) { assets = []; }
}

async function saveGame() {
  try {
    const r = await fetch(`/api/studio/save/${gameId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, items, models, avatars, settings, title: gameData.title, description: gameData.description })
    });
    if (r.ok) { unsaved = false; showSaved(); }
  } catch (e) { console.error('[Save]', e); }
}

function showSaved() { const s = document.getElementById('topbar-saved'); s.style.display = 'inline-flex'; setTimeout(() => { s.style.display = 'none'; }, 2500); }

// ==================== COORDS ====================

function w2s(wx, wy) { return { x: (wx - camera.x) * camera.zoom + canvas.width / 2, y: (wy - camera.y) * camera.zoom + canvas.height / 2 }; }
function s2w(sx, sy) { return { x: (sx - canvas.width / 2) / camera.zoom + camera.x, y: (sy - canvas.height / 2) / camera.zoom + camera.y }; }

// ==================== AVATAR DRAWING ====================

function applyEasing(t, type) {
  switch (type) {
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'bounce':
      if (t < 1/2.75) return 7.5625*t*t;
      if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75;
      if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375;
      return 7.5625*(t-=2.625/2.75)*t+0.984375;
    default: return t;
  }
}

function drawEditorAvatar(c, av, time) {
  const w = av.w || 22, h = av.h || 34;
  let dir = av.direction || 1;
  const anim = av.defaultAnim || 'idle';
  const speed = av.animSpeed || 1;
  let drawX = av.x, drawY = av.y;
  let pose = anim;
  let animOff = 0;

  if (anim === 'custom' && av.keyframes && av.keyframes.length > 0) {
    const total = av.keyframes.reduce((m, kf) => Math.max(m, kf.time + (kf.duration || 0.5)), 1);
    const lt = av.loop ? (time * speed) % total : Math.min(time * speed, total);
    let akf = av.keyframes[0];
    for (let i = av.keyframes.length - 1; i >= 0; i--) { if (lt >= av.keyframes[i].time) { akf = av.keyframes[i]; break; } }
    if (akf) {
      pose = akf.pose || 'idle';
      const prog = Math.min(1, (lt - akf.time) / (akf.duration || 0.5));
      const eased = applyEasing(prog, akf.easing || 'linear');
      drawX = av.x + (akf.dx || 0) * eased;
      drawY = av.y + (akf.dy || 0) * eased;
      if (akf.dir && akf.dir !== 0) dir = akf.dir;
    }
  }

  if (pose === 'idle') animOff = Math.sin(time * speed * 3) * 1.5;
  if (pose === 'dance') animOff = Math.sin(time * speed * 6) * 3;
  if (pose === 'wave') animOff = Math.sin(time * speed * 4) * 1;
  if (pose === 'jump') animOff = -Math.abs(Math.sin(time * speed * 3)) * 8;

  c.save();
  c.translate(drawX, drawY + animOff);

  const bc = av.usePlayerAvatar ? '#888' : (av.bodyColor || '#fff');
  const hc = av.usePlayerAvatar ? '#999' : (av.headColor || '#fff');
  const ec = av.eyeColor || '#000';

  const bw = w * 0.55, bh = h * 0.45;
  const hw2 = w * 0.5, hh2 = w * 0.5;

  // Shadow
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.beginPath(); c.ellipse(0, h / 2, w * 0.35, 2, 0, 0, Math.PI * 2); c.fill();

  // Legs
  const legW = bw * 0.35, legH = h * 0.25;
  c.fillStyle = bc;
  if (pose === 'sit') {
    c.fillRect(-bw / 2, h * 0.2, bw, legH * 0.6);
  } else {
    let ll = -legW - 1, rl = 1;
    if (pose === 'run') { ll += Math.sin(time * speed * 8) * 3; rl -= Math.sin(time * speed * 8) * 3; }
    c.fillRect(ll, h * 0.25, legW, legH);
    c.fillRect(rl, h * 0.25, legW, legH);
  }

  // Body
  c.fillStyle = bc;
  c.fillRect(-bw / 2, -h * 0.15, bw, bh);

  // Head
  c.fillStyle = hc;
  c.fillRect(-hw2 / 2, -h * 0.5, hw2, hh2);

  // Eyes
  const eyeY = -h * 0.35;
  const eyeSz = Math.max(1.5, w * 0.08);
  c.fillStyle = ec;
  if (dir === 1) {
    c.fillRect(1, eyeY, eyeSz, eyeSz);
    c.fillRect(hw2 / 2 - eyeSz - 1, eyeY, eyeSz, eyeSz);
  } else {
    c.fillRect(-hw2 / 2 + 1, eyeY, eyeSz, eyeSz);
    c.fillRect(-1 - eyeSz, eyeY, eyeSz, eyeSz);
  }

  // Arms
  const armW = 3, armH = bh * 0.7;
  let la = 0, ra = 0;
  if (pose === 'run') { la = Math.sin(time * speed * 8) * 0.5; ra = -Math.sin(time * speed * 8) * 0.5; }
  if (pose === 'wave') ra = -Math.sin(time * speed * 6) * 0.8 - 0.5;
  if (pose === 'dance') { la = Math.sin(time * speed * 6) * 0.7; ra = Math.sin(time * speed * 6 + Math.PI) * 0.7; }

  c.fillStyle = bc;
  c.save(); c.translate(-bw / 2 - armW, -h * 0.12); c.rotate(la); c.fillRect(-armW / 2, 0, armW, armH); c.restore();
  c.save(); c.translate(bw / 2, -h * 0.12); c.rotate(ra); c.fillRect(-armW / 2, 0, armW, armH); c.restore();

  // Label
  c.fillStyle = av.usePlayerAvatar ? '#4ade80' : '#a78bfa';
  c.font = `${8 / camera.zoom}px Inter`;
  c.textAlign = 'center';
  c.fillText(av.usePlayerAvatar ? 'PLAYER' : 'NPC', 0, -h / 2 - 6 / camera.zoom);

  // Interactive indicator
  if (av.interactive) {
    const d = av.dialogue;
    const trigKey = (d && d.triggerKey) || 'E';
    const trigR = (d && d.triggerRadius) || 80;

    // Trigger radius circle
    c.strokeStyle = 'rgba(167,139,250,0.15)';
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.arc(0, 0, trigR, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // Key hint badge
    const badgeY = -h / 2 - 16 / camera.zoom;
    c.fillStyle = 'rgba(167,139,250,0.2)';
    const kbw = 18 / camera.zoom, kbh = 12 / camera.zoom;
    c.fillRect(-kbw / 2, badgeY - kbh / 2, kbw, kbh);
    c.strokeStyle = '#a78bfa';
    c.lineWidth = 0.5;
    c.strokeRect(-kbw / 2, badgeY - kbh / 2, kbw, kbh);
    c.fillStyle = '#a78bfa';
    c.font = `bold ${8 / camera.zoom}px Inter`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(trigKey, 0, badgeY);

    // Chat bubble icon
    const bubY = -h / 2 - 28 / camera.zoom;
    const bs = 5 / camera.zoom;
    c.fillStyle = 'rgba(167,139,250,' + (0.4 + Math.sin(time * 3) * 0.2) + ')';
    c.beginPath();
    c.moveTo(-bs, bubY - bs);
    c.lineTo(bs, bubY - bs);
    c.quadraticCurveTo(bs + 2/camera.zoom, bubY - bs, bs + 2/camera.zoom, bubY - bs + 2/camera.zoom);
    c.lineTo(bs + 2/camera.zoom, bubY + bs - 2/camera.zoom);
    c.quadraticCurveTo(bs + 2/camera.zoom, bubY + bs, bs, bubY + bs);
    c.lineTo(-bs/2, bubY + bs);
    c.lineTo(-bs, bubY + bs + 3/camera.zoom);
    c.lineTo(-bs/3, bubY + bs);
    c.lineTo(-bs, bubY + bs);
    c.quadraticCurveTo(-bs - 2/camera.zoom, bubY + bs, -bs - 2/camera.zoom, bubY + bs - 2/camera.zoom);
    c.lineTo(-bs - 2/camera.zoom, bubY - bs + 2/camera.zoom);
    c.quadraticCurveTo(-bs - 2/camera.zoom, bubY - bs, -bs, bubY - bs);
    c.fill();

    // Dots in bubble
    c.fillStyle = '#fff';
    const dotR = 1 / camera.zoom;
    for (let di = -1; di <= 1; di++) {
      c.beginPath();
      c.arc(di * 3 / camera.zoom, bubY, dotR, 0, Math.PI * 2);
      c.fill();
    }

    // NPC name below
    if (d && d.npcName) {
      c.fillStyle = d.nameColor || '#a78bfa';
      c.font = `${7 / camera.zoom}px Inter`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.fillText(d.npcName, 0, h / 2 + 12 / camera.zoom);
    }
  }

  c.restore();
}

// ==================== RENDER ====================

let renderTime = 0;

function render(ts) {
  renderTime = (ts || 0) / 1000;
  ctx.fillStyle = settings.bgColor || '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Grid
  const gs = 40;
  const sx = Math.floor((camera.x - canvas.width / 2 / camera.zoom) / gs) * gs;
  const sy = Math.floor((camera.y - canvas.height / 2 / camera.zoom) / gs) * gs;
  const ex = camera.x + canvas.width / 2 / camera.zoom;
  const ey = camera.y + canvas.height / 2 / camera.zoom;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5 / camera.zoom; ctx.beginPath();
  for (let x = sx; x <= ex; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
  for (let y = sy; y <= ey; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
  ctx.stroke();

  // World bounds
  const ww = settings.worldWidth || 2400, wh = settings.worldHeight || 600;
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2 / camera.zoom;
  ctx.setLineDash([8 / camera.zoom, 4 / camera.zoom]);
  ctx.strokeRect(0, 0, ww, wh); ctx.setLineDash([]);

  // Spawn
  const spx = settings.spawnX || 100, spy = settings.spawnY || 400;
  ctx.fillStyle = 'rgba(74,222,128,.3)'; ctx.fillRect(spx - 8, spy - 24, 16, 24);
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1 / camera.zoom; ctx.strokeRect(spx - 8, spy - 24, 16, 24);
  ctx.fillStyle = '#4ade80'; ctx.font = `${10 / camera.zoom}px Inter`; ctx.textAlign = 'center';
  ctx.fillText('SPAWN', spx, spy + 12 / camera.zoom);

  // Blocks
  blocks.forEach((b, i) => {
    ctx.globalAlpha = b.opacity !== undefined ? b.opacity : 1;
    ctx.fillStyle = b.color || '#333'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(b.x, b.y, b.w, 2);
    if (b.text) {
      ctx.fillStyle = b.textColor || '#fff'; ctx.font = `${b.textSize || 14}px ${b.textFont || 'Inter'}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.globalAlpha = 1;
    if (selectedBlock === i) {
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2 / camera.zoom; ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      const hs = HANDLE_SIZE / camera.zoom; ctx.fillStyle = '#3b82f6';
      [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x,y:b.y+b.h},{x:b.x+b.w,y:b.y+b.h}].forEach(h => ctx.fillRect(h.x-hs/2,h.y-hs/2,hs,hs));
    }
  });

  // Models
  models.forEach((m, i) => {
    const vis = getModelVisual(m.type);
    if (vis && vis.drawCanvas) vis.drawCanvas(ctx, m.x, m.y, m.w||40, m.h||80, renderTime, m.properties);
    else { ctx.fillStyle = '#555'; ctx.fillRect(m.x, m.y, m.w||40, m.h||80); }
    if (m.type === 'lever' && m.properties && m.properties.targetId) {
      const tgt = models.find(t => t.id === m.properties.targetId);
      if (tgt) {
        ctx.strokeStyle = 'rgba(204,51,51,0.4)'; ctx.lineWidth = 2 / camera.zoom;
        ctx.setLineDash([4/camera.zoom,4/camera.zoom]); ctx.beginPath();
        ctx.moveTo(m.x+(m.w||30)/2,m.y+(m.h||40)/2); ctx.lineTo(tgt.x+(tgt.w||40)/2,tgt.y+(tgt.h||80)/2);
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (selectedModel === i) {
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2 / camera.zoom;
      const mw=m.w||40,mh=m.h||80; ctx.strokeRect(m.x-2,m.y-2,mw+4,mh+4);
      const hs = HANDLE_SIZE / camera.zoom; ctx.fillStyle = '#F59E0B';
      [{x:m.x,y:m.y},{x:m.x+mw,y:m.y},{x:m.x,y:m.y+mh},{x:m.x+mw,y:m.y+mh}].forEach(h => ctx.fillRect(h.x-hs/2,h.y-hs/2,hs,hs));
    }
  });

  // Items
  items.forEach((item, i) => {
    const vis = getItemVisual(item.type);
    if (vis && vis.drawCanvas) vis.drawCanvas(ctx, item.x, item.y, 24 / camera.zoom, renderTime);
    else { ctx.fillStyle = '#666'; const sz = 8/camera.zoom; ctx.fillRect(item.x-sz,item.y-sz,sz*2,sz*2); }
    if (selectedItem === i) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2 / camera.zoom;
      const r = 20 / camera.zoom; ctx.strokeRect(item.x - r, item.y - r, r*2, r*2);
    }
  });

  // Avatars
  avatars.forEach((av, i) => {
    drawEditorAvatar(ctx, av, renderTime);
    if (selectedAvatar === i) {
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2 / camera.zoom;
      const aw = av.w || 22, ah = av.h || 34;
      ctx.strokeRect(av.x - aw/2 - 4, av.y - ah/2 - 4, aw + 8, ah + 8);
    }
  });

  // New block preview
  if (newBlockStart && currentTool === 'block') {
    const nx = Math.min(newBlockStart.x, newBlockStart.cx);
    const ny = Math.min(newBlockStart.y, newBlockStart.cy);
    const nw = Math.abs(newBlockStart.cx - newBlockStart.x);
    const nh = Math.abs(newBlockStart.cy - newBlockStart.y);
    ctx.fillStyle = 'rgba(59,130,246,.15)'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1 / camera.zoom;
    ctx.fillRect(nx, ny, nw, nh); ctx.strokeRect(nx, ny, nw, nh);
    ctx.fillStyle = '#3b82f6'; ctx.font = `${10/camera.zoom}px Inter`; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(nw)} × ${Math.round(nh)}`, nx+nw/2, ny-6/camera.zoom);
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = '#333'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(camera.zoom * 100)}%`, 10, canvas.height - 10);
  if (unsaved) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(canvas.width-20,20,4,0,Math.PI*2); ctx.fill(); }

  if (isMobile && (selectedBlock !== null || selectedItem !== null || selectedModel !== null || selectedAvatar !== null)) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,28);
    ctx.fillStyle = '#fff'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    let info = '';
    if (selectedBlock !== null) info = `Block #${selectedBlock} — tap & drag`;
    if (selectedItem !== null) info = `Item: ${items[selectedItem].type}`;
    if (selectedModel !== null) info = `Model: ${models[selectedModel].type}`;
    if (selectedAvatar !== null) info = `Avatar — tap & drag`;
    ctx.fillText(info, canvas.width / 2, 18);
  }

  requestAnimationFrame(render);
}

// ==================== INPUT ====================

function getPos(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX || e.offsetX, y: e.clientY || e.offsetY };
}

function getCanvasY(rawY) { return rawY - (isMobile ? 0 : 48); }

function clearSelection() { selectedBlock = null; selectedItem = null; selectedModel = null; selectedAvatar = null; selectedKeyframe = null; }

function findBlockAt(wx, wy) { for (let i = blocks.length - 1; i >= 0; i--) { const b = blocks[i]; if (wx >= b.x && wx <= b.x+b.w && wy >= b.y && wy <= b.y+b.h) return i; } return -1; }

function findItemAt(wx, wy) { const r = TOUCH_SELECT_RADIUS / camera.zoom; for (let i = items.length - 1; i >= 0; i--) { if (Math.abs(wx - items[i].x) < r && Math.abs(wy - items[i].y) < r) return i; } return -1; }

function findModelAt(wx, wy) { for (let i = models.length - 1; i >= 0; i--) { const m = models[i]; const mw=m.w||40,mh=m.h||80; if (wx >= m.x && wx <= m.x+mw && wy >= m.y && wy <= m.y+mh) return i; } return -1; }

function findAvatarAt(wx, wy) {
  const r = TOUCH_SELECT_RADIUS / camera.zoom;
  for (let i = avatars.length - 1; i >= 0; i--) {
    const av = avatars[i];
    const aw = (av.w || 22) / 2, ah = (av.h || 34) / 2;
    if (wx >= av.x - aw - r && wx <= av.x + aw + r && wy >= av.y - ah - r && wy <= av.y + ah + r) return i;
  }
  return -1;
}

function checkScaleHandle(wx, wy) {
  const hs = (HANDLE_SIZE + 4) / camera.zoom;
  if (selectedBlock !== null && blocks[selectedBlock]) {
    const b = blocks[selectedBlock];
    const handles = [{x:b.x,y:b.y,c:'nw'},{x:b.x+b.w,y:b.y,c:'ne'},{x:b.x,y:b.y+b.h,c:'sw'},{x:b.x+b.w,y:b.y+b.h,c:'se'}];
    for (const h of handles) { if (Math.abs(wx-h.x)<hs && Math.abs(wy-h.y)<hs) return { type:'block', handle:h.c, obj:b }; }
  }
  if (selectedModel !== null && models[selectedModel]) {
    const m = models[selectedModel]; const mw=m.w||40,mh=m.h||80;
    const handles = [{x:m.x,y:m.y,c:'nw'},{x:m.x+mw,y:m.y,c:'ne'},{x:m.x,y:m.y+mh,c:'sw'},{x:m.x+mw,y:m.y+mh,c:'se'}];
    for (const h of handles) { if (Math.abs(wx-h.x)<hs && Math.abs(wy-h.y)<hs) return { type:'model', handle:h.c, obj:m }; }
  }
  return null;
}

function onDown(e) {
  const pos = getPos(e); const canvasY = getCanvasY(pos.y); const world = s2w(pos.x, canvasY);
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  touchStartTime = Date.now();

  if (e.touches && e.touches.length === 2) { isPanning = true; dragStart = { x: pos.x, y: pos.y }; e.preventDefault(); return; }
  if (e.button === 1) { isPanning = true; dragStart = { x: pos.x, y: pos.y }; e.preventDefault(); return; }

  if (e.button === 2) {
    const aai = findAvatarAt(world.x, world.y);
    if (aai !== -1) { clearSelection(); selectedAvatar = aai; openAvatarProps(); updateExplorer(); e.preventDefault(); return; }
    const mi = findModelAt(world.x, world.y);
    if (mi !== -1) { clearSelection(); selectedModel = mi; openModelProps(); updateExplorer(); e.preventDefault(); return; }
    const bi = findBlockAt(world.x, world.y);
    if (bi !== -1) { clearSelection(); selectedBlock = bi; openBlockProps(); updateExplorer(); }
    const ii = findItemAt(world.x, world.y);
    if (ii !== -1) { clearSelection(); selectedItem = ii; openItemProps(); updateExplorer(); }
    e.preventDefault(); return;
  }

  if (e.button && e.button !== 0) return;
  if (currentTool === 'block') { newBlockStart = { x: world.x, y: world.y, cx: world.x, cy: world.y }; return; }

  if (currentTool === 'select' || currentTool === 'move') {
    const sh = checkScaleHandle(world.x, world.y);
    if (sh) { isScaling = true; scaleHandle = sh.handle; dragStart = { x: world.x, y: world.y }; dragObjStart = { x: sh.obj.x, y: sh.obj.y, w: sh.obj.w||(sh.type==='model'?40:sh.obj.w), h: sh.obj.h||(sh.type==='model'?80:sh.obj.h) }; return; }

    const mi = findModelAt(world.x, world.y);
    if (mi !== -1) {
      clearSelection(); selectedModel = mi; isDragging = true;
      dragStart = { x: world.x, y: world.y }; dragObjStart = { x: models[mi].x, y: models[mi].y };
      updateExplorer();
      if (isMobile) { longPressTimer = setTimeout(() => { openModelProps(); }, 500); }
      return;
    }

    const ai = findAvatarAt(world.x, world.y);
    if (ai !== -1) {
      clearSelection(); selectedAvatar = ai; isDragging = true;
      dragStart = { x: world.x, y: world.y }; dragObjStart = { x: avatars[ai].x, y: avatars[ai].y };
      updateExplorer();
      if (isMobile) { longPressTimer = setTimeout(() => { openAvatarProps(); }, 500); }
      return;
    }

    const ii = findItemAt(world.x, world.y);
    if (ii !== -1) {
      clearSelection(); selectedItem = ii; isDragging = true;
      dragStart = { x: world.x, y: world.y }; dragObjStart = { x: items[ii].x, y: items[ii].y };
      updateExplorer();
      if (isMobile) { longPressTimer = setTimeout(() => { openItemProps(); }, 500); }
      return;
    }

    const bi = findBlockAt(world.x, world.y);
    if (bi !== -1) {
      clearSelection(); selectedBlock = bi; isDragging = true;
      dragStart = { x: world.x, y: world.y }; dragObjStart = { x: blocks[bi].x, y: blocks[bi].y };
      updateExplorer();
      if (isMobile) { longPressTimer = setTimeout(() => { openBlockProps(); }, 500); }
      return;
    }

    clearSelection(); closeRightPanel(); updateExplorer();
    isPanning = true; dragStart = { x: pos.x, y: pos.y };
  }
}

function onMove(e) {
  const pos = getPos(e); const canvasY = getCanvasY(pos.y); const world = s2w(pos.x, canvasY);

  if (isPanning) {
    const dx = pos.x - dragStart.x, dy = pos.y - dragStart.y;
    camera.x -= dx / camera.zoom; camera.y -= dy / camera.zoom;
    dragStart = { x: pos.x, y: pos.y }; return;
  }
  if (newBlockStart) { newBlockStart.cx = world.x; newBlockStart.cy = world.y; return; }

  if (isScaling) {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    const dx = world.x - dragStart.x, dy = world.y - dragStart.y;
    if (selectedBlock !== null) {
      const b = blocks[selectedBlock];
      if (scaleHandle.includes('e')) b.w = Math.max(10, dragObjStart.w + dx);
      if (scaleHandle.includes('w')) { b.x = dragObjStart.x + dx; b.w = Math.max(10, dragObjStart.w - dx); }
      if (scaleHandle.includes('s')) b.h = Math.max(10, dragObjStart.h + dy);
      if (scaleHandle.includes('n')) { b.y = dragObjStart.y + dy; b.h = Math.max(10, dragObjStart.h - dy); }
    }
    if (selectedModel !== null) {
      const m = models[selectedModel];
      if (scaleHandle.includes('e')) m.w = Math.max(10, dragObjStart.w + dx);
      if (scaleHandle.includes('w')) { m.x = dragObjStart.x + dx; m.w = Math.max(10, dragObjStart.w - dx); }
      if (scaleHandle.includes('s')) m.h = Math.max(10, dragObjStart.h + dy);
      if (scaleHandle.includes('n')) { m.y = dragObjStart.y + dy; m.h = Math.max(10, dragObjStart.h - dy); }
    }
    unsaved = true; return;
  }

  if (isDragging) {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    const dx = world.x - dragStart.x, dy = world.y - dragStart.y;
    if (selectedBlock !== null) { blocks[selectedBlock].x = Math.round(dragObjStart.x + dx); blocks[selectedBlock].y = Math.round(dragObjStart.y + dy); }
    if (selectedItem !== null) { items[selectedItem].x = Math.round(dragObjStart.x + dx); items[selectedItem].y = Math.round(dragObjStart.y + dy); }
    if (selectedModel !== null) { models[selectedModel].x = Math.round(dragObjStart.x + dx); models[selectedModel].y = Math.round(dragObjStart.y + dy); }
    if (selectedAvatar !== null) { avatars[selectedAvatar].x = Math.round(dragObjStart.x + dx); avatars[selectedAvatar].y = Math.round(dragObjStart.y + dy); }
    unsaved = true;
  }
}

function onUp(e) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (newBlockStart && currentTool === 'block') {
    const x = Math.min(newBlockStart.x, newBlockStart.cx), y = Math.min(newBlockStart.y, newBlockStart.cy);
    const w = Math.abs(newBlockStart.cx - newBlockStart.x), h = Math.abs(newBlockStart.cy - newBlockStart.y);
    if (w > 5 && h > 5) {
      blocks.push({ id:'b_'+Date.now()+'_'+Math.random().toString(36).substr(2,3), x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h), color:'#333333',opacity:1,text:'',textFont:'Inter',textSize:14,textColor:'#ffffff',isSpawn:false });
      clearSelection(); selectedBlock = blocks.length - 1; unsaved = true; updateExplorer();
    }
    newBlockStart = null; return;
  }
  isDragging = false; isPanning = false; isScaling = false;
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false });
canvas.addEventListener('touchend', (e) => { onUp(e); });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camera.zoom = Math.max(0.2, Math.min(3, camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ==================== KEYBOARD ====================

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'v') setTool('select');
  if (e.key === 'b') setTool('block');
  if (e.key === 'm') setTool('move');
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveGame(); }
  if (e.key === 'e') toggleExplorer();
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedBlock !== null) { blocks.splice(selectedBlock,1); selectedBlock=null; closeRightPanel(); unsaved=true; updateExplorer(); }
    else if (selectedItem !== null) { items.splice(selectedItem,1); selectedItem=null; closeRightPanel(); unsaved=true; updateExplorer(); }
    else if (selectedModel !== null) { models.splice(selectedModel,1); selectedModel=null; closeRightPanel(); unsaved=true; updateExplorer(); }
    else if (selectedAvatar !== null) { avatars.splice(selectedAvatar,1); selectedAvatar=null; closeRightPanel(); unsaved=true; updateExplorer(); }
  }
  if (e.key === 'Escape') { clearSelection(); closeRightPanel(); closeAllModals(); updateExplorer(); }
});

// ==================== TOOLS ====================

function setTool(t) {
  currentTool = t;
  document.querySelectorAll('.topbar-tool,.mob-tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  canvas.style.cursor = t === 'block' ? 'crosshair' : t === 'move' ? 'grab' : 'default';
}

document.querySelectorAll('.topbar-tool[data-tool],.mob-tool[data-tool]').forEach(b => {
  b.addEventListener('click', () => setTool(b.dataset.tool));
});

// ==================== EXPLORER ====================

function toggleExplorer() {
  const panel = document.getElementById('explorer-panel');
  explorerOpen = !explorerOpen;
  panel.style.display = explorerOpen ? 'block' : 'none';
  if (explorerOpen) updateExplorer();
}

function updateExplorer() {
  if (!explorerOpen) return;
  document.getElementById('explorer-blocks-count').textContent = blocks.length;
  document.getElementById('explorer-items-count').textContent = items.length;
  document.getElementById('explorer-models-count').textContent = models.length;
  document.getElementById('explorer-avatars-count').textContent = avatars.length;

  const blocksList = document.getElementById('explorer-blocks-list');
  blocksList.innerHTML = '';
  blocks.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'explorer-node-header explorer-leaf explorer-selectable' + (selectedBlock === i ? ' explorer-selected' : '');
    el.innerHTML = `<span class="explorer-color-dot" style="background:${b.color||'#333'};margin-left:24px"></span><span>${b.text||('Block '+(i+1))}</span><span class="explorer-dim">${Math.round(b.w)}×${Math.round(b.h)}</span>`;
    el.addEventListener('click', () => { clearSelection(); selectedBlock = i; camera.x = b.x+b.w/2; camera.y = b.y+b.h/2; openBlockProps(); updateExplorer(); });
    blocksList.appendChild(el);
  });

  const itemsList = document.getElementById('explorer-items-list');
  itemsList.innerHTML = '';
  items.forEach((item, i) => {
    const asset = assets.find(a => a.id === item.type);
    const el = document.createElement('div');
    el.className = 'explorer-node-header explorer-leaf explorer-selectable' + (selectedItem === i ? ' explorer-selected' : '');
    el.innerHTML = `<span style="margin-left:24px;display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;color:#fbbf24">${getItemSVG(item.type).replace(/width="24"/g,'width="14"').replace(/height="24"/g,'height="14"')}</span><span>${asset?asset.name:item.type}</span><span class="explorer-dim">(${Math.round(item.x)},${Math.round(item.y)})</span>`;
    el.addEventListener('click', () => { clearSelection(); selectedItem = i; camera.x = item.x; camera.y = item.y; openItemProps(); updateExplorer(); });
    itemsList.appendChild(el);
  });

  const modelsList = document.getElementById('explorer-models-list');
  modelsList.innerHTML = '';
  models.forEach((m, i) => {
    const def = MODEL_DEFS[m.type];
    const el = document.createElement('div');
    el.className = 'explorer-node-header explorer-leaf explorer-selectable' + (selectedModel === i ? ' explorer-selected' : '');
    el.innerHTML = `<span style="margin-left:24px;display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;color:#f97316">${getModelSVG(m.type).replace(/width="24"/g,'width="14"').replace(/height="24"/g,'height="14"')}</span><span>${def?def.name:m.type}</span><span class="explorer-dim">(${Math.round(m.x)},${Math.round(m.y)})</span>`;
    el.addEventListener('click', () => { clearSelection(); selectedModel = i; camera.x = m.x+(m.w||40)/2; camera.y = m.y+(m.h||80)/2; openModelProps(); updateExplorer(); });
    modelsList.appendChild(el);
  });

  const avatarsList = document.getElementById('explorer-avatars-list');
  avatarsList.innerHTML = '';
  avatars.forEach((av, i) => {
    const el = document.createElement('div');
    el.className = 'explorer-node-header explorer-leaf explorer-selectable' + (selectedAvatar === i ? ' explorer-selected' : '');
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" style="margin-left:24px;margin-right:4px"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0114 0"/></svg><span>${av.usePlayerAvatar?'Player Avatar':'NPC'}</span><span class="explorer-dim">${av.defaultAnim} (${Math.round(av.x)},${Math.round(av.y)})</span>`;
    el.addEventListener('click', () => { clearSelection(); selectedAvatar = i; camera.x = av.x; camera.y = av.y; openAvatarProps(); updateExplorer(); });
    avatarsList.appendChild(el);
  });
}

document.querySelectorAll('[data-expand]').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.dataset.expand;
    const arrow = header.querySelector('.explorer-arrow');
    let children;
    if (key === 'workspace') children = document.getElementById('explorer-workspace-children');
    else if (key === 'blocks') children = document.getElementById('explorer-blocks-list');
    else if (key === 'items') children = document.getElementById('explorer-items-list');
    else if (key === 'models') children = document.getElementById('explorer-models-list');
    else if (key === 'avatars') children = document.getElementById('explorer-avatars-list');
    if (children) {
      const isHidden = children.style.display === 'none';
      children.style.display = isHidden ? 'block' : 'none';
      if (arrow) arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
  });
});

document.getElementById('explorer-settings-node').addEventListener('click', () => { document.getElementById('btn-settings').click(); });
document.getElementById('explorer-spawn-node').addEventListener('click', () => { camera.x = settings.spawnX||100; camera.y = settings.spawnY||400; camera.zoom = Math.max(1, camera.zoom); });
document.getElementById('btn-explorer-toggle').addEventListener('click', toggleExplorer);
document.getElementById('explorer-close').addEventListener('click', () => { explorerOpen = false; document.getElementById('explorer-panel').style.display = 'none'; });
document.getElementById('mob-explorer')?.addEventListener('click', toggleExplorer);

// ==================== PANELS ====================

function closeRightPanel() {
  document.getElementById('right-panel').style.display = 'none';
  document.getElementById('avatar-props').style.display = 'none';
}
document.getElementById('rp-close').addEventListener('click', closeRightPanel);

function openBlockProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'block';
  document.getElementById('item-props').style.display = 'none';
  document.getElementById('model-props').style.display = 'none';
  document.getElementById('avatar-props').style.display = 'none';
  document.getElementById('rp-title').textContent = 'Block Properties';
  updateBlockProps();
}

function updateBlockProps() {
  if (selectedBlock === null) return;
  const b = blocks[selectedBlock];
  document.getElementById('prop-x').value = Math.round(b.x);
  document.getElementById('prop-y').value = Math.round(b.y);
  document.getElementById('prop-w').value = Math.round(b.w);
  document.getElementById('prop-h').value = Math.round(b.h);
  document.getElementById('prop-color').value = b.color || '#333333';
  document.getElementById('prop-color-text').value = b.color || '#333333';
  document.getElementById('prop-opacity').value = b.opacity !== undefined ? b.opacity : 1;
  document.getElementById('prop-opacity-val').textContent = (b.opacity !== undefined ? b.opacity : 1).toFixed(2);
  document.getElementById('prop-text').value = b.text || '';
  document.getElementById('prop-text-font').value = b.textFont || 'Inter';
  document.getElementById('prop-text-size').value = b.textSize || 14;
  document.getElementById('prop-text-color').value = b.textColor || '#ffffff';
  document.getElementById('prop-spawn').checked = b.isSpawn || false;
}

const propMap = {'prop-x':'x','prop-y':'y','prop-w':'w','prop-h':'h'};
['prop-x','prop-y','prop-w','prop-h'].forEach(id => { document.getElementById(id).addEventListener('input', e => { if (selectedBlock===null) return; blocks[selectedBlock][propMap[id]]=parseFloat(e.target.value)||0; unsaved=true; }); });
document.getElementById('prop-color').addEventListener('input', e => { if (selectedBlock===null) return; blocks[selectedBlock].color=e.target.value; document.getElementById('prop-color-text').value=e.target.value; unsaved=true; updateExplorer(); });
document.getElementById('prop-color-text').addEventListener('input', e => { if (selectedBlock===null) return; if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)){blocks[selectedBlock].color=e.target.value;document.getElementById('prop-color').value=e.target.value;unsaved=true;updateExplorer();} });
document.getElementById('prop-opacity').addEventListener('input', e => { if (selectedBlock===null) return; blocks[selectedBlock].opacity=parseFloat(e.target.value); document.getElementById('prop-opacity-val').textContent=parseFloat(e.target.value).toFixed(2); unsaved=true; });
document.getElementById('prop-text').addEventListener('input', e => { if (selectedBlock===null) return; blocks[selectedBlock].text=e.target.value; unsaved=true; updateExplorer(); });
document.getElementById('prop-text-font').addEventListener('change', e => { if(selectedBlock===null)return; blocks[selectedBlock].textFont=e.target.value; unsaved=true; });
document.getElementById('prop-text-size').addEventListener('input', e => { if(selectedBlock===null)return; blocks[selectedBlock].textSize=parseInt(e.target.value)||14; unsaved=true; });
document.getElementById('prop-text-color').addEventListener('input', e => { if(selectedBlock===null)return; blocks[selectedBlock].textColor=e.target.value; unsaved=true; });
document.getElementById('prop-spawn').addEventListener('change', e => { if(selectedBlock===null)return; blocks[selectedBlock].isSpawn=e.target.checked; if(e.target.checked){settings.spawnX=blocks[selectedBlock].x+blocks[selectedBlock].w/2;settings.spawnY=blocks[selectedBlock].y;} unsaved=true; });
document.getElementById('btn-delete-block').addEventListener('click', () => { if(selectedBlock===null)return; blocks.splice(selectedBlock,1); selectedBlock=null; closeRightPanel(); unsaved=true; updateExplorer(); });

// ==================== ITEM PROPERTIES ====================

function openItemProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'none';
  document.getElementById('item-props').style.display = 'block';
  document.getElementById('model-props').style.display = 'none';
  document.getElementById('avatar-props').style.display = 'none';
  document.getElementById('rp-title').textContent = 'Item Properties';
  updateItemProps();
}

function updateItemProps() {
  if (selectedItem === null) return;
  const it = items[selectedItem];
  const asset = assets.find(a => a.id === it.type);
  document.getElementById('item-type-display').innerHTML = `${getItemSVG(it.type)}<span style="margin-left:8px">${asset?asset.name:it.type}</span>`;
  document.getElementById('item-x').value = Math.round(it.x);
  document.getElementById('item-y').value = Math.round(it.y);
  document.getElementById('item-give-start').checked = it.giveOnStart || false;
  document.getElementById('item-collect-touch').checked = it.collectOnTouch !== false;
  const cp = document.getElementById('item-custom-props'); cp.innerHTML = '';
  if (asset && asset.defaults) {
    cp.innerHTML = '<label>Properties</label>';
    Object.entries(asset.defaults).forEach(([key, def]) => {
      const val = it.properties && it.properties[key] !== undefined ? it.properties[key] : def;
      const div = document.createElement('div'); div.className = 'rp-field'; div.style.marginBottom = '4px';
      if (typeof def === 'string') { div.innerHTML = `<span>${key}</span><input type="text" value="${val}" style="flex:1">`; div.querySelector('input').addEventListener('input', e => { if(!it.properties)it.properties={}; it.properties[key]=e.target.value; unsaved=true; }); }
      else { div.innerHTML = `<span>${key}</span><input type="number" step="any" value="${val}">`; div.querySelector('input').addEventListener('input', e => { if(!it.properties)it.properties={}; it.properties[key]=parseFloat(e.target.value); unsaved=true; }); }
      cp.appendChild(div);
    });
  }
}

document.getElementById('item-x').addEventListener('input', e => { if(selectedItem===null)return; items[selectedItem].x=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('item-y').addEventListener('input', e => { if(selectedItem===null)return; items[selectedItem].y=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('item-give-start').addEventListener('change', e => { if(selectedItem===null)return; items[selectedItem].giveOnStart=e.target.checked; unsaved=true; });
document.getElementById('item-collect-touch').addEventListener('change', e => { if(selectedItem===null)return; items[selectedItem].collectOnTouch=e.target.checked; unsaved=true; });
document.getElementById('btn-delete-item').addEventListener('click', () => { if(selectedItem===null)return; items.splice(selectedItem,1); selectedItem=null; closeRightPanel(); unsaved=true; updateExplorer(); });

// ==================== MODEL PROPERTIES ====================

function openModelProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'none';
  document.getElementById('item-props').style.display = 'none';
  document.getElementById('model-props').style.display = 'block';
  document.getElementById('avatar-props').style.display = 'none';
  document.getElementById('rp-title').textContent = 'Model Properties';
  updateModelProps();
}

function updateModelProps() {
  if (selectedModel === null) return;
  const m = models[selectedModel]; const def = MODEL_DEFS[m.type];
  document.getElementById('model-type-display').innerHTML = `${getModelSVG(m.type)}<span style="margin-left:8px">${def?def.name:m.type}</span>`;
  document.getElementById('model-x').value = Math.round(m.x);
  document.getElementById('model-y').value = Math.round(m.y);
  document.getElementById('model-w').value = Math.round(m.w||40);
  document.getElementById('model-h').value = Math.round(m.h||80);
  const cp = document.getElementById('model-custom-props'); cp.innerHTML = '';
  if (def && def.defaults) {
    cp.innerHTML = '<label>Model Settings</label>';
    Object.entries(def.defaults).forEach(([key, defVal]) => {
      const val = m.properties && m.properties[key] !== undefined ? m.properties[key] : defVal;
      const div = document.createElement('div'); div.className = 'rp-field'; div.style.marginBottom = '6px';
      if (key==='keyId') { const ki=items.filter(it=>it.type==='key'); let o='<option value="">-- None --</option>'; ki.forEach(k=>{o+=`<option value="${k.id}" ${val===k.id?'selected':''}>Key @ (${Math.round(k.x)},${Math.round(k.y)})</option>`;}); div.innerHTML=`<span>Link Key</span><select class="rp-select" style="flex:1">${o}</select>`; div.querySelector('select').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (key==='leverId') { const ls=models.filter(md=>md.type==='lever'); let o='<option value="">-- None --</option>'; ls.forEach(l=>{o+=`<option value="${l.id}" ${val===l.id?'selected':''}>Lever @ (${Math.round(l.x)},${Math.round(l.y)})</option>`;}); div.innerHTML=`<span>Link Lever</span><select class="rp-select" style="flex:1">${o}</select>`; div.querySelector('select').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (key==='targetId') { const ds=models.filter(md=>md.type.startsWith('door_')); let o='<option value="">-- None --</option>'; ds.forEach(d2=>{const dd=MODEL_DEFS[d2.type];o+=`<option value="${d2.id}" ${val===d2.id?'selected':''}>${dd?dd.name:d2.type} @ (${Math.round(d2.x)},${Math.round(d2.y)})</option>`;}); div.innerHTML=`<span>Target</span><select class="rp-select" style="flex:1">${o}</select>`; div.querySelector('select').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (key==='keycardColor'||key==='cardColor') { const cs=['red','blue','green','yellow']; let o=''; cs.forEach(c2=>{o+=`<option value="${c2}" ${val===c2?'selected':''}>${c2.charAt(0).toUpperCase()+c2.slice(1)}</option>`;}); div.innerHTML=`<span>${key==='cardColor'?'Color':'Required'}</span><select class="rp-select" style="flex:1">${o}</select>`; div.querySelector('select').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (key==='direction') { const ds=['up','down','left','right']; let o=''; ds.forEach(d2=>{o+=`<option value="${d2}" ${val===d2?'selected':''}>${d2.charAt(0).toUpperCase()+d2.slice(1)}</option>`;}); div.innerHTML=`<span>Direction</span><select class="rp-select" style="flex:1">${o}</select>`; div.querySelector('select').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (key==='color') { div.innerHTML=`<span>Color</span><input type="color" value="${val}" class="rp-color">`; div.querySelector('input').addEventListener('input',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      else if (typeof defVal==='boolean') { div.className='rp-checkbox'; div.innerHTML=`<input type="checkbox" id="mp-${key}" ${val?'checked':''}><label for="mp-${key}">${key}</label>`; div.querySelector('input').addEventListener('change',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.checked;unsaved=true;}); }
      else if (typeof defVal==='number') { div.innerHTML=`<span>${key}</span><input type="number" step="any" value="${val}">`; div.querySelector('input').addEventListener('input',e=>{if(!m.properties)m.properties={};m.properties[key]=parseFloat(e.target.value);unsaved=true;}); }
      else { div.innerHTML=`<span>${key}</span><input type="text" value="${val||''}" style="flex:1">`; div.querySelector('input').addEventListener('input',e=>{if(!m.properties)m.properties={};m.properties[key]=e.target.value;unsaved=true;}); }
      cp.appendChild(div);
    });
  }
}

document.getElementById('model-x').addEventListener('input', e => { if(selectedModel===null)return; models[selectedModel].x=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('model-y').addEventListener('input', e => { if(selectedModel===null)return; models[selectedModel].y=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('model-w').addEventListener('input', e => { if(selectedModel===null)return; models[selectedModel].w=Math.max(10,parseFloat(e.target.value)||40); unsaved=true; });
document.getElementById('model-h').addEventListener('input', e => { if(selectedModel===null)return; models[selectedModel].h=Math.max(10,parseFloat(e.target.value)||80); unsaved=true; });
document.getElementById('btn-delete-model').addEventListener('click', () => { if(selectedModel===null)return; models.splice(selectedModel,1); selectedModel=null; closeRightPanel(); unsaved=true; updateExplorer(); });

// ==================== AVATAR PROPERTIES ====================

function openAvatarProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'none';
  document.getElementById('item-props').style.display = 'none';
  document.getElementById('model-props').style.display = 'none';
  document.getElementById('avatar-props').style.display = 'block';
  document.getElementById('rp-title').textContent = 'Avatar Properties';
  updateAvatarProps();
  startAvatarPreview();
}

function updateAvatarProps() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  document.getElementById('avatar-x').value = Math.round(av.x);
  document.getElementById('avatar-y').value = Math.round(av.y);
  document.getElementById('avatar-w').value = av.w || 22;
  document.getElementById('avatar-h').value = av.h || 34;
  document.getElementById('avatar-default-anim').value = av.defaultAnim || 'idle';
  document.getElementById('avatar-anim-speed').value = av.animSpeed || 1;
  document.getElementById('avatar-anim-speed-val').textContent = (av.animSpeed || 1).toFixed(1);
  document.getElementById('avatar-loop').checked = av.loop !== false;
  document.getElementById('avatar-interact').checked = av.interactive || false;
  document.getElementById('avatar-use-player').checked = av.usePlayerAvatar || false;
  document.getElementById('avatar-body-color').value = av.bodyColor || '#ffffff';
  document.getElementById('avatar-head-color').value = av.headColor || '#ffffff';
  document.getElementById('avatar-eye-color').value = av.eyeColor || '#000000';
  document.querySelectorAll('.avatar-dir-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.dir) === (av.direction || 1)));
  document.getElementById('avatar-custom-anim').style.display = av.defaultAnim === 'custom' ? 'block' : 'none';
  renderKeyframeTimeline();
  updateDialogueSection();
}

let avatarPreviewRAF = null;
function startAvatarPreview() {
  if (avatarPreviewRAF) cancelAnimationFrame(avatarPreviewRAF);
  const cv = document.getElementById('avatar-preview-canvas');
  if (!cv) return;
  const c = cv.getContext('2d');
  function frame(ts) {
    if (selectedAvatar === null || document.getElementById('avatar-props').style.display === 'none') return;
    const t = ts / 1000;
    const av = avatars[selectedAvatar];
    if (!av) return;
    c.clearRect(0, 0, 80, 100);
    c.fillStyle = '#080808'; c.fillRect(0, 0, 80, 100);
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 80, 80, 20);
    c.save(); c.translate(40, 60);
    const bc = av.usePlayerAvatar ? '#888' : (av.bodyColor || '#fff');
    const hc2 = av.usePlayerAvatar ? '#999' : (av.headColor || '#fff');
    const bob = Math.sin(t * 3) * 1;
    c.translate(0, bob);
    c.fillStyle = bc; c.fillRect(-6, -5, 12, 15);
    c.fillStyle = hc2; c.fillRect(-5.5, -17, 11, 11);
    c.fillStyle = av.eyeColor || '#000';
    if (av.direction === 1 || av.direction === undefined) { c.fillRect(1, -13, 2, 2); c.fillRect(4, -13, 2, 2); }
    else { c.fillRect(-3, -13, 2, 2); c.fillRect(-6, -13, 2, 2); }
    c.fillStyle = bc; c.fillRect(-5, 10, 4, 8); c.fillRect(1, 10, 4, 8);
    c.restore();
    c.fillStyle = '#a78bfa'; c.font = '9px Inter'; c.textAlign = 'center';
    c.fillText(av.defaultAnim || 'idle', 40, 95);
    avatarPreviewRAF = requestAnimationFrame(frame);
  }
  avatarPreviewRAF = requestAnimationFrame(frame);
}

document.getElementById('avatar-x').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].x=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('avatar-y').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].y=parseFloat(e.target.value)||0; unsaved=true; });
document.getElementById('avatar-w').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].w=Math.max(10,parseFloat(e.target.value)||22); unsaved=true; });
document.getElementById('avatar-h').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].h=Math.max(10,parseFloat(e.target.value)||34); unsaved=true; });
document.getElementById('avatar-default-anim').addEventListener('change', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].defaultAnim=e.target.value; document.getElementById('avatar-custom-anim').style.display=e.target.value==='custom'?'block':'none'; unsaved=true; });
document.getElementById('avatar-anim-speed').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].animSpeed=parseFloat(e.target.value); document.getElementById('avatar-anim-speed-val').textContent=parseFloat(e.target.value).toFixed(1); unsaved=true; });
document.getElementById('avatar-loop').addEventListener('change', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].loop=e.target.checked; unsaved=true; });
document.getElementById('avatar-interact').addEventListener('change', e => {
  if(selectedAvatar===null)return;
  avatars[selectedAvatar].interactive=e.target.checked;
  unsaved=true;
  updateDialogueSection();
});
document.getElementById('avatar-use-player').addEventListener('change', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].usePlayerAvatar=e.target.checked; unsaved=true; });
document.getElementById('avatar-body-color').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].bodyColor=e.target.value; unsaved=true; });
document.getElementById('avatar-head-color').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].headColor=e.target.value; unsaved=true; });
document.getElementById('avatar-eye-color').addEventListener('input', e => { if(selectedAvatar===null)return; avatars[selectedAvatar].eyeColor=e.target.value; unsaved=true; });
document.querySelectorAll('.avatar-dir-btn').forEach(b => { b.addEventListener('click', () => { if(selectedAvatar===null)return; avatars[selectedAvatar].direction=parseInt(b.dataset.dir); document.querySelectorAll('.avatar-dir-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); unsaved=true; }); });
document.getElementById('btn-delete-avatar').addEventListener('click', () => { if(selectedAvatar===null)return; avatars.splice(selectedAvatar,1); selectedAvatar=null; closeRightPanel(); unsaved=true; updateExplorer(); });

// ==================== KEYFRAME SYSTEM ====================

function renderKeyframeTimeline() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const track = document.getElementById('keyframe-track');
  track.innerHTML = '';
  if (!av.keyframes || av.keyframes.length === 0) {
    track.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:10px">No keyframes</div>';
    document.getElementById('keyframe-props').style.display = 'none'; return;
  }
  const maxT = av.keyframes.reduce((m, kf) => Math.max(m, kf.time + (kf.duration || 0.5)), 1);
  const line = document.createElement('div'); line.className = 'keyframe-line'; line.style.left = '5%'; line.style.width = '90%'; track.appendChild(line);
  av.keyframes.forEach((kf, i) => {
    const dot = document.createElement('div');
    dot.className = 'keyframe-dot' + (selectedKeyframe === i ? ' active' : '');
    dot.style.left = (5 + (kf.time / maxT) * 90) + '%';
    dot.title = `${kf.pose||'idle'} @ ${kf.time.toFixed(1)}s`;
    dot.addEventListener('click', e => { e.stopPropagation(); selectedKeyframe = i; renderKeyframeTimeline(); updateKeyframeProps(); });
    track.appendChild(dot);
  });
  if (selectedKeyframe !== null && av.keyframes[selectedKeyframe]) { document.getElementById('keyframe-props').style.display = 'block'; updateKeyframeProps(); }
  else document.getElementById('keyframe-props').style.display = 'none';
}

function updateKeyframeProps() {
  if (selectedAvatar === null || selectedKeyframe === null) return;
  const kf = avatars[selectedAvatar].keyframes[selectedKeyframe]; if (!kf) return;
  document.getElementById('kf-index').textContent = selectedKeyframe + 1;
  document.getElementById('kf-time').value = kf.time || 0;
  document.getElementById('kf-duration').value = kf.duration || 0.5;
  document.getElementById('kf-pose').value = kf.pose || 'idle';
  document.getElementById('kf-dx').value = kf.dx || 0;
  document.getElementById('kf-dy').value = kf.dy || 0;
  document.getElementById('kf-dir').value = kf.dir || 0;
  document.getElementById('kf-easing').value = kf.easing || 'linear';
}

document.getElementById('btn-add-keyframe').addEventListener('click', () => {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar]; if (!av.keyframes) av.keyframes = [];
  const lt = av.keyframes.length > 0 ? av.keyframes[av.keyframes.length-1].time + 1 : 0;
  av.keyframes.push({ time: lt, duration: 0.5, pose: 'idle', dx: 0, dy: 0, dir: 0, easing: 'linear' });
  selectedKeyframe = av.keyframes.length - 1; unsaved = true; renderKeyframeTimeline();
});

document.getElementById('btn-play-anim').addEventListener('click', () => {
  avatarAnimPreview = !avatarAnimPreview;
  document.getElementById('btn-play-anim').textContent = avatarAnimPreview ? '⏸ Stop' : '▶ Preview';
});

document.getElementById('btn-delete-keyframe').addEventListener('click', () => {
  if (selectedAvatar === null || selectedKeyframe === null) return;
  avatars[selectedAvatar].keyframes.splice(selectedKeyframe, 1); selectedKeyframe = null; unsaved = true; renderKeyframeTimeline();
});

['kf-time','kf-duration','kf-dx','kf-dy'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    if (selectedAvatar === null || selectedKeyframe === null) return;
    const kf = avatars[selectedAvatar].keyframes[selectedKeyframe];
    const key = id === 'kf-time' ? 'time' : id === 'kf-duration' ? 'duration' : id === 'kf-dx' ? 'dx' : 'dy';
    kf[key] = parseFloat(e.target.value) || 0; unsaved = true; renderKeyframeTimeline();
  });
});

document.getElementById('kf-pose').addEventListener('change', e => { if(selectedAvatar===null||selectedKeyframe===null)return; avatars[selectedAvatar].keyframes[selectedKeyframe].pose=e.target.value; unsaved=true; });
document.getElementById('kf-dir').addEventListener('change', e => { if(selectedAvatar===null||selectedKeyframe===null)return; avatars[selectedAvatar].keyframes[selectedKeyframe].dir=parseInt(e.target.value); unsaved=true; });
document.getElementById('kf-easing').addEventListener('change', e => { if(selectedAvatar===null||selectedKeyframe===null)return; avatars[selectedAvatar].keyframes[selectedKeyframe].easing=e.target.value; unsaved=true; });

// ==================== DIALOGUE SCRIPT SYSTEM ====================

function initDialogueData(av) {
  if (!av.dialogue) {
    av.dialogue = {
      triggerKey: 'E',
      triggerRadius: 80,
      oneTime: false,
      npcName: '',
      nameColor: '#a78bfa',
      typingSpeed: 30,
      lines: [],
      hasChoices: false,
      choiceAfterLine: 1,
      choicePrompt: '',
      choices: [],
      endAction: 'none',
      endActionParams: {},
      hasCondition: false,
      conditionType: 'has_item',
      conditionParams: {},
      conditionFailText: ''
    };
  }
  return av.dialogue;
}

function updateDialogueSection() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const section = document.getElementById('avatar-dialogue-section');
  const isInteractive = av.interactive || false;
  section.style.display = isInteractive ? 'block' : 'none';

  if (!isInteractive) return;

  const d = initDialogueData(av);

  document.getElementById('dialogue-trigger-key').value = d.triggerKey || 'E';
  document.getElementById('dialogue-trigger-radius').value = d.triggerRadius || 80;
  document.getElementById('dialogue-trigger-radius-val').textContent = d.triggerRadius || 80;
  document.getElementById('dialogue-one-time').checked = d.oneTime || false;
  document.getElementById('dialogue-npc-name').value = d.npcName || '';
  document.getElementById('dialogue-name-color').value = d.nameColor || '#a78bfa';
  document.getElementById('dialogue-has-choices').checked = d.hasChoices || false;
  document.getElementById('dialogue-choices-section').style.display = d.hasChoices ? 'block' : 'none';
  document.getElementById('dialogue-choice-after').value = d.choiceAfterLine || 1;
  document.getElementById('dialogue-choice-prompt').value = d.choicePrompt || '';
  document.getElementById('dialogue-end-action').value = d.endAction || 'none';
  document.getElementById('dialogue-has-condition').checked = d.hasCondition || false;
  document.getElementById('dialogue-condition-section').style.display = d.hasCondition ? 'block' : 'none';
  document.getElementById('dialogue-condition-type').value = d.conditionType || 'has_item';
  document.getElementById('dialogue-condition-fail-text').value = d.conditionFailText || '';

  renderDialogueLines();
  renderDialogueChoices();
  renderDialogueActionParams();
  renderDialogueConditionParams();
}

function renderDialogueLines() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const d = initDialogueData(av);
  const container = document.getElementById('dialogue-lines-list');
  container.innerHTML = '';

  if (!d.lines || d.lines.length === 0) {
    container.innerHTML = '<div style="padding:12px;text-align:center;color:#333;font-size:11px">No dialogue lines yet. Click "Add Line" to start.</div>';
    return;
  }

  d.lines.forEach((line, i) => {
    const el = document.createElement('div');
    el.className = 'dialogue-line-item';
    el.innerHTML = `
      <span class="dialogue-line-number">${i + 1}</span>
      <div class="dialogue-line-content">
        <div class="dialogue-line-speaker">
          <select data-line="${i}" data-field="speaker">
            <option value="npc" ${(line.speaker || 'npc') === 'npc' ? 'selected' : ''}>NPC</option>
            <option value="player" ${line.speaker === 'player' ? 'selected' : ''}>Player</option>
            <option value="narrator" ${line.speaker === 'narrator' ? 'selected' : ''}>Narrator</option>
            <option value="system" ${line.speaker === 'system' ? 'selected' : ''}>System</option>
          </select>
          <select data-line="${i}" data-field="emotion" style="width:80px">
            <option value="neutral" ${(line.emotion || 'neutral') === 'neutral' ? 'selected' : ''}>😐</option>
            <option value="happy" ${line.emotion === 'happy' ? 'selected' : ''}>😊</option>
            <option value="sad" ${line.emotion === 'sad' ? 'selected' : ''}>😢</option>
            <option value="angry" ${line.emotion === 'angry' ? 'selected' : ''}>😠</option>
            <option value="surprised" ${line.emotion === 'surprised' ? 'selected' : ''}>😮</option>
            <option value="thinking" ${line.emotion === 'thinking' ? 'selected' : ''}>🤔</option>
          </select>
        </div>
        <textarea class="dialogue-line-text" data-line="${i}" data-field="text" placeholder="Enter dialogue text..." rows="1">${line.text || ''}</textarea>
        <div class="dialogue-line-options">
          <select data-line="${i}" data-field="effect" style="width:90px" title="Text effect">
            <option value="normal" ${(line.effect || 'normal') === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="shake" ${line.effect === 'shake' ? 'selected' : ''}>Shake</option>
            <option value="wave" ${line.effect === 'wave' ? 'selected' : ''}>Wave</option>
            <option value="fade" ${line.effect === 'fade' ? 'selected' : ''}>Fade In</option>
            <option value="glitch" ${line.effect === 'glitch' ? 'selected' : ''}>Glitch</option>
          </select>
          <div class="dialogue-typing-speed">
            <label>Speed</label>
            <input type="number" data-line="${i}" data-field="speed" value="${line.speed || 30}" min="5" max="200" step="5" style="width:50px;padding:3px 6px;background:#0a0a0a;border:1px solid #222;border-radius:4px;color:#888;font-size:10px;font-family:Inter;outline:none">
            <label>ms</label>
          </div>
        </div>
      </div>
      <div class="dialogue-line-actions">
        <button class="dialogue-line-btn" data-action="up" data-line="${i}" title="Move Up" ${i === 0 ? 'disabled style="opacity:0.3"' : ''}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="dialogue-line-btn" data-action="down" data-line="${i}" title="Move Down" ${i === d.lines.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button class="dialogue-line-btn danger" data-action="delete" data-line="${i}" title="Delete">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
    container.appendChild(el);
  });

  // Bind events
  container.querySelectorAll('textarea[data-field="text"]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.line);
      d.lines[idx].text = e.target.value;
      unsaved = true;
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    });
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  });

  container.querySelectorAll('select[data-field]').forEach(el => {
    el.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.line);
      const field = e.target.dataset.field;
      d.lines[idx][field] = e.target.value;
      unsaved = true;
    });
  });

  container.querySelectorAll('input[data-field="speed"]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.line);
      d.lines[idx].speed = parseInt(e.target.value) || 30;
      unsaved = true;
    });
  });

  container.querySelectorAll('.dialogue-line-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.line);
      if (action === 'up' && idx > 0) {
        [d.lines[idx], d.lines[idx - 1]] = [d.lines[idx - 1], d.lines[idx]];
      } else if (action === 'down' && idx < d.lines.length - 1) {
        [d.lines[idx], d.lines[idx + 1]] = [d.lines[idx + 1], d.lines[idx]];
      } else if (action === 'delete') {
        d.lines.splice(idx, 1);
      }
      unsaved = true;
      renderDialogueLines();
    });
  });
}

function renderDialogueChoices() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const d = initDialogueData(av);
  const container = document.getElementById('dialogue-choices-list');
  container.innerHTML = '';

  if (!d.choices || d.choices.length === 0) {
    container.innerHTML = '<div style="padding:8px;text-align:center;color:#333;font-size:11px">No choices added.</div>';
    return;
  }

  d.choices.forEach((choice, i) => {
    const el = document.createElement('div');
    el.className = 'dialogue-choice-item';
    el.innerHTML = `
      <span class="dialogue-line-number" style="background:#1a1a3e;color:#3b82f6">${i + 1}</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <input type="text" value="${choice.text || ''}" placeholder="Choice text..." data-choice="${i}" data-field="text">
        <div class="dialogue-choice-result">
          <select data-choice="${i}" data-field="action" style="flex:1">
            <option value="continue" ${(choice.action || 'continue') === 'continue' ? 'selected' : ''}>Continue dialogue</option>
            <option value="jump" ${choice.action === 'jump' ? 'selected' : ''}>Jump to line #</option>
            <option value="end" ${choice.action === 'end' ? 'selected' : ''}>End dialogue</option>
            <option value="give_item" ${choice.action === 'give_item' ? 'selected' : ''}>Give item</option>
            <option value="set_variable" ${choice.action === 'set_variable' ? 'selected' : ''}>Set variable</option>
          </select>
          ${choice.action === 'jump' ? `<input type="number" data-choice="${i}" data-field="jumpTo" value="${choice.jumpTo || 1}" min="1" style="width:50px;padding:4px 6px;background:#0a0a0a;border:1px solid #222;border-radius:4px;color:#888;font-size:11px;font-family:Inter;outline:none">` : ''}
        </div>
        ${choice.action === 'give_item' ? `
          <select data-choice="${i}" data-field="itemId" style="padding:4px 6px;background:#0a0a0a;border:1px solid #222;border-radius:4px;color:#aaa;font-family:Inter;font-size:11px;outline:none;cursor:pointer">
            <option value="">-- Select item --</option>
            ${items.map(it => `<option value="${it.id}" ${choice.itemId === it.id ? 'selected' : ''}>${it.type} @ (${Math.round(it.x)},${Math.round(it.y)})</option>`).join('')}
          </select>
        ` : ''}
        ${choice.action === 'set_variable' ? `
          <div style="display:flex;gap:4px">
            <input type="text" data-choice="${i}" data-field="varName" value="${choice.varName || ''}" placeholder="var name" style="flex:1;padding:4px 6px;background:#0a0a0a;border:1px solid #222;border-radius:4px;color:#888;font-size:11px;font-family:Inter;outline:none">
            <input type="text" data-choice="${i}" data-field="varValue" value="${choice.varValue || ''}" placeholder="value" style="flex:1;padding:4px 6px;background:#0a0a0a;border:1px solid #222;border-radius:4px;color:#888;font-size:11px;font-family:Inter;outline:none">
          </div>
        ` : ''}
      </div>
      <button class="dialogue-line-btn danger" data-choice-delete="${i}" title="Delete">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(el);
  });

  container.querySelectorAll('input[data-field="text"]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.choice);
      d.choices[idx].text = e.target.value;
      unsaved = true;
    });
  });

  container.querySelectorAll('select[data-field]').forEach(el => {
    el.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.choice);
      const field = e.target.dataset.field;
      d.choices[idx][field] = e.target.value;
      unsaved = true;
      renderDialogueChoices();
    });
  });

  container.querySelectorAll('input[data-field="jumpTo"]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.choice);
      d.choices[idx].jumpTo = parseInt(e.target.value) || 1;
      unsaved = true;
    });
  });

  container.querySelectorAll('input[data-field="varName"], input[data-field="varValue"]').forEach(el => {
    el.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.choice);
      d.choices[idx][e.target.dataset.field] = e.target.value;
      unsaved = true;
    });
  });

  container.querySelectorAll('select[data-field="itemId"]').forEach(el => {
    el.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.choice);
      d.choices[idx].itemId = e.target.value;
      unsaved = true;
    });
  });

  container.querySelectorAll('[data-choice-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      d.choices.splice(parseInt(btn.dataset.choiceDelete), 1);
      unsaved = true;
      renderDialogueChoices();
    });
  });
}

function renderDialogueActionParams() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const d = initDialogueData(av);
  const container = document.getElementById('dialogue-action-params');
  container.innerHTML = '';

  const action = d.endAction || 'none';
  if (action === 'none') return;

  if (action === 'give_item' || action === 'remove_item') {
    container.innerHTML = `
      <label>${action === 'give_item' ? 'Item to Give' : 'Item to Remove'}</label>
      <select id="dialogue-action-item" class="rp-select">
        <option value="">-- Select item type --</option>
        ${assets.map(a => `<option value="${a.id}" ${(d.endActionParams.itemType === a.id) ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
    `;
    container.querySelector('#dialogue-action-item').addEventListener('change', e => {
      d.endActionParams.itemType = e.target.value;
      unsaved = true;
    });
  } else if (action === 'teleport') {
    container.innerHTML = `
      <label>Teleport To</label>
      <div class="rp-row">
        <div class="rp-field"><span>X</span><input type="number" id="dialogue-tp-x" value="${d.endActionParams.x || 0}"></div>
        <div class="rp-field"><span>Y</span><input type="number" id="dialogue-tp-y" value="${d.endActionParams.y || 0}"></div>
      </div>
    `;
    container.querySelector('#dialogue-tp-x').addEventListener('input', e => { d.endActionParams.x = parseFloat(e.target.value) || 0; unsaved = true; });
    container.querySelector('#dialogue-tp-y').addEventListener('input', e => { d.endActionParams.y = parseFloat(e.target.value) || 0; unsaved = true; });
  } else if (action === 'open_door') {
    const doors = models.filter(m => m.type.startsWith('door_'));
    container.innerHTML = `
      <label>Door/Model to Open</label>
      <select id="dialogue-action-door" class="rp-select">
        <option value="">-- Select --</option>
        ${doors.map(door => { const dd = MODEL_DEFS[door.type]; return `<option value="${door.id}" ${d.endActionParams.doorId === door.id ? 'selected' : ''}>${dd ? dd.name : door.type} @ (${Math.round(door.x)},${Math.round(door.y)})</option>`; }).join('')}
      </select>
    `;
    container.querySelector('#dialogue-action-door').addEventListener('change', e => { d.endActionParams.doorId = e.target.value; unsaved = true; });
  } else if (action === 'set_variable') {
    container.innerHTML = `
      <label>Variable</label>
      <div class="rp-row">
        <div class="rp-field"><span>Name</span><input type="text" id="dialogue-var-name" value="${d.endActionParams.varName || ''}"></div>
        <div class="rp-field"><span>Value</span><input type="text" id="dialogue-var-value" value="${d.endActionParams.varValue || ''}"></div>
      </div>
    `;
    container.querySelector('#dialogue-var-name').addEventListener('input', e => { d.endActionParams.varName = e.target.value; unsaved = true; });
    container.querySelector('#dialogue-var-value').addEventListener('input', e => { d.endActionParams.varValue = e.target.value; unsaved = true; });
  } else if (action === 'play_anim') {
    container.innerHTML = `
      <label>Animation to Play</label>
      <select id="dialogue-action-anim" class="rp-select">
        <option value="idle" ${d.endActionParams.anim === 'idle' ? 'selected' : ''}>Idle</option>
        <option value="dance" ${d.endActionParams.anim === 'dance' ? 'selected' : ''}>Dance</option>
        <option value="wave" ${d.endActionParams.anim === 'wave' ? 'selected' : ''}>Wave</option>
        <option value="jump" ${d.endActionParams.anim === 'jump' ? 'selected' : ''}>Jump</option>
        <option value="sit" ${d.endActionParams.anim === 'sit' ? 'selected' : ''}>Sit</option>
      </select>
    `;
    container.querySelector('#dialogue-action-anim').addEventListener('change', e => { d.endActionParams.anim = e.target.value; unsaved = true; });
  }
}

function renderDialogueConditionParams() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const d = initDialogueData(av);
  const container = document.getElementById('dialogue-condition-params');
  container.innerHTML = '';

  const ct = d.conditionType || 'has_item';
  if (ct === 'has_item' || ct === 'no_item') {
    container.innerHTML = `
      <label>Item Type</label>
      <select id="dialogue-cond-item" class="rp-select">
        <option value="">-- Select --</option>
        ${assets.map(a => `<option value="${a.id}" ${(d.conditionParams.itemType === a.id) ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
    `;
    container.querySelector('#dialogue-cond-item').addEventListener('change', e => { d.conditionParams.itemType = e.target.value; unsaved = true; });
  } else if (ct === 'variable_equals' || ct === 'variable_gt') {
    container.innerHTML = `
      <label>Variable Check</label>
      <div class="rp-row">
        <div class="rp-field"><span>Name</span><input type="text" id="dialogue-cond-var" value="${d.conditionParams.varName || ''}"></div>
        <div class="rp-field"><span>Value</span><input type="text" id="dialogue-cond-val" value="${d.conditionParams.varValue || ''}"></div>
      </div>
    `;
    container.querySelector('#dialogue-cond-var').addEventListener('input', e => { d.conditionParams.varName = e.target.value; unsaved = true; });
    container.querySelector('#dialogue-cond-val').addEventListener('input', e => { d.conditionParams.varValue = e.target.value; unsaved = true; });
  }
}

// Dialogue Preview
function showDialoguePreview() {
  if (selectedAvatar === null) return;
  const av = avatars[selectedAvatar];
  const d = initDialogueData(av);

  if (!d.lines || d.lines.length === 0) {
    alert('Add at least one dialogue line first!');
    return;
  }

  let currentLine = 0;
  let typingIndex = 0;
  let typingTimer = null;
  let isTyping = false;
  let showingChoices = false;

  const overlay = document.createElement('div');
  overlay.className = 'dialogue-preview-overlay';

  const box = document.createElement('div');
  box.className = 'dialogue-preview-box';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dialogue-preview-close';
  closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', closePreview);

  const nameEl = document.createElement('div');
  nameEl.className = 'dialogue-preview-name';

  const textEl = document.createElement('div');
  textEl.className = 'dialogue-preview-text';

  const indicatorEl = document.createElement('div');
  indicatorEl.className = 'dialogue-preview-indicator';

  const choicesEl = document.createElement('div');
  choicesEl.className = 'dialogue-preview-choices';
  choicesEl.style.display = 'none';

  box.appendChild(closeBtn);
  box.appendChild(nameEl);
  box.appendChild(textEl);
  box.appendChild(choicesEl);
  box.appendChild(indicatorEl);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function closePreview() {
    if (typingTimer) clearInterval(typingTimer);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function getSpeakerName(line) {
    const speaker = line.speaker || 'npc';
    if (speaker === 'npc') return d.npcName || 'NPC';
    if (speaker === 'player') return 'You';
    if (speaker === 'narrator') return 'Narrator';
    if (speaker === 'system') return 'System';
    return speaker;
  }

  function getSpeakerColor(line) {
    const speaker = line.speaker || 'npc';
    if (speaker === 'npc') return d.nameColor || '#a78bfa';
    if (speaker === 'player') return '#4ade80';
    if (speaker === 'narrator') return '#fbbf24';
    if (speaker === 'system') return '#ef4444';
    return '#888';
  }

  function showLine(idx) {
    if (idx >= d.lines.length) {
      if (d.hasChoices && d.choices && d.choices.length > 0) {
        showChoicesUI();
        return;
      }
      closePreview();
      return;
    }

    currentLine = idx;
    const line = d.lines[idx];
    const speakerName = getSpeakerName(line);
    const speakerColor = getSpeakerColor(line);
    const emotionMap = { neutral: '😐', happy: '😊', sad: '😢', angry: '😠', surprised: '😮', thinking: '🤔' };
    const emoticon = emotionMap[line.emotion || 'neutral'] || '😐';

    nameEl.innerHTML = `<span class="name-dot" style="background:${speakerColor}"></span><span style="color:${speakerColor}">${speakerName}</span><span style="font-size:14px">${emoticon}</span>`;
    textEl.innerHTML = '';
    choicesEl.style.display = 'none';
    showingChoices = false;

    indicatorEl.innerHTML = `
      <span class="line-counter">${idx + 1} / ${d.lines.length}</span>
      <span class="dialogue-preview-continue">Click to continue ▸</span>
    `;

    const text = line.text || '...';
    typingIndex = 0;
    isTyping = true;
    const speed = line.speed || d.typingSpeed || 30;

    if (typingTimer) clearInterval(typingTimer);
    typingTimer = setInterval(() => {
      if (typingIndex <= text.length) {
        textEl.innerHTML = text.substring(0, typingIndex) + '<span class="typewriter-cursor"></span>';
        typingIndex++;
      } else {
        clearInterval(typingTimer);
        typingTimer = null;
        isTyping = false;
        textEl.innerHTML = text;

        if (d.hasChoices && d.choices && d.choices.length > 0 && idx === (d.choiceAfterLine || 1) - 1) {
          setTimeout(() => showChoicesUI(), 300);
        }
      }
    }, speed);
  }

  function showChoicesUI() {
    showingChoices = true;
    choicesEl.style.display = 'flex';
    choicesEl.innerHTML = '';

    if (d.choicePrompt) {
      const promptEl = document.createElement('div');
      promptEl.style.cssText = 'font-size:12px;color:#888;margin-bottom:4px;font-style:italic';
      promptEl.textContent = d.choicePrompt;
      choicesEl.appendChild(promptEl);
    }

    d.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-preview-choice-btn';
      btn.innerHTML = `<span class="choice-key">${i + 1}</span>${choice.text || 'Choice ' + (i + 1)}`;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (choice.action === 'jump' && choice.jumpTo) {
          choicesEl.style.display = 'none';
          showingChoices = false;
          showLine((choice.jumpTo || 1) - 1);
        } else if (choice.action === 'end') {
          closePreview();
        } else {
          choicesEl.style.display = 'none';
          showingChoices = false;
          showLine(currentLine + 1);
        }
      });
      choicesEl.appendChild(btn);
    });

    indicatorEl.innerHTML = `<span class="line-counter">${currentLine + 1} / ${d.lines.length}</span><span style="color:#3b82f6;font-size:11px">Choose an option</span>`;
  }

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('.dialogue-preview-close') || e.target.closest('.dialogue-preview-choice-btn')) return;
    if (showingChoices) return;

    if (isTyping) {
      if (typingTimer) clearInterval(typingTimer);
      typingTimer = null;
      isTyping = false;
      const line = d.lines[currentLine];
      textEl.innerHTML = line.text || '...';

      if (d.hasChoices && d.choices && d.choices.length > 0 && currentLine === (d.choiceAfterLine || 1) - 1) {
        setTimeout(() => showChoicesUI(), 100);
      }
    } else {
      showLine(currentLine + 1);
    }
  });

  function onKey(e) {
    if (e.key === 'Escape') { closePreview(); }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (showingChoices) return;
      if (isTyping) {
        if (typingTimer) clearInterval(typingTimer);
        typingTimer = null;
        isTyping = false;
        const line = d.lines[currentLine];
        textEl.innerHTML = line.text || '...';
        if (d.hasChoices && d.choices && d.choices.length > 0 && currentLine === (d.choiceAfterLine || 1) - 1) {
          setTimeout(() => showChoicesUI(), 100);
        }
      } else {
        showLine(currentLine + 1);
      }
    }
    if (showingChoices && e.key >= '1' && e.key <= '9') {
      const ci = parseInt(e.key) - 1;
      if (d.choices[ci]) {
        const choiceBtns = choicesEl.querySelectorAll('.dialogue-preview-choice-btn');
        if (choiceBtns[ci]) choiceBtns[ci].click();
      }
    }
  }
  document.addEventListener('keydown', onKey);

  showLine(0);
}

// Dialogue UI event bindings
document.getElementById('dialogue-trigger-key').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).triggerKey = e.target.value;
  unsaved = true;
});

document.getElementById('dialogue-trigger-radius').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).triggerRadius = parseInt(e.target.value);
  document.getElementById('dialogue-trigger-radius-val').textContent = e.target.value;
  unsaved = true;
});

document.getElementById('dialogue-one-time').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).oneTime = e.target.checked;
  unsaved = true;
});

document.getElementById('dialogue-npc-name').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).npcName = e.target.value;
  unsaved = true;
});

document.getElementById('dialogue-name-color').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).nameColor = e.target.value;
  unsaved = true;
});

document.getElementById('btn-add-dialogue-line').addEventListener('click', () => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  if (!d.lines) d.lines = [];
  d.lines.push({ speaker: 'npc', text: '', emotion: 'neutral', effect: 'normal', speed: 30 });
  unsaved = true;
  renderDialogueLines();
});

document.getElementById('dialogue-has-choices').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  d.hasChoices = e.target.checked;
  document.getElementById('dialogue-choices-section').style.display = e.target.checked ? 'block' : 'none';
  unsaved = true;
});

document.getElementById('dialogue-choice-after').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).choiceAfterLine = parseInt(e.target.value) || 1;
  unsaved = true;
});

document.getElementById('dialogue-choice-prompt').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).choicePrompt = e.target.value;
  unsaved = true;
});

document.getElementById('btn-add-dialogue-choice').addEventListener('click', () => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  if (!d.choices) d.choices = [];
  d.choices.push({ text: '', action: 'continue', jumpTo: 1 });
  unsaved = true;
  renderDialogueChoices();
});

document.getElementById('dialogue-end-action').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  d.endAction = e.target.value;
  d.endActionParams = {};
  unsaved = true;
  renderDialogueActionParams();
});

document.getElementById('dialogue-has-condition').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  d.hasCondition = e.target.checked;
  document.getElementById('dialogue-condition-section').style.display = e.target.checked ? 'block' : 'none';
  unsaved = true;
});

document.getElementById('dialogue-condition-type').addEventListener('change', e => {
  if (selectedAvatar === null) return;
  const d = initDialogueData(avatars[selectedAvatar]);
  d.conditionType = e.target.value;
  d.conditionParams = {};
  unsaved = true;
  renderDialogueConditionParams();
});

document.getElementById('dialogue-condition-fail-text').addEventListener('input', e => {
  if (selectedAvatar === null) return;
  initDialogueData(avatars[selectedAvatar]).conditionFailText = e.target.value;
  unsaved = true;
});

document.getElementById('btn-preview-dialogue').addEventListener('click', showDialoguePreview);

// ==================== ASSET STORE ====================

function renderAssetStore(filter) {
  filter = filter || 'all';
  const list = document.getElementById('asset-list'); list.innerHTML = '';

  const filteredItems = filter === 'all' ? assets : filter === 'model' || filter === 'avatar' ? [] : assets.filter(a => a.category === filter);
  filteredItems.forEach(asset => {
    const el = document.createElement('div'); el.className = 'asset-item';
    el.innerHTML = `<span class="asset-icon">${getItemSVG(asset.id)}</span><div class="asset-info"><h4>${asset.name}</h4><p>${asset.description}</p></div><button class="asset-add">+ Add</button>`;
    el.querySelector('.asset-add').addEventListener('click', e => {
      e.stopPropagation();
      items.push({ id:'item_'+Date.now()+'_'+Math.random().toString(36).substr(2,3), type:asset.id, x:Math.round(camera.x), y:Math.round(camera.y), giveOnStart:false, collectOnTouch:true, properties:{...asset.defaults} });
      unsaved = true; updateExplorer();
    });
    list.appendChild(el);
  });

  const filteredModels = filter === 'all' || filter === 'model' ? Object.values(MODEL_DEFS) : [];
  if (filteredModels.length > 0 && filter !== 'model') {
    const sep = document.createElement('div'); sep.style.cssText = 'padding:8px 12px;color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #222;margin-top:4px;'; sep.textContent = 'Models'; list.appendChild(sep);
  }
  filteredModels.forEach(md => {
    const el = document.createElement('div'); el.className = 'asset-item'; el.style.borderLeft = '3px solid #F59E0B';
    el.innerHTML = `<span class="asset-icon" style="color:#F59E0B">${getModelSVG(md.id)}</span><div class="asset-info"><h4>${md.name}</h4><p>${md.description}</p></div><button class="asset-add" style="background:rgba(245,158,11,0.15);border-color:#F59E0B;color:#F59E0B">+ Place</button>`;
    el.querySelector('.asset-add').addEventListener('click', e => {
      e.stopPropagation();
      const dw = md.id==='lever'?30:md.id==='keycard'?30:40; const dh = md.id==='lever'?40:md.id==='keycard'?20:80;
      models.push({ id:'model_'+Date.now()+'_'+Math.random().toString(36).substr(2,3), type:md.id, x:Math.round(camera.x), y:Math.round(camera.y), w:dw, h:dh, properties:{...md.defaults} });
      unsaved = true; updateExplorer();
    });
    list.appendChild(el);
  });

  if (filter === 'all' || filter === 'avatar') {
    if (filter === 'all') {
      const sep = document.createElement('div'); sep.style.cssText = 'padding:8px 12px;color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #222;margin-top:4px;'; sep.textContent = 'Avatar'; list.appendChild(sep);
    }
    [{id:'npc',name:'NPC Avatar',desc:'Non-player character with animations'},{id:'player_spawn',name:'Player Avatar Marker',desc:'Shows player\'s own avatar at this position'}].forEach(at => {
      const el = document.createElement('div'); el.className = 'asset-item'; el.style.borderLeft = '3px solid #a78bfa';
      el.innerHTML = `<span class="asset-icon" style="color:#a78bfa"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0114 0"/></svg></span><div class="asset-info"><h4>${at.name}</h4><p>${at.desc}</p></div><button class="asset-add" style="background:rgba(167,139,250,0.15);border-color:#a78bfa;color:#a78bfa">+ Place</button>`;
      el.querySelector('.asset-add').addEventListener('click', e => {
        e.stopPropagation();
        const nav = { id:'avatar_'+Date.now()+'_'+Math.random().toString(36).substr(2,3), x:Math.round(camera.x), y:Math.round(camera.y), w:22, h:34, direction:1, defaultAnim:'idle', animSpeed:1, loop:true, interactive:false, usePlayerAvatar:at.id==='player_spawn', bodyColor:'#ffffff', headColor:'#ffffff', eyeColor:'#000000', keyframes:[], properties:{} };
        avatars.push(nav); unsaved = true; updateExplorer();
      });
      list.appendChild(el);
    });
  }
}

document.getElementById('btn-items-panel').addEventListener('click', toggleItemsPanel);
document.getElementById('items-panel-close').addEventListener('click', () => { document.getElementById('items-panel').style.display = 'none'; });
function toggleItemsPanel() { const p = document.getElementById('items-panel'); if (p.style.display === 'none') { p.style.display = 'block'; renderAssetStore(); } else { p.style.display = 'none'; } }
document.querySelectorAll('.filter-btn').forEach(b => { b.addEventListener('click', () => { document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); renderAssetStore(b.dataset.cat); }); });

// ==================== SETTINGS ====================

document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('set-title').value = gameData.title || '';
  document.getElementById('set-desc').value = gameData.description || '';
  document.getElementById('set-bg').value = settings.bgColor || '#0a0a0a';
  document.getElementById('set-gravity').value = settings.gravity || 0.6;
  document.getElementById('set-speed').value = settings.playerSpeed || 4;
  document.getElementById('set-jump').value = settings.jumpForce || -12;
  document.getElementById('set-world-w').value = settings.worldWidth || 2400;
  document.getElementById('set-world-h').value = settings.worldHeight || 600;
  document.getElementById('set-fog-enabled').checked = settings.fogEnabled || false;
  document.getElementById('fog-settings').style.display = settings.fogEnabled ? 'block' : 'none';
  document.getElementById('set-fog-color').value = settings.fogColor || '#000000';
  document.getElementById('set-fog-color-text').value = settings.fogColor || '#000000';
  document.getElementById('set-fog-density').value = settings.fogDensity || 0.5;
  document.getElementById('set-fog-density-val').textContent = (settings.fogDensity || 0.5).toFixed(2);
  document.getElementById('set-fog-start').value = settings.fogStart || 100;
  document.getElementById('set-fog-start-val').textContent = settings.fogStart || 100;
  document.getElementById('set-fog-end').value = settings.fogEnd || 400;
  document.getElementById('set-fog-end-val').textContent = settings.fogEnd || 400;
  document.getElementById('set-darkness').checked = settings.darknessEnabled || false;
  document.getElementById('darkness-settings').style.display = settings.darknessEnabled ? 'block' : 'none';
  document.getElementById('set-ambient').value = settings.ambientLight || 0.02;
  document.getElementById('set-ambient-val').textContent = (settings.ambientLight || 0.02).toFixed(2);
  document.getElementById('set-fl-radius').value = settings.flashlightRadius || 220;
  document.getElementById('set-fl-bright').value = settings.flashlightBrightness || 1.2;
  document.getElementById('set-fl-spread').value = settings.flashlightSpread || 0.45;
  document.getElementById('set-fl-spread-val').textContent = (settings.flashlightSpread || 0.45).toFixed(2);
  document.getElementById('set-bat-max').value = settings.batteryMax || 100;
  document.getElementById('set-bat-drain').value = settings.batteryDrain || 0.8;
  document.getElementById('set-bat-regen').value = settings.batteryRegen || 0.3;
  document.getElementById('set-flicker').value = settings.flickerChance || 0.003;
  document.getElementById('set-flicker-val').textContent = (settings.flickerChance || 0.003).toFixed(3);
  document.getElementById('set-particles').checked = settings.particles || false;
  document.getElementById('set-breathing').checked = settings.breathing || false;
  document.getElementById('set-footstep').checked = settings.footstepShake || false;
  document.getElementById('set-vignette').checked = settings.vignette || false;
  document.getElementById('vignette-settings').style.display = settings.vignette ? 'block' : 'none';
  document.getElementById('set-vignette-intensity').value = settings.vignetteIntensity || 0.3;
  document.getElementById('set-vignette-val').textContent = (settings.vignetteIntensity || 0.3).toFixed(2);
  document.getElementById('set-vignette-color').value = settings.vignetteColor || '#000000';
  document.getElementById('set-tint-enabled').checked = settings.tintEnabled || false;
  document.getElementById('tint-settings').style.display = settings.tintEnabled ? 'block' : 'none';
  document.getElementById('set-tint-color').value = settings.tintColor || '#000000';
  document.getElementById('set-tint-opacity').value = settings.tintOpacity || 0.1;
  document.getElementById('set-tint-opacity-val').textContent = (settings.tintOpacity || 0.1).toFixed(2);
  document.getElementById('settings-modal').style.display = 'flex';
});

document.getElementById('set-fog-enabled').addEventListener('change', e => { document.getElementById('fog-settings').style.display = e.target.checked ? 'block' : 'none'; });
document.getElementById('set-darkness').addEventListener('change', e => { document.getElementById('darkness-settings').style.display = e.target.checked ? 'block' : 'none'; });
document.getElementById('set-vignette').addEventListener('change', e => { document.getElementById('vignette-settings').style.display = e.target.checked ? 'block' : 'none'; });
document.getElementById('set-tint-enabled').addEventListener('change', e => { document.getElementById('tint-settings').style.display = e.target.checked ? 'block' : 'none'; });

['set-fog-density','set-fog-start','set-fog-end','set-ambient','set-fl-spread','set-flicker','set-vignette-intensity','set-tint-opacity'].forEach(id => {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('input', () => { const v = document.getElementById(id+'-val'); if (v) v.textContent = parseFloat(el.value).toFixed(id==='set-fog-start'||id==='set-fog-end'?0:id==='set-flicker'?3:2); });
});

document.getElementById('set-fog-color').addEventListener('input', e => { document.getElementById('set-fog-color-text').value = e.target.value; });
document.getElementById('set-fog-color-text').addEventListener('input', e => { if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)) document.getElementById('set-fog-color').value = e.target.value; });
document.getElementById('btn-settings-cancel').addEventListener('click', () => { document.getElementById('settings-modal').style.display = 'none'; });

document.getElementById('btn-settings-save').addEventListener('click', () => {
  gameData.title = document.getElementById('set-title').value || 'Untitled';
  gameData.description = document.getElementById('set-desc').value || '';
  settings.bgColor = document.getElementById('set-bg').value;
  settings.gravity = parseFloat(document.getElementById('set-gravity').value) || 0.6;
  settings.playerSpeed = parseFloat(document.getElementById('set-speed').value) || 4;
  settings.jumpForce = parseFloat(document.getElementById('set-jump').value) || -12;
  settings.worldWidth = parseInt(document.getElementById('set-world-w').value) || 2400;
  settings.worldHeight = parseInt(document.getElementById('set-world-h').value) || 600;
  settings.fogEnabled = document.getElementById('set-fog-enabled').checked;
  settings.fogColor = document.getElementById('set-fog-color').value;
  settings.fogDensity = parseFloat(document.getElementById('set-fog-density').value);
  settings.fogStart = parseFloat(document.getElementById('set-fog-start').value);
  settings.fogEnd = parseFloat(document.getElementById('set-fog-end').value);
  settings.darknessEnabled = document.getElementById('set-darkness').checked;
  settings.ambientLight = parseFloat(document.getElementById('set-ambient').value);
  settings.flashlightRadius = parseFloat(document.getElementById('set-fl-radius').value);
  settings.flashlightBrightness = parseFloat(document.getElementById('set-fl-bright').value);
  settings.flashlightSpread = parseFloat(document.getElementById('set-fl-spread').value);
  settings.batteryMax = parseFloat(document.getElementById('set-bat-max').value);
  settings.batteryDrain = parseFloat(document.getElementById('set-bat-drain').value);
  settings.batteryRegen = parseFloat(document.getElementById('set-bat-regen').value);
  settings.flickerChance = parseFloat(document.getElementById('set-flicker').value);
  settings.particles = document.getElementById('set-particles').checked;
  settings.breathing = document.getElementById('set-breathing').checked;
  settings.footstepShake = document.getElementById('set-footstep').checked;
  settings.vignette = document.getElementById('set-vignette').checked;
  settings.vignetteIntensity = parseFloat(document.getElementById('set-vignette-intensity').value);
  settings.vignetteColor = document.getElementById('set-vignette-color').value;
  settings.tintEnabled = document.getElementById('set-tint-enabled').checked;
  settings.tintColor = document.getElementById('set-tint-color').value;
  settings.tintOpacity = parseFloat(document.getElementById('set-tint-opacity').value);
  document.getElementById('topbar-title').textContent = gameData.title;
  document.getElementById('settings-modal').style.display = 'none';
  unsaved = true;
});

// ==================== PUBLISH ====================

document.getElementById('btn-publish').addEventListener('click', openPublish);

function openPublish() {
  const pub = gameData.published;
  document.getElementById('publish-modal-title').textContent = pub ? 'Update TuGame' : 'Publish TuGame';
  document.getElementById('btn-pub-confirm').textContent = pub ? 'Update' : 'Publish';
  document.getElementById('pub-title').value = gameData.title || '';
  document.getElementById('pub-desc').value = gameData.description || '';
  pubVisibility = gameData.status || 'public'; pubThumbData = gameData.thumbnailData || '';
  document.querySelectorAll('.pub-vis-btn').forEach(b => b.classList.toggle('active', b.dataset.vis === pubVisibility));
  generateThumb();
  document.getElementById('publish-modal').style.display = 'flex';
}

document.querySelectorAll('.pub-vis-btn').forEach(b => { b.addEventListener('click', () => { pubVisibility = b.dataset.vis; document.querySelectorAll('.pub-vis-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); }); });
document.getElementById('pub-thumb-auto').addEventListener('click', generateThumb);

document.getElementById('pub-thumb-upload').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { pubThumbData = ev.target.result; const img = new Image(); img.onload = () => { const c = document.getElementById('pub-thumb-preview').getContext('2d'); c.clearRect(0,0,360,200); c.drawImage(img,0,0,360,200); }; img.src = pubThumbData; };
  reader.readAsDataURL(file);
});

function generateThumb() {
  const c = document.getElementById('pub-thumb-preview'); const cx = c.getContext('2d');
  cx.fillStyle = settings.bgColor || '#0a0a0a'; cx.fillRect(0,0,360,200);
  const sc = Math.min(360/(settings.worldWidth||2400),200/(settings.worldHeight||600))*0.8;
  const ox = (360-(settings.worldWidth||2400)*sc)/2, oy = (200-(settings.worldHeight||600)*sc)/2;
  blocks.forEach(b => { cx.fillStyle = b.color||'#333'; cx.globalAlpha = b.opacity||1; cx.fillRect(ox+b.x*sc,oy+b.y*sc,b.w*sc,b.h*sc); cx.globalAlpha = 1; });
  models.forEach(m => { cx.fillStyle = m.type.startsWith('door_')?'#8B4513':m.type==='lever'?'#CC3333':'#F59E0B'; cx.fillRect(ox+m.x*sc,oy+m.y*sc,(m.w||40)*sc,(m.h||80)*sc); });
  const ic = {sword:'#CCC',flashlight:'#FFE066',shield:'#4488CC',speed_boost:'#FFD700',jump_boost:'#44CC44',coin:'#FFD700',heart:'#EF4444',key:'#DAA520',battery:'#44EE44',note:'#CCBB88'};
  items.forEach(it => { cx.fillStyle = ic[it.type]||'#888'; cx.beginPath(); cx.arc(ox+it.x*sc,oy+it.y*sc,3,0,Math.PI*2); cx.fill(); });
  avatars.forEach(av => { cx.fillStyle = av.usePlayerAvatar?'#4ade80':'#a78bfa'; cx.beginPath(); cx.arc(ox+av.x*sc,oy+av.y*sc,4,0,Math.PI*2); cx.fill(); });
  cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(0,0,360,200);
  cx.font = '900 22px Inter'; cx.fillStyle = '#fff'; cx.textAlign = 'center';
  cx.fillText((gameData.title||'UNTITLED').toUpperCase(), 180, 95);
  cx.font = '500 10px Inter'; cx.fillStyle = '#666'; cx.fillText('Tublox Studio', 180, 115);
  pubThumbData = c.toDataURL('image/jpeg', 0.7);
}

document.getElementById('btn-pub-cancel').addEventListener('click', () => { document.getElementById('publish-modal').style.display = 'none'; });

document.getElementById('btn-pub-confirm').addEventListener('click', async () => {
  const title = document.getElementById('pub-title').value || gameData.title;
  const desc = document.getElementById('pub-desc').value || '';
  gameData.title = title; gameData.description = desc;
  await saveGame();
  try {
    const r = await fetch(`/api/studio/publish/${gameId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:pubVisibility,title,description:desc,thumbnailData:pubThumbData}) });
    const d2 = await r.json();
    if (d2.success) { gameData.published = true; gameData.status = pubVisibility; document.getElementById('publish-modal').style.display = 'none'; showSaved(); const l = document.getElementById('publish-btn-label'); if (l) l.textContent = 'Update'; }
  } catch (e) { console.error('[Publish]', e); }
});

// ==================== MOBILE MENU ====================

document.getElementById('mob-save')?.addEventListener('click', saveGame);
document.getElementById('mob-menu')?.addEventListener('click', () => { document.getElementById('mob-menu-overlay').style.display = 'flex'; });
document.getElementById('mob-settings')?.addEventListener('click', () => { document.getElementById('mob-menu-overlay').style.display = 'none'; document.getElementById('btn-settings').click(); });
document.getElementById('mob-items')?.addEventListener('click', () => { document.getElementById('mob-menu-overlay').style.display = 'none'; toggleItemsPanel(); });
document.getElementById('mob-publish')?.addEventListener('click', () => { document.getElementById('mob-menu-overlay').style.display = 'none'; openPublish(); });
document.getElementById('mob-back')?.addEventListener('click', () => { if (unsaved && !confirm('Unsaved changes. Leave?')) return; window.location.href = '/studio'; });
document.getElementById('mob-menu-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'mob-menu-overlay') e.target.style.display = 'none'; });

// ==================== NAV ====================

document.getElementById('btn-back').addEventListener('click', () => { if (unsaved && !confirm('Unsaved changes. Leave?')) return; window.location.href = '/studio'; });
document.getElementById('btn-save').addEventListener('click', saveGame);
function closeAllModals() { ['settings-modal','publish-modal','mob-menu-overlay'].forEach(id => { document.getElementById(id).style.display = 'none'; }); }

// ==================== INIT ====================

async function init() {
  await loadAssets();
  await loadGame();
  renderAssetStore();
  requestAnimationFrame(render);
}

init();
})();