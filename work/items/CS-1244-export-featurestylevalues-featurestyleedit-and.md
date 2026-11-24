---
id: CS-1244
title: Export FeatureStyleValues, FeatureStyleEdit and StyledFeature from @cesium/core as types?
kind: decision
state: planned
created: 2026-11-24
project: CS-10
decider: owner
---

> **Decision for the owner.** Source: CS-55's review, relayed by orch-11 (2026-11-24). It touches an owner path (`packages/core/src/index.ts`) and `api/surface.txt`. Filed 2026-11-24.

## Question

These three types appear in the public signatures of the exported `FeatureStyle`, so callers can't annotate edits or features without them. Export them, and regenerate `api/surface.txt`?

## Options

- A. Yes, as type-only exports.
- B. No; keep them internal and narrow `FeatureStyle`'s signatures.

**Recommendation (the reviewer's):** A.
