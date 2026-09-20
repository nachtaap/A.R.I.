A.R.I. live cleanup — remove Musician Lab access

Upload/overwrite:
- ari-musicians.js
- ari-musicians-link.js
- sw.js

Then Ctrl+Shift+R once.

Result:
- Shift+M does nothing
- no live-site link to Musician Lab
- musician profiles remain available to the score engine
- street chat compact-layout fix remains
- Musician Lab is now intended to be used from the separate offline package

Note:
musicians.html / musicians.css / musicians-workbench.js may remain in the repo,
but nothing in the live UI links to them. If you want them physically removed
from the repo too, they can be deleted separately later.
