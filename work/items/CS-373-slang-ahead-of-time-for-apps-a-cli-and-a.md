---
id: CS-373
title: "Slang ahead of time for apps: a CLI and a bundler plugin"
kind: work
state: proposed
created: 2026-11-13
project: CS-10
needs: [CS-61]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/shaders.md`, "Later (with the 2.0 package's tooling)", made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-61. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

`npx @cesium/next slang` and a Vite or Rollup plugin compile an app's Slang at the engine's pinned version into `CustomShader` options, reporting version mismatches in the author's terms.

Detail: `docs/design/shaders.md`, "Later (with the 2.0 package's tooling)".
