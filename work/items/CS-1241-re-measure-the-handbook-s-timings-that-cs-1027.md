---
id: CS-1241
title: Re-measure the handbook's timings that CS-1027 turned into words
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-1027]
---

> **Proposal.** Source: CS-1027's fix round 2 (`report-CS-1027-fix2.md` in the orchestrator's folder, under "For the chief of staff: figures to re-measure"), relayed by orch-11 (2026-11-24). Why now: CS-1027 removed every timing without a run ID from nine tabs. Each one needs a Dyno run before it comes back as a number. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Each figure in that list is measured in Dyno, and comes back to its tab with its run ID, or stays words with a reason. The list covers B-reps (5), GPU tessellation (5), Transform graph (4), Rendering (4), Clipping (2), Shading (1), Shadows (3), Selection and Spec extensions.
- CS-1027's guard test is updated for each number that comes back.
