/* Independent voice renderer for the score composer. No legacy bass substitution.
   Every scheduled voice owns its nodes and releases them on end/cancellation. */
(function(root){
  'use strict';
  class ScoreSynth {
    constructor(context,destination){this.ctx=context;this.destination=destination;this.voices=new Set();this.buffers=new Map();this.seed=null;}
    setTrack(score){const signature=score.seed+JSON.stringify(score.production);if(this.signature!==signature){this.signature=signature;this.seed=score.seed;this.production=score.production;this.buffers.clear();}}
    noise(kind,kit){
      const key=kind+':'+kit;if(this.buffers.has(key))return this.buffers.get(key);
      const sr=this.ctx.sampleRate,duration=kind==='kick'?.65:kind==='hat'?.45:.35;
      const buffer=this.ctx.createBuffer(1,Math.ceil(sr*duration),sr),data=buffer.getChannelData(0);
      const r=ARIComposer.rng(`${this.seed}:${key}`),tune={dry:.92,round:.78,crisp:1.17,dust:.87,electro:1.08}[kit]||1;
      let phase=0,low=0;const p=this.production;
      for(let i=0;i<data.length;i++){
        const t=i/sr,n=r()*2-1;low+=.12*(n-low);
        if(kind==='kick'){
          phase+=Math.PI*2*(42*tune+140*Math.exp(-t*(kit==='round'?24:45)))/sr;
          const decay=p?22-p.kickWeight*17:(kit==='round'?8:kit==='dry'?17:12);
          data[i]=Math.sin(phase)*Math.exp(-t*decay)*.8+n*Math.exp(-t*180)*(p?.punch??.25)*.4;
        }else if(kind==='snare'){
          const snap=(n-low)*Math.exp(-t*(kit==='dust'?24:14)),body=Math.sin(t*2*Math.PI*185*tune)*Math.exp(-t*28);
          data[i]=snap*.55+body*.28;
        }else if(kind==='perc'){
          data[i]=(Math.sin(2*Math.PI*t*440*tune)+.35*Math.sin(2*Math.PI*t*691*tune))*Math.exp(-t*35)*.25;
        }else{
          const metal=(Math.sin(t*2*Math.PI*6230*tune)+Math.sin(t*2*Math.PI*8910*tune))*.12;
          data[i]=((n-low)*.38+metal)*Math.exp(-t*10);
        }
        if(p?.drive){const d=1+p.drive*5;data[i]=Math.tanh(data[i]*d)/Math.sqrt(d);}
        data[i]*=Math.min(1,i/Math.max(1,sr*.001),(data.length-i)/(sr*.01));
      }
      this.buffers.set(key,buffer);return buffer;
    }
    play(e,time,bpm,level=1){
      const c=this.ctx;if(c.state==='closed'||!Number.isFinite(time))return;
      if(time<c.currentTime-.03)return;
      const t=Math.max(time,c.currentTime+.001),seconds=Math.max(.035,e.duration*60/bpm);
      // A bounded queue: scheduled future voices count too. Never accumulate
      // an unlimited catch-up burst after background suspension.
      if(this.voices.size>=768 && typeof c.startRendering!=='function')return;
      const nodes=[],sources=[],gain=c.createGain();nodes.push(gain);
      const pan=c.createStereoPanner();pan.pan.value=e.pan||0;nodes.push(pan);gain.connect(pan);pan.connect(this.destination);
      const percussion=['kick','snare','hat','perc'].includes(e.stem),bass=e.stem==='bass';
      let duration=seconds,attack=.008,release=.07,peak=e.velocity*level*(bass?.23:e.stem==='chords'?.09:.12);
      const osc=(type,hz,detune=0)=>{const o=c.createOscillator();o.type=type;o.frequency.value=hz;o.detune.value=detune;sources.push(o);nodes.push(o);return o;};
      if(percussion){
        const s=c.createBufferSource();s.buffer=this.noise(e.stem,e.voice);sources.push(s);nodes.push(s);s.connect(gain);
        duration=e.stem==='hat'?(e.midi===46?.28:.065):e.stem==='kick'?.48:.22;
        attack=.002;release=.015;peak=e.velocity*level*({kick:.75,snare:.52,hat:.31,perc:.42}[e.stem]);
      }else{
        const hz=440*Math.pow(2,(e.midi-69)/12),filter=c.createBiquadFilter();nodes.push(filter);filter.type='lowpass';filter.Q.value=.65;filter.connect(gain);
        const out=filter;
        if(['fm-bass','electric-piano','bell','mallet'].includes(e.voice)){
          const carrier=osc('sine',hz),ratio=e.voice==='bell'?3.5:e.voice==='fm-bass'?1:2;
          const modulator=osc('sine',hz*ratio),depth=c.createGain();nodes.push(depth);
          depth.gain.setValueAtTime(hz*(e.voice==='bell'?1.5:e.voice==='fm-bass'?1.8:.8),t);
          depth.gain.exponentialRampToValueAtTime(hz*.02,t+Math.max(.05,duration*.65));
          modulator.connect(depth);depth.connect(carrier.frequency);carrier.connect(out);
          filter.frequency.value=bass?1800:6800;release=e.voice==='bell'?.5:.18;
        }else if(e.voice==='reese'||e.voice==='soft-poly'){
          const a=osc('sawtooth',hz,-7),b=osc('sawtooth',hz,7);a.connect(out);b.connect(out);peak*=.42;
          filter.frequency.setValueAtTime(bass?1150:2400,t);filter.frequency.exponentialRampToValueAtTime(bass?280:950,t+duration);
          attack=bass?.015:.04;release=.22;
        }else if(e.voice==='organ'){
          [1,2,4].forEach((ratio,i)=>{const o=osc('sine',hz*ratio),g=c.createGain();g.gain.value=[.65,.23,.1][i];nodes.push(g);o.connect(g);g.connect(out);});filter.frequency.value=6500;release=.035;
        }else{
          const type=e.voice==='sub'?'sine':e.voice==='pulse-bass'?'square':e.voice==='reed'?'sawtooth':'triangle';
          osc(type,hz).connect(out);
          const pluck=/pluck|wood/.test(e.voice);filter.frequency.setValueAtTime(pluck?hz*12:e.voice==='reed'?2400:bass?800:4200,t);
          filter.frequency.exponentialRampToValueAtTime(Math.max(80,hz*(bass?2:3)),t+Math.max(.04,duration*.65));
          if(e.voice==='reed'){filter.Q.value=1.6;peak*=.7;}
          if(e.voice==='pulse-bass')peak*=.6;
          if(pluck){duration=Math.min(duration,bass?.65:1.1);release=.09;}
        }
      }
      if(this.production){if(bass)peak*=this.production.bassLevel;if(e.stem==='chords')peak*=this.production.chordsLevel;}
      const end=t+duration+release;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(peak,t+Math.min(attack,duration*.3));
      if(peak>0)gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*(percussion?.12:/pluck|piano|mallet|bell|wood/.test(e.voice)?.18:.68)),t+duration);
      else gain.gain.setValueAtTime(0,t+duration);
      gain.gain.linearRampToValueAtTime(0,end);
      let remaining=sources.length,cleaned=false;
      const v={time:t,end,sources,cleanup:()=>{if(cleaned)return;cleaned=true;nodes.forEach(n=>n.disconnect());this.voices.delete(v);}};
      this.voices.add(v);
      for(const s of sources){s.onended=()=>{if(--remaining===0)v.cleanup();};s.start(t);s.stop(end+.003);}
    }
    stop(at){for(const v of [...this.voices]){for(const s of v.sources)try{s.stop(at);}catch(_){}if(at===undefined)v.cleanup();}}
    get activeVoices(){return this.voices.size;}
  }
  root.ARIScoreSynth=ScoreSynth;
})(globalThis);
