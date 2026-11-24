---
id: CS-1243
title: Should uniform literals become FeatureStyle's default, with the frozen style tests rewritten?
kind: decision
state: planned
created: 2026-11-24
project: CS-10
decider: owner
---

> **Decision for the owner.** Source: CS-55's review, relayed by orch-11 (2026-11-24). Filed 2026-11-24.

## Question

Your decision was "style literals become uniforms". CS-55's done-when also says the three style tests "pass unchanged", and those tests assert inline numbers in the WGSL text (styleParity evaluates the `let c = …` text as JavaScript; styleCost expects a changed number to compile a new module). The executor made uniform mode opt-in (`literals: "uniform"`), so the tests pass unchanged, and your decision isn't the default yet. Should uniform become the default for `FeatureStyle` and `Tileset3D` styles?

## Options

- A. Yes, in a follow-up item that needs CS-55's fix round: rewrite styleParity's text evaluation to go through the IR or `evaluate`, update styleCost, then flip the default. This changes tests you froze.
- B. Keep it opt-in.

**Recommendation (the reviewer's):** A.
