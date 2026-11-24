---
id: CS-1226
title: Draco's and meshopt's WebAssembly heaps grow before any check and never shrink
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-969]
---

> **Proposal.** Source: CS-969's Opus security review, relayed by orch-11 (2026-11-24). Why now: a hostile tile can grow a decoder's heap past the worker's limit, and the memory is never returned. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A decoder's output size is checked against the limits before its heap grows.
- A worker whose decoder heap passed a set size is recycled, with a test.
