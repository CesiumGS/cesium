---
id: CS-731
title: Do inspector recordings upload to shared storage?
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: B, retain everything for now with no pruning; if the owner is unhappy with the spend or finds no value in old recordings, pruning can start later
answered_at: 2026-11-20T04:31:20.813Z
answered_via: question-tool
answered_by: owner
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

Every recording uploads, and nothing is pruned for now (owner, 2026-11-19): "let's retain everything for now, if i'm unhappy with the spend or find no value in the old stuff we can start pruning later." So the recordings budget warns rather than stops uploads, and pruning stays off until the owner turns it on.
