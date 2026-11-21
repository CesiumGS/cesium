---
id: CS-778
title: Merge CS-747, the What changed view (since you last looked)
kind: decision
state: done
created: 2026-11-20
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-21T07:50:28.886Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-747, which adds a What changed tab to Dyno's Work page that lists scope changes, answers and merges since a point you pick (your last visit, a date or a commit), each with its reason when the record has one, and copies a short summary as text, into main?

Since the point, it lists items and milestones added, dropped and moved between milestones or releases, decisions answered with their answers, merges, and release membership changes. Each change shows the decision or record behind it, or says 'Not recorded'. Claims aren't counted as changes. Copy as text gives a short status-update summary with titles, not bare IDs. It reads the tracker's git history through one new route on the board's dev-server endpoint (/work-api/changes.json), within CS-704's read budget: tested at no more than 10 git processes cold and one warm (measured 290 to 500 ms cold, 16 ms warm). The endpoint runs git with argument arrays and never a shell, and checks a commit or date against strict patterns before git sees it; malformed input gets a 400, and a test checks git's argument log. Your last visit is kept in this browser, the last eight of them. Outside its touches: the route in scripts/vitePluginWork.ts, its types in scripts/workBoard.d.mts, and its section in bench/suite/DESIGN.md; prettier also rewrapped some existing lines in workBoard.mjs (whitespace only). Checked by hand on main f509a4ab7f (tested 4578c193aa): both type checks, hitld work check, surface (no API change), npm test exit 0 (374 files, 6,332 passed, no unhandled errors), test:data exit 0; no CSS rule removed. Your cold-start check (CS-715) passed at the tested commit: median first frame 1,301 ms without the board and 1,283 ms with it (run 2026-11-21T07-27-52-645Z-mac-apple). The executor's question, for later: a since= URL field so a point can be shared; routes.tsx is the shell's file, so that's a small follow-up. To try it once merged: #/work?view=changes on Dyno; pick Date and Nov 19; Commit and paste fdbe58f; click a figure to jump; Copy as text; Scope to a project. Presentation: orch-11-merge-ready-CS-747.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the digest stays something the chief of staff writes by hand.

Recommended: Merge it. Every gate passes on main's tip, the endpoint's input is checked before git sees it, and it gives a weekly 'what changed' without you writing it.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
