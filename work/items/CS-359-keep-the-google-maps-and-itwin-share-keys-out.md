---
id: CS-359
title: Keep the Google Maps and iTwin share keys out of builds
kind: work
state: planned
created: 2026-11-13
project: CS-199
needs: [CS-1127]
---

## Done when

Both keys are read only in development or pasted, and `keepEnvSecretsOut` covers them.

Frozen benchmark builds (`dist-bench`) included: Dyno passes the Google Maps key at run time, the way CS-1127 passes the ion token, and a leak test over a frozen build finds neither key. (Added 2026-11-23 from CS-1127's report.)

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames example".

Was `priority: high` until 2026-11-14; order now comes from what each item unblocks.
