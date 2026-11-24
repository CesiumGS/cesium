---
id: CS-1246
title: Should the bare engine's default look turn shadows and ambient occlusion on?
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

> **Decision for the owner.** Source: CS-29's report (the Viewer's defaults migrated), relayed by orch-11 (2026-11-24). Blast radius: it changes what every page with no look draws. Filed 2026-11-24.

## Question

The profile catalog says the default look turns shadows and ambient occlusion on (the plan's question 1, decided yes), but `View.ts` defaults both to off, and 1.x draws neither. Flipping changes 14 tests in 7 files, and about 30 parity, bench, example and handbook pages that create views with no look would then need to pin it. Flip it?

## Options

- A. Yes, in its own work item under CS-8 that needs CS-23, run after CS-121, CS-202 and CS-55 merge (they hold `View.ts` and `parity/tileset.ts`). CS-29 then finishes by removing the Viewer's two overrides.
- B. No: keep both off by default, and change the profile catalog to say so.

**Recommendation (the executor's):** A.
