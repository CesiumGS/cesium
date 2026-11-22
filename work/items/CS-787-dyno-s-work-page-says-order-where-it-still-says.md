---
id: CS-787
title: The Work page's code says Order where it still says Plan view, and its dead Plan-view and proposal-stage code goes
kind: work
state: done
created: 2026-11-21
project: CS-389
needs: [CS-749, CS-775]
claimed_by: orch-11-CS-787
touches: [packages/next/bench/suite/work.ts, packages/next/bench/suite/views/work.css, packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/HoverCard.tsx, packages/next/bench/suite/routes.tsx, packages/next/test/dynoWork*.test.ts]
---

After CS-749 turned the Plan view into Order, some text still names the Plan view: the Dependencies help (`Dependencies.tsx`) and three strings and comments in `Projects.tsx`. `bench/suite/DESIGN.md` also keeps a section on CS-693's Projects tab, which CS-748 replaced.

Source: CS-749's report, relayed by orch-11, 2026-11-21. Why now: help text that names a view that's gone confuses the owner. Rough size: small. Decider: the executor. Filed: 2026-11-21.

Committed 2026-11-22 by the owner.

## Done when

Trimmed 2026-11-22 by orch-11, after CS-775 merged (e5938516a8): CS-775 removed the Dependencies view and its help, the old Projects matrix and DESIGN.md's old Projects section, so no UI string says "Plan view" any more. What's left:

- Code comments that still name the Plan view say Order: `bench/suite/routes.tsx` (the release field), `bench/suite/views/HoverCard.tsx` (the slip line), and `bench/suite/work.ts` (its "the Plan view" section and the `PlanItem` comments). Comments that say Order replaced the Plan view, and DESIGN.md's history, keep the name.
- `SLOTS_MAX` and `clampSlots` in `work.ts` go with their test: CS-775 removed the `slots` route parameter, so nothing else calls them. Keep whatever Order still uses from that section.
- `measuresOf` in `work.ts` has no caller since CS-752 (Flow), so it goes.
- `proposalsForOwner` and its stage types (`ProposalStage`, `PROPOSAL_STAGES`), which have only test callers since CS-753, go with their tests. So do the `work.css` rules that nothing uses, each checked by grep across `bench/suite` before it's removed.
- A test fails if "Plan view" appears in a view's UI strings again.

## Follow-up

`fitZoom` and `cardDetail` in `bench/suite/work.ts` look test-only: a small follow-up for a later clean-up. (Noted 2026-11-22 by orch-11, from CS-787's executor, at the chief of staff's word.)
