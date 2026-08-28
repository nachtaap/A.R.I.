/* A.R.I. v108 — Music Engine II
   Add this file next to index.html and load it after the existing A.R.I. script.
   It keeps the v107 engine intact and adds two genre-specific composition worlds:
   Dark Techno and Oldschool Hip Hop, plus a reliable mouse/touch long-press on
   the track title for the hidden details panel.
*/
(() => {
  'use strict';

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const pilotGenres = new Set(['dark techno', 'oldschool hiphop']);

  // ---------------------------------------------------------------------------
  // 1. Genre grammar: these are composition rules, not just sound presets.
  // ---------------------------------------------------------------------------
  if (typeof GENRES !== 'undefined') {
    GENRES['dark techno'] = {
      bpm: [126, 138], swing: [0, 0.018],
      kick: { b: [0, 4, 8, 12], c: [], p: 0 },
      snare: { b: [4, 12], c: [], p: 0 },
      hat: 'offbeat', hatP: [0.68, 0.94],
      bassPat: { b: [0, 3, 8, 11], c: [6, 14], p: 0.20 },
      bass: 'reese', pad: 'stab', ext: false,
      progs: [[0], [0, 0, 5, 0], [0, 6], [0, 5, 0, 6], [0, 3, 0, 6]],
      kd: { f0: 154, f1: 43, d: 0.34 }
    };

    GENRES['oldschool hiphop'] = {
      bpm: [82, 98], swing: [0.11, 0.19],
      kick: { b: [0, 10], c: [3, 6, 7, 14], p: 0.36 },
      snare: { b: [4, 12], c: [7, 15], p: 0.18 },
      hat: 'eights', hatP: [0.70, 0.92],
      bassPat: { b: [0, 10], c: [3, 6, 14], p: 0.32 },
      bass: 'round', pad: 'keys', ext: true,
      progs: [[0, 3], [0, 5, 3, 4], [0, 2, 5], [0, 6, 3, 4], [0, 3, 6, 5]],
      kd: { f0: 118, f1: 46, d: 0.25 }
    };
  }

  if (typeof SUBSTYLES !== 'undefined') {
    SUBSTYLES['dark techno'] = {
      hypnotic: {
        bpm: [128, 134], swing: [0, 0.012],
        kickA: [0,4,8,12], kickB: [0,4,8,12], snare: [4,12], ghost: [7,15], hats: [2,6,10,14],
        pad: 'shadow', bass: 'reese', scale: 'minor',
        bassPat: { b: [0,3,8,11], c: [14], p: 0.20 }
      },
      industrial: {
        bpm: [132, 140], swing: [0, 0.008],
        kickA: [0,4,8,12], kickB: [0,4,8,12,14], snare: [4,12], ghost: [3,7,11,15], hats: [2,6,10,14],
        pad: 'shadow', bass: 'growl', scale: 'phryg',
        bassPat: { b: [0,6,8,14], c: [3,11], p: 0.22 }
      },
      acid: {
        bpm: [128,136], swing: [0,0.015],
        kickA: [0,4,8,12], kickB: [0,4,8,12], snare: [4,12], ghost: [15], hats: [2,6,10,14],
        pad: 'stab', bass: 'pulse', scale: 'phryg',
        bassPat: { b: [0,3,6,8,11,14], c: [], p: 0 }
      },
      'dub techno': {
        bpm: [122,130], swing: [0.008,0.025],
        kickA: [0,4,8,12], kickB: [0,4,8,12], snare: [4,12], ghost: [], hats: [2,6,10,14],
        pad: 'stab', bass: 'deepSub', scale: 'minor',
        bassPat: { b: [0,8], c: [6,14], p: 0.25 }
      },
      warehouse: {
        bpm: [132,140], swing: [0,0.01],
        kickA: [0,4,8,12], kickB: [0,4,8,12], snare: [4,12], ghost: [7], hats: [0,2,6,10,14],
        pad: 'fm', bass: 'reese', scale: 'minor',
        bassPat: { b: [0,8], c: [3,11,14], p: 0.24 }
      }
    };

    SUBSTYLES['oldschool hiphop'] = {
      'golden age': {
        bpm: [88,96], swing: [0.13,0.19],
        kickA: [0,10], kickB: [0,3,10,14], snare: [4,12], ghost: [7,15], hats: [0,3,4,7,8,11,12,15],
        pad: 'keys', bass: 'round'
      },
      dusty: {
        bpm: [84,92], swing: [0.16,0.22],
        kickA: [0,6,10], kickB: [0,6,10,14], snare: [4,12], ghost: [7,15], hats: [0,3,6,10,14],
        pad: 'keys', bass: 'rubber'
      },
      jazzy: {
        bpm: [86,96], swing: [0.11,0.17],
        kickA: [0,10], kickB: [0,7,10], snare: [4,12], ghost: [2,7,15], hats: [0,2,4,6,8,10,12,14],
        pad: 'keys', bass: 'round', scale: 'dorian'
      },
      'east coast': {
        bpm: [90,98], swing: [0.10,0.15],
        kickA: [0,10], kickB: [0,3,6,10], snare: [4,12], ghost: [7,14], hats: [0,2,4,6,8,10,12,14],
        pad: 'keys', bass: 'round'
      },
      basement: {
        bpm: [82,90], swing: [0.17,0.23],
        kickA: [0,8], kickB: [0,8,11], snare: [4,12], ghost: [7,15], hats: [2,6,10,14],
        pad: 'keys', bass: 'rubber'
      }
    };
  }

  if (typeof SPEAK_GENRE !== 'undefined') {
    SPEAK_GENRE['dark techno'] = 'dark techno';
    SPEAK_GENRE['oldschool hiphop'] = 'old school hip hop';
  }

  // ---------------------------------------------------------------------------
  // 2. Persistent Track DNA: one identity is kept through the full track.
  // ---------------------------------------------------------------------------
  function unit(seed, tag) {
    if (typeof seededUnit === 'function') return seededUnit(seed, `v108:${tag}`);
    let x = 2166136261;
    const s = `${seed}:${tag}`;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0) / 4294967295;
  }

  function ensureMusicDNA(t) {
    if (!t || !pilotGenres.has(t.genre)) return null;
    if (t.musicDNA) return t.musicDNA;
    if (t.genre === 'dark techno') {
      t.musicDNA = {
        world: 'dark techno', flavour: t.subStyle || 'hypnotic',
        evolution: 0.38 + unit(t.seed, 'evolution') * 0.55,
        pressure: 0.50 + unit(t.seed, 'pressure') * 0.47,
        space: 0.20 + unit(t.seed, 'space') * 0.72,
        metallic: 0.18 + unit(t.seed, 'metal') * 0.78,
        repetition: 0.68 + unit(t.seed, 'repeat') * 0.28,
        melody: 0.08 + unit(t.seed, 'melody') * 0.32,
        grit: 0.28 + unit(t.seed, 'grit') * 0.66
      };
    } else {
      t.musicDNA = {
        world: 'oldschool hiphop', flavour: t.subStyle || 'golden age',
        dust: 0.34 + unit(t.seed, 'dust') * 0.62,
        human: 0.62 + unit(t.seed, 'human') * 0.34,
        chop: 0.25 + unit(t.seed, 'chop') * 0.62,
        jazz: 0.12 + unit(t.seed, 'jazz') * 0.72,
        pocket: 0.68 + unit(t.seed, 'pocket') * 0.30,
        melody: 0.32 + unit(t.seed, 'melody') * 0.48,
        grit: 0.18 + unit(t.seed, 'grit') * 0.48
      };
    }
    t.generatorVersion = 108;
    return t.musicDNA;
  }

  // ---------------------------------------------------------------------------
  // 3. Arrangement and rhythm differences.
  // ---------------------------------------------------------------------------
  if (typeof buildArrangement === 'function') {
    const oldBuildArrangement = buildArrangement;
    buildArrangement = function(bars, genre, subStyle) {
      if (!pilotGenres.has(genre)) return oldBuildArrangement(bars, genre, subStyle);
      const sections = [];
      let cursor = 0;
      const add = (name, requested) => {
        const len = Math.max(0, Math.min(requested, bars - cursor));
        if (!len) return;
        sections.push({ name, start: cursor, end: cursor + len, phraseLength: 4 });
        cursor += len;
      };
      if (genre === 'dark techno') {
        add('intro', Math.min(8, bars));
        if (bars - cursor > 20) add('main', Math.max(8, Math.floor((bars - cursor - 12) * 0.52 / 4) * 4));
        if (bars - cursor > 12) add('break', Math.min(8, bars - cursor - 8));
        if (bars - cursor > 8) add('main2', bars - cursor - 8);
        add('outro', bars - cursor);
      } else {
        add('intro', Math.min(4, bars));
        if (bars - cursor > 12) add('main', Math.max(8, Math.floor((bars - cursor - 8) * 0.58 / 4) * 4));
        if (bars - cursor > 8) add('break', 4);
        if (bars - cursor > 4) add('main2', bars - cursor - 4);
        add('outro', bars - cursor);
      }
      if (sections.length && sections.at(-1).end < bars) sections.at(-1).end = bars;
      return sections;
    };
  }

  if (typeof chordBarsFor === 'function') {
    const oldChordBarsFor = chordBarsFor;
    chordBarsFor = function(genre, subStyle) {
      if (genre === 'dark techno') return subStyle === 'dub techno' ? 2 : 4;
      if (genre === 'oldschool hiphop') return 2;
      return oldChordBarsFor(genre, subStyle);
    };
  }

  if (typeof drumBrainDNA === 'function') {
    const oldDrumBrainDNA = drumBrainDNA;
    drumBrainDNA = function(t) {
      const base = oldDrumBrainDNA(t), d = ensureMusicDNA(t);
      if (!d) return base;
      if (t.genre === 'dark techno') return {
        ...base,
        syncopation: clamp01(0.20 + d.evolution * 0.28 + d.metallic * 0.08),
        density: clamp01(0.42 + d.pressure * 0.25),
        machine: clamp01(0.88 + d.repetition * 0.10),
        strangeness: clamp01(0.18 + d.grit * 0.34),
        memory: clamp01(0.76 + d.repetition * 0.20)
      };
      return {
        ...base,
        syncopation: clamp01(0.48 + d.pocket * 0.25),
        density: clamp01(0.42 + d.chop * 0.19),
        machine: clamp01(0.20 + (1 - d.human) * 0.34),
        strangeness: clamp01(0.15 + d.grit * 0.25 + d.jazz * 0.12),
        memory: clamp01(0.70 + d.pocket * 0.18)
      };
    };
  }

  if (typeof drumPocketMap === 'function') {
    const oldDrumPocketMap = drumPocketMap;
    drumPocketMap = function(t, voice, pattern, micro, barNo) {
      const out = oldDrumPocketMap(t, voice, pattern, micro, barNo);
      if (t?.genre === 'oldschool hiphop') {
        for (let i = 0; i < 16; i++) {
          if (!pattern?.[i]) continue;
          if (voice === 'snare') out[i] = Math.max(-0.09, Math.min(0.11, out[i] + 0.065));
          else if (voice === 'hats') out[i] = Math.max(-0.09, Math.min(0.11, out[i] + (i % 4 === 2 ? 0.03 : -0.008)));
          else if (voice === 'kick' && i !== 0) out[i] = Math.max(-0.09, Math.min(0.11, out[i] - 0.012));
        }
      } else if (t?.genre === 'dark techno') {
        for (let i = 0; i < 16; i++) if (pattern?.[i] && voice === 'kick') out[i] *= 0.12;
      }
      return out;
    };
  }

  // Avoid pop-style harmonic tricks in the techno pilot.
  if (typeof assignTrackEvents === 'function') {
    const oldAssignTrackEvents = assignTrackEvents;
    assignTrackEvents = function(t) {
      ensureMusicDNA(t);
      oldAssignTrackEvents(t);
      if (t?.genre === 'dark techno') {
        t.special = null;
        t.picardy = false;
        if (unit(t.seed, 'no-cut') > 0.12) t.cutBar = null;
        if (unit(t.seed, 'no-borrow') > 0.24) t.borrowed = null;
      } else if (t?.genre === 'oldschool hiphop' && t.special?.type === 'keychange') {
        t.special = null;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Sound detail: deliberately sparse so it enriches rather than masks.
  // ---------------------------------------------------------------------------
  let tapeCurve = null;
  function getTapeCurve() {
    if (tapeCurve) return tapeCurve;
    tapeCurve = new Float32Array(512);
    for (let i = 0; i < tapeCurve.length; i++) {
      const x = i / (tapeCurve.length - 1) * 2 - 1;
      tapeCurve[i] = Math.tanh(x * 1.75) / Math.tanh(1.75);
    }
    return tapeCurve;
  }

  function dust(t0, vol = 1) {
    if (typeof ctx === 'undefined' || !ctx) return;
    if (typeof NB !== 'undefined' && !NB && typeof noiseBuf === 'function') NB = noiseBuf();
    if (typeof NB === 'undefined' || !NB) return;
    const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = NB; hp.type = 'highpass'; hp.frequency.value = 1400; lp.type = 'lowpass'; lp.frequency.value = 5200;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.009 * vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); n.start(t0); n.stop(t0 + 0.3);
  }

  function scratch(t0, vol = 1) {
    if (typeof ctx === 'undefined' || !ctx) return;
    if (typeof NB !== 'undefined' && !NB && typeof noiseBuf === 'function') NB = noiseBuf();
    if (typeof NB === 'undefined' || !NB) return;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = NB; f.type = 'bandpass'; f.Q.value = 2.1;
    f.frequency.setValueAtTime(3900, t0); f.frequency.exponentialRampToValueAtTime(850, t0 + 0.18);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.035 * vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);
    n.connect(f); f.connect(g); g.connect(master); n.start(t0); n.stop(t0 + 0.20);
  }

  function technoRumble(t0, vol = 1) {
    if (typeof ctx === 'undefined' || !ctx || typeof track === 'undefined' || !track) return;
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator();
    f.type = 'lowpass'; f.frequency.value = 145; f.Q.value = 0.75;
    const base = 43 + ((track.root || 36) % 12) * 0.65;
    o.type = 'sine'; o.frequency.setValueAtTime(base * 1.13, t0); o.frequency.exponentialRampToValueAtTime(base, t0 + 0.09);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11 * vol, t0 + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    o.connect(f); f.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.60);
  }

  if (typeof playKick === 'function') {
    const oldPlayKick = playKick;
    playKick = function(t0, vol = 1) {
      oldPlayKick(t0, vol);
      if (typeof track !== 'undefined' && track?.genre === 'dark techno') {
        const d = ensureMusicDNA(track);
        technoRumble(t0 + 0.018, 0.72 + (d?.pressure || 0.5) * 0.34);
      }
    };
  }

  if (typeof playKeys === 'function') {
    const oldPlayKeys = playKeys;
    playKeys = function(t0, midis, dur, timbre) {
      if (typeof track === 'undefined' || track?.genre !== 'oldschool hiphop' || !ctx || !midis?.length)
        return oldPlayKeys(t0, midis, dur, timbre);
      const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), sat = ctx.createWaveShaper(), g = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.value = 105;
      lp.type = 'lowpass'; lp.frequency.value = 1650; lp.Q.value = 0.42;
      sat.curve = getTapeCurve(); sat.oversample = '2x';
      const life = Math.min(dur || 0.7, (60 / track.bpm) * 3.5);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + life);
      hp.connect(lp); lp.connect(sat); sat.connect(g); g.connect(typeof duckBus !== 'undefined' && duckBus ? duckBus : master);
      midis.slice(0,4).forEach((m,i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(m < 48 ? m + 12 : m); o.detune.value = i % 2 ? 4 : -5;
        o.connect(hp); o.start(t0); o.stop(t0 + life + 0.05);
      });
    };
  }

  if (typeof scheduleStep === 'function') {
    const oldScheduleStep = scheduleStep;
    scheduleStep = function(sIdx, t0) {
      oldScheduleStep(sIdx, t0);
      if (typeof track === 'undefined' || !track || !pilotGenres.has(track.genre)) return;
      const d = ensureMusicDNA(track);
      if (track.genre === 'oldschool hiphop') {
        if (sIdx === 0 && bar % 2 === 0 && unit(track.seed, `dust:${bar}`) < 0.35 + d.dust * 0.50) dust(t0, 0.65 + d.dust * 0.7);
        if (sIdx === 14 && bar % 4 === 3 && unit(track.seed, `scratch:${bar}`) < 0.12 + d.chop * 0.24) scratch(t0, 0.70 + d.grit * 0.45);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Desktop + mobile long press on the track name.
  //    Pointer capture is the key difference: a tiny mouse movement can no
  //    longer cause pointerleave to cancel the timer.
  // ---------------------------------------------------------------------------
  const title = document.getElementById('trackname');
  if (title) {
    let press = null;
    let suppressClick = false;

    const clearPress = release => {
      if (!press) return;
      clearTimeout(press.timer);
      if (release && title.hasPointerCapture?.(press.id)) {
        try { title.releasePointerCapture(press.id); } catch (_) {}
      }
      press = null;
    };

    title.addEventListener('pointerdown', e => {
      // Capture before the old handler sees it. This replaces the previous
      // long-press path only for the title, not the rest of the player.
      e.stopImmediatePropagation();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      clearPress(true);
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: 0 };
      try { title.setPointerCapture(e.pointerId); } catch (_) {}
      press.timer = setTimeout(() => {
        if (!press) return;
        suppressClick = true;
        const panel = document.getElementById('devPanel');
        if (!panel?.classList.contains('show') && typeof toggleDevPanel === 'function') toggleDevPanel();
      }, 620);
    }, true);

    title.addEventListener('pointermove', e => {
      if (!press || e.pointerId !== press.id) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 11) clearPress(true);
    }, true);

    ['pointerup','pointercancel','lostpointercapture'].forEach(type => {
      title.addEventListener(type, e => {
        if (!press || (e.pointerId != null && e.pointerId !== press.id)) return;
        clearPress(type !== 'lostpointercapture');
      }, true);
    });

    title.addEventListener('click', e => {
      if (!suppressClick) return;
      e.preventDefault(); e.stopImmediatePropagation(); suppressClick = false;
    }, true);

    title.addEventListener('contextmenu', e => e.preventDefault(), true);
  }

  // Version label, if present.
  const tribute = document.querySelector('header .tribute');
  if (tribute) tribute.textContent = 'inspired by ARIatHOME · version 108';

  console.info('[A.R.I.] Music Engine II v108 loaded');
})();
