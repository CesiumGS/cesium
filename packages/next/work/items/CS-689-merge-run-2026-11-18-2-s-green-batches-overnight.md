---
id: CS-689
title: Merge run 2026-11-18-2's green batches overnight
kind: decision
state: planned
created: 2026-11-18
project: CS-18
decider: owner
---

## Question

Tonight only, may the orchestrator merge each of run 2026-11-18-2's eight Work-page items (CS-684, CS-573, CS-562, CS-563, CS-683, CS-685, CS-547, CS-688) itself once its by-hand queue checks pass, marked "Claude reviewed" for your morning review?

Merge mode is owner, and these branches run outside dispatch (E-28), so each reaches main by CS-564's path: the queue's checks by hand in a fresh worktree, then your yes. The skill lets the orchestrator merge only on an answer hitld records, not on a relayed message, so this records the overnight yes you gave the chief of staff ("Yes, merge overnight"). Anything red, with an unexplained deviation, or outside the eight items is held for the morning either way.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge green batches overnight: After each green check (typecheck, hitld work check, full suite, deviations named), the orchestrator fast-forwards main, regenerates the views, logs the merge as a call marked Claude reviewed, and lists it under merged overnight with its presentation file. It ends at 07:00 or when the run's scope is done.
- B. Hold every batch for the morning: Each green batch waits in merge_ready; later items stack on the unmerged branches, and each stack needs your yes in the morning.

Recommended: Merge green batches overnight. It is what you told the chief of staff, the items are serial on the same files, and each merge is a fast-forward that a revert undoes.

If unanswered by 2026-11-18T12:00:00Z: Hold every batch for the morning.

## Answer

Recorded in the front matter once answered.
