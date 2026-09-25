/*
 * "Our Journey" — pengalaman 3D yang digerakkan scroll.
 * Kamera meluncur di sepanjang lintasan melengkung melewati polaroid
 * momen pasangan (bab cerita + foto galeri). Polaroid mengayun menyingkir
 * saat dilewati, angka tahun raksasa melayang di belakang, dan di ujung
 * lintasan dua cincin terbang lalu saling mengait. Semua dikendalikan scroll.
 */
import * as THREE from 'three';
import { buildRingPair, useStudioEnv, dotTexture, webglOK } from './scene.js';

const C = window.WEDDING || {};
const section = document.getElementById('cerita');
const BG = 0x120a0d;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fail(err) {
  if (err) console.warn('Journey 3D dimatikan:', err);
  window.dispatchEvent(new CustomEvent('journey:fail'));
}

if (section && section.dataset.mode === 'journey') {
  if (!webglOK()) fail('WebGL tidak tersedia');
  else {
    let started = false;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !started) {
        started = true;
        io.disconnect();
        init().catch(fail);
      }
    }, { rootMargin: '220% 0px' });
    io.observe(section);
  }
}

// ---------- Gambar & polaroid ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}
async function photo(src, seed, ratio) {
  try {
    if (!src) throw new Error('kosong');
    return await loadImage(src);
  } catch (e) {
    const ph = window.WeddingPlaceholder;
    return ph ? loadImage(ph.draw(seed, 600, Math.round(600 * ratio))) : null;
  }
}
function drawCover(g, im, x, y, w, h) {
  const r = Math.max(w / im.width, h / im.height);
  const sw = w / r, sh = h / r;
  g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
}
function stampText(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `'${m[1].slice(2)} ${m[2]} ${m[3]}` : '';
}
function polaroidCanvas(im, { year, title, stamp, big }) {
  const W = big ? 600 : 420;
  const pad = big ? 30 : 20;
  const photoH = big ? 560 : 400;
  const H = photoH + pad + (big ? 150 : 70);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fbf6ee');
  paper.addColorStop(1, '#efe6d8');
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);
  if (im) drawCover(g, im, pad, pad, W - pad * 2, photoH);
  else { g.fillStyle = '#2c1623'; g.fillRect(pad, pad, W - pad * 2, photoH); }
  // bayangan halus di tepi foto
  const sh = g.createLinearGradient(0, pad, 0, pad + 24);
  sh.addColorStop(0, 'rgba(0,0,0,.18)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(pad, pad, W - pad * 2, 24);
  if (stamp) {
    g.font = `500 ${big ? 26 : 20}px "JetBrains Mono", monospace`;
    g.fillStyle = '#ff8a3d';
    g.shadowColor = 'rgba(255,120,40,.9)';
    g.shadowBlur = 8;
    const tw = g.measureText(stamp).width;
    g.fillText(stamp, W - pad - tw - 14, pad + photoH - 16);
    g.shadowBlur = 0;
  }
  if (big && (year || title)) {
    g.fillStyle = '#8a7b75';
    g.font = '500 22px "JetBrains Mono", monospace';
    if ('letterSpacing' in g) g.letterSpacing = '5px';
    g.fillText(String(year || '').toUpperCase(), pad + 4, photoH + pad + 52);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillStyle = '#1b1315';
    let size = 58;
    g.font = `italic ${size}px "Instrument Serif", serif`;
    while (g.measureText(title).width > W - pad * 2 - 8 && size > 30) {
      size -= 2;
      g.font = `italic ${size}px "Instrument Serif", serif`;
    }
    g.fillText(title || '', pad + 2, photoH + pad + 116);
  }
  return c;
}
function yearCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 420;
  const g = c.getContext('2d');
  g.font = 'italic 330px "Instrument Serif", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(232, 205, 160, .95)';
  g.strokeText(text, 512, 220);
  g.fillStyle = 'rgba(232, 205, 160, .08)';
  g.fillText(text, 512, 220);
  return c;
}
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,.65)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

async function init() {
  const host = section.querySelector('.journey__canvas');
  const bar = section.querySelector('.journey__bar');
  const ticks = [...section.querySelectorAll('.journey__track b')];
  const caps = [...section.querySelectorAll('.journey__cap')];
  const milestonesU = caps.map((c) => parseFloat(c.dataset.u));

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(BG, 1);
  host.appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 6, 24);
  useStudioEnv(renderer, scene, 1.15);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 90);

  // ---------- Lintasan kamera ----------
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.25, 9),
    new THREE.Vector3(-1.1, 0.55, 0),
    new THREE.Vector3(1.2, -0.1, -9),
    new THREE.Vector3(-1.0, 0.45, -18),
    new THREE.Vector3(1.0, 0.0, -27),
    new THREE.Vector3(-0.5, 0.3, -36),
    new THREE.Vector3(0, 0.15, -44.5),
  ], false, 'centripetal');
  const RING_POS = new THREE.Vector3(0, 0.15, -50);

  // ---------- Objek ----------
  const frames = [];   // polaroid (bab cerita + galeri)
  const years = [];
  const shadowTex = shadowTexture();
  const planeGeo = new THREE.PlaneGeometry(1, 1);

  function addFrame({ u, side, lateral, lift, w, h, big, spin }) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf3ece2, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.scale.set(w, h, 1);
    const sh = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    sh.scale.set(w * 1.35, h * 1.3, 1);
    sh.position.set(0.12, -0.16, -0.04);
    group.add(sh, mesh);
    scene.add(group);
    const f = { group, mesh, mat, sh, u, side, lateral, lift, big, spin, phase: Math.random() * Math.PI * 2, base: new THREE.Vector3(), baseQ: new THREE.Quaternion(), loaded: false };
    frames.push(f);
    return f;
  }

  // Bab cerita → polaroid besar di tengah lintasan
  const story = C.story || [];
  story.forEach((s, i) => {
    const f = addFrame({ u: milestonesU[i] + 0.06, side: i % 2 ? 1 : -1, lateral: 0.2, lift: 0.1, w: 1.9, h: 1.9 * (740 / 600), big: true, spin: (i % 2 ? -1 : 1) * 0.06 });
    f.src = s.photo; f.seed = 10 + i; f.ratio = 16 / 9; f.meta = { year: s.year, title: s.title, big: true };
    // angka tahun raksasa di belakang
    const yt = new THREE.CanvasTexture(yearCanvas(s.year));
    yt.colorSpace = THREE.SRGBColorSpace;
    const ym = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: yt, transparent: true, depthWrite: false, opacity: 0.55, side: THREE.DoubleSide }));
    scene.add(ym);
    years.push({ mesh: ym, u: milestonesU[i] + 0.09, side: -f.side });
  });

  // Foto galeri → polaroid kecil yang mengambang di sisi lintasan
  const gal = (C.gallery || []).filter((g) => g.type === 'photo');
  gal.slice(0, 10).forEach((g, i) => {
    const u = 0.05 + (i / Math.max(1, Math.min(10, gal.length) - 1)) * 0.72 + (Math.random() - 0.5) * 0.03;
    const f = addFrame({ u, side: i % 2 ? -1 : 1, lateral: 1.9 + Math.random() * 1.1, lift: (Math.random() - 0.5) * 2.2, w: 1.15, h: 1.15 * (490 / 420), big: false, spin: (Math.random() - 0.5) * 0.5 });
    f.src = g.src; f.seed = 20 + (C.gallery || []).indexOf(g); f.ratio = 1; f.meta = { stamp: stampText(g.date) };
  });

  // Muat tekstur secara bertahap (setelah font siap agar teks polaroid rapi)
  (async () => {
    try { await document.fonts.ready; } catch (e) { /* abaikan */ }
    for (const f of frames) {
      const im = await photo(f.src, f.seed, f.big ? 560 / 540 : 400 / 380);
      const tex = new THREE.CanvasTexture(polaroidCanvas(im, f.meta));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      f.mat.map = tex;
      f.mat.color.set(0xffffff);
      f.mat.needsUpdate = true;
      f.loaded = true;
    }
  })();

  // ---------- Cincin di ujung lintasan ----------
  const rings = buildRingPair();
  const ringStage = new THREE.Group();
  ringStage.position.copy(RING_POS);
  ringStage.add(rings.group);
  scene.add(ringStage);
  const A_END = { p: new THREE.Vector3(-0.45, 0, 0), r: new THREE.Euler(0, 0, 0) };
  const A_START = { p: new THREE.Vector3(-3.4, 1.4, 2.5), r: new THREE.Euler(1.3, 2.6, 0.4) };
  const B_END = { p: new THREE.Vector3(0.45, 0, 0), r: new THREE.Euler(Math.PI / 2, 0, 0) };
  const B_START = { p: new THREE.Vector3(3.2, 2.6, 1.5), r: new THREE.Euler(Math.PI / 2 + 1.6, 1.4, 0.9) };
  const lerpEuler = (o, a, b, k) => o.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
  const keyLight = new THREE.PointLight(0xffe2c0, 30, 12);
  keyLight.position.set(2, 3, 4);
  ringStage.add(keyLight);

  // kilatan saat cincin mengait
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xfff1d6, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  flare.scale.setScalar(0.01);
  ringStage.add(flare);
  let linked = false, linkAt = -10;

  // ---------- Debu cahaya & bokeh sepanjang lintasan ----------
  function particles(count, size, opacity, spread) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const pal = [new THREE.Color('#f5d9a8'), new THREE.Color('#f3b8cd'), new THREE.Color('#c9c2ff'), new THREE.Color('#ffd2a8')];
    const tmp = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      path.getPointAt(Math.random(), tmp);
      const a = Math.random() * Math.PI * 2, r = spread[0] + Math.random() * spread[1];
      pos[i * 3] = tmp.x + Math.cos(a) * r;
      pos[i * 3 + 1] = tmp.y + Math.sin(a) * r * 0.7;
      pos[i * 3 + 2] = tmp.z + (Math.random() - 0.5) * 4;
      const c = pal[i % pal.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, map: dotTexture(), vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  }
  const dust = particles(900, 0.05, 0.85, [0.6, 5]);
  const bokeh = particles(70, 0.9, 0.16, [2.5, 5]);

  // ---------- Tata letak (menyesuaikan HP portrait vs layar lebar) ----------
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpT = new THREE.Vector3();
  let portrait = true;
  function layout() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = h > w;
    camera.fov = portrait ? 62 : 48;
    camera.updateProjectionMatrix();
    const k = portrait ? 1 : 1.6;
    frames.forEach((f) => {
      path.getPointAt(clamp(f.u, 0, 1), tmpA);
      path.getTangentAt(clamp(f.u, 0, 1), tmpT);
      const sideVec = new THREE.Vector3(-tmpT.z, 0, tmpT.x).normalize();
      f.base.copy(tmpA).addScaledVector(sideVec, f.side * f.lateral * k);
      f.base.y += f.lift;
      // menghadap ke kamera yang datang
      path.getPointAt(clamp(f.u - 0.06, 0, 1), tmpB);
      f.group.position.copy(f.base);
      f.group.lookAt(tmpB);
      f.group.rotateZ(f.spin);
      f.baseQ.copy(f.group.quaternion);
    });
    years.forEach((y) => {
      path.getPointAt(clamp(y.u, 0, 1), tmpA);
      y.mesh.position.copy(tmpA);
      y.mesh.position.x += y.side * (portrait ? 0.6 : 2.2);
      y.mesh.position.y += 1.1;
      y.mesh.position.z -= 3.5;
      const s = portrait ? 3.4 : 5.6;
      y.mesh.scale.set(s, s * (420 / 1024), 1);
      path.getPointAt(clamp(y.u - 0.1, 0, 1), tmpB);
      y.mesh.lookAt(tmpB);
    });
    ringStage.scale.setScalar(portrait ? 0.78 : 1);
  }
  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();

  const bigFrames = frames.filter((f) => f.big);

  // ---------- Pemetaan scroll → posisi kamera ----------
  // Kamera melambat (dwell) di setiap bab cerita, di intro, dan saat cincin
  // mengait, lalu melaju lagi di antaranya: ritme ala scrollytelling.
  const L = path.getLength();
  const views = milestonesU.map((mu) => mu + 0.06 - 5.2 / L);
  const RES = 1000;
  const cum = new Float32Array(RES + 1);
  for (let i = 1; i <= RES; i++) {
    const x = i / RES;
    let d = 1 + 2.2 * Math.exp(-Math.pow(x / 0.03, 2)) + 1.6 * Math.exp(-Math.pow((x - 0.87) / 0.06, 2)) + 2.5 * Math.exp(-Math.pow((x - 1) / 0.03, 2));
    views.forEach((v) => { d += 3.4 * Math.exp(-Math.pow((x - v) / 0.028, 2)); });
    cum[i] = cum[i - 1] + d;
  }
  for (let i = 1; i <= RES; i++) cum[i] /= cum[RES];
  const scrollToU = (r) => {
    let lo = 0, hi = RES;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid; else hi = mid; }
    const span = cum[hi] - cum[lo] || 1;
    return (lo + (r - cum[lo]) / span) / RES;
  };

  // ---------- Input: scroll, pointer, gyro ----------
  let raw = 0, u = 0, lastRaw = 0, vel = 0;
  const readScroll = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    raw = scrollToU(clamp(-r.top / Math.max(1, total), 0, 1));
  };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    par.tx = (e.clientX / window.innerWidth - 0.5) * 0.5;
    par.ty = (e.clientY / window.innerHeight - 0.5) * -0.3;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    par.tx = clamp(e.gamma / 40, -1, 1) * 0.3;
    par.ty = clamp((e.beta - 50) / 40, -1, 1) * -0.2;
  });

  // ---------- UI overlay ----------
  const ui = { active: -2, start: null, end: null, ticks: [] };
  function syncUI(p) {
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    const start = p < 0.035;
    const end = p > 0.9;
    if (start !== ui.start) { section.classList.toggle('is-start', start); ui.start = start; }
    if (end !== ui.end) { section.classList.toggle('is-end', end); ui.end = end; }
    let act = -1;
    milestonesU.forEach((mu, i) => { if (p > mu - 0.08 && p < mu + 0.07) act = i; });
    if (end) act = -1;
    if (act !== ui.active) {
      caps.forEach((c, i) => c.classList.toggle('is-active', i === act));
      ui.active = act;
    }
    ticks.forEach((t, i) => {
      const on = p >= milestonesU[i] - 0.08;
      if (ui.ticks[i] !== on) { t.classList.toggle('is-on', on); ui.ticks[i] = on; }
    });
  }

  // ---------- Loop ----------
  let running = false, rafId = 0, last = performance.now(), time = 0;
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), ahead = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion(), m4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    readScroll();
    vel += ((raw - lastRaw) / Math.max(dt, 1e-3) - vel) * 0.2;
    lastRaw = raw;
    u = window.__journeyNoSmooth ? raw : u + (raw - u) * (1 - Math.exp(-dt * 5.5));
    par.x += (par.tx - par.x) * 0.05;
    par.y += (par.ty - par.y) * 0.05;

    // kamera
    path.getPointAt(u, camPos);
    path.getPointAt(Math.min(1, u + 0.035), ahead);
    const toRings = smooth(0.7, 0.93, u);
    look.copy(ahead);
    // saat dwell, kamera "menoleh" ke polaroid bab agar tepat di tengah (sedikit di atas caption)
    bigFrames.forEach((f, i) => {
      const w = Math.exp(-Math.pow((u - views[i]) / 0.045, 2)) * 0.85;
      if (w > 0.001) look.lerp(tmpB.copy(f.base).setY(f.base.y - 0.55), w);
    });
    look.lerp(RING_POS, toRings);
    camera.position.copy(camPos);
    camera.position.x += par.x;
    camera.position.y += par.y;
    camera.lookAt(look);
    path.getTangentAt(u, tmpT);
    camera.rotateZ(-tmpT.x * 0.18 * (1 - toRings)); // banking di tikungan
    const baseFov = portrait ? 62 : 48;
    const kick = clamp(Math.abs(vel) * 18, 0, 9);
    camera.fov += (baseFov + kick - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    // polaroid: melayang, menoleh ke kamera, lalu mengayun menyingkir saat dilewati
    frames.forEach((f) => {
      const g = f.group;
      const d = f.base.distanceTo(camera.position);
      const ahead2 = (f.base.z - camera.position.z) < 0; // masih di depan kamera
      const near = ahead2 ? clamp(1 - (d - 0.6) / 3.8, 0, 1) : 1;
      const swing = f.big ? easeInOut(near) : near * 0.4;
      g.position.copy(f.base);
      g.position.y += Math.sin(time * 0.8 + f.phase) * 0.06;
      if (swing > 0) {
        tmpA.set(f.side * swing * (portrait ? 3.2 : 4.2), swing * 0.5, 0).applyQuaternion(f.baseQ);
        g.position.add(tmpA);
      }
      m4.lookAt(camera.position, g.position, up);
      tmpQ.setFromRotationMatrix(m4);
      g.quaternion.copy(f.baseQ).slerp(tmpQ, 0.25 * (1 - swing));
      if (swing > 0) g.rotateY(-f.side * swing * 1.1);
      g.rotateZ(Math.sin(time * 0.6 + f.phase) * 0.02);
      const fadeIn = f.loaded ? 1 : 0.35;
      f.mat.opacity += (fadeIn - f.mat.opacity) * 0.08;
      f.sh.material.opacity = f.mat.opacity * 0.5;
    });
    years.forEach((y) => {
      const d = y.mesh.position.distanceTo(camera.position);
      y.mesh.material.opacity = (0.5 + Math.sin(time * 0.7) * 0.05) * smooth(3, 7.5, d);
    });

    // cincin: terbang & mengait sesuai scroll
    const k = easeInOut(smooth(0.76, 0.96, u));
    rings.ringA.position.lerpVectors(A_START.p, A_END.p, k);
    lerpEuler(rings.ringA.rotation, A_START.r, A_END.r, k);
    rings.ringBGroup.position.lerpVectors(B_START.p, B_END.p, k);
    lerpEuler(rings.ringBGroup.rotation, B_START.r, B_END.r, k);
    rings.group.rotation.set(0.38 + Math.sin(time * 0.5) * 0.04, -0.5 + (1 - k) * 0.8 + (k >= 1 ? Math.sin(time * 0.3) * 0.25 : 0), 0.16);
    rings.group.position.y = Math.sin(time * 0.9) * 0.05;
    rings.update(time);
    if (k >= 0.999 && !linked) { linked = true; linkAt = time; }
    if (k < 0.95) linked = false;
    const fl = clamp(time - linkAt, 0, 2);
    flare.material.opacity = linked ? Math.max(0, 1 - fl * 1.2) * 0.9 : 0;
    flare.scale.setScalar(linked ? 0.5 + fl * 5 : 0.01);

    dust.rotation.z = Math.sin(time * 0.05) * 0.02;
    bokeh.material.opacity = 0.14 + Math.sin(time * 0.4) * 0.03;

    syncUI(u);
    renderer.render(scene, camera);
  }
  const start = () => { if (running) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(rafId); };
  new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { rootMargin: '10% 0px' }).observe(section);
  readScroll();
  u = raw;
  section.classList.add('is-ready');
  window.WeddingJourney = { start, stop, get progress() { return u; } };
}
