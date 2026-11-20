---
id: CS-756
title: Merge CS-390, run identity and the machine-wide run lock
kind: decision
state: done
created: 2026-11-20
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; the chief of staff changes the 5190 start script to npm run dyno:serve."
answered_at: 2026-11-20T21:24:27.750Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-390, which records each Dyno run's identity (purpose, item, branch, worktree, base, machine alias) and lets only one run at a time use this machine, into main?

Every run now records purpose (dev or baseline), item, branch, worktree, base and a machine alias such as mac-apple, never the host or user name. run, images and coldstart take a lock at ~/.cesium-bench/run.lock; a second run waits and says whose it waits for; interactive Dyno never takes it. Your 5190 server starts with npm run dyno:serve after this, and npm run dyno takes a free port from 5200 to 5299, so the detached 5190 start script changes once. Checked by hand on main d6c7a16f9d (tested 6c0cdfe7bb): both type checks, hitld work check (753 files), surface (no API change), npm test exit 0 (5,802 passed), test:data exit 0, noSceneGains 8 of 8 alone; no CSS removed. Outside its touches: two run-name regexes, one AGENTS.md line, type stubs. Presentation: orch-11-merge-ready-CS-390.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; the chief of staff changes the 5190 start script to npm run dyno:serve.
- B. Hold it: Nothing merges; runs keep no identity and two runs can still overlap on this machine.

Recommended: Merge it. Every gate passes on main's tip, the lock never blocks interactive use, and the one change for you is the 5190 start command.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
