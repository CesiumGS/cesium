---
id: CS-748
title: "The Projects view shows each project as a bet: its outcome, releases, clauses, spend and its own decisions"
kind: work
state: done
created: 2026-11-19
project: CS-389
needs: [CS-744]
claimed_by: orch-11-CS-748
touches: [packages/next/bench/suite/views/Projects.tsx, packages/next/bench/suite/views/projects.css, packages/next/test/dynoWorkProjects*.test.ts]
---

The owner found the Projects tab hard to parse: decisions don't read as part of their project, and it's crowded and hard to scan vertically.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- One row per project, sorted by its next release: its outcome, the releases its milestones land in, progress by milestone clauses, spend against appetite once estimates exist, and its open decisions as badges on its own row.
- No item lanes. Expanding a project shows its milestones, and expanding one milestone shows its items.
- It scans vertically: rows align on one grid, with consistent column widths at every page width.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
