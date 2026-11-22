---
id: CS-684
title: "Dyno's Work page drops the retired long outcomes: no Long outcomes view, and dropped milestones out of every grouping"
kind: work
state: done
created: 2026-11-17
project: CS-18
claimed_by: orch-9-CS-684
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner retired long outcomes on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`): human-in-the-lead's next release uses plain milestones only, and CS-1 to CS-7, CS-436 and CS-525 are now `dropped`. Dyno's roadmap still offers a "Long outcomes" view, which groups by them and shows "No long outcome" as the biggest group (owner's screenshot, 2026-11-17). Its grouping code is in `bench/suite/work.ts` (`NO_LONG_OUTCOME`, the long-outcome roadmap) and its toggle in `bench/suite/views/Work.tsx`.

## Done when

- The roadmap has no Long outcomes view; its views are milestones and project waits, and the scope picker no longer offers long outcomes.
- Dropped milestones appear in no roadmap, lane, scope or count, anywhere on the Work page.
- The code for grouping by long outcome is removed, with its tests, and `bench/suite/DESIGN.md` says why.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only and with a clean console.
