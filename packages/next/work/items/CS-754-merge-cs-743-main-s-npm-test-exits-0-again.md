---
id: CS-754
title: Merge CS-743, main's npm test exits 0 again
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Merge CS-743, which stops the unobserved rejection behind main's failing npm test since CS-706, into main?

An already-aborted signal made the manifest read reject before unlessAborted in frameRoles.ts attached a handler; a one-line catch fixes it, and a new test file fails 3 of 5 on the old code. Checked by hand on main 19d98830f4 (tested 81db4d3c9e): both type checks, hitld work check (741 files), surface, npm test exit 0 (5,756 passed, no unhandled errors) and test:data exit 0 (56 files). Two files, in touches. Presentation: orch-10-merge-ready-CS-743.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; main's npm test exits 0 again.
- B. Hold it: Nothing merges; main's npm test keeps exiting 1 on the unobserved rejection.

Recommended: Merge it. It is a one-line, tested fix that turns every check green again.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
