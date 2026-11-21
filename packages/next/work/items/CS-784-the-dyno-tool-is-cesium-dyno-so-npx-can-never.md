---
id: CS-784
title: The dyno tool is @cesium/dyno, so npx can never reach an outside package by its name
kind: work
state: in-progress
created: 2026-11-21
project: CS-389
needs: [CS-774]
claimed_by: orch-11-CS-784
touches: [package.json, packages/next/tools/dyno/**, packages/next/bench/dyno.mjs, packages/next/bench/suite/**, packages/next/.claude/skills/dyno/**, packages/next/test/dyno*.test.ts, AGENTS.md]
---

The owner, 2026-11-21: the private workspace package that CS-774 adds is renamed from `dyno` to `@cesium/dyno`. CS-774 found that a bare `npx dyno`, run anywhere the workspace link is missing (an old worktree, a fresh clone, or the main checkout before `npm install`), downloads and runs an unrelated public npm package named `dyno`. With no terminal attached, npm does that with only a warning. Only Cesium can publish under the `@cesium` scope, so a scoped name can't reach an outside package. CS-774 merges first, with `npx --no-install dyno` as its guard, and this item replaces that guard. The root `.npmrc` stays as it is.

Source: the owner's answer to the `.npmrc` question beside CS-774's merge, through the chief of staff. Why now: every brief and doc that names the command will otherwise teach the unsafe form. Rough size: small. Decider: the executor, within the touches above. The package stays private and is never published. If CS-616 (which scoped names 2.0 publishes under) needs this name kept free, that comes back as a question. Filed: 2026-11-21.

## Done when

- `packages/next/tools/dyno/package.json` is named `@cesium/dyno`, still `"private": true`. `npx @cesium/dyno --help` works from the root and from `packages/next` after `npm install`.
- With the workspace link missing, `npx @cesium/dyno` fails and downloads nothing. A test checks this without the network, for example by checking the package's private flag and the scope, or by running npx with an empty registry.
- The skill, `--help` text, the root `AGENTS.md` paragraph and the recorded run command all say `npx @cesium/dyno`. A test fails on any unscoped `npx dyno` or `npx --no-install dyno` line that's left.
- `npm pack --dry-run` for `@cesium/next` is unchanged.
