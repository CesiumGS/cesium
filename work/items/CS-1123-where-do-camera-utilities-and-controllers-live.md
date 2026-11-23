---
id: CS-1123
title: Where do camera utilities and controllers live?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A, a new @cesium/navigation
answered_at: 2026-11-23T22:51:26.853Z
answered_via: question-tool
answered_by: owner
---

## Question

Where do fitBounds, transitions and flights, and the orbit, globe and inspect controllers live? @cesium/ui is StrataKit widgets with React, a 2D overlay.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. A new @cesium/navigation on core's public API, with no React and no DOM; @cesium/ui's Viewer uses it.
- B. @cesium/camera.
- C. Keep them in core.
- D. Examples only.

Recommended: A.

## Answer

Open.
