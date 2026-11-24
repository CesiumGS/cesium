---
id: CS-1259
title: Where does `dyno lab --changed <base>` run as a gate?
kind: decision
state: planned
created: 2026-11-24
project: CS-195
decider: owner
---

> **Decision for the owner.** Source: CS-581 (the irWgsl browser suite joins the browser-suite gate for changes under src/ir), relayed by orch-11 (2026-11-24). Both places it could go are owner paths: `.human-in-the-lead/policy.json` and `.claude/`. CS-581 stays in progress until this is decided. Filed 2026-11-24.

## Question

Nothing in the repository runs a browser-suite gate today. CI has no browser job, and `policy.json` lists only the type check, the work check and `npm test`. Where should `dyno lab --changed <base>` run?

## Options

- A. One step in the merge queue's checks, under the `gpu` lock, run only when the branch touches `packages/core/src/ir`. The dyno skill says that `dyno lab --changed` is how a change under `src/ir` runs irWgsl.
- B. A browser job in CI.
- C. By hand only, as the dyno skill describes it.

**Recommendation (the executor's):** A.

Tolerances were tuned on Apple M2 with Metal 3 only. The first run on another GPU names the failing case and its ratio.
