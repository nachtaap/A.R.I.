/* Independent voice renderer for the score composer. No legacy bass substitution.
   Every scheduled voice owns its nodes and releases them on end/cancellation.
   Drums v2: pitch-enveloped kick, dual-shell snare, band-limited hats (procedural). */
(function(root){
  'use strict';
  class ScoreSynth {
    constructor(context,destination){this.ctx=context;this.destination=destination;this.voices=new Set();this.buffers=new Map();this.seed=null;}
    setTrack(score){const signature=score.seed+JSON.stringify(score.production);if(this.signature!==signature){this.signature=signature;this.seed=score.seed;this.production=score.production;this.buffers.clear();}}
    /* Drum one-shots: procedural, no samples. Pitch-enveloped kick body +
       filtered click; dual-shell snare; band-limited hats. Own synthesis
       (not a third-party engine). production.kickWeight / punch / drive still apply. */
    noise(kind,kit){
      const key=kind+':'+kit;if(this.buffers.has(key))return this.buffers.get(key);
      const sr=this.ctx.sampleRate;
      const duration=kind==='kick'?.55:kind==='hat'?.5:kind==='snare'?.38:.32;
      const nSamp=Math.ceil(sr*duration);
      const buffer=this.ctx.createBuffer(1,nSamp,sr),data=buffer.getChannelData(0);
      const r=ARIComposer.rng(`${this.seed}:${key}`);
      const tune={dry:.94,round:.8,crisp:1.14,dust:.88,electro:1.1}[kit]||1;
      const p=this.production;
      const soft=(x,d)=>{const g=1+(d||0)*4;const y=Math.tanh(x*g);return y/Math.sqrt(Math.max(1,g*.55+1));};
      // one-pole helpers (no AudioWorklet)
      let lp=0,hp=0,bp=0;
      const lowpass=(x,a)=>{lp+=a*(x-lp);return lp;};
      const highpass=(x,a)=>{lp+=a*(x-lp);return x-lp;};
      const bandpass=(x,a)=>{const l=lowpass(x,a);return highpass(l,a*.9);};

      if(kind==='kick'){
        // startHz → endHz pitch fall; body sine + short noise click through band
        const endHz=38*tune+(kit==='round'?8:0);
        const startHz=endHz+(kit==='round'?95:kit==='electro'?155:130);
        const pitchDec=kit==='round'?.055:kit==='dry'?.032:.04;
        const ampDec=p?(.42+p.kickWeight*.35):(kit==='round'?.55:kit==='dry'?.28:.38);
        const clickLvl=.22+(p?.punch??.25)*.45;
        const clickDec=.012+(p?.punch??.25)*.01;
        const drive=1+(p?.drive??.15)*3.2;
        let phase=0,pitchEnv=1,amp=1,clickAmp=1;
        const pk=Math.exp(-1/(pitchDec*sr));
        const ak=Math.exp(-6.91/(ampDec*sr));
        const ck=Math.exp(-6.91/(clickDec*sr));
        lp=0;
        for(let i=0;i<nSamp;i++){
          const f=endHz+(startHz-endHz)*pitchEnv;
          phase+=f/sr;if(phase>=1)phase-=1;
          const body=Math.sin(phase*Math.PI*2)*amp;
          const noise=r()*2-1;
          // ~2.4 kHz click band
          const click=bandpass(noise,.18)*clickAmp*clickLvl;
          let v=soft(body*.9+click,drive);
          // mild DC lean removal
          v=highpass(v,.002);
          data[i]=v;
          pitchEnv*=pk;amp*=ak;clickAmp*=ck;
        }
      }else if(kind==='snare'){
        const toneHz=175*tune;
        const toneDec=kit==='dust'?.09:.12;
        const noiseDec=kit==='dust'?.14:kit==='crisp'?.1:.16;
        const noiseLvl=.72;
        const toneLvl=.38;
        const drive=1+(p?.drive??.12)*2.5;
        let ph1=0,ph2=0,tAmp=1,nAmp=1;
        const f1=toneHz/sr,f2=(toneHz*1.48)/sr;
        const tk=Math.exp(-6.91/(toneDec*sr));
        const nk=Math.exp(-6.91/(noiseDec*sr));
        lp=0;let lp2=0;
        for(let i=0;i<nSamp;i++){
          ph1+=f1;if(ph1>=1)ph1-=1;
          ph2+=f2;if(ph2>=1)ph2-=1;
          const tone=(Math.sin(ph1*Math.PI*2)*.65+Math.sin(ph2*Math.PI*2)*.35)*tAmp*toneLvl;
          const white=r()*2-1;
          // noise band ~400–6k
          lp+=.08*(white-lp);
          const hip=white-lp;
          lp2+=.35*(hip-lp2);
          const noise=lp2*nAmp*noiseLvl;
          data[i]=soft(tone+noise,drive);
          tAmp*=tk;nAmp*=nk;
        }
      }else if(kind==='perc'){
        // rim / clave-ish
        let ph=0,amp=1;
        const f0=620*tune/sr,f1=940*tune/sr;
        const ak=Math.exp(-6.91/(.07*sr));
        lp=0;
        for(let i=0;i<nSamp;i++){
          ph+=f0;if(ph>=1)ph-=1;
          const white=r()*2-1;
          lp+=.25*(white-lp);
          const v=Math.sin(ph*Math.PI*2)*.55+Math.sin((ph*f1/f0)*Math.PI*2)*.2+(white-lp)*.15;
          data[i]=v*amp*.45;
          amp*=ak;
        }
      }else{
        // hat: filtered noise + a touch of metallic partials
        const open=false; // length still chosen in play(); buffer is closed-ish body
        const dec=kit==='dust'?.09:kit==='crisp'?.055:.07;
        const ak=Math.exp(-6.91/(dec*sr));
        let amp=1;lp=0;let bpState=0;
        for(let i=0;i<nSamp;i++){
          const t=i/sr;
          const white=r()*2-1;
          lp+=.55*(white-lp);
          const hip=white-lp;
          bpState+=.4*(hip-bpState);
          const metal=(Math.sin(t*2*Math.PI*6200*tune)+Math.sin(t*2*Math.PI*8800*tune)*.7)*.08;
          data[i]=(bpState*.85+metal)*amp*(kit==='electro'?1.05:1);
          amp*=ak;
        }
      }

      // peak normalise so kit gains stay comparable
      let peak=1e-9;
      for(let i=0;i<nSamp;i++){const a=Math.abs(data[i]);if(a>peak)peak=a;}
      const g=1/peak;
      const fade=Math.max(2,Math.floor(sr*.003));
      for(let i=0;i<nSamp;i++){
        let v=data[i]*g;
        // micro attack
        if(i<sr*.001)v*=i/Math.max(1,sr*.001);
        // fade tail to avoid click on stop
        if(i>nSamp-fade)v*=(nSamp-1-i)/fade;
        data[i]=v;
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
