---
id: CS-270
title: Where does 2.0's default evaluation token come from?
kind: decision
status: Planned
created: 2026-11-13
project: CS-191
decided-by: owner
---

## Question

The owner wants 1.x-style default token behaviour, with the on-screen notice, in `@cesium/next/ion` (2026-11-08). Source: `docs/design/ion-as-a-module.md`, "A default evaluation token".

## Options and recommendation

- **Read 1.x's per-release token** from `packages/engine/Source/Core/Ion.js` at build time.
- **Have ion issue a 2.0 token** with its own rotation.

The source makes no recommendation.

## Answer

Open.
