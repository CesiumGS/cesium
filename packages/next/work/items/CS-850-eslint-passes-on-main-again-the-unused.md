---
id: CS-850
title: "eslint passes on main again: the unused PostStageKind import in src/render/post/chain.ts goes"
kind: work
state: done
created: 2026-11-21
project: CS-199
claimed_by: orch-11-CS-850
touches: [packages/next/src/render/post/chain.ts]
---

eslint fails on main: an unused `PostStageKind` import in `src/render/post/chain.ts`, from commit c96bcedafc, which has no Work-Item trailer. Every merge check shows the error, though no branch caused it.

Source: orch-11's merge checks, 2026-11-21. Why now: a lint error on main hides new ones. Rough size: tiny. Decider: the executor. Filed: 2026-11-21.

## Done when

- The unused import is removed, and `npx eslint` passes on main's changed files.
