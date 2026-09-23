/**
 * ari-score-bridge-melody-hook.js
 *
 * Minimal hook: after ARIComposer.compose, optionally replace built-in lead
 * with ARIMelodyWalk (SeedSong-style). Does nothing unless leadDensity > 0
 * or window.ARI_MELODY_WALK_FORCE is true.
 *
 * Load order:
 *   ari-composer.js
 *   ari-melody-walk.js
 *   ari-musicians.js
 *   ari-score-synth.js
 *   ari-score-bridge.js
 *   ari-score-bridge-melody-hook.js   ← this file (after bridge)
 *
 * Or call ARIMelodyHook.attach(track) yourself after compose.
 */
(function (root) {
  'use strict';

  const HOOK_VERSION = '1.0.0';

  function leadOptsFrom(settings, score, artist) {
    const dens =
      settings?.leadDensity != null
        ? settings.leadDensity
        : settings?.melody != null
          ? settings.melody
          : 0;
    const force = !!(root.ARI_MELODY_WALK_FORCE);
    if (dens <= 0 && !force) return null;

    return {
      version: settings?.leadVersion === 1 ? 1 : 2,
      density: dens > 0 ? dens : 0.42,
      register:
        settings?.leadRegister != null
          ? settings.leadRegister
          : 12,
      voice: score?.identity?.leadVoice || 'soft-poly',
      bars: score?.bars || 8,
      lowComfort: 1,
      highComfort: 12
    };
  }

  /**
   * Apply walk lead onto an already-composed track.score.
   * Returns true if lead was applied.
   */
  function attach(track) {
    if (!track?.score) return false;
    if (!root.ARIMelodyWalk?.apply) {
      console.warn('[ARIMelodyHook] ARIMelodyWalk not loaded');
      return false;
    }

    const settings = track.musicProfile || track.score?.production || {};
    const opts = leadOptsFrom(settings, track.score, track.musician);
    if (!opts) return false;

    // Strip any lead the composer already emitted, then apply walk.
    root.ARIMelodyWalk.apply(track.score, opts);

    // Keep step map in sync if bridge built one.
    if (typeof root.ARIScoreBridge?.indexScore === 'function') {
      track.scoreStepMap = root.ARIScoreBridge.indexScore(track.score);
    } else if (track.scoreStepMap && track.score.byBar) {
      // best-effort: full reindex is bridge-internal; playback still uses events
    }

    if (track.scoreSeedInfo) {
      track.scoreSeedInfo.melody = opts.density;
      track.scoreSeedInfo.melodyEngine = 'ARIMelodyWalk@' + root.ARIMelodyWalk.version;
    }

    console.info('[ARIMelodyHook] lead applied', {
      density: opts.density,
      register: opts.register,
      version: opts.version,
      events: track.score.events.filter((e) => e.stem === 'lead').length
    });
    return true;
  }

  /**
   * Wrap attachScore so every new musicians-score gets optional walk lead.
   * Safe to call once after ari-score-bridge.js loads.
   */
  function install() {
    const bridge = root.ARIScoreBridge;
    if (!bridge || typeof bridge.attachScore !== 'function') {
      // Bridge may expose attach differently; try common patterns.
      if (root.attachScore && !root.__ariMelodyHookInstalled) {
        const orig = root.attachScore;
        root.attachScore = function (t) {
          const ok = orig.apply(this, arguments);
          if (ok) attach(t);
          return ok;
        };
        root.__ariMelodyHookInstalled = true;
        console.info('[ARIMelodyHook] installed on global attachScore', HOOK_VERSION);
        return true;
      }
      console.warn('[ARIMelodyHook] ARIScoreBridge.attachScore not found; call ARIMelodyHook.attach(track) manually');
      return false;
    }

    if (bridge.__melodyHookInstalled) return true;
    const orig = bridge.attachScore.bind(bridge);
    bridge.attachScore = function (t) {
      const ok = orig(t);
      if (ok) attach(t);
      return ok;
    };
    bridge.__melodyHookInstalled = true;
    console.info('[ARIMelodyHook] installed on ARIScoreBridge.attachScore', HOOK_VERSION);
    return true;
  }

  const api = Object.freeze({
    version: HOOK_VERSION,
    attach,
    install,
    leadOptsFrom
  });

  root.ARIMelodyHook = api;

  // Auto-install when bridge is already present.
  if (root.ARIScoreBridge || root.attachScore) {
    try {
      install();
    } catch (e) {
      console.warn('[ARIMelodyHook] auto-install failed', e);
    }
  } else {
    // Defer until load
    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        try {
          install();
        } catch (e) {}
      });
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
