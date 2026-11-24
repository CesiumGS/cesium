---
id: CS-1205
title: Reserve StyleOutputs and the composition order of the style stage
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [packages/core/src/scene/CustomShader.ts, packages/core/src/scene/**, packages/core/DESIGN.md, test/**]
---

> **Proposal.** Source: `docs/design/styling-runtime.md` (CS-1146, merged a2f2493930), section 13's list, relayed by orch-11 (2026-11-24). Why now: the public API and the seams freeze at beta.1 (CS-531), and the note's section 11 names this as one of four shapes 2.0 must reserve before then; none of the runtime needs to exist. Related: CS-1132 (custom shaders compose after the style stage), CS-1141 (the color model). Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- `StyleOutputs` (color, opacity, show, size, offset) is a named, reserved set of values that a style writes and a custom shader reads, in that order of composition (note section 9).
- Room for them is reserved between the engine's stages, given today's limit of 16 float components for named values (`MAX_NAMED = 4`).
- A test fails if the reserved names or their order change.
