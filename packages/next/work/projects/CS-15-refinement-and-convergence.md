---
id: CS-15
title: Refinement and convergence
kind: project
status: Planned
created: 2026-11-13
initiative: CS-4
lead: owner
plan: docs/superpowers/plans/2026-11-13-refinement-and-convergence.md
---

## Summary

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, reviewed by the owner on 2026-11-13 (`docs/design/investigations-2026-11-13.md`, renderer decision 7: loading is refinement). One model for "the image is still improving": refinement sources per view, `view.refinement`, `converged()`, and the loop's changes and refining reasons in place of `TICK_REASONS`. A timeout resolves with a status; changes and requests stay apart from sources; what blocks is decided by each entry's effect. Transitions (CS-14), pending shader swaps (CS-11) and the resolution governor (CS-26) report as sources. No durations: order and dependencies only.
