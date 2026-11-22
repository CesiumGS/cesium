---
id: CS-520
title: Install human-in-the-lead v0.1.0-rc.1, pinned, with its first-run setup
kind: work
state: done
claimed_by: hitld-migration
created: 2026-11-15
project: CS-18
needs: [CS-516]
---

Cesium uses human-in-the-lead only from release tags. Install the plugin and its `hitld` command pinned to `v0.1.0-rc.1`, with its first-run setup. The setup writes the owner's person and machine settings files, outside the repository; that step is the owner's.

## Done when

- `hitld version` reports 0.1.0-rc.1 in this repository, installed from the tag, with no machine path in any committed file.
- The owner's person and machine settings files exist, and `hitld config explain` shows the layers that apply here.
- The stale `hitl-adopt` branch and its worktree are removed, with the owner's OK; it predates the plugin's names.

## Notes

Done on 2026-11-15:

- `hitld` is a dev dependency of `packages/next`, pinned to `git+https://github.com/arobison/human-in-the-lead.git#v0.1.0-rc.1` (commit `fe78274`), as human-in-the-lead's design 16.7 plans; `npx hitld version` reports 0.1.0-rc.1. `npm run hitld:setup` sets up a machine: the marketplace, `hitld install` and the plugin, all pinned to the tag.
- `hitld install` wrote `.human-in-the-lead/policy.json` (key `CS`, project `cesium-2-0`, main branch `cesium-2.0-webgpu-poc`, the merge checks), `.claude/settings.json` (the plugin's marketplace pinned to the tag) and the contract block in the root `AGENTS.md`. `hitld check contract` and `hitld check policy` pass.
- The owner's person and machine files are written (`hitld config explain` shows `setup.done`). The machine is a MacBook Air (M2) laptop, kind `workstation`. The person file declares only the weekly plan limit: the plan no longer has a five-hour window. The status-line usage capture is on in this worktree; after the merge, `hitld install --statusline` in the main checkout turns it on there.
- Git hooks: the commit guard runs from `.husky/pre-commit` and `.husky/commit-msg`, with lint-staged now run with `--no-stash` (see `packages/next/AGENTS.md`, "Repository practice"). Prettier leaves the root `AGENTS.md` and `packages/next/work/` alone: a reformat breaks the contract check and hitld's front matter.
- The stale `hitl-adopt` branch and its worktree are removed, with the owner's OK; its project ID and checks are carried into `policy.json`.
