---
id: CS-745
title: A Health view lists the work graph's exceptions, each with a proposed fix
kind: work
state: done
created: 2026-11-19
project: CS-389
needs: [CS-744]
claimed_by: orch-11-CS-745
touches: [packages/next/bench/suite/views/workHealth.tsx, packages/next/bench/suite/views/workHealth.css, packages/next/bench/suite/workHealth.ts, packages/next/test/dynoWorkHealth.test.ts]
---

It replaces the project matrix, whose only real job was spotting cycles. Rules that make the graph wrong belong in `hitld work check` (arobison/human-in-the-lead#388 and #298); until hitld enforces them, this view shows them. Judgment signals stay here for good.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- It lists, with counts and each entity's title: milestone loops (naming the items that tie them), items in two milestones, release crossings, planned work items in no milestone (decisions and outside waits gate items and need none; proposals belong to the Proposals view), proposals older than a set age, decisions whose default is due within two days, claims with no live dispatch, items whose branch merged but are still open, and spend past appetite once estimates exist.
- Each exception has a proposed fix in words (move this item to that milestone, add this item to beta.1, drop or commit this proposal) and a one-click way to copy the command or open the item. Nothing is applied from the page.
- A clean graph shows an empty state that says so. Its count feeds "Your move", and only exceptions that need the owner (a fix that changes scope or a release) appear there.
- Tested on fixtures for each kind of exception, including tonight's two loops and the CS-341 release crossing.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
