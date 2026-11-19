---
id: CS-691
title: Dyno's Fewest crossings roadmap layout places real milestones (d3-dag's simplex fails today)
kind: work
state: dropped
created: 2026-11-18
project: CS-18
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/work.ts]
reason: "The owner, 2026-11-18: dropped with the three-view roadmap design; CS-694 removes the Fewest crossings layout rather than fixing it."
---

**Proposal** (CS-686). Source: the CS-563 executor's report, run 2026-11-18-2, 2026-11-18. Why now: the roadmap's "Fewest crossings" layout (`?view=roadmap&shape=graph`) shows no milestones at all on today's data, only "couldn't place these milestones (d3-dag: could not find a feasible simplex solution)". The executor reproduced it on CS-563's base commit with the new toggle off, so it predates the run. Rough size: small to medium, depending on whether d3-dag's layering can be configured or needs a fallback. Decider: the owner. Filed: 2026-11-18.

## Done when

- The cause is found and recorded: which milestones or waits make d3-dag's simplex layering infeasible.
- The Fewest crossings layout places every milestone on today's data, or falls back to another layering with a note saying so, never an empty view.
- A test with the failing shape covers it.
- Checked on a Dyno server of the executor's own, never the owner's 5190.
