A.R.I. radar final

Upload/overwrite exactly these 2 files in GitHub:
- ari-radar-v209.js
- sw.js

Do NOT change index.html. It already loads ari-radar-v209.js.

Then Ctrl+Shift+R once.

What this fixes:
- the old 4.2s radar RAF is cancelled before it can run
- one persistent 6.5s sweep controls both arm and blips
- the 900ms Live Signal re-render no longer resets the sweep
- the duplicate legacy pink dot style is overridden
- sw.js uses cache ari-v212 so the old radar file is not served from ari-v207 cache
