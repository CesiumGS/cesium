---
id: CS-967
title: "When are the performance targets judged: rc.1, or before beta.1's freeze?"
kind: decision
state: done
created: 2026-11-22
project: CS-195
decider: owner
answer: B
answered_at: 2026-11-22T20:43:44.089Z
answered_via: question-tool
answered_by: owner
---

## Question

beta.1 (CS-531) freezes the API and the seams, but the performance targets (CS-484) are judged only at rc.1 (CS-532). The three remedies for the largest main-thread cost, tile selection, need API shapes that don't exist yet: worker mode (CS-13), selection off the main thread (CS-98) and a tile table a worker can read. What should happen?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Design the thread-crossing shapes before beta.1, and make Tile internal or experimental meanwhile.
- B. Judge the performance targets before beta.1 (CS-484 moves from rc.1 to beta.1).
- C. Keep the current order.

Recommended: A.

## Answer

Open.
