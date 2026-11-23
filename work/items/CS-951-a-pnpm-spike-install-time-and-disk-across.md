---
id: CS-951
title: "A pnpm spike: install time and disk across worktrees, strict dependencies, and publishing, against npm"
kind: work
state: in-progress
created: 2026-11-22
project: CS-609
needs: [CS-613]
claimed_by: orch-11-CS-951
---

> **Committed by the owner (2026-11-22):** a spike to decide whether 2.0 moves from npm to pnpm. Rush was considered and set aside: it's built for hundreds of packages and overlaps with Changesets. It waits for CS-613, because both touch the lockfile and the release pipeline. A spike is a decision tool: it states its data, settings and costs, and ends in a decision item for the owner. It changes no default on main.

## Done when

- **Install, measured in Dyno or with recorded commands:** in fresh worktrees at one commit, compare `npm ci` with `pnpm install --frozen-lockfile`. Report the time for a first and a second worktree, the disk each worktree uses, and the size of the shared store. Run it on a quiet machine, or state the load beside each number.
- **Correctness:** the full build, `npm test` and `test:data` run under pnpm. Every undeclared dependency pnpm's strict layout catches is listed, with the package that needs it.
- **Publishing:** check whether pnpm supports npm's trusted publishing (OIDC) and staged publishing (`npm stage publish`), as CS-613's pipeline uses them. If it doesn't, describe the fallback: pack with pnpm and publish the tarballs with npm.
- **What would change:** hitld's `worktree_setup` in `.human-in-the-lead/policy.json`, the gate scripts, CI, the docs, Changesets' config, `scripts/packSet.mjs`, and the hosts guide (CS-949).
- **A decision item** for the owner: move to pnpm or stay on npm, with the numbers, the costs and a recommendation. Moving would also revisit CS-894 (the npm lockfile).
- Nothing on main changes: the spike runs on its own branch and worktrees.
