---
id: CS-743
title: "Main's npm test exits 0 again: the shared manifest load leaves no unhandled rejection when the signal is already aborted"
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-706]
touches: [packages/next/src/ephemeris/frameRoles.ts, packages/next/src/frames/sharedLoads.ts, packages/next/test/**]
---

Source: orch-10's merge check of CS-724, run 2026-11-19-1, logged as E-79. Why now: main's `npm test` has exited non-zero since CS-706's merge (30189aa853), although every test passes, so every check since then has been red without anyone seeing it. Rough size: small. Decider: the owner. Filed: 2026-11-20. Committed by the owner the same day: "Yes, run it now", ahead of CS-390, in run 2026-11-19-1.

`test/loadFrameData.test.ts`, at line 550 ("rejects with the signal's reason when already aborted"), leaves one unhandled rejection. It's clean at 7973ac64a2 and present from CS-706's merge on. Most likely the shared manifest read (CS-708's `sharedLoads.ts`, used by CS-706's `frameRoles.ts`) leaves a rejected promise unobserved when the signal is already aborted. orch-10's checks grepped only pass and fail counts, not vitest's "Errors" line. From now on they count that line as a failure.

## Done when

- `npm test` on main exits 0, with no unhandled errors.
- A test fails on the old code: an already-aborted signal leaves no unobserved rejected promise in the shared load.
- CS-708's strict-mode tests and CS-706's frame-data tests pass unchanged.
