/**
 * ari-melody-walk.js — SeedSong-inspired lead generator for A.R.I.
 *
 * Drop-in for ARIComposer scores. Does NOT touch drums/bass/harmony.
 * Only emits stem:'lead' events when asked.
 *
 * Design:
 *   - rhythmic skeleton first
 *   - stateful weighted scale-degree walk
 *   - chord-tone bias on strong slots + rotating preferred role
 *   - soft contour pull
 *   - comfort-zone + lower register
 *   - motif cell reuse (A → A')
 *   - more rests, longer durations
 *
 * Requires: ARIComposer (rng, degree helpers) already loaded.
 * Usage:
 *   const events = ARIMelodyWalk.generate(score, { density: 0.45, version: 2 });
 *   score.events = score.events.filter(e => e.stem !== 'lead').concat(events);
 */
(function (root) {
  'use strict';

  const VERSION = '2.2.1';

  function weighted(r, items) {
    let total = items.reduce((s, x) => s + x.w, 0);
    let x = r() * total;
    for (const it of items) {
      x -= it.w;
      if (x <= 0) return it.v;
    }
    return items[items.length - 1].v;
  }

  function nearestDegree(target, allowed) {
    return allowed.reduce((a, b) =>
      Math.abs(b - target) < Math.abs(a - target) ? b : a
    );
  }

  /**
   * @param {object} score  - ARIComposer score (seed, scale, root, harmony, bpm, …)
   * @param {object} opts
   * @param {number} [opts.density=0.42]     onset probability base
   * @param {number} [opts.register=12]     midi octave offset (12 = one octave above root)
   * @param {number} [opts.restBias=0.28]   extra rest chance (v1 path)
   * @param {string} [opts.voice='soft-poly']
   * @param {number} [opts.bars=8]          how many bars of lead to generate
   * @param {number} [opts.version=2]       1 = classic contour walk, 2 = skeleton+motif
   * @param {number} [opts.lowComfort=1]
   * @param {number} [opts.highComfort=12]
   */
  function generate(score, opts = {}) {
    if (!score || !root.ARIComposer) {
      console.warn('[ARIMelodyWalk] ARIComposer or score missing');
      return [];
    }

    const version = opts.version === 1 ? 1 : 2;
    if (version === 1) return generateV1(score, opts);
    return generateV2(score, opts);
  }

  function generateV1(score, opts) {
    const r = ARIComposer.rng(score.seed + ':melody-walk-v1-221');
    const scale = score.scale;
    const bars = opts.bars || 8;
    const step = 0.5;
    const register = opts.register != null ? opts.register : 12;
    const voice = opts.voice || 'soft-poly';
    const lowComfort = opts.lowComfort != null ? opts.lowComfort : 1;
    const highComfort = opts.highComfort != null ? opts.highComfort : 12;
    const restChance = opts.restBias != null ? opts.restBias : 0.28;

    const shapes = ['arch', 'fall', 'climb', 'wave'];
    const shape = shapes[Math.floor(r() * shapes.length)];
    const base = 3 + Math.floor(r() * 4);
    let d = base;
    let previousDelta = 0;
    const motif = [];

    const target = (i, n) => {
      const x = i / (n - 1 || 1);
      if (shape === 'arch') return base + (1 - Math.abs(x * 2 - 1)) * 3.5;
      if (shape === 'climb') return base - 1.5 + x * 4.5;
      if (shape === 'fall') return base + 2.5 - x * 4.5;
      return base + Math.sin(x * Math.PI * 2) * 2.2;
    };

    const n = bars * 4; // 8th-note slots for 8 bars → 32, but we do phrase of 4 bars then repeat
    const phraseSlots = 4 * 8; // 4 bars × 8 eighths

    for (let i = 0; i < phraseSlots; i++) {
      if (r() < restChance) {
        motif.push(null);
        continue;
      }
      const bar = Math.floor(i / 8);
      const beat = (i % 8) * step;
      const chord = score.harmony[bar] || score.harmony[0];
      const strong = beat % 1 === 0;
      const chordDeg = [
        chord.degree,
        chord.degree + 2,
        chord.degree + 4,
        chord.degree + 7
      ];
      const candidates = [];
      for (const delta of [-3, -2, -1, 0, 1, 2, 3]) {
        const nd = d + delta;
        let w = { 0: 0.9, 1: 3.8, '-1': 3.8, 2: 1.7, '-2': 1.7, 3: 0.45, '-3': 0.45 }[delta] || 1;
        w *= Math.exp(-Math.abs(nd - target(i, phraseSlots)) * 0.42);
        if (Math.sign(delta) === -Math.sign(previousDelta) && delta !== 0) w *= 1.18;
        if (strong && chordDeg.some(c => Math.abs(c - nd) <= 0)) w *= 3.2;
        if (nd < lowComfort || nd > highComfort) w *= 0.22;
        candidates.push({ v: nd, w });
      }
      let nd = weighted(r, candidates);
      if (strong) {
        const near = nearestDegree(nd, chordDeg);
        if (Math.abs(near - nd) <= 2 && r() < 0.72) nd = near;
      }
      nd = Math.max(lowComfort - 1, Math.min(highComfort + 1, nd));
      previousDelta = nd - d;
      d = nd;
      const dur = weighted(r, [
        { v: 0.45, w: 2.2 },
        { v: 0.85, w: 3.4 },
        { v: 1.4, w: 2.0 },
        { v: 2.0, w: 0.7 }
      ]);
      motif.push({
        beat: i * step,
        degree: d,
        duration: dur,
        velocity: 0.48 + r() * 0.28
      });
    }

    const out = [];
    const repeats = Math.ceil(bars / 4);
    for (let repeat = 0; repeat < repeats; repeat++) {
      for (const m of motif) {
        if (!m) continue;
        let deg = m.degree;
        if (repeat && r() < 0.16) {
          deg += weighted(r, [
            { v: -1, w: 1 },
            { v: 1, w: 1 },
            { v: 2, w: 0.35 },
            { v: -2, w: 0.35 }
          ]);
        }
        const beat = m.beat + repeat * 16;
        if (beat >= bars * 4) continue;
        const midi = score.root + register + ARIComposer.degree(scale, deg);
        out.push({
          beat,
          bar: Math.floor(beat / 4),
          stem: 'lead',
          midi,
          duration: m.duration,
          velocity: m.velocity,
          voice,
          pan: -0.1
        });
      }
    }
    return out;
  }

  function generateV2(score, opts) {
    const r = ARIComposer.rng(score.seed + ':skeleton-motif-v2-221');
    const scale = score.scale;
    const bars = opts.bars || 8;
    const slots = bars * 4; // eighth-note slots
    const step = 0.5;
    const register = opts.register != null ? opts.register : 12;
    const voice = opts.voice || 'soft-poly';
    const lowComfort = opts.lowComfort != null ? opts.lowComfort : 1;
    const highComfort = opts.highComfort != null ? opts.highComfort : 12;
    const density = opts.density != null ? opts.density : 0.38 + r() * 0.16;

    // --- rhythmic skeleton ---
    const skeleton = [];
    let i = 0;
    while (i < slots) {
      const strong = i % 8 === 0 || i % 8 === 4;
      if (r() < density * (strong ? 1.22 : 0.85)) {
        skeleton.push({
          slot: i,
          beat: i * step,
          duration: weighted(r, [
            { v: 0.5, w: 2.0 },
            { v: 0.9, w: 3.2 },
            { v: 1.5, w: 2.4 },
            { v: 2.2, w: 0.9 }
          ]),
          accent: strong ? 0.84 : i % 2 ? 0.55 : 0.66
        });
        i += weighted(r, [
          { v: 1, w: 3.2 },
          { v: 2, w: 2.8 },
          { v: 3, w: 1.1 },
          { v: 4, w: 0.4 }
        ]);
      } else {
        i++;
      }
    }

    // --- pitch walk ---
    const base = 3 + Math.floor(r() * 4);
    const drift = (r() - 0.5) * 4.2;
    const wave = (r() - 0.5) * 2.4;
    const target = (x) => base + drift * x + Math.sin((x * 1.15 + 0.08) * Math.PI) * wave;

    const roles = [0, 2, 4, 7];
    const first = Math.floor(r() * roles.length);
    const order = [first, (first + 2) % 4, (first + 1) % 4, (first + 3) % 4];

    let d = base;
    let prev = 0;
    const gen = [];

    for (const sk of skeleton) {
      const x = sk.slot / Math.max(1, slots - 1);
      const bar = Math.floor(sk.beat / 4);
      const ch = score.harmony[bar % score.harmony.length] || score.harmony[0];
      const ct = [ch.degree, ch.degree + 2, ch.degree + 4, ch.degree + 7];
      const strong = sk.slot % 2 === 0;
      const preferred = ch.degree + roles[order[bar % 4]];
      const c = [];
      for (const delta of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) {
        const nd = d + delta;
        const ad = Math.abs(delta);
        let w = [1.05, 3.8, 1.75, 0.48, 0.16][ad] || 0.1;
        w *= Math.exp(-Math.abs(nd - target(x)) * 0.3);
        if (Math.abs(prev) >= 2 && Math.sign(delta) === -Math.sign(prev)) w *= 1.8;
        if (strong && ct.includes(nd)) w *= 1.65;
        if (strong && nd === preferred) w *= 3.15;
        if (nd < lowComfort || nd > highComfort) w *= 0.22;
        c.push({ v: nd, w });
      }
      let nd = weighted(r, c);
      if (strong && Math.abs(preferred - nd) <= 2 && r() < 0.52) nd = preferred;
      nd = Math.max(lowComfort - 1, Math.min(highComfort + 1, nd));
      prev = nd - d;
      d = nd;
      gen.push({ ...sk, degree: d });
    }

    // --- motif cell (interval sequence) ---
    let motif = null;
    if (gen.length >= 7) {
      const st = 1 + Math.floor(r() * Math.max(1, gen.length - 6));
      const cell = gen.slice(st, st + 4);
      motif = cell.slice(1).map((n, k) => n.degree - cell[k].degree);
    }

    // --- emit: first pass + mutated second half if bars allow ---
    const out = [];
    const half = Math.ceil(gen.length / 2);
    const deg = gen.map((x) => x.degree);

    // light mutation in second half of the generated material
    if (motif && gen.length >= 7) {
      const dest = Math.max(1, gen.length - 5);
      let cur = deg[dest] + weighted(r, [
        { v: 0, w: 3 },
        { v: 1, w: 1 },
        { v: -1, w: 1 }
      ]);
      deg[dest] = cur;
      motif.forEach((iv, k) => {
        cur += iv;
        if (dest + k + 1 < deg.length) deg[dest + k + 1] = cur;
      });
    }

    gen.forEach((g, j) => {
      const beat = g.beat;
      if (beat >= bars * 4) return;
      const midi = score.root + register + ARIComposer.degree(scale, deg[j]);
      out.push({
        beat,
        bar: Math.floor(beat / 4),
        stem: 'lead',
        midi,
        duration: g.duration,
        velocity: Math.min(0.82, g.accent * (0.78 + r() * 0.14)),
        voice,
        pan: -0.1
      });
    });

    return out;
  }

  /**
   * Apply lead to an existing score (mutates score.events).
   */
  function apply(score, opts) {
    if (!score) return score;
    const events = generate(score, opts);
    score.events = (score.events || []).filter((e) => e.stem !== 'lead').concat(events);
    score.events.sort((a, b) => a.beat - b.beat);
    return score;
  }

  const api = {
    version: VERSION,
    generate,
    apply,
    generateV1,
    generateV2
  };

  root.ARIMelodyWalk = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
