---
id: CS-880
title: "CS-834 D2: how does 1.x's @cesium/core 0.1.1 give way to 2.0's core?"
kind: decision
state: done
created: 2026-11-21
project: CS-615
decider: owner
answer: A
answered_at: 2026-11-22T06:17:08.667Z
answered_via: question-tool
answered_by: owner
---

## Question

1.x's `@cesium/core` is at 0.1.1, and 2.0's core takes the name. This can't be undone, and it's the 1.x team's to agree to.

From CS-834's package map (`docs/design/package-map.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. One name, two version lines: 1.x keeps publishing 0.x under a `1x` dist-tag, and 2.0 takes `latest` at 2.0.0. (cost: two lines under one name.)
- B. Fold 1.x's back into `@cesium/engine`. (cost: 1.x's 0.1.x stops.)
- C. Rename 1.x's. (cost: 1.x users change imports.)

Recommended: A, the map's recommendation.

## Answer

The owner, 2026-11-21: A. One name, two version lines. 1.x stays on 0.x under a `1x` dist-tag, and 2.0 takes `latest` at 2.0.0. The owner is the 1.x team, so the agreement this needs is given.
