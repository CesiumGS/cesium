---
id: CS-744
title: "The Work page's roadmap opens on a Release view: what's left in a release and what's holding it"
kind: work
state: in-progress
created: 2026-11-19
project: CS-389
claimed_by: orch-10-CS-744
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/views/workRelease.tsx, packages/next/bench/suite/views/workRelease.css, packages/next/bench/suite/workModel.ts, packages/next/test/dynoWork*.test.ts]
---

The default roadmap view, and the one to share with a leadership team. It also sets up the new tab shell the other views mount into.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- Pick a release (alpha.1 by default): one screen shows each of its milestones as a row, with clauses checked and unmet and the remaining size (items now, tokens as ranges once estimates exist, labeled which).
- The decisions and outside waits holding the release are shown as gates, each with its age, its default and deadline if it has one, and what it blocks. What's ready to start now is marked.
- The release's exceptions from the Health view show as a count with a link.
- The roadmap's tabs no longer jump between widths: the tab row reserves its width, tested at 380, 768, 1024 and 1440 px.
- "Proposed" is a real switch (role `switch`, with its state in words), shared by every view that can include proposals.
- The "No milestone" tab goes. Of its 80 entries on 2026-11-20, 58 were proposals (the Proposals view, CS-750), 9 decisions and 6 outside waits (which gate items and need no milestone), and 7 planned work items, the only real orphans (the Health view, CS-745). The owner: "what value is this tab adding? shouldn't this be stuff on your move if it actually requires my attention?"
- The old Plan, Dependencies and Projects tabs stay reachable from one "Older views" menu until their replacements land, then go.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
