---
id: CS-925
title: Merge CS-54, routes on both emitters
kind: decision
state: done
created: 2026-11-22
project: CS-10
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge."
answered_at: 2026-11-22T15:34:27.545Z
answered_via: main-session
answered_by: owner
---

## Question

Merge CS-54, compiled routes on both the WGSL and GLSL ES emitters with the residual and df64 forms, into main? It meets the overnight safe-merge bar: no owner path, no dependency, two-way reversible.

CS-54 compiles every built-in route on both emitters, adds a name-prefix option to each with a test that links two prefixed routes into one program on each backend, and holds the WebGL 2 corridor baseline. A Claude review found one Important problem: the corridor's center term inherited a relative bound of about 3 × 10⁻⁴ m at 1.5 km, so the 0.1 mm done-when wasn't enforced. The fix round (d95e353bbe) gives the corridor cases a center bound of 10⁻⁴ m and a new drawn-position bound of 10⁻⁴ m, checked on the GPU's written position against the float64 map. Lab (bench/results/2026-11-22T15-23-10-880Z-apple-metal-3.json): irWgsl 128 of 128 rows pass, worst drawn error 1.04 × 10⁻⁵ m; irGlsl 128 of 128, worst 4.23 × 10⁻⁵ m; read from the result file's pass fields, since dyno lab exits 0 even when a row fails. A scoped re-review found no Important problems. Its Minors: the two-route case holds the twist half to the corridor's absolute bound too (measured 1.55 × 10⁻⁵ m, so it holds); the Node test proves the comparison's arithmetic, and the done-when rests on the Lab run. Parity (tracks, heights) before and after in its own worktree was identical; the fix round changed only readback and test code. Checked by the orchestrator on main b77e50d5dc (replay 04b73a986d of d95e353bbe, patch identical outside work/): both type checks, lib, work check, surface unchanged, npm test exit 0 (400 files, 6,705 tests), test:data exit 0, check:bundle exit 0 (Cesium IR stays lazy), shaders:check exit 0.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the branch waits for the owner's review.

Recommended: Merge it. Every gate passes on main's tip, the review has nothing Important open, it touches no owner path or dependency, and it's two-way reversible.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

The chief of staff answered A on 2026-11-22 under the owner's overnight approval of safe merges. Every gate passes on the replay, the re-review has nothing Important open, and the chief of staff checked that the diff touches no owner path. The WGSL goldens are unchanged, and the before-and-after Lab runs were read from their `pass` fields, not from the exit code.
