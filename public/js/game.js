(function() {
  'use strict';
  const TC = window.TubloxCharacter;

  const LERP_SPEED = 0.15;
  const SEND_RATE = 50;
  const ATTACK_DURATION = 400;

  const urlParams = new URLSearchParams(window.location.search);
  const placeName = urlParams.get('place') || 'platformer';

  function getToken() {
    const m = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return m ? m[1] : null;
  }
  const token = getToken();
  if (!token) { window.location.href = '/auth'; return; }

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let gameReady = false, myPlayer = null, myId = null, placeData = null;
  let remotePlayers = {}, camera = { x: 0, y: 0 }, keys = {};
  let chatOpen = false, escMenuOpen = false, lastSendTime = 0;
  let frameCount = 0, fps = 60, lastFpsTime = 0, animTime = 0;
  let deathAnim = { active: false, timer: 0, duration: 1.5 };

  let worldCollectibles = [];
  let collectedIds = new Set();
  let activeEffects = {};

  let flashlightOn = true;
  let shieldActive = true;

  // === MODELS STATE ===
  let worldModels = [];
  let openDoors = {};
  let doorAnimations = {};
  let activatedLevers = {};
  let collectedKeycards = {};
  let interactCooldown = 0;
  let interactMessages = [];

  // === HORROR STATE ===
  let horror = {
    active: false, battery: 100, maxBattery: 100,
    drainRate: 0.8, rechargeRate: 0.3,
    flickering: false, flickerTimer: 0,
    breathPhase: 0, shakeX: 0, shakeY: 0,
    triggeredScares: new Set(), activeScare: null, scareTimer: 0,
    chaseShadow: null, ambientParticles: [],
    scareMessages: [], eyesSpots: [],
    heartbeat: 0, nearScare: false
  };

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  let joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  let mobileJump = false, mobileAttack = false;

  // ==================== ITEM VISUALS ====================

  const ITEM_VISUALS = {
    sword: {
      name: 'Sword', color: '#CCCCCC', toggleable: false,
      drawWorld: function(c, x, y, time) {
        c.save(); c.translate(x, y + Math.sin(time*3)*3); c.rotate(-30*Math.PI/180);
        c.fillStyle='#8B6914'; c.fillRect(-2,-4,4,8);
        c.fillStyle='#CCAA00'; c.fillRect(-6,4,12,3);
        c.fillStyle='#CCC'; c.fillRect(-1.5,7,3,18);
        c.fillStyle='#EEE'; c.fillRect(-1.5,7,1,18);
        c.fillStyle='#DDD'; c.beginPath(); c.moveTo(-1.5,25); c.lineTo(1.5,25); c.lineTo(0,28); c.fill();
        c.restore();
      },
      drawHUD: function(c, x, y, sz) {
        c.save(); c.translate(x+sz/2, y+sz/2); c.rotate(-45*Math.PI/180); const s=sz/52;
        c.fillStyle='#8B6914'; c.fillRect(-2*s,-3*s,4*s,6*s);
        c.fillStyle='#CCAA00'; c.fillRect(-4*s,3*s,8*s,2*s);
        c.fillStyle='#CCC'; c.fillRect(-1*s,5*s,3*s,16*s);
        c.fillStyle='#EEE'; c.fillRect(-1*s,5*s,1*s,16*s);
        c.restore();
      }
    },
    flashlight: {
      name: 'Flashlight', color: '#FFE066', toggleable: true, toggleType: 'flashlight',
      drawWorld: function(c, x, y, time) {
        c.save(); c.translate(x, y+Math.sin(time*2.5)*2);
        c.fillStyle='#555'; c.fillRect(-4,-8,8,16);
        c.fillStyle='#FFE066'; c.fillRect(-5,-10,10,3);
        c.fillStyle='rgba(255,224,102,0.15)'; c.beginPath();
        c.moveTo(-5,-10); c.lineTo(-15,-30); c.lineTo(15,-30); c.lineTo(5,-10); c.fill();
        c.restore();
      },
      drawHUD: function(c, x, y, sz) {
        c.save(); c.translate(x+sz/2, y+sz/2); const s=sz/52;
        c.fillStyle='#555'; c.fillRect(-4*s,-6*s,8*s,14*s);
        c.fillStyle='#FFE066'; c.fillRect(-5*s,-8*s,10*s,3*s);
        c.restore();
      },
      drawEffect: function(c, player, time) {
        if (horror.active) return;
        const item = player.inventory?.[player.activeSlot];
        if (!item || item.id !== 'flashlight') return;
        const isOn = player._isMe ? flashlightOn : (player.itemState?.flashlightOn !== false);
        if (!isOn) return;
        const radius = item.radius || 200;
        const brightness = item.brightness || 1;
        const px = player.x + player.width/2, py = player.y + player.height/2;
        const dir = player.direction || 1;
        const angle = dir === 1 ? 0 : Math.PI;
        c.save();
        const grad = c.createRadialGradient(px,py,10, px+dir*radius*0.6,py, radius);
        grad.addColorStop(0, `rgba(255,240,180,${0.25*brightness})`);
        grad.addColorStop(0.5, `rgba(255,240,180,${0.1*brightness})`);
        grad.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = grad;
        c.beginPath(); c.moveTo(px,py); c.arc(px,py,radius, angle-Math.PI/4, angle+Math.PI/4); c.closePath(); c.fill();
        c.restore();
      }
    },
    shield: {
      name: 'Shield', color: '#4488CC', toggleable: true, toggleType: 'shield',
      drawWorld: function(c, x, y, time) {
        c.save(); c.translate(x, y+Math.sin(time*2)*2);
        c.fillStyle='#4488CC'; c.beginPath();
        c.moveTo(0,-12); c.lineTo(10,-6); c.lineTo(10,4); c.lineTo(0,12); c.lineTo(-10,4); c.lineTo(-10,-6); c.closePath(); c.fill();
        c.strokeStyle='#66AAEE'; c.lineWidth=1.5; c.stroke();
        c.fillStyle='#66AAEE'; c.beginPath(); c.arc(0,0,4,0,Math.PI*2); c.fill();
        c.restore();
      },
      drawHUD: function(c, x, y, sz) {
        c.save(); c.translate(x+sz/2, y+sz/2); const s=sz/52;
        c.fillStyle='#4488CC'; c.beginPath();
        c.moveTo(0,-10*s); c.lineTo(8*s,-5*s); c.lineTo(8*s,3*s); c.lineTo(0,10*s); c.lineTo(-8*s,3*s); c.lineTo(-8*s,-5*s); c.closePath(); c.fill();
        c.strokeStyle='#66AAEE'; c.lineWidth=1*s; c.stroke();
        c.restore();
      },
      drawEffect: function(c, player, time) {
        const item = player.inventory?.[player.activeSlot];
        if (!item || item.id !== 'shield') return;
        const isActive = player._isMe ? shieldActive : (player.itemState?.shieldActive !== false);
        if (!isActive) return;
        const px = player.x+player.width/2, py = player.y+player.height/2;
        const pulse = 0.3 + Math.sin(time*3)*0.1;
        c.save(); c.strokeStyle=`rgba(68,136,204,${pulse})`; c.lineWidth=2;
        c.beginPath(); c.arc(px,py,28,0,Math.PI*2); c.stroke();
        c.fillStyle=`rgba(68,136,204,${pulse*0.15})`; c.fill(); c.restore();
      }
    },
    speed_boost: {
      name: 'Speed Boost', color: '#FFD700', toggleable: false,
      drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*4)*2); c.fillStyle='#FFD700'; c.beginPath(); c.moveTo(2,-12); c.lineTo(-4,0); c.lineTo(0,0); c.lineTo(-2,12); c.lineTo(6,0); c.lineTo(2,0); c.closePath(); c.fill(); c.fillStyle='rgba(255,215,0,0.15)'; c.beginPath(); c.arc(0,0,14,0,Math.PI*2); c.fill(); c.restore(); },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#FFD700'; c.beginPath(); c.moveTo(2*s,-10*s); c.lineTo(-4*s,0); c.lineTo(0,0); c.lineTo(-2*s,10*s); c.lineTo(6*s,0); c.lineTo(2*s,0); c.closePath(); c.fill(); c.restore(); },
      onCollect: function(p,item) { const m=item.multiplier||1.5; const d=item.duration||5000; activeEffects.speed={multiplier:m,endTime:Date.now()+d}; addSystem(`Speed x${m} for ${d/1000}s!`); },
      drawEffect: function(c,player,time) { if(!activeEffects.speed||Date.now()>activeEffects.speed.endTime){delete activeEffects.speed;return;} const px=player.x+player.width/2,py=player.y+player.height; for(let i=0;i<3;i++){const o=(time*200+i*40)%60;const a=1-o/60;c.fillStyle=`rgba(255,215,0,${a*0.4})`;c.fillRect(px-player.direction*(o+10),py-10-i*8,12,2);} }
    },
    jump_boost: {
      name: 'Jump Boost', color: '#44CC44', toggleable: false,
      drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*3)*3); c.fillStyle='#44CC44'; c.fillRect(-6,4,12,4); c.strokeStyle='#44CC44'; c.lineWidth=2; c.beginPath(); for(let i=0;i<4;i++){const yy=4-i*4;c.moveTo(-4,yy);c.lineTo(4,yy-2);c.moveTo(4,yy-2);c.lineTo(-4,yy-4);} c.stroke(); c.fillStyle='#66EE66'; c.beginPath(); c.moveTo(0,-14); c.lineTo(5,-8); c.lineTo(-5,-8); c.closePath(); c.fill(); c.restore(); },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#44CC44'; c.fillRect(-5*s,2*s,10*s,3*s); c.fillStyle='#66EE66'; c.beginPath(); c.moveTo(0,-8*s); c.lineTo(5*s,-2*s); c.lineTo(-5*s,-2*s); c.closePath(); c.fill(); c.restore(); },
      onCollect: function(p,item) { const m=item.multiplier||1.5; const d=item.duration||5000; activeEffects.jump={multiplier:m,endTime:Date.now()+d}; addSystem(`Jump x${m} for ${d/1000}s!`); },
      drawEffect: function(c,player,time) { if(!activeEffects.jump||Date.now()>activeEffects.jump.endTime){delete activeEffects.jump;return;} const px=player.x+player.width/2,py=player.y+player.height; for(let i=0;i<4;i++){const a2=time*5+i*Math.PI/2;const r=8+Math.sin(time*8+i)*4;c.fillStyle=`rgba(68,204,68,${0.3+Math.sin(time*4+i)*0.15})`;c.fillRect(px+Math.cos(a2)*r-1.5,py+Math.sin(time*6+i)*3-1.5,3,3);} }
    },
    coin: {
      name: 'Coin', color: '#FFD700', toggleable: false,
      drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*3)*2); const sc=Math.abs(Math.cos(time*2))||0.1; c.scale(sc,1); c.fillStyle='#FFD700'; c.beginPath(); c.arc(0,0,8,0,Math.PI*2); c.fill(); c.strokeStyle='#DAA520'; c.lineWidth=1.5; c.stroke(); c.fillStyle='#DAA520'; c.font='bold 8px Inter'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('$',0,0); c.restore(); },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#FFD700'; c.beginPath(); c.arc(0,0,7*s,0,Math.PI*2); c.fill(); c.strokeStyle='#DAA520'; c.lineWidth=1*s; c.stroke(); c.fillStyle='#DAA520'; c.font=`bold ${7*s}px Inter`; c.textAlign='center'; c.textBaseline='middle'; c.fillText('$',0,0); c.restore(); },
      onCollect: function(p,item) { addSystem(`+${item.value||1} coin${(item.value||1)>1?'s':''}!`); }
    },
    heart: {
      name: 'Heart', color: '#EF4444', toggleable: false,
      drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*2)*2); const p=1+Math.sin(time*4)*0.1; c.scale(p,p); c.fillStyle='#EF4444'; c.beginPath(); c.moveTo(0,4); c.bezierCurveTo(-8,-2,-10,-8,-5,-10); c.bezierCurveTo(-2,-12,0,-9,0,-7); c.bezierCurveTo(0,-9,2,-12,5,-10); c.bezierCurveTo(10,-8,8,-2,0,4); c.fill(); c.restore(); },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#EF4444'; c.beginPath(); c.moveTo(0,4*s); c.bezierCurveTo(-7*s,-2*s,-9*s,-7*s,-4*s,-9*s); c.bezierCurveTo(-1*s,-10*s,0,-8*s,0,-6*s); c.bezierCurveTo(0,-8*s,1*s,-10*s,4*s,-9*s); c.bezierCurveTo(9*s,-7*s,7*s,-2*s,0,4*s); c.fill(); c.restore(); },
      onCollect: function(p,item) { const h=item.healAmount||25; if(p.hp!==undefined){p.hp=Math.min(p.maxHp||100,p.hp+h); addSystem(`+${h} HP!`);} }
    },
    key: {
      name: 'Key', color: '#DAA520', toggleable: false,
      drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*2)*2); c.rotate(Math.sin(time*1.5)*0.2); c.strokeStyle='#DAA520'; c.lineWidth=2; c.beginPath(); c.arc(0,-6,5,0,Math.PI*2); c.stroke(); c.fillStyle='rgba(218,165,32,0.3)'; c.fill(); c.fillStyle='#DAA520'; c.fillRect(-1,-1,2,14); c.fillRect(1,9,4,2); c.fillRect(1,5,3,2); c.restore(); },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.strokeStyle='#DAA520'; c.lineWidth=1.5*s; c.beginPath(); c.arc(0,-5*s,4*s,0,Math.PI*2); c.stroke(); c.fillStyle='rgba(218,165,32,0.3)'; c.fill(); c.fillStyle='#DAA520'; c.fillRect(-1*s,0,2*s,12*s); c.fillRect(1*s,8*s,3*s,2*s); c.fillRect(1*s,4*s,2*s,2*s); c.restore(); },
      onCollect: function() { addSystem('Key collected!'); }
    },
    battery: {
      name: 'Battery', color: '#44EE44', toggleable: false,
      drawWorld: function(c,x,y,time) {
        c.save(); c.translate(x,y+Math.sin(time*3)*2);
        const glow=0.3+Math.sin(time*4)*0.15;
        c.fillStyle=`rgba(68,238,68,${glow})`; c.beginPath(); c.arc(0,0,14,0,Math.PI*2); c.fill();
        c.fillStyle='#333'; c.fillRect(-4,-7,8,14);
        c.fillStyle='#555'; c.fillRect(-2,-9,4,3);
        c.fillStyle='#44EE44'; c.fillRect(-2,-4,4,8);
        const ch=8*(0.5+Math.sin(time*2)*0.3);
        c.fillStyle='#66FF66'; c.fillRect(-2,-4+(8-ch),4,ch);
        c.restore();
      },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#333'; c.fillRect(-3*s,-6*s,6*s,12*s); c.fillStyle='#555'; c.fillRect(-2*s,-8*s,4*s,3*s); c.fillStyle='#44EE44'; c.fillRect(-2*s,-3*s,4*s,7*s); c.restore(); },
      onCollect: function(p,item) { const r=item.recharge||25; horror.battery=Math.min(horror.maxBattery,horror.battery+r); addSystem(`+${r}% battery`); }
    },
    note: {
      name: 'Note', color: '#CCBB88', toggleable: false,
      drawWorld: function(c,x,y,time) {
        c.save(); c.translate(x,y+Math.sin(time*1.5)*1.5);
        const glow=0.2+Math.sin(time*3)*0.1;
        c.fillStyle=`rgba(204,187,136,${glow})`; c.beginPath(); c.arc(0,0,12,0,Math.PI*2); c.fill();
        c.fillStyle='#CCBB88'; c.fillRect(-6,-8,12,16);
        c.fillStyle='#AA9966'; c.fillRect(-4,-5,8,1); c.fillRect(-4,-2,6,1); c.fillRect(-4,1,7,1); c.fillRect(-4,4,5,1);
        c.restore();
      },
      drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#CCBB88'; c.fillRect(-5*s,-7*s,10*s,14*s); c.fillStyle='#AA9966'; c.fillRect(-3*s,-4*s,6*s,1*s); c.fillRect(-3*s,-1*s,5*s,1*s); c.fillRect(-3*s,2*s,6*s,1*s); c.restore(); },
      onCollect: function(p,item) { const t=item.text||'An old note...'; horror.scareMessages.push({text:`"${t}"`,timer:5,alpha:1,isNote:true}); addSystem('Found a note...'); }
    }
  };

  const UNKNOWN_VISUAL = {
    name: '???', color: '#666', toggleable: false,
    drawWorld: function(c,x,y,time) { c.save(); c.translate(x,y+Math.sin(time*2)*2); c.fillStyle='#444'; c.fillRect(-7,-7,14,14); c.fillStyle='#999'; c.font='bold 10px Inter'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('?',0,0); c.restore(); },
    drawHUD: function(c,x,y,sz) { c.save(); c.translate(x+sz/2,y+sz/2); const s=sz/52; c.fillStyle='#444'; c.fillRect(-6*s,-6*s,12*s,12*s); c.fillStyle='#999'; c.font=`bold ${8*s}px Inter`; c.textAlign='center'; c.textBaseline='middle'; c.fillText('?',0,0); c.restore(); }
  };

  function getVisual(id) { return ITEM_VISUALS[id] || UNKNOWN_VISUAL; }

  // ==================== DOOR DRAWING ====================

  function drawDoorFrame(c, x, y, w, h) {
    c.fillStyle = '#1a1a1a';
    c.fillRect(x - 3, y - 3, w + 6, h + 6);
    c.fillStyle = '#222';
    c.fillRect(x, y, w, h);
  }

  function drawDoorPanel(c, x, y, w, h, color, doorType, props, time) {
    // Main panel
    c.fillStyle = color;
    c.fillRect(x, y, w, h);

    // Top highlight
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x, y, w, 3);

    // Left highlight
    c.fillStyle = 'rgba(255,255,255,0.04)';
    c.fillRect(x, y, 3, h);

    // Bottom shadow
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(x, y + h - 3, w, 3);

    // Right shadow
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(x + w - 3, y, 3, h);

    if (doorType === 'key') {
      // Wood grain
      c.strokeStyle = 'rgba(0,0,0,0.08)';
      c.lineWidth = 1;
      for (let i = 6; i < h; i += 7) {
        c.beginPath(); c.moveTo(x + 3, y + i); c.lineTo(x + w - 3, y + i); c.stroke();
      }
      // Raised panels
      const pad = 6, panelH = h * 0.32;
      c.strokeStyle = 'rgba(0,0,0,0.12)';
      c.fillStyle = 'rgba(255,255,255,0.02)';
      c.fillRect(x + pad, y + h * 0.1, w - pad * 2, panelH);
      c.strokeRect(x + pad, y + h * 0.1, w - pad * 2, panelH);
      c.fillRect(x + pad, y + h * 0.55, w - pad * 2, panelH);
      c.strokeRect(x + pad, y + h * 0.55, w - pad * 2, panelH);
      // Handle + keyhole
      const hx = x + w - 12;
      c.fillStyle = '#B8860B';
      c.beginPath(); c.arc(hx, y + h * 0.45, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8B6914';
      c.beginPath(); c.arc(hx, y + h * 0.45, 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#DAA520';
      c.beginPath(); c.arc(hx, y + h * 0.55, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#111';
      c.beginPath(); c.arc(hx, y + h * 0.55, 1.5, 0, Math.PI * 2); c.fill();
      c.fillRect(hx - 0.8, y + h * 0.55 + 1.5, 1.6, 5);

    } else if (doorType === 'keycard') {
      const cc = getKeycardColor(props);
      // Metal lines
      c.strokeStyle = 'rgba(255,255,255,0.04)';
      c.lineWidth = 1;
      for (let i = 10; i < h; i += 12) {
        c.beginPath(); c.moveTo(x + 2, y + i); c.lineTo(x + w - 2, y + i); c.stroke();
      }
      // Color strips
      c.fillStyle = cc;
      c.fillRect(x, y, 3, h);
      c.fillRect(x + w - 3, y, 3, h);
      c.globalAlpha = 0.4;
      c.fillRect(x, y, w, 2);
      c.fillRect(x, y + h - 2, w, 2);
      c.globalAlpha = 1;
      // Card reader
      const crX = x + w - 18, crY = y + h / 2 - 14;
      c.fillStyle = '#1a1a1a';
      c.fillRect(crX, crY, 14, 28);
      c.fillStyle = cc;
      c.fillRect(crX + 2, crY + 6, 10, 3);
      // LED
      const blink = Math.sin(time * 3) > 0;
      c.fillStyle = blink ? cc : '#222';
      c.beginPath(); c.arc(crX + 7, crY + 20, 2.5, 0, Math.PI * 2); c.fill();

    } else {
      // Lever door - mechanical
      c.fillStyle = '#888';
      [[x+5,y+5],[x+w-5,y+5],[x+5,y+h-5],[x+w-5,y+h-5]].forEach(([rx,ry]) => {
        c.beginPath(); c.arc(rx,ry,2.5,0,Math.PI*2); c.fill();
        c.fillStyle = '#666'; c.beginPath(); c.arc(rx,ry,1,0,Math.PI*2); c.fill();
        c.fillStyle = '#888';
      });
      // Bars
      c.fillStyle = 'rgba(150,150,150,0.12)';
      c.fillRect(x + 3, y + h * 0.22, w - 6, 3);
      c.fillRect(x + 3, y + h * 0.78, w - 6, 3);
      // Gear
      c.strokeStyle = '#777'; c.lineWidth = 2;
      c.beginPath(); c.arc(x + w / 2, y + h / 2, 9, 0, Math.PI * 2); c.stroke();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        c.beginPath();
        c.moveTo(x+w/2+Math.cos(a+time)*9, y+h/2+Math.sin(a+time)*9);
        c.lineTo(x+w/2+Math.cos(a+time)*13, y+h/2+Math.sin(a+time)*13);
        c.stroke();
      }
      c.fillStyle = '#555';
      c.beginPath(); c.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2); c.fill();
    }
  }

  function drawDoorWithAnimation(c, m, time) {
    const mw = m.w || 40, mh = m.h || 80;
    const anim = doorAnimations[m.id];
    const rawProgress = anim ? anim.progress : 0;
    // Ease in-out
    const progress = rawProgress < 0.5
      ? 2 * rawProgress * rawProgress
      : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

    const dir = (m.properties && m.properties.direction) || 'right';
    const color = (m.properties && m.properties.color) ||
      (m.type === 'door_key' ? '#8B4513' : m.type === 'door_keycard' ? '#555' : '#555555');

    let doorType = 'key';
    if (m.type === 'door_keycard') doorType = 'keycard';
    else if (m.type === 'door_lever') doorType = 'lever';

    // Always draw frame
    drawDoorFrame(c, m.x, m.y, mw, mh);

    // Dark inside visible when open
    if (progress > 0.01) {
      c.fillStyle = `rgba(0,0,0,${0.4 + progress * 0.4})`;
      c.fillRect(m.x, m.y, mw, mh);
    }

    // Door panel slides
    if (progress < 0.98) {
      const slideAmount = mw * progress;

      c.save();
      // Clip to frame area so door doesn't draw outside
      c.beginPath();
      c.rect(m.x - 5, m.y - 5, mw + 10, mh + 10);
      c.clip();

      let panelX = m.x;
      if (dir === 'right') {
        panelX = m.x + slideAmount;
      } else if (dir === 'left') {
        panelX = m.x - slideAmount;
      }

      // For up/down sliding
      let panelY = m.y;
      let panelW = mw;
      let panelH = mh;

      if (dir === 'up') {
        panelY = m.y - mh * progress;
        panelX = m.x;
      } else if (dir === 'down') {
        panelY = m.y + mh * progress;
        panelX = m.x;
      }

      drawDoorPanel(c, panelX, panelY, panelW, panelH, color, doorType, m.properties, time);
      c.restore();
    }

    // Frame border on top
    c.strokeStyle = '#333';
    c.lineWidth = 1;
    c.strokeRect(m.x - 3, m.y - 3, mw + 6, mh + 6);

    // Top frame cap
    c.fillStyle = '#252525';
    c.fillRect(m.x - 5, m.y - 6, mw + 10, 4);

    // Bottom threshold
    c.fillStyle = '#252525';
    c.fillRect(m.x - 5, m.y + mh + 3, mw + 10, 3);

    // Lock indicator when closed
    if (progress < 0.05) {
      const iconX = m.x + mw / 2;
      const iconY = m.y - 12;
      c.fillStyle = doorType === 'key' ? '#DAA520' : doorType === 'keycard' ? getKeycardColor(m.properties) : '#888';
      c.font = 'bold 10px Inter';
      c.textAlign = 'center';
      const icon = doorType === 'key' ? '🔒' : doorType === 'keycard' ? '💳' : '⚙';
      c.fillText(icon, iconX, iconY);
    }
  }

  function getKeycardColor(props) {
    const cc = (props && props.keycardColor) || 'red';
    const colors = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
    return colors[cc] || colors.red;
  }

  function drawLever(c, x, y, w, h, activated, time) {
    c.fillStyle = '#444';
    c.fillRect(x, y + h - 8, w, 8);
    c.fillStyle = '#666';
    c.beginPath(); c.arc(x + w / 2, y + h - 8, 5, 0, Math.PI * 2); c.fill();
    const angle = activated ? 0.7 : -0.7;
    c.strokeStyle = '#888'; c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + w / 2, y + h - 8);
    c.lineTo(x + w / 2 + Math.sin(angle) * (h - 12), y + h - 8 - Math.cos(angle) * (h - 12));
    c.stroke();
    c.fillStyle = activated ? '#44CC44' : '#CC3333';
    c.beginPath();
    c.arc(x + w / 2 + Math.sin(angle) * (h - 12), y + h - 8 - Math.cos(angle) * (h - 12), 5, 0, Math.PI * 2);
    c.fill();
  }

  function drawKeycardPickup(c, x, y, w, h, props, time) {
    const cc = getKeycardColor(props);
    const rgb = cc === '#EF4444' ? '239,68,68' : cc === '#3B82F6' ? '59,130,246' : cc === '#22C55E' ? '34,197,94' : '234,179,8';
    const floatY = Math.sin(time * 2) * 3;
    c.save();
    c.translate(x + w / 2, y + h / 2 + floatY);
    c.rotate(Math.sin(time * 1.5) * 0.1);
    c.fillStyle = `rgba(${rgb},0.15)`;
    c.beginPath(); c.arc(0, 0, Math.max(w, h), 0, Math.PI * 2); c.fill();
    c.fillStyle = cc;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(-w / 2, -h / 2 + h * 0.3, w, h * 0.15);
    c.fillStyle = '#FFD700';
    c.fillRect(-w / 2 + 3, -h / 2 + 3, 6, 4);
    c.restore();
  }

  // ==================== MODEL COLLISION ====================

  function getModelCollisionBlocks() {
    const colBlocks = [];
    worldModels.forEach(m => {
      if (!m.type.startsWith('door_')) return;
      const anim = doorAnimations[m.id];
      const progress = anim ? anim.progress : 0;
      if (progress >= 0.95) return;
      const mw = m.w || 40, mh = m.h || 80;
      const dir = (m.properties && m.properties.direction) || 'right';
      let bx = m.x, by = m.y, bw = mw, bh = mh;
      if (dir === 'up') { bh = mh * (1 - progress); by = m.y + mh * progress; }
      else if (dir === 'down') { bh = mh * (1 - progress); }
      else if (dir === 'left') { bw = mw * (1 - progress); bx = m.x + mw * progress; }
      else { bw = mw * (1 - progress); }
      if (bw > 1 && bh > 1) colBlocks.push({ x: bx, y: by, w: bw, h: bh });
    });
    return colBlocks;
  }

  // ==================== INTERACTION ====================

  function handleInteract() {
    if (!myPlayer || interactCooldown > 0) return;
    interactCooldown = 0.3;
    const px = myPlayer.x + myPlayer.width / 2, py = myPlayer.y + myPlayer.height / 2;
    const range = 60;

    for (let i = 0; i < worldModels.length; i++) {
      const m = worldModels[i];
      const mw = m.w || 40, mh = m.h || 80;
      const mx = m.x + mw / 2, my = m.y + mh / 2;
      const dist = Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
      if (dist > range + Math.max(mw, mh) / 2) continue;

      if (m.type === 'lever') {
        if (!activatedLevers[m.id]) {
          activatedLevers[m.id] = true;
          if (m.properties && m.properties.targetId) openDoorById(m.properties.targetId);
          worldModels.forEach(d => { if (d.type === 'door_lever' && d.properties && d.properties.leverId === m.id) openDoorById(d.id); });
          showInteract('Lever activated!');
        } else if (!(m.properties && m.properties.oneTime)) {
          activatedLevers[m.id] = false;
          if (m.properties && m.properties.targetId) closeDoorById(m.properties.targetId);
          worldModels.forEach(d => { if (d.type === 'door_lever' && d.properties && d.properties.leverId === m.id) closeDoorById(d.id); });
          showInteract('Lever deactivated');
        }
        return;
      }
      if (m.type === 'door_key' && !openDoors[m.id]) {
        const keyIdx = myPlayer.inventory?.findIndex(it => it && it.id === 'key');
        if (keyIdx !== undefined && keyIdx !== -1) {
          openDoorById(m.id);
          myPlayer.inventory[keyIdx] = null;
          showInteract('Door unlocked!');
        } else { showInteract('You need a key!'); }
        return;
      }
      if (m.type === 'door_keycard' && !openDoors[m.id]) {
        const req = (m.properties && m.properties.keycardColor) || 'red';
        if (collectedKeycards[req]) { openDoorById(m.id); showInteract(`${req} keycard door opened!`); }
        else { showInteract(`Need ${req} keycard!`); }
        return;
      }
    }
  }

  function openDoorById(id) { openDoors[id] = true; doorAnimations[id] = { progress: doorAnimations[id]?.progress || 0, opening: true }; }
  function closeDoorById(id) { openDoors[id] = false; doorAnimations[id] = { progress: doorAnimations[id]?.progress || 1, opening: false }; }
  function showInteract(t) { interactMessages.push({ text: t, timer: 3, alpha: 1 }); addSystem(t); }

  function updateDoorAnimations(dt) {
    Object.keys(doorAnimations).forEach(id => {
      const a = doorAnimations[id];
      const m = worldModels.find(md => md.id === id);
      const spd = (m && m.properties && m.properties.openSpeed) || 2;
      if (a.opening) a.progress = Math.min(1, a.progress + spd * dt);
      else a.progress = Math.max(0, a.progress - spd * dt);
    });
  }

  function checkKeycardCollection() {
    if (!myPlayer) return;
    const px = myPlayer.x + myPlayer.width / 2, py = myPlayer.y + myPlayer.height / 2;
    worldModels.forEach(m => {
      if (m.type !== 'keycard' || collectedKeycards[m.id]) return;
      const mw = m.w || 30, mh = m.h || 20;
      if (Math.sqrt((px - (m.x + mw / 2)) ** 2 + (py - (m.y + mh / 2)) ** 2) < 35) {
        const color = (m.properties && m.properties.cardColor) || 'red';
        collectedKeycards[color] = true;
        collectedKeycards[m.id] = true;
        showInteract(`Collected ${color} keycard!`);
      }
    });
  }

  function getNearestInteractable() {
    if (!myPlayer) return null;
    const px = myPlayer.x + myPlayer.width / 2, py = myPlayer.y + myPlayer.height / 2;
    let nearest = null, nd = Infinity;
    worldModels.forEach(m => {
      const mw = m.w || 40, mh = m.h || 80;
      const d = Math.sqrt((px - m.x - mw / 2) ** 2 + (py - m.y - mh / 2) ** 2);
      const can = m.type === 'lever' || (m.type === 'door_key' && !openDoors[m.id]) || (m.type === 'door_keycard' && !openDoors[m.id]);
      if (can && d < 60 + Math.max(mw, mh) / 2 && d < nd) { nearest = m; nd = d; }
    });
    return nearest;
  }

  // ==================== RESIZE ====================
  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const socket = io();

  function setLoading(p, t) { document.getElementById('loader-fill').style.width = p + '%'; document.getElementById('loader-text').textContent = t; }
  setLoading(20, 'Connecting...');

  // ==================== SOCKET EVENTS ====================
  socket.on('connect', () => { setLoading(40, 'Authenticating...'); socket.emit('join-game', { token, place: placeName }); });

  socket.on('game-init', (data) => {
    setLoading(60, 'Loading TuGame...');
    placeData = data.place;
    myPlayer = data.player;
    myId = data.player.id;
    myPlayer.currentCheckpointIndex = -1;
    myPlayer.attackStartTime = 0;
    myPlayer._isMe = true;

    worldCollectibles = []; collectedIds = new Set(); activeEffects = {};
    worldModels = []; openDoors = {}; doorAnimations = {};
    activatedLevers = {}; collectedKeycards = {};
    flashlightOn = true; shieldActive = true;

    if (placeData.horror || placeData.darkness) {
      horror.active = true;
      horror.battery = placeData.flashlightBattery || 100;
      horror.maxBattery = placeData.flashlightBattery || 100;
      horror.drainRate = placeData.batteryDrainRate || 0.8;
      horror.rechargeRate = placeData.batteryRechargeRate || 0.3;
      horror.triggeredScares = new Set(); horror.ambientParticles = [];
      horror.scareMessages = []; horror.eyesSpots = []; horror.chaseShadow = null;
      for (let i = 0; i < 30; i++) horror.ambientParticles.push({ x: Math.random() * 5600, y: Math.random() * 900, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2, size: 1 + Math.random() * 2, alpha: Math.random() * 0.3 });
    }

    if (placeData.settings && typeof placeData.settings === 'object') {
      const s = placeData.settings;
      if (s.darknessEnabled) {
        horror.active = true; horror.battery = s.batteryMax || 100; horror.maxBattery = s.batteryMax || 100;
        horror.drainRate = s.batteryDrain || 0.8; horror.rechargeRate = s.batteryRegen || 0.3;
        if (!placeData.flashlightRadius) placeData.flashlightRadius = s.flashlightRadius || 220;
        if (!placeData.flashlightBrightness) placeData.flashlightBrightness = s.flashlightBrightness || 1.2;
        if (!placeData.flashlightSpread) placeData.flashlightSpread = s.flashlightSpread || 0.45;
        if (!placeData.ambientLight) placeData.ambientLight = s.ambientLight || 0.02;
        if (!placeData.flickerChance) placeData.flickerChance = s.flickerChance || 0.003;
        if (s.particles) placeData.ambientParticles = true;
        if (s.breathing) placeData.breathingEffect = true;
        if (s.footstepShake) placeData.footstepShake = true;
      }
      if (s.fogEnabled) placeData.fog = { enabled: true, color: s.fogColor, density: s.fogDensity, start: s.fogStart, end: s.fogEnd };
      if (s.vignette) placeData.vignette = { enabled: true, intensity: s.vignetteIntensity, color: s.vignetteColor };
      if (s.tintEnabled) placeData.tint = { enabled: true, color: s.tintColor, opacity: s.tintOpacity };
    }

    if (placeData.collectibleItems && Array.isArray(placeData.collectibleItems)) {
      placeData.collectibleItems.forEach((ci, idx) => { worldCollectibles.push({ id: 'wc_' + idx, type: ci.type, x: ci.x, y: ci.y, properties: ci.properties || {}, collected: false, collectOnTouch: ci.collectOnTouch !== false }); });
    }

    if (placeData.items && Array.isArray(placeData.items)) {
      placeData.items.forEach((item, idx) => {
        if (!item) return;
        if (item.giveOnStart) {
          if (myPlayer.inventory) { const es = myPlayer.inventory.findIndex(s => s === null || s === undefined); if (es !== -1) myPlayer.inventory[es] = { id: item.type, ...(item.properties || {}) }; }
          collectedIds.add(item.id);
        } else {
          worldCollectibles.push({ id: item.id || ('si_' + idx), type: item.type, x: item.x, y: item.y, properties: item.properties || {}, collected: false, collectOnTouch: item.collectOnTouch !== false });
        }
      });
    }

    if (placeData.models && Array.isArray(placeData.models)) {
      placeData.models.forEach(m => { if (!m) return; worldModels.push({ id: m.id, type: m.type, x: m.x, y: m.y, w: m.w || (m.type === 'lever' ? 30 : m.type === 'keycard' ? 30 : 40), h: m.h || (m.type === 'lever' ? 40 : m.type === 'keycard' ? 20 : 80), properties: m.properties || {} }); });
    }

    remotePlayers = {};
    for (const [id, p] of Object.entries(data.players)) {
      if (id !== myId) remotePlayers[id] = { ...p, targetX: p.x, targetY: p.y, displayX: p.x, displayY: p.y, attackStartTime: 0, itemState: {} };
    }

    document.getElementById('hud-place').textContent = data.place.name;
    updatePlayerCount(); updateMobileButtons(); updateMobileSlots();

    setLoading(100, 'Ready!');
    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls.style.opacity = '0';
      setTimeout(() => {
        ls.style.display = 'none'; gameReady = true;
        addSystem(`Welcome to ${data.place.name}!`);
        if (horror.active) { addSystem("It's dark... Press F for flashlight"); }
        if (worldModels.length > 0) addSystem('Press E to interact');
        if (isMobile) addSystem('Touch controls enabled');
        if (myPlayer.inventory) myPlayer.inventory.forEach(item => { if (item) addSystem(`Equipped: ${getVisual(item.id).name}`); });
      }, 500);
    }, 400);
  });

  socket.on('player-joined', (p) => { remotePlayers[p.id] = { ...p, targetX: p.x, targetY: p.y, displayX: p.x, displayY: p.y, attackStartTime: 0, itemState: {} }; updatePlayerCount(); addSystem(`${p.username} joined`); });
  socket.on('player-left', (d) => { const p = remotePlayers[d.id]; if (p) addSystem(`${p.username} left`); delete remotePlayers[d.id]; updatePlayerCount(); if (escMenuOpen) updateEscMenu(); });
  socket.on('player-moved', (d) => { const p = remotePlayers[d.id]; if (!p) return; p.targetX=d.x; p.targetY=d.y; p.vx=d.vx; p.vy=d.vy; p.direction=d.direction; p.state=d.state; p.frame=d.frame; p.activeSlot=d.activeSlot; p.hp=d.hp; if(d.itemState) p.itemState=d.itemState; });
  socket.on('player-respawn', (d) => { if (myPlayer) { deathAnim.active=true; deathAnim.timer=0; deathAnim.oldX=myPlayer.x; deathAnim.oldY=myPlayer.y; deathAnim.newX=d.x; deathAnim.newY=d.y; deathAnim.newHp=d.hp; } });
  socket.on('player-hit', (d) => { if(myPlayer){ const si=myPlayer.inventory?.[myPlayer.activeSlot]; if(si&&si.id==='shield'&&shieldActive&&Math.random()<(si.blockChance||0.5)){addSystem('Shield blocked!');return;} myPlayer.hp=d.hp; myPlayer.vx+=d.knockX; myPlayer.vy+=d.knockY; } });
  socket.on('player-attack', (d) => { const p=remotePlayers[d.id]; if(p){p.attacking=true;p.attackStartTime=Date.now();} });
  socket.on('inventory-update', (d) => { if(myPlayer){myPlayer.inventory=d.inventory; updateMobileButtons(); updateMobileSlots();} });
  socket.on('kill-feed', (d) => addSystem(`${d.killer} eliminated ${d.victim}`));
  socket.on('chat-message', (d) => addChat(d.username, d.msg));
  socket.on('error-msg', (m) => { alert(m); window.location.href = '/home'; });
  socket.on('kicked', (reason) => { gameReady=false; const o=document.getElementById('kicked-overlay'); if(o) o.style.display='flex'; const r=document.getElementById('kicked-reason'); if(r) r.textContent=reason||'Disconnected'; });
  socket.on('disconnect', () => {});

  // ==================== TOGGLE ====================
  function toggleActiveItem() {
    if (!myPlayer) return;
    const item = myPlayer.inventory?.[myPlayer.activeSlot];
    if (!item) return;
    const v = getVisual(item.id);
    if (!v.toggleable) return;
    if (item.id === 'flashlight') { flashlightOn = !flashlightOn; addSystem(flashlightOn ? 'Flashlight ON' : 'Flashlight OFF'); }
    else if (item.id === 'shield') { shieldActive = !shieldActive; addSystem(shieldActive ? 'Shield raised' : 'Shield lowered'); }
    updateMobileUseButton();
  }

  // ==================== MOBILE ====================
  function updateMobileButtons() {
    if (!isMobile || !myPlayer) return;
    const has = myPlayer.inventory?.some(i => i && i.id === 'sword');
    const ab = document.getElementById('mobile-btn-attack');
    if (ab) ab.style.display = (placeData?.type === 'pvp' || has) ? 'flex' : 'none';
    updateMobileUseButton();
  }
  function updateMobileUseButton() {
    if (!isMobile || !myPlayer) return;
    const ub = document.getElementById('mobile-btn-use'); if (!ub) return;
    const item = myPlayer.inventory?.[myPlayer.activeSlot];
    if (!item) { ub.style.display = 'none'; return; }
    const v = getVisual(item.id);
    if (!v.toggleable) { ub.style.display = 'none'; return; }
    ub.style.display = 'flex';
  }
  function updateMobileSlots() {
    if (!isMobile || !myPlayer) return;
    document.querySelectorAll('.mobile-slot').forEach(btn => {
      const slot = parseInt(btn.dataset.slot); const item = myPlayer.inventory?.[slot];
      btn.classList.toggle('active', slot === myPlayer.activeSlot);
      btn.classList.toggle('has-item', !!item);
      const od = btn.querySelector('.mobile-slot-dot'); if (od) od.remove();
      if (item) { const v = getVisual(item.id); btn.textContent = v.name.substring(0, 2).toUpperCase(); btn.style.borderColor = slot === myPlayer.activeSlot ? v.color : `${v.color}44`; const d = document.createElement('div'); d.className = 'mobile-slot-dot'; d.style.background = v.color; btn.appendChild(d); }
      else { btn.textContent = String(slot + 1); btn.style.borderColor = ''; }
    });
  }

  // ==================== KEYBOARD ====================
  window.addEventListener('keydown', (e) => {
    if (chatOpen) { if (e.key === 'Enter') { const m = document.getElementById('chat-input').value.trim(); if (m) socket.emit('chat-message', { msg: m }); closeChat(); e.preventDefault(); return; } if (e.key === 'Escape') { closeChat(); e.preventDefault(); return; } return; }
    if (e.key === 'Escape') { toggleEsc(); e.preventDefault(); return; }
    if (escMenuOpen) return;
    if (e.key === 'Enter') { openChat(); e.preventDefault(); return; }
    if (e.key >= '1' && e.key <= '4') { const s = parseInt(e.key) - 1; if (myPlayer) { myPlayer.activeSlot = s; socket.emit('switch-slot', { slot: s }); updateMobileButtons(); updateMobileSlots(); } e.preventDefault(); return; }
    if (e.key === 'f' || e.key === 'F') { toggleActiveItem(); e.preventDefault(); return; }
    if (e.key === 'e' || e.key === 'E') { handleInteract(); e.preventDefault(); return; }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { keys = {}; });
  canvas.addEventListener('mousedown', (e) => { if (!gameReady || escMenuOpen || chatOpen || !myPlayer || deathAnim.active || isMobile) return; if (e.button === 0) doAttack(); });

  function doAttack() {
    if (!myPlayer) return;
    const item = myPlayer.inventory?.[myPlayer.activeSlot];
    if (item && item.id === 'sword') { const now = Date.now(); if (now - myPlayer.attackStartTime > ATTACK_DURATION) { socket.emit('attack', {}); myPlayer.attacking = true; myPlayer.attackStartTime = now; } }
  }

  // ==================== MOBILE CONTROLS ====================
  function initMobileControls() {
    if (!isMobile) return;
    document.getElementById('mobile-controls').style.display = 'block';
    const jz = document.getElementById('mobile-joystick-zone');
    const je = document.getElementById('mobile-joystick');
    const ke = document.getElementById('mobile-joystick-knob');
    const jb = document.getElementById('mobile-btn-jump');
    const ab = document.getElementById('mobile-btn-attack');
    const ub = document.getElementById('mobile-btn-use');
    const cb = document.getElementById('mobile-btn-chat');
    const mb = document.getElementById('mobile-btn-menu');
    const JR = 50, DZ = 10;
    let jtid = null;
    jz.addEventListener('touchstart', (e) => { if (jtid !== null) return; e.preventDefault(); const t = e.changedTouches[0]; jtid = t.identifier; const r = jz.getBoundingClientRect(); const cx = t.clientX - r.left, cy = t.clientY - r.top; je.style.left = (cx - JR) + 'px'; je.style.top = (cy - JR) + 'px'; je.classList.add('active'); joystick.active = true; joystick.startX = cx; joystick.startY = cy; joystick.dx = 0; joystick.dy = 0; ke.style.transform = 'translate(0px,0px)'; }, { passive: false });
    jz.addEventListener('touchmove', (e) => { e.preventDefault(); for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; if (t.identifier !== jtid) continue; const r = jz.getBoundingClientRect(); let dx = t.clientX - r.left - joystick.startX, dy = t.clientY - r.top - joystick.startY; const d = Math.sqrt(dx * dx + dy * dy); if (d > JR) { dx = dx / d * JR; dy = dy / d * JR; } joystick.dx = Math.abs(dx) > DZ ? dx / JR : 0; joystick.dy = Math.abs(dy) > DZ ? dy / JR : 0; ke.style.transform = `translate(${dx}px,${dy}px)`; } }, { passive: false });
    function rj() { jtid = null; joystick.active = false; joystick.dx = 0; joystick.dy = 0; ke.style.transform = 'translate(0px,0px)'; je.classList.remove('active'); }
    jz.addEventListener('touchend', (e) => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === jtid) rj(); });
    jz.addEventListener('touchcancel', (e) => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === jtid) rj(); });
    jb.addEventListener('touchstart', (e) => { e.preventDefault(); mobileJump = true; jb.classList.add('pressed'); }, { passive: false });
    jb.addEventListener('touchend', (e) => { e.preventDefault(); mobileJump = false; jb.classList.remove('pressed'); });
    jb.addEventListener('touchcancel', () => { mobileJump = false; jb.classList.remove('pressed'); });
    ab.addEventListener('touchstart', (e) => { e.preventDefault(); mobileAttack = true; ab.classList.add('pressed'); doAttack(); }, { passive: false });
    ab.addEventListener('touchend', (e) => { e.preventDefault(); mobileAttack = false; ab.classList.remove('pressed'); });
    ab.addEventListener('touchcancel', () => { mobileAttack = false; ab.classList.remove('pressed'); });
    ub.addEventListener('touchstart', (e) => { e.preventDefault(); ub.classList.add('pressed'); toggleActiveItem(); }, { passive: false });
    ub.addEventListener('touchend', (e) => { e.preventDefault(); ub.classList.remove('pressed'); });
    ub.addEventListener('touchcancel', () => { ub.classList.remove('pressed'); });
    cb.addEventListener('touchstart', (e) => { e.preventDefault(); if (chatOpen) closeChat(); else openChat(); }, { passive: false });
    mb.addEventListener('touchstart', (e) => { e.preventDefault(); toggleEsc(); }, { passive: false });
    document.querySelectorAll('.mobile-slot').forEach(btn => { btn.addEventListener('touchstart', (e) => { e.preventDefault(); const s = parseInt(btn.dataset.slot); if (myPlayer) { myPlayer.activeSlot = s; socket.emit('switch-slot', { slot: s }); updateMobileButtons(); updateMobileSlots(); } }, { passive: false }); });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  }

  // ==================== CHAT ====================
  function openChat() { chatOpen = true; document.getElementById('chat-input-container').style.display = 'block'; const ci = document.getElementById('chat-input'); ci.value = ''; ci.focus(); keys = {}; }
  function closeChat() { chatOpen = false; document.getElementById('chat-input-container').style.display = 'none'; document.getElementById('chat-input').blur(); keys = {}; }
  function addChat(u, m) { const d = document.createElement('div'); d.className = 'chat-msg'; d.innerHTML = `<span class="chat-user">${esc(u)}:</span><span class="chat-text">${esc(m)}</span>`; const cm = document.getElementById('chat-messages'); cm.appendChild(d); cm.scrollTop = cm.scrollHeight; setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 10000); }
  function addSystem(m) { const d = document.createElement('div'); d.className = 'chat-msg system'; d.textContent = m; const cm = document.getElementById('chat-messages'); cm.appendChild(d); cm.scrollTop = cm.scrollHeight; setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 5000); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ==================== ESC MENU ====================
  function toggleEsc() { escMenuOpen = !escMenuOpen; document.getElementById('esc-menu').style.display = escMenuOpen ? 'block' : 'none'; keys = {}; if (escMenuOpen) updateEscMenu(); }
  function updateEscMenu() { const l = document.getElementById('menu-player-list'); l.innerHTML = ''; const all = []; if (myPlayer) all.push({ ...myPlayer, isMe: true }); for (const [, p] of Object.entries(remotePlayers)) all.push({ ...p, isMe: false }); document.getElementById('menu-player-count').textContent = `(${all.length})`; all.forEach(p => { const item = document.createElement('div'); item.className = 'player-list-item'; const av = document.createElement('div'); av.className = 'player-avatar-mini'; const mc = document.createElement('canvas'); mc.width = 32; mc.height = 32; av.appendChild(mc); TC.drawMini(mc, p.avatar); const nm = document.createElement('span'); nm.className = 'player-name'; nm.textContent = p.username; item.appendChild(av); item.appendChild(nm); if (p.isMe) { const y = document.createElement('span'); y.className = 'player-you'; y.textContent = 'YOU'; item.appendChild(y); } l.appendChild(item); }); }
  document.getElementById('btn-resume').addEventListener('click', () => toggleEsc());
  document.getElementById('btn-leave').addEventListener('click', () => { window.location.href = '/home'; });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!myPlayer || !placeData) return;
    myPlayer.x = placeData.spawnX; myPlayer.y = placeData.spawnY; myPlayer.vx = 0; myPlayer.vy = 0;
    myPlayer.hp = myPlayer.maxHp || 100; myPlayer.currentCheckpointIndex = -1;
    myPlayer.checkpoint = { x: placeData.spawnX, y: placeData.spawnY };
    activeEffects = {}; flashlightOn = true; shieldActive = true;
    openDoors = {}; doorAnimations = {}; activatedLevers = {}; collectedKeycards = {};
    worldModels.forEach(m => { if (m.type === 'keycard') delete collectedKeycards[m.id]; });
    if (horror.active) { horror.battery = horror.maxBattery; horror.triggeredScares = new Set(); horror.scareMessages = []; horror.eyesSpots = []; horror.chaseShadow = null; }
    updateMobileButtons(); toggleEsc(); addSystem('Reset to spawn');
  });
  function updatePlayerCount() { const c = 1 + Object.keys(remotePlayers).length; document.getElementById('hud-players').textContent = `${c} player${c !== 1 ? 's' : ''}`; }

  // ==================== HORROR UPDATE ====================
  function updateHorror(dt) {
    if (!horror.active || !myPlayer) return;
    const time = Date.now() / 1000;
    const px = myPlayer.x + myPlayer.width / 2, py = myPlayer.y + myPlayer.height / 2;
    if (flashlightOn) { horror.battery -= horror.drainRate * dt; if (horror.battery <= 0) { horror.battery = 0; flashlightOn = false; addSystem('Battery dead!'); updateMobileUseButton(); } }
    else { horror.battery += horror.rechargeRate * dt; if (horror.battery > horror.maxBattery) horror.battery = horror.maxBattery; }
    if (flashlightOn && horror.battery < 20 && Math.random() < (placeData.flickerChance || 0.003) * (1 + (20 - horror.battery) / 10)) { horror.flickering = true; horror.flickerTimer = 0.05 + Math.random() * 0.15; }
    if (horror.flickering) { horror.flickerTimer -= dt; if (horror.flickerTimer <= 0) horror.flickering = false; }
    if (placeData.breathingEffect) horror.breathPhase += dt * (horror.nearScare ? 4 : 1.5);
    if (placeData.footstepShake && myPlayer.state === 'run' && myPlayer.onGround) { horror.shakeX = (Math.random() - 0.5) * 1.5; horror.shakeY = (Math.random() - 0.5) * 1; } else { horror.shakeX *= 0.8; horror.shakeY *= 0.8; }
    horror.nearScare = false;
    if (placeData.scareEvents) { for (const s of placeData.scareEvents) { if (Math.sqrt((px - s.x) ** 2 + (py - s.y) ** 2) < s.triggerRadius * 1.5 && !horror.triggeredScares.has(s.x + '_' + s.y)) { horror.nearScare = true; break; } } }
    horror.heartbeat += dt * (horror.nearScare ? 6 : 2);
    if (placeData.scareEvents) { for (const s of placeData.scareEvents) { const k = s.x + '_' + s.y; if (s.once && horror.triggeredScares.has(k)) continue; if (Math.sqrt((px - s.x) ** 2 + (py - s.y) ** 2) < s.triggerRadius) { horror.triggeredScares.add(k); triggerScare(s); } } }
    if (horror.chaseShadow) { horror.chaseShadow.timer -= dt; if (horror.chaseShadow.timer <= 0) horror.chaseShadow = null; else { horror.chaseShadow.x += (px > horror.chaseShadow.x ? 1 : -1) * horror.chaseShadow.speed * dt * 60; horror.chaseShadow.y += (py - horror.chaseShadow.y) * 0.02; } }
    if (placeData.ambientParticles) { horror.ambientParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha = 0.1 + Math.sin(time * 2 + p.x * 0.01) * 0.15; if (p.x < camera.x - 100) p.x = camera.x + canvas.width + 100; if (p.x > camera.x + canvas.width + 100) p.x = camera.x - 100; }); }
    horror.scareMessages = horror.scareMessages.filter(m => { m.timer -= dt; m.alpha = Math.min(1, m.timer / 0.5); return m.timer > 0; });
    horror.eyesSpots = horror.eyesSpots.filter(e => { e.timer -= dt; e.alpha = Math.min(0.8, e.timer / 0.5); return e.timer > 0; });
    if (horror.activeScare) { horror.scareTimer -= dt; if (horror.scareTimer <= 0) horror.activeScare = null; }
  }

  function triggerScare(s) {
    if (s.type === 'shadow') { horror.scareMessages.push({ text: s.message || '...', timer: 3, alpha: 1 }); horror.flickering = true; horror.flickerTimer = 0.3; }
    else if (s.type === 'flicker') { horror.activeScare = 'flicker'; horror.scareTimer = (s.duration || 2000) / 1000; }
    else if (s.type === 'sound_text') { horror.scareMessages.push({ text: s.message || '*....*', timer: 3, alpha: 1 }); horror.shakeX = (Math.random() - 0.5) * 4; horror.shakeY = (Math.random() - 0.5) * 3; }
    else if (s.type === 'eyes') { for (let i = 0; i < 3; i++) horror.eyesSpots.push({ x: s.x + (Math.random() - 0.5) * 200, y: s.y + (Math.random() - 0.5) * 100 - 50, timer: 2 + Math.random() * 2, alpha: 0.8, size: 2 + Math.random() * 2 }); horror.scareMessages.push({ text: 'Something is watching...', timer: 3, alpha: 1 }); }
    else if (s.type === 'chase_shadow') { horror.chaseShadow = { x: s.x + 300, y: s.y, speed: s.speed || 2, timer: (s.duration || 4000) / 1000 }; horror.scareMessages.push({ text: 'RUN!', timer: 2, alpha: 1 }); }
    else if (s.type === 'blackout') { horror.activeScare = 'blackout'; horror.scareTimer = (s.duration || 3000) / 1000; if (s.message) horror.scareMessages.push({ text: s.message, timer: 3, alpha: 1 }); flashlightOn = false; updateMobileUseButton(); }
  }

  // ==================== PHYSICS ====================
  function updatePlayer(dt) {
    if (!myPlayer || !placeData || !gameReady || escMenuOpen || chatOpen) return;
    if (deathAnim.active) { deathAnim.timer += dt; if (deathAnim.timer >= deathAnim.duration) { deathAnim.active = false; myPlayer.x = deathAnim.newX; myPlayer.y = deathAnim.newY; myPlayer.vx = 0; myPlayer.vy = 0; myPlayer.hp = deathAnim.newHp; activeEffects = {}; flashlightOn = true; shieldActive = true; if (horror.active) horror.battery = horror.maxBattery; updateMobileButtons(); } return; }

    const p = myPlayer;
    let mx = 0, wj = false;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    wj = keys['KeyW'] || keys['ArrowUp'] || keys['Space'];
    if (isMobile && joystick.active) { if (Math.abs(joystick.dx) > 0.15) mx = joystick.dx > 0 ? 1 : -1; if (joystick.dy < -0.5) wj = true; }
    if (mobileJump) wj = true;
    if (mx !== 0) p.direction = mx;

    let spd = placeData.playerSpeed;
    if (activeEffects.speed && Date.now() < activeEffects.speed.endTime) spd *= activeEffects.speed.multiplier;
    p.vx = mx * spd;
    p.vy += placeData.gravity;
    if (p.vy > placeData.maxFallSpeed) p.vy = placeData.maxFallSpeed;
    let jf = placeData.jumpForce;
    if (activeEffects.jump && Date.now() < activeEffects.jump.endTime) jf *= activeEffects.jump.multiplier;
    if (wj && p.onGround) { p.vy = jf; p.onGround = false; }

    p.x += p.vx; resolve(p, 'x');
    p.y += p.vy; p.onGround = false; resolve(p, 'y');

    if (!p.onGround) p.state = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 0.5) p.state = 'run';
    else p.state = 'idle';

    animTime += dt;
    if (p.state === 'run') p.frame = Math.floor(animTime / 0.1) % 4;
    else if (p.state === 'idle') p.frame = Math.floor(animTime / 0.5) % 2;
    else p.frame = 0;

    const now = Date.now();
    if (p.attacking && now - p.attackStartTime > ATTACK_DURATION) p.attacking = false;

    if (placeData.checkpoints) placeData.checkpoints.forEach((cp, i) => { if (i > p.currentCheckpointIndex && ov(p.x, p.y, p.width, p.height, cp.x, cp.y, cp.w, cp.h)) { p.currentCheckpointIndex = i; p.checkpoint = { x: cp.x, y: cp.y - 10 }; socket.emit('checkpoint-reached', p.checkpoint); addSystem('Checkpoint!'); } });

    checkCollectibles();
    checkKeycardCollection();
    updateDoorAnimations(dt);
    updateHorror(dt);
    if (interactCooldown > 0) interactCooldown -= dt;
    interactMessages = interactMessages.filter(m => { m.timer -= dt; m.alpha = Math.min(1, m.timer / 0.5); return m.timer > 0; });

    if (now - lastSendTime > SEND_RATE) {
      socket.emit('player-update', { x: p.x, y: p.y, vx: p.vx, vy: p.vy, direction: p.direction, state: p.state, frame: p.frame, onGround: p.onGround, activeSlot: p.activeSlot, attacking: p.attacking, itemState: { flashlightOn, shieldActive } });
      lastSendTime = now;
    }
  }

  function checkCollectibles() {
    if (!myPlayer || !worldCollectibles.length) return;
    const px = myPlayer.x + myPlayer.width / 2, py = myPlayer.y + myPlayer.height / 2;
    worldCollectibles.forEach(ci => {
      if (ci.collected || collectedIds.has(ci.id)) return;
      if (ci.collectOnTouch === false) return;
      if (Math.sqrt((px - ci.x) ** 2 + (py - ci.y) ** 2) < 30) {
        ci.collected = true; collectedIds.add(ci.id);
        const v = getVisual(ci.type);
        if (v.onCollect) v.onCollect(myPlayer, ci.properties);
        else addSystem(`Collected ${v.name}!`);
        socket.emit('collect-item', { item: { id: ci.type, name: v.name, ...(ci.properties || {}) } });
        updateMobileButtons(); updateMobileSlots();
      }
    });
  }

  function resolve(p, axis) {
    if (placeData.platforms && Array.isArray(placeData.platforms)) { for (const pl of placeData.platforms) { if (ov(p.x,p.y,p.width,p.height,pl.x,pl.y,pl.w,pl.h)) { if(axis==='x'){if(p.vx>0)p.x=pl.x-p.width;else if(p.vx<0)p.x=pl.x+pl.w;p.vx=0;}else{if(p.vy>0){p.y=pl.y-p.height;p.vy=0;p.onGround=true;}else if(p.vy<0){p.y=pl.y+pl.h;p.vy=0;}} } } }
    if (placeData.blocks && Array.isArray(placeData.blocks)) { for (const bl of placeData.blocks) { if (ov(p.x,p.y,p.width,p.height,bl.x,bl.y,bl.w,bl.h)) { if(axis==='x'){if(p.vx>0)p.x=bl.x-p.width;else if(p.vx<0)p.x=bl.x+bl.w;p.vx=0;}else{if(p.vy>0){p.y=bl.y-p.height;p.vy=0;p.onGround=true;}else if(p.vy<0){p.y=bl.y+bl.h;p.vy=0;}} } } }
    const db = getModelCollisionBlocks();
    for (const d of db) { if (ov(p.x,p.y,p.width,p.height,d.x,d.y,d.w,d.h)) { if(axis==='x'){if(p.vx>0)p.x=d.x-p.width;else if(p.vx<0)p.x=d.x+d.w;p.vx=0;}else{if(p.vy>0){p.y=d.y-p.height;p.vy=0;p.onGround=true;}else if(p.vy<0){p.y=d.y+d.h;p.vy=0;}} } }
  }
  function ov(x1,y1,w1,h1,x2,y2,w2,h2) { return x1<x2+w2&&x1+w1>x2&&y1<y2+h2&&y1+h1>y2; }

  function updateCamera() {
    if (!myPlayer) return;
    let tx, ty;
    if (deathAnim.active) { tx = deathAnim.oldX + myPlayer.width / 2 - canvas.width / 2; ty = deathAnim.oldY + myPlayer.height / 2 - canvas.height / 2; }
    else { tx = myPlayer.x + myPlayer.width / 2 - canvas.width / 2; ty = myPlayer.y + myPlayer.height / 2 - canvas.height / 2; }
    camera.x += (tx - camera.x) * 0.08; camera.y += (ty - camera.y) * 0.08;
    if (horror.active) { camera.x += horror.shakeX; camera.y += horror.shakeY; }
  }

  // ==================== RENDER ====================
  function render() {
    const isH = horror.active;
    const bg = (placeData?.settings?.bgColor) || (isH ? '#000' : '#0a0a0a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameReady || !placeData || !myPlayer) return;

    const time = Date.now() / 1000, now = Date.now();

    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    if (!isH) { const sx=Math.floor(camera.x/60)*60,sy=Math.floor(camera.y/60)*60,ex=sx+canvas.width+120,ey=sy+canvas.height+120; ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.beginPath(); for(let gx=sx;gx<=ex;gx+=60){ctx.moveTo(gx,sy);ctx.lineTo(gx,ey);} for(let gy=sy;gy<=ey;gy+=60){ctx.moveTo(sx,gy);ctx.lineTo(ex,gy);} ctx.stroke(); }

    if (placeData.checkpoints) { placeData.checkpoints.forEach((cp,i) => { const a=myPlayer.currentCheckpointIndex>=i; const g=Math.sin(time*3)*0.3+0.7; ctx.fillStyle=a?(isH?'#2a6a2a':'#4ade80'):'#222'; ctx.fillRect(cp.x+18,cp.y-30,3,70); ctx.fillStyle=a?`rgba(74,222,128,${g*(isH?0.3:1)})`:'rgba(50,50,50,0.3)'; ctx.beginPath(); ctx.moveTo(cp.x+21,cp.y-30); ctx.lineTo(cp.x+45,cp.y-20); ctx.lineTo(cp.x+21,cp.y-10); ctx.fill(); }); }

    if (placeData.platforms && Array.isArray(placeData.platforms)) { placeData.platforms.forEach(pl => { if(pl.x+pl.w<camera.x-50||pl.x>camera.x+canvas.width+50||pl.y+pl.h<camera.y-50||pl.y>camera.y+canvas.height+50) return; ctx.globalAlpha=pl.opacity!==undefined?pl.opacity:1; ctx.fillStyle=pl.color||'#333'; ctx.fillRect(pl.x,pl.y,pl.w,pl.h); ctx.fillStyle=isH?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.05)'; ctx.fillRect(pl.x,pl.y,pl.w,2); if(pl.text){ctx.fillStyle=pl.textColor||'#fff';ctx.font=`${pl.textSize||14}px ${pl.textFont||'Inter'}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pl.text,pl.x+pl.w/2,pl.y+pl.h/2);} ctx.globalAlpha=1; }); }
    if (placeData.blocks && Array.isArray(placeData.blocks)) { placeData.blocks.forEach(bl => { if(bl.x+bl.w<camera.x-50||bl.x>camera.x+canvas.width+50||bl.y+bl.h<camera.y-50||bl.y>camera.y+canvas.height+50) return; ctx.globalAlpha=bl.opacity!==undefined?bl.opacity:1; ctx.fillStyle=bl.color||'#333'; ctx.fillRect(bl.x,bl.y,bl.w,bl.h); ctx.fillStyle=isH?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.05)'; ctx.fillRect(bl.x,bl.y,bl.w,2); if(bl.text){ctx.fillStyle=bl.textColor||'#fff';ctx.font=`${bl.textSize||14}px ${bl.textFont||'Inter'}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(bl.text,bl.x+bl.w/2,bl.y+bl.h/2);} ctx.globalAlpha=1; }); }

    // Models
    worldModels.forEach(m => {
      if (m.type === 'keycard' && collectedKeycards[m.id]) return;
      const mw = m.w || 40, mh = m.h || 80;
      if (m.type.startsWith('door_')) drawDoorWithAnimation(ctx, m, time);
      else if (m.type === 'lever') drawLever(ctx, m.x, m.y, mw, mh, activatedLevers[m.id], time);
      else if (m.type === 'keycard') drawKeycardPickup(ctx, m.x, m.y, mw, mh, m.properties, time);

      const ni = getNearestInteractable();
      if (ni && ni.id === m.id) {
        ctx.fillStyle = 'rgba(245,158,11,0.1)'; ctx.beginPath(); ctx.arc(m.x + mw / 2, m.y + mh / 2, 40 + Math.sin(time * 3) * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(245,158,11,0.9)'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('[E] Interact', m.x + mw / 2, m.y - 15);
      }
    });

    worldCollectibles.forEach(ci => { if (ci.collected) return; getVisual(ci.type).drawWorld(ctx, ci.x, ci.y, time); });

    if (isH && placeData.ambientParticles) horror.ambientParticles.forEach(p => { ctx.fillStyle = `rgba(200,200,220,${p.alpha})`; ctx.fillRect(p.x, p.y, p.size, p.size); });
    horror.eyesSpots.forEach(e => { ctx.fillStyle = `rgba(255,0,0,${e.alpha})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(e.x + 8, e.y, e.size, 0, Math.PI * 2); ctx.fill(); });
    if (horror.chaseShadow) { const cs = horror.chaseShadow, p2 = 0.4 + Math.sin(time * 8) * 0.2; ctx.fillStyle = `rgba(0,0,0,${p2})`; ctx.beginPath(); ctx.ellipse(cs.x, cs.y, 25, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,0,0,${p2 + 0.2})`; ctx.beginPath(); ctx.arc(cs.x - 6, cs.y - 15, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cs.x + 6, cs.y - 15, 2, 0, Math.PI * 2); ctx.fill(); }

    if (!deathAnim.active) { myPlayer._isMe = true; Object.keys(ITEM_VISUALS).forEach(k => { const v = ITEM_VISUALS[k]; if (v.drawEffect) v.drawEffect(ctx, myPlayer, time); }); }

    for (const [id, p] of Object.entries(remotePlayers)) {
      p.displayX += (p.targetX - p.displayX) * LERP_SPEED; p.displayY += (p.targetY - p.displayY) * LERP_SPEED;
      let ap = 0; if (p.attacking && p.attackStartTime) { ap = Math.min(1, (now - p.attackStartTime) / ATTACK_DURATION); if (ap >= 1) p.attacking = false; }
      p._isMe = false; Object.keys(ITEM_VISUALS).forEach(k => { const v = ITEM_VISUALS[k]; if (v.drawEffect) v.drawEffect(ctx, p, time); });
      const ri = p.inventory?.[p.activeSlot];
      TC.draw(ctx, p.displayX, p.displayY, p.width, p.height, p.direction, p.state, p.frame, p.avatar, p.username, false, time, { activeItem: ri?.id, attacking: p.attacking, attackProgress: ap, hp: p.hp, maxHp: p.maxHp || 100, itemOn: gios(ri, p.itemState) });
    }

    if (deathAnim.active) { const t = deathAnim.timer / deathAnim.duration; ctx.save(); ctx.globalAlpha = 1 - t; const dx2 = deathAnim.oldX + myPlayer.width / 2, dy2 = deathAnim.oldY + myPlayer.height / 2; ctx.translate(dx2, dy2 - t * 30); ctx.rotate(t * Math.PI * 2); ctx.translate(-dx2, -(dy2 - t * 30)); TC.draw(ctx, deathAnim.oldX, deathAnim.oldY - t * 30, myPlayer.width, myPlayer.height, myPlayer.direction, 'idle', 0, myPlayer.avatar, myPlayer.username, true, time, { isDead: true }); ctx.restore(); }
    else { let ma = 0; if (myPlayer.attacking && myPlayer.attackStartTime) ma = Math.min(1, (now - myPlayer.attackStartTime) / ATTACK_DURATION); const mi = myPlayer.inventory?.[myPlayer.activeSlot]; TC.draw(ctx, myPlayer.x, myPlayer.y, myPlayer.width, myPlayer.height, myPlayer.direction, myPlayer.state, myPlayer.frame, myPlayer.avatar, myPlayer.username, true, time, { activeItem: mi?.id, attacking: myPlayer.attacking, attackProgress: ma, hp: myPlayer.hp, maxHp: myPlayer.maxHp || 100, itemOn: gios(mi, { flashlightOn, shieldActive }) }); }

    ctx.restore();

    if (isH && !deathAnim.active) renderDarkness(time);
    if (placeData.fog?.enabled) renderFog();
    if (placeData.vignette?.enabled) renderVignette();
    if (placeData.tint?.enabled) { ctx.fillStyle = placeData.tint.color || '#000'; ctx.globalAlpha = placeData.tint.opacity || 0.1; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }

    if (myPlayer.inventory && !isMobile) drawInvHUD(time);
    if (isH) drawBatHUD();
    drawFxHUD(time);
    drawKcHUD();

    horror.scareMessages.forEach((m, i) => { ctx.save(); ctx.globalAlpha = m.alpha; ctx.font = m.isNote ? 'italic 600 16px Inter' : '900 28px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = m.isNote ? '#CCBB88' : '#CC2222'; ctx.shadowColor = m.isNote ? 'rgba(204,187,136,0.5)' : 'rgba(255,0,0,0.5)'; ctx.shadowBlur = 10; ctx.fillText(m.text, canvas.width / 2, canvas.height / 2 - 60 + i * 40); ctx.shadowBlur = 0; ctx.restore(); });
    interactMessages.forEach((m, i) => { ctx.save(); ctx.globalAlpha = m.alpha; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = '14px Inter'; ctx.textAlign = 'center'; const y = canvas.height - 100 - i * 30, w = ctx.measureText(m.text).width + 20; ctx.fillRect(canvas.width / 2 - w / 2, y - 12, w, 24); ctx.fillStyle = '#F59E0B'; ctx.textBaseline = 'middle'; ctx.fillText(m.text, canvas.width / 2, y); ctx.restore(); });
    if (isH && horror.nearScare) { const p2 = Math.sin(horror.heartbeat) * 0.5 + 0.5; ctx.fillStyle = `rgba(80,0,0,${p2 * 0.15})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (isH && placeData.breathingEffect) { const ba = Math.sin(horror.breathPhase) * 0.03; if (ba > 0) { ctx.fillStyle = `rgba(0,0,0,${ba})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } }
  }

  function gios(item, is) { if (!item) return true; if (item.id === 'flashlight') return is?.flashlightOn !== false; if (item.id === 'shield') return is?.shieldActive !== false; return true; }

  function renderFog() { const f = placeData.fog; const r = parseInt((f.color || '#000000').slice(1, 3), 16) || 0, g = parseInt((f.color || '#000000').slice(3, 5), 16) || 0, b = parseInt((f.color || '#000000').slice(5, 7), 16) || 0; const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, f.start || 100, canvas.width / 2, canvas.height / 2, f.end || 400); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(${r},${g},${b},${f.density || 0.5})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  function renderVignette() { const v = placeData.vignette; const r = parseInt((v.color || '#000000').slice(1, 3), 16) || 0, g = parseInt((v.color || '#000000').slice(3, 5), 16) || 0, b = parseInt((v.color || '#000000').slice(5, 7), 16) || 0; const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, canvas.width / 2, canvas.height / 2, canvas.width * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(${r},${g},${b},${v.intensity || 0.3})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  function renderDarkness(time) {
    if (!myPlayer) return;
    const px = myPlayer.x + myPlayer.width / 2 - camera.x, py = myPlayer.y + myPlayer.height / 2 - camera.y;
    const dc = document.createElement('canvas'); dc.width = canvas.width; dc.height = canvas.height; const d = dc.getContext('2d');
    d.fillStyle = `rgba(0,0,0,${1 - (placeData.ambientLight || 0.02)})`; d.fillRect(0, 0, canvas.width, canvas.height);
    d.globalCompositeOperation = 'destination-out';
    const isBO = horror.activeScare === 'blackout', isFL = horror.flickering || (horror.activeScare === 'flicker' && Math.sin(time * 30) > 0);
    if (flashlightOn && !isBO && horror.battery > 0) {
      const dir = myPlayer.direction || 1, radius = (placeData.flashlightRadius || 220) * (horror.battery / horror.maxBattery * 0.5 + 0.5), bright = (placeData.flashlightBrightness || 1.2) * (isFL ? Math.random() * 0.5 + 0.3 : 1), spread = placeData.flashlightSpread || 0.45, angle = dir === 1 ? 0 : Math.PI;
      const gr = d.createRadialGradient(px, py, 5, px + dir * radius * 0.4, py, radius); gr.addColorStop(0, `rgba(0,0,0,${bright})`); gr.addColorStop(0.4, `rgba(0,0,0,${bright * 0.7})`); gr.addColorStop(0.7, `rgba(0,0,0,${bright * 0.3})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.beginPath(); d.moveTo(px, py); d.arc(px, py, radius, angle - spread, angle + spread); d.closePath(); d.fill();
      const ag = d.createRadialGradient(px, py, 0, px, py, 40); ag.addColorStop(0, 'rgba(0,0,0,0.6)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = ag; d.beginPath(); d.arc(px, py, 40, 0, Math.PI * 2); d.fill();
    } else { const ag = d.createRadialGradient(px, py, 0, px, py, 25); ag.addColorStop(0, 'rgba(0,0,0,0.2)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = ag; d.beginPath(); d.arc(px, py, 25, 0, Math.PI * 2); d.fill(); }
    for (const [, p] of Object.entries(remotePlayers)) { const ri = p.inventory?.[p.activeSlot]; if (!ri || ri.id !== 'flashlight' || p.itemState?.flashlightOn === false) continue; const rpx = p.displayX + (p.width || 20) / 2 - camera.x, rpy = p.displayY + (p.height || 40) / 2 - camera.y, rDir = p.direction || 1, rAng = rDir === 1 ? 0 : Math.PI; const rg = d.createRadialGradient(rpx, rpy, 5, rpx + rDir * 45, rpy, 150); rg.addColorStop(0, 'rgba(0,0,0,0.5)'); rg.addColorStop(0.5, 'rgba(0,0,0,0.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = rg; d.beginPath(); d.moveTo(rpx, rpy); d.arc(rpx, rpy, 150, rAng - 0.4, rAng + 0.4); d.closePath(); d.fill(); }
    worldCollectibles.forEach(ci => { if (ci.collected) return; const cx = ci.x - camera.x, cy = ci.y - camera.y; if (cx < -50 || cx > canvas.width + 50 || cy < -50 || cy > canvas.height + 50) return; const gs = ci.type === 'battery' ? 35 : 20; const gg = d.createRadialGradient(cx, cy, 0, cx, cy, gs); gg.addColorStop(0, 'rgba(0,0,0,0.4)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gg; d.beginPath(); d.arc(cx, cy, gs, 0, Math.PI * 2); d.fill(); });
    worldModels.forEach(m => { if (m.type === 'keycard' && collectedKeycards[m.id]) return; const mx = m.x + (m.w || 30) / 2 - camera.x, my = m.y + (m.h || 20) / 2 - camera.y; if (mx < -50 || mx > canvas.width + 50 || my < -50 || my > canvas.height + 50) return; const gs = m.type === 'keycard' ? 30 : m.type === 'lever' ? 25 : 10; const gg = d.createRadialGradient(mx, my, 0, mx, my, gs); gg.addColorStop(0, 'rgba(0,0,0,0.3)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gg; d.beginPath(); d.arc(mx, my, gs, 0, Math.PI * 2); d.fill(); });
    d.globalCompositeOperation = 'source-over'; ctx.drawImage(dc, 0, 0);
    if (flashlightOn && !isBO && horror.battery > 0 && !isFL) { const dir = myPlayer.direction || 1, radius = (placeData.flashlightRadius || 220) * (horror.battery / horror.maxBattery * 0.5 + 0.5), spread = placeData.flashlightSpread || 0.45, angle = dir === 1 ? 0 : Math.PI; ctx.save(); ctx.globalAlpha = 0.04; const wg = ctx.createRadialGradient(px, py, 10, px + dir * radius * 0.4, py, radius); wg.addColorStop(0, '#FFE8AA'); wg.addColorStop(0.5, '#FFD466'); wg.addColorStop(1, 'transparent'); ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, radius, angle - spread, angle + spread); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }

  function drawBatHUD() {
    const bw = isMobile ? 100 : 140, bh = 10, bx = canvas.width - bw - 20, by = isMobile ? 50 : 50;
    ctx.font = '600 10px Inter'; ctx.textAlign = 'right'; ctx.fillStyle = horror.battery < 20 ? '#ef4444' : '#888'; ctx.fillText('BATTERY', bx - 6, by + 8);
    ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    const pct = Math.max(0, horror.battery / horror.maxBattery);
    ctx.fillStyle = pct > 0.5 ? '#44EE44' : pct > 0.25 ? '#EECC44' : '#EE4444';
    ctx.fillRect(bx + 1, by + 1, (bw - 2) * pct, bh - 2);
    ctx.font = '600 9px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = pct > 0.3 ? '#000' : '#fff'; ctx.fillText(`${Math.round(horror.battery)}%`, bx + bw / 2, by + bh - 2);
    ctx.fillStyle = '#333'; ctx.fillRect(bx + bw, by + 2, 3, bh - 4);
    if (horror.battery < 15 && Math.sin(Date.now() / 300) > 0) { ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#ef4444'; ctx.fillText('LOW BATTERY', canvas.width / 2, by + 35); }
  }

  function drawKcHUD() {
    const cols = ['red', 'blue', 'green', 'yellow'].filter(c => collectedKeycards[c]);
    if (!cols.length) return;
    const cm = { red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308' };
    const sx = 10, sy = isMobile ? 90 : 110;
    ctx.font = '600 9px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#888'; ctx.fillText('KEYCARDS', sx, sy - 4);
    cols.forEach((c, i) => { const x = sx + i * 30; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 1, sy - 1, 26, 18); ctx.fillStyle = cm[c]; ctx.fillRect(x, sy, 24, 16); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, sy + 5, 24, 2); ctx.fillStyle = '#FFD700'; ctx.fillRect(x + 2, sy + 2, 4, 3); });
  }

  function drawInvHUD(time) {
    if (isMobile) return;
    const inv = myPlayer.inventory; if (!inv) return;
    const ss = 52, gap = 6, tw = inv.length * ss + (inv.length - 1) * gap, sx = canvas.width / 2 - tw / 2, sy = canvas.height - 70;
    for (let i = 0; i < inv.length; i++) {
      const x = sx + i * (ss + gap), a = i === myPlayer.activeSlot;
      ctx.fillStyle = a ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.6)'; ctx.fillRect(x, sy, ss, ss);
      ctx.strokeStyle = a ? '#fff' : '#333'; ctx.lineWidth = a ? 2 : 1; ctx.strokeRect(x, sy, ss, ss);
      if (inv[i]) { const v = getVisual(inv[i].id); v.drawHUD(ctx, x, sy, ss); ctx.font = '600 8px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#888'; let l = v.name; if (a && inv[i].id === 'flashlight') { l += flashlightOn ? ' ON' : ' OFF'; ctx.fillStyle = flashlightOn ? '#FFE066' : '#555'; } else if (a && inv[i].id === 'shield') { l += shieldActive ? ' UP' : ' DOWN'; ctx.fillStyle = shieldActive ? '#66AAEE' : '#555'; } ctx.fillText(l, x + ss / 2, sy + ss - 4); }
      ctx.font = '600 9px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = a ? '#fff' : '#444'; ctx.fillText(String(i + 1), x + 4, sy + 12);
    }
    const ai = inv[myPlayer.activeSlot]; if (ai) { const v = getVisual(ai.id); if (v.toggleable) { ctx.font = '500 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('Press F to toggle', canvas.width / 2, sy - 8); } }
    if (worldModels.length > 0 && getNearestInteractable()) { ctx.font = '500 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(245,158,11,0.6)'; ctx.fillText('Press E to interact', canvas.width / 2, sy - 22); }
    if (myPlayer.hp !== undefined) { const bw = 200, bh2 = 8, bx2 = canvas.width / 2 - bw / 2, by2 = sy - 36; ctx.fillStyle = '#222'; ctx.fillRect(bx2, by2, bw, bh2); const p3 = Math.max(0, myPlayer.hp / (myPlayer.maxHp || 100)); ctx.fillStyle = p3 > 0.5 ? '#4ade80' : p3 > 0.25 ? '#fbbf24' : '#ef4444'; ctx.fillRect(bx2, by2, bw * p3, bh2); ctx.font = '600 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#888'; ctx.fillText(`${Math.max(0, Math.round(myPlayer.hp))} HP`, canvas.width / 2, by2 - 4); }
  }

  function drawFxHUD(time) {
    const now = Date.now(), el = [];
    if (activeEffects.speed && now < activeEffects.speed.endTime) el.push({ name: 'Speed', color: '#FFD700', rem: Math.ceil((activeEffects.speed.endTime - now) / 1000), m: activeEffects.speed.multiplier });
    if (activeEffects.jump && now < activeEffects.jump.endTime) el.push({ name: 'Jump', color: '#44CC44', rem: Math.ceil((activeEffects.jump.endTime - now) / 1000), m: activeEffects.jump.multiplier });
    if (!el.length) return;
    const sx = 10; let sy = isMobile ? 60 : 80;
    el.forEach((e, i) => { const y = sy + i * 28; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, y, 120, 22); ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.strokeRect(sx, y, 120, 22); ctx.fillStyle = e.color; ctx.globalAlpha = 0.3; ctx.fillRect(sx, y, 120, 22); ctx.globalAlpha = 1; ctx.font = '600 10px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${e.name} x${e.m}`, sx + 6, y + 14); ctx.textAlign = 'right'; ctx.fillStyle = e.rem <= 2 ? '#ef4444' : '#ccc'; ctx.fillText(`${e.rem}s`, sx + 114, y + 14); });
  }

  function updateFps() { frameCount++; const now = Date.now(); if (now - lastFpsTime >= 1000) { fps = frameCount; frameCount = 0; lastFpsTime = now; document.getElementById('hud-fps').textContent = `${fps} FPS`; } }

  let lastTime = performance.now();
  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    updatePlayer(dt);
    updateCamera();
    render();
    updateFps();
    requestAnimationFrame(gameLoop);
  }

  initMobileControls();
  requestAnimationFrame(gameLoop);
})();