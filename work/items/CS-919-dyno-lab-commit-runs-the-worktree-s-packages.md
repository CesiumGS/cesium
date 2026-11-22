---
id: CS-919
title: dyno lab --commit runs the worktree's packages, not the commit's, and writes generated shaders into it
kind: work
state: done
created: 2026-11-22
project: CS-199
claimed_by: orch-11-CS-919
---

> **Committed by the owner (2026-11-22, to start next).** Source: CS-612's executor, confirmed by the orchestrator (2026-11-22). Why now: the "previous commit" side of a parity comparison silently runs the worktree's own package sources, so it shows no difference whatever changed. Merge evidence relies on that comparison. Until this is fixed, comparisons are made with a separate checkout and server for each side. Size: small to medium. Filed 2026-11-22.

## Done when

- `dyno lab --commit <rev>` serves the commit's own packages. `@cesium/*` resolves inside the snapshot, never through the worktree's `node_modules`.
- It writes no generated shaders or other output into the worktree. `scripts/slangBuild.mjs` compiles `.slang` files inside `.bench/` snapshots and rewrites generated headers there too. It has the same cause, so fix it here.
- A test plants a difference between the worktree and the commit, and the comparison shows it.
- Parity comparisons made with `--commit` since the move (CS-835, 2026-11-22) are listed, each with whether its evidence needs a rerun.

## The fix

- `bench/snapshot.mjs` gives every checkout under `.bench/` (a `--commit` snapshot, a `ref` engine's, and `dyno suite`'s frozen tree) a `node_modules` of its own with links to its own workspace packages, so `@cesium/*` resolves inside it. Third-party packages are the worktree's when the two lockfiles agree on them; those nested under a workspace package (Sandcastle's own Vite) through a link to the worktree's folder. When the lockfiles differ, the snapshot installs its own (`npm ci --ignore-scripts`, inside the snapshot, once per lockfile); a failed install stops the run and says to compare with separate checkouts.
- `scripts/slangBuild.mjs` compiles only this checkout's own sources (`isOwnSource`: the engine's `src/` and `examples/`), so the dev server's watcher seeing an edit under `.bench/` writes nothing. The dev server no longer watches its `.bench/` at all.
- `dyno lab --port <n>` picks the Lab's own server's port.
- Tests: `test/benchSnapshot.test.ts`.

## The audit (2026-11-22)

Parity comparisons since the move (CS-835) that used a snapshot of another commit. Done by the orchestrator, and checked here against each item's report. Commits from before the move had no `@cesium/*` packages (the harness imported its sources by path), so their snapshots ran their own code; only the generated-shader writes could reach the worktree then.

| Item | What it compared | Valid? |
| --- | --- | --- |
| CS-835, the final layout | Separate checkouts, each on its own server (`--url`) | Valid |
| CS-911, the path guard's fix | One `dyno lab lod --url` run, no comparison, none needed | Valid |
| CS-54, routes on both emitters | Before and after in its own worktree, live tree each time | Valid as run |
| CS-612, the new build | `--commit fddab4dcc1` against the branch: vacuous | Rerun by the orchestrator with separate checkouts: identical apart from imagery noise |
| CS-815, stable identity | A `.bench/` snapshot inside its worktree, served with `--url`: vacuous | Rerun by the orchestrator with separate checkouts: identical |
| CS-900, CS-392 | No rendering change | No comparison needed |

CS-612's and CS-815's reports also record the generated-shader writes this item fixes (six and three headers restored by hand, none committed).
