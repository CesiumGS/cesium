---
id: CS-1213
title: Merge CS-1027, the handbook catches up with 2026-11-22
kind: decision
state: planned
created: 2026-11-24
project: CS-609
decider: owner
---

## Question

Merge CS-1027 into main? The handbook's project states are generated from the work tracker, the move to seven packages reaches the prose, and every performance figure either cites its run or is words, as your "Words now, re-measure later" said.

Project states on the Overview, System architecture, Shading and Browser compatibility tabs come from `work/` at build time; the graphics API reads WebGPU first; the packages, paths and the 13 code samples follow the layout move; plan 5b is checked task by task against the code; each tab's header carries a checked date and a status, with a warning on drift. The Overview's goals cite the baseline run 2026-11-01T02-44-13-116Z-nvidia-lovelace (which corrected stale text: 21.4 ms is 22 ms in the run, 34 API calls is 38). On nine tabs every timing without a run ID is words pointing to its source, with a guard test against about 50 removed numbers coming back, and the list of figures to re-measure went to the chief of staff. It also fixes the Shadows tab, which had rendered only an error. Two Opus reviews: the outside-reader rules hold (no host application, market, prototype or roadmap beyond the plans); the uncited figures were the Important findings, now fixed. The static single-file build is left to CS-1145, as scoped. No owner paths. Checked by the orchestrator on the replay a0ccdb7130 onto main 3acfd44987 (the changed lines are identical to the branch's; two files CS-847 also touched differ only in context). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. CS-1145 can then start.
- B. B. Hold it: Nothing merges; the handbook keeps its hand-kept states and uncited figures.

Recommended: A. Merge it. It meets the done-when, both reviews' findings are fixed, and the outside-reader rules hold.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
