---
id: CS-1095
title: Merge CS-395, reference images and the sweep view
kind: decision
state: done
created: 2026-11-23
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; the executor's server can then be stopped."
rationale: the sweep view is hard to parse; tweak the UX later
answered_at: 2026-11-23T22:36:18.526Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-395 into Dyno on main? Its done-when ends in your review: a three-axis sweep reads as small multiples with an image grid, a point within noise says so, and a click on a thumbnail opens the pair in swipe and flicker. The executor's server is still up for that review at `http://127.0.0.1:4103/` (Runs, then Run of Nov 22, 12:27).

A sweep with a reference point now captures each point's settled view, compares it with its reference by the share of pixels changed and FLIP, over the whole image and named crops, and judges it against its own reference's noise floor: the largest difference between repeated captures of that reference, per engine, scene and scenario, with the pair count shown and a one-pair floor marked rough. One rule drives the words, the answer list, the tables and the chart bands; with every scene shown it counts scenes within noise and draws no band. Images of different sizes are not compared. Records made before per-reference floors are labeled pooled. The sweep view shows axes as lines and panels, hollow unsettled points, table twins and an image grid; the Images view compares any two images. Checked in both themes, at 380 px, by keyboard and with reduced motion, console clean. Tested on the three-axis run 2026-11-22T20-27-35-715Z (16 runs, all within noise). Two Claude reviews (Opus) found Important problems, each fixed: the floor was pooled across references and engines, the table and the answer list used different rules, and the CLI log read old fields. A last check (Sonnet) found nothing Important; four cosmetic or unreachable-path Minors go to a follow-up. Found work for the main session: example captures show the host's warning banner. Changes bench/suite and its test only. Checked by the orchestrator on the replay ebed888aa4 (patch identical outside work/): build, npm test 6,972 of 6,972, test:data, checkBundle, surface, shaders, eslint, the handbook.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; the executor's server can then be stopped.
- B. Change it first: Say what to change after your review; it goes back to its executor for a round, then to the gates and to you again.
- C. Hold it: Nothing merges.

Recommended: Merge it. The view does what the done-when asks, the reviews' Important findings are fixed, and every gate passes; your click-through is the remaining check.

If unanswered by 2026-11-26T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
