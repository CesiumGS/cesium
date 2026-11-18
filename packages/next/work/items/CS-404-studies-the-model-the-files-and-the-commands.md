---
id: CS-404
title: "Studies: the model, the files and the commands"
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390, CS-687]
---

The study file format (the tracker's frontmatter subset and sections) in `packages/next/work/studies/`, with its validator, shared with the tracker's `check`. `study new`, `note`, `attach`, `verdict`, `abandon`, `reopen`, `show`; `studies` (with `--all-branches`, reading other branches through git). `run --study`, inheriting item and expectations. A run with `--hypothesis` and no `--study` is refused, saying to run `study new` first (the owner's answer to CS-410, 2026-11-18; no implicit study). ID uniqueness across local branches. Retention keeping every run a study cites or attaches. The dev server's read endpoints and its validated write endpoint, which writes files into its own worktree.

Its endpoints follow CS-358's fixes for the dev server's file endpoints. The plan assumes the recommendations of CS-409 and CS-410; if the owner answers otherwise, this item follows the answer.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

A study made, run against, noted and concluded from the CLI reads back with its evidence, and its file diffs cleanly. A verdict citing an invalid run warns. A run with `--hypothesis` and no study is refused, naming `study new`, and creates no file. A study on another local branch lists with its branch. The endpoint rejects a malformed or oversized body and never writes outside `work/studies/` (tested). A cited run survives retention. `studies --item CS-<n> --json` is stable for the tracker.

## Files

new `bench/suite/studies.mjs`, `commands/studies.mjs`, `packages/next/work/studies/README.md`; `cli.mjs` (dispatch, `--study`), `schema.ts`, `vite.config.ts` (endpoints), `data.ts`, the store's clean-up; the tracker's `scripts/work/views.mjs` (`check` calls the validator)

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
