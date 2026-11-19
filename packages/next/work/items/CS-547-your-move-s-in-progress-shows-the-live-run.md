---
id: CS-547
title: "Your move's In progress shows the live run: dispatches in flight and branches done but not merged"
kind: work
state: done
created: 2026-11-15
project: CS-18
claimed_by: orch-9-CS-547
touches: [packages/next/bench/suite/work.ts, packages/next/bench/suite/views/Work.tsx, packages/next/scripts/workBoard.mjs]
---

The "In progress" box on Dyno's Work page, Your move view, showed "Nothing is in progress" during run 2026-11-16-3, while CS-48 and CS-543 were done on unmerged branches, a follow-up dispatch (D-10) was recorded, and the run held its lease. The box counts only items claimed on other branches (`inFlightOf` and `workInProgress` in `bench/suite/work.ts`, from `hitld work claims` through `scripts/workBoard.mjs`). The contract closes an item in the branch that does the work, so a finished, unmerged branch has no open claim, and hitld's ledger and run state aren't read at all.

Related: CS-517 (the agent system's pages, the merge queue among them) shows the queue in depth. This item only makes the box tell the truth about what's moving.

## Done when

- In progress lists every item a dispatch is working on (`hitld ledger in-flight`), with its dispatch and how long it's been running.
- The age shown for an item in progress is measured from its dispatch's start (the ledger) or its claim commit, never from the day-bucketed stage history (`flowOf`'s `since`). On 2026-11-18 the box showed about 21 hours for items claimed ten minutes earlier.
- It lists items done on a branch and not merged, each with its branch and whether the merge queue has it, is testing it, or waits for the owner's yes.
- It names the active run and the orchestrator holding its lease (`hitld run status`), or says no run is active.
- Stale claims on branches already merged (CS-174 today) don't show as in progress.
- Each figure says where it was read from and when. When hitld's records can't be read, the box says so, rather than "Nothing is in progress".
- Checked on a Dyno server of the executor's own, never the owner's 5190, per `packages/next/AGENTS.md` ("UI and examples").
