---
id: CS-1223
title: Tests for a change between read and copy, and for an honest maximal batch, at the content boundary
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: CS-1188's scoped Opus check, relayed by orch-11 (2026-11-24). Why now: two cases the boundary handles have no test. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A test changes a source's value between the boundary's read and its copy, and shows the copy is what was checked.
- A test sends a batch at every bound's maximum and shows it is accepted whole.
