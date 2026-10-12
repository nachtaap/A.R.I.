# A.R.I. — Audiological Roaming Intelligence

A generative street-music experience. An isometric neon android roams a procedural street grid, making music while visitors join the performance and a simulated audience reacts.

Tap or click A.R.I. to start or pause. Space does the same when focus is outside an interactive control. Sound requires a user gesture.

![A.R.I. preview](icon-512.png)

> **Unofficial fan tribute.** Inspired by ARIatHOME and spontaneous street collaboration; not affiliated with or endorsed by ARIatHOME. Sound is synthesized in the browser, without streaming recordings or loading external sample packs.

## Current musical foundation

The accompaniment has one authoritative score path:

**genre request → musician profile → ARIComposer → score events → ARIScoreSynth**

- `ari-musicians.js` supplies 20 genre-family profiles: tempo, rhythm grammar, bass and harmony roles, instrument voices, swing and production settings. Despite the filename, this is an active runtime dependency.
- `ari-composer.js` generates a deterministic score from the profile and seed: drums, bass, chords, optional lead and track sections.
- `ari-score-synth.js` renders those events with Web Audio synthesis.
- `ari-score-bridge.js` installs the score into the street runtime and suppresses competing legacy accompaniment while retaining visitors, vocals, interactions and visual events.

The live bridge sets **lead density to zero**. Rhythm, bass and harmony establish the groove; vocals perform around that foundation. A fixed profile and seed reproduce the score, but visitor behaviour and the surrounding street simulation are not wholly deterministic.

## Voices and phrasing

`ari-mini-freestyler.js` and `ari-mini-freestyler-data.js` provide the current Mini-Freestyler vocal path (`mini-1.2`). The data contains performance controls, not source audio.

| Family | Vocal approach |
| --- | --- |
| Hip-hop and trap | Rap prosody: rhythmic phrasing, bounded microtiming, energy emphasis and chord-aware phrase endings |
| Jazz | Continuous legato phrases, transposed from major-based material to a compatible parent major scale |
| Other families | Existing street-runtime vocal and instrument behaviour |

Mini-Freestyler plans phrases in the score's main sections and renders audio in a Web Worker. The main thread schedules prepared buffers against the transport's audio clock. Missing buffers and late vocal events are skipped rather than replayed as a backlog.

Guests have four voice families — **chest, velvet, grit and airy** — with individual register, timbre and phrasing characteristics. A guest keeps its voice identity while present. Microphone guests can take over vocal phrases; A.R.I. can sing when no microphone guest is performing and its singing state is active.

The integration guards against simultaneous legacy vocals in supported genres. Track changes terminate old rendering work and fade active vocal sources. Pause/resume uses AudioContext suspension to preserve playback position, including a sustained phrase.

## Timing and visual feedback

The transport in `index.html` uses an absolute audio clock and sixteenth-note steps. It schedules ahead, skips sufficiently overdue steps, and widens its scheduling window while the page is hidden. Browser background restrictions can still interrupt playback, especially on mobile; continuous background audio is not guaranteed.

Score events and vocals share this transport. Vocal visual cues are queued at their scheduled audio start time. Floating notes identify A.R.I. or a performing guest; paused characters use Z symbols. Note density is capped so fast tracks remain readable.

## Street experience

The runtime includes genre requests, visiting performers, simulated audience chat and reactions, location changes, camera and battery events, and interactive rig gestures. Short-term musical memory and saved track memories use local browser storage.

The public UI shows the current track and genre/key/BPM, plus NYC time and weather when available. Weather uses Open-Meteo; audio synthesis does not require a remote service. Web fonts and weather are separate from the cached application shell.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | SVG scene, public UI, transport, street and audience simulation, legacy audio functions |
| `ari-v108.js` | Genre/style vocabulary and Street Improv extensions |
| `ari-musicians.js` | Active genre profiles and production settings; also contains a street-chat layout adjustment |
| `ari-composer.js` | Deterministic score composition |
| `ari-score-synth.js` | Score-event synthesis |
| `ari-score-bridge.js` | Score integration, accompaniment routing and vocal integration |
| `ari-mini-freestyler-data.js` | Baked rap and jazz performance controls |
| `ari-mini-freestyler.js` | Vocal planning, guest voice identities, worker synthesis and scheduling |
| `ari-discoveries.js` | Interactive rig and street memory |
| `ari-creature-synth.js` | Procedural character-sound synthesis |
| `ari-sound-worlds.js` | Sparse character accents and motif behaviour |
| `ari-beat-foundation.js` | Legacy low-end and drum support, still loaded by the runtime |
| `ari-melody-walk.js` | Optional weighted-walk lead generator |
| `ari-score-bridge-melody-hook.js` | Experimental melody integration; see limitation below |
| `sw.js` | Service worker and versioned application-shell cache |
| `manifest.webmanifest` | PWA identity, scope and icons |

### Remaining technical debt

The optional melody hook expects `ARIScoreBridge.attachScore` and an exposed `indexScore`, while the current bridge exposes `attach` on a frozen API and keeps score indexing internal. Automatic hook installation is therefore not functional as written. The live baseline remains lead density zero; repairing and auditioning optional melody integration is a separate audio change.

Legacy audio functions are interwoven with street behaviour and runtime wrappers. A function being suppressed in score mode is not sufficient evidence that its file can be deleted. Further removal needs dependency tracing and listening checks across genres, guest changes and transport transitions.

## Script order

The loaded scripts at the end of `index.html` are:

```html
<script src="./ari-composer.js"></script>
<script src="./ari-musicians.js"></script>
<script src="./ari-score-synth.js"></script>

<script src="./ari-v108.js"></script>
<script src="./ari-discoveries.js"></script>
<script src="./ari-creature-synth.js"></script>
<script src="./ari-sound-worlds.js"></script>
<script src="./ari-beat-foundation.js"></script>

<script src="./ari-mini-freestyler-data.js"></script>
<script src="./ari-mini-freestyler.js"></script>
<script src="./ari-score-bridge.js"></script>
<script src="./ari-melody-walk.js"></script>
<script src="./ari-score-bridge-melody-hook.js"></script>
```

Load vocal data before the vocal engine. The score bridge loads after the runtime extensions and installs after their synchronous wrappers have run.

## Running locally

There is no build step or package installation required. From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. For a hosted installation, serve the same files over HTTPS, for example with GitHub Pages.

The current runtime registers its service worker only on HTTPS. Local HTTP is useful for uncached development, but does not exercise PWA installation or offline caching.

When application-shell files change:

1. Update the shell list in `sw.js` if files were added or removed.
2. Increment its `ari-v…` cache identifier.
3. Verify the deployed app after the updated worker has activated, then check an offline reload.

All currently loaded local scripts belong in the shell. Old versioned A.R.I. caches are removed when the new worker activates.

## Development priorities

Preserve the groove, genre identity and current vocal phrasing. Keep audio generated locally. Changes to timing, vocal ownership, worker lifecycle or accompaniment routing need listening checks, including pause/resume, guest arrival/departure and track transitions. Keep the scene and interactions intact when working on the music engine.

## License

Code: MIT. See `LICENSE`.
