---
id: CS-755
title: Merge CS-22, paths in one place with the seam test
kind: decision
state: planned
created: 2026-11-19
project: CS-8
decider: owner
---

## Question

Merge CS-22, which chooses every device path in one function (paths(facts)) and adds the device-facts seam test (CS-466 c2), into main?

Star submission, the transcode target, translucency lists, GPU timing and the moments step now come from paths(facts) and deviceChoices; RenderContext.caps is gone; a seam test fails on any device-facts read outside src/gpu and src/profile and passes with none. Parity pages (translucency, models, observer, baseline, imagery twice against the base) show no change beyond the base's own spread. Checked by hand on main plus CS-743 (tested e2e88df5b7): both type checks, hitld work check (741 files), surface (no API change), npm test exit 0 (5,764 passed) and test:data exit 0. Moves reads outside its touches in src/gpu, src/io, src/globe and src/atmosphere, with tests. CS-33 starts from it. Presentation: orch-10-merge-ready-CS-22.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: After CS-743, the orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; CS-33 is set up from it.
- B. Hold it: Nothing merges; render code keeps reading device facts directly, and CS-33 and CS-23 wait.

Recommended: Merge it. It meets CS-466 c2 with a seam test that passes clean, parity is unchanged, and the milestone chain and CS-414 wait on it.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
