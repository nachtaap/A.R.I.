/* A.R.I. motif composer. Original implementation of rhythm-first, seeded
   scale walks and phrase repetition; see README for research references. */
(function(root){
  'use strict';
  const VERSION='3.0.0';
  const mod=(n,d)=>((n%d)+d)%d;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rhythms={
    straight:[[0,1.5,3,4,5.5],[0,1,2.5,4,6]],
    syncopated:[[0,1.5,2.75,4.5,6],[.5,1.25,3,4.5,6]],
    sparse:[[0,2.5,4.5],[.5,3,5.5]],
    pulse:[[0,.75,2,4,5.5,6.5],[0,1.5,2.5,4,4.75,6]]
  };
  function weighted(r,items){
    let x=r()*items.reduce((sum,item)=>sum+item.w,0);
    for(const item of items){x-=item.w;if(x<=0)return item.d;}
    return items[items.length-1].d;
  }
  function voiceFor(score){
    const voices=['atlas-pd','atlas-modal','atlas-pluck','atlas-ring'];
    return voices[Math.floor(root.ARIComposer.rng(score.seed+':melody-voice-v3')()*voices.length)];
  }
  function generate(score,opts={}){
    if(!score||!root.ARIComposer||!score.scale?.length||!score.harmony?.length)return [];
    const density=clamp(opts.density??.42,0,1);
    if(!Number.isFinite(density)||density===0)return [];
    const r=root.ARIComposer.rng(score.seed+':motif-v3');
    const bars=Math.min(score.bars,opts.bars??score.bars);
    const family=score.family;
    const style=/ambient|rnb|soul/.test(family)?'sparse':/techno|trance|bass|dnb/.test(family)?'pulse':/jazz|hiphop|funk|garage|afro|latin|reggae/.test(family)?'syncopated':'straight';
    const choices=rhythms[style],rhythm=choices[Math.floor(r()*choices.length)];
    // Thin the motif once, never randomly thin each repetition. Keep its endpoints.
    const count=Math.max(3,Math.round(3+density*(rhythm.length-3)));
    const slots=rhythm.filter((_,i)=>i===0||i===rhythm.length-1||i<count-1);
    const n=score.scale.length,base=1+Math.floor(r()*3),direction=r()<.5?1:-1;
    let degree=base,previous=0;
    const motif=slots.map((beat,i)=>{
      if(i){
        const target=base+direction*Math.sin(i/(slots.length-1)*Math.PI)*2;
        const items=[];
        for(let delta=-3;delta<=3;delta++){
          const d=degree+delta;if(d<0||d>n)continue;
          let w=[1.3,4,1.2,.22][Math.abs(delta)]*Math.exp(-Math.abs(d-target)*.4);
          if(Math.abs(previous)>=2&&Math.sign(delta)===-Math.sign(previous))w*=2;
          items.push({d,w});
        }
        const next=weighted(r,items);previous=next-degree;degree=next;
      }
      return {beat,degree,velocity:i===0?.7:.53+r()*.1};
    });
    if(motif.every(m=>m.degree===motif[0].degree))motif[1].degree=clamp(base+1,0,n);
    const register=opts.register??24,voice=opts.voice||voiceFor(score);
    const pitches=Array.from({length:n+1},(_,d)=>score.root+register+root.ARIComposer.degree(score.scale,d));
    const nearest=(target,allowed)=>allowed.reduce((a,b)=>Math.abs(b-target)<Math.abs(a-target)?b:a);
    const out=[],sections=score.sections?.length?score.sections:[{name:'main',start:0,end:bars}];
    for(const section of sections){
      const end=Math.min(bars,section.end)*4;
      for(let start=section.start*4;start<end;start+=8){
        const phrase=Math.floor((start-section.start*4)/8),role=phrase%4;
        // Intro/outro/break leave an entire answering cell silent. Low density
        // leaves an extra two-bar breath even in main sections.
        if((!/^(main)/.test(section.name)||density<.3)&&phrase%2)continue;
        for(let i=0;i<motif.length;i++){
          const m=motif[i],beat=start+m.beat;if(beat>=end)continue;
          const last=i===motif.length-1,bar=Math.floor(beat/4);
          // A, A', B, A: retain the opening; vary only the tail, or invert B.
          let d=role===2?clamp(2*base-m.degree,0,n):m.degree;
          if(role===1&&i>=motif.length-2)d=clamp(d+direction,0,n);
          let midi=pitches[d];
          const chord=score.harmony[bar%score.harmony.length];
          const chordPitches=pitches.filter(p=>chord.notes.some(x=>mod(x,12)===mod(p,12)));
          if((i===0||last)&&chordPitches.length){
            const target=last&&role===3?pitches[0]:midi;
            midi=nearest(target,chordPitches);
          }
          const next=start+(motif[i+1]?.beat??7.5);
          const duration=Math.min((next-beat)*.78,style==='sparse'?2:1.5,end-beat);
          if(duration<=0)continue;
          // Vocal intervals include their release and a breath on each side.
          if((opts.occupied||[]).some(v=>beat<v.end&&beat+duration+.18>v.start))continue;
          out.push({beat,bar,stem:'lead',midi,duration,velocity:m.velocity*(section.name==='intro'?.8:1),voice,pan:-.1});
        }
      }
    }
    return out;
  }
  function apply(score,opts={}){
    if(!score)return score;
    const events=generate(score,opts);
    score.events=(score.events||[]).filter(e=>e.stem!=='lead').concat(events).sort((a,b)=>a.beat-b.beat);
    score.byBar=Array.from({length:score.bars},()=>[]);
    for(const event of score.events)score.byBar[Math.floor(event.beat/4)]?.push(event);
    return score;
  }
  const api=Object.freeze({version:VERSION,generate,apply,voiceFor});
  root.ARIMelodyWalk=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
