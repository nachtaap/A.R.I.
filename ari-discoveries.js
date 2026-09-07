/* A.R.I. v112 — Street memory.
   No new player chrome. The existing rig is quietly playable, and A.R.I.
   can answer a visitor's phrase. Everything remains synthesized in-browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const style = document.createElement('style');
  style.textContent = `
    #gAri:focus-visible { outline: 1px dashed var(--cyan); outline-offset: 6px; }
    #gWheel, .key, .pad { cursor: pointer; }
    .key, .pad { pointer-events: all; }
    .key:focus-visible, .pad:focus-visible, #gWheel:focus-visible {
      outline: 1px solid var(--magenta); outline-offset: 3px;
    }
    .key.street-touch, .pad.street-touch { fill: var(--magenta) !important; fill-opacity: .55; }
    #gWheel.street-touch { filter: drop-shadow(0 0 5px var(--magenta)); }
    #devPanel:not(.show) { visibility: hidden !important; }
    .street-sr { position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    @media (prefers-reduced-motion: reduce) { #gWheel.street-touch { filter: none; } }
  `;
  document.head.appendChild(style);
  const status = document.createElement('div');
  status.className = 'street-sr';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.appendChild(status);

  let seed = '', phrase = [], lastInput = -Infinity, pending = null;
  let lastAnswerBar = -Infinity, answerCount = 0, touchCount = 0;
  let analyser = null, lastScratch = -Infinity, pausedAt = null;
  const scratchTimes = [];
  const pulseTimers = new WeakMap();
  const samples = new Uint8Array(256);
  function available() {
    return playing && ctx?.state === 'running' && track && !batteryIntermission &&
      !cutsceneActive && !reversing && !document.body.classList.contains('real-ari-live');
  }
  function syncTrack() {
    if (track?.seed === seed) return;
    seed = track?.seed;
    phrase = []; pending = null; lastAnswerBar = -Infinity; answerCount = 0;
    if (Array.isArray(track?.streetMotif) && track.streetMotif.length >= 3)
      pending = { notes: track.streetMotif.slice(0, 6), afterBar: 8, inherited: true };
  }
  function pulse(el) {
    clearTimeout(pulseTimers.get(el));
    el.classList.add('street-touch');
    pulseTimers.set(el, setTimeout(() => el.classList.remove('street-touch'), 180));
  }
  function pitch(degree) {
    const scale = track.scale || SCALES.minor;
    return track.root + 24 + scale[degree % scale.length] + Math.floor(degree / scale.length) * 12;
  }
  function note(degree, at, volume = .5) {
    playLead(at, pitch(degree), Math.min(.5, 60 / track.bpm * .65), 'on acoustic', volume);
  }
  function keyTouch(degree, el) {
    if (!available()) return;
    syncTrack();
    const now = ctx.currentTime;
    if (now - lastInput < .06) return;
    if (now - lastInput > 60 / track.bpm * 8) phrase = [];
    lastInput = now;
    note(degree, now + .012);
    phrase.push(degree); phrase = phrase.slice(-6);
    touchCount++;
    pulse(el);
    if (phrase.length >= 3) {
      track.streetMotif = phrase.slice();
      pending = { notes: phrase.slice(), afterBar: bar + 1, inherited: false };
      if (currentTrackRating === 5) setTrackRemembered(true);
    }
    // The interaction changes the music, not the transport.
    status.textContent = 'A note joins the street.';
  }
  function padTouch(index, el) {
    if (!available()) return;
    const now = ctx.currentTime;
    if (now - Number(el.dataset.lastTap || -10) < .09) return;
    el.dataset.lastTap = now;
    const at = now + .012;
    switch (index % 4) {
      case 0: playKick(at, .55); break;
      case 1: playSnare(at, .5); break;
      case 2: playHat(at, index > 7, .4); break;
      case 3: play808Cowbell(at, .3); break;
    }
    touchCount++; pulse(el);
    status.textContent = 'A hit joins the groove.';
  }
  function scratch(el) {
    if (!available()) return;
    const now = ctx.currentTime;
    if (now - lastScratch < .2) return;
    lastScratch = now;
    // A short noise sweep, not a sampled record or a transport seek.
    const source = ctx.createBufferSource(); source.buffer = noiseBuf();
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 3;
    const gain = ctx.createGain();
    source.connect(filter); filter.connect(gain); gain.connect(master);
    filter.frequency.setValueAtTime(1700, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + .12);
    filter.frequency.exponentialRampToValueAtTime(2100, now + .24);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.13, now + .015);
    gain.gain.linearRampToValueAtTime(0, now + .27);
    source.start(now); source.stop(now + .28);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    pulse(el); touchCount++;
    scratchTimes.push(now);
    while (scratchTimes.length && now - scratchTimes[0] > 1.8) scratchTimes.shift();
    if (scratchTimes.length >= 3) {
      ariSurprisedUntil = now + 1.4;
      if (!reduceMotion) spawnNote([3.3, 1.2, ZT + .1], 'sp', 'var(--magenta)');
      scratchTimes.length = 0;
    }
    status.textContent = 'The record scratches back.';
  }
  function bind(el, name, action, keyboard = true) {
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', name);
    el.setAttribute('tabindex', keyboard ? '0' : '-1');
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); action(el); });
    el.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault(); e.stopPropagation(); action(el);
      }
    });
  }
  // Roving focus: one tab stop per instrument, arrow keys explore its pieces.
  function bindInstrument(elements, label, action) {
    elements.forEach((el, index) => {
      bind(el, `${label} ${index + 1}`, target => action(index, target), index === 0);
      el.addEventListener('keydown', e => {
        const delta = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
        if (!delta) return;
        e.preventDefault(); e.stopPropagation();
        const next = elements[(index + delta + elements.length) % elements.length];
        elements.forEach(key => key.setAttribute('tabindex', key === next ? '0' : '-1'));
        next.focus();
      });
    });
  }
  bindInstrument(Array.from({length: 9}, (_, i) => $('key' + i)), 'Rig key', keyTouch);
  bindInstrument(Array.from({length: 12}, (_, i) => $('pad' + i)), 'Drum pad', padTouch);
  bind($('gWheel'), 'Record', scratch);
  $('gAri').setAttribute('role', 'button');
  $('gAri').setAttribute('tabindex', '0');
  $('gAri').setAttribute('aria-label', 'A.R.I. — play or pause');
  $('gAri').addEventListener('keydown', e => {
    if (e.target !== $('gAri') || e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      if (!document.body.classList.contains('real-ari-live')) started ? (playing ? stop() : resume()) : start();
    }
  });

  const originalStep = scheduleStep;
  scheduleStep = function(sIdx, at) {
    originalStep(sIdx, at);
    syncTrack();
    if (!pending || sIdx !== 0 || !available()) return;
    if (bar < pending.afterBar || bar - lastAnswerBar < 4 || ctx.currentTime - lastInput < 60 / track.bpm * 2) return;
    // Leave the guest and the ending alone. Wait for a gap in the arrangement.
    if (visitor && visitorPhase === 'performing' && sectionAt(bar) !== 'break') return;
    if (bar > track.bars - 3) { pending = null; return; }
    const notes = pending.notes.slice();
    // Return the shape, but land on the current scale's home note.
    notes[notes.length - 1] = 0;
    const eighth = 60 / track.bpm / 2;
    notes.forEach((degree, i) => note(degree, at + i * eighth, .38));
    lastAnswerBar = bar; pending = null; phrase = []; answerCount++;
    ariSurprisedUntil = at + .8;
    status.textContent = 'A.R.I. answers your phrase.';
    console.info('[A.R.I.] Street phrase answered', { notes: notes.length, bar, seed: track.seed });
    if (!reduceMotion) spawnNote([9.8, 1.5, ZT + .4], '', 'var(--magenta)');
  };

  // Preserve the existing hidden inspector; repair keyboard and hidden focus.
  const panel = $('devPanel');
  let wasOpen = false;
  function syncPanel() {
    const open = panel.classList.contains('show');
    panel.inert = !open;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Track details');
    $('trackname').setAttribute('aria-expanded', String(open));
    if (open && !wasOpen) panel.querySelector('#devClose')?.focus();
    if (!open && wasOpen && panel.contains(document.activeElement)) $('trackname').focus();
    wasOpen = open;
  }
  new MutationObserver(syncPanel).observe(panel, { attributes: true, attributeFilter: ['class'] });
  syncPanel();
  panel.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); panel.querySelector('#devClose')?.focus(); }
  });
  setInterval(() => {
    const active = !!playing && ctx?.state === 'running';
    $('gAri').setAttribute('aria-label', !started ? 'A.R.I. — start the street signal' : active ? 'A.R.I. — pause' : 'A.R.I. — resume');
    // No accumulated delayed responses when returning from a background tab.
    if (!active && pausedAt === null) pausedAt = performance.now();
    if (active && pausedAt !== null) { if (performance.now() - pausedAt > 30000) { pending = null; phrase = []; } pausedAt = null; }
    if (!panel.classList.contains('show') || !track) return;
    if (!analyser && ctx) { analyser = ctx.createAnalyser(); analyser.fftSize = 256; master.connect(analyser); }
    if (analyser) analyser.getByteTimeDomainData(samples);
    const audible = active && samples.some(n => Math.abs(n - 128) > 2);
    let section = $('streetMemoryInspector');
    if (!section) { section = document.createElement('div'); section.id = 'streetMemoryInspector'; section.className = 'devsec'; panel.appendChild(section); }
    section.replaceChildren();
    const heading = document.createElement('div'); heading.className = 'devh'; heading.textContent = 'STREET MEMORY';
    const details = document.createElement('div'); details.className = 'kdim';
    details.textContent = `${touchCount} touches · ${track.streetMotif?.length || 0} notes remembered · ${answerCount} replies · ${audible ? 'audio signal present' : active ? 'signal quiet' : 'paused'}`;
    section.append(heading, details);
  }, 500);
  document.querySelector('header .tribute').textContent = 'inspired by ARIatHOME · version 112';
})();
