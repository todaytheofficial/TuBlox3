window.TubloxCharacter = (function() {
  'use strict';

  function shade(color, amt) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.min(255, Math.max(0, R + amt));
    G = Math.min(255, Math.max(0, G + amt));
    B = Math.min(255, Math.max(0, B + amt));
    return '#' + R.toString(16).padStart(2, '0') + G.toString(16).padStart(2, '0') + B.toString(16).padStart(2, '0');
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

    // === DEAD ===
    if (isDead) {
      c.save();
      c.globalAlpha = 0.5;
      c.translate(cx, bottom);
      c.rotate(90 * Math.PI / 180);
      drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, 'idle', 0, 0, time, false, 0, null, true, itemOn);
      c.restore();
      return;
    }

    // Shadow
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.ellipse(cx, bottom + 2, w / 2 + 1, 3, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(cx, bottom);
    c.scale(dir, 1);

    drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem, false, itemOn);

    c.restore();

    // === HP BAR ===
    if (typeof hp === 'number' && typeof maxHp === 'number' && hp < maxHp) {
      const barW = 40, barH = 4;
      const bx = cx - barW / 2;
      const by = y - 22;
      c.fillStyle = '#333';
      c.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, hp / maxHp);
      c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444';
      c.fillRect(bx, by, barW * pct, barH);
    }

    // === USERNAME ===
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

  function drawBody(c, ox, oy, headW, headH, torsoW, torsoH, legW, legH, armW, armH, totalH, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem, isDead, itemOn) {
    const legTop = -legH;
    const torsoTop = legTop - torsoH;
    const headTop = torsoTop - headH;

    // === LEGS ===
    c.fillStyle = shade(bc, -40);

    if (state === 'run') {
      const ls = Math.sin(frame * Math.PI / 2) * 25;
      c.save(); c.translate(-legW / 2 - 1, legTop - bobY); c.rotate(ls * Math.PI / 180);
      c.fillRect(-legW / 2, 0, legW, legH); c.restore();
      c.save(); c.translate(legW / 2 + 1, legTop - bobY); c.rotate(-ls * Math.PI / 180);
      c.fillRect(-legW / 2, 0, legW, legH); c.restore();
    } else if (state === 'jump') {
      c.fillRect(-legW - 1, legTop - bobY, legW, legH - 3);
      c.fillRect(1, legTop - bobY, legW, legH - 3);
    } else if (state === 'fall') {
      const d = Math.sin(time * 6) * 4;
      c.save(); c.translate(-legW / 2 - 1, legTop); c.rotate(d * Math.PI / 180);
      c.fillRect(-legW / 2, 0, legW, legH); c.restore();
      c.save(); c.translate(legW / 2 + 1, legTop); c.rotate(-d * Math.PI / 180);
      c.fillRect(-legW / 2, 0, legW, legH); c.restore();
    } else {
      c.fillRect(-legW - 1, legTop - bobY, legW, legH);
      c.fillRect(1, legTop - bobY, legW, legH);
    }

    // === BACK ARM ===
    c.fillStyle = shade(bc, -20);
    const armAttachY = torsoTop + 2 - bobY;

    if (state === 'run') {
      const as = Math.sin(frame * Math.PI / 2) * 25;
      c.save(); c.translate(-torsoW / 2 - 1, armAttachY); c.rotate(as * Math.PI / 180);
      c.fillRect(-armW, 0, armW, armH); c.restore();
    } else if (state === 'jump') {
      c.save(); c.translate(-torsoW / 2 - 1, armAttachY); c.rotate(-35 * Math.PI / 180);
      c.fillRect(-armW, 0, armW, armH); c.restore();
    } else if (state === 'fall') {
      c.save(); c.translate(-torsoW / 2 - 1, armAttachY); c.rotate(-15 * Math.PI / 180);
      c.fillRect(-armW, 0, armW, armH); c.restore();
    } else {
      const s = Math.sin(time * 1.5) * 3;
      c.save(); c.translate(-torsoW / 2 - 1, armAttachY); c.rotate(s * Math.PI / 180);
      c.fillRect(-armW, 0, armW, armH); c.restore();
    }

    // === SHIELD (back arm side, if active) ===
    if (activeItem === 'shield' && itemOn) {
      drawShieldOnBack(c, -torsoW / 2 - 1, armAttachY, armW, armH, time);
    }

    // === TORSO ===
    c.fillStyle = bc;
    c.fillRect(-torsoW / 2, torsoTop - bobY, torsoW, torsoH);

    // === HEAD ===
    c.fillStyle = hc;
    c.fillRect(-headW / 2, headTop - bobY, headW, headH);

    // === EYES ===
    const blink = Math.sin(time * 2.5) > 0.93;
    const eyeY = headTop + headH * 0.3 - bobY;
    const eyeSize = Math.max(2, Math.round(headW * 0.14));
    const eyeGap = Math.round(headW * 0.12);

    if (isDead) {
      // X eyes for dead
      c.strokeStyle = ec;
      c.lineWidth = 1.5;
      const exSz = eyeSize + 1;
      // Left X
      c.beginPath();
      c.moveTo(-eyeGap - exSz, eyeY); c.lineTo(-eyeGap, eyeY + exSz);
      c.moveTo(-eyeGap, eyeY); c.lineTo(-eyeGap - exSz, eyeY + exSz);
      c.stroke();
      // Right X
      c.beginPath();
      c.moveTo(eyeGap, eyeY); c.lineTo(eyeGap + exSz, eyeY + exSz);
      c.moveTo(eyeGap + exSz, eyeY); c.lineTo(eyeGap, eyeY + exSz);
      c.stroke();
    } else if (!blink) {
      c.fillStyle = '#111';
      c.fillRect(eyeGap, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillRect(-eyeGap - eyeSize - 1, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillStyle = ec;
      c.fillRect(eyeGap + 1, eyeY + 1, eyeSize, eyeSize);
      c.fillRect(-eyeGap - eyeSize, eyeY + 1, eyeSize, eyeSize);
    } else {
      c.fillStyle = ec;
      c.fillRect(eyeGap, eyeY + eyeSize / 2, eyeSize + 1, 2);
      c.fillRect(-eyeGap - eyeSize - 1, eyeY + eyeSize / 2, eyeSize + 1, 2);
    }

    // Mouth
    if (isDead) {
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.fillRect(-3, headTop + headH * 0.75 - bobY, 6, 2);
    } else {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(-2, headTop + headH * 0.75 - bobY, 4, 2);
    }

    // === FRONT ARM + HELD ITEM ===
    c.fillStyle = shade(bc, -10);
    const frontArmX = torsoW / 2 + 1;

    // ---- SWORD ----
    if (activeItem === 'sword') {
      if (attacking) {
        let angle;
        if (attackProgress < 0.15) {
          angle = -45 * (attackProgress / 0.15);
        } else if (attackProgress < 0.5) {
          const t = (attackProgress - 0.15) / 0.35;
          angle = -45 + 165 * t;
        } else {
          const t = (attackProgress - 0.5) / 0.5;
          angle = 120 - 135 * t;
        }
        c.save();
        c.translate(frontArmX, armAttachY);
        c.rotate(angle * Math.PI / 180);
        c.fillStyle = shade(bc, -10);
        c.fillRect(0, 0, armW, armH);
        drawSword(c, armW / 2 - 2, armH, armH * 1.4);
        c.restore();

        if (attackProgress > 0.15 && attackProgress < 0.5) {
          c.save();
          c.translate(frontArmX, armAttachY);
          c.globalAlpha = 0.3 * (1 - (attackProgress - 0.15) / 0.35);
          c.strokeStyle = '#fff';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(0, 0, armH + armH * 1.2, -60 * Math.PI / 180, angle * Math.PI / 180);
          c.stroke();
          c.restore();
        }
      } else {
        const s = Math.sin(time * 1.5) * 3;
        c.save();
        c.translate(frontArmX, armAttachY);
        c.rotate((-10 + s) * Math.PI / 180);
        c.fillStyle = shade(bc, -10);
        c.fillRect(0, 0, armW, armH);
        drawSword(c, armW / 2 - 2, armH, armH * 1.2);
        c.restore();
      }
    }
    // ---- FLASHLIGHT ----
    else if (activeItem === 'flashlight') {
      const s = Math.sin(time * 1.5) * 3;
      const holdAngle = -15 + s;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate(holdAngle * Math.PI / 180);
      // Arm
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      // Flashlight in hand
      drawFlashlight(c, armW / 2, armH, armH * 0.8, itemOn, time);
      c.restore();

      // Light glow from hand when on
      if (itemOn) {
        c.save();
        c.translate(frontArmX, armAttachY);
        c.rotate(holdAngle * Math.PI / 180);
        const glowX = armW / 2;
        const glowY = armH + armH * 0.8 + 2;
        c.fillStyle = 'rgba(255,240,180,0.15)';
        c.beginPath();
        c.arc(glowX, glowY, armH * 0.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    // ---- SHIELD ----
    else if (activeItem === 'shield') {
      const s = Math.sin(time * 1.5) * 3;
      const holdAngle = itemOn ? (-5 + s * 0.5) : (15 + s);
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate(holdAngle * Math.PI / 180);
      // Arm
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      // Shield in front hand
      drawShieldHeld(c, armW / 2, armH * 0.4, armH * 0.9, itemOn, time);
      c.restore();
    }
    // ---- KEY ----
    else if (activeItem === 'key') {
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-10 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      drawKey(c, armW / 2, armH, armH * 0.7);
      c.restore();
    }
    // ---- COIN ----
    else if (activeItem === 'coin') {
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-5 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      drawCoin(c, armW / 2, armH + 2, armH * 0.35, time);
      c.restore();
    }
    // ---- HEART ----
    else if (activeItem === 'heart') {
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-5 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      drawHeart(c, armW / 2, armH + 2, armH * 0.4, time);
      c.restore();
    }
    // ---- SPEED BOOST ----
    else if (activeItem === 'speed_boost') {
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-5 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      drawBolt(c, armW / 2, armH + 2, armH * 0.5, '#FFD700');
      c.restore();
    }
    // ---- JUMP BOOST ----
    else if (activeItem === 'jump_boost') {
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-5 + s) * Math.PI / 180);
      c.fillStyle = shade(bc, -10);
      c.fillRect(0, 0, armW, armH);
      drawBolt(c, armW / 2, armH + 2, armH * 0.5, '#44CC44');
      c.restore();
    }
    // ---- EMPTY HAND (no item or unknown) ----
    else {
      if (state === 'run') {
        const as = Math.sin(frame * Math.PI / 2) * 25;
        c.save(); c.translate(frontArmX, armAttachY); c.rotate(-as * Math.PI / 180);
        c.fillRect(0, 0, armW, armH); c.restore();
      } else if (state === 'jump') {
        c.save(); c.translate(frontArmX, armAttachY); c.rotate(35 * Math.PI / 180);
        c.fillRect(0, 0, armW, armH); c.restore();
      } else if (state === 'fall') {
        c.save(); c.translate(frontArmX, armAttachY); c.rotate(15 * Math.PI / 180);
        c.fillRect(0, 0, armW, armH); c.restore();
      } else {
        const s = Math.sin(time * 1.5) * 3;
        c.save(); c.translate(frontArmX, armAttachY); c.rotate(-s * Math.PI / 180);
        c.fillRect(0, 0, armW, armH); c.restore();
      }
    }
  }

  // ==================== ITEM DRAW FUNCTIONS ====================

  function drawSword(c, sx, sy, bladeLen) {
    // Handle
    c.fillStyle = '#8B6914';
    c.fillRect(sx - 1, sy - 2, 4, 5);
    // Guard
    c.fillStyle = '#CCAA00';
    c.fillRect(sx - 3, sy + 3, 8, 2);
    // Blade
    c.fillStyle = '#CCCCCC';
    c.fillRect(sx, sy + 5, 3, bladeLen);
    // Shine
    c.fillStyle = '#EEEEEE';
    c.fillRect(sx, sy + 5, 1, bladeLen);
    // Tip
    c.fillStyle = '#DDDDDD';
    c.beginPath();
    c.moveTo(sx, sy + 5 + bladeLen);
    c.lineTo(sx + 3, sy + 5 + bladeLen);
    c.lineTo(sx + 1.5, sy + 5 + bladeLen + 4);
    c.fill();
  }

  function drawFlashlight(c, cx, sy, len, isOn, time) {
    // Body — dark cylinder
    c.fillStyle = '#444';
    c.fillRect(cx - 2.5, sy, 5, len);

    // Grip ridges
    c.fillStyle = '#333';
    for (let i = 0; i < 3; i++) {
      c.fillRect(cx - 3, sy + len * 0.3 + i * 3, 6, 1);
    }

    // Lens head (wider)
    c.fillStyle = '#555';
    c.fillRect(cx - 4, sy + len - 2, 8, 4);

    // Lens glass
    if (isOn) {
      c.fillStyle = '#FFE066';
      c.fillRect(cx - 3, sy + len + 2, 6, 2);
      // Glow ring
      c.fillStyle = 'rgba(255,224,102,0.4)';
      c.beginPath();
      c.arc(cx, sy + len + 3, 5, 0, Math.PI * 2);
      c.fill();
      // Flickering beam hint
      const flicker = 0.6 + Math.sin(time * 12) * 0.1;
      c.fillStyle = `rgba(255,240,180,${flicker * 0.2})`;
      c.beginPath();
      c.moveTo(cx - 4, sy + len + 4);
      c.lineTo(cx - 8, sy + len + 16);
      c.lineTo(cx + 8, sy + len + 16);
      c.lineTo(cx + 4, sy + len + 4);
      c.fill();
    } else {
      c.fillStyle = '#333';
      c.fillRect(cx - 3, sy + len + 2, 6, 2);
    }

    // Button on side
    c.fillStyle = isOn ? '#88DD88' : '#AA4444';
    c.fillRect(cx + 2.5, sy + 2, 2, 3);
  }

  function drawShieldHeld(c, cx, sy, size, isActive, time) {
    // Shield shape — held in front
    const sw = size * 0.7;
    const sh = size;

    c.fillStyle = isActive ? '#4488CC' : '#335577';
    c.beginPath();
    c.moveTo(cx, sy - sh * 0.1);
    c.lineTo(cx + sw / 2, sy + sh * 0.15);
    c.lineTo(cx + sw / 2, sy + sh * 0.55);
    c.lineTo(cx, sy + sh * 0.75);
    c.lineTo(cx - sw / 2, sy + sh * 0.55);
    c.lineTo(cx - sw / 2, sy + sh * 0.15);
    c.closePath();
    c.fill();

    // Border
    c.strokeStyle = isActive ? '#66AAEE' : '#557799';
    c.lineWidth = 1.5;
    c.stroke();

    // Center emblem
    c.fillStyle = isActive ? '#66AAEE' : '#557799';
    c.beginPath();
    c.arc(cx, sy + sh * 0.3, sw * 0.18, 0, Math.PI * 2);
    c.fill();

    // Active glow
    if (isActive) {
      const pulse = 0.15 + Math.sin(time * 4) * 0.08;
      c.fillStyle = `rgba(100,170,238,${pulse})`;
      c.beginPath();
      c.moveTo(cx, sy - sh * 0.1 - 2);
      c.lineTo(cx + sw / 2 + 2, sy + sh * 0.15);
      c.lineTo(cx + sw / 2 + 2, sy + sh * 0.55);
      c.lineTo(cx, sy + sh * 0.75 + 2);
      c.lineTo(cx - sw / 2 - 2, sy + sh * 0.55);
      c.lineTo(cx - sw / 2 - 2, sy + sh * 0.15);
      c.closePath();
      c.fill();
    }

    // Cross detail
    c.strokeStyle = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, sy); c.lineTo(cx, sy + sh * 0.6);
    c.moveTo(cx - sw * 0.3, sy + sh * 0.3); c.lineTo(cx + sw * 0.3, sy + sh * 0.3);
    c.stroke();
  }

  function drawShieldOnBack(c, backX, backY, armW, armH, time) {
    // Small shield visible on back arm side
    c.save();
    c.translate(backX - armW / 2, backY + armH * 0.2);
    const s = armH * 0.5;
    c.fillStyle = 'rgba(68,136,204,0.4)';
    c.beginPath();
    c.moveTo(0, -s * 0.3);
    c.lineTo(s * 0.4, 0);
    c.lineTo(s * 0.4, s * 0.4);
    c.lineTo(0, s * 0.6);
    c.lineTo(-s * 0.4, s * 0.4);
    c.lineTo(-s * 0.4, 0);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawKey(c, cx, sy, len) {
    // Ring
    c.strokeStyle = '#DAA520';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(cx, sy + 3, 4, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = 'rgba(218,165,32,0.25)';
    c.fill();

    // Shaft
    c.fillStyle = '#DAA520';
    c.fillRect(cx - 1, sy + 7, 2, len);

    // Teeth
    c.fillRect(cx + 1, sy + 7 + len - 4, 3, 2);
    c.fillRect(cx + 1, sy + 7 + len - 8, 2, 2);
  }

  function drawCoin(c, cx, sy, radius, time) {
    const scaleX = Math.abs(Math.cos(time * 3)) || 0.15;
    c.save();
    c.translate(cx, sy);
    c.scale(scaleX, 1);
    // Outer
    c.fillStyle = '#FFD700';
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#DAA520';
    c.lineWidth = 1;
    c.stroke();
    // Dollar sign
    c.fillStyle = '#DAA520';
    c.font = `bold ${Math.round(radius * 1.2)}px Inter`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('$', 0, 0);
    c.restore();
  }

  function drawHeart(c, cx, sy, size, time) {
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    c.save();
    c.translate(cx, sy);
    c.scale(pulse, pulse);
    const s = size / 10;
    c.fillStyle = '#EF4444';
    c.beginPath();
    c.moveTo(0, 3 * s);
    c.bezierCurveTo(-6 * s, -1 * s, -8 * s, -6 * s, -4 * s, -7 * s);
    c.bezierCurveTo(-1 * s, -8 * s, 0, -6 * s, 0, -5 * s);
    c.bezierCurveTo(0, -6 * s, 1 * s, -8 * s, 4 * s, -7 * s);
    c.bezierCurveTo(8 * s, -6 * s, 6 * s, -1 * s, 0, 3 * s);
    c.fill();
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.arc(-2 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawBolt(c, cx, sy, size, color) {
    const s = size / 12;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(cx + 1 * s, sy - 6 * s);
    c.lineTo(cx - 2 * s, sy);
    c.lineTo(cx, sy);
    c.lineTo(cx - 1 * s, sy + 6 * s);
    c.lineTo(cx + 3 * s, sy);
    c.lineTo(cx + 1 * s, sy);
    c.closePath();
    c.fill();
    // Glow
    c.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba');
    c.beginPath();
    c.arc(cx, sy, size * 0.6, 0, Math.PI * 2);
    c.fill();
  }

  // ==================== MINI / SIDEBAR ====================

  function drawMini(canvas, avatar) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF';
    const hc = avatar?.headColor || '#FFF';
    const ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, 32, 32);
    c.fillStyle = hc; c.fillRect(8, 1, 16, 12);
    c.fillStyle = '#111'; c.fillRect(12, 5, 3, 4); c.fillRect(17, 5, 3, 4);
    c.fillStyle = ec; c.fillRect(12, 6, 2, 2); c.fillRect(18, 6, 2, 2);
    c.fillStyle = bc; c.fillRect(7, 13, 18, 12);
    c.fillStyle = shade(bc, -40);
    c.fillRect(8, 25, 6, 6); c.fillRect(18, 25, 6, 6);
  }

  function drawSidebar(canvas, avatar) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF';
    const hc = avatar?.headColor || '#FFF';
    const ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#111'; c.fillRect(0, 0, 40, 40);
    c.fillStyle = hc; c.fillRect(10, 1, 20, 14);
    c.fillStyle = '#111'; c.fillRect(15, 6, 4, 4); c.fillRect(22, 6, 4, 4);
    c.fillStyle = ec; c.fillRect(16, 7, 2, 2); c.fillRect(23, 7, 2, 2);
    c.fillStyle = bc; c.fillRect(8, 15, 24, 14);
    c.fillStyle = shade(bc, -40);
    c.fillRect(10, 29, 8, 10); c.fillRect(22, 29, 8, 10);
  }

  return { draw, drawMini, drawSidebar, shade };
})();