/*
 * Musik latar.
 * - Jika WEDDING.music.src diisi → memutar file audio tersebut (loop).
 * - Jika kosong → memutar musik lo-fi generatif (Web Audio): pad hangat,
 *   denting music-box, dan sedikit crackle piringan hitam. Tanpa file sama sekali.
 */
(function () {
  const cfg = (window.WEDDING && window.WEDDING.music) || {};

  // ---------- Mode file audio ----------
  function filePlayer(src) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'none';
    el.volume = 0;
    let fadeRaf = 0;
    const fade = (to, ms, done) => {
      cancelAnimationFrame(fadeRaf);
      const from = el.volume, t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        el.volume = from + (to - from) * k;
        if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
      };
      fadeRaf = requestAnimationFrame(step);
    };
    return {
      async start() { await el.play(); fade(0.8, 1200); },
      stop() { fade(0, 600, () => el.pause()); },
    };
  }

  // ---------- Mode generatif ----------
  function generativePlayer() {
    let ctx = null, master, dry, timer = 0, nextTime = 0, step = 0, melodyIdx = 0;
    const BPM = 68, EIGHTH = 60 / BPM / 2, BAR = EIGHTH * 8;
    // Fmaj9 – Em7 – Dm9 – Cmaj7(add9): progresi turun yang terasa "melayang"
    const CHORDS = [
      [41, 53, 57, 60, 64, 67],
      [40, 52, 55, 59, 62, 67],
      [38, 50, 53, 57, 60, 64],
      [36, 48, 52, 55, 59, 62],
    ];
    const SCALE = [72, 74, 76, 79, 81, 84, 86, 88];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5200; // sedikit "berdebu" ala lo-fi
      master.connect(tone).connect(comp).connect(ctx.destination);

      dry = ctx.createGain();
      dry.gain.value = 0.7;
      dry.connect(master);
      const conv = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 3.4);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
      conv.buffer = buf;
      const wet = ctx.createGain();
      wet.gain.value = 0.55;
      dry.connect(conv);
      conv.connect(wet).connect(master);

      // crackle piringan hitam
      const nLen = ctx.sampleRate * 2;
      const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const nd = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) {
        nd[i] = (Math.random() * 2 - 1) * 0.02 + (Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.9 : 0);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = nBuf;
      noise.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const ng = ctx.createGain();
      ng.gain.value = 0.16;
      noise.connect(hp).connect(ng).connect(master);
      noise.start();
    }

    function pad(notes, t, dur) {
      const bus = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
      lp.frequency.linearRampToValueAtTime(800, t + dur);
      bus.gain.setValueAtTime(0, t);
      bus.gain.linearRampToValueAtTime(0.055, t + 1.6);
      bus.gain.setValueAtTime(0.055, t + dur - 0.4);
      bus.gain.linearRampToValueAtTime(0, t + dur + 1.8);
      bus.connect(lp).connect(dry);
      notes.forEach((m, i) => {
        [-6, 6].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = hz(m);
          o.detune.value = det;
          const g = ctx.createGain();
          g.gain.value = i === 0 ? 0.9 : 0.32;
          o.connect(g).connect(bus);
          o.start(t);
          o.stop(t + dur + 2);
        });
      });
    }

    function bell(m, t, vel) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      g.connect(dry);
      [[1, 1], [2.01, 0.28], [3.98, 0.08]].forEach(([mul, amp]) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = hz(m) * mul;
        const og = ctx.createGain();
        og.gain.value = amp;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 2.3);
      });
    }

    function schedule() {
      while (nextTime < ctx.currentTime + 0.35) {
        const barStep = step % 8;
        const chordIdx = Math.floor(step / 8) % CHORDS.length;
        const chord = CHORDS[chordIdx];
        if (barStep === 0) pad(chord, nextTime, BAR);
        // melodi music-box: jalan acak yang lembut di tangga nada pentatonik
        const accent = barStep === 0 || barStep === 3 || barStep === 6;
        if (Math.random() < (accent ? 0.85 : 0.28)) {
          melodyIdx = Math.max(0, Math.min(SCALE.length - 1, melodyIdx + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
          let note = SCALE[melodyIdx];
          // sesekali ambil nada akor supaya tetap harmonis
          if (barStep === 0) note = chord[chord.length - 1] + 12;
          const swing = barStep % 2 ? EIGHTH * 0.12 : 0;
          bell(note, nextTime + swing, accent ? 0.11 : 0.06);
        }
        nextTime += EIGHTH;
        step++;
      }
    }

    return {
      async start() {
        if (!ctx) build();
        if (ctx.state === 'suspended') await ctx.resume();
        nextTime = ctx.currentTime + 0.1;
        clearInterval(timer);
        timer = setInterval(schedule, 90);
        schedule();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.5);
      },
      stop() {
        if (!ctx) return;
        clearInterval(timer);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        setTimeout(() => { if (ctx && !api.playing) ctx.suspend(); }, 2600);
      },
    };
  }

  const player = cfg.src ? filePlayer(cfg.src) : generativePlayer();
  const api = {
    playing: false,
    async play() {
      try {
        await player.start();
        api.playing = true;
      } catch (e) {
        console.warn('Musik tidak bisa diputar:', e);
        api.playing = false;
      }
      return api.playing;
    },
    pause() { player.stop(); api.playing = false; },
    async toggle() { if (api.playing) { api.pause(); return false; } return api.play(); },
  };

  // Hentikan musik saat tab disembunyikan, lanjut lagi saat kembali.
  let resumeOnShow = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && api.playing) { resumeOnShow = true; api.pause(); document.dispatchEvent(new CustomEvent('music:change')); }
    else if (!document.hidden && resumeOnShow) { resumeOnShow = false; api.play().then(() => document.dispatchEvent(new CustomEvent('music:change'))); }
  });

  window.WeddingMusic = api;
})();
