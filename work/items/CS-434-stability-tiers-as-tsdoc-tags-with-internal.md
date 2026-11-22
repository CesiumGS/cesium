---
id: CS-434
title: Stability tiers as TSDoc tags, with internal members stripped from the published types
kind: work
state: planned
created: 2026-11-14
project: CS-437
needs: [CS-438, CS-681]
---

## Done when

The tiers the review approves are marked with TSDoc tags (`@stable`, `@experimental`, `@internal`); `@internal` is stripped from the published types; the surface map records each export's tier; and a test fails when an example imports anything `@internal`. Bundle size and tree-shaking are checked after the split.

Moves only what the owner approved in the review (CS-102).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2.

The owner, 2026-11-17: whether 2.0 keeps marking APIs experimental, and how, is decided first (see this item's needs).
