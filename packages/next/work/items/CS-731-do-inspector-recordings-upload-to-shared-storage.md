---
id: CS-731
title: Do inspector recordings upload to shared storage?
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Inspector recordings are most of the data (about 1 GB a week on one machine, mostly screenshots). Which of them go to shared storage?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. Only when pinned or shared: spend stays near the assets budget.
- B. All, pruned after 180 days: available everywhere; about 26 GB held at about 1 GB a week, the most spend.
- C. Never: no spend, but a cited recording can't be read on another machine.

Recommended: A.

Reversibility: two-way.

## Answer

Open.
