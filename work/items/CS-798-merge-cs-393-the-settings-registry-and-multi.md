---
id: CS-798
title: Merge CS-393, the settings registry and multi-axis sweeps
kind: decision
state: done
created: 2026-11-21
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge; CS-394 can then start."
answered_at: 2026-11-22T01:13:35.447Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-393, which gives Dyno's suite a registry of the 13 settings 2.0 takes (engine. and view.), validated before a run, and multi-axis sweeps (repeated --sweep, --sweep-file, --reference, --reference-reps, a point count and --yes) recorded with their axes, reference and points, into main?

An unknown setting is refused before anything runs: --sweep lodExponent=0,1 exits 2 with 'unknown setting "lodExponent" (did you mean view.lodExponent?)' and all 13 settings with their ranges. A two-axis sweep ran as a real Dyno run (2026-11-22T00-36-14-112Z-mac-apple: nyc-buildings cold start, view.lodExponent 0 and 1 by view.occlusionCull on and off, reference view.lodExponent=1): its record holds both axes, the reference and 4 points, each with its coordinates, all ok. View settings reach the page and are read back: in that run each point's view.lodExponent and occlusionCull equal its coordinates, and a run now fails if the page doesn't hold the setting it was asked for, so an old engine can't measure the default under the setting's name. Old one-axis and release sweeps still plot (a new pure module, views/sweepAxis.ts, used by Analysis). --yes is needed only above 60 browser runs. --sweep with --sweep-file together is refused. The options go in bench/suite/commands/table.mjs and the logic in commands/suite.mjs, since CS-721 moved cli.mjs there; CS-784's three lines are kept. Outside its file list: settings.d.mts, views/sweepAxis.ts and Analysis.tsx, and test/dynoSettings.test.ts. Two other runs are recorded but weren't checks: terrain-rainier (every point errored: frozen builds carry no ion token) and one during the network outage. Checked by hand on main a8e996c774 (tested e6af41f423): both type checks, hitld work check (794 files), surface (no API change), npm test exit 0 (379 files, 6,226 passed, no unhandled errors), test:data exit 0. Cold start isn't needed: it doesn't touch the viewer, the engine or frames. For CS-394 (example scenes and development metrics): add param. entries to the registry; frozen builds have no ion token, so use ion:default scenes or --dev. Presentation: orch-11-merge-ready-CS-393.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge; CS-394 can then start.
- B. Hold it: Nothing merges; sweeps stay one-axis with no setting validation, and CS-394 waits.

Recommended: Merge it. Every gate passes, the two-axis sweep ran with every point read back from the page, and old sweep records still plot.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
