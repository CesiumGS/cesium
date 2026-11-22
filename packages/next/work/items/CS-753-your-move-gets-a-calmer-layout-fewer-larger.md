---
id: CS-753
title: '"Your move" gets a calmer layout: fewer, larger, ranked entries'
kind: work
state: done
created: 2026-11-19
project: CS-389
needs: [CS-744, CS-750]
claimed_by: orch-11-CS-753
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/test/dynoWork*.test.ts]
---

The owner: "the layout for your move is getting cluttered again, too much tiny text, bad layout, etc. give it some tlc". hitld's design: each section leads with its number, most waited-on first, each with its age (12.1.3).

The default roadmap view, and the one to share with a leadership team. It also sets up the new tab shell the other views mount into.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- Each section (decisions, merges, health exceptions that need the owner, outside waits) leads with its number, and shows its top entries ranked by what they hold up, each with its age, its title in words and its one action. The rest fold under "and N more".
- Body text is at least the page's base size. Secondary detail moves into the entry's drawer, not smaller type.
- One column on narrow screens and a clear two-level hierarchy on wide ones. No section scrolls sideways.
- Empty sections collapse to one line, and a fully clear "Your move" says so.
- The "Proposals for you" card counts proposals in CS-750's groups (needed by committed work, waiting on a decision or study, new, deferred) and links to the Proposals view. The old card's code for CS-688's stages is removed from `Work.tsx`. (Added 2026-11-20, from CS-750's report.)
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding. The owner reviews it by clicking around.
