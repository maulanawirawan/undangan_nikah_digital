/*
 * Undangan Pernikahan Digital — logika utama.
 * Semua konten dibaca dari window.WEDDING (assets/js/config.js).
 */
(function () {
  'use strict';

  const C = window.WEDDING;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = () => typeof window.gsap !== 'undefined';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const words = (text) => esc(text).split(/\s+/).filter(Boolean).map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');

  const params = new URLSearchParams(location.search);
  const guestName = (params.get('to') || params.get('kepada') || '').replace(/\s+/g, ' ').trim().slice(0, 60);

  const bride = C.couple.bride, groom = C.couple.groom;
  const names = `${bride.nick} & ${groom.nick}`;

  // ------------------------------------------------------------------
  // Tanggal (ditampilkan sesuai jam lokal acara, bukan zona penonton)
  // ------------------------------------------------------------------
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function parts(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || '');
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    return {
      y, mo, d, hh: m[4] || '00', mm: m[5] || '00',
      dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(),
      date: new Date(iso),
    };
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtLong = (p) => `${DAYS[p.dow]}, ${p.d} ${MONTHS[p.mo - 1]} ${p.y}`;
  const fmtDots = (p) => `${pad2(p.d)}.${pad2(p.mo)}.${p.y}`;
  const events = C.events || [];
  const first = parts(events[0] && events[0].start);
  const target = first ? first.date : new Date();

  // ------------------------------------------------------------------
  // Placeholder art: kalau foto gagal dimuat, gambar ilustrasi "film still"
  // (langit senja, bokeh, siluet pasangan, grain) dibuat langsung di canvas.
  // ------------------------------------------------------------------
  const Placeholder = (() => {
    const PAL = [
      { sky: ['#2a0f1a', '#8e3a4a', '#f2b27e'], sun: '255,206,150', hill: ['#3a1520', '#1c0a10'], bokeh: '255,190,150' },
      { sky: ['#1d1d14', '#6d6a3c', '#f0d39a'], sun: '255,226,160', hill: ['#2c2c18', '#15150b'], bokeh: '255,230,170' },
      { sky: ['#1a1226', '#5b3563', '#e7a6b8'], sun: '255,200,215', hill: ['#2a1a30', '#120a16'], bokeh: '240,190,230' },
      { sky: ['#13161f', '#4b5a73', '#e9c4a4'], sun: '255,220,190', hill: ['#1f2530', '#0d1015'], bokeh: '200,215,255' },
      { sky: ['#241510', '#9a5530', '#f6cf9a'], sun: '255,214,150', hill: ['#361e12', '#170c07'], bokeh: '255,200,140' },
    ];
    const cache = new Map();
    let noiseTile = null;
    const rng = (seed) => {
      let a = (seed >>> 0) || 1;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const noise = () => {
      if (noiseTile) return noiseTile;
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const d = g.createImageData(128, 128);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = Math.random() * 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
      return (noiseTile = c);
    };
    function couple(g, x, ground, s, color) {
      g.fillStyle = color;
      // mempelai pria
      const gx = x + s * 0.13;
      g.beginPath(); g.arc(gx, ground - s * 0.9, s * 0.075, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(gx - s * 0.11, ground - s * 0.8);
      g.quadraticCurveTo(gx, ground - s * 0.84, gx + s * 0.11, ground - s * 0.8);
      g.lineTo(gx + s * 0.09, ground - s * 0.42);
      g.lineTo(gx + s * 0.075, ground);
      g.lineTo(gx + s * 0.01, ground);
      g.lineTo(gx, ground - s * 0.38);
      g.lineTo(gx - s * 0.01, ground);
      g.lineTo(gx - s * 0.075, ground);
      g.lineTo(gx - s * 0.09, ground - s * 0.42);
      g.closePath(); g.fill();
      // mempelai wanita (gaun A-line + veil)
      const bx = x - s * 0.13;
      g.beginPath(); g.arc(bx, ground - s * 0.86, s * 0.068, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(bx - s * 0.07, ground - s * 0.76);
      g.quadraticCurveTo(bx, ground - s * 0.8, bx + s * 0.07, ground - s * 0.76);
      g.lineTo(bx + s * 0.05, ground - s * 0.55);
      g.quadraticCurveTo(bx + s * 0.2, ground - s * 0.2, bx + s * 0.24, ground);
      g.lineTo(bx - s * 0.3, ground);
      g.quadraticCurveTo(bx - s * 0.2, ground - s * 0.2, bx - s * 0.05, ground - s * 0.55);
      g.closePath(); g.fill();
      g.save();
      g.globalAlpha = 0.35;
      g.beginPath();
      g.moveTo(bx - s * 0.02, ground - s * 0.93);
      g.quadraticCurveTo(bx - s * 0.32, ground - s * 0.6, bx - s * 0.36, ground - s * 0.18);
      g.lineTo(bx - s * 0.2, ground - s * 0.3);
      g.quadraticCurveTo(bx - s * 0.12, ground - s * 0.62, bx + s * 0.02, ground - s * 0.86);
      g.closePath(); g.fill();
      g.restore();
      // tangan bergandengan
      g.lineWidth = s * 0.035; g.lineCap = 'round'; g.strokeStyle = color;
      g.beginPath(); g.moveTo(bx + s * 0.06, ground - s * 0.72); g.quadraticCurveTo(x, ground - s * 0.5, gx - s * 0.09, ground - s * 0.72); g.stroke();
    }
    function draw(seed, w, h) {
      const key = `${seed}/${w}x${h}`;
      if (cache.has(key)) return cache.get(key);
      const r = rng(seed * 9973 + 7);
      const p = PAL[seed % PAL.length];
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const S = Math.max(w, h);
      // langit
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, p.sky[0]); sky.addColorStop(0.58, p.sky[1]); sky.addColorStop(0.8, p.sky[2]);
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // matahari & glow
      const sx = w * (0.3 + r() * 0.4), sy = h * (0.6 + r() * 0.1);
      let rg = g.createRadialGradient(sx, sy, 0, sx, sy, S * 0.7);
      rg.addColorStop(0, `rgba(${p.sun},.95)`); rg.addColorStop(0.08, `rgba(${p.sun},.55)`); rg.addColorStop(0.35, `rgba(${p.sun},.12)`); rg.addColorStop(1, `rgba(${p.sun},0)`);
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      // bokeh
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const bx = r() * w, by = r() * h * 0.8, br = S * (0.015 + r() * 0.07);
        const bg = g.createRadialGradient(bx, by, br * 0.2, bx, by, br);
        const a = 0.04 + r() * 0.14;
        bg.addColorStop(0, `rgba(${p.bokeh},${a})`); bg.addColorStop(0.85, `rgba(${p.bokeh},${a * 0.8})`); bg.addColorStop(1, `rgba(${p.bokeh},0)`);
        g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      // bukit
      let crest = sy;
      [0, 1].forEach((L) => {
        const base = h * (0.74 + L * 0.1), amp = h * (0.03 + r() * 0.03), f = 1.5 + r() * 2, ph = r() * 6;
        g.fillStyle = p.hill[L];
        g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = base + Math.sin((x / w) * f * Math.PI + ph) * amp;
          g.lineTo(x, y);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
        if (L === 0) crest = base + Math.sin((sx / w) * f * Math.PI + ph) * amp;
      });
      // siluet pasangan di puncak bukit
      if (seed % 4 !== 3) couple(g, sx, crest + 2, h * (0.13 + r() * 0.05), p.hill[0]);
      // light leak
      g.globalCompositeOperation = 'screen';
      const lx = r() > 0.5 ? 0 : w;
      rg = g.createRadialGradient(lx, h * 0.15, 0, lx, h * 0.15, S * 0.6);
      rg.addColorStop(0, 'rgba(255,120,60,.45)'); rg.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      // vignette
      rg = g.createRadialGradient(w / 2, h / 2, S * 0.3, w / 2, h / 2, S * 0.78);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      // grain
      g.globalAlpha = 0.08; g.globalCompositeOperation = 'overlay';
      g.fillStyle = g.createPattern(noise(), 'repeat'); g.fillRect(0, 0, w, h);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // label
      g.font = `500 ${Math.round(S * 0.018)}px "JetBrains Mono", monospace`;
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillText(`PLACEHOLDER · ${pad2(seed + 1)}`, S * 0.035, h - S * 0.035);
      const url = c.toDataURL('image/jpeg', 0.84);
      cache.set(key, url);
      return url;
    }
    function forImg(img) {
      const seed = +(img.dataset.seed || 0);
      const ratio = (img.dataset.ratio || '3/4').split('/').map(Number);
      const w = 720, h = Math.round((w * ratio[1]) / ratio[0]);
      return draw(seed, w, clamp(h, 360, 1300));
    }
    return { draw, forImg };
  })();

  window.WeddingPlaceholder = Placeholder;

  // Tangkap semua foto yang gagal dimuat → ganti dengan placeholder art.
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el && el.tagName === 'IMG' && !el.dataset.phDone) {
      el.dataset.phDone = '1';
      el.src = Placeholder.forImg(el);
    }
  }, true);

  const imgTag = (src, { alt = '', seed = 0, ratio = '3/4', eager = false, cls = '' } = {}) => {
    const ph = !src;
    const s = ph ? Placeholder.draw(seed, 720, Math.round(720 * ratio.split('/')[1] / ratio.split('/')[0])) : src;
    return `<img ${cls ? `class="${cls}"` : ''} src="${esc(s)}" alt="${esc(alt)}" data-seed="${seed}" data-ratio="${esc(ratio)}" ${ph ? 'data-ph-done="1"' : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">`;
  };

  // Video dengan fallback: poster tetap tampil (Ken Burns) kalau video gagal
  function wireVideo(wrap, video) {
    if (!video) return;
    wrap.classList.add('has-video');
    let timer = 0;
    const fail = () => { wrap.classList.add('video-failed'); wrap.classList.remove('is-playing'); clearTimeout(timer); };
    video.addEventListener('playing', () => { clearTimeout(timer); wrap.classList.add('is-playing'); });
    video.addEventListener('error', fail);
    video.addEventListener('stalled', () => { timer = setTimeout(fail, 8000); });
    video._tryPlay = () => {
      if (wrap.classList.contains('video-failed')) return;
      if (!video.src && video.dataset.src) video.src = video.dataset.src;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      clearTimeout(timer);
      timer = setTimeout(() => { if (!wrap.classList.contains('is-playing')) fail(); }, 9000);
    };
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  function renderCover() {
    $('#coverNames').innerHTML = `<span class="ln"><span>${esc(bride.nick)}</span></span><span class="ln amp"><span>&amp;</span></span><span class="ln"><span>${esc(groom.nick)}</span></span>`;
    $('#coverDateMono').textContent = first ? fmtDots(first) : '';
    $('#guestPrefix').textContent = C.guestPrefix || 'Kepada Yth.';
    $('#guestName').textContent = guestName || 'Tamu Undangan';
    document.title = `${names} — The Wedding`;
  }

  function renderHero() {
    const hv = C.heroVideo || {};
    $('#home').innerHTML = `
      <div class="hero__media" id="heroMedia">
        ${imgTag(hv.poster, { alt: names, seed: 0, ratio: '9/16', eager: true })}
        ${hv.src ? `<video muted playsinline loop preload="none" data-src="${esc(hv.src)}"></video>` : ''}
      </div>
      <div class="hero__shade"></div>
      <div class="hero__bars"></div>
      <div class="grain"></div>
      <div class="hero__hud mono"><span class="hero__rec">REC</span><span id="heroTc">00:00:00:00</span><span class="hero__fmt">4K · 24P</span></div>
      <div class="hero__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="hero__content">
        <p class="mono hero__kicker" data-hero>We're getting married</p>
        <h2 class="hero__title" data-hero-title>${words(bride.nick)}<br><em>&amp;</em> ${words(groom.nick)}</h2>
        <p class="hero__date" data-hero>${first ? esc(fmtLong(first)) : ''}</p>
        <div class="chips" data-hero>
          <a class="chip" href="#acara">${icon('i-cal')}Acara</a>
          <a class="chip" href="#acara" data-jump="map">${icon('i-pin')}Lokasi</a>
          <a class="chip" href="#galeri">${icon('i-img')}Galeri</a>
          <a class="chip" href="#rsvp">${icon('i-mail')}RSVP</a>
        </div>
      </div>
      <div class="hero__scroll" aria-hidden="true"></div>`;
    wireVideo($('#heroMedia'), $('#heroMedia video'));
  }

  function renderIntro() {
    const g = C.greeting || {};
    const v = C.verse || {};
    const initials = `${bride.nick[0]}<i>&amp;</i>${groom.nick[0]}`;
    const ringText = `${names} · ${first ? fmtDots(first) : ''} · ${C.couple.hashtag || ''} · `;
    $('#intro').innerHTML = `
      <p class="intro__salam" data-reveal>${esc(g.open)}</p>
      <p class="intro__text" data-reveal>${esc(g.text)}</p>
      ${v.text ? `
      <figure class="verse">
        <span class="verse__mark" aria-hidden="true">“</span>
        <blockquote class="verse__text" id="verseText">${esc(v.text).split(/\s+/).map((w) => `<span class="vw">${w}</span>`).join(' ')}</blockquote>
        <figcaption class="verse__src mono">${esc(v.source)}</figcaption>
      </figure>` : ''}
      <div class="monogram" data-reveal aria-hidden="true">
        <svg viewBox="0 0 112 112"><defs><path id="mono-c" d="M56,56 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs><text><textPath href="#mono-c">${esc(ringText + ringText)}</textPath></text></svg>
        <span>${initials}</span>
      </div>`;
    const m = `<span>${esc(bride.nick)} <i>&amp;</i> ${esc(groom.nick)} ${icon('i-spark')} Save the date ${icon('i-spark')} ${first ? fmtDots(first) : ''} ${icon('i-spark')}</span>`;
    $('#marquee').innerHTML = m.repeat(6);
  }

  const secHead = (idx, titleHtml, lead) => `
    <header class="sec-head">
      <div class="sec-head__idx mono" data-reveal>${esc(idx)}</div>
      <h2 class="sec-title" data-split>${titleHtml}</h2>
      ${lead ? `<p class="sec-lead" data-reveal>${esc(lead)}</p>` : ''}
    </header>`;

  function renderCouple() {
    const person = (p, role, seed) => `
      <article class="person person--${role}">
        <div class="person__media" data-reveal><div class="holo-par">
          <div class="holo-card" data-tilt>
            <div class="holo-card__img">${imgTag(p.photo, { alt: p.full, seed, ratio: '3/4' })}</div>
            <div class="holo-card__sheen"></div>
            <div class="holo-card__glare"></div>
            <span class="holo-card__tag mono">${role === 'bride' ? 'The Bride' : 'The Groom'}</span>
            <span class="holo-card__nick">${esc(p.nick)}</span>
          </div>
        </div></div>
        <h3 class="person__name" data-reveal>${esc(p.full)}</h3>
        <p class="person__parents" data-reveal>${esc(p.parents)}</p>
        ${p.instagram ? `<a class="person__ig" data-reveal href="https://instagram.com/${esc(p.instagram)}" target="_blank" rel="noopener">${icon('i-ig')}@${esc(p.instagram)}</a>` : ''}
      </article>`;
    $('#mempelai').innerHTML = `
      ${secHead('01 — Mempelai', `${words('The')} <em>${words('Couple')}</em>`, 'Dua orang biasa dengan satu cerita yang ingin kami rayakan bersama kamu.')}
      <div class="couple__grid">
        ${person(bride, 'bride', 1)}
        <div class="couple__amp" data-reveal aria-hidden="true">&amp;</div>
        ${person(groom, 'groom', 2)}
      </div>`;
  }

  function renderStory() {
    const S = C.story || [];
    const handle = `${bride.nick}.${groom.nick}`.toLowerCase();
    $('#cerita-story').innerHTML = `
      ${secHead('02 — Cerita Kami', `${words('Our')} <em>${words('Story')}</em>`, 'Tap kanan untuk lanjut, tap kiri untuk kembali, tahan untuk jeda.')}
      <div class="highlights" data-reveal>
        ${S.map((s, i) => `<button class="hl" type="button" data-story="${i}"><span class="hl__ring"><span>${imgTag(s.photo, { alt: s.title, seed: 10 + i, ratio: '1/1' })}</span></span>${esc(s.year)}</button>`).join('')}
      </div>
      <div class="story-player" id="storyPlayer" data-reveal>
        ${S.map((s, i) => `<div class="story-player__slide" data-i="${i}">${imgTag(s.photo, { alt: s.title, seed: 10 + i, ratio: '9/16' })}</div>`).join('')}
        <div class="story-player__shade"></div>
        <div class="story-player__bars">${S.map(() => '<span><b></b></span>').join('')}</div>
        <div class="story-player__head">
          <span class="story-player__avatar">${esc(bride.nick[0])}${esc(groom.nick[0])}</span>
          <span><b>${esc(handle)}</b> <small id="storyAgo"></small></span>
          <button class="icon-btn" type="button" id="storyToggle" aria-label="Jeda">${icon('i-pause')}</button>
        </div>
        <div class="story-player__cap" id="storyCap" aria-live="polite"></div>
        <div class="story-player__tap story-player__tap--l" data-dir="-1" aria-hidden="true"></div>
        <div class="story-player__tap story-player__tap--r" data-dir="1" aria-hidden="true"></div>
      </div>
      <p class="story-hint mono">${S.length} chapters · ${esc(C.couple.hashtag || '')}</p>`;
  }

  // ---------- Journey 3D (scroll-driven) ----------
  // Dipakai bila perangkat mendukung WebGL & pengguna tidak meminta "reduce motion".
  // Kalau tidak, bagian Cerita tampil sebagai story player biasa.
  const journeyMode = (() => {
    if (reduceMotion || params.has('nojourney')) return false;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  })();

  function renderJourney() {
    const S = C.story || [];
    const sec = $('#cerita');
    const story = $('#cerita-story');
    if (!journeyMode || !S.length) {
      sec.remove();
      story.hidden = false;
      story.id = 'cerita';
      return;
    }
    story.hidden = true;
    sec.dataset.mode = 'journey';
    const us = S.map((_, i) => (S.length > 1 ? 0.12 + (i * 0.56) / (S.length - 1) : 0.4));
    sec.innerHTML = `
      <div class="journey__sticky">
        <div class="journey__canvas"></div>
        <div class="journey__vignette"></div>
        <div class="grain"></div>
        <div class="journey__hud">
          <span class="mono">02 — Cerita Kami</span>
          <div class="journey__track"><i class="journey__bar"></i>${us.map((u, i) => `<b style="left:${(u * 100).toFixed(1)}%"><span class="mono">${esc(S[i].year)}</span></b>`).join('')}</div>
        </div>
        <div class="journey__intro">
          <p class="mono">Chapter 02</p>
          <h2 class="journey__title">Our <em>Journey</em></h2>
          <p class="journey__lead">Scroll pelan-pelan. Kami ajak kamu menyusuri cerita kami, dari ${esc(S[0].year)} sampai hari ini.</p>
          <span class="journey__scroll mono"><i></i>Scroll</span>
        </div>
        <div class="journey__caps">
          ${S.map((s, i) => `
            <article class="journey__cap" data-u="${us[i].toFixed(4)}">
              <span class="journey__year mono">● ${esc(s.year)} · Bab ${i + 1}</span>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.text)}</p>
            </article>`).join('')}
        </div>
        <div class="journey__end">
          <p class="mono">…dan babak berikutnya dimulai</p>
          <h3>${first ? fmtDots(first) : ''}</h3>
          <p class="journey__names">${esc(names)}</p>
        </div>
      </div>`;
    // Kalau modul 3D gagal (mis. dibuka via file:// atau GPU bermasalah) → pakai story player.
    const fallback = () => {
      if (!sec.isConnected) return;
      sec.remove();
      story.hidden = false;
      story.id = 'cerita';
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    window.addEventListener('journey:fail', fallback);
    window.addEventListener('load', () => setTimeout(() => { if (!window.RingScene) fallback(); }, 2500));
  }

  function renderCountdown() {
    const p = first;
    let cal = '';
    if (p) {
      const firstDow = new Date(Date.UTC(p.y, p.mo - 1, 1)).getUTCDay();
      const days = new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate();
      const cells = [];
      ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].forEach((d) => cells.push(`<span class="dow">${d}</span>`));
      for (let i = 0; i < firstDow; i++) cells.push('<span class="d muted">·</span>');
      for (let d = 1; d <= days; d++) {
        if (d === p.d) cells.push(`<span class="d is-day">${d}<svg viewBox="0 0 50 44" aria-hidden="true"><path d="M27 4C13 3 3 11 4 22c1 12 14 18 25 17 12-1 18-9 17-18C45 11 36 5 24 6 17 7 12 10 10 13"/></svg></span>`);
        else cells.push(`<span class="d">${d}</span>`);
      }
      cal = `
        <div class="cal" id="cal" data-reveal>
          <div class="cal__head"><span class="cal__month">${MONTHS[p.mo - 1]} <em>${p.y}</em></span><span class="mono">${esc(DAYS[p.dow])}</span></div>
          <div class="cal__grid">${cells.join('')}</div>
          <div class="cal__actions">
            <a class="btn btn--ink btn--sm" id="gcalBtn" target="_blank" rel="noopener">${icon('i-cal')}Google Calendar</a>
            <button class="btn btn--line btn--sm" type="button" id="icsBtn">${icon('i-download')}File .ics</button>
          </div>
        </div>`;
    }
    $('#hitung').innerHTML = `
      ${secHead('03 — Save the Date', `${words('Menuju')} <em>${words('hari H')}</em>`)}
      <div class="count" id="count" data-reveal>
        ${['Hari', 'Jam', 'Menit', 'Detik'].map((l, i) => `<div class="count__cell"><span class="count__num" data-k="${i}"><span>00</span></span><span class="count__lbl mono">${l}</span></div>`).join('')}
      </div>
      ${cal}`;
  }

  function barcode(seed) {
    let x = 0, bars = '';
    let s = seed * 7 + 3;
    while (x < 150) {
      s = (s * 9301 + 49297) % 233280;
      const w = 1 + (s % 4);
      bars += `<rect x="${x}" y="0" width="${w}" height="34"/>`;
      x += w + 1 + ((s >> 3) % 3);
    }
    return `<svg class="barcode" viewBox="0 0 150 34" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">${bars}</svg>`;
  }

  function renderEvents() {
    const tz = C.timezoneLabel || '';
    const tickets = events.map((ev, i) => {
      const s = parts(ev.start), e = parts(ev.end);
      const [t1, ...rest] = ev.title.split(' ');
      return `
      <article class="ticket ticket--${esc(ev.id)}" data-reveal>
        <div class="ticket__top">
          <div class="ticket__row mono"><span class="ticket__badge">${icon('i-spark')}${pad2(i + 1)} / ${pad2(events.length)}</span><span>${s ? fmtDots(s) : ''}</span></div>
          <h3 class="ticket__title">${esc(t1)}${rest.length ? ` <em>${esc(rest.join(' '))}</em>` : ''}</h3>
          <p class="ticket__date">${s ? esc(fmtLong(s)) : ''}</p>
          <div class="ticket__time"><b>${s ? `${s.hh}.${s.mm}` : ''}${e ? ` – ${e.hh}.${e.mm}` : ''}</b><span class="mono">${esc(tz)}</span></div>
        </div>
        <div class="ticket__tear" aria-hidden="true"></div>
        <div class="ticket__bottom">
          <p class="ticket__venue">${esc(ev.venue)}</p>
          <p class="ticket__addr">${esc(ev.address)}</p>
          ${ev.note ? `<p class="ticket__note">${icon('i-heart')}${esc(ev.note)}</p>` : ''}
          <div class="ticket__foot">
            ${barcode(i + 3)}
            <a class="btn btn--ink btn--sm" href="${esc(ev.maps)}" target="_blank" rel="noopener">${icon('i-pin')}Petunjuk arah</a>
          </div>
        </div>
      </article>`;
    }).join('');
    const dc = C.dressCode;
    const ls = C.livestream;
    $('#acara').innerHTML = `
      ${secHead('04 — Acara', `${words('The')} <em>${words('Day')}</em>`, 'Simpan tiketmu. Lokasi lengkap ada di bawah.')}
      <div class="tickets">${tickets}</div>
      <div class="map" id="map" data-reveal>
        <div class="map__load">
          <span class="pin">${icon('i-pin')}</span>
          <strong>${esc(C.mapQuery || '')}</strong>
          <button class="btn btn--line btn--sm" type="button" id="mapBtn">Tampilkan peta</button>
        </div>
      </div>
      ${dc ? `
      <div class="dress" data-reveal>
        <span class="mono" style="color:rgba(251,245,236,.55)">Dress code</span>
        <h3 class="dress__title">${esc(dc.title)}</h3>
        <div class="swatches">${(dc.colors || []).map((c) => `<span style="background:${esc(c)}"></span>`).join('')}</div>
        <p class="dress__note">${esc(dc.note)}</p>
      </div>` : ''}
      ${ls && ls.enabled ? `<a class="live" data-reveal href="${esc(ls.url)}" target="_blank" rel="noopener"><span class="live__dot">${icon('i-live')}</span><span><b>${esc(ls.label)}</b><small>Untuk yang berhalangan hadir</small></span>${icon('i-arrow')}</a>` : ''}`;
  }

  const galleryItems = (C.gallery || []).map((g, i) => ({ ...g, seed: 20 + i }));

  function renderGallery() {
    const photos = galleryItems.filter((g) => g.type === 'photo').slice(0, 10);
    const reel = C.reel || {};
    const stamp = (d) => {
      const p = parts(d);
      return p ? `'${String(p.y).slice(2)} ${pad2(p.mo)} ${pad2(p.d)}` : '';
    };
    $('#galeri').innerHTML = `
      ${secHead('05 — Galeri', `${words('Our')} <em>${words('Moments')}</em>`, 'Putar carousel 3D, tonton reel, atau buka satu per satu.')}
      <div class="carousel" id="carousel" data-reveal>
        <div class="carousel__floor"></div>
        <div class="carousel__ring" id="carouselRing">
          ${photos.map((p) => `<div class="carousel__card" data-gi="${galleryItems.indexOf(p)}">${imgTag(p.src, { alt: p.alt, seed: p.seed, ratio: '5/7' })}<i class="shade"></i></div>`).join('')}
        </div>
        <p class="carousel__hint mono">← geser untuk memutar →</p>
      </div>
      <div class="reel" data-reveal>
        <div class="reel__card" id="reelCard">
          ${imgTag(reel.poster, { alt: reel.title, seed: 7, ratio: '9/16' })}
          ${reel.src ? `<video muted playsinline loop preload="none" data-src="${esc(reel.src)}"></video>` : ''}
          <span class="reel__tag mono">${icon('i-play')}Reel</span>
          <div class="reel__ui">
            <span><b>${esc(reel.title || 'Our Reel')}</b><small class="mono">${esc(C.couple.hashtag || '')}</small></span>
            <button class="icon-btn" type="button" id="reelSound" aria-label="Nyalakan suara">${icon('i-mute')}</button>
          </div>
        </div>
      </div>
      <div class="filters" role="tablist" aria-label="Filter galeri">
        <button class="filter is-active" type="button" data-filter="all">Semua · ${galleryItems.length}</button>
        <button class="filter" type="button" data-filter="photo">Foto</button>
        <button class="filter" type="button" data-filter="video">Video</button>
      </div>
      <div class="masonry" id="masonry">
        ${galleryItems.map((g, i) => `
          <button class="m-item" type="button" data-gi="${i}" data-type="${g.type}" style="aspect-ratio:${esc(g.ratio || '3/4')}" aria-label="${esc(g.alt || 'Buka')}" data-reveal>
            ${imgTag(g.type === 'video' ? g.poster : g.src, { alt: g.alt, seed: g.seed, ratio: g.ratio || '3/4' })}
            ${g.type === 'video' ? `<span class="m-item__dur">VIDEO</span><span class="m-item__play">${icon('i-play')}</span>` : ''}
            ${g.date ? `<span class="m-item__stamp">${stamp(g.date)}</span>` : ''}
          </button>`).join('')}
      </div>`;
    wireVideo($('#reelCard'), $('#reelCard video'));
  }

  function renderRsvp() {
    const R = C.rsvp || {};
    const dl = parts(R.deadline);
    $('#rsvp').innerHTML = `
      ${secHead('06 — RSVP', `${words('Kamu')} <em>${words('datang?')}</em>`, 'Bantu kami menyiapkan tempat terbaik untukmu.')}
      <div data-reveal>
        <form class="rsvp-card" id="rsvpForm" novalidate>
          <div class="field">
            <label for="fName">Nama</label>
            <input class="input" id="fName" name="name" maxlength="60" autocomplete="name" placeholder="Nama kamu" required value="${esc(guestName)}">
          </div>
          <div class="field">
            <span class="lbl" id="attLbl">Kehadiran</span>
            <div class="seg" role="radiogroup" aria-labelledby="attLbl">
              <input type="radio" name="attend" id="aYes" value="hadir" checked><label for="aYes">Hadir 🥂</label>
              <input type="radio" name="attend" id="aNo" value="tidak"><label for="aNo">Tidak hadir</label>
              <input type="radio" name="attend" id="aMaybe" value="ragu"><label for="aMaybe">Belum pasti</label>
            </div>
          </div>
          <div class="field" id="countField">
            <span class="lbl">Jumlah tamu</span>
            <div class="stepper">
              <button type="button" data-step="-1" aria-label="Kurangi">−</button>
              <output id="fCount" aria-live="polite">1</output>
              <button type="button" data-step="1" aria-label="Tambah">+</button>
            </div>
          </div>
          <div class="field">
            <label for="fMsg">Ucapan & doa</label>
            <textarea class="input" id="fMsg" name="message" maxlength="400" placeholder="Tulis ucapan terbaikmu…"></textarea>
          </div>
          <div class="rsvp__actions">
            <button class="btn btn--ink" type="submit">${icon('i-mail')}Kirim RSVP</button>
            ${R.whatsapp ? `<a class="btn btn--line" id="waBtn" href="#" target="_blank" rel="noopener">${icon('i-wa')}Konfirmasi via WhatsApp</a>` : ''}
          </div>
          ${dl ? `<p class="rsvp__deadline">Mohon konfirmasi sebelum ${dl.d} ${MONTHS[dl.mo - 1]} ${dl.y}</p>` : ''}
        </form>
      </div>
      <div class="stats" data-reveal>
        <div class="stat"><b id="stHadir">0</b><span>Hadir</span></div>
        <div class="stat"><b id="stRagu">0</b><span>Belum pasti</span></div>
        <div class="stat"><b id="stTidak">0</b><span>Berhalangan</span></div>
      </div>
      <div class="wishes" id="wishes" aria-live="polite"></div>`;
  }

  function renderGift() {
    const G = C.gifts || {};
    const fmtNum = (n) => String(n).replace(/(\d{4})(?=\d)/g, '$1 ');
    $('#hadiah').innerHTML = `
      ${secHead('07 — Amplop Digital', `${words('Wedding')} <em>${words('Gift')}</em>`, G.note)}
      <div class="bank-cards">
        ${(G.accounts || []).map((a, i) => `
          <div class="bank-wrap" data-reveal><div class="bank ${i % 2 ? 'bank--2' : ''}" data-tilt>
            <div class="bank__top"><span class="bank__name">${esc(a.bank)}</span><span class="mono" style="opacity:.6">Debit</span></div>
            <span class="bank__chip"></span>
            <div class="bank__bottom">
              <div><div class="bank__num">${esc(fmtNum(a.number))}</div><div class="bank__holder">a.n. ${esc(a.name)}</div></div>
              <button class="btn btn--sm" type="button" data-copy="${esc(a.number)}" data-copy-msg="Nomor rekening ${esc(a.bank)} disalin">${icon('i-copy')}Salin</button>
            </div>
          </div></div>`).join('')}
      </div>
      ${G.address ? `
      <div class="gift-addr" data-reveal>
        <span class="mono" style="color:var(--ink-3)">${esc(G.address.label)}</span>
        <b>${esc(G.address.name)}</b>
        <p>${esc(G.address.text)}</p>
        <button class="btn btn--line btn--sm" type="button" data-copy="${esc(`${G.address.name}, ${G.address.text}`)}" data-copy-msg="Alamat disalin">${icon('i-copy')}Salin alamat</button>
      </div>` : ''}`;
  }

  function renderClosing() {
    const g = C.greeting || {};
    $('#penutup').innerHTML = `
      <div class="closing__scene" id="closingScene"></div>
      <div class="grain"></div>
      <div class="closing__content">
        <h2 class="closing__thanks" data-split>${words('Terima')} <em>${words('kasih')}</em></h2>
        <p class="closing__text" data-reveal>${esc(C.closing && C.closing.text)}</p>
        <p class="closing__salam" data-reveal>${esc(g.close)}</p>
        <p class="closing__names" data-reveal>${esc(names)}</p>
        ${C.couple.hashtag ? `<button class="chip" type="button" data-reveal data-copy="${esc(C.couple.hashtag)}" data-copy-msg="Hashtag disalin — pakai di postinganmu ya!">${icon('i-spark')}${esc(C.couple.hashtag)}</button>` : ''}
      </div>
      <p class="closing__foot mono">Made with love · ${first ? first.y : ''}</p>`;
  }

  function renderDock() {
    const items = [['home', 'i-home', 'Beranda'], ['mempelai', 'i-heart', 'Mempelai'], ['cerita', 'i-story', 'Cerita'], ['acara', 'i-cal', 'Acara'], ['galeri', 'i-img', 'Galeri'], ['rsvp', 'i-mail', 'RSVP'], ['hadiah', 'i-gift', 'Hadiah']];
    $('#dock').innerHTML = items.map(([id, ic, l]) => `<a href="#${id}" data-sec="${id}" aria-label="${l}" title="${l}">${icon(ic)}</a>`).join('');
  }

  function renderStage() {
    const pics = [C.heroVideo && C.heroVideo.poster, ...galleryItems.filter((g) => g.type === 'photo').slice(0, 4).map((g) => g.src)];
    $('#stageSlides').innerHTML = pics.map((s, i) => imgTag(s, { alt: '', seed: 40 + i, ratio: '16/10' })).join('');
    $('#stageNames').innerHTML = `${esc(bride.nick)}<br><em>&amp;</em> ${esc(groom.nick)}`;
    $('#stageDate').textContent = first ? fmtLong(first) : '';
  }

  // ------------------------------------------------------------------
  // BEHAVIOUR
  // ------------------------------------------------------------------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-in'), 2400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function initCopy() {
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      const ok = await copyText(b.dataset.copy);
      toast(ok ? (b.dataset.copyMsg || 'Disalin') : 'Gagal menyalin, salin manual ya');
    });
  }

  // ---------- Tilt 3D (kartu holo & kartu bank) ----------
  function initTilt() {
    $$('[data-tilt]').forEach((el) => {
      const isBank = el.classList.contains('bank');
      const max = isBank ? 7 : 14;
      const set = (px, py) => {
        el.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
        el.style.setProperty('--ry', `${(px - 0.5) * max * 1.2}deg`);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
        el.style.setProperty('--o', '1');
      };
      el.addEventListener('pointermove', (e) => {
        // jangan miring saat jari men-scroll, atau saat kursor di atas tombol (agar mudah diklik)
        if (e.pointerType === 'touch' || e.target.closest('button, a')) return;
        const r = el.getBoundingClientRect();
        el.classList.add('is-tilting');
        set(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--o', '0');
      });
    });
    // Di ponsel: kartu ikut miring mengikuti gerakan HP (jika sensor tersedia tanpa izin)
    let ticking = false;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const px = clamp(0.5 + e.gamma / 60, 0, 1), py = clamp(0.5 + (e.beta - 45) / 80, 0, 1);
        $$('[data-tilt]').forEach((el) => {
          if (el.classList.contains('is-tilting')) return;
          el.style.setProperty('--mx', `${px * 100}%`);
          el.style.setProperty('--my', `${py * 100}%`);
          el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
          el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
        });
      });
    });
  }

  // ---------- Story player ----------
  function initStory() {
    const root = $('#storyPlayer');
    if (!root) return;
    const S = C.story || [];
    const slides = $$('.story-player__slide', root);
    const bars = $$('.story-player__bars b', root);
    const hls = $$('.hl');
    const cap = $('#storyCap');
    const toggle = $('#storyToggle');
    const DUR = 5500;
    let i = 0, elapsed = 0, visible = false, paused = false, holding = false, last = 0, raf = 0;

    const show = (n) => {
      i = (n + S.length) % S.length;
      elapsed = 0;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        // restart animasi zoom
        if (k === i) { const im = s.querySelector('img'); im.style.animation = 'none'; void im.offsetWidth; im.style.animation = ''; }
      });
      bars.forEach((b, k) => { b.style.transform = `scaleX(${k < i ? 1 : 0})`; });
      hls.forEach((h, k) => { h.classList.toggle('is-active', k === i); if (k <= i) h.classList.add('is-seen'); });
      const s = S[i];
      cap.innerHTML = `<div class="story-player__year">● ${esc(s.year)}</div><h3 class="story-player__title">${esc(s.title)}</h3><p class="story-player__text">${esc(s.text)}</p>`;
      if (hasGsap() && !reduceMotion) gsap.fromTo(cap.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: 'power3.out' });
      const years = new Date().getFullYear() - parseInt(s.year, 10);
      $('#storyAgo').textContent = years > 0 ? `${years} th` : 'sekarang';
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      if (!visible || paused || holding) return;
      elapsed += dt;
      bars[i].style.transform = `scaleX(${Math.min(1, elapsed / DUR)})`;
      if (elapsed >= DUR) show(i + 1);
    };
    const setPaused = (p) => {
      paused = p;
      toggle.innerHTML = icon(p ? 'i-play' : 'i-pause');
      toggle.setAttribute('aria-label', p ? 'Putar' : 'Jeda');
    };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); setPaused(!paused); });

    let downAt = 0, downX = 0;
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      downAt = performance.now();
      downX = e.clientX;
      holding = true;
    });
    root.addEventListener('pointerup', (e) => {
      if (!holding) return;
      holding = false;
      const held = performance.now() - downAt;
      if (held > 280 || Math.abs(e.clientX - downX) > 30) return;
      const r = root.getBoundingClientRect();
      show(e.clientX - r.left < r.width * 0.35 ? i - 1 : i + 1);
    });
    root.addEventListener('pointercancel', () => { holding = false; });
    root.addEventListener('pointerleave', () => { holding = false; });
    hls.forEach((h) => h.addEventListener('click', () => show(+h.dataset.story)));
    document.addEventListener('keydown', (e) => {
      if (!visible || $('#lightbox').classList.contains('is-open')) return;
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.35 }).observe(root);
    show(0);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // ---------- Countdown ----------
  function initCountdown() {
    const nums = $$('#count .count__num');
    const stage = $('#stageCount');
    const prev = [];
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const vals = [d, h, m, s].map((v, k) => (k === 0 ? String(v).padStart(2, '0') : pad2(v)));
      nums.forEach((n, k) => {
        if (prev[k] === vals[k]) return;
        prev[k] = vals[k];
        n.innerHTML = `<span>${vals[k]}</span>`;
        if (!reduceMotion) { n.classList.remove('tick'); void n.offsetWidth; n.classList.add('tick'); }
      });
      if (stage) stage.innerHTML = `<span><b>${vals[0]}</b>Hari</span><span><b>${vals[1]}</b>Jam</span><span><b>${vals[2]}</b>Menit</span><span><b>${vals[3]}</b>Detik</span>`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Kalender (Google Calendar & .ics) ----------
  function initCalendar() {
    if (!events.length) return;
    const z = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const firstE = events[0], lastE = events[events.length - 1];
    const title = `Pernikahan ${names}`;
    const details = events.map((e) => `${e.title}: ${parts(e.start).hh}.${parts(e.start).mm} ${C.timezoneLabel || ''} — ${e.venue}`).join('\n');
    const gcal = new URL('https://calendar.google.com/calendar/render');
    gcal.searchParams.set('action', 'TEMPLATE');
    gcal.searchParams.set('text', title);
    gcal.searchParams.set('dates', `${z(firstE.start)}/${z(lastE.end || lastE.start)}`);
    gcal.searchParams.set('details', `${details}\n\n${location.href.split('#')[0]}`);
    gcal.searchParams.set('location', `${lastE.venue}, ${lastE.address}`);
    const gb = $('#gcalBtn');
    if (gb) gb.href = gcal.toString();

    const icsEsc = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const ics = () => {
      const now = z(new Date().toISOString());
      const body = events.map((e, k) => [
        'BEGIN:VEVENT',
        `UID:${z(e.start)}-${k}@undangan`,
        `DTSTAMP:${now}`,
        `DTSTART:${z(e.start)}`,
        `DTEND:${z(e.end || e.start)}`,
        `SUMMARY:${icsEsc(`${e.title} — ${names}`)}`,
        `LOCATION:${icsEsc(`${e.venue}, ${e.address}`)}`,
        `DESCRIPTION:${icsEsc(e.note || title)}`,
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`Besok: ${e.title} ${names}`)}`, 'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')).join('\r\n');
      return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Undangan Digital//ID\r\nCALSCALE:GREGORIAN\r\n${body}\r\nEND:VCALENDAR\r\n`;
    };
    const ib = $('#icsBtn');
    if (ib) ib.addEventListener('click', () => {
      const blob = new Blob([ics()], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${bride.nick}-${groom.nick}-wedding.ics`.toLowerCase();
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('File kalender diunduh');
    });
  }

  // ---------- Peta (dimuat saat diminta agar halaman ringan) ----------
  function initMap() {
    const wrap = $('#map');
    if (!wrap) return;
    const load = () => {
      if (wrap.querySelector('iframe')) return;
      const f = document.createElement('iframe');
      f.src = `https://www.google.com/maps?q=${encodeURIComponent(C.mapQuery || '')}&output=embed`;
      f.loading = 'lazy';
      f.title = 'Peta lokasi';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.addEventListener('load', () => { const l = wrap.querySelector('.map__load'); if (l) l.remove(); });
      wrap.appendChild(f);
    };
    $('#mapBtn').addEventListener('click', load);
    new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { load(); obs.disconnect(); } }, { rootMargin: '200px' }).observe(wrap);
  }

  // ---------- Carousel 3D ----------
  function initCarousel() {
    const wrap = $('#carousel'), ring = $('#carouselRing');
    if (!wrap || !ring) return;
    const cards = $$('.carousel__card', ring);
    const n = cards.length;
    if (!n) return;
    const step = 360 / n;
    const radius = Math.round((150 + 22) / (2 * Math.tan(Math.PI / n)));
    cards.forEach((c, k) => { c.style.transform = `rotateY(${k * step}deg) translateZ(${radius}px)`; });
    let rot = 0, vel = 0, dragging = false, lastX = 0, moved = 0, visible = false, raf = 0;
    const auto = reduceMotion ? 0 : -0.12;
    const render = () => {
      ring.style.transform = `translateZ(${-radius}px) rotateX(-7deg) rotateY(${rot}deg)`;
      cards.forEach((c, k) => {
        const a = ((k * step + rot) * Math.PI) / 180;
        const facing = Math.cos(a); // 1 = menghadap depan
        c.querySelector('.shade').style.opacity = String(clamp(0.72 - (facing + 1) * 0.36, 0, 0.72));
        c.style.zIndex = String(Math.round((facing + 1) * 50));
      });
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (!dragging) {
        vel *= 0.94;
        rot += vel + (Math.abs(vel) < 0.2 ? auto : 0);
      }
      render();
    };
    wrap.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; moved = 0; vel = 0;
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      rot += dx * 0.3;
      vel = dx * 0.3;
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const card = el && el.closest('.carousel__card');
        if (card) Lightbox.open(+card.dataset.gi);
      }
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', () => { dragging = false; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(wrap);
    render();
    raf = requestAnimationFrame(loop);
  }

  // ---------- Reel ----------
  function initReel() {
    const card = $('#reelCard');
    if (!card) return;
    const v = card.querySelector('video');
    const btn = $('#reelSound');
    if (!v) { btn.remove(); return; }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) v._tryPlay && v._tryPlay();
      else v.pause();
    }, { threshold: 0.4 }).observe(card);
    btn.addEventListener('click', () => {
      if (card.classList.contains('video-failed')) { toast('Video belum tersedia'); return; }
      v.muted = !v.muted;
      btn.innerHTML = icon(v.muted ? 'i-mute' : 'i-sound');
      btn.setAttribute('aria-label', v.muted ? 'Nyalakan suara' : 'Matikan suara');
      if (!v.muted && window.WeddingMusic && WeddingMusic.playing) { WeddingMusic.pause(); syncMusic(); }
    });
  }

  // ---------- Galeri & filter ----------
  function initGallery() {
    $$('.filter').forEach((f) => f.addEventListener('click', () => {
      $$('.filter').forEach((x) => x.classList.toggle('is-active', x === f));
      const type = f.dataset.filter;
      $$('.m-item').forEach((m) => m.classList.toggle('is-hidden', type !== 'all' && m.dataset.type !== type));
      if (hasGsap()) {
        const vis = $$('.m-item:not(.is-hidden)');
        gsap.fromTo(vis, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.5, ease: 'power2.out' });
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }
    }));
    $('#masonry').addEventListener('click', (e) => {
      const it = e.target.closest('.m-item');
      if (it) Lightbox.open(+it.dataset.gi);
    });
  }

  // ---------- Lightbox ----------
  const Lightbox = (() => {
    const box = $('#lightbox');
    const stage = $('#lbStage');
    let idx = 0, list = [], lastFocus = null;
    const media = (g) => {
      if (g.type === 'video') {
        return `<div class="lightbox__slide"><video src="${esc(g.src)}" poster="${esc(g.poster || '')}" controls playsinline autoplay></video></div>`;
      }
      return `<div class="lightbox__slide">${imgTag(g.src, { alt: g.alt, seed: g.seed, ratio: g.ratio || '3/4', eager: true })}</div>`;
    };
    const renderSlide = (dir = 0) => {
      const g = list[idx];
      const old = stage.querySelector('.lightbox__slide');
      stage.insertAdjacentHTML('beforeend', media(g));
      const cur = stage.lastElementChild;
      const v = cur.querySelector('video');
      if (v) {
        v.addEventListener('error', () => {
          cur.innerHTML = `${imgTag(g.poster, { alt: g.alt, seed: g.seed, ratio: g.ratio || '9/16' })}`;
          toast('Video placeholder belum bisa diputar');
        });
        if (window.WeddingMusic && WeddingMusic.playing) { WeddingMusic.pause(); syncMusic(); }
      }
      $('#lbCount').textContent = `${pad2(idx + 1)} / ${pad2(list.length)}`;
      $('#lbCap').textContent = g.alt || '';
      if (old) {
        if (hasGsap() && dir) {
          gsap.fromTo(cur, { xPercent: dir * 100, opacity: 0.4 }, { xPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out' });
          gsap.to(old, { xPercent: -dir * 60, opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: () => old.remove() });
        } else old.remove();
      } else if (hasGsap()) {
        gsap.fromTo(cur, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
      }
    };
    const go = (d) => { idx = (idx + d + list.length) % list.length; renderSlide(d); };
    const open = (gi) => {
      list = galleryItems;
      idx = clamp(gi, 0, list.length - 1);
      lastFocus = document.activeElement;
      stage.innerHTML = '';
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      renderSlide(0);
      $('#lbClose').focus();
    };
    const close = () => {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { box.hidden = true; stage.innerHTML = ''; }, 350);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => go(-1));
    $('#lbNext').addEventListener('click', () => go(1));
    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    });
    // swipe
    let sx = 0, sy = 0, dx = 0, active = false;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('video')) return;
      active = true; sx = e.clientX; sy = e.clientY; dx = 0;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!active) return;
      dx = e.clientX - sx;
      const cur = stage.lastElementChild;
      if (cur) cur.style.transform = `translateX(${dx}px)`;
    });
    const up = (e) => {
      if (!active) return;
      active = false;
      const dy = e.clientY - sy;
      const cur = stage.lastElementChild;
      if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      else if (dy > 110) close();
      else if (cur) { cur.style.transition = 'transform .3s'; cur.style.transform = ''; setTimeout(() => { cur.style.transition = ''; }, 300); }
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    return { open, close };
  })();

  // ---------- RSVP & ucapan ----------
  const WISH_KEY = 'undangan-wishes-v1';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch (e) { return []; } },
    add(w) { try { const a = store.get(); a.unshift(w); localStorage.setItem(WISH_KEY, JSON.stringify(a.slice(0, 50))); } catch (e) { /* abaikan */ } },
  };
  const AV = ['#5a1627', '#5f6136', '#2c1623', '#8a5a2b', '#3e4a5c', '#7c2439'];
  const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const ago = (iso) => {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'baru saja';
    if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
    if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} hari lalu`;
    const d = new Date(t);
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };
  const BADGE = { hadir: 'Hadir', tidak: 'Berhalangan', ragu: 'Belum pasti' };
  let wishes = [];

  function wishHtml(w, isNew) {
    const n = String(w.name || 'Tamu');
    return `<article class="wish${isNew ? ' is-new' : ''}">
      <span class="wish__av" style="background:${AV[hash(n) % AV.length]}">${esc(n.trim()[0] || '?').toUpperCase()}</span>
      <div>
        <div class="wish__head"><b>${esc(n)}</b><span class="wish__badge ${esc(w.attend)}">${BADGE[w.attend] || ''}</span><span class="wish__time">${esc(ago(w.time))}</span></div>
        ${w.message ? `<p>${esc(w.message)}</p>` : ''}
      </div>
    </article>`;
  }
  function renderWishes() {
    const box = $('#wishes');
    box.innerHTML = wishes.map((w) => wishHtml(w)).join('');
    const count = (a) => wishes.filter((w) => w.attend === a).reduce((s, w) => s + (a === 'hadir' ? +w.count || 1 : 1), 0);
    $('#stHadir').textContent = count('hadir');
    $('#stRagu').textContent = count('ragu');
    $('#stTidak').textContent = count('tidak');
  }
  async function loadWishes() {
    const R = C.rsvp || {};
    const local = store.get();
    let remote = null;
    if (R.endpoint) {
      try {
        const res = await fetch(`${R.endpoint}${R.endpoint.includes('?') ? '&' : '?'}action=list`);
        remote = await res.json();
        if (!Array.isArray(remote)) remote = null;
      } catch (e) { remote = null; }
    }
    const base = remote || (C.wishesSeed || []).map((w) => ({ count: 2, ...w }));
    // gabungkan ucapan lokal yang belum ada di server
    const key = (w) => `${w.name}|${w.message}`;
    const seen = new Set(base.map(key));
    wishes = [...local.filter((w) => !seen.has(key(w))), ...base];
    renderWishes();
  }

  function initRsvp() {
    const form = $('#rsvpForm');
    if (!form) return;
    const R = C.rsvp || {};
    let count = 1;
    const out = $('#fCount');
    const countField = $('#countField');
    const wa = $('#waBtn');
    const F = form.elements;
    const current = () => ({
      name: F.namedItem('name').value.trim(),
      attend: F.namedItem('attend').value,
      count: F.namedItem('attend').value === 'hadir' ? count : 0,
      message: F.namedItem('message').value.trim(),
    });
    const waHref = () => {
      const d = current();
      const txt = `Halo ${names}! Saya ${d.name || '(nama)'} ${d.attend === 'hadir' ? `insyaAllah HADIR (${d.count} orang)` : d.attend === 'tidak' ? 'mohon maaf BERHALANGAN hadir' : 'BELUM PASTI bisa hadir'} di pernikahan kalian.${d.message ? `\n\n"${d.message}"` : ''}`;
      return `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(txt)}`;
    };
    const sync = () => {
      countField.style.display = current().attend === 'hadir' ? '' : 'none';
      if (wa) wa.href = waHref();
    };
    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => {
      count = clamp(count + +b.dataset.step, 1, R.maxGuests || 4);
      out.textContent = count;
      sync();
    }));
    sync();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = current();
      if (!d.name) {
        F.namedItem('name').focus();
        toast('Isi namamu dulu ya');
        return;
      }
      const w = { ...d, time: new Date().toISOString() };
      store.add(w);
      wishes.unshift(w);
      renderWishes();
      $('#wishes').firstElementChild?.classList.add('is-new');
      if (R.endpoint) {
        try {
          await fetch(R.endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ ...w, count: String(w.count) }) });
        } catch (err) { /* tetap tersimpan lokal */ }
      }
      const msg = d.attend === 'hadir' ? 'Sampai jumpa di hari H!' : d.attend === 'tidak' ? 'Terima kasih atas doanya.' : 'Kabari kami kalau sudah pasti ya.';
      const wrap = form.parentElement;
      const formHtml = form;
      wrap.innerHTML = `<div class="rsvp-card rsvp__done">
        <span class="mono" style="color:var(--ink-3)">RSVP terkirim</span>
        <h3>Makasih, <em>${esc(d.name.split(' ')[0])}</em>!</h3>
        <p>${esc(msg)}</p>
        ${R.whatsapp ? `<a class="btn btn--ink" href="${esc(waHref())}" target="_blank" rel="noopener">${icon('i-wa')}Kirim juga ke WhatsApp</a>` : ''}
        <p style="margin-top:14px"><button class="btn btn--line btn--sm" type="button" id="rsvpEdit">Ubah jawaban</button></p>
      </div>`;
      $('#rsvpEdit').addEventListener('click', () => { wrap.innerHTML = ''; wrap.appendChild(formHtml); sync(); });
      if (d.attend !== 'tidak') confetti();
    });
    loadWishes();
  }

  // ---------- Confetti ----------
  function confetti() {
    if (reduceMotion) return;
    const cv = $('#confetti');
    const g = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    g.scale(dpr, dpr);
    const colors = ['#5a1627', '#dcc39a', '#f3b8cd', '#c9c2ff', '#5f6136', '#fbf5ec', '#ff8a3d'];
    const P = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 15 - 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
      c: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() < 0.25 ? 'heart' : 'rect',
    }));
    const t0 = performance.now();
    const frame = (now) => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2.2));
        g.fillStyle = p.c;
        if (p.shape === 'heart') {
          g.scale(0.5, 0.5);
          g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -4, -6, -16, 0, -7); g.bezierCurveTo(6, -16, 14, -4, 0, 6); g.fill();
        } else {
          g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        }
        g.restore();
      });
      if (t < 3.4) requestAnimationFrame(frame); else g.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(frame);
  }

  // ---------- Musik ----------
  function syncMusic() {
    const b = $('#musicBtn');
    const on = !!(window.WeddingMusic && WeddingMusic.playing);
    b.classList.toggle('is-playing', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Matikan musik' : 'Putar musik');
  }
  function initMusic() {
    const b = $('#musicBtn');
    b.addEventListener('click', async () => {
      $('#musicTip').classList.remove('is-in');
      if (!window.WeddingMusic) return;
      await WeddingMusic.toggle();
      syncMusic();
      if (WeddingMusic.playing) toast(`♪ ${(C.music && C.music.title) || 'Musik diputar'}`);
    });
    document.addEventListener('music:change', syncMusic);
  }

  // ---------- Dock / navigasi ----------
  function initDock() {
    const links = $$('#dock a');
    const map = new Map(links.map((a) => [a.dataset.sec, a]));
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const t = en.target.id;
        const id = t === 'hitung' ? 'acara' : t === 'intro' ? 'home' : t === 'penutup' ? 'hadiah' : t === 'cerita-story' ? 'cerita' : t;
        const a = map.get(id);
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('#feed > section').forEach((s) => io.observe(s));
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = a.dataset.jump === 'map' ? $('#map') : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: a.dataset.jump === 'map' ? 'center' : 'start' });
    });
  }

  // ---------- Timecode kamera di hero ----------
  function initHud() {
    const tc = $('#heroTc');
    const t0 = performance.now();
    setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const f = Math.floor((t % 1) * 24);
      tc.textContent = `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor(t / 60) % 60)}:${pad2(Math.floor(t) % 60)}:${pad2(f)}`;
    }, 1000 / 12);
  }

  // ---------- Stage (desktop) slideshow ----------
  function initStage() {
    const imgs = $$('#stageSlides img');
    if (!imgs.length) return;
    let k = 0;
    imgs[0].classList.add('is-active');
    setInterval(() => {
      if (document.hidden || !matchMedia('(min-width: 1024px)').matches) return;
      imgs[k].classList.remove('is-active');
      k = (k + 1) % imgs.length;
      imgs[k].classList.add('is-active');
    }, 6500);
  }

  // ---------- 3D di penutup ----------
  function initClosingScene() {
    const host = $('#closingScene');
    if (!host) return;
    let inst = null;
    const mount = () => {
      if (inst || !window.RingScene || !window.RingScene.createRings) return;
      try { inst = window.RingScene.createRings(host, { compact: true }); } catch (e) { inst = null; }
    };
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { mount(); inst && inst.start(); } else if (inst) inst.stop();
    }, { rootMargin: '300px' }).observe(host);
  }

  // ---------- Animasi scroll (GSAP) ----------
  function initScrollFx() {
    if (!hasGsap() || !window.ScrollTrigger || reduceMotion) {
      document.documentElement.classList.remove('js-anim');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.05, stagger: 0.09, ease: 'power3.out', overwrite: true }),
    });
    $$('[data-split]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.fromTo(el.querySelectorAll('.w > span'), { yPercent: 110, y: 0 }, { yPercent: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }),
      });
    });
    // kalimat ayat menyala kata per kata saat di-scroll
    const vw = $$('#verseText .vw');
    if (vw.length) {
      gsap.to(vw, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '#verseText', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
    }
    // kalender: lingkaran tangan tergambar
    const cal = $('#cal');
    if (cal) ScrollTrigger.create({ trigger: cal, start: 'top 75%', once: true, onEnter: () => cal.classList.add('is-in') });
    // hero: media menjauh & konten memudar saat scroll
    gsap.to('#heroMedia', { scale: 1.15, yPercent: 12, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '#home', start: '30% top', end: '85% top', scrub: true } });
    // parallax foto di kartu mempelai
    $$('.holo-par').forEach((c) => {
      gsap.fromTo(c, { y: 40 }, { y: -20, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // "&" besar berputar pelan
    gsap.fromTo('.couple__amp', { rotate: -20, scale: 0.8 }, { rotate: 8, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.couple__amp', start: 'top bottom', end: 'bottom top', scrub: true } });
    // tiket sedikit miring lalu lurus
    $$('.ticket').forEach((t, k) => {
      gsap.fromTo(t, { rotate: k % 2 ? 3 : -3 }, { rotate: 0, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'center 60%', scrub: true } });
    });
    // penutup
    gsap.fromTo('.closing__scene', { scale: 0.85, opacity: 0.4 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#penutup', start: 'top bottom', end: 'top 20%', scrub: true } });
  }

  // ------------------------------------------------------------------
  // LOADER → COVER → BUKA
  // ------------------------------------------------------------------
  function coverIntro() {
    if (!hasGsap() || reduceMotion) return;
    const tl = gsap.timeline({ delay: 0.1 });
    tl.from('.cover__names .ln > span', { yPercent: 110, duration: 1.3, stagger: 0.12, ease: 'expo.out' })
      .from('.cover__top > *', { opacity: 0, y: -10, stagger: 0.1, duration: 0.8 }, 0.3)
      .from('.cover__bottom > *', { opacity: 0, y: 24, stagger: 0.1, duration: 0.9, ease: 'power3.out' }, 0.5);
  }

  function runLoader() {
    const loader = $('#loader');
    const pctEl = $('#loaderPct');
    const bar = $('.loader__bar span');
    let pct = 0, target = 30, done = false;
    const t0 = performance.now();
    const tick = () => {
      pct += (target - pct) * 0.12;
      pctEl.textContent = Math.round(pct);
      bar.style.setProperty('--p', (pct / 100).toFixed(3));
      if (!done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const sceneReady = new Promise((res) => {
      if (window.RingScene) res();
      else { window.addEventListener('ringscene:ready', res, { once: true }); setTimeout(res, 3500); }
    });
    const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
    fonts.then(() => { target = Math.max(target, 65); });
    sceneReady.then(() => { target = Math.max(target, 85); });
    Promise.all([fonts, sceneReady, new Promise((r) => setTimeout(r, 900))]).then(() => {
      target = 100;
      setTimeout(() => {
        done = true;
        pctEl.textContent = '100';
        bar.style.setProperty('--p', '1');
        loader.classList.add('is-done');
        coverIntro();
        setTimeout(() => loader.remove(), 900);
      }, Math.max(0, 250 - (performance.now() - t0) / 10));
    });
  }

  let opened = false;
  async function openInvitation() {
    if (opened) return;
    opened = true;
    const cover = $('#cover');
    cover.classList.add('is-opening');
    // musik (opsional) langsung ikut gesture tap
    if (C.music && C.music.autoplayOnOpen && window.WeddingMusic) WeddingMusic.play().then(syncMusic);

    const finish = () => {
      cover.classList.add('is-gone');
      document.body.classList.remove('is-locked');
      window.scrollTo(0, 0);
      if (window.RingScene && RingScene.cover) { RingScene.cover.dispose(); RingScene.cover = null; }
      $('#dock').classList.add('is-in');
      $('#musicBtn').classList.add('is-in');
      const hv = $('#heroMedia video');
      if (hv && hv._tryPlay) hv._tryPlay();
      if (!(window.WeddingMusic && WeddingMusic.playing)) {
        setTimeout(() => $('#musicTip').classList.add('is-in'), 1200);
        setTimeout(() => $('#musicTip').classList.remove('is-in'), 6500);
      }
      heroIntro();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };

    if (!hasGsap() || reduceMotion) { finish(); return; }
    gsap.to('.cover__ui > *', { opacity: 0, y: -24, duration: 0.6, stagger: 0.06, ease: 'power2.in' });
    const scene = window.RingScene && RingScene.cover;
    const dur = 1.9;
    if (scene) scene.open(dur);
    gsap.fromTo(cover, { '--iris': 0 }, { '--iris': 160, duration: 1.25, delay: scene ? dur * 0.62 : 0.3, ease: 'power3.in', onComplete: finish });
  }

  function heroIntro() {
    if (!hasGsap() || reduceMotion) return;
    gsap.fromTo('#home [data-hero-title] .w > span', { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out', delay: 0.1 });
    gsap.fromTo('#home [data-hero]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out', delay: 0.35 });
    gsap.fromTo('#heroMedia', { scale: 1.25 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
  }

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------
  function init() {
    if (hasGsap() && !reduceMotion) document.documentElement.classList.add('js-anim');
    renderCover();
    renderHero();
    renderIntro();
    renderCouple();
    renderStory();
    renderJourney();
    renderCountdown();
    renderEvents();
    renderGallery();
    renderRsvp();
    renderGift();
    renderClosing();
    renderDock();
    renderStage();

    initCopy();
    initTilt();
    initStory();
    initCountdown();
    initCalendar();
    initMap();
    initCarousel();
    initReel();
    initGallery();
    initRsvp();
    initMusic();
    initDock();
    initHud();
    initStage();
    initClosingScene();
    initScrollFx();

    $('#openBtn').addEventListener('click', openInvitation);
    // hero di-set heroTitle tersembunyi sampai undangan dibuka
    if (hasGsap() && !reduceMotion) gsap.set('#home [data-hero]', { opacity: 0 });
    runLoader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
