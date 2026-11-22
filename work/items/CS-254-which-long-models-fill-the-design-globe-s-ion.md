---
id: CS-254
title: Which long models fill the design globe's ion slots?
kind: decision
state: planned
created: 2026-11-13
project: CS-189
decider: owner
---

## Question

The design globe has two ion slots built empty (`ION_SLOTS` in `examples/design-globe/sites.ts`). Each needs a model with its CRS, units, site transform and placement. One candidate uses a Sandcastle share key that expires on 2027-01-01. Source: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open".

## Options and recommendation

- **The owner supplies models** for one or both slots.
- **Leave the slots empty** until a real long iModel is available.

The source makes no recommendation: the models are the owner's to supply.

## Answer

Open.
