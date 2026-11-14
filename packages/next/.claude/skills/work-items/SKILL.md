---
name: work-items
description: Use when starting, claiming, finishing or creating work in packages/next, or when the main session merges branches. Covers the CS-n work items in packages/next/work (ready work, claims, closing, new items, decisions for the owner) and the main session's steps after merges and bundles.
---

# Work items

Cesium 2.0's work lives in `packages/next/work/`, one markdown file per item, with `CS-<n>` IDs. Projects (usually one plan each) and initiatives group the items. The rules are in `packages/next/AGENTS.md`, "Work items", and the design in `docs/superpowers/plans/2026-11-13-work-tracker.md`. Commands run from `packages/next`.

## Starting a session

1. Run `node scripts/work/views.mjs claims`. It shows what other worktrees and branches have claimed. Claims made on the other machine show only after a bundle carries them.
2. Run `node scripts/work/views.mjs ready` and pick an item nobody holds, or take the one you were given.
3. Read the item's file, then the plan section or design note it names. Its body says when it is done.

## Claiming

Make your branch's first commit the claim, and nothing else:

```yaml
status: In progress
claimed: <your session's name>
```

Claims aren't atomic. If `claims` later shows someone else on the same item, stop and ask the session that started you; don't race.

## Finishing

- Set `status: Done` in the same commit or merge that finishes the work, so merging closes the item.
- If the work split, create the remainder with `new.mjs` (below) rather than leaving the item half done.
- If an item turns out not to be worth doing, set `status: Dropped` and give a `reason:`. The file stays.
- Run `node scripts/work/views.mjs check` before committing.

## Creating items

```sh
node scripts/work/new.mjs --kind work --project CS-<n> --title "…" --needs CS-<a>,CS-<b>
node scripts/work/new.mjs --kind decision --project CS-<n> --title "…?"   # decided-by: owner
node scripts/work/new.mjs --kind external --project CS-<n> --party "Cesium ion" --title "…"
```

- Never choose a number yourself, never reuse or renumber one, and never add a letter suffix.
- Never paste an absolute path.
- Never add a frontmatter key outside the schema; keys that run code are refused.
- Work that depends on a decision `needs` it. Work that happens only if the answer is yes stays `Proposed`.

## Decisions

A question only the owner can answer becomes a decision item: the question, the options, a recommendation, and "Open." under Answer. Don't decide it yourself. `node scripts/work/views.mjs decisions` is the backlog the owner reads. When the owner answers, record the answer in the body, set the item `Done`, and move contingent work to `Planned` or `Dropped`.

## The main session, after merges

After merging work branches into `cesium-2.0-webgpu-poc`:

1. Run `node scripts/work/views.mjs check`. Fix anything it reports before going on.
2. Run `node scripts/work/views.mjs lists --write` to regenerate the lists in `work/README.md`, and commit the README on its own.
3. Glance at `views.mjs decisions` and `views.mjs projects` for anything newly ready or newly blocked, and report it.

After fetching a bundle from the other machine into a local branch, run `node scripts/work/views.mjs check --branches` before merging. It reports a `CS-<n>` used by two different items (different file names). The branch that arrives second gives its item a fresh number from `new.mjs`: the file name, the `id` and every reference on that branch. Then merge.

## Other views

- `views.mjs blocked`: open items and what they wait on.
- `views.mjs projects`: the projects and their dependencies on each other.
- `views.mjs initiatives`: the initiatives rolled up.
- `views.mjs mermaid items --project CS-<n>` and `views.mjs mermaid projects`: graphs.
