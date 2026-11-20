---
id: CS-741
title: Merge CS-706, Dyno's cold-start run and the viewer's fixes
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Merge CS-706, which adds Dyno's coldstart run with a 1,400 ms regression budget and the viewer's cold-start fixes, into main?

CS-706 bisected the slow cold start (491 ms on 11-01 to 1,345 ms; engine setup +397 ms, modules +293 ms, framing hold +119 ms) and fixed what was in its scope: settings after the first draw, one manifest read through CS-708's shared loads, one fetch per reference file. Dyno run 2026-11-20T03-50-30-163Z: 1,258 ms against 1,385 ms at its base without the board. The 500 ms work is CS-714 and the check's cadence is CS-715. Checked by hand on main plus CS-712 and CS-720 (tested 7fc966109d): both type checks, hitld work check (722 files), surface, test:data (55 of 55), and the full suite with one load failure (noSceneGains, passed 8 of 8 alone twice); CS-708's strict-mode tests pass unchanged. Root lint has only main's existing error. No CSS removed. Presentation: orch-10-merge-ready-CS-706.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: After CS-720 merges, the orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the viewer keeps its slower start and Dyno has no cold-start run or budget.

Recommended: Merge it. It is green in merge order with CS-708's tests intact, it names the commits that slowed the start with their shares, and it adds the run and budget that hold the line from here.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
