/* The listening sketch's kick, hats and sine bass, played by A.R.I.'s live brains.
   No recordings or network audio. Load after the creature composer. */
(() => {
  'use strict';
  const S = window.ARICreatureSynth;
  if (!S || typeof newTrack !== 'function') return;
  let context = null, kit = null, wave = null, lastBass = null;
  const voices = new Set();
  function clear() {
    for (const v of [...voices]) {
      try { v.source.stop(); } catch (_) {}
      v.cleanup();
    }
    lastBass = null;
  }
  function prepare() {
    if (!ctx || !track) return false;
    if (context === ctx && kit?.seed === track.seed) return true;
    clear(); context = ctx;
    const sr = 22050, random = S.random(String(track.seed) + ':drums');
    function drum(kind) {
      const n = Math.ceil(sr * (kind === 'kick' ? .32 : .09));
      const buffer = ctx.createBuffer(1, n, sr), data = buffer.getChannelData(0);
      let phase = 0, low = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, noise = random() * 2 - 1;
        if (kind === 'kick') {
          phase += Math.PI * 2 * (45 + 125 * Math.exp(-t * 32)) / sr;
          data[i] = Math.sin(phase) * Math.exp(-t * 14) + noise * .12 * Math.exp(-t * 140);
        } else {
          low += .18 * (noise - low);
          data[i] = (noise - low) * Math.exp(-t * 65) * .5;
        }
        // Same boundary taper as the offline sketch's sample player.
        data[i] *= Math.min(1, i / 70, (n - i) / 220);
      }
      return buffer;
    }
    kit = { seed: track.seed, kick: drum('kick'), hat: drum('hat') };
    wave = ctx.createPeriodicWave(new Float32Array(3), new Float32Array([0, 1, .13]), { disableNormalization: true });
    return true;
  }
  function register(source, gain) {
    const voice = { source, gain, cleanup() {
      source.disconnect(); gain.disconnect(); voices.delete(voice);
      if (lastBass === voice) lastBass = null;
    }};
    source.onended = voice.cleanup; voices.add(voice); return voice;
  }
  function hit(kind, time, volume, rate = 1) {
    if (!prepare() || !playing || track.cutBar === bar) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = kit[kind]; source.playbackRate.value = rate;
    gain.gain.value = Math.max(0, Math.min(1.3, volume));
    source.connect(gain); gain.connect(master); register(source, gain);
    source.start(Math.max(time, ctx.currentTime));
  }
  // Replace the old transient + rumble stack, including the 808 kick path.
  playKick = function(time, volume = 1) { hit('kick', time, .48 * volume); };
  play808Kick = function(time, volume = 1) { hit('kick', time, .48 * volume); };
  playHat = function(time, open, volume = 1) {
    hit('hat', time, (open ? .19 : .17) * volume, open ? .72 : 1);
  };
  function bass(time, midi, duration, volume) {
    if (!prepare() || !playing || track.cutBar === bar) return;
    const t = Math.max(time, ctx.currentTime), beat = 60 / track.bpm;
    const length = Math.max(.045, Math.min(duration, beat * .7)), peak = .2 * volume;
    if (lastBass && lastBass.end > t) {
      // One low voice at a time; preserve its envelope when retriggering.
      const old = lastBass, elapsed = Math.max(0, t - old.start);
      const level = old.peak * Math.min(1, elapsed * 90) * Math.exp(-elapsed * 4);
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(Math.max(.0001, level), t);
      old.gain.gain.linearRampToValueAtTime(0, t + .006);
      old.source.stop(t + .007);
    }
    const source = ctx.createOscillator(), gain = ctx.createGain();
    source.setPeriodicWave(wave); source.frequency.value = S.midiHz(bassMidi(midi));
    // The sketch's slow exp(-4t) decay, followed by a short cut taper.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak * Math.exp(-4 / 90), t + 1 / 90);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * Math.exp(-4 * (length - .01))), t + length - .01);
    gain.gain.linearRampToValueAtTime(0, t + length);
    source.connect(gain); gain.connect(master);
    const voice = register(source, gain);
    Object.assign(voice, { start: t, end: t + length, peak }); lastBass = voice;
    source.start(t); source.stop(t + length + .002);
  }
  function wrap(original, volumeIndex = 3) {
    return function(...args) {
      const volume = args[volumeIndex] ?? 1;
      bass(args[0], args[1], args[2], volume);
      // Preserve the selected synth as a restrained answer at phrase endings.
      // The clean low voice remains the continuous foundation.
      if (playing && track?.cutBar !== bar && bar % 8 >= 6 && !window.ARICreatures?.foreground) {
        args[volumeIndex] = volume * .18;
        return original(...args);
      }
    };
  }
  playBass = wrap(playBass); playDeepSub = wrap(playDeepSub);
  playSilkSub = wrap(playSilkSub); playRound = wrap(playRound);
  playRubber = wrap(playRubber); playGrowl = wrap(playGrowl);
  playPluckBass = wrap(playPluckBass); playPulseBass = wrap(playPulseBass);
  // Reese's fourth argument is its hollow flag, not its velocity.
  playReese = wrap(playReese, 4); play808 = wrap(play808, 4);
  const previousNew = newTrack;
  newTrack = function(...args) { clear(); const result = previousNew(...args); prepare(); return result; };
  const previousStop = stop;
  stop = function(...args) { clear(); return previousStop(...args); };
  const previousStep = scheduleStep;
  scheduleStep = function(step, time) {
    if (track?.cutBar === bar && step === 0) {
      // Stop already-scheduled tails at the cut, without cutting early.
      for (const voice of voices) { try { voice.source.stop(time); } catch (_) {} }
    }
    return previousStep(step, time);
  };
  window.ARIBeatFoundation = Object.freeze({ version: 1, get activeVoices() { return voices.size; } });
  if (typeof track !== 'undefined' && track) prepare();
})();
