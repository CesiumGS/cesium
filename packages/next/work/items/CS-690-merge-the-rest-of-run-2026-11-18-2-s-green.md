---
id: CS-690
title: Merge the rest of run 2026-11-18-2's green batches as they pass
kind: decision
state: planned
created: 2026-11-18
project: CS-18
decider: owner
---

## Question

May the orchestrator merge each remaining item of run 2026-11-18-2 (CS-573, CS-562, CS-563, CS-683, CS-685, CS-547, CS-688) itself as soon as its by-hand queue checks pass, marked "Claude reviewed" for your later review, until the run's scope is done?

CS-689's option A covered tonight and ended at 07:00. It was answered at 07:30, so the orchestrator used it for CS-684 only, the batch that was waiting on it (merged as 4735222cb5, call E-32). This asks for the rest of the run, with no time limit. Anything red, with an unexplained deviation, or outside these seven items is held for you either way.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge green batches as they pass: After each green check (typecheck, hitld work check, full suite, deviations named), the orchestrator fast-forwards main, regenerates the views, logs the merge as a call marked Claude reviewed, and lists it under merged with its presentation file. It ends when the run's scope is done.
- B. Ask me for each batch: Each green batch waits in merge_ready for your yes; the next item stacks on the unmerged branch in the meantime.

Recommended: Merge green batches as they pass. It matches your "Yes, A" this morning; the items are serial on the same files, so waiting stacks branches; each merge is a fast-forward a revert undoes.

If unanswered by 2026-11-19T12:00:00Z: Ask me for each batch.

## Answer

Recorded in the front matter once answered.
