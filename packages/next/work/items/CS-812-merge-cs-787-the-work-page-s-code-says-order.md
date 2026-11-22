---
id: CS-812
title: Merge CS-787, the Work page's code says Order where it still said Plan view, and its dead code goes
kind: decision
state: done
created: 2026-11-21
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-22T03:34:03.838Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-787, which rewords the remaining 'Plan view' comments in Dyno's Work code to say Order, removes code nothing calls any more (the proposal stage, measuresOf and their types) and 19 unused work.css classes, and adds a guard test that fails if 'Plan view' comes back into a view's on-screen text, into main?

Removed: the proposal stage (Proposal.stage, stageOf, the stage key in proposalsOf's sort, ProposalStage, PROPOSAL_STAGES and proposalsForOwner); proposalsOf now sorts milestones first, then most waited on, then ID, and the Proposals view's order is unchanged because it re-sorts by group then ID. measuresOf goes with its types. 19 CSS classes go (the old scope, filter, related-list, spark and gate rules); I checked each one is unused on the branch and on the replay over current main. Kept, correcting my own item text: SLOTS_MAX and clampSlots, because planOf in work.ts calls clampSlots on Order's path; only their comments now say Order. The guard test (test/dynoWorkStrings.test.ts) reads string, template and JSX text in bench/suite with the TypeScript parser, so comments saying Order replaced the Plan view stay allowed; a planted 'Open the Plan view' fails it. Checked by hand on main 1d580bc3cc (tested ac0ea2caa4): both type checks, hitld work check (803 files), surface (no API change), npm test exit 0 (381 files, 6,378 passed, no unhandled errors), test:data exit 1 on dish-tracks alone (a known load failure; 5 of 5 alone, twice; this touches nothing under src/). No cold start: Dyno views only. A possible follow-up from the executor: fitZoom and cardDetail in work.ts look test-only. Presentation: orch-11-merge-ready-CS-787.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the dead code, the old comments and the unused rules stay, and nothing guards against 'Plan view' coming back.

Recommended: Merge it. It removes only code and rules nothing uses, the guard test bites, and every gate passes but one known load failure that passes alone.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
