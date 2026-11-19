/* Blue Danube Promenade — apartment tour (L5-5) inside the «Kvart» scene.
   Cut-away view from above → click a room / the floor → walk at eye level; the quarter model stays around the flat
   (cut out where the flat sits), so the windows look onto the real surroundings. */
import { buildApartment } from './apt-l55.js?v=a8';

const FLOOR = 3.75, EYE = 1.6;
// lamella 5 frame (same rotation as the project model): v = out of the south-east facade, u = along the lamella
const VX = 0.86948219, VZ = 0.49396429;
const CORNER = { v: 103.185, u: 5.621 }; // outer face of the south-east facade × outer face of the end wall

export function createAptTour(ctx) {
  const { THREE, scene, camera, controls, renderer, look, model, canvas, stage, root, SR } = ctx;
  const T = SR ? {
    title: 'L5-5', area: '49,37 m²', meta: 'Lamela 5 · 1. sprat · jugoistok', doll: 'Pogled odozgo', walk: 'Šetnja', exit: 'Izađi',
    hintDoll: '<b>Klik na sobu</b> za ulazak <i></i> <b>prevucite</b> za okretanje <i></i> <b>točkić</b> uvećanje',
    hintWalk: '<b>Prevucite</b> da se osvrnete <i></i> <b>W A S D</b> / strelice za kretanje <i></i> <b>klik na plan</b> za brzi prelaz',
    hintWalkT: '<b>Prevucite</b> da se osvrnete <i></i> <b>dodirnite pod</b> za kretanje',
    hintDollT: '<b>Dodirnite sobu</b> za ulazak <i></i> <b>prevucite</b> za okretanje',
    plan: 'Plan stana — klik za brzi prelaz', loading: 'Pripremamo stan…',
  } : {
    title: 'L5-5', area: '49,37 м²', meta: 'Секция 5 · 1-й этаж · юго-восток', doll: 'Вид сверху', walk: 'Прогулка', exit: 'Выйти',
    hintDoll: '<b>Клик по комнате</b> — войти <i></i> <b>тяните</b> — вращать <i></i> <b>колесо</b> — масштаб',
    hintWalk: '<b>Тяните</b>, чтобы осмотреться <i></i> <b>W A S D</b> / стрелки — идти <i></i> <b>клик по плану</b> — быстрый переход',
    hintWalkT: '<b>Тяните</b>, чтобы осмотреться <i></i> <b>коснитесь пола</b> — идти',
    hintDollT: '<b>Коснитесь комнаты</b>, чтобы войти <i></i> <b>тяните</b> — вращать',
    plan: 'План квартиры — клик для быстрого перехода', loading: 'Готовим квартиру…',
  };
  const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* ---------- the flat, placed in lamella 5 ---------- */
  const A = buildApartment({ lang: SR ? 'sr' : 'ru', HQ: look.HQ });
  const V = new THREE.Vector3(VX, 0, VZ), U = new THREE.Vector3(-VZ, 0, VX);
  A.root.rotation.y = Math.atan2(VZ, -VX);
  const c0 = new THREE.Vector3().addScaledVector(V, CORNER.v).addScaledVector(U, CORNER.u).setY(FLOOR);
  A.root.position.copy(c0).sub(A.corner.clone().applyEuler(A.root.rotation)).setY(FLOOR);
  A.root.visible = false; scene.add(A.root); A.root.updateMatrixWorld(true);
  const W = (x, y, z) => A.root.localToWorld(new THREE.Vector3(x, y, z));
  const INV = new THREE.Matrix4().copy(A.root.matrixWorld).invert();
  const CENTER = new THREE.Vector3((A.bounds.x0 + A.bounds.x1) / 2, 0.4, (A.bounds.z0 + A.bounds.z1) / 2);

  // cut-away plane (clips frames/glass/doors above the low walls) and the box cut out of the quarter model while walking
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), FLOOR + A.CUT);
  const b = A.bounds, lo = [b.x0 - 0.9, -0.35, b.z0 - 0.15], hi = [b.x1 + 0.15, A.H + 0.4, b.z1 + 0.9];
  const boxPlanes = [[1, 0, 0, -hi[0]], [-1, 0, 0, lo[0]], [0, 1, 0, -hi[1]], [0, -1, 0, lo[1]], [0, 0, 1, -hi[2]], [0, 0, -1, lo[2]]]
    .map(([x, y, z, w]) => new THREE.Plane(new THREE.Vector3(x, y, z), w).applyMatrix4(A.root.matrixWorld));
  const modelMats = new Set(Object.values(look.M)); model.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => modelMats.add(m)); });
  const clipModel = (on) => modelMats.forEach((m) => { m.clippingPlanes = on ? boxPlanes : null; m.clipIntersection = true; m.clipShadows = true; m.needsUpdate = true; });

  /* ---------- UI ---------- */
  const ui = document.createElement('div'); ui.className = 'kv-apt-ui'; ui.hidden = true;
  ui.innerHTML = `
    <div class="kv-apt-card"><p><b>${T.title}</b><span>${T.area}</span></p><small>${T.meta}</small></div>
    <p class="kv-apt-room" aria-live="polite"></p>
    <div class="kv-apt-labels"></div>
    <button type="button" class="kv-apt-map" aria-label="${T.plan}"><img src="plans/l5-5-plan.webp" width="990" height="630" alt=""><i class="kv-apt-me"><i></i></i></button>
    <div class="kv-apt-bar">
      <p class="kv-freehint kv-apt-hint"></p>
      <div class="kv-freebtns">
        <div class="kv-seg kv-apt-seg" role="group"><button type="button" data-m="doll" aria-pressed="true">${T.doll}</button><button type="button" data-m="walk" aria-pressed="false">${T.walk}</button></div>
        <button type="button" data-kv-free-exit class="kv-apt-exit"><span aria-hidden="true">✕</span> ${T.exit}</button>
      </div>
    </div>`;
  stage.appendChild(ui);
  const $ = (s) => ui.querySelector(s);
  const roomEl = $('.kv-apt-room'), hintEl = $('.kv-apt-hint'), labelsEl = $('.kv-apt-labels'), mapEl = $('.kv-apt-map'), meEl = $('.kv-apt-me');
  const labels = A.rooms.map((r) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'kv-apt-label';
    el.innerHTML = `<i>${r.n}</i><span>${r.name}<small>${r.a} m²</small></span>`;
    el.addEventListener('click', () => walkTo(r)); labelsEl.appendChild(el);
    return { el, r, pos: W(r.label[0], 0.3, r.label[1]) };
  });

  /* ---------- state ---------- */
  let mode = 'off', saved = null, roomNow = null;
  const S = { x: 5, z: 4, yaw: 0, pitch: -0.05, path: null, keys: new Set(), tween: null };
  const tmpV = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

  const setHint = () => { hintEl.innerHTML = mode === 'walk' ? (TOUCH ? T.hintWalkT : T.hintWalk) : (TOUCH ? T.hintDollT : T.hintDoll); };
  const setSeg = () => ui.querySelectorAll('.kv-apt-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.m === mode)));

  // the quarter (and the page's overlays) go away in the cut-away view: the flat alone reads like a model on a table
  const hidden = [];
  function showQuarter(on) {
    if (!on) {
      scene.children.forEach((o) => { if (o === A.root || o.isLight || !o.visible) return; o.visible = false; hidden.push(o); });
      if (look.sun) look.sun.target.visible = true;
      saved.bg = scene.background; saved.fog = scene.fog; scene.background = new THREE.Color(0xe8e2d6); scene.fog = null;
    } else {
      hidden.splice(0).forEach((o) => { o.visible = true; });
      if (saved.bg) { scene.background = saved.bg; scene.fog = saved.fog; saved.bg = null; }
      // page overlays (translucent prisms, outlines, the courtyard drape) stay off while walking: they wrap lamella 5 too
      const skip = new Set([A.root, model]);
      scene.traverse((o) => {
        if (!o.visible || o.isLight) return;
        for (let p = o; p; p = p.parent) if (skip.has(p)) return;
        const mt = o.material; if (o.isLine || o.isLineSegments || (mt && !Array.isArray(mt) && mt.transparent)) { o.visible = false; hidden.push(o); }
      });
    }
  }

  function setLens(fov, near) { camera.fov = fov; camera.near = near; camera.updateProjectionMatrix(); }
  const dirLocal = (yaw, pitch) => new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
  function placeCamera() {
    const p = W(S.x, EYE, S.z), d = dirLocal(S.yaw, S.pitch).transformDirection(A.root.matrixWorld);
    camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(tmpV.copy(p).add(d)); controls.target.copy(tmpV);
  }

  /* ---------- modes ---------- */
  function toDoll(instant = false) {
    mode = 'doll'; setSeg(); setHint(); ui.dataset.mode = 'doll'; S.path = null; S.tween = null;
    showQuarter(false); A.setCut(true, cutPlane); clipModel(false); look.aoOn = true; look.setAOInterior(false); look.setBoost(0);
    setLens(stage.clientWidth / stage.clientHeight < 0.9 ? 52 : 40, 0.1);
    controls.enabled = true; controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = false; controls.zoomToCursor = false;
    controls.minDistance = 6; controls.maxDistance = 30; controls.minPolarAngle = 0.08; controls.maxPolarAngle = 1.25;
    // landscape: seen like the sales plan (end wall at the bottom); portrait: turned so the flat's long side runs up the screen
    const port = stage.clientWidth / stage.clientHeight < 0.9, far = port ? 15.5 : 15.5;
    const t = A.root.localToWorld(CENTER.clone());
    const p = A.root.localToWorld(CENTER.clone().add(port ? new THREE.Vector3(far * 0.5, far * 0.86, 0.4) : new THREE.Vector3(-0.6, far * 0.82, far * 0.58)));
    if (instant) { camera.position.copy(p); controls.target.copy(t); ctx.fly.t = 1; } else ctx.flyTo({ p, t }, 1.3);
    roomEl.hidden = true; canvas.style.cursor = ''; ctx.markDirty();
  }
  function toWalk(x, z, yaw, pitch = -0.06) {
    const from = mode; mode = 'walk'; setSeg(); setHint(); ui.dataset.mode = 'walk';
    controls.enabled = false; ctx.fly.t = 1;
    // OrbitControls still runs update() every frame: open its limits so it never pulls the eye back
    controls.minDistance = 0; controls.maxDistance = Infinity; controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI;
    showQuarter(true); A.setCut(false); clipModel(true); look.aoOn = true; look.setAOInterior(true, [model]); look.setBoost(0.08);
    const p0 = camera.position.clone(), q0 = camera.quaternion.clone(), f0 = camera.fov;
    S.x = x; S.z = z; S.yaw = yaw; S.pitch = pitch; S.path = null;
    setLens(TOUCH ? 74 : 70, 0.05); placeCamera(); canvas.style.cursor = 'grab';
    const p1 = camera.position.clone(), q1 = camera.quaternion.clone();
    if (from === 'doll' && !ctx.RM) { S.tween = { t: 0, dur: 1.4, p0, q0, p1, q1, f0, f1: camera.fov }; camera.position.copy(p0); camera.quaternion.copy(q0); setLens(f0, 0.05); }
    ctx.markDirty();
  }
  function walkTo(r) { const [x, z] = r.view[0], [lx, lz] = r.view[1]; toWalk(x, z, Math.atan2(lz - z, lx - x), r.pitch ?? -0.06); }
  function goto(x, z, fast = false) {
    if (mode !== 'walk') { const d = new THREE.Vector3().subVectors(controls.target, camera.position); const dl = d.transformDirection(INV); toWalk(...snap(x, z), Math.atan2(dl.z, dl.x)); return; }
    const pts = A.walk.path(S.x, S.z, x, z); if (pts && pts.length) { S.path = pts; S.fast = fast; ctx.markDirty(); }
  }
  const snap = (x, z) => { if (A.walk.ok(x, z)) return [x, z]; const pts = A.walk.path(5.3, 4.3, x, z); return pts && pts.length ? pts[pts.length - 1] : [5.3, 4.3]; };

  /* ---------- input ---------- */
  let down = null, ring = null;
  const toLocal = (p) => A.root.worldToLocal(p.clone());
  const pickFloor = (e) => {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(A.root, true).filter((h) => h.object.visible && h.object.material !== A.MAT.glass);
    return hits.length ? toLocal(hits[0].point) : null;
  };
  const onDown = (e) => { if (mode === 'off') return; down = { x: e.clientX, y: e.clientY, t: performance.now(), yaw: S.yaw, pitch: S.pitch, id: e.pointerId }; if (mode === 'walk') canvas.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (mode !== 'walk') return;
    if (down && down.id === e.pointerId) {
      const k = TOUCH ? 0.006 : 0.0045;
      S.yaw = down.yaw - (e.clientX - down.x) * k; S.pitch = THREE.MathUtils.clamp(down.pitch + (e.clientY - down.y) * k, -1.1, 0.9);
      S.tween = null; ctx.markDirty(); if (ring) ring.visible = false; return;
    }
  };
  const onUp = (e) => {
    if (!down || mode === 'off') { down = null; return; }
    // the mouse only drives the camera (moving: W A S D / arrows, or a click on the plan);
    // on touch screens there are no keys, so a tap on the floor walks there
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (e.pointerType !== 'mouse' && moved < 10) { const p = pickFloor(e); if (p) goto(p.x, p.z); }
  };
  const onWheel = (e) => { if (mode !== 'walk') return; e.preventDefault(); setLens(THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 38, 82), 0.05); ctx.markDirty(); };
  const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr' };
  const onKey = (e) => {
    if (mode === 'off') return;
    if (e.type === 'keydown' && e.key === 'Escape') { e.preventDefault(); close(); return; }
    const k = KEYS[e.code]; if (!k || mode !== 'walk' || e.target.closest?.('input,textarea')) return;
    e.preventDefault(); if (e.type === 'keydown') S.keys.add(k); else S.keys.delete(k); ctx.markDirty();
  };
  mapEl.addEventListener('click', (e) => {
    const r = mapEl.querySelector('img').getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 990 / 90, z = ((e.clientY - r.top) / r.height) * 630 / 90;
    // quick jump: straight to the nearest free spot of the clicked point (no walking through the rooms)
    const [sx, sz] = A.walk.nearest(x, z);
    if (mode === 'walk') { S.path = null; S.tween = null; S.x = sx; S.z = sz; placeCamera(); ctx.markDirty(); } else toWalk(sx, sz, S.yaw);
  });
  ui.querySelectorAll('.kv-apt-seg button').forEach((bt) => bt.addEventListener('click', () => {
    if (bt.dataset.m === mode) return;
    if (bt.dataset.m === 'doll') toDoll(); else walkTo(A.rooms.find((r) => r.n === 5));
  }));
  $('.kv-apt-exit').addEventListener('click', () => close());

  /* ---------- per frame ---------- */
  const hook = (dt) => {
    if (mode === 'off') return false;
    let moved = false;
    if (S.tween) {
      const tw = S.tween; tw.t = Math.min(1, tw.t + dt / tw.dur); const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
      camera.position.lerpVectors(tw.p0, tw.p1, e); camera.quaternion.slerpQuaternions(tw.q0, tw.q1, e); setLens(tw.f0 + (tw.f1 - tw.f0) * e, 0.05);
      if (tw.t >= 1) { S.tween = null; placeCamera(); }
      moved = true;
    } else if (mode === 'walk') {
      const sp = 1.5 * dt; let mx = 0, mz = 0;
      const fx = Math.cos(S.yaw), fz = Math.sin(S.yaw);
      if (S.keys.has('f')) { mx += fx; mz += fz; } if (S.keys.has('b')) { mx -= fx; mz -= fz; }
      if (S.keys.has('r')) { mx -= fz; mz += fx; } if (S.keys.has('l')) { mx += fz; mz -= fx; }
      if (S.keys.has('tl')) { S.yaw -= 1.6 * dt; moved = true; } if (S.keys.has('tr')) { S.yaw += 1.6 * dt; moved = true; }
      if (mx || mz) {
        S.path = null; const l = Math.hypot(mx, mz), nx = S.x + (mx / l) * sp, nz = S.z + (mz / l) * sp;
        if (A.walk.ok(nx, nz)) { S.x = nx; S.z = nz; } else if (A.walk.ok(nx, S.z)) S.x = nx; else if (A.walk.ok(S.x, nz)) S.z = nz;
        moved = true;
      }
      if (S.path) {
        const [tx, tz] = S.path[0], dx = tx - S.x, dz = tz - S.z, d = Math.hypot(dx, dz), st = Math.min(d, (S.fast ? 4.5 : 1.6) * dt);
        if (d < 0.02) { S.path.shift(); if (!S.path.length) S.path = null; }
        else {
          S.x += (dx / d) * st; S.z += (dz / d) * st;
          // turn gently towards the way we walk when the target lies well to the side
          let da = Math.atan2(dz, dx) - S.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 0.5 && d > 0.6) S.yaw += da * Math.min(1, dt * 2.2);
        }
        moved = true;
      }
      if (moved) placeCamera();
      const r = A.roomAt(S.x, S.z);
      if (r !== roomNow) { roomNow = r; roomEl.hidden = !r; if (r) roomEl.innerHTML = `<i>${r.n}</i>${r.name}<small>${r.a} m²</small>`; }
    }
    // labels and the "you are here" marker
    const w = stage.clientWidth, h = stage.clientHeight, showL = mode === 'doll' && !S.tween;
    labels.forEach((L) => {
      if (!showL) { L.el.style.display = 'none'; return; }
      tmpV.copy(L.pos).project(camera); const x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * h;
      L.el.style.display = tmpV.z > 1 ? 'none' : ''; L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    });
    let lx = S.x, lz = S.z, la = S.yaw;
    if (mode === 'doll' || S.tween) { const pl = toLocal(camera.position); const tl = toLocal(controls.target); lx = mode === 'doll' ? tl.x : pl.x; lz = mode === 'doll' ? tl.z : pl.z; camera.getWorldDirection(tmpV); tmpV.transformDirection(INV); la = Math.atan2(tmpV.z, tmpV.x); }
    meEl.style.left = `${(lx * 90 / 990) * 100}%`; meEl.style.top = `${(lz * 90 / 630) * 100}%`; meEl.style.setProperty('--a', `${la}rad`);
    meEl.classList.toggle('is-doll', mode === 'doll');
    return moved;
  };

  /* ---------- open / close ---------- */
  function open() {
    if (mode !== 'off') return;
    saved = { lockFov: camera.userData.lockFov, fov: camera.fov, near: camera.near, bg: null, fog: null };
    camera.userData.lockFov = camera.userData.lockNear = true;
    root.classList.add('is-apt'); ui.hidden = false; A.root.visible = true; renderer.localClippingEnabled = true;
    if (!ring) {
      ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 4; A.root.add(ring);
    }
    // sun from the side the flat's windows face (south-east), shadows fitted to the flat
    // a low morning sun from the south-east, so its patches reach well into the rooms
    const sd = new THREE.Vector3().addScaledVector(V, 0.82).addScaledVector(U, 0.5).setY(0.4).normalize();
    look.setSunOverride({ dir: sd, target: A.root.localToWorld(CENTER.clone()), extent: 10 });
    look.setNight(ctx.getNight()); A.setNight(ctx.getNight());
    ctx.nightHooks.add(A.setNight); ctx.frameHooks.add(hook);
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false }); window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    toDoll();
  }
  function close() {
    if (mode === 'off') return;
    mode = 'off'; S.keys.clear(); S.path = null; S.tween = null;
    showQuarter(true); hidden.splice(0).forEach((o) => { o.visible = true; });
    A.setCut(false); clipModel(false); look.aoOn = true; look.setAOInterior(false); A.root.visible = false; ui.hidden = true; root.classList.remove('is-apt');
    look.setSunOverride(null); look.setBoost(0); look.setNight(ctx.getNight());
    ctx.nightHooks.delete(A.setNight); ctx.frameHooks.delete(hook);
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    canvas.style.cursor = '';
    camera.userData.lockFov = camera.userData.lockNear = false; setLens(saved.fov, 2);
    controls.enabled = true; controls.enableRotate = true;
    ctx.setFree(false);
  }
  return { open, close, A, get mode() { return mode; }, _dbg: { S, goto, pickFloor } };
}
