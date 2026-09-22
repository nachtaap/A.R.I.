/* POCKETFLOW mini-Freestyler: rap prosody v0.2 + jazz warm-clean v1.4.
   Pure planning/DSP is also the worker entry. Browser lifecycle is below it.
   No recordings, remote inference, or extra accompaniment. */
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
  function nearest(m,notes){return notes.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,notes[0]);}
  function chordNotes(score,beat){
    const ch=score.harmony?.[clamp(Math.floor(beat/4),0,score.bars-1)]?.notes||[score.root];
    const pcs=new Set(ch.map(n=>mod(n,12)));
    return Array.from({length:25},(_,i)=>48+i).filter(n=>pcs.has(mod(n,12)));
  }
  // Preserve v1.4's MAJOR intervals even when the jazz backing is Dorian.
  // D Dorian uses C major as its parent, A minor uses C, G Mixolydian uses C.
  function jazzTranspose(score){
    const pcs=new Set(score.scale.map(n=>mod(n+score.root,12)));
    const major=[0,2,4,5,7,9,11];
    for(let pc=0;pc<12;pc++)if(major.every(n=>pcs.has(mod(n+pc,12))))return mod(pc+6,12)-6;
    return null; // Do not silently bend the approved melody into another mode.
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
              degrees:p.degrees,source:flow.source,phrase:start,seed:flow.source,level:3.2});
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
            events.push({kind,beat,duration,midi,energy:clamp(.22+.78*e.energy,0,1),brightness:.72+.50*e.energy,
              source:flow.source,phrase,seed:flow.source+':'+i,level:3.2});
          }
        }
      }
    }
    return events.sort((a,b)=>a.beat-b.beat).map((e,id)=>({...e,id}));
  }
  function renderRap(e,sr){
    const n=Math.max(1,Math.floor(e.duration*sr)),src=new Float64Array(n),out=new Float32Array(n),freq=hz(e.midi);
    let peak=0;
    for(let i=0;i<n;i++){
      const phase=2*Math.PI*freq*i/sr;let s=0;
      for(let h=1;h<8;h++)s+=Math.sin(h*phase+.17*h)/h;
      src[i]=s;peak=Math.max(peak,Math.abs(s));
    }
    // scipy.signal.iirpeak numerator/denominator, transposed direct form II.
    const filters=[[500,5,1],[1400,8,.5],[2350,10,.16*e.brightness]].map(([f,q,g])=>{
      const w=2*Math.PI*f/sr,beta=Math.tan(w/q/2),gain=1/(1+beta);
      return {b:1-gain,a1:-2*gain*Math.cos(w),a2:2*gain-1,g,z1:0,z2:0};
    });
    const r=rng(e.seed),attack=Math.max(.004,.009-.003*e.energy),release=7.5-2*e.energy;
    for(let i=0;i<n;i++){
      const x=src[i]/Math.max(peak,1e-9),t=i/sr;let y=0;
      for(const f of filters){const v=f.b*x+f.z1;f.z1=f.z2-f.a1*v;f.z2=-f.b*x-f.a2*v;y+=f.g*v;}
      out[i]=y*Math.min(1,t/attack)*Math.exp(-t*release)*(.055+.11*e.energy)
        +normal(r)*Math.exp(-t*65)*(.009+.017*e.energy)*e.brightness*(e.noiseLevel??1);
    }
    return out;
  }
  function formant(f,v){
    const w=.92,F1=(280-40*w)*(1-v)+(520-50*w)*v,F2=(650-110*w)*(1-v)+(920-90*w)*v,F3=(1550-160*w)*(1-v)+(1850-150*w)*v;
    return 1.35*Math.exp(-.5*((f-F1)/130)**2)+.42*Math.exp(-.5*((f-F2)/200)**2)+.06*Math.exp(-.5*((f-F3)/300)**2);
  }
  function renderJazz(e,sr){
    const n=Math.max(1,Math.floor(e.duration*sr)),out=new Float32Array(n),abs=new Float32Array(n);
    const r=rng(e.seed),detune=e.detune||Array.from({length:8},(_,i)=>1+.0022*i*(r()*2-1));
    const roll=Array.from({length:8},(_,i)=>1/(i+1)**1.55*.78**Math.max(0,i-1));
    let phase=0,locked=0;const lock=Math.floor(.72*n);
    for(let i=0;i<n;i++){
      const x=i/Math.max(1,n-1),v=interp(e.vowel,x);
      let midi=interp(e.midi,x)+.045*Math.sin(Math.PI*clamp(x/.68,0,1))**1.7*Math.sin(2*Math.PI*4.9*x*e.duration)
        +.16*Math.exp(-x*11)*(1-x)**.35;
      if(i===lock)locked=midi;if(i>=lock)midi=locked;
      const f=hz(midi);phase+=2*Math.PI*f/sr;let s=0;
      for(let h=1;h<=8;h++)s+=roll[h-1]*formant(h*f*detune[h-1],v)*Math.sin(h*phase*detune[h-1]+.04*h);
      s+=.02*Math.sin(2*phase+.1)+.01*Math.sin(4*phase+.1);
      out[i]=s;abs[i]=Math.abs(s);
    }
    abs.sort();const p=.95*(n-1),lo=Math.floor(p),p95=abs[lo]+(abs[Math.min(n-1,lo+1)]-abs[lo])*(p-lo);
    // Same 101-sample centered moving average as v1.4, scaled with sample rate.
    const width=Math.max(3,Math.round(101*sr/44100)|1),half=(width-1)/2,noise=new Float32Array(n);
    for(let i=0;i<n;i++)noise[i]=normal(r);
    let sum=0;for(let i=0;i<=half&&i<n;i++)sum+=noise[i];
    for(let i=0;i<n;i++){
      const t=i/sr,x=i/Math.max(1,n-1),env=(Math.min(1,t/.18)*clamp((e.duration-t)/.50,0,1))**.90;
      out[i]=out[i]/Math.max(p95,1e-9)*env*interp(e.amp,x)*.036
        +sum/width*env*(.35+.4*Math.exp(-t*8)+.12*Math.exp(-t*14))*(e.breath??.00085);
      if(i-half>=0)sum-=noise[i-half];if(i+half+1<n)sum+=noise[i+half+1];
    }
    return out;
  }
  const render=(e,sr=44100)=>e.kind==='jazz'?renderJazz(e,sr):renderRap(e,sr);
  const api={version:'mini-1.0',kindFor,jazzTranspose,plan,render};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  if(typeof document==='undefined'){
    root.onmessage=({data})=>{
      try{const samples=render(data.event,data.sampleRate);root.postMessage({id:data.event.id,samples},[samples.buffer]);}
      catch(error){root.postMessage({id:data.event.id,error:String(error)});}
    };
    return;
  }

  const workerURL=new URL(document.currentScript.src,location.href);
  let current=null,worker=null,events=[],stepMap=new Map(),buffers=new Map(),voices=new Set(),owners=new Map(),scheduled=new Set(),generation=0;
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
    if(!supported(t))return;
    events=plan(t.score,root.ARIMiniFreestylerData);
    t.miniFreestyler={version:api.version,kind:kindFor(t.score),events:events.length,status:'preparing'};
    if(!events.length){t.miniFreestyler.status='unsupported-scale';return;}
    // A.R.I. supplies a voice when the street has no mic guest.
    t.ariSings=true;
    for(const e of events){const s=Math.floor(e.beat*4+1e-7);if(!stepMap.has(s))stepMap.set(s,[]);stepMap.get(s).push(e);}
    const token=generation,sr=44100;let next=0;
    try{
      worker=new Worker(workerURL);
      worker.onmessage=({data})=>{
        if(token!==generation)return;
        if(data.error){t.miniFreestyler.status='error';console.error('[A.R.I. mini]',data.error);return;}
        buffers.set(data.id,data.samples);t.miniFreestyler.ready=buffers.size;
        if(next<events.length)worker.postMessage({event:events[next++],sampleRate:sr});
        else {t.miniFreestyler.status='ready';worker.terminate();worker=null;}
      };
      worker.onerror=error=>{if(token!==generation)return;t.miniFreestyler.status='error';console.error('[A.R.I. mini] voice preparation failed',error);worker?.terminate();worker=null;};
      worker.postMessage({event:events[next++],sampleRate:sr});
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
    for(const v of voices)if(!v.fading&&!available(v.owner)){
      v.fading=true;v.gain.gain.setValueAtTime(1,time);v.gain.gain.linearRampToValueAtTime(0,time+.06);try{v.source.stop(time+.061);}catch(_){}
    }
    for(const e of stepMap.get(bar*16+sIdx)||[]){
      if(scheduled.has(e.id))continue;
      const samples=buffers.get(e.id);if(!samples)continue;
      const phraseKey=e.kind==='jazz'?e.id:e.phrase;
      if(!owners.has(phraseKey))owners.set(phraseKey,selectOwner(e));
      const owner=owners.get(phraseKey);if(!owner||!available(owner))continue;
      const when=time+(e.beat-(bar*4+sIdx/4))*60/track.bpm;
      if(when<ctx.currentTime-.03||voices.size>=24)continue;
      const buffer=ctx.createBuffer(1,samples.length,44100);buffer.copyToChannel(samples,0);
      const source=ctx.createBufferSource(),gain=ctx.createGain(),level=ctx.createGain();
      source.buffer=buffer;source.connect(level);level.gain.value=e.level;level.connect(gain);gain.connect(master);
      const v={source,gain,owner};voices.add(v);
      source.onended=()=>{source.disconnect();level.disconnect();gain.disconnect();voices.delete(v);};
      const start=Math.max(when,ctx.currentTime+.001);source.start(start);source.stop(start+buffer.duration+.003);scheduled.add(e.id);
      visQ.push(owner==='ari'?{t:start,type:'alead'}:{t:start,type:'lead',v:owner==='guest2'?2:1});
    }
  }
  // AudioContext suspension preserves a legato note mid-phrase. Track changes
  // cancel old notes and worker jobs; the existing transport owns pause/resume.
  root.ARIMiniFreestyler=Object.freeze({...api,attach,step,supported,
    get state(){return current?.miniFreestyler||null;},get activeVoices(){return voices.size;}});
})(globalThis);
