---
id: CS-130
title: A plain prepass pipeline for records that neither clip, cut out nor fade
kind: work
state: proposed
created: 2026-11-13
project: CS-14
needs: [CS-129]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table, made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-129. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

A plain prepass pipeline with no fragment stage for records that neither clip, cut out nor fade, keeping the discarding variant for the rest; the cull kernel sorts records into two draw lists by flags. Contingent on CS-129.

## Plan

`docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table.
