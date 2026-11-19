---
id: CS-562
title: Dyno's Work page lists the items in no milestone, filterable by kind and state
kind: work
state: in-progress
created: 2026-11-16
project: CS-18
claimed_by: orch-9-CS-562
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts]
---

The owner wants to keep track of open items that no milestone names (2026-11-16). That day there were 77 of the 372 open work items: 10 planned ones that should have been in milestones, 4 release items that sit above milestones on purpose, and 63 proposed backlog items. Today nothing on Dyno's Work page shows them; finding them took a script over `work/milestones/`. The page's views are Your move, Roadmap, Proposals and Flow (`bench/suite/views/Work.tsx`).

## Done when

- The Work page shows the open items that no milestone's constraints name, in a view of their own or a clear place in an existing one, each with its project, kind, state and title, and a count.
- It filters by kind (work, decision, external) and by state (proposed, planned, in progress), so the owner can leave proposals out. The filters are kept in the page's URL, like its other settings.
- Release items, which sit above milestones by design, are marked as such, or can be filtered out.
- Selecting an item opens it in the page's pane, as the other views do.
- Checked in both themes, at 380 px wide, with the keyboard only and with a clean console, on a Dyno server of the executor's own, never the owner's 5190 (`packages/next/AGENTS.md`, "UI and examples").
