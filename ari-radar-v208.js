/* A.R.I. radar v208 — single-source synchronized sweep.
   Replaces the CSS pseudo-element sweep with a real center-origin arm driven by
   the same animation clock as listener detection. UI-only; no audio changes. */
(function(){
  'use strict';

  const PERIOD = 6500;
  let frame = 0;
  let epoch = 0;

  const style = document.createElement('style');
  style.textContent = `
    .ariRadar:after{
      content:none!important;
      animation:none!important;
      background:none!important;
      filter:none!important;
    }
    .ariRadar{position:relative!important;overflow:hidden!important}
    .ariRadarSweep{
      position:absolute;
      left:50%;
      top:50%;
      width:50%;
      height:1px;
      z-index:1;
      pointer-events:none;
      transform-origin:0 50%;
      background:linear-gradient(90deg,
        rgba(82,200,192,.15) 0%,
        rgba(82,200,192,.75) 72%,
        rgba(82,200,192,1) 100%);
      box-shadow:
        0 0 4px rgba(82,200,192,.8),
        0 0 10px rgba(82,200,192,.35);
    }
    .ariRadarSweep:before{
      content:"";
      position:absolute;
      right:0;
      top:-3px;
      width:7px;
      height:7px;
      margin-right:-3px;
      border-radius:50%;
      background:#9ff7ec;
      box-shadow:0 0 8px rgba(82,200,192,.9);
    }
    .ariRadarSweep:after{
      content:"";
      position:absolute;
      left:0;
      top:-18px;
      width:100%;
      height:36px;
      transform-origin:0 50%;
      transform:rotate(-8deg);
      background:linear-gradient(90deg,
        rgba(82,200,192,.045),
        rgba(82,200,192,.015) 70%,
        transparent);
      clip-path:polygon(0 50%,100% 0,100% 100%);
      pointer-events:none;
    }
    .ariRadar .ariDot{z-index:2!important}
    @media(prefers-reduced-motion:reduce){
      .ariRadarSweep{display:none}
    }
  `;
  document.head.appendChild(style);

  function stop(){
    if(frame){ cancelAnimationFrame(frame); frame=0; }
  }

  function setup(){
    const radar=document.querySelector('#ariSigBody .ariRadar');
    if(!radar){ stop(); return; }

    let arm=radar.querySelector('.ariRadarSweep');
    if(!arm){
      arm=document.createElement('div');
      arm.className='ariRadarSweep';
      arm.setAttribute('aria-hidden','true');
      radar.prepend(arm);
    }

    const dots=[...radar.querySelectorAll('.ariDot')];
    epoch=performance.now();

    stop();
    const animate=now=>{
      if(!document.documentElement.contains(radar) || !radar.closest('#ariSignalOverlay.open')){
        frame=0;
        return;
      }

      const sweep=((now-epoch)%PERIOD)/PERIOD*360;
      arm.style.transform=`rotate(${sweep}deg)`;

      for(const dot of dots){
        const a=parseFloat(dot.dataset.angle||'0');
        const delta=(sweep-a+360)%360;
        const hit=delta<5 || delta>357;
        const echo=delta>=5 && delta<23;
        dot.classList.toggle('hit',hit);
        dot.classList.toggle('echo',echo);

        const row=document.querySelector(
          `#ariSigBody .ariListenerRow[data-listener="${dot.dataset.index}"]`
        );
        if(row)row.classList.toggle('scan',hit||echo);
      }
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
  }

  // The Live Signal body is rebuilt whenever the panel renders/new track starts.
  const mo=new MutationObserver(()=>{
    if(document.querySelector('#ariSignalOverlay.open #ariSigBody .ariRadar')){
      requestAnimationFrame(setup);
    }
  });
  mo.observe(document.documentElement,{subtree:true,childList:true});

  document.addEventListener('keydown',e=>{
    if(e.shiftKey && e.key.toLowerCase()==='d'){
      setTimeout(()=>{
        if(document.querySelector('#ariSignalOverlay.open'))setup();
        else stop();
      },30);
    }
    if(e.key==='Escape')setTimeout(stop,30);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('.ariSigClose') || e.target.id==='ariSignalOverlay'){
      setTimeout(()=>{ if(!document.querySelector('#ariSignalOverlay.open'))stop(); },30);
    }
  },true);

  if(document.querySelector('#ariSignalOverlay.open'))setup();
})();
