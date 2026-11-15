---
id: CS-35
title: The probe, the `renderer` option and an empty WebGL 2 device
kind: work
status: Planned
created: 2026-11-13
project: CS-9
needs: [CS-33, CS-21]
---

The probe, the `renderer` option and an empty WebGL 2 device. Needs CS-33 and CS-21.

## Done when

- `emulate: "webgl2-basic"` makes an engine that clears.
- The bundle check passes.
- On a device below the floor, creating an engine rejects with a message naming the missing item.

## Files

- `src/render/webgl2/`
- `src/gpu/`

Detail: `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
