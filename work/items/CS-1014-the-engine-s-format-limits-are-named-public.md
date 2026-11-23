---
id: CS-1014
title: The engine's format limits are named public constants a host can read and raise (CS-1012 A)
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-1012]
---

> **Committed by the owner (2026-11-22), through CS-1012 A, before beta.1.** Source: the Fable security review (`fable-review-security.md`). It builds on CS-969's limits.

## Done when

- The largest accessor, table, image and tile the engine accepts, and the workers' other limits, are named public constants, documented in the style of `docs/design/gpu-limits-and-capacities.md`.
- A host can read them and raise them per engine, within stated hard ceilings.
- Content past a limit is refused by name, naming the limit.
