---
id: CS-576
title: "Spike: B-rep tiles as NURBS or pre-split Bézier patches, and a way to read USD's B-reps"
kind: work
state: planned
created: 2026-11-17
project: CS-193
needs: [CS-299]
touches: [packages/next/spikes/**]
tier_override: 3
---

The owner answered CS-299 on 2026-11-18: spike first. Two questions from `docs/design/breps-and-geometry-queries.md`'s open list need data before they're decided:

- **Storage:** NURBS in tiles, split on the client, or pre-split Bézier patches in the tiles. Measure file size against loader and GPU work, on real trimmed models (the NIST STEP samples the setup store already has).
- **USD input:** a way to read USD's B-reps without building OpenUSD for WebAssembly, which the note judges large and risky but nobody has tried. Try at least one path and measure it. This is the same question as USD as a content source (CS-559, under the seam CS-552), so it reports to both.

The extension's name stays a draft (`BENTLEY_brep`) until this is in.

It's a decision tool (the project's rule for spikes): the spike page or report states the data used, the settings, the costs measured, the A/B comparison, and the decision it puts to the owner, not just controls.

## Done when

- Both storage forms are measured on the same models: bytes per tile, client decode and split time, and GPU tessellation time, with the run IDs and the machine.
- At least one USD input path is tried, with its size, its build and its limits, and what not building OpenUSD gives up.
- A decision item is filed for the owner with the options, the measurements and a recommendation, and CS-304's approach follows its answer.
