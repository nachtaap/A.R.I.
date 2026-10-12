/* Fallback accompaniment only. Score mode never calls this scheduler.
   Shared voice, visitor and transport behaviour stays in index.html. */
function scheduleLegacyAccompaniment(sIdx, t) {
  const g = track.g,
    spb = 60 / track.bpm,
    s16 = spb / 4;
  const tt = t + (sIdx % 2 === 1 ? track.swing * s16 : 0);
  const deg = progressionDegreeAt(track, bar);
  const sect = sectionAt(bar),
    D = SECT[sect] || SECT.main,
    drumState = drumStateAt(bar),
    composerState = composerStateAt(track, bar),
    kp = drumState?.kick || track.kick,
    sp = drumState?.snare || track.snare,
    gp = drumState?.ghost || track.ghost,
    hp = drumState?.hats || track.hatSteps;
  barEnergy = track.energyCurve?.[bar] ?? 0.55;
  const plannedBassEvent = bassEventAt(track, bar, sIdx),
    activeBassType = track.bassType || g.bass;
  /* one-shot events for this bar */
  const cut = track.cutBar != null && bar === track.cutBar; // DJ cut: total silence (or a-capella if someone is on the mic)
  const half =
    track.special?.type === "halftime" && bar >= track.special.bar;
  const halfBassStep =
    /house|uk garage/.test(track.genre) ||
    (track.genre === "afrobeats" && track.subStyle === "afro house")
      ? sIdx === 2 || sIdx === 10
      : sIdx % 4 === 0 || (sIdx === 10 && plannedBassEvent?.linked);
  const bassEvent =
    plannedBassEvent &&
    !cut &&
    D.bass > 0 &&
    (!half || halfBassStep)
      ? plannedBassEvent
      : null;
  if (sIdx === 0) {
    if (half && bar === track.special.bar && !track._specialLive) {
      track._specialLive = true;
      speak(
        pick(["switch it up", "half time", "hold up"]),
        ARI_VOICE,
        0.5,
        Math.max(0, tt - ctx.currentTime),
      );
    }
    if (
      track.special?.type === "keychange" &&
      !track._keyShifted &&
      bar >= track.special.bar
    ) {
      track._keyShifted = true;
      track.root += 2; // whole-step lift for the final stretch
      track.voiceLead = null; // re-anchor voicings in the new key
      track.keyName = KEYS[track.root % 12] + " " + track.scaleName;
      speak(
        pick(["take it up", "new key", "lift it"]),
        ARI_VOICE,
        0.5,
        Math.max(0, tt - ctx.currentTime),
      );
    }

  }

  /* The drum brain has already predicted this complete bar. Do not roll
     another coin here: the remembered motif, mutation and safety pass should
     survive pause/resume exactly as composed. Microtiming is stored as a
     fraction of one sixteenth note, so human feel scales with tempo. */
  const ktt = tt + (drumState?.micro?.kick?.[sIdx] || 0) * s16,
    sntt = tt + (drumState?.micro?.snare?.[sIdx] || 0) * s16,
    gtt = tt + (drumState?.micro?.ghost?.[sIdx] || 0) * s16,
    htt = tt + (drumState?.micro?.hats?.[sIdx] || 0) * s16;
  const kickNow = cut
    ? false
    : half
      ? sIdx === 0 || (sIdx === 10 && kp[10])
      : kp[sIdx];
  if (kickNow) {
    const kv = drumState?.velocity?.kick?.[sIdx] || 0.92;
    g.kick808
      ? play808Kick(ktt, kv, !!bassEvent)
      : playKick(ktt, kv);
    visQ.push({ t: ktt, type: "kick" });
    /* sidechain pump — the missing glue. Four-on-the-floor genres breathe
       around the kick; dnb gets a shorter tuck so the sub stays punchy.
       The scheduler emits steps in time order, so no cancel calls needed. */
    if (duckBus && D.drums > 0) {
      const four = isFourFloorDrums(track.genre, track.subStyle, track.kick);
      if (four || track.genre === "drum n bass") {
        const depth = four ? 0.42 : 0.62,
          rel = spb * (four ? 0.6 : 0.32);
        duckBus.gain.setValueAtTime(1, ktt);
        duckBus.gain.linearRampToValueAtTime(depth, ktt + 0.014);
        duckBus.gain.linearRampToValueAtTime(1, ktt + rel);
      }
    }
  }
  /* Auxiliary accents are part of the bar plan, so a fixed seed is audible. */
  if (!cut && D.drums > 0 && drumState?.aux?.cowbell?.[sIdx]) {
    play808Cowbell(tt, 0.45 + (drumState.temperature || 0.4) * 0.22);
    visQ.push({ t: tt, type: "hat" });
  }
  const snareNow = cut ? false : half ? sIdx === 8 : sp[sIdx];
  if (snareNow) {
    const stt =
      track.lateSnare && bar % 4 === 2 && sIdx === 12
        ? sntt + s16 * 0.55
        : sntt; // the late-snare stumble
    track.useClap
      ? playClap(stt)
      : playSnare(stt, drumState?.velocity?.snare?.[sIdx] || 0.92);
    visQ.push({ t: stt, type: "snare" });
  }
  /* Ghosts are now predicted events with stored velocity and timing, not a
     fresh random layer on every scheduler pass. */
  if (gp && gp[sIdx] && D.drums > 0 && !cut && !half)
    playSnare(gtt, drumState?.velocity?.ghost?.[sIdx] || 0.34);
  /* hats per genre, gated by section density */
  const hatGate = Math.min(1.25, D.hats * (drumState?.hatMul || 1) * (composerState.hats ?? 1));
  const hatMode = track.hatMode || g.hat;
  if (hatGate > 0 && !cut) {
    if (hp) {
      // Every brain-generated bar has a concrete hat grid. Accent and open
      // state remain genre-aware, while velocity comes from the human/machine
      // axis of the current latent position.
      if (hp[sIdx]) {
        const open =
          (hatMode === "offbeat" && sIdx % 4 === 2) ||
          ((drumState?.brainRole === "lift" ||
            drumState?.brainRole === "turn") &&
            sIdx === 14 &&
            (drumState?.temperature || 0) > 0.5);
        const hv = Math.min(
          1.15,
          (drumState?.velocity?.hats?.[sIdx] || 0.62) *
            Math.min(1, hatGate) *
            (0.82 + barEnergy * 0.3),
        );
        playHat(htt, open, hv);
        if (sIdx % 4 === 2) visQ.push({ t: htt, type: "hat" });
      }
    } else if (hatMode === "eights") {
      if (sIdx % 2 === 0 && Math.random() < track.hatP * hatGate) {
        playHat(
          tt,
          sIdx % 8 === 6 && Math.random() < 0.4,
          0.8 + barEnergy * 0.35,
        );
        visQ.push({ t: tt, type: "hat" });
      }
    } else if (hatMode === "offbeat") {
      if (sIdx % 4 === 2 && Math.random() < hatGate + 0.2) {
        playHat(tt, true, 0.8 + barEnergy * 0.35);
        visQ.push({ t: tt, type: "hat" });
      } else if (sIdx % 2 === 0 && Math.random() < 0.4 * hatGate)
        playHat(tt, false, 0.8 + barEnergy * 0.35);
    } else if (hatMode === "rolls") {
      if (Math.random() < track.hatP * hatGate) {
        playHat(tt, false);
        if (sIdx % 4 === 0) visQ.push({ t: tt, type: "hat" });
      }
      if (sIdx % 8 === 7 && Math.random() < 0.4 * hatGate) {
        playHat(tt + s16 / 3, false);
        playHat(tt + (2 * s16) / 3, false);
      }
    } else if (hatMode === "fast") {
      if (Math.random() < track.hatP * hatGate) {
        playHat(
          tt,
          sIdx % 8 === 6 && Math.random() < 0.3,
          0.8 + barEnergy * 0.35,
        );
        if (sIdx % 4 === 2) visQ.push({ t: tt, type: "hat" });
      }
    }
  }
  if (hatGate > 0 && !cut && drumState?.hatExtras?.length) {
    drumState.hatExtras
      .filter((x) => x.step === sIdx)
      .forEach((x) =>
        x.offsets.forEach((off, i) =>
          playHat(
            htt + off * s16,
            false,
            (x.velocities[i] || 0.55) * Math.min(1, hatGate),
          ),
        ),
      );
  }
  /* Phrase/section fill. The whole fill decision is made once for the bar,
     so we never get the old half-random "maybe one tap, maybe three" result. */
  if (
    !cut &&
    drumState?.useFill &&
    (composerState.fills ?? 1) > 0.3 &&
    drumState.fillSnare?.[sIdx] &&
    !sp[sIdx]
  ) {
    const fillVol = sIdx === 15 ? 0.78 : sIdx === 14 ? 0.6 : 0.42;
    playSnare(tt, fillVol);
    visQ.push({ t: tt, type: "snare" });
  }
  if (
    !cut &&
    drumState?.useFill &&
    (composerState.fills ?? 1) > 0.3 &&
    drumState.fillHat?.[sIdx] &&
    !hp?.[sIdx]
  ) {
    playHat(tt, sIdx === 15, sIdx === 15 ? 0.9 : 0.58);
    if (sIdx === 15 && (track.genre === "trap" || track.genre === "jerk")) {
      playHat(tt + s16 / 3, false, 0.5);
      playHat(tt + (2 * s16) / 3, false, 0.68);
    }
  }
  /* Bass Brain: planned relationship to the actual kick, chord and phrase. */
  if (
    bassEvent &&
    !cut &&
    D.bass > 0
  ) {
    const bm = bassMidiForEvent(track, bar, bassEvent),
      btt = bassEvent.linked && kickNow
        ? ktt + 0.012
        : tt + (bassEvent.micro || 0) * s16,
      bdur = s16 * bassEvent.durSteps,
      bassType = activeBassType;
    if (bassType === "808")
      play808(
        btt,
        bm,
        bdur,
        bassEvent.slide && track.lastBass != null ? track.lastBass : null,
        bassEvent.velocity,
      );
    else if (bassType === "deepSub" || bassType === "sub")
      playDeepSub(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "silk") playSilkSub(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "pulse") playPulseBass(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "round") playRound(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "reese") playReese(btt, bm, bdur, false, bassEvent.velocity);
    else if (bassType === "hollow") playReese(btt, bm, bdur, true, bassEvent.velocity);
    else if (bassType === "rubber") playRubber(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "growl") playGrowl(btt, bm, bdur, bassEvent.velocity);
    else if (bassType === "pluck") playPluckBass(btt, bm, bdur, bassEvent.velocity);
    else playBass(btt, bm, bdur, bassEvent.velocity);
    track.lastBass = bm;
  }
  /* harmony — voice-led, scaled by section */
  if (D.harm > 0 && !cut) {
    const padType = track.padRole || track.padType || g.pad,
      padTimbre = track.padTimbre || "keys";
    if (padType === "stab") {
      if (
        sIdx % 4 === 2 &&
        seededUnit(track.seed, `pad-stab:${bar}:${sIdx}`) < 0.85 * D.harm
      ) {
        playStab(tt, voiceChord(deg), padTimbre);
        visQ.push({ t: tt, type: "stab" });
      }
      if (sIdx === 0 && bar % Math.max(1, track.chordBars || 2) === 0) {
        visQ.push({ t: tt, type: "chord" });
        for (let i = 0; i < 8; i++) faderTarget[i] = R(0, 1);
      }
    } else if (sIdx === 0 && bar % Math.max(1, track.chordBars || 2) === 0) {
      const notes = voiceChord(deg);
      const chordDur = spb * 4 * Math.max(1, track.chordBars || 2),
        dur = sect === "break" ? chordDur * 1.1 : chordDur * 0.95; // pads breathe in the breakdown
      padType === "keys"
        ? playKeys(tt, notes, dur, padTimbre)
        : [
              "chorus",
              "strings",
              "shadow",
              "choir",
              "air",
              "glass",
              "fm",
              "neon",
            ].includes(padType)
          ? playAltPad(tt, notes, dur, padType, padTimbre)
          : playPad(tt, notes, dur, padTimbre);
      visQ.push({ t: tt, type: "chord" });
      for (let i = 0; i < 8; i++) faderTarget[i] = R(0, 1);
    }
  }
  /* section dramaturgy: riser into a drop, impact on the downbeat.
     Only for genres where a build-up is idiomatic — a crash in lo-fi
     or boom bap would be costume jewelry. */
  if (
    sIdx === 0 &&
    /house|garage|drum n bass|dubstep|trap|jerk|afrobeats/.test(track.genre)
  ) {
    const info = sectionInfoAt(bar);
    const nxt = track.sections?.[info.index + 1];
    if (!cut && info.left === 1 && nxt && /main/.test(nxt.name))
      playRiser(tt, spb * 4);
    if (info.pos === 0 && /main/.test(info.name) && info.index > 0) {
      const prev = track.sections[info.index - 1];
      if (prev && (prev.name === "break" || prev.name === "intro"))
        playImpact(tt);
    }
  }
}
