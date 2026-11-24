---
id: CS-1177
title: Why 2.0's GPU-paced frames cost more than 1.x's on melbourne, nyc-buildings and bim-design-model
kind: work
state: planned
created: 2026-11-23
project: CS-198
needs: [CS-1152]
---

> **Committed by the owner (2026-11-23).** Why: CS-1152's proof run (2026-11-24T00-24-34-147Z-mac-apple, Apple M2, token-free scenes) found 2.0 using less CPU time per frame than 1.x in every scene, but costing more per frame in the GPU-paced orbit on three of five scenes. The owner expects 2.0's GPU time per frame to be well under 1.x's. Find out which reading is right before acting on either.

GPU-paced orbit, medians in milliseconds (1.x / 2.0):

| Scene | CPU per frame | GPU per frame | Frame interval |
| --- | --- | --- | --- |
| melbourne | 2.6 / 1.9 | 7.4 / 16.9 | 13.2 / 22.8 |
| nyc-buildings | 1.3 / 0.9 | 17.0 / 18.9 | 14.5 / 23.5 |
| bim-design-model | 1.1 / 1.0 | 18.5 / 15.0 | 15.4 / 19.7 |
| aec-design-site | 10.4 / 3.2 | 25.7 / 24.2 | 32.6 / 34.0 |
| aerometrex-sf | 0.9 / 0.4 | 6.4 / 7.1 | 9.3 / 9.6 |

Two things don't add up yet. 1.x's GPU time on nyc-buildings (17.0) is longer than its whole paced frame (14.5), so WebGL's timer query through ANGLE on Metal may overstate. And 2.0's paced frame on nyc-buildings (23.5) is longer than its CPU and GPU time together (about 19.8), so something outside the timed passes takes time.

The owner's reads (2026-11-23), to check first:

- The sky costs much more in 2.0 than in 1.x, and may be most of the gap on these light scenes.
- The big differences between the engines should show on heavy models, not on these scenes.
- Apple silicon may have problems of its own, so the comparison also needs the RTX machine.

## Done when

- The paced orbit's measurement is checked first: what each engine's GPU timer covers on this Mac, and whether each paced tick waits for the same thing (WebGPU's `onSubmittedWorkDone` against WebGL's fence). Anything that makes the comparison unfair is fixed in Dyno or stated on the Overview.
- The sky's share is measured: each engine's GPU time per frame with its sky on and off, or the sky pass timed alone, on the same scenes.
- Heavier scenes join the comparison: models heavy enough that geometry and draw work, not the sky or fixed passes, dominate a frame. Use scenes from the catalog where they exist; where they don't, add them, with sources whose license allows it.
- The same comparison runs on the RTX machine. Until the device lab (CS-408) lands, the owner runs it there by hand, and the item says which run IDs came from which machine.
- For each of the three scenes, the gap is explained, cited by Dyno run IDs: the part of 2.0's frame that 1.x doesn't pay (passes, resolution, MSAA, HDR, presentation, waiting), and whether the two engines draw the same work at the same settings.
- Each cause is either fixed with a before-and-after GPU-paced run, or filed as its own item.
- The ion scenes get the same comparison once CS-1127 has merged.
