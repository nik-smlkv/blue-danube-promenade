/* Blue Danube Promenade — intro scroll story.
   Pinned (CSS sticky) section; scroll progress scrubs two WebP frame sequences on a canvas
   (fly-in to a window, aerial pull-back) and crossfades three illustrative day scenes.
   Independent of GSAP/Lenis: reads the native scroll position (Lenis scrolls the window). */
(() => {
  const root = document.querySelector('[data-intro]');
  if (!root) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait = matchMedia('(max-aspect-ratio: 9/10)');
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];

  const canvas = $('.intro-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scenes = $$('.intro-scene');
  const sceneImgs = scenes.map((s) => s.querySelector('img'));
  const steps = $$('.intro-step');
  const days = $$('.intro-day li');
  const dayBar = $('.intro-day');
  const cap = $('.intro-cap');
  const hint = $('.intro-hint');
  const veil = $('.intro-veil');
  const wxRain = $('.intro-wx[data-wx="rain"]');
  const wxNight = $('.intro-wx[data-wx="night"]');
  const bar = $('.intro-bar i');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const win = (p, a, b, c, d) => Math.min(seg(p, a, b), 1 - seg(p, c, d));
  const ease = (t) => t * t * (3 - 2 * t);

  // ---- choreography (fractions of the pinned scroll distance) ----
  // The section is taller than the original story: after the aerial pull-back the camera makes a full
  // 360° orbit, and only then the offer appears. `po` is the original story timeline (0…1 over the
  // first F of the pin), `p` the whole pin. Reduced motion keeps the original height and timeline.
  const narrow = matchMedia('(max-width: 860px)');
  const storyF = () => RM ? 1 : (narrow.matches ? 340 / 580 : 420 / 700);
  const O = { orbB: 0.93, endA: 0.935, endB: 0.965 };
  const K = { flyA: 0.10, flyB: 0.40, winA: 0.37, winB: 0.45, dayA: 0.57, dayB: 0.61, eveA: 0.70, eveB: 0.74, outA: 0.82, outB: 0.86, pullA: 0.84, pullB: 0.97 };

  // ---- frame sequences ----
  const SEQ = {
    fly: { d: { dir: 'img/intro/fly-d/', n: 96 }, m: { dir: 'img/intro/fly-m/', n: 64 } },
    pull: { d: { dir: 'img/intro/pull-d/', n: 48 }, m: { dir: 'img/intro/pull-m/', n: 48 } },
    orb: { d: { dir: 'img/intro/orb-d/', n: 97 }, m: { dir: 'img/intro/orb-m/', n: 97 } },
  };
  const cache = {};
  let mob = portrait.matches;
  const seq = (name) => {
    const v = mob ? 'm' : 'd', key = name + v;
    if (!cache[key]) { const c = SEQ[name][v]; cache[key] = { ...c, imgs: new Array(c.n), ok: new Uint8Array(c.n) }; }
    return cache[key];
  };
  // coarse-to-fine order so scrubbing works before everything has arrived
  const order = (n) => { const seen = new Uint8Array(n), out = []; for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) if (!seen[i]) { seen[i] = 1; out.push(i); } if (!seen[n - 1]) out.push(n - 1); return out; };
  let queue = [], active = 0, dirty = true;
  const pump = () => {
    // frames only stream while the intro is on screen, so they never compete with later sections (3D model)
    while (visible && active < 6 && queue.length) {
      const [s, i] = queue.shift();
      if (s.imgs[i]) continue;
      const im = new Image(); im.decoding = 'async';
      active++;
      im.onload = () => { s.ok[i] = 1; active--; dirty = true; pump(); };
      im.onerror = () => { active--; pump(); };
      im.src = s.dir + String(i + 1).padStart(3, '0') + '.webp';
      s.imgs[i] = im;
    }
  };
  const enqueue = (name, first) => { const s = seq(name); const o = order(s.n); if (first) queue.unshift(...o.map((i) => [s, i])); else queue.push(...o.map((i) => [s, i])); pump(); };
  // coarse key frames only (every `step`-th + last), so a whole orbit lap exists early even on slow networks
  const enqueueCoarse = (name, step) => { const s = seq(name); const o = []; for (let i = 0; i < s.n; i += step) o.push(i); if (o[o.length - 1] !== s.n - 1) o.push(s.n - 1); queue.push(...o.map((i) => [s, i])); pump(); };
  const nearest = (s, i) => { for (let d = 0; d < s.n; d++) { if (i - d >= 0 && s.ok[i - d]) return s.imgs[i - d]; if (i + d < s.n && s.ok[i + d]) return s.imgs[i + d]; } return null; };

  // weather layers (real renders, same camera as the poster) — load right after the poster
  let wxLoaded = false;
  const loadWx = () => {
    if (wxLoaded) return; wxLoaded = true;
    [wxRain, wxNight].forEach((pc) => {
      pc.querySelectorAll('source[data-srcset]').forEach((so) => { so.srcset = so.dataset.srcset; });
      const im = pc.querySelector('img[data-src]'); if (im) { im.onload = () => { dirty = true; }; im.src = im.dataset.src; }
    });
  };
  // slow idle cycle on the first screen: day ⇄ autumn rain (night arrives with scroll)
  const CYC = { hold0: 7000, fade: 3200, hold1: 6000 };
  const CYC_T = CYC.hold0 + CYC.fade + CYC.hold1 + CYC.fade;
  let autoT = 0, lastNow = 0;
  const autoW = () => {
    const t = autoT % CYC_T;
    if (t < CYC.hold0) return 0;
    if (t < CYC.hold0 + CYC.fade) return ease((t - CYC.hold0) / CYC.fade);
    if (t < CYC.hold0 + CYC.fade + CYC.hold1) return 1;
    return 1 - ease((t - CYC.hold0 - CYC.fade - CYC.hold1) / CYC.fade);
  };

  // lazy scene stills
  let scenesLoaded = false;
  const loadScenes = () => {
    if (scenesLoaded) return; scenesLoaded = true;
    scenes.forEach((sc) => {
      sc.querySelectorAll('source[data-srcset]').forEach((so) => { so.srcset = so.dataset.srcset; });
      const im = sc.querySelector('img[data-src]'); if (im) im.src = im.dataset.src;
    });
  };

  // ---- canvas ----
  let cw = 0, ch = 0, lastDrawn = null;
  const sizeCanvas = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, mob ? 2 : 1.5);
    cw = Math.max(1, Math.round(r.width * dpr)); ch = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; lastDrawn = null; dirty = true; }
  };
  const paint = (img, a = 1) => {
    const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(cw / iw, ch / ih);
    const sw = cw / s, sh = ch / s;
    ctx.globalAlpha = a;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
    ctx.globalAlpha = 1;
  };
  const draw = (img) => {
    if (!img || img === lastDrawn) return;
    paint(img); lastDrawn = img;
  };
  // orbit: blend the two neighbouring frames by the fractional position, so the scrub stays smooth
  let lastBlend = '';
  const drawBlend = (a, b, f) => {
    if (!a) return;
    const key = a.src + '|' + (b && f > 0.01 ? b.src + '|' + f.toFixed(2) : '');
    if (key === lastBlend && lastDrawn === 'blend') return;
    paint(a); if (b && f > 0.01) paint(b, f);
    lastBlend = key; lastDrawn = 'blend';
  };
  const orbFrame = (s, t) => {
    const fi = t * (s.n - 1), i0 = Math.floor(fi), i1 = Math.min(s.n - 1, i0 + 1);
    if (s.ok[i0] && s.ok[i1]) return [s.imgs[i0], s.imgs[i1], fi - i0];
    return [nearest(s, Math.round(fi)), null, 0];
  };

  // ---- progress ----
  const progress = () => {
    const r = root.getBoundingClientRect();
    const dist = root.offsetHeight - window.innerHeight;
    return dist > 0 ? clamp(-r.top / dist) : 0;
  };

  const setStep = (el, o, dy = 14) => {
    el.style.opacity = o.toFixed(3);
    if (!el.classList.contains('intro-end')) el.style.transform = o < 1 ? `translate3d(0, ${((1 - o) * dy).toFixed(1)}px, 0)` : '';
    el.style.pointerEvents = o > 0.5 ? '' : 'none';
  };

  let lastP = -1, lastCap = '';
  const setCap = (kind) => { if (kind === lastCap) return; lastCap = kind; cap.textContent = cap.dataset[kind]; };

  let auto = 0;
  let orbQueued = false;
  const queueOrb = () => { if (orbQueued) return; orbQueued = true; enqueue('orb'); };
  function renderSmooth(P) {
    const F = storyF(), orbA = F * 0.975;
    const p = clamp(P / F);
    if (P > 0.2) queueOrb();
    // sequences: fly-in → aerial pull-back → 360° orbit (starts on the pull-back's last frame)
    const useFly = p < 0.6, useOrb = P >= orbA;
    let img;
    if (useOrb) {
      const so = seq('orb'), t = seg(P, orbA, O.orbB);
      const [a, b, f] = orbFrame(so, t);
      const sp = seq('pull'), last = sp.ok[sp.n - 1] ? sp.imgs[sp.n - 1] : null;
      img = a || last;
      if (!a) draw(last);
      else if (last && t < 0.02) { paint(a); if (b && f > 0.01) paint(b, f); paint(last, 1 - t / 0.02); lastDrawn = null; }
      else drawBlend(a, b, f);
    } else {
      const s = seq(useFly ? 'fly' : 'pull');
      const t = useFly ? seg(p, K.flyA, K.flyB) : seg(p, K.pullA, K.pullB);
      img = nearest(s, Math.round(t * (s.n - 1)));
      if (img) draw(img);
    }
    // weather: day → rain → night (idle cycle value blends into the scroll-driven value)
    const w = auto + (2 - auto) * seg(p, 0.012, K.flyA);
    wxRain.style.opacity = clamp(w).toFixed(3);
    wxNight.style.opacity = clamp(w - 1).toFixed(3);
    // video frame 0 = night render; short crossfade hides the encode difference
    canvas.style.opacity = img ? (useFly ? seg(p, K.flyA, K.flyA + 0.03) : 1).toFixed(3) : '0';

    // window reveal → morning, then day, evening; all fade out to the aerial pull-back
    const out = 1 - seg(p, K.outA, K.outB);
    const r = ease(seg(p, K.winA, K.winB));
    const ins = (1 - r);
    const morning = scenes[0];
    morning.style.opacity = (r > 0 ? Math.min(1, r * 2.2) * out : 0).toFixed(3);
    morning.style.clipPath = r < 1 ? `inset(${(ins * 31).toFixed(2)}% ${(ins * 36).toFixed(2)}% ${(ins * 29).toFixed(2)}% ${(ins * 36).toFixed(2)}% round ${(ins * 10).toFixed(1)}px)` : 'none';
    sceneImgs[0].style.transform = `scale(${(1.14 - 0.1 * ease(seg(p, K.winA, 0.6))).toFixed(4)})`;
    scenes[1].style.opacity = (ease(seg(p, K.dayA, K.dayB)) * out).toFixed(3);
    sceneImgs[1].style.transform = `scale(${(1.07 - 0.06 * seg(p, K.dayA, 0.74)).toFixed(4)})`;
    scenes[2].style.opacity = (ease(seg(p, K.eveA, K.eveB)) * out).toFixed(3);
    sceneImgs[2].style.transform = `scale(${(1.07 - 0.06 * seg(p, K.eveA, 0.86)).toFixed(4)})`;

    // copy
    setStep(steps[0], 1 - seg(p, 0.04, 0.09), -16);
    setStep(steps[1], win(p, 0.13, 0.17, 0.31, 0.35));
    setStep(steps[2], win(p, 0.45, 0.48, 0.55, 0.58));
    setStep(steps[3], win(p, 0.60, 0.63, 0.68, 0.71));
    setStep(steps[4], win(p, 0.73, 0.76, 0.81, 0.84));
    setStep(steps[5], seg(P, O.endA, O.endB));

    dayBar.style.opacity = win(p, 0.44, 0.47, 0.82, 0.85).toFixed(3);
    const di = p < 0.59 ? 0 : p < 0.72 ? 1 : 2;
    days.forEach((d, i) => d.classList.toggle('is-on', i === di));
    setCap(p > 0.42 && p < 0.85 ? 'i' : 'v');
    veil.style.opacity = (1 - seg(p, 0.05, 0.1)).toFixed(3);
    hint.style.opacity = (1 - seg(p, 0.01, 0.04)).toFixed(3);
    bar.style.transform = `scaleX(${P.toFixed(4)})`;
  }

  // reduced motion: discrete stills with CSS opacity crossfades
  function renderStill(p) {
    const st = p < 0.12 ? 0 : p < 0.36 ? 1 : p < 0.59 ? 2 : p < 0.72 ? 3 : p < 0.85 ? 4 : 5;
    steps.forEach((el, i) => { el.classList.toggle('is-on', i === st); el.style.pointerEvents = i === st ? '' : 'none'; });
    scenes.forEach((sc, i) => { sc.style.opacity = (i === st - 2 || (i === 3 && st === 5)) ? '1' : '0'; });
    wxRain.style.opacity = '0';
    wxNight.style.opacity = st === 1 ? '1' : '0';
    dayBar.style.opacity = st >= 2 && st <= 4 ? '1' : '0';
    days.forEach((d, i) => d.classList.toggle('is-on', i === st - 2));
    setCap(st >= 2 && st <= 4 ? 'i' : 'v');
    hint.style.opacity = st === 0 ? '1' : '0';
    veil.style.opacity = st === 0 ? '1' : '0';
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  let visible = true, raf = 0;
  const tick = (now) => {
    raf = 0;
    if (!visible) { lastNow = 0; return; }
    const p = progress();
    if (!RM) {
      const dt = lastNow ? Math.min(100, now - lastNow) : 0; lastNow = now;
      // the idle cycle only advances while the visitor rests on the first screen and the tab is visible
      if (p < 0.012 * storyF() && !document.hidden && wxLoaded) { autoT += dt; const a = autoW(); if (a !== auto) { auto = a; dirty = true; } }
    }
    if (p !== lastP || dirty) {
      dirty = false; lastP = p;
      if (RM) renderStill(p); else renderSmooth(p);
      if (p > 0.08 * storyF()) loadScenes();
    }
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { dirty = true; start(); pump(); } }, { rootMargin: '200px 0px' }).observe(root);

  // keyboard users: focusing the final CTA brings the last step into view
  const endCta = steps[5].querySelector('a');
  if (endCta) endCta.addEventListener('focus', () => {
    if (progress() < 0.97) {
      const y = root.offsetTop + (root.offsetHeight - window.innerHeight) * 0.985;
      if (window.__lenis && !RM) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }
  });

  const onResize = () => {
    const m = portrait.matches;
    if (m !== mob) { mob = m; lastDrawn = null; if (!RM) { enqueue('fly', true); enqueue('pull'); if (orbQueued) { orbQueued = false; queueOrb(); } } }
    sizeCanvas(); dirty = true; start();
  };
  window.addEventListener('resize', onResize, { passive: true });

  if (RM) {
    steps.forEach((el) => { el.style.opacity = ''; });
    loadWx();
    loadScenes();
  } else {
    sizeCanvas();
    // first frames right away (tiny), the rest once the page has loaded
    const s = seq('fly'); queue.push([s, 0]); pump();
    let kicked = false;
    const kick = () => { if (kicked) return; kicked = true; loadWx(); enqueueCoarse('fly', 8); enqueueCoarse('pull', 8); enqueueCoarse('orb', 8); enqueue('fly'); enqueue('pull'); setTimeout(loadScenes, 1500); setTimeout(queueOrb, 2500); };
    if (document.readyState === 'complete') setTimeout(kick, 200); else window.addEventListener('load', () => setTimeout(kick, 200), { once: true });
    window.addEventListener('scroll', kick, { once: true, passive: true });
  }
  start();
})();
