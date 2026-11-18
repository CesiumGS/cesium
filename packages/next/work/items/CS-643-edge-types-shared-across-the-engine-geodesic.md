---
id: CS-643
title: "Edge types shared across the engine: geodesic, rhumb and straight in a CRS"
kind: work
state: planned
created: 2026-11-17
project: CS-189
---

## Done when

- `/measure` answers distance, bearing and area along geodesic, rhumb and straight-in-a-CRS edges with stated accuracy; the rhumb line is our own implementation, tested against a reference.
- The vector pipeline and the geometry generators subdivide by the same edge types.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
