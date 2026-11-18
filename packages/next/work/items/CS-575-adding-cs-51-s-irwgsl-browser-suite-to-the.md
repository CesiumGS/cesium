---
id: CS-575
title: Adding CS-51's irWgsl browser suite to the browser-suite gate
kind: decision
state: planned
created: 2026-11-17
project: CS-10
decider: owner
---

## Question

Should CS-51's irWgsl browser suite (60 GPU readback cases) join the browser-suite gate that the merge queue and CI run?

CS-51's executor added an irWgsl suite to bench/run.mjs. It compares GPU readbacks of the emitted WGSL with the float64 evaluator, at per-op float32 tolerances. It ran only on the Mac (Apple M2, Metal 3), where all 60 cases pass with a worst error ratio of 0.497. It runs only when someone calls node bench/run.mjs irWgsl, so the GPU half of CS-51's Done-when isn't enforced on later changes.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. Add it to the gate: A follow-up item registers irWgsl with the browser-suite gate, so every change under src/ir runs it. (cost: Gate time for 60 GPU cases; tolerances tuned only on Metal may fail on other GPUs.)
- B. Run it by hand for now: It stays a bench suite that executors run when they touch src/ir; a follow-up item records adding it later, after measuring on a second GPU. (cost: A regression in the emitter could merge unseen.)

Recommended: Add it to the gate. The suite is the only check that the emitted WGSL agrees with the evaluator on a GPU, and the executor already set the tolerances looser than Metal showed.

If unanswered by 2026-11-18T17:00:00.000Z: Run it by hand for now.

## Answer

Recorded in the front matter once answered.
