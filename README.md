# A.R.I. — Audiological Roaming Intelligence

A minimalist, generative street-music web experience. An isometric neon android
roams the grid with a wearable synth rig, building beats on the spot. Every now
and then a guest steps up on A.R.I.'s right side, requests a genre — and adds a
voice, instrument, or personality of their own.

**Live demo:** https://nachtaap.github.io/A.R.I./  
**Best experienced with sound on.**

![A.R.I. preview](icon-512.png)

The core experience lives in a single `index.html`: no build step, no audio
samples, and no runtime JavaScript framework. The music is synthesized live in
the browser.

## ⚠️ Disclaimer

**This is an unofficial fan tribute inspired by [ARIatHOME](https://www.youtube.com/@ARIatHOME),
the NYC street musician and streamer.** It is not affiliated with, endorsed by,
or connected to ARIatHOME in any way. No music, recordings, samples, footage,
names, or likenesses from ARIatHOME are used — all audio is synthesized live in
the browser with the Web Audio API, and all visuals are original line art.

If you enjoy this, go watch the real thing. It's better.

## How it works

### The scene

The world is procedural SVG line art in an isometric projection: A.R.I. wears
headphones and a headset mic, carries a backpack with batteries, CPU and
speakers, and performs from a connected synth / loopstation flightcase with
keys, pads, faders, jog wheel and a small corner monitor.

The scene reacts to the stream instead of merely illustrating it. Keys light up,
the jog wheel turns, speakers throw floating music notes, A.R.I. changes
expression, guests walk in and perform, and the city sign changes as the crew
roams to a new block.

A.R.I. itself is the play/pause control. Tap or click the robot to start, pause,
or resume. While paused, A.R.I.'s eyes flatten into sleepy lines and lowercase
`z` characters float above the head using the same rise-and-fade animation as
the music notes.

### The music

Every track is generated from scratch with the Web Audio API. There are no
samples or prerecorded loops.

The current generator is organized as a small ensemble of cooperating musical
systems: drum, bass, melody, vocal and composer brains. They share section,
harmony and phrase context, so fills lead into drops, bass follows both kick and
chords, and call-and-response leaves deliberate space instead of stacking every
voice on every beat.

A track chooses a genre — **boom bap, trap, jerk, drum n bass, 2000s rnb, house,
UK garage, lo-fi, afrobeats, dubstep, or downtempo** — plus its own BPM, root,
scale, chord progression, arrangement, drum patterns, swing, bass behavior,
harmony, lead voice and effects. Tracks usually run for roughly one to three
minutes and use several arrangement shapes rather than repeating one fixed
intro → verse → breakdown template.

**Every genre now has its own family of substyles**, not just drum n bass. Drum
n bass still has ten (classic, rolling, jump up, liquid, techstep, early snare,
jungle, dotted, minimal, halftime); boom bap, trap, jerk and 2000s rnb each get
four or five of their own — dusty and jazzy boom bap, drill and triplet trap,
hyphy and ratchet jerk, Neptunes- and Timbaland-flavored rnb, and more. The
newer genres bring theirs too: UK garage (2-step, 4×4, speed garage, future),
lo-fi, afrobeats (including amapiano and afro house), dubstep (halftime, riddim,
brostep) and downtempo (trip-hop, ambient, dub). Each substyle changes the
kick/snare relationship, ghost notes, hats, swing, bass, harmony and timing —
and a two-bar loop keeps the pattern moving from one bar to the next — rather
than only changing the label.

The scheduler runs from an absolute audio clock. While the tab is hidden, A.R.I.
pre-schedules a larger window directly onto the Web Audio thread, so the groove
can continue without the usual background-tab stutter or timing drift.

### Guest DNA and sonic personality

Every guest receives a hidden eight-part personality profile:

- energy
- warmth
- darkness
- complexity
- curiosity
- chaos
- space
- confidence

That **Guest DNA** is not displayed as a stat sheet. It quietly changes the
music. It can influence tempo, scale choice, density and the gear A.R.I. reaches
for: drum machine, bass synth, pad, lead voice and effects rack.

The gear system contains families of warm, dark, clean, digital, hard and
slightly broken sounds. A warm guest may pull a track toward tape keys, rounded
bass and soft space; a darker guest can steer it toward reese bass, shadow pads
and filtered effects. The result is a guest with an audible personality, not
just a different color and hat.

Every track is also generated from an internal deterministic seed. The seed,
generator version and full musical recipe stay attached to the track, which
makes the memory system below possible.

### Guests and instruments

Guests arrive at random with generated height, build, color, hair/headwear,
stance and voice character. The interaction stays intentionally short: the guest
requests a genre, A.R.I. answers, and the music takes over.

Mic guests keep one stable voice identity across speech and performance. Four
voice families — **chest, velvet, grit and airy** — vary register, harmonic
source, vocal-tract shape, body, consonants and ambience. Rap uses a restrained
two- or three-tone chord pocket with dry, rhythmic articulation; hooks open into
longer vowels, breath, vibrato and melody. A.R.I. keeps a separate electronic
pulse signature during call-and-response.

Most guests perform on the mic. Occasionally they play:

- sax
- flute
- acoustic guitar
- electric guitar
- violin
- e-violin

These are not all the same oscillator with a different name. Each instrument has
its own synthesis path and articulation: breath noise for flute, filtered
saw-like resonance for sax, plucked envelopes for acoustic guitar, oversampled
distortion for electric guitar, bowed-style vibrato for violin, and a wider,
delay-heavy voice for e-violin.

A guest always holds the mic with one hand. The free arm can rest, move slowly,
or react to the beat. Guests stay for at least one full track before wrapping
up, and may leave with an entirely fictional “follow me on…” shout-out. Very
rarely, a second guest joins and a cypher forms.

### Remembering tracks: the pink heart and Echoes

The glowing pink heart is A.R.I.'s one-tap **remember this track** action.

When you heart a track, A.R.I. stores the complete musical recipe locally in
your browser: seed, genre, BPM, key, progression, arrangement, Guest DNA, gear,
patterns and sound choices. Nothing is uploaded and no account is required.

Remembered tracks become **Echoes**. A future track in the same genre can
occasionally inherit parts of an Echo — then mutate them. It may keep much of
the original DNA, gear, BPM area, root or progression while changing enough to
become a descendant rather than an exact replay.

Tap the heart again to forget the track.

### Other details worth noticing

- A rare reverse-camera shot reveals the fictional cameraman robot,
  **Dill-2000 (model Z)**.
- Roughly every 10–15 tracks the rig runs out of battery and triggers a short
  battery-swap intermission.
- NYC weather is fetched live from Open-Meteo and shown quietly under the
  header. Weather states have their own restrained color and a very occasional
  typographic signal; reduced-motion preferences are respected. The feature
  fails silently when offline.
- Street names are centered on their isometric signs and follow the projected
  angle of both sign edges, with automatic fitting for longer names.
- The status line also shows the rig's battery level, color-coded from green to
  red.
- Wide desktop layouts include a fictional, reactive **street chat** with
  invented handles and messages. It reacts to new tracks, genres, guests,
  A.R.I.'s vocals and battery swaps.
- Each track gets generated cover art for the browser / operating system
  **Media Session** and lock-screen player. The artwork is intentionally hidden
  from the minimal on-page player.
- A.R.I. occasionally takes the mic too, but short guest interactions and
  musical performance remain the focus.

The speech is [SAM (Software Automatic Mouth)](https://github.com/discordier/sam),
the 1982 C64 speech synthesizer ported to JavaScript by Christian Schiffler
(MIT). It is inlined so the core experience stays self-contained.

## Running it

Open `index.html` in a browser. That's it.

Tap or click **A.R.I.** to start the stream. Tap A.R.I. again to pause or
resume. The **Space** key does the same thing.

For the screen wake lock to work, serve the project over `https` or
`localhost` — for example:

```bash
npx serve .
```

## Installing as an app

Served over HTTPS (GitHub Pages works), A.R.I. is an installable PWA:

- **Android / Chrome:** menu → **Install app** (or use the install prompt).
- **iOS / Safari:** share sheet → **Add to Home Screen**.

The manifest, icons and service worker provide the standalone app identity and
cache the app shell for offline-ish startup.

Keep these files together in the same directory:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-192.png`
- `icon-maskable-512.png`
- `favicon-32.png`
- `favicon-16.png`

## Current version

### Version 107 — ensemble composition, distinct voices and cleaner UI

- Rebuilt the musical core around coordinated **drum, bass, melody, vocal and
  composer brains**, with section-aware energy, harmonic context, phrase roles
  and real call-and-response.
- Expanded rhythm, bass and arrangement behavior so genres differ in pocket and
  development rather than only tempo and sound choice.
- Reworked mic synthesis around four persistent guest voice families: chest,
  velvet, grit and airy. Spoken introductions and musical performances now use
  the same guest identity.
- Separated rap delivery from sung hooks. Rap stays dry and declamatory around a
  small chord-tone pocket; hooks receive sustained formants, breath, vibrato and
  more space.
- Gave A.R.I. a dedicated electronic vocal signature and reduced echo density,
  level jumps and mobile audio load.
- Removed the expandable track-information panel opened by clicking the track
  title, keeping the player deliberately minimal.
- Added subtle, infrequent weather typography tied to the current conditions and
  respectful of reduced-motion settings.
- Corrected street-sign typography so names are centered, fitted and parallel to
  the projected sign outlines.
- Updated the portable service-worker shell and cache to `ari-v83`.

### Version 97 — more genres, substyles for everyone, fuller bass

- Extended the substyle system from drum n bass to **every genre**. Boom bap,
  trap, jerk and 2000s rnb now each have their own family of substyles with
  two-bar variation, ghost notes and swing, so their tracks develop from bar to
  bar instead of repeating one static pattern.
- Added five new genres — **UK garage, lo-fi, afrobeats, dubstep and
  downtempo** — each with its own substyle family, tempo range, drum
  programming, bass and harmony.
- Wired up bass voices that were defined but previously never triggered
  (reese, hollow reese, rubber, growl and plucked / “log-drum” bass), so the
  full bass palette is now audible across all genres.
- Gave each genre its own chord-progression pool and let substyles define their
  own bass-line rhythm, so harmony and groove are no longer one-size-fits-all.
- House was left deliberately untouched; its signature four-on-the-floor already
  did its job.

### Version 96

- Added a real pause/sleep state: A.R.I.'s eyes become two horizontal lines and
  lowercase `z` characters float above the head with the same animation as the
  music notes.
- The remember control is now a pink heart with a matching pink glow.
- Removed a stale `hideTrackFeedback()` call that could interrupt the pause flow
  before the sleep animation started.

### Versions 78–95 — personality, variation and memory

- Added **Guest DNA**, an eight-part hidden personality model that affects BPM,
  scale, density and gear selection.
- Added track-specific gear profiles for drum machines, basses, pads, leads and
  effects, greatly expanding the tonal range without adding samples.
- Moved track generation onto deterministic per-track seeds and attached a
  generator version plus full recipe to every track.
- Added the local **remember** system and **Echoes**: hearted tracks can
  influence future tracks in the same genre through controlled inheritance and
  mutation.
- Expanded drum n bass into ten rhythmically distinct substyles.
- Gave sax, flute, acoustic guitar, electric guitar, violin and e-violin more
  clearly differentiated synthesis and articulation.
- Expanded guest variation with visual archetypes, different body proportions,
  stance, voice character and more natural arm behavior.
- Added generated album artwork for Media Session / lock-screen playback while
  keeping the on-page player minimal.
- Added a fictional reactive street chat on wide desktop screens.
- Made A.R.I. itself the start/play/pause control; no separate playback button
  is needed.
- Continued the headphone-comfort pass with lower lead ranges, run-limited
  melody movement, filtering and oversampled electric-guitar distortion to
  prevent harsh or repetitive high-frequency glitches.

### Version 77

- The cameraman received his own fictional on-screen name:
  **Dill-2000 (model Z)**, matching the disclaimer's no-real-names policy.

### Version 76

- Track info moved into fixed, predictable rows for track number/time, title,
  genre/tempo and guest information. This panel was later removed in version
  107 to restore the minimal player.

### Version 73

- Fixed a rare “dentist drill” glitch by limiting repeated same-direction melody
  movement.
- Added 4× oversampling to electric-guitar distortion to prevent audible
  aliasing on lower notes.
- Made the guest mic permanently cyan so it does not disappear against certain
  outfit colors.
- Expanded the track-name generator with a larger word pool, more phrasing
  shapes and a no-immediate-repeat rule.

### Versions 66–71

- Added NYC's live weather and the rig battery level beneath the header.
- Both fail gracefully or stay unobtrusive when data is unavailable.

### Versions 60–62

- Renamed “visitor” to “guest”.
- Removed distracting beat-pumping arms.
- Increased farewell speech bubbles.
- Made every guest stay for at least one complete track.
- Expanded arrangement, scale, root and progression variety while keeping the
  audio comfort limits intact.
- Rebuilt fictional “follow me on…” handles so they read like usernames rather
  than URLs.

### Versions 36–41

- Fixed the rear speaker to the backpack.
- Added the recurring battery-swap intermission.
- Added the slow-blinking “live from the grid” status LED.
- Added A.R.I.'s happy, surprised, in-the-zone and comically deflated facial
  expressions.

### Versions 18–33

- Adopted hidden-line rendering with painter's-algorithm occluders for a calmer,
  more solid-reading wireframe.
- Added guests' feet and second arm.
- Rebuilt the background-audio lifecycle around a driftless clock.

### Versions 13–17

- Added explicit PWA identity, start URL and scope so the installed app is kept
  separate from unrelated web apps.

### Version 12

- Kept the core kick-and-snare groove alive during breakdowns instead of
  dropping to near-silence.

### Version 11

- Lowered track roots and lead ranges.
- Added a hard lead ceiling and gentle master high-shelf for headphone comfort.
- Corrected flute, violin and e-violin octave behavior.

### Version 10

- Added full track arrangements with section-aware instrumentation.
- Added voice-led chords and root-following bass.
- Added fills and section transitions without introducing harsh “modem” tones.

## License

Code: MIT. The tribute nature of the project (see disclaimer) applies to the
concept and inspiration; everything in this repository is original work.
