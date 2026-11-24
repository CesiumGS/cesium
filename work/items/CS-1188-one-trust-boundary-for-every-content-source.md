---
id: CS-1188
title: One trust boundary for every content-source inlet, as a shared module, tested by snapshot, bounded-work and closed-text invariants
kind: work
state: planned
created: 2026-11-23
project: CS-191
needs: [CS-847, CS-1187]
touches: [packages/core/src/source/**, packages/core/src/boundary/**, packages/core/test/**, packages/core/DESIGN.md]
---

The owner chose A on CS-1186 (merge CS-847's round 9 as experimental; "the next item, one boundary for every inlet tested by I1 to I3, follows the trust-model decision") and A on CS-1187 (a source is trusted code). The step back on CS-847 (orchestrator/stepback-CS-847.md in the store) found the boundary trusts what a source hands it at each inlet, one check at a time, so every fix round moved the bug. This item replaces the per-inlet checks with one boundary that every inlet goes through.

The owner, 2026-11-24: "our other seams will no doubt need to take this same trust approach, so perhaps there's some code to be refactored out and shared". So the boundary is its own module with no content-source names in it; CS-1189 has other seams adopt it.

## Done when

1. **One shared module.** A trust-boundary module outside `source/` holds a schema table per inlet, a copy-in step that reads each value once, typed-array copies made with the intrinsic `set` (never `slice`, which follows `Symbol.species`), and fixed engine-made messages with no pushed value in them.
2. **Every inlet goes through it.** `admit`, the sinks' position and column checks, change-set messages, `budget.want` and `settle`, and `jobs.submit`. A seam test fails naming the line when an inlet reads a source's value without the boundary.
3. **Three invariants, tested as classes, not instances.**
   - I1, no late reads: inputs are wrapped in revocable proxies, revoked once the call returns; any later read throws in the test.
   - I2, bounded work: a forged length or count is refused before any allocation sized by it.
   - I3, closed text: canary values pushed through every inlet never appear in any report, error or log, including as split strings.
4. **T1 becomes a heap-growth oracle.** It measures heap growth against a bound across forged inputs, rather than searching the heap for canaries.
5. **The trust model is written down** in the package's design notes: a source is trusted code; the seam guarantees snapshot semantics, bounded work per push and engine-made text; isolating a hostile source is the host's job.
6. Every finding from CS-847's rounds 1 to 9 is shown closed by one of the invariants.
