---
id: CS-706
title: Dyno's viewer starts drawing within half a second on a cold browser again
kind: work
state: planned
created: 2026-11-19
project: CS-389
touches: [packages/next/bench/suite/**, packages/next/widgets/**, packages/next/src/frames/**, packages/next/scripts/**]
---

The owner, 2026-11-19: "A cold browser loading http://127.0.0.1:5190/#/viewer shows a black screen and the loading indicator for several seconds before the viewer starts rendering, that used to be less than 500ms, what's changed?" A first probe by the chief of staff the same day (fresh Edge profiles, no cache, three runs against 5190 at 52d8ff1545) saw the progress bar leave at 1.3 s, 1.6 s and 2.0 s, not the owner's several seconds, but well above 500 ms:

- 545 module requests (364 engine, 124 dependencies, 34 Dyno, 18 widgets), finishing at 1.0 to 1.3 s;
- then engine start, which fetches the reference-frame data (EOP-All.csv, the DE440 planet and Moon packs), **each one twice**;
- every Dyno page also asks for the Work board on load (the rail's count, `useWork` in `shell.tsx`), and that request takes 12 to 14 s on 5190 (CS-704 and its widening). It didn't block Vite in the probe, but it runs several hitld processes and git scans while the page loads.

What changed is not known yet.

## Done when

- The time from navigation to the first drawn frame on a cold browser is measured as a Dyno run (`packages/next/AGENTS.md`; measure in Dyno, read the time series), on the owner's kind of browser, at main's tip and at commits back to when it was under 500 ms, and the commit or commits that slowed it are named with their share.
- The causes found are fixed, or each is explained with what fixing it would cost and sent back as a decision. The duplicate reference-data fetches are gone, and the viewer doesn't wait on, or compete with, the Work board's read.
- A regression check holds the cold start to a stated budget from here on.
- Checked on a server of the executor's own, never the owner's 5190.
