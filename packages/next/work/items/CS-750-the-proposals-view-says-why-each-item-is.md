---
id: CS-750
title: The Proposals view says why each item is proposed, and offers commit, hold or drop
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-744]
touches: [packages/next/bench/suite/views/workProposals.tsx, packages/next/bench/suite/views/workProposals.css, packages/next/bench/suite/workProposals.ts, packages/next/test/dynoWorkProposals.test.ts]
---

The owner finds the Proposals tab confusing and doesn't know what to do with it. Promoting a proposal is the owner's call (hitld 04 §4.6), so the view should make each call easy.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- Proposals are grouped by why they're proposed (CS-686's header): needed by committed work, waiting on a decision or study, new, and deferred. Each shows its source, why now, rough size and age.
- Each has its call in words, with a recommendation: commit it to a milestone, hold it, or drop it with a reason. A one-click way copies the command, or opens a prefilled question for the chief of staff. Nothing is applied from the page.
- A proposal that committed work needs is flagged first, since it holds that work up.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
