---
id: CS-692
title: "Dyno's roadmap has a sequence view: the planner's order played through the run's executor slots"
kind: work
state: planned
created: 2026-11-18
project: CS-18
needs: [CS-685]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner, 2026-11-18: "i find that depth thing a little confusing, because i read it as a sequence...maybe we also need a sequence view?" The roadmap's map lays milestones across by the critical path method with unlimited capacity: Steps and Tokens both show the earliest each could start, and Fewest crossings only rearranges those columns (`bench/suite/work.ts`, the earliest start "along the waits, in steps or tokens"). None says in what order the work will actually happen.

## Done when

- A Sequence view plays the work forward: items fill the run's executor slots (`max_executors`, today one) in the planner's order (`hitld ready`'s tiers and order, or the same rule in `work.ts` when it can't be read), respecting `needs` and CS-685's release bands. Across is cumulative tokens, never a time estimate (no dates or durations), with the slot count shown and adjustable.
- Each release flag lands where the last item it needs finishes, and each milestone shows where its first and last items fall.
- Where token sizes are missing, the view says how many items it counted as a default size, rather than hiding them.
- The depth views say what they are: a "step" becomes a **wave** everywhere on the Work page (the owner, 2026-11-18: "is a step a wave? i think we need a better name than step, step makes me think of sequence"), with a caption saying a wave is the work that can start together once what it waits on is done, assuming unlimited hands. Not "tier" (hitld's executor tiers) or "phase" (hitld refuses sequence words in names).
- Tests in `test/dynoWork.test.ts` cover the scheduling with one and several slots, and with release bands.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
