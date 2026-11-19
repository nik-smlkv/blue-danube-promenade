/* Blue Danube Promenade — chapter 1 «Kvart»: full-bleed interactive 3D.
   Starts from the intro's final aerial frame (poster → live model at a matching camera),
   then lets the visitor switch layers: overview, surroundings, lamellas, courtyard, ground floor.
   Overlays (lamella prisms, courtyard, ground-floor band, annex, passages) come from
   model/kvart.json — footprints traced from a top-down height map of the FBX model.
   Page scroll is never captured: wheel scrolls the page, ctrl/⌘ + wheel or pinch zooms. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createLook } from './kvart-look.js?v=kv10';

const root = document.querySelector('[data-kvart]');
if (root) init(root);

function init(root) {
  const SR = document.documentElement.lang !== 'ru';
  const plural = (c, f) => (c % 10 === 1 && c % 100 !== 11 ? f[0] : (c % 10 >= 2 && c % 10 <= 4 && (c % 100 < 12 || c % 100 > 14)) ? f[1] : f[2]);
  const T = SR ? {
    lam: (n) => `Lamela ${n}`,
    cta: (n, c) => `Pogledajte ${c} ${plural(c, ['stan', 'stana', 'stanova'])} u lameli ${n}`,
    lamTitle: 'Izaberite lamelu na modelu.', lamText: 'Lamele 5 i 6 su u fokusu prodaje – stanovi do 40 m².',
    focus: 'U fokusu prodaje', loading: (p) => `Učitavanje 3D modela${p ? ` · ${p} %` : '…'}`, fail: '3D model nije moguće prikazati u ovom pregledaču.',
    roads: [['S126 · planirana ulica', 46, -86], ['T6 · magistrala', 140, 30], ['S133 · Ratarski put', -96, -18]],
    area: ['Altina', -250, 40], site: 'Blue Danube Promenade',
    dirs: [['Centar Beograda', 0.856, 0.517], ['Zemun', 0.961, 0.276], ['Aerodrom „Nikola Tesla“', -0.81, 0.586]],
    pass: 'Pasaž', court: 'Unutrašnje dvorište', annex: 'Aneks · lokali', ground: 'Lokali u prizemlju',
  } : {
    lam: (n) => `Секция ${n}`,
    cta: (n, c) => `Смотреть ${c} ${plural(c, ['квартиру', 'квартиры', 'квартир'])} в секции ${n}`,
    lamTitle: 'Выберите секцию на модели.', lamText: 'Секции 5 и 6 — в фокусе продаж, квартиры до 40 м².',
    focus: 'В фокусе продаж', loading: (p) => `Загружаем 3D-модель${p ? ` · ${p} %` : '…'}`, fail: 'В этом браузере 3D-модель недоступна.',
    roads: [['С126 · планируемая улица', 46, -86], ['Т6 · магистраль', 140, 30], ['С133 · Ратарски пут', -96, -18]],
    area: ['Алтина', -250, 40], site: 'Blue Danube Promenade',
    dirs: [['Центр Белграда', 0.856, 0.517], ['Земун', 0.961, 0.276], ['Аэропорт «Никола Тесла»', -0.81, 0.586]],
    pass: 'Пассаж', court: 'Внутренний двор', annex: 'Анекс · помещения', ground: 'Помещения на первом этаже',
  };
  const INFO = SR ? {
    1: 'Duž ulice S126 · 18,5 × 57 m · 167 stanova, 10 lokala', 2: 'Duž ulice S126 · 49 × 20 m · 181 stan, 14 lokala',
    3: 'Duž ulice S126 · 57,5 × 20 m · 183 stana, 12 lokala', 4: 'Duž magistrale T6 · 19 × 45 m · 137 stanova, 7 lokala',
    5: 'Duž magistrale T6 · 17 × 40 m · 120 stanova, 5 lokala', 6: 'Duž interne saobraćajnice · 19 × 62,5 m · 183 stana, 12 lokala',
    7: 'Duž interne saobraćajnice · 19 × 51 m · 174 stana, 15 lokala', 8: 'Sa otklonom u odnosu na Ratarski put · 19 × 46,5 m · 146 stanova',
  } : {
    1: 'Вдоль улицы С126 · 18,5 × 57 м · 167 квартир, 10 помещений', 2: 'Вдоль улицы С126 · 49 × 20 м · 181 квартира, 14 помещений',
    3: 'Вдоль улицы С126 · 57,5 × 20 м · 183 квартиры, 12 помещений', 4: 'Вдоль магистрали Т6 · 19 × 45 м · 137 квартир, 7 помещений',
    5: 'Вдоль магистрали Т6 · 17 × 40 м · 120 квартир, 5 помещений', 6: 'Вдоль внутреннего проезда · 19 × 62,5 м · 183 квартиры, 12 помещений',
    7: 'Вдоль внутреннего проезда · 19 × 51 м · 174 квартиры, 15 помещений', 8: 'Под углом к Ратарскому пути · 19 × 46,5 м · 146 квартир',
  };
  const FOCUS = [5, 6];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const EVENING = 0.85;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const stage = $('.kv-stage');
  const status = $('.kv-status');
  const pinsEl = $('.kv-pins');
  const tabs = $$('.kv-tabs [role="tab"]');
  const infos = $$('[data-info]');
  const lamBtns = $$('[data-kv-lam]');
  const lamTitle = $('[data-kv-lam-title]');
  const lamText = $('[data-kv-lam-text]');
  const ctaEl = $('.kv-cta');
  const modeBtns = $$('[data-kv-mode]');
  const zoomBtns = $$('[data-kv-zoom]');
  const touchGate = $('.kv-touch');
  const freeBtn = $('[data-kv-free]'), freeBar = $('.kv-freebar');

  /* ---------- panel state (works before and without 3D) ---------- */
  let layer = 'pregled', lamSel = 0, api = null;
  function setLayer(name, opts = {}) {
    layer = name;
    tabs.forEach((t) => {
      const on = t.dataset.layer === name;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    });
    infos.forEach((el) => { el.hidden = el.dataset.info !== name; });
    root.dataset.layer = name;
    if (name !== 'lamele' && lamSel) selectLam(0, { quiet: true });
    if (api) api.applyLayer(name, opts);
  }
  function selectLam(n, opts = {}) {
    lamSel = n;
    lamBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.kvLam === n)));
    if (n) {
      lamTitle.textContent = T.lam(n); lamText.textContent = INFO[n];
      const focus = FOCUS.includes(n);
      ctaEl.hidden = !focus;
      if (focus) {
        const cnt = (window.STANOVI || []).filter((a) => a.lamela === n && a.povrsina_m2 <= 40).length;
        ctaEl.textContent = T.cta(n, cnt); ctaEl.dataset.lam = n;
      }
    } else {
      lamTitle.textContent = T.lamTitle; lamText.textContent = T.lamText; ctaEl.hidden = true;
    }
    if (!opts.quiet && layer !== 'lamele') { setLayer('lamele', { keepLam: true }); }
    if (api) api.selectLam(n, opts);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setLayer(t.dataset.layer));
    t.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + k + tabs.length) % tabs.length;
      tabs[j].focus(); setLayer(tabs[j].dataset.layer);
    });
  });
  lamBtns.forEach((b) => b.addEventListener('click', () => selectLam(+b.dataset.kvLam === lamSel ? 0 : +b.dataset.kvLam)));
  let nightTarget = EVENING;
  modeBtns.forEach((b) => b.addEventListener('click', () => {
    nightTarget = b.dataset.kvMode === 'night' ? EVENING : 0;
    modeBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    root.classList.toggle('is-night', nightTarget > 0);
    if (api) api.setNight(nightTarget);
  }));
  zoomBtns.forEach((b) => b.addEventListener('click', () => { if (api) api.zoom(b.dataset.kvZoom === 'in' ? 0.78 : 1.28); }));
  const aptBtn = $('[data-kv-apt]');
  if (aptBtn) aptBtn.addEventListener('click', async () => {
    if (!api) { // the block may not have started yet: start it and wait for the first frame
      aptBtn.setAttribute('aria-busy', 'true');
      stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
      for (let i = 0; i < 600 && !api; i++) await new Promise((r) => setTimeout(r, 100));
      aptBtn.removeAttribute('aria-busy'); if (!api) return;
    }
    api.openApt();
  });

  /* ---------- lazy start ---------- */
  let started = false;
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting) && !started) { started = true; io.disconnect(); start().catch(fail); }
  }, { rootMargin: '150% 0px' });
  io.observe(root);
  function fail(e) { console.warn('[kvart]', e); status.textContent = T.fail; status.hidden = false; root.classList.add('is-failed'); }

  async function start() {
    let dirty = true, nightReady = false;
    let night = nightTarget;
    status.textContent = T.loading(0); status.hidden = false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });
    if (!gl) throw new Error('no webgl');
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.prepend(canvas);
    canvas.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();

    // sky gradient + fog follow the day/evening mix
    const skyCv = document.createElement('canvas'); skyCv.width = 4; skyCv.height = 256;
    const skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    const fog = new THREE.Fog(0xeee7da, 650, 3000); scene.fog = fog;
    const mixHex = (a, b, k) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
    const paintSky = (k) => {
      const c = skyCv.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, mixHex([200, 219, 236], [44, 56, 88], k));
      g.addColorStop(0.55, mixHex([231, 238, 244], [128, 112, 138], k));
      g.addColorStop(1, mixHex([243, 236, 224], [226, 160, 128], k));
      c.fillStyle = g; c.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
      fog.color.set(mixHex([241, 236, 226], [120, 104, 122], k));
    };

    const camera = new THREE.PerspectiveCamera(34, 1, 2, 9000);
    const controls = new OrbitControls(camera, canvas);
    controls.addEventListener('change', () => { dirty = true; });
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.enableZoom = false; controls.enablePan = false; // wheel scrolls the page
    controls.minDistance = 60; controls.maxDistance = 1250;
    controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.42;
    controls.autoRotateSpeed = 0.3;

    const look = createLook({ renderer, scene, camera, COARSE, texUrl: (f) => new URL('../model/tex/' + f, import.meta.url).href });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 64), new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -4.5; ground.receiveShadow = look.HQ; scene.add(ground);

    // satellite ground + surrounding buildings (Esri World Imagery, © OpenStreetMap)
    // Scene origin = 44.850711 N, 20.372118 E, +x east, -z north, metres.
    const dataP = fetch(new URL('../model/kvart.json', import.meta.url).href).then((r) => r.json());
    const texLoader = new THREE.TextureLoader();
    const satMats = [];
    const satTex = (f) => texLoader.loadAsync(new URL('../model/' + f, import.meta.url).href).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
    Promise.all([satTex('sat_near.webp'), satTex('sat_far.webp'), dataP]).then(([near, far, d]) => {
      const mk = (geo, tex, y) => {
        const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }); satMats.push(m);
        const g = new THREE.Mesh(geo, m); g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = look.HQ; scene.add(g);
      };
      // satellite sits under the project's own modelled streets, lawns and pavements, which take over near the block
      mk(new THREE.PlaneGeometry(8000, 8000), far, -4.35); mk(new THREE.PlaneGeometry(1200, 1200), near, -4.05); ground.visible = false; if (nightReady) applyNight(night); dirty = true;
    }).catch((e) => console.warn('[kvart] satellite', e));
    const ctxMat = look.ctxMat;
    fetch(new URL('../model/context.json', import.meta.url).href).then((r) => r.json()).then((list) => {
      const geos = [];
      for (const [h, f] of list) {
        const sh = new THREE.Shape();
        for (let i = 0; i < f.length; i += 2) (i ? sh.lineTo : sh.moveTo).call(sh, f[i], -f[i + 1]);
        const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
        g.deleteAttribute('uv'); geos.push(g.index ? g.toNonIndexed() : g);
      }
      const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
      merged.rotateX(-Math.PI / 2);
      merged.translate(0, -3.2, 0); const cm = new THREE.Mesh(merged, ctxMat); cm.castShadow = cm.receiveShadow = look.HQ; scene.add(cm); dirty = true;
    }).catch((e) => console.warn('[kvart] context', e));

    /* ---------- overlays from traced footprints ---------- */
    const data = await dataP;
    const shapeOf = (pts, holes = []) => {
      const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      holes.forEach((h) => s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
      return s;
    };
    const prism = (shape, y0, h) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
      g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
    };
    const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false, ...extra });
    const line = (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const fades = []; // {mat, target, max}
    const fade = (mat) => { const f = { mat, target: 0 }; fades.push(f); return f; };

    const bars = {}; const pickables = [];
    for (let n = 1; n <= 8; n++) {
      const b = data.bars[n]; if (!b) continue;
      const g = prism(shapeOf(b.p), -0.8, 38.6);
      const fill = new THREE.Mesh(g, glow(0x9cc8ec)); fill.renderOrder = 3; fill.userData.lam = n;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), line(0xe4f1ff)); edges.renderOrder = 4;
      scene.add(fill, edges); pickables.push(fill);
      bars[n] = { fill: fade(fill.material), edges: fade(edges.material), c: b.c };
    }
    const court = data.court;
    // courtyard highlight drapes over both levels (sunken garden and the podium by lamellas 3–5)
    const G = court.grid, pos = [], idx = [], vid = new Int32Array(G.nx * G.nz).fill(-1);
    G.h.forEach((h, i) => { if (h === null) return; vid[i] = pos.length / 3; pos.push(G.x0 + (i % G.nx) * G.step, h + 0.4, G.z0 + Math.floor(i / G.nx) * G.step); });
    for (let j = 0; j < G.nz - 1; j++) for (let i = 0; i < G.nx - 1; i++) {
      const a = vid[j * G.nx + i], b = vid[j * G.nx + i + 1], c = vid[(j + 1) * G.nx + i], e = vid[(j + 1) * G.nx + i + 1];
      if (a >= 0 && b >= 0 && c >= 0) idx.push(a, c, b);
      if (b >= 0 && c >= 0 && e >= 0) idx.push(b, c, e);
    }
    const courtGeo = new THREE.BufferGeometry(); courtGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); courtGeo.setIndex(idx);
    const courtFill = new THREE.Mesh(courtGeo, glow(0x74b9ee)); courtFill.renderOrder = 2; scene.add(courtFill);
    const courtF = fade(courtFill.material), courtL = { target: 0 };
    const bandGeo = prism(shapeOf(data.band.outer, [data.band.hole]), -0.6, 5.6);
    const band = new THREE.Mesh(bandGeo, glow(0xffb866)); band.renderOrder = 3; scene.add(band);
    const bandEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bandGeo, 25), line(0xffe2b8)); bandEdges.renderOrder = 4; scene.add(bandEdges);
    const annexGeo = prism(shapeOf(data.annex.p), court.y, data.annex.top - court.y + 0.8);
    const annex = new THREE.Mesh(annexGeo, glow(0xffb866)); annex.renderOrder = 3; scene.add(annex);
    const bandF = fade(band.material), bandE = fade(bandEdges.material), annexF = fade(annex.material);

    /* ---------- 3D-anchored labels ---------- */
    const labels = [];
    const addLabel = (el, x, y, z, layers, extra = {}) => { pinsEl.appendChild(el); const L = { el, pos: new THREE.Vector3(x, y, z), layers, ...extra }; labels.push(L); return L; };
    const tag = (text, cls) => { const s = document.createElement('span'); s.className = `kv-tag ${cls}`; s.textContent = text; s.setAttribute('aria-hidden', 'true'); return s; };
    const lamPins = {};
    for (let n = 1; n <= 8; n++) {
      if (!bars[n]) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'kv-pin' + (FOCUS.includes(n) ? ' is-focus' : ''); b.textContent = n;
      b.setAttribute('aria-label', T.lam(n));
      b.addEventListener('click', () => selectLam(n));
      lamPins[n] = addLabel(b, bars[n].c[0], 41, bars[n].c[1], FOCUS.includes(n) ? ['lamele', 'pregled'] : ['lamele']);
      if (FOCUS.includes(n)) { const note = document.createElement('span'); note.className = 'kv-pin-note'; note.textContent = T.focus; b.appendChild(note); lamPins[n].note = note; }
    }
    T.roads.forEach(([t, x, z]) => addLabel(tag(t, 'is-road'), x, 1, z, ['okruzenje']));
    addLabel(tag(T.area[0], 'is-area'), T.area[1], 1, T.area[2], ['okruzenje']);
    addLabel(tag(T.site, 'is-site'), 17, 40, 5, ['okruzenje']);
    const CEN = new THREE.Vector3(17, 0, 5);
    T.dirs.forEach(([t, dx, dz]) => addLabel(tag(t, 'is-dir'), 17 + dx * 300, 1, 5 + dz * 300, ['okruzenje'], { dir: true }));
    // labels marked occ hide while a lamella stands between them and the camera
    data.passages.forEach((p) => addLabel(tag(T.pass, 'is-pass'), p.c[0], 4, p.c[1], ['dvoriste'], { occ: true }));
    addLabel(tag(T.court, 'is-area'), court.c[0] - 14, 3, court.c[1] - 8, ['dvoriste'], { occ: true });
    addLabel(tag(T.annex, 'is-warm'), data.annex.c[0], data.annex.top + 3, data.annex.c[1], ['prizemlje'], { occ: true });
    addLabel(tag(T.ground, 'is-warm'), 101, 3, 57, ['prizemlje'], { occ: true });

    /* ---------- detailed model ---------- */
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    // model built from the project FBX: building and site ship as two files (each under 20 MB); phones get one lighter file
    const parts = COARSE ? ['kv-m.glb'] : ['kv-a.glb', 'kv-b.glb'];
    const got = new Array(parts.length).fill(0), tot = new Array(parts.length).fill(0);
    const bufs = await Promise.all(parts.map(async (f, i) => {
      const r = await fetch(new URL('../model/' + f + '?v=fbx3', import.meta.url).href);
      if (!r.ok) throw new Error(`model ${f}: ${r.status}`);
      tot[i] = +r.headers.get('content-length') || 0;
      if (!r.body || !tot[i]) return new Uint8Array(await r.arrayBuffer());
      const rd = r.body.getReader(), chunks = [];
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        chunks.push(value); got[i] += value.length;
        const T0 = tot.reduce((a, b) => a + b, 0);
        if (T0) status.textContent = T.loading(Math.min(99, Math.round((got.reduce((a, b) => a + b, 0) / T0) * 100)));
      }
      const out = new Uint8Array(got[i]); let o = 0; chunks.forEach((c) => { out.set(c, o); o += c.length; }); return out;
    }));
    const model = new THREE.Group();
    for (const b of bufs) { const g = await loader.parseAsync(b.buffer, new URL('../model/', import.meta.url).href); model.add(g.scene); }
    look.applyModel(model, { court: court.p });
    scene.add(model);
    { // re-seat the courtyard highlight on the detailed deck (the grid heights came from the coarse model)
      model.updateMatrixWorld(true); const decks = []; model.traverse((o) => { if (o.name === 'courtyard') decks.push(o); });
      const rc = new THREE.Raycaster(), P = courtGeo.attributes.position, dn = new THREE.Vector3(0, -1, 0), o3 = new THREE.Vector3(), miss = [], d = [];
      for (let i = 0; i < P.count; i++) {
        rc.set(o3.set(P.getX(i), 30, P.getZ(i)), dn); const h = rc.intersectObjects(decks, false)[0];
        if (h && h.point.y + 0.35 > P.getY(i) - 1) { d.push(h.point.y + 0.35 - P.getY(i)); P.setY(i, h.point.y + 0.35); } else miss.push(i);
      }
      if (d.length) { d.sort((a, b) => a - b); const md = d[d.length >> 1]; miss.forEach((i) => P.setY(i, P.getY(i) + md)); }
      P.needsUpdate = true; courtGeo.computeBoundingSphere();
    }

    /* ---------- camera presets ---------- */
    const sph = (target, az, el, dist) => {
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      return { t: target.clone(), p: target.clone().add(new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).multiplyScalar(dist)) };
    };
    const portrait = () => stage.clientWidth / stage.clientHeight < 0.9;
    const curAz = () => { const d = camera.position.clone().sub(controls.target); return THREE.MathUtils.radToDeg(Math.atan2(d.z, d.x)); };
    const k = (f = 1.55) => (portrait() ? f : 1);
    // 'pregled' matches the intro's last aerial frame (looking north-west along the block)
    const PRESET = {
      pregled: () => sph(new THREE.Vector3(5, 4, -8), 31, 24, 400 * k(1.0)),
      okruzenje: () => sph(new THREE.Vector3(17, 0, 5), 90, 62, 940 * k()), // north up, like a map
      lamele: () => sph(new THREE.Vector3(17, 10, 5), curAz(), 40, 380 * k()),
      dvoriste: () => sph(new THREE.Vector3(court.c[0], 0, court.c[1]), curAz(), 62, 300 * k()),
      prizemlje: () => sph(new THREE.Vector3(17, 4, 5), curAz(), 20, 330 * k()),
    };
    const fly = { t: 1, fP: new THREE.Vector3(), tP: new THREE.Vector3(), fT: new THREE.Vector3(), tT: new THREE.Vector3(), dur: 1.6 };
    function flyTo({ p, t }, dur = 1.6) {
      fly.fP.copy(camera.position); fly.fT.copy(controls.target); fly.tP.copy(p); fly.tT.copy(t); fly.dur = dur;
      fly.t = RM ? 1 : 0;
      if (RM) { camera.position.copy(p); controls.target.copy(t); }
      dirty = true;
    }
    const start0 = PRESET.pregled();
    camera.position.copy(start0.p); controls.target.copy(start0.t);

    /* ---------- layers ---------- */
    let idleAt = performance.now();
    function setTargets() {
      for (let n = 1; n <= 8; n++) {
        if (!bars[n]) continue;
        const sel = lamSel === n, hov = hover === n;
        let f = 0, e = 0;
        if (layer === 'lamele') { f = sel ? 0.26 : hov ? 0.13 : 0; e = sel ? 0.95 : hov ? 0.6 : 0.16; }
        else if (layer === 'pregled' && FOCUS.includes(n)) { f = hov ? 0.14 : 0; e = hov ? 0.7 : 0.34; }
        else if (layer === 'pregled') { f = hov ? 0.1 : 0; e = hov ? 0.5 : 0; }
        bars[n].fill.target = f; bars[n].edges.target = e;
      }
      courtF.target = layer === 'dvoriste' ? 0.45 : 0; courtL.target = layer === 'dvoriste' ? 0.9 : 0;
      const g = layer === 'prizemlje';
      bandF.target = g ? 0.5 : 0; bandE.target = g ? 0.85 : 0; annexF.target = g ? 0.55 : 0;
      dirty = true;
    }
    function applyLayer(name, opts = {}) {
      controls.autoRotate = false; idleAt = performance.now();
      labels.forEach((L) => L.el.classList.toggle('is-shown', L.layers.includes(name)));
      if (!(name === 'lamele' && lamSel && opts.keepLam)) flyTo(PRESET[name]());
      setTargets();
    }
    function selectLamella(n) {
      for (let i = 1; i <= 8; i++) if (lamPins[i]) { lamPins[i].el.classList.toggle('is-active', i === n); lamPins[i].el.setAttribute('aria-pressed', String(i === n)); }
      setTargets();
      if (!n) { if (layer === 'lamele') flyTo(PRESET.lamele()); return; }
      const c = new THREE.Vector3(bars[n].c[0], 14, bars[n].c[1]);
      const out = c.clone().sub(new THREE.Vector3(17, 14, 5)).setY(0).normalize();
      const dir = out.multiplyScalar(0.78).add(new THREE.Vector3(0, 0.62, 0)).normalize();
      flyTo({ t: c, p: c.clone().addScaledVector(dir, 175 * k()) }, 1.4);
      controls.autoRotate = false;
    }

    // picking & hover on the lamella prisms (only where lamellas are the subject)
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let down = null, hover = 0;
    const pickAt = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return hit ? hit.object.userData.lam : 0;
    };
    const canPick = () => !free && (layer === 'lamele' || layer === 'pregled');
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; controls.autoRotate = false; idleAt = performance.now(); root.classList.add('is-touched'); });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !canPick()) return;
      const n = pickAt(e); if (n) selectLam(n);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const n = canPick() ? pickAt(e) : 0;
      if (n !== hover) { hover = n; setTargets(); }
      canvas.style.cursor = n ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointerleave', () => { if (hover) { hover = 0; setTargets(); } });
    // ctrl/⌘ + wheel (and trackpad pinch) zooms; a plain wheel keeps scrolling the page
    canvas.addEventListener('wheel', (e) => {
      if (free || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); zoom(Math.exp(e.deltaY * 0.004));
    }, { passive: false });
    function zoom(f) {
      const d = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(d.length() * f, controls.minDistance, controls.maxDistance);
      flyTo({ t: controls.target.clone(), p: controls.target.clone().addScaledVector(d.normalize(), len) }, 0.5);
      controls.autoRotate = false; idleAt = performance.now();
    }

    /* ---------- day / evening ---------- */
    const nightHooks = new Set(), frameHooks = new Set();
    function applyNight(kk) {
      paintSky(kk);
      look.setNight(kk);
      ground.material.color.setRGB(0.91 - 0.5 * kk, 0.886 - 0.5 * kk, 0.83 - 0.42 * kk);
      satMats.forEach((m) => m.color.setRGB(0.86 - 0.5 * kk, 0.86 - 0.52 * kk, 0.84 - 0.46 * kk));
      ctxMat.color.setRGB(0.86 - 0.45 * kk, 0.84 - 0.45 * kk, 0.8 - 0.42 * kk);
      band.material.blending = annex.material.blending = kk > 0.4 ? THREE.AdditiveBlending : THREE.NormalBlending;
      band.material.needsUpdate = annex.material.needsUpdate = true;
      nightHooks.forEach((f) => f(kk));
      dirty = true;
    }
    applyNight(night); nightReady = true;

    /* ---------- free view: full screen, pan, wheel zoom, down to eye level ---------- */
    // In the page the model never captures scrolling (wheel and one-finger swipes scroll on). The free view is the
    // explicit opt-in: the stage fills the screen and the camera is limited only by the ground and the site's surroundings.
    let free = false, gateSaved = null;
    const BOUND = 520, EYE = -1.4; // metres around the block centre; lowest orbit target ≈ eye level above the grade (−3)
    const LIM = { minD: controls.minDistance, maxD: controls.maxDistance, minP: controls.minPolarAngle, maxP: controls.maxPolarAngle };
    controls.keyPanSpeed = 18; // arrow keys pan, only while the free view is open
    controls.addEventListener('change', () => {
      if (!free || root.classList.contains('is-apt')) return;
      const t = controls.target;
      const cx = THREE.MathUtils.clamp(t.x, CEN.x - BOUND, CEN.x + BOUND), cz = THREE.MathUtils.clamp(t.z, CEN.z - BOUND, CEN.z + BOUND), cy = THREE.MathUtils.clamp(t.y, EYE, 90);
      if (cx !== t.x || cz !== t.z || cy !== t.y) { const d = new THREE.Vector3(cx - t.x, cy - t.y, cz - t.z); t.add(d); camera.position.add(d); }
      if (camera.position.y < EYE - 0.4) camera.position.y = EYE - 0.4;
    });
    let quietT = 0;
    const wake = () => { freeBar.classList.remove('is-quiet'); clearTimeout(quietT); quietT = setTimeout(() => freeBar.classList.add("is-quiet"), 9000); };
    function setFree(on) {
      if (on === free) return;
      free = on;
      root.classList.toggle('is-free', on); document.documentElement.classList.toggle('kv-lock', on);
      freeBar.hidden = !on; if (freeBtn) freeBtn.setAttribute('aria-pressed', String(on));
      controls.autoRotate = false; idleAt = performance.now(); fly.t = 1;
      if (on) {
        gateSaved = { enabled: controls.enabled, pe: canvas.style.pointerEvents, y: window.scrollY }; controls.listenToKeyEvents(window);
        stage.setAttribute('data-lenis-prevent', ''); window.__lenis?.stop(); // the page's smooth scroll must not move underneath
        controls.enabled = true; canvas.style.pointerEvents = 'auto';
        controls.enableZoom = true; controls.enablePan = true; controls.screenSpacePanning = false; controls.zoomToCursor = true;
        controls.minDistance = 3; controls.maxDistance = 1500; controls.minPolarAngle = 0.01; controls.maxPolarAngle = 1.565;
        controls.zoomSpeed = 1.1; controls.rotateSpeed = 0.7;
        if (hover) { hover = 0; setTargets(); }
        wake(); setTimeout(() => freeBar.querySelector('[data-kv-free-exit]').focus({ preventScroll: true }), 50);
      } else {
        controls.stopListenToKeyEvents(); controls.enableZoom = false; controls.enablePan = false; controls.zoomToCursor = false;
        controls.minDistance = LIM.minD; controls.maxDistance = LIM.maxD; controls.minPolarAngle = LIM.minP; controls.maxPolarAngle = LIM.maxP;
        if (gateSaved) { controls.enabled = gateSaved.enabled; canvas.style.pointerEvents = gateSaved.pe; }
        camera.near = 2; camera.updateProjectionMatrix();
        stage.removeAttribute('data-lenis-prevent');
        if (window.__lenis) { window.__lenis.start(); if (gateSaved) window.__lenis.scrollTo(gateSaved.y, { immediate: true, force: true }); }
        else if (gateSaved) window.scrollTo({ top: gateSaved.y, behavior: 'instant' });
        flyTo(lamSel ? PRESET.lamele() : PRESET[layer](), 0.9);
        (freeBtn && freeBtn.offsetParent ? freeBtn : touchGate)?.focus({ preventScroll: true });
      }
      dirty = true;
    }
    if (freeBtn) freeBtn.addEventListener('click', () => setFree(!free));
    freeBar.querySelector('[data-kv-free-exit]').addEventListener('click', () => setFree(false));
    freeBar.querySelector('[data-kv-free-reset]').addEventListener('click', () => { flyTo(PRESET.pregled(), 1.2); wake(); });
    window.addEventListener('keydown', (e) => { if (free && e.key === 'Escape' && !root.classList.contains('is-apt')) setFree(false); });
    canvas.addEventListener('pointerdown', () => { if (free) wake(); });

    // double click / double tap: glide to the point under the cursor and orbit around it
    const focusMeshes = [];
    model.traverse((o) => { if (o.isMesh) focusMeshes.push(o); });
    scene.children.forEach((o) => { if (o.isMesh && o !== ground && !pickables.includes(o) && o.geometry && o.geometry.type !== 'CircleGeometry') focusMeshes.push(o); });
    const focusAt = (x, y) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(focusMeshes, false).find((h) => h.object.visible && h.object.material && h.object.material.opacity !== 0);
      if (!hit) return;
      const t = hit.point.clone(); t.y = Math.max(t.y, EYE);
      const d = camera.position.clone().sub(controls.target); const len = Math.min(d.length(), 70);
      flyTo({ t, p: t.clone().addScaledVector(d.normalize(), len) }, 1.0);
    };
    canvas.addEventListener('dblclick', (e) => { if (free && !root.classList.contains('is-apt')) focusAt(e.clientX, e.clientY); });
    let lastTap = 0, lastXY = [0, 0];
    canvas.addEventListener('pointerup', (e) => {
      if (!free || e.pointerType !== 'touch' || root.classList.contains('is-apt')) return;
      const now = performance.now();
      if (now - lastTap < 320 && Math.hypot(e.clientX - lastXY[0], e.clientY - lastXY[1]) < 30) { focusAt(e.clientX, e.clientY); lastTap = 0; }
      else { lastTap = now; lastXY = [e.clientX, e.clientY]; }
    });

    // phones: the page keeps scrolling; one tap on the button opens the free view
    if (COARSE && touchGate) {
      controls.enabled = false; canvas.style.pointerEvents = 'none'; touchGate.hidden = false;
      touchGate.addEventListener('click', () => setFree(true));
    }

    /* ---------- resize & loop ---------- */
    let wasPortrait = portrait();
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); look.resize(w, h); camera.aspect = w / h;
      if (!camera.userData.lockFov) camera.fov = w / h < 0.9 ? 46 : 34;
      // desktop: the panel covers the left of the stage, so frame the block in the free area to its right
      const panel = root.querySelector('.kv-panel');
      const pr = panel && w > 860 ? panel.getBoundingClientRect().right - stage.getBoundingClientRect().left : 0;
      if (pr > 0 && !free) camera.setViewOffset(w, h, -Math.round(pr * 0.42), Math.round(h * 0.03), w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      if (portrait() !== wasPortrait) { wasPortrait = portrait(); flyTo(lamSel ? PRESET.lamele() : PRESET[layer](), 0.01); }
      dirty = true;
    };
    new ResizeObserver(resize).observe(stage); resize();

    // hand-off: the intro's last frame stays on top until the chapter fills most of the screen,
    // then it dissolves into the live model shot from the same angle
    let inView = false;
    new IntersectionObserver((es) => {
      inView = es[0].intersectionRatio >= 0.6;
      if (inView && !first) root.classList.add('is-live');
    }, { threshold: [0, 0.6] }).observe(stage);
    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(stage);
    const v = new THREE.Vector3(), cv = new THREE.Vector3(), occDir = new THREE.Vector3(); const occRay = new THREE.Raycaster(); const clock = new THREE.Clock();
    let first = true, needStill = false, lastMove = 0;
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;
      if (fly.t < 1) {
        fly.t = Math.min(1, fly.t + dt / fly.dur); const e = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
        camera.position.lerpVectors(fly.fP, fly.tP, e); controls.target.lerpVectors(fly.fT, fly.tT, e); dirty = true;
        idleAt = performance.now();
      }
      // a slow drift starts after a quiet moment on the overview
      if (!RM && !free && layer === 'pregled' && !controls.autoRotate && fly.t >= 1 && performance.now() - idleAt > 5000) controls.autoRotate = true;
      controls.update(dt);
      if (Math.abs(night - nightTarget) > 0.002) { night += (nightTarget - night) * Math.min(1, dt * 3); applyNight(night); }
      for (const f of fades) {
        const o = f.mat.opacity;
        if (Math.abs(o - f.target) > 0.002) { f.mat.opacity = o + (f.target - o) * Math.min(1, dt * (RM ? 60 : 6)); dirty = true; }
        else if (o !== f.target) { f.mat.opacity = f.target; dirty = true; }
        f.mat.visible = f.mat.opacity > 0.003;
      }
      for (const f of frameHooks) if (f(dt)) dirty = true;
      if (!dirty) {
        // once the view has settled, render one refined frame with ambient occlusion
        if (needStill && performance.now() - lastMove > 160) { needStill = false; look.render(true); }
        return;
      }
      dirty = false; lastMove = performance.now(); needStill = look.HQ;
      if (free && !camera.userData.lockNear) { const nr = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.012, 0.2, 2); if (Math.abs(nr - camera.near) > 0.02) { camera.near = nr; camera.updateProjectionMatrix(); } }
      camera.updateMatrixWorld(true);
      const w = stage.clientWidth, h = stage.clientHeight;
      cv.copy(CEN).project(camera); const cx = ((cv.x + 1) / 2) * w, cy = ((1 - cv.y) / 2) * h;
      for (const L of labels) {
        if (L.occ && L.el.classList.contains('is-shown')) {
          occDir.copy(L.pos).sub(camera.position); const dist = occDir.length(); occRay.set(camera.position, occDir.normalize());
          const hit = occRay.intersectObjects(pickables, false)[0];
          L.el.style.opacity = hit && hit.distance < dist - 2 ? '0' : '';
        }
        v.copy(L.pos).project(camera);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const off = v.z > 1 || x < -40 || x > w + 40 || y < -20 || y > h + 20;
        L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
        L.el.style.display = off ? 'none' : '';
        if (L.dir) L.el.style.setProperty('--kv-rot', `${(Math.atan2(y - cy, x - cx) * 180 / Math.PI + 45).toFixed(1)}deg`);
      }
      look.render(false);
      if (first) { first = false; status.hidden = true; root.classList.add('is-ready'); if (inView) root.classList.add('is-live'); }
    });

    // apartment tour (loaded on demand): gets the live scene and the free-view switch
    let tour = null;
    const openApt = async () => {
      if (!tour) {
        const { createAptTour } = await import('./kvart-apt.js?v=a16');
        tour = createAptTour({ THREE, scene, camera, controls, renderer, look, model, canvas, stage, root, ground, SR, RM, COARSE,
          setFree, flyTo, fly, frameHooks, nightHooks, getNight: () => night, markDirty: () => { dirty = true; }, PRESET, layer: () => layer });
      }
      setFree(true); tour.open();
    };
    api = {
      applyLayer, selectLam: (n) => selectLamella(n), zoom, openApt,
      setNight: (kk) => { nightTarget = kk; if (RM) { night = kk; applyNight(kk); } },
    };
    applyLayer(layer, { keepLam: true });
    if (lamSel) selectLamella(lamSel);
    // the opening view should equal the intro's last frame: no fly-in on first show
    if (layer === 'pregled') { fly.t = 1; camera.position.copy(start0.p); controls.target.copy(start0.t); }
    window.__kv = { scene, camera, controls, renderer, api, flyTo, PRESET, data, fly, look, setFree, markDirty: () => { dirty = true; }, get tour() { return tour; } };
  }
}
