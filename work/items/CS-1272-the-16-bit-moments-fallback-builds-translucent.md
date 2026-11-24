---
id: CS-1272
title: "The 16-bit moments fallback builds: translucent.moments fails validation without float32-blendable"
kind: work
state: proposed
created: 2026-11-24
project: CS-8
---

> **Proposal.** Source: CS-27's executor, found while emulating a device without `float32-blendable` in Dyno's viewer, relayed by orch-11 (2026-11-24). Why now: the support rules offer a 16-bit moments fallback (`translucency.moments32.blendable`), but on such devices `Engine.create` rejects, because the render pipeline `translucent.moments` fails validation. Its fragment stage writes 1 output component to an `RGBA16Float` target. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- On a device without `float32-blendable`, `Engine.create` builds `translucent.moments` with the 16-bit fallback, and translucency draws.
- A test on the fake device without `float32-blendable` builds every translucency pipeline, so a format mismatch fails there and not first in a browser.
