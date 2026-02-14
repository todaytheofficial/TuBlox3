(function(){
'use strict';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
if (!gameId) { window.location.href = '/studio'; return; }

const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window);

let gameData = null, blocks = [], items = [], models = [], settings = {}, assets = [];
let selectedBlock = null, selectedItem = null, selectedModel = null, currentTool = 'select';
let camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false, isPanning = false, isScaling = false, scaleHandle = '';
let dragStart = { x: 0, y: 0 }, dragObjStart = { x: 0, y: 0, w: 0, h: 0 };
let newBlockStart = null, unsaved = false;
let pubVisibility = 'public', pubThumbData = '';

// ==================== MODEL DEFINITIONS ====================

const MODEL_DEFS = {
  door_key: {
    id: 'door_key',
    name: 'Key Door',
    description: 'Opens with a Key item',
    category: 'model',
    icon: 'door',
    defaults: { keyId: '', color: '#8B4513', openSpeed: 2, direction: 'up' }
  },
  door_keycard: {
    id: 'door_keycard',
    name: 'Keycard Door',
    description: 'Opens with a Keycard',
    category: 'model',
    icon: 'door_keycard',
    defaults: { keycardColor: 'red', openSpeed: 2, direction: 'up' }
  },
  door_lever: {
    id: 'door_lever',
    name: 'Lever Door',
    description: 'Opens when linked Lever is activated',
    category: 'model',
    icon: 'door_lever',
    defaults: { leverId: '', color: '#555555', openSpeed: 2, direction: 'up' }
  },
  lever: {
    id: 'lever',
    name: 'Lever',
    description: 'Activates linked doors or mechanisms',
    category: 'model',
    icon: 'lever',
    defaults: { targetId: '', oneTime: false }
  },
  keycard: {
    id: 'keycard',
    name: 'Keycard',
    description: 'Collect to open keycard doors',
    category: 'model',
    icon: 'keycard',
    defaults: { cardColor: 'red' }
  }
};

// ==================== ITEM VISUALS ====================

const ITEM_VISUALS = {
  sword: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 3) * 2);
      ctx.rotate(-30 * Math.PI / 180);
      const s = size / 40;
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(-2*s, -4*s, 4*s, 8*s);
      ctx.fillStyle = '#CCAA00';
      ctx.fillRect(-6*s, 4*s, 12*s, 3*s);
      ctx.fillStyle = '#CCC';
      ctx.fillRect(-1.5*s, 7*s, 3*s, 18*s);
      ctx.fillStyle = '#EEE';
      ctx.fillRect(-1.5*s, 7*s, 1*s, 18*s);
      ctx.fillStyle = '#DDD';
      ctx.beginPath();
      ctx.moveTo(-1.5*s, 25*s);
      ctx.lineTo(1.5*s, 25*s);
      ctx.lineTo(0, 28*s);
      ctx.fill();
      ctx.restore();
    }
  },
  flashlight: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 2.5) * 2);
      const s = size / 40;
      ctx.fillStyle = '#555';
      ctx.fillRect(-4*s, -8*s, 8*s, 16*s);
      ctx.fillStyle = '#FFE066';
      ctx.fillRect(-5*s, -10*s, 10*s, 3*s);
      ctx.fillStyle = 'rgba(255,224,102,0.15)';
      ctx.beginPath();
      ctx.moveTo(-5*s, -10*s);
      ctx.lineTo(-15*s, -30*s);
      ctx.lineTo(15*s, -30*s);
      ctx.lineTo(5*s, -10*s);
      ctx.fill();
      ctx.restore();
    }
  },
  shield: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 2) * 2);
      const s = size / 40;
      ctx.fillStyle = '#4488CC';
      ctx.beginPath();
      ctx.moveTo(0, -12*s);
      ctx.lineTo(10*s, -6*s);
      ctx.lineTo(10*s, 4*s);
      ctx.lineTo(0, 12*s);
      ctx.lineTo(-10*s, 4*s);
      ctx.lineTo(-10*s, -6*s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#66AAEE';
      ctx.lineWidth = 1.5*s;
      ctx.stroke();
      ctx.fillStyle = '#66AAEE';
      ctx.beginPath();
      ctx.arc(0, 0, 4*s, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  speed_boost: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 4) * 2);
      const s = size / 40;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(2*s, -12*s);
      ctx.lineTo(-4*s, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2*s, 12*s);
      ctx.lineTo(6*s, 0);
      ctx.lineTo(2*s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, 14*s, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  jump_boost: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 3) * 3);
      const s = size / 40;
      ctx.fillStyle = '#44CC44';
      ctx.fillRect(-6*s, 4*s, 12*s, 4*s);
      ctx.strokeStyle = '#44CC44';
      ctx.lineWidth = 2*s;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const yy = (4 - i*4)*s;
        ctx.moveTo(-4*s, yy);
        ctx.lineTo(4*s, yy - 2*s);
        ctx.moveTo(4*s, yy - 2*s);
        ctx.lineTo(-4*s, yy - 4*s);
      }
      ctx.stroke();
      ctx.fillStyle = '#66EE66';
      ctx.beginPath();
      ctx.moveTo(0, -14*s);
      ctx.lineTo(5*s, -8*s);
      ctx.lineTo(-5*s, -8*s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },
  coin: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 3) * 2);
      const s = size / 40;
      const scaleX = Math.abs(Math.cos(time * 2));
      ctx.scale(scaleX || 0.1, 1);
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, 8*s, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 1.5*s;
      ctx.stroke();
      ctx.fillStyle = '#DAA520';
      ctx.font = `bold ${8*s}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    }
  },
  heart: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 2) * 2);
      const s = size / 40;
      const pulse = 1 + Math.sin(time * 4) * 0.1;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(0, 4*s);
      ctx.bezierCurveTo(-8*s, -2*s, -10*s, -8*s, -5*s, -10*s);
      ctx.bezierCurveTo(-2*s, -12*s, 0, -9*s, 0, -7*s);
      ctx.bezierCurveTo(0, -9*s, 2*s, -12*s, 5*s, -10*s);
      ctx.bezierCurveTo(10*s, -8*s, 8*s, -2*s, 0, 4*s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-3*s, -7*s, 2*s, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  key: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 2) * 2);
      ctx.rotate(Math.sin(time * 1.5) * 0.2);
      const s = size / 40;
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 2*s;
      ctx.beginPath();
      ctx.arc(0, -6*s, 5*s, 0, Math.PI*2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(218,165,32,0.3)';
      ctx.fill();
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(-1*s, -1*s, 2*s, 14*s);
      ctx.fillRect(1*s, 9*s, 4*s, 2*s);
      ctx.fillRect(1*s, 5*s, 3*s, 2*s);
      ctx.restore();
    }
  },
  battery: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 3) * 2);
      const s = size / 40;
      const glow = 0.3 + Math.sin(time * 4) * 0.15;
      ctx.fillStyle = `rgba(68,238,68,${glow})`;
      ctx.beginPath();
      ctx.arc(0, 0, 14*s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.fillRect(-4*s, -7*s, 8*s, 14*s);
      ctx.fillStyle = '#555';
      ctx.fillRect(-2*s, -9*s, 4*s, 3*s);
      ctx.fillStyle = '#44EE44';
      ctx.fillRect(-2*s, -4*s, 4*s, 8*s);
      const chargeH = 8 * s * (0.5 + Math.sin(time * 2) * 0.3);
      ctx.fillStyle = '#66FF66';
      ctx.fillRect(-2*s, -4*s + (8*s - chargeH), 4*s, chargeH);
      ctx.restore();
    }
  },
  note: {
    drawCanvas: function(ctx, x, y, size, time) {
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 1.5) * 1.5);
      const s = size / 40;
      const glow = 0.2 + Math.sin(time * 3) * 0.1;
      ctx.fillStyle = `rgba(204,187,136,${glow})`;
      ctx.beginPath();
      ctx.arc(0, 0, 12*s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#CCBB88';
      ctx.fillRect(-6*s, -8*s, 12*s, 16*s);
      ctx.fillStyle = '#AA9966';
      ctx.fillRect(-4*s, -5*s, 8*s, 1*s);
      ctx.fillRect(-4*s, -2*s, 6*s, 1*s);
      ctx.fillRect(-4*s, 1*s, 7*s, 1*s);
      ctx.fillRect(-4*s, 4*s, 5*s, 1*s);
      ctx.restore();
    }
  }
};

// ==================== MODEL VISUALS ====================

const MODEL_VISUALS = {
  door_key: {
    drawCanvas: function(ctx, x, y, w, h, time, props) {
      ctx.save();
      const color = (props && props.color) || '#8B4513';
      // Door frame
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      // Door body
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      // Wood grain
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < h; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + 2, y + i);
        ctx.lineTo(x + w - 2, y + i);
        ctx.stroke();
      }
      // Keyhole
      ctx.fillStyle = '#DAA520';
      ctx.beginPath();
      ctx.arc(x + w - 10, y + h / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w - 12, y + h / 2, 4, 8);
      // Lock icon
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x + w - 10, y + h / 2, 2, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = '#FFD700';
      ctx.font = `${Math.min(10, w/5)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('🔑', x + w/2, y - 6);
      ctx.restore();
    }
  },
  door_keycard: {
    drawCanvas: function(ctx, x, y, w, h, time, props) {
      ctx.save();
      const cardColor = (props && props.keycardColor) || 'red';
      const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
      const c = colors[cardColor] || colors.red;
      // Door frame
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      // Door body - metallic
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, '#444');
      grad.addColorStop(0.5, '#666');
      grad.addColorStop(1, '#444');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      // Card reader
      ctx.fillStyle = '#222';
      ctx.fillRect(x + w - 18, y + h/2 - 15, 14, 30);
      // Card slot
      ctx.fillStyle = c;
      ctx.fillRect(x + w - 16, y + h/2 - 8, 10, 4);
      // Blinking light
      const blink = Math.sin(time * 3) > 0;
      ctx.fillStyle = blink ? c : '#333';
      ctx.beginPath();
      ctx.arc(x + w - 11, y + h/2 + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      // Stripe color indicator
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 4, h);
      ctx.fillRect(x + w - 4, y, 4, h);
      // Label
      ctx.fillStyle = c;
      ctx.font = `${Math.min(10, w/5)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('💳', x + w/2, y - 6);
      ctx.restore();
    }
  },
  door_lever: {
    drawCanvas: function(ctx, x, y, w, h, time, props) {
      ctx.save();
      const color = (props && props.color) || '#555555';
      // Door frame
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      // Door body
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      // Mechanical look - rivets
      ctx.fillStyle = '#888';
      const rivetPositions = [
        [x + 5, y + 5], [x + w - 5, y + 5],
        [x + 5, y + h - 5], [x + w - 5, y + h - 5]
      ];
      rivetPositions.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      // Gear icon in center
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w/2, y + h/2, 8, 0, Math.PI * 2);
      ctx.stroke();
      // Gear teeth
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(x + w/2 + Math.cos(a + time) * 8, y + h/2 + Math.sin(a + time) * 8);
        ctx.lineTo(x + w/2 + Math.cos(a + time) * 12, y + h/2 + Math.sin(a + time) * 12);
        ctx.stroke();
      }
      // Label
      ctx.fillStyle = '#AAA';
      ctx.font = `${Math.min(10, w/5)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('⚙', x + w/2, y - 6);
      ctx.restore();
    }
  },
  lever: {
    drawCanvas: function(ctx, x, y, w, h, time, props) {
      ctx.save();
      // Base
      ctx.fillStyle = '#444';
      ctx.fillRect(x, y + h - 10, w, 10);
      // Lever arm
      const angle = Math.sin(time * 0.5) * 0.3 - 0.5;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + w/2, y + h - 10);
      ctx.lineTo(
        x + w/2 + Math.sin(angle) * (h - 15),
        y + h - 10 - Math.cos(angle) * (h - 15)
      );
      ctx.stroke();
      // Lever handle
      ctx.fillStyle = '#CC3333';
      ctx.beginPath();
      ctx.arc(
        x + w/2 + Math.sin(angle) * (h - 15),
        y + h - 10 - Math.cos(angle) * (h - 15),
        5, 0, Math.PI * 2
      );
      ctx.fill();
      // Base mount
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(x + w/2, y + h - 10, 6, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = '#CC3333';
      ctx.font = `${Math.min(9, w/4)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('LEVER', x + w/2, y - 4);
      ctx.restore();
    }
  },
  keycard: {
    drawCanvas: function(ctx, x, y, w, h, time, props) {
      ctx.save();
      const cardColor = (props && props.cardColor) || 'red';
      const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
      const c = colors[cardColor] || colors.red;
      ctx.translate(x + w/2, y + h/2);
      // Float animation
      const floatY = Math.sin(time * 2) * 3;
      const rotZ = Math.sin(time * 1.5) * 0.1;
      ctx.translate(0, floatY);
      ctx.rotate(rotZ);
      // Card shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-w/2 + 2, -h/2 + 2, w, h);
      // Card body
      ctx.fillStyle = c;
      ctx.fillRect(-w/2, -h/2, w, h);
      // Card stripe
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-w/2, -h/2 + h * 0.3, w, h * 0.15);
      // Card chip
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(-w/2 + 5, -h/2 + 4, 8, 6);
      // Glow
      ctx.fillStyle = `rgba(${c === '#EF4444' ? '239,68,68' : c === '#3B82F6' ? '59,130,246' : c === '#22C55E' ? '34,197,94' : '234,179,8'},0.15)`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(w, h) * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
};

// Добавь в начало studio-editor.js (после MODEL_VISUALS или перед ним)
function lightenHex(hex, amount) {
  hex = hex.replace('#', '');
  let r = Math.min(255, parseInt(hex.substring(0,2),16) + amount);
  let g = Math.min(255, parseInt(hex.substring(2,4),16) + amount);
  let b = Math.min(255, parseInt(hex.substring(4,6),16) + amount);
  return `rgb(${r},${g},${b})`;
}
function darkenHex(hex, amount) {
  hex = hex.replace('#', '');
  let r = Math.max(0, parseInt(hex.substring(0,2),16) - amount);
  let g = Math.max(0, parseInt(hex.substring(2,4),16) - amount);
  let b = Math.max(0, parseInt(hex.substring(4,6),16) - amount);
  return `rgb(${r},${g},${b})`;
}

const ITEM_SVG_ICONS = {
  sword: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="2" x2="8" y2="18"/><line x1="14" y1="6" x2="18" y2="2"/><path d="M4 20l4-4"/><path d="M6 16l4 4"/></svg>`,
  flashlight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>`,
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  speed_boost: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  jump_boost: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>`,
  coin: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M15 9.5c-.64-.89-1.64-1.5-3-1.5s-3 .9-3 2.5 1.5 2 3 2.5 3 1 3 2.5-1.36 2.5-3 2.5-2.36-.61-3-1.5"/></svg>`,
  heart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  key: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  battery: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="7" width="12" height="14" rx="1"/><line x1="10" y1="7" x2="10" y2="4"/><line x1="14" y1="7" x2="14" y2="4"/><line x1="6" y1="13" x2="18" y2="13"/><rect x="8" y="14" width="8" height="5" fill="currentColor" opacity="0.3"/></svg>`,
  note: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`
};

const MODEL_SVG_ICONS = {
  door: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="15" cy="12" r="1.5"/><path d="M4 2h16v20H4z" fill="none"/><line x1="4" y1="22" x2="20" y2="22"/></svg>`,
  door_keycard: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><rect x="14" y="8" width="4" height="8" rx="0.5"/><circle cx="16" cy="14" r="1"/><line x1="4" y1="22" x2="20" y2="22"/></svg>`,
  door_lever: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="12" cy="12" r="3"/><path d="M12 9V5"/><line x1="4" y1="22" x2="20" y2="22"/></svg>`,
  lever: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="18" width="12" height="4" rx="1"/><circle cx="12" cy="18" r="2"/><line x1="12" y1="18" x2="8" y2="6"/><circle cx="8" cy="5" r="2.5" fill="currentColor" opacity="0.3"/></svg>`,
  keycard: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><rect x="5" y="9" width="4" height="3" rx="0.5"/><line x1="3" y1="13" x2="21" y2="13"/></svg>`
};

function getItemVisual(type) {
  return ITEM_VISUALS[type] || null;
}

function getModelVisual(type) {
  return MODEL_VISUALS[type] || null;
}

function getItemSVG(type) {
  return ITEM_SVG_ICONS[type] || `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

function getModelSVG(type) {
  const def = MODEL_DEFS[type];
  const iconKey = def ? def.icon : type;
  return MODEL_SVG_ICONS[iconKey] || MODEL_SVG_ICONS.door;
}

// ==================== RESIZE ====================

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - (isMobile ? 104 : 48);
}
resize();
window.addEventListener('resize', resize);

// ==================== LOAD ====================

async function loadGame() {
  try {
    const r = await fetch(`/api/studio/game/${gameId}`);
    if (!r.ok) { window.location.href = '/studio'; return; }
    gameData = await r.json();
    blocks = gameData.blocks || [];
    items = gameData.items || [];
    models = gameData.models || [];
    settings = gameData.settings || {};
    document.getElementById('topbar-title').textContent = gameData.title;
  } catch (e) {
    window.location.href = '/studio';
  }
}

async function loadAssets() {
  try {
    const r = await fetch('/api/assets');
    assets = await r.json();
  } catch (e) {
    assets = [];
  }
}

async function saveGame() {
  try {
    const r = await fetch(`/api/studio/save/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks, items, models, settings,
        title: gameData.title,
        description: gameData.description
      })
    });
    if (r.ok) { unsaved = false; showSaved(); }
  } catch (e) {
    console.error('[Save]', e);
  }
}

function showSaved() {
  const s = document.getElementById('topbar-saved');
  s.style.display = 'inline-flex';
  setTimeout(() => { s.style.display = 'none'; }, 2500);
}

// ==================== COORDS ====================

function w2s(wx, wy) {
  return {
    x: (wx - camera.x) * camera.zoom + canvas.width / 2,
    y: (wy - camera.y) * camera.zoom + canvas.height / 2
  };
}

function s2w(sx, sy) {
  return {
    x: (sx - canvas.width / 2) / camera.zoom + camera.x,
    y: (sy - canvas.height / 2) / camera.zoom + camera.y
  };
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
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 0.5 / camera.zoom;
  ctx.beginPath();
  for (let x = sx; x <= ex; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
  for (let y = sy; y <= ey; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
  ctx.stroke();

  // World bounds
  const ww = settings.worldWidth || 2400;
  const wh = settings.worldHeight || 600;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.setLineDash([8 / camera.zoom, 4 / camera.zoom]);
  ctx.strokeRect(0, 0, ww, wh);
  ctx.setLineDash([]);

  // Spawn indicator
  const spx = settings.spawnX || 100;
  const spy = settings.spawnY || 400;
  ctx.fillStyle = 'rgba(74,222,128,.3)';
  ctx.fillRect(spx - 8, spy - 24, 16, 24);
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1 / camera.zoom;
  ctx.strokeRect(spx - 8, spy - 24, 16, 24);
  ctx.fillStyle = '#4ade80';
  ctx.font = `${10 / camera.zoom}px Inter`;
  ctx.textAlign = 'center';
  ctx.fillText('SPAWN', spx, spy + 12 / camera.zoom);

  // Blocks
  blocks.forEach((b, i) => {
    ctx.globalAlpha = b.opacity !== undefined ? b.opacity : 1;
    ctx.fillStyle = b.color || '#333';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(b.x, b.y, b.w, 2);

    if (b.text) {
      ctx.fillStyle = b.textColor || '#fff';
      ctx.font = `${b.textSize || 14}px ${b.textFont || 'Inter'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.globalAlpha = 1;

    if (selectedBlock === i) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      const hs = 6 / camera.zoom;
      ctx.fillStyle = '#fff';
      [
        { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
        { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h }
      ].forEach(h => {
        ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      });
    }
  });

  // Models
  models.forEach((m, i) => {
    const visual = getModelVisual(m.type);
    if (visual && visual.drawCanvas) {
      visual.drawCanvas(ctx, m.x, m.y, m.w || 40, m.h || 80, renderTime, m.properties);
    } else {
      ctx.fillStyle = '#555';
      ctx.fillRect(m.x, m.y, m.w || 40, m.h || 80);
      ctx.fillStyle = '#999';
      ctx.font = `${10 / camera.zoom}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.type, m.x + (m.w || 40) / 2, m.y + (m.h || 80) / 2);
    }

    // Draw link lines for lever -> door connections
    if (m.type === 'lever' && m.properties && m.properties.targetId) {
      const target = models.find(t => t.id === m.properties.targetId);
      if (target) {
        ctx.strokeStyle = 'rgba(204,51,51,0.4)';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(m.x + (m.w || 30) / 2, m.y + (m.h || 40) / 2);
        ctx.lineTo(target.x + (target.w || 40) / 2, target.y + (target.h || 80) / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw link for door_key -> key items
    if (m.type === 'door_key' && m.properties && m.properties.keyId) {
      const keyItem = items.find(it => it.id === m.properties.keyId);
      if (keyItem) {
        ctx.strokeStyle = 'rgba(218,165,32,0.4)';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(m.x + (m.w || 40) / 2, m.y + (m.h || 80) / 2);
        ctx.lineTo(keyItem.x, keyItem.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (selectedModel === i) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(m.x - 2, m.y - 2, (m.w || 40) + 4, (m.h || 80) + 4);
      const hs = 6 / camera.zoom;
      ctx.fillStyle = '#F59E0B';
      const mw = m.w || 40, mh = m.h || 80;
      [
        { x: m.x, y: m.y }, { x: m.x + mw, y: m.y },
        { x: m.x, y: m.y + mh }, { x: m.x + mw, y: m.y + mh }
      ].forEach(h => {
        ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      });
    }
  });

  // Items
  items.forEach((item, i) => {
    const visual = getItemVisual(item.type);
    if (visual && visual.drawCanvas) {
      visual.drawCanvas(ctx, item.x, item.y, 24 / camera.zoom, renderTime);
    } else {
      ctx.fillStyle = '#666';
      const sz = 8 / camera.zoom;
      ctx.fillRect(item.x - sz, item.y - sz, sz * 2, sz * 2);
      ctx.fillStyle = '#999';
      ctx.font = `${10 / camera.zoom}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', item.x, item.y);
    }

    if (item.giveOnStart) {
      ctx.fillStyle = 'rgba(74,222,128,.15)';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 16 / camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    if (item.collectOnTouch) {
      ctx.strokeStyle = 'rgba(59,130,246,.4)';
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 18 / camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (selectedItem === i) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(
        item.x - 20 / camera.zoom, item.y - 20 / camera.zoom,
        40 / camera.zoom, 40 / camera.zoom
      );
    }
  });

  // New block preview
  if (newBlockStart && currentTool === 'block') {
    const nx = Math.min(newBlockStart.x, newBlockStart.cx);
    const ny = Math.min(newBlockStart.y, newBlockStart.cy);
    const nw = Math.abs(newBlockStart.cx - newBlockStart.x);
    const nh = Math.abs(newBlockStart.cy - newBlockStart.y);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.fillRect(nx, ny, nw, nh);
    ctx.strokeRect(nx, ny, nw, nh);
    ctx.fillStyle = '#fff';
    ctx.font = `${10 / camera.zoom}px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(nw)} × ${Math.round(nh)}`, nx + nw / 2, ny - 6 / camera.zoom);
  }

  ctx.restore();

  // Zoom indicator
  ctx.fillStyle = '#333';
  ctx.font = '11px Inter';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(camera.zoom * 100)}%`, 10, canvas.height - 10);

  // Unsaved indicator
  if (unsaved) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(canvas.width - 20, 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(render);
}

// ==================== INPUT ====================

function getPos(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.offsetX, y: e.offsetY };
}

function getCanvasY(rawY) {
  return rawY - (isMobile ? 0 : 48);
}

function clearSelection() {
  selectedBlock = null;
  selectedItem = null;
  selectedModel = null;
}

function onDown(e) {
  const pos = getPos(e);
  const canvasY = getCanvasY(pos.y);
  const world = s2w(pos.x, canvasY);

  if (e.button === 1 || (e.touches && e.touches.length === 2)) {
    isPanning = true;
    dragStart = { x: pos.x, y: pos.y };
    e.preventDefault();
    return;
  }

  if (e.button === 2) {
    const mi = findModelAt(world.x, world.y);
    if (mi !== -1) { clearSelection(); selectedModel = mi; openModelProps(); e.preventDefault(); return; }
    const bi = findBlockAt(world.x, world.y);
    if (bi !== -1) { clearSelection(); selectedBlock = bi; openBlockProps(); }
    const ii = findItemAt(world.x, world.y);
    if (ii !== -1) { clearSelection(); selectedItem = ii; openItemProps(); }
    e.preventDefault();
    return;
  }

  if (e.button && e.button !== 0) return;

  if (currentTool === 'block') {
    newBlockStart = { x: world.x, y: world.y, cx: world.x, cy: world.y };
    return;
  }

  if (currentTool === 'select' || currentTool === 'move') {
    // Scale handles for blocks
    if (selectedBlock !== null && blocks[selectedBlock]) {
      const b = blocks[selectedBlock];
      const hs = 8 / camera.zoom;
      const handles = [
        { x: b.x, y: b.y, c: 'nw' }, { x: b.x + b.w, y: b.y, c: 'ne' },
        { x: b.x, y: b.y + b.h, c: 'sw' }, { x: b.x + b.w, y: b.y + b.h, c: 'se' }
      ];
      for (const h of handles) {
        if (Math.abs(world.x - h.x) < hs && Math.abs(world.y - h.y) < hs) {
          isScaling = true;
          scaleHandle = h.c;
          dragStart = { x: world.x, y: world.y };
          dragObjStart = { x: b.x, y: b.y, w: b.w, h: b.h };
          return;
        }
      }
    }

    // Scale handles for models
    if (selectedModel !== null && models[selectedModel]) {
      const m = models[selectedModel];
      const mw = m.w || 40, mh = m.h || 80;
      const hs = 8 / camera.zoom;
      const handles = [
        { x: m.x, y: m.y, c: 'nw' }, { x: m.x + mw, y: m.y, c: 'ne' },
        { x: m.x, y: m.y + mh, c: 'sw' }, { x: m.x + mw, y: m.y + mh, c: 'se' }
      ];
      for (const h of handles) {
        if (Math.abs(world.x - h.x) < hs && Math.abs(world.y - h.y) < hs) {
          isScaling = true;
          scaleHandle = h.c;
          dragStart = { x: world.x, y: world.y };
          dragObjStart = { x: m.x, y: m.y, w: mw, h: mh };
          return;
        }
      }
    }

    // Check models first (they are on top visually)
    const mi = findModelAt(world.x, world.y);
    if (mi !== -1) {
      clearSelection(); selectedModel = mi;
      isDragging = true;
      dragStart = { x: world.x, y: world.y };
      dragObjStart = { x: models[mi].x, y: models[mi].y };
      return;
    }

    const ii = findItemAt(world.x, world.y);
    if (ii !== -1) {
      clearSelection(); selectedItem = ii;
      isDragging = true;
      dragStart = { x: world.x, y: world.y };
      dragObjStart = { x: items[ii].x, y: items[ii].y };
      return;
    }

    const bi = findBlockAt(world.x, world.y);
    if (bi !== -1) {
      clearSelection(); selectedBlock = bi;
      isDragging = true;
      dragStart = { x: world.x, y: world.y };
      dragObjStart = { x: blocks[bi].x, y: blocks[bi].y };
      if (document.getElementById('right-panel').style.display !== 'none') updateBlockProps();
      return;
    }

    clearSelection();
    closeRightPanel();
    isPanning = true;
    dragStart = { x: pos.x, y: pos.y };
  }
}

function onMove(e) {
  const pos = getPos(e);
  const canvasY = getCanvasY(pos.y);
  const world = s2w(pos.x, canvasY);

  if (isPanning) {
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;
    dragStart = { x: pos.x, y: pos.y };
    return;
  }

  if (newBlockStart) {
    newBlockStart.cx = world.x;
    newBlockStart.cy = world.y;
    return;
  }

  if (isScaling) {
    const dx = world.x - dragStart.x;
    const dy = world.y - dragStart.y;

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

    unsaved = true;
    return;
  }

  if (isDragging) {
    const dx = world.x - dragStart.x;
    const dy = world.y - dragStart.y;
    if (selectedBlock !== null) {
      blocks[selectedBlock].x = Math.round(dragObjStart.x + dx);
      blocks[selectedBlock].y = Math.round(dragObjStart.y + dy);
    }
    if (selectedItem !== null) {
      items[selectedItem].x = Math.round(dragObjStart.x + dx);
      items[selectedItem].y = Math.round(dragObjStart.y + dy);
    }
    if (selectedModel !== null) {
      models[selectedModel].x = Math.round(dragObjStart.x + dx);
      models[selectedModel].y = Math.round(dragObjStart.y + dy);
    }
    unsaved = true;
  }
}

function onUp(e) {
  if (newBlockStart && currentTool === 'block') {
    const x = Math.min(newBlockStart.x, newBlockStart.cx);
    const y = Math.min(newBlockStart.y, newBlockStart.cy);
    const w = Math.abs(newBlockStart.cx - newBlockStart.x);
    const h = Math.abs(newBlockStart.cy - newBlockStart.y);
    if (w > 5 && h > 5) {
      blocks.push({
        id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
        x: Math.round(x), y: Math.round(y),
        w: Math.round(w), h: Math.round(h),
        color: '#333333', opacity: 1,
        text: '', textFont: 'Inter', textSize: 14, textColor: '#ffffff',
        isSpawn: false
      });
      clearSelection();
      selectedBlock = blocks.length - 1;
      unsaved = true;
    }
    newBlockStart = null;
    return;
  }
  isDragging = false;
  isPanning = false;
  isScaling = false;
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false });
canvas.addEventListener('touchend', (e) => { onUp(e); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camera.zoom = Math.max(0.2, Math.min(3, camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

function findBlockAt(wx, wy) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
  }
  return -1;
}

function findItemAt(wx, wy) {
  for (let i = items.length - 1; i >= 0; i--) {
    if (Math.abs(wx - items[i].x) < 20 && Math.abs(wy - items[i].y) < 20) return i;
  }
  return -1;
}

function findModelAt(wx, wy) {
  for (let i = models.length - 1; i >= 0; i--) {
    const m = models[i];
    const mw = m.w || 40, mh = m.h || 80;
    if (wx >= m.x && wx <= m.x + mw && wy >= m.y && wy <= m.y + mh) return i;
  }
  return -1;
}

// ==================== KEYBOARD ====================

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'v') setTool('select');
  if (e.key === 'b') setTool('block');
  if (e.key === 'i') setTool('item');
  if (e.key === 'm') setTool('move');

  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveGame(); }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedBlock !== null) {
      blocks.splice(selectedBlock, 1);
      selectedBlock = null;
      closeRightPanel();
      unsaved = true;
    }
    if (selectedItem !== null) {
      items.splice(selectedItem, 1);
      selectedItem = null;
      closeRightPanel();
      unsaved = true;
      updatePlacedList();
    }
    if (selectedModel !== null) {
      models.splice(selectedModel, 1);
      selectedModel = null;
      closeRightPanel();
      unsaved = true;
      updatePlacedModelList();
    }
  }

  if (e.key === 'Escape') {
    clearSelection();
    closeRightPanel();
    closeAllModals();
  }
});

// ==================== TOOLS ====================

function setTool(t) {
  currentTool = t;
  document.querySelectorAll('.topbar-tool,.mob-tool[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === t);
  });
  canvas.style.cursor = t === 'block' ? 'crosshair' : t === 'move' ? 'grab' : 'default';
}

document.querySelectorAll('.topbar-tool[data-tool],.mob-tool[data-tool]').forEach(b => {
  b.addEventListener('click', () => setTool(b.dataset.tool));
});

// ==================== BLOCK PROPERTIES ====================

function openBlockProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'block';
  document.getElementById('item-props').style.display = 'none';
  document.getElementById('model-props').style.display = 'none';
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

const propMap = { 'prop-x': 'x', 'prop-y': 'y', 'prop-w': 'w', 'prop-h': 'h' };
['prop-x', 'prop-y', 'prop-w', 'prop-h'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    if (selectedBlock === null) return;
    blocks[selectedBlock][propMap[id]] = parseFloat(e.target.value) || 0;
    unsaved = true;
  });
});

document.getElementById('prop-color').addEventListener('input', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].color = e.target.value;
  document.getElementById('prop-color-text').value = e.target.value;
  unsaved = true;
});

document.getElementById('prop-color-text').addEventListener('input', e => {
  if (selectedBlock === null) return;
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
    blocks[selectedBlock].color = e.target.value;
    document.getElementById('prop-color').value = e.target.value;
    unsaved = true;
  }
});

document.getElementById('prop-opacity').addEventListener('input', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].opacity = parseFloat(e.target.value);
  document.getElementById('prop-opacity-val').textContent = parseFloat(e.target.value).toFixed(2);
  unsaved = true;
});

document.getElementById('prop-text').addEventListener('input', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].text = e.target.value;
  unsaved = true;
});

document.getElementById('prop-text-font').addEventListener('change', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].textFont = e.target.value;
  unsaved = true;
});

document.getElementById('prop-text-size').addEventListener('input', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].textSize = parseInt(e.target.value) || 14;
  unsaved = true;
});

document.getElementById('prop-text-color').addEventListener('input', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].textColor = e.target.value;
  unsaved = true;
});

document.getElementById('prop-spawn').addEventListener('change', e => {
  if (selectedBlock === null) return;
  blocks[selectedBlock].isSpawn = e.target.checked;
  if (e.target.checked) {
    settings.spawnX = blocks[selectedBlock].x + blocks[selectedBlock].w / 2;
    settings.spawnY = blocks[selectedBlock].y;
  }
  unsaved = true;
});

document.getElementById('btn-delete-block').addEventListener('click', () => {
  if (selectedBlock === null) return;
  blocks.splice(selectedBlock, 1);
  selectedBlock = null;
  closeRightPanel();
  unsaved = true;
});

// ==================== ITEM PROPERTIES ====================

function openItemProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'none';
  document.getElementById('item-props').style.display = 'block';
  document.getElementById('model-props').style.display = 'none';
  document.getElementById('rp-title').textContent = 'Item Properties';
  updateItemProps();
}

function updateItemProps() {
  if (selectedItem === null) return;
  const it = items[selectedItem];
  const asset = assets.find(a => a.id === it.type);

  const display = document.getElementById('item-type-display');
  display.innerHTML = `${getItemSVG(it.type)}<span style="margin-left:8px">${asset ? asset.name : it.type}</span>`;

  document.getElementById('item-x').value = Math.round(it.x);
  document.getElementById('item-y').value = Math.round(it.y);
  document.getElementById('item-give-start').checked = it.giveOnStart || false;
  document.getElementById('item-collect-touch').checked = it.collectOnTouch !== false;

  const cp = document.getElementById('item-custom-props');
  cp.innerHTML = '';
  if (asset && asset.defaults) {
    cp.innerHTML = '<label>Properties</label>';
    Object.entries(asset.defaults).forEach(([key, def]) => {
      const val = it.properties && it.properties[key] !== undefined ? it.properties[key] : def;
      const div = document.createElement('div');
      div.className = 'rp-field';
      div.style.marginBottom = '4px';
      if (typeof def === 'string') {
        div.innerHTML = `<span>${key}</span><input type="text" value="${val}" data-prop="${key}" style="flex:1">`;
        div.querySelector('input').addEventListener('input', e => {
          if (!it.properties) it.properties = {};
          it.properties[key] = e.target.value;
          unsaved = true;
        });
      } else {
        div.innerHTML = `<span>${key}</span><input type="number" step="any" value="${val}" data-prop="${key}">`;
        div.querySelector('input').addEventListener('input', e => {
          if (!it.properties) it.properties = {};
          it.properties[key] = parseFloat(e.target.value);
          unsaved = true;
        });
      }
      cp.appendChild(div);
    });
  }
}

document.getElementById('item-x').addEventListener('input', e => {
  if (selectedItem === null) return;
  items[selectedItem].x = parseFloat(e.target.value) || 0;
  unsaved = true;
});

document.getElementById('item-y').addEventListener('input', e => {
  if (selectedItem === null) return;
  items[selectedItem].y = parseFloat(e.target.value) || 0;
  unsaved = true;
});

document.getElementById('item-give-start').addEventListener('change', e => {
  if (selectedItem === null) return;
  items[selectedItem].giveOnStart = e.target.checked;
  unsaved = true;
  updatePlacedList();
});

document.getElementById('item-collect-touch').addEventListener('change', e => {
  if (selectedItem === null) return;
  items[selectedItem].collectOnTouch = e.target.checked;
  unsaved = true;
  updatePlacedList();
});

document.getElementById('btn-delete-item').addEventListener('click', () => {
  if (selectedItem === null) return;
  items.splice(selectedItem, 1);
  selectedItem = null;
  closeRightPanel();
  unsaved = true;
  updatePlacedList();
});

// ==================== MODEL PROPERTIES ====================

function openModelProps() {
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('block-props').style.display = 'none';
  document.getElementById('item-props').style.display = 'none';
  document.getElementById('model-props').style.display = 'block';
  document.getElementById('rp-title').textContent = 'Model Properties';
  updateModelProps();
}

function updateModelProps() {
  if (selectedModel === null) return;
  const m = models[selectedModel];
  const def = MODEL_DEFS[m.type];

  const display = document.getElementById('model-type-display');
  display.innerHTML = `${getModelSVG(m.type)}<span style="margin-left:8px">${def ? def.name : m.type}</span>`;

  document.getElementById('model-x').value = Math.round(m.x);
  document.getElementById('model-y').value = Math.round(m.y);
  document.getElementById('model-w').value = Math.round(m.w || 40);
  document.getElementById('model-h').value = Math.round(m.h || 80);

  const cp = document.getElementById('model-custom-props');
  cp.innerHTML = '';

  if (def && def.defaults) {
    cp.innerHTML = '<label>Model Settings</label>';

    Object.entries(def.defaults).forEach(([key, defVal]) => {
      const val = m.properties && m.properties[key] !== undefined ? m.properties[key] : defVal;
      const div = document.createElement('div');
      div.className = 'rp-field';
      div.style.marginBottom = '6px';

      // Special handling for linking
      if (key === 'keyId') {
        // Dropdown of placed key items
        const keyItems = items.filter(it => it.type === 'key');
        let options = '<option value="">-- None --</option>';
        keyItems.forEach(k => {
          options += `<option value="${k.id}" ${val === k.id ? 'selected' : ''}>Key @ (${Math.round(k.x)}, ${Math.round(k.y)})</option>`;
        });
        div.innerHTML = `<span>Link Key</span><select class="rp-select" data-prop="${key}" style="flex:1">${options}</select>`;
        div.querySelector('select').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (key === 'leverId') {
        // Dropdown of placed levers
        const leverModels = models.filter(md => md.type === 'lever');
        let options = '<option value="">-- None --</option>';
        leverModels.forEach(l => {
          options += `<option value="${l.id}" ${val === l.id ? 'selected' : ''}>Lever @ (${Math.round(l.x)}, ${Math.round(l.y)})</option>`;
        });
        div.innerHTML = `<span>Link Lever</span><select class="rp-select" data-prop="${key}" style="flex:1">${options}</select>`;
        div.querySelector('select').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (key === 'targetId') {
        // Dropdown of doors for lever targeting
        const doorModels = models.filter(md => md.type.startsWith('door_'));
        let options = '<option value="">-- None --</option>';
        doorModels.forEach(d => {
          const dDef = MODEL_DEFS[d.type];
          options += `<option value="${d.id}" ${val === d.id ? 'selected' : ''}>${dDef ? dDef.name : d.type} @ (${Math.round(d.x)}, ${Math.round(d.y)})</option>`;
        });
        div.innerHTML = `<span>Target Door</span><select class="rp-select" data-prop="${key}" style="flex:1">${options}</select>`;
        div.querySelector('select').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (key === 'keycardColor' || key === 'cardColor') {
        const colorOptions = ['red', 'blue', 'green', 'yellow'];
        let options = '';
        colorOptions.forEach(c => {
          options += `<option value="${c}" ${val === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`;
        });
        div.innerHTML = `<span>${key === 'cardColor' ? 'Card Color' : 'Required Color'}</span><select class="rp-select" data-prop="${key}" style="flex:1">${options}</select>`;
        div.querySelector('select').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (key === 'direction') {
        const dirs = ['up', 'down', 'left', 'right'];
        let options = '';
        dirs.forEach(d => {
          options += `<option value="${d}" ${val === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`;
        });
        div.innerHTML = `<span>Open Dir</span><select class="rp-select" data-prop="${key}" style="flex:1">${options}</select>`;
        div.querySelector('select').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (key === 'color') {
        div.innerHTML = `<span>Color</span><input type="color" value="${val}" data-prop="${key}" class="rp-color">`;
        div.querySelector('input').addEventListener('input', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      } else if (typeof defVal === 'boolean') {
        div.className = 'rp-checkbox';
        div.innerHTML = `<input type="checkbox" id="model-prop-${key}" ${val ? 'checked' : ''}><label for="model-prop-${key}">${key}</label>`;
        div.querySelector('input').addEventListener('change', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.checked;
          unsaved = true;
        });
      } else if (typeof defVal === 'number') {
        div.innerHTML = `<span>${key}</span><input type="number" step="any" value="${val}" data-prop="${key}">`;
        div.querySelector('input').addEventListener('input', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = parseFloat(e.target.value);
          unsaved = true;
        });
      } else {
        div.innerHTML = `<span>${key}</span><input type="text" value="${val || ''}" data-prop="${key}" style="flex:1">`;
        div.querySelector('input').addEventListener('input', e => {
          if (!m.properties) m.properties = {};
          m.properties[key] = e.target.value;
          unsaved = true;
        });
      }

      cp.appendChild(div);
    });
  }
}

document.getElementById('model-x').addEventListener('input', e => {
  if (selectedModel === null) return;
  models[selectedModel].x = parseFloat(e.target.value) || 0;
  unsaved = true;
});

document.getElementById('model-y').addEventListener('input', e => {
  if (selectedModel === null) return;
  models[selectedModel].y = parseFloat(e.target.value) || 0;
  unsaved = true;
});

document.getElementById('model-w').addEventListener('input', e => {
  if (selectedModel === null) return;
  models[selectedModel].w = Math.max(10, parseFloat(e.target.value) || 40);
  unsaved = true;
});

document.getElementById('model-h').addEventListener('input', e => {
  if (selectedModel === null) return;
  models[selectedModel].h = Math.max(10, parseFloat(e.target.value) || 80);
  unsaved = true;
});

document.getElementById('btn-delete-model').addEventListener('click', () => {
  if (selectedModel === null) return;
  models.splice(selectedModel, 1);
  selectedModel = null;
  closeRightPanel();
  unsaved = true;
  updatePlacedModelList();
});

function closeRightPanel() {
  document.getElementById('right-panel').style.display = 'none';
}

document.getElementById('rp-close').addEventListener('click', closeRightPanel);

// ==================== ASSET STORE ====================

function renderAssetStore(filter) {
  filter = filter || 'all';
  const list = document.getElementById('asset-list');
  list.innerHTML = '';

  // Regular items
  const filteredItems = filter === 'all'
    ? assets
    : filter === 'model'
      ? []
      : assets.filter(a => a.category === filter);

  filteredItems.forEach(asset => {
    const el = document.createElement('div');
    el.className = 'asset-item';
    el.innerHTML = `
      <span class="asset-icon">${getItemSVG(asset.id)}</span>
      <div class="asset-info">
        <h4>${asset.name}</h4>
        <p>${asset.description}</p>
      </div>
      <button class="asset-add">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>
    `;
    el.querySelector('.asset-add').addEventListener('click', (e) => {
      e.stopPropagation();
      items.push({
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
        type: asset.id,
        x: Math.round(camera.x),
        y: Math.round(camera.y),
        giveOnStart: false,
        collectOnTouch: true,
        properties: { ...asset.defaults }
      });
      unsaved = true;
      updatePlacedList();
    });
    list.appendChild(el);
  });

  // Models
  const filteredModels = filter === 'all' || filter === 'model'
    ? Object.values(MODEL_DEFS)
    : [];

  if (filteredModels.length > 0 && filter !== 'model') {
    // Add separator
    const sep = document.createElement('div');
    sep.style.cssText = 'padding:8px 12px;color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #222;margin-top:4px;';
    sep.textContent = '🏗️ Models';
    list.appendChild(sep);
  }

  filteredModels.forEach(modelDef => {
    const el = document.createElement('div');
    el.className = 'asset-item';
    el.style.borderLeft = '3px solid #F59E0B';
    el.innerHTML = `
      <span class="asset-icon" style="color:#F59E0B">${getModelSVG(modelDef.id)}</span>
      <div class="asset-info">
        <h4>${modelDef.name}</h4>
        <p>${modelDef.description}</p>
      </div>
      <button class="asset-add" style="background:rgba(245,158,11,0.15);border-color:#F59E0B;color:#F59E0B">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Place
      </button>
    `;
    el.querySelector('.asset-add').addEventListener('click', (e) => {
      e.stopPropagation();
      const defaultW = modelDef.id === 'lever' ? 30 : modelDef.id === 'keycard' ? 30 : 40;
      const defaultH = modelDef.id === 'lever' ? 40 : modelDef.id === 'keycard' ? 20 : 80;
      models.push({
        id: 'model_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
        type: modelDef.id,
        x: Math.round(camera.x),
        y: Math.round(camera.y),
        w: defaultW,
        h: defaultH,
        properties: { ...modelDef.defaults }
      });
      unsaved = true;
      updatePlacedModelList();
    });
    list.appendChild(el);
  });
}

function updatePlacedList() {
  const list = document.getElementById('placed-list');
  list.innerHTML = '';
  document.getElementById('placed-count').textContent = items.length;

  items.forEach((item, i) => {
    const asset = assets.find(a => a.id === item.type);
    const el = document.createElement('div');
    el.className = 'placed-item' + (selectedItem === i ? ' selected' : '');
    let badges = '';
    if (item.giveOnStart) badges += '<span class="placed-item-badge badge-start">Start</span>';
    if (item.collectOnTouch) badges += '<span class="placed-item-badge badge-touch">Touch</span>';
    el.innerHTML = `
      <span class="placed-item-icon">${getItemSVG(item.type)}</span>
      <span class="placed-item-name">${asset ? asset.name : item.type}</span>
      ${badges}
    `;
    el.addEventListener('click', () => {
      clearSelection();
      selectedItem = i;
      openItemProps();
      updatePlacedList();
      camera.x = item.x;
      camera.y = item.y;
    });
    list.appendChild(el);
  });
}

function updatePlacedModelList() {
  const list = document.getElementById('placed-model-list');
  list.innerHTML = '';
  document.getElementById('placed-model-count').textContent = models.length;

  models.forEach((m, i) => {
    const def = MODEL_DEFS[m.type];
    const el = document.createElement('div');
    el.className = 'placed-item' + (selectedModel === i ? ' selected' : '');
    el.style.borderLeft = '2px solid #F59E0B';

    let info = '';
    if (m.type === 'door_key' && m.properties && m.properties.keyId) {
      info = '<span class="placed-item-badge" style="background:rgba(218,165,32,0.2);color:#DAA520">🔑 Linked</span>';
    } else if (m.type === 'door_keycard' && m.properties) {
      const c = m.properties.keycardColor || 'red';
      const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
      info = `<span class="placed-item-badge" style="background:rgba(0,0,0,0.3);color:${colors[c] || '#888'}">💳 ${c}</span>`;
    } else if (m.type === 'door_lever' && m.properties && m.properties.leverId) {
      info = '<span class="placed-item-badge" style="background:rgba(204,51,51,0.2);color:#CC3333">⚙ Linked</span>';
    } else if (m.type === 'lever' && m.properties && m.properties.targetId) {
      info = '<span class="placed-item-badge" style="background:rgba(204,51,51,0.2);color:#CC3333">→ Target</span>';
    } else if (m.type === 'keycard' && m.properties) {
      const c = m.properties.cardColor || 'red';
      const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
      info = `<span class="placed-item-badge" style="background:rgba(0,0,0,0.3);color:${colors[c] || '#888'}">${c}</span>`;
    }

    el.innerHTML = `
      <span class="placed-item-icon" style="color:#F59E0B">${getModelSVG(m.type)}</span>
      <span class="placed-item-name">${def ? def.name : m.type}</span>
      ${info}
    `;
    el.addEventListener('click', () => {
      clearSelection();
      selectedModel = i;
      openModelProps();
      updatePlacedModelList();
      camera.x = m.x + (m.w || 40) / 2;
      camera.y = m.y + (m.h || 80) / 2;
    });
    list.appendChild(el);
  });
}

document.getElementById('btn-items-panel').addEventListener('click', toggleItemsPanel);
document.getElementById('items-panel-close').addEventListener('click', () => {
  document.getElementById('items-panel').style.display = 'none';
});

function toggleItemsPanel() {
  const p = document.getElementById('items-panel');
  if (p.style.display === 'none') {
    p.style.display = 'block';
    renderAssetStore();
    updatePlacedList();
    updatePlacedModelList();
  } else {
    p.style.display = 'none';
  }
}

document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderAssetStore(b.dataset.cat);
  });
});

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

  // Fog
  const fogEnabled = settings.fogEnabled || false;
  document.getElementById('set-fog-enabled').checked = fogEnabled;
  document.getElementById('fog-settings').style.display = fogEnabled ? 'block' : 'none';
  document.getElementById('set-fog-color').value = settings.fogColor || '#000000';
  document.getElementById('set-fog-color-text').value = settings.fogColor || '#000000';
  document.getElementById('set-fog-density').value = settings.fogDensity || 0.5;
  document.getElementById('set-fog-density-val').textContent = (settings.fogDensity || 0.5).toFixed(2);
  document.getElementById('set-fog-start').value = settings.fogStart || 100;
  document.getElementById('set-fog-start-val').textContent = settings.fogStart || 100;
  document.getElementById('set-fog-end').value = settings.fogEnd || 400;
  document.getElementById('set-fog-end-val').textContent = settings.fogEnd || 400;

  // Darkness
  const darknessEnabled = settings.darknessEnabled || false;
  document.getElementById('set-darkness').checked = darknessEnabled;
  document.getElementById('darkness-settings').style.display = darknessEnabled ? 'block' : 'none';
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

  // Effects
  document.getElementById('set-particles').checked = settings.particles || false;
  document.getElementById('set-breathing').checked = settings.breathing || false;
  document.getElementById('set-footstep').checked = settings.footstepShake || false;
  document.getElementById('set-vignette').checked = settings.vignette || false;
  document.getElementById('vignette-settings').style.display = settings.vignette ? 'block' : 'none';
  document.getElementById('set-vignette-intensity').value = settings.vignetteIntensity || 0.3;
  document.getElementById('set-vignette-val').textContent = (settings.vignetteIntensity || 0.3).toFixed(2);
  document.getElementById('set-vignette-color').value = settings.vignetteColor || '#000000';

  // Tint
  document.getElementById('set-tint-enabled').checked = settings.tintEnabled || false;
  document.getElementById('tint-settings').style.display = settings.tintEnabled ? 'block' : 'none';
  document.getElementById('set-tint-color').value = settings.tintColor || '#000000';
  document.getElementById('set-tint-opacity').value = settings.tintOpacity || 0.1;
  document.getElementById('set-tint-opacity-val').textContent = (settings.tintOpacity || 0.1).toFixed(2);

  document.getElementById('settings-modal').style.display = 'flex';
});

// Settings toggle listeners
document.getElementById('set-fog-enabled').addEventListener('change', e => {
  document.getElementById('fog-settings').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('set-darkness').addEventListener('change', e => {
  document.getElementById('darkness-settings').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('set-vignette').addEventListener('change', e => {
  document.getElementById('vignette-settings').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('set-tint-enabled').addEventListener('change', e => {
  document.getElementById('tint-settings').style.display = e.target.checked ? 'block' : 'none';
});

// Slider value displays
['set-fog-density', 'set-fog-start', 'set-fog-end', 'set-ambient', 'set-fl-spread', 'set-flicker', 'set-vignette-intensity', 'set-tint-opacity'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const valEl = document.getElementById(id + '-val');
    if (valEl) valEl.textContent = parseFloat(el.value).toFixed(id === 'set-fog-start' || id === 'set-fog-end' ? 0 : id === 'set-flicker' ? 3 : 2);
  });
});

document.getElementById('set-fog-color').addEventListener('input', e => {
  document.getElementById('set-fog-color-text').value = e.target.value;
});
document.getElementById('set-fog-color-text').addEventListener('input', e => {
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
    document.getElementById('set-fog-color').value = e.target.value;
  }
});

document.getElementById('btn-settings-cancel').addEventListener('click', () => {
  document.getElementById('settings-modal').style.display = 'none';
});

document.getElementById('btn-settings-save').addEventListener('click', () => {
  gameData.title = document.getElementById('set-title').value || 'Untitled';
  gameData.description = document.getElementById('set-desc').value || '';
  settings.bgColor = document.getElementById('set-bg').value;
  settings.gravity = parseFloat(document.getElementById('set-gravity').value) || 0.6;
  settings.playerSpeed = parseFloat(document.getElementById('set-speed').value) || 4;
  settings.jumpForce = parseFloat(document.getElementById('set-jump').value) || -12;
  settings.worldWidth = parseInt(document.getElementById('set-world-w').value) || 2400;
  settings.worldHeight = parseInt(document.getElementById('set-world-h').value) || 600;

  // Fog
  settings.fogEnabled = document.getElementById('set-fog-enabled').checked;
  settings.fogColor = document.getElementById('set-fog-color').value;
  settings.fogDensity = parseFloat(document.getElementById('set-fog-density').value);
  settings.fogStart = parseFloat(document.getElementById('set-fog-start').value);
  settings.fogEnd = parseFloat(document.getElementById('set-fog-end').value);

  // Darkness
  settings.darknessEnabled = document.getElementById('set-darkness').checked;
  settings.ambientLight = parseFloat(document.getElementById('set-ambient').value);
  settings.flashlightRadius = parseFloat(document.getElementById('set-fl-radius').value);
  settings.flashlightBrightness = parseFloat(document.getElementById('set-fl-bright').value);
  settings.flashlightSpread = parseFloat(document.getElementById('set-fl-spread').value);
  settings.batteryMax = parseFloat(document.getElementById('set-bat-max').value);
  settings.batteryDrain = parseFloat(document.getElementById('set-bat-drain').value);
  settings.batteryRegen = parseFloat(document.getElementById('set-bat-regen').value);
  settings.flickerChance = parseFloat(document.getElementById('set-flicker').value);

  // Effects
  settings.particles = document.getElementById('set-particles').checked;
  settings.breathing = document.getElementById('set-breathing').checked;
  settings.footstepShake = document.getElementById('set-footstep').checked;
  settings.vignette = document.getElementById('set-vignette').checked;
  settings.vignetteIntensity = parseFloat(document.getElementById('set-vignette-intensity').value);
  settings.vignetteColor = document.getElementById('set-vignette-color').value;

  // Tint
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
  document.getElementById('pub-title').value = gameData.title || '';
  document.getElementById('pub-desc').value = gameData.description || '';
  pubVisibility = 'public';
  pubThumbData = gameData.thumbnailData || '';
  document.querySelectorAll('.pub-vis-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.vis === 'public');
  });
  generateThumb();
  document.getElementById('publish-modal').style.display = 'flex';
}

document.querySelectorAll('.pub-vis-btn').forEach(b => {
  b.addEventListener('click', () => {
    pubVisibility = b.dataset.vis;
    document.querySelectorAll('.pub-vis-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });
});

document.getElementById('pub-thumb-auto').addEventListener('click', generateThumb);

document.getElementById('pub-thumb-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pubThumbData = ev.target.result;
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById('pub-thumb-preview');
      const cx = c.getContext('2d');
      cx.clearRect(0, 0, 360, 200);
      cx.drawImage(img, 0, 0, 360, 200);
    };
    img.src = pubThumbData;
  };
  reader.readAsDataURL(file);
});

function generateThumb() {
  const c = document.getElementById('pub-thumb-preview');
  const cx = c.getContext('2d');
  cx.fillStyle = settings.bgColor || '#0a0a0a';
  cx.fillRect(0, 0, 360, 200);

  cx.strokeStyle = '#111';
  for (let x = 0; x < 360; x += 20) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 200); cx.stroke(); }
  for (let y = 0; y < 200; y += 20) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(360, y); cx.stroke(); }

  const sc = Math.min(360 / (settings.worldWidth || 2400), 200 / (settings.worldHeight || 600)) * 0.8;
  const ox = (360 - (settings.worldWidth || 2400) * sc) / 2;
  const oy = (200 - (settings.worldHeight || 600) * sc) / 2;

  blocks.forEach(b => {
    cx.fillStyle = b.color || '#333';
    cx.globalAlpha = b.opacity || 1;
    cx.fillRect(ox + b.x * sc, oy + b.y * sc, b.w * sc, b.h * sc);
    cx.globalAlpha = 1;
  });

  // Models in thumbnail
  models.forEach(m => {
    const mw = m.w || 40, mh = m.h || 80;
    if (m.type.startsWith('door_')) {
      cx.fillStyle = '#8B4513';
    } else if (m.type === 'lever') {
      cx.fillStyle = '#CC3333';
    } else if (m.type === 'keycard') {
      const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
      cx.fillStyle = colors[(m.properties && m.properties.cardColor) || 'red'] || '#EF4444';
    } else {
      cx.fillStyle = '#F59E0B';
    }
    cx.fillRect(ox + m.x * sc, oy + m.y * sc, mw * sc, mh * sc);
  });

  const itemColors = {
    sword: '#CCC', flashlight: '#FFE066', shield: '#4488CC',
    speed_boost: '#FFD700', jump_boost: '#44CC44', coin: '#FFD700',
    heart: '#EF4444', key: '#DAA520', battery: '#44EE44', note: '#CCBB88'
  };

  items.forEach(it => {
    cx.fillStyle = itemColors[it.type] || '#888';
    cx.beginPath();
    cx.arc(ox + it.x * sc, oy + it.y * sc, 3, 0, Math.PI * 2);
    cx.fill();
  });

  cx.fillStyle = 'rgba(0,0,0,.4)';
  cx.fillRect(0, 0, 360, 200);
  cx.font = '900 22px Inter';
  cx.fillStyle = '#fff';
  cx.textAlign = 'center';
  cx.fillText((gameData.title || 'UNTITLED').toUpperCase(), 180, 95);
  cx.font = '500 10px Inter';
  cx.fillStyle = '#666';
  cx.fillText('Tublox Studio', 180, 115);

  pubThumbData = c.toDataURL('image/jpeg', 0.7);
}

document.getElementById('btn-pub-cancel').addEventListener('click', () => {
  document.getElementById('publish-modal').style.display = 'none';
});

document.getElementById('btn-pub-confirm').addEventListener('click', async () => {
  const title = document.getElementById('pub-title').value || gameData.title;
  const desc = document.getElementById('pub-desc').value || '';
  gameData.title = title;
  gameData.description = desc;
  await saveGame();
  try {
    const r = await fetch(`/api/studio/publish/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: pubVisibility,
        title,
        description: desc,
        thumbnailData: pubThumbData
      })
    });
    const d = await r.json();
    if (d.success) {
      document.getElementById('publish-modal').style.display = 'none';
      showSaved();
    }
  } catch (e) {
    console.error('[Publish]', e);
  }
});

// ==================== MOBILE MENU ====================

document.getElementById('mob-save')?.addEventListener('click', saveGame);

document.getElementById('mob-menu')?.addEventListener('click', () => {
  document.getElementById('mob-menu-overlay').style.display = 'flex';
});

document.getElementById('mob-settings')?.addEventListener('click', () => {
  document.getElementById('mob-menu-overlay').style.display = 'none';
  document.getElementById('btn-settings').click();
});

document.getElementById('mob-items')?.addEventListener('click', () => {
  document.getElementById('mob-menu-overlay').style.display = 'none';
  toggleItemsPanel();
});

document.getElementById('mob-publish')?.addEventListener('click', () => {
  document.getElementById('mob-menu-overlay').style.display = 'none';
  openPublish();
});

document.getElementById('mob-back')?.addEventListener('click', () => {
  if (unsaved && !confirm('Unsaved changes. Leave?')) return;
  window.location.href = '/studio';
});

document.getElementById('mob-menu-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'mob-menu-overlay') e.target.style.display = 'none';
});

// ==================== NAV ====================

document.getElementById('btn-back').addEventListener('click', () => {
  if (unsaved && !confirm('Unsaved changes. Leave?')) return;
  window.location.href = '/studio';
});

document.getElementById('btn-save').addEventListener('click', saveGame);

function closeAllModals() {
  ['settings-modal', 'publish-modal', 'mob-menu-overlay'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

// ==================== INIT ====================

async function init() {
  await loadAssets();
  await loadGame();
  renderAssetStore();
  updatePlacedList();
  updatePlacedModelList();
  requestAnimationFrame(render);
}

init();
})();