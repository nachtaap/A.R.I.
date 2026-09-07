# A.R.I. v112 verification

Tested 7 September 2026 against the original public v108 experience and the
local v112 checkout, using Chrome browser interactions.

## Browser checks completed

- Original: start by clicking A.R.I.; open and close track details; remember a
  track; change theme; observe automatically progressing tracks and street chat.
- v112: the first screen retains the original composition, with no new visible
  control bar, cards or explanatory overlays.
- Click three rig keys: notes enter the current phrase without pausing. The
  hidden inspector reported **3 touches, 3 notes remembered, 1 reply**; the
  browser logged the scheduled response at a bar boundary.
- Enter on A.R.I. starts, pauses and resumes. The accessible state updates to
  reflect each state.
- Keyboard activation exercises the four percussion voices and record scratch.
  The interaction status changes and playback continues.
- The hidden inspector reported **audio signal present** from the real Web Audio
  graph. This verifies generated signal, not a subjective listening assessment.
- The heart changes to its remembered state with `aria-pressed=true`.
- Space on the track-title control opens details without also pausing audio.
  Escape closes details and `aria-expanded` returns to false.
- The details drawer opens and closes in a 390 × 720 iframe viewport. The mobile
  first screen was visually checked for clipping. This is responsive Chrome
  coverage, not iOS-device emulation.
- The existing theme control was exercised in v112.
- No application JavaScript errors were observed. The browser environment
  emitted unrelated extension-metadata errors from a chrome-extension URL.

## Static checks

- All four inline script blocks and the three application/service-worker script
  files parse successfully.
- The manifest remains valid JSON; its relative id, start URL and scope are
  unchanged.
- The new script is included in both the HTML and service-worker shell.
- The existing engine is preserved; changes to its source are restricted to
  carrying musical memory and guarding keyboard shortcuts.

## Limits

- No physical iPhone/Safari, Home Screen install, lock-screen audio, or offline
  update migration was exercised.
- The rare reverse-camera event, full battery-swap cycle and actual external
  ARIatHOME-live takeover were not forced in browser tests. Their existing code
  is retained, and new instrument input is guarded during those states.
- Echo inheritance is probabilistic; persistence code was reviewed, but a later
  randomly inherited phrase was not observed end-to-end.
- Musical taste, mix quality and long-session fatigue still need listening on
  real speakers/headphones.

No changes have been published to the existing live GitHub Pages app.
