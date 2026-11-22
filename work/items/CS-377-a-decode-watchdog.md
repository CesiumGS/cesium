---
id: CS-377
title: A decode watchdog
kind: work
state: proposed
created: 2026-11-13
project: CS-12
needs: [CS-87]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, section 11, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-465 (Jobs share one tick budget and decode can't hang), so that milestone cannot be checked while this stays proposed. It also waits on CS-87. Rough size: small, about one reviewed change. Decider: the owner. Filed: 2026-11-13.

## Done when

A decode that hangs is detected and its worker replaced.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, section 11.
