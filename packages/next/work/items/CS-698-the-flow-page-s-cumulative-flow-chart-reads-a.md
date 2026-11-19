---
id: CS-698
title: The Flow page's cumulative flow chart reads a day in a hover card, with each stage's count and its change from the day before
kind: work
state: planned
created: 2026-11-19
project: CS-18
needs: [CS-696]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts]
---

The owner, 2026-11-18: "on the flow page, the big day by day graph needs a hover over instead of that lame text at the bottom when the crosshair is aiming, and it should help understand the day to day change too, maybe deltas per stage?" The chart is `FlowChart` in `bench/suite/views/Work.tsx`, the cumulative flow diagram over `flowOf`'s days; today hovering moves a crosshair and writes the day's counts as a line of text under the chart. Queued after the shared hover card (CS-696) so it uses that card.

## Done when

- Hovering or focusing a day shows a hover card beside the crosshair (CS-696's component), never covering the band under the pointer, and the text line under the chart is gone.
- The card names the day and lists each stage in the chart's stacking order, with its color swatch, its count, and its change from the day before (for example "Ready 14 (+3)", "Blocked 9 (−2)"), with the total and its change; zero changes are shown quietly, and the largest changes stand out.
- It says what moved where it can be told: items that finished that day, and items that entered or left a stage, a few by name with "+N more", each opening its pane.
- Arrow keys step through the days with the card following; Escape hides it.
- Tests in `test/dynoWork.test.ts` cover the per-stage deltas, the first day (no day before), and days with no change.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console.
