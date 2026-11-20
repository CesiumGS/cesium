---
id: CS-747
title: A Since-you-last-looked view shows scope changes and answers since a chosen point
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-744]
touches: [packages/next/bench/suite/views/workChanges.tsx, packages/next/bench/suite/views/workChanges.css, packages/next/bench/suite/workChanges.ts, packages/next/scripts/workBoard.mjs, packages/next/test/dynoWorkChanges.test.ts]
---

The digest as a view: it gives a leadership team a weekly "what changed" without the owner writing it.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- Since a point the viewer picks (their last visit, kept in the browser; a date; or a commit), it lists items and milestones added, dropped and moved between milestones or releases, decisions answered with their answers, merges, and release membership changes. Each change shows the decision or reason behind it when the record has one.
- It reads the tracker's git history through the board's read endpoint, within CS-704's read budget (tested).
- A copy-as-text button gives a short summary for a status update, with titles, not bare IDs.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
