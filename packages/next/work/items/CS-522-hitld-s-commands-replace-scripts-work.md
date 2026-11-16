---
id: CS-522
title: hitld's commands replace scripts/work
kind: work
state: in-progress
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
