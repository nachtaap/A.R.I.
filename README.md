# A.R.I. — Audiological Roaming Intelligence

A.R.I. is a minimalist generative street-music web experience: an isometric neon android roams the grid with a portable synth rig and builds every track live in the browser.

**Live demo:** https://nachtaap.github.io/A.R.I/  
**Best experienced with sound on.**

> **Unofficial fan tribute.** A.R.I. is inspired by ARIatHOME, the NYC street musician and streamer. It is not affiliated with, endorsed by, or connected to ARIatHOME. No recordings, samples, footage, names or likenesses from ARIatHOME are used. All music and visuals in this project are generated or drawn by the project itself.

## How it works

There is no playlist behind the interface. A.R.I. synthesizes the music with the Web Audio API and coordinates a small ensemble of musical systems: drums, bass, harmony, melody, vocals and arrangement.

Every track is generated from a deterministic seed and develops through sections, motifs, fills, harmonic context and call-and-response. Guests can arrive, request a style and temporarily become part of the performance.

The visual world is procedural SVG line art. The rig, keys, speakers, street signs, guests, weather, expressions and small stage details react to what the music engine is doing.

A.R.I. itself is the play/pause control. Click or tap the robot to start, pause or resume. The Space key does the same thing.

## Music Engine II

Version 108 starts a new phase of the generator: **genre identity is moving from preset selection to composition grammar**.

Instead of treating a genre as mostly BPM, drums and synth choice, Music Engine II lets a genre define its own:

- rhythmic language;
- harmonic behavior;
- phrase structure;
- arrangement style;
- density and evolution;
- sound palette;
- micro-details;
- performance character.

The first two pilot worlds are deliberately very different from one another.

### Dark Techno

Dark Techno is designed around pressure, repetition, texture and long-form development rather than constant harmonic movement.

Its first substyles are:

- hypnotic;
- industrial;
- acid;
- dub techno;
- warehouse.

Tracks can vary in evolution speed, pressure, space, metallic character, repetition, melodic density and grit.

The engine favors a tight four-on-the-floor foundation, restrained melodic material, longer harmonic memory and evolving timbre. Additional synthesized low-frequency rumble gives the kick more physical depth without relying on prerecorded material.

### Oldschool Hip Hop

Oldschool Hip Hop becomes a full musical world of its own rather than just another boom-bap variation.

Its first substyles are:

- golden age;
- dusty;
- jazzy;
- east coast;
- basement.

Tracks can vary in dust, human feel, chopping behavior, jazz influence, pocket, melodic density and grit.

The rhythmic engine deliberately allows a looser pocket, late snares and displaced hats. Harmony moves more slowly, phrases are given more room to recur, and synthesized tape-like keys, dust and scratch gestures create a crate-digging feel without using samples.

## Track DNA

Music Engine II introduces persistent **Track DNA** for its pilot genres.

A track receives a small set of musical character values when it is created. Those values stay with the track and influence many decisions at once.

That means two Dark Techno tracks can share a genre while still feeling fundamentally different: one may be sparse, hypnotic and spacious, while another is industrial, dense and metallic.

Likewise, one Oldschool Hip Hop track can lean dusty and loose while another is cleaner, jazzier and more melodic.

The goal is variation at the level of the **song identity**, not just random variation inside individual bars.

## Ensemble brains

A.R.I. coordinates several musical systems:

- **Drum Brain** — pocket, fills, ghost notes, velocity and rhythmic memory;
- **Bass Brain** — low-end arrangement, chord awareness and kick relationship;
- **Melody Brain** — motifs, phrase memory, contour and harmonic targets;
- **Vocal Brain** — rap, hooks, ad-libs and phrasing;
- **Composer Brain** — section roles, density and call-and-response.

Music Engine II sits above those systems. It does not replace them; it gives them a more genre-specific musical language.

## Guests and voices

Guests arrive with their own hidden personality profile, or **Guest DNA**, which can influence tempo, scale, density, gear and musical behavior.

Mic guests keep one stable voice identity across speech and performance. Voice families vary register, body, consonants, ambience and articulation.

Rap and sung hooks are treated differently: rap stays dry and rhythmic around a small tonal pocket, while hooks receive longer vowels, vibrato and more space.

Guests can also perform on synthesized instruments such as sax, flute, acoustic guitar, electric guitar, violin and e-violin.

## Echoes

The pink heart remembers the current track locally in the browser.

Remembered tracks become **Echoes**. Future tracks in the same genre can occasionally inherit and mutate parts of an Echo, including musical DNA, gear, BPM area, progression or rhythm.

Nothing is uploaded and no account is required.

## Hidden track details

The visible player stays deliberately minimal.

A hidden technical/details view is still available by pressing and holding the track name:

- long touch on mobile;
- long left-mouse press on desktop.

## Other details

- NYC weather is shown quietly beneath the header.
- Street names follow the perspective of their projected signs.
- The rig has a fictional battery level and occasional battery-swap intermissions.
- Wide desktop layouts include a fictional reactive street chat.
- Each track gets generated Media Session artwork for the browser or lock screen.
- A rare reverse-camera shot reveals fictional cameraman robot **Dill-2000 (model Z)**.

## Running locally

There is no build step.

Open the project from a local web server, for example:

```bash
npx serve .
```

For PWA features such as the service worker and wake lock, use HTTPS or localhost.

## Version history

### Version 108 — Music Engine II

- Introduced genre-specific composition grammar as a new layer above the v107 ensemble engine.
- Added **Dark Techno** as a full genre with hypnotic, industrial, acid, dub techno and warehouse substyles.
- Added **Oldschool Hip Hop** as a full genre with golden age, dusty, jazzy, east coast and basement substyles.
- Added persistent Track DNA for the two Music Engine II pilot genres.
- Added techno-specific pressure, long-form repetition and synthesized low-end rumble.
- Added a more human oldschool hip-hop pocket with late snares, displaced hats and slower harmonic movement.
- Added synthesized dust and scratch-style micro-details without introducing prerecorded samples.
- Improved long-press handling on desktop so a held left-mouse click on the track name matches long-touch behavior on mobile.
- Updated the portable service-worker cache.

### Version 107 — ensemble composition, distinct voices and cleaner UI

- Rebuilt the musical core around coordinated **drum, bass, melody, vocal and composer brains**, with section-aware energy, harmonic context, phrase roles and real call-and-response.
- Expanded rhythm, bass and arrangement behavior so genres differ in pocket and development rather than only tempo and sound choice.
- Reworked mic synthesis around four persistent guest voice families: chest, velvet, grit and airy.
- Separated rap delivery from sung hooks.
- Gave A.R.I. a dedicated electronic vocal signature and reduced echo density, level jumps and mobile audio load.
- Added subtle, infrequent weather typography tied to current conditions.
- Corrected street-sign typography so names are centered, fitted and parallel to the projected sign outlines.

### Earlier versions

Earlier releases introduced deterministic track seeds, Guest DNA, Echoes, expanded substyles, generative instruments, Media Session artwork, the reactive street chat, battery swaps, live weather and the evolving procedural street scene.

## License

Code: MIT. See `LICENSE`.
