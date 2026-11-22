---
id: CS-949
title: "The packed-builds guide: scope each override to the 2.0 packages, and say how pnpm hosts set them"
kind: work
state: proposed
created: 2026-11-22
project: CS-609
---

> **Proposal.** Source: a host application's integration (chief of staff, 2026-11-22). Why: a host that also installs 1.x packages from the registry can already have 1.x's `@cesium/core` 0.1.0 as a dependency of `@cesium/engine`. A global `@cesium/core` override would swap 2.0's core into 1.x's engine. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- `docs/hosts/packed-builds.md` says to scope each override to the 2.0 packages, for example `"@cesium/next>@cesium/core"` in npm's `overrides`, and shows it for every sibling package.
- It says that pnpm doesn't read npm's `overrides` field, and shows the same overrides in pnpm's own settings.
- CS-938's install test covers a host that also has 1.x's `@cesium/core` 0.1.0 installed, and both engines resolve their own core.
