---
id: CS-1091
title: "2.0 installs with pnpm: pnpm-lock.yaml, pnpm in worktree setup and CI, npm kept for packing and staging (CS-1090 A)"
kind: work
state: in-progress
created: 2026-11-22
project: CS-609
needs: [CS-951, CS-1090]
claimed_by: orch-11-CS-1091
---

> **Committed by the owner (2026-11-23), through CS-1090 A: once CS-951's pnpm test runs pass.** It replaces CS-894's npm lockfile with pnpm's. Source: CS-951's spike (`docs/design/pnpm-spike.md`). Its changes to owner paths come to the owner at merge.

## Done when

- First commit: declare `@cesium/dyno` at the root, then rerun the full suites under pnpm (`test`, `test:data`, `typecheck`, `tsc -p .`). Go ahead only if everything is green; otherwise stop and report (the owner's clarification on CS-1090, 2026-11-23).
- `pnpm-lock.yaml` replaces `package-lock.json`, imported from it, and pins pnpm 11.12.0 or later through corepack (`packageManager`).
- The three undeclared dependencies are declared: playwright and sharp at the root, onnxruntime-web in `spikes/core-ir`. `@cesium/dyno` resolves for `npx --no-install`.
- `worktree_setup` in `.human-in-the-lead/policy.json`, the gate scripts, the CI workflows, Dependabot, `scripts/packSet.mjs`, the hosts guide and the docs use pnpm.
- The release path still packs and stages with npm (`npm pack`, `npm stage publish`), unchanged.
- A fresh clone installs, builds and tests with pnpm. A second worktree installs from the shared store.
