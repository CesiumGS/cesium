---
id: CS-240
title: "Frames 5b's carried-forward fixes: angular velocity, the ORION_NADIR fixture, ray targets and standing queries"
kind: work
status: Planned
created: 2026-11-13
project: CS-189
---

## Done when

ORION_LVLH and EARTH_MOON_ROT meet their fixture tolerance for angular velocity; the ORION_NADIR fixture is generated with the Earth PCK; a tileset ray target culls by `Tile.volume` boxes; a standing query with a frame takes its revision from the resolver's routes; terrain bands match the body's geodetic offsets near the poles, or say so.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 5b".
