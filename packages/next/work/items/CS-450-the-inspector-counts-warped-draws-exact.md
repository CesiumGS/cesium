---
id: CS-450
title: "The inspector counts warped draws: exact, compiled and fitted"
kind: work
state: planned
created: 2026-11-14
project: CS-17
---

## Done when

The inspector counts warped draws by how they're drawn: exact, compiled, and fitted. That count shows whether fitting is still needed; if fitted draws appear only in deliberate cases, the mechanism shrinks to a utility. `world.warpStats()` (provisional) is where the counts come from.

Detail: `docs/decisions/2026-11-13-architecture-decisions.md`, "Warps: exact when compilable, fitted only as a fallback"; `docs/design/geometry-through-placement-review.md` (`world.warpStats()`).
