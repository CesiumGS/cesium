---
id: CS-1245
title: "Cesium IR format 0.2: the column type and the cesium/search and cesium/tableGet extensions"
kind: decision
state: planned
created: 2026-11-24
project: CS-10
decider: owner
---

> **Decision for the owner.** Source: CS-56's review, relayed by orch-11 (2026-11-24). It sets a public format and extension names, and touches an owner path (`packages/core/src/ir/FORMAT.md`). Filed 2026-11-24.

## Question

Should Cesium IR's format go to 0.2, adding the `column` type and the two extension ops `cesium/search` and `cesium/tableGet`? `extensions.json` already lists both as "since 0.2", and FORMAT.md would be updated.

## Options

- A. Yes: publish 0.2 with these names.
- B. Yes, with other names.
- C. Not yet: keep them unpublished until CS-56's other parts land.

No recommendation was relayed.
