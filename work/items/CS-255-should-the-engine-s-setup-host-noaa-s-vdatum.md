---
id: CS-255
title: Should the engine's setup host NOAA's VDatum surfaces (MLLW, MHW)?
kind: decision
state: planned
created: 2026-11-13
project: CS-189
decider: owner
---

## Question

NOAA's tidal surfaces are not in PROJ-data, so 4b reports them as unavailable. It blocks nothing. Source: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open"; `docs/superpowers/plans/2026-11-07-frames-4b-placement-and-geoids.md`.

## Options and recommendation

- **Self-host** them, with their terms checked.
- **Leave them unavailable,** as today.

The source makes no recommendation.

## Answer

Open.
