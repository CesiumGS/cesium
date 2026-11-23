---
id: CS-1028
title: "Per-feature entry points with byte budgets: three budgeted pages in the bundle check (CS-1026 A)"
kind: work
state: planned
created: 2026-11-22
project: CS-195
needs: [CS-1026]
---

> **Committed by the owner (2026-11-22), through CS-1026 A, before beta.1.** Source: the Fable performance review (`fable-review-performance.md`, F7).

## Done when

- The package has per-feature entry points (with CS-554 and CS-765), and `scripts/checkBundle.mjs` has three budgeted pages: a minimal globe, a tileset viewer and a full app. Each has a byte budget.
- A page over its budget fails the check, shown by a planted import.
