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

/* Public UI normalization — compact status, in-world battery, no technical clutter. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* Track name is display-only. Replacing the node removes the legacy long-press
     listener that index.html attached earlier in startup. */
  const oldTrackName = $('trackname');
  if (oldTrackName) {
    const fresh = oldTrackName.cloneNode(true);
    oldTrackName.replaceWith(fresh);
    for (const attr of ['tabindex', 'role', 'aria-label', 'aria-expanded']) fresh.removeAttribute(attr);
    fresh.style.cursor = 'default';
  }

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
    /* Identity + weather + tribute: same system font and scale. */
    header > p:not(.tribute){font-size:14px!important;letter-spacing:.22em!important;line-height:1.35!important;margin-top:5px!important}
    #wxText{margin-top:8px!important;font-size:11.5px!important;line-height:1.5!important;letter-spacing:.11em!important}
    #wxBattery,#wxText br{display:none!important}
    header .tribute{display:block!important;margin-top:7px!important;font-family:"IBM Plex Mono",monospace!important;font-size:11.5px!important;font-weight:400!important;letter-spacing:.11em!important;line-height:1.5!important;text-transform:none!important;color:#ffe66d!important;text-shadow:0 0 5px rgba(255,230,109,.52),0 0 12px rgba(255,230,109,.22)!important;opacity:.95!important;transform:none!important}
    body.light header .tribute{color:#8a6a00!important;text-shadow:0 0 5px rgba(255,196,0,.13)!important}

    .wxCond::before,.wxCond::after{display:none!important}

    /* Track block: title + musical identity only. No track no., time or section. */
    #trackNumTime{display:none!important}
    #trackname,#trackmeta{font-size:12px!important;line-height:1.65!important;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #trackname{font-weight:600!important;letter-spacing:.18em!important;cursor:default!important;pointer-events:auto!important;color:var(--text)!important}
    #trackmeta{font-weight:400!important;letter-spacing:.14em!important}

    /* Top-right returns to a single clean status row; battery now lives on A.R.I. */
    footer{align-items:center!important;gap:10px!important;font-size:11px!important}
    footer .liveDot{flex:0 0 auto}
    footer > span:not(.liveDot){font-size:11px!important;line-height:18px!important;letter-spacing:.20em!important}
    #themebtn{margin:0!important;transform:none!important;align-self:center!important}
    #ariLiveStack,#ariRigBattery{display:none!important}

    @media(max-width:640px){
      header > p:not(.tribute){font-size:12.5px!important;letter-spacing:.16em!important}
      #wxText,header .tribute{font-size:10.5px!important;letter-spacing:.09em!important}
      #trackname,#trackmeta{font-size:11px!important;line-height:1.55!important}
      footer > span:not(.liveDot){font-size:10.5px!important}
    }
  `;
  document.head.appendChild(style);

  /* Weather above tribute. Keep tribute wording, remove only legacy version suffix. */
  const tribute = document.querySelector('header .tribute');
  const weather = $('wxText');
  if (tribute) tribute.textContent = 'inspired by ARIatHOME';
  if (tribute && weather && tribute.parentElement === weather.parentElement) {
    tribute.parentElement.insertBefore(weather, tribute);
  }

  /* Undo older hot-reload/footer battery DOM if present. */
  const footer = document.querySelector('footer');
  const oldStack = $('ariLiveStack');
  if (footer && oldStack) {
    const liveRow = oldStack.querySelector('#ariLiveRow');
    const dot = liveRow?.querySelector('.liveDot');
    const label = liveRow?.querySelector('.ariLiveLabel');
    const theme = $('themebtn');
    if (dot) footer.insertBefore(dot, theme || null);
    if (label) {
      label.classList.remove('ariLiveLabel');
      footer.insertBefore(label, theme || null);
    }
    oldStack.remove();
  }

  /* Track metadata: preserve genre/key/BPM, colour it from cool -> warm as tempo rises. */
  if (typeof updateMeta === 'function') {
    const originalUpdateMeta = updateMeta;
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
      const genre = typeof displayGenre === 'function' ? displayGenre(track.genre) : track.genre;
      el.textContent = `${genre || 'live'} · ${track.keyName || '—'} · ${track.bpm || '—'} bpm`;
      let [r, g, b] = rgbForBpm(track.bpm);
      if (document.body.classList.contains('light')) {
        r = Math.round(r * .68); g = Math.round(g * .68); b = Math.round(b * .68);
      }
      el.style.color = `rgb(${r} ${g} ${b})`;
      el.style.textShadow = document.body.classList.contains('light')
        ? 'none'
        : `0 0 10px rgb(${r} ${g} ${b} / .18)`;
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


})();


/* Hidden operator console polish — Shift+D only. Keeps the existing inspector data,
   but presents it as a centered A.R.I. console and exposes direct test hooks for
   existing runtime events. Public UI is untouched. */
(() => {
  'use strict';
  const panel = document.getElementById('devPanel');
  if (!panel) return;

  const style = document.createElement('style');
  style.id = 'ari-operator-console-v17';
  style.textContent = `
    .devpanel{
      top:50%!important;left:50%!important;right:auto!important;
      width:min(860px,calc(100vw - 48px))!important;max-width:none!important;
      max-height:min(82svh,820px)!important;
      padding:18px 20px 20px!important;
      border:1px solid rgba(62,232,222,.42)!important;
      border-radius:14px!important;
      background:
        linear-gradient(180deg,rgba(7,9,18,.975),rgba(3,5,11,.985))!important;
      box-shadow:
        0 0 0 1px rgba(255,95,210,.08),
        0 0 28px rgba(62,232,222,.11),
        0 0 64px rgba(255,95,210,.07),
        0 24px 70px rgba(0,0,0,.68)!important;
      font-family:"IBM Plex Mono",monospace!important;
      font-size:11px!important;line-height:1.55!important;
      letter-spacing:.02em!important;
      transform:translate(-50%,-50%) scale(.985)!important;
    }
    .devpanel::before{
      content:"";position:absolute;inset:7px;pointer-events:none;border-radius:10px;
      border:1px solid rgba(167,139,255,.10);
      box-shadow:inset 0 0 26px rgba(62,232,222,.025);
    }
    .devpanel.show{transform:translate(-50%,-50%) scale(1)!important}
    .devsticky{position:sticky!important;top:-18px!important;z-index:3!important;
      margin:-2px -2px 10px!important;padding:2px 2px 10px!important;
      background:linear-gradient(180deg,rgba(7,9,18,.995) 72%,rgba(7,9,18,.88))!important;
      border-bottom:1px solid rgba(62,232,222,.22)!important;
      backdrop-filter:blur(10px);
    }
    .devhead{font-size:11px!important;color:#3ee8de!important;letter-spacing:.17em!important}
    .devname{font-size:11px!important;line-height:1.55!important}
    .devh{font-size:11px!important;color:#ff5fd2!important;letter-spacing:.13em!important;margin-bottom:6px!important}
    .devh2,.krow,.prow,.arrow,.dnarow,.dflags,.devChatMsg,.devnone{font-size:11px!important}
    .devsec{padding:10px 0!important;border-color:rgba(62,232,222,.12)!important}
    #devClose{
      width:28px!important;height:28px!important;padding:0!important;margin:0!important;
      display:grid!important;place-items:center!important;border:0!important;border-radius:50%!important;
      background:transparent!important;color:#dfeef0!important;font-size:20px!important;
      line-height:1!important;box-shadow:none!important;outline:none!important;
    }
    #devClose:hover{color:#ff5fd2!important;text-shadow:0 0 10px rgba(255,95,210,.6)!important}
    #devClose:focus-visible{outline:none!important;box-shadow:0 0 0 1px rgba(62,232,222,.75),0 0 12px rgba(62,232,222,.24)!important}
    .ariDevControls{
      display:flex;flex-wrap:wrap;gap:7px;margin:9px 0 2px;padding:10px 0 2px;
      border-top:1px solid rgba(167,139,255,.16);
    }
    .ariDevControls::before{
      content:"EVENT TEST";flex-basis:100%;margin-bottom:2px;color:#ffe66d;
      font-size:11px;letter-spacing:.15em;
    }
    .ariDevBtn{
      appearance:none;border:1px solid rgba(62,232,222,.34);border-radius:999px;
      background:rgba(62,232,222,.035);color:#dfeef0;padding:6px 10px;
      font:500 11px/1.2 "IBM Plex Mono",monospace;letter-spacing:.04em;cursor:pointer;
      transition:border-color .16s ease,color .16s ease,background .16s ease,box-shadow .16s ease;
    }
    .ariDevBtn:hover{border-color:#ff5fd2;color:#fff;background:rgba(255,95,210,.07);box-shadow:0 0 12px rgba(255,95,210,.12)}
    .ariDevBtn:focus-visible{outline:none;box-shadow:0 0 0 1px #3ee8de,0 0 12px rgba(62,232,222,.2)}
    .ariDevBtn[data-action="battery"]{border-color:rgba(255,230,109,.42);color:#ffe66d}
    .ariDevBtn[data-action="reverse"]{border-color:rgba(255,95,210,.42);color:#ff8bde}
    body.light .devpanel{
      background:linear-gradient(180deg,rgba(249,251,253,.985),rgba(241,245,248,.99))!important;
      border-color:rgba(11,156,147,.38)!important;
      box-shadow:0 0 0 1px rgba(116,82,232,.07),0 18px 56px rgba(38,52,68,.18)!important;
    }
    body.light .devpanel::before{border-color:rgba(116,82,232,.10)}
    body.light .devsticky{background:linear-gradient(180deg,rgba(249,251,253,.995) 72%,rgba(249,251,253,.9))!important;border-color:rgba(11,156,147,.18)!important}
    body.light #devClose{color:#16202a!important}
    body.light .ariDevControls::before{color:#8a6a00}
    body.light .ariDevBtn{background:rgba(11,156,147,.035);border-color:rgba(11,156,147,.28);color:#16202a}
    body.light .ariDevBtn[data-action="battery"]{color:#8a6a00;border-color:rgba(138,106,0,.28)}
    body.light .ariDevBtn[data-action="reverse"]{color:#a1267d;border-color:rgba(161,38,125,.28)}
    @media(max-width:640px){
      .devpanel{
        top:10px!important;left:10px!important;right:10px!important;width:auto!important;
        max-height:calc(100svh - 20px)!important;padding:14px 14px 16px!important;
        transform:translateY(-5px) scale(.99)!important;font-size:10.5px!important;
      }
      .devpanel.show{transform:none!important}
      .devsticky{top:-14px!important}
      .devhead,.devname,.devh,.devh2,.krow,.prow,.arrow,.dnarow,.dflags,.devChatMsg,.devnone,.ariDevBtn,.ariDevControls::before{font-size:10.5px!important}
      .ariDevBtn{padding:6px 9px}
    }
  `;
  document.head.appendChild(style);

  function injectControls() {
    if (!panel.classList.contains('show')) return;
    if (panel.querySelector('.ariDevControls')) return;
    const anchor = panel.querySelector('.devsticky') || panel.firstElementChild;
    if (!anchor) return;
    const controls = document.createElement('div');
    controls.className = 'ariDevControls';
    controls.innerHTML = `
      <button class="ariDevBtn" type="button" data-action="newtrack">new track</button>
      <button class="ariDevBtn" type="button" data-action="location">new location</button>
      <button class="ariDevBtn" type="button" data-action="mic">A.R.I. mic</button>
      <button class="ariDevBtn" type="button" data-action="reverse">reverse camera</button>
      <button class="ariDevBtn" type="button" data-action="battery">battery swap</button>`;
    anchor.appendChild(controls);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(injectControls));
  observer.observe(panel, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  requestAnimationFrame(injectControls);

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('.ariDevBtn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    try {
      if (action === 'newtrack' && typeof newTrack === 'function') {
        newTrack();
      } else if (action === 'location' && typeof nextLocation === 'function') {
        nextLocation();
      } else if (action === 'mic' && typeof startAriSing === 'function') {
        if (typeof ctx !== 'undefined' && ctx) startAriSing(ctx.currentTime);
        setTimeout(() => { if (typeof stopAriSing === 'function') stopAriSing(); }, 4200);
      } else if (action === 'reverse' && typeof doReverse === 'function') {
        doReverse();
      } else if (action === 'battery' && typeof runBatterySwap === 'function') {
        runBatterySwap();
      }
    } catch (error) {
      console.warn('[A.R.I. operator console]', action, error);
    }
  });
})();
