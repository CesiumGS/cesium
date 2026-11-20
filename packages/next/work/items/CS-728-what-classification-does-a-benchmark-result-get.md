---
id: CS-728
title: What classification does a benchmark result get by default?
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: A
answered_at: 2026-11-20T04:31:16.403Z
answered_via: question-tool
answered_by: owner
---

## Question

Every result carries a classification label (hitld's references need one). What is the default, and from what set?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. Confidential by default, from an open set (confidential, internal, public): matches hitld's proposal and the rule that results stay internal (`docs/design/benchmark-suite.md`); sharing needs a deliberate relabel.
- B. Internal by default: fewer relabels, but over-sharing by default can't be recalled.
- C. No labels yet: less to build, but hitld's references need one, and adding labels later is a migration.

Recommended: A.

Reversibility: two-way for the default and the labels; one-way for anything published.

## Answer

A, confidential by default, from an open set: confidential, internal, public (owner, 2026-11-19).
