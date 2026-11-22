---
id: CS-345
title: Acceleration structures behind `acceleration.ts`
kind: work
state: proposed
created: 2026-11-13
project: CS-197
needs: [CS-344]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/ray-queries-and-path-tracing.md`, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-535 (Rays query the scene on the GPU), so that milestone cannot be checked while this stays proposed. It also waits on CS-344. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

Bottom- and top-level structures replace the brute-force job list in `raycast.slang`.

Detail: `docs/design/ray-queries-and-path-tracing.md`.
