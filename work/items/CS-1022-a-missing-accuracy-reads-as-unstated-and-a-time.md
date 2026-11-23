---
id: CS-1022
title: A missing accuracy reads as unstated, and a time-dependent operation with no epoch reports undefined accuracy (CS-1016, CS-1017)
kind: work
state: planned
created: 2026-11-22
project: CS-196
needs: [CS-1016, CS-1017]
---

> **Committed by the owner (2026-11-22), through CS-1016 and CS-1017, before beta.1.** Source: the Fable accuracy review (`fable-review-accuracy.md`).

## Done when

- Core reads a host's map with no stated accuracy as unstated ("can't tell"), never as exact.
- A time-dependent coordinate operation with no epoch reports an undefined accuracy.
- Tests cover both.
