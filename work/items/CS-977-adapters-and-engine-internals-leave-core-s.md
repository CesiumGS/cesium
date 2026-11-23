---
id: CS-977
title: Adapters and engine internals leave core's public entry for the packages the map gives them, before alpha.1 (CS-974 C)
kind: work
state: in-progress
created: 2026-11-22
project: CS-437
needs: [CS-974]
claimed_by: orch-11-CS-977
---

> **Committed by the owner (2026-11-22), through CS-974 C: alpha.1 waits for this.** Source: the Fable API review (`fable-review-api.md`, finding F3).

## Done when

- The adapters the package map places elsewhere (ion, Bing, 3D Tiles, glTF and the rest) and the engine internals leave `@cesium/core`'s public entry for the packages CS-834's map gives them.
- Each moved package publishes at alpha.1 only if its seam has landed (CS-973 C). Its name may change until beta.1's API review, and the release notes say so.
- `api/surface.txt` shows each name in its new home, and `test/importBoundary.test.ts` passes.
- It relates to CS-617 (the split into scoped packages). Name which of CS-617's packages this lands.
