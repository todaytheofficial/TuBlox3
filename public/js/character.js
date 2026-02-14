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

    // Размеры частей тела — ФИКСИРОВАННЫЕ пропорции
    const headH = Math.round(h * 0.33);
    const headW = Math.round(w * 0.56);
    const torsoH = Math.round(h * 0.37);
    const torsoW = Math.round(w * 0.62);
    const legH = Math.round(h * 0.30);
    const legW = Math.round(w * 0.22);
    const armW = Math.round(w * 0.16);
    const armH = Math.round(h * 0.29);

    // Центр персонажа по X, низ по Y
    const cx = x + w / 2;
    const bottom = y + h;

    let bobY = 0;
    if (state === 'run') bobY = Math.sin(frame * Math.PI / 2) * 2;
    else if (state === 'idle') bobY = Math.sin(time * 2) * 1;

    // === DEAD ANIMATION ===
    if (isDead) {
      c.save();
      c.globalAlpha = 0.5;
      c.translate(cx, bottom);
      c.rotate(90 * Math.PI / 180);
      drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, 'idle', 0, 0, time, false, 0, null);
      c.restore();

      // "X" eyes
      c.save();
      c.globalAlpha = 0.5;
      // Рисуем лежащего
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

    drawBody(c, 0, 0, headW, headH, torsoW, torsoH, legW, legH, armW, armH, h, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem);

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

  function drawBody(c, ox, oy, headW, headH, torsoW, torsoH, legW, legH, armW, armH, totalH, bc, hc, ec, state, frame, bobY, time, attacking, attackProgress, activeItem) {
    // Все координаты относительно (ox, oy) = (0, 0) = нижний центр персонажа

    // Позиции частей тела (снизу вверх, всё склеено)
    const legTop = -legH;           // верх ног = -legH
    const torsoTop = legTop - torsoH; // верх торса
    const headTop = torsoTop - headH;  // верх головы

    // === LEGS (самый нижний слой) ===
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
      // idle — ноги стоят ровно
      c.fillRect(-legW - 1, legTop - bobY, legW, legH);
      c.fillRect(1, legTop - bobY, legW, legH);
    }

    // === BACK ARM ===
    c.fillStyle = shade(bc, -20);
    const armAttachY = torsoTop + 2 - bobY; // плечо

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

    if (!blink) {
      // Eye whites
      c.fillStyle = '#111';
      c.fillRect(eyeGap, eyeY, eyeSize + 1, eyeSize + 2);
      c.fillRect(-eyeGap - eyeSize - 1, eyeY, eyeSize + 1, eyeSize + 2);
      // Pupils
      c.fillStyle = ec;
      c.fillRect(eyeGap + 1, eyeY + 1, eyeSize, eyeSize);
      c.fillRect(-eyeGap - eyeSize, eyeY + 1, eyeSize, eyeSize);
    } else {
      c.fillStyle = ec;
      c.fillRect(eyeGap, eyeY + eyeSize / 2, eyeSize + 1, 2);
      c.fillRect(-eyeGap - eyeSize - 1, eyeY + eyeSize / 2, eyeSize + 1, 2);
    }

    // Mouth
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(-2, headTop + headH * 0.75 - bobY, 4, 2);

    // === FRONT ARM + WEAPON ===
    c.fillStyle = shade(bc, -10);
    const frontArmX = torsoW / 2 + 1;

    if (attacking && activeItem === 'sword') {
      // ROBLOX-style sword swing: 3 фазы
      // 0-0.2: замах назад
      // 0.2-0.6: быстрый свинг вперёд
      // 0.6-1.0: возврат
      let angle;
      if (attackProgress < 0.15) {
        // Замах назад
        angle = -45 * (attackProgress / 0.15);
      } else if (attackProgress < 0.5) {
        // Быстрый свинг вперёд (от -45 до +120)
        const t = (attackProgress - 0.15) / 0.35;
        angle = -45 + 165 * t;
      } else {
        // Возврат
        const t = (attackProgress - 0.5) / 0.5;
        angle = 120 - 135 * t;
      }

      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate(angle * Math.PI / 180);
      // Arm
      c.fillRect(0, 0, armW, armH);
      // Sword
      drawSword(c, armW / 2 - 2, armH, armH * 1.4);
      c.restore();

      // Slash effect (свинг)
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

    } else if (activeItem === 'sword') {
      // Holding sword idle
      const s = Math.sin(time * 1.5) * 3;
      c.save();
      c.translate(frontArmX, armAttachY);
      c.rotate((-10 + s) * Math.PI / 180);
      c.fillRect(0, 0, armW, armH);
      drawSword(c, armW / 2 - 2, armH, armH * 1.2);
      c.restore();
    } else if (state === 'run') {
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

  function drawSword(c, sx, sy, bladeLen) {
    // Handle (guard)
    c.fillStyle = '#8B6914';
    c.fillRect(sx - 1, sy - 2, 4, 5);

    // Guard (crossguard)
    c.fillStyle = '#CCAA00';
    c.fillRect(sx - 3, sy + 3, 8, 2);

    // Blade
    c.fillStyle = '#CCCCCC';
    c.fillRect(sx, sy + 5, 3, bladeLen);

    // Blade shine
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

  function drawMini(canvas, avatar) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF';
    const hc = avatar?.headColor || '#FFF';
    const ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, 32, 32);
    // Head
    c.fillStyle = hc; c.fillRect(8, 1, 16, 12);
    // Eyes
    c.fillStyle = '#111'; c.fillRect(12, 5, 3, 4); c.fillRect(17, 5, 3, 4);
    c.fillStyle = ec; c.fillRect(12, 6, 2, 2); c.fillRect(18, 6, 2, 2);
    // Body
    c.fillStyle = bc; c.fillRect(7, 13, 18, 12);
    // Legs
    c.fillStyle = shade(bc, -40);
    c.fillRect(8, 25, 6, 6); c.fillRect(18, 25, 6, 6);
  }

  function drawSidebar(canvas, avatar) {
    const c = canvas.getContext('2d');
    const bc = avatar?.bodyColor || '#FFF';
    const hc = avatar?.headColor || '#FFF';
    const ec = avatar?.eyeColor || '#000';
    c.fillStyle = '#111'; c.fillRect(0, 0, 40, 40);
    // Head
    c.fillStyle = hc; c.fillRect(10, 1, 20, 14);
    // Eyes
    c.fillStyle = '#111'; c.fillRect(15, 6, 4, 4); c.fillRect(22, 6, 4, 4);
    c.fillStyle = ec; c.fillRect(16, 7, 2, 2); c.fillRect(23, 7, 2, 2);
    // Body
    c.fillStyle = bc; c.fillRect(8, 15, 24, 14);
    // Legs
    c.fillStyle = shade(bc, -40);
    c.fillRect(10, 29, 8, 10); c.fillRect(22, 29, 8, 10);
  }

  return { draw, drawMini, drawSidebar, shade };
})();