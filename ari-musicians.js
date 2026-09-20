/* Fictional, editable musical identities. Registry supports multiple people per family.
   Profile version + engine version + seed are the reproducible listening contract. */
(function(root){
'use strict';
const ENGINE='musicians-1.1',KEY='ari-musicians-v2';
const fields={
 bpm:{label:'Tempo',min:45,max:190,step:1,unit:'BPM'},
 swing:{label:'Swing',min:0,max:.6,step:.01,unit:'%'},
 kickWeight:{label:'Kick · gewicht',min:0,max:1,step:.01,unit:'%'},
 punch:{label:'Kick · attack',min:0,max:1,step:.01,unit:'%'},
 drive:{label:'Drums · vervorming',min:0,max:1,step:.01,unit:'%'},
 bassLevel:{label:'Bas · niveau',min:0,max:1.5,step:.05,unit:'×'},
 chordsLevel:{label:'Akkoorden · niveau',min:0,max:1.5,step:.05,unit:'×'},
 leadDensity:{label:'Melodie · dichtheid',min:0,max:1,step:.05,unit:'%'}
};
const rows=[
// family, name, display, expertise, tempo, grammar, bass role/voice, harmony role/voice, lead, kit, mode, swing, weight, attack, drive, bass, chords, melody
['techno','FERRO','Techno','Dwingende vierkwarts. Lage druk, korte motieven, weinig harmonie.',140,'four','anchor','reese','comp','soft-poly','reed','electro','phryg',0,.9,.85,.65,1.15,.18,0],
['jazz','Mira Vale','Jazz','Een ontspannen trio. Wandelende bas, open voicings en ruimte tussen de zinnen.',88,'broken','walk','wood-bass','comp','electric-piano','reed','dust','dorian',.42,.15,.15,0,.8,.85,0],
['breaks','RIFT','Breakbeat','Versneden ritmes, felle snares en een bijtende bas. De drums voeren het gesprek.',138,'breakbeat','riff','pulse-bass','comp','plucked-keys','reed','crisp','minor',.06,.65,.9,.6,1.1,.25,0],
['hiphop','Low Atlas','Hip-hop','Een zware pocket, luie snare en korte, stoffige akkoordgrepen.',90,'broken','answer','sub','comp','electric-piano','mallet','dust','minor',.32,.65,.4,.15,1,.65,0],
['trap','Vanta','Trap','Halftime, diepe sub en spaarzame bellen boven strakke hats.',142,'half','sustain','sub','arpeggio','bell','bell','electro','minor',.03,.85,.65,.25,1.2,.35,0],
['rnb','Sola Grey','R&B','Achteroverleunende drums en zachte, rijke akkoorden.',82,'broken','answer','fm-bass','comp','electric-piano','electric-piano','round','dorian',.26,.4,.25,.05,.9,.85,0],
['soul','June Ember','Soul','Warme orgelgrepen, melodische bas en een rustige backbeat.',94,'backbeat','walk','wood-bass','comp','organ','electric-piano','round','major',.2,.35,.3,.08,.9,.8,0],
['funk','Dex Coil','Funk','Korte noten, syncopen en een bas die tegen de kick in praat.',108,'syncopated','riff','pluck-bass','comp','organ','reed','dry','mixolydian',.16,.4,.7,.15,1.1,.5,0],
['house','Luma Park','House','Een stabiele kick, verende offbeatbas en open akkoorden.',124,'four','offbeat','fm-bass','comp','organ','plucked-keys','round','minor',.1,.65,.55,.12,1,.65,0],
['garage','Kite Unit','UK garage','Een springende two-step met geschoven hats en korte basantwoorden.',132,'two-step','answer','sub','comp','electric-piano','plucked-keys','crisp','minor',.3,.55,.7,.16,1.05,.45,0],
['dnb','Vector North','Drum & bass','Snelle breakpatronen en een langzame, donkere Reese-bas eronder.',172,'breakbeat','sustain','reese','pad','soft-poly','reed','crisp','minor',.02,.6,.9,.45,1.15,.2,0],
['bass','Nox Relay','Bass','Halftime, lege plekken en laag dat blijft hangen.',140,'half','sustain','reese','comp','bell','reed','electro','phryg',.04,.9,.8,.5,1.2,.2,0],
['trance','Aera','Trance','Doorlopende arpeggio’s, offbeatbas en lange melodische bogen.',138,'four','offbeat','pulse-bass','arpeggio','soft-poly','soft-poly','electro','minor',0,.55,.65,.15,1,.75,0],
['afro','Tala Circuit','Afro','In elkaar grijpende percussie en een herhalende, soepele bas.',116,'interlock','riff','pluck-bass','comp','plucked-keys','mallet','dry','dorian',.12,.5,.45,.08,1,.45,0],
['reggae','Cedar Dub','Reggae / dub','One-drop, korte skanks en een ronde bas met veel ruimte.',74,'one-drop','riff','sub','skank','organ','mallet','round','major',.12,.6,.25,.06,1.2,.65,0],
['latin','Luz Palma','Latin','Clave, melodische percussie en heldere akkoordantwoorden.',106,'clave','answer','wood-bass','comp','plucked-keys','mallet','dry','major',.03,.3,.45,.02,.9,.65,0],
['ambient','Oren Drift','Ambient','Weinig aanslagen. Lang laag, uitgerekte akkoorden en losse lichtpunten.',62,'sparse','sustain','sub','pad','soft-poly','bell','round','dorian',0,.1,.1,0,.6,.85,0],
['pop','Nova June','Pop','Een duidelijke backbeat en terugkerende melodische zinnen.',112,'backbeat','anchor','pluck-bass','comp','plucked-keys','soft-poly','crisp','major',.03,.45,.6,.08,.9,.7,0],
['rock','Ash Static','Rock','Rechte drums, een stuwende basriff en ruwe synthesizerkleuren.',126,'backbeat','riff','pulse-bass','comp','reed','reed','dry','minor',0,.6,.85,.55,1,.5,0],
['experimental','Ivo Null','Experimental','Verschoven pulsen, ongewone intervallen en onrustige klankcombinaties.',105,'interlock','answer','fm-bass','arpeggio','bell','reed','electro','phryg',.17,.5,.7,.4,1,.55,.65]
];
const registry=rows.map(([family,name,label,description,bpm,grammar,bassRole,bassVoice,harmonyRole,keysVoice,leadVoice,kit,mode,swing,kickWeight,punch,drive,bassLevel,chordsLevel,leadDensity],index)=>({
 id:family+'-01',family,name,label,description,version:2,moods:[],number:String(index+1).padStart(2,'0'),
 identity:{grammar,bassRole,bassVoice,harmonyRole,keysVoice,leadVoice,kit,mode,harmonyMode:['techno','dnb','bass','ambient'].includes(family)?'pedal':'functional',extension:['jazz','rnb','soul'].includes(family),late:['jazz','rnb','hiphop','soul'].includes(family)?.035:0,bassGate:family==='techno'?.45:.7,introRole:'drums',breakRole:'bass'},
 defaults:{bpm,swing,kickWeight,punch,drive,bassLevel,chordsLevel,leadDensity:0}
}));
function sanitize(artist,values){const result={...artist.defaults};for(const [k,f] of Object.entries(fields)){const n=values?.[k];if(typeof n==='number'&&Number.isFinite(n))result[k]=Math.max(f.min,Math.min(f.max,n));}return result;}
function stored(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}}
function settings(artist){
 // A stage link carries the selected settings even when browser storage is unavailable.
 try{if(/(?:^|\/)index\.html$|\/$/.test(location.pathname)&&requested()?.id===artist.id){const p=new URLSearchParams(location.search).get('profile');if(p)return sanitize(artist,JSON.parse(p));}}catch(_){}
 return sanitize(artist,stored()[artist.id]);
}
function save(artist,values){try{const all=stored();all[artist.id]=sanitize(artist,values);localStorage.setItem(KEY,JSON.stringify(all));return true;}catch(_){return false;}}
function profile(artist,values){return {id:artist.id,name:artist.name,version:artist.version,engine:ENGINE,identity:{...artist.identity,swing:sanitize(artist,values).swing},settings:sanitize(artist,values)};}
function compose(artist,values,seed){const p=profile(artist,values);return root.ARIComposer.compose({seed:String(seed),family:artist.family,genre:artist.label,bpm:p.settings.bpm,profile:p});}
function requested(){try{return registry.find(a=>a.id===new URLSearchParams(location.search).get('musician'))||null;}catch(_){return null;}}
if(typeof document!=='undefined'&&!location.pathname.endsWith('musicians.html'))document.addEventListener('DOMContentLoaded',()=>{
 const artist=requested();if(!artist)return;const link=document.createElement('a');link.href='./musicians.html'+(artist?'?musician='+artist.id:'');link.textContent=artist?artist.name+' · muzikant afstellen ↗':'Muzikantenwerkbank ↗';link.style.cssText='position:fixed;bottom:8px;left:10px;z-index:900;font:12px system-ui;color:#bbd6c8;background:#101614e8;padding:6px 10px;border:1px solid #34433b;border-radius:5px';document.body.append(link);
});
const api={ENGINE,fields,registry,sanitize,settings,save,profile,compose,requested};root.ARIMusicians=api;
if(typeof module!=='undefined')module.exports=api;
})(globalThis);
