/* Public UI normalization — compact status, in-world battery, no technical clutter. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* Track name is display-only. Replacing the node removes the legacy long-press
     listener that index.html attached earlier in startup. */
  const oldTrackName = $('trackname');
  if (oldTrackName) {
    const fresh = oldTrackName.cloneNode(true);
    oldTrackName.replaceWith(fresh);
    for (const attr of ['tabindex', 'role', 'aria-label', 'aria-expanded']) fresh.removeAttribute(attr);
    fresh.style.cursor = 'default';
  }

  const blockTrackNameEvent = (event) => {
    const target = event.target instanceof Element ? event.target.closest('#trackname') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  ['pointerdown', 'pointerup', 'pointercancel', 'click', 'dblclick', 'contextmenu'].forEach(type =>
    document.addEventListener(type, blockTrackNameEvent, true)
  );

  const style = document.createElement('style');
  style.id = 'ari-public-ui-normalization';
  style.textContent = `
    /* Identity + weather + tribute: same system font and scale. */
    header > p:not(.tribute){font-size:14px!important;letter-spacing:.22em!important;line-height:1.35!important;margin-top:5px!important}
    #wxText{margin-top:8px!important;font-size:11.5px!important;line-height:1.5!important;letter-spacing:.11em!important}
    #wxBattery,#wxText br{display:none!important}
    header .tribute{display:block!important;margin-top:7px!important;font-family:"IBM Plex Mono",monospace!important;font-size:11.5px!important;font-weight:400!important;letter-spacing:.11em!important;line-height:1.5!important;text-transform:none!important;color:#ffe66d!important;text-shadow:0 0 5px rgba(255,230,109,.52),0 0 12px rgba(255,230,109,.22)!important;opacity:.95!important;transform:none!important}
    body.light header .tribute{color:#8a6a00!important;text-shadow:0 0 5px rgba(255,196,0,.13)!important}

    .wxCond::before,.wxCond::after{display:none!important}

    /* Track block: title + musical identity only. No track no., time or section. */
    #trackNumTime{display:none!important}
    #trackname,#trackmeta{font-size:12px!important;line-height:1.65!important;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #trackname{font-weight:600!important;letter-spacing:.18em!important;cursor:default!important;pointer-events:auto!important;color:var(--text)!important}
    #trackmeta{font-weight:400!important;letter-spacing:.14em!important}

    /* Top-right returns to a single clean status row; battery now lives on A.R.I. */
    footer{align-items:center!important;gap:10px!important;font-size:11px!important}
    footer .liveDot{flex:0 0 auto}
    footer > span:not(.liveDot){font-size:11px!important;line-height:18px!important;letter-spacing:.20em!important}
    #themebtn{margin:0!important;transform:none!important;align-self:center!important}
    #ariLiveStack,#ariRigBattery{display:none!important}

    @media(max-width:640px){
      header > p:not(.tribute){font-size:12.5px!important;letter-spacing:.16em!important}
      #wxText,header .tribute{font-size:10.5px!important;letter-spacing:.09em!important}
      #trackname,#trackmeta{font-size:11px!important;line-height:1.55!important}
      footer > span:not(.liveDot){font-size:10.5px!important}
    }
  `;
  document.head.appendChild(style);

  /* Weather above tribute. Keep tribute wording, remove only legacy version suffix. */
  const tribute = document.querySelector('header .tribute');
  const weather = $('wxText');
  if (tribute) tribute.textContent = 'inspired by ARIatHOME';
  if (tribute && weather && tribute.parentElement === weather.parentElement) {
    tribute.parentElement.insertBefore(weather, tribute);
  }

  /* Undo older hot-reload/footer battery DOM if present. */
  const footer = document.querySelector('footer');
  const oldStack = $('ariLiveStack');
  if (footer && oldStack) {
    const liveRow = oldStack.querySelector('#ariLiveRow');
    const dot = liveRow?.querySelector('.liveDot');
    const label = liveRow?.querySelector('.ariLiveLabel');
    const theme = $('themebtn');
    if (dot) footer.insertBefore(dot, theme || null);
    if (label) {
      label.classList.remove('ariLiveLabel');
      footer.insertBefore(label, theme || null);
    }
    oldStack.remove();
  }

  /* Track metadata: preserve genre/key/BPM, colour it from cool -> warm as tempo rises. */
  if (typeof updateMeta === 'function') {
    const originalUpdateMeta = updateMeta;
    const stops = [
      [70,  [82, 200, 192]],
      [100, [94, 156, 234]],
      [125, [167, 123, 255]],
      [145, [255, 95, 210]],
      [165, [255, 108, 88]],
      [185, [255, 55, 68]],
    ];
    const rgbForBpm = (bpm) => {
      const value = Number(bpm) || 100;
      if (value <= stops[0][0]) return stops[0][1];
      if (value >= stops.at(-1)[0]) return stops.at(-1)[1];
      for (let i = 1; i < stops.length; i++) {
        if (value <= stops[i][0]) {
          const [aBpm, a] = stops[i - 1], [bBpm, b] = stops[i];
          const t = (value - aBpm) / (bBpm - aBpm);
          return a.map((v, j) => Math.round(v + (b[j] - v) * t));
        }
      }
      return stops[0][1];
    };
    const applyMeta = () => {
      if (typeof track === 'undefined' || !track) return;
      const el = $('trackmeta');
      if (!el) return;
      const genre = typeof displayGenre === 'function' ? displayGenre(track.genre) : track.genre;
      el.textContent = `${genre || 'live'} · ${track.keyName || '—'} · ${track.bpm || '—'} bpm`;
      let [r, g, b] = rgbForBpm(track.bpm);
      if (document.body.classList.contains('light')) {
        r = Math.round(r * .68); g = Math.round(g * .68); b = Math.round(b * .68);
      }
      el.style.color = `rgb(${r} ${g} ${b})`;
      el.style.textShadow = document.body.classList.contains('light')
        ? 'none'
        : `0 0 10px rgb(${r} ${g} ${b} / .18)`;
    };
    updateMeta = function(sec) {
      originalUpdateMeta(sec);
      applyMeta();
    };
    applyMeta();
  }

  /* Rig fader caps follow the same projected Y-axis as their slots. */
  const faders = [...Array(8)].map((_, i) => $('fader' + i));
  const translate = /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/;
  function correctFaderAxes() {
    for (const el of faders) {
      if (!el) continue;
      const match = (el.style.transform || '').match(translate);
      if (!match) continue;
      const x = Number(match[1]), y = Number(match[2]);
      if (x < 0 && y < 0) el.style.transform = `translate(${match[1]}px,${Math.abs(y).toFixed(1)}px)`;
    }
    requestAnimationFrame(correctFaderAxes);
  }
  requestAnimationFrame(correctFaderAxes);


})();
