---
id: CS-699
title: Merge CS-694, the Dependencies view, without the old map
kind: decision
state: done
created: 2026-11-19
project: CS-18
decider: owner
answer: "A. Merge it as it is: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views, logs the merge, and sends CS-693's executor its follow-up."
answered_at: 2026-11-19T05:43:26.138Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-694, the Dependencies view, which also removes the old milestone map entirely (project lanes, its list, legend and zoom), beyond the item's "keeps project lanes only"?

CS-694 is outside CS-690 A. Its branch passed the queue's checks by hand on main d4bd9fe69b: typecheck, hitld work check (696 files) and the full suite (5,654 passed, 0 failed); tested commit 8e2f8cca5a. The item asks to remove Fewest crossings and the always-on waits, with the global toggle keeping project lanes only. The executor removed the whole old map (about 2,480 lines and 147 CSS rules), citing an owner addition that the old legend must go; that addition isn't in the tracker. Gone with it: CS-685's release bands on the map and list, CS-683's zoom and Project-lanes decision cards (CS-693 draws decisions in Projects rows), CS-563's dashed outlines on the map (the Plan view marks proposed). Kept: CS-685's closure problems panel and the Plan view. Also: d3-dag removed from package.json (no lockfile tracked); new files; routes.tsx keys changed, old links mapped. Presentation: orch-9-merge-ready-CS-694.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it as it is: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views, logs the merge, and sends CS-693's executor its follow-up.
- B. Keep project lanes first: The orchestrator sends CS-694's executor a follow-up to restore the project-lanes map under Whole structure, as the item's Done-when says, then checks and presents it again; CS-693 waits.
- C. Hold it: Nothing merges; CS-693 and CS-696 wait.

Recommended: Merge it as it is. It is green, the Plan and Projects views take over what the map showed, and the closure problems panel stays; but the project-lanes removal goes beyond the recorded item, so it's your call.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
