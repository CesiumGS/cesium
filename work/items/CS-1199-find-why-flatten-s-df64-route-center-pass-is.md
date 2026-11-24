---
id: CS-1199
title: Find why flatten's df64 route-center pass is off by up to 184 m on Apple GPUs
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955]
touches: [packages/core/src/transform/**, packages/core/src/scene/world/**]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: `flatten` is about 100 times worse than the other Earth routes (median 18.4 m, largest 183.5 m, against about 1 m), so its chain likely amplifies folded terms. It matters only if the pass is made to work on Apple GPUs (see CS-1198). Size: small (an investigation). Decider: owner. Filed 2026-11-24.

## Done when

- The term or terms in `flatten`'s compiled chain that amplify the folding are named, with the Metal output read (`scripts/dumpMsl.mjs`).
- The finding is written into `docs/design/transform-graph.md` and fed to CS-1198.
