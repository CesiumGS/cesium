---
id: CS-545
title: Dyno's roadmap shows each release as a flag above the grid, after the milestones that feed it
kind: work
state: planned
created: 2026-11-15
project: CS-18
needs: [CS-564]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts]
---

The Roadmap view of Dyno's Work page (`bench/suite/views/Work.tsx`, from `roadmapOf` and `milestoneRoadmapOf` in `bench/suite/work.ts`) lays milestones out in steps, but it doesn't show where the releases fall. The release items (CS-530 to CS-533: 2.0.0-alpha.1, beta.1, rc.1 and 2.0.0, each with a `release` key) gate on the milestones they need. The owner asked (2026-11-15) for each release to appear at the top of the grid as a flag between steps, so a reader sees which milestones feed into it.

## Done when

- Each release item shows as a flag along the top of the roadmap grid, placed between the step of the last milestone it needs and the next step, and labeled with its version.
- Selecting a flag, or hovering it, highlights the milestones that feed the release (its gates) and dims the rest. The existing release focus (`search.release`) stays in step with it.
- A release whose gates aren't decided yet (CS-526 to CS-529 are still open) shows as a flag with no placement, saying its milestones aren't chosen, rather than a guess.
- The flags work in both groupings of the roadmap (`roadmap=groups` and `roadmap=matrix`), in both themes, at 380 px wide and with the keyboard, per `packages/next/AGENTS.md` ("UI and examples"). The page's `DESIGN.md` is updated, if it has one.
- Checked on a Dyno server of the executor's own, never the owner's 5190.
