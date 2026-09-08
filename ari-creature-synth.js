/* A.R.I. Creature Synth. All PCM is calculated here: no recordings, network,
   speech services or model weights. Also usable in Node for offline renders. */
(function(root) {
  'use strict';
  const TAU = Math.PI * 2;
  const TYPES = ['alien', 'diva', 'bird', 'primal', 'whisperbot', 'glass', 'metal'];
  const vowels = [[730,1090,2440],[270,2290,3010],[300,870,2240],[570,840,2410],[440,1020,2240]];
  function hash(value) {
    let h=2166136261;
    for(const c of String(value)) h=Math.imul(h^c.charCodeAt(0),16777619);
    return h>>>0;
  }
  function random(seed) {
    let n=hash(seed)||1;
    return () => { n^=n<<13; n^=n>>>17; n^=n<<5; return (n>>>0)/4294967296; };
  }
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const midiHz=n=>440*2**((n-69)/12);
  function identity(seed, type) {
    const r=random(seed);
    return {seed:String(seed), type:type||TYPES[Math.floor(r()*TYPES.length)],
      throat:.72+r()*.64, air:.035+r()*.11, rough:.1+r()*.6,
      vibrato:4.4+r()*2.5, depth:.008+r()*.021, syllables:2+Math.floor(r()*3),
      vowels:Array.from({length:5},()=>Math.floor(r()*vowels.length)),
      chirp:1.25+r()*2, metal:130+r()*220, decay:.15+r()*.32};
  }
  function resonator(freq, width, sr) {
    const radius=Math.exp(-Math.PI*width/sr);
    return {a:2*radius*Math.cos(TAU*freq/sr), b:radius*radius,
      g:(1-radius)*Math.sin(TAU*freq/sr),y1:0,y2:0};
  }
  function filter(x,f) { const y=f.g*x+f.a*f.y1-f.b*f.y2; f.y2=f.y1;f.y1=y;return y; }
  function render(dna, opts={}) {
    const sr=clamp(opts.sampleRate||22050,8000,96000), seconds=clamp(opts.duration||.8,.05,3);
    const data=new Float32Array(Math.ceil(sr*seconds));
    const type=opts.type||dna.type, r=random(dna.seed+':'+type+':'+(opts.variant||0));
    const f0=midiHz(opts.midi??60), phase0=r()*TAU;
    let phase=phase0, modPhase=0, low=0, previous=0, peak=0;
    let filters=vowels[0].map(f=>resonator(f*dna.throat,100,sr));
    const modes=[1,1.47,2.09,2.71,3.93,5.17].map((ratio,i)=>({
      f:(type==='glass'?f0:dna.metal)*ratio*(1+(r()-.5)*.02),p:r()*TAU,
      decay:(type==='glass'?.55:dna.decay)/(1+i*.23),amp:1/(1+i*.7)}));
    const syllables=type==='diva'?1:type==='primal'?2:dna.syllables;
    for(let i=0;i<data.length;i++) {
      const t=i/sr, u=t/seconds, syllable=Math.min(syllables-1,Math.floor(u*syllables));
      const local=(u*syllables)%1, noise=r()*2-1;
      let x=0;
      if(type==='metal'||type==='glass') {
        for(const m of modes) x+=Math.sin(TAU*m.f*t+m.p)*Math.exp(-t/m.decay)*m.amp;
        low+=.13*(noise-low);
        x=x*.32+(noise-low)*Math.exp(-t/(type==='metal'?.085:.008))*(type==='metal'?.7:.07);
      } else if(type==='bird') {
        const gate=Math.sin(Math.PI*local)**2;
        const chirp=f0*4*(.8+Math.pow(1-local,dna.chirp)*2.4);
        modPhase+=TAU*(19+73*local)/sr;
        phase+=TAU*chirp*(1+.07*Math.sin(modPhase))/sr;
        x=(Math.sin(phase+1.7*Math.sin(phase*1.43))*.7+Math.sin(phase*2.01)*.14)*gate;
      } else {
        let pitch=1;
        if(type==='alien') pitch=.5*(1+.12*Math.sin(TAU*u*3)+.23*(1-local)**3);
        if(type==='diva') pitch=2*(1-.13*Math.exp(-t*17))*(1+dna.depth*Math.sin(TAU*dna.vibrato*t)*Math.min(1,t*5));
        if(type==='primal') pitch=.5*(1+.48*Math.sin(Math.PI*u))*(1+.07*Math.sin(TAU*31*t));
        if(type==='whisperbot') pitch=1+.013*Math.sin(TAU*6*t)+.035*Math.exp(-local*25);
        phase+=TAU*f0*pitch/sr;
        // A band-limited harmonic glottis feeds three moving vocal resonators.
        let source=0;
        const harmonics=Math.min(16,Math.floor(sr*.42/(f0*pitch)));
        for(let h=1;h<=harmonics;h++) source+=Math.sin(phase*h)/h**1.15;
        if(type==='alien') source=source*.65+Math.sin(phase*.5)*.4;
        if(type==='primal') source=Math.tanh(source*(2+dna.rough*4))*(.7+.3*Math.sin(phase*.49))+noise*.28;
        const breath=type==='whisperbot'?.28:dna.air;
        source=source*(1-breath)+noise*breath;
        if(i%128===0) {
          const a=vowels[dna.vowels[syllable%dna.vowels.length]], b=vowels[dna.vowels[(syllable+1)%dna.vowels.length]];
          const mix=type==='diva'?.18*u:Math.max(0,(local-.55)/.45);
          filters=filters.map((old,k)=>Object.assign(resonator(clamp((a[k]*(1-mix)+b[k]*mix)*dna.throat,100,sr*.43),k===0?85:130+k*70,sr),{y1:old.y1,y2:old.y2}));
        }
        x=filters.reduce((sum,f,k)=>sum+filter(source,f)*[1,.75,.45][k],0);
        x+=source*(type==='diva'?.13:.07);
        const syllableEnvelope=type==='diva'?Math.sin(Math.PI*u)**.45:
          type==='primal'?Math.sin(Math.PI*u)**.65*(.8+.2*Math.sin(TAU*23*t)):
          Math.min(1,local*18)*Math.min(1,(1-local)*10);
        const consonant=type==='alien'||type==='whisperbot' ? noise*Math.exp(-local*45)*.14 : 0;
        x=x*syllableEnvelope+consonant;
      }
      // DC removal and a short boundary fade keep resampled cuts well behaved.
      const high=x-previous+.995*low;
      if(type!=='metal'&&type!=='glass') {previous=x;low=high;x=high;}
      const fade=Math.min(1,t/.007,(seconds-t)/.025);
      data[i]=Number.isFinite(x)?Math.tanh(x*1.2)*Math.max(0,fade):0;
      peak=Math.max(peak,Math.abs(data[i]));
    }
    const gain=peak>.00001?.78/peak:0;
    for(let i=0;i<data.length;i++) data[i]*=gain;
    return {data,sampleRate:sr,duration:seconds,midi:opts.midi??60,type};
  }
  function phrase(seed) {
    const r=random(seed+':motif');
    const rhythms=[[0,3,10],[0,6,8],[1,4,11],[0,2,7,12],[2,5,10,14]];
    const degrees=[[0,2,0],[0,4,2],[4,2,0],[0,0,3,2],[0,2,4,2]];
    const steps=rhythms[Math.floor(r()*rhythms.length)];
    const notes=degrees[Math.floor(r()*degrees.length)];
    return steps.map((step,i)=>({step,degree:notes[i%notes.length],beats:i===steps.length-1?1.1:.45,accent:i===0?1:.8}));
  }
  const api=Object.freeze({TYPES,identity,render,phrase,random,hash,midiHz});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.ARICreatureSynth=api;
})(typeof globalThis!=='undefined'?globalThis:this);
