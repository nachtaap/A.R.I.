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

/* Track-meta cleanup — compact on mobile, tempo-coloured everywhere. */
(() => {
  'use strict';
  if (typeof updateMeta !== 'function') return;
  const originalUpdateMeta = updateMeta;
  const mobile = window.matchMedia('(max-width: 640px)');
  function compactTrackMeta() {
    if (!mobile.matches || typeof track === 'undefined' || !track) return;
    const el = document.getElementById('trackmeta');
    if (!el) return;
    const genre = typeof displayGenre === 'function' ? displayGenre(track.genre) : track.genre;
    el.textContent = `${genre || 'live'} · ${track.keyName || '—'} · ${track.bpm || '—'} bpm`;
  }
  function colourTrackMeta() {
    const el = document.getElementById('trackmeta');
    if (!el || typeof track === 'undefined' || !track) return;
    const bpm = Number(track.bpm) || 100;
    const t = Math.max(0, Math.min(1, (bpm - 70) / 120));
    // Slow tracks live in cool cyan/blue; faster tracks travel through warmer hues into red.
    const hue = Math.round(195 * (1 - t));
    const light = document.body.classList.contains('light') ? 39 : 66;
    const color = `hsl(${hue} 82% ${light}%)`;
    el.style.color = color;
    el.style.textShadow = `0 0 10px hsl(${hue} 82% ${light}% / .16)`;
  }
  updateMeta = function(sec) {
    originalUpdateMeta(sec);
    compactTrackMeta();
    colourTrackMeta();
  };
  compactTrackMeta();
  colourTrackMeta();
})();

/* Weather readout cleanup — keep condition styling without a link-like underline. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `.wxCond::before,.wxCond::after{display:none!important}`;
  document.head.appendChild(style);
})();


/* Rig visual cleanup — align animated fader caps with their isometric slots. */
(() => {
  'use strict';
  const faders = [...Array(8)].map((_, i) => document.getElementById('fader' + i));
  const translate = /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/;
  function correctFaderAxes() {
    for (const el of faders) {
      if (!el) continue;
      const raw = el.style.transform || '';
      const match = raw.match(translate);
      if (!match) continue;
      const x = Number(match[1]), y = Number(match[2]);
      // Fader slots vary along rig-Y: iso(0,+y,0) => (-IA,+IB), not (-IA,-IB).
      if (x < 0 && y < 0) {
        el.style.transform = `translate(${match[1]}px,${Math.abs(y).toFixed(1)}px)`;
      }
    }
    requestAnimationFrame(correctFaderAxes);
  }
  requestAnimationFrame(correctFaderAxes);
})();

/* Interface hierarchy — simplify the top-left readout and move rig battery into the live-status block. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    header > p:not(.tribute){font-size:13px!important;letter-spacing:.22em!important;line-height:1.45!important;margin-top:5px!important}
    header .tribute{display:none!important}
    #wxBattery,#wxText br{display:none!important}
    #wxText{margin-top:8px!important}
    footer{align-items:flex-start!important;gap:10px!important}
    #ariLiveStack{display:flex;flex-direction:column;align-items:flex-start;gap:7px}
    #ariLiveRow{display:flex;align-items:center;gap:8px;white-space:nowrap}
    #ariLiveRow .ariLiveLabel{font-size:11px;letter-spacing:.22em;color:var(--support)}
    #ariRigBattery{display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:8px;letter-spacing:.17em;color:var(--support)}
    #ariBatteryTrack{width:92px;height:4px;border:1px solid var(--cyan-dim);border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--bg) 82%,var(--support) 18%)}
    #ariBatteryFill{display:block;width:100%;height:100%;background:var(--cyan);transform-origin:left center;transition:width .45s ease,background-color .45s ease,opacity .25s ease}
    #ariRigBattery.swapping #ariBatteryFill{width:36%!important;animation:ariBatterySwap .8s ease-in-out infinite alternate}
    @keyframes ariBatterySwap{from{transform:translateX(0);opacity:.45}to{transform:translateX(175%);opacity:1}}
    @media(max-width:640px){header > p:not(.tribute){font-size:12px!important;letter-spacing:.18em!important}#ariBatteryTrack{width:76px}}
  `;
  document.head.appendChild(style);

  const footer = document.querySelector('footer');
  if (!footer || document.getElementById('ariLiveStack')) return;
  const dot = footer.querySelector('.liveDot');
  const label = [...footer.children].find(el => el.tagName === 'SPAN' && !el.classList.contains('liveDot'));
  const theme = document.getElementById('themebtn');
  if (!dot || !label) return;

  const stack = document.createElement('div');
  stack.id = 'ariLiveStack';
  const liveRow = document.createElement('div');
  liveRow.id = 'ariLiveRow';
  label.classList.add('ariLiveLabel');
  liveRow.append(dot, label);

  const battery = document.createElement('div');
  battery.id = 'ariRigBattery';
  battery.innerHTML = '<span>rig battery</span><span id="ariBatteryTrack"><i id="ariBatteryFill"></i></span>';
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
    const fill = document.getElementById('ariBatteryFill');
    if (!fill) return;
    const pct = currentBatteryPct();
    if (pct == null) {
      battery.classList.add('swapping');
      fill.style.backgroundColor = 'var(--magenta)';
      return;
    }
    battery.classList.remove('swapping');
    fill.style.width = `${pct}%`;
    try {
      fill.style.backgroundColor = typeof battColor === 'function' ? battColor(pct) : (pct < 25 ? '#ff4d5d' : pct < 55 ? '#ffad66' : 'var(--cyan)');
    } catch (_) {
      fill.style.backgroundColor = pct < 25 ? '#ff4d5d' : pct < 55 ? '#ffad66' : 'var(--cyan)';
    }
  }
  updateRigBatteryBar();
  setInterval(updateRigBatteryBar, 1000);
})();
