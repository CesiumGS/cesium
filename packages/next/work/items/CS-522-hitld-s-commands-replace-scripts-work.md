---
id: CS-522
title: hitld's commands replace scripts/work
kind: work
state: done
created: 2026-11-15
project: CS-18
needs: [CS-521]
claimed_by: hitld-migration
---

Once the files are in human-in-the-lead's format, its `hitld work` commands do what `scripts/work` does now: `new`, `check`, the views, claims and the generated lists. The scripts retire, and the rules that name them follow.

## Done when

- `hitld work new`, `check`, `claims`, `ready`, `views` and the lists in `work/README.md` do what `scripts/work` does, and `scripts/work` is gone, or reduced to what `hitld` doesn't cover, with the reason.
- `npm test` runs `hitld work check` in place of the tracker's own check.
- `packages/next/AGENTS.md` ("Work items"), the work-items skill and the tracker's design note describe the `hitld` commands.
- A claim, a close and a new item made with `hitld` on a branch merge as they do today.

## Notes

Done on 2026-11-15:

- `scripts/work/new.mjs`, `views.mjs` and Cesium's own `migrate.mjs` are retired. Their jobs are `hitld work new`, `claim`, `close`, `claims`, `query --ready` and `--blocked`, `check` (with `--branches`) and `views`, which writes `work/views/` and the lists in `work/README.md`.
- Kept, with the reason: `scripts/staleNames.mjs`, the check for old milestone names and section references into the old overall plan across every document. It isn't about the tracker's files, so hitld doesn't cover it. `scripts/splitCheck.mjs`, the one-off check of the 2026-11-13 plan split, moved out of `scripts/work/` unchanged. `scripts/work/lib.mjs` and `query.mjs` remain only as the board's adapter until CS-523 replaces them.
- `npm test` runs `hitld work check` and `scripts/staleNames.mjs` (`test/work.test.ts`).
- On the owner's answer of 2026-11-15, only the main session creates items, on `cesium-2.0-webgpu-poc` in the main checkout, as hitld requires. A session on a branch reports new work. The other machine allocates from the reserved block `second-machine` (from 100000, `HITLD_ID_BLOCK=second-machine`); which machine takes the base range is cheap to swap.
- Checked on a copy of the tracker: a claim and a close made with `hitld` on a branch, and an item made with `hitld work new` on the main branch, merged, and `hitld work check` passed.
- `packages/next/AGENTS.md` ("Work items"), the `work-items` skill, the tracker's design note (a status section at its top), `work/README.md` and `CESIUM2_WEBGPU_PLAN.md` describe the `hitld` commands.
