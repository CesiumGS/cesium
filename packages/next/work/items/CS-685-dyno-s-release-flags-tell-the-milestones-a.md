---
id: CS-685
title: Dyno's release flags tell the milestones a release needs from single items it pulls in early
kind: work
state: planned
created: 2026-11-17
project: CS-18
needs: [CS-683]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

On the roadmap, a release's flag says "after" and lists every milestone that holds any item the release needs, through the needs between items. So alpha.1's flag (owner's screenshot, 2026-11-17) listed "A headed run shows whether worker mode ticks smoother", "Loads and decodes run on Jobs", "USD B-reps stream as 3D Tiles" and "Lines, polygons, labels and CAD styles draw on one path" beside the milestones it really needs, when alpha.1 needed only one or two items from some of them. The plan reads more tangled than it is. The owner asked for "a nice solution to the display issue" in the current batch.

## Done when

- A release flag lists the milestones the release item needs, and, apart from them, the single items it pulls in early from other milestones, each named with the milestone it belongs to ("also needs early: One-off engine loads onto `Jobs`, from Loads and decodes run on Jobs").
- On the roadmap, a milestone a release needs only in part shows how much (for example "1 of 4 items needed by alpha.1"), and hovering or focusing the flag highlights exactly the milestones and items it waits on, with a path for each pulled-in item back to the release item that needs it.
- The counts come from the needs graph in `bench/suite/work.ts`, are covered by tests, and agree with `hitld`'s own needs for the release items (CS-530 to CS-533).
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
