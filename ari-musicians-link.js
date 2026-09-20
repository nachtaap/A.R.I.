/* A.R.I. musicians shortcut — UI only.
   Adds a compact music-note button directly after the Ableton export action. */
(function(){
  'use strict';

  const ID='ariMusiciansShortcut';
  const style=document.createElement('style');
  style.textContent=`
    .ariMusiciansIcon{
      width:34px;height:34px;padding:0!important;display:inline-grid!important;place-items:center;
      border-radius:50%!important;font:500 18px/1 "IBM Plex Mono",monospace!important;
      color:#c8ed8b!important;border-color:rgba(200,237,139,.38)!important;
      background:rgba(200,237,139,.045)!important;text-transform:none!important;
      letter-spacing:0!important;
    }
    .ariMusiciansIcon:hover{
      color:#e8ffc3!important;border-color:rgba(200,237,139,.75)!important;
      box-shadow:0 0 15px rgba(200,237,139,.12)!important;
    }
    body.light .ariMusiciansIcon{
      color:#577c1f!important;border-color:rgba(87,124,31,.30)!important;
      background:rgba(87,124,31,.035)!important;
    }
  `;
  document.head.appendChild(style);

  function addButton(){
    const row=document.querySelector('#ariSigBody .ariEventRow');
    const exportBtn=row?.querySelector('[data-ari-event="export"]');
    if(!row||!exportBtn||document.getElementById(ID))return;

    const btn=document.createElement('button');
    btn.id=ID;
    btn.type='button';
    btn.className='ariEventBtn ariMusiciansIcon';
    btn.setAttribute('aria-label','Open musicians workbench');
    btn.setAttribute('title','Musicians workbench');
    btn.textContent='♪';
    btn.addEventListener('click',()=>{
      const url=new URL('./musicians.html',location.href);
      try{
        const m=window.ARIScoreBridge?.musician?.id || window.ARIMusicians?.requested?.()?.id;
        if(m)url.searchParams.set('musician',m);
      }catch(_){}
      location.href=url.href;
    });
    exportBtn.insertAdjacentElement('afterend',btn);
  }

  const observer=new MutationObserver(addButton);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()==='d'&&e.shiftKey)setTimeout(addButton,0);
  });
  addButton();
})();
