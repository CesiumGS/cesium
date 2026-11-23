---
id: CS-1006
title: Merge CS-613, CI and the release pipeline
kind: decision
state: done
created: 2026-11-22
project: CS-609
decider: owner
answer: "A. Merge it: The orchestrator replays it, with the checklist commit, onto main's tip, reruns the gates if main's code moved, fast-forwards, regenerates the views and logs the merge. The workflows first run when the owner pushes; the owner's checklist comes before any release."
answered_at: 2026-11-23T04:11:42.749Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-613, CI and the release pipeline (ci.yml, release.yml, Dependabot, Changesets with the paired 0.x line, the release scripts, the per-package license and README files), into main? It's covered by the owner's approval: 'you can do 612 and 613 as well, and i'll review their designs in the morning, ok to merge them before i review them, since they're easy to change'. It touches owner paths (.github/, AGENTS.md, the work-items skill, package.json, package-lock.json, each package's package.json) and adds one dependency its design names, @changesets/cli. Nothing in it acts outside the repository.

What it adds: ci.yml (checks, test, build, shaders, data, handbook, the changeset check), release.yml (record, verify, publish, github-release), .github/dependabot.yml, .changeset/ with the seven stable packages as one fixed group, and scripts/release/ (version, lines for the paired 0.x line, record, earlierRuns, stage, stageTarballs, notes, changesetCheck). Each package gains its LICENSE.md (a copy of the root's), a README.md and its changelog in files. AGENTS.md and the work-items skill gain the changeset rule. @changesets/cli 3.0.3, pinned exactly; Snyk rates it healthy. Security: five Claude security reviews, each round fixed and shown by mutation. They closed, among others: verify built after testing; a record lost on a batched push, a merge after a pull or a force push; no reviewer before the environment exists (now checklist step 1, and publish reads the environment through the API and requires a reviewer and exactly the 2.0 branch); the publish job building with id-token (verify builds and packs, publish only stages tarballs checked by SHA-256); a changeset bypass; spoofable and truncated earlier-run checks (only this workflow's push runs on the 2.0 branch in this repository, read to a short page, failing closed at GitHub's 1,000-result cap, within 35 days); nothing stages from a local machine; realpath-confined scratch folders; logs inside stop-commands markers. The last review, scoped to round 5, found nothing that fails open, nothing that fails closed, and no regression. Follow-ups that fail closed went to the chief of staff to file. The owner's answers: two files for main (the 2.0 Dependabot entry and a nightly starter) are on branch hitld/CS-613-main-files, commit df2dcb9991, cut from GitHub's main 8b9674e1aa, not pushed, with its commit hooks bypassed because 2.0's hooks can't run on 1.x's tree (prettier ran by hand); the checklist's step 7 says to push it through the bundle process. The publishing rehearsal (CS-994) is checklist step 6: stage every package and reject each, nothing goes live (8106a80c53, docs only, added by the orchestrator after the gated replay). Checked by the orchestrator on main f43b8b96af (replay 96946e82c2 of e550f24551, patch identical outside work/): npm ci, typecheck, tsc -p ., work check, build, npm test exit 0 (408 files, 6,912 tests), test:data, check:bundle, surface, shaders:check, eslint, the handbook, markdownlint, prettier-check, release:check, and stage.mjs --dry-run (nothing published).

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it, with the checklist commit, onto main's tip, reruns the gates if main's code moved, fast-forwards, regenerates the views and logs the merge. The workflows first run when the owner pushes; the owner's checklist comes before any release.
- B. Hold it: Nothing merges; the owner reviews the design first.

Recommended: Merge it. Every gate passes on main's tip, five security reviews' findings are fixed with the last review clean, nothing acts outside the repository, and the owner approved merging it before review.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
