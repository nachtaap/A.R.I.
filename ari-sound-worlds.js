/* A.R.I. Creature Composer: local synthesis, memorable hooks, no sample URLs. */
(() => {
  'use strict';
  const synth = window.ARICreatureSynth;
  if (!synth || typeof newTrack !== 'function') return;
  const voices = new Set(), records = new WeakMap();
  let ownerContext = null, bus = null, front = false, history = [];
  try { history = JSON.parse(localStorage.getItem('ari-creature-history-v1') || '[]'); } catch (_) {}
  if (!Array.isArray(history)) history = [];
  history = history.filter(x => synth.TYPES.includes(x)).slice(-10);
  function cast(t) {
    if (t.creature) return t.creature;
    const seed = String(t.seed || t.trackId || t.genre), r = synth.random(seed + ':casting');
    const family = t.musicDNA?.family || t.genre;
    const preferred = /techno|house|trance/.test(family) ? ['alien','primal','bird'] :
      /bass|break|jungle/.test(family) ? ['diva','bird','metal'] :
      /rnb|r&b|soul/.test(family) ? ['whisperbot','diva','glass'] : ['alien','glass','bird'];
    const candidates = synth.TYPES.filter(type => type !== history.at(-1));
    const type = candidates.map(type => ({type, score:r() + (preferred.includes(type) ? .35 : 0) - history.filter(x=>x===type).length*.12}))
      .sort((a,b)=>b.score-a.score)[0].type;
    history.push(type); history = history.slice(-10);
    try { localStorage.setItem('ari-creature-history-v1', JSON.stringify(history)); } catch (_) {}
    const foil = type === 'bird' ? 'primal' : type === 'diva' ? 'alien' : type === 'primal' ? 'bird' : type === 'metal' ? 'glass' : 'metal';
    t.creature = {type, foil, seed, dna:synth.identity(seed,type),
      motif:synth.phrase(seed), baseMidi:60, snare:synth.identity(seed+':snare','metal'),
      foilDNA:synth.identity(seed+':foil',foil), family};
    return t.creature;
  }
  function prepare(t) {
    if (!t || !ctx || records.has(t)) return;
    const c=cast(t), ac=ctx;
    const record={buffers:{},pending:true,error:null}; records.set(t,record);
    const jobs=[['main',c.dna,c.type,1.05,0],['answer',c.dna,c.type,.72,1],
      ['foil',c.foilDNA,c.foil,.7,0],['snare',c.snare,'metal',.25,0]];
    // One short render per task; never synthesize PCM inside the step scheduler.
    function next() {
      if (t!==track || ac!==ctx) { records.delete(t);return; }
      const job=jobs.shift();
      if (!job) {record.pending=false;return;}
      try {
        const [name,dna,type,duration,variant]=job;
        const pcm=synth.render(dna,{type,duration,variant,midi:c.baseMidi,sampleRate:22050});
        const b=ac.createBuffer(1,pcm.data.length,pcm.sampleRate);
        b.getChannelData(0).set(pcm.data);record.buffers[name]=b;
      } catch(e) {record.error=String(e.message||e);}
      setTimeout(next,0);
    }
    setTimeout(next,0);
  }
  function outputBus() {
    if (ownerContext===ctx && bus) return bus;
    silence();if(bus)bus.disconnect();ownerContext=ctx;
    bus=ctx.createGain();bus.gain.value=1;bus.connect(master);
    return bus;
  }
  function silence(at) {
    for(const v of [...voices]) {
      try {v.source.stop(at);} catch(_) {}
      if(at===undefined) v.cleanup();
    }
  }
  function sound(name,time,opts={}) {
    const b=records.get(track)?.buffers[name];
    if(!b||!ctx||voices.size>=16) return false;
    const destination=outputBus();
    const rate=Math.max(.25,Math.min(4,opts.rate||1));
    const offset=Math.max(0,Math.min(b.duration-.005,opts.offset||0));
    const duration=Math.min(opts.duration||.4,(b.duration-offset)/rate);
    if(duration<.008)return false;
    const t=Math.max(ctx.currentTime,time), source=ctx.createBufferSource();
    source.buffer=b;source.playbackRate.value=rate;
    const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=opts.highpass??140;
    const g=ctx.createGain(),p=ctx.createStereoPanner();p.pan.value=opts.pan||0;
    const gain=Math.max(.0001,Math.min(.34,opts.gain??.21));
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(70/22050,duration*.2));
    g.gain.setValueAtTime(gain,t+Math.max(duration*.5,duration-220/22050));g.gain.linearRampToValueAtTime(0,t+duration);
    source.connect(f);f.connect(g);g.connect(p);p.connect(destination);
    const v={source,cleanup(){source.disconnect();f.disconnect();g.disconnect();p.disconnect();voices.delete(v);}};
    voices.add(v);source.onended=v.cleanup;source.start(t,offset);source.stop(t+duration+.003);
    return true;
  }
  function note(t,degree) {
    const scale=t.scale||[0,2,3,5,7,8,10];
    return t.root+24+scale[((degree%scale.length)+scale.length)%scale.length]+12*Math.floor(degree/scale.length);
  }
  function plan(t,b) {
    const c=cast(t),section=sectionAt(b),phase=b%8;
    if(t.cutBar===b || section==='outro')return [];
    const beat=60/t.bpm;
    let events=[];
    if(section==='intro') {
      if(b%4===1)events=[{...c.motif[0],name:'main',gain:.17,beats:.75}];
    } else if([1,5,7].includes(phase)) {
      events=c.motif.map((e,i)=>({...e,name:phase===5?'answer':'main',
        degree:e.degree+(phase===5&&i===c.motif.length-1?2:0),gain:phase===7?.24:.26}));
      if(phase===7)events=events.slice(0,2); // Recognition, then leave the landing open.
    } else if(phase===3) {
      events=c.motif.slice(-2).map(e=>({...e,step:Math.min(15,e.step+1),name:'foil',gain:.15,beats:.55}));
    }
    if(section==='break'&&events.length)events=events.slice(0,2).map(e=>({...e,beats:1.6}));
    return events.map(e=>({...e,duration:e.beats*beat,rate:2**((note(t,e.degree)-c.baseMidi)/12)}));
  }
  const previousNew=newTrack;
  newTrack=function(...args){silence();front=false;const out=previousNew(...args);cast(track);prepare(track);return out;};
  const previousStop=stop;
  stop=function(...args){silence();front=false;return previousStop(...args);};
  // Recast the existing snare instead of stacking another full drum kit on it.
  const previousSnare=playSnare;
  playSnare=function(t,vol=1){
    const ready=!!records.get(track)?.buffers.snare;
    if(!ready)return previousSnare(t,vol);
    sound('snare',t,{duration:vol<.6?.075:.19,gain:.29*vol,rate:/bass|jungle/.test(cast(track).family)?1.22:.88,highpass:20});
  };
  const previousClap=playClap;
  playClap=function(t){
    if(records.get(track)?.buffers.snare)sound('snare',t,{duration:.19,gain:.29,rate:1.22,highpass:20});
    else previousClap(t);
  };
  // Give the hook the foreground: arrangement space, rather than extra loudness.
  const previousLead=playLead;
  playLead=function(t,midi,dur,instr,volume,art){return previousLead(t,midi,dur,instr,(volume??1)*(front?.22:1),art);};
  // Existing chord voices have no velocity parameter, so leave their internals intact.
  const previousStep=scheduleStep;
  scheduleStep=function(step,t){
    if(!track||!ctx)return previousStep(step,t);
    const events=plan(track,bar), rec=records.get(track);
    let guest=false;
    if(typeof composerStateAt==='function')guest=(composerStateAt(track,bar)?.guest||0)>.75;
    // Guest gets the answer bar; the protagonist owns statement/reprise bars.
    const selected=guest&&bar%8===3?[]:events;
    front=!!rec?.buffers.main&&selected.length>0;
    try {previousStep(step,t);} finally {front=false;}
    if(!playing)return;
    if(step===0){prepare(track);if(track.cutBar===bar)silence(t);}
    if(track.cutBar===bar)return;
    const beat=60/track.bpm, section=sectionAt(bar);
    for(const e of selected.filter(e=>e.step===step)) {
      sound(e.name,t,{rate:e.rate,duration:e.duration,gain:e.gain*(e.accent||1),pan:e.name==='foil'?.2:-.08});
      if(bar%8===5 && e===selected.at(-1) && section!=='break')
        sound(e.name,t+beat*.75,{rate:e.rate*.5,duration:beat*.35,gain:.065,offset:.08,pan:.3});
    }
    // Derive a little percussion from the creature's own syllable, not a new sound.
    if(!['intro','break','outro'].includes(section)&&bar%8===6&&[3,7,11].includes(step))
      sound('answer',t,{rate:1.7,duration:beat*.12,offset:.09,gain:.075,highpass:1800,pan:step===7?-.3:.3});
  };
  window.ARICreatures=Object.freeze({version:2,
    get foreground(){return front;},
    get status(){const rec=records.get(track);return {character:track?.creature||null,
      ready:Object.keys(rec?.buffers||{}),pending:!!rec?.pending,error:rec?.error||null,activeVoices:voices.size};},
    stop:silence,
    // Internal audition/debug surface; not exposed as controls in A.R.I.'s interface.
    audition(type){if(!synth.TYPES.includes(type)||!track)return false;silence();
      const c=cast(track);c.type=type;c.dna=synth.identity(c.seed,type);records.delete(track);prepare(track);return true;}
  });
  if(typeof track!=='undefined'&&track){cast(track);prepare(track);}
})();
