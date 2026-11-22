---
id: CS-969
title: "Content workers bound what a file states: allocation, recursion and graph limits, and a watchdog that ends a hung worker"
kind: work
state: planned
created: 2026-11-22
project: CS-191
---

> **Committed by the owner (2026-11-22), for alpha.1.** Source: the Fable security review (`fable-review-security.md`).

## Done when

- Every content worker (glTF and GLB, 3D Tiles, terrain, imagery, KTX2 and Basis, the USD reader) bounds what a file states for itself: allocation sizes, recursion and graph depth, and counts, refusing by name what exceeds them.
- A watchdog ends a worker that runs past its limit and reports the content as failed, so a hung worker can't take a slot from the pool for good.
- Tests feed small hostile files (a few kilobytes that claim huge sizes or deep graphs) and show each refused within its limit.
