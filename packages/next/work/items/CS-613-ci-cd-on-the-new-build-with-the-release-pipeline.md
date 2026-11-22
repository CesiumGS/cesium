---
id: CS-613
title: CI/CD on the new build, with the release pipeline
kind: work
state: planned
created: 2026-11-17
project: CS-609
needs: [CS-612]
---

## Done when

- CI runs the tests, checks and evals on every change, and the release pipeline publishes every package in lockstep from a release record.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.

## The release tool and changelogs (owner, 2026-11-21)

CS-888 settled the tool: Changesets, plus one small script. The owner also answered two questions on changelogs:

- **A changeset per change.** An executor adds the changeset in the same commit that closes its work item. The changeset names the packages, the bump (major, minor or patch), and one or two sentences written for users. A change with nothing for users (tests, docs, bench) adds an empty changeset. CI fails a pull request that changes a published package without one. The merge review checks the wording, and `hitld publish check` runs on it before the merge.
- **Per-package changelogs plus combined release notes.** Keep Changesets' default `CHANGELOG.md` in each package. The release script gathers every package's section into one page for the GitHub release.

In this change:

- Update `docs/design/repository-build-and-release.md`. Its sections on the release record, changelogs and "the tools it doesn't use" describe the repository-script option that CS-888 replaced.
- Configure Changesets with the stable packages as one `fixed` group.
- Write the script that derives the experimental 0.x line (CS-891) and checks it before publishing.
- Add the changeset rule to `packages/next/AGENTS.md` and to the work-items skill. The rule lands with the tool, so executors aren't told to write changesets before Changesets is installed. `AGENTS.md` is an owner path, so the merge goes to the owner.
