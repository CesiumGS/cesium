---
id: CS-935
title: "CS-815 Q3: rename cameraRecord to camera in PickPositionResult and CorePick before alpha.1?"
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

`PickResult` now says `camera`, but `PickPositionResult` and `CorePick` still say `cameraRecord`. Rename both to `camera` before alpha.1?

From CS-815's executor, in CS-934's context (2026-11-22).

## Options and recommendation

- A. Rename both to `camera` before alpha.1. Callers in `packages/crs` and the examples change too. (Cost: a small follow-up to CS-815.)
- B. Keep `cameraRecord` on those two. (Cost: two names for one thing in the public API.)

Recommended: A.

## Answer

Open.
