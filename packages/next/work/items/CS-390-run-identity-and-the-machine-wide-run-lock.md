---
id: CS-390
title: Run identity and the machine-wide run lock
kind: work
status: Planned
created: 2026-11-13
project: CS-389
---

`purpose`, `item` (`CS-<n>`), `study`, `worktree`, `base`, `machine`, `servedFrom` and the new `id` on every run kind (bench, images). The baseline guard and `--against-base`. The CLI's first and last lines, naming the run and its Dyno paths. The machine-wide run lock; `npm run dyno` on a free port. Old runs read as baseline runs. New commands get their own modules, so later milestones touch `cli.mjs` less.

## Done when

A dev run from a worktree records every field. `--purpose baseline` is refused from a dirty tree and from a feature branch (tested). Two runs started together run one after the other, the second saying whose run it waited for. An existing store still loads in Dyno unchanged.

## Files

`bench/suite/cli.mjs`, new `bench/suite/identity.mjs`, `runLock.mjs`; `images.mjs`, `report.mjs` (`summarizeRun`), `data.ts`, `schema.ts`, `vite.config.ts` (the Images run-name check), `scripts/setup.mjs` (`BENCH_MACHINE`), `package.json` (`dyno`)

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
