---
id: CS-244
title: Should Cesium ion host PROJ grids, with CORS and cropped tiles?
kind: decision
state: done
created: 2026-11-13
project: CS-189
decider: owner
answer: The engine reads grids through a data-resource seam with ion as one provider; whether ion hosts them moves to CS-490
answered_at: 2026-11-22T02:51:20.212Z
answered_via: question-tool
answered_by: owner
---

## Question

PROJ-data serves no CORS headers, so grids are self-hosted today. The owner suggested ion as a host. Source: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open".

## Options and recommendation

- **Ion hosts the grids** (the owner's suggestion), possibly with cropped regional tiles.
- **Applications self-host,** as today.

The source recommends keeping the grid source a configurable base URL, which is built, so this is a hosting choice, not engine work.

## Answer

Open.

The owner's answer, 2026-11-22, in a review of 2.0's seams. The engine doesn't care where the grids come from: PROJ grids, `proj.db`, the geoid and VDatum come through a data-resource provider (`read(name) → bytes`, with the engine still checking pins), not a fixed base URL. Ion, a new API, local files and the setup store are each one provider. Whether ion actually hosts the grids, with CORS and cropped tiles, is a hosting call and goes with CS-490 (reference data's hosting and shipping) and its legal review.
