---
id: CS-939
title: PickPositionResult and CorePick say camera, not cameraRecord (CS-935)
kind: work
state: done
created: 2026-11-22
project: CS-437
needs: [CS-815]
claimed_by: orch-11-CS-939
---

> **Committed by the owner (2026-11-22), through CS-935's answer A.**

## Done when

- `PickPositionResult` and `CorePick` name their camera field `camera`, as `PickResult` does.
- Callers in `packages/crs`, the examples and the handbook change with them.
- `npm run surface` is rerun, and `api/surface.txt` is committed with the change.
