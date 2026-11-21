---
id: CS-785
title: Merge CS-749, the Plan view becomes Order
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-749, which replaces the Roadmap's Plan view with Order, the planner's sequence for a release, interleaved across projects, with sizes in items (and token ranges once estimates exist), concurrency drawn from history instead of an executor-slot setting, a labeled legend and one tooltip per bar, into main?

It keeps the built-in ID 'plan', so old roadmap=plan links open Order, after Release, Path and Projects (order 40). No executor-slot setting: concurrency is read from history, per day with work in progress, as a range labeled as history; today it's 1 to 2, and the order plans with the typical day, rounded up. Sizes are items now; with estimates on 2 of 6 items in a fixture it shows 60k to 180k tokens. Every legend color has a label; the intro text moved into an info popover. Hovering a bar shows one tooltip, tested with the pointer, the keyboard and both at once. The hover card's slip line stays in step: it now uses the same function and inputs as Order. Removed with the old Plan view: its 'Releases and the milestones they need' panel (Health's release crossings cover those breaks), its canvas and key code, about 1,690 lines of Work.tsx and 719 lines of work.css. I checked every one of the 91 removed CSS classes: none is still used on the branch or on main's tip, What changed (CS-747) included. Outside its touches: its section and updated lines in bench/suite/DESIGN.md, and eslint.seatbelt.tsv (Work.tsx's allowance fell from 13 to 11 as code went). Checked by hand on main 6cf085ab20 (tested e077470c5e): both type checks, hitld work check (782 files), surface (no API change), npm test exit 0 (378 files, 6,453 passed, no unhandled errors), test:data exit 0. Cold start isn't needed: Dyno views only. The executor's question, for you, not part of this merge: concurrency history is weak, because the board dates events by commit date, so 34 of 49 finished spans read as claimed and closed in one instant and are left out of the range; the page says so. Its recommendation: a follow-up to read author dates, or hitld's dispatch history, in scripts/workBoard.mjs. To try it once merged: #/work?view=roadmap&roadmap=plan on Dyno (alpha.1): hover bars across the lanes, Tab into the lanes and use the arrows, open the (i) beside the picker, click a bar to open it in the pane; then &release=CS-531&proposed=show for beta.1. Presentation: orch-11-merge-ready-CS-749.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge; CS-752 (Flow) and CS-753 (a calmer Your move) can then start, one after the other.
- B. Hold it: Nothing merges; the Plan view keeps its executor-slot setting and unlabeled legend, and CS-752 and CS-753 wait.

Recommended: Merge it. Every gate passes, no removed style is still in use, and it answers each thing you found wrong with the Plan view.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
