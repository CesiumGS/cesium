---
id: CS-1207
title: A generated batch in the draw-arguments seam
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [packages/core/src/**, test/seams.test.ts, packages/core/DESIGN.md]
---

> **Proposal.** Source: `docs/design/styling-runtime.md` (CS-1146, merged a2f2493930), section 13's list, relayed by orch-11 (2026-11-24). Why now: the public API and the seams freeze at beta.1 (CS-531), and the note's section 11 names this as one of four shapes 2.0 must reserve before then; none of the runtime needs to exist. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The draw-arguments seam admits a generated batch: sized from a declared constant bound, with its item count written by a GPU kernel, not only by the cull.
- Generated geometry enters only through `DrawArguments`; `test/seams.test.ts` still fails on any bypass.
- The kernel that writes the count follows the GPU safety rules: loops bounded by a constant, indices clamped.
