/* Blue Danube Promenade — «Kvart» look: materials, sky, sun, shadows, ambient occlusion.
   The model (model/kv-*.glb) is built from the project FBX (LK_exportfbx.fbx): one mesh per
   material category, named by category. Corona materials do not survive export, so every
   surface is re-authored here to match the project renders. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CASTERS = new Set(['wall', 'stone', 'frame', 'glass', 'roof', 'greenroof', 'deck', 'soffit', 'pergola', 'fencemetal', 'wood', 'neon']);

export function createLook({ renderer, scene, camera, COARSE, texUrl }) {
  const HQ = !COARSE;
  const tl = new THREE.TextureLoader();
  const tex = (f, rep = 1, srgb = true) => {
    const t = tl.load(texUrl(f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
  };
  const U = { uNight: { value: 0 }, uDetail: { value: tex('plaster.webp', 1, false) } };

  /* ---------- sky environment (procedural, day and evening) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = (top, hor, gnd, sunDir, sunCol, sunPow) => {
    const s = new THREE.Scene();
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(hor) }, gnd: { value: new THREE.Color(gnd) }, sd: { value: sunDir.clone().normalize() }, sc: { value: new THREE.Color(sunCol) }, sp: { value: sunPow } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, gnd, sc, sd; uniform float sp; varying vec3 vD;
        void main(){ float y = vD.y; vec3 c = y > 0. ? mix(hor, top, pow(y, .55)) : mix(hor, gnd, pow(-y, .35));
          float s = max(dot(vD, sd), 0.); c += sc * (pow(s, 900.) * sp + pow(s, 12.) * .35 * sp / 6.);
          gl_FragColor = vec4(c, 1.); }`,
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), m)); return s;
  };
  const SUN_DAY = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
  const SUN_EVE = new THREE.Vector3(-0.82, 0.2, 0.53).normalize();
  const envDay = pmrem.fromScene(skyScene(0x7fa6d2, 0xdfe6ea, 0x8a8577, SUN_DAY, 0xfff3dc, 6), 0.02).texture;
  const envEve = pmrem.fromScene(skyScene(0x2c3a5c, 0xe7a77e, 0x3b3530, SUN_EVE, 0xffb46a, 7), 0.02).texture;
  scene.environment = envEve;

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe9f3, 0x8f8576, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3); scene.add(sun, sun.target);
  sun.target.position.set(17, 0, 5);
  if (HQ) {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true; const sh = sun.shadow; sh.mapSize.set(4096, 4096);
    Object.assign(sh.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 20, far: 1100 });
    sh.bias = -0.00025; sh.normalBias = 0.5; sh.radius = 2;
  }

  /* ---------- material helpers ---------- */
  // triplanar world-space detail (plaster grain) so large flat surfaces never read as flat colour
  // facade zoning after the renders: charcoal ground floor, cream stone piers, warm-taupe spandrels inside the window bays,
  // darker setback floor. Window bays are found from a plan-view mask of where the glazing runs (built in applyModel).
  U.uMask = { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) }; U.uMask.value.needsUpdate = true; U.uMO = { value: new THREE.Vector2() }; U.uMS = { value: new THREE.Vector2(1, 1) };
  const detailed = (m, scale, amt, joints = 0, fac = 0) => {
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, { uDetail: U.uDetail, uDS: { value: scale }, uDA: { value: amt }, uJ: { value: joints }, uFac: { value: fac }, uMask: U.uMask, uMO: U.uMO, uMS: U.uMS });
      s.vertexShader = 'varying vec3 vWP;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = 'varying vec3 vWP; uniform sampler2D uDetail, uMask; uniform float uDS, uDA, uJ, uFac; uniform vec2 uMO, uMS;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP))); vec3 bw = pow(abs(fn), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          float vert = 1.0 - step(0.6, abs(fn.y));
          if (uFac > 0.5) {
            float bay = 0.0;
            float fl = floor((vWP.y - 0.5) / 3.0);
            if (vert > 0.5 && fl >= 0.0 && fl < 12.0 && vWP.y > 1.8 && vWP.y < 30.2) {
              vec2 q = clamp((vWP.xz - uMO) / uMS, 0.0, 1.0); q.y = (q.y + floor(fl / 4.0)) / 3.0;
              vec4 m = texture2D(uMask, q); float ch = mod(fl, 4.0);
              bay = step(0.5, ch < 0.5 ? m.r : ch < 1.5 ? m.g : ch < 2.5 ? m.b : m.a); }
            vec3 c = mix(diffuseColor.rgb, vec3(0.40, 0.32, 0.25), bay * step(uFac, 1.5)); // stone only: taupe spandrels in window bays
            c = mix(c, vec3(0.11, 0.115, 0.125), step(30.4, vWP.y));      // setback floor
            c = mix(c, vec3(0.042, 0.045, 0.05), step(vWP.y, 1.6));    // ground floor (shops)
            diffuseColor.rgb = c;
          }
          float d = texture2D(uDetail, vWP.zy * uDS).r * bw.x + texture2D(uDetail, vWP.xz * uDS).r * bw.y + texture2D(uDetail, vWP.xy * uDS).r * bw.z;
          float d2 = texture2D(uDetail, vWP.xz * uDS * 0.11 + 0.37).r * bw.y + texture2D(uDetail, (vWP.zy + vWP.xy) * uDS * 0.11).r * (1. - bw.y);
          diffuseColor.rgb *= 1.0 + (d - 0.5) * uDA * 2.0 + (d2 - 0.5) * uDA * 1.2;
          if (uJ > 0.0 && bw.y < 0.5) { // stone cladding: large-format panels, thin dark joints; each panel a slightly different tone
            float u = dot(vWP.xz, normalize(vec2(-fn.z, fn.x))); vec2 pc = vec2(u / 1.2, vWP.y / 0.6);
            vec2 f = abs(fract(pc) - 0.5) * vec2(1.2, 0.6); float j = 1.0 - smoothstep(0.004, 0.012, 0.6 * 0.5 - f.y) * smoothstep(0.004, 0.012, 1.2 * 0.5 - f.x);
            vec2 id = floor(pc); float r = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
            diffuseColor.rgb *= (1.0 + (r - 0.5) * 0.07) * (1.0 - j * uJ); } }`);
    };
    m.customProgramCacheKey = () => 'det' + scale + amt + 'j' + joints + 'f' + fac;
    return m;
  };
  // glass: sky reflections by day; by evening, a random share of windows light up (warmer on the ground floor)
  const glassMat = () => {
    const m = new THREE.MeshStandardMaterial({ color: 0x34485a, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.8, flatShading: true });
    m.onBeforeCompile = (s) => {
      s.uniforms.uNight = U.uNight;
      s.vertexShader = 'varying vec3 vWP;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = `varying vec3 vWP; uniform float uNight;
        float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }\n` + s.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 cell = floor(vec3(vWP.x / 3.1, (vWP.y + 3.3) / 2.9, vWP.z / 3.1));
          float hz = h31(cell + 17.0); diffuseColor.rgb *= 0.78 + 0.42 * hz;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float gf = step(vWP.y, 3.6); float lit = step(0.66 - 0.3 * gf, h31(cell + 5.3));
            vec3 warm = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.74, 0.46), h31(cell + 3.1));
            totalEmissiveRadiance += warm * lit * uNight * (gf > 0.5 ? 1.6 : 0.55 + 0.35 * h31(cell + 9.7)); }`);
    };
    m.customProgramCacheKey = () => 'glassN';
    return m;
  };
  const std = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, metalness: 0, ...o });

  const M = {
    stone: detailed(std({ color: 0xe6dac4, roughness: 0.7 }), 0.3, 0.06, 0.3, 1), // cream stone cladding
    roof: detailed(std({ color: 0xa3a19b, roughness: 0.96 }), 0.18, 0.14),
    frame: std({ color: 0x2d3034, roughness: 0.45, metalness: 0.35 }),
    glass: glassMat(),
    greenroof: std({ map: tex('grass.webp', 1), color: 0xb7cf96, roughness: 1 }),
    deck: std({ map: tex('deck.webp', 1), color: 0xc9bfb2, roughness: 0.85 }),
    soffit: std({ color: 0xefebe4, roughness: 0.9 }),
    pergola: std({ color: 0x3c3834, roughness: 0.5, metalness: 0.45 }),
    neon: new THREE.MeshStandardMaterial({ color: 0xd8cbb5, emissive: 0xffc77a, emissiveIntensity: 0, roughness: 0.6 }),
    fencemetal: std({ color: 0x3a3d42, roughness: 0.5, metalness: 0.4 }),
    wood: std({ color: 0x8c6a48, roughness: 0.8 }),
    asphalt: detailed(std({ color: 0x5e5d5b, roughness: 0.95 }), 0.22, 0.16),
    asphalt2: detailed(std({ color: 0x53524f, roughness: 0.95 }), 0.22, 0.16),
    lawn: std({ map: tex('paving.webp', 1), color: 0xc9d8ae, roughness: 1 }),
    paving: std({ map: tex('sidewalk.webp', 1), color: 0xe2ddd4, roughness: 0.9 }),
    curb: detailed(std({ color: 0xcdc9c1, roughness: 0.9 }), 0.4, 0.08),
    concrete: detailed(std({ color: 0xbab6ae, roughness: 0.92 }), 0.3, 0.1),
    misc: std({ color: 0xcfcac2 }),
    courtyard: detailed(std({ color: 0xd9d1c3, roughness: 0.9 }), 0.45, 0.14),
  };
  M.wall = M.stone; // the CAD splits one facade into two materials by lamella: both get the same cladding and zoning
  const ctxMat = detailed(std({ color: 0xdcd6cc, roughness: 0.95 }), 0.12, 0.05); // surrounding buildings: calm massing model

  // the courtyard deck shares one CAD material with some roads: carve the triangles inside the courtyard outline into their own mesh
  const inPoly = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  function carveCourt(root, P) {
    root.updateMatrixWorld(true);
    const hits = []; root.traverse((o) => { if (o.isMesh && /^asphalt2/.test(o.name)) hits.push(o); });
    const v = new THREE.Vector3();
    for (const o of hits) {
      const g = o.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null;
      const n = idx ? idx.length : pos.count, a = [], b = [];
      for (let t = 0; t < n; t += 3) {
        let cx = 0, cz = 0;
        for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx ? idx[t + k] : t + k).applyMatrix4(o.matrixWorld); cx += v.x; cz += v.z; }
        (inPoly(cx / 3, cz / 3, P) ? b : a).push(idx ? idx[t] : t, idx ? idx[t + 1] : t + 1, idx ? idx[t + 2] : t + 2);
      }
      if (!b.length) continue;
      const gB = new THREE.BufferGeometry(); for (const k in g.attributes) gB.setAttribute(k, g.attributes[k]); gB.setIndex(b);
      g.setIndex(a);
      const m = new THREE.Mesh(gB); m.name = 'courtyard'; m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
      o.parent.add(m);
    }
  }

  // per-floor plan masks (0.25 m cells) of the window glazing: a stone face sitting over the glazing line of its own floor
  // is a sill/head spandrel inside a window bay. Floors are 3 m (slab bands sit at y = 3n); 12 floors packed 4 per RGBA texel, 3 layers stacked.
  function buildBayMask(root) {
    root.updateMatrixWorld(true);
    const glass = []; root.traverse((o) => { if (o.isMesh && /^glass/.test(o.name)) glass.push(o); });
    if (!glass.length) return;
    const box = new THREE.Box3(); glass.forEach((o) => box.expandByObject(o));
    const R = 0.25, x0 = box.min.x - 2, z0 = box.min.z - 2, W = Math.ceil((box.max.x - x0 + 2) / R), H = Math.ceil((box.max.z - z0 + 2) / R);
    const g = new Uint8Array(W * H * 12), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const line = (p, q, f) => {
      const n = Math.ceil(Math.max(Math.abs(q.x - p.x), Math.abs(q.z - p.z)) / R * 2) + 1;
      for (let i = 0; i <= n; i++) { const x = Math.floor((p.x + (q.x - p.x) * i / n - x0) / R), z = Math.floor((p.z + (q.z - p.z) * i / n - z0) / R); if (x >= 0 && z >= 0 && x < W && z < H) g[(f * H + z) * W + x] = 1; }
    };
    for (const o of glass) {
      const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count;
      for (let t = 0; t < n; t += 3) {
        a.fromBufferAttribute(P, I ? I.getX(t) : t).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, I ? I.getX(t + 1) : t + 1).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, I ? I.getX(t + 2) : t + 2).applyMatrix4(o.matrixWorld);
        const lo = Math.min(a.y, b.y, c.y), hi = Math.max(a.y, b.y, c.y);
        if (lo < 1.8 || hi > 30.2) continue; // only typical floors: no shopfronts, no roof-terrace railings
        const nn = e1.subVectors(b, a).cross(e2.subVectors(c, a)); if (Math.abs(nn.y) > 0.3 * nn.length()) continue;
        const f0 = Math.max(0, Math.floor((lo + 0.1 - 0.5) / 3)), f1 = Math.min(11, Math.floor((hi - 0.1 - 0.5) / 3));
        for (let f = f0; f <= f1; f++) { line(a, b, f); line(b, c, f); line(c, a, f); }
      }
    }
    const d = new Uint8Array(W * H * 3 * 4); // grow by one cell so the stone in front of / behind the glass line is caught
    for (let f = 0; f < 12; f++) {
      const L = f >> 2, ch = f & 3, base = f * H * W;
      for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
        const i = base + z * W + x; if (g[i] | g[i - 1] | g[i + 1] | g[i - W] | g[i + W]) d[((L * H + z) * W + x) * 4 + ch] = 255;
      }
    }
    const tx = new THREE.DataTexture(d, W, H * 3, THREE.RGBAFormat, THREE.UnsignedByteType); tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.needsUpdate = true;
    U.uMask.value = tx; U.uMO.value.set(x0, z0); U.uMS.value.set(W * R, H * R);
  }

  function applyModel(root, opts = {}) {
    if (opts.court) carveCourt(root, opts.court);
    buildBayMask(root);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const cat = o.name.replace(/[._]\d+$/, '');
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = M[cat] || M.misc;
      o.castShadow = HQ && CASTERS.has(cat);
      o.receiveShadow = HQ;
      o.userData.cat = cat;
    });
  }

  /* ---------- post: ground-contact & corner ambient occlusion (desktop) ---------- */
  let composer = null, aoPass = null; const aoHide = [];
  if (HQ) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    aoPass = new GTAOPass(scene, camera, 2, 2);
    aoPass.updateGtaoMaterial({ radius: 4, distanceExponent: 1.6, thickness: 3, scale: 1.25, samples: 16, distanceFallOff: 1 });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    aoPass.blendIntensity = 0.9;
    // objects left out of the AO pass (the model while it is cut open around the flat: the pass ignores clipping)
    const aoRender = aoPass.render.bind(aoPass);
    aoPass.render = (...a) => { const h = aoHide.filter((o) => o.visible); h.forEach((o) => { o.visible = false; }); aoRender(...a); h.forEach((o) => { o.visible = true; }); };
    composer.addPass(aoPass);
    composer.addPass(new OutputPass());
  }

  /* ---------- day ↔ evening ---------- */
  const sunDir = new THREE.Vector3();
  let sunOv = null; // apartment tour: sun from the side its windows face, shadow frustum hugging the flat
  const SH0 = HQ ? { ...sun.shadow.camera, bias: sun.shadow.bias, nb: sun.shadow.normalBias, t: sun.target.position.clone() } : null;
  function setSunOverride(o) {
    sunOv = o;
    if (!HQ) { if (o) sun.target.position.copy(o.target); else sun.target.position.set(17, 0, 5); return; }
    const c = sun.shadow.camera, e = o ? o.extent : 190;
    Object.assign(c, { left: -e, right: e, top: e, bottom: -e, near: o ? 1 : SH0.near, far: o ? 120 : SH0.far }); c.updateProjectionMatrix();
    sun.shadow.bias = o ? -0.0004 : SH0.bias; sun.shadow.normalBias = o ? 0.02 : SH0.nb; sun.shadow.radius = o ? 3 : 2;
    sun.target.position.copy(o ? o.target : SH0.t); sun.shadow.needsUpdate = true;
  }
  function setNight(k) {
    lastK = k; U.uNight.value = k;
    sunDir.lerpVectors(sunOv ? sunOv.dir : SUN_DAY, SUN_EVE, k).normalize();
    sun.position.copy(sun.target.position).addScaledVector(sunDir, sunOv ? 60 : 520);
    sun.intensity = 3.1 * (1 - k) + 1.7 * k;
    sun.color.setRGB(1, 0.95 - 0.18 * k, 0.86 - 0.3 * k);
    hemi.intensity = 1.25 * (1 - k) + 0.5 * k;
    hemi.color.setRGB(0.87 - 0.35 * k, 0.91 - 0.38 * k, 0.95 - 0.2 * k);
    hemi.groundColor.setRGB(0.56 - 0.2 * k, 0.52 - 0.22 * k, 0.46 - 0.22 * k);
    scene.environment = k > 0.5 ? envEve : envDay;
    scene.environmentIntensity = 0.85 * (1 - k) + 0.55 * k;
    M.neon.emissiveIntensity = 2.2 * k;
    renderer.toneMappingExposure = 1.0 + 0.12 * k + boost * (1 - 0.6 * k);
    scene.environmentIntensity += boost * 0.5 * (1 - k);
  }
  let boost = 0, lastK = 0; // interior exposure lift while walking through the flat
  function setBoost(b) { boost = b; setNight(lastK); }

  return {
    applyModel, setNight, setBoost, ctxMat, HQ, U, M, sun, hemi, setSunOverride,
    resize(w, h) { if (composer) { composer.setSize(w, h); } },
    // the AO pass draws its own depth/normals without per-material clipping: off while the model is cut open
    aoOn: true,
    // interior mode: short AO radius for rooms, and the given objects skipped by the AO pass
    setAOInterior(on, hide = []) {
      aoHide.length = 0; if (on) aoHide.push(...hide);
      if (aoPass) { aoPass.updateGtaoMaterial(on ? { radius: 0.7, distanceExponent: 1.2, thickness: 1, scale: 1.4, samples: 16, distanceFallOff: 1 } : { radius: 4, distanceExponent: 1.6, thickness: 3, scale: 1.25, samples: 16, distanceFallOff: 1 }); aoPass.blendIntensity = on ? 1.0 : 0.9; }
    },
    render(still) { if (composer && still && this.aoOn) composer.render(); else renderer.render(scene, camera); },
  };
}
