---
id: CS-540
title: The hitld work check test finishes under full-suite load
kind: work
state: planned
created: 2026-11-15
project: CS-199
touches: [packages/next/test/work.test.ts]
tier_override: 1
---

`test/work.test.ts`, "the real items › pass hitld work check", runs `hitld work check` on the whole tracker and has vitest's default 30-second timeout. Alone, the check takes about 12 seconds on this Mac (74 local branches, which it reads for claims). Under the full suite's load it timed out once in 14 runs on 2026-11-15 ("Test timed out in 30000ms").

A fix for the check's time is in the works in human-in-the-lead (owner, 2026-11-15). After upgrading to the release that has it, measure the check again before changing the test: the first point below may already hold.

## Done when

- The test's time doesn't grow past its limit under load: it either stops paying for what grows with the repository (the branch scan, if the test doesn't need it), or its timeout states the margin and why beside it.
- It still fails when an item breaks the format.
- One or two full-suite runs pass.
