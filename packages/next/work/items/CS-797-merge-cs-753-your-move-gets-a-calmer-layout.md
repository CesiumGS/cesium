---
id: CS-797
title: "Merge CS-753, Your move gets a calmer layout: fewer, larger, ranked entries"
kind: decision
state: done
created: 2026-11-21
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-22T01:13:34.776Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-753, which redraws Dyno's Your move: each section (decisions, merges, health exceptions that need you, proposals, outside waits) leads with its number and its top five entries ranked by what they hold up, each with its age, its title and its one action, the rest folded under 'and N more', in body text no smaller than the page's, into main?

Ranking: by what an entry holds up, then oldest, then ID; a merge that waits for your yes comes first. Wide screens show two levels, 'Waiting on you' and 'Moving without you' (In progress and Ready to start, drawn quieter); narrow screens one column, with nothing scrolling sideways. Body text is at least 14 px; secondary detail moved into each entry's drawer. Empty sections collapse to one line, and a clear Your move says so. Actions open the pane (Decide, Review, Follow up) or go to Health (Fix); no commands are shown. The 'Proposals for you' card counts CS-750's groups (needed, waiting, new, deferred) and links to the Proposals view; CS-688's stage card and its helpers are gone, and the live run's 'Done, not merged' column moved into Merges. I checked each of the 66 CSS classes it removes: none is still used on the branch or on main; the shared .work-bar, .work-card, .work-dash and .work-live-source stay. Outside its touches: its section and updated lines in bench/suite/DESIGN.md, and eslint.seatbelt.tsv (Work.tsx's allowance fell from 8 to 4). Checked by hand on main a8e996c774 (tested 51e2529c04): both type checks, hitld work check (794 files), surface (no API change), npm test exit 1 on one noSceneGains test (CS-538, known under load; this change touches nothing under src/), then 8 of 8 alone three times, every other file passed; test:data exit 0. Cold start isn't needed: Dyno views only. Follow-ups for the chief of staff: Health should bring a chosen row into view, as Proposals does; work.ts's proposalsForOwner and its stage types now have only test callers; some work.css rules were unused before this change. To try it once merged: #/work on Dyno; open a row's chevron; use 'and 10 more' under Decisions; press Fix on a health exception; 'Open the Proposals view'; #/work?project=CS-193 for empty sections; narrow the window under 960 px. Presentation: orch-11-merge-ready-CS-753.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; Your move keeps today's layout and CS-688's proposal stages.

Recommended: Merge it. Every gate passes but one known load failure that passes alone, no removed style is in use, and it answers your 'too much tiny text, bad layout' point by point.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
