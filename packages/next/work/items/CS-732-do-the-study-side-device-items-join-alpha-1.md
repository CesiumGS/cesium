---
id: CS-732
title: Do the study-side device items join alpha.1?
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Two of the design's build items (studies across devices, and where a verdict carries) need CS-404, which is in milestone CS-480, not in alpha.1. Releases need whole milestones. Where do they go?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. Not in alpha.1: they join CS-480 with CS-404. Alpha.1's device clause for studies is Compare refusing cross-device timing verdicts and Trends keeping devices apart.
- B. Move CS-404 and both items into alpha.1: device-aware verdicts and transportability in alpha, with CS-404's whole scope (CS-687 is answered).

Recommended: A.

Reversibility: two-way: milestone membership.

## Answer

Open.
