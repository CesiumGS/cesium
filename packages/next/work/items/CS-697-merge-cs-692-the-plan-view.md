---
id: CS-697
title: Merge CS-692, the Plan view
kind: decision
state: planned
created: 2026-11-18
project: CS-18
decider: owner
---

## Question

Merge CS-692, Dyno's roadmap Plan view, into main?

CS-692 is outside CS-690 A, so it merges only on your yes. Its branch passed the queue's checks by hand on main's tip 1c3910199b: typecheck, hitld work check (694 files) and the full suite (5,637 passed, 0 failed); tested commit 030e66d4bd. Deviations, both foreseen: routes.tsx (&slots=, &roadmap=waves, &arrange=waves) and test/dynoWork.test.ts. Plan becomes the default roadmap view, across is item count (no item has a token estimate), and "critical path" and "step" leave the page. Presentation: orch-9-merge-ready-CS-692.md in the orchestrator's notes. CS-694 and CS-693 rebase onto it after it merges.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to 030e66d4bd (re-checked if main moves), regenerates the views, logs the merge, and sends CS-694's executor its follow-up to rebase and finish.
- B. Hold it: The branch waits; CS-694 and CS-693 can't finish their cleanup steps, which need CS-692 on main.

Recommended: Merge it. It is green on main's tip with its deviations foreseen, and CS-694 and CS-693 wait on it.

If unanswered by 2026-11-20T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
