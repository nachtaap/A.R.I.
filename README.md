# A.R.I. — Audiological Roaming Intelligence

A minimalist generative street-music web experience. An isometric neon android roams the grid with a wearable synth rig, building music on the spot. Strangers can step in, request a direction and add a voice or instrument of their own.

**Live demo:** https://nachtaap.github.io/A.R.I./  
**Best experienced with sound on.**

![A.R.I. preview](icon-512.png)

> **Unofficial fan tribute.** A.R.I. is inspired by ARIatHOME and the idea of spontaneous street collaboration. It is not affiliated with, endorsed by, or connected to ARIatHOME. No recordings, samples, footage, names or likenesses from ARIatHOME are used. All audio is synthesized live in the browser and all visuals are original line art.

## The idea

A.R.I. is not a playlist and not a DJ simulation.

Every track starts from nothing. The browser synthesizes drums, bass, harmony, melody, voices and small details in real time. The central constraint is simple: **make a musical decision, commit to it, layer something onto it, and keep moving.**

A.R.I. can sound polished, but it should never feel pre-rendered.

## Music Engine II — Street Improv Engine

The v108 Street Improv Engine rebuilt the genre system around an origin-first live-improv workflow.

Instead of treating a genre as a preset containing a BPM and a few sounds, A.R.I. resolves a musical request into several layers:

**request → genre family → composition grammar → patch bank → Track DNA → live-loop arrangement**

The current runtime contains **450 canonical styles** and **3600+ request identities**. These span hip-hop, R&B, soul, funk, house, techno, garage, drum & bass, breaks, bass music, trance, afro styles, reggae and dancehall, Latin styles, jazz, ambient, pop, rock and experimental music.

The goal is not to claim that a short procedural performance can reproduce every historical nuance of every genre. The goal is for the **musical rules themselves** to move in the right direction instead of only changing the label.

## Built like a live performance

Music Engine II deliberately works more like a musician operating a compact live rig.

### Patch bank

A genre request chooses a compatible sound world quickly. Warm styles lean toward rounded drums, tape-like keys and softer basses. Dark electronic styles can pull harder drums, reese-like basses, shadow pads and darker leads. Digital and high-energy styles reach for cleaner or more synthetic patches.

This builds on the existing Guest DNA and gear system instead of replacing it.

### Live-loop form

Tracks are arranged as if a loop is being constructed and developed in real time.

Hip-hop, R&B, soul, funk and jazz tend to build around compact four- and eight-bar ideas. House, techno, trance and ambient styles can hold musical material longer and develop through density, timbre and pressure. Breakbeat families have their own shorter, more active phrase behavior.

Motifs can return several bars later with changed endings or contour instead of the melody generator constantly inventing unrelated notes.

### Small overdubs and effects

A.R.I. adds sparse synthesized micro-overdubs: tiny percussive, tonal, dusty, airy or metallic details that appear around an established loop. Effects are deliberately constrained so they add character without turning the track into a gimmick.

There are still **no prerecorded loops or sample packs**.

## Track DNA

Each track receives a persistent musical identity. Track DNA includes characteristics such as:

- family and era;
- flavour and density;
- loop length and repetition;
- machine versus human feel;
- syncopation and melodic activity;
- space, grit and overdub activity.

These values influence multiple musical systems at once. Two tracks can therefore share a genre while differing in swing, dust, melody, patch choice, repetition and arrangement pressure.

## Ensemble brains

The ensemble core coordinates several musical roles:

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

## The street

The music lives inside a reactive procedural SVG scene:

- A.R.I. carries a wearable rig with synth controls, speakers and batteries;
- rig keys, pads and controls react as part of the performance;
- guests walk in and perform;
- NYC-inspired street signs change as the stream moves;
- live NYC time and weather appear quietly beneath the header;
- the rig occasionally needs a battery swap;
- wide desktop layouts include a fictional reactive street chat;
- a rare reverse-camera shot reveals cameraman robot **Dill-2000 (model Z)**;
- generated Media Session artwork appears on browser and lock-screen players while the on-page player stays minimal.

A.R.I. itself is the play/pause control. Tap or click the robot to start, pause or resume. The Space key does the same thing when focus is not on another control.

## Current interface

The visible interface is intentionally sparse and avoids persistent technical status information that is not useful to the listener.

### Top left

The identity block contains:

- **A.R.I.**
- **Audiological Roaming Intelligence**
- live NYC clock and weather
- **inspired by ARIatHOME**

The tribute uses the same IBM Plex Mono typography and scale as the weather. It receives a restrained neon-yellow accent in dark mode and a darker, higher-contrast yellow in light mode.

No public version number or persistent battery status is shown here.

### Top right

The top-right status area contains **live from the grid** and the light/dark theme control.

Battery level is no longer shown as a permanent UI element. Battery changes remain part of A.R.I.'s runtime behaviour and battery-swap event, but the interface itself stays deliberately minimal.

### Track information

The public track readout is reduced to two lines:

**track title**  
**genre · key · BPM**

Track number, section labels such as `MAIN`, and elapsed track time are omitted. The title and metadata use the same basic text scale; hierarchy comes from weight and colour rather than multiple competing font sizes.

The metadata colour follows tempo: slower tracks stay cooler, while higher BPM values move progressively through warmer hues toward red.

The track title is display-only and has no click, tap or long-press action.

### Hidden operator view

The technical inspector is not part of the public interface. It remains available for development/operator use through **Shift+D** or `?dev=1`.

## Street memory

The `ari-discoveries.js` extension adds interactive rig behaviour and short-term musical memory. Keys make scale-compatible notes, pads add live percussion and the record produces a synthesized scratch. These gestures do not pause the performance.

A short phrase can be answered by A.R.I. at a later bar boundary, leaving room for guests and endings. Remembering the track can carry that small phrase into its existing Echo DNA.

Keyboard access uses Enter/Space and roving arrow-key focus on the instruments. Space on a focused control does not also toggle playback.

## Beat foundation and sound worlds

Additional modules deepen the live synthesis without replacing the core engine:

- `ari-beat-foundation.js` reinforces kick, hats and low-end foundation with synthesized local voices and applies the final lightweight public-interface normalization;
- `ari-sound-worlds.js` supplies generated character voices and unusual timbral material while keeping effects restrained;
- `ari-creature-synth.js` provides additional generated character/creature synthesis;
- all sound remains generated in-browser.

## Running it

There is no build step.

Serve the repository from localhost or HTTPS, for example:

```bash
npx serve .
```

GitHub Pages can host the PWA directly.

The service worker caches the application shell for PWA use. When deploying changed JavaScript, bumping the A.R.I. cache version ensures existing installations pick up the new files.

## Architecture notes

The current experience is layered rather than monolithic:

- `index.html` — core scene, transport, synthesis and base UI;
- `ari-v108.js` — Street Improv Engine and request/style resolver;
- `ari-discoveries.js` — interactive rig and street memory;
- `ari-creature-synth.js` — generated creature/character synthesis;
- `ari-sound-worlds.js` — character casting, sound worlds and restrained effects;
- `ari-beat-foundation.js` — procedural beat/bass foundation plus final public-interface normalization;
- `sw.js` — PWA shell cache and update lifecycle.

## License

Code: MIT. See `LICENSE`.
