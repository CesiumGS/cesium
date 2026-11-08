# Working on `packages/next`

Rules for anyone working in this package, people and coding agents alike. The README covers what the package is; this file covers how we work on it.

## Repository practice

- Commit by path only: `git add -- <paths>`, then `git commit -- <paths>`. Never `git add -A`, `git stash`, `git reset` or `git checkout --` on files you didn't change. Several people or agents may share a checkout.
- The lint-staged pre-commit hook can sweep someone else's unfinished work into your commit. It has happened with files that were staged and with one that wasn't: its backup and restore steps run across the whole working tree. So when several people or agents are working at once:
  - Work in your own `git worktree` whenever you can. It removes most of the risk, but not all: lint-staged's backup is a stash, and every worktree shares one stash list. So don't leave stashes behind, and don't commit while someone else's hook is running.
  - In a shared checkout, check that `git diff --cached --name-only` is empty first, stage and commit in one command, and never leave files staged.
  - Afterwards, check `git show --stat HEAD`. If another person's file went in, tell them rather than amending or reverting it: their working copy is still intact, and their next commit carries the rest.
- If `.git/index.lock` exists, wait and retry rather than removing it.
- Never commit screenshots, downloaded data, or secrets. Data lives in the setup store outside the repo (`npm run setup`; `FRAMES_DATA_DIR`). One exception: images under `handbook/` that the handbook embeds in its single HTML file. Keep them small, and check by eye that none shows a token or anything from an account.
- Never write an ion token into code, logs, URLs, test output, screenshots or builds. Examples get theirs from Dyno's token setting, or from `.env.local` in development only.
- Node 24 (`engines`).

## Testing cadence

- While iterating, run focused tests: `npx vitest run <files>`.
- Before committing, run the full `npm test` once.
- Run `npm run test:data` (it needs the setup store) when you change code under `src/frames`, `src/time`, `src/ephemeris` or `src/engineering`.
- Run the browser parity suites (`node bench/run.mjs <suite>`) when you change rendering. Compare against the previous commit as well as a base commit. Metal's compiler can reorder a float sum when a kernel's code changes, so explain any pixel difference before accepting it.
- Also run `npx tsc --noEmit -p .` and `-p tsconfig.lib.json`, eslint and prettier on what you changed.
- If you change an entry point's exports, run `npm run surface` and commit `api/surface.txt` with your change.

## GPU safety

The GPU is shared with every other app on the machine. A hung shader resets it for all of them.

- Engine shaders are Slang (`src/**/*.slang`), compiled by `npm run shaders`. The compiler is found through `SLANGC`. Never edit generated output; `npm run shaders:check` must pass.
- Bound every shader loop by a constant, never by a count read from a buffer: `for (uint i = 0u; i < CONSTANT; i++)` with an early `break`. Clamp every buffer index.
- Read the Metal output with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before the first browser run of a changed kernel.
- Prefer Node tests with `test/fakeGpu.ts`. In the browser, use one small page at a time, on your own dev server and port. Never stop or reuse a dev server someone else started. If the WebGPU device is lost, stop and find out why; don't retry.

## Seams and boundaries

- The dependency rule between entry points (core, `/time`, `/frames`, `/proj`, `/measure`) is enforced by `test/importBoundary.test.ts`.
- Per-draw constants, draw arguments, geometry submission, bindless resources and ray queries each go through one seam, and a bypass test fails naming the line (`test/seams.test.ts` and its neighbours). Add to the seam; don't go around it.
- Examples use the public API only. Where an example has to reach past it, record that for the API review.

## Wording

- Plain, short sentences. Name units and datums. No e-notation in prose ("10⁻⁹", not "1e-9").
- Use inclusive terms: "overall plan" or "main", not "master"; "allowlist", not "whitelist".
- In frames and camera code, never write "frame" alone: say reference frame, tick (one pass of the engine loop, never "per frame"), render space or render root. Code names (`Frame`, `FrameData`) keep their names.
- A stated accuracy never claims more than its inputs support. "Can't tell" is an honest answer.

## UI and examples

Example pages are documentation and demos at once. They have to work as a visual demo for graphics engineers and as a transparent, trustworthy tool for subject-matter experts.

- Hold UI to a polished bar: clear hierarchy, nothing cramped or busy, and every figure in context. A quick, dense sketch reads as confusing, even when it's only meant to show structure.
- Don't gate building on a mockup. Make the design call and build it in the real page, because the design is judged by clicking around in context. Describe structure in words, or a simple wireframe, if it helps beforehand.
- Do a design pass while implementing: write the page's `DESIGN.md` (its story, audience and layout), then run a UX review on the real page and fix what it finds.
- Check every page in both themes, at desktop and at 380 px wide, with the keyboard only, with reduced motion, and with a clean console.

## The handbook

`handbook/` is the engine's document for stakeholders and the 1.x team: a static, tabbed site on StrataKit, built into one HTML file by `npm run handbook`. Its figures are generated from `api/surface.txt`, `test/importBoundary.test.ts`, `scripts/checkBundle.mjs`, the library build and `bench/results`, so they stay current by rebuilding.

- When a plan lands, or you change what a deep dive describes, update its tab in `handbook/src/tabs/` in the same change: the prose, its "checked" date, and the tab's status (stub, sketch, accurate today).
- Outside facts live in `handbook/src/sources.ts`, each with the date it was read. Read the page before changing one.
- The handbook is for outside readers. Describe the engine as an embeddable rendering core whose host application can supply its own services, and add nothing about the roadmap beyond the plans in this repository without the owner's agreement.
- `handbook/DESIGN.md` has the full list of what to update by hand.

## Coding agents

- Implementation follows the plans in `docs/superpowers/plans/`, task by task, with a fresh reviewer per task.
- Choose the model per role: a fast model for well-specified implementation and scoped re-reviews, the most capable one for design-heavy tasks and risky reviews.
- Send back only Important review findings as fix rounds; fix Minor ones in one pass or fold them into the next task.
- Leave generated shader output out of review diffs.
- Read pages as text; take screenshots only for visual judgements.
