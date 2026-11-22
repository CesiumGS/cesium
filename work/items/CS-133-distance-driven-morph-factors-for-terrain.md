---
id: CS-133
title: Distance-driven morph factors for terrain
kind: work
state: proposed
created: 2026-11-13
project: CS-14
needs: [CS-132]
touches: [packages/next/src/streaming/**]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table, made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-132. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

CDLOD-style distance-driven morph factors for terrain (t = min(time-based, error-based)), so a camera moving at a steady speed shows no timed morphs at all. Only if the measurements ask: contingent on CS-132.

## Plan

`docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table.
