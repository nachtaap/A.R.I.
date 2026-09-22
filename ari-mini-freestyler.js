/* POCKETFLOW mini-Freestyler mini-1.2: rap prosody v0.2 + jazz warm-clean v1.4.
   Pure planning/DSP is also the worker entry. Browser lifecycle is below it.
   No recordings, remote inference, or extra accompaniment.
   1.2: balanced vocal level, broader jazz parent-scale match, clearer status. */
(function(root){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mod=(x,n)=>((x%n)+n)%n;
  const hz=m=>440*2**((m-69)/12);
  function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  function rng(seed){let x=hash(seed);return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
  function normal(r){return Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());}
  function interp(a,x){const f=clamp(x,0,1)*(a.length-1),i=Math.floor(f);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(f-i);}
  const kindFor=score=>score?.family==='jazz'?'jazz':['hiphop','trap'].includes(score?.family)?'rap':null;
  const GUEST_CHARACTERS={
    chest:{name:'low chest',center:49,tract:.78,tilt:1.8,attack:.12,release:.42,vibrato:.025,vibHz:4.1,scoop:.1,breath:.0005,edge:0,rapAttack:1.25,rapRelease:.8},
    velvet:{name:'warm crooner',center:59,tract:.94,tilt:1.65,attack:.25,release:.65,vibrato:.06,vibHz:4.6,scoop:.22,breath:.0008,edge:0,rapAttack:1.5,rapRelease:.78},
    grit:{name:'forward grain',center:64,tract:1.12,tilt:1.24,attack:.10,release:.36,vibrato:.035,vibHz:5.1,scoop:.09,breath:.0006,edge:.5,rapAttack:.6,rapRelease:1.3},
    airy:{name:'high light',center:75,tract:1.25,tilt:1.9,attack:.3,release:.72,vibrato:.075,vibHz:5.6,scoop:.18,breath:.0011,edge:0,rapAttack:1.1,rapRelease:1.05}
  };
  function characterFor(guest){
    const input=guest?.voiceProfile||{},dna=guest?.dna||{},family=GUEST_CHARACTERS[input.key]?input.key:'velvet';
    const base=GUEST_CHARACTERS[family],energy=clamp((dna.energy??50)/100,0,1),space=clamp((dna.space??50)/100,0,1);
    const voice={...base,family,tract:base.tract*clamp((input.tract||1)/({chest:.82,velvet:.92,grit:.97,airy:1.07}[family]),.93,1.07),
      emphasis:.8+.45*energy,rapAttack:base.rapAttack*(.9+.2*space),rapRelease:base.rapRelease*(.9+.2*energy),
      style:space>.65?'spacious':energy>.65?'punchy':'flowing',density:space>.65?.65:1};
    voice.key=family+':'+hash(JSON.stringify(voice));return voice;
  }
  function voiceEvent(event,voice){
    if(!voice)return event; // A.R.I. keeps the approved renderer unchanged.
    const center=event.kind==='jazz'?event.midi.reduce((a,b)=>a+b,0)/event.midi.length:59;
    const shift=12*Math.round((voice.center-center)/12);
    return {...event,voice,seed:event.seed+':'+voice.key,
      midi:Array.isArray(event.midi)?event.midi.map(n=>n+shift):event.midi+shift,
      energy:event.kind==='rap'?clamp(event.energy*voice.emphasis,0,1):event.energy};
  }
  function nearest(m,notes){return notes.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,notes[0]);}
  function chordNotes(score,beat){
    const ch=score.harmony?.[clamp(Math.floor(beat/4),0,score.bars-1)]?.notes||[score.root];
    const pcs=new Set(ch.map(n=>mod(n,12)));
    return Array.from({length:25},(_,i)=>48+i).filter(n=>pcs.has(mod(n,12)));
  }
  // Preserve v1.4's MAJOR intervals even when the jazz backing is Dorian.
  // D Dorian uses C major as its parent, A minor uses C, G Mixolydian uses C.
  function jazzTranspose(score){
    // Phrases are authored in C major. Shift so C major aligns with the score's
    // parent major (Ionian). Dorian / natural minor share a parent major.
    const pcs=new Set((score.scale||[]).map(n=>mod(n+(score.root||0),12)));
    const major=[0,2,4,5,7,9,11];
    for(let pc=0;pc<12;pc++)if(major.every(n=>pcs.has(mod(n+pc,12))))return mod(pc+6,12)-6;
    // Soft match: at least 6 of 7 major degrees present (tolerant modes).
    let best=null,bestHit=-1;
    for(let pc=0;pc<12;pc++){
      const hit=major.reduce((a,n)=>a+(pcs.has(mod(n+pc,12))?1:0),0);
      if(hit>bestHit){bestHit=hit;best=pc;}
    }
    if(bestHit>=6)return mod(best+6,12)-6;
    return null; // Do not bend approved major melody into an incompatible scale.
  }
  function plan(score,data){
    const kind=kindFor(score);if(!kind)return [];
    const trans=kind==='jazz'?jazzTranspose(score):0;if(trans===null)return [];
    const spb=60/score.bpm,library=data[kind],events=[];
    const scaleNotes=Array.from({length:25},(_,i)=>48+i).filter(m=>score.scale.some(n=>mod(n+score.root,12)===mod(m,12)));
    const rapHome=nearest(57,scaleNotes),choice=hash(score.seed+':mini:'+kind)%library.length;
    let blockIndex=0;
    for(const section of score.sections){
      if(!/^main/.test(section.name))continue;
      for(let start=section.start*4;start<section.end*4;start+=32){
        const flow=library[(choice+blockIndex++)%library.length],end=Math.min(start+32,section.end*4);
        if(kind==='jazz'){
          for(const p of flow.phrases){
            const beat=start+p.beat,duration=p.beats*spb;
            // Keep entire legato phrases; omit one that would cross a section boundary.
            if(beat+p.beats>end)continue;
            events.push({kind,beat,duration,midi:p.midi.map(m=>m+trans),amp:p.amp,vowel:p.vowel,detune:p.detune,
              degrees:p.degrees,source:flow.source,phrase:start,seed:flow.source,level:2.0});
          }
        }else{
          const src=flow.events;
          const times=src.map((e,i)=>{
            const restart=i===0||e.beat-src[i-1].beat>=.75,strong=e.energy>=.72;
            const micro=i===0?0:clamp(e.microMs*(flow.sourceBpm/score.bpm)*(restart||strong?.08:.22),-12,12)/1000;
            return Math.max(start*spb,(start+e.beat)*spb+micro);
          });
          let phrase=start;
          for(let i=0;i<src.length;i++){
            const e=src[i],beat=Math.max(start,times[i]/spb);if(beat>=end)continue;
            if(i===0||e.beat-src[i-1].beat>=.75)phrase=start+e.beat;
            const tail=i===src.length-1||src[i+1].beat-e.beat>=.75;
            const gap=i===src.length-1?.18:times[i+1]-times[i];
            let duration=clamp(gap*(.34+.18*e.energy),.065,.22);
            if(tail)duration=Math.min(.24,duration*1.15);
            duration=Math.min(duration,(end-beat)*spb);if(duration<.02)continue;
            const chord=chordNotes(score,beat);
            let midi=nearest(rapHome+(e.confidence>=.25?.72*e.pitch:0),scaleNotes);
            if(e.energy>=.72)midi=nearest(midi,chord);
            if(tail)midi=nearest(rapHome,chord);
            events.push({kind,beat,duration,midi,energy:clamp(.22+.78*e.energy,0,1),brightness:.72+.50*e.energy,protected:tail||e.energy>=.72||i===0||e.beat-src[i-1].beat>=.75,
              source:flow.source,phrase,seed:flow.source+':'+i,level:2.0});
          }
        }
      }
    }
    return events.sort((a,b)=>a.beat-b.beat).map((e,id)=>({...e,id}));
  }
  function renderRap(e,sr){
    const voice=e.voice;
    const n=Math.max(1,Math.floor(e.duration*sr)),src=new Float64Array(n),out=new Float32Array(n),freq=hz(e.midi);
    let peak=0;
    for(let i=0;i<n;i++){
      const phase=2*Math.PI*freq*i/sr;let s=0;
      for(let h=1;h<8;h++)s+=Math.sin(h*phase+.17*h)/h**(voice?voice.tilt*.7:1);
      src[i]=s;peak=Math.max(peak,Math.abs(s));
    }
    // scipy.signal.iirpeak numerator/denominator, transposed direct form II.
    const filters=[[500,5,1],[1400,8,.5],[2350,10,.16*e.brightness]].map(([f,q,g])=>{
      const w=2*Math.PI*f*(voice?.tract??1)/sr,beta=Math.tan(w/q/2),gain=1/(1+beta);
      return {b:1-gain,a1:-2*gain*Math.cos(w),a2:2*gain-1,g,z1:0,z2:0};
    });
    const r=rng(e.seed),attack=Math.max(.004,.009-.003*e.energy)*(voice?.rapAttack??1),release=(7.5-2*e.energy)*(voice?.rapRelease??1);
    for(let i=0;i<n;i++){
      const x=src[i]/Math.max(peak,1e-9),t=i/sr;let y=0;
      for(const f of filters){const v=f.b*x+f.z1;f.z1=f.z2-f.a1*v;f.z2=-f.b*x-f.a2*v;y+=f.g*v;}
      out[i]=y*Math.min(1,t/attack)*Math.exp(-t*release)*(.055+.11*e.energy)
        +normal(r)*Math.exp(-t*65)*(.009+.017*e.energy)*e.brightness*(e.noiseLevel??1);
      if(voice?.edge)out[i]=Math.tanh(out[i]*(1+voice.edge))/(1+voice.edge*.5);
    }
    return out;
  }
  function formant(f,v,tract=1){
    f/=tract;
    const w=.92,F1=(280-40*w)*(1-v)+(520-50*w)*v,F2=(650-110*w)*(1-v)+(920-90*w)*v,F3=(1550-160*w)*(1-v)+(1850-150*w)*v;
    return 1.35*Math.exp(-.5*((f-F1)/130)**2)+.42*Math.exp(-.5*((f-F2)/200)**2)+.06*Math.exp(-.5*((f-F3)/300)**2);
  }
  function renderJazz(e,sr){
    const voice=e.voice;
    const n=Math.max(1,Math.floor(e.duration*sr)),out=new Float32Array(n),abs=new Float32Array(n);
    const r=rng(e.seed),detune=e.detune||Array.from({length:8},(_,i)=>1+.0022*i*(r()*2-1));
    const roll=Array.from({length:8},(_,i)=>1/(i+1)**(voice?.tilt??1.55)*.78**Math.max(0,i-1));
    let phase=0,locked=0;const lock=Math.floor(.72*n);
    for(let i=0;i<n;i++){
      const x=i/Math.max(1,n-1),v=interp(e.vowel,x);
      let midi=interp(e.midi,x)+(voice?.vibrato??.045)*Math.sin(Math.PI*clamp(x/.68,0,1))**1.7*Math.sin(2*Math.PI*(voice?.vibHz??4.9)*x*e.duration)
        +(voice?.scoop??.16)*Math.exp(-x*11)*(1-x)**.35;
      if(i===lock)locked=midi;if(i>=lock)midi=locked;
      const f=hz(midi);phase+=2*Math.PI*f/sr;let s=0;
      for(let h=1;h<=8;h++)s+=roll[h-1]*formant(h*f*detune[h-1],v,voice?.tract??1)*Math.sin(h*phase*detune[h-1]+.04*h);
      s+=.02*Math.sin(2*phase+.1)+.01*Math.sin(4*phase+.1);
      if(voice?.edge)s=Math.tanh(s*(1+voice.edge));
      out[i]=s;abs[i]=Math.abs(s);
    }
    abs.sort();const p=.95*(n-1),lo=Math.floor(p),p95=abs[lo]+(abs[Math.min(n-1,lo+1)]-abs[lo])*(p-lo);
    // Same 101-sample centered moving average as v1.4, scaled with sample rate.
    const width=Math.max(3,Math.round(101*sr/44100)|1),half=(width-1)/2,noise=new Float32Array(n);
    for(let i=0;i<n;i++)noise[i]=normal(r);
    let sum=0;for(let i=0;i<=half&&i<n;i++)sum+=noise[i];
    for(let i=0;i<n;i++){
      const t=i/sr,x=i/Math.max(1,n-1),env=(Math.min(1,t/(voice?.attack??.18))*clamp((e.duration-t)/(voice?.release??.50),0,1))**.90;
      out[i]=out[i]/Math.max(p95,1e-9)*env*interp(e.amp,x)*.036
        +sum/width*env*(.35+.4*Math.exp(-t*8)+.12*Math.exp(-t*14))*(e.breath??voice?.breath??.00085);
      if(i-half>=0)sum-=noise[i-half];if(i+half+1<n)sum+=noise[i+half+1];
    }
    return out;
  }
  const render=(e,sr=44100)=>e.kind==='jazz'?renderJazz(e,sr):renderRap(e,sr);
  const api={version:'mini-1.2',kindFor,jazzTranspose,plan,render,characterFor,voiceEvent};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  if(typeof document==='undefined'){
    root.onmessage=({data})=>{
      try{const samples=render(data.event,data.sampleRate);root.postMessage({renderKey:data.renderKey,voiceKey:data.voiceKey,samples},[samples.buffer]);}
      catch(error){root.postMessage({renderKey:data.renderKey,error:String(error)});}
    };
    return;
  }

  const workerURL=new URL(document.currentScript.src,location.href);
  let current=null,worker=null,events=[],stepMap=new Map(),buffers=new Map(),voices=new Set(),owners=new Map(),scheduled=new Set(),generation=0;
  let jobs=[],busy=false,queued=new Set(),guestVoices=new Map();
  const identities=new WeakMap();
  const renderKey=(e,voice)=>e.id+':'+(voice?.key||'ari');
  function pump(){
    if(!worker||busy)return;
    const job=jobs.shift();
    if(!job){if(current?.miniFreestyler)current.miniFreestyler.status='ready';return;}
    busy=true;worker.postMessage(job);
  }
  function queueVoice(voice,minBeat){
    for(const event of events){
      if(event.beat<minBeat-1e-7)continue;
      const key=renderKey(event,voice);if(queued.has(key))continue;queued.add(key);
      jobs.push({event:voiceEvent(event,voice),renderKey:key,voiceKey:voice?.key||'ari',sampleRate:44100});
    }
    jobs.sort((a,b)=>a.event.beat-b.event.beat);pump();
  }
  function syncGuestVoices(minBeat){
    for(const [role,guest,here] of [['guest1',vis1,visitor],['guest2',vis2,visitor2]]){
      const before=guestVoices.get(role);
      if(!here||guest?.instr!=='on the mic'){guestVoices.delete(role);continue;}
      if(before?.guest===guest)continue;
      let voice=identities.get(guest);
      if(!voice){voice=characterFor(guest);identities.set(guest,voice);}
      guestVoices.set(role,{guest,voice});queueVoice(voice,minBeat);
    }
    const active=new Set(['ari',...[...guestVoices.values()].map(v=>v.voice.key)]);
    jobs=jobs.filter(j=>active.has(j.voiceKey));
    for(const key of buffers.keys())if(!active.has(key.slice(key.indexOf(':')+1))){buffers.delete(key);queued.delete(key);}
    // A later returning voice can be queued again if its old jobs were pruned.
    for(const key of [...queued])if(!active.has(key.slice(key.indexOf(':')+1)))queued.delete(key);
    if(current?.miniFreestyler)current.miniFreestyler.guests=Object.fromEntries([...guestVoices].map(([role,v])=>[role,{character:v.voice.name,style:v.voice.style,register:v.voice.center}]));
  }
  function stopVoices(at){
    for(const v of [...voices]){
      try{v.gain.gain.cancelScheduledValues(at??0);v.gain.gain.setValueAtTime(1,at??ctx.currentTime);v.gain.gain.linearRampToValueAtTime(0,(at??ctx.currentTime)+.015);v.source.stop((at??ctx.currentTime)+.016);}catch(_){}
    }
  }
  function supported(t){return !!kindFor(t?.score);}
  function attach(t){
    if(current===t)return;
    generation++;if(worker)worker.terminate();worker=null;stopVoices();
    current=t;events=[];stepMap=new Map();buffers=new Map();owners=new Map();scheduled=new Set();
    jobs=[];busy=false;queued=new Set();guestVoices=new Map();
    if(!supported(t))return;
    events=plan(t.score,root.ARIMiniFreestylerData);
    t.miniFreestyler={version:api.version,kind:kindFor(t.score),events:events.length,status:'preparing'};
    if(!events.length){t.miniFreestyler.status=kindFor(t.score)==='jazz'?'unsupported-scale':'no-events';return;}
    // A.R.I. supplies a voice when the street has no mic guest.
    // Flag for score-bridge / legacy vocal brains: do not double-sing.
    t.ariSings=true;
    t.miniFreestylerOwnsVocals=true;
    for(const e of events){const s=Math.floor(e.beat*4+1e-7);if(!stepMap.has(s))stepMap.set(s,[]);stepMap.get(s).push(e);}
    const token=generation;
    try{
      worker=new Worker(workerURL);
      worker.onmessage=({data})=>{
        if(token!==generation)return;
        busy=false;
        if(data.error){t.miniFreestyler.status='error';console.error('[A.R.I. mini]',data.error);pump();return;}
        if(data.voiceKey==='ari'||[...guestVoices.values()].some(v=>v.voice.key===data.voiceKey))buffers.set(data.renderKey,data.samples);
        t.miniFreestyler.ready=buffers.size;pump();
      };
      worker.onerror=error=>{if(token!==generation)return;t.miniFreestyler.status='error';console.error('[A.R.I. mini] voice preparation failed',error);worker?.terminate();worker=null;};
      queueVoice(null,0);syncGuestVoices(0);
    }catch(error){t.miniFreestyler.status='error';console.error('[A.R.I. mini] worker unavailable',error);}
  }
  function available(tag){
    if(tag==='guest1')return !!(visitor&&visitorPhase==='performing'&&vis1?.instr==='on the mic');
    if(tag==='guest2')return !!(visitor2&&visitorPhase==='performing'&&vis2?.instr==='on the mic');
    return !!ariSing;
  }
  function selectOwner(e){
    const one=available('guest1'),two=available('guest2');
    if(one&&two)return Math.floor(e.phrase/8)%2?'guest2':'guest1';
    if(one)return 'guest1';if(two)return 'guest2';return available('ari')?'ari':null;
  }
  function step(sIdx,time){
    if(current!==track)attach(track);
    if(!supported(track)||!events.length||!ctx||ctx.state==='closed')return;
    syncGuestVoices(bar*4+sIdx/4);
    for(const v of voices)if(!v.fading&&(!available(v.owner)||(v.owner!=='ari'&&v.guest!==guestVoices.get(v.owner)?.guest))){
      v.fading=true;v.gain.gain.setValueAtTime(1,time);v.gain.gain.linearRampToValueAtTime(0,time+.06);try{v.source.stop(time+.061);}catch(_){}
    }
    for(const e of stepMap.get(bar*16+sIdx)||[]){
      if(scheduled.has(e.id))continue;
      const phraseKey=e.kind==='jazz'?e.id:e.phrase;
      if(!owners.has(phraseKey)){const tag=selectOwner(e);owners.set(phraseKey,{tag,guest:guestVoices.get(tag)?.guest});}
      const held=owners.get(phraseKey),owner=held.tag;if(!owner||!available(owner))continue;
      const identity=guestVoices.get(owner);
      if(owner!=='ari'&&held.guest!==identity?.guest)continue;
      const voice=identity?.voice;
      if(voice?.density<1&&e.kind==='rap'&&!e.protected&&hash(e.seed+voice.key)%100/100>voice.density)continue;
      const samples=buffers.get(renderKey(e,voice));if(!samples)continue;
      const when=time+(e.beat-(bar*4+sIdx/4))*60/track.bpm;
      if(when<ctx.currentTime-.03||voices.size>=24)continue;
      const buffer=ctx.createBuffer(1,samples.length,44100);buffer.copyToChannel(samples,0);
      const source=ctx.createBufferSource(),gain=ctx.createGain(),level=ctx.createGain(),mic=ctx.createGain();
      source.buffer=buffer;source.connect(level);level.gain.value=e.level;level.connect(mic);mic.connect(gain);gain.connect(master);
      const v={source,gain,owner,guest:identity?.guest};voices.add(v);
      source.onended=()=>{source.disconnect();level.disconnect();mic.disconnect();gain.disconnect();voices.delete(v);};
      const start=Math.max(when,ctx.currentTime+.001);
      if(typeof scheduleGuestMicLevel==='function')scheduleGuestMicLevel(mic.gain,start,buffer.duration,owner);
      source.start(start);source.stop(start+buffer.duration+.003);scheduled.add(e.id);
      visQ.push(owner==='ari'?{t:start,type:'alead'}:{t:start,type:'lead',v:owner==='guest2'?2:1});
    }
  }
  // AudioContext suspension preserves a legato note mid-phrase. Track changes
  // cancel old notes and worker jobs; the existing transport owns pause/resume.
  root.ARIMiniFreestyler=Object.freeze({...api,attach,step,supported,
    get state(){return current?.miniFreestyler||null;},get activeVoices(){return voices.size;}});
})(globalThis);
