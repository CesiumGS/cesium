---
id: CS-117
title: Measurements and the default
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-111, CS-116, CS-99]
---

Measurements and the default thread: tick-gap p99, input to GPU within one tick at p90, query p90, startup at most 300 ms slower, the API and `worker` browser suites passing, on an Apple-silicon Mac and a Windows machine with a discrete GPU, headed on an idle GPU. Needs CS-111 and CS-116, and the worker-mode spike's headed run (CS-99): the job system's milestone said worker mode by default waits for a run on an otherwise idle GPU that shows smoother ticks.

## Done when

The runs are recorded in `bench/results` and `docs/design/job-system.md`; the owner decides from them whether `"auto"` picks the worker.

## Files

- `bench/suite/`
- `bench/run.mjs`
- `widgets/recorderRows.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
