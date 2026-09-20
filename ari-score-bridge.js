/* A.R.I. score bridge — musicians engine becomes the accompaniment runtime.
   The legacy street/world layer stays alive for visitors, vocals, UI and events.
   Load this AFTER ari-beat-foundation.js / ari-sound-worlds.js. */
(function(root){
  'use strict';

  const VERSION = 1;
  const ACCOMPANIMENT_PLAYERS = [
    'playKick','play808Kick','play808Cowbell','playClap','playSnare','playHat',
    'play808','playDeepSub','playSilkSub','playPulseBass','playRound','playReese',
    'playRubber','playGrowl','playPluckBass','playBass',
    'playStab','playKeys','playAltPad','playPad','playRiser','playImpact'
  ];
  const ACCOMPANIMENT_VIS = new Set(['kick','snare','hat','chord','stab']);

  let installed = false;
  let synth = null;
  let originalNewTrack = null;
  let originalScheduleStep = null;

  const familyRules = [
    ['dnb',/drum.?n.?bass|dnb|jungle|neuro|techstep|jump.?up|liquid/i],
    ['garage',/garage|2.?step|speed garage|bassline|grime|uk funky/i],
    ['techno',/techno|industrial|warehouse|hardgroove/i],
    ['house',/house|jackin|french touch/i],
    ['trap',/trap|drill|rage|plugg|phonk/i],
    ['rnb',/\br&?b\b|slow jam|new jack/i],
    ['soul',/soul|gospel/i],
    ['funk',/funk|boogie|go-go|rare groove/i],
    ['bass',/dubstep|riddim|brostep|future bass|glitch hop/i],
    ['trance',/trance|psytrance|goa/i],
    ['afro',/afro|amapiano|gqom|kuduro|highlife|soukous/i],
    ['reggae',/reggae|dancehall|dub|rocksteady|ragga|lovers rock/i],
    ['latin',/reggaeton|dembow|salsa|merengue|bachata|cumbia|baile funk|soca|zouk|kompa/i],
    ['jazz',/jazz|bebop|hard bop|fusion/i],
    ['ambient',/ambient|downtempo|trip hop|idm|drone|chillout|lo-fi/i],
    ['rock',/rock|post.?punk|new wave|shoegaze|kraut|darkwave|coldwave/i],
    ['pop',/pop/i],
    ['breaks',/break|footwork|juke|miami bass/i],
    ['hiphop',/hip.?hop|boom bap|rap|g-funk|hyphy|crunk|cloud|jerk/i]
  ];

  function familyFor(genre){
    const s=String(genre||'');
    return familyRules.find(([,rx])=>rx.test(s))?.[0] || 'experimental';
  }

  function artistFor(t){
    const requested=root.ARIMusicians?.requested?.();
    if(requested) return requested;
    const family=familyFor(t?.genre);
    return root.ARIMusicians?.registry?.find(a=>a.family===family)
      || root.ARIMusicians?.registry?.[0]
      || null;
  }

  function rebuildWorldBrains(t){
    // These brains no longer make the accompaniment, but visitors/A.R.I. still
    // read them for phrasing, call-response and audience/world behaviour.
    try{
      if(typeof buildDrumBrain==='function') t.drumBrain=buildDrumBrain(t);
      if(typeof buildBassBrain==='function') t.bassBrain=buildBassBrain(t);
      if(typeof buildMelodyBrain==='function') t.melodyBrain=buildMelodyBrain(t);
      if(typeof buildComposerBrain==='function') t.composerBrain=buildComposerBrain(t);

      if(typeof buildVocalBrain==='function' && t.performerVoices){
        t.vocalBrains={
          ari:buildVocalBrain(t,'ari',t.guestDNA,t.performerVoices.ari),
          guest1:buildVocalBrain(t,'guest1',typeof vis1!=='undefined'&&vis1?.dna||t.guestDNA,t.performerVoices.guest1),
          guest2:buildVocalBrain(t,'guest2',typeof vis2!=='undefined'&&vis2?.dna||t.guestDNA,t.performerVoices.guest2)
        };
        t.vocalBrain=t.vocalBrains.ari;
      }
      if(typeof buildAudienceBrain==='function') t.audienceBrain=buildAudienceBrain(t);
      if(typeof buildEnergyCurve==='function') t.energyCurve=buildEnergyCurve(t);
    }catch(err){
      console.warn('[A.R.I. score bridge] world-brain refresh skipped',err);
    }
  }

  function indexScore(score){
    const map=new Map();
    for(const e of score.events||[]){
      const step=Math.floor(e.beat*4+1e-7);
      if(!map.has(step)) map.set(step,[]);
      map.get(step).push(e);
    }
    return map;
  }

  function attachScore(t){
    if(!t || !root.ARIComposer || !root.ARIMusicians || !root.ARIScoreSynth) return false;
    const artist=artistFor(t);
    if(!artist) return false;

    const settings={...root.ARIMusicians.settings(artist),leadDensity:0};
    const profile=root.ARIMusicians.profile(artist,settings);
    const score=root.ARIComposer.compose({
      seed:String(t.seed||t.trackId||Date.now()),
      family:artist.family,
      genre:artist.label,
      bpm:settings.bpm,
      profile
    });

    // The musicians composer is now authoritative for musical form and timing.
    t.scoreMode='musicians';
    t.scoreEngine=root.ARIMusicians.ENGINE;
    t.scoreBridgeVersion=VERSION;
    t.score=score;
    t.scoreStepMap=indexScore(score);
    t.musician={id:artist.id,name:artist.name,family:artist.family,label:artist.label,version:artist.version};
    t.musicProfile=settings;

    t.bpm=score.bpm;
    t.bars=score.bars;
    t.sections=score.sections;
    t.root=score.root;
    t.scale=score.scale;
    t.scaleName=score.scaleName;
    if(typeof KEYS!=='undefined') t.keyName=KEYS[t.root%12]+' '+t.scaleName;

    // Legacy musical stunts would rewrite a score that has already been composed.
    // Street visitors/world events remain; accompaniment-altering stunts do not.
    t.special=null;
    t.cutBar=null;
    t.voiceLead=null;
    t.lastBass=null;

    rebuildWorldBrains(t);
    try{ if(typeof updateMeta==='function') updateMeta(0); }catch(_){}

    if(typeof ctx!=='undefined' && ctx && typeof master!=='undefined' && master){
      if(!synth || synth.ctx!==ctx) synth=new root.ARIScoreSynth(ctx,master);
      synth.setTrack(score);
    }

    console.info('[A.R.I.] musicians score active',{
      musician:artist.name,
      family:artist.family,
      bpm:score.bpm,
      bars:score.bars,
      melody:settings.leadDensity
    });
    return true;
  }

  function scoreStep(sIdx,t){
    if(typeof track==='undefined' || !track?.scoreMode || !track.scoreStepMap) return;
    if(!synth || synth.ctx!==ctx){
      if(!ctx||!master)return;
      synth=new root.ARIScoreSynth(ctx,master);
      synth.setTrack(track.score);
    }
    const key=bar*16+sIdx, events=track.scoreStepMap.get(key);
    if(!events?.length)return;
    const spb=60/track.bpm, stepBeat=bar*4+sIdx/4;
    for(const e of events){
      const when=t+Math.max(0,(e.beat-stepBeat)*spb);
      synth.play(e,when,track.bpm);
      try{
        if(typeof visQ!=='undefined'){
          const type=e.stem==='kick'?'kick':e.stem==='snare'?'snare':e.stem==='hat'||e.stem==='perc'?'hat':e.stem==='chords'?'chord':null;
          if(type)visQ.push({t:when,type});
        }
      }catch(_){}
    }
  }

  function withLegacyAccompanimentMuted(fn){
    const saved=[];
    for(const name of ACCOMPANIMENT_PLAYERS){
      const f=root[name];
      if(typeof f==='function'){
        saved.push([name,f]);
        root[name]=function(){};
      }
    }

    let oldPush=null;
    try{
      if(typeof visQ!=='undefined' && visQ && typeof visQ.push==='function'){
        oldPush=visQ.push;
        visQ.push=function(...items){
          const keep=items.filter(x=>!ACCOMPANIMENT_VIS.has(x?.type));
          return keep.length?oldPush.apply(this,keep):this.length;
        };
      }
    }catch(_){}

    try{return fn();}
    finally{
      for(const [name,f] of saved)root[name]=f;
      try{if(oldPush)visQ.push=oldPush;}catch(_){}
    }
  }

  function install(){
    if(installed) return true;
    if(!root.ARIComposer || !root.ARIMusicians || !root.ARIScoreSynth) return false;
    if(typeof newTrack!=='function' || typeof scheduleStep!=='function') return false;

    originalNewTrack=newTrack;
    originalScheduleStep=scheduleStep;

    newTrack=function(...args){
      const result=originalNewTrack.apply(this,args);
      try{attachScore(track);}catch(err){console.error('[A.R.I. score bridge] compose failed',err);}
      return result;
    };

    scheduleStep=function(sIdx,t){
      if(typeof track!=='undefined' && track?.scoreMode==='musicians'){
        scoreStep(sIdx,t);
        return withLegacyAccompanimentMuted(()=>originalScheduleStep.call(this,sIdx,t));
      }
      return originalScheduleStep.call(this,sIdx,t);
    };

    // If another startup path created a track before the bridge installed, adopt it.
    try{if(typeof track!=='undefined'&&track&&!track.scoreMode)attachScore(track);}catch(_){}

    installed=true;
    root.ARIScoreBridge=Object.freeze({
      version:VERSION,
      attach:attachScore,
      get active(){try{return typeof track!=='undefined'&&track?.scoreMode==='musicians';}catch(_){return false;}},
      get musician(){try{return track?.musician||null;}catch(_){return null;}}
    });
    console.info('[A.R.I.] score bridge v'+VERSION+' ready · musicians engine is the accompaniment');
    return true;
  }

  function boot(){
    if(install())return;
    let tries=0;
    const timer=setInterval(()=>{
      if(install()||++tries>80)clearInterval(timer);
    },50);
  }

  // Install after all synchronous legacy wrappers have had their turn.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})(globalThis);
