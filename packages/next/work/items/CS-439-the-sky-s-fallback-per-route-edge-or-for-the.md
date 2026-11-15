---
id: CS-439
title: The sky's fallback per route edge or for the whole sky, and exposure tuning, settled as the sky goes per body
kind: work
status: Planned
created: 2026-11-14
project: CS-188
needs: [CS-221]
---

## Done when

`attachSky` and the frame resolver agree on falling back: today the sky falls back for the whole sky at once, where the resolver falls back per edge of a route. The choice is settled as the physical sky goes per body (CS-221), together with the exposure tuning: the 0.18 target and the highlight guard are tested on the per-body scenes.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 5a", "Sky".
