/*
 * Scene 3D: sepasang cincin (emas & rose gold) yang saling mengait,
 * dengan berlian ber-faset, kilau, dan partikel debu cahaya.
 * Dipakai di sampul (bisa diputar) dan di bagian penutup.
 */
import * as THREE from 'three';
import { loadStudioHDR, createDiamondMaterial, gemEnvironment } from './diamond.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lingkungan studio foto (HDRI Poly Haven, CC0) untuk pantulan logam yang realistis.
// Sementara HDRI dimuat, dipakai softbox buatan (makeEnvironment).
export function useStudioEnv(renderer, scene, intensity = 1) {
  scene.environment = makeEnvironment(renderer);
  loadStudioHDR().then((tex) => {
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    pm.dispose();
    const old = scene.environment;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    if (old) old.dispose();
  }).catch(() => {});
}

export function makeEnvironment(renderer) {
  // Studio "softbox" buatan sendiri: panel terang berbentuk strip agar logam
  // memantulkan garis cahaya seperti foto perhiasan.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x07040a);
  const geo = new THREE.PlaneGeometry(1, 1);
  const panel = (w, h, color, intensity, pos) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(w, h, 1);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(9, 1.3, '#fff3e3', 7, [0, 7, 1.5]);      // strip atas
  panel(1.4, 9, '#ffffff', 5, [-7, 0.5, 2.5]);  // strip kiri
  panel(1.2, 8, '#ffd9c2', 4, [7, 1, 0.5]);     // strip kanan hangat
  panel(3.5, 3.5, '#ffffff', 9, [2.5, 3, 7]);   // key light depan
  panel(10, 3, '#f0b8cf', 1.6, [0, -1.5, -8]);  // latar pink lembut
  panel(6, 6, '#b9c2ff', 1.1, [0, -7, 0]);      // lantai lilac (opalescent)
  panel(2, 5, '#fff0d0', 3, [-4, -3, 6]);       // fill bawah
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  geo.dispose();
  return tex;
}

function starTexture() {
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.08, 'rgba(255,248,235,.9)');
  grd.addColorStop(0.25, 'rgba(255,230,200,.18)');
  grd.addColorStop(1, 'rgba(255,230,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'lighter';
  const ray = (angle, len, width) => {
    g.save();
    g.translate(s / 2, s / 2);
    g.rotate(angle);
    const lg = g.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,.95)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(0, 0, len, width, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  ray(0, 62, 1.6);
  ray(Math.PI / 2, 62, 1.6);
  ray(Math.PI / 4, 30, 1);
  ray(-Math.PI / 4, 30, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function dotTexture() {
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

// Berlian potongan marquise (modified brilliant, 58 faset) dengan proporsi ideal
// referensi gemologi: rasio panjang:lebar ±1.95, table 58%, depth 61%
// (crown 13%, girdle 3%, pavilion 45% dari lebar), keel pendek sebagai culet.
// Satuan: lebar = 1 → L = setengah panjang, W = setengah lebar.
export const MARQUISE = { L: 0.975, W: 0.5 };
function marquisePoint(theta) {
  // titik tepi (girdle) pada arah theta: perpotongan sinar dengan dua busur lingkaran
  const { L, W } = MARQUISE;
  const R = (L * L + W * W) / (2 * W), c = R - W;
  const dx = Math.cos(theta), dz = Math.sin(theta);
  const cy = dz >= 0 ? -c : c; // busur atas berpusat di (0,-c), bawah di (0,c)
  // |t*d - (0,cy)| = R  →  t^2 - 2 t (dz*cy) + cy^2 - R^2 = 0
  const bq = -2 * dz * cy, cq = cy * cy - R * R;
  const t = (-bq + Math.sqrt(bq * bq - 4 * cq)) / 2;
  return [t * dx, t * dz];
}
function diamondGeometry() {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const CROWN = 0.13, GIRDLE = 0.03, PAV = 0.45, TABLE = 0.58, STAR = 0.5, LOWER = 0.78, KEEL = 0.22;
  const yT = GIRDLE / 2 + CROWN, yG = GIRDLE / 2, yC = -GIRDLE / 2 - PAV;
  const N = 8; // arah utama (bezel/main)
  const dir = (k) => (k * Math.PI) / N;  // 16 titik girdle: genap = utama, ganjil = antara
  const gp = [];
  for (let k = 0; k < 2 * N; k++) gp.push(marquisePoint(dir(k)));
  const Gt = gp.map(([x, z]) => V(x, yG, z));
  const Gb = gp.map(([x, z]) => V(x, -yG, z));
  const tableHalfW = TABLE / 2; // table 58% dari lebar
  const T = [], S = [], M = [], C = [];
  for (let i = 0; i < N; i++) {
    const [x, z] = gp[2 * i];
    T.push(V(x * (tableHalfW / MARQUISE.W) * 0.92, yT, z * (tableHalfW / MARQUISE.W)));
    const [lx, lz] = gp[2 * i]; // bawah: titik lower-girdle & keel
    M.push(V(lx * (1 - LOWER), -yG - PAV * LOWER, lz * (1 - LOWER)));
    C.push(V(lx * KEEL, yC, 0));
  }
  for (let i = 0; i < N; i++) {
    const a = T[i], b = T[(i + 1) % N], g = Gt[2 * i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    S.push(mid.lerp(g, STAR));
  }
  const pos = [];
  const tri = (p1, p2, p3) => {
    const n = new THREE.Vector3().subVectors(p2, p1).cross(new THREE.Vector3().subVectors(p3, p1));
    const cen = V(0, 0, 0).add(p1).add(p2).add(p3).multiplyScalar(1 / 3);
    if (n.dot(cen) < 0) [p2, p3] = [p3, p2];
    pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
  };
  const G = 2 * N, w = (k) => (k + G) % G;
  const tc = V(0, yT, 0);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, p = (i - 1 + N) % N;
    tri(tc, T[i], T[j]);                                        // table
    tri(T[i], T[j], S[i]);                                      // star
    tri(T[i], S[p], Gt[2 * i]); tri(T[i], Gt[2 * i], S[i]);     // bezel (kite)
    tri(S[i], Gt[2 * i], Gt[2 * i + 1]);                        // upper girdle ×2
    tri(S[i], Gt[2 * i + 1], Gt[w(2 * i + 2)]);
    for (const k of [2 * i, 2 * i + 1]) {                        // girdle
      tri(Gt[k], Gb[k], Gb[w(k + 1)]); tri(Gt[k], Gb[w(k + 1)], Gt[w(k + 1)]);
    }
    tri(Gb[2 * i], Gb[2 * i + 1], M[i]);                        // lower girdle
    tri(Gb[2 * i + 1], M[j], M[i]);
    tri(Gb[2 * i + 1], Gb[w(2 * i + 2)], M[j]);
    tri(M[i], M[j], C[i]); tri(M[j], C[j], C[i]);               // pavilion main → keel
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Membangun sepasang cincin (dipakai sampul, perjalanan scroll, dan penutup)
export function buildRingPair() {
  // ---------- Materials ----------
  const gold = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1.0, 0.77, 0.42), metalness: 1, roughness: 0.16,
    clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.25,
  });
  const rose = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.98, 0.72, 0.62), metalness: 1, roughness: 0.19,
    clearcoat: 0.5, clearcoatRoughness: 0.1, envMapIntensity: 1.2,
    iridescence: 0.25, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 420],
  });
  const diamondMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 0.55, thickness: 0.4, ior: 2.42,
    dispersion: 5, iridescence: 0.2, iridescenceIOR: 1.8, specularIntensity: 1, envMapIntensity: 4,
    clearcoat: 1, clearcoatRoughness: 0, flatShading: true,
  });

  // ---------- Rings ----------
  const group = new THREE.Group();

  const bandA = new THREE.TorusGeometry(1.05, 0.078, 48, 220);
  const ringA = new THREE.Mesh(bandA, gold);
  ringA.scale.z = 2.7; // penampang pipih-bulat (comfort fit)
  ringA.position.set(-0.45, 0, 0);
  group.add(ringA);

  const ringBGroup = new THREE.Group();
  ringBGroup.position.set(0.45, 0, 0);
  ringBGroup.rotation.x = Math.PI / 2;
  group.add(ringBGroup);
  const bandB = new THREE.TorusGeometry(0.9, 0.066, 48, 220);
  const ringB = new THREE.Mesh(bandB, rose);
  ringB.scale.z = 2.4;
  ringBGroup.add(ringB);

  // Setting berlian di cincin B (arah keluar radial)
  const setting = new THREE.Group();
  const theta = -Math.PI * 0.62;
  setting.position.set(Math.cos(theta) * 0.97, Math.sin(theta) * 0.97, 0);
  setting.rotation.z = theta - Math.PI / 2; // sumbu +Y lokal mengarah keluar
  ringBGroup.add(setting);

  const DS = 0.3; // skala berlian (panjang ≈ 0.58, lebar ≈ 0.3 satuan cincin)
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.1, 24), rose);
  head.scale.x = 1.7; // dudukan ikut lonjong
  head.position.y = 0.06;
  head.scale.z = 0.9;
  setting.add(head);
  const prongGeo = new THREE.CapsuleGeometry(0.016, 0.1, 4, 8);
  // 2 prong-V di ujung runcing + 4 di sisi, khas setting marquise
  // 2 prong-V di ujung runcing + 4 di sisi, tepat di tepi girdle
  [0, Math.PI, 0.45, -0.45, Math.PI - 0.45, Math.PI + 0.45].forEach((th) => {
    const [gx, gz] = marquisePoint(th);
    const px = gx * DS, pz = gz * DS, len = Math.hypot(px, pz);
    const p = new THREE.Mesh(prongGeo, rose);
    p.position.set(px * 1.04, 0.24, pz * 1.04);
    p.rotation.set(-(pz / len) * 0.3, 0, (px / len) * 0.3); // miring sedikit ke dalam, mencengkeram batu
    setting.add(p);
  });
  const diamondGeo = diamondGeometry();
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  // material refraksi ray-traced dengan light box perhiasan
  try {
    const m = createDiamondMaterial(diamondGeo, gemEnvironment());
    m.bindTo(diamond);
    diamond.material = m;
    diamondMat.dispose();
  } catch (e) { console.warn('Berlian: pakai material cadangan', e); }
  diamond.scale.setScalar(DS);
  diamond.position.y = 0.26;
  setting.add(diamond);

  // ---------- Kilau (glints) ----------
  const starTex = starTexture();
  const glints = [];
  const glintSpots = [
    [diamond, new THREE.Vector3(0.3, 0.3, 0.2)],
    [ringA, new THREE.Vector3(0.74, 0.74, 0.1)],
    [ringA, new THREE.Vector3(-1.02, 0.2, 0.08)],
    [ringB, new THREE.Vector3(0.55, 0.7, 0.1)],
    [ringB, new THREE.Vector3(-0.85, -0.25, 0.1)],
  ];
  glintSpots.forEach(([parent, pos], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, color: i === 0 ? 0xffffff : 0xfff1dc }));
    sp.position.copy(pos);
    if (parent === ringA) sp.position.z /= ringA.scale.z;
    if (parent === ringB) sp.position.z /= ringB.scale.z;
    const s = i === 0 ? 0.9 : 0.55;
    sp.userData = { base: s, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.8 };
    sp.scale.setScalar(0.001);
    parent.add(sp);
    glints.push(sp);
  });

  const update = (t) => {
    glints.forEach((g) => {
      const d = g.userData;
      const k = Math.pow(Math.max(0, Math.sin(t * d.speed + d.phase)), 12);
      g.scale.setScalar(0.001 + d.base * k);
      g.material.rotation = t * 0.4 + d.phase;
    });
  };
  const dispose = () => {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    [gold, rose, diamondMat].forEach((m) => m.dispose());
    starTex.dispose();
  };
  return { group, ringA, ringBGroup, ringB, diamond, update, dispose };
}

export function createRings(host, opts = {}) {
  const { interactive = false, compact = false } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  useStudioEnv(renderer, scene, 1.15);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  const baseZ = compact ? 8.4 : 7.6;
  camera.position.set(0, 0, baseZ);

  const rings = buildRingPair();
  const group = rings.group;
  scene.add(group);

  // ---------- Partikel debu cahaya ----------
  const N = compact ? 160 : 320;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  const palette = [new THREE.Color('#f5d9a8'), new THREE.Color('#f3b8cd'), new THREE.Color('#c9c2ff'), new THREE.Color('#fff6ea')];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    const c = palette[i % palette.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    seeds[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.055, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---------- Pose & interaksi: trackball bebas ke segala arah ----------
  const baseQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.5, 0.18));
  const userQ = new THREE.Quaternion();
  const hoverQ = new THREE.Quaternion();
  const qTmp = new THREE.Quaternion();
  const IDENT = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  group.quaternion.copy(baseQ);
  if (compact) group.scale.setScalar(0.82);
  const clampN = THREE.MathUtils.clamp;
  const state = {
    vx: 0, vy: 0, pendX: 0, pendY: 0, hx: 0, hy: 0, thx: 0, thy: 0,
    dragging: false, lastX: 0, lastY: 0, opening: false, resetting: false,
    zoom: 1, tZoom: 1, idle: 10, baseDist: baseZ,
  };
  const pointers = new Map();
  let pinch0 = 0, zoom0 = 1;
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    if (!state.dragging && e.pointerType !== 'touch') {
      state.thx = (((e.clientY - r.top) / r.height) * 2 - 1) * 0.12;
      state.thy = (((e.clientX - r.left) / r.width) * 2 - 1) * 0.2;
    }
    if (!interactive || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) state.tZoom = clampN((zoom0 * pinch0) / Math.max(d, 1), 0.55, 1.4);
      return;
    }
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
    state.lastX = e.clientX; state.lastY = e.clientY;
    const k = 4.2 / Math.max(260, Math.min(r.width, r.height)); // ± setengah putaran per lebar layar
    state.pendY += dx * k;
    state.pendX += dy * k;
  };
  const onDown = (e) => {
    if (e.target.closest && e.target.closest('button, a')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    state.resetting = false;
    state.idle = 0;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      zoom0 = state.tZoom;
      state.dragging = false;
    } else {
      state.dragging = true;
      state.lastX = e.clientX; state.lastY = e.clientY;
      state.vx = state.vy = 0;
    }
  };
  const onUp = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
    if (pointers.size === 1) {
      const [p] = [...pointers.values()];
      state.dragging = true; state.lastX = p.x; state.lastY = p.y;
    } else if (pointers.size === 0) state.dragging = false;
  };
  const onWheel = (e) => {
    e.preventDefault();
    state.tZoom = clampN(state.tZoom * (1 + e.deltaY * 0.0012), 0.55, 1.4);
    state.idle = 0;
  };
  const onDbl = () => { state.resetting = true; state.tZoom = 1; state.vx = state.vy = 0; };
  let lastTap = 0;
  const onTap = (e) => {
    if (e.pointerType !== 'touch') return;
    const now = performance.now();
    if (now - lastTap < 300) onDbl();
    lastTap = now;
  };
  const onOrient = (e) => {
    if (e.gamma == null || state.dragging) return;
    state.thy = clampN(e.gamma / 45, -1, 1) * 0.25;
    state.thx = clampN((e.beta - 45) / 45, -1, 1) * 0.12;
  };
  const target = interactive ? host.closest('section') || host : host;
  target.addEventListener('pointermove', onMove);
  if (interactive) {
    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointerup', onTap);
    target.addEventListener('wheel', onWheel, { passive: false });
    target.addEventListener('dblclick', onDbl);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('deviceorientation', onOrient);
  }

  // ---------- Resize ----------
  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // di layar portrait mundurkan kamera agar cincin muat
    const portrait = h > w;
    state.baseDist = baseZ * (portrait ? Math.min(1.55, 0.75 + (h / w) * 0.42) : 1);
    if (!state.opening) camera.position.z = state.baseDist * state.zoom;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ---------- Loop ----------
  let raf = 0, running = false, last = performance.now(), t = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    if (!state.opening) {
      // rotasi: saat digeser ikuti jari, setelah dilepas meluncur (inersia)
      if (state.dragging) {
        state.vx = state.pendX; state.vy = state.pendY;
        state.pendX = state.pendY = 0;
      } else {
        const decay = Math.pow(0.9, dt * 60);
        state.vx *= decay; state.vy *= decay;
        state.idle += dt;
      }
      // putar otomatis pelan bila tidak disentuh beberapa detik
      const auto = reduceMotion ? 0 : dt * 0.25 * clampN((state.idle - 2) / 2, 0, 1);
      qTmp.setFromAxisAngle(AY, state.vy + auto); userQ.premultiply(qTmp);
      qTmp.setFromAxisAngle(AX, state.vx); userQ.premultiply(qTmp);
      userQ.normalize();
      if (state.resetting) {
        userQ.slerp(IDENT, 1 - Math.pow(0.88, dt * 60));
        if (userQ.angleTo(IDENT) < 0.002) state.resetting = false;
      }
      state.hx += (state.thx - state.hx) * 0.05;
      state.hy += (state.thy - state.hy) * 0.05;
      hoverQ.setFromEuler(new THREE.Euler(state.hx + Math.sin(t * 0.6) * 0.03, state.hy, Math.sin(t * 0.4) * 0.02));
      group.quaternion.copy(hoverQ).multiply(userQ).multiply(baseQ);
      group.position.y = (compact ? 0 : 0.1) + Math.sin(t * 0.9) * 0.06;
      state.zoom += (state.tZoom - state.zoom) * 0.12;
      camera.position.z = state.baseDist * state.zoom;
    }

    rings.update(t);

    const p = pGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += dt * (0.05 + seeds[i] * 0.12);
      p[i * 3] += Math.sin(t * 0.5 + seeds[i] * 10) * dt * 0.03;
      if (p[i * 3 + 1] > 4.5) p[i * 3 + 1] = -4.5;
    }
    pGeo.attributes.position.needsUpdate = true;
    points.rotation.y = t * 0.02;

    renderer.render(scene, camera);
  };
  const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  // ---------- Transisi buka undangan ----------
  const open = (duration = 1.9) => new Promise((resolve) => {
    state.opening = true;
    const g = window.gsap;
    if (!g) { resolve(); return; }
    const tl = g.timeline({ onComplete: resolve });
    // hadapkan cincin emas ke kamera, lalu kamera meluncur menembus lubangnya
    // (sedikit di atas pusat supaya tidak menabrak cincin rose gold)
    const fromQ = group.quaternion.clone();
    const toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0.35, 0));
    const k = { v: 0 };
    tl.to(k, { v: 1, duration: duration * 0.45, ease: 'power2.inOut', onUpdate: () => group.quaternion.slerpQuaternions(fromQ, toQ, k.v) }, 0)
      .to(group.position, { x: 0.45 * Math.cos(0.35), y: -0.45, duration: duration * 0.45, ease: 'power2.inOut' }, 0)
      .to(camera.position, { z: 0.6, duration: duration * 0.75, ease: 'power3.in' }, duration * 0.25)
      .to(camera, { fov: 70, duration: duration * 0.75, ease: 'power3.in', onUpdate: () => camera.updateProjectionMatrix() }, duration * 0.25)
      .to(pMat, { size: 0.12, duration: duration * 0.75, ease: 'power2.in' }, duration * 0.25);
  });

  const dispose = () => {
    stop();
    ro.disconnect();
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointerup', onTap);
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('dblclick', onDbl);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('deviceorientation', onOrient);
    rings.dispose();
    pGeo.dispose();
    pMat.dispose();
    scene.environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { start, stop, open, dispose, renderer };
}

// ---------- Bootstrapping ----------
export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const api = { cover: null, closing: null, createRings };
if (webglOK()) {
  const coverHost = document.querySelector('[data-scene="cover"]');
  if (coverHost) {
    try {
      api.cover = createRings(coverHost, { interactive: true });
      api.cover.start();
    } catch (e) {
      console.warn('3D tidak tersedia:', e);
      document.getElementById('cover')?.classList.add('no-webgl');
    }
  }
} else {
  document.getElementById('cover')?.classList.add('no-webgl');
}
window.RingScene = api;
window.dispatchEvent(new CustomEvent('ringscene:ready'));
