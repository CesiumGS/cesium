---
id: CS-587
title: The geocoder widget, with a pluggable geocoding service
kind: work
state: planned
created: 2026-11-17
project: CS-584
needs: [CS-585]
---

## Done when

- The geocoding service is a plain typed interface outside the widget (a query in, places with extents and credits out), so apps without React can use it. Added 2026-11-21, from the owner's review of 2.0's seams.
- A geocoder widget searches through a service interface; Cesium ion's geocoder and at least one other service plug in, and an app can supply its own.
- Results fly the camera to the place, and errors are shown, never swallowed.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
