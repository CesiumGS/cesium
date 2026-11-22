---
id: CS-943
title: Route, RouteStep and Recordable are exported, so the library build's declaration check passes
kind: work
state: done
created: 2026-11-22
project: CS-437
claimed_by: orch-11-CS-943
---

> **Committed by the owner (2026-11-22):** export them. Source: CS-835's and CS-612's checks. The API names these three types in public signatures, but no entry point exports them, so the library build's declaration check fails.

## Done when

- `Route`, `RouteStep` and `Recordable` are exported from the entry points whose public signatures use them, with doc comments.
- The library build's declaration check passes.
- `npm run surface` is rerun, and `api/surface.txt` is committed with the change.
