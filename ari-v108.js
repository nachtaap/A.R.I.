/* A.R.I. v108 — Street Improv Engine
   Origin-first architecture:
   - everything is synthesized live; no prerecorded loops
   - rapid patch-bank / macro-style sound switching
   - composition grows by layering, recall and small overdubs
   - genre requests resolve into reusable musical grammars
   - hundreds of canonical styles + thousands of request identities

   This file extends the v107 engine and is intentionally data-driven:
   adding a style means adding musical metadata, not another standalone engine.
*/
(() => {
  'use strict';

  const VERSION = 108;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));

  function unit(t, tag) {
    if (typeof seededUnit === 'function' && t?.seed != null)
      return seededUnit(t.seed, `v108:${tag}`);
    let h = 2166136261;
    const s = `${t?.seed ?? 0}:${tag}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  function existing(...names) {
    for (const n of names) if (typeof GENRES !== 'undefined' && GENRES[n]) return n;
    return 'boom bap';
  }

  const BASE = {
    hiphop: existing('boom bap'),
    trap: existing('trap','boom bap'),
    rnb: existing('2000s rnb','boom bap'),
    soul: existing('2000s rnb','boom bap'),
    funk: existing('boom bap','2000s rnb'),
    house: existing('house'),
    techno: existing('house'),
    garage: existing('UK garage','house'),
    dnb: existing('drum n bass','UK garage','house'),
    breaks: existing('UK garage','drum n bass','house'),
    bass: existing('dubstep','drum n bass','house'),
    trance: existing('house'),
    afro: existing('afrobeats','house'),
    reggae: existing('downtempo','afrobeats','boom bap'),
    latin: existing('afrobeats','house'),
    jazz: existing('2000s rnb','boom bap'),
    ambient: existing('downtempo','lo-fi','house'),
    pop: existing('2000s rnb','house'),
    rock: existing('downtempo','boom bap'),
    experimental: existing('downtempo','dubstep','house')
  };

  const FAMILY = {
    hiphop:{weight:22,bpm:[78,104],swing:[.07,.19],chordBars:2,loop:[4,8],machine:.26,sync:.63,density:.55,repeat:.82,melody:.46,space:.44,grit:.46,patch:'warm'},
    trap:{weight:11,bpm:[118,156],swing:[.01,.07],chordBars:2,loop:[4,8],machine:.76,sync:.60,density:.64,repeat:.76,melody:.38,space:.48,grit:.58,patch:'hard'},
    rnb:{weight:11,bpm:[70,114],swing:[.05,.15],chordBars:1,loop:[4,8],machine:.34,sync:.58,density:.50,repeat:.72,melody:.76,space:.63,grit:.24,patch:'warm'},
    soul:{weight:9,bpm:[68,110],swing:[.08,.18],chordBars:1,loop:[4,8],machine:.20,sync:.55,density:.47,repeat:.70,melody:.80,space:.58,grit:.28,patch:'warm'},
    funk:{weight:8,bpm:[90,126],swing:[.05,.14],chordBars:1,loop:[4,8],machine:.24,sync:.80,density:.72,repeat:.68,melody:.62,space:.35,grit:.38,patch:'warm'},
    house:{weight:8,bpm:[116,132],swing:[0,.04],chordBars:2,loop:[8,16],machine:.82,sync:.42,density:.62,repeat:.87,melody:.48,space:.52,grit:.30,patch:'clean'},
    techno:{weight:6,bpm:[122,144],swing:[0,.025],chordBars:4,loop:[8,16,32],machine:.93,sync:.34,density:.58,repeat:.93,melody:.25,space:.55,grit:.63,patch:'dark'},
    garage:{weight:5,bpm:[126,142],swing:[.04,.12],chordBars:2,loop:[4,8],machine:.61,sync:.83,density:.64,repeat:.77,melody:.47,space:.48,grit:.36,patch:'clean'},
    dnb:{weight:5,bpm:[158,180],swing:[0,.03],chordBars:2,loop:[8,16],machine:.73,sync:.86,density:.82,repeat:.77,melody:.52,space:.48,grit:.53,patch:'digital'},
    breaks:{weight:4,bpm:[118,152],swing:[.01,.08],chordBars:2,loop:[4,8],machine:.57,sync:.87,density:.70,repeat:.72,melody:.42,space:.40,grit:.50,patch:'hard'},
    bass:{weight:4,bpm:[130,152],swing:[0,.05],chordBars:2,loop:[4,8],machine:.78,sync:.65,density:.65,repeat:.79,melody:.30,space:.56,grit:.73,patch:'dark'},
    trance:{weight:2,bpm:[126,146],swing:[0,.02],chordBars:2,loop:[8,16],machine:.88,sync:.30,density:.64,repeat:.84,melody:.83,space:.70,grit:.25,patch:'digital'},
    afro:{weight:5,bpm:[96,126],swing:[.04,.13],chordBars:2,loop:[4,8],machine:.37,sync:.89,density:.70,repeat:.72,melody:.59,space:.38,grit:.28,patch:'warm'},
    reggae:{weight:4,bpm:[68,110],swing:[.05,.13],chordBars:2,loop:[4,8],machine:.29,sync:.73,density:.44,repeat:.83,melody:.53,space:.73,grit:.32,patch:'warm'},
    latin:{weight:3,bpm:[88,134],swing:[.03,.11],chordBars:1,loop:[4,8],machine:.34,sync:.91,density:.76,repeat:.66,melody:.68,space:.34,grit:.24,patch:'warm'},
    jazz:{weight:4,bpm:[70,134],swing:[.08,.21],chordBars:1,loop:[4,8],machine:.11,sync:.69,density:.58,repeat:.55,melody:.91,space:.55,grit:.20,patch:'warm'},
    ambient:{weight:2,bpm:[56,102],swing:[0,.06],chordBars:4,loop:[8,16,32],machine:.23,sync:.28,density:.23,repeat:.75,melody:.56,space:.95,grit:.20,patch:'digital'},
    pop:{weight:3,bpm:[86,134],swing:[.01,.08],chordBars:1,loop:[4,8],machine:.55,sync:.48,density:.58,repeat:.70,melody:.82,space:.48,grit:.20,patch:'clean'},
    rock:{weight:2,bpm:[80,152],swing:[.01,.08],chordBars:1,loop:[4,8],machine:.27,sync:.44,density:.72,repeat:.65,melody:.72,space:.38,grit:.65,patch:'hard'},
    experimental:{weight:1,bpm:[66,154],swing:[0,.15],chordBars:3,loop:[4,8,16],machine:.47,sync:.73,density:.46,repeat:.47,melody:.54,space:.73,grit:.67,patch:'wild'}
  };

  const STYLE_GROUPS = {
    hiphop:[
      'old school hip hop','golden age hip hop','east coast hip hop','west coast hip hop','underground hip hop',
      'jazzy hip hop','conscious hip hop','alternative hip hop','abstract hip hop','hardcore hip hop','mafioso rap',
      'memphis rap','southern hip hop','g-funk','hyphy','crunk','snap','cloud rap','lo-fi hip hop','instrumental hip hop',
      'jazz rap','boom bap','backpack rap','native tongues hip hop','horrorcore','chopped and screwed','miami hip hop',
      'bay area rap','brooklyn rap','queens rap','bronx hip hop','atlanta rap','houston rap','detroit rap'
    ],
    trap:[
      'trap','drill','new york drill','uk drill','chicago drill','brooklyn drill','rage','plugg','pluggnb','cloud trap',
      'dark trap','southern trap','trap soul','jersey club rap','phonk','memphis phonk','drift phonk','trap metal',
      'melodic trap','ambient trap','atlanta trap','detroit trap','jerk rap','hood trap','minimal trap'
    ],
    rnb:[
      '2000s rnb','90s rnb','80s rnb','contemporary rnb','alternative rnb','neo soul','new jack swing','quiet storm',
      'slow jam','future rnb','progressive rnb','rnb soul','hip hop soul','bedroom rnb','dark rnb','electronic rnb',
      'soulful rnb','uk rnb','atlanta rnb','classic rnb','late night rnb'
    ],
    soul:[
      'soul','modern soul','deep soul','northern soul','southern soul','psychedelic soul','blue eyed soul','gospel soul',
      'sweet soul','neo soul groove','philly soul','memphis soul','chicago soul','motown groove','cinematic soul',
      'rare soul','funk soul','electronic soul','street soul'
    ],
    funk:[
      'funk','p-funk','boogie','electro funk','jazz funk','rare groove','go-go','disco funk','synth funk','deep funk',
      'breakbeat funk','street funk','80s funk','70s funk','minimal funk','psychedelic funk','space funk','future funk',
      'funky breaks','boogie funk'
    ],
    house:[
      'chicago house','deep house','acid house','tech house','soulful house','garage house','piano house','french house',
      'progressive house','minimal house','electro house','afro house','ghetto house','lo-fi house','filter house',
      'classic house','jackin house','microhouse','organic house','tribal house','funky house','disco house','hard house',
      'dream house','outsider house','90s house','warehouse house','bass house','future house'
    ],
    techno:[
      'detroit techno','dark techno','hypnotic techno','industrial techno','dub techno','acid techno','minimal techno',
      'raw techno','warehouse techno','hard techno','melodic techno','deep techno','birmingham techno','tribal techno',
      'peak time techno','berlin techno','proper techno','groove techno','hardgroove','loop techno','ambient techno',
      'electro techno','broken techno','minimal dub techno','atmospheric techno','mental techno','driving techno'
    ],
    garage:[
      'uk garage','2-step garage','speed garage','future garage','bassline','4x4 garage','uk funky','grime','breakstep',
      'dark garage','old school garage','garage house uk','organ garage','swing garage','deep garage','minimal garage',
      'future 2-step','bass garage','street garage'
    ],
    dnb:[
      'drum n bass','jungle','liquid drum n bass','atmospheric drum n bass','techstep','neurofunk','jump up','darkstep',
      'drumfunk','ragga jungle','intelligent drum n bass','halftime drum n bass','rollers','old school jungle','dark jungle',
      'ambient jungle','jazzstep','liquid funk','dancefloor drum n bass','minimal drum n bass','deep drum n bass',
      'breakcore lite','autonomic','future jungle','hardstep'
    ],
    breaks:[
      'breakbeat','nu skool breaks','big beat','electro breaks','funky breaks','progressive breaks','breaks','miami bass',
      'freestyle electro','broken beat','footwork','juke','florida breaks','acid breaks','dark breaks','future breaks',
      'hip hop breaks','old school electro','electro bass','breakbeat hardcore','rave breaks','leftfield breaks'
    ],
    bass:[
      'dubstep','deep dubstep','riddim','brostep','uk bass','future bass','bass music','wonky','glitch hop','trap edm',
      'leftfield bass','purple sound','post dubstep','dark dubstep','minimal dubstep','tearout','deathstep','wobble bass',
      'halftime bass','future dub','bass experimental','dubstep garage'
    ],
    trance:[
      'trance','progressive trance','uplifting trance','goa trance','psytrance','tech trance','hard trance','dream trance',
      'acid trance','deep trance','classic trance','90s trance','progressive psytrance','dark psytrance','minimal trance',
      'ambient trance','euphoric trance'
    ],
    afro:[
      'afrobeats','afrobeat','amapiano','gqom','kuduro','afro fusion','highlife','afro swing','afro house groove',
      'afro pop','soukous groove','afro soul','afro rnb','afro trap','afro funk','afro jazz','naija groove','azonto',
      'kwaito','log drum groove','afro percussion'
    ],
    reggae:[
      'reggae','roots reggae','dub','dancehall','lovers rock','rocksteady','digital dancehall','ragga','dub poetry groove',
      'steppers dub','reggae fusion','one drop reggae','rub a dub','digital reggae','roots dub','deep dub','modern dancehall',
      'old school dancehall','dubwise','soundsystem groove','reggae soul'
    ],
    latin:[
      'reggaeton','dembow','latin trap','salsa groove','merengue groove','bachata groove','samba groove','baile funk',
      'cumbia groove','latin funk','soca','zouk','kompa','latin house','latin jazz groove','latin soul','bossa nova groove',
      'afro cuban groove','mambo groove','moombahton','brazilian bass','favela funk'
    ],
    jazz:[
      'jazz','bebop groove','modal jazz','cool jazz','hard bop','fusion','acid jazz','nu jazz','jazz hop','spiritual jazz',
      'jazz ballad','broken jazz','future jazz','electro jazz','jazz funk groove','downtempo jazz','street jazz',
      'late night jazz','soul jazz','free jazz groove','jazz house','jazztronica'
    ],
    ambient:[
      'ambient','dark ambient','ambient dub','downtempo','trip hop','chillout','idm','glitch ambient','drone',
      'cinematic ambient','illbient','leftfield downtempo','ambient techno','ambient house','space ambient',
      'industrial ambient','beatless ambient','dub ambient','lo-fi ambient','organic ambient','minimal ambient',
      'psychedelic downtempo','abstract downtempo','future downtempo'
    ],
    pop:[
      'synthpop','electropop','indie pop','dream pop','dance pop','art pop','alt pop','bedroom pop','city pop groove',
      'hyperpop lite','dark pop','future pop','soul pop','funk pop','electronic pop','retro pop','80s pop groove',
      '90s pop groove','minimal pop','indie electronic'
    ],
    rock:[
      'indie rock','alternative rock','post rock','funk rock','electronic rock','new wave','post punk','krautrock groove',
      'industrial rock','shoegaze groove','dream rock','psychedelic rock groove','garage rock groove','art rock groove',
      'space rock groove','noise rock groove','darkwave','coldwave','dance rock','minimal wave'
    ],
    experimental:[
      'experimental','glitch','wonky experimental','industrial ambient','noise groove','minimal experimental',
      'electroacoustic groove','generative groove','outsider electronic','leftfield electronic','abstract electronic',
      'microsound groove','deconstructed club lite','industrial groove','experimental hip hop','experimental techno',
      'experimental bass','rhythmic noise','algorithmic groove','future experimental'
    ]
  };

  const OVERRIDE = {
    'old school hip hop':{bpm:[84,96],tags:['oldschool','dusty','human']},
    'golden age hip hop':{bpm:[88,98],tags:['oldschool','soulful','human']},
    'east coast hip hop':{bpm:[88,100],tags:['dusty','hard']},
    'west coast hip hop':{bpm:[88,104],tags:['funky','warm']},
    'g-funk':{bpm:[88,102],tags:['funky','warm','melodic']},
    'memphis rap':{bpm:[78,96],tags:['dark','minimal','dusty']},
    'drill':{bpm:[138,150],tags:['dark','hard','minimal']},
    'uk drill':{bpm:[138,146],tags:['dark','hard','syncopated']},
    'rage':{bpm:[142,156],tags:['hard','digital','melodic']},
    'phonk':{bpm:[88,114],tags:['dark','dusty','hard']},
    'neo soul':{bpm:[72,98],tags:['soulful','jazzy','human']},
    'new jack swing':{bpm:[98,116],tags:['funky','machine','bright']},
    'quiet storm':{bpm:[68,88],tags:['soulful','spacious','warm']},
    'p-funk':{bpm:[96,118],tags:['funky','psychedelic','human']},
    'go-go':{bpm:[96,116],tags:['funky','percussive','human']},
    'acid house':{bpm:[120,130],tags:['acid','machine','repetitive']},
    'deep house':{bpm:[118,126],tags:['deep','soulful','spacious']},
    'french house':{bpm:[120,128],tags:['funky','filtered','bright']},
    'lo-fi house':{bpm:[116,124],tags:['dusty','warm','minimal']},
    'dark techno':{bpm:[126,138],tags:['dark','minimal','repetitive']},
    'hypnotic techno':{bpm:[126,136],tags:['minimal','repetitive','spacious']},
    'industrial techno':{bpm:[130,142],tags:['dark','hard','metallic']},
    'dub techno':{bpm:[120,130],tags:['dub','spacious','minimal']},
    'acid techno':{bpm:[128,138],tags:['acid','hard','repetitive']},
    'detroit techno':{bpm:[124,136],tags:['soulful','machine','futuristic']},
    'uk garage':{bpm:[128,136],tags:['syncopated','soulful','human']},
    '2-step garage':{bpm:[130,138],tags:['syncopated','spacious','human']},
    'speed garage':{bpm:[132,140],tags:['hard','syncopated','bass']},
    'jungle':{bpm:[164,174],tags:['breaks','human','hard']},
    'liquid drum n bass':{bpm:[168,176],tags:['soulful','melodic','spacious']},
    'techstep':{bpm:[166,174],tags:['dark','machine','hard']},
    'neurofunk':{bpm:[170,176],tags:['dark','digital','hard']},
    'ragga jungle':{bpm:[164,174],tags:['reggae','breaks','human']},
    'deep dubstep':{bpm:[136,142],tags:['dark','spacious','minimal']},
    'riddim':{bpm:[138,145],tags:['hard','minimal','repetitive']},
    'psytrance':{bpm:[138,148],tags:['psychedelic','machine','repetitive']},
    'amapiano':{bpm:[108,116],tags:['deep','percussive','soulful']},
    'gqom':{bpm:[118,126],tags:['dark','percussive','minimal']},
    'dancehall':{bpm:[88,106],tags:['syncopated','warm','vocal']},
    'dub':{bpm:[70,88],tags:['dub','spacious','minimal']},
    'reggaeton':{bpm:[88,104],tags:['percussive','repetitive','warm']},
    'baile funk':{bpm:[128,150],tags:['hard','percussive','syncopated']},
    'trip hop':{bpm:[72,96],tags:['dark','dusty','spacious']},
    'idm':{bpm:[90,150],tags:['digital','complex','experimental']},
    'dark ambient':{bpm:[58,82],tags:['dark','spacious','minimal']},
    'post rock':{bpm:[72,112],tags:['spacious','melodic','human']},
    'industrial rock':{bpm:[92,132],tags:['hard','metallic','machine']}
  };

  const MODIFIERS = [
    'raw','dusty','warm','dark','bright','deep','minimal','maximal','soulful','jazzy','hypnotic','spacious',
    'late-night','street','underground','futuristic','old-school','hard','soft','melodic','percussive','psychedelic',
    'lo-fi','polished'
  ];
  const ERAS = ['80s','90s','2000s','modern'];
  const META = Object.create(null);
  const CANONICAL = [];

  function effects(tags=[]) {
    const e={machine:0,sync:0,density:0,repeat:0,melody:0,space:0,grit:0,swing:0,chord:0};
    for(const tag of tags){
      if(tag==='dark'){e.grit+=.18;e.space+=.05;e.melody-=.08}
      if(tag==='hard'){e.grit+=.20;e.density+=.10;e.machine+=.07}
      if(tag==='minimal'){e.density-=.18;e.repeat+=.12;e.melody-=.10}
      if(tag==='soulful'){e.melody+=.16;e.machine-=.08;e.space+=.05}
      if(tag==='jazzy'){e.melody+=.18;e.machine-=.10;e.sync+=.08}
      if(tag==='human'){e.machine-=.16;e.swing+=.035}
      if(tag==='machine'){e.machine+=.16;e.swing-=.02}
      if(tag==='syncopated'){e.sync+=.16}
      if(tag==='percussive'){e.sync+=.12;e.density+=.10}
      if(tag==='spacious'||tag==='dub'){e.space+=.20;e.density-=.08;e.chord+=1}
      if(tag==='dusty'||tag==='oldschool'){e.grit+=.09;e.machine-=.08;e.swing+=.02}
      if(tag==='digital'||tag==='futuristic'){e.machine+=.10;e.space+=.06}
      if(tag==='melodic'){e.melody+=.18}
      if(tag==='repetitive'){e.repeat+=.14}
      if(tag==='complex'||tag==='experimental'){e.sync+=.08;e.repeat-=.12;e.density+=.05}
      if(tag==='funky'){e.sync+=.12;e.swing+=.02;e.melody+=.06}
      if(tag==='psychedelic'){e.space+=.12;e.repeat-=.06;e.melody+=.08}
      if(tag==='metallic'){e.grit+=.18;e.machine+=.10}
      if(tag==='warm'){e.machine-=.05;e.grit-=.05}
    }
    return e;
  }

  function register(name,family){
    if(!FAMILY[family] || !GENRES) return;
    const baseKey=BASE[family]||BASE.hiphop;
    const source=GENRES[baseKey]||GENRES['boom bap'];
    if(!source) return;
    const ov=OVERRIDE[name]||{}, fam=FAMILY[family], fx=effects(ov.tags||[]);
    if(!GENRES[name]){
      const g=clone(source);
      g.bpm=(ov.bpm||fam.bpm).slice();
      if(g.swing) g.swing=fam.swing.slice();
      GENRES[name]=g;
    }
    if(typeof SUBSTYLES!=='undefined' && !SUBSTYLES[name] && SUBSTYLES[baseKey]){
      SUBSTYLES[name]=clone(SUBSTYLES[baseKey]);
      if(ov.bpm) for(const sub of Object.values(SUBSTYLES[name])) if(sub?.bpm) sub.bpm=ov.bpm.slice();
    }
    if(typeof SPEAK_GENRE!=='undefined' && !SPEAK_GENRE[name]) SPEAK_GENRE[name]=name;
    META[name]={
      name,family,baseKey,tags:ov.tags||[],weight:fam.weight,bpm:ov.bpm||fam.bpm,
      chordBars:Math.max(1,fam.chordBars+fx.chord),loop:fam.loop,
      machine:clamp(fam.machine+fx.machine),sync:clamp(fam.sync+fx.sync),
      density:clamp(fam.density+fx.density),repeat:clamp(fam.repeat+fx.repeat),
      melody:clamp(fam.melody+fx.melody),space:clamp(fam.space+fx.space),
      grit:clamp(fam.grit+fx.grit),swingBias:fx.swing,patch:fam.patch
    };
    if(!CANONICAL.includes(name)) CANONICAL.push(name);
  }

  for(const [family,names] of Object.entries(STYLE_GROUPS))
    for(const name of names) register(name,family);

  const ORIGINAL={
    'boom bap':'hiphop','trap':'trap','jerk':'hiphop','drum n bass':'dnb','2000s rnb':'rnb',
    'house':'house','UK garage':'garage','uk garage':'garage','lo-fi':'ambient','afrobeats':'afro',
    'dubstep':'bass','downtempo':'ambient'
  };
  for(const [name,family] of Object.entries(ORIGINAL))
    if(GENRES?.[name] && !META[name]) register(name,family);

  const REQUEST_CATALOG=[];
  for(const genre of CANONICAL)
    for(const mod of MODIFIERS.slice(0,8))
      REQUEST_CATALOG.push({label:`${mod} ${genre}`,genre,modifier:mod,family:META[genre]?.family});

  function familyFrom(text){
    const s=String(text||'').toLowerCase();
    const rules=[
      ['dnb',/drum.?n.?bass|dnb|jungle|neuro|techstep|jump.?up|liquid/],
      ['garage',/garage|2.?step|speed garage|bassline|grime|uk funky/],
      ['techno',/techno|industrial|warehouse|hardgroove/],
      ['house',/house|jackin|french touch/],
      ['trap',/trap|drill|rage|plugg|phonk/],
      ['rnb',/\br&?b\b|slow jam|new jack/],
      ['soul',/soul|gospel/],
      ['funk',/funk|boogie|go-go|rare groove/],
      ['bass',/dubstep|riddim|brostep|future bass|glitch hop/],
      ['trance',/trance|psytrance|goa/],
      ['afro',/afro|amapiano|gqom|kuduro|highlife|soukous/],
      ['reggae',/reggae|dancehall|dub|rocksteady|ragga|lovers rock/],
      ['latin',/reggaeton|dembow|salsa|merengue|bachata|cumbia|baile funk|soca|zouk|kompa/],
      ['jazz',/jazz|bebop|hard bop|fusion/],
      ['ambient',/ambient|downtempo|trip hop|idm|drone|chillout/],
      ['rock',/rock|post.?punk|new wave|shoegaze|kraut|darkwave|coldwave/],
      ['pop',/pop/],
      ['breaks',/break|footwork|juke|miami bass/],
      ['hiphop',/hip.?hop|boom bap|rap|g-funk|hyphy|crunk|cloud/]
    ];
    return rules.find(([,rx])=>rx.test(s))?.[0]||'experimental';
  }

  function resolveRequest(text){
    const raw=String(text||'').trim().toLowerCase();
    if(!raw) return {genre:'boom bap',family:'hiphop',modifiers:[]};
    const exact=CANONICAL.find(g=>g.toLowerCase()===raw);
    if(exact) return {genre:exact,family:META[exact]?.family,modifiers:[]};
    let best=null;
    for(const g of CANONICAL)
      if(raw.includes(g.toLowerCase()) && (!best||g.length>best.length)) best=g;
    const family=best?META[best]?.family:familyFrom(raw);
    const genre=best||STYLE_GROUPS[family]?.[0]||'boom bap';
    const modifiers=MODIFIERS.filter(m=>raw.includes(m));
    return {genre,family,modifiers};
  }

  function ensureDNA(t){
    if(!t) return null;
    const meta=META[t.genre]||(()=>{
      const family=familyFrom(t.genre), fam=FAMILY[family]||FAMILY.experimental;
      return {family,loop:fam.loop,machine:fam.machine,sync:fam.sync,density:fam.density,repeat:fam.repeat,
        melody:fam.melody,space:fam.space,grit:fam.grit,patch:fam.patch,chordBars:fam.chordBars};
    })();
    if(t.musicDNA?.engine==='street-improv-v108') return t.musicDNA;
    const eraPool=meta.family==='hiphop'?['90s','90s','2000s','modern']:
      ['techno','house'].includes(meta.family)?['90s','2000s','modern','modern']:ERAS;
    const era=eraPool[Math.floor(unit(t,'era')*eraPool.length)];
    const flavours=['raw','polished','warm','dark','deep','soulful','minimal','street','late-night','futuristic'];
    const flavour=flavours[Math.floor(unit(t,'flavour')*flavours.length)];
    const fx=effects([flavour]);
    const loopChoices=meta.loop||[4,8];
    const loopBars=loopChoices[Math.floor(unit(t,'loop-bars')*loopChoices.length)];
    t.musicDNA={
      engine:'street-improv-v108',family:meta.family,canonical:t.genre,era,flavour,loopBars,build:'layered-live-loop',
      machine:clamp(meta.machine+fx.machine+(unit(t,'machine')-.5)*.12),
      sync:clamp(meta.sync+fx.sync+(unit(t,'sync')-.5)*.12),
      density:clamp(meta.density+fx.density+(unit(t,'density')-.5)*.16),
      repetition:clamp(meta.repeat+fx.repeat+(unit(t,'repeat')-.5)*.10),
      melody:clamp(meta.melody+fx.melody+(unit(t,'melody')-.5)*.14),
      space:clamp(meta.space+fx.space+(unit(t,'space')-.5)*.16),
      grit:clamp(meta.grit+fx.grit+(unit(t,'grit')-.5)*.14),
      overdub:clamp(.22+unit(t,'overdub')*.58),
      human:clamp(1-meta.machine+unit(t,'human')*.16)
    };
    t.generatorVersion=VERSION;
    t.styleIdentity=`${t.genre} · ${era} · ${flavour}`;
    return t.musicDNA;
  }

  // Fast patch-bank switching, using the already safe v107 gear families.
  if(typeof chooseGear==='function' && typeof GEAR_DB!=='undefined'){
    const original=chooseGear;
    chooseGear=function(dna,genre,subStyle){
      const gear=original(dna,genre,subStyle), meta=META[genre];
      if(!meta) return gear;
      const one=(group,key)=>{
        const a=GEAR_DB?.[group]?.[key];
        return a?.length?a[Math.floor(Math.random()*a.length)]:null;
      };
      if(meta.patch==='warm'){
        gear.drumMachine=one('drums','warm')||gear.drumMachine;
        gear.bassSynth=one('bass','warm')||gear.bassSynth;
        gear.padSynth=one('pad','warm')||gear.padSynth;
        gear.leadSynth=one('lead','warm')||gear.leadSynth;
      } else if(meta.patch==='dark'){
        gear.drumMachine=one('drums',Math.random()<.55?'hard':'wild')||gear.drumMachine;
        gear.bassSynth=one('bass','dark')||gear.bassSynth;
        gear.padSynth=one('pad','dark')||gear.padSynth;
        gear.leadSynth=one('lead','dark')||gear.leadSynth;
      } else if(meta.patch==='digital'){
        gear.drumMachine=one('drums','hard')||gear.drumMachine;
        gear.bassSynth=one('bass','clean')||gear.bassSynth;
        gear.padSynth=one('pad','digital')||gear.padSynth;
        gear.leadSynth=one('lead','digital')||gear.leadSynth;
      } else if(meta.patch==='wild'){
        gear.drumMachine=one('drums','wild')||gear.drumMachine;
        gear.bassSynth=one('bass','dark')||gear.bassSynth;
        gear.padSynth=one('pad',Math.random()<.5?'dark':'digital')||gear.padSynth;
        gear.leadSynth=one('lead',Math.random()<.5?'dark':'digital')||gear.leadSynth;
      }
      return gear;
    };
  }

  // Family-specific live-loop form while preserving v107 section names.
  if(typeof buildArrangement==='function'){
    const original=buildArrangement;
    buildArrangement=function(bars,genre,subStyle){
      const meta=META[genre];
      if(!meta) return original(bars,genre,subStyle);
      const family=meta.family, sections=[]; let b=0;
      const add=(name,len)=>{
        len=Math.max(0,Math.min(len,bars-b));
        if(!len)return;
        sections.push({name,start:b,end:b+len,phraseLength:4}); b+=len;
      };
      if(['techno','house','trance','ambient'].includes(family)){
        add('intro',Math.min(8,bars));
        if(bars-b>20)add('main',Math.max(8,Math.floor((bars-b-12)*.52/4)*4));
        if(bars-b>12)add('break',Math.min(8,bars-b-8));
        if(bars-b>8)add('main2',bars-b-8);
        add('outro',bars-b);
      }else if(['hiphop','trap','rnb','soul','funk','jazz'].includes(family)){
        add('intro',Math.min(4,bars));
        if(bars-b>12)add('main',Math.max(8,Math.floor((bars-b-8)*.58/4)*4));
        if(bars-b>8)add('break',4);
        if(bars-b>4)add('main2',bars-b-4);
        add('outro',bars-b);
      }else{
        add('intro',Math.min(4,bars));
        if(bars-b>16)add('main',Math.max(8,Math.floor((bars-b-8)*.55/4)*4));
        if(bars-b>8)add('break',4);
        if(bars-b>4)add('main2',bars-b-4);
        add('outro',bars-b);
      }
      if(sections.length && sections.at(-1).end<bars)sections.at(-1).end=bars;
      return sections.length?sections:original(bars,genre,subStyle);
    };
  }

  if(typeof chordBarsFor==='function'){
    const original=chordBarsFor;
    chordBarsFor=(genre,subStyle)=>META[genre]?.chordBars||original(genre,subStyle);
  }

  // Same performer, radically different pocket.
  if(typeof drumBrainDNA==='function'){
    const original=drumBrainDNA;
    drumBrainDNA=function(t){
      const base=original(t), d=ensureDNA(t);
      if(!d)return base;
      return {...base,
        syncopation:clamp(base.syncopation*.42+d.sync*.58),
        density:clamp(base.density*.48+d.density*.52),
        machine:clamp(base.machine*.38+d.machine*.62),
        strangeness:clamp(base.strangeness*.64+d.grit*.22+(1-d.repetition)*.14),
        memory:clamp(base.memory*.38+d.repetition*.62)
      };
    };
  }

  if(typeof drumPocketMap==='function'){
    const original=drumPocketMap;
    drumPocketMap=function(t,voice,pattern,micro,barNo){
      const out=original(t,voice,pattern,micro,barNo), d=ensureDNA(t);
      if(!d||!Array.isArray(out))return out;
      for(let i=0;i<16;i++){
        if(!pattern?.[i])continue;
        if(['hiphop','rnb','soul','jazz','funk'].includes(d.family)){
          if(voice==='snare')out[i]=Math.max(-.09,Math.min(.11,out[i]+.018+d.human*.045));
          if(voice==='hats'&&i%4===2)out[i]=Math.max(-.09,Math.min(.11,out[i]+.012+d.human*.020));
          if(voice==='kick'&&i!==0)out[i]=Math.max(-.09,Math.min(.11,out[i]-d.human*.010));
        }
        if(['techno','house','trance'].includes(d.family)&&voice==='kick')out[i]*=.14;
        if(['afro','reggae','latin','garage'].includes(d.family)&&voice==='hats')
          out[i]=Math.max(-.09,Math.min(.11,out[i]+(i%4===2?.014:-.004)));
      }
      return out;
    };
  }

  // Loop recall: fewer unrelated ideas, more small transformations of known phrases.
  if(typeof buildMelodyPlan==='function'){
    const original=buildMelodyPlan;
    buildMelodyPlan=function(t,personality){
      const r=original(t,personality), d=ensureDNA(t);
      if(!d||!r?.plan)return r;
      const max=['techno','ambient'].includes(d.family)?2:
        ['hiphop','trap','reggae'].includes(d.family)?3:
        ['jazz','funk','latin'].includes(d.family)?5:4;
      r.dna.density=clamp((r.dna.density||.5)*.45+d.melody*.55);
      r.dna.repetition=clamp((r.dna.repetition||.5)*.35+d.repetition*.65);
      for(let b=0;b<r.plan.length;b++){
        let ev=(r.plan[b]||[]).filter((x,i)=>i===0||unit(t,`mel:${personality}:${b}:${i}`)<.25+d.melody*.72).slice(0,max);
        const dist=d.loopBars>=8?8:4;
        if(b>=dist && unit(t,`recall:${personality}:${b}`)<d.repetition*.72){
          const src=r.plan[b-dist];
          if(src?.length)ev=src.slice(0,max).map((x,i)=>({...x,
            degree:x.degree+((i===src.length-1&&unit(t,`turn:${personality}:${b}`)>.72)?(b%2?1:-1):0),
            role:'loop recall',function:i===src.length-1?'phrase variation':'motif recall'
          }));
        }
        r.plan[b]=ev;
      }
      return r;
    };
  }

  // Quiet one-shot overdubs: detail accumulates around a loop.
  function microHit(t0,t,kind,amount=.03){
    if(typeof ctx==='undefined'||!ctx||typeof master==='undefined'||!master)return;
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(amount,t0+.004);g.gain.exponentialRampToValueAtTime(.0001,t0+.11);
    if(kind==='metal'||kind==='tone'){
      const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),r=unit(t,`micro:${t0.toFixed(2)}`);
      o.type=kind==='metal'?'square':'triangle';o.frequency.value=kind==='metal'?750+r*1800:220+r*540;
      f.type='bandpass';f.frequency.value=o.frequency.value;f.Q.value=kind==='metal'?5:2;
      o.connect(f);f.connect(g);g.connect(master);o.start(t0);o.stop(t0+.12);
    }else{
      const len=Math.max(1,Math.floor(ctx.sampleRate*.12)),b=ctx.createBuffer(1,len,ctx.sampleRate),data=b.getChannelData(0);
      let x=Math.floor(unit(t,`noise:${t0.toFixed(2)}`)*0x7fffffff)||1;
      for(let i=0;i<len;i++){x=(x*1664525+1013904223)|0;data[i]=((x>>>8)/0x7fffff-1)*.7}
      const n=ctx.createBufferSource(),f=ctx.createBiquadFilter();
      n.buffer=b;f.type=kind==='air'?'highpass':'bandpass';f.frequency.value=kind==='air'?2600:1200;f.Q.value=1.2;
      n.connect(f);f.connect(g);g.connect(master);n.start(t0);n.stop(t0+.12);
    }
  }

  if(typeof scheduleStep==='function'){
    const original=scheduleStep;
    scheduleStep=function(sIdx,t0){
      original(sIdx,t0);
      if(typeof track==='undefined'||!track||typeof bar==='undefined')return;
      const d=ensureDNA(track);
      if(!d||![3,6,10,14,15].includes(sIdx))return;
      if(unit(track,`overdub:${bar}:${sIdx}`)>.025+d.overdub*.055)return;
      const kind=['techno','house','trance','bass'].includes(d.family)?'metal':
        ['ambient','rnb','soul'].includes(d.family)?'air':
        ['hiphop','trap','reggae'].includes(d.family)?'dust':'tone';
      microHit(t0,track,kind,.014+d.density*.018);
    };
  }

  function rumble(t0,t,vol=.08){
    if(typeof ctx==='undefined'||!ctx||typeof master==='undefined'||!master)return;
    const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),root=39+((t.root||36)%12)*.55;
    o.type='sine';o.frequency.setValueAtTime(root*1.18,t0);o.frequency.exponentialRampToValueAtTime(root,t0+.08);
    f.type='lowpass';f.frequency.value=150;f.Q.value=.8;
    g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+.025);g.gain.exponentialRampToValueAtTime(.0001,t0+.48);
    o.connect(f);f.connect(g);g.connect(master);o.start(t0);o.stop(t0+.5);
  }

  if(typeof playKick==='function'){
    const original=playKick;
    playKick=function(t0,vol=1){
      original(t0,vol);
      if(typeof track==='undefined'||!track)return;
      const d=ensureDNA(track);
      if(d?.family==='techno'&&d.grit>.42)rumble(t0+.015,track,.045+d.grit*.035);
    };
  }

  // Weighted like a street session, not an encyclopedia shuffle.
  const WEIGHTED=[];
  for(const genre of CANONICAL){
    const n=Math.max(1,Math.round((META[genre]?.weight||1)/2));
    for(let i=0;i<n;i++)WEIGHTED.push(genre);
  }

  if(typeof newTrack==='function'){
    const original=newTrack;
    newTrack=function(forced){
      retireLoopFreakCameo();
      const chosen=forced||(WEIGHTED.length?WEIGHTED[Math.floor(Math.random()*WEIGHTED.length)]:undefined);
      const out=original(chosen);
      if(typeof track!=='undefined'&&track){
        ensureDNA(track);
        queueLoopFreakCameo(track);
      }
      return out;
    };
  }


  // ---------------------------------------------------------------------------
  // Ultra-rare street cameo.
  //
  // A.R.I. occasionally gets joined for one complete track by a wildly
  // performing robot: exposed metal torso, shorts, tall socks, shoes, glasses
  // and shoulder-length hair. It is deliberately an easter egg rather than a
  // normal visitor. The cameo adds a tiny live synth call-and-response layer;
  // there are still no prerecorded samples.
  // ---------------------------------------------------------------------------
  const LOOP_FREAK_CHANCE = 0.0075; // ~1 in 133 tracks
  const LOOP_FREAK_COOLDOWN = 45 * 60 * 1000;

  const loopFreak = {
    queued: 0,
    active: false,
    raf: 0,
    el: null,
    seed: null,
    bpm: 112,
    startedAt: 0,
    exitingAt: 0,
    lastAt: 0,
    forced: false,
    titleTimer: 0,
    glitchTimer: 0
  };

  function midiHz(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function ensureLoopFreakUI() {
    if (loopFreak.el?.isConnected) return loopFreak.el;

    const style = document.createElement('style');
    style.id = 'ariLoopFreakStyle';
    style.textContent = `
      #ariLoopFreak {
        position: fixed;
        inset: 0;
        z-index: 4;
        overflow: hidden;
        pointer-events: none;
        opacity: 0;
        transition: opacity 420ms ease;
      }

      #ariLoopFreak.on {
        opacity: 1;
      }

      #ariLoopFreak svg {
        position: fixed;
        overflow: visible;
        filter:
          drop-shadow(0 0 5px var(--glow1))
          drop-shadow(0 0 18px var(--glow2));
      }

      #ariLoopFreak .lf-main,
      #ariLoopFreak .lf-joint,
      #ariLoopFreak .lf-glasses,
      #ariLoopFreak .lf-sock,
      #ariLoopFreak .lf-shoe,
      #ariLoopFreak .lf-shorts,
      #ariLoopFreak .lf-hair,
      #ariLoopFreak .lf-accent {
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #ariLoopFreak .lf-main {
        fill: none;
        stroke: var(--cyan);
        stroke-width: 2;
      }

      #ariLoopFreak .lf-joint {
        fill: var(--bg);
        stroke: var(--cyan);
        stroke-width: 1.6;
      }

      #ariLoopFreak .lf-hair {
        fill: none;
        stroke: var(--magenta);
        stroke-width: 2.25;
      }

      #ariLoopFreak .lf-glasses {
        fill: rgba(167,139,255,.08);
        stroke: var(--purple);
        stroke-width: 2;
      }

      #ariLoopFreak .lf-shorts {
        fill: rgba(167,139,255,.12);
        stroke: var(--purple);
        stroke-width: 2;
      }

      #ariLoopFreak .lf-sock {
        fill: none;
        stroke: var(--key);
        stroke-width: 3;
      }

      #ariLoopFreak .lf-shoe {
        fill: rgba(62,232,222,.08);
        stroke: var(--cyan);
        stroke-width: 2.4;
      }

      #ariLoopFreak .lf-accent {
        fill: none;
        stroke: var(--key-dim);
        stroke-width: 1.25;
      }

      #ariLoopFreak .lf-shadow {
        fill: rgba(0,0,0,.24);
        stroke: none;
      }

      /* M.A.R.C. character introduction — deliberately loud 80s arcade/VHS. */
      #lfTitleCard {
        --marc-green: #b8ff00;
        --marc-pink: #ff2bd6;
        position: absolute;
        left: 50%;
        top: clamp(68px, 13%, 142px);
        width: min(90vw, 780px);
        transform: translate(-50%, -10px) scale(.98);
        text-align: center;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition:
          opacity 240ms ease,
          transform 340ms cubic-bezier(.16,.82,.22,1),
          visibility 0s linear 360ms;
      }

      #lfTitleCard.show {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0) scale(1);
        transition-delay: 0s;
      }

      #lfTitleCard::before {
        content: "";
        position: absolute;
        inset: -18px -26px;
        background:
          repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0) 0 3px,
            rgba(184,255,0,.045) 3px 4px
          );
        opacity: .7;
        mix-blend-mode: screen;
      }

      #lfTitleCard .lf-title-main {
        position: relative;
        display: inline-block;
        font-family: "Space Grotesk", "IBM Plex Mono", monospace;
        font-size: clamp(27px, 5.8vw, 62px);
        font-weight: 600;
        line-height: 1;
        letter-spacing: .16em;
        text-transform: uppercase;
        color: var(--marc-green);
        text-shadow:
          0 0 2px rgba(184,255,0,1),
          0 0 9px rgba(184,255,0,.9),
          0 0 24px rgba(124,255,0,.62),
          3px 2px 0 rgba(255,43,214,.32);
        -webkit-text-stroke: .35px rgba(30,48,0,.7);
      }

      #lfTitleCard .lf-title-main::before {
        content: "M.A.R.C. APPEARS";
        position: absolute;
        inset: 0;
        color: var(--marc-pink);
        opacity: .22;
        transform: translate(3px, 2px);
        clip-path: inset(48% 0 34% 0);
        text-shadow: 0 0 8px rgba(255,43,214,.8);
      }

      #lfTitleCard .lf-title-main::after {
        content: "";
        position: absolute;
        left: 0;
        right: .16em;
        bottom: -8px;
        height: 2px;
        background: linear-gradient(
          90deg,
          var(--marc-green) 0 46%,
          var(--marc-pink) 54% 100%
        );
        box-shadow:
          0 0 6px rgba(184,255,0,.9),
          0 0 14px rgba(255,43,214,.62);
        opacity: .92;
      }

      #lfTitleCard .lf-title-sub {
        margin-top: 17px;
        font-family: "IBM Plex Mono", monospace;
        font-size: clamp(8px, 1.55vw, 13px);
        font-weight: 500;
        line-height: 1.4;
        letter-spacing: .2em;
        text-transform: uppercase;
        color: var(--marc-pink);
        text-shadow:
          0 0 3px rgba(255,43,214,.95),
          0 0 11px rgba(255,43,214,.7),
          0 0 20px rgba(255,43,214,.4);
      }

      #lfTitleCard.glitch .lf-title-main {
        animation: marcTitleGlitch 170ms steps(2,end) 2;
      }

      @keyframes marcTitleGlitch {
        0%   { transform: translate(0,0); }
        25%  { transform: translate(-2px,1px); }
        50%  { transform: translate(2px,-1px); }
        75%  { transform: translate(-1px,0); }
        100% { transform: translate(0,0); }
      }

      @media (max-width: 640px) {
        #lfTitleCard {
          top: max(56px, env(safe-area-inset-top));
          width: 94vw;
        }

        #lfTitleCard .lf-title-main {
          font-size: clamp(24px, 8.3vw, 40px);
          letter-spacing: .11em;
        }

        #lfTitleCard .lf-title-sub {
          margin-top: 14px;
          font-size: clamp(7px, 2.5vw, 10px);
          letter-spacing: .14em;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #ariLoopFreak {
          transition-duration: 1ms;
        }
      }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'ariLoopFreak';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div id="lfTitleCard" aria-hidden="true">
        <div class="lf-title-main">M.A.R.C. APPEARS</div>
        <div class="lf-title-sub">Musically Autonomous Raving Cyborg</div>
      </div>
      <svg viewBox="0 0 170 270" aria-hidden="true">
        <ellipse class="lf-shadow" cx="84" cy="252" rx="58" ry="9"/>

        <g id="lfRobot">
          <!-- legs -->
          <g id="lfLegL">
            <line class="lf-main" x1="67" y1="157" x2="61" y2="203"/>
            <circle class="lf-joint" cx="61" cy="203" r="4"/>
            <line class="lf-main" x1="61" y1="203" x2="57" y2="230"/>
            <line class="lf-sock" x1="58" y1="213" x2="57" y2="231"/>
            <path class="lf-shoe" d="M54 229 L70 230 Q77 233 73 239 L53 239 Q48 236 54 229Z"/>
          </g>
          <g id="lfLegR">
            <line class="lf-main" x1="98" y1="157" x2="104" y2="203"/>
            <circle class="lf-joint" cx="104" cy="203" r="4"/>
            <line class="lf-main" x1="104" y1="203" x2="108" y2="230"/>
            <line class="lf-sock" x1="106" y1="213" x2="108" y2="231"/>
            <path class="lf-shoe" d="M105 229 L121 230 Q128 233 124 239 L104 239 Q99 236 105 229Z"/>
          </g>

          <!-- shorts -->
          <path class="lf-shorts" d="M57 132 L107 132 L104 163 L86 160 L82 146 L78 160 L59 163Z"/>
          <path class="lf-accent" d="M82 133 L82 148 M65 142 L75 142 M90 142 L100 142"/>

          <!-- gloriously shirtless robot torso -->
          <path class="lf-main" d="M61 72 Q82 62 103 72 L108 128 Q83 138 56 128Z"/>
          <path class="lf-accent" d="M65 89 L78 86 L82 94 L86 86 L99 89 M68 110 L96 110"/>
          <circle class="lf-joint" cx="82" cy="116" r="2.7"/>

          <!-- arms -->
          <g id="lfArmL">
            <circle class="lf-joint" cx="59" cy="82" r="4"/>
            <line class="lf-main" x1="59" y1="82" x2="39" y2="113"/>
            <circle class="lf-joint" cx="39" cy="113" r="3.5"/>
            <line class="lf-main" x1="39" y1="113" x2="28" y2="145"/>
            <path class="lf-main" d="M25 145 q4 7 9 0"/>
          </g>
          <g id="lfArmR">
            <circle class="lf-joint" cx="104" cy="82" r="4"/>
            <line class="lf-main" x1="104" y1="82" x2="125" y2="111"/>
            <circle class="lf-joint" cx="125" cy="111" r="3.5"/>
            <line class="lf-main" x1="125" y1="111" x2="140" y2="139"/>
            <path class="lf-main" d="M137 139 q5 7 10 -1"/>
          </g>

          <!-- neck + head -->
          <line class="lf-main" x1="77" y1="70" x2="77" y2="61"/>
          <line class="lf-main" x1="89" y1="70" x2="89" y2="61"/>
          <g id="lfHead">
            <path class="lf-main" d="M59 26 Q82 10 107 28 L104 61 Q82 72 60 59Z"/>

            <!-- shoulder-length hair -->
            <path class="lf-hair" d="M60 29 Q48 42 53 77"/>
            <path class="lf-hair" d="M66 21 Q52 45 60 84"/>
            <path class="lf-hair" d="M73 17 Q61 46 67 88"/>
            <path class="lf-hair" d="M98 20 Q112 42 106 83"/>
            <path class="lf-hair" d="M105 28 Q119 46 112 78"/>

            <!-- glasses -->
            <rect class="lf-glasses" x="63" y="38" width="17" height="11" rx="4"/>
            <rect class="lf-glasses" x="86" y="38" width="17" height="11" rx="4"/>
            <line class="lf-glasses" x1="80" y1="43.5" x2="86" y2="43.5"/>
            <circle class="lf-accent" cx="70" cy="43" r="1.2"/>
            <circle class="lf-accent" cx="95" cy="43" r="1.2"/>
            <path class="lf-accent" d="M75 56 Q83 60 92 55"/>
          </g>
        </g>
      </svg>
    `;
    document.body.appendChild(wrap);
    loopFreak.el = wrap;
    return wrap;
  }

  function layoutLoopFreak() {
    const wrap = ensureLoopFreakUI();
    const svg = wrap.querySelector('svg');
    const scene = document.getElementById('scene');
    if (!svg || !scene) return;

    const r = scene.getBoundingClientRect();
    const w = Math.max(125, Math.min(245, r.width * 0.30));
    const h = w * (270 / 170);

    // Park him just to A.R.I.'s right, standing on roughly the same street plane.
    svg.style.width = `${w}px`;
    svg.style.height = `${h}px`;
    svg.style.left = `${r.left + r.width * 0.61}px`;
    svg.style.top = `${r.top + r.height * 0.39}px`;
  }

  function queueLoopFreakCameo(t, force = false) {
    clearTimeout(loopFreak.queued);
    loopFreak.queued = 0;

    if (!t) return false;

    const now = Date.now();
    const rareEnough = unit(t, 'special:loop-freak') < LOOP_FREAK_CHANCE;
    if (!force && (!rareEnough || now - loopFreak.lastAt < LOOP_FREAK_COOLDOWN)) return false;

    const bpm = Number(t.bpm) || 112;
    const barMs = (60000 / bpm) * 4;
    const seed = t.seed;
    const delay = force ? 100 : Math.min(15000, Math.max(4500, barMs * 4));

    loopFreak.queued = setTimeout(() => {
      loopFreak.queued = 0;

      // The event belongs to this exact track. If the track changed, forget it.
      if (typeof track === 'undefined' || !track || track.seed !== seed) return;

      // Don't trample an existing visitor conversation or the battery cutscene.
      const busy =
        (typeof cutsceneActive !== 'undefined' && cutsceneActive) ||
        (typeof visitor !== 'undefined' && visitor);

      if (busy && !force) {
        loopFreak.queued = setTimeout(() => {
          loopFreak.queued = 0;
          if (typeof track !== 'undefined' && track && track.seed === seed)
            startLoopFreakCameo(track, false);
        }, Math.max(3000, barMs * 2));
        return;
      }

      startLoopFreakCameo(track, force);
    }, delay);

    return true;
  }

  function startLoopFreakCameo(t, forced = false) {
    if (!t || loopFreak.active) return false;

    const wrap = ensureLoopFreakUI();
    layoutLoopFreak();

    loopFreak.active = true;
    loopFreak.seed = t.seed;
    loopFreak.bpm = Number(t.bpm) || 112;
    loopFreak.startedAt = performance.now();
    loopFreak.exitingAt = 0;
    loopFreak.forced = forced;
    loopFreak.lastAt = Date.now();

    t.specialEvent = 'wild-loop-cameo';
    wrap.classList.add('on');

    const titleCard = wrap.querySelector('#lfTitleCard');
    if (titleCard) {
      titleCard.classList.remove('show', 'glitch');
      void titleCard.offsetWidth;
      titleCard.classList.add('show', 'glitch');

      clearTimeout(loopFreak.titleTimer);
      clearTimeout(loopFreak.glitchTimer);

      loopFreak.glitchTimer = setTimeout(() => {
        titleCard.classList.remove('glitch');
      }, 520);

      loopFreak.titleTimer = setTimeout(() => {
        titleCard.classList.remove('show');
      }, 4200);
    }

    cancelAnimationFrame(loopFreak.raf);
    loopFreak.raf = requestAnimationFrame(animateLoopFreak);
    return true;
  }

  function retireLoopFreakCameo(immediate = false) {
    clearTimeout(loopFreak.queued);
    loopFreak.queued = 0;

    if (!loopFreak.active) return;

    if (immediate) {
      finishLoopFreakCameo();
      return;
    }

    if (!loopFreak.exitingAt) loopFreak.exitingAt = performance.now();
  }

  function finishLoopFreakCameo() {
    loopFreak.active = false;
    loopFreak.seed = null;
    loopFreak.exitingAt = 0;
    cancelAnimationFrame(loopFreak.raf);
    loopFreak.raf = 0;

    clearTimeout(loopFreak.titleTimer);
    clearTimeout(loopFreak.glitchTimer);
    loopFreak.titleTimer = 0;
    loopFreak.glitchTimer = 0;

    if (loopFreak.el) {
      loopFreak.el.classList.remove('on');
      const titleCard = loopFreak.el.querySelector('#lfTitleCard');
      if (titleCard) titleCard.classList.remove('show', 'glitch');
      const robot = loopFreak.el.querySelector('#lfRobot');
      if (robot) robot.removeAttribute('transform');
    }
  }

  function animateLoopFreak(now) {
    if (!loopFreak.active || !loopFreak.el) return;

    const robot = loopFreak.el.querySelector('#lfRobot');
    const head = loopFreak.el.querySelector('#lfHead');
    const armL = loopFreak.el.querySelector('#lfArmL');
    const armR = loopFreak.el.querySelector('#lfArmR');
    const legL = loopFreak.el.querySelector('#lfLegL');
    const legR = loopFreak.el.querySelector('#lfLegR');
    if (!robot || !head || !armL || !armR || !legL || !legR) {
      finishLoopFreakCameo();
      return;
    }

    layoutLoopFreak();

    const elapsed = now - loopFreak.startedAt;
    const beat = elapsed / (60000 / loopFreak.bpm);
    const phase = beat * Math.PI * 2;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let entryX = 0;
    const entry = Math.min(1, elapsed / 1800);
    entryX = (1 - (1 - Math.pow(1 - entry, 3))) * 185;

    let exitX = 0;
    if (loopFreak.exitingAt) {
      const exit = Math.min(1, (now - loopFreak.exitingAt) / 1100);
      exitX = exit * exit * 220;
      if (exit >= 1) {
        finishLoopFreakCameo();
        return;
      }
    }

    if (reduced) {
      robot.setAttribute('transform', `translate(${entryX + exitX} 0)`);
    } else {
      const bounce = -Math.abs(Math.sin(phase)) * 10 - Math.abs(Math.sin(phase * .5)) * 4;
      const sway = Math.sin(phase * .5) * 9 + Math.sin(phase * 1.5) * 4;
      const side = Math.sin(phase * .25) * 8;
      robot.setAttribute(
        'transform',
        `translate(${(entryX + exitX + side).toFixed(2)} ${bounce.toFixed(2)}) rotate(${sway.toFixed(2)} 82 150)`
      );

      // Intentionally ridiculous, beat-driven limbs.
      armL.setAttribute('transform', `rotate(${(-58 + Math.sin(phase) * 75).toFixed(1)} 59 82)`);
      armR.setAttribute('transform', `rotate(${(48 - Math.cos(phase * 1.05) * 82).toFixed(1)} 104 82)`);
      legL.setAttribute('transform', `rotate(${(Math.sin(phase) * 16).toFixed(1)} 67 157)`);
      legR.setAttribute('transform', `rotate(${(-Math.sin(phase) * 16).toFixed(1)} 98 157)`);
      head.setAttribute('transform', `rotate(${(Math.sin(phase * .75) * 11).toFixed(1)} 82 54) translate(0 ${(Math.sin(phase * 2) * 1.8).toFixed(1)})`);
    }

    loopFreak.raf = requestAnimationFrame(animateLoopFreak);
  }

  function loopFreakStab(t0, t, sIdx) {
    if (!loopFreak.active || loopFreak.seed !== t.seed) return;
    if (typeof ctx === 'undefined' || !ctx || typeof master === 'undefined' || !master) return;
    if (typeof bar === 'undefined') return;

    // A loose two-bar call/response, deliberately sparse enough to sit on top
    // of any family grammar without taking over the track.
    const patterns = [
      [2, 7, 11, 14],
      [1, 6, 10, 15],
      [3, 8, 12],
      [0, 7, 10, 14]
    ];
    const pat = patterns[Math.abs(bar) % patterns.length];
    if (!pat.includes(sIdx)) return;

    const scale = Array.isArray(t.scale) && t.scale.length ? t.scale : [0, 2, 3, 5, 7, 10];
    const degree = (Math.abs(bar) * 3 + sIdx) % Math.min(scale.length, 6);
    const root = Number(t.root) || 36;
    const note = root + 12 + Number(scale[degree] || 0);
    const f0 = midiHz(note);

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    o1.type = 'square';
    o2.type = 'triangle';
    o1.frequency.setValueAtTime(f0, t0);
    o2.frequency.setValueAtTime(f0 * 2, t0);
    o2.detune.setValueAtTime(7, t0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1700, t0);
    filter.frequency.exponentialRampToValueAtTime(720, t0 + .18);
    filter.Q.value = 2.8;

    const level = .018 + (Number(t.energy) || .55) * .012;
    gain.gain.setValueAtTime(.0001, t0);
    gain.gain.linearRampToValueAtTime(level, t0 + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t0 + .20);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + .22);
    o2.stop(t0 + .22);
  }

  // Add the cameo's live-played synth voice to the normal step scheduler.
  if (typeof scheduleStep === 'function') {
    const beforeCameo = scheduleStep;
    scheduleStep = function(sIdx, t0) {
      beforeCameo(sIdx, t0);
      if (typeof track !== 'undefined' && track)
        loopFreakStab(t0, track, sIdx);
    };
  }

  addEventListener('resize', () => {
    if (loopFreak.active) layoutLoopFreak();
  });


  // ---------------------------------------------------------------------------
  // Track details drawer — deliberately invisible until requested.
  //
  // Open:
  //   tap/click the track name once.
  //
  // Close:
  //   existing close button, swipe/drag right across the drawer, or Escape.
  //
  // This replaces the old hidden long-press interaction.
  // ---------------------------------------------------------------------------
  const title = document.getElementById('trackname');
  const drawerPanel = document.getElementById('devPanel');

  if (drawerPanel && typeof window.toggleDevPanel === 'function') {
    const style = document.createElement('style');
    style.id = 'ariDrawerStyle';
    style.textContent = `
      :root {
        --ari-drawer-width: min(420px, 92vw);
      }

      #devPanel.devpanel {
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: var(--ari-drawer-width) !important;
        max-width: none !important;
        height: 100vh !important;
        height: 100svh !important;
        max-height: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
        border-top: 0 !important;
        border-right: 0 !important;
        border-bottom: 0 !important;
        padding-top: max(14px, env(safe-area-inset-top)) !important;
        padding-bottom: max(14px, env(safe-area-inset-bottom)) !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: translate3d(102%, 0, 0) !important;
        transition:
          transform 280ms cubic-bezier(.22,.75,.18,1),
          box-shadow 280ms ease !important;
        pointer-events: none !important;
        overscroll-behavior: contain;
        touch-action: pan-y;
        box-shadow: none !important;
      }

      #devPanel.devpanel.show {
        transform: translate3d(0, 0, 0) !important;
        pointer-events: auto !important;
        box-shadow: -18px 0 44px rgba(0, 0, 0, .28) !important;
      }

      #trackname {
        cursor: pointer;
      }

      @media (max-width: 640px) {
        :root {
          --ari-drawer-width: 100vw;
        }

        #devPanel.devpanel,
        #devPanel.devpanel.show {
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          height: 100svh !important;
          max-height: 100svh !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #devPanel.devpanel {
          transition-duration: 1ms !important;
        }
      }

      /* Weather is informational only. Keep its animated/status-colored
         underline, but do not make the text interactive. */
      #wxWeather .wxCond {
        cursor: default;
        pointer-events: none !important;
        color: inherit;
        text-decoration: none !important;
      }
    `;
    document.head.appendChild(style);

    const isOpen = () => drawerPanel.classList.contains('show');
    const openDrawer = () => {
      if (!isOpen()) window.toggleDevPanel();
    };
    const closeDrawer = () => {
      if (isOpen()) window.toggleDevPanel();
    };

    if (title) {
      // Capture phase prevents the legacy pointerdown long-press timer in
      // index.html from starting. A normal click/tap now opens the drawer.
      title.addEventListener('pointerdown', e => {
        e.stopImmediatePropagation();
      }, true);

      title.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openDrawer();
      }, true);

      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-controls', 'devPanel');
      title.setAttribute('aria-label', 'Open track details');

      title.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer();
        }
      });
    }

    // No swipe/drag gestures: the panel is deliberately explicit.
    // Close it with its existing close button, or Escape on desktop.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) closeDrawer();
    });
  }

  window.ARI108=Object.freeze({
    version:VERSION,
    canonicalGenres:[...new Set(CANONICAL)],
    requestCatalog:REQUEST_CATALOG,
    styleMeta:META,
    resolveRequest,
    specialEvents:Object.freeze({
      loopFreakChance:LOOP_FREAK_CHANCE,
      forceLoopFreak(){
        if(typeof track==='undefined'||!track)return false;
        retireLoopFreakCameo(true);
        return queueLoopFreakCameo(track,true);
      }
    }),
    resolveAndPlay(text){
      const r=resolveRequest(text);
      if(typeof newTrack==='function')newTrack(r.genre);
      return r;
    }
  });

  const tribute=document.querySelector('header .tribute');
  if(tribute)tribute.textContent='inspired by ARIatHOME · version 108';

  console.info(`[A.R.I.] Street Improv Engine v108 loaded · ${new Set(CANONICAL).size} canonical styles · ${REQUEST_CATALOG.length}+ request identities`);
})();
