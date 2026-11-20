---
id: CS-746
title: "A Path view shows only what lies upstream of a chosen target: its milestones, its longest chain and its gates"
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-744]
touches: [packages/next/bench/suite/views/workPath.tsx, packages/next/bench/suite/views/workPath.css, packages/next/bench/suite/workPath.ts, packages/next/test/dynoWorkPath.test.ts]
---

It replaces the wave chart. The owner can't read 600 open items as a flowchart, but the upstream of one target, collapsed to milestones, is small enough to draw with arrows.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- Pick a target (a release, milestone or item): the view draws its upstream closure as milestones with arrows, with the longest remaining chain as the spine, decisions as gates on the path, and ready work highlighted.
- Expanding one milestone shows its open items in place, and nothing else changes position.
- It answers "why isn't this done?" in a sentence above the drawing: the chain length left, the gates open, and what can start now.
- Tested on fixtures for a release, a milestone and an item, including a target with no open upstream.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding (reserve widths; tabular numerals). The owner reviews it by clicking around.
