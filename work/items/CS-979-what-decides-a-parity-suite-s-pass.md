---
id: CS-979
title: What decides a parity suite's pass?
kind: decision
state: done
created: 2026-11-22
project: CS-199
decider: owner
answer: C
answered_at: 2026-11-22T21:06:16.293Z
answered_via: question-tool
answered_by: owner
---

## Question

Most of the Lab's parity suites have no verdict: they return numbers, and dyno lab reports ran. What decides a suite's pass?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. No regression against the last accepted run on the same renderer class, within a tolerance per suite.
- B. Absolute thresholds from docs/design/parity.md.
- C. Both: B where the design states a threshold, A everywhere.

Recommended: C.

## Answer

Open.
