---
id: CS-894
title: "CS-610 D8: does the 2.0 branch commit a lockfile?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:26:06.491Z
answered_via: question-tool
answered_by: owner
---

## Question

The repository has no package-lock.json (`package-lock=false`), so installs aren't reproducible: a fresh worktree resolved playwright 1.65.1 while main has 1.64.1. From CS-610's design, asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Commit one root package-lock.json on the 2.0 branch, drop `package-lock=false`, install with `npm ci` everywhere, group updates with Dependabot, and run a nightly test from fresh ranges.
- B. The same without Dependabot.
- C. Keep 1.x's practice: no lockfile.

Recommended: A, the design's recommendation. It blocks CS-611's first step and CS-612.

## Answer

The owner, 2026-11-21: A. A committed lockfile, `npm ci` everywhere, Dependabot grouped updates, and a nightly fresh-ranges test.

## Note (2026-11-23)

CS-1090 A moves 2.0 to pnpm once CS-951's test runs pass, so `pnpm-lock.yaml` replaces this decision's npm lockfile (CS-1091).
