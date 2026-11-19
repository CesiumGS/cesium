---
id: CS-693
title: "Dyno's Projects view: each project's readiness per release, what it holds up, and its dependencies behind a toggle"
kind: work
state: done
created: 2026-11-18
project: CS-18
needs: [CS-685]
claimed_by: orch-9-CS-693
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner, 2026-11-18: "the project waits tab also seems misnamed. i also haven't found it super useful thus far. is there a way to make it provide more useful information?" Today's Project waits (`?view=roadmap&roadmap=matrix`) is a design structure matrix: projects against projects, each cell counting the open items in the row's project that wait on the column's (`dependencyMatrix` in `bench/suite/work.ts`, `MatrixView` in `views/Work.tsx`). It says which project waits on which, but not what that means for the releases. CS-683's executor also asked whether this view should draw decisions; this item settles it.

Runs alongside CS-692 and CS-694 (the owner, 2026-11-18: "Yes, both", to running CS-693 in parallel too). Until CS-692 merges, read the three-view brief from CS-692's item file. To keep the branches apart:

- Build the Projects view in new files (a view component beside `views/Work.tsx`, and a model module beside `work.ts`), touching `Work.tsx` only to mount it and add its toggle.
- Do the changes to existing code last, after rebasing onto main once CS-692 and CS-694 have merged: renaming Project waits and moving its matrix behind CS-694's toggle.

## Done when

- The view is named **Projects** (the toggle beside Milestones), with three parts.
- **By release (the default):** projects as rows and release items as columns in ladder order (CS-685's release bands). Each cell shows the project's items that release needs: done, ready, in progress and blocked, naming what blocks them (other projects' items, open decisions, outside waits), with the kind encoding from CS-573. An empty cell says the release needs nothing from that project.
- **Holds up:** a column, sortable, giving for each project how many open items in other projects, and which releases, wait on its unfinished work, and whether it's on the critical path, so the bottleneck projects rise to the top.
- **Decisions:** a project's open owner decisions that hold up release work show in its row, with their question and what waits on them, as CS-683 draws them on the map.
- **Dependencies, behind a toggle:** today's matrix, renamed, ordered so tightly coupled projects sit together, with loops between projects marked.
- It follows the three-view brief CS-692 records in `bench/suite/DESIGN.md` (the owner, 2026-11-18): direct labels on the marks, details in tooltips, no legend beyond one key line.
- Tests in `test/dynoWork.test.ts` cover the per-release counts, the holds-up count and the ordering.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
