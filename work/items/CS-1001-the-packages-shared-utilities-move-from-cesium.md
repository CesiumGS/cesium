---
id: CS-1001
title: The packages' shared utilities move from @cesium/core/internal into their own package, documented as internal
kind: work
state: planned
created: 2026-11-22
project: CS-437
---

> **Committed by the owner (2026-11-22), through CS-1000's answer: a separate shared package.** Source: the Fable API review (`fable-review-api.md`, F12). The package's name follows CS-616's naming and may change until beta.1 (CS-973 C).

## Done when

- The utilities that `@cesium/core/internal` shares (CS-883) move into their own package, for example `@cesium/shared`. Its README and `package.json` description say it's for the 2.0 packages' own use, with no compatibility promise.
- Every 2.0 package that used `./internal` depends on it at the exact lockstep version, and `./internal` leaves core's exports.
- Shared objects keep one identity across packages (for example `TransformNode`), shown by a test that imports through two packages.
- The import-boundary test, `api/surface.txt` and the packed checks reflect the new package.
