---
id: CS-486
title: CI keeps packages/next clean
kind: milestone
state: planned
created: 2026-11-15
project: CS-199
outcome: "CI runs the package's tests on Node 24, the package is Prettier-clean, a fresh worktree passes `npm test`, and the example runner's loose ends are closed."
constraints: [CS-361 c?, CS-362 c?, CS-412 c?, CS-445 c?, CS-537 c?, CS-538 c?, CS-540 c?, CS-580 c?, CS-583 c?, CS-850 c?, CS-851 c?, CS-983 c?, CS-984 c?, CS-982 c?, CS-1259 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 4 items are constraints marked `c?` until shaping links each to a clause.

CS-850 (eslint passes on main) and CS-851 (the handbook type-checks) joined on 2026-11-21, from orch-11's merge checks.

On 2026-11-24, CS-983, CS-984, CS-982 and CS-1259 joined. They were planned outside every release, and the owner asked that no planned work sit outside the release chain.
