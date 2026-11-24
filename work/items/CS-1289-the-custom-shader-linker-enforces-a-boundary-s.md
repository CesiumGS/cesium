---
id: CS-1289
title: The custom shader linker enforces a boundary's provides for every custom shader, not only a render feature's
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-972]
---

> **Proposal.** Source: CS-972's first report, relayed by orch-11 (filed 2026-11-24). Why now: today the linker checks only `requires`, so a shader passed to `World.addDraw` directly can name `records` or bind group 1. CS-972 refuses that only through the feature context (its audit's holes table). Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The custom shader linker checks each boundary's `provides` for every custom shader, not only a render feature's, so a shader given to `World.addDraw` directly can't name `records` or bind group 1.
- Tests cover a host shader that tries each, and the refusal names the boundary.
- CS-972's audit's holes table drops the row.
