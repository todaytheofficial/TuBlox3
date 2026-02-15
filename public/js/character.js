window.TubloxCharacter = (function() {
  'use strict';

  function shade(color, amt) {
    let R = parseInt(color.substring(1,3),16), G = parseInt(color.substring(3,5),16), B = parseInt(color.substring(5,7),16);
    R = Math.min(255, Math.max(0, R+amt)); G = Math.min(255, Math.max(0, G+amt)); B = Math.min(255, Math.max(0, B+amt));
    return '#'+R.toString(16).padStart(2,'0')+G.toString(16).padStart(2,'0')+B.toString(16).padStart(2,'0');
  }

  // ==================== MAIN DRAW ====================

  function draw(c, x, y, w, h, dir, state, frame, avatar, username, isMe, time, options) {
    const bc = avatar?.bodyColor || '#FFFFFF';
    const hc = avatar?.headColor || '#FFFFFF';
    const ec = avatar?.eyeColor || '#000000';
    const attacking = options?.attacking || false;
    const attackProgress = options?.attackProgress || 0;
    const activeItem = options?.activeItem || null;
    const hp = options?.hp;
    const maxHp = options?.maxHp;
    const isDead = options?.isDead || false;
    const itemOn = options?.itemOn !== undefined ? options.itemOn : true;
    const equipped = options?.equipped || {};

    const headH = Math.round(h * 0.33);
    const headW = Math.round(w * 0.56);
    const torsoH = Math.round(h * 0.37);
    const torsoW = Math.round(w * 0.62);
    const legH = Math.round(h * 0.30);
    const legW = Math.round(w * 0.22);
    const armW = Math.round(w * 0.16);
    const armH = Math.round(h * 0.29);
    const cx = x + w / 2;
    const bottom = y + h;

    let bobY = 0;
    if (state === 'run') {
      bobY = Math.abs(Math.sin(time * 8)) * 1.5;
    } else if (state === 'idle') {
      bobY = Math.sin(time * 2) * 0.8;
    }

    if (isDead) {
      c.save();
      c.globalAlpha = 0.5;
      c.translate(cx, bottom);
      c.rotate(90 * Math.PI / 180);
      drawChar(c, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, 'idle', 0, time, false, 0, null, true, itemOn, equipped);
      c.restore();
      return;
    }

    // Shadow
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.beginPath();
    c.ellipse(cx, bottom + 1, w / 2, 3, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Behind accessories
    if (equipped.accessory) {
      const accType = equipped.accessory.drawData?.type;
      const accCol = equipped.accessory.color || '#888';
      if (accType === 'cape' || accType === 'wings' || accType === 'backpack') {
        c.save();
        c.translate(cx, bottom);
        c.scale(dir, 1);
        drawAccessoryBehind(c, torsoW, torsoH, legH, headH, bobY, accType, accCol, time, state);
        c.restore();
      }
    }

    // Tail
    if (equipped.body_part && equipped.body_part.drawData?.type === 'tail') {
      c.save();
      c.translate(cx, bottom);
      c.scale(dir, 1);
      drawTail(c, torsoW, torsoH, legH, bobY, equipped.body_part.color || '#8B4513', time);
      c.restore();
    }

    // Character
    c.save();
    c.translate(cx, bottom);
    c.scale(dir, 1);
    drawChar(c, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, state, bobY, time, attacking, attackProgress, activeItem, false, itemOn, equipped);
    c.restore();

    // HP bar
    if (typeof hp === 'number' && typeof maxHp === 'number' && hp < maxHp) {
      const barW = 40, barH = 4, bx = cx - barW / 2, by = y - 22;
      c.fillStyle = '#333';
      c.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, hp / maxHp);
      c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444';
      c.fillRect(bx, by, barW * pct, barH);
    }

    // Username
    if (username) {
      c.save();
      c.font = 'bold 11px Inter, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,0.7)';
      c.shadowColor = 'rgba(0,0,0,0.8)';
      c.shadowBlur = 4;
      const nameY = (typeof hp === 'number' && hp < (maxHp || 100)) ? y - 28 : y - 12;
      c.fillText(username, cx, nameY);
      c.shadowBlur = 0;
      c.restore();
    }
  }

  // ==================== DRAW CHAR ====================

  function drawChar(c, headW, headH, torsoW, torsoH, legW, legH, armW, armH, totalH, bc, hc, ec, state, bobY, time, attacking, attackProgress, activeItem, isDead, itemOn, equipped) {
    equipped = equipped || {};

    // FIX: check once, use everywhere
    const hasFace = !!(equipped.face && equipped.face.drawData && equipped.face.drawData.type);

    const legTop = -legH;
    const torsoTop = legTop - torsoH;
    const headTop = torsoTop - headH;

    const walkCycle = time * 8;
    const legSwing = state === 'run' ? Math.sin(walkCycle) * 22 : 0;
    const armSwingBack = state === 'run' ? Math.sin(walkCycle + Math.PI) * 20 : (state === 'jump' ? -30 : Math.sin(time * 1.5) * 2);
    const armSwingFront = state === 'run' ? Math.sin(walkCycle) * 20 : (state === 'jump' ? 30 : -Math.sin(time * 1.5) * 2);

    const pantsEquip = equipped.pants;
    const pantsCol = pantsEquip ? (pantsEquip.color || shade(bc, -40)) : shade(bc, -40);
    const pantsType = pantsEquip?.drawData?.type;

    // === LEFT LEG ===
    c.save();
    c.translate(-legW / 2 - 1, legTop - bobY);
    if (state === 'run') c.rotate(legSwing * Math.PI / 180);
    else if (state === 'jump' || state === 'fall') c.rotate(-12 * Math.PI / 180);
    c.fillStyle = pantsCol;
    c.fillRect(-legW / 2, 0, legW, legH);
    drawLegDetail(c, legW, legH, pantsType, pantsCol, -legW / 2, 0);
    c.restore();

    // === RIGHT LEG ===
    c.save();
    c.translate(legW / 2 + 1, legTop - bobY);
    if (state === 'run') c.rotate(-legSwing * Math.PI / 180);
    else if (state === 'jump' || state === 'fall') c.rotate(12 * Math.PI / 180);
    c.fillStyle = pantsCol;
    c.fillRect(-legW / 2, 0, legW, legH);
    drawLegDetail(c, legW, legH, pantsType, pantsCol, -legW / 2, 0);
    c.restore();

    // === BACK ARM ===
    const armY = torsoTop + 2 - bobY;
    c.save();
    c.translate(-torsoW / 2, armY);
    c.rotate(armSwingBack * Math.PI / 180);
    drawArm(c, armW, armH, bc, equipped);
    c.restore();

    // === TORSO ===
    const shirtEquip = equipped.shirt;
    const shirtCol = shirtEquip ? (shirtEquip.color || bc) : bc;
    const shirtType = shirtEquip?.drawData?.type;
    drawTorso(c, torsoW, torsoH, torsoTop, bobY, shirtType, shirtCol, bc);

    // Scarf / Necklace
    if (equipped.accessory) {
      const accType = equipped.accessory.drawData?.type;
      const accCol = equipped.accessory.color || '#888';
      if (accType === 'scarf') {
        c.fillStyle = accCol;
        c.fillRect(-torsoW / 2, torsoTop - bobY - 2, torsoW, 6);
        c.fillStyle = shade(accCol, -20);
        c.fillRect(-3, torsoTop - bobY + 4, 6, 10);
      } else if (accType === 'necklace') {
        c.strokeStyle = accCol; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, torsoTop - bobY + 8, torsoW * 0.3, 0.3, Math.PI - 0.3); c.stroke();
        c.fillStyle = accCol; c.beginPath(); c.arc(0, torsoTop - bobY + 8 + torsoW * 0.3, 3, 0, Math.PI * 2); c.fill();
      }
    }

    // === HEAD ===
    c.fillStyle = hc;
    c.fillRect(-headW / 2, headTop - bobY, headW, headH);

    // Hair
    if (equipped.hair) drawHair(c, headW, headH, headTop, bobY, equipped.hair, time);

    // FIX: Face — ONLY one render path, never both
    c.save();
    c.beginPath();
    c.rect(-headW / 2, headTop - bobY, headW, headH);
    c.clip();

    if (hasFace) {
      drawFace(c, headW, headH, headTop, bobY, equipped.face.drawData.type, equipped.face.color || ec, time, isDead);
    } else {
      drawDefaultFace(c, headW, headH, headTop, bobY, ec, time, isDead);
    }

    c.restore();

    // Hat
    if (equipped.hat) drawHat(c, headW, headH, headTop, bobY, equipped.hat, time);

    // Body parts
    if (equipped.body_part) {
      const bpType = equipped.body_part.drawData?.type;
      const bpCol = equipped.body_part.color || '#888';
      if (bpType === 'robot_arms') {
        c.fillStyle = bpCol;
        c.fillRect(-torsoW / 2 - armW - 4, armY, armW + 2, armH);
        c.fillRect(torsoW / 2 + 2, armY, armW + 2, armH);
        c.fillStyle = shade(bpCol, -20);
        c.fillRect(-torsoW / 2 - armW - 3, armY + armH * 0.3, armW, 3);
        c.fillRect(torsoW / 2 + 3, armY + armH * 0.3, armW, 3);
      } else if (bpType === 'claws') {
        c.fillStyle = bpCol;
        for (let i = 0; i < 3; i++) {
          const cx2 = torsoW / 2 + armW + 2 + i * 3;
          c.fillRect(cx2, armY + armH - 2, 2, 8);
          c.fillRect(-cx2 - 2, armY + armH - 2, 2, 8);
        }
      }
    }

    // === FRONT ARM + HELD ITEM ===
    const frontArmX = torsoW / 2;
    if (activeItem === 'sword') {
      if (attacking) {
        let angle;
        if (attackProgress < 0.15) angle = -45 * (attackProgress / 0.15);
        else if (attackProgress < 0.5) angle = -45 + 165 * ((attackProgress - 0.15) / 0.35);
        else angle = 120 - 135 * ((attackProgress - 0.5) / 0.5);
        c.save(); c.translate(frontArmX, armY); c.rotate(angle * Math.PI / 180);
        c.fillStyle = shade(bc, -10); c.fillRect(0, 0, armW, armH);
        drawSword(c, armW / 2 - 2, armH, armH * 1.4); c.restore();
      } else {
        const s = Math.sin(time * 1.5) * 3;
        c.save(); c.translate(frontArmX, armY); c.rotate((-10 + s) * Math.PI / 180);
        c.fillStyle = shade(bc, -10); c.fillRect(0, 0, armW, armH);
        drawSword(c, armW / 2 - 2, armH, armH * 1.2); c.restore();
      }
    } else if (activeItem === 'flashlight') {
      const s = Math.sin(time * 1.5) * 3;
      c.save(); c.translate(frontArmX, armY); c.rotate((-15 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10); c.fillRect(0, 0, armW, armH);
      drawFlashlight(c, armW / 2, armH, armH * 0.8, itemOn, time); c.restore();
    } else if (activeItem === 'shield') {
      const s = Math.sin(time * 1.5) * 3;
      c.save(); c.translate(frontArmX, armY); c.rotate((-5 + s * 0.5) * Math.PI / 180);
      c.fillStyle = shade(bc, -10); c.fillRect(0, 0, armW, armH);
      drawShieldHeld(c, armW / 2, armH * 0.4, armH * 0.9, itemOn, time); c.restore();
    } else {
      c.save();
      c.translate(frontArmX, armY);
      c.rotate(armSwingFront * Math.PI / 180);
      drawArm(c, armW, armH, bc, equipped);
      c.restore();
    }
  }

  // ==================== DEFAULT FACE ====================

  function drawDefaultFace(c, headW, headH, headTop, bobY, ec, time, isDead) {
    const blink = Math.sin(time * 2.5) > 0.93;
    const eyeY = headTop + headH * 0.35 - bobY;
    const eyeSize = Math.max(2, Math.round(headW * 0.12));
    const gap = Math.round(headW * 0.10);

    if (isDead) {
      c.strokeStyle = ec; c.lineWidth = 1.5;
      [-1, 1].forEach(side => {
        const cx = side * gap;
        c.beginPath(); c.moveTo(cx - eyeSize / 2, eyeY); c.lineTo(cx + eyeSize / 2, eyeY + eyeSize); c.stroke();
        c.beginPath(); c.moveTo(cx + eyeSize / 2, eyeY); c.lineTo(cx - eyeSize / 2, eyeY + eyeSize); c.stroke();
      });
    } else if (!blink) {
      c.fillStyle = '#111';
      c.fillRect(gap - 1, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillRect(-gap - eyeSize, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillStyle = ec;
      c.fillRect(gap, eyeY + 1, eyeSize, eyeSize);
      c.fillRect(-gap - eyeSize + 1, eyeY + 1, eyeSize, eyeSize);
    } else {
      c.fillStyle = ec;
      c.fillRect(gap - 1, eyeY + eyeSize / 2, eyeSize + 1, 2);
      c.fillRect(-gap - eyeSize, eyeY + eyeSize / 2, eyeSize + 1, 2);
    }
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-2, headTop + headH * 0.72 - bobY, 4, 2);
  }

  // ==================== FACE COSMETICS ====================
  // FIX: Each type is fully self-contained — draws its own eyes+mouth, no default leak

  function drawFace(c, headW, headH, headTop, bobY, type, faceColor, time, isDead) {
    const eyeY = headTop + headH * 0.35 - bobY;
    const eyeSize = Math.max(2, Math.round(Math.min(headW * 0.11, headH * 0.15)));
    const gap = Math.round(headW * 0.10);
    const mouthY = headTop + headH * 0.65 - bobY;
    const blink = Math.sin(time * 2.5) > 0.93;
    const fc = faceColor || '#000';

    switch (type) {
      case 'smile': {
        if (!blink) {
          c.fillStyle = fc;
          c.beginPath(); c.arc(-gap, eyeY, eyeSize * 0.8, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY, eyeSize * 0.8, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = fc;
          c.fillRect(-gap - eyeSize, eyeY, eyeSize * 2, 2);
          c.fillRect(gap - eyeSize, eyeY, eyeSize * 2, 2);
        }
        const sw = headW * 0.15 + Math.sin(time * 3) * headW * 0.02;
        c.strokeStyle = fc; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, mouthY - 4, sw, 0.15, Math.PI - 0.15); c.stroke();
        break;
      }
      case 'cool': {
        const glassY = eyeY - 2;
        const glassH = eyeSize + 3;
        const glassW = headW * 0.35;
        c.fillStyle = '#111';
        c.fillRect(-glassW, glassY, glassW * 2, glassH);
        c.fillStyle = '#333';
        c.fillRect(-glassW + 3, glassY + 2, glassW * 0.45, glassH - 4);
        c.fillRect(glassW * 0.1, glassY + 2, glassW * 0.45, glassH - 4);
        c.fillStyle = '#222';
        c.fillRect(-2, glassY + 1, 4, glassH - 2);
        c.strokeStyle = '#000'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(-headW * 0.1, mouthY); c.quadraticCurveTo(headW * 0.05, mouthY + 3, headW * 0.12, mouthY - 1); c.stroke();
        break;
      }
      case 'angry': {
        if (!blink) {
          c.fillStyle = fc;
          c.beginPath(); c.arc(-gap, eyeY + 1, eyeSize * 0.8, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY + 1, eyeSize * 0.8, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = fc;
          c.fillRect(-gap - eyeSize, eyeY + 1, eyeSize * 2, 2);
          c.fillRect(gap - eyeSize, eyeY + 1, eyeSize * 2, 2);
        }
        c.strokeStyle = fc; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-gap - eyeSize, eyeY - 4); c.lineTo(-gap + eyeSize, eyeY - 1); c.stroke();
        c.beginPath(); c.moveTo(gap + eyeSize, eyeY - 4); c.lineTo(gap - eyeSize, eyeY - 1); c.stroke();
        c.strokeStyle = fc; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, mouthY + 3, headW * 0.1, Math.PI + 0.3, -0.3); c.stroke();
        break;
      }
      case 'wink': {
        if (!blink) {
          c.fillStyle = fc;
          c.beginPath(); c.arc(-gap, eyeY, eyeSize * 0.85, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = fc;
          c.fillRect(-gap - eyeSize, eyeY, eyeSize * 2, 2);
        }
        c.strokeStyle = fc; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(gap - eyeSize, eyeY); c.lineTo(gap + eyeSize, eyeY); c.stroke();
        c.beginPath(); c.arc(0, mouthY - 3, headW * 0.12, 0.1, Math.PI - 0.1); c.stroke();
        break;
      }
      case 'robot': {
        const flicker = Math.sin(time * 12) > 0 ? 1 : 0.7;
        c.fillStyle = `rgba(0,255,0,${0.3 * flicker})`;
        c.fillRect(-gap - 3, eyeY - 2, 6, 6);
        c.fillRect(gap - 3, eyeY - 2, 6, 6);
        c.fillStyle = `rgba(0,255,0,${flicker})`;
        c.fillRect(-gap - 1, eyeY, 2, 2);
        c.fillRect(gap - 1, eyeY, 2, 2);
        const segW = headW * 0.06;
        for (let i = 0; i < 5; i++) {
          const segH = Math.sin(time * 8 + i * 1.5) > 0 ? 2 : 1;
          c.fillStyle = `rgba(0,200,0,${flicker})`;
          c.fillRect(-headW * 0.15 + i * segW, mouthY - 1, segW - 1, segH);
        }
        break;
      }
      case 'skull': {
        const fl = Math.sin(time * 7) * 0.3 + 0.7;
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-gap, eyeY, eyeSize + 1, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap, eyeY, eyeSize + 1, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(255,50,50,${fl})`;
        c.beginPath(); c.arc(-gap, eyeY, eyeSize * 0.5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap, eyeY, eyeSize * 0.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#000';
        c.beginPath(); c.moveTo(-1, mouthY - 6); c.lineTo(1, mouthY - 6); c.lineTo(0, mouthY - 3); c.fill();
        c.fillStyle = '#888';
        const tw = headW * 0.06;
        for (let i = 0; i < 4; i++) {
          c.fillRect(-headW * 0.12 + i * tw * 1.1, mouthY - 1, tw - 1, 3);
        }
        break;
      }
      default:
        drawDefaultFace(c, headW, headH, headTop, bobY, fc, time, isDead);
    }
  }

  // ==================== PARTS ====================

  function drawLegDetail(c, w, h, pantsType, col, x, y) {
    if (pantsType === 'shorts' && h > 15) {
      c.fillStyle = shade(col, 20); c.fillRect(x, y + h * 0.6, w, h * 0.4);
    } else if (pantsType === 'cargo') {
      c.fillStyle = shade(col, -15); c.fillRect(x + 1, y + h * 0.4, w - 2, 5);
    } else if (pantsType === 'royal_legs') {
      c.fillStyle = '#FFD700'; c.fillRect(x, y, w, 2); c.fillRect(x, y + h - 2, w, 2);
    } else if (pantsType === 'sweatpants') {
      c.fillStyle = shade(col, 10); c.fillRect(x, y, w, 4);
    }
  }

  function drawArm(c, w, h, bc, equipped) {
    const shirtType = equipped?.shirt?.drawData?.type;
    if (shirtType === 'hoodie' || shirtType === 'jacket') {
      c.fillStyle = equipped.shirt.color || bc;
    } else {
      c.fillStyle = shade(bc, -10);
    }
    c.fillRect(0, 0, w, h);
  }

  function drawTorso(c, tw, th, torsoTop, bobY, shirtType, shirtCol, bc) {
    const ty = torsoTop - bobY;
    if (!shirtType) { c.fillStyle = bc; c.fillRect(-tw / 2, ty, tw, th); return; }
    c.fillStyle = shirtCol;
    c.fillRect(-tw / 2, ty, tw, th);
    switch (shirtType) {
      case 'hoodie': c.fillStyle = shade(shirtCol, -20); c.fillRect(-tw / 2, ty, tw, 5); c.fillStyle = shade(shirtCol, -10); c.fillRect(-4, ty + th * 0.3, 8, 10); break;
      case 'jacket': c.fillStyle = shade(shirtCol, -15); c.fillRect(-1, ty, 2, th); c.fillStyle = shade(shirtCol, 15); c.fillRect(-tw / 2 + 1, ty + th * 0.3, 5, 8); break;
      case 'stripe_shirt': c.fillStyle = 'rgba(255,255,255,0.15)'; for (let y = 0; y < th; y += 5) c.fillRect(-tw / 2, ty + y, tw, 2); break;
      case 'gold_armor': c.fillStyle = '#DAA520'; c.fillRect(-tw / 2, ty, tw, 3); c.fillRect(-tw / 2, ty + th - 3, tw, 3); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(-tw / 2, ty, 4, th); break;
      case 'tank_top': c.fillStyle = shade(shirtCol, -10); c.fillRect(-tw / 2, ty, tw, 2); break;
      default: c.fillStyle = shade(shirtCol, 10); c.fillRect(-tw / 2, ty, tw, 2);
    }
  }

  // ==================== HAIR ====================

  function drawHair(c, headW, headH, headTop, bobY, hairEquip, time) {
    const type = hairEquip.drawData?.type;
    const col = hairEquip.color || '#222222';
    c.fillStyle = col;
    const ht = headTop - bobY;
    switch (type) {
      case 'spiky': for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * headW * 0.15 - headW * 0.08, ht + 3); c.lineTo(i * headW * 0.15, ht - 8 - Math.abs(i) * 2); c.lineTo(i * headW * 0.15 + headW * 0.08, ht + 3); c.fill(); } break;
      case 'long': c.beginPath(); c.ellipse(0, ht + headH * 0.3, headW * 0.55, headH * 0.5, 0, 0, Math.PI * 2); c.fill(); c.fillRect(-headW * 0.5, ht + headH * 0.4, headW * 0.15, headH * 0.8); c.fillRect(headW * 0.35, ht + headH * 0.4, headW * 0.15, headH * 0.8); break;
      case 'mohawk': c.fillRect(-headW * 0.08, ht - 10, headW * 0.16, headH + 5); c.fillStyle = shade(col, 20); c.fillRect(-headW * 0.06, ht - 8, headW * 0.12, headH + 2); break;
      case 'curly': for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * headW * 0.35, ht + headH * 0.25 + Math.sin(a) * headH * 0.3, headW * 0.15, 0, Math.PI * 2); c.fill(); } break;
      case 'fire': { const cols = ['#FF4500', '#FF6600', '#FFD700', '#FF0000']; for (let i = 0; i < 5; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo((i - 2) * headW * 0.16 - headW * 0.06, ht + 2); c.lineTo((i - 2) * headW * 0.16, ht - 12 - Math.sin(time * 6 + i) * 4); c.lineTo((i - 2) * headW * 0.16 + headW * 0.06, ht + 2); c.fill(); } break; }
    }
  }

  // ==================== HAT ====================

  function drawHat(c, headW, headH, headTop, bobY, hatEquip, time) {
    const type = hatEquip.drawData?.type;
    const col = hatEquip.color || '#222222';
    const ht = headTop - bobY;
    c.fillStyle = col;
    switch (type) {
      case 'baseball_cap': c.fillRect(-headW * 0.55, ht - 2, headW * 1.1, headH * 0.3); c.beginPath(); c.ellipse(0, ht - 2, headW * 0.55, headH * 0.15, 0, Math.PI, 0); c.fill(); c.fillRect(-headW * 0.6, ht + headH * 0.25, headW * 1.2, 3); break;
      case 'top_hat': c.fillRect(-headW * 0.35, ht - headH * 0.6, headW * 0.7, headH * 0.65); c.fillRect(-headW * 0.5, ht + 2, headW, 4); c.fillStyle = shade(col, 30); c.fillRect(-headW * 0.3, ht - headH * 0.15, headW * 0.6, 3); break;
      case 'crown': c.fillStyle = '#FFD700'; c.fillRect(-headW * 0.45, ht - 2, headW * 0.9, headH * 0.25); [-0.4, 0, 0.4].forEach(p => { c.beginPath(); c.moveTo(headW * p - headW * 0.08, ht - 2); c.lineTo(headW * p, ht - headH * 0.35); c.lineTo(headW * p + headW * 0.08, ht - 2); c.fill(); }); c.fillStyle = '#EF4444'; c.beginPath(); c.arc(0, ht - headH * 0.25, 2, 0, Math.PI * 2); c.fill(); break;
      case 'beanie': c.beginPath(); c.ellipse(0, ht + 2, headW * 0.52, headH * 0.3, 0, Math.PI, 0); c.fill(); c.fillRect(-headW * 0.52, ht + 2, headW * 1.04, headH * 0.15); c.fillStyle = shade(col, -15); for (let x = -headW * 0.48; x < headW * 0.48; x += 3) c.fillRect(x, ht + 2, 1, headH * 0.15); break;
      case 'ninja_headband': c.fillRect(-headW * 0.55, ht + headH * 0.15, headW * 1.1, headH * 0.18); c.fillStyle = shade(col, 10); c.fillRect(-headW * 0.55, ht + headH * 0.22, headW * 1.1, 2); c.fillStyle = col; c.beginPath(); c.moveTo(headW * 0.55, ht + headH * 0.15); c.quadraticCurveTo(headW * 0.8, ht, headW * 0.7, ht - headH * 0.2); c.lineTo(headW * 0.65, ht - headH * 0.15); c.quadraticCurveTo(headW * 0.72, ht + headH * 0.05, headW * 0.55, ht + headH * 0.33); c.fill(); break;
    }
  }

  // ==================== ACCESSORIES ====================

  function drawAccessoryBehind(c, tw, th, lh, hh, bobY, type, col, time, state) {
    const torsoTop = -lh - th;
    switch (type) {
      case 'cape': c.fillStyle = col; const cw = Math.sin(time * 3) * 3 + (state === 'run' ? 5 : 0); c.beginPath(); c.moveTo(-tw * 0.4, torsoTop - bobY + 3); c.lineTo(tw * 0.4, torsoTop - bobY + 3); c.quadraticCurveTo(tw * 0.3, -bobY + cw, tw * 0.35, -bobY + lh * 0.5); c.lineTo(-tw * 0.35, -bobY + lh * 0.5); c.quadraticCurveTo(-tw * 0.3, -bobY + cw, -tw * 0.4, torsoTop - bobY + 3); c.fill(); break;
      case 'wings': c.save(); c.globalAlpha = 0.5; c.fillStyle = col; const wf = Math.sin(time * 4) * 0.15; c.save(); c.rotate(-0.3 + wf); c.beginPath(); c.moveTo(-tw * 0.3, torsoTop - bobY + th * 0.3); c.quadraticCurveTo(-tw * 1.2, torsoTop - bobY - hh, -tw * 0.8, torsoTop - bobY + th * 0.6); c.fill(); c.restore(); c.save(); c.rotate(0.3 - wf); c.beginPath(); c.moveTo(tw * 0.3, torsoTop - bobY + th * 0.3); c.quadraticCurveTo(tw * 1.2, torsoTop - bobY - hh, tw * 0.8, torsoTop - bobY + th * 0.6); c.fill(); c.restore(); c.restore(); break;
      case 'backpack': c.fillStyle = col; c.fillRect(-tw * 0.35, torsoTop - bobY + 5, tw * 0.7, th * 0.8); c.fillStyle = shade(col, -15); c.fillRect(-tw * 0.25, torsoTop - bobY + th * 0.4, tw * 0.5, th * 0.25); break;
    }
  }

  function drawTail(c, tw, th, lh, bobY, col, time) {
    const tailY = -lh - 5 - bobY;
    const wag = Math.sin(time * 3) * 0.3;
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-tw * 0.4, tailY); c.quadraticCurveTo(-tw * 0.8 + Math.sin(time * 3) * 5, tailY - 15, -tw * 0.6 + wag * 10, tailY - 25); c.stroke();
    c.fillStyle = shade(col, 20); c.beginPath(); c.arc(-tw * 0.6 + wag * 10, tailY - 25, 3, 0, Math.PI * 2); c.fill();
  }

  // ==================== ITEMS ====================

  function drawSword(c, sx, sy, bladeLen) {
    c.fillStyle = '#8B6914'; c.fillRect(sx - 1, sy - 2, 4, 5);
    c.fillStyle = '#CCAA00'; c.fillRect(sx - 3, sy + 3, 8, 2);
    c.fillStyle = '#CCCCCC'; c.fillRect(sx, sy + 5, 3, bladeLen);
    c.fillStyle = '#EEEEEE'; c.fillRect(sx, sy + 5, 1, bladeLen);
    c.fillStyle = '#DDDDDD'; c.beginPath(); c.moveTo(sx, sy + 5 + bladeLen); c.lineTo(sx + 3, sy + 5 + bladeLen); c.lineTo(sx + 1.5, sy + 5 + bladeLen + 4); c.fill();
  }

  function drawFlashlight(c, cx, sy, len, isOn, time) {
    c.fillStyle = '#444'; c.fillRect(cx - 2.5, sy, 5, len);
    c.fillStyle = '#333'; for (let i = 0; i < 3; i++) c.fillRect(cx - 3, sy + len * 0.3 + i * 3, 6, 1);
    c.fillStyle = '#555'; c.fillRect(cx - 4, sy + len - 2, 8, 4);
    if (isOn) { c.fillStyle = '#FFE066'; c.fillRect(cx - 3, sy + len + 2, 6, 2); c.fillStyle = 'rgba(255,224,102,0.4)'; c.beginPath(); c.arc(cx, sy + len + 3, 5, 0, Math.PI * 2); c.fill(); } else { c.fillStyle = '#333'; c.fillRect(cx - 3, sy + len + 2, 6, 2); }
    c.fillStyle = isOn ? '#88DD88' : '#AA4444'; c.fillRect(cx + 2.5, sy + 2, 2, 3);
  }

  function drawShieldHeld(c, cx, sy, size, isActive, time) {
    const sw = size * 0.7, sh = size;
    c.fillStyle = isActive ? '#4488CC' : '#335577';
    c.beginPath(); c.moveTo(cx, sy - sh * 0.1); c.lineTo(cx + sw / 2, sy + sh * 0.15); c.lineTo(cx + sw / 2, sy + sh * 0.55); c.lineTo(cx, sy + sh * 0.75); c.lineTo(cx - sw / 2, sy + sh * 0.55); c.lineTo(cx - sw / 2, sy + sh * 0.15); c.closePath(); c.fill();
    c.strokeStyle = isActive ? '#66AAEE' : '#557799'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = isActive ? '#66AAEE' : '#557799'; c.beginPath(); c.arc(cx, sy + sh * 0.3, sw * 0.18, 0, Math.PI * 2); c.fill();
  }

  // ==================== SIDEBAR (Roblox-style bust) ====================

  function drawSidebar(canvas, avatar, equipped) {
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const bc = avatar?.bodyColor || '#FFF';
    const hc = avatar?.headColor || '#FFF';
    const ec = avatar?.eyeColor || '#000';
    equipped = equipped || {};

    c.clearRect(0, 0, W, H);

    const hasFace = !!(equipped.face && equipped.face.drawData && equipped.face.drawData.type);
    const s = W / 44;
    const cx = W / 2;
    const rad = W * 0.20;

    // Clip rounded rect
    c.save();
    c.beginPath();
    c.moveTo(rad, 0); c.lineTo(W - rad, 0); c.quadraticCurveTo(W, 0, W, rad);
    c.lineTo(W, H - rad); c.quadraticCurveTo(W, H, W - rad, H);
    c.lineTo(rad, H); c.quadraticCurveTo(0, H, 0, H - rad);
    c.lineTo(0, rad); c.quadraticCurveTo(0, 0, rad, 0);
    c.closePath(); c.clip();

    // Background
    const bg = c.createRadialGradient(cx, H * 0.4, 0, cx, H * 0.4, W * 0.8);
    bg.addColorStop(0, '#1e1e2e');
    bg.addColorStop(0.6, '#151522');
    bg.addColorStop(1, '#0a0a14');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // Sizes
    const headW = 18 * s;
    const headH = 16 * s;
    const headX = cx - headW / 2;
    const headY = H * 0.06;
    const shoulderW = 24 * s;
    const armW = 5 * s;
    const torsoH = 12 * s;
    const shoulderY = headY + headH;

    // Shoulders
    const shirtCol = equipped.shirt?.color || bc;
    c.fillStyle = shirtCol;
    c.beginPath();
    c.moveTo(cx - shoulderW / 2 - armW, shoulderY + torsoH);
    c.lineTo(cx - shoulderW / 2 - armW, shoulderY + 4 * s);
    c.quadraticCurveTo(cx - shoulderW / 2 - armW, shoulderY, cx - shoulderW / 2, shoulderY);
    c.lineTo(cx + shoulderW / 2, shoulderY);
    c.quadraticCurveTo(cx + shoulderW / 2 + armW, shoulderY, cx + shoulderW / 2 + armW, shoulderY + 4 * s);
    c.lineTo(cx + shoulderW / 2 + armW, shoulderY + torsoH);
    c.closePath(); c.fill();

    // Shirt detail
    const sType = equipped.shirt?.drawData?.type;
    if (sType === 'stripe_shirt') { c.fillStyle = 'rgba(255,255,255,0.10)'; for (let y = shoulderY + 2; y < shoulderY + torsoH; y += 3 * s) c.fillRect(cx - shoulderW / 2 - armW, y, shoulderW + armW * 2, 1.5 * s); }
    else if (sType === 'hoodie') { c.fillStyle = shade(shirtCol, -20); c.fillRect(cx - shoulderW / 2 - armW, shoulderY, shoulderW + armW * 2, 3 * s); }
    else if (sType === 'jacket') { c.fillStyle = shade(shirtCol, -15); c.fillRect(cx - 1, shoulderY, 2, torsoH); }
    else if (sType === 'gold_armor') { c.fillStyle = '#DAA520'; c.fillRect(cx - shoulderW / 2 - armW, shoulderY, shoulderW + armW * 2, 2 * s); }

    // Accessory
    if (equipped.accessory?.drawData?.type === 'scarf') { c.fillStyle = equipped.accessory.color || '#c00'; c.fillRect(cx - shoulderW / 2, shoulderY - 1, shoulderW, 4 * s); }
    else if (equipped.accessory?.drawData?.type === 'necklace') { c.strokeStyle = equipped.accessory.color || '#FFD700'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, shoulderY + 5 * s, 5 * s, 0.3, Math.PI - 0.3); c.stroke(); }

    // Neck
    c.fillStyle = hc;
    c.fillRect(cx - 3 * s, shoulderY - 2 * s, 6 * s, 3 * s);

    // Head
    c.fillStyle = hc;
    c.fillRect(headX, headY, headW, headH);

    // Hair
    if (equipped.hair) {
      const hairCol = equipped.hair.color || '#222';
      c.fillStyle = hairCol;
      const ht = equipped.hair.drawData?.type;
      if (ht === 'spiky') { for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(cx + i * headW * 0.13 - headW * 0.07, headY + 2); c.lineTo(cx + i * headW * 0.13, headY - 5 * s - Math.abs(i) * 2); c.lineTo(cx + i * headW * 0.13 + headW * 0.07, headY + 2); c.fill(); } }
      else if (ht === 'mohawk') { c.fillRect(cx - headW * 0.06, headY - 6 * s, headW * 0.12, headH * 0.4 + 6 * s); }
      else if (ht === 'long') { c.beginPath(); c.ellipse(cx, headY + headH * 0.3, headW * 0.55, headH * 0.45, 0, 0, Math.PI * 2); c.fill(); c.fillRect(headX - headW * 0.06, headY + headH * 0.35, headW * 0.12, headH * 0.7); c.fillRect(headX + headW - headW * 0.06, headY + headH * 0.35, headW * 0.12, headH * 0.7); }
      else if (ht === 'curly') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * headW * 0.33, headY + headH * 0.25 + Math.sin(a) * headH * 0.27, headW * 0.10, 0, Math.PI * 2); c.fill(); } }
      else if (ht === 'fire') { const fc = ['#FF4500', '#FF6600', '#FFD700']; for (let i = 0; i < 5; i++) { c.fillStyle = fc[i % fc.length]; c.beginPath(); c.moveTo(cx + (i - 2) * headW * 0.14 - headW * 0.05, headY + 2); c.lineTo(cx + (i - 2) * headW * 0.14, headY - 6 * s); c.lineTo(cx + (i - 2) * headW * 0.14 + headW * 0.05, headY + 2); c.fill(); } }
    }

    // Hat
    if (equipped.hat) {
      const hatCol = equipped.hat.color || '#222';
      c.fillStyle = hatCol;
      const ht2 = equipped.hat.drawData?.type;
      if (ht2 === 'baseball_cap') { c.fillRect(headX - 1, headY - 1, headW + 2, headH * 0.22); c.fillRect(headX - 2, headY + headH * 0.20, headW + 4, 2); }
      else if (ht2 === 'top_hat') { c.fillRect(cx - headW * 0.28, headY - headH * 0.45, headW * 0.56, headH * 0.50); c.fillRect(cx - headW * 0.42, headY + 1, headW * 0.84, 3); }
      else if (ht2 === 'crown') { c.fillStyle = '#FFD700'; c.fillRect(cx - headW * 0.38, headY - 1, headW * 0.76, headH * 0.18); [-0.28, 0, 0.28].forEach(p => { c.beginPath(); c.moveTo(cx + headW * p - headW * 0.06, headY - 1); c.lineTo(cx + headW * p, headY - headH * 0.28); c.lineTo(cx + headW * p + headW * 0.06, headY - 1); c.fill(); }); }
      else if (ht2 === 'beanie') { c.beginPath(); c.ellipse(cx, headY + 1, headW * 0.52, headH * 0.20, 0, Math.PI, 0); c.fill(); c.fillRect(headX - 1, headY + 1, headW + 2, headH * 0.10); }
      else if (ht2 === 'ninja_headband') { c.fillRect(headX - 1, headY + headH * 0.12, headW + 2, headH * 0.13); }
    }

    // Face (clipped)
    c.save();
    c.beginPath(); c.rect(headX, headY, headW, headH); c.clip();

    const eyeY = headY + headH * 0.40;
    const eyeSize = Math.max(2, Math.round(headW * 0.09));
    const eyeGap = Math.round(headW * 0.12);
    const mouthY = headY + headH * 0.72;

    // FIX: only ONE path — face cosmetic OR default, never both
    if (hasFace) {
      const ft = equipped.face.drawData.type;
      const fCol = equipped.face.color || ec;

      switch (ft) {
        case 'cool': { const gW = headW * 0.36, gH = eyeSize * 1.5; c.fillStyle = '#111'; c.fillRect(cx - gW - 1, eyeY - 1, gW * 2 + 2, gH + 2); c.fillStyle = '#333'; c.fillRect(cx - gW + 2, eyeY + 1, gW * 0.42, gH - 3); c.fillRect(cx + 2, eyeY + 1, gW * 0.42, gH - 3); c.fillStyle = '#222'; c.fillRect(cx - 1.5, eyeY, 3, gH); c.strokeStyle = '#333'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 3, mouthY); c.quadraticCurveTo(cx + 1, mouthY + 2, cx + 4, mouthY - 1); c.stroke(); break; }
        case 'smile': { c.fillStyle = fCol; c.beginPath(); c.arc(cx - eyeGap, eyeY + eyeSize * 0.3, eyeSize * 0.7, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(cx + eyeGap, eyeY + eyeSize * 0.3, eyeSize * 0.7, 0, Math.PI * 2); c.fill(); c.strokeStyle = fCol; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, mouthY - 2, headW * 0.12, 0.15, Math.PI - 0.15); c.stroke(); break; }
        case 'angry': { c.fillStyle = fCol; c.beginPath(); c.arc(cx - eyeGap, eyeY + 1, eyeSize * 0.7, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(cx + eyeGap, eyeY + 1, eyeSize * 0.7, 0, Math.PI * 2); c.fill(); c.strokeStyle = fCol; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - eyeGap - eyeSize, eyeY - 3); c.lineTo(cx - eyeGap + eyeSize, eyeY); c.stroke(); c.beginPath(); c.moveTo(cx + eyeGap + eyeSize, eyeY - 3); c.lineTo(cx + eyeGap - eyeSize, eyeY); c.stroke(); c.strokeStyle = fCol; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, mouthY + 2, headW * 0.08, Math.PI + 0.3, -0.3); c.stroke(); break; }
        case 'wink': { c.fillStyle = fCol; c.beginPath(); c.arc(cx - eyeGap, eyeY + eyeSize * 0.3, eyeSize * 0.75, 0, Math.PI * 2); c.fill(); c.strokeStyle = fCol; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx + eyeGap - eyeSize * 0.5, eyeY + eyeSize * 0.3); c.lineTo(cx + eyeGap + eyeSize * 0.5, eyeY + eyeSize * 0.3); c.stroke(); c.beginPath(); c.arc(cx, mouthY - 2, headW * 0.10, 0.1, Math.PI - 0.1); c.stroke(); break; }
        case 'robot': { c.fillStyle = 'rgba(0,255,0,0.25)'; c.fillRect(cx - eyeGap - 3, eyeY - 1, 6, 5); c.fillRect(cx + eyeGap - 3, eyeY - 1, 6, 5); c.fillStyle = '#0F0'; c.fillRect(cx - eyeGap - 1, eyeY + 1, 2, 2); c.fillRect(cx + eyeGap - 1, eyeY + 1, 2, 2); c.fillStyle = '#0C0'; for (let i = 0; i < 4; i++) c.fillRect(cx - headW * 0.10 + i * headW * 0.05, mouthY, headW * 0.04, 1.5); break; }
        case 'skull': { c.fillStyle = '#000'; c.beginPath(); c.arc(cx - eyeGap, eyeY + 1, eyeSize + 1, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(cx + eyeGap, eyeY + 1, eyeSize + 1, 0, Math.PI * 2); c.fill(); c.fillStyle = '#F44'; c.beginPath(); c.arc(cx - eyeGap, eyeY + 1, eyeSize * 0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(cx + eyeGap, eyeY + 1, eyeSize * 0.4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#888'; for (let i = 0; i < 4; i++) c.fillRect(cx - headW * 0.08 + i * headW * 0.05, mouthY, headW * 0.035, 2); break; }
        default: { c.fillStyle = '#111'; c.fillRect(cx - eyeGap - eyeSize / 2 - 1, eyeY, eyeSize + 1, eyeSize + 2); c.fillRect(cx + eyeGap - eyeSize / 2, eyeY, eyeSize + 1, eyeSize + 2); c.fillStyle = fCol; c.fillRect(cx - eyeGap - eyeSize / 2, eyeY + 1, eyeSize, eyeSize); c.fillRect(cx + eyeGap - eyeSize / 2 + 1, eyeY + 1, eyeSize, eyeSize); }
      }
    } else {
      // Default eyes
      c.fillStyle = '#111';
      c.fillRect(cx - eyeGap - eyeSize / 2 - 1, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillRect(cx + eyeGap - eyeSize / 2, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillStyle = ec;
      c.fillRect(cx - eyeGap - eyeSize / 2, eyeY + 1, eyeSize, eyeSize);
      c.fillRect(cx + eyeGap - eyeSize / 2 + 1, eyeY + 1, eyeSize, eyeSize);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(cx - 2, mouthY, 4, 1.5);
    }

    c.restore(); // face clip

    // Bottom fade
    const fadeH = H * 0.18;
    const fg = c.createLinearGradient(0, H - fadeH, 0, H);
    fg.addColorStop(0, 'rgba(10,10,20,0)');
    fg.addColorStop(1, 'rgba(10,10,20,1)');
    c.fillStyle = fg;
    c.fillRect(0, H - fadeH, W, fadeH);

    // Border
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(rad, 0.5); c.lineTo(W - rad, 0.5); c.quadraticCurveTo(W - 0.5, 0.5, W - 0.5, rad);
    c.lineTo(W - 0.5, H - rad); c.quadraticCurveTo(W - 0.5, H - 0.5, W - rad, H - 0.5);
    c.lineTo(rad, H - 0.5); c.quadraticCurveTo(0.5, H - 0.5, 0.5, H - rad);
    c.lineTo(0.5, rad); c.quadraticCurveTo(0.5, 0.5, rad, 0.5);
    c.stroke();

    c.restore(); // main clip
  }

  // ==================== MINI ====================

  function drawMini(canvas, avatar, equipped) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF', hc = avatar?.headColor || '#FFF', ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, 32, 32);
    c.fillStyle = hc; c.fillRect(8, 1, 16, 12);
    c.fillStyle = '#111'; c.fillRect(12, 5, 3, 4); c.fillRect(17, 5, 3, 4);
    c.fillStyle = ec; c.fillRect(12, 6, 2, 2); c.fillRect(18, 6, 2, 2);
    c.fillStyle = bc; c.fillRect(7, 13, 18, 12);
    c.fillStyle = shade(bc, -40); c.fillRect(8, 25, 6, 6); c.fillRect(18, 25, 6, 6);
  }

  // ==================== AUTO-APPLY SIDEBAR AVATAR ====================
  // Автоматически находит canvas#sidebar-avatar и рисует на нём
  // Работает на любой странице где есть этот элемент

  function autoApplySidebar() {
    const canvas = document.getElementById('sidebar-avatar');
    if (!canvas) return;

    // Увеличиваем разрешение для чёткости
    canvas.width = 80;
    canvas.height = 80;

    // Ждём данные пользователя
    function tryRender() {
      // Пробуем получить данные из глобальных переменных или fetch
      if (window.__tubloxUser) {
        drawSidebar(canvas, window.__tubloxUser.avatar, window.__tubloxUser.equipped || {});
        return;
      }

      // Пробуем fetch
      fetch('/api/me')
        .then(r => { if (r.ok) return r.json(); throw new Error(); })
        .then(user => {
          window.__tubloxUser = user;
          drawSidebar(canvas, user.avatar, user.equipped || {});
        })
        .catch(() => {
          // Рисуем дефолтного персонажа если не залогинен
          drawSidebar(canvas, { bodyColor: '#CCC', headColor: '#DDD', eyeColor: '#000' }, {});
        });
    }

    tryRender();
  }

  // Запуск при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoApplySidebar);
  } else {
    // DOM уже готов
    setTimeout(autoApplySidebar, 0);
  }

  return { draw, drawMini, drawSidebar, shade, autoApplySidebar };
})();