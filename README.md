# A.R.I. — Audiological Roaming Intelligence

A minimalist generative street-music web experience. An isometric neon android roams the grid with a wearable synth rig, building music on the spot. Strangers can step in, request a direction and add a voice or instrument of their own.

**Live demo:** https://nachtaap.github.io/A.R.I./  
**Best experienced with sound on.**

![A.R.I. preview](icon-512.png)

> **Unofficial fan tribute.** A.R.I. is inspired by ARIatHOME and the idea of spontaneous street collaboration. It is not affiliated with, endorsed by, or connected to ARIatHOME. No recordings, samples, footage, names or likenesses from ARIatHOME are used. All audio is synthesized live in the browser and all visuals are original line art.

## The idea

A.R.I. is not a playlist and not a DJ simulation.

Every track starts from nothing. The browser synthesizes drums, bass, harmony, melody, voices and small details in real time. The point is the same creative constraint that makes live improvisation interesting: **make a musical decision, commit to it, layer something onto it, and keep moving.**

A.R.I. can sound polished, but it should never feel pre-rendered.

## Music Engine II — Street Improv Engine

Version 108 rebuilds the genre system around an origin-first live-improv workflow.

Instead of treating a genre as a preset containing a BPM and a few sounds, A.R.I. now resolves a musical request into several layers:

**request → genre family → composition grammar → patch bank → Track DNA → live-loop arrangement**

That makes it possible to expand to hundreds or thousands of musical directions without maintaining hundreds of separate generators.

### Requests, not preset islands

The v108 catalog contains more than 250 canonical genres and subgenres across hip-hop, R&B, soul, funk, house, techno, garage, drum & bass, breaks, bass music, trance, afro styles, reggae and dancehall, Latin styles, jazz, ambient, pop, rock and experimental music.

Those canonical styles combine with production and performance identities such as:

- raw
- dusty
- warm
- dark
- deep
- soulful
- minimal
- hypnotic
- spacious
- street
- late-night
- futuristic
- polished

The result is already more than 2,000 resolvable style identities, while the resolver itself is designed to accept new requests without requiring a new music engine for every label.

A.R.I. therefore understands the difference between, for example:

- golden-age hip-hop and modern drill;
- G-funk and Memphis rap;
- neo-soul and new jack swing;
- Detroit, hypnotic, industrial, acid and dub techno;
- jungle, liquid DnB, techstep and neurofunk;
- 2-step, speed garage and UK funky;
- amapiano, gqom and afrobeats;
- roots reggae, dub and dancehall;
- trip-hop, IDM and dark ambient.

The goal is not to claim that a short procedural performance can reproduce every historical nuance of every genre. The goal is for the **musical rules themselves** to move in the right direction instead of only changing the label.

## Built like a live performance

Music Engine II deliberately works more like a musician operating a compact live rig.

### Patch bank

A genre request chooses a compatible sound world quickly. Warm styles lean toward rounded drums, tape keys and softer basses. Dark electronic styles can pull harder drums, reese-like basses, shadow pads and darker leads. Digital and high-energy styles reach for cleaner or more synthetic patches.

This builds on the existing Guest DNA and gear system instead of replacing it.

### Live-loop form

Tracks are arranged as if a loop is being constructed and developed in real time.

Hip-hop, R&B, soul, funk and jazz tend to build around compact four- and eight-bar ideas. House, techno, trance and ambient styles can hold musical material longer and develop through density, timbre and pressure. Breakbeat families have their own shorter, more active phrase behavior.

The same motif can return several bars later with a changed ending instead of the melody generator constantly inventing unrelated notes.

### Small overdubs

A.R.I. now adds sparse synthesized micro-overdubs: tiny percussive, tonal, dusty, airy or metallic details that appear around an established loop.

They are deliberately quiet and infrequent. Complexity should feel accumulated rather than switched on all at once.

There are still **no prerecorded loops or sample packs**.

## Track DNA

Every v108 track receives a persistent musical identity.

Track DNA includes characteristics such as:

- family
- era
- flavour
- loop length
- machine versus human feel
- syncopation
- density
- repetition
- melodic activity
- space
- grit
- overdub activity

These values influence multiple brains at the same time.

Two tracks can therefore both be Dark Techno while one is sparse, hypnotic and spacious and the other is harder, metallic and dense. Two old-school hip-hop tracks can share the same broad grammar while differing in swing, dust, melody, patch choice and phrase repetition.

## Ensemble brains

The v107 ensemble remains the musical core:

- **Drum Brain** — pocket, ghost notes, fills, velocity and memory;
- **Bass Brain** — low-end arrangement, harmony and kick relationship;
- **Melody Brain** — motifs, phrases, contour and harmonic targets;
- **Vocal Brain** — rap, hooks, ad-libs and phrasing;
- **Composer Brain** — section roles, density and call-and-response.

Music Engine II sits above these systems and tells them **how this musical world behaves**.

## Guests

Guests arrive with their own hidden Guest DNA and can influence tempo, scale, density, gear and performance.

Most guests use the mic, but synthesized instrumental guests can also play sax, flute, acoustic guitar, electric guitar, violin or e-violin.

Mic guests keep a stable voice identity across speech and performance. Rap and sung hooks use different articulation rules: rap is drier and rhythm-first, while hooks can sustain vowels, harmonies and space.

## Echoes

The pink heart remembers the current track locally in the browser.

Remembered tracks become **Echoes**. A later track in the same genre can inherit and mutate part of an Echo — its musical DNA, BPM area, gear, progression or rhythmic character — without becoming a direct replay.

Nothing is uploaded and no account is required.

## Hidden operator view

The visible player remains deliberately minimal.

The technical track view lives in a right-side drawer.

- Tap or click the **track name** once to open it.
- On mobile the details view is fully screen-filling, without an outer border or floating-card shadow.
- Close it with the existing **×** button.
- Desktop users can also press **Escape**.

The track name is a direct action: one tap/click opens the details immediately. Vertical scrolling inside the track details remains available.

## The street

The music lives inside a reactive procedural SVG scene:

- A.R.I. carries a wearable rig with synth controls, speakers and batteries;
- guests walk in and perform;
- NYC-inspired street signs change as the stream moves;
- live weather appears quietly beneath the header;
- the rig occasionally needs a battery swap;
- wide desktop layouts include a fictional reactive street chat;
- a rare reverse-camera shot reveals cameraman robot **Dill-2000 (model Z)**;
- generated Media Session artwork appears on browser and lock-screen players while the on-page player stays minimal.

A.R.I. itself is the play/pause control. Tap or click the robot to start, pause or resume. The Space key does the same thing.

## Running it

There is no build step.

Serve the repository from localhost or HTTPS, for example:

```bash
npx serve .
```

GitHub Pages can host the PWA directly.

## Current version

### Version 108 — Street Improv Engine

- Rebuilt genre handling around reusable **musical grammars** rather than isolated presets.
- Expanded the canonical style catalog to more than 250 genres and subgenres.
- Added a request resolver with more than 2,000 current style identities and room for arbitrary future requests.
- Added family-specific behavior for pocket, repetition, melody density, harmonic pace and arrangement length.
- Added rapid patch-bank selection using the existing v107 gear system.
- Added persistent Track DNA for era, flavour, loop length, human/machine feel, syncopation, density, repetition, melody, space, grit and overdub activity.
- Reworked melodic behavior toward loop recall and small phrase transformations.
- Added sparse synthesized micro-overdubs so detail accumulates around a loop instead of every layer starting at once.
- Added extra low-frequency depth to appropriate techno material without samples.
- Weighted random style selection toward the rap, singer, soul/R&B and flexible electronic territory at the center of the street-improv concept while keeping the long tail available.
- Replaced the hidden track-title long press with a right-side details drawer opened by a normal tap/click on the track name; the close button or Escape closes it.

### Version 107 — Ensemble composition

- Rebuilt the musical core around coordinated drum, bass, melody, vocal and composer brains.
- Added section-aware energy, harmonic context, phrase roles and call-and-response.
- Expanded rhythm, bass and arrangement behavior.
- Reworked guest voices into persistent chest, velvet, grit and airy families.
- Separated rap delivery from sung hooks.
- Improved weather typography and street-sign alignment.

### Earlier versions

Earlier releases introduced deterministic track seeds, Guest DNA, Echoes, expanded genre substyles, synthesized guest instruments, Media Session artwork, reactive street chat, battery swaps, live weather and the evolving procedural street scene.

## License

Code: MIT. See `LICENSE`.

- Tightened the real-ARI takeover composition: symmetric comic burst with a clear top spike, black keyline, reduced copy, and a cleaner hover state on the live button.

- Reworked the ultra-rare M.A.R.C. cameo into a fever-dream apparition: large translucent spectral presence, chromatic afterimages, drifting aura and subtle scene colour warping instead of a second physical robot standing on A.R.I.'s street plane. Debug trigger: `ARI108.specialEvents.forceMARC()`.

- M.A.R.C. fever-dream events now self-resolve after roughly 25 seconds and pulse in and out while visible instead of lingering until the next track.
- Track details now use a direct toggle interaction: click/tap the track name to open or close, or click/tap outside the drawer to dismiss it.

- Rebuilt M.A.R.C. as an authored full-body animation rather than fast per-limb sine motion. The 34-second choreography uses smooth pose-to-pose transitions, independent shoulder/elbow and hip/knee joints, relaxed drift, slow analogue afterimages, and a long final dissolve. Socks are now subtle lower-leg shapes instead of two bright white lines.

- M.A.R.C. now has his defining shirtless character details: moustache, stylised chest/six-pack outlines and two subtle magenta chest marks.
- After a naturally completed M.A.R.C. apparition, a temporary street-chat aftermath appears with an enthusiastic fan pile-on, then clears itself.

- M.A.R.C. is now tied to the special location **ADULTS ONLY BOATRIDE**. When the rare event rolls, that name appears on the actual street sign for several seconds before he materialises, then the normal location returns.
