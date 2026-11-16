---
id: CS-392
title: Finding runs from the terminal (`runs`, `show`, `pin`)
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

`cli.mjs runs` (filters, table and JSON), `show <id>`, `pin <id>`.

## Done when

The commands list and show runs from summaries only. `--json` output is stable and tested. A pinned run is listed as pinned.

## Files

new `bench/suite/commands/runs.mjs`; `cli.mjs` (dispatch)

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
