---
id: CS-1281
title: Every pick names the content and scene item it came from, the globe and terrain included
kind: work
state: proposed
created: 2026-11-24
project: CS-193
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host's locate pipeline needs to know which content answered, and today it can't tell for the globe. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- Every pick result names the content and the scene item it came from, through a public type. Today `CorePick.item` cites `World.itemOfDraw` (`packages/core/src/scene/pick.ts`), which no public type declares.
- The globe and its terrain answer as named content too, so a pick on the ground isn't the absence of an item.
- The names are stable across ticks and match the names a host uses to address features as (content name, key).
- `npm run surface` shows the new types, and CS-813's ID images carry the same names.
