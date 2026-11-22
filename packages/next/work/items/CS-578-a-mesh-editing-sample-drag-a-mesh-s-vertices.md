---
id: CS-578
title: "A mesh editing sample: drag a mesh's vertices, edges and faces, beside the CSG sample"
kind: work
state: planned
created: 2026-11-17
project: CS-579
touches: [packages/next/examples/**]
tier_override: 3
needs: [CS-831]
---

The owner, 2026-11-18: a simple mesh editing sample to complement the CSG sample (`examples/csg/`), so a user can drag a mesh's points, edges and faces. The CSG sample edits B-reps through a kernel. This one edits a plain triangle mesh directly, the "CAD-style mesh editing" that `docs/design/editing.md` lists as not yet designed.

It's also evidence for the owner's open decision CS-453 ("What editing should the engine support?"): how often an edited mesh's buffers change, how edited geometry sits beside streamed content, and what the engine's seams (geometry submission, per-draw constants, picking) make easy or hard.

## Done when

- A gallery example loads a mesh and lets the user pick and drag vertices, edges and faces, with a clear mode for each, hover and selection highlights, and undo.
- Edits update the drawn mesh live, smoothly at the sample's mesh sizes, and the sample says what each drag costs (the buffer updates per drag, and the time).
- It uses the public API only. Where it has to reach past it, that's recorded for the API review (`packages/next/AGENTS.md`, "Seams and boundaries").
- A short note for CS-453 records what the sample found about editing in the engine: what worked through the seams, and what didn't.
- The page has its `DESIGN.md`, a UX review on the real page with its findings fixed, and the checks in `packages/next/AGENTS.md` ("UI and examples"): both themes, 380 px wide, keyboard only, reduced motion, a clean console. Run on a server of the executor's own, never the owner's 5190.
