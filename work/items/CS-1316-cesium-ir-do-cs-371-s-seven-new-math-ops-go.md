---
id: CS-1316
title: "Cesium IR: do CS-371's seven new math ops go into the 0.1 schema, a new 0.2, or cesium/ extensions?"
kind: decision
state: done
created: 2026-11-24
project: CS-10
decider: owner
---

> **Decision for the owner, answered.** Source: CS-371 (math ops the transform graph needs), raised by its Opus review and relayed by orch-11 (2026-11-24). Filed 2026-11-24.

## Question

CS-371 adds seven ops (asinh, acosh, atanh, expm1, log1p, hypot, rem) to Cesium IR's 0.1 schema and edits `packages/core/src/ir/FORMAT.md`, an owner path. FORMAT.md contradicts itself: its opening says any 0.x release may change a released 0.x schema, while its notes for later work say a new vocabulary op is a new version, and route non-standard ops through `extensions.json`. Three of the ops (expm1, log1p, hypot) aren't KHR_interactivity nodes, but go in KHR's `math/` namespace with their JavaScript Math meanings. How should the new ops enter the format?

## Options and recommendation

- Keep in 0.1, fix the document (recommended by the reviewer): the ops stay in 0.1, and the line saying a new op is a new version changes to match the opening's rule. The format is experimental and engine-internal.
- A new 0.2 schema: add `cesium-ir/0.2` with the seven ops, as the notes for later work say; 0.1 stays frozen.
- cesium/ ops for the three: expm1, log1p and hypot become `cesium/` extension ops in `extensions.json`, leaving `math/` to KHR's nodes.

## Answer

The owner, 2026-11-24: "Keep in 0.1, fix doc (Recommended)". CS-371 keeps the seven ops in the 0.1 schema as written, and FORMAT.md's line about new ops is changed to match its opening rule that a 0.x release may change a released 0.x schema.
