---
id: CS-321
title: How should an engine-wide memory budget be sized without a VRAM query?
kind: decision
status: Planned
created: 2026-11-13
project: CS-194
decided-by: owner
---

## Question

Budgets are per tileset today. Source: `docs/design/tile-selection-and-memory.md`, "Memory management (open design question)"; `docs/history/m2-progress.md`.

## Options and recommendation

- **Adaptive signals:** allocation failures, frame time, device loss.
- **Platform heuristics:** integrated against discrete.
- **An application hint.**

The source recommends starting conservative and growing while there are no failures.

## Answer

Open.
