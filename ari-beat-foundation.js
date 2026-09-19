/* A.R.I. Beat Foundation v2 — stable low end without every track sharing one bass voice.
   No recordings or network audio. Load after the creature composer. */
(() => {
  'use strict';
  const S = window.ARICreatureSynth;
  if (!S || typeof newTrack !== 'function') return;
  let context = null, kit = null, wave = null, lastBass = null, voiceName='round';
  const voices = new Set();
  const hash=value=>{let h=2166136261>>>0;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  function clear() {
    for (const v of [...voices]) { try { v.source.stop(); } catch (_) {} v.cleanup(); }
    lastBass = null;
  }
  function makeWave(kind){
    const re=new Float32Array(8), im=new Float32Array(8);
    if(kind==='round'){im[1]=1;im[2]=.10;im[3]=.04;}
    else if(kind==='hollow'){im[1]=1;im[3]=.18;im[5]=.055;}
    else if(kind==='warm'){im[1]=1;im[2]=.18;im[3]=.08;im[4]=.035;}
    else {im[1]=1;im[2]=.06;im[3]=.13;im[5]=.035;}
    return ctx.createPeriodicWave(re,im,{disableNormalization:true});
  }
  function prepare() {
    if (!ctx || !track) return false;
    if (context === ctx && kit?.seed === track.seed) return true;
    clear(); context = ctx;
    const sr = 22050, random = S.random(String(track.seed) + ':drums');
    function drum(kind) {
      const n = Math.ceil(sr * (kind === 'kick' ? .32 : .09));
      const buffer = ctx.createBuffer(1, n, sr), data = buffer.getChannelData(0);
      let phase = 0, low = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, noise = random() * 2 - 1;
        if (kind === 'kick') {
          phase += Math.PI * 2 * (45 + 125 * Math.exp(-t * 32)) / sr;
          data[i] = Math.sin(phase) * Math.exp(-t * 14) + noise * .12 * Math.exp(-t * 140);
        } else {
          low += .18 * (noise - low); data[i] = (noise - low) * Math.exp(-t * 65) * .5;
        }
        data[i] *= Math.min(1, i / 70, (n - i) / 220);
      }
      return buffer;
    }
    kit = { seed: track.seed, kick: drum('kick'), hat: drum('hat') };
    const names=['round','hollow','warm','lean'];
    const bassMeta=String(track.bassType||track.gear?.bassSynth||track.genre||'');
    voiceName=names[hash(String(track.seed)+':'+bassMeta)%names.length];
    wave = makeWave(voiceName);
    track.foundationBassVoice=voiceName;
    return true;
  }
  function register(source, gain) {
    const voice = { source, gain, cleanup() { source.disconnect(); gain.disconnect(); voices.delete(voice); if (lastBass === voice) lastBass = null; }};
    source.onended = voice.cleanup; voices.add(voice); return voice;
  }
  function hit(kind, time, volume, rate = 1) {
    if (!prepare() || !playing || track.cutBar === bar) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = kit[kind]; source.playbackRate.value = rate; gain.gain.value = Math.max(0, Math.min(1.3, volume));
    source.connect(gain); gain.connect(master); register(source, gain); source.start(Math.max(time, ctx.currentTime));
  }
  playKick = function(time, volume = 1) { hit('kick', time, .48 * volume); };
  play808Kick = function(time, volume = 1) { hit('kick', time, .48 * volume); };
  playHat = function(time, open, volume = 1) { hit('hat', time, (open ? .19 : .17) * volume, open ? .72 : 1); };
  function bass(time, midi, duration, volume) {
    if (!prepare() || !playing || track.cutBar === bar) return;
    const t = Math.max(time, ctx.currentTime), beat = 60 / track.bpm;
    const length = Math.max(.045, Math.min(duration, beat * .7)), peak = .185 * volume;
    if (lastBass && lastBass.end > t) {
      const old = lastBass, elapsed = Math.max(0, t - old.start);
      const level = old.peak * Math.min(1, elapsed * 90) * Math.exp(-elapsed * 4);
      old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(Math.max(.0001, level), t);
      old.gain.gain.linearRampToValueAtTime(0, t + .006); old.source.stop(t + .007);
    }
    const source = ctx.createOscillator(), gain = ctx.createGain();
    source.setPeriodicWave(wave); source.frequency.value = S.midiHz(bassMidi(midi));
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(peak * Math.exp(-4 / 90), t + 1 / 90);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * Math.exp(-4 * (length - .01))), t + length - .01);
    gain.gain.linearRampToValueAtTime(0, t + length);
    source.connect(gain); gain.connect(master);
    const voice = register(source, gain); Object.assign(voice, { start: t, end: t + length, peak }); lastBass = voice;
    source.start(t); source.stop(t + length + .002);
  }
  function wrap(original, volumeIndex = 3) {
    return function(...args) {
      const volume = args[volumeIndex] ?? 1; bass(args[0], args[1], args[2], volume);
      if (playing && track?.cutBar !== bar && bar % 8 >= 6 && !window.ARICreatures?.foreground) {
        args[volumeIndex] = volume * .15; return original(...args);
      }
    };
  }
  playBass = wrap(playBass); playDeepSub = wrap(playDeepSub); playSilkSub = wrap(playSilkSub); playRound = wrap(playRound);
  playRubber = wrap(playRubber); playGrowl = wrap(playGrowl); playPluckBass = wrap(playPluckBass); playPulseBass = wrap(playPulseBass);
  playReese = wrap(playReese, 4); play808 = wrap(play808, 4);
  const previousNew = newTrack;
  newTrack = function(...args) { clear(); const result = previousNew(...args); prepare(); return result; };
  const previousStop = stop;
  stop = function(...args) { clear(); return previousStop(...args); };
  const previousStep = scheduleStep;
  scheduleStep = function(step, time) {
    if (track?.cutBar === bar && step === 0) for (const voice of voices) { try { voice.source.stop(time); } catch (_) {} }
    return previousStep(step, time);
  };
  window.ARIBeatFoundation = Object.freeze({ version: 2, get activeVoices() { return voices.size; }, get voice(){return voiceName;} });
  if (typeof track !== 'undefined' && track) prepare();
})();

/* Final visible-interface normalization — one authoritative public-UI layer. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* Track name is display-only. The core page attached a legacy long-press handler
     earlier in startup. Replacing the node removes those listeners. A capture-phase
     guard then guarantees that a future/reintroduced handler still cannot fire or
     leak the click through to the stage/play-pause control. */
  function makeTrackNamePassive() {
    const old = $('trackname');
    if (!old) return null;
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    for (const attr of ['tabindex', 'role', 'aria-label', 'aria-expanded']) fresh.removeAttribute(attr);
    fresh.style.cursor = 'default';
    fresh.style.pointerEvents = 'auto';
    fresh.style.touchAction = 'manipulation';
    return fresh;
  }
  makeTrackNamePassive();

  const blockTrackNameEvent = (event) => {
    const target = event.target instanceof Element ? event.target.closest('#trackname') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  ['pointerdown', 'pointerup', 'pointercancel', 'click', 'dblclick', 'contextmenu'].forEach(type =>
    document.addEventListener(type, blockTrackNameEvent, true)
  );

  const style = document.createElement('style');
  style.id = 'ari-public-ui-normalization';
  style.textContent = `
    /* Top-left hierarchy: identity, tribute, then weather. */
    header > p:not(.tribute){font-size:14px!important;letter-spacing:.22em!important;line-height:1.35!important;margin-top:5px!important}
    header .tribute{display:block!important;margin-top:7px!important;font-size:12px!important;letter-spacing:.08em!important;line-height:1.4!important;color:var(--support)!important}
    #wxText{margin-top:9px!important;font-size:11.5px!important;line-height:1.5!important;letter-spacing:.11em!important}
    #wxBattery,#wxText br{display:none!important}

    /* Weather condition remains coloured, never underlined/link-like. */
    .wxCond::before,.wxCond::after{display:none!important}

    /* Track title is informational, not an action. */
    #trackname{cursor:default!important;pointer-events:auto!important;touch-action:manipulation!important}

    /* Live status + battery are one readable block. */
    footer{align-items:flex-start!important;gap:13px!important;font-size:12px!important}
    #ariLiveStack{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
    #ariLiveRow{display:flex;align-items:center;gap:9px;white-space:nowrap;min-height:20px}
    #ariLiveRow .ariLiveLabel{font-size:12px!important;line-height:1.2;letter-spacing:.20em;color:var(--support)}
    #themebtn{align-self:flex-start!important;margin-top:0!important;transform:none!important}
    #ariRigBattery{display:flex;flex-direction:column;align-items:flex-start;gap:6px;white-space:nowrap;font-size:12px!important;line-height:1.2;letter-spacing:.11em;color:var(--support)}
    #ariBatteryTrack{display:block;width:160px;height:12px;border:1.5px solid var(--cyan-dim);border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--bg) 78%,var(--support) 22%);box-sizing:border-box}
    #ariBatteryFill{display:block;width:100%;height:100%;background:var(--cyan);transform-origin:left center;transition:width .45s ease,background-color .45s ease,opacity .25s ease}
    #ariRigBattery.swapping #ariBatteryFill{width:30%!important;animation:ariBatterySwap .8s ease-in-out infinite alternate}
    @keyframes ariBatterySwap{from{transform:translateX(0);opacity:.45}to{transform:translateX(230%);opacity:1}}

    @media(max-width:640px){
      header > p:not(.tribute){font-size:12.5px!important;letter-spacing:.16em!important}
      header .tribute{font-size:11px!important}
      #wxText{font-size:10.5px!important}
      #ariLiveRow{min-height:18px}
      #ariLiveRow .ariLiveLabel{font-size:11px!important}
      #ariRigBattery{font-size:11px!important;gap:5px}
      #ariBatteryTrack{width:132px;height:10px}
    }
  `;
  document.head.appendChild(style);

  /* Keep the fan-tribute line, remove only the version suffix written by older modules. */
  const tribute = document.querySelector('header .tribute');
  if (tribute) tribute.textContent = 'inspired by ARIatHOME';

  /* Track metadata: compact on narrow screens and progressively warmer/redder as BPM rises. */
  if (typeof updateMeta === 'function') {
    const originalUpdateMeta = updateMeta;
    const mobile = window.matchMedia('(max-width: 640px)');
    const stops = [
      [70,  [82, 200, 192]],
      [100, [94, 156, 234]],
      [125, [167, 123, 255]],
      [145, [255, 95, 210]],
      [165, [255, 108, 88]],
      [185, [255, 55, 68]],
    ];
    const rgbForBpm = (bpm) => {
      const value = Number(bpm) || 100;
      if (value <= stops[0][0]) return stops[0][1];
      if (value >= stops.at(-1)[0]) return stops.at(-1)[1];
      for (let i = 1; i < stops.length; i++) {
        if (value <= stops[i][0]) {
          const [aBpm, a] = stops[i - 1], [bBpm, b] = stops[i];
          const t = (value - aBpm) / (bBpm - aBpm);
          return a.map((v, j) => Math.round(v + (b[j] - v) * t));
        }
      }
      return stops[0][1];
    };
    const applyMeta = () => {
      if (typeof track === 'undefined' || !track) return;
      const el = $('trackmeta');
      if (!el) return;
      if (mobile.matches) {
        const genre = typeof displayGenre === 'function' ? displayGenre(track.genre) : track.genre;
        el.textContent = `${genre || 'live'} · ${track.keyName || '—'} · ${track.bpm || '—'} bpm`;
      }
      let [r, g, b] = rgbForBpm(track.bpm);
      if (document.body.classList.contains('light')) {
        r = Math.round(r * .72); g = Math.round(g * .72); b = Math.round(b * .72);
      }
      el.style.color = `rgb(${r} ${g} ${b})`;
      el.style.textShadow = `0 0 10px rgb(${r} ${g} ${b} / .18)`;
    };
    updateMeta = function(sec) {
      originalUpdateMeta(sec);
      applyMeta();
    };
    applyMeta();
  }

  /* Rig fader caps follow the same projected Y-axis as their slots. */
  const faders = [...Array(8)].map((_, i) => $('fader' + i));
  const translate = /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/;
  function correctFaderAxes() {
    for (const el of faders) {
      if (!el) continue;
      const match = (el.style.transform || '').match(translate);
      if (!match) continue;
      const x = Number(match[1]), y = Number(match[2]);
      if (x < 0 && y < 0) el.style.transform = `translate(${match[1]}px,${Math.abs(y).toFixed(1)}px)`;
    }
    requestAnimationFrame(correctFaderAxes);
  }
  requestAnimationFrame(correctFaderAxes);

  /* Move rig battery out of the weather readout and under 'live from the grid'. */
  const footer = document.querySelector('footer');
  if (footer) {
    /* Normalize even if a previous hot-reload left an old stack in the DOM. */
    document.getElementById('ariLiveStack')?.remove();
    const dot = footer.querySelector('.liveDot');
    const label = [...footer.children].find(el => el.tagName === 'SPAN' && !el.classList.contains('liveDot'));
    const theme = $('themebtn');
    if (dot && label) {
      const stack = document.createElement('div');
      stack.id = 'ariLiveStack';
      const liveRow = document.createElement('div');
      liveRow.id = 'ariLiveRow';
      label.classList.add('ariLiveLabel');
      liveRow.append(dot, label);

      const battery = document.createElement('div');
      battery.id = 'ariRigBattery';
      battery.innerHTML = '<span>rig battery</span><span id="ariBatteryTrack" role="meter" aria-label="rig battery" aria-valuemin="0" aria-valuemax="100"><i id="ariBatteryFill"></i></span>';
      stack.append(liveRow, battery);
      footer.insertBefore(stack, theme || null);

      function currentBatteryPct() {
        try {
          if (typeof batteryIntermission !== 'undefined' && batteryIntermission) return null;
          if (typeof track !== 'undefined' && track && typeof tracksUntilBattery !== 'undefined' && typeof batteryTotal !== 'undefined' && typeof bar !== 'undefined') {
            const remaining = tracksUntilBattery - bar / Math.max(1, track.bars);
            return Math.max(1, Math.min(100, Math.round((remaining / batteryTotal) * 100)));
          }
        } catch (_) {}
        return 100;
      }
      function updateRigBatteryBar() {
        const fill = $('ariBatteryFill');
        const meter = $('ariBatteryTrack');
        if (!fill || !meter) return;
        const pct = currentBatteryPct();
        if (pct == null) {
          battery.classList.add('swapping');
          fill.style.backgroundColor = 'var(--magenta)';
          meter.removeAttribute('aria-valuenow');
          meter.setAttribute('aria-valuetext', 'swapping now');
          return;
        }
        battery.classList.remove('swapping');
        meter.setAttribute('aria-valuenow', String(pct));
        meter.removeAttribute('aria-valuetext');
        fill.style.width = `${pct}%`;
        try {
          fill.style.backgroundColor = typeof battColor === 'function'
            ? battColor(pct)
            : (pct < 25 ? '#ff4d5d' : pct < 55 ? '#ffad66' : 'var(--cyan)');
        } catch (_) {
          fill.style.backgroundColor = pct < 25 ? '#ff4d5d' : pct < 55 ? '#ffad66' : 'var(--cyan)';
        }
      }
      updateRigBatteryBar();
      setInterval(updateRigBatteryBar, 1000);
    }
  }
})();
