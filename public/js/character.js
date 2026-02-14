window.TubloxCharacter = (function() {
  'use strict';

  function shade(color, amt) {
    let R = parseInt(color.substring(1,3),16), G = parseInt(color.substring(3,5),16), B = parseInt(color.substring(5,7),16);
    R = Math.min(255, Math.max(0, R+amt)); G = Math.min(255, Math.max(0, G+amt)); B = Math.min(255, Math.max(0, B+amt));
    return '#'+R.toString(16).padStart(2,'0')+G.toString(16).padStart(2,'0')+B.toString(16).padStart(2,'0');
  }

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
    if (state === 'run') bobY = Math.sin(frame * Math.PI / 2) * 2;
    else if (state === 'idle') bobY = Math.sin(time * 2) * 1;

    if (isDead) {
      c.save(); c.globalAlpha = 0.5; c.translate(cx, bottom); c.rotate(90 * Math.PI / 180);
      drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, 'idle', 0, 0, time, false, 0, null, true, itemOn, equipped);
      c.restore(); return;
    }

    c.save(); c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cx, bottom+2, w/2+1, 3, 0, 0, Math.PI*2); c.fill(); c.restore();

    if (equipped.accessory) {
      const acc = equipped.accessory;
      const accType = acc.drawData?.type;
      const accCol = acc.color || '#888';
      if (accType === 'cape' || accType === 'wings' || accType === 'backpack') {
        c.save(); c.translate(cx, bottom); c.scale(dir, 1);
        drawAccessoryBehind(c, 0, 0, torsoW, torsoH, legH, headH, bobY, accType, accCol, time, state);
        c.restore();
      }
    }

    if (equipped.body_part) {
      const bp = equipped.body_part;
      if (bp.drawData?.type === 'tail') {
        c.save(); c.translate(cx, bottom); c.scale(dir, 1);
        drawTailCosmetic(c, torsoW, torsoH, legH, bobY, bp.color || '#8B4513', time);
        c.restore();
      }
    }

    c.save(); c.translate(cx, bottom); c.scale(dir, 1);
    drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem, false, itemOn, equipped);
    c.restore();

    if (typeof hp === 'number' && typeof maxHp === 'number' && hp < maxHp) {
      const barW = 40, barH = 4, bx = cx - barW/2, by = y - 22;
      c.fillStyle = '#333'; c.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, hp / maxHp);
      c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444';
      c.fillRect(bx, by, barW * pct, barH);
    }

    if (username) {
      c.save(); c.font = 'bold 11px Inter, sans-serif'; c.textAlign = 'center';
      c.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,0.7)';
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 4;
      const nameY = (typeof hp === 'number' && hp < (maxHp||100)) ? y - 28 : y - 12;
      c.fillText(username, cx, nameY); c.shadowBlur = 0; c.restore();
    }
  }

  function drawBody(c, ox, oy, headW, headH, torsoW, torsoH, legW, legH, armW, armH, totalH, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem, isDead, itemOn, equipped) {
    equipped = equipped || {};
    const legTop = -legH;
    const torsoTop = legTop - torsoH;
    const headTop = torsoTop - headH;

    // === LEGS ===
    const pantsEquip = equipped.pants;
    const pantsCol = pantsEquip ? (pantsEquip.color || shade(bc, -40)) : shade(bc, -40);
    const pantsType = pantsEquip?.drawData?.type;

    if (state === 'run') {
      const ls = Math.sin(frame * Math.PI / 2) * 25;
      c.save(); c.translate(-legW/2 - 1, legTop - bobY); c.rotate(ls * Math.PI / 180);
      c.fillStyle = pantsCol; c.fillRect(0, 0, legW, legH);
      drawLegDetail(c, legW, legH, pantsType, pantsCol, 0, 0);
      c.restore();
      c.save(); c.translate(legW/2 + 1, legTop - bobY); c.rotate(-ls * Math.PI / 180);
      c.fillStyle = pantsCol; c.fillRect(0, 0, legW, legH);
      drawLegDetail(c, legW, legH, pantsType, pantsCol, 0, 0);
      c.restore();
    } else if (state === 'jump' || state === 'fall') {
      c.fillStyle = pantsCol;
      c.fillRect(-legW - 1, legTop - bobY, legW, legH - 3);
      drawLegDetail(c, legW, legH - 3, pantsType, pantsCol, -legW - 1, legTop - bobY);
      c.fillRect(1, legTop - bobY, legW, legH - 3);
      drawLegDetail(c, legW, legH - 3, pantsType, pantsCol, 1, legTop - bobY);
    } else {
      c.fillStyle = pantsCol;
      c.fillRect(-legW - 1, legTop - bobY, legW, legH);
      drawLegDetail(c, legW, legH, pantsType, pantsCol, -legW - 1, legTop - bobY);
      c.fillRect(1, legTop - bobY, legW, legH);
      drawLegDetail(c, legW, legH, pantsType, pantsCol, 1, legTop - bobY);
    }

    // === BACK ARM ===
    const armAttachY = torsoTop + 2 - bobY;
    const bArmAngle = state === 'run' ? Math.sin(frame*Math.PI/2)*25 : state === 'jump' ? -35 : Math.sin(time*1.5)*3;
    c.save(); c.translate(-torsoW/2-1, armAttachY); c.rotate(bArmAngle*Math.PI/180);
    drawArm(c, armW, armH, bc, equipped); c.restore();

    // === TORSO ===
    const shirtEquip = equipped.shirt;
    const shirtCol = shirtEquip ? (shirtEquip.color || bc) : bc;
    const shirtType = shirtEquip?.drawData?.type;
    drawTorso(c, torsoW, torsoH, torsoTop, bobY, shirtType, shirtCol, bc);

    if (equipped.accessory) {
      const accType = equipped.accessory.drawData?.type;
      const accCol = equipped.accessory.color || '#888';
      if (accType === 'scarf') {
        c.fillStyle = accCol;
        c.fillRect(-torsoW/2, torsoTop-bobY-2, torsoW, 6);
        c.fillStyle = shade(accCol, -20);
        c.fillRect(-3, torsoTop-bobY+4, 6, 10);
      } else if (accType === 'necklace') {
        c.strokeStyle = accCol; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, torsoTop-bobY+8, torsoW*0.3, 0.3, Math.PI-0.3); c.stroke();
        c.fillStyle = accCol; c.beginPath(); c.arc(0, torsoTop-bobY+8+torsoW*0.3, 3, 0, Math.PI*2); c.fill();
      }
    }

    // === HEAD ===
    c.fillStyle = hc;
    c.fillRect(-headW/2, headTop-bobY, headW, headH);

    if (equipped.hair) drawHairCosmetic(c, headW, headH, headTop, bobY, equipped.hair, time);

    // === FACE (clipped to head) ===
    c.save();
    c.beginPath();
    c.rect(-headW/2, headTop - bobY, headW, headH);
    c.clip();

    const faceType = equipped.face?.drawData?.type;
    if (faceType) {
      drawFaceCosmetic(c, headW, headH, headTop, bobY, faceType, ec, time, isDead);
    } else {
      drawDefaultFace(c, headW, headH, headTop, bobY, ec, time, isDead);
    }

    c.restore();

    if (equipped.hat) drawHatCosmetic(c, headW, headH, headTop, bobY, equipped.hat, time);

    // === BODY PARTS ===
    if (equipped.body_part) {
      const bpType = equipped.body_part.drawData?.type;
      const bpCol = equipped.body_part.color || '#888';
      if (bpType === 'robot_arms') {
        c.fillStyle = bpCol;
        c.fillRect(-torsoW/2-armW-4, armAttachY, armW+2, armH);
        c.fillRect(torsoW/2+2, armAttachY, armW+2, armH);
        c.fillStyle = shade(bpCol, -20);
        c.fillRect(-torsoW/2-armW-3, armAttachY+armH*0.3, armW, 3);
        c.fillRect(torsoW/2+3, armAttachY+armH*0.3, armW, 3);
      } else if (bpType === 'claws') {
        c.fillStyle = bpCol;
        for (let i = 0; i < 3; i++) {
          const cx2 = torsoW/2 + armW + 2 + i*3;
          c.fillRect(cx2, armAttachY+armH-2, 2, 8);
          c.fillRect(-cx2-2, armAttachY+armH-2, 2, 8);
        }
      }
    }

    // === FRONT ARM + HELD ITEM ===
    const frontArmX = torsoW/2+1;
    if (activeItem === 'sword') {
      if (attacking) {
        let angle;
        if (attackProgress < 0.15) angle = -45*(attackProgress/0.15);
        else if (attackProgress < 0.5) angle = -45+165*((attackProgress-0.15)/0.35);
        else angle = 120-135*((attackProgress-0.5)/0.5);
        c.save(); c.translate(frontArmX, armAttachY); c.rotate(angle*Math.PI/180);
        c.fillStyle = shade(bc,-10); c.fillRect(0,0,armW,armH);
        drawSword(c, armW/2-2, armH, armH*1.4); c.restore();
      } else {
        const s = Math.sin(time*1.5)*3;
        c.save(); c.translate(frontArmX, armAttachY); c.rotate((-10+s)*Math.PI/180);
        c.fillStyle = shade(bc,-10); c.fillRect(0,0,armW,armH);
        drawSword(c, armW/2-2, armH, armH*1.2); c.restore();
      }
    } else if (activeItem === 'flashlight') {
      const s = Math.sin(time*1.5)*3;
      c.save(); c.translate(frontArmX, armAttachY); c.rotate((-15+s)*Math.PI/180);
      c.fillStyle = shade(bc,-10); c.fillRect(0,0,armW,armH);
      drawFlashlight(c, armW/2, armH, armH*0.8, itemOn, time); c.restore();
    } else if (activeItem === 'shield') {
      const s = Math.sin(time*1.5)*3;
      c.save(); c.translate(frontArmX, armAttachY); c.rotate((-5+s*0.5)*Math.PI/180);
      c.fillStyle = shade(bc,-10); c.fillRect(0,0,armW,armH);
      drawShieldHeld(c, armW/2, armH*0.4, armH*0.9, itemOn, time); c.restore();
    } else {
      const aAngle = state === 'run' ? -Math.sin(frame*Math.PI/2)*25 : state === 'jump' ? 35 : -Math.sin(time*1.5)*3;
      c.save(); c.translate(frontArmX, armAttachY); c.rotate(aAngle*Math.PI/180);
      drawArm(c, armW, armH, bc, equipped); c.restore();
    }
  }

  // ==================== DEFAULT FACE (no cosmetic) ====================

  function drawDefaultFace(c, headW, headH, headTop, bobY, ec, time, isDead) {
    const blink = Math.sin(time*2.5) > 0.93;
    const eyeY = headTop + headH*0.35 - bobY;
    const eyeSize = Math.max(2, Math.round(headW*0.12));
    const eyeGap = Math.round(headW*0.10);
    if (isDead) {
      c.strokeStyle = ec; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-eyeGap-eyeSize, eyeY); c.lineTo(-eyeGap, eyeY+eyeSize); c.moveTo(-eyeGap, eyeY); c.lineTo(-eyeGap-eyeSize, eyeY+eyeSize); c.stroke();
      c.beginPath(); c.moveTo(eyeGap, eyeY); c.lineTo(eyeGap+eyeSize, eyeY+eyeSize); c.moveTo(eyeGap+eyeSize, eyeY); c.lineTo(eyeGap, eyeY+eyeSize); c.stroke();
    } else if (!blink) {
      c.fillStyle = '#111'; c.fillRect(eyeGap, eyeY, eyeSize+1, eyeSize+2); c.fillRect(-eyeGap-eyeSize-1, eyeY, eyeSize+1, eyeSize+2);
      c.fillStyle = ec; c.fillRect(eyeGap+1, eyeY+1, eyeSize, eyeSize); c.fillRect(-eyeGap-eyeSize, eyeY+1, eyeSize, eyeSize);
    } else {
      c.fillStyle = ec; c.fillRect(eyeGap, eyeY+eyeSize/2, eyeSize+1, 2); c.fillRect(-eyeGap-eyeSize-1, eyeY+eyeSize/2, eyeSize+1, 2);
    }
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-2, headTop+headH*0.75-bobY, 4, 2);
  }

  // ==================== COSMETIC HELPERS ====================

  function drawLegDetail(c, w, h, pantsType, col, x, y) {
    if (pantsType === 'shorts' && h > 15) {
      c.fillStyle = shade(col, 20);
      c.fillRect(x, y + h * 0.6, w, h * 0.4);
    } else if (pantsType === 'cargo') {
      c.fillStyle = shade(col, -15);
      c.fillRect(x + 1, y + h * 0.4, w - 2, 5);
    } else if (pantsType === 'royal_legs') {
      c.fillStyle = '#FFD700';
      c.fillRect(x, y, w, 2);
      c.fillRect(x, y + h - 2, w, 2);
    } else if (pantsType === 'sweatpants') {
      c.fillStyle = shade(col, 10);
      c.fillRect(x, y, w, 4);
    }
  }

  function drawArm(c, w, h, bc, equipped) {
    c.fillStyle = shade(bc, -10);
    const shirtType = equipped?.shirt?.drawData?.type;
    if (shirtType === 'hoodie' || shirtType === 'jacket') {
      c.fillStyle = equipped.shirt.color || bc;
    }
    c.fillRect(0, 0, w, h);
  }

  function drawTorso(c, tw, th, torsoTop, bobY, shirtType, shirtCol, bc) {
    if (!shirtType) {
      c.fillStyle = bc;
      c.fillRect(-tw/2, torsoTop-bobY, tw, th);
      return;
    }
    c.fillStyle = shirtCol;
    c.fillRect(-tw/2, torsoTop-bobY, tw, th);
    switch(shirtType) {
      case 'hoodie': c.fillStyle = shade(shirtCol, -20); c.fillRect(-tw/2, torsoTop-bobY, tw, 5); c.fillStyle = shade(shirtCol, -10); c.fillRect(-4, torsoTop-bobY+th*0.3, 8, 10); break;
      case 'jacket': c.fillStyle = shade(shirtCol, -15); c.fillRect(-1, torsoTop-bobY, 2, th); c.fillStyle = shade(shirtCol, 15); c.fillRect(-tw/2+1, torsoTop-bobY+th*0.3, 5, 8); break;
      case 'stripe_shirt': c.fillStyle = 'rgba(255,255,255,0.15)'; for (let y = 0; y < th; y += 5) c.fillRect(-tw/2, torsoTop-bobY+y, tw, 2); break;
      case 'gold_armor': c.fillStyle = '#DAA520'; c.fillRect(-tw/2, torsoTop-bobY, tw, 3); c.fillRect(-tw/2, torsoTop-bobY+th-3, tw, 3); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(-tw/2, torsoTop-bobY, 4, th); break;
      case 'tank_top': c.fillStyle = shade(shirtCol, -10); c.fillRect(-tw/2, torsoTop-bobY, tw, 2); break;
      default: c.fillStyle = shade(shirtCol, 10); c.fillRect(-tw/2, torsoTop-bobY, tw, 2);
    }
  }

  // ==================== FACE COSMETIC WITH UNIQUE ANIMATIONS ====================

  function drawFaceCosmetic(c, headW, headH, headTop, bobY, type, ec, time, isDead) {
    // All face coordinates are relative to head bounds
    const headCenterX = 0;
    const headCenterY = headTop + headH * 0.5 - bobY;
    const eyeY = headTop + headH * 0.35 - bobY;
    const maxEyeSize = Math.max(2, Math.round(Math.min(headW * 0.11, headH * 0.15)));
    const eyeSize = maxEyeSize;
    const gap = Math.round(headW * 0.10);
    const mouthY = headTop + headH * 0.65 - bobY;

    // Constrain limits
    const leftBound = -headW/2 + 2;
    const rightBound = headW/2 - 2;
    const topBound = headTop - bobY + 2;
    const bottomBound = headTop + headH - bobY - 2;

    switch(type) {
      case 'smile': {
        // ANIMATION: Eyes squint happily periodically, mouth widens
        const blink = Math.sin(time * 2.5) > 0.93;
        const happyPulse = Math.sin(time * 3) * 0.3 + 0.7; // 0.4 to 1.0
        const mouthWidth = headW * 0.15 + happyPulse * headW * 0.05;

        if (!blink) {
          // Happy squinted eyes animation
          const squint = Math.sin(time * 1.8);
          const eyeH = squint > 0.7 ? eyeSize * 0.4 : eyeSize;
          c.fillStyle = '#000';
          c.beginPath(); c.arc(-gap, eyeY, eyeH * 0.8, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY, eyeH * 0.8, 0, Math.PI * 2); c.fill();
          // Highlight
          c.fillStyle = 'rgba(255,255,255,0.3)';
          c.beginPath(); c.arc(-gap - 1, eyeY - 1, eyeH * 0.3, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap - 1, eyeY - 1, eyeH * 0.3, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = '#000';
          c.fillRect(-gap - eyeSize, eyeY, eyeSize * 2, 2);
          c.fillRect(gap - eyeSize, eyeY, eyeSize * 2, 2);
        }
        // Animated smile mouth
        c.strokeStyle = '#000'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, mouthY - 4, mouthWidth, 0.15, Math.PI - 0.15); c.stroke();
        // Cheek blush
        c.fillStyle = 'rgba(255, 150, 150, 0.15)';
        c.beginPath(); c.arc(-gap - 2, mouthY - 5, 3, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap + 2, mouthY - 5, 3, 0, Math.PI * 2); c.fill();
        break;
      }

      case 'cool': {
        // ANIMATION: Sunglasses shimmer, slight head tilt feeling via offset, mouth smirk
        const shimmer = Math.sin(time * 4) * 0.15;
        const glassY = eyeY - 2;
        const glassH = eyeSize + 3;
        const glassW = headW * 0.35;

        // Sunglasses frame
        c.fillStyle = '#111';
        c.fillRect(Math.max(leftBound, -glassW), glassY, Math.min(glassW * 2, rightBound - leftBound), glassH);

        // Left lens
        c.fillStyle = `rgba(50,50,80,${0.85 + shimmer})`;
        c.fillRect(Math.max(leftBound + 2, -glassW + 3), glassY + 2, glassW * 0.45, glassH - 4);
        // Right lens
        c.fillRect(Math.min(rightBound - glassW * 0.45 - 2, glassW * 0.1), glassY + 2, glassW * 0.45, glassH - 4);

        // Shimmer highlight
        c.fillStyle = `rgba(255,255,255,${0.1 + shimmer * 0.5})`;
        const shimX = (Math.sin(time * 2) * 0.5 + 0.5) * glassW * 0.3;
        c.fillRect(-glassW + 4 + shimX, glassY + 2, 3, glassH - 4);

        // Bridge
        c.fillStyle = '#222';
        c.fillRect(-2, glassY + 1, 4, glassH - 2);

        // Smirk mouth - slight animation
        const smirkOff = Math.sin(time * 1.2) * 1;
        c.strokeStyle = '#000'; c.lineWidth = 1;
        c.beginPath();
        c.moveTo(-headW * 0.1, mouthY + smirkOff);
        c.quadraticCurveTo(headW * 0.05, mouthY + 3 + smirkOff, headW * 0.12, mouthY - 1 + smirkOff);
        c.stroke();
        break;
      }

      case 'angry': {
        // ANIMATION: Eyebrows twitch, eyes pulse slightly red, mouth snarls
        const blink = Math.sin(time * 2.5) > 0.93;
        const rage = Math.sin(time * 6) * 0.5; // fast twitch
        const browAngle = 4 + rage;

        if (!blink) {
          // Red tinted angry eyes
          const eyePulse = Math.sin(time * 5) * 0.15;
          c.fillStyle = `rgba(${180 + Math.floor(eyePulse * 75)}, 0, 0, 0.15)`;
          c.beginPath(); c.arc(-gap, eyeY + 1, eyeSize + 2, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY + 1, eyeSize + 2, 0, Math.PI * 2); c.fill();

          c.fillStyle = '#000';
          c.beginPath(); c.arc(-gap, eyeY + 1, eyeSize * 0.8, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY + 1, eyeSize * 0.8, 0, Math.PI * 2); c.fill();

          // Animated angry pupils (smaller, intense)
          c.fillStyle = '#600';
          c.beginPath(); c.arc(-gap, eyeY + 1, eyeSize * 0.3, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(gap, eyeY + 1, eyeSize * 0.3, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = '#000';
          c.fillRect(-gap - eyeSize, eyeY + 1, eyeSize * 2, 2);
          c.fillRect(gap - eyeSize, eyeY + 1, eyeSize * 2, 2);
        }

        // Animated angry eyebrows
        c.strokeStyle = '#000'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-gap - eyeSize, eyeY - browAngle - 2); c.lineTo(-gap + eyeSize, eyeY - 1); c.stroke();
        c.beginPath(); c.moveTo(gap + eyeSize, eyeY - browAngle - 2); c.lineTo(gap - eyeSize, eyeY - 1); c.stroke();

        // Snarling mouth
        const snarl = Math.sin(time * 4) * 1.5;
        c.strokeStyle = '#000'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, mouthY + 3 + snarl, headW * 0.1, Math.PI + 0.3, -0.3); c.stroke();

        // Teeth
        c.fillStyle = '#fff';
        c.fillRect(-3, mouthY + 1 + snarl, 2, 2);
        c.fillRect(1, mouthY + 1 + snarl, 2, 2);
        break;
      }

      case 'wink': {
        // ANIMATION: Winking eye alternates, sparkle near winking eye
        const blink = Math.sin(time * 2.5) > 0.93;
        const winkCycle = Math.floor(time * 0.5) % 2 === 0; // alternates which eye winks
        const sparkle = Math.sin(time * 8) > 0.5;

        if (!blink) {
          // Open eye
          c.fillStyle = '#000';
          c.beginPath(); c.arc(-gap, eyeY, eyeSize * 0.85, 0, Math.PI * 2); c.fill();
          // Highlight
          c.fillStyle = 'rgba(255,255,255,0.4)';
          c.beginPath(); c.arc(-gap - 1, eyeY - 1, eyeSize * 0.3, 0, Math.PI * 2); c.fill();
        }

        // Winking eye (always winking line)
        c.strokeStyle = '#000'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(gap - eyeSize, eyeY); c.lineTo(gap + eyeSize, eyeY); c.stroke();

        // Sparkle animation near wink
        if (sparkle) {
          c.strokeStyle = '#FFD700'; c.lineWidth = 1;
          const sx = gap + eyeSize + 3;
          const sy = eyeY - 3;
          c.beginPath(); c.moveTo(sx, sy - 3); c.lineTo(sx, sy + 3); c.stroke();
          c.beginPath(); c.moveTo(sx - 3, sy); c.lineTo(sx + 3, sy); c.stroke();
          c.beginPath(); c.moveTo(sx - 2, sy - 2); c.lineTo(sx + 2, sy + 2); c.stroke();
          c.beginPath(); c.moveTo(sx + 2, sy - 2); c.lineTo(sx - 2, sy + 2); c.stroke();
        }

        // Playful smile
        const smileW = Math.sin(time * 2) * 1 + headW * 0.12;
        c.strokeStyle = '#000'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, mouthY - 3, smileW, 0.1, Math.PI - 0.1); c.stroke();

        // Tongue poke animation
        const tongue = Math.sin(time * 1.5);
        if (tongue > 0.3) {
          c.fillStyle = '#FF6B6B';
          c.beginPath(); c.arc(headW * 0.06, mouthY + 1, 2, 0, Math.PI); c.fill();
        }
        break;
      }

      case 'robot': {
        // ANIMATION: Scanning eyes, digital mouth flickers, HUD elements
        const scanX = Math.sin(time * 3) * (gap * 0.4);
        const flicker = Math.sin(time * 12) > 0 ? 1 : 0.7;
        const scanLine = (time * 50) % headH;

        // Scan line effect
        c.fillStyle = `rgba(0, 255, 0, 0.03)`;
        c.fillRect(-headW/2 + 2, headTop - bobY + scanLine, headW - 4, 2);

        // Digital eyes with scanning pupil
        c.fillStyle = `rgba(0, 255, 0, ${0.3 * flicker})`;
        c.fillRect(-gap - 3, eyeY - 2, 6, 6);
        c.fillRect(gap - 3, eyeY - 2, 6, 6);

        c.fillStyle = `rgba(0, 255, 0, ${flicker})`;
        c.fillRect(-gap - 1 + scanX * 0.3, eyeY, 2, 2);
        c.fillRect(gap - 1 + scanX * 0.3, eyeY, 2, 2);

        // Outer glow
        c.strokeStyle = `rgba(0, 255, 0, ${0.3 * flicker})`;
        c.lineWidth = 0.5;
        c.strokeRect(-gap - 4, eyeY - 3, 8, 8);
        c.strokeRect(gap - 4, eyeY - 3, 8, 8);

        // Digital mouth - animated segments
        const segments = 5;
        const segW = headW * 0.06;
        for (let i = 0; i < segments; i++) {
          const segH = Math.sin(time * 8 + i * 1.5) > 0 ? 2 : 1;
          c.fillStyle = `rgba(0, ${180 + Math.floor(Math.sin(time * 6 + i) * 75)}, 0, ${flicker})`;
          c.fillRect(-headW * 0.15 + i * segW, mouthY - 1, segW - 1, segH);
        }

        // HUD bracket decorations
        c.strokeStyle = `rgba(0, 255, 0, ${0.15 * flicker})`;
        c.lineWidth = 0.5;
        // top-left bracket
        c.beginPath(); c.moveTo(leftBound + 3, topBound + 6); c.lineTo(leftBound + 3, topBound + 3); c.lineTo(leftBound + 6, topBound + 3); c.stroke();
        // top-right bracket
        c.beginPath(); c.moveTo(rightBound - 3, topBound + 6); c.lineTo(rightBound - 3, topBound + 3); c.lineTo(rightBound - 6, topBound + 3); c.stroke();
        break;
      }

      case 'skull': {
        // ANIMATION: Eyes flicker/glow, jaw chatters, ghostly particles
        const flicker = Math.sin(time * 7) * 0.3 + 0.7;
        const jawOpen = Math.sin(time * 2.5) * 1.5 + 1.5; // 0 to 3

        // Eye sockets
        c.fillStyle = '#000';
        c.beginPath(); c.arc(-gap, eyeY, eyeSize + 1, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap, eyeY, eyeSize + 1, 0, Math.PI * 2); c.fill();

        // Glowing eye pupils
        c.fillStyle = `rgba(255, ${Math.floor(50 * flicker)}, ${Math.floor(50 * flicker)}, ${flicker})`;
        c.beginPath(); c.arc(-gap, eyeY, eyeSize * 0.5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap, eyeY, eyeSize * 0.5, 0, Math.PI * 2); c.fill();

        // Eye glow
        c.fillStyle = `rgba(255, 0, 0, ${0.1 * flicker})`;
        c.beginPath(); c.arc(-gap, eyeY, eyeSize + 3, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(gap, eyeY, eyeSize + 3, 0, Math.PI * 2); c.fill();

        // Nose hole
        c.fillStyle = '#000';
        c.beginPath(); c.moveTo(-1, mouthY - 6); c.lineTo(1, mouthY - 6); c.lineTo(0, mouthY - 3); c.fill();

        // Chattering teeth
        const teethY = mouthY + jawOpen;
        c.fillStyle = '#888';
        const teethCount = 4;
        const teethWidth = headW * 0.06;
        for (let i = 0; i < teethCount; i++) {
          const tx = -headW * 0.12 + i * teethWidth * 1.1;
          c.fillRect(tx, mouthY - 1, teethWidth - 1, 3);
          c.fillRect(tx, teethY, teethWidth - 1, 3);
        }

        // Ghostly particles
        for (let i = 0; i < 3; i++) {
          const px = Math.sin(time * 2 + i * 2.1) * headW * 0.3;
          const py = headTop - bobY + ((time * 15 + i * 30) % headH);
          const pa = Math.max(0, 0.15 - (py - headTop + bobY) / headH * 0.2);
          c.fillStyle = `rgba(200, 200, 255, ${pa})`;
          c.beginPath(); c.arc(px, py, 1.5, 0, Math.PI * 2); c.fill();
        }
        break;
      }

      default: {
        drawDefaultFace(c, headW, headH, headTop, bobY, ec, time, isDead);
        break;
      }
    }
  }

  function drawHairCosmetic(c, headW, headH, headTop, bobY, hairEquip, time) {
    const type = hairEquip.drawData?.type; const col = hairEquip.color || '#222222'; c.fillStyle = col; const ht = headTop - bobY;
    switch(type) {
      case 'spiky': for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i*headW*0.15-headW*0.08, ht+3); c.lineTo(i*headW*0.15, ht-8-Math.abs(i)*2); c.lineTo(i*headW*0.15+headW*0.08, ht+3); c.fill(); } break;
      case 'long': c.beginPath(); c.ellipse(0, ht+headH*0.3, headW*0.55, headH*0.5, 0, 0, Math.PI*2); c.fill(); c.fillRect(-headW*0.5, ht+headH*0.4, headW*0.15, headH*0.8); c.fillRect(headW*0.35, ht+headH*0.4, headW*0.15, headH*0.8); break;
      case 'mohawk': c.fillRect(-headW*0.08, ht-10, headW*0.16, headH+5); c.fillStyle = shade(col, 20); c.fillRect(-headW*0.06, ht-8, headW*0.12, headH+2); break;
      case 'curly': for (let i = 0; i < 8; i++) { const angle = (i/8)*Math.PI*2; c.beginPath(); c.arc(Math.cos(angle)*headW*0.35, ht+headH*0.25+Math.sin(angle)*headH*0.3, headW*0.15, 0, Math.PI*2); c.fill(); } break;
      case 'fire': const cols = ['#FF4500','#FF6600','#FFD700','#FF0000']; for (let i = 0; i < 5; i++) { c.fillStyle = cols[i%cols.length]; c.beginPath(); c.moveTo((i-2)*headW*0.16-headW*0.06, ht+2); c.lineTo((i-2)*headW*0.16, ht-12-Math.sin(time*6+i)*4); c.lineTo((i-2)*headW*0.16+headW*0.06, ht+2); c.fill(); } break;
    }
  }

  function drawHatCosmetic(c, headW, headH, headTop, bobY, hatEquip, time) {
    const type = hatEquip.drawData?.type; const col = hatEquip.color || '#222222'; const ht = headTop - bobY; c.fillStyle = col;
    switch(type) {
      case 'baseball_cap': c.fillRect(-headW*0.55, ht-2, headW*1.1, headH*0.3); c.beginPath(); c.ellipse(0, ht-2, headW*0.55, headH*0.15, 0, Math.PI, 0); c.fill(); c.fillRect(-headW*0.6, ht+headH*0.25, headW*1.2, 3); break;
      case 'top_hat': c.fillRect(-headW*0.35, ht-headH*0.6, headW*0.7, headH*0.65); c.fillRect(-headW*0.5, ht+2, headW, 4); c.fillStyle = shade(col, 30); c.fillRect(-headW*0.3, ht-headH*0.15, headW*0.6, 3); break;
      case 'crown': c.fillStyle = '#FFD700'; c.fillRect(-headW*0.45, ht-2, headW*0.9, headH*0.25); [-0.4,0,0.4].forEach(p => { c.beginPath(); c.moveTo(headW*p-headW*0.08, ht-2); c.lineTo(headW*p, ht-headH*0.35); c.lineTo(headW*p+headW*0.08, ht-2); c.fill(); }); c.fillStyle = '#EF4444'; c.beginPath(); c.arc(0, ht-headH*0.25, 2, 0, Math.PI*2); c.fill(); break;
      case 'beanie': c.beginPath(); c.ellipse(0, ht+2, headW*0.52, headH*0.3, 0, Math.PI, 0); c.fill(); c.fillRect(-headW*0.52, ht+2, headW*1.04, headH*0.15); c.fillStyle = shade(col, -15); for (let x = -headW*0.48; x < headW*0.48; x += 3) c.fillRect(x, ht+2, 1, headH*0.15); break;
      case 'ninja_headband': c.fillRect(-headW*0.55, ht+headH*0.15, headW*1.1, headH*0.18); c.fillStyle = shade(col, 10); c.fillRect(-headW*0.55, ht+headH*0.22, headW*1.1, 2); c.fillStyle = col; c.beginPath(); c.moveTo(headW*0.55, ht+headH*0.15); c.quadraticCurveTo(headW*0.8, ht, headW*0.7, ht-headH*0.2); c.lineTo(headW*0.65, ht-headH*0.15); c.quadraticCurveTo(headW*0.72, ht+headH*0.05, headW*0.55, ht+headH*0.33); c.fill(); break;
    }
  }

  function drawAccessoryBehind(c, ox, oy, tw, th, lh, hh, bobY, type, col, time, state) {
    const torsoTop = -lh - th;
    switch(type) {
      case 'cape': c.fillStyle = col; const cw = Math.sin(time*3)*3 + (state === 'run' ? 5 : 0); c.beginPath(); c.moveTo(-tw*0.4, torsoTop-bobY+3); c.lineTo(tw*0.4, torsoTop-bobY+3); c.quadraticCurveTo(tw*0.3, -bobY+cw, tw*0.35, -bobY+lh*0.5); c.lineTo(-tw*0.35, -bobY+lh*0.5); c.quadraticCurveTo(-tw*0.3, -bobY+cw, -tw*0.4, torsoTop-bobY+3); c.fill(); break;
      case 'wings': c.save(); c.globalAlpha = 0.5; c.fillStyle = col; const wf = Math.sin(time*4)*0.15; c.save(); c.rotate(-0.3+wf); c.beginPath(); c.moveTo(-tw*0.3, torsoTop-bobY+th*0.3); c.quadraticCurveTo(-tw*1.2, torsoTop-bobY-hh, -tw*0.8, torsoTop-bobY+th*0.6); c.fill(); c.restore(); c.save(); c.rotate(0.3-wf); c.beginPath(); c.moveTo(tw*0.3, torsoTop-bobY+th*0.3); c.quadraticCurveTo(tw*1.2, torsoTop-bobY-hh, tw*0.8, torsoTop-bobY+th*0.6); c.fill(); c.restore(); c.restore(); break;
      case 'backpack': c.fillStyle = col; c.fillRect(-tw*0.35, torsoTop-bobY+5, tw*0.7, th*0.8); c.fillStyle = shade(col, -15); c.fillRect(-tw*0.25, torsoTop-bobY+th*0.4, tw*0.5, th*0.25); break;
    }
  }

  function drawTailCosmetic(c, tw, th, lh, bobY, col, time) {
    const tailBaseY = -lh - 5 - bobY; const wag = Math.sin(time*3)*0.3;
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-tw*0.4, tailBaseY); c.quadraticCurveTo(-tw*0.8+Math.sin(time*3)*5, tailBaseY-15, -tw*0.6+wag*10, tailBaseY-25); c.stroke();
    c.fillStyle = shade(col, 20); c.beginPath(); c.arc(-tw*0.6+wag*10, tailBaseY-25, 3, 0, Math.PI*2); c.fill();
  }

  function drawSword(c, sx, sy, bladeLen) { c.fillStyle = '#8B6914'; c.fillRect(sx-1, sy-2, 4, 5); c.fillStyle = '#CCAA00'; c.fillRect(sx-3, sy+3, 8, 2); c.fillStyle = '#CCCCCC'; c.fillRect(sx, sy+5, 3, bladeLen); c.fillStyle = '#EEEEEE'; c.fillRect(sx, sy+5, 1, bladeLen); c.fillStyle = '#DDDDDD'; c.beginPath(); c.moveTo(sx, sy+5+bladeLen); c.lineTo(sx+3, sy+5+bladeLen); c.lineTo(sx+1.5, sy+5+bladeLen+4); c.fill(); }
  function drawFlashlight(c, cx, sy, len, isOn, time) { c.fillStyle = '#444'; c.fillRect(cx-2.5, sy, 5, len); c.fillStyle = '#333'; for (let i = 0; i < 3; i++) c.fillRect(cx-3, sy+len*0.3+i*3, 6, 1); c.fillStyle = '#555'; c.fillRect(cx-4, sy+len-2, 8, 4); if (isOn) { c.fillStyle = '#FFE066'; c.fillRect(cx-3, sy+len+2, 6, 2); c.fillStyle = 'rgba(255,224,102,0.4)'; c.beginPath(); c.arc(cx, sy+len+3, 5, 0, Math.PI*2); c.fill(); } else { c.fillStyle = '#333'; c.fillRect(cx-3, sy+len+2, 6, 2); } c.fillStyle = isOn ? '#88DD88' : '#AA4444'; c.fillRect(cx+2.5, sy+2, 2, 3); }
  function drawShieldHeld(c, cx, sy, size, isActive, time) { const sw = size*0.7, sh = size; c.fillStyle = isActive ? '#4488CC' : '#335577'; c.beginPath(); c.moveTo(cx, sy-sh*0.1); c.lineTo(cx+sw/2, sy+sh*0.15); c.lineTo(cx+sw/2, sy+sh*0.55); c.lineTo(cx, sy+sh*0.75); c.lineTo(cx-sw/2, sy+sh*0.55); c.lineTo(cx-sw/2, sy+sh*0.15); c.closePath(); c.fill(); c.strokeStyle = isActive ? '#66AAEE' : '#557799'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = isActive ? '#66AAEE' : '#557799'; c.beginPath(); c.arc(cx, sy+sh*0.3, sw*0.18, 0, Math.PI*2); c.fill(); }

  function drawMini(canvas, avatar) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF', hc = avatar?.headColor || '#FFF', ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#1a1a1a'; c.fillRect(0,0,32,32);
    c.fillStyle = hc; c.fillRect(8,1,16,12);
    c.fillStyle = '#111'; c.fillRect(12,5,3,4); c.fillRect(17,5,3,4);
    c.fillStyle = ec; c.fillRect(12,6,2,2); c.fillRect(18,6,2,2);
    c.fillStyle = bc; c.fillRect(7,13,18,12);
    c.fillStyle = shade(bc,-40); c.fillRect(8,25,6,6); c.fillRect(18,25,6,6);
  }

  function drawSidebar(canvas, avatar, equipped) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF', hc = avatar?.headColor || '#FFF', ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#111'; c.fillRect(0,0,40,40);
    const pantsCol = equipped?.pants?.color || shade(bc,-40);
    c.fillStyle = pantsCol; c.fillRect(10,29,8,10); c.fillRect(22,29,8,10);
    const shirtCol = equipped?.shirt?.color || bc;
    c.fillStyle = shirtCol; c.fillRect(8,15,24,14);
    if (equipped?.shirt?.drawData?.type === 'stripe_shirt') { c.fillStyle = 'rgba(255,255,255,0.15)'; for (let y = 16; y < 29; y += 4) c.fillRect(8, y, 24, 2); }
    c.fillStyle = hc; c.fillRect(10,1,20,14);
    if (equipped?.hair) { const hairCol = equipped.hair.color || '#222'; c.fillStyle = hairCol; const ht = equipped.hair.drawData?.type; if (ht === 'spiky') { for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(15+i*5, 3); c.lineTo(18+i*5, -3); c.lineTo(21+i*5, 3); c.fill(); } } else if (ht === 'mohawk') { c.fillRect(17, -3, 6, 7); } else if (ht === 'long') { c.fillRect(8, 2, 5, 16); c.fillRect(27, 2, 5, 16); c.beginPath(); c.ellipse(20, 6, 12, 6, 0, 0, Math.PI*2); c.fill(); } else if (ht === 'curly') { for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(12+i*3.5, 2+Math.sin(i)*2, 3, 0, Math.PI*2); c.fill(); } } else if (ht === 'fire') { const fc = ['#FF4500','#FF6600','#FFD700']; for (let i = 0; i < 4; i++) { c.fillStyle = fc[i%fc.length]; c.beginPath(); c.moveTo(12+i*5, 3); c.lineTo(14+i*5, -4); c.lineTo(16+i*5, 3); c.fill(); } } }
    if (equipped?.hat) { const hatCol = equipped.hat.color || '#222'; c.fillStyle = hatCol; const ht = equipped.hat.drawData?.type; if (ht === 'baseball_cap') { c.fillRect(8, 0, 24, 5); c.fillRect(6, 5, 28, 2); } else if (ht === 'top_hat') { c.fillRect(12, -8, 16, 10); c.fillRect(8, 2, 24, 3); } else if (ht === 'crown') { c.fillStyle = '#FFD700'; c.fillRect(10, 0, 20, 4); c.beginPath(); c.moveTo(12, 0); c.lineTo(14, -5); c.lineTo(16, 0); c.fill(); c.beginPath(); c.moveTo(18, 0); c.lineTo(20, -6); c.lineTo(22, 0); c.fill(); c.beginPath(); c.moveTo(24, 0); c.lineTo(26, -5); c.lineTo(28, 0); c.fill(); } else if (ht === 'beanie') { c.beginPath(); c.ellipse(20, 2, 12, 6, 0, Math.PI, 0); c.fill(); c.fillRect(8, 2, 24, 4); } else if (ht === 'ninja_headband') { c.fillRect(8, 4, 24, 4); c.fillStyle = shade(hatCol, 10); c.fillRect(8, 5, 24, 1); } }

    // Face in sidebar - clip to head area
    c.save();
    c.beginPath();
    c.rect(10, 1, 20, 14);
    c.clip();

    const faceType = equipped?.face?.drawData?.type;
    if (faceType) {
      drawSidebarFace(c, faceType, ec);
    } else {
      c.fillStyle = '#111'; c.fillRect(15,6,4,4); c.fillRect(22,6,4,4);
      c.fillStyle = ec; c.fillRect(16,7,2,2); c.fillRect(23,7,2,2);
    }
    c.restore();

    if (equipped?.accessory) { const at = equipped.accessory.drawData?.type; const ac = equipped.accessory.color || '#888'; if (at === 'scarf') { c.fillStyle = ac; c.fillRect(8, 14, 24, 3); } else if (at === 'cape') { c.fillStyle = ac; c.globalAlpha = 0.5; c.fillRect(12, 16, 16, 20); c.globalAlpha = 1; } else if (at === 'necklace') { c.strokeStyle = ac; c.lineWidth = 1; c.beginPath(); c.arc(20, 17, 6, 0.3, Math.PI-0.3); c.stroke(); } }
  }

  function drawSidebarFace(c, faceType, ec) {
    switch(faceType) {
      case 'cool':
        c.fillStyle = '#111'; c.fillRect(13, 5, 14, 5);
        c.fillStyle = '#333'; c.fillRect(14, 6, 5, 3); c.fillRect(21, 6, 5, 3);
        c.strokeStyle = '#000'; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(16, 12); c.quadraticCurveTo(20, 13, 23, 11); c.stroke();
        break;
      case 'smile':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(16, 7, 2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(24, 7, 2, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 1;
        c.beginPath(); c.arc(20, 9, 5, 0.2, Math.PI-0.2); c.stroke();
        c.fillStyle = 'rgba(255,150,150,0.15)';
        c.beginPath(); c.arc(14, 10, 2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(26, 10, 2, 0, Math.PI*2); c.fill();
        break;
      case 'angry':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(16, 7, 2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(24, 7, 2, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(13, 4); c.lineTo(17, 6); c.stroke();
        c.beginPath(); c.moveTo(27, 4); c.lineTo(23, 6); c.stroke();
        c.beginPath(); c.arc(20, 12, 3, Math.PI+0.3, -0.3); c.stroke();
        break;
      case 'wink':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(16, 7, 2, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(22, 7); c.lineTo(26, 7); c.stroke();
        c.beginPath(); c.arc(20, 10, 4, 0.1, Math.PI-0.1); c.stroke();
        break;
      case 'robot':
        c.fillStyle = '#00FF00'; c.fillRect(15, 6, 3, 3); c.fillRect(22, 6, 3, 3);
        c.fillStyle = '#00CC00'; c.fillRect(14, 11, 12, 1);
        c.fillRect(16, 12, 8, 1);
        break;
      case 'skull':
        c.fillStyle = '#000';
        c.beginPath(); c.arc(16, 7, 3, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(24, 7, 3, 0, Math.PI*2); c.fill();
        c.fillRect(19, 10, 2, 3);
        c.fillStyle = '#888';
        c.fillRect(15, 13, 2, 2); c.fillRect(19, 13, 2, 2); c.fillRect(23, 13, 2, 2);
        break;
      default:
        c.fillStyle = '#111'; c.fillRect(15,6,4,4); c.fillRect(22,6,4,4);
        c.fillStyle = ec; c.fillRect(16,7,2,2); c.fillRect(23,7,2,2);
    }
  }

  return { draw, drawMini, drawSidebar, shade };
})();