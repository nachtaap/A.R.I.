# A.R.I. — Audiological Roaming Intelligence

A.R.I. is a minimalist generative street-music web experience: an isometric neon android roams the grid with a portable synth rig and builds every track live in the browser.

**Live demo:** https://nachtaap.github.io/A.R.I/  
**Best experienced with sound on.**

> **Unofficial fan tribute.** A.R.I. is inspired by ARIatHOME, the NYC street musician and streamer. It is not affiliated with, endorsed by, or connected to ARIatHOME. No recordings, samples, footage, names or likenesses from ARIatHOME are used. All music and visuals in this project are generated or drawn by the project itself.

## What makes A.R.I. different

There is no playlist behind the interface. A.R.I. synthesizes the music with the Web Audio API and coordinates a small ensemble of musical systems: drums, bass, harmony, melody, vocals and arrangement. Guests can join, request a style and temporarily become part of the performance.

The visual world is procedural SVG line art. The rig, keys, speakers, street signs, guests, weather, expressions and small stage details react to what the music engine is doing.

## Music Engine II — v108

Version 108 starts a new phase of the generator: **genre identity is moving from preset selection to composition grammar**.

The first two pilot worlds are:

### Dark Techno

Dark Techno is no longer treated as house with darker synths. It receives its own composition rules:

- 126–140-ish BPM depending on substyle;
- machine-tight four-on-the-floor foundation;
- long harmonic memory and fewer chord changes;
- pressure and texture development instead of pop-style harmonic tricks;
- restrained melody with recurring motifs;
- substyles for **hypnotic, industrial, acid, dub techno and warehouse**;
- low kick rumble and a stronger sense of physical space;
- Track DNA values for pressure, evolution, space, repetition, metallic character and grit.

The goal is a track that develops through filtering, density, timbre and repetition rather than constantly introducing new musical material.

### Oldschool Hip Hop

Oldschool Hip Hop becomes its own genre rather than merely another boom-bap label. Its grammar emphasizes:

- roughly 82–98 BPM;
- a deliberately human pocket;
- late snares and slightly displaced hats;
- sparse, memorable four-bar ideas;
- restrained chord movement;
- tape-like keys and synthesized crate texture;
- occasional procedural dust and scratch details — still **no samples**;
- substyles for **golden age, dusty, jazzy, east coast and basement**;
- Track DNA values for dust, human feel, chopping, jazz influence, pocket and grit.

This is still the existing A.R.I. synthesis engine underneath. v108 adds a genre-specific layer on top instead of replacing the stable v107 core all at once.

## Hidden track details

The minimal player stays minimal, but the technical track/details screen remains available as a hidden operator view.

- **Touch:** press and hold the track name.
- **Mouse:** press and hold the **left mouse button** on the track name for about 0.6 seconds.

Version 108 uses Pointer Events with pointer capture, so tiny mouse movements no longer cancel the long press. A short click remains a normal short click.

## Other musical systems

A.R.I. still includes:

- coordinated drum, bass, melody, vocal and composer brains;
- deterministic per-track seeds;
- Guest DNA influencing musical personality;
- track-specific gear choices;
- arrangement-aware fills and transitions;
- call-and-response between guest, A.R.I. and instruments;
- locally remembered tracks (“Echoes”) that can influence future descendants;
- synthesized sax, flute, acoustic guitar, electric guitar, violin and e-violin;
- mic guests with persistent voice identities;
- procedural cover art for Media Session / lock-screen playback.

Existing genres remain available and continue to use the v107 engine unless explicitly upgraded by Music Engine II.

## Visual and world details

The scene includes a reactive portable performance rig, generated guests, NYC-inspired street signs, live weather, battery state, rare battery swaps and a fictional street chat on wide screens. A rare reverse-camera shot reveals cameraman robot **Dill-2000 (model Z)**.

A.R.I. itself is the play/pause control. Click or tap the robot to start, pause or resume. The Space key does the same thing.

## Running locally

There is no build step.

For the simplest test, keep the files together and serve the directory over localhost:

```bash
npx serve .
```

Then open the local address in a modern browser.

## Installing as a PWA

When served over HTTPS (GitHub Pages is fine), A.R.I. can be installed as a Progressive Web App.

- **Android / Chrome:** browser menu → Install app.
- **iOS / Safari:** Share → Add to Home Screen.

The service worker caches the app shell for fast startup and limited offline use.

## v108 files

The v108 upload adds one external engine file to the existing project:

- `index.html` — existing main application; add the v108 script tag before `</body>`.
- `ari-v108.js` — Music Engine II pilot genres + desktop/touch long-press fix.
- `sw.js` — cache bumped and `ari-v108.js` added to the app shell.
- `README.md` — this documentation.

Add this line near the very bottom of `index.html`, **after the existing application script and before `</body>`**:

```html
<script src="./ari-v108.js"></script>
```

That load order matters because `ari-v108.js` extends the existing v107 engine.

## Version history

### v108 — Music Engine II

- Added the first genre-specific composition grammars: Dark Techno and Oldschool Hip Hop.
- Added persistent Track DNA for those two musical worlds.
- Added five Dark Techno substyles and five Oldschool Hip Hop substyles.
- Added darker techno pressure/rumble behavior and more human oldschool hip-hop pocket behavior.
- Added synthesized dust/scratch-style micro-details for hip hop without introducing prerecorded samples.
- Kept the stable v107 ensemble engine as the base for all existing genres.
- Fixed the hidden track-details gesture on desktop: long left-mouse press now behaves like long touch.
- Bumped the PWA cache and included the new v108 engine file in the app shell.

### v107 — Ensemble composition

- Coordinated drum, bass, melody, vocal and composer brains around shared musical context.
- Improved call-and-response, phrase roles and section-aware energy.
- Reworked guest voice families and separated rap delivery from sung hooks.
- Kept the visible player minimal while retaining the hidden diagnostic/operator panel.
- Improved weather typography and street-sign alignment.

### Earlier versions

Earlier releases introduced deterministic track seeds, Guest DNA, Echoes, expanded substyles, generative instruments, Media Session artwork, the reactive street chat, battery swaps, live weather and the evolving procedural street scene.

## License

Code: MIT. See `LICENSE`.
