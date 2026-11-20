---
id: CS-725
title: Merge CS-720, route inverses for general affine steps
kind: decision
state: done
created: 2026-11-19
project: CS-17
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-20T04:08:52.596Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-720, which makes routeInverse invert general affine steps (scale and shear) and throw on a singular one, into main?

CS-720 does what you chose in CS-719 A. Its branch passed the queue's checks by hand on main plus CS-712 (tested 143ee032a3, replayed onto 14143e3207 as ba90e08cb9 with the fast checks rerun): both type checks, hitld work check (722 files), surface (unchanged), the full suite (5,709 passed, 0 failed), and test:data (54 of 55; skyPack fails on the local pack as on main). Root lint has only main's existing error. On the old code a scale-and-shear round trip came back 27.5 m off; now within 1 nm. clips.ts keeps its rigid-only inverse with a comment; other callers get the fix through routeInverse. Five files, all in touches, no CSS. Presentation: orch-10-merge-ready-CS-720.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; a route through a scaling or shearing affine edge keeps inverting wrongly.

Recommended: Merge it. It fixes a measured error of up to a kilometer, it is green on main plus CS-712, and its changes stay inside its touches.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
