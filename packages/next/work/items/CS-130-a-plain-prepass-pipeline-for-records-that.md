---
id: CS-130
title: A plain prepass pipeline for records that neither clip, cut out nor fade
kind: work
status: Proposed
created: 2026-11-13
project: CS-14
needs: [CS-129]
---

A plain prepass pipeline with no fragment stage for records that neither clip, cut out nor fade, keeping the discarding variant for the rest; the cull kernel sorts records into two draw lists by flags. Contingent on CS-129.

Detail: `docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table.
