/**
 * main.js — Co3er Development v4
 * ─────────────────────────────────────────────────────────────────
 * Modules (in init order):
 *   1.  Loader          — animated boot sequence with status messages
 *   2.  Theme           — dark/light + OS sync
 *   3.  Cursor          — dot + multi-point trail (canvas-free)
 *   4.  Noise           — animated grain canvas
 *   5.  Clock           — live HH:MM:SS in navbar
 *   6.  Navbar          — scroll state, active links, mobile drawer
 *   7.  Smooth scroll   — offset-aware anchor navigation
 *   8.  Reveal          — IntersectionObserver stagger engine
 *   9.  Counters        — eased count-up animation
 *  10.  Particles       — connected-dot hero canvas (WebGL-style)
 *  11.  Terminal         — typewriter effect in about section
 *  12.  Skill bars      — animated width fills
 *  13.  Services        — dynamic card rendering from data
 *  14.  Projects        — async API fetch + SVG icon routing
 *  15.  Pricing toggle  — one-time vs monthly price swap
 *  16.  Contact form    — validation, submission, char counter
 *  17.  Toast           — notification system
 *  18.  Footer year     — dynamic copyright
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══ 0. ENTRY POINT ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initTheme();
  initCursor();
  initNoise();
  initClock();
  initNavbar();
  initSmoothScroll();
  initReveal();
  initParticles();
  initTerminal();
  initSkillBars();
  renderServices();
  loadProjects();
  initPricingToggle();
  initContactForm();
  initFooterYear();
});

/* ═══ 1. LOADER ════════════════════════════════════════════════ */
function initLoader() {
  const loader = document.getElementById('loader');
  const bar    = document.getElementById('ldr-bar');
  const status = document.getElementById('ldr-status');
  if (!loader) return;

  const STEPS = [
    { pct: 10,  msg: 'booting'            },
    { pct: 30,  msg: 'loading assets'     },
    { pct: 55,  msg: 'preparing canvas'   },
    { pct: 75,  msg: 'compiling shaders'  },
    { pct: 90,  msg: 'connecting systems' },
    { pct: 100, msg: 'ready'              },
  ];

  let step = 0;

  const tick = () => {
    if (step >= STEPS.length) {
      // Dismiss
      setTimeout(() => loader.classList.add('out'), 260);
      return;
    }
    const { pct, msg } = STEPS[step++];
    if (bar)    bar.style.width     = pct + '%';
    if (status) status.textContent  = msg;
    setTimeout(tick, step < STEPS.length ? 220 : 400);
  };

  // Start after a brief moment so the glyph animation is visible
  setTimeout(tick, 200);

  // Safety net: if load takes too long, dismiss anyway
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('out'), 600);
  });
}

/* ═══ 2. THEME ════════════════════════════════════════════════ */
function initTheme() {
  const btn  = document.getElementById('theme-btn');
  const root = document.documentElement;

  const stored = localStorage.getItem('co3er-theme');
  const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.theme = stored ?? system;

  btn?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('co3er-theme', next);
    // Notify canvas modules of theme change
    window.dispatchEvent(new CustomEvent('co3er:theme', { detail: next }));
  });

  // Sync with OS if no saved preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('co3er-theme')) {
      root.dataset.theme = e.matches ? 'dark' : 'light';
    }
  });
}

/* ═══ 3. CURSOR ══════════════════════════════════════════════ */
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  const dot   = document.getElementById('cur-dot');
  const trail = document.getElementById('cur-trail');
  if (!dot || !trail) return;

  const TRAIL_LEN = 8;
  const points    = [];    // { x, y, el }

  // Build trail points
  for (let i = 0; i < TRAIL_LEN; i++) {
    const pt = document.createElement('div');
    pt.className = 'trail-pt';
    const scale = 1 - i * 0.09;
    pt.style.cssText = `transform: scale(${scale}); opacity:0;`;
    trail.appendChild(pt);
    points.push({ x: -100, y: -100, el: pt });
  }

  let mx = -100, my = -100;
  let rafId = null;

  // Lerp values for each trail point
  const lerpFactors = points.map((_, i) => 0.22 - i * 0.018);

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animateTrail() {
    // First point follows mouse directly
    points[0].x = lerp(points[0].x, mx, lerpFactors[0]);
    points[0].y = lerp(points[0].y, my, lerpFactors[0]);

    // Each subsequent point follows the previous
    for (let i = 1; i < points.length; i++) {
      points[i].x = lerp(points[i].x, points[i-1].x, lerpFactors[i]);
      points[i].y = lerp(points[i].y, points[i-1].y, lerpFactors[i]);
    }

    // Apply positions + fade by index
    points.forEach((p, i) => {
      const alpha = (1 - i / TRAIL_LEN) * 0.55;
      p.el.style.left    = p.x + 'px';
      p.el.style.top     = p.y + 'px';
      p.el.style.opacity = String(alpha);
    });

    rafId = requestAnimationFrame(animateTrail);
  }

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    if (!rafId) animateTrail();
  });

  document.addEventListener('mouseleave', () => {
    cancelAnimationFrame(rafId);
    rafId = null;
    points.forEach(p => { p.el.style.opacity = '0'; });
  });

  // Grow dot on hover targets
  const TARGETS = 'a, button, input, textarea, select, .pc, .svc-card, .skc, .proj-card';
  document.querySelectorAll(TARGETS).forEach(el => {
    el.addEventListener('mouseenter', () => dot.classList.add('big'));
    el.addEventListener('mouseleave', () => dot.classList.remove('big'));
  });
}

/* ═══ 4. NOISE ════════════════════════════════════════════════ */
function initNoise() {
  const canvas = document.getElementById('c-noise');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, rafId;

  function resize() {
    // Low resolution for perf; CSS stretches it
    W = canvas.width  = Math.ceil(window.innerWidth  / 2);
    H = canvas.height = Math.ceil(window.innerHeight / 2);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  function draw() {
    const d = ctx.createImageData(W, H);
    const b = d.data;
    for (let i = 0; i < b.length; i += 4) {
      const v = Math.random() * 255 | 0;
      b[i] = b[i+1] = b[i+2] = v;
      b[i+3] = 22;
    }
    ctx.putImageData(d, 0, 0);
    rafId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId)     { draw(); }
  });

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
}

/* ═══ 5. CLOCK ════════════════════════════════════════════════ */
function initClock() {
  const el = document.getElementById('clk-time');
  if (!el) return;

  function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  tick();
  setInterval(tick, 1000);
}

/* ═══ 6. NAVBAR ══════════════════════════════════════════════ */
function initNavbar() {
  const navbar  = document.getElementById('navbar');
  const ham     = document.getElementById('nav-ham');
  const drawer  = document.getElementById('nav-drawer');
  const links   = document.getElementById('nav-links');
  if (!navbar) return;

  // Scroll shadow
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile drawer toggle
  ham?.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on drawer link click
  drawer?.querySelectorAll('.drawer-a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      ham?.classList.remove('open');
      ham?.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    drawer?.classList.remove('open');
    ham?.classList.remove('open');
    ham?.setAttribute('aria-expanded', 'false');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  });

  // Active section via IntersectionObserver
  const sections = document.querySelectorAll('section[id]');
  const linkMap  = {};
  links?.querySelectorAll('.nav-a[href^="#"]').forEach(l => {
    linkMap[l.getAttribute('href').slice(1)] = l;
  });

  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      Object.values(linkMap).forEach(l => l.classList.remove('act'));
      linkMap[e.target.id]?.classList.add('act');
    });
  }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });

  sections.forEach(s => sectionObs.observe(s));
}

/* ═══ 7. SMOOTH SCROLL ══════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id     = a.getAttribute('href');
      const target = document.querySelector(id);
      if (!target || id === '#') return;
      e.preventDefault();
      const navH = document.getElementById('navbar')?.offsetHeight ?? 74;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
      history.pushState(null, '', id);
    });
  });
}

/* ═══ 8. REVEAL ENGINE ══════════════════════════════════════ */
function initReveal() {
  observeReveal(document.querySelectorAll('[data-r]'), true);
}

/**
 * Observe a set of elements and add .vis when they enter viewport.
 * @param {NodeList|Element[]} els
 * @param {boolean} stagger - apply CSS delay based on sibling index
 */
function observeReveal(els, stagger = false) {
  if (!els.length) return;

  if (stagger) {
    // Group by parent for clean stagger
    const parents = new Map();
    els.forEach(el => {
      const p = el.parentElement;
      if (!parents.has(p)) parents.set(p, []);
      parents.get(p).push(el);
    });
    parents.forEach(children => {
      children.forEach((el, i) => {
        const base = +(el.dataset.rd ?? 0);
        el.style.transitionDelay = `${(base + i) * 80}ms`;
      });
    });
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('vis');
      // Trigger counters inside this element
      e.target.querySelectorAll('[data-count]').forEach(animateCounter);
      if (e.target.dataset.count !== undefined) animateCounter(e.target);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.10 });

  els.forEach(el => obs.observe(el));
}

/* ═══ 9. COUNTERS ════════════════════════════════════════════ */
function animateCounter(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = '1';

  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.sfx ?? '';
  const DUR    = 1600;
  const start  = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function step(now) {
    const t   = Math.min((now - start) / DUR, 1);
    const val = Math.round(easeOutCubic(t) * target);
    el.textContent = val + suffix;
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ═══ 10. PARTICLES ══════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('c-hero');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [], rafId = null;

  const PARTICLE_COUNT = 80;
  const CONNECT_DIST   = 100;
  const MOUSE          = { x: -999, y: -999 };

  function getAccent() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--c-teal').trim() || '#14dca0';
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  class Dot {
    constructor(init = false) { this.init(init); }

    init(atRandom = false) {
      this.x    = Math.random() * W;
      this.y    = atRandom ? Math.random() * H : H + 8;
      this.vx   = (Math.random() - 0.5) * 0.20;
      this.vy   = -(Math.random() * 0.28 + 0.06);
      this.r    = Math.random() * 1.3 + 0.3;
      this.a    = 0;
      this.maxA = Math.random() * 0.30 + 0.06;
    }

    update() {
      // Mouse repulsion
      const dx = this.x - MOUSE.x;
      const dy = this.y - MOUSE.y;
      const d  = Math.hypot(dx, dy);
      if (d < 120) {
        const force = (120 - d) / 120 * 0.4;
        this.vx += (dx / d) * force;
        this.vy += (dy / d) * force;
      }

      // Dampen velocity
      this.vx *= 0.99;
      this.vy *= 0.99;

      this.x  += this.vx;
      this.y  += this.vy;
      this.a   = Math.min(this.a + 0.003, this.maxA);
      if (this.y < -12 || this.x < -20 || this.x > W + 20) this.init();
    }

    draw(accent) {
      ctx.globalAlpha = this.a;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
  }

  function init() {
    resize();
    pts = Array.from({ length: PARTICLE_COUNT }, () => new Dot(true));
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    const accent = getAccent();

    // Connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.hypot(dx, dy);
        if (d < CONNECT_DIST) {
          ctx.globalAlpha = (1 - d / CONNECT_DIST) * 0.055;
          ctx.strokeStyle = accent;
          ctx.lineWidth   = 0.7;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }

    pts.forEach(p => { p.update(); p.draw(accent); });
    rafId = requestAnimationFrame(frame);
  }

  // Mouse tracking for repulsion
  const heroEl = document.getElementById('home');
  heroEl?.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    MOUSE.x = e.clientX - rect.left;
    MOUSE.y = e.clientY - rect.top;
  });
  heroEl?.addEventListener('mouseleave', () => { MOUSE.x = MOUSE.y = -999; });

  // Visibility pause/resume
  const visObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!rafId) frame(); }
    else { cancelAnimationFrame(rafId); rafId = null; }
  });
  if (heroEl) visObs.observe(heroEl);

  window.addEventListener('resize', () => resize(), { passive: true });
  window.addEventListener('co3er:theme', () => {}); // accent updates automatically
  init();
  frame();
}

/* ═══ 11. TERMINAL TYPEWRITER ═══════════════════════════════ */
function initTerminal() {
  const body = document.getElementById('term-body');
  if (!body) return;

  const LINES = [
    { type: 'cmd',  text: '$ whoami' },
    { type: 'out',  text: 'co3er — developer & bot architect' },
    { type: 'cmd',  text: '$ ls ./skills' },
    { type: 'ok',   text: 'discord.js   node.js   express' },
    { type: 'ok',   text: 'react        mongodb   websockets' },
    { type: 'cmd',  text: '$ uptime' },
    { type: 'info', text: 'Always building. Never stopping.' },
    { type: 'cmd',  text: '$ git log --oneline -3' },
    { type: 'ok',   text: 'a3f1c9e  shipped music bot v2.0' },
    { type: 'ok',   text: '7b2d831  fixed rate limiter edge case' },
    { type: 'ok',   text: 'c8e4029  added WebSocket reconnect' },
    { type: 'cmd',  text: '$ echo $STATUS' },
    { type: 'info', text: 'OPEN FOR COMMISSIONS ✓' },
  ];

  const CLASS_MAP = {
    cmd:  'tl-cmd',
    out:  'tl-out',
    ok:   'tl-ok',
    info: 'tl-info',
  };

  let lineIdx  = 0;
  let charIdx  = 0;
  let timer    = null;
  let started  = false;

  function typeNextChar() {
    if (lineIdx >= LINES.length) {
      // Loop after pause
      timer = setTimeout(() => {
        body.innerHTML = '';
        lineIdx = charIdx = 0;
        typeNextChar();
      }, 4000);
      return;
    }

    const { type, text } = LINES[lineIdx];

    // Find or create line element
    let lineEl = body.querySelector(`.term-line[data-li="${lineIdx}"]`);
    if (!lineEl) {
      lineEl = document.createElement('span');
      lineEl.className = `term-line ${CLASS_MAP[type] || ''}`;
      lineEl.setAttribute('data-li', lineIdx);
      body.appendChild(lineEl);
    }

    // Remove old cursor
    body.querySelectorAll('.term-cursor').forEach(c => c.remove());

    if (charIdx < text.length) {
      lineEl.textContent += text[charIdx++];
      const cursor = document.createElement('span');
      cursor.className = 'term-cursor';
      lineEl.appendChild(cursor);
      // Faster for output lines, typing speed for commands
      const delay = type === 'cmd' ? 65 : 22;
      timer = setTimeout(typeNextChar, delay + Math.random() * 30);
    } else {
      // Line done — move to next after pause
      lineEl.textContent = text;
      lineIdx++;
      charIdx = 0;
      // Add cursor to bottom
      const cursor = document.createElement('span');
      cursor.className = 'term-cursor';
      body.appendChild(cursor);
      const pause = type === 'cmd' ? 380 : 80;
      timer = setTimeout(typeNextChar, pause);
    }

    // Scroll terminal to bottom
    body.scrollTop = body.scrollHeight;
  }

  // Start typing when section is visible
  const section = document.getElementById('about');
  if (!section) { typeNextChar(); return; }

  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !started) {
      started = true;
      setTimeout(typeNextChar, 500);
      obs.disconnect();
    }
  }, { threshold: 0.2 });
  obs.observe(section);
}

/* ═══ 12. SKILL BARS ════════════════════════════════════════ */
function initSkillBars() {
  const bars = document.querySelectorAll('.sb-fill');
  if (!bars.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const pct = e.target.dataset.pct || '0';
      // Delay slightly for visual effect
      setTimeout(() => { e.target.style.width = pct + '%'; }, 200);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  bars.forEach(b => obs.observe(b));
}

/* ═══ 13. SERVICES ══════════════════════════════════════════ */
function renderServices() {
  const grid = document.getElementById('svc-grid');
  if (!grid) return;

  const DATA = [
    {
      title: 'Discord Bots',
      desc:  'Music players, moderation systems, economy, leveling, ticket systems, AI integrations — anything your server needs, built with Discord.js v14 and full slash command support.',
      color: '#14dca0',
      glow:  'rgba(20,220,160,0.10)',
      icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="10" width="24" height="18" rx="4" stroke="currentColor" stroke-width="1.4"/><path d="M12 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="19" r="2" fill="currentColor"/><circle cx="20" cy="19" r="2" fill="currentColor"/><path d="M4 20H2M30 20h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    },
    {
      title: 'Web Applications',
      desc:  'Full-stack apps with React, Express, and MongoDB. Dashboards, admin panels, landing pages, portfolio sites — all mobile-first, accessible, and production-ready from day one.',
      color: '#a78bfa',
      glow:  'rgba(167,139,250,0.10)',
      icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 11h28" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="8.5" r="1" fill="currentColor"/><circle cx="11" cy="8.5" r="1" fill="currentColor"/><circle cx="15" cy="8.5" r="1" fill="currentColor"/><path d="M10 18l3 3-3 3M18 24h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      title: 'APIs & Automation',
      desc:  'RESTful APIs, webhook integrations, cron jobs, and automation scripts that connect your services. Third-party API wrappers, scheduled tasks, and data pipelines built to scale.',
      color: '#f59e0b',
      glow:  'rgba(245,158,11,0.10)',
      icon: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 16h4l3-8 4 16 3-10 2 2h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      title: '24/7 Bot Hosting',
      desc:  'Dedicated uptime monitoring, automatic restart on crash, zero-downtime deployments, and monthly performance reports so your bot never goes offline when it matters most.',
      color: '#38bdf8',
      glow:  'rgba(56,189,248,0.10)',
      icon: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="8" width="28" height="7" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="17" width="28" height="7" rx="2" stroke="currentColor" stroke-width="1.4"/><circle cx="26" cy="11.5" r="1.5" fill="currentColor"/><circle cx="26" cy="20.5" r="1.5" fill="currentColor"/><path d="M6 11.5h10M6 20.5h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    },
  ];

  grid.innerHTML = DATA.map(s => `
    <article
      class="svc-card"
      role="listitem"
      style="--svc-color:${s.color}; --svc-glow:${s.glow}"
      data-r
    >
      <div class="svc-ico">${s.icon}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.desc)}</p>
      <a href="#contact" class="svc-cta">
        Get a quote
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </article>
  `).join('');

  observeReveal(grid.querySelectorAll('[data-r]'));
}

/* ═══ 14. PROJECTS ══════════════════════════════════════════ */

/* SVG icons keyed by theme slug */
const PROJ_ICONS = {
  music: `<svg viewBox="0 0 48 48" fill="none"><circle cx="14" cy="38" r="7" stroke="currentColor" stroke-width="2"/><circle cx="36" cy="32" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 38V14l22-6v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  dashboard: `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="5" stroke="currentColor" stroke-width="2"/><path d="M4 18h40" stroke="currentColor" stroke-width="2"/><path d="M14 30l6-6 6 6 8-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ai: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="2"/><path d="M24 12V6M24 42v-6M12 24H6M42 24h-6M16 16l-4-4M36 36l-4-4M36 16l-4 4M16 32l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  default: `<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="12" width="36" height="28" rx="4" stroke="currentColor" stroke-width="2"/><path d="M16 22l5 5-5 5M28 32h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function pickProjIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('music') || t.includes('audio') || t.includes('sound')) return PROJ_ICONS.music;
  if (t.includes('dash')  || t.includes('portfolio') || t.includes('panel')) return PROJ_ICONS.dashboard;
  if (t.includes('ai')    || t.includes('chat') || t.includes('gpt'))  return PROJ_ICONS.ai;
  return PROJ_ICONS.default;
}

async function loadProjects() {
  const grid = document.getElementById('proj-grid');
  if (!grid) return;

  try {
    const res  = await fetch('/api/projects');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('empty');
    renderProjects(data, grid);
  } catch {
    grid.innerHTML = `
      <div class="proj-loading">
        <span>No projects available yet — check back soon.</span>
      </div>`;
  }
}

function renderProjects(projects, grid) {
  grid.innerHTML = projects.map(p => `
    <article class="proj-card" role="listitem" data-r>
      <div class="proj-thumb" style="background:${esc(p.bgColor || '#151520')}">
        <div class="proj-thumb-ico">${pickProjIcon(p.title)}</div>
      </div>
      <div class="proj-body">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <div class="proj-links">
          ${p.live   ? `<a href="${esc(p.live)}"   class="pb live" target="_blank" rel="noopener noreferrer">Live ↗</a>` : ''}
          ${p.github ? `<a href="${esc(p.github)}" class="pb"      target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  observeReveal(grid.querySelectorAll('[data-r]'));
}

/* ═══ 15. PRICING TOGGLE ════════════════════════════════════ */
function initPricingToggle() {
  const btns   = document.querySelectorAll('.ptog');
  const prices = document.querySelectorAll('.pc-price');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.ptog; // 'one-time' | 'monthly'
      prices.forEach(el => {
        // Animate out
        el.style.opacity   = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => {
          el.textContent  = mode === 'monthly' ? el.dataset.mo : el.dataset.ot;
          el.style.opacity   = '1';
          el.style.transform = 'translateY(0)';
        }, 200);
      });
    });
  });

  // Set initial transition on price elements
  prices.forEach(el => {
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  });
}

/* ═══ 16. CONTACT FORM ═══════════════════════════════════════ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Character counter
  const msgField = form.querySelector('[name="message"]');
  const counter  = document.getElementById('msg-count');
  msgField?.addEventListener('input', () => {
    const len = msgField.value.length;
    if (counter) {
      counter.textContent = len;
      counter.style.color = len > 1900 ? 'var(--c-red)' : '';
    }
  });

  // Submit handler
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const btn = document.getElementById('sub-btn');
    btn?.classList.add('loading');

    const payload = {
      name:    form.querySelector('[name="name"]')?.value.trim()    ?? '',
      email:   form.querySelector('[name="email"]')?.value.trim()   ?? '',
      subject: form.querySelector('[name="subject"]')?.value        ?? '',
      message: form.querySelector('[name="message"]')?.value.trim() ?? '',
    };

    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);
      showToast('Message sent! I\'ll reply within 24 hours ✓');
      form.reset();
      if (counter) counter.textContent = '0';
      clearAllErrors(form);
    } catch (err) {
      showToast(err.message || 'Something went wrong. Try Discord instead.', true);
    } finally {
      btn?.classList.remove('loading');
    }
  });

  // Live validation
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('blur',  () => validateField(field));
    field.addEventListener('input', () => { if (field.classList.contains('err')) validateField(field); });
  });
}

function validateForm(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach(f => { if (!validateField(f)) ok = false; });
  return ok;
}

function validateField(field) {
  const errEl = field.closest('.cf')?.querySelector('.cf-e');
  let msg = '';

  if (!field.value.trim()) {
    msg = 'This field is required.';
  } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
    msg = 'Please enter a valid email.';
  } else if (field.name === 'name'    && field.value.trim().length > 100)  {
    msg = 'Name is too long (max 100 chars).';
  } else if (field.name === 'message' && field.value.trim().length > 2000) {
    msg = 'Message too long (max 2000 chars).';
  }

  field.classList.toggle('err', !!msg);
  if (errEl) errEl.textContent = msg;
  return !msg;
}

function clearAllErrors(form) {
  form.querySelectorAll('.cf-e').forEach(el => el.textContent = '');
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
}

/* ═══ 17. TOAST ══════════════════════════════════════════════ */
let _toastTimer = null;

function showToast(msg, isErr = false) {
  const el = document.getElementById('toast');
  if (!el) return;

  clearTimeout(_toastTimer);
  el.classList.remove('show', 'is-err');
  void el.offsetWidth; // force reflow

  el.textContent = msg;
  if (isErr) el.classList.add('is-err');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  _toastTimer = setTimeout(() => el.classList.remove('show'), 5500);
}

/* ═══ 18. FOOTER YEAR ════════════════════════════════════════ */
function initFooterYear() {
  const el = document.getElementById('ft-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ═══ UTILITY ════════════════════════════════════════════════ */

/** Escape HTML entities (XSS prevention for dynamic content) */
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
