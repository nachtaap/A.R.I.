/* A.R.I. Musician Lab access — intentionally undocumented operator shortcut.
   UI-only: does not alter audio, composition or the Shift+D Live Signal panel. */
(function(){
  'use strict';

  function openLab(){
    const url=new URL('./musicians.html',location.href);
    try{
      const m=window.ARIScoreBridge?.musician?.id || window.ARIMusicians?.requested?.()?.id;
      if(m)url.searchParams.set('musician',m);
    }catch(_){}
    location.href=url.href;
  }

  document.addEventListener('keydown',e=>{
    if(e.repeat) return;
    if(e.target.closest('input,textarea,select,button,[contenteditable="true"]')) return;
    // Intentionally undocumented.
    if(e.shiftKey && e.key.toLowerCase()==='m'){
      e.preventDefault();
      openLab();
    }
  });
})();
