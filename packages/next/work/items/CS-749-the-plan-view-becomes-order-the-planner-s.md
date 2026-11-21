---
id: CS-749
title: "The Plan view becomes Order: the planner's sequence for a release, with sizes as ranges and no executor-slot setting"
kind: work
state: in-progress
created: 2026-11-19
project: CS-389
needs: [CS-744]
claimed_by: orch-11-CS-749
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/views/workOrder.tsx, packages/next/bench/suite/views/workOrder.css, packages/next/test/dynoWorkPlan*.test.ts]
---

The owner liked the interleaving across projects but not the executor-slot setting, which varies through a project, and found the legend unlabeled, the intro text unhelpful and the bars' hover and tooltip in conflict.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- For a release, it shows the planner's order as a sequence, interleaved across projects, with each item's size (items now, token ranges once estimates exist).
- No executor-slot setting: concurrency is drawn from what runs actually did, shown as a range and labeled as history.
- Every legend color has a label. The intro text moves into an info popover or the page's help.
- Hovering a bar shows one tooltip and no conflicting hover state (tested with the pointer and the keyboard).
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
