---
id: CS-442
title: "Exact lists and the meter: emission layers against the 32-node cap, and a Node port for the moments branch"
kind: work
status: Planned
created: 2026-11-14
project: CS-192
---

## Done when

A layer with emission no longer halves what the exact lists hold: today it writes a second list node for the meter, so the 32-node cap holds 16 such layers, and at the cut a layer's emission can stay without its body. The moments branch of `layersAt` has a Node port and a pin.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 5a", "Exact lists and the meter".
