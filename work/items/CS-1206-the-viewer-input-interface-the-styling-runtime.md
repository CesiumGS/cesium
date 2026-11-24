---
id: CS-1206
title: The viewer-input interface the styling runtime reads
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [packages/core/src/**, packages/core/DESIGN.md, test/**]
---

> **Proposal.** Source: `docs/design/styling-runtime.md` (CS-1146, merged a2f2493930), section 13's list, relayed by orch-11 (2026-11-24). Why now: the public API and the seams freeze at beta.1 (CS-531), and the note's section 11 names this as one of four shapes 2.0 must reserve before then; none of the runtime needs to exist. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The viewer-input declaration (name, type, unit, rate, cadence, CPU or GPU side) is a typed interface, per the note's section 4.3.
- Its first entries are declared: the camera, terrain heights and gradients, time, view scale and the per-feature state columns (CS-338).
- Terrain as an input has a sampling call the job system can serve.
- It carries a version, additive minors and refusal by name, like the plan format (note section 8).
