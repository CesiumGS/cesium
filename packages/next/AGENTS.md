# Working on `packages/next`

Rules for anyone working in this package, people and coding agents alike. The README covers what the package is; this file covers how we work on it.

## Repository practice

- Commit by path only: `git add -- <paths>`, then `git commit -- <paths>`. Never `git add -A`, `git stash`, `git reset` or `git checkout --` on files you didn't change. Several people or agents may share a checkout.
- Git hooks: every worktree runs the main checkout's hooks in `.husky/`: lint-staged (eslint, markdownlint, prettier) and human-in-the-lead's commit guard. A worktree points at them with `git config --worktree core.hooksPath "$(git rev-parse --path-format=absolute --git-common-dir)/../.husky/_"`, run once in it; a root `npm install` resets only the main checkout's setting.
- lint-staged runs with `--no-stash`, because every worktree shares one stash list and its backup stash once swept other people's work into commits. Without the backup, it rewrites staged files in place, and a partly staged file goes in whole. So when several people or agents are working at once:
  - Work in your own `git worktree` whenever you can, and don't leave stashes behind.
  - In a shared checkout, check that `git diff --cached --name-only` is empty first, stage and commit in one command, and never leave files staged.
  - Afterwards, check `git show --stat HEAD`. If another person's file went in, tell them rather than amending or reverting it: their working copy is still intact, and their next commit carries the rest.
- If `.git/index.lock` exists, wait and retry rather than removing it.
- Never commit screenshots, downloaded data, or secrets. Data lives in the setup store outside the repo (`npm run setup`; `FRAMES_DATA_DIR`). One exception: images under `handbook/` that the handbook embeds in its single HTML file. Keep them small, and check by eye that none shows a token or anything from an account.
- A sky data pack (`npm run sky`) is derived data and never ships: it stays in the store outside the repo, and nothing made from one (an image, a binary, a base64 string, a `/sky-pack/` URL) goes in a commit, a build or the handbook. The guard in `scripts/vitePluginSkyPack.ts` refuses it in builds.
- Never write an ion token into code, logs, URLs, test output, screenshots or builds. Examples get theirs from Dyno's token setting, or from `.env.local` in development only.
- Node 24 (`engines`).

## Testing cadence

- While iterating, run focused tests: `npx vitest run <files>`.
- Before committing, run the full `npm test` once.
- Run `npm run test:data` (it needs the setup store) when you change code under `src/frames`, `src/time`, `src/ephemeris` or `src/engineering`.
- Before the full suite, a build or a measurement, run `dyno status`: while it says `busy` or `waiting-for-quiet`, a measurement runs or waits, so start no heavy work. `dyno` is Dyno's command line (`npx --no-install dyno`: without `--no-install`, a missing workspace link makes `npx` download an unrelated public package); the `dyno` skill says which suite a change needs and how to read a verdict.
- Run the browser parity suites (`dyno lab <suite>`) when you change rendering. Compare against the previous commit as well as a base commit. Metal's compiler can reorder a float sum when a kernel's code changes, so explain any pixel difference before accepting it.
- Also run `npx tsc --noEmit -p .` and `-p tsconfig.lib.json`, eslint and prettier on what you changed.
- If you change an entry point's exports, run `npm run surface` and commit `api/surface.txt` with your change.

## GPU safety

The GPU is shared with every other app on the machine. A hung shader resets it for all of them.

- Engine shaders are Slang (`src/**/*.slang`), compiled by `npm run shaders`. The compiler is found through `SLANGC`. Never edit generated output; `npm run shaders:check` must pass.
- Bound every shader loop by a constant, never by a count read from a buffer: `for (uint i = 0u; i < CONSTANT; i++)` with an early `break`. Clamp every buffer index.
- Read the Metal output with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before the first browser run of a changed kernel.
- Prefer Node tests with `test/fakeGpu.ts`. In the browser, use one small page at a time, on your own dev server and port. Never stop or reuse a dev server someone else started. If the WebGPU device is lost, stop and find out why; don't retry.

## Seams and boundaries

- The dependency rule between entry points (core, `/time`, `/frames`, `/proj`, `/measure`, `/widgets`) is enforced by `test/importBoundary.test.ts`. The widgets import the other entry points by the package's name and nothing under `src/`.
- Per-draw constants, draw arguments, geometry submission, bindless resources and ray queries each go through one seam, and a bypass test fails naming the line (`test/seams.test.ts` and its neighbors). Add to the seam; don't go around it.
- Examples use the public API only. Where an example has to reach past it, record that for the API review.

## Wording

- Write American English in prose, comments, UI strings, test names, code names and commit messages. Quoted outside sources and outside names (EPSG's and PROJ's "metre", the Open Government Licence) keep their spelling.
- Plain, short sentences. Name units and datums. No e-notation in prose ("10⁻⁹", not "1e-9").
- Use inclusive terms: "overall plan" or "main", not "master"; "allowlist", not "whitelist".
- In frames and camera code, never write "frame" alone: say reference frame, tick (one pass of the engine loop, never "per frame"), render space or render root. Code names (`Frame`, `FrameData`) keep their names.
- "Opacity" is the value from 0 to 1, "translucent" is an adjective in prose, and "alpha" means a color's channel.
- A stated accuracy never claims more than its inputs support. "Can't tell" is an honest answer.

## UI and examples

Example pages are documentation and demos at once. They have to work as a visual demo for graphics engineers and as a transparent, trustworthy tool for subject-matter experts.

- Hold UI to a polished bar: clear hierarchy, nothing cramped or busy, and every figure in context. A quick, dense sketch reads as confusing, even when it's only meant to show structure.
- Don't gate building on a mockup. Make the design call and build it in the real page, because the design is judged by clicking around in context. Describe structure in words, or a simple wireframe, if it helps beforehand.
- Do a design pass while implementing: write the page's `DESIGN.md` (its story, audience and layout), then run a UX review on the real page and fix what it finds.
- Check every page in both themes, at desktop and at 380 px wide, with the keyboard only, with reduced motion, and with a clean console.
- Ports 5190 (Dyno, `npm run dyno:serve`) and 5199 (the handbook, `npm run handbook:serve`) are the owner's, for interactive use. To look at them, open a browser tab of your own. For your own work, start your own server in your worktree, on another port: the `dyno-own` and `handbook-own` entries in the local `.claude/launch.json` do that, and so does `dyno serve start dyno` (or `handbook`), detached, on a free port. Never pass `--owner` unless the owner asks.

## The handbook

`handbook/` is the engine's document for stakeholders and the 1.x team: a static, tabbed site on StrataKit, built into one HTML file by `npm run handbook`. Its figures are generated from `api/surface.txt`, `test/importBoundary.test.ts`, `scripts/checkBundle.mjs`, the library build and `bench/results`, so they stay current by rebuilding.

- When a plan lands, or you change what a deep dive describes, update its tab in `handbook/src/tabs/` in the same change: the prose, its "checked" date, and the tab's status (stub, sketch, accurate today).
- Outside facts live in `handbook/src/sources.ts`, each with the date it was read. Read the page before changing one.
- The handbook is for outside readers. Describe the engine as an embeddable rendering core whose host application can supply its own services, and add nothing about the roadmap beyond the plans in this repository without the owner's agreement.
- `handbook/DESIGN.md` has the full list of what to update by hand.

## Work items

Work is tracked as files in `work/` in human-in-the-lead's format (its design, part 3.4), with its `hitld` commands. Every item, project and milestone has a `CS-<n>` ID; a milestone with no parent is a long outcome. The settings are in `.human-in-the-lead/` at the repository root, and the executor contract is in the root `AGENTS.md`. The `work-items` skill walks through the practice below. `hitld` is a dev dependency pinned to a release tag: run it as `npx hitld …` anywhere in the repository. Every command prints JSON.

- **Finding work:** `npx hitld work query --ready` lists planned items whose `needs` are all done; `--blocked` shows what waits. On the main branch, in the main checkout, `npx hitld ready` adds tiers and order. Read the item, then the plan it points to.
- **Claims first:** run `npx hitld work claims` at session start, before you choose. It lists items claimed on other branches and in fetched bundles.
- **Claiming:** `npx hitld work claim CS-<n> --dispatch <your session's name>` writes your branch's first commit: `state: in-progress` and `claimed_by`. Make it before any work.
- **The limitation:** claims aren't atomic.
  - Another worktree of this clone sees your claim once the claim commit exists.
  - The other machine or a collaborator's clone sees it only after a bundle or a push carries it.
  - Two claims on one item meet as a merge conflict on `claimed_by`. So check `claims`, claim early, and let the main session merge in order.
- **Closing:** `npx hitld work close CS-<n> --no-commit` sets `state: done`; commit it with the change that finishes the work, so that merging the branch closes the item. Don't leave it for a later commit.
- **Creating items:** only the main session creates items, on `cesium-2.0-webgpu-poc` in the main checkout (`hitld work new` refuses anywhere else). A session on a branch that finds new work lists it in its report, with the kind, project, title and needs, and the main session creates it.
  - `npx hitld work new --kind work --parent CS-<n> --title "…" [--needs CS-<n>,…]`. Kinds: `work`, `decision` (`--decider owner`), `external` (`--waiting-on "…"`), `project` and `milestone` (with `--outcome`; no `--parent` makes a long outcome).
  - It takes the next free number across every worktree, branch and bundle. Never pick a number by hand. Never reuse, renumber or add a letter to one. The other machine allocates from its reserved block: set `HITLD_ID_BLOCK=second-machine` there.
  - Never paste an absolute path into an item, a commit or a plan.
- **Decisions go to the owner:** a question only the owner can answer becomes a `decision` item (`decider: owner`), with the question, the options and a recommendation in its body. Work that depends on the answer `needs` the decision, and contingent work stays `proposed`. `npx hitld work query --kind decision --state planned` lists what waits on the owner. Don't settle these in code.
- **Never add a front-matter key that runs code** (`onStatusChange` and the like). The format is an allowlist, and `hitld work check` refuses any other key.
- **Before committing a change to an item, run `npx hitld work check`.** `npm test` runs it too, and `scripts/staleNames.mjs`, which fails on old-style milestone names and on section numbers that point into the old overall plan: name work by `CS-<n>`, and documents by their path.
- **Across machines:** after fetching a bundle into a branch, run `npx hitld work check --branches` before merging. If a number was taken on both sides, the branch that arrives second gives its item a new number.
- Leave the generated lists in `work/README.md` and the pages in `work/views/` alone; the main session regenerates them after merges with `npx hitld work views`.

## Coding agents

- Implementation follows the plans in `docs/superpowers/plans/`, task by task, with a fresh reviewer per task. The work items in `work/` say which tasks are ready; claim one before starting (see "Work items").
- Choose the model per role: a fast model for well-specified implementation and scoped re-reviews, the most capable one for design-heavy tasks and risky reviews.
- Send back only Important review findings as fix rounds; fix Minor ones in one pass or fold them into the next task.
- Leave generated shader output out of review diffs.
- Read pages as text; take screenshots only for visual judgments.
