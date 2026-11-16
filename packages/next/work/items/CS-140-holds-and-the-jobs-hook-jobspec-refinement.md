---
id: CS-140
title: Holds and the jobs hook (`JobSpec.refinement`, `SliceSpec.refinement`)
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-134, CS-86]
---

Holds and the jobs hook (`JobSpec.refinement`, `SliceSpec.refinement`). Needs CS-134 and the first job-system slice (merged); each JP item declares its own when it lands.

## Done when

Tests: a hold blocks, shows progress, wakes the loop, and its release resolves a waiter. On the fake port: waiting, queued, running and arrived jobs count as pending; applied counts as done; a cancelled job leaves the counts without failing; a failed one counts as failed; `effect` and `views` are read at report time; a slice's `progress` is its estimate.

## Files

- `src/scene/refinement.ts`
- `src/scene/Engine.ts`
- `src/io/Jobs.ts`
- `test/jobs.test.ts`

Detail: `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
