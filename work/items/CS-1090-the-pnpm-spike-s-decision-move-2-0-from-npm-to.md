---
id: CS-1090
title: "The pnpm spike's decision: move 2.0 from npm to pnpm, stay on npm, or take a middle option?"
kind: decision
state: done
created: 2026-11-22
project: CS-609
decider: owner
answer: A, once the pnpm test runs pass
answered_at: 2026-11-23T06:52:08.309Z
answered_via: question-tool
answered_by: owner
---

## Question

Should 2.0 install with pnpm instead of npm? The numbers are in `docs/design/pnpm-spike.md` on CS-951's branch (d587911071). The spike reported partial: the full test suites under pnpm run after the nightly.

From CS-951's executor (2026-11-23). pnpm 11.12.0 against npm 11.17.0, medians of three, at load 6 to 25:

- **Install time:** cold, 76 s under pnpm against 152 s under npm. A warm second worktree takes 2.6 s against 7.7 s.
- **Disk:** each extra worktree adds about 21 MiB under pnpm, because APFS clones the files, against about 1.1 GiB under npm. For 26 worktrees, that's 1.7 GiB against 28.5 GiB.
- **Same result:** `pnpm import` resolves the same 832 versions, the build and the packed checks pass for all 7 packages, and `pnpm pack` writes the same file lists as `npm pack`.
- **Strict layout:** pnpm finds three undeclared dependencies: playwright and sharp in the root scripts, and onnxruntime-web in `spikes/core-ir`. It also stops `npx --no-install @cesium/dyno` resolving unless the root declares it.
- **Publishing:** pnpm 11 has `stage publish` and OIDC publishing, but staged publishing under OIDC is unproven. The fallback, `npm pack` and `npm stage publish`, needs no change to the pipeline.

## Options and recommendation

- A. Move to pnpm. About ten files change, four of them owner paths: the root `package.json`, `worktree_setup` in `policy.json`, the CI workflows and Dependabot. `pnpm-lock.yaml` replaces `package-lock.json`, which reopens CS-894. Everyone needs pnpm 11.12.0 or later, through corepack, and the release path keeps `npm pack` and `npm stage publish`. Decide only after the pnpm test runs are in.
- B. Stay on npm, and declare the three missing dependencies now, in the root `package.json` and `spikes/core-ir/package.json`.
- C. Stay on npm, and have `worktree_setup` clone a ready `node_modules` with `cp -cR` (APFS clones), falling back to `npm ci`. It's one line in `policy.json`. Each extra worktree adds about 15 MiB, about 2.0 GiB for 26. It needs a donor worktree on the same lockfile and volume.
- D. pnpm for installs, npm for packing and staging. It has A's gains and costs, and keeps the release path as built.

Recommended: B and C now. Ask about A again when CI's install time or cache becomes the slowest step, when disk pressure remains after C, or if the owner wants the strict layout as a rule. pnpm's gains are mostly a convenience on one machine, C takes most of the disk win for one line, and A reopens CS-894 and touches four owner paths while alpha.1's pipeline is new.

## Answer

Open.
