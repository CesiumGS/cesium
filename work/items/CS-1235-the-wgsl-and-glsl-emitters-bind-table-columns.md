---
id: CS-1235
title: The WGSL and GLSL emitters bind table columns and emit a bounded search
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review, relayed by orch-11 (2026-11-24). Why now: CS-56 adds the column type and the search to the IR; the emitters don't produce them yet. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The WGSL and GLSL emitters bind columns, and emit a search bounded by a constant, with every index clamped.
- The df64 center pass searches (hi, lo) copies of a column.
- Conformance vectors cover both emitters.
