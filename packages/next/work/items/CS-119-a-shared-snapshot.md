---
id: CS-119
title: A shared snapshot
kind: work
state: proposed
created: 2026-11-13
project: CS-13
needs: [CS-118]
touches: [packages/next/src/thread/snapshotStore.ts, packages/next/src/thread/host.ts]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-423 (Measurements set the default thread), so that milestone cannot be checked while this stays proposed. It also waits on CS-118. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

A shared snapshot, only if CS-117 asks: contingent on CS-118.

## Done when

A/B under isolation shows the saving CS-117 asked for; behaviour identical with and without isolation (both vitest modes, plus an isolated browser run).

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
