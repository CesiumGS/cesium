---
id: CS-349
title: A near-field bounded terrain trace, and terrain error over open water
kind: work
state: proposed
created: 2026-11-13
project: CS-197
needs: [CS-344]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames explorer scenarios plan", made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-535 (Rays query the scene on the GPU), so that milestone cannot be checked while this stays proposed. It also waits on CS-344. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

A sight line loads tiles 20–50 km around each end at a level chosen for the error, and open water carries its own per-tile error.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames explorer scenarios plan".
