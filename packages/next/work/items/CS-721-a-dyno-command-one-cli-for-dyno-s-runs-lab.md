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
- **The interface hitld will call** (its proposal on #363, 2026-11-20, to be checked against what we build):
  - non-interactive: every command takes arguments, prints JSON with `api_version` (adding a field keeps it, removing, renaming or retyping one raises it), never prompts, and fails when anything is unclear;
  - `capabilities`, `measure start` (asynchronous, returns a handle), `measure status` and `measure cancel`, `result show` (no raw values without `--values`), `result fetch`, `result pin` and `result unpin`, analysis commands (compare two commits, a trend, the commit a regression came in, each with noise estimates), `storage status`, and `status`;
  - `status` says whether the machine is busy or quiet, who started the current measurement, and for how long, so other heavy work waits while a measurement runs. On 2026-11-19, CS-706's timing runs shared the machine with test suites at six times its cores. `status` turns the hand-written load rule into a check;
  - a fake mode with a simulated target and deterministic results, for hitld's tests;
  - a farm can drop in later behind the target class and the queue without changing the interface.

  - **Settled with hitld on #363 (2026-11-20):** no command runs on completion, and no hook before or after a local measurement. Both conflict with rule 7 of the executor contract and with hitld's own schema. Instead:
    - callers poll `measure status <handle>`, or watch a **completion record** (a file, or a line in an event log), whose shape this item proposes;
    - dyno **gates itself** on the machine's measured state: it queues or refuses a local measurement until the machine is quiet, by whatever makes a measurement valid (load, thermal state, power source, other GPU use);
    - `status --json` reports **three states** for the machine and each target dyno controls: `busy`, `waiting-for-quiet` (a local measurement is queued behind other work) and `quiet`, with who started the current measurement (command line, web interface or another caller) and for how long;
    - hitld gates its own heavy steps (tests, builds) on that status. While the state is `waiting-for-quiet`, it starts none and lets running ones finish, so a queued measurement isn't starved. CS-390's run lock still orders dyno's own runs; it isn't what keeps other processes quiet.
- A skill and notes in the repository for agents that use dyno: which suite a rendering change needs, which instrument answers which question, how to read a verdict, and what never goes in a public pull request (measured values, configurations, traces).
- When it's built, the main session replies on #363 with example JSON for each command, including the three-state `status` and the completion record, and with what turned out unclear, wrong or costly.
- Tests cover the dispatch, `--help`, the JSON shape of each command, and `serve` refusing a port someone else's server holds.
