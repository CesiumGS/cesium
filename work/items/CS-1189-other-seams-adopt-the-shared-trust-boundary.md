---
id: CS-1189
title: Other seams adopt the shared trust boundary
kind: work
state: proposed
created: 2026-11-23
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: the owner, 2026-11-24: "our other seams will no doubt need to take this same trust approach, so perhaps there's some code to be refactored out and shared". Why now: once CS-1188 lands, every seam that takes values from registered code (content kinds, asset resolvers, jobs, renderer extensions) should get the same three guarantees from the same code instead of its own checks. Size: medium; one change per seam. Decider: owner. Filed 2026-11-24.

## Done when

- Each seam that takes values from host-registered code is listed, with its inlets.
- The list names `sinks.draws` and `SourceHost.fetch`, which CS-1188's review (2026-11-24) left outside its boundary.
- Each one routes its inlets through CS-1188's boundary module, with a schema table of its own, and its tests check I1 to I3.
- What can't adopt it is named, with the reason.
