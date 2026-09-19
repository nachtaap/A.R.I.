/* A.R.I. Creature Composer v3 — sparse accents + motif evolution.
   Local synthesis only. Effects decorate the track; they never become the joke. */
(() => {
  'use strict';
  const synth = window.ARICreatureSynth;
  if (!synth || typeof newTrack !== 'function') return;

  const voices = new Set(), records = new WeakMap(), profiles = new WeakMap();
  let ownerContext = null, bus = null, front = false, history = [];
  try { history = JSON.parse(localStorage.getItem('ari-creature-history-v1') || '[]'); } catch (_) {}
  if (!Array.isArray(history)) history = [];
  history = history.filter(x => synth.TYPES.includes(x)).slice(-10);

  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  function familyOf(t){ return String(t?.musicDNA?.family || t?.genre || '').toLowerCase(); }
  function hash01(value){
    let h=2166136261>>>0; const s=String(value);
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0)/4294967296;
  }
  function experimentalFamily(t){
    return /ambient|glitch|acid|idm|jungle|psy|space|experimental|industrial|break/.test(familyOf(t));
  }

  function cast(t) {
    if (t.creature) return t.creature;
    const seed = String(t.seed || t.trackId || t.genre), r = synth.random(seed + ':casting');
    const family = familyOf(t), experimental = experimentalFamily(t);
    let preferred = /techno|house|trance/.test(family) ? ['primal','glass','metal'] :
      /bass|break|jungle/.test(family) ? ['diva','metal','glass'] :
      /rnb|r&b|soul/.test(family) ? ['whisperbot','diva','glass'] : ['glass','metal','whisperbot'];
    if (experimental) preferred = [...preferred, 'alien', 'bird'];
    const candidates = synth.TYPES.filter(type => type !== history.at(-1) && (experimental || !['alien','bird'].includes(type)));
    const type = candidates.map(type => ({type, score:r() + (preferred.includes(type) ? .35 : 0) - history.filter(x=>x===type).length*.12}))
      .sort((a,b)=>b.score-a.score)[0]?.type || 'glass';
    history.push(type); history = history.slice(-10);
    try { localStorage.setItem('ari-creature-history-v1', JSON.stringify(history)); } catch (_) {}
    const foil = type === 'bird' ? 'primal' : type === 'diva' ? 'glass' : type === 'primal' ? 'glass' : type === 'metal' ? 'whisperbot' : 'metal';
    t.creature = {type, foil, seed, dna:synth.identity(seed,type), motif:synth.phrase(seed), baseMidi:60,
      snare:synth.identity(seed+':snare','metal'), foilDNA:synth.identity(seed+':foil',foil), family};
    return t.creature;
  }

  function buildSignature(t){
    const seed=String(t.seed||t.trackId||t.genre), r=synth.random(seed+':signature-v2');
    const scale=(t.scale||[0,2,3,5,7,8,10]);
    const lengths=[4,5,6,7], len=lengths[Math.floor(r()*lengths.length)];
    const contours=['rise','fall','arch','zigzag'], contour=contours[Math.floor(r()*contours.length)];
    let d=Math.floor(r()*Math.min(4,scale.length)), out=[];
    for(let i=0;i<len;i++){
      let delta;
      if(contour==='rise') delta=r()<.72?1:(r()<.5?2:-1);
      else if(contour==='fall') delta=r()<.72?-1:(r()<.5?-2:1);
      else if(contour==='arch') delta=i<len/2?(r()<.7?1:2):(r()<.7?-1:-2);
      else delta=i%2===0?(r()<.7?2:1):(r()<.7?-1:-2);
      if(i===0) delta=0;
      d=clamp(d+delta,0,Math.max(3,scale.length+2));
      if(out.length && d===out.at(-1)) d=clamp(d+(r()<.5?-1:1),0,scale.length+2);
      out.push(d);
    }
    const stepPools=[[0,3,6,10,13],[0,2,5,9,12,14],[0,4,7,11],[1,4,8,10,14]];
    const steps=stepPools[Math.floor(r()*stepPools.length)];
    const events=out.map((degree,i)=>({degree,step:steps[i%steps.length],accent:i===0||i===out.length-1?1:.82}));
    return {contour,events,voice:null};
  }

  function profile(t){
    if(profiles.has(t)) return profiles.get(t);
    const experimental=experimentalFamily(t), seed=String(t.seed||t.trackId||t.genre);
    const r=synth.random(seed+':effect-profile-v3');
    const enabled=r() < (experimental ? .55 : .24);
    const maxAccents=enabled ? (r()<.72?1:2) : 0;
    const candidates=[];
    for(let b=5;b<Math.max(6,(t.bars||32)-3);b+=4) candidates.push(b);
    candidates.sort(()=>r()-.5);
    const accentBars=candidates.slice(0,maxAccents).sort((a,b)=>a-b);
    const signature=buildSignature(t);
    const p={enabled,maxAccents,accentBars,used:0,experimental,signature};
    profiles.set(t,p); t.signatureMotif=signature;
    return p;
  }

  function prepare(t) {
    if (!t || !ctx || records.has(t)) return;
    const c=cast(t), p=profile(t), ac=ctx;
    const record={buffers:{},pending:true,error:null}; records.set(t,record);
    if(!p.enabled){ record.pending=false; return; }
    const jobs=[['main',c.dna,c.type,.85,0],['answer',c.dna,c.type,.58,1],['foil',c.foilDNA,c.foil,.55,0],['snare',c.snare,'metal',.22,0]];
    function next() {
      if (t!==track || ac!==ctx) { records.delete(t); return; }
      const job=jobs.shift(); if (!job) {record.pending=false;return;}
      try {
        const [name,dna,type,duration,variant]=job;
        const pcm=synth.render(dna,{type,duration,variant,midi:c.baseMidi,sampleRate:22050});
        const b=ac.createBuffer(1,pcm.data.length,pcm.sampleRate); b.getChannelData(0).set(pcm.data); record.buffers[name]=b;
      } catch(e) {record.error=String(e.message||e);}
      setTimeout(next,0);
    }
    setTimeout(next,0);
  }

  function outputBus() {
    if (ownerContext===ctx && bus) return bus;
    silence(); if(bus)bus.disconnect(); ownerContext=ctx;
    bus=ctx.createGain(); bus.gain.value=.72; bus.connect(master); return bus;
  }
  function silence(at) { for(const v of [...voices]) { try {v.source.stop(at);} catch(_) {} if(at===undefined) v.cleanup(); } }
  function sound(name,time,opts={}) {
    const b=records.get(track)?.buffers[name]; if(!b||!ctx||voices.size>=8)return false;
    const destination=outputBus(), rate=clamp(opts.rate||1,.25,4), offset=clamp(opts.offset||0,0,Math.max(0,b.duration-.005));
    const duration=Math.min(opts.duration||.3,(b.duration-offset)/rate); if(duration<.008)return false;
    const t=Math.max(ctx.currentTime,time), source=ctx.createBufferSource(); source.buffer=b; source.playbackRate.value=rate;
    const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=opts.highpass??180;
    const g=ctx.createGain(),p=ctx.createStereoPanner(); p.pan.value=opts.pan||0;
    const gain=clamp(opts.gain??.12,.0001,.18);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+Math.min(.012,duration*.2));
    g.gain.setValueAtTime(gain,t+Math.max(duration*.5,duration-.018)); g.gain.linearRampToValueAtTime(0,t+duration);
    source.connect(f);f.connect(g);g.connect(p);p.connect(destination);
    const v={source,cleanup(){source.disconnect();f.disconnect();g.disconnect();p.disconnect();voices.delete(v);}};
    voices.add(v); source.onended=v.cleanup; source.start(t,offset); source.stop(t+duration+.003); return true;
  }
  function note(t,degree) {
    const scale=t.scale||[0,2,3,5,7,8,10];
    return t.root+24+scale[((degree%scale.length)+scale.length)%scale.length]+12*Math.floor(degree/scale.length);
  }
  function leadInstrument(t){
    const s=String(t.leadWave||t.gear?.leadSynth||'').toLowerCase();
    if(s.includes('flute'))return 'on flute'; if(s.includes('sax'))return 'on sax';
    if(s.includes('violin'))return s.includes('e-')?'on e-violin':'on violin';
    if(s.includes('guitar')||s.includes('acoustic'))return 'on acoustic';
    return /warm|soft|round|sine|triangle/.test(s)?'on acoustic':'on electric';
  }
  function guestNow(){
    try { return typeof composerStateAt==='function' && (composerStateAt(track,bar)?.guest||0)>.55; } catch(_) { return false; }
  }
  function vocalNow(){ return guestNow() || (!!track?.ariSings && [3,7].includes(bar%8)); }

  const previousNew=newTrack;
  newTrack=function(...args){silence();front=false;const out=previousNew(...args);cast(track);profile(track);prepare(track);return out;};
  const previousStop=stop;
  stop=function(...args){silence();front=false;return previousStop(...args);};

  // Keep the familiar snare/clap path. Creature percussion is only a timbral substitute when active.
  const previousSnare=playSnare;
  playSnare=function(t,vol=1){
    const p=profile(track), ready=p.enabled&&!!records.get(track)?.buffers.snare;
    if(!ready||vocalNow()) return previousSnare(t,vol);
    if(hash01(String(track.seed)+':snare:'+bar)>.18) return previousSnare(t,vol);
    sound('snare',t,{duration:vol<.6?.07:.15,gain:.12*vol,rate:/bass|jungle/.test(cast(track).family)?1.18:.92,highpass:60});
  };
  const previousClap=playClap;
  playClap=function(t){ return previousClap(t); };

  const previousLead=playLead;
  playLead=function(t,midi,dur,instr,volume,art){ return previousLead(t,midi,dur,instr,(volume??1)*(front?.55:1),art); };

  const previousStep=scheduleStep;
  scheduleStep=function(step,t){
    if(!track||!ctx)return previousStep(step,t);
    const p=profile(track), rec=records.get(track), section=sectionAt(bar), guest=guestNow();
    const accentBar=p.enabled && p.accentBars.includes(bar) && !guest && section!=='outro';
    front=!!rec?.buffers.main&&accentBar;
    try { previousStep(step,t); } finally { front=false; }
    if(!playing||track.cutBar===bar)return;
    if(step===0){prepare(track);if(track.cutBar===bar)silence(t);}

    // Independent melodic identity: two quiet statement/reprise bars per 8-bar phrase.
    // This uses the selected lead timbre instead of leaving leadWave as metadata only.
    if(!guest && !['intro','outro'].includes(section) && [2,6].includes(bar%8)){
      const ev=p.signature.events.find(e=>e.step===step);
      if(ev){
        const beat=60/track.bpm, midi=note(track,ev.degree)+12;
        previousLead(t,midi,beat*.36,leadInstrument(track),.16*ev.accent,null);
      }
    }

    // Effect stem: at most one or two brief accents in the entire track.
    if(!accentBar||vocalNow()) return;
    const beat=60/track.bpm;
    if(step===4 && p.used<p.maxAccents){
      sound('main',t,{rate:.92+hash01(String(track.seed)+bar)*.24,duration:beat*.32,gain:.105,pan:-.12});
      p.used++;
    } else if(step===11 && p.used<p.maxAccents && p.maxAccents>1){
      sound('answer',t,{rate:1.08,duration:beat*.22,gain:.075,highpass:900,pan:.16});
      p.used++;
    }
  };

  window.ARICreatures=Object.freeze({version:3,
    get foreground(){return front;},
    get status(){const rec=records.get(track),p=track?profile(track):null;return {character:track?.creature||null,
      ready:Object.keys(rec?.buffers||{}),pending:!!rec?.pending,error:rec?.error||null,activeVoices:voices.size,
      effects:p?{enabled:p.enabled,max:p.maxAccents,bars:p.accentBars,used:p.used}:null,signature:p?.signature||null};},
    stop:silence,
    audition(type){if(!synth.TYPES.includes(type)||!track)return false;silence();const c=cast(track);c.type=type;c.dna=synth.identity(c.seed,type);records.delete(track);prepare(track);return true;}
  });
  window.ARIMusicEvolution=Object.freeze({version:1,get signature(){return track?profile(track).signature:null;}});
  if(typeof track!=='undefined'&&track){cast(track);profile(track);prepare(track);}
})();
