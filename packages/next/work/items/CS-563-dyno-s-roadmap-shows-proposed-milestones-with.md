---
id: CS-563
title: Dyno's roadmap shows proposed milestones with dashed outlines
kind: work
state: done
created: 2026-11-16
project: CS-18
claimed_by: orch-9-CS-563
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts]
---

The owner wants proposed milestones on Dyno's roadmap, drawn with dashed outlines, and the choice to show or hide them (2026-11-16). Today the roadmap shows committed work only: `milestoneRoadmapOf` in `bench/suite/work.ts` takes a `proposals` flag, which the Proposals view passes and the Roadmap view doesn't (`bench/suite/views/Work.tsx`, about lines 2039 and 5792). That split was a deliberate call when the Proposals view was added, so the roadmap keeps reading as committed work by default.

## Done when

- The roadmap has a toggle that shows proposed milestones alongside committed ones. It's kept in the page's URL like its other settings, and starts off, so the default roadmap stays committed work.
- With the toggle on, each proposed milestone is drawn with a dashed outline, and its stage color stays gray (proposed), so it can't be mistaken for committed work in either theme. The page's legend explains the dashed outline.
- It works in both of the roadmap's groupings (`roadmap=groups` and `roadmap=matrix`), and with the release flags of CS-545, where both exist.
- Checked in both themes, at 380 px wide, with the keyboard only and with a clean console, on a Dyno server of the executor's own, never the owner's 5190 (`packages/next/AGENTS.md`, "UI and examples").
