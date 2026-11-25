---
id: CS-1165
title: Release 2.0.0-alpha.4
kind: work
state: planned
created: 2026-11-23
project: CS-18
needs: [CS-1164, CS-415, CS-417, CS-418, CS-419, CS-475, CS-476, CS-498, CS-641, CS-646, CS-668, CS-473, CS-474, CS-416]
release: 2.0.0-alpha.4
---

## Done when

- `hitld release make` has made 2.0.0-alpha.4, with its record and tag, on the owner's word, and every gate this item needs was met first.

## Notes

A release in the alpha series (the owner's answer to CS-1157, 2026-11-23): off the main thread: worker mode, the job system's ports and the thread defaults, built on the approved API and Cesium IR. A host can build on it; the API may still change. The grouping follows the item graph (each alpha needs nothing from a later one) and is the chief of staff's call, and cheap to change: move a milestone between alphas by editing the needs.

Regrouped on 2026-11-24, after the owner, 2026-11-24: "i think worker mode and jobs needs to come up, i don't want to waste work doing things on the main thread and then reimplementing it on the jobs system". This alpha is now one shading path on both renderers: WebGL 2 drawing and parity, Cesium IR, shader languages, OpenPBR and live shaders, glTF and 3D Tiles at 1.x's coverage, 1.x's formats and shapes, particles, and warped views. The chief of staff's call, and cheap to change.
