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

/* A.R.I. Track Signal Overlay — minimal neon readout, public-facing rather than the dev inspector. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hash=value=>{let h=2166136261>>>0;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const css=document.createElement('style');
  css.textContent=`
  #ariSignalOverlay{position:fixed;inset:0;z-index:80;display:none;place-items:center;padding:24px;background:rgba(5,8,15,.74);backdrop-filter:blur(10px);font-family:"IBM Plex Mono",monospace;color:#dffcff}
  #ariSignalOverlay.open{display:grid} .ariSigPanel{width:min(980px,94vw);max-height:calc(100svh - 44px);overflow:hidden;background:linear-gradient(180deg,rgba(10,16,28,.97),rgba(5,9,18,.97));border:1px solid rgba(82,200,192,.42);box-shadow:0 0 0 1px rgba(255,95,210,.08),0 0 42px rgba(82,200,192,.14);padding:18px 22px}
  .ariSigTop{display:flex;align-items:flex-start;gap:18px}.ariSigTitle{flex:1}.ariSigKicker{font-size:13px;letter-spacing:.28em;color:#52c8c0;text-transform:uppercase}.ariSigName{font-family:"Space Grotesk",sans-serif;font-size:clamp(22px,4vw,36px);letter-spacing:.03em;margin-top:4px}.ariSigMeta{font-size:15px;letter-spacing:.12em;color:#8995a8;text-transform:uppercase;margin-top:5px}
  .ariSigClose{appearance:none;border:1px solid rgba(255,95,210,.45);background:transparent;color:#ff5fd2;width:34px;height:34px;cursor:pointer;font:18px/1 monospace}.ariSigClose:hover{box-shadow:0 0 14px rgba(255,95,210,.28)}
  .ariSigBlock{margin-top:13px;border-top:1px solid rgba(82,200,192,.18);padding-top:12px}.ariSigHead{display:flex;justify-content:space-between;gap:12px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#a795e0;margin-bottom:10px}.ariSigDim{color:#687589;letter-spacing:.08em}
  .ariBars{display:grid;grid-template-columns:repeat(8,1fr);gap:5px}.ariBar{min-height:76px;border:1px solid rgba(82,200,192,.14);padding:7px 5px;position:relative;background:rgba(82,200,192,.018)}.ariBar.now{border-color:rgba(255,95,210,.62);box-shadow:inset 0 0 18px rgba(255,95,210,.07)}.ariBarN{font-size:13px;color:#667385;margin-bottom:7px}.ariLayer{height:3px;margin:4px 0;background:#1d2734}.ariLayer.on.c{background:#52c8c0;box-shadow:0 0 6px rgba(82,200,192,.55)}.ariLayer.on.p{background:#a795e0;box-shadow:0 0 6px rgba(167,149,224,.45)}.ariLayer.on.m{background:#ff5fd2;box-shadow:0 0 6px rgba(255,95,210,.5)}.ariLayer.on.o{background:#ffad66;box-shadow:0 0 6px rgba(255,173,102,.42)}
  .ariRadarWrap{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}
  .ariRadar{
    width:142px;height:142px;border:1px solid rgba(82,200,192,.34);border-radius:50%;
    position:relative;overflow:hidden;
    background:
      radial-gradient(circle,transparent 0 24%,rgba(82,200,192,.07) 25% 26%,transparent 27% 49%,rgba(82,200,192,.06) 50% 51%,transparent 52%),
      linear-gradient(90deg,transparent 49.5%,rgba(82,200,192,.12) 50%,transparent 50.5%),
      linear-gradient(transparent 49.5%,rgba(82,200,192,.12) 50%,transparent 50.5%);
    box-shadow:inset 0 0 20px rgba(82,200,192,.04)
  }
  .ariRadar:after{
    content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;
    background:conic-gradient(from 0deg,transparent 0deg 326deg,rgba(82,200,192,.025) 334deg,rgba(82,200,192,.12) 346deg,rgba(82,200,192,.62) 359deg,rgba(82,200,192,.95) 360deg);
    animation:ariSweep 4.2s linear infinite;
    filter:drop-shadow(0 0 4px rgba(82,200,192,.24))
  }
  .ariDot{
    position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;
    background:#52c8c0;opacity:var(--ari-dot-base,.10);z-index:2;
    box-shadow:0 0 0 rgba(82,200,192,0);
    transition:opacity .12s ease,transform .12s ease,box-shadow .12s ease
  }
  .ariDot.hit{opacity:1;transform:scale(1.5);box-shadow:0 0 5px rgba(82,200,192,.95),0 0 13px rgba(82,200,192,.48)}
  .ariDot.echo{opacity:.38;transform:scale(1.1);box-shadow:0 0 6px rgba(82,200,192,.34)}
  @keyframes ariSweep{to{transform:rotate(360deg)}}
  .ariDot{position:absolute;width:5px;height:5px;border-radius:50%;background:#ff5fd2;box-shadow:0 0 8px #ff5fd2;z-index:2}  .ariListenerRow{position:relative;padding-right:54px;transition:opacity .16s ease,transform .16s ease}
  .ariListenerRow em{position:absolute;right:0;top:1px;font-style:normal;font-size:11px;color:#607681;letter-spacing:.06em}
  .ariListenerRow.scan{transform:translateX(2px)}
  .ariListenerRow.scan b,.ariListenerRow.scan .ariPulse{color:#52c8c0;text-shadow:0 0 8px rgba(82,200,192,.35)}
  body.light .ariListenerRow em{color:#78858d}
.ariListeners{display:grid;grid-template-columns:1fr 1fr;gap:7px 13px;font-size:15px;color:#9aa6b8}.ariListeners b{color:#dffcff;font-weight:500}.ariPulse{color:#52c8c0}
  .ariDna{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ariCard{border:1px solid rgba(167,149,224,.16);padding:9px;min-height:72px}.ariCard span{display:block;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#6f7b8d}.ariCard b{display:block;margin-top:7px;font-size:15px;font-weight:500;color:#e7f8fb;line-height:1.45}.ariCard em{display:block;margin-top:4px;font-size:13px;font-style:normal;color:#8995a8;line-height:1.45}
  #trackname{cursor:default;pointer-events:auto}@media(max-width:620px){.ariSigPanel{padding:14px}.ariBars{grid-template-columns:repeat(4,1fr)}.ariRadarWrap{grid-template-columns:1fr}.ariRadar{margin:auto}.ariDna{grid-template-columns:1fr}.ariListeners{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){.ariRadar:after{animation:none}.ariDot{opacity:.35}}

  .ariInfoGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .ariInfoCell{border:1px solid rgba(82,200,192,.14);padding:9px 10px;min-width:0}
  .ariInfoCell span{display:block;color:#6f8290;font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
  .ariInfoCell b{display:block;color:#d9eeee;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ariIdle{border:1px solid rgba(255,95,210,.22);padding:18px 20px;background:rgba(255,95,210,.025)}
  .ariIdle strong{display:block;color:#ff5fd2;font-size:17px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px}
  .ariIdle p{margin:0;color:#9fb0b8;font-size:15px;line-height:1.6}
  .ariEventBtn:disabled{opacity:.35;cursor:not-allowed;box-shadow:none!important}
  .ariEventNote{font-size:13px;color:#6f8290;align-self:center}
  body.light .ariInfoCell{border-color:rgba(10,122,114,.15)}
  body.light .ariInfoCell span,body.light .ariEventNote{color:#697780}
  body.light .ariInfoCell b{color:#16202a}
  body.light .ariIdle{border-color:rgba(161,38,125,.18);background:rgba(161,38,125,.025)}
  body.light .ariIdle strong{color:#a1267d}
  body.light .ariIdle p{color:#5f6b75}
  @media(max-width:760px){.ariInfoGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .ariEventRow{display:flex;flex-wrap:wrap;gap:7px}.ariExportBtn{border-color:rgba(255,95,210,.40)!important;color:#ff93dc!important;background:rgba(255,95,210,.045)!important}.ariExportBtn:hover{border-color:rgba(255,95,210,.72)!important;box-shadow:0 0 15px rgba(255,95,210,.10)}.ariEventBtn{appearance:none;border:1px solid rgba(82,200,192,.28);background:rgba(82,200,192,.025);color:#9fded9;padding:7px 10px;font:500 14px/1.35 "IBM Plex Mono",monospace;letter-spacing:.10em;text-transform:uppercase;cursor:pointer}
  .ariEventBtn:hover{border-color:rgba(255,95,210,.5);color:#ff5fd2;box-shadow:0 0 12px rgba(255,95,210,.10)}
  body.light .ariEventBtn{color:#0a7a72;border-color:rgba(10,122,114,.25);background:rgba(10,122,114,.025)}body.light .ariEventBtn:hover{color:#a1267d;border-color:rgba(161,38,125,.35)}
  body.light #ariSignalOverlay{background:rgba(235,241,245,.72);color:#16202a}body.light .ariSigPanel{background:rgba(247,250,252,.98);border-color:rgba(11,156,147,.34);box-shadow:0 8px 40px rgba(25,40,55,.16)}body.light .ariSigName,body.light .ariListeners b,body.light .ariCard b{color:#16202a}
  `;
  css.textContent += '#devPanel{display:none!important}';
  document.head.appendChild(css);
  const root=document.createElement('div');root.id='ariSignalOverlay';root.setAttribute('aria-hidden','true');
  root.innerHTML='<section class="ariSigPanel" role="dialog" aria-modal="true" aria-label="Track signal"><div id="ariSigBody"></div></section>';
  document.body.appendChild(root);
  let lastSeed=null,open=false;
  const curTrack=()=>typeof track!=='undefined'?track:null;
  function sectionFor(offset){try{return typeof sectionAt==='function'?sectionAt(bar+offset):'main';}catch(_){return'main';}}
  function instrumentText(t){
    const gear=t?.gear||{};return [gear.drumMachine||t?.drumFamily?.name||'drums',t?.foundationBassVoice||t?.bassType||gear.bassSynth||'bass',t?.leadWave||gear.leadSynth||'lead'].filter(Boolean).join(' · ');
  }
  function listenerData(t){
    const audience=t?.audienceBrain||null;
    const archetypes=Array.isArray(audience?.archetypes)&&audience.archetypes.length
      ? audience.archetypes
      : [
          {kind:'basshead',likes:['bass']},
          {kind:'drummer',likes:['drums']},
          {kind:'melody fan',likes:['melody']},
          {kind:'producer',likes:['arrangement']},
          {kind:'guest fan',likes:['guest']},
          {kind:'casual',likes:['hype']},
        ];
    const scores=audience?.scores||{};
    const reactions=Array.isArray(audience?.reactions)?audience.reactions:[];
    const seed=String(t?.seed||'ari');

    const hash01=(value)=>{
      let h=2166136261>>>0;
      for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
      h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;
      return (h>>>0)/4294967296;
    };
    const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

    const scoreFor=(kind,likes)=>{
      const k=String(kind||'').toLowerCase();
      const keys=[];
      if(k.includes('bass'))keys.push('bass');
      if(k.includes('drum'))keys.push('drums');
      if(k.includes('melody'))keys.push('melody');
      if(k.includes('producer'))keys.push('arrangement');
      if(k.includes('guest'))keys.push('guest');
      (likes||[]).forEach(x=>{
        const s=String(x).toLowerCase();
        if(/bass|drop/.test(s))keys.push('bass');
        if(/drum|fill|groove|timing/.test(s))keys.push('drums');
        if(/melody|hook|chord/.test(s))keys.push('melody');
        if(/guest|vocal|solo/.test(s))keys.push('guest');
        if(/transition|mix|arrangement|clutter/.test(s))keys.push('arrangement');
      });
      const vals=[...new Set(keys)].map(x=>Number(scores[x])).filter(Number.isFinite);
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:.5;
    };

    const latestReactionFor=(kind)=>{
      const low=String(kind||'').toLowerCase();
      const hit=[...reactions].reverse().find(r=>{
        const txt=String(r?.kind||r?.type||r?.source||r?.who||'').toLowerCase();
        return txt&&low.includes(txt);
      }) || reactions[reactions.length-1];
      const text=hit?.text||hit?.message||hit?.label||hit?.reaction||'';
      return String(text||'').trim();
    };

    return archetypes.slice(0,6).map((a,i)=>{
      const kind=String(a.kind||`listener ${i+1}`);
      const score=scoreFor(kind,a.likes);
      const retention=clamp(Number(audience?.retention??.88));
      const activity=clamp(Number(audience?.active??.5));
      const positivity=clamp(Number(audience?.traits?.positivity??.6));
      const engagement=clamp(score*.48+retention*.32+activity*.20);

      // Stable angle per track/archetype; radial distance carries engagement.
      const angle=hash01(`${seed}|audience-angle|${kind}`)*Math.PI*2;
      const radius=18+(1-engagement)*26; // highly engaged = closer to center
      const x=50+Math.cos(angle)*radius;
      const y=50+Math.sin(angle)*radius;
      const recent=latestReactionFor(kind);
      const reaction=recent || (
        score>.68 ? `locked on ${a.likes?.[0]||'the groove'}` :
        score<.38 ? `not fully convinced` :
        activity>.58 ? `active in the signal` :
        `listening`
      );
      return {
        name:kind,
        react:reaction,
        x:+x.toFixed(2),
        y:+y.toFixed(2),
        engagement,
        score,
        activity,
        retention,
        positivity,
      };
    });
  }

  // ---------- Ableton export ----------
  // Standard MIDI File writer + tiny ZIP "store" writer; no external libraries.
  const MIDI_PPQ=480;
  const te=new TextEncoder();
  const u16=n=>[(n>>>8)&255,n&255],u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
  const vlen=n=>{let b=n&127,out=[];while((n>>>=7)){b<<=8;b|=(n&127)|128;}for(;;){out.push(b&255);if(b&128)b>>>=8;else break;}return out;};
  const ascii=s=>Array.from(te.encode(String(s)));
  function midiChunk(tag,data){return [...ascii(tag),...u32(data.length),...data];}
  function metaText(type,text){const a=ascii(text);return [0xff,type,...vlen(a.length),...a];}
  function midiTrack(name,events){
    const all=[{tick:0,ord:-5,bytes:metaText(0x03,name)},...events].sort((a,b)=>a.tick-b.tick||(a.ord||0)-(b.ord||0));
    let last=0,data=[];
    all.forEach(e=>{const tick=Math.max(0,Math.round(e.tick));data.push(...vlen(tick-last),...e.bytes);last=tick;});
    data.push(0,0xff,0x2f,0);
    return midiChunk('MTrk',data);
  }
  function noteEvents(note,start,dur,vel=96,ch=0){
    const n=Math.max(0,Math.min(127,Math.round(note))),v=Math.max(1,Math.min(127,Math.round(vel)));
    const s=Math.max(0,Math.round(start)),e=Math.max(s+1,Math.round(start+dur));
    return [
      {tick:s,ord:1,bytes:[0x90|(ch&15),n,v]},
      {tick:e,ord:0,bytes:[0x80|(ch&15),n,0]}
    ];
  }
  function conductorEvents(t){
    const mpqn=Math.round(60000000/Math.max(1,t.bpm||120)),ev=[
      {tick:0,ord:-4,bytes:[0xff,0x51,0x03,(mpqn>>>16)&255,(mpqn>>>8)&255,mpqn&255]},
      {tick:0,ord:-3,bytes:[0xff,0x58,0x04,4,2,24,8]},
      {tick:0,ord:-2,bytes:metaText(0x01,`A.R.I. · ${t.name||'untitled'} · ${t.keyName||''}`)}
    ];
    (t.sections||[]).forEach(s=>ev.push({tick:(s.start||0)*MIDI_PPQ*4,ord:-1,bytes:metaText(0x06,String(s.name||'section').toUpperCase())}));
    if(t.special?.bar!=null)ev.push({tick:t.special.bar*MIDI_PPQ*4,ord:-1,bytes:metaText(0x06,`SPECIAL: ${t.special.type}`)});
    if(t.cutBar!=null)ev.push({tick:t.cutBar*MIDI_PPQ*4,ord:-1,bytes:metaText(0x06,'DJ CUT')});
    return ev;
  }
  function microTicks(sec,t){return Math.round((Number(sec)||0)*(t.bpm||120)/60*MIDI_PPQ);}
  function degreeMidi(t,ev,base=t.root+24){
    const n=t.scale?.length||7,idx=Number(ev.degree)||0,oct=Math.floor(idx/n),cls=((idx%n)+n)%n;
    return base+oct*12+(t.scale?.[cls]||0)+(ev.chromatic||0);
  }
  function exportTrackData(t){
    const drums=[],bass=[],chords=[],lead=[],vocal=[];
    const stepTicks=MIDI_PPQ/4,barTicks=MIDI_PPQ*4;
    for(let b=0;b<t.bars;b++){
      const base=b*barTicks,d=t.drumBrain?.plan?.[b];
      if(d){
        const drumDefs=[
          ['kick',36,108],['snare',38,104],['ghost',38,55],['hats',42,76]
        ];
        drumDefs.forEach(([key,note,defVel])=>{
          const patt=d[key]||[];
          for(let s=0;s<16;s++)if(patt[s]){
            const velMap=d.velocity?.[key],vel=Math.round(127*Math.min(1,velMap?.[s]||defVel/127));
            const mt=microTicks(d.micro?.[key]?.[s]||0,t);
            drums.push(...noteEvents(note,base+s*stepTicks+mt,Math.max(35,stepTicks*.48),vel,9));
          }
        });
        const cow=d.aux?.cowbell||[];
        for(let s=0;s<16;s++)if(cow[s])drums.push(...noteEvents(56,base+s*stepTicks,stepTicks*.5,82,9));
        const fs=d.fillSnare||[],fh=d.fillHat||[];
        for(let s=0;s<16;s++)if(fs[s])drums.push(...noteEvents(38,base+s*stepTicks,stepTicks*.42,82,9));
        for(let s=0;s<16;s++)if(fh[s])drums.push(...noteEvents(42,base+s*stepTicks,stepTicks*.34,66,9));
      }
      const bp=t.bassBrain?.plan?.[b]||[];
      bp.forEach(e=>{
        const midi=typeof bassMidiForEvent==='function'?bassMidiForEvent(t,b,e):degreeMidi(t,e,t.root-12);
        const start=base+e.step*stepTicks+microTicks(e.micro||0,t),dur=Math.max(stepTicks*.65,(e.durSteps||1)*stepTicks*.92);
        bass.push(...noteEvents(midi,start,dur,Math.round(127*Math.min(1,e.velocity||.8)),1));
      });
      // Harmony guide: the same harmonic context the scheduler reads.
      if(b%(Math.max(1,t.chordBars||2))===0){
        const h=typeof harmonicContextAt==='function'?harmonicContextAt(t,b):null;
        if(h?.tones){
          const span=Math.min(t.chordBars||2,t.bars-b)*barTicks;
          h.tones.forEach((iv,i)=>chords.push(...noteEvents(t.root+12+iv,base,span*.92,72-i*4,2)));
        }
      }
      const personality=(typeof melodyPersonalityFor==='function')?melodyPersonalityFor(t.leadWave||t.gear?.leadSynth||'synth',false):'synth';
      const lp=t.melodyBrain?.plans?.[personality]||t.melodyBrain?.plans?.synth;
      (lp?.plan?.[b]||[]).forEach(e=>{
        const midi=typeof melodyMidi==='function'?melodyMidi(t,e,personality,false):degreeMidi(t,e,t.root+24);
        lead.push(...noteEvents(midi,base+e.step*stepTicks,Math.max(stepTicks*.7,(e.dur||2)*stepTicks*.88),Math.round(127*Math.min(1,e.velocity||.8)),3));
      });
      (t.vocalBrain?.plan?.[b]||[]).forEach(e=>{
        const midi=degreeMidi(t,e,t.root+18);
        vocal.push(...noteEvents(midi,base+e.step*stepTicks+microTicks((e.micro||0)*(60/(t.bpm||120))/4,t),Math.max(stepTicks*.5,(e.dur||1)*stepTicks*.82),Math.round(127*Math.min(1,e.velocity||.7)),4));
      });
    }
    return {drums,bass,chords,lead,vocal};
  }
  function buildMidi(t,selected=['drums','bass','chords','lead','vocal']){
    const data=exportTrackData(t),tracks=[midiTrack('A.R.I. CONDUCTOR',conductorEvents(t))];
    const names={drums:'DRUMS',bass:'BASS',chords:'CHORDS / PAD GUIDE',lead:'LEAD',vocal:'A.R.I. VOCAL GUIDE'};
    selected.forEach(k=>tracks.push(midiTrack(names[k],data[k]||[])));
    return new Uint8Array([...midiChunk('MThd',[0,1,...u16(tracks.length),...u16(MIDI_PPQ)]),...tracks.flat()]);
  }
  function crc32(bytes){
    let c=0xffffffff;
    for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
    return (c^0xffffffff)>>>0;
  }
  function zipStore(files){
    let local=[],central=[],offset=0;
    files.forEach(f=>{
      const name=ascii(f.name),data=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data),crc=crc32(data);
      const lh=[0x50,0x4b,0x03,0x04,20,0,0,0,0,0,0,0,0,0,...u32(crc).reverse(),...u32(data.length).reverse(),...u32(data.length).reverse(),...u16(name.length).reverse(),0,0,...name];
      // rewrite little-endian fields explicitly
      const le16=n=>[n&255,(n>>>8)&255],le32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
      const localHdr=[0x50,0x4b,0x03,0x04,...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0),...name];
      const cent=[0x50,0x4b,0x01,0x02,...le16(20),...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(offset),...name];
      local.push(...localHdr,...data);central.push(...cent);offset+=localHdr.length+data.length;
    });
    const le16=n=>[n&255,(n>>>8)&255],le32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
    const end=[0x50,0x4b,0x05,0x06,...le16(0),...le16(0),...le16(files.length),...le16(files.length),...le32(central.length),...le32(local.length),...le16(0)];
    return new Uint8Array([...local,...central,...end]);
  }
  function safeFileName(s){return String(s||'ari-track').toLowerCase().replace(/[“”"'`]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'ari-track';}
  function downloadBlob(data,name,type='application/octet-stream'){
    const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  }
  function exportAbleton(t){
    if(!t)return;
    const base=safeFileName(t.name),full=buildMidi(t),parts=['drums','bass','chords','lead','vocal'];
    const info={
      app:'A.R.I. — Audiological Roaming Intelligence',
      exportVersion:1,
      title:t.name,genre:t.genre,subStyle:t.subStyle||null,bpm:t.bpm,key:t.keyName,scale:t.scaleName,
      seed:t.seed,trackId:t.trackId,generatorVersion:t.generatorVersion,bars:t.bars,chordBars:t.chordBars,
      progression:t.prog,sections:t.sections,special:t.special||null,djCutBar:t.cutBar,
      gear:t.gear,bassType:t.bassType,leadWave:t.leadWave,
      note:'MIDI is exported directly from A.R.I.’s pre-composed drum, bass, melody and harmonic plans. Audio synthesis/effects are not rendered in this version.'
    };
    const readme=`A.R.I. → Ableton export\n\n${t.name}\n${t.genre}${t.subStyle?' · '+t.subStyle:''}\n${t.keyName} · ${t.bpm} BPM · ${t.bars} bars\nseed: ${t.seed}\n\nFiles\n- ${base}.mid — multitrack Standard MIDI File (conductor, drums, bass, chords, lead, A.R.I. vocal guide)\n- drums.mid / bass.mid / chords.mid / lead.mid / ari-vocal.mid — isolated MIDI parts\n- track-info.json — A.R.I. composition metadata and arrangement\n\nImport ${base}.mid into Ableton Live. The tempo and section markers are embedded in the MIDI. Assign your own instruments/drum rack after import.\n\nThis first exporter transfers the composition, not A.R.I.’s browser synth sound. WAV stems can be added later.\n`;
    const files=[
      {name:`${base}.mid`,data:full},
      ...parts.map(k=>({name:k==='vocal'?'ari-vocal.mid':`${k}.mid`,data:buildMidi(t,[k])})),
      {name:'track-info.json',data:te.encode(JSON.stringify(info,null,2))},
      {name:'README.txt',data:te.encode(readme)}
    ];
    downloadBlob(zipStore(files),`${base}-ari-ableton.zip`,'application/zip');
    console.info('[A.R.I.] Ableton export created',{title:t.name,bpm:t.bpm,bars:t.bars,files:files.map(x=>x.name)});
  }

  function runtimeInfo(t){
    const audioState=(typeof ctx!=='undefined'&&ctx)?ctx.state:'not started';
    const section=(t&&typeof sectionAt==='function'&&typeof bar==='number')?sectionAt(bar):'—';
    const loc=(typeof curLoc!=='undefined'&&curLoc)?curLoc:'NYC street grid';
    const state=t?(typeof playing!=='undefined'&&playing?'live':'paused'):'idle';
    const engine=window.ARIBeatFoundation?.version||window.ARIMusicEvolution?.version||'runtime';
    return {audioState,section,loc,state,engine};
  }
  function render(){
    const t=curTrack();
    const info=runtimeInfo(t);


    const p=window.ARICreatures?.status, sig=window.ARIMusicEvolution?.signature; const listeners=listenerData(t);
    const effects=p?.effects; const current=((typeof bar==='number'?bar:0)%8+8)%8;
    let bars='';for(let i=0;i<8;i++){const sec=sectionFor(i-current);const intro=sec==='intro',br=sec==='break',out=sec==='outro';const effect=effects?.bars?.some(b=>((b%8)+8)%8===i);
      bars+=`<div class="ariBar ${i===current?'now':''}"><div class="ariBarN">${String(i+1).padStart(2,'0')}</div><div class="ariLayer c ${!out?'on':''}" title="drums"></div><div class="ariLayer p ${(!intro&&!out)?'on':''}" title="bass"></div><div class="ariLayer m ${(!intro&&!out&&[2,6].includes(i))?'on':''}" title="lead"></div><div class="ariLayer o ${effect?'on':''}" title="accent"></div></div>`;}
    const listenerHtml=listeners.map((x,i)=>`<div class="ariListenerRow" data-listener="${i}"><b>${esc(x.name)}</b><br><span class="ariPulse">●</span> <span class="ariListenerReaction">${esc(x.react)}</span><em>${Math.round(x.engagement*100)}% engaged</em></div>`).join('');
    const dots=listeners.map((x,i)=>{
      const dx=x.x-50,dy=x.y-50;
      const angle=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
      return `<i class="ariDot" data-index="${i}" data-angle="${angle.toFixed(2)}" data-engagement="${x.engagement.toFixed(3)}" data-activity="${x.activity.toFixed(3)}" style="left:${x.x}%;top:${x.y}%;--ari-dot-base:${(.07+x.activity*.10).toFixed(3)}"></i>`;
    }).join('');
    const keyText=t.scaleName||t.keyName||((typeof KEYS!=='undefined'&&typeof t.root==='number')?KEYS[t.root]:'live scale');
    const seedText=String(t.seed||t.trackId||'—');
    const barText=(typeof bar==='number')?`${bar+1}`:'—';

    $('ariSigBody').innerHTML=`<div class="ariSigTop"><div class="ariSigTitle"><div class="ariSigKicker">A.R.I. / live signal</div><div class="ariSigName">${esc(t.name||t.title||$('trackname')?.textContent||'untitled')}</div><div class="ariSigMeta">${esc(t.genre)} · ${esc(t.bpm)} bpm · ${esc(keyText)}</div></div><button class="ariSigClose" aria-label="close">×</button></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>session / runtime</span><span class="ariSigDim">live context</span></div><div class="ariInfoGrid">
      <div class="ariInfoCell"><span>state</span><b>${esc(info.state)} · bar ${esc(barText)}</b></div>
      <div class="ariInfoCell"><span>section</span><b>${esc(info.section)}</b></div>
      <div class="ariInfoCell"><span>location</span><b>${esc(info.loc)}</b></div>
      <div class="ariInfoCell"><span>audio</span><b>${esc(info.audioState)}</b></div>
      <div class="ariInfoCell"><span>seed / id</span><b>${esc(seedText)}</b></div>
      <div class="ariInfoCell"><span>engine</span><b>${esc(info.engine)}</b></div>
      <div class="ariInfoCell"><span>effects</span><b>${effects?.enabled?`${effects.used||0}/${effects.max||0} accents`:'sleeping'}</b></div>
      <div class="ariInfoCell"><span>audience</span><b>${t.audienceBrain?`${Math.round((t.audienceBrain.active||0)*100)}% active · ${Math.round((t.audienceBrain.retention||0)*100)}% retention`:'warming up'}</b></div>
    </div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>signal grid / next eight bars</span><span class="ariSigDim">drums · bass · lead · accent</span></div><div class="ariBars">${bars}</div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>audience signal</span><span class="ariSigDim">simulated audience activity</span></div><div class="ariRadarWrap"><div class="ariRadar">${dots}</div><div class="ariListeners">${listenerHtml}</div></div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>track character</span><span class="ariSigDim">what is shaping this take</span></div><div class="ariDna"><div class="ariCard"><span>character</span><b>${esc(p?.character?.type||'clean signal')}</b><em>${effects?.enabled?`${effects.used||0}/${effects.max||0} accents used`:'effect stem sleeping'}</em></div><div class="ariCard"><span>instruments</span><b>${esc(instrumentText(t))}</b><em>bass voice: ${esc(t.foundationBassVoice||window.ARIBeatFoundation?.voice||'round')}</em></div><div class="ariCard"><span>interaction</span><b>${esc(sig?.contour||t.signatureMotif?.contour||'evolving')} motif</b><em>${Array.isArray(t.streetMotif)&&t.streetMotif.length?`${t.streetMotif.length} street notes remembered`:'listening for a street phrase'}</em></div></div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>event test</span><span class="ariSigDim">existing runtime events</span></div><div class="ariEventRow"><button class="ariEventBtn" data-ari-event="newtrack">new track</button><button class="ariEventBtn" data-ari-event="location">new location</button><button class="ariEventBtn" data-ari-event="mic">A.R.I. mic</button><button class="ariEventBtn" data-ari-event="reverse">reverse camera</button><button class="ariEventBtn" data-ari-event="battery">battery swap</button><button class="ariEventBtn ariExportBtn" data-ari-event="export">export → ableton</button></div></div>`;
    $('ariSigBody').querySelector('.ariSigClose')?.addEventListener('click',close);
    $('ariSigBody').querySelectorAll('.ariEventBtn').forEach(btn=>btn.addEventListener('click',()=>{
      const action=btn.dataset.ariEvent;
      try{
        if(action==='newtrack'&&typeof newTrack==='function')newTrack();
        else if(action==='location'&&typeof nextLocation==='function')nextLocation();
        else if(action==='mic'&&typeof startAriSing==='function'){
          startAriSing(typeof ctx!=='undefined'&&ctx?ctx.currentTime:0);
          setTimeout(()=>{if(typeof stopAriSing==='function')stopAriSing();},4200);
        }
        else if(action==='reverse'&&typeof doReverse==='function')doReverse();
        else if(action==='battery'&&typeof runBatterySwap==='function')runBatterySwap();
        else if(action==='export')exportAbleton(t);
        setTimeout(()=>{if(open)render();},80);
      }catch(err){console.warn('[A.R.I. live signal test]',action,err);}
    }));
    if(window.__ariRadarFrame){cancelAnimationFrame(window.__ariRadarFrame);window.__ariRadarFrame=0;}
    const radarDots=[...$('ariSigBody').querySelectorAll('.ariDot')],radarEpoch=performance.now(),radarPeriod=4200;
    const animateRadar=(now)=>{
      if(!open){window.__ariRadarFrame=0;return;}
      const sweep=((now-radarEpoch)%radarPeriod)/radarPeriod*360;
      radarDots.forEach(dot=>{
        const a=parseFloat(dot.dataset.angle||'0'),delta=(sweep-a+360)%360;
        const hit=delta<7||delta>354,echo=delta>=7&&delta<26;
        dot.classList.toggle('hit',hit);
        dot.classList.toggle('echo',echo);
        const row=$('ariSigBody').querySelector(`.ariListenerRow[data-listener="${dot.dataset.index}"]`);
        if(row)row.classList.toggle('scan',hit||echo);
      });
      window.__ariRadarFrame=requestAnimationFrame(animateRadar);
    };
    window.__ariRadarFrame=requestAnimationFrame(animateRadar);
  }
  function show(){
    if(!curTrack()){
      if(typeof start==='function'){
        try{ start(); }catch(err){ console.warn('[A.R.I. live signal] could not start session',err); return; }
        let tries=0;
        const waitForTrack=setInterval(()=>{
          if(curTrack()){
            clearInterval(waitForTrack);
            render();
            open=true;
            root.classList.add('open');
            root.setAttribute('aria-hidden','false');
            root.querySelector('.ariSigClose')?.focus();
          }else if(++tries>40){
            clearInterval(waitForTrack);
          }
        },50);
      }
      return;
    }
    render();
    open=true;
    root.classList.add('open');
    root.setAttribute('aria-hidden','false');
    root.querySelector('.ariSigClose')?.focus();
  }
  function close(){open=false;if(window.__ariRadarFrame){cancelAnimationFrame(window.__ariRadarFrame);window.__ariRadarFrame=0;}root.classList.remove('open');root.setAttribute('aria-hidden','true');$('trackname')?.focus?.();}
  // Operator-only access. The legacy index.html inspector is suppressed.
  const legacy=document.getElementById('devPanel');
  if(legacy){
    legacy.classList.remove('show');
    legacy.setAttribute('aria-hidden','true');
    legacy.style.setProperty('display','none','important');
  }
  function toggle(){open?close():show();}
  document.addEventListener('keydown',e=>{
    if(e.target.closest('input, textarea, select, [contenteditable="true"]'))return;
    if(e.key.toLowerCase()==='d'&&e.shiftKey){
      e.preventDefault();
      e.stopImmediatePropagation();
      toggle();
    } else if(open&&e.key==='Escape'){
      e.preventDefault();
      close();
    }
  },true);
  root.addEventListener('click',e=>{if(e.target===root)close();});
  if(/[?&]dev=1/.test(location.search))setTimeout(show,0);
  setInterval(()=>{const t=curTrack();if(!t)return;const seed=t.seed||t.trackId;if(seed!==lastSeed){lastSeed=seed;if(open)render();}else if(open)render();},900);
  window.ARITrackOverlay=Object.freeze({open:show,close,get visible(){return open;}});
})();
