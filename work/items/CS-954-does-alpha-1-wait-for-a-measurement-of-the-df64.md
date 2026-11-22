---
id: CS-954
title: Does alpha.1 wait for a measurement of the df64 route-center pass on Apple GPUs?
kind: decision
state: done
created: 2026-11-22
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-22T19:18:32.697Z
answered_via: question-tool
answered_by: owner
---

## Question

The GPU pass that remakes a route's center constants (a route with a dynamic parameter and 16 or more draws, packages/core/src/scene/world/routes.ts) runs in df64, which drops to float32 on Apple GPUs. CS-921's integer fix doesn't reach it, no GPU test reads it back, and its error isn't measured. Does alpha.1 wait for it?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Measure it on an Apple GPU before alpha.1, and fall back to the CPU path where a self-test fails.
- B. Ship with a caveat in the handbook.
- C. Turn the GPU pass off everywhere until measured.

Recommended: A.

## Answer

Open.
