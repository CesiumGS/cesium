---
id: CS-920
title: Do a route's residual statements go through Cesium IR's emitters now, or with CS-56?
kind: decision
state: done
created: 2026-11-22
project: CS-10
decider: owner
answer: B
answered_at: 2026-11-22T17:34:57.543Z
answered_via: question-tool
answered_by: owner
---

## Question

Should a compiled route's residual statements go through Cesium IR's emitters now? The plan wants them to. Doing it now changes the WGSL, so CS-54 would no longer match CS-53's goldens byte for byte.

From CS-54's executor (2026-11-22).

## Options and recommendation

- A. Keep the two-language residual rules now, and move to IR equations with CS-56's table work, with regenerated goldens and parity. (Cost: two sets of rules to keep in step until CS-56.)
- B. Move them to the IR's emitters now, in a follow-up to CS-54, with regenerated goldens and parity. (Cost: CS-53's goldens change before CS-56 needs them to.)

Recommended: A. CS-56 already reworks the residual's row window, so the goldens change once, not twice.

## Answer

Open.
