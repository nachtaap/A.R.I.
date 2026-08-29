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

  // First-paint/runtime affordance preflight.
  // The service worker also injects the cursor rule into navigation HTML so
  // returning visits get the correct cursor before the page has painted.
  (() => {
    const stage = document.getElementById('stage');
    if (stage) stage.style.setProperty('cursor', 'default', 'important');

    // Freeze the legacy inspector before its old CSS can animate into the new
    // drawer position. The drawer code releases these inline guards only after
    // its final CSS is installed.
    const bootPanel = document.getElementById('devPanel');
    if (bootPanel) {
      bootPanel.style.setProperty('transition', 'none', 'important');
      bootPanel.style.setProperty('visibility', 'hidden', 'important');
      bootPanel.style.setProperty('opacity', '0', 'important');
      bootPanel.style.setProperty('transform', 'translate3d(102%,0,0)', 'important');
    }

    const style = document.createElement('style');
    style.id = 'ariPointerAffordance';
    style.textContent = `
      #stage {
        cursor: default !important;
      }

      #gAri,
      #trackname,
      header h1 a[href*="github.com"] {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
  })();

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
  const MARC_FEVER_DURATION = 34 * 1000;
  const MARC_LOCATION = 'ADULTS ONLY BOATRIDE';
  const MARC_LOCATION_PRELUDE_MS = 6200;
  const MARC_LOCATION_RESTORE_MS = 5200;

  // Hand-authored slow choreography. Values are degrees / SVG units.
  // The apparition moves through recognizable poses instead of having each
  // limb driven independently by fast sine waves.
  const MARC_POSES = Object.freeze([
    { t:0.00, x:-5, y:18, body:-3, scale:.965, head: 2, hx:0, hy:1,
      armL:  2, elbowL:  5, armR: -2, elbowR: -4,
      legL:  1, kneeL: -2, legR: -1, kneeR:  2, opacity:.04 },

    { t:0.10, x:-2, y: 7, body:-2, scale:.985, head: 5, hx:1, hy:0,
      armL: -7, elbowL: 12, armR:  5, elbowR:-10,
      legL:  2, kneeL: -4, legR: -2, kneeR:  3, opacity:.56 },

    { t:0.22, x: 4, y: 1, body: 2, scale:1.000, head:-4, hx:-1, hy:-1,
      armL:-16, elbowL: 20, armR: -7, elbowR: 12,
      legL: -3, kneeL:  5, legR:  3, kneeR: -4, opacity:.40 },

    // loose two-step: shoulders move, elbows lag behind
    { t:0.36, x:-4, y:-3, body:-3, scale:1.012, head: 6, hx:1, hy:0,
      armL:-27, elbowL: 31, armR: 10, elbowR:-20,
      legL:  4, kneeL: -7, legR: -4, kneeR:  6, opacity:.63 },

    // one slow arm lift — the biggest gesture in the whole event
    { t:0.50, x: 2, y: 0, body: 2, scale:1.018, head:-7, hx:-1, hy:1,
      armL:-49, elbowL: 42, armR: -5, elbowR: 16,
      legL: -2, kneeL:  5, legR:  2, kneeR: -4, opacity:.49 },

    { t:0.62, x: 6, y:-4, body: 4, scale:1.010, head: 4, hx:1, hy:-1,
      armL:-31, elbowL: 22, armR:-34, elbowR: 28,
      legL:  3, kneeL: -5, legR: -3, kneeR:  5, opacity:.61 },

    // almost disappears while returning to a neutral loose stance
    { t:0.74, x:-1, y: 2, body:-1, scale:.998, head:-3, hx:0, hy:1,
      armL:-12, elbowL: 13, armR:-16, elbowR: 17,
      legL: -1, kneeL:  3, legR:  1, kneeR: -3, opacity:.27 },

    // one final relaxed sway before dissolving
    { t:0.87, x:-5, y:-1, body:-4, scale:.990, head: 5, hx:1, hy:0,
      armL: -5, elbowL:  8, armR:  8, elbowR:-10,
      legL:  2, kneeL: -3, legR: -2, kneeR:  3, opacity:.46 },

    { t:1.00, x: 2, y: 8, body: 1, scale:.975, head: 0, hx:0, hy:1,
      armL:  0, elbowL:  0, armR:  0, elbowR:  0,
      legL:  0, kneeL:  0, legR:  0, kneeR:  0, opacity:.12 }
  ]);

  function marcEase(u) {
    u = Math.max(0, Math.min(1, u));
    // smootherstep: zero velocity and zero acceleration at both ends
    return u * u * u * (u * (u * 6 - 15) + 10);
  }

  function marcPoseAt(t) {
    t = Math.max(0, Math.min(1, t));
    let a = MARC_POSES[0], b = MARC_POSES[MARC_POSES.length - 1];

    for (let i = 0; i < MARC_POSES.length - 1; i++) {
      if (t >= MARC_POSES[i].t && t <= MARC_POSES[i + 1].t) {
        a = MARC_POSES[i];
        b = MARC_POSES[i + 1];
        break;
      }
    }

    const span = Math.max(.0001, b.t - a.t);
    const u = marcEase((t - a.t) / span);
    const out = {};

    for (const key of Object.keys(a)) {
      if (key === 't') continue;
      out[key] = a[key] + (b[key] - a[key]) * u;
    }
    return out;
  }

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
    glitchTimer: 0,
    retireTimer: 0,
    suppressReaction: false,
    locationTimer: 0,
    locationRestoreTimer: 0,
    previousLocation: '',
    signWasHere: false
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
        transition: opacity 900ms ease;
        mix-blend-mode: screen;
      }

      #ariLoopFreak.on {
        opacity: 1;
      }

      /* The apparition has no ground plane. It is a hallucination, not a visitor. */
      #ariLoopFreak::before {
        content: "";
        position: absolute;
        inset: -18%;
        opacity: 0;
        background:
          radial-gradient(circle at 39% 48%, rgba(184,255,0,.10), transparent 22%),
          radial-gradient(circle at 64% 42%, rgba(255,43,214,.13), transparent 25%),
          radial-gradient(circle at 52% 67%, rgba(62,232,222,.08), transparent 30%);
        filter: blur(26px) saturate(1.45);
        mix-blend-mode: screen;
        transform: scale(.94) rotate(0deg);
      }

      #ariLoopFreak.on::before {
        opacity: 1;
        animation: marcAuraDrift 19s ease-in-out infinite alternate;
      }

      #ariLoopFreak::after {
        content: "";
        position: absolute;
        inset: 0;
        opacity: 0;
        background:
          repeating-linear-gradient(
            to bottom,
            transparent 0 7px,
            rgba(255,43,214,.018) 7px 8px,
            transparent 8px 15px,
            rgba(184,255,0,.014) 15px 16px
          );
        mix-blend-mode: screen;
      }

      #ariLoopFreak.on::after {
        opacity: .75;
        animation: marcScanDrift 16s linear infinite;
      }

      #ariLoopFreak svg {
        position: fixed;
        overflow: visible;
        opacity: .58;
        mix-blend-mode: screen;
        transform-origin: 50% 50%;
        filter:
          drop-shadow(-8px 1px 1px rgba(255,43,214,.34))
          drop-shadow(8px -1px 1px rgba(184,255,0,.28))
          drop-shadow(0 0 8px rgba(62,232,222,.55))
          drop-shadow(0 0 28px rgba(167,139,255,.22));
        animation: marcSpectralShift 12s ease-in-out infinite alternate;
      }

      #ariLoopFreak .lf-shadow {
        display: none;
      }

      #lfGhostA,
      #lfGhostB {
        opacity: .14;
        mix-blend-mode: screen;
      }

      #lfGhostA {
        filter:
          hue-rotate(82deg)
          saturate(1.7)
          drop-shadow(0 0 6px rgba(184,255,0,.75));
      }

      #lfGhostB {
        filter:
          hue-rotate(-52deg)
          saturate(1.85)
          drop-shadow(0 0 7px rgba(255,43,214,.78));
      }

      body.marc-fever #scene {
        animation: marcSceneFever 20s ease-in-out infinite alternate;
      }

      @keyframes marcAuraDrift {
        0% {
          transform: scale(.93) rotate(-2deg) translate(-2%, 1%);
          filter: blur(30px) hue-rotate(-8deg) saturate(1.35);
        }
        38% {
          transform: scale(1.04) rotate(2deg) translate(2%, -1%);
          filter: blur(22px) hue-rotate(16deg) saturate(1.7);
        }
        72% {
          transform: scale(.98) rotate(-1deg) translate(0, 2%);
          filter: blur(35px) hue-rotate(-18deg) saturate(1.5);
        }
        100% {
          transform: scale(1.08) rotate(1.5deg) translate(-1%, -2%);
          filter: blur(24px) hue-rotate(12deg) saturate(1.8);
        }
      }

      @keyframes marcScanDrift {
        from { transform: translateY(-18px); }
        to   { transform: translateY(18px); }
      }

      @keyframes marcSpectralShift {
        0% {
          opacity: .46;
          filter:
            drop-shadow(-10px 0 1px rgba(255,43,214,.42))
            drop-shadow(7px 1px 1px rgba(184,255,0,.28))
            drop-shadow(0 0 8px rgba(62,232,222,.48))
            drop-shadow(0 0 25px rgba(167,139,255,.18));
        }
        48% {
          opacity: .68;
          filter:
            drop-shadow(6px 2px 1px rgba(255,43,214,.40))
            drop-shadow(-9px -2px 1px rgba(184,255,0,.34))
            drop-shadow(0 0 13px rgba(62,232,222,.58))
            drop-shadow(0 0 34px rgba(167,139,255,.24));
        }
        100% {
          opacity: .52;
          filter:
            drop-shadow(-5px -2px 1px rgba(255,43,214,.38))
            drop-shadow(11px 2px 1px rgba(184,255,0,.30))
            drop-shadow(0 0 9px rgba(62,232,222,.54))
            drop-shadow(0 0 29px rgba(167,139,255,.22));
        }
      }

      @keyframes marcSceneFever {
        0% {
          filter:
            hue-rotate(-5deg)
            saturate(1.05)
            drop-shadow(0 0 6px var(--glow1))
            drop-shadow(0 0 26px var(--glow2));
        }
        42% {
          filter:
            hue-rotate(11deg)
            saturate(1.28)
            drop-shadow(-2px 0 7px rgba(255,43,214,.28))
            drop-shadow(2px 0 7px rgba(184,255,0,.20))
            drop-shadow(0 0 26px var(--glow2));
        }
        100% {
          filter:
            hue-rotate(-13deg)
            saturate(1.18)
            drop-shadow(2px 1px 7px rgba(255,43,214,.22))
            drop-shadow(-2px -1px 7px rgba(184,255,0,.22))
            drop-shadow(0 0 30px var(--glow2));
        }
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
        stroke: #9a673f;
        stroke-width: 2.1;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 2px rgba(154,103,63,.34));
      }

      #ariLoopFreak .lf-hair-back {
        fill: none;
        stroke: #765036;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: .78;
      }

      #ariLoopFreak .lf-hair-front {
        fill: none;
        stroke: #b47a49;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: .95;
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
        fill: rgba(238,246,246,.035);
        stroke: var(--key-dim);
        stroke-width: 1.05;
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

      #ariLoopFreak .lf-body-detail {
        fill: none;
        stroke: var(--cyan);
        stroke-width: .9;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: .66;
      }

      #ariLoopFreak .lf-chest-mark {
        fill: var(--magenta);
        stroke: none;
        opacity: .72;
      }

      #ariLoopFreak .lf-moustache {
        fill: none;
        stroke: #a86f43;
        stroke-width: 1.35;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: .92;
        filter: drop-shadow(0 0 1.5px rgba(168,111,67,.34));
      }

      #ariLoopFreak .lf-shadow {
        display: none;
      }

      /* The block collectively loses its mind after M.A.R.C. dissolves. */
      #marcFanChat {
        position: fixed;
        right: max(18px, env(safe-area-inset-right));
        bottom: max(58px, calc(env(safe-area-inset-bottom) + 18px));
        z-index: 45;
        width: min(350px, calc(100vw - 36px));
        padding: 12px 13px 10px;
        border: 1px solid rgba(62,232,222,.30);
        background: rgba(3,4,9,.88);
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
        box-shadow:
          0 0 0 1px rgba(255,43,214,.07),
          0 10px 32px rgba(0,0,0,.32),
          0 0 22px rgba(62,232,222,.08);
        font-family: "IBM Plex Mono", monospace;
        pointer-events: none;
        opacity: 0;
        transform: translateY(14px);
        transition:
          opacity 420ms ease,
          transform 520ms cubic-bezier(.16,.8,.25,1);
      }

      #marcFanChat.on {
        opacity: 1;
        transform: translateY(0);
      }

      .marc-chat-head {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 8px;
        color: var(--key-dim);
        font-size: 8px;
        letter-spacing: .15em;
        text-transform: uppercase;
      }

      .marc-chat-head::before {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #ff2bd6;
        box-shadow: 0 0 8px rgba(255,43,214,.85);
      }

      .marc-chat-line {
        min-height: 18px;
        margin-top: 3px;
        font-size: 10px;
        line-height: 1.45;
        color: var(--text);
        opacity: 0;
        transform: translateX(6px);
        transition: opacity 240ms ease, transform 300ms ease;
      }

      .marc-chat-line.on {
        opacity: 1;
        transform: none;
      }

      .marc-chat-user {
        color: var(--cyan);
        margin-right: 5px;
      }

      .marc-chat-line:nth-child(3n) .marc-chat-user {
        color: #ff2bd6;
      }

      .marc-chat-line:nth-child(4n) .marc-chat-user {
        color: #b8ff00;
      }

      @media (max-width: 640px) {
        #marcFanChat {
          right: 12px;
          bottom: max(48px, calc(env(safe-area-inset-bottom) + 12px));
          width: min(330px, calc(100vw - 24px));
        }
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

        #ariLoopFreak::before,
        #ariLoopFreak::after,
        #ariLoopFreak svg,
        body.marc-fever #scene {
          animation: none !important;
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
            <g id="lfShinL">
              <circle class="lf-joint" cx="61" cy="203" r="4"/>
              <line class="lf-main" x1="61" y1="203" x2="57" y2="230"/>
              <path class="lf-sock" d="M57.5 211 Q61 210 64 212 L61 230 L53.5 230 Z"/>
              <path class="lf-shoe" d="M54 229 L70 230 Q77 233 73 239 L53 239 Q48 236 54 229Z"/>
            </g>
          </g>
          <g id="lfLegR">
            <line class="lf-main" x1="98" y1="157" x2="104" y2="203"/>
            <g id="lfShinR">
              <circle class="lf-joint" cx="104" cy="203" r="4"/>
              <line class="lf-main" x1="104" y1="203" x2="108" y2="230"/>
              <path class="lf-sock" d="M101 212 Q104 210 108 211 L112 230 L104 230 Z"/>
              <path class="lf-shoe" d="M105 229 L121 230 Q128 233 124 239 L104 239 Q99 236 105 229Z"/>
            </g>
          </g>

          <!-- shorts -->
          <path class="lf-shorts" d="M57 132 L107 132 L104 163 L86 160 L82 146 L78 160 L59 163Z"/>
          <path class="lf-accent" d="M82 133 L82 148 M65 142 L75 142 M90 142 L100 142"/>

          <!-- unmistakably shirtless robot torso -->
          <path class="lf-main" d="M61 72 Q82 62 103 72 L108 128 Q83 138 56 128Z"/>

          <!-- stylised chest / six-pack line art -->
          <path class="lf-body-detail"
                d="M65 85 Q72 80 79 85
                   M86 85 Q94 80 101 85
                   M82 91 L82 119
                   M70 97 Q75 94 79 97
                   M85 97 Q90 94 96 97
                   M70 106 Q75 103 79 106
                   M85 106 Q90 103 96 106
                   M71 115 Q76 112 79 115
                   M85 115 Q89 112 95 115"/>
          <circle class="lf-chest-mark" cx="72.5" cy="88.2" r="1.25"/>
          <circle class="lf-chest-mark" cx="93.5" cy="88.2" r="1.25"/>
          <circle class="lf-joint" cx="82" cy="121" r="2.15"/>

          <!-- arms -->
          <g id="lfArmL">
            <circle class="lf-joint" cx="59" cy="82" r="4"/>
            <line class="lf-main" x1="59" y1="82" x2="39" y2="113"/>
            <g id="lfForearmL">
              <circle class="lf-joint" cx="39" cy="113" r="3.5"/>
              <line class="lf-main" x1="39" y1="113" x2="28" y2="145"/>
              <path class="lf-main" d="M25 145 q4 7 9 0"/>
            </g>
          </g>
          <g id="lfArmR">
            <circle class="lf-joint" cx="104" cy="82" r="4"/>
            <line class="lf-main" x1="104" y1="82" x2="125" y2="111"/>
            <g id="lfForearmR">
              <circle class="lf-joint" cx="125" cy="111" r="3.5"/>
              <line class="lf-main" x1="125" y1="111" x2="140" y2="139"/>
              <path class="lf-main" d="M137 139 q5 7 10 -1"/>
            </g>
          </g>

          <!-- neck + head -->
          <line class="lf-main" x1="77" y1="70" x2="77" y2="61"/>
          <line class="lf-main" x1="89" y1="70" x2="89" y2="61"/>
          <g id="lfHead">
            <path class="lf-main" d="M59 26 Q82 10 107 28 L104 61 Q82 72 60 59Z"/>

            <!-- shoulder-length hair -->
            <!-- fuller messy shoulder-length hair -->
            <g class="lf-hair-back">
              <path d="M64 25 Q49 34 47 52 Q45 72 51 96"/>
              <path d="M69 20 Q53 34 53 57 Q52 78 57 101"/>
              <path d="M74 17 Q60 35 59 61 Q59 84 63 104"/>
              <path d="M99 18 Q111 33 113 57 Q115 81 109 103"/>
              <path d="M104 22 Q119 36 120 58 Q121 78 114 98"/>
              <path d="M108 29 Q124 42 125 61 Q126 79 119 92"/>
            </g>

            <g class="lf-hair">
              <!-- messy crown -->
              <path d="M58 28 Q63 17 72 16"/>
              <path d="M67 20 Q74 10 82 15"/>
              <path d="M76 17 Q82 8 89 16"/>
              <path d="M86 16 Q93 9 99 19"/>
              <path d="M96 20 Q104 13 109 27"/>

              <!-- left curtain -->
              <path d="M60 27 Q48 41 49 61 Q49 80 54 93"/>
              <path d="M65 24 Q55 42 56 65 Q56 85 60 99"/>
              <path d="M70 23 Q62 44 63 66 Q63 86 66 101"/>

              <!-- right curtain -->
              <path d="M99 23 Q108 41 109 64 Q110 84 106 101"/>
              <path d="M104 26 Q115 43 116 64 Q117 83 112 97"/>
              <path d="M108 30 Q121 46 121 65 Q121 81 116 92"/>
            </g>

            <g class="lf-hair-front">
              <!-- loose front wisps around the glasses / face -->
              <path d="M68 22 Q64 34 66 49"/>
              <path d="M73 19 Q70 30 72 45"/>
              <path d="M97 20 Q101 31 99 47"/>
              <path d="M103 24 Q108 35 105 51"/>

              <!-- stray flyaways -->
              <path d="M63 18 Q55 12 49 17"/>
              <path d="M72 14 Q66 7 61 11"/>
              <path d="M90 14 Q95 7 101 12"/>
              <path d="M101 18 Q110 12 116 18"/>
            </g>

            <!-- glasses -->
            <rect class="lf-glasses" x="63" y="38" width="17" height="11" rx="4"/>
            <rect class="lf-glasses" x="86" y="38" width="17" height="11" rx="4"/>
            <line class="lf-glasses" x1="80" y1="43.5" x2="86" y2="43.5"/>
            <circle class="lf-accent" cx="70" cy="43" r="1.2"/>
            <circle class="lf-accent" cx="95" cy="43" r="1.2"/>

            <!-- M.A.R.C.'s glorious moustache -->
            <path class="lf-moustache"
                  d="M80.7 51.2 L76.2 47.9
                     M80.6 52.0 L75.2 49.9
                     M80.6 52.8 L74.8 52.2
                     M80.8 53.5 L75.5 54.9

                     M83.3 51.2 L87.8 47.9
                     M83.4 52.0 L88.8 49.9
                     M83.4 52.8 L89.2 52.2
                     M83.2 53.5 L88.5 54.9"/>
            <path class="lf-accent" d="M76 58 Q83 61 91 57"/>
          </g>
        </g>

        <!-- chromatic afterimages; they reference the live animated robot -->
        <use id="lfGhostA" href="#lfRobot" x="-7" y="3"/>
        <use id="lfGhostB" href="#lfRobot" x="8" y="-2"/>
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

    // M.A.R.C. no longer occupies the street plane. He materialises as a large
    // translucent apparition across the upper/central scene.
    const maxW = innerWidth < 700 ? 330 : 520;
    const minW = innerWidth < 700 ? 220 : 310;
    const w = Math.max(minW, Math.min(maxW, r.width * .58));
    const h = w * (270 / 170);

    svg.style.width = `${w}px`;
    svg.style.height = `${h}px`;
    svg.style.left = `${r.left + r.width * .50 - w * .50}px`;
    svg.style.top = `${r.top + r.height * .12}px`;
  }

  function restoreMARCLocationSign() {
    clearTimeout(loopFreak.locationRestoreTimer);
    loopFreak.locationRestoreTimer = 0;

    const sign = document.getElementById('gSign');

    try {
      const fallback =
        loopFreak.previousLocation ||
        (typeof curLoc !== 'undefined' ? curLoc : '');

      if (fallback && typeof buildSignBlades === 'function') {
        buildSignBlades(fallback);
      }
    } catch (_) {}

    if (sign) {
      if (loopFreak.signWasHere) {
        sign.classList.add('here');
      } else {
        sign.classList.remove('here');
      }
    }

    loopFreak.previousLocation = '';
    loopFreak.signWasHere = false;
  }

  function showMARCLocationPrelude(t, force, onReady) {
    clearTimeout(loopFreak.locationTimer);
    clearTimeout(loopFreak.locationRestoreTimer);
    loopFreak.locationTimer = 0;
    loopFreak.locationRestoreTimer = 0;

    const sign = document.getElementById('gSign');
    loopFreak.signWasHere = !!sign?.classList.contains('here');

    try {
      loopFreak.previousLocation =
        typeof curLoc !== 'undefined' && curLoc ? String(curLoc) : '';
    } catch (_) {
      loopFreak.previousLocation = '';
    }

    // Suspend the ordinary sign fade timer while the omen is visible.
    try {
      if (typeof signTimer !== 'undefined' && signTimer) {
        clearTimeout(signTimer);
      }
    } catch (_) {}

    try {
      if (typeof buildSignBlades === 'function') {
        // One readable blade gives this deliberately weird "place" maximum
        // impact, rather than burying it amongst normal cross streets.
        buildSignBlades(MARC_LOCATION, { k: 1 });
      }
    } catch (_) {}

    if (sign) sign.classList.add('here');

    if (t) {
      t.specialLocation = MARC_LOCATION;
      t.specialEventPrelude = 'street-sign omen';
    }

    const wait = force ? 3200 : MARC_LOCATION_PRELUDE_MS;
    const seed = t?.seed;

    loopFreak.locationTimer = setTimeout(() => {
      loopFreak.locationTimer = 0;

      // The omen only belongs to the track that rolled M.A.R.C.
      if (
        typeof track === 'undefined' ||
        !track ||
        (seed != null && track.seed !== seed)
      ) {
        restoreMARCLocationSign();
        return;
      }

      onReady?.();
    }, wait);
  }

  function queueLoopFreakCameo(t, force = false) {
    clearTimeout(loopFreak.queued);
    clearTimeout(loopFreak.locationTimer);
    loopFreak.queued = 0;
    loopFreak.locationTimer = 0;

    if (!t) return false;

    const now = Date.now();
    const rareEnough = unit(t, 'special:loop-freak') < LOOP_FREAK_CHANCE;
    if (
      !force &&
      (!rareEnough || now - loopFreak.lastAt < LOOP_FREAK_COOLDOWN)
    ) return false;

    const bpm = Number(t.bpm) || 112;
    const barMs = (60000 / bpm) * 4;
    const seed = t.seed;
    const initialDelay =
      force ? 100 : Math.min(12000, Math.max(3500, barMs * 3));

    const waitUntilSceneIsFree = () => {
      if (typeof track === 'undefined' || !track || track.seed !== seed) return;

      const busy =
        (typeof cutsceneActive !== 'undefined' && cutsceneActive) ||
        (typeof visitor !== 'undefined' && visitor);

      if (busy && !force) {
        loopFreak.queued = setTimeout(
          waitUntilSceneIsFree,
          Math.max(2500, barMs)
        );
        return;
      }

      // First the location changes. M.A.R.C. only appears after the player has
      // had several seconds to notice ADULTS ONLY BOATRIDE on the street sign.
      showMARCLocationPrelude(track, force, () => {
        if (
          typeof track !== 'undefined' &&
          track &&
          track.seed === seed
        ) {
          startLoopFreakCameo(track, force);
        } else {
          restoreMARCLocationSign();
        }
      });
    };

    loopFreak.queued = setTimeout(() => {
      loopFreak.queued = 0;
      waitUntilSceneIsFree();
    }, initialDelay);

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

    t.specialEvent = 'M.A.R.C. — fever-dream cameo';
    t.specialLocation = MARC_LOCATION;
    document.body.classList.add('marc-fever');
    wrap.classList.add('on');

    clearTimeout(loopFreak.locationRestoreTimer);
    loopFreak.locationRestoreTimer = setTimeout(
      restoreMARCLocationSign,
      MARC_LOCATION_RESTORE_MS
    );

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
      }, 5000);
    }

    clearTimeout(loopFreak.retireTimer);
    loopFreak.retireTimer = setTimeout(() => {
      retireLoopFreakCameo();
    }, MARC_FEVER_DURATION);

    cancelAnimationFrame(loopFreak.raf);
    loopFreak.raf = requestAnimationFrame(animateLoopFreak);
    return true;
  }

  function retireLoopFreakCameo(immediate = false) {
    clearTimeout(loopFreak.queued);
    loopFreak.queued = 0;

    if (!loopFreak.active) return;

    if (immediate) {
      loopFreak.suppressReaction = true;
      finishLoopFreakCameo();
      return;
    }

    if (!loopFreak.exitingAt) loopFreak.exitingAt = performance.now();
  }

  function showMARCReactionChat() {
    const old = document.getElementById('marcFanChat');
    if (old) old.remove();

    const reactions = [
      ['pixelpapi', 'M.A.R.C.?!?!?!'],
      ['bklynbeats', 'NO WAY 😂'],
      ['loopchild', 'THE MUSTACHE. ABSOLUTE LEGEND.'],
      ['synthghost', 'did everybody else just see that'],
      ['808mami', 'MARC MARC MARC MARC'],
      ['streetfreq', 'bro appeared from another dimension'],
      ['cassettekid', 'best guest of the night idc'],
      ['gridwatcher', 'we love you M.A.R.C. 💚']
    ];

    const chat = document.createElement('div');
    chat.id = 'marcFanChat';
    chat.setAttribute('aria-live', 'polite');

    const head = document.createElement('div');
    head.className = 'marc-chat-head';
    head.textContent = 'street chat // signal restored';
    chat.appendChild(head);

    reactions.forEach(([user, message]) => {
      const line = document.createElement('div');
      line.className = 'marc-chat-line';

      const u = document.createElement('span');
      u.className = 'marc-chat-user';
      u.textContent = user;

      const msg = document.createElement('span');
      msg.textContent = message;

      line.append(u, msg);
      chat.appendChild(line);
    });

    document.body.appendChild(chat);
    requestAnimationFrame(() => chat.classList.add('on'));

    const lines = [...chat.querySelectorAll('.marc-chat-line')];
    lines.forEach((line, index) => {
      setTimeout(() => line.classList.add('on'), 450 + index * 480);
    });

    // Let the whole room enjoy the aftermath for a moment, then quietly clear it.
    setTimeout(() => {
      chat.classList.remove('on');
      setTimeout(() => chat.remove(), 650);
    }, 9000);
  }

  function finishLoopFreakCameo() {
    const shouldReact =
      !loopFreak.suppressReaction &&
      !!loopFreak.startedAt &&
      performance.now() - loopFreak.startedAt > 6000;

    loopFreak.suppressReaction = false;
    loopFreak.active = false;
    loopFreak.seed = null;
    loopFreak.exitingAt = 0;
    cancelAnimationFrame(loopFreak.raf);
    loopFreak.raf = 0;

    clearTimeout(loopFreak.titleTimer);
    clearTimeout(loopFreak.glitchTimer);
    clearTimeout(loopFreak.retireTimer);
    clearTimeout(loopFreak.locationTimer);
    loopFreak.titleTimer = 0;
    loopFreak.glitchTimer = 0;
    loopFreak.retireTimer = 0;
    loopFreak.locationTimer = 0;

    restoreMARCLocationSign();

    document.body.classList.remove('marc-fever');

    if (loopFreak.el) {
      loopFreak.el.classList.remove('on');
      const titleCard = loopFreak.el.querySelector('#lfTitleCard');
      if (titleCard) titleCard.classList.remove('show', 'glitch');
      const robot = loopFreak.el.querySelector('#lfRobot');
      if (robot) robot.removeAttribute('transform');
    }

    if (shouldReact) {
      setTimeout(showMARCReactionChat, 500);
    }
  }

  function animateLoopFreak(now) {
    if (!loopFreak.active || !loopFreak.el) return;

    const svg = loopFreak.el.querySelector('svg');
    const robot = loopFreak.el.querySelector('#lfRobot');
    const ghostA = loopFreak.el.querySelector('#lfGhostA');
    const ghostB = loopFreak.el.querySelector('#lfGhostB');
    const head = loopFreak.el.querySelector('#lfHead');
    const armL = loopFreak.el.querySelector('#lfArmL');
    const armR = loopFreak.el.querySelector('#lfArmR');
    const forearmL = loopFreak.el.querySelector('#lfForearmL');
    const forearmR = loopFreak.el.querySelector('#lfForearmR');
    const legL = loopFreak.el.querySelector('#lfLegL');
    const legR = loopFreak.el.querySelector('#lfLegR');
    const shinL = loopFreak.el.querySelector('#lfShinL');
    const shinR = loopFreak.el.querySelector('#lfShinR');

    if (
      !svg || !robot || !head ||
      !armL || !armR || !forearmL || !forearmR ||
      !legL || !legR || !shinL || !shinR
    ) {
      finishLoopFreakCameo();
      return;
    }

    layoutLoopFreak();

    const elapsed = now - loopFreak.startedAt;
    const life = Math.max(0, Math.min(1, elapsed / MARC_FEVER_DURATION));
    const p = marcPoseAt(life);
    const seconds = elapsed / 1000;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dissolve = 1;
    if (loopFreak.exitingAt) {
      const exit = Math.min(1, (now - loopFreak.exitingAt) / 3200);
      // very soft final disappearance
      dissolve = 1 - marcEase(exit);
      if (exit >= 1) {
        finishLoopFreakCameo();
        return;
      }
    }

    if (reduced) {
      svg.style.opacity = (p.opacity * dissolve).toFixed(3);
      robot.removeAttribute('transform');
      forearmL.removeAttribute('transform');
      forearmR.removeAttribute('transform');
      shinL.removeAttribute('transform');
      shinR.removeAttribute('transform');
    } else {
      // Tiny continuous motion is deliberately independent from the main poses.
      // It gives him breath and weight without making him flap to every beat.
      const breath = Math.sin(seconds * .55);
      const driftX = Math.sin(seconds * .29) * 2.4;
      const driftY = Math.cos(seconds * .24) * 2.0;
      const microLean = Math.sin(seconds * .31) * .75;
      const microHead = Math.sin(seconds * .42 + .8) * 1.2;

      robot.setAttribute(
        'transform',
        `translate(${(p.x + driftX).toFixed(2)} ${(p.y + driftY).toFixed(2)}) ` +
        `translate(82 150) scale(${(p.scale + breath * .004).toFixed(4)}) ` +
        `translate(-82 -150) rotate(${(p.body + microLean).toFixed(2)} 82 150)`
      );

      // Shoulder + elbow animation gives each arm a proper arc.
      armL.setAttribute(
        'transform',
        `rotate(${p.armL.toFixed(2)} 59 82)`
      );
      forearmL.setAttribute(
        'transform',
        `rotate(${p.elbowL.toFixed(2)} 39 113)`
      );

      armR.setAttribute(
        'transform',
        `rotate(${p.armR.toFixed(2)} 104 82)`
      );
      forearmR.setAttribute(
        'transform',
        `rotate(${p.elbowR.toFixed(2)} 125 111)`
      );

      // Same principle for hips and knees: relaxed weight shifts rather than
      // two whole legs swinging like pendulums.
      legL.setAttribute(
        'transform',
        `rotate(${p.legL.toFixed(2)} 67 157)`
      );
      shinL.setAttribute(
        'transform',
        `rotate(${p.kneeL.toFixed(2)} 61 203)`
      );

      legR.setAttribute(
        'transform',
        `rotate(${p.legR.toFixed(2)} 98 157)`
      );
      shinR.setAttribute(
        'transform',
        `rotate(${p.kneeR.toFixed(2)} 104 203)`
      );

      head.setAttribute(
        'transform',
        `translate(${p.hx.toFixed(2)} ${p.hy.toFixed(2)}) ` +
        `rotate(${(p.head + microHead).toFixed(2)} 82 54)`
      );

      // The hallucination fades in/out as part of the authored choreography;
      // a tiny 14-second luminance drift keeps it organic.
      const spectralBreath = .91 + Math.sin(seconds * .45 + .3) * .09;
      svg.style.opacity =
        (Math.max(.025, p.opacity * spectralBreath) * dissolve).toFixed(3);

      // Chromatic ghosts lag behind very slowly, like analogue registration
      // rather than frantic RGB jitter.
      if (ghostA) {
        ghostA.setAttribute(
          'x',
          (-4.2 + Math.sin(seconds * .34) * 2.2).toFixed(2)
        );
        ghostA.setAttribute(
          'y',
          (1.8 + Math.cos(seconds * .27) * 1.5).toFixed(2)
        );
        ghostA.style.opacity =
          (.055 + (Math.sin(seconds * .23) + 1) * .022).toFixed(3);
      }

      if (ghostB) {
        ghostB.setAttribute(
          'x',
          (4.8 + Math.cos(seconds * .30) * 2.5).toFixed(2)
        );
        ghostB.setAttribute(
          'y',
          (-1.6 + Math.sin(seconds * .25) * 1.7).toFixed(2)
        );
        ghostB.style.opacity =
          (.05 + (Math.cos(seconds * .21) + 1) * .024).toFixed(3);
      }
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

      /* Never animate from the legacy floating-panel coordinates on boot. */
      #devPanel.devpanel:not(.ari-drawer-motion-ready) {
        transition: none !important;
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

    // Final geometry is now known. Remove the legacy-panel boot guard without
    // allowing a transition between the two coordinate systems.
    drawerPanel.style.removeProperty('visibility');
    drawerPanel.style.removeProperty('opacity');
    drawerPanel.style.removeProperty('transform');
    drawerPanel.style.removeProperty('transition');
    drawerPanel.classList.add('ari-drawer-ready');
    document.body?.classList.add('ari-v108-ready');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawerPanel.classList.add('ari-drawer-motion-ready');
      });
    });

    const isOpen = () => drawerPanel.classList.contains('show');

    // The panel behaves like a normal drawer/modal surface:
    // click/tap anywhere outside it to dismiss. The title itself is handled by
    // its own toggle listener above.
    document.addEventListener('pointerdown', e => {
      if (!isOpen()) return;
      if (drawerPanel.contains(e.target)) return;
      if (title.contains(e.target)) return;
      closeDrawer();
    }, true);
    const openDrawer = () => {
      if (!isOpen()) window.toggleDevPanel();
    };
    const closeDrawer = () => {
      if (isOpen()) window.toggleDevPanel();
    };

    if (title) {
      // Track name is a normal button now: one click/tap opens immediately.
      // Capture pointerdown only neutralizes the obsolete handler still present
      // in the base page; there is no hold/gesture behavior in v108.
      title.addEventListener('pointerdown', e => {
        e.stopImmediatePropagation();
      }, true);

      title.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (isOpen()) closeDrawer();
        else openDrawer();
      }, true);

      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-expanded', 'false');
      title.setAttribute('aria-controls', 'devPanel');
      title.setAttribute('aria-label', 'Open track details');

      title.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isOpen()) closeDrawer();
          else openDrawer();
        }
      });
    }

    // No swipe/drag gestures: the panel is deliberately explicit.
    // Close it with its existing close button, or Escape on desktop.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) closeDrawer();
    });
  }


  // ---------------------------------------------------------------------------
  // Real ARI signal — full takeover.
  //
  // A.R.I. is the stand-in while ARIatHOME is unavailable. When DecAPI reports
  // the real stream as live, the local performance stops and the interface
  // becomes an intentionally loud 80s comic alert until the stream is offline.
  // ---------------------------------------------------------------------------
  (() => {
    const STATUS_URL =
      'https://decapi.me/twitch/uptime/ariathome?offline_msg=OFFLINE';
    const TWITCH_URL = 'https://www.twitch.tv/ariathome';
    const POLL_MS = 60 * 1000;

    const footer = document.querySelector('footer');
    const stage = document.getElementById('stage');
    if (!footer) return;

    const label =
      footer.querySelector('[data-live-label]') ||
      [...footer.querySelectorAll('span')]
        .find(el => !el.classList.contains('liveDot'));

    if (!label) return;

    const originalText = label.textContent || 'live from the grid';
    let link = null;
    let pollTimer = 0;
    let lastConfirmedLive = false;

    const style = document.createElement('style');
    style.id = 'ariRealSignalStyle';
    style.textContent = `
      body.real-ari-live {
        --real-green: #b8ff00;
        --real-pink: #ff2bd6;
      }

      body.real-ari-live #stage {
        cursor: default !important;
      }

      body.real-ari-live #scene {
        opacity: .34;
        filter:
          grayscale(.35)
          drop-shadow(0 0 4px rgba(184,255,0,.18))
          drop-shadow(0 0 18px rgba(255,43,214,.12));
        transition: opacity 260ms ease, filter 260ms ease;
      }

      body.real-ari-live #gAri {
        opacity: .28 !important;
        cursor: default !important;
      }

      footer.real-ari-signal {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      footer.real-ari-signal .liveDot {
        background: #ff2bd6 !important;
        box-shadow:
          0 0 5px rgba(255,43,214,.95),
          0 0 13px rgba(184,255,0,.58);
        animation: realAriPulse 1.05s steps(2,end) infinite;
      }

      #realAriSignalLink {
        color: #b8ff00;
        text-decoration: none;
        cursor: pointer;
        text-shadow:
          0 0 4px rgba(184,255,0,.75),
          0 0 11px rgba(255,43,214,.34);
      }

      #realAriSignalLink::after {
        content: "";
        display: block;
        width: 100%;
        height: 1px;
        margin-top: 2px;
        background: linear-gradient(90deg, #b8ff00, #ff2bd6);
        opacity: .82;
      }

      #realAriTakeover {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: grid;
        place-items: center;
        padding:
          max(26px, env(safe-area-inset-top))
          max(22px, env(safe-area-inset-right))
          max(26px, env(safe-area-inset-bottom))
          max(22px, env(safe-area-inset-left));
        overflow: hidden;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        background:
          radial-gradient(circle at 20% 18%, rgba(184,255,0,.09), transparent 25%),
          radial-gradient(circle at 82% 78%, rgba(255,43,214,.12), transparent 28%),
          rgba(3,4,9,.70);
        transition: opacity 220ms ease, visibility 0s linear 240ms;
      }

      #realAriTakeover.on {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transition-delay: 0s;
      }

      #realAriTakeover::before {
        content: "";
        position: absolute;
        inset: 0;
        opacity: .20;
        pointer-events: none;
        background-image:
          radial-gradient(circle, #b8ff00 0 1px, transparent 1.35px),
          linear-gradient(
            118deg,
            transparent 0 47%,
            rgba(255,43,214,.12) 48% 52%,
            transparent 53% 100%
          );
        background-size: 8px 8px, 100% 100%;
        mix-blend-mode: screen;
      }

      #realAriTakeover::after {
        content: "";
        position: absolute;
        inset: -15%;
        pointer-events: none;
        border: clamp(18px, 3vw, 42px) solid rgba(255,43,214,.16);
        transform: rotate(-4deg);
        box-shadow:
          inset 0 0 0 3px rgba(184,255,0,.22),
          0 0 70px rgba(255,43,214,.18);
      }

      #realAriComic {
        position: relative;
        width: min(840px, 92vw);
        min-height: min(590px, 76svh);
        display: grid;
        place-items: center;
        text-align: center;
        isolation: isolate;
        transform: rotate(-1deg);
      }

      /* Three flat comic-print layers:
         black keyline -> hot pink -> toxic green.
         The single 50%/0% vertex makes the top spike unmistakable. */
      #realAriBurst {
        position: absolute;
        inset: 0;
        z-index: -2;
        background: #030409;
        clip-path: polygon(
          50% 0%,
          56% 14%, 67% 4%, 70% 20%, 84% 10%, 82% 27%,
          98% 29%, 86% 41%, 100% 49%, 84% 57%, 97% 69%,
          79% 68%, 84% 87%, 65% 80%, 58% 100%,
          50% 84%,
          42% 100%, 35% 80%, 16% 87%, 21% 68%, 3% 69%,
          16% 57%, 0% 49%, 14% 41%, 2% 29%, 18% 27%,
          16% 10%, 30% 20%, 33% 4%, 44% 14%
        );
        filter: drop-shadow(0 0 18px rgba(255,43,214,.52));
        animation: realAriBurstBlink .98s steps(2,end) infinite;
      }

      #realAriBurst::before,
      #realAriBurst::after {
        content: "";
        position: absolute;
        clip-path: inherit;
      }

      #realAriBurst::before {
        inset: 7px;
        background: #ff2bd6;
      }

      #realAriBurst::after {
        inset: 17px;
        background: #b8ff00;
      }

      #realAriCopy {
        position: relative;
        width: min(700px, 82vw);
        padding: clamp(58px, 7vw, 76px) clamp(22px, 6vw, 60px)
                 clamp(42px, 5vw, 58px);
        color: #030409;
        font-family: "Space Grotesk", sans-serif;
        text-transform: uppercase;
      }

      .real-alert-kicker {
        display: inline-block;
        padding: 7px 12px 6px;
        margin: 8px 0 15px;
        background: #030409;
        color: #ff2bd6;
        font: 600 clamp(10px, 1.8vw, 14px)/1 "IBM Plex Mono", monospace;
        letter-spacing: .16em;
        transform: rotate(.6deg);
        box-shadow: 4px 4px 0 #ff2bd6;
        animation: realAriKickerBlink .78s steps(1,end) infinite;
      }

      .real-alert-main {
        margin: 0;
        font-size: clamp(38px, 8.5vw, 92px);
        font-weight: 600;
        line-height: .86;
        letter-spacing: -.055em;
        text-wrap: balance;
        text-shadow: 3px 3px 0 #ff2bd6;
      }

      .real-alert-stamp {
        display: inline-block;
        margin: 24px 0 17px;
        padding: 8px 14px 6px;
        border: 4px solid #030409;
        background: #ff2bd6;
        color: #030409;
        font-size: clamp(21px, 4vw, 42px);
        font-weight: 600;
        line-height: 1;
        letter-spacing: .04em;
        transform: rotate(-2.2deg);
        box-shadow: 5px 5px 0 #030409;
      }

      .real-alert-sub {
        display: inline-block;
        max-width: 570px;
        margin: 0 auto;
        padding: 8px 12px 7px;
        background: #030409;
        color: #ff2bd6;
        border: 2px solid #030409;
        font: 500 clamp(11px, 2vw, 16px)/1.45 "IBM Plex Mono", monospace;
        letter-spacing: .08em;
        text-shadow: 0 0 7px rgba(255,43,214,.52);
        box-shadow: 5px 5px 0 rgba(184,255,0,.34);
        transform: rotate(.7deg);
      }

      #realAriWatch {
        display: inline-block;
        margin-top: 25px;
        padding: 13px 18px 11px;
        background: #030409;
        border: 3px solid #030409;
        color: #b8ff00;
        text-decoration: none;
        font: 600 clamp(13px, 2.4vw, 18px)/1 "IBM Plex Mono", monospace;
        letter-spacing: .07em;
        box-shadow: 6px 6px 0 #ff2bd6;
        transform: rotate(.6deg);
        cursor: pointer;
        transition:
          transform 110ms ease,
          box-shadow 110ms ease,
          color 110ms ease;
      }

      #realAriWatch:hover {
        color: #ff2bd6;
        transform: translate(2px, 2px) rotate(.2deg);
        box-shadow: 3px 3px 0 #ff2bd6;
      }

      #realAriWatch:focus-visible {
        outline: 3px solid #b8ff00;
        outline-offset: 5px;
      }

      @keyframes realAriPulse {
        0%,100% { opacity:.46; transform:scale(.86); }
        50% { opacity:1; transform:scale(1.16); }
      }

      @keyframes realAriBurstBlink {
        0%, 46% {
          filter: drop-shadow(0 0 17px rgba(255,43,214,.58));
          transform: scale(1);
        }
        47%, 100% {
          filter: drop-shadow(0 0 23px rgba(184,255,0,.48));
          transform: scale(1.006);
        }
      }

      @keyframes realAriKickerBlink {
        0%, 49% { color:#ff2bd6; background:#030409; }
        50%,100% { color:#030409; background:#ff2bd6; }
      }

      @media (max-width: 640px) {
        #realAriComic {
          width: 98vw;
          min-height: 72svh;
        }

        #realAriCopy {
          width: 87vw;
          padding: 54px 18px 38px;
        }

        .real-alert-main {
          font-size: clamp(36px, 13vw, 58px);
        }

        .real-alert-stamp {
          margin-top: 19px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        footer.real-ari-signal .liveDot,
        #realAriBurst,
        .real-alert-kicker {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const takeover = document.createElement('div');
    takeover.id = 'realAriTakeover';
    takeover.setAttribute('aria-live', 'assertive');
    takeover.setAttribute('aria-hidden', 'true');
    takeover.innerHTML = `
      <div id="realAriComic">
        <div id="realAriBurst" aria-hidden="true"></div>
        <div id="realAriCopy">
          <div class="real-alert-kicker">!!! EXTERNAL SIGNAL !!!</div>
          <h2 class="real-alert-main">REAL ARI<br>SIGNAL DETECTED!</h2>
          <div class="real-alert-stamp">A.R.I. OUT OF ORDER</div>
          <a id="realAriWatch" href="${TWITCH_URL}" target="_blank"
             rel="noopener noreferrer">WATCH ARIatHOME LIVE ↗</a>
        </div>
      </div>
    `;
    document.body.appendChild(takeover);

    function suspendLocalAri() {
      // The base app exposes playing + stop(). Guard both so this can never
      // accidentally call the browser's unrelated window.stop().
      try {
        if (
          typeof playing !== 'undefined' &&
          playing &&
          typeof stop === 'function'
        ) {
          stop();
        }
      } catch (_) {}

      try {
        if (typeof retireLoopFreakCameo === 'function')
          retireLoopFreakCameo(true);
      } catch (_) {}

      document.body.classList.add('real-ari-live');
      if (stage) {
        try { stage.inert = true; } catch (_) {}
        stage.setAttribute('aria-hidden', 'true');
      }
    }

    function resumeLocalAri() {
      document.body.classList.remove('real-ari-live');
      if (stage) {
        try { stage.inert = false; } catch (_) {}
        stage.removeAttribute('aria-hidden');
      }
    }

    function showTakeover() {
      takeover.hidden = false;
      takeover.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => takeover.classList.add('on'));
    }

    function hideTakeover() {
      takeover.classList.remove('on');
      takeover.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        if (!lastConfirmedLive) takeover.hidden = true;
      }, 260);
    }

    function setOffline() {
      footer.classList.remove('real-ari-signal');

      if (link?.isConnected) link.replaceWith(label);
      link = null;

      label.textContent = originalText;
      label.removeAttribute('title');

      lastConfirmedLive = false;
      hideTakeover();
      resumeLocalAri();
    }

    function setLive(uptimeText) {
      if (!link || !link.isConnected) {
        link = document.createElement('a');
        link.id = 'realAriSignalLink';
        link.href = TWITCH_URL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        label.replaceWith(link);
      }

      link.textContent = 'REAL ARI SIGNAL DETECTED';
      link.title = uptimeText
        ? `ARIatHOME is live · ${uptimeText}`
        : 'ARIatHOME is live on Twitch';

      footer.classList.add('real-ari-signal');
      lastConfirmedLive = true;
      suspendLocalAri();
      showTakeover();
    }

    async function pollRealAriSignal() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(STATUS_URL, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Accept': 'text/plain' }
        });

        clearTimeout(timeout);
        if (!res.ok) throw new Error(`DecAPI ${res.status}`);

        const text = (await res.text()).trim();

        if (!text || /^offline$/i.test(text)) setOffline();
        else setLive(text);
      } catch (_) {
        // A failed status request never creates a false takeover. If the last
        // confirmed state was live, retain it until a successful check says
        // otherwise.
        if (!lastConfirmedLive) setOffline();
      } finally {
        clearTimeout(pollTimer);
        pollTimer = setTimeout(pollRealAriSignal, POLL_MS);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearTimeout(pollTimer);
        pollRealAriSignal();
      }
    });

    pollRealAriSignal();

    window.ARI108RealSignal = Object.freeze({
      refresh: pollRealAriSignal,
      source: 'DecAPI Twitch uptime',
      channel: 'ariathome',
      get live() { return lastConfirmedLive; }
    });
  })();

  window.ARI108=Object.freeze({
    version:VERSION,
    canonicalGenres:[...new Set(CANONICAL)],
    requestCatalog:REQUEST_CATALOG,
    styleMeta:META,
    resolveRequest,
    specialEvents:Object.freeze({
      marcChance:LOOP_FREAK_CHANCE,
      marcDurationMs:MARC_FEVER_DURATION,
      marcLocation:MARC_LOCATION,
      marcLocationPreludeMs:MARC_LOCATION_PRELUDE_MS,
      loopFreakChance:LOOP_FREAK_CHANCE,
      forceMARC(){
        if(typeof track==='undefined'||!track)return false;
        retireLoopFreakCameo(true);
        return queueLoopFreakCameo(track,true);
      },
      // legacy debug alias
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
