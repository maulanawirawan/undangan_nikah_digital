/*
 * Scene 3D: sepasang cincin (emas & rose gold) yang saling mengait,
 * dengan berlian ber-faset, kilau, dan partikel debu cahaya.
 * Dipakai di sampul (bisa diputar) dan di bagian penutup.
 */
import * as THREE from 'three';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeEnvironment(renderer) {
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

function dotTexture() {
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

function diamondGeometry() {
  // Profil brilliant-cut sederhana diputar 16 sisi → faset
  const pts = [
    new THREE.Vector2(0.0001, -0.62), // culet
    new THREE.Vector2(0.62, -0.05),
    new THREE.Vector2(1.0, 0.0),      // girdle
    new THREE.Vector2(1.0, 0.05),
    new THREE.Vector2(0.78, 0.2),
    new THREE.Vector2(0.56, 0.33),    // tepi table
    new THREE.Vector2(0.0001, 0.33),  // table
  ];
  const g = new THREE.LatheGeometry(pts, 16);
  return g.toNonIndexed();
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
  scene.environment = makeEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  const baseZ = compact ? 8.4 : 7.6;
  camera.position.set(0, 0, baseZ);

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
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.6, ior: 2.42,
    dispersion: 4, iridescence: 0.35, iridescenceIOR: 1.8, specularIntensity: 1, envMapIntensity: 2.6,
    flatShading: true, transparent: false,
  });

  // ---------- Rings ----------
  const group = new THREE.Group();
  scene.add(group);

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

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.12, 24), rose);
  head.position.y = 0.06;
  setting.add(head);
  const prongGeo = new THREE.CapsuleGeometry(0.018, 0.2, 4, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(prongGeo, rose);
    p.position.set(Math.cos(a) * 0.14, 0.2, Math.sin(a) * 0.14);
    p.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    setting.add(p);
  }
  const diamond = new THREE.Mesh(diamondGeometry(), diamondMat);
  diamond.scale.setScalar(0.23);
  diamond.position.y = 0.27;
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

  // ---------- Pose awal ----------
  const baseRot = new THREE.Euler(0.42, -0.5, 0.18);
  group.rotation.copy(baseRot);
  if (compact) group.scale.setScalar(0.82);

  // ---------- Interaksi ----------
  const state = { spin: 0, spinVel: 0, tiltX: 0, tiltY: 0, targetX: 0, targetY: 0, dragging: false, lastX: 0, opening: false };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    state.targetX = ny * 0.18;
    state.targetY = nx * 0.3;
    if (state.dragging) {
      const dx = e.clientX - state.lastX;
      state.lastX = e.clientX;
      state.spinVel = dx * 0.006;
      state.spin += state.spinVel;
    }
  };
  const onDown = (e) => { state.dragging = true; state.lastX = e.clientX; };
  const onUp = () => { state.dragging = false; };
  const onOrient = (e) => {
    if (e.gamma == null) return;
    state.targetY = THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * 0.35;
    state.targetX = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1) * 0.18;
  };
  const target = interactive ? host.closest('section') || host : host;
  target.addEventListener('pointermove', onMove);
  if (interactive) {
    target.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('deviceorientation', onOrient);
  }

  // ---------- Resize ----------
  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // di layar portrait mundurkan kamera agar cincin muat
    const portrait = h > w;
    camera.position.z = state.opening ? camera.position.z : baseZ * (portrait ? Math.min(1.55, 0.75 + (h / w) * 0.42) : 1);
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
      if (!state.dragging) {
        state.spinVel *= 0.95;
        state.spin += state.spinVel + (reduceMotion ? 0 : dt * 0.22);
      }
      state.tiltX += (state.targetX - state.tiltX) * 0.05;
      state.tiltY += (state.targetY - state.tiltY) * 0.05;
      group.rotation.x = baseRot.x + state.tiltX + Math.sin(t * 0.6) * 0.04;
      group.rotation.y = baseRot.y + state.spin + state.tiltY;
      group.rotation.z = baseRot.z + Math.sin(t * 0.4) * 0.03;
      group.position.y = (compact ? 0 : 0.1) + Math.sin(t * 0.9) * 0.06;
    }

    glints.forEach((g) => {
      const d = g.userData;
      const k = Math.pow(Math.max(0, Math.sin(t * d.speed + d.phase)), 12);
      g.scale.setScalar(0.001 + d.base * k);
      g.material.rotation = t * 0.4 + d.phase;
    });

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
    tl.to(group.rotation, { x: 0.12, y: 0.35, z: 0, duration: duration * 0.45, ease: 'power2.inOut' }, 0)
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
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('deviceorientation', onOrient);
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    [gold, rose, diamondMat, pMat].forEach((m) => m.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { start, stop, open, dispose, renderer };
}

// ---------- Bootstrapping ----------
function webglOK() {
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
