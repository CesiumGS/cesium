---
id: CS-768
title: Merge CS-750, the Proposals view says why each item is proposed
kind: decision
state: planned
created: 2026-11-20
project: CS-389
decider: owner
---

## Question

Merge CS-750, which replaces the Proposals tab on Dyno's Work page with a view that groups every proposal by why it's proposed and recommends commit, hold or drop for each, with a question to copy, into main?

Groups: needed by committed work, waiting on a decision or study, new, and deferred, plus exceptions: no header yet, a proposed milestone holding planned work, and a need that was dropped. Each row gives a recommendation and its reason. Drop is never recommended for a proposal with no header. Commit, Hold and Drop copy a question for the chief of staff; the only command shown is npx hitld work show (rc.1 has no commit or drop command). Nothing is applied from the page. On today's tracker: 78 proposals, 8 needed, 9 waiting, 3 new, 0 deferred and 58 with no header yet. It takes the built-in tab's place (id 'proposals'); CS-688's old code stays in Work.tsx until a clean-up item removes it. Outside its touches: its section in bench/suite/DESIGN.md. Replayed onto CS-746 and CS-748 (all three add DESIGN.md sections). Checked by the executor: both themes, 380 px, keyboard only, reduced motion honored in code, a clean console. Two things for later, not part of this merge: the executor's question, how a header should say a proposal is deferred (its recommendation: no new label; write 'deferred by the owner' or 'later' in the header's Source when CS-680 writes the headers), and a follow-up for the main session to file: align Your move's 'Proposals for you' card with the new groups. To try it once merged: #/work?view=proposals on Dyno; click a tile; press Commit to copy a question; try &item=CS-290. Checked by hand on main 8acd08c42f with CS-746 and CS-748 under it (tested 265f592a5f, the top of the stack): both type checks, hitld work check (763 files), surface (no API change), npm test exit 0 (372 files, 6,242 passed, no unhandled errors), test:data exit 0; no CSS rule removed. Presentation: orch-11-merge-ready-CS-750.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator merges it after CS-746 and CS-748, replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the Proposals tab keeps CS-688's stages.

Recommended: Merge it. Every gate passes on main's tip with the other views stacked under it, nothing is applied from the page, and it puts a reason and a call beside every proposal.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
