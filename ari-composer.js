/* A.R.I. score composer. Original implementation; research and attribution in
   docs/audio-research.md. Pure composition: no DOM, audio clock or global RNG. */
(function(root) {
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mod=(x,n)=>((x%n)+n)%n;
  function hash(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return h>>>0;}
  function rng(seed){let x=hash(seed);return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
  const pick=(r,a)=>a[Math.floor(r()*a.length)];
  const range=(r,a,b)=>a+(b-a)*r();
  const modes={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],mixolydian:[0,2,4,5,7,9,10],phryg:[0,1,3,5,7,8,10]};
  const degree=(scale,d)=>scale[mod(d,scale.length)]+12*Math.floor(d/scale.length);
  // Constraints describe musical jobs, not canned 16-step tracks. Each job has
  // multiple admissible grammars; timbre, motif and form use separate RNG streams.
  const grammars={
    hiphop:['broken','backbeat','half'],trap:['half','broken'],rnb:['broken','half','backbeat'],soul:['backbeat','broken'],
    funk:['syncopated','backbeat'],house:['four','four','two-step'],techno:['four','motor'],garage:['two-step','broken'],
    dnb:['breakbeat','breakbeat','half'],breaks:['breakbeat','broken'],bass:['half','two-step'],trance:['four','motor'],
    afro:['interlock','syncopated'],reggae:['one-drop','broken'],latin:['clave','interlock'],jazz:['broken','syncopated'],
    ambient:['sparse','sparse','motor'],pop:['backbeat','four'],rock:['backbeat','motor'],experimental:['interlock','broken','sparse','motor']
  };
  const bassVoices=['sub','fm-bass','pluck-bass','pulse-bass','reese','wood-bass'];
  const keysVoices=['electric-piano','organ','plucked-keys','soft-poly','bell','reed'];
  const leads=['mallet','reed','soft-poly','bell','plucked-keys','electric-piano'];
  const forms=[
    [['intro',4,'A'],['main',12,'A'],['break',4,'B'],['main2',12,'B'],['main',8,'A'],['outro',4,'A']],
    [['intro',4,'B'],['main',8,'A'],['main2',8,'B'],['main',8,'A'],['break',8,'C'],['main2',8,'B'],['outro',4,'A']],
    [['intro',8,'A'],['main',16,'A'],['break',4,'C'],['main2',16,'B'],['outro',8,'B']],
    [['intro',4,'A'],['main',8,'A'],['break',4,'B'],['main2',8,'B'],['break',4,'C'],['main',8,'A'],['outro',4,'C']],
    [['intro',4,'C'],['main',12,'A'],['main2',12,'B'],['outro',8,'C']],
    [['intro',8,'C'],['main',8,'A'],['main2',8,'B'],['break',8,'C'],['main',12,'A'],['outro',4,'B']]
  ];
  function rhythm(r,grammar,variant){
    const k=new Set(),s=new Set(),h=new Set(),p=new Set();
    const add=(set,a)=>a.forEach(x=>set.add(x));
    if(grammar==='four'||grammar==='motor'){add(k,[0,4,8,12]);add(s,grammar==='motor'?[12]:[4,12]);}
    else if(grammar==='half'){add(k,[0,pick(r,[5,6,10,11,14])]);add(s,[8]);}
    else if(grammar==='two-step'){add(k,[0,pick(r,[6,7,10,11])]);add(s,[4,12]);}
    else if(grammar==='one-drop'){add(k,[8]);add(s,[8]);}
    else if(grammar==='sparse'){if(r()<.6)add(k,[pick(r,[0,8])]);if(r()<.4)add(s,[12]);}
    else if(grammar==='clave'||grammar==='interlock'){
      const pulses=pick(r,[3,5,7]),rotation=Math.floor(r()*16);
      for(let i=0;i<16;i++)if(mod(i*pulses+rotation,16)<pulses)p.add(i);
      add(k,[0,pick(r,[6,8,10])]);add(s,grammar==='clave'?[6,12]:[4,12]);
    }else{add(k,[0,pick(r,[6,7,8,10])]);add(s,[4,12]);}
    const extras=grammar==='syncopated'?3:grammar==='breakbeat'?2:1;
    for(let i=0;i<extras;i++){const pos=pick(r,[2,3,6,7,9,10,11,14,15]);if(!s.has(pos)&&r()<.78)k.add(pos);}
    const spacing=grammar==='sparse'?4:pick(r,[2,2,2,1]);
    for(let i=grammar==='one-drop'?2:0;i<16;i+=spacing)if(r()>.12)h.add(i);
    if(grammar==='motor')for(let i=0;i<16;i+=3)p.add(mod(i+variant,16));
    if(variant&&grammar!=='four'){k.delete(8);k.add(pick(r,[9,11,14]));}
    return {kick:[...k].sort((a,b)=>a-b),snare:[...s],hat:[...h],perc:[...p]};
  }
  function motif(r,length){
    const shape=pick(r,['arch','fall','climb','pendulum','step']),events=[];
    let at=pick(r,[0,.5,1]),d=Math.floor(r()*5);
    while(at<length*4-1){
      const delta=shape==='climb'?pick(r,[-1,1,1,2]):shape==='fall'?pick(r,[-2,-1,-1,1]):shape==='arch'?(at<length*2?1:-1):shape==='pendulum'?(events.length%2?-3:3):pick(r,[-2,-1,0,1,2]);
      d=clamp(d+delta,-2,9);
      const gap=pick(r,[.5,.75,1,1,1.5,2]);
      events.push({at,d,dur:gap*range(r,.45,.92),v:range(r,.56,.9)});
      at+=gap+(r()<.2?1:0);
    }
    return {shape,length,events};
  }
  function voiceLead(scale,root,deg,previous,extension){
    const raw=(extension?[0,2,4,6]:[0,2,4]).map(d=>root+12+degree(scale,deg+d));
    const candidates=[];
    for(let inv=0;inv<raw.length;inv++)for(const oct of [-12,0,12]){
      const v=raw.map((n,i)=>n+(i<inv?12:0)+oct).sort((a,b)=>a-b);
      if(v[0]>=45&&v.at(-1)<=83)candidates.push(v);
    }
    const cost=v=>v.reduce((sum,n,i)=>sum+Math.abs(n-(previous?.[i]??(52+i*5))),0);
    return candidates.sort((a,b)=>cost(a)-cost(b))[0]||raw;
  }
  function compose({seed,family='hiphop',genre=family,bpm=100,history=[],profile=null}){
    if(!grammars[family])family='experimental';
    // Reject similar audible identities, not similar titles. Bounded search.
    const candidates=Array.from({length:8},(_,attempt)=>identity(`${seed}:${family}`,family,attempt));
    const distance=(a,b)=>['grammar','bassRole','harmonyRole','harmonyMode','bassVoice','keysVoice','leadVoice','form','kit'].reduce((n,k)=>n+(a[k]!==b[k]),0)/9;
    const scored=candidates.map(id=>({id,score:history.length?Math.min(...history.slice(-6).map(h=>distance(id,h))):1}));
    scored.sort((a,b)=>b.score-a.score);const id=scored[0].id;
    if(profile)Object.assign(id,profile.identity);
    const densityRng=rng(`${seed}:${family}:lead-density`);
    const r=rng(`${seed}:${family}:composition:${id.attempt}`),hr=rng(`${seed}:${family}:harmony`),dr=rng(`${seed}:${family}:drums`);
    const scale=modes[id.mode],root=36+Math.floor(hr()*12);
    const sections=[];let bars=0;
    for(const [name,len,theme] of forms[id.form]){sections.push({name,start:bars,end:bars+len,theme,phraseLength:id.phrase});bars+=len;}
    const progression=[];let deg=0;
    const transitions={0:[1,3,4,5,6],1:[4,6],2:[3,5],3:[0,1,4],4:[0,5],5:[1,3,4],6:[0,3]};
    const harmonicPeriod=pick(hr,[4,6,8]);
    for(let i=0;i<harmonicPeriod;i++){
      progression.push(deg);
      deg=id.harmonyMode==='pedal'?(i%2?0:pick(hr,[3,4,6])):id.harmonyMode==='descending'?mod(deg-1,7):id.harmonyMode==='thirds'?mod(deg+pick(hr,[2,5]),7):pick(hr,transitions[deg]);
    }
    const a=motif(r,id.phrase),b=motif(r,id.phrase);id.motifShape=a.shape;
    const patterns=[rhythm(dr,id.grammar,0),rhythm(dr,id.grammar,1)];
    const harmonicRhythm=pick(hr,[[1,1,2],[2,2],[1,2,1,4],[4,2,2],[1,1,1,1]]);
    const harmony=[];let chordIndex=0,remaining=0,previous=null;
    for(let bar=0;bar<bars;bar++){
      const section=sections.find(s=>bar>=s.start&&bar<s.end);
      if(remaining===0||bar===section.start){
        remaining=harmonicRhythm[chordIndex%harmonicRhythm.length];
        deg=progression[chordIndex%progression.length];
        if(section.theme==='B')deg=mod(deg+pick(hr,[2,3,5]),7);
        if(section.name==='outro'&&bar>=bars-2)deg=0;
        previous=voiceLead(scale,root,deg,previous,id.extension);chordIndex++;
      }
      harmony.push({degree:deg,notes:previous.slice(),change:remaining===harmonicRhythm[(chordIndex-1)%harmonicRhythm.length]||bar===section.start});remaining--;
    }
    const events=[];const byBar=Array.from({length:bars},()=>[]);
    function emit(bar,stem,at,midi,duration,velocity,voice,pan=0){
      if(stem==='lead'&&profile&&densityRng()>profile.settings.leadDensity)return;
      const groove=(Math.round(at*4)%2?id.swing*.25:0)+(stem==='snare'?id.late:stem==='hat'?id.late*.4:0);
      const onset=clamp(bar*4+at+groove,bar*4,bar*4+3.999);
      const e={beat:onset,bar,stem,midi,duration:Math.max(.04,Math.min(duration,bars*4-onset)),velocity:clamp(velocity,.05,1),voice,pan};
      events.push(e);byBar[bar].push(e);
    }
    const bassRhythm=Array.from({length:id.phrase},()=>{
      const positions=new Set([pick(r,[0,.5,1])]);for(let i=0;i<2+Math.floor(r()*4);i++)positions.add(Math.floor(r()*16)/4);return [...positions].sort((x,y)=>x-y);
    });
    const leadStart=pick(r,[0,1]),harmonyOffset=pick(r,[.5,1.5,2.5]);
    for(let bar=0;bar<bars;bar++){
      const section=sections.find(s=>bar>=s.start&&bar<s.end),pos=bar-section.start;
      const isBreak=section.name==='break',intro=section.name==='intro',outro=section.name==='outro';
      const phraseEnd=(pos+1)%id.phrase===0;
      const energy=isBreak?.38:intro?.55:outro?.45:section.theme==='B'?.92:.75;
      const pat=patterns[section.theme==='B'?1:0],ch=harmony[bar];
      const drumsOn=!isBreak||id.breakRole==='drums';
      const bassOn=(!intro||pos>=2||id.introRole==='bass')&&(!isBreak||id.breakRole==='bass')&&(!outro||pos<section.end-section.start-2);
      const chordOn=!intro||id.introRole==='chords'||pos>=2;
      if(drumsOn){
        for(const s of pat.kick)if(!outro||s%4===0)emit(bar,'kick',s/4,36,.35,range(r,.78,.98),id.kit);
        for(const s of pat.snare)if(!intro||pos>=2)emit(bar,'snare',s/4,38,.22,range(r,.68,.92),id.kit);
        for(const s of pat.hat)if((!intro||id.introRole==='drums'||s%4===2)&&(!outro||s%4===2)){
          const open=id.grammar==='four'&&s%4===2;
          emit(bar,'hat',s/4,open?46:42,open?.3:.08,range(r,.3,.64)*(s%4===0?.85:1),id.kit,.16);
        }
        for(const s of pat.perc)emit(bar,'perc',s/4,56,.18,range(r,.35,.65),id.kit,-.22);
        // Recompose fills only at phrase boundaries; retain the pocket elsewhere.
        if(phraseEnd&&!intro&&!outro&&r()<.72){
          const start=pick(r,[2.5,3,3.5]),division=pick(r,[.25,.5,1/3]);
          for(let t=start;t<3.99;t+=division)emit(bar,'snare',t,38,.13,.3+(t-start)*.3,id.kit);
        }else if(!intro&&r()<.33)emit(bar,'snare',pick(r,[1.75,2.75,3.75]),38,.12,.25,id.kit);
      }
      if(bassOn){
        let positions=id.bassRole==='anchor'?pat.kick.map(s=>s/4):id.bassRole==='offbeat'?[.5,1.5,2.5,3.5]:id.bassRole==='sustain'?[0]:bassRhythm[pos%id.phrase];
        if(id.bassRole==='answer')positions=positions.filter(t=>!pat.kick.includes(Math.round(t*4)));
        if(!positions.length)positions=[2.5];
        positions.forEach((t,i)=>{
          const offset=i===0?0:id.bassRole==='walk'?i:pick(r,[0,0,2,4,6]);
          const note=root-12+degree(scale,ch.degree+offset);
          const next=positions[i+1]??4;
          const dur=id.bassRole==='sustain'?3.6:Math.max(.12,(next-t)*id.bassGate);
          emit(bar,'bass',t,note,dur,range(r,.62,.85),id.bassVoice);
        });
      }
      if(chordOn){
        let times=id.harmonyRole==='pad'?(ch.change?[0]:[]):id.harmonyRole==='skank'?[.5,1.5,2.5,3.5]:id.harmonyRole==='arpeggio'?[0,.5,1,1.5,2,2.5,3,3.5]:ch.change?[0,harmonyOffset]:[harmonyOffset];
        times.forEach((t,i)=>{
          const notes=id.harmonyRole==='arpeggio'?[ch.notes[(i+bar)%ch.notes.length]]:ch.notes;
          notes.forEach((n,j)=>emit(bar,'chords',t+j*.008,n,id.harmonyRole==='pad'?Math.max(.25,((harmony.findIndex((h,i)=>i>bar&&h.change)<0?bars:harmony.findIndex((h,i)=>i>bar&&h.change))-bar)*4-.1):id.harmonyRole==='skank'?.22:.65,energy*(id.harmonyRole==='arpeggio'?.7:.48),id.keysVoice,(j-1)*.16));
        });
      }
      if(!intro&&!outro&&(!isBreak||id.breakRole==='melody')){
        const phrase=section.theme==='B'?b:a,cycle=Math.floor(pos/id.phrase),local=pos%id.phrase;
        if(local!==id.phrase-1||cycle%2===1){
          for(const m of phrase.events){
            if(Math.floor(m.at/4)!==local)continue;
            if(local===0&&m.at<leadStart)continue;
            let d=m.d;if(cycle%3===1)d=4-d;else if(cycle%3===2)d+=2;
            // Strong positions resolve to a nearby chord member; passing notes keep contour.
            if(m.at%1===0){const opts=[ch.degree,ch.degree+2,ch.degree+4,ch.degree+7];d=opts.sort((x,y)=>Math.abs(x-d)-Math.abs(y-d))[0];}
            emit(bar,'lead',m.at%4,root+24+degree(scale,d),m.dur,m.v*.68,id.leadVoice,-.12);
          }
        }
      }
    }
    events.sort((a,b)=>a.beat-b.beat);byBar.forEach(es=>es.sort((a,b)=>a.beat-b.beat));
    return {version:2,musician:profile?{id:profile.id,name:profile.name,version:profile.version,engine:profile.engine}:null,production:profile?.settings||null,seed,genre,family,bpm,root,scale,scaleName:id.mode,bars,sections,harmony,events,byBar,identity:id,novelty:scored[0].score};
  }
  function identity(seed,family,attempt){
    const r=rng(`${seed}:identity:${attempt}`),warm=['hiphop','soul','jazz','rnb'].includes(family);
    return {attempt,grammar:pick(r,grammars[family]),bassRole:pick(r,['anchor','answer','walk','offbeat','sustain','riff']),
      harmonyRole:pick(r,family==='reggae'?['skank','skank','pad']:['pad','comp','arpeggio','skank']),harmonyMode:pick(r,['functional','functional','descending','thirds','pedal']),
      bassVoice:pick(r,bassVoices),keysVoice:pick(r,keysVoices),leadVoice:pick(r,leads),kit:pick(r,['dry','round','crisp','dust','electro']),
      form:Math.floor(r()*forms.length),phrase:pick(r,[2,4,4]),mode:pick(r,warm?['minor','dorian','major','mixolydian']:Object.keys(modes)),extension:r()<.6,
      swing:range(r,0,warm?.42:family==='garage'?.32:.14),late:warm?range(r,.015,.055):0,bassGate:range(r,.35,.92),
      introRole:pick(r,['bass','chords','drums']),breakRole:pick(r,['bass','chords','melody','drums']),motifShape:'pending'};
  }
  const api=Object.freeze({compose,rng,hash,degree,grammars});
  if(typeof module!=='undefined')module.exports=api;else root.ARIComposer=api;
})(globalThis);
