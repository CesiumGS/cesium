---
id: CS-568
title: The lod parity page reads the tileset's selection policy where it lives now
kind: work
state: planned
created: 2026-11-17
project: CS-195
touches: [packages/next/parity/lod.ts]
---

The `lod` browser parity suite fails on the main branch, before it measures anything: "Cannot read properties of undefined (reading 'selectCasters')". `parity/lod.ts` (about line 381) reads the tileset's selection policy as `tileset.policy`, but the policy now lives at `tileset.state.policy` (`src/streaming/Tileset3D.ts`). Found by CS-200's executor on 2026-11-17, which patched that line in its working trees just to take its measurement, then reverted it. `packages/next/AGENTS.md` asks for the parity suites whenever rendering changes, so every rendering item meets this until it's fixed.

## Done when

- `node bench/run.mjs lod` runs to the end on the main branch, reading the policy where `Tileset3D` keeps it, without casting through `unknown` to a field that no longer exists.
- A check fails if the page can't find the policy, rather than throwing partway through.
- The `lod` results match what CS-200's patched runs recorded for the base commit (run 2026-11-17T02-17-54-440Z-apple-metal-3), or the difference is explained.
- Run on a server of the executor's own, never the owner's 5190 or 5199.
