---
id: CS-1097
title: Does CS-913's USD reader get one structural round, a narrower scope, or another site-by-site round?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T20:29:35.137Z
answered_via: question-tool
answered_by: owner
---

## Question

Each CS-913 round bounds the costs a review names, and the next review finds more ways a small hostile file runs for a long time, because the budget counts sites, not work (review-CS-913-r2.md, -r3.md). How should it go?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. One structural round: one work budget every loop charges, an input byte cap, linear scans for the two regexes, and a generated hostile-file invariant test.
- B. Narrow the scope: state it isn't hardened, merge, and leave hardening to CS-559.
- C. Another site-by-site round.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
