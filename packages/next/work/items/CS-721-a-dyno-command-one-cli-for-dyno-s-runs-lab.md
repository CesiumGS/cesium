---
id: CS-721
title: "A dyno command: one CLI for Dyno's runs, Lab pages, servers, studies and devices"
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-390]
---

The owner, 2026-11-19: "right now we run dyno cli stuff through `node <scriptname>`, i think we need to turn that into a real 'dyno' cli tool to help manage some of this stuff."

Today there are three ways in:

- `node packages/next/bench/suite/cli.mjs <command>` for the suite: list, verify, fetch, run, report, alerts, coldstart and more, in one 1,588-line file;
- `node bench/run.mjs <harness>` for the Lab pages and parity suites;
- `npm run dyno` for the dev server on 5190.

The owner's servers are started and stopped by hand, with pidfiles in the store. Planned items add more commands to `cli.mjs`: CS-390 (run identity, the run lock, `dyno` on a free port), CS-404 (studies), CS-406 (the authority, the hub, pairing), CS-407 (the runner), CS-408 (device runs), and CS-717's design (devices and sharing). CS-390 already moves new commands into their own modules.

Model: the most capable one (it sets the command surface others build on).

## Done when

- One `dyno` command with subcommands and `--help` for each. It covers what `cli.mjs` and `bench/run.mjs` do today, plus `dyno serve` (start, stop, status and logs for Dyno and the handbook, a free port per worktree, and the owner's 5190 and 5199 detached), and room for `study`, `device`, `runner` and `store` as their items land.
- It runs as `npx dyno` anywhere in the repository. Where the bin lives is settled first: the library package `@cesium/next` will be published (CS-616), so a bin in it would ship to users. A private workspace package is the likely home. If the choice is a public name or ships with the library, it goes to the owner as a decision item.
- The old entry points keep working, as thin wrappers that say the new command, until the repository's docs, items and skills are updated (`AGENTS.md`, `packages/next/AGENTS.md`, the README, the work-items skill).
- Every command prints a short human summary by default and JSON with `--json`, like `hitld`. Exit codes are documented.
- Tests cover the dispatch, `--help`, the JSON shape of each command, and `serve` refusing a port someone else's server holds.
