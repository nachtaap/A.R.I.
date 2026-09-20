/* Fictional, editable musical identities. Registry supports multiple people per family.
   Profile version + engine version + seed are the reproducible listening contract. */
(function(root){
'use strict';
const ENGINE='musicians-1.1',KEY='ari-musicians-v2';
const fields={
 bpm:{label:'Tempo',min:45,max:190,step:1,unit:'BPM'},
 swing:{label:'Swing',min:0,max:.6,step:.01,unit:'%'},
 kickWeight:{label:'Kick · weight',min:0,max:1,step:.01,unit:'%'},
 punch:{label:'Kick · attack',min:0,max:1,step:.01,unit:'%'},
 drive:{label:'Drums · drive',min:0,max:1,step:.01,unit:'%'},
 bassLevel:{label:'Bass · level',min:0,max:1.5,step:.05,unit:'×'},
 chordsLevel:{label:'Chords · level',min:0,max:1.5,step:.05,unit:'×'},
 leadDensity:{label:'Melody · density',min:0,max:1,step:.05,unit:'%'}
};
const rows=[
['techno','FERRO','Techno','Relentless four-on-the-floor. Low pressure, short motifs, minimal harmony.',140,'four','anchor','reese','comp','soft-poly','reed','electro','phryg',0,.9,.85,.65,1.15,.18,0],
['jazz','Mira Vale','Jazz','A relaxed trio. Walking bass, open voicings and space between phrases.',88,'broken','walk','wood-bass','comp','electric-piano','reed','dust','dorian',.42,.15,.15,0,.8,.85,0],
['breaks','RIFT','Breakbeat','Cut-up rhythms, sharp snares and a biting bass. The drums lead the conversation.',138,'breakbeat','riff','pulse-bass','comp','plucked-keys','reed','crisp','minor',.06,.65,.9,.6,1.1,.25,0],
['hiphop','Low Atlas','Hip-hop','A heavy pocket, lazy snare and short dusty chord stabs.',90,'broken','answer','sub','comp','electric-piano','mallet','dust','minor',.32,.65,.4,.15,1,.65,0],
['trap','Vanta','Trap','Halftime, deep sub and sparse bells over tight hats.',142,'half','sustain','sub','arpeggio','bell','bell','electro','minor',.03,.85,.65,.25,1.2,.35,0],
['rnb','Sola Grey','R&B','Laid-back drums and soft, rich chords.',82,'broken','answer','fm-bass','comp','electric-piano','electric-piano','round','dorian',.26,.4,.25,.05,.9,.85,0],
['soul','June Ember','Soul','Warm organ stabs, melodic bass and a relaxed backbeat.',94,'backbeat','walk','wood-bass','comp','organ','electric-piano','round','major',.2,.35,.3,.08,.9,.8,0],
['funk','Dex Coil','Funk','Short notes, syncopation and a bass line that talks back to the kick.',108,'syncopated','riff','pluck-bass','comp','organ','reed','dry','mixolydian',.16,.4,.7,.15,1.1,.5,0],
['house','Luma Park','House','A steady kick, springy offbeat bass and open chords.',124,'four','offbeat','fm-bass','comp','organ','plucked-keys','round','minor',.1,.65,.55,.12,1,.65,0],
['garage','Kite Unit','UK garage','A bouncing two-step with shifted hats and short bass responses.',132,'two-step','answer','sub','comp','electric-piano','plucked-keys','crisp','minor',.3,.55,.7,.16,1.05,.45,0],
['dnb','Vector North','Drum & bass','Fast break patterns over a slow, dark Reese bass.',172,'breakbeat','sustain','reese','pad','soft-poly','reed','crisp','minor',.02,.6,.9,.45,1.15,.2,0],
['bass','Nox Relay','Bass','Halftime, negative space and low end that hangs in the air.',140,'half','sustain','reese','comp','bell','reed','electro','phryg',.04,.9,.8,.5,1.2,.2,0],
['trance','Aera','Trance','Continuous arpeggios, offbeat bass and long melodic arcs.',138,'four','offbeat','pulse-bass','arpeggio','soft-poly','soft-poly','electro','minor',0,.55,.65,.15,1,.75,0],
['afro','Tala Circuit','Afro','Interlocking percussion and a repeating, fluid bass line.',116,'interlock','riff','pluck-bass','comp','plucked-keys','mallet','dry','dorian',.12,.5,.45,.08,1,.45,0],
['reggae','Cedar Dub','Reggae / dub','One-drop, short skanks and a round bass with plenty of space.',74,'one-drop','riff','sub','skank','organ','mallet','round','major',.12,.6,.25,.06,1.2,.65,0],
['latin','Luz Palma','Latin','Clave, melodic percussion and bright chord responses.',106,'clave','answer','wood-bass','comp','plucked-keys','mallet','dry','major',.03,.3,.45,.02,.9,.65,0],
['ambient','Oren Drift','Ambient','Few attacks. Long low tones, stretched chords and isolated points of light.',62,'sparse','sustain','sub','pad','soft-poly','bell','round','dorian',0,.1,.1,0,.6,.85,0],
['pop','Nova June','Pop','A clear backbeat and recurring melodic phrases.',112,'backbeat','anchor','pluck-bass','comp','plucked-keys','soft-poly','crisp','major',.03,.45,.6,.08,.9,.7,0],
['rock','Ash Static','Rock','Straight drums, a driving bass riff and rough synthesizer colours.',126,'backbeat','riff','pulse-bass','comp','reed','reed','dry','minor',0,.6,.85,.55,1,.5,0],
['experimental','Ivo Null','Experimental','Shifted pulses, unusual intervals and uneasy timbral combinations.',105,'interlock','answer','fm-bass','arpeggio','bell','reed','electro','phryg',.17,.5,.7,.4,1,.55,.65]
];
const registry=rows.map(([family,name,label,description,bpm,grammar,bassRole,bassVoice,harmonyRole,keysVoice,leadVoice,kit,mode,swing,kickWeight,punch,drive,bassLevel,chordsLevel,leadDensity],index)=>({
 id:family+'-01',family,name,label,description,version:2,moods:[],number:String(index+1).padStart(2,'0'),
 identity:{grammar,bassRole,bassVoice,harmonyRole,keysVoice,leadVoice,kit,mode,harmonyMode:['techno','dnb','bass','ambient'].includes(family)?'pedal':'functional',extension:['jazz','rnb','soul'].includes(family),late:['jazz','rnb','hiphop','soul'].includes(family)?.035:0,bassGate:family==='techno'?.45:.7,introRole:'drums',breakRole:'bass'},
 defaults:{bpm,swing,kickWeight,punch,drive,bassLevel,chordsLevel,leadDensity:0}
}));
function sanitize(artist,values){const result={...artist.defaults};for(const [k,f] of Object.entries(fields)){const n=values?.[k];if(typeof n==='number'&&Number.isFinite(n))result[k]=Math.max(f.min,Math.min(f.max,n));}return result;}
function stored(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}}
function settings(artist){
 try{if(/(?:^|\/)index\.html$|\/$/.test(location.pathname)&&requested()?.id===artist.id){const p=new URLSearchParams(location.search).get('profile');if(p)return sanitize(artist,JSON.parse(p));}}catch(_){}
 return sanitize(artist,stored()[artist.id]);
}
function save(artist,values){try{const all=stored();all[artist.id]=sanitize(artist,values);localStorage.setItem(KEY,JSON.stringify(all));return true;}catch(_){return false;}}
function profile(artist,values){return {id:artist.id,name:artist.name,version:artist.version,engine:ENGINE,identity:{...artist.identity,swing:sanitize(artist,values).swing},settings:sanitize(artist,values)};}
function compose(artist,values,seed){const p=profile(artist,values);return root.ARIComposer.compose({seed:String(seed),family:artist.family,genre:artist.label,bpm:p.settings.bpm,profile:p});}
function requested(){try{return registry.find(a=>a.id===new URLSearchParams(location.search).get('musician'))||null;}catch(_){return null;}}
const api={ENGINE,fields,registry,sanitize,settings,save,profile,compose,requested};root.ARIMusicians=api;
if(typeof module!=='undefined')module.exports=api;
})(globalThis);

/* Desktop street chat layout fix.
   UI-only; no Musician Lab navigation or keyboard shortcut lives here. */
(function(){
  'use strict';
  if(typeof document==='undefined')return;
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.getElementById('ari-street-chat-compact'))return;
    const style=document.createElement('style');
    style.id='ari-street-chat-compact';
    style.textContent=`
      #chat{
        justify-content:flex-end!important;
      }
      #chatHead{
        flex:0 0 auto!important;
        margin:0!important;
      }
      #chatLog{
        flex:0 1 auto!important;
        min-height:0!important;
        max-height:calc(100vh - 270px)!important;
      }
    `;
    document.head.appendChild(style);
  });
})();
