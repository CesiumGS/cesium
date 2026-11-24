---
id: CS-1279
title: Merge CS-581 as partial, dyno lab runs irWgsl for changes under src/ir
kind: decision
state: planned
created: 2026-11-24
project: CS-195
decider: owner
---

## Question

Merge CS-581's tool change into main as partial? `dyno lab --changed <base>` runs the irWgsl browser suite for any change under packages/core/src/ir, and a failing case exits nonzero; wiring it into a gate is a separate question for you.

What it adds: bench/suite/labGate.mjs selects gated suites from the changed paths (irWgsl for packages/core/src/ir/, by prefix), and a failing gated suite (a case failing, a compile error, nothing compared, a NaN ratio, no rows) makes `dyno lab` and bench/run.mjs exit 1, naming the case, its error ratio and the GPU's values; other suites' exit codes are unchanged. Evidence: the branch run passes 147 of 147 cases (60 op cases plus CS-54's route cases), worst error ratio 0.4967 on math/fract, tuned on Apple M2 and Metal 3 only; a mutation run on the real GPU exits 1 with the case named. What isn't done: nothing in the repository's own files runs a browser-suite gate today. CI has no browser job, and .human-in-the-lead/policy.json lists only typecheck, the work check and npm test. Both are owner paths, so the item stays in progress (the orchestrator set it back on the replay) and the wiring is a separate decision for you. A Sonnet review found no other Important; Minors: a file moved out of ir/ isn't selected (needs --no-renames), and `--changed` takes an optional ref, so a suite name after it can be misread. It touches bench/suite/commands/lab.mjs, which CS-1152 and CS-1172 also change; conflicts resolve by keeping both. Checked by the orchestrator on the replay 08de8547e1. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it as partial: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The item stays in progress until the gate is wired.
- B. B. Hold it: Nothing merges until the wiring is decided.

Recommended: A. Merge it as partial. The selection and the failing exit work and are tested on the real GPU; only the wiring, in your files, is left.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
