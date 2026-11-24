---
id: CS-1160
title: Hosts drive orthographic and projective cameras, with navigation
kind: milestone
state: planned
created: 2026-11-23
project: CS-188
outcome: A host sets an orthographic or general projective camera, fits it to bounds, dollies between projections, and moves it with @cesium/navigation's orbit, globe and inspect controllers, with level of detail and picking right in each projection.
constraints: [CS-218 c?, CS-1117 c?, CS-1124 c?, CS-1176 c?]
---

## Notes

Grouped from alpha.1's loose work items (CS-1157): the owner put the orthographic camera in alpha.1, as a constructor on the camera record (CS-1117), with `@cesium/navigation` (CS-1124). CS-218 left CS-425 for it.
