---
id: CS-742
title: Merge CS-724, out-of-date data says what to run
kind: decision
state: done
created: 2026-11-19
project: CS-192
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; you then run `npm run sky -- build`."
answered_at: 2026-11-20T06:58:26.898Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-724, which makes setup and the data readers notice out-of-date datasets and say which command to run (sky pack format 2, no alias), into main?

CS-724's branch passed the queue's checks by hand on main 54e0d0b94c: both type checks, hitld work check (739 files), surface (no change), the full suite (5,751 passed, 0 failed) and test:data on the real store (55 passed, skyPack skipped as out of date because your pack is format 1; the executor ran it against a format 2 pack and it passed). Root lint has only main's existing error. The suite also reports one unhandled rejection in loadFrameData.test.ts that main has had since CS-706's merge (30189aa853), not from CS-724, which I missed in earlier checks; its fix is a separate item. Calls: a store with no format record reads as format 1; out-of-date data tests skip. After merge you run `npm run sky -- build`. No CSS removed. Presentation: orch-10-merge-ready-CS-724.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; you then run `npm run sky -- build`.
- B. Hold it: Nothing merges; an out-of-date dataset keeps failing with a parse error instead of saying what to run.

Recommended: Merge it. It is green on main's tip apart from main's own unhandled rejection, it does what you asked on 2026-11-19, and its one step for you after merge is a single command.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
