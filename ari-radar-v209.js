/* A.R.I. radar v209 — persistent sweep across Live Signal re-renders.
   The overlay rebuilds every 900ms, so the sweep phase MUST live outside the radar DOM. */
(function(){
  'use strict';

  const PERIOD=6500;
  const globalEpoch=performance.now();
  let frame=0;
  let currentRadar=null;
  let currentArm=null;

  const style=document.createElement('style');
  style.textContent=`
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
        rgba(82,200,192,.10) 0%,
        rgba(82,200,192,.55) 70%,
        rgba(82,200,192,1) 100%);
      box-shadow:0 0 5px rgba(82,200,192,.75);
    }
    .ariRadarSweep:after{
      content:"";
      position:absolute;
      left:0;
      top:-14px;
      width:100%;
      height:28px;
      transform-origin:0 50%;
      transform:rotate(-7deg);
      background:linear-gradient(90deg,
        rgba(82,200,192,.05),
        rgba(82,200,192,.018) 65%,
        transparent);
      clip-path:polygon(0 50%,100% 0,100% 100%);
      pointer-events:none;
    }
    .ariRadar .ariDot{z-index:2!important}
    @media(prefers-reduced-motion:reduce){.ariRadarSweep{display:none}}
  `;
  document.head.appendChild(style);

  function phase(now){
    return ((now-globalEpoch)%PERIOD)/PERIOD*360;
  }

  function bindRadar(){
    const radar=document.querySelector('#ariSignalOverlay.open #ariSigBody .ariRadar');
    if(!radar){
      currentRadar=null;
      currentArm=null;
      return;
    }

    currentRadar=radar;
    let arm=radar.querySelector('.ariRadarSweep');
    if(!arm){
      arm=document.createElement('div');
      arm.className='ariRadarSweep';
      arm.setAttribute('aria-hidden','true');
      radar.prepend(arm);
    }
    currentArm=arm;
    currentArm.style.transform=`rotate(${phase(performance.now())}deg)`;
  }

  function animate(now){
    const open=document.querySelector('#ariSignalOverlay.open');
    if(!open){
      frame=0;
      currentRadar=null;
      currentArm=null;
      return;
    }

    // Live Signal replaces #ariSigBody every ~900ms. Rebind without resetting phase.
    if(!currentRadar || !document.documentElement.contains(currentRadar)){
      bindRadar();
    }

    if(currentRadar && currentArm){
      const sweep=phase(now);
      currentArm.style.transform=`rotate(${sweep}deg)`;

      const dots=currentRadar.querySelectorAll('.ariDot');
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
    }

    frame=requestAnimationFrame(animate);
  }

  function start(){
    if(frame)return;
    bindRadar();
    frame=requestAnimationFrame(animate);
  }

  function stop(){
    if(frame){cancelAnimationFrame(frame);frame=0;}
    currentRadar=null;
    currentArm=null;
  }

  // Only observe structural replacement of the overlay content.
  const observer=new MutationObserver(()=>{
    if(document.querySelector('#ariSignalOverlay.open')){
      bindRadar();
      start();
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});

  document.addEventListener('keydown',e=>{
    if(e.shiftKey && e.key.toLowerCase()==='d'){
      setTimeout(()=>{
        document.querySelector('#ariSignalOverlay.open')?start():stop();
      },40);
    }else if(e.key==='Escape'){
      setTimeout(()=>{if(!document.querySelector('#ariSignalOverlay.open'))stop();},40);
    }
  },true);

  document.addEventListener('click',()=>{
    setTimeout(()=>{
      document.querySelector('#ariSignalOverlay.open')?start():stop();
    },40);
  },true);

  if(document.querySelector('#ariSignalOverlay.open'))start();
})();
