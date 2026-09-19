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
  #ariSignalOverlay.open{display:grid} .ariSigPanel{width:min(900px,94vw);max-height:none;overflow:hidden;background:linear-gradient(180deg,rgba(10,16,28,.97),rgba(5,9,18,.97));border:1px solid rgba(82,200,192,.42);box-shadow:0 0 0 1px rgba(255,95,210,.08),0 0 42px rgba(82,200,192,.14);padding:18px}
  .ariSigTop{display:flex;align-items:flex-start;gap:18px}.ariSigTitle{flex:1}.ariSigKicker{font-size:9px;letter-spacing:.28em;color:#52c8c0;text-transform:uppercase}.ariSigName{font-family:"Space Grotesk",sans-serif;font-size:clamp(22px,4vw,36px);letter-spacing:.03em;margin-top:4px}.ariSigMeta{font-size:10px;letter-spacing:.12em;color:#8995a8;text-transform:uppercase;margin-top:5px}
  .ariSigClose{appearance:none;border:1px solid rgba(255,95,210,.45);background:transparent;color:#ff5fd2;width:34px;height:34px;cursor:pointer;font:18px/1 monospace}.ariSigClose:hover{box-shadow:0 0 14px rgba(255,95,210,.28)}
  .ariSigBlock{margin-top:14px;border-top:1px solid rgba(82,200,192,.18);padding-top:13px}.ariSigHead{display:flex;justify-content:space-between;gap:12px;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#a795e0;margin-bottom:10px}.ariSigDim{color:#687589;letter-spacing:.08em}
  .ariBars{display:grid;grid-template-columns:repeat(8,1fr);gap:5px}.ariBar{min-height:76px;border:1px solid rgba(82,200,192,.14);padding:7px 5px;position:relative;background:rgba(82,200,192,.018)}.ariBar.now{border-color:rgba(255,95,210,.62);box-shadow:inset 0 0 18px rgba(255,95,210,.07)}.ariBarN{font-size:8px;color:#667385;margin-bottom:7px}.ariLayer{height:3px;margin:4px 0;background:#1d2734}.ariLayer.on.c{background:#52c8c0;box-shadow:0 0 6px rgba(82,200,192,.55)}.ariLayer.on.p{background:#a795e0;box-shadow:0 0 6px rgba(167,149,224,.45)}.ariLayer.on.m{background:#ff5fd2;box-shadow:0 0 6px rgba(255,95,210,.5)}.ariLayer.on.o{background:#ffad66;box-shadow:0 0 6px rgba(255,173,102,.42)}
  .ariRadarWrap{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}.ariRadar{width:142px;height:142px;border:1px solid rgba(82,200,192,.34);border-radius:50%;position:relative;background:radial-gradient(circle,transparent 0 24%,rgba(82,200,192,.07) 25% 26%,transparent 27% 49%,rgba(82,200,192,.06) 50% 51%,transparent 52%),linear-gradient(90deg,transparent 49.5%,rgba(82,200,192,.12) 50%,transparent 50.5%),linear-gradient(transparent 49.5%,rgba(82,200,192,.12) 50%,transparent 50.5%)}.ariRadar:after{content:"";position:absolute;inset:9%;border-radius:50%;background:conic-gradient(from 18deg,rgba(82,200,192,.18),transparent 22%,transparent);animation:ariSweep 7s linear infinite}@keyframes ariSweep{to{transform:rotate(360deg)}}
  .ariDot{position:absolute;width:5px;height:5px;border-radius:50%;background:#ff5fd2;box-shadow:0 0 8px #ff5fd2;z-index:2}.ariListeners{display:grid;grid-template-columns:1fr 1fr;gap:7px 13px;font-size:9px;color:#9aa6b8}.ariListeners b{color:#dffcff;font-weight:500}.ariPulse{color:#52c8c0}
  .ariDna{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ariCard{border:1px solid rgba(167,149,224,.16);padding:9px;min-height:72px}.ariCard span{display:block;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#6f7b8d}.ariCard b{display:block;margin-top:7px;font-size:11px;font-weight:500;color:#e7f8fb;line-height:1.45}.ariCard em{display:block;margin-top:4px;font-size:8px;font-style:normal;color:#8995a8;line-height:1.45}
  #trackname{cursor:default;pointer-events:auto}@media(max-width:620px){.ariSigPanel{padding:14px}.ariBars{grid-template-columns:repeat(4,1fr)}.ariRadarWrap{grid-template-columns:1fr}.ariRadar{margin:auto}.ariDna{grid-template-columns:1fr}.ariListeners{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){.ariRadar:after{animation:none}}

  .ariEventRow{display:flex;flex-wrap:wrap;gap:7px}.ariEventBtn{appearance:none;border:1px solid rgba(82,200,192,.28);background:rgba(82,200,192,.025);color:#9fded9;padding:7px 10px;font:500 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.10em;text-transform:uppercase;cursor:pointer}
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
    const seed=String(t?.seed||t?.trackId||t?.genre||'ari'); const names=['nightbus_04','mara.exe','lowbattery','gridwalker','tapeghost','sublevel9','windowseat','oxidekid'];
    return names.slice(0,6).map((name,i)=>{const n=hash(seed+':listener:'+i);return{name,react:['locked in','rewound it','headphones on','still listening','caught the switch','saved the moment'][n%6],x:10+(n%80),y:10+((n>>>8)%80)};});
  }
  function render(){
    const t=curTrack();if(!t)return;
    const p=window.ARICreatures?.status, sig=window.ARIMusicEvolution?.signature; const listeners=listenerData(t);
    const effects=p?.effects; const current=((typeof bar==='number'?bar:0)%8+8)%8;
    let bars='';for(let i=0;i<8;i++){const sec=sectionFor(i-current);const intro=sec==='intro',br=sec==='break',out=sec==='outro';const effect=effects?.bars?.some(b=>((b%8)+8)%8===i);
      bars+=`<div class="ariBar ${i===current?'now':''}"><div class="ariBarN">${String(i+1).padStart(2,'0')}</div><div class="ariLayer c ${!out?'on':''}" title="drums"></div><div class="ariLayer p ${(!intro&&!out)?'on':''}" title="bass"></div><div class="ariLayer m ${(!intro&&!out&&[2,6].includes(i))?'on':''}" title="lead"></div><div class="ariLayer o ${effect?'on':''}" title="accent"></div></div>`;}
    const listenerHtml=listeners.map(x=>`<div><b>${esc(x.name)}</b><br><span class="ariPulse">●</span> ${esc(x.react)}</div>`).join('');
    const dots=listeners.map(x=>`<i class="ariDot" style="left:${x.x}%;top:${x.y}%"></i>`).join('');
    $('ariSigBody').innerHTML=`<div class="ariSigTop"><div class="ariSigTitle"><div class="ariSigKicker">A.R.I. / live signal</div><div class="ariSigName">${esc(t.name||t.title||$('trackname')?.textContent||'untitled')}</div><div class="ariSigMeta">${esc(t.genre)} · ${esc(t.bpm)} bpm · ${esc(t.scaleName||'live scale')}</div></div><button class="ariSigClose" aria-label="close">×</button></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>signal grid / next eight bars</span><span class="ariSigDim">drums · bass · lead · accent</span></div><div class="ariBars">${bars}</div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>street radar</span><span class="ariSigDim">fictional live listeners</span></div><div class="ariRadarWrap"><div class="ariRadar">${dots}</div><div class="ariListeners">${listenerHtml}</div></div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>track character</span><span class="ariSigDim">what is shaping this take</span></div><div class="ariDna"><div class="ariCard"><span>character</span><b>${esc(p?.character?.type||'clean signal')}</b><em>${effects?.enabled?`${effects.used||0}/${effects.max||0} accents used`:'effect stem sleeping'}</em></div><div class="ariCard"><span>instruments</span><b>${esc(instrumentText(t))}</b><em>bass voice: ${esc(t.foundationBassVoice||window.ARIBeatFoundation?.voice||'round')}</em></div><div class="ariCard"><span>interaction</span><b>${esc(sig?.contour||t.signatureMotif?.contour||'evolving')} motif</b><em>${Array.isArray(t.streetMotif)&&t.streetMotif.length?`${t.streetMotif.length} street notes remembered`:'listening for a street phrase'}</em></div></div></div>
    <div class="ariSigBlock"><div class="ariSigHead"><span>event test</span><span class="ariSigDim">existing runtime events</span></div><div class="ariEventRow"><button class="ariEventBtn" data-ari-event="newtrack">new track</button><button class="ariEventBtn" data-ari-event="location">new location</button><button class="ariEventBtn" data-ari-event="mic">A.R.I. mic</button><button class="ariEventBtn" data-ari-event="reverse">reverse camera</button><button class="ariEventBtn" data-ari-event="battery">battery swap</button></div></div>`;
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
      }catch(err){console.warn('[A.R.I. live signal test]',action,err);}
    }));
  }
  function show(){if(!curTrack())return;render();open=true;root.classList.add('open');root.setAttribute('aria-hidden','false');root.querySelector('.ariSigClose')?.focus();}
  function close(){open=false;root.classList.remove('open');root.setAttribute('aria-hidden','true');$('trackname')?.focus?.();}
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
