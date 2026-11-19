/* Blue Danube Promenade — apartment L5-5 (Lamela 5, 1st floor, 49.37 m²) built from the sales plan.
   Units: plan pixels of the 1080-px sales card (crop origin 50,720), 90 px = 1 m. Local frame: x → along the plan,
   z → down the plan, y up; floor at y = 0, ceiling 2.8 m. Walls come from the plan's dark wall fill (0.05 m grid). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PX = 90, H = 2.8, CELL = 0.05;
const m = (v) => v / PX;

// wall fill as 0.05 m cells [i0, j0, i1, j1)
const WALLS = [[9,3,42,13],[42,4,43,13],[43,5,111,11],[111,6,194,10],[111,10,112,11],[141,10,144,41],[190,10,194,63],[43,11,50,12],[43,12,49,25],[43,25,46,26],[141,41,143,62],[160,41,161,50],[161,42,162,50],[143,43,144,62],[159,44,160,49],[162,47,190,50],[37,56,49,62],[49,59,50,62],[50,60,109,62],[127,60,141,62],[190,83,196,89],[196,85,213,91],[125,88,128,97],[147,89,172,91],[191,89,196,91],[172,90,173,133],[171,91,172,133],[173,91,174,133],[209,91,213,133],[5,108,11,133],[205,112,209,133],[125,115,128,133],[11,125,12,133],[12,126,111,133],[174,127,205,133],[111,128,112,133],[112,129,125,133],[128,129,171,133]];

// openings in the wall line (plan px box of the gap). k: glass = glazing, door = hinged door, slide = sliding door, rail = loggia balustrade
const OPEN = [
  { id: 'liv-win', k: 'glass', b: [22, 262, 50, 487], sill: 0, head: 2.5, transom: 0.5, ext: true },
  { id: 'liv-ter', k: 'glass', b: [22, 252, 167, 280], sill: 0, head: 2.5, door: true },
  { id: 'bed-ter', k: 'glass', b: [195, 112, 222, 252], sill: 0, head: 2.5, door: true },
  { id: 'ter-rail', k: 'rail', b: [38, 58, 46, 252], ext: true },
  { id: 'entry', k: 'door', b: [855, 280, 875, 380], head: 2.1, hinge: [866, 372], tip: [826, 302], front: true },
  { id: 'bath', k: 'door', b: [648, 196, 715, 222], head: 2.1, hinge: [651, 205], tip: [705, 160] },
  { id: 'bed', k: 'door', b: [490, 268, 572, 282], head: 2.1, hinge: [493, 275], tip: [555, 312] },
  { id: 'kit', k: 'slide', b: [576, 397, 660, 410], head: 2.1, leaf: [578, 622] },
  { id: 'gard', k: 'slide', b: [777, 397, 858, 410], head: 2.1, leaf: [812, 856] },
  { id: 'kit-glass', k: 'glass', b: [562, 437, 576, 517], sill: 0.9, head: 2.1 },
];

// floors (plan px rects)
const FLOORS = [
  ['parquet', 220, 50, 642, 272], ['parquet', 46, 278, 566, 568], ['parquet', 490, 268, 860, 400], ['parquet', 645, 210, 860, 282],
  ['parquet', 775, 400, 925, 570], ['parquet', 852, 280, 875, 380],
  ['tile', 645, 45, 858, 212], ['tile', 572, 405, 776, 572],
  ['terrace', 40, 56, 200, 256],
];

export const ROOMS = [
  { n: 1, sr: 'Predsoblje', ru: 'Прихожая', a: '2,93', r: [650, 280, 855, 397], at: [790, 340], view: [[800, 330], [600, 340]] },
  { n: 2, sr: 'Kupatilo', ru: 'Ванная', a: '3,78', r: [648, 47, 855, 212], at: [700, 130], view: [[772, 128], [655, 72]], pitch: -0.22 },
  { n: 3, sr: 'Garderoba', ru: 'Гардеробная', a: '2,91', r: [780, 410, 920, 568], at: [830, 470], view: [[820, 440], [900, 520]] },
  { n: 4, sr: 'Kuhinja', ru: 'Кухня', a: '4,08', r: [576, 410, 770, 568], at: [640, 470], view: [[612, 372], [730, 545]], pitch: -0.28 },
  { n: 5, sr: 'Dnevna soba', ru: 'Гостиная', a: '20,94', r: [46, 280, 566, 568], at: [330, 420], view: [[470, 380], [60, 400]] },
  { n: 6, sr: 'Spavaća soba', ru: 'Спальня', a: '11,14', r: [220, 50, 642, 270], at: [420, 245], view: [[560, 225], [230, 160]] },
  { n: 7, sr: 'Terasa', ru: 'Терраса', a: '3,57', r: [44, 58, 195, 252], at: [115, 225], view: [[160, 230], [40, 120]] },
];
// the hall also covers the open strip between living room and entrance
const HALL_EXTRA = [500, 270, 650, 400];

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, repeatM) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; t.userData.m = repeatM; return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
function parquetTex() {
  // 4 × 4 m of oak planks 1.2 × 0.19 m, staggered, each plank its own tone and grain
  return canvasTex(2048, 2048, (g, W) => {
    const k = W / 4, ph = 0.19 * k, pl = 1.2 * k;
    for (let row = 0; row * ph < W; row++) {
      const off = (rnd() * pl) | 0;
      for (let x = -off; x < W; x += pl) {
        const t = rnd(), r = 214 + (t - 0.5) * 26, gg = 176 + (t - 0.5) * 24, b = 130 + (t - 0.5) * 22;
        g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(x, row * ph, pl, ph);
        // grain
        for (let i = 0; i < 26; i++) {
          const y = row * ph + rnd() * ph, a = 0.03 + rnd() * 0.06, dark = rnd() < 0.6;
          g.strokeStyle = dark ? `rgba(110,70,35,${a})` : `rgba(255,235,200,${a})`; g.lineWidth = 0.6 + rnd() * 1.6;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 1; s <= 8; s++) g.lineTo(x + (pl * s) / 8, y + Math.sin(s * 1.3 + i) * (0.6 + rnd() * 1.4));
          g.stroke();
        }
        if (rnd() < 0.35) { g.fillStyle = 'rgba(120,80,40,0.10)'; g.beginPath(); g.ellipse(x + rnd() * pl, row * ph + ph / 2, 6 + rnd() * 8, 2 + rnd() * 2, 0, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(x, row * ph, 1.5, ph);
      }
      g.fillStyle = 'rgba(90,60,30,0.30)'; g.fillRect(0, row * ph, W, 1.5);
    }
  }, 4);
}
function tileTex(base, grout, sizeM, spanM, jitter = 10) {
  return canvasTex(1024, 1024, (g, W) => {
    const n = Math.round(spanM / sizeM), s = W / n;
    g.fillStyle = grout; g.fillRect(0, 0, W, W);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const t = (rnd() - 0.5) * jitter; const [r, gg, b] = base;
      g.fillStyle = `rgb(${(r + t) | 0},${(gg + t) | 0},${(b + t) | 0})`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      for (let q = 0; q < 40; q++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '120,110,100'},0.05)`; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 2 + rnd() * 10, 1 + rnd() * 3); }
    }
  }, spanM);
}

/* ---------- geometry helpers ---------- */
function rbox(w, h, d, r = 0.04) {
  // rounded in plan and softly bevelled: reads as upholstery / solid wood rather than a crate
  r = Math.min(r, w / 2 - 0.005, d / 2 - 0.005);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y); s.lineTo(x + W + r, y + D);
  s.quadraticCurveTo(x + W + r, y + D + r, x + W, y + D + r); s.lineTo(x, y + D + r); s.quadraticCurveTo(x - r, y + D + r, x - r, y + D);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const bv = Math.min(r * 0.6, h / 3);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * 0.8, bevelSegments: 3, curveSegments: 5 });
  g.rotateX(-Math.PI / 2); g.translate(0, bv, 0); g.computeVertexNormals();
  return g; // base at y = 0, centred in x/z
}
const box = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; };
const cyl = (r0, r1, h, seg = 28) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(0, h / 2, 0); return g; };

export function buildApartment({ lang = 'sr', HQ = true } = {}) {
  const root = new THREE.Group(); root.name = 'apt-l55';
  const parts = new Map(); // material key → [geometries]
  const add = (key, geo, x, y, z, ry = 0) => {
    const g = geo.clone(); if (ry) g.rotateY(ry); g.translate(x, y, z);
    if (!parts.has(key)) parts.set(key, []); parts.get(key).push(g);
  };

  /* materials */
  const parq = parquetTex(), tile = tileTex([218, 210, 197], '#b9b0a3', 0.6, 2.4, 8), ktile = tileTex([214, 204, 186], '#bdb3a4', 0.6, 2.4, 8), ttile = tileTex([226, 214, 194], '#c3b7a3', 0.6, 2.4, 10);
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75 }, o));
  const MAT = {
    wall: std({ color: 0xe4ddd2, roughness: 0.92 }), skirt: std({ color: 0xdcd5ca, roughness: 0.6 }),
    wtile: null, splash: null, wallTop: std({ color: 0x2c2f35, roughness: 0.9 }),
    ceil: std({ color: 0xf7f5f1, roughness: 0.95 }), slab: std({ color: 0x8c8a86, roughness: 0.95 }),
    parquet: std({ map: parq, roughness: 0.55 }), tile: std({ map: tile, roughness: 0.35 }), ktile: std({ map: ktile, roughness: 0.4 }), terrace: std({ map: ttile, roughness: 0.8 }),
    frame: std({ color: 0x3a3d42, roughness: 0.45, metalness: 0.4 }), glass: new THREE.MeshPhysicalMaterial({ color: 0xe6eef2, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, depthWrite: false }),
    door: std({ color: 0xf1eee8, roughness: 0.5 }), handle: std({ color: 0xb8b8b6, roughness: 0.3, metalness: 0.9 }),
    walnut: std({ color: 0x86634a, roughness: 0.55 }), oak: std({ color: 0xc9a77e, roughness: 0.6 }), oakL: std({ color: 0xd8c1a0, roughness: 0.6 }),
    sofa: std({ color: 0xddd5c8, roughness: 0.95 }), arm: std({ color: 0x9fb7d0, roughness: 0.95 }), navy: std({ color: 0x34507a, roughness: 0.9 }), navyD: std({ color: 0x23334f, roughness: 0.9 }),
    linen: std({ color: 0xf2f0ec, roughness: 0.95 }), blanket: std({ color: 0x4e6d97, roughness: 0.95 }),
    white: std({ color: 0xf4f4f2, roughness: 0.3 }), ceramic: std({ color: 0xfafafa, roughness: 0.15 }), chrome: std({ color: 0xcfd2d4, roughness: 0.15, metalness: 1 }),
    black: std({ color: 0x1b1c1f, roughness: 0.25 }), screen: std({ color: 0x0d0f12, roughness: 0.1, metalness: 0.2 }), counter: std({ color: 0x8f8b85, roughness: 0.35 }), front: std({ color: 0xf0ede8, roughness: 0.45 }), steel: std({ color: 0xb9bcbf, roughness: 0.3, metalness: 0.8 }),
    teak: std({ color: 0xa8774c, roughness: 0.7 }), cushion: std({ color: 0xd9e3ec, roughness: 0.95 }), shade: std({ color: 0xf3ead9, roughness: 0.9, emissive: 0xffc98a, emissiveIntensity: 0 }),
    tall: std({ color: 0xc9a77e, roughness: 0.6, side: THREE.DoubleSide }), tallW: std({ color: 0xf4f4f2, roughness: 0.3, side: THREE.DoubleSide }),
    tv: std({ color: 0x0d0f12, roughness: 0.1, metalness: 0.2 }), mirror: std({ color: 0xdfe6ea, roughness: 0.02, metalness: 1 }), upper: std({ color: 0xf4f4f2, roughness: 0.3 }),
    leaf: std({ color: 0x4f7a45, roughness: 0.8 }), pot: std({ color: 0xd9d4cb, roughness: 0.8 }), rug: std({ color: 0xcfc6b8, roughness: 1 }),
  };
  MAT.wtile = std({ map: tileTex([226, 221, 212], '#c9c1b5', 0.3, 1.2, 6), roughness: 0.25 }); MAT.wtile.map.repeat.set(1, 1);
  MAT.splash = std({ map: tileTex([233, 230, 224], '#cfc8bd', 0.2, 1.2, 5), roughness: 0.2 });
  for (const k of ['parquet', 'tile', 'ktile', 'terrace', 'wtile', 'splash']) MAT[k].userData.uvM = MAT[k].map.userData.m;

  /* walls: white sides, dark caps so the cut-away reads like the plan's wall poché */
  const wallMats = [MAT.wall, MAT.wall, MAT.wallTop, MAT.wall, MAT.wall, MAT.wall];
  const walls = new THREE.Group(), wallsLow = new THREE.Group(); root.add(walls, wallsLow); wallsLow.visible = false;
  const CUT = 1.25; // cut-away height: low enough to see into every room from above
  const wallBox = (x0, z0, x1, z1, y0 = 0, y1 = H) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); const me = new THREE.Mesh(g, wallMats);
    me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = me.receiveShadow = true; walls.add(me);
    if (y0 === 0) add('skirt', box(x1 - x0 + 0.024, 0.08, z1 - z0 + 0.024), (x0 + x1) / 2, 0, (z0 + z1) / 2);
    if (y0 < CUT) { const lo = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, Math.min(y1, CUT) - y0, z1 - z0), wallMats); lo.position.set((x0 + x1) / 2, (y0 + Math.min(y1, CUT)) / 2, (z0 + z1) / 2); lo.castShadow = lo.receiveShadow = true; wallsLow.add(lo); }
    return me;
  };
  for (const [i0, j0, i1, j1] of WALLS) wallBox(i0 * CELL, j0 * CELL, i1 * CELL, j1 * CELL);

  /* openings: lintels, sills, frames, glass, doors */
  const glassMeshes = [];
  for (const o of OPEN) {
    const [x0, z0, x1, z1] = o.b.map(m), horiz = x1 - x0 > z1 - z0;
    const len = horiz ? x1 - x0 : z1 - z0, th = horiz ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const head = o.head ?? 2.5, sill = o.sill ?? 0;
    if (o.k !== 'rail' && head < H) wallBox(x0, z0, x1, z1, head, H);
    if (sill > 0) wallBox(x0, z0, x1, z1, 0, sill);
    const along = (geo, a, y, t = 0) => add(geo.key, geo.g, horiz ? x0 + a : cx + t, y, horiz ? cz + t : z0 + a, horiz ? 0 : Math.PI / 2);
    const fbar = (L, h, d) => ({ key: 'frame', g: box(L, h, d) });
    if (o.k === 'glass') {
      const ft = 0.06, fd = Math.min(th, 0.12);
      // perimeter frame
      add('frame', box(len, ft, fd), cx, sill, cz, horiz ? 0 : Math.PI / 2);
      add('frame', box(len, ft, fd), cx, head - ft, cz, horiz ? 0 : Math.PI / 2);
      along(fbar(ft, head - sill, fd), ft / 2, sill); along(fbar(ft, head - sill, fd), len - ft / 2, sill);
      const panes = Math.max(1, Math.round(len / 1.15));
      for (let i = 1; i < panes; i++) along(fbar(0.05, head - sill, fd), (len * i) / panes, sill);
      if (o.transom) add('frame', box(len, 0.05, fd), cx, o.transom, cz, horiz ? 0 : Math.PI / 2);
      if (o.door) along({ key: 'handle', g: box(0.02, 0.28, 0.06) }, len / panes - 0.1, 1.0);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, head - sill), MAT.glass);
      gl.position.set(cx, (head + sill) / 2, cz); gl.rotation.y = horiz ? 0 : Math.PI / 2; gl.renderOrder = 3; root.add(gl); glassMeshes.push(gl);
    } else if (o.k === 'rail') {
      add('frame', box(len, 0.05, 0.06), cx, 1.02, cz, horiz ? 0 : Math.PI / 2);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.95), MAT.glass); gl.position.set(cx, 0.52, cz); gl.rotation.y = horiz ? 0 : Math.PI / 2; root.add(gl); glassMeshes.push(gl);
    } else if (o.k === 'door') {
      // frame (casing) and an open leaf at the angle drawn on the plan
      const ct = 0.05;
      along({ key: 'door', g: box(ct, head, th + 0.02) }, ct / 2, 0); along({ key: 'door', g: box(ct, head, th + 0.02) }, len - ct / 2, 0);
      add('door', box(len, ct, th + 0.02), cx, head - ct, cz, horiz ? 0 : Math.PI / 2);
      const [hx, hz] = o.hinge.map(m), [tx, tz] = o.tip.map(m), ll = Math.min(Math.hypot(tx - hx, tz - hz), len - 0.06);
      const leaf = new THREE.Group(); leaf.position.set(hx, 0, hz); leaf.rotation.y = -Math.atan2(tz - hz, tx - hx);
      const lg = new THREE.Mesh(box(ll, head - 0.03, 0.04), MAT.door); lg.position.x = ll / 2; lg.castShadow = lg.receiveShadow = true; leaf.add(lg);
      const hd = new THREE.Mesh(box(0.14, 0.02, 0.06), MAT.handle); hd.position.set(ll - 0.08, 1.02, 0); leaf.add(hd);
      root.add(leaf);
    } else if (o.k === 'slide') {
      const [l0, l1] = o.leaf.map(m), w = l1 - l0;
      const leaf = new THREE.Mesh(box(w, head - 0.02, 0.035), MAT.door); leaf.castShadow = true;
      leaf.position.set(horiz ? (l0 + l1) / 2 : cx + th / 2 + 0.03, 0, horiz ? cz + th / 2 + 0.03 : (l0 + l1) / 2); leaf.rotation.y = horiz ? 0 : Math.PI / 2; root.add(leaf);
      add('frame', box(len, 0.04, 0.05), cx, head + 0.01, horiz ? cz + th / 2 + 0.03 : cz, horiz ? 0 : Math.PI / 2);
    }
  }

  /* floors, slab, ceiling */
  const floorMeshes = [];
  const plane = (x0, z0, x1, z1, y, mat, up = true) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const uv = g.attributes.uv, p = g.attributes.position, s = mat.userData.uvM || 1;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / s, -p.getZ(i) / s);
    const me = new THREE.Mesh(g, mat); me.receiveShadow = true; root.add(me); return me;
  };
  const MATK = { parquet: MAT.parquet, tile: MAT.tile, terrace: MAT.terrace };
  FLOORS.forEach(([k, a, b, c, d], i) => {
    const mat = k === 'tile' && b > 300 ? MAT.ktile : MATK[k];
    floorMeshes.push(plane(m(a), m(b), m(c), m(d), (k === 'parquet' ? 0.004 : 0.006) + i * 0.0002 - (k === 'terrace' ? 0.04 : 0), mat));
  });
  // slab under everything, and the ceiling (hidden in the cut-away view)
  const slab = new THREE.Group(), ceiling = new THREE.Group(); root.add(slab, ceiling);
  const allRects = FLOORS.map(([, a, b, c, d]) => [m(a), m(b), m(c), m(d)]).concat(WALLS.map(([a, b, c, d]) => [a * CELL, b * CELL, c * CELL, d * CELL]));
  for (const [x0, z0, x1, z1] of allRects) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.25, z1 - z0), MAT.slab); s.position.set((x0 + x1) / 2, -0.125, (z0 + z1) / 2); s.receiveShadow = true; slab.add(s);
  }
  for (const [x0, z0, x1, z1] of allRects.slice(0, FLOORS.length)) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.2, z1 - z0), MAT.ceil); c.position.set((x0 + x1) / 2, H + 0.1, (z0 + z1) / 2); c.castShadow = c.receiveShadow = true; ceiling.add(c);
  }

  /* wall finishes: bathroom tiled to 2.1 m, kitchen splashback */
  const lining = (key, ax, a0, a1, c, y0, y1, face) => { // ax 'x': plane along x at z = c, facing ±z; 'z': along z at x = c
    const L = m(a1) - m(a0), g = new THREE.PlaneGeometry(L, y1 - y0);
    if (ax === 'z') g.rotateY(face > 0 ? Math.PI / 2 : -Math.PI / 2); else if (face < 0) g.rotateY(Math.PI);
    const uv = g.attributes.uv, s = MAT[key].userData.uvM;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * L) / s, (y0 + uv.getY(i) * (y1 - y0)) / s);
    const me = new THREE.Mesh(g, MAT[key]); me.receiveShadow = true;
    me.position.set(ax === 'x' ? m((a0 + a1) / 2) : m(c) + face * 0.006, (y0 + y1) / 2, ax === 'x' ? m(c) + face * 0.006 : m((a0 + a1) / 2)); root.add(me);
  };
  lining('wtile', 'x', 650, 855, 47, 0, 2.1, 1); lining('wtile', 'z', 47, 210, 855, 0, 2.1, -1); lining('wtile', 'z', 47, 196, 650, 0, 2.1, 1);
  lining('wtile', 'x', 715, 855, 211, 0, 2.1, -1);
  lining('splash', 'x', 630, 770, 578, 0.9, 1.5, -1); lining('splash', 'z', 410, 578, 770, 0.9, 1.5, -1);

  /* furniture, placed from the plan (px centre / size) */
  const P = (x, z) => [m(x), m(z)];
  const at = (key, geo, x, z, y = 0, ry = 0) => { const [X, Z] = P(x, z); add(key, geo, X, y, Z, ry); };
  // — living room —
  at('walnut', rbox(m(188), 0.42, m(30), 0.06), 266, 302);                       // TV console
  at('tv', box(1.32, 0.76, 0.04), 266, 288, 1.0);                                   // wall TV
  at('tv', box(1.36, 0.8, 0.02), 266, 286.5, 0.98);
  at('arm', rbox(0.78, 0.42, 0.78, 0.12), 95, 425);                                 // armchair: seat
  at('arm', rbox(0.18, 0.72, 0.78, 0.08), 66, 425); at('arm', rbox(0.78, 0.6, 0.16, 0.07), 95, 395); at('arm', rbox(0.78, 0.6, 0.16, 0.07), 95, 455);
  at('linen', rbox(0.34, 0.3, 0.12, 0.05), 98, 425, 0.42, 0.5);
  at('walnut', rbox(m(90), 0.4, m(68), 0.02), 245, 426);                          // coffee table
  at('rug', box(2.3, 0.01, 1.6), 236, 445, 0.005);
  at('sofa', rbox(m(208), 0.44, m(70), 0.08), 241, 527);                           // sofa
  at('sofa', rbox(m(208), 0.82, 0.2, 0.08), 241, 553); at('sofa', rbox(0.2, 0.62, m(70), 0.07), 147, 527); at('sofa', rbox(0.2, 0.62, m(70), 0.07), 335, 527);
  at('navy', rbox(0.42, 0.4, 0.13, 0.05), 175, 535, 0.44, 0.2); at('linen', rbox(0.38, 0.36, 0.12, 0.05), 185, 530, 0.44, -0.25);
  at('navyD', rbox(0.44, 0.42, 0.13, 0.05), 300, 535, 0.44, -0.2); at('navy', rbox(0.4, 0.38, 0.12, 0.05), 288, 530, 0.44, 0.3);
  for (const x of [111, 368]) { at('walnut', rbox(m(47), 0.55, m(47), 0.02), x, 538); at('chrome', cyl(0.02, 0.02, 0.32), x, 538, 0.55); at('shade', cyl(0.13, 0.17, 0.24), x, 538, 0.84); }
  // dining: square top turned 45°, four chairs on the diagonals
  at('oakL', box(0.82, 0.04, 0.82), 484, 495, 0.73, Math.PI / 4); at('oak', cyl(0.05, 0.05, 0.73, 12), 484, 495); at('oak', box(0.5, 0.03, 0.5), 484, 495, 0, Math.PI / 4);
  at('ceramic', cyl(0.13, 0.09, 0.12), 484, 495, 0.77);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2 + Math.PI / 4, cxp = 484 + Math.cos(a) * 0.62 * PX, czp = 495 + Math.sin(a) * 0.62 * PX;
    at('navy', rbox(0.44, 0.08, 0.44, 0.06), cxp, czp, 0.42, -a); at('oak', box(0.04, 0.42, 0.04), cxp, czp, 0, -a);
    const bx = cxp + Math.cos(a) * 0.2 * PX, bz = czp + Math.sin(a) * 0.2 * PX;
    at('oak', rbox(0.44, 0.36, 0.05, 0.02), bx, bz, 0.5, -a + Math.PI / 2);
  }
  at('pot', cyl(0.16, 0.13, 0.4), 70, 300); at('leaf', new THREE.IcosahedronGeometry(0.42, 1), 70, 300, 0.85);   // a plant by the glazing
  // — bedroom —
  at('oak', rbox(m(143), 0.32, m(178), 0.03), 416, 139);                           // bed frame
  at('linen', rbox(m(136), 0.22, m(170), 0.06), 416, 141, 0.3);                   // mattress
  at('blanket', rbox(m(140), 0.06, m(102), 0.05), 416, 175, 0.48);
  at('linen', rbox(0.62, 0.16, 0.38, 0.08), 389, 72, 0.5); at('linen', rbox(0.62, 0.16, 0.38, 0.08), 444, 72, 0.5);
  at('oak', rbox(m(143), 1.0, 0.08, 0.03), 416, 53);                               // headboard
  for (const x of [322, 508]) { at('oak', rbox(m(38), 0.48, m(32), 0.02), x, 66); at('shade', cyl(0.11, 0.13, 0.2), x, 66, 0.62); at('chrome', cyl(0.015, 0.015, 0.14), x, 66, 0.48); }
  at('oakL', box(m(75), 0.03, m(57)), 260, 78, 0.73); at('oakL', box(0.04, 0.73, m(55)), 225, 78); at('oakL', box(0.04, 0.73, m(55)), 295, 78);   // desk
  at('screen', box(0.5, 0.3, 0.02), 255, 60, 0.95); at('frame', box(0.06, 0.2, 0.02), 255, 62, 0.76);
  at('navy', rbox(0.46, 0.08, 0.44, 0.08), 258, 124, 0.45); at('navy', rbox(0.44, 0.42, 0.06, 0.04), 258, 142, 0.52); at('frame', cyl(0.03, 0.03, 0.45, 10), 258, 124);
  at('tall', box(m(55), 2.4, m(128)), 608, 111);                                    // wardrobe
  at('frame', box(0.015, 2.36, m(126)), 583, 111, 0.02);
  // — bathroom —
  at('white', box(m(52), 0.5, m(38)), 685, 66, 0.35); at('ceramic', rbox(0.5, 0.12, 0.38, 0.08), 685, 66, 0.85); at('chrome', cyl(0.015, 0.015, 0.2), 685, 52, 0.95);
  at('mirror', box(0.9, 0.7, 0.02), 685, 48, 1.2);                                 // mirror
  at('white', box(m(55), 0.85, m(36)), 757, 65); at('frame', cyl(0.16, 0.16, 0.02, 24).rotateX(Math.PI / 2), 757, 83, 0.42);
  at('ceramic', rbox(m(68), 0.56, m(150), 0.06), 821, 127);                         // bathtub
  at('tile', box(m(60), 0.02, m(138)), 821, 127, 0.5);
  at('chrome', cyl(0.02, 0.02, 1.4), 845, 58, 0.6);
  at('ceramic', rbox(0.36, 0.4, 0.52, 0.16), 752, 168);                            // WC
  at('white', box(m(58), 1.1, m(20)), 756, 200);                                    // installation
  // — hall —
  at('tall', box(m(128), 2.4, m(53)), 791, 248); at('frame', box(m(126), 2.36, 0.015), 791, 222, 0.02);
  at('mirror', box(0.02, 0.7, 0.6), 853, 330, 1.2);                                  // mirror by the door
  // — kitchen —
  at('tallW', box(m(55), 2.05, m(56)), 602, 550);                                   // fridge
  at('front', box(m(140), 0.76, m(56)), 700, 550, 0.1); at('black', box(m(138), 0.1, m(50)), 700, 553); at('counter', box(m(142), 0.04, m(60)), 700, 549, 0.86);
  at('front', box(m(53), 0.76, m(112)), 743, 466, 0.1); at('black', box(m(48), 0.1, m(112)), 746, 466); at('counter', box(m(57), 0.04, m(114)), 742, 466, 0.86);
  for (const x of [655, 700, 745]) at('black', box(0.008, 0.72, 0.012), x, 522, 0.12);           // front joints
  for (const z of [430, 466, 502]) at('black', box(0.012, 0.72, 0.008), 716, z, 0.12);
  at('chrome', box(0.55, 0.02, 0.42), 683, 549, 0.9); at('chrome', cyl(0.015, 0.015, 0.3), 683, 568, 0.9);
  at('black', box(0.5, 0.01, 0.56), 749, 484, 0.9);
  at('upper', box(m(140), 0.7, m(36)), 700, 560, 1.5); at('upper', box(m(36), 0.7, m(112)), 752, 466, 1.5);
  at('steel', box(0.6, 0.12, 0.42), 747, 484, 1.42);
  // — wardrobe room —
  at('tall', box(m(47), 2.2, m(155)), 913, 489); at('tall', box(m(108), 2.2, m(45)), 836, 545);
  // — terrace —
  at('teak', box(0.78, 0.04, 0.78), 115, 150, 0.72, Math.PI / 4); at('frame', cyl(0.03, 0.03, 0.72, 10), 115, 150);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, cxp = 115 + Math.cos(a) * 0.55 * PX, czp = 150 + Math.sin(a) * 0.55 * PX;
    at('teak', box(0.44, 0.05, 0.44), cxp, czp, 0.42, -a); at('cushion', rbox(0.4, 0.05, 0.4, 0.05), cxp, czp, 0.47, -a);
    at('frame', box(0.03, 0.42, 0.03), cxp, czp, 0, -a);
  }
  at('white', box(m(78), 0.42, m(35)), 116, 77); at('cushion', rbox(m(74), 0.08, m(32), 0.05), 116, 77, 0.42);

  for (const [key, gs] of parts) {
    const geo = mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }));
    const me = new THREE.Mesh(geo, MAT[key] || MAT.white); me.castShadow = me.receiveShadow = true; me.name = 'f-' + key; root.add(me);
  }

  /* walkable grid (0.1 m): floor rects minus walls, furniture and glass, grown by the body radius */
  const G = 0.1, gx0 = 0, gz0 = 0, GW = Math.ceil(11 / G), GH = Math.ceil(7 / G);
  const free = new Uint8Array(GW * GH);
  const mark = (x0, z0, x1, z1, v) => { for (let j = Math.max(0, Math.floor(z0 / G)); j < Math.min(GH, Math.ceil(z1 / G)); j++) for (let i = Math.max(0, Math.floor(x0 / G)); i < Math.min(GW, Math.ceil(x1 / G)); i++) free[j * GW + i] = v; };
  FLOORS.forEach(([, a, b, c, d]) => mark(m(a), m(b), m(c), m(d), 1));
  const R = 0.17, block = (x0, z0, x1, z1) => mark(x0 - R, z0 - R, x1 + R, z1 + R, 0);
  WALLS.forEach(([a, b, c, d]) => block(a * CELL, b * CELL, c * CELL, d * CELL));
  OPEN.filter((o) => o.k === 'glass' && !o.door || o.k === 'rail' || o.front).forEach((o) => { const [a, b, c, d] = o.b.map(m); block(a, b, c, d); });
  // solid furniture footprints (px)
  [[172, 287, 360, 317], [60, 390, 130, 460], [137, 492, 345, 562], [88, 515, 135, 562], [345, 515, 392, 562], [345, 50, 488, 228], [302, 50, 342, 82], [490, 50, 527, 82],
   [222, 50, 297, 107], [580, 47, 635, 175], [660, 47, 710, 85], [730, 47, 785, 82], [787, 52, 855, 202], [727, 145, 785, 210], [727, 222, 855, 275],
   [575, 522, 770, 578], [717, 410, 770, 522], [890, 410, 937, 567], [782, 522, 890, 567], [77, 60, 155, 95], [210, 400, 280, 450], [452, 463, 516, 527], [83, 118, 147, 182], [52, 282, 90, 318]]
    .forEach(([a, b, c, d]) => block(m(a), m(b), m(c), m(d)));
  const walk = {
    G, GW, GH, free,
    nearest(x, z) {
      let best = null, bd = 1e9;
      for (let k = 0; k < free.length; k++) if (free[k]) { const cx = (k % GW + 0.5) * G, cz = (((k / GW) | 0) + 0.5) * G, d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = [cx, cz]; } }
      return best || [x, z];
    },
    ok(x, z) { const i = Math.floor(x / G), j = Math.floor(z / G); return i >= 0 && j >= 0 && i < GW && j < GH && free[j * GW + i] === 1; },
    path(ax, az, bx, bz) {
      // BFS on the grid, then drop the waypoints a straight line can skip
      const s = Math.floor(az / G) * GW + Math.floor(ax / G); let t = Math.floor(bz / G) * GW + Math.floor(bx / G);
      if (!free[t]) { // snap the goal to the nearest free cell
        let best = -1, bd = 1e9; for (let k = 0; k < free.length; k++) if (free[k]) { const d = (k % GW - (t % GW)) ** 2 + ((k / GW | 0) - (t / GW | 0)) ** 2; if (d < bd) { bd = d; best = k; } }
        if (best < 0) return null; t = best;
      }
      const prev = new Int32Array(free.length).fill(-1); prev[s] = s; const q = [s]; let h = 0;
      while (h < q.length) { const c = q[h++]; if (c === t) break; const ci = c % GW, cj = (c / GW) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue; const n = nj * GW + ni; if (!free[n] || prev[n] >= 0) continue; if (di && dj && (!free[cj * GW + ni] || !free[nj * GW + ci])) continue; prev[n] = c; q.push(n); } }
      if (prev[t] < 0) return null;
      const cells = []; for (let c = t; c !== s; c = prev[c]) cells.push(c); cells.reverse();
      const pts = cells.map((c) => [(c % GW + 0.5) * G, (((c / GW) | 0) + 0.5) * G]);
      const clear = (p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / (G / 2)); for (let i = 0; i <= n; i++) if (!this.ok(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n)) return false; return true; };
      const out = []; let cur = [ax, az];
      for (let i = 0; i < pts.length; i++) { if (i === pts.length - 1 || !clear(cur, pts[i + 1])) { out.push(pts[i]); cur = pts[i]; } }
      if (free[Math.floor(bz / G) * GW + Math.floor(bx / G)]) out[out.length - 1] = [bx, bz];
      return out;
    },
  };

  // lamps (evening) — point lights in living, dining, bedroom, kitchen, bath, hall
  const lamps = [];
  for (const [x, z, y, i, d] of [[111, 538, 1.0, 1.4, 4], [368, 538, 1.0, 1.4, 4], [484, 495, 2.0, 2.2, 5], [416, 140, 2.5, 2.2, 5], [680, 480, 2.5, 1.6, 4], [740, 130, 2.5, 1.3, 3.5], [790, 330, 2.5, 1.2, 4], [260, 420, 2.6, 2.0, 6]]) {
    const L = new THREE.PointLight(0xffc98f, 0, d, 1.6); L.position.set(m(x), y, m(z)); L.userData.max = i; root.add(L); lamps.push(L);
  }
  const pend = new THREE.Mesh(cyl(0.22, 0.05, 0.2), MAT.shade); pend.position.set(m(484), 2.0, m(495)); root.add(pend);
  const cord = new THREE.Mesh(cyl(0.005, 0.005, 0.6, 6), MAT.black); cord.position.set(m(484), 2.2, m(495)); root.add(cord);

  root.traverse((o) => { if (o.isMesh && o.material !== MAT.glass) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });

  const rooms = ROOMS.map((r) => ({ ...r, name: lang === 'ru' ? r.ru : r.sr, rect: r.r.map(m), label: P(...r.at), view: r.view.map((v) => P(...v)) }));
  const roomAt = (x, z) => {
    for (const r of rooms) { const [a, b, c, d] = r.rect; if (x >= a && x <= c && z >= b && z <= d) return r; }
    const [a, b, c, d] = HALL_EXTRA.map(m); if (x >= a && x <= c && z >= b && z <= d) return rooms[0];
    return null;
  };
  // cut-away: low walls; thin parts above the cut (frames, glass, door leaves) are clipped by a plane set from outside
  const cutMats = [MAT.frame, MAT.glass, MAT.door, MAT.handle, MAT.tall, MAT.tallW, MAT.tv, MAT.mirror, MAT.upper, MAT.chrome, MAT.steel, MAT.wtile, MAT.splash];
  const setCut = (on, plane) => {
    walls.visible = !on; wallsLow.visible = on; ceiling.visible = !on;
    cutMats.forEach((mt) => { mt.clippingPlanes = on ? [plane] : null; mt.needsUpdate = true; });
  };
  return {
    root, ceiling, floorMeshes, setCut, CUT, glassMeshes, lamps, MAT, walk, rooms, roomAt, H,
    // plan px of the card → local metres; the exterior corner (glazing line × end wall) sits at plan (20, 600)
    corner: new THREE.Vector3(m(20), 0, m(600)),
    bounds: { x0: m(20), z0: m(14), x1: m(962), z1: m(600) },
    setNight(k) { lamps.forEach((L) => { L.intensity = L.userData.max * k; }); MAT.shade.emissiveIntensity = 1.6 * k; },
  };
}
