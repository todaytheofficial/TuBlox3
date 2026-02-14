(function() {
  'use strict';

  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');

  function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
  resizeBg(); window.addEventListener('resize', resizeBg);

  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, size: Math.random() * 2 + 0.5, speedY: -(Math.random() * 0.25 + 0.05), alpha: Math.random() * 0.2 + 0.03 });
  }

  (function animBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    particles.forEach(p => {
      p.y += p.speedY; if (p.y < 0) { p.y = bgCanvas.height; p.x = Math.random() * bgCanvas.width; }
      bgCtx.fillStyle = `rgba(255,255,255,${p.alpha})`; bgCtx.fillRect(p.x, p.y, p.size, p.size);
    });
    requestAnimationFrame(animBg);
  })();

  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active');
      loginForm.style.display = tab.dataset.tab === 'login' ? 'block' : 'none';
      registerForm.style.display = tab.dataset.tab === 'register' ? 'block' : 'none';
    });
  });

  if (window.location.hash === '#register') tabs[1].click();
  fetch('/api/me').then(res => { if (res.ok) window.location.href = '/home'; }).catch(() => {});

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-error'); err.textContent = '';
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (!u || !p) { err.textContent = 'Fill all fields'; return; }
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const data = await res.json();
      if (data.success) window.location.href = '/home'; else err.textContent = data.error;
    } catch (e) { err.textContent = 'Connection error'; }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('register-error'); err.textContent = '';
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;
    const p2 = document.getElementById('reg-password2').value;
    if (!u || !p || !p2) { err.textContent = 'Fill all fields'; return; }
    if (p !== p2) { err.textContent = 'Passwords don\'t match'; return; }
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const data = await res.json();
      if (data.success) window.location.href = '/home'; else err.textContent = data.error;
    } catch (e) { err.textContent = 'Connection error'; }
  });
})();