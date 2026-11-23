---
id: CS-340
title: Printing to scale
kind: work
state: planned
created: 2026-11-13
project: CS-196
needs: [CS-218]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 6, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-534 (Infrastructure and geoscience data shows in 2.0), so that milestone cannot be checked while this stays proposed. It also waits on CS-218. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

Orthographic plan and profile views, exact line weights, output beyond screen resolution, with `View.scaleAt` deciding when one scale can be promised.

Detail: `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 6.

## Note (2026-11-23)

Committed and reshaped (2026-11-23, CS-1114 A): 2.0 keeps capture at a stated scale beyond screen size, and a target used as a texture. Sheets and layout are the host's.
