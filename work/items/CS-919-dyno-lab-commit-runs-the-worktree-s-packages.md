---
id: CS-919
title: dyno lab --commit runs the worktree's packages, not the commit's, and writes generated shaders into it
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: CS-612's executor, confirmed by the orchestrator (2026-11-22). Why now: the "previous commit" side of a parity comparison silently runs the worktree's own package sources, so it shows no difference whatever changed. Merge evidence relies on that comparison. Until this is fixed, comparisons are made with a separate checkout and server for each side. Size: small to medium. Decider: owner. Filed 2026-11-22.

## Done when

- `dyno lab --commit <rev>` serves the commit's own packages. `@cesium/*` resolves inside the snapshot, never through the worktree's `node_modules`.
- It writes no generated shaders or other output into the worktree.
- A test plants a difference between the worktree and the commit, and the comparison shows it.
- Parity comparisons made with `--commit` since the move (CS-835, 2026-11-22) are listed, each with whether its evidence needs a rerun.
