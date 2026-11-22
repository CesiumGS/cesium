---
id: CS-990
title: GpuDevice and the GPU-typed names move to a main-thread-only entry, and World stays on the main entry (CS-988 B)
kind: work
state: planned
created: 2026-11-22
project: CS-437
needs: [CS-988]
---

> **Committed by the owner (2026-11-22), through CS-988 B, before beta.1.** Source: the Fable API review (`fable-review-api.md`, F2).

## Done when

- `GpuDevice` and the GPU-typed names leave core's main entry for a main-thread-only entry (CS-107) that a device-sharing host imports by name.
- `World` stays on the main entry, with no GPU-typed members in its public shape.
- `api/surface.txt` and the import-boundary test show the split.
