---
id: CS-772
title: Dyno's views and docs name the dyno commands, the old wrappers retire, and coldstart takes a free port
kind: work
state: proposed
created: 2026-11-20
project: CS-389
needs: [CS-721]
touches: [packages/next/bench/suite/**, packages/next/bench/run.mjs, packages/next/bench/dyno.mjs, packages/next/package.json, packages/next/test/dyno*.test.ts]
---

CS-721 made `node bench/dyno.mjs <command>` the one command for Dyno's runs, Lab pages, servers and measurements. Dyno's views and help still show the old `bench/suite/cli.mjs` and `bench/run.mjs` lines, which are now thin wrappers that print the new command. Also, `dyno suite coldstart` defaults to port 4101 and can collide with an executor's leased port, while `dyno serve` already picks a free one.

**Proposal** (CS-686). Source: CS-721's report, relayed by orch-11, 2026-11-20. Why now: two ways to run the same thing confuse executors and readers, and the fixed port has already collided with a lease once. Rough size: small. Decider: the executor. Removing a wrapper that a script outside `packages/next` calls comes back as a question. Filed: 2026-11-20.

## Done when

- Every command that Dyno's views, help text and docs show is a `dyno` command (or `npx dyno` once CS-721's bin question is settled). A test fails when an old `cli.mjs` or `run.mjs` line appears in a view.
- The wrappers are removed, or, where something still calls them, kept with a named caller and a date to retire them.
- `dyno suite coldstart` takes a free port when `--port` isn't given, the way `serve` does, and prints the port it chose.
- Run on a server of the executor's own, never the owner's 5190 or 5199.
