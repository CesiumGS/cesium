---
id: CS-399
title: "Test results in Dyno: the vitest reporter and the Tests view"
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

The vitest reporter, `testEnvironment.json`, flake computation, `cli.mjs tests`, retention, and the Tests view in the rail's first group.

## Done when

A full `npm test` in a fresh worktree records `test/volumes.test.ts` as environment-only, with its precondition. A test made to fail one run in three shows as flaky, with its rate. Nothing is written under `CI`. Owner review.

## Files

new `bench/suite/testsReporter.ts`, `testEnvironment.json`, `commands/tests.mjs`, `views/Tests.tsx`, `tests.css`; `vite.config.ts` (vitest block, a read endpoint), `routes.tsx`, `shell.tsx` (rail)

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
