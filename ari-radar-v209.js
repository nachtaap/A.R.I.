/* A.R.I. radar — final integrated runtime controller.
   Replaces the old radar animator without changing index.html.
   The legacy foundation still renders the radar DOM, but its RAF is cancelled
   at assignment time so only this controller animates sweep + blips. */
(function(){
  'use strict';

  const PERIOD = 6500;
  const epoch = performance.now();
  let frame = 0;

  /* Stop ari-beat-foundation.js from ever starting its legacy radar RAF.
     Its code writes every requested frame id to window.__ariRadarFrame.
     Cancelling in the setter prevents that callback from running at all. */
  try {
    const existing = window.__ariRadarFrame;
    if (existing) cancelAnimationFrame(existing);
    Object.defineProperty(window, '__ariRadarFrame', {
      configurable: true,
      get(){ return 0; },
      set(id){ if(id) cancelAnimationFrame(id); }
    });
  } catch (_) {
    /* Older browser fallback: the animation below still owns the visible sweep. */
    if(window.__ariRadarFrame){
      cancelAnimationFrame(window.__ariRadarFrame);
      window.__ariRadarFrame = 0;
    }
  }

  const style = document.createElement('style');
  style.id = 'ari-radar-final-style';
  style.textContent = `
    .ariRadar:after{
      content:none!important;
      animation:none!important;
      background:none!important;
      filter:none!important;
    }
    .ariRadar{
      position:relative!important;
      overflow:hidden!important;
    }
    .ariRadarSweep{
      position:absolute;
      left:50%;
      top:50%;
      width:50%;
      height:1px;
      z-index:1;
      pointer-events:none;
      transform-origin:0 50%;
      background:linear-gradient(
        90deg,
        rgba(82,200,192,.10),
        rgba(82,200,192,.55) 70%,
        rgba(82,200,192,1)
      );
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
      background:linear-gradient(
        90deg,
        rgba(82,200,192,.05),
        rgba(82,200,192,.018) 65%,
        transparent
      );
      clip-path:polygon(0 50%,100% 0,100% 100%);
      pointer-events:none;
    }

    /* ari-beat-foundation.js contains a later duplicate pink .ariDot rule.
       These declarations are intentionally authoritative. */
    .ariRadar .ariDot{
      background:#52c8c0!important;
      opacity:var(--ari-dot-base,.10)!important;
      box-shadow:0 0 0 rgba(82,200,192,0)!important;
      transition:opacity .12s ease,transform .12s ease,box-shadow .12s ease!important;
      z-index:2!important;
    }
    .ariRadar .ariDot.hit{
      opacity:1!important;
      transform:scale(1.5)!important;
      box-shadow:
        0 0 5px rgba(82,200,192,.95),
        0 0 13px rgba(82,200,192,.48)!important;
    }
    .ariRadar .ariDot.echo{
      opacity:.38!important;
      transform:scale(1.1)!important;
      box-shadow:0 0 6px rgba(82,200,192,.34)!important;
    }

    @media(prefers-reduced-motion:reduce){
      .ariRadarSweep{display:none!important}
    }
  `;
  document.head.appendChild(style);

  function angle(now){
    return ((now - epoch) % PERIOD) / PERIOD * 360;
  }

  function ensureArm(radar){
    let arm = radar.querySelector('.ariRadarSweep');
    if(!arm){
      arm = document.createElement('i');
      arm.className = 'ariRadarSweep';
      arm.setAttribute('aria-hidden','true');
      radar.prepend(arm);
    }
    return arm;
  }

  function tick(now){
    const overlay = document.querySelector('#ariSignalOverlay.open');
    if(!overlay){
      frame = 0;
      return;
    }

    const radar = overlay.querySelector('#ariSigBody .ariRadar');
    if(radar){
      const sweep = angle(now);
      const arm = ensureArm(radar);
      arm.style.transform = `rotate(${sweep}deg)`;

      /* Stored dot angles use 0° = top, while CSS rotate(0deg) points right. */
      const sweepData = (sweep + 90) % 360;

      radar.querySelectorAll('.ariDot').forEach(dot => {
        const a = parseFloat(dot.dataset.angle || '0');
        const delta = (sweepData - a + 360) % 360;
        const hit = delta < 5 || delta > 357;
        const echo = delta >= 5 && delta < 23;

        dot.classList.toggle('hit', hit);
        dot.classList.toggle('echo', echo);

        const row = overlay.querySelector(
          `.ariListenerRow[data-listener="${dot.dataset.index}"]`
        );
        if(row) row.classList.toggle('scan', hit || echo);
      });
    }

    frame = requestAnimationFrame(tick);
  }

  function sync(){
    const open = !!document.querySelector('#ariSignalOverlay.open');
    if(open && !frame) frame = requestAnimationFrame(tick);
    if(!open && frame){
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  const overlay = document.getElementById('ariSignalOverlay');
  if(overlay){
    new MutationObserver(sync).observe(overlay, {
      attributes:true,
      attributeFilter:['class']
    });
  }

  sync();
})();
