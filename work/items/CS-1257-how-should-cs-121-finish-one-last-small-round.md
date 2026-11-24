---
id: CS-1257
title: "How should CS-121 finish: one last small round, merge as is, or hold?"
kind: decision
state: planned
created: 2026-11-24
project: CS-14
decider: owner
---

> **Decision for the owner.** Source: CS-121 (the signed transition word and the hourly clock rebase), after two fix rounds, relayed by orch-11 (2026-11-24). Under orch-11's rule, a third Important after two fix rounds goes to the owner. Filed 2026-11-24.

## Background

Round 2 (e92df406c3, replay ca3bab50fd) closed its Important: one function, `EngineScene.styleTime`, makes the style and user-shader time, and both writers use it. The reviewer found no missed writer, and no GPU reader compares values from the two clocks.

The new Important is documentation only; the code is correct today. The `styleTime` comment and the report say CS-1247's option B is a one-function change, which leads straight to the split the item forbids. The fix is wording: B needs a separate field, and the record words do keep a time against the shader clock.

Minors: `styleTime` is read per writer rather than once per render, so points and models can differ by the time inside one tick (never by an hour); a weak points test; stale comments in `cesium.slang` line 75, `surfaceBoundary.slang` line 36 and `examples/slang-playground/main.ts` line 33.

CS-121 shares files with the CS-202, CS-972 and CS-363 replays, so its place in the merge order matters.

## Options

- A. One last small round: the wording, caching `styleTime` once per render, the stale comments, and the points test reading the real parameters. Then a scoped check of that change, then the merge decision.
- B. Merge as is, and file the wording and the cache as a follow-up. The code is correct; the risk is someone acting on the wrong comment.
- C. Hold.

**Recommendation (orch-11's):** A. It's wording plus one cached value.
