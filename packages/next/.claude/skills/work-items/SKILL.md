---
name: work-items
description: Use when starting, claiming, finishing or creating work in packages/next, or when the main session merges branches. Covers the CS-n work items in packages/next/work, kept in human-in-the-lead's format with its hitld commands (ready work, claims, closing, new items, decisions for the owner), and the main session's steps after merges and bundles.
---

# Work items

Cesium 2.0's work lives in `packages/next/work/`, one markdown file per entity, with `CS-<n>` IDs, in human-in-the-lead's format (its design, part 3.4). Projects (usually one plan each) group items. Milestones are checkable outcomes; a milestone with no parent is a long outcome over other milestones. The rules are in `packages/next/AGENTS.md`, "Work items", and the executor contract in the root `AGENTS.md`. Run `npx hitld …` anywhere in the repository; every command prints JSON.

## Starting a session

1. Run `npx hitld work claims`. It shows what other branches have claimed. Claims made on the other machine show only after a bundle carries them.
2. Run `npx hitld work query --ready` and pick an item nobody holds, or take the one you were given.
3. Read the item's file (`npx hitld work show CS-<n>`), then the plan section or design note it names. Its body says when it is done.

## Claiming

Make your branch's first commit the claim, and nothing else:

```sh
npx hitld work claim CS-<n> --dispatch <your session's name>
```

It sets `state: in-progress` and `claimed_by`, and commits `claim: CS-<n>`. Claims aren't atomic. If `claims` later shows someone else on the same item, stop and ask the session that started you; don't race.

## Finishing

- Run `npx hitld work close CS-<n> --no-commit` and commit the `state: done` with the change that finishes the work, so merging closes the item.
- If the work split, list the remainder in your report (kind, project, title, needs) for the main session to create, rather than leaving the item half done.
- If an item turns out not to be worth doing, set `state: dropped` and give a `reason:`. The file stays.
- Run `npx hitld work check` before committing.
- Measured work cites its dyno run ids (`dyno result list`) under `bench_runs`. Start the full suite or a build only when `dyno status` says the machine isn't measuring (the `dyno` skill).

## Creating items

Only the main session creates items, on `cesium-2.0-webgpu-poc` in the main checkout; `hitld work new` refuses on any other branch. A session on a branch reports new work instead.

```sh
npx hitld work new --kind work --parent CS-<n> --title "…" --needs CS-<a>,CS-<b>
npx hitld work new --kind decision --parent CS-<n> --title "…?"   # decider: owner
npx hitld work new --kind external --parent CS-<n> --waiting-on "Cesium ion" --title "…"
npx hitld work new --kind milestone --parent CS-<n> --title "<the outcome, named>" --outcome "…"
```

- Never choose a number yourself, never reuse or renumber one, and never add a letter suffix. On the other machine, set `HITLD_ID_BLOCK=second-machine`.
- Never paste an absolute path.
- Never add a front-matter key outside the format; keys that run code are refused.
- Work that depends on a decision `needs` it. Work that happens only if the answer is yes stays `proposed`.

## Decisions

A question only the owner can answer becomes a decision item: the question, the options, a recommendation, and "Open." under Answer. Don't decide it yourself. `npx hitld work query --kind decision --state planned` is the backlog the owner reads (`work/views/decisions.md` on the main branch). When the owner answers, record the answer in the body, set the item `done`, and move contingent work to `planned` or `dropped`.

## The main session, after merges

After merging work branches into `cesium-2.0-webgpu-poc`:

1. Run `npx hitld work check`. Fix anything it reports before going on.
2. Run `npx hitld work views` to regenerate `work/views/` and the lists in `work/README.md`, and commit them on their own.
3. Create the items the merged branches reported (`hitld work new`).
4. Glance at `npx hitld ready` and `work/views/decisions.md` for anything newly ready or newly blocked, and report it.

After fetching a bundle from the other machine into a local branch, run `npx hitld work check --branches` before merging. It reports a `CS-<n>` used by two different items (different file names). The branch that arrives second gives its item a fresh number: the file name, the `id` and every reference on that branch. Then merge.

## Other views

`npx hitld work views` writes them under `work/views/`: `ready.md`, `blocked.md`, `decisions.md`, `projects.md`, `critical-path.md`, `milestones.md`, `unreleased.md`, and the graphs `items-graph.md` and `projects-graph.md`. `npx hitld work query` filters by kind, state, parent, needs or text.
