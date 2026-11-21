---
id: CS-774
title: "npx dyno works: the dyno bin lives in a private workspace package, packages/next/tools/dyno"
kind: work
state: planned
created: 2026-11-20
project: CS-389
needs: [CS-721]
touches: [package.json, package-lock.json, packages/next/tools/dyno/**, packages/next/bench/dyno.mjs, packages/next/package.json, packages/next/.claude/skills/dyno/**, packages/next/test/dyno*.test.ts]
---

The owner, 2026-11-20, answering CS-721's question "where does the dyno bin live, so that `npx dyno` works?": a private workspace package (option A). npx finds only bins at the root, so the bin needs a root-level change. The name `dyno` is public, so it was the owner's call.

Source: the owner's answer to CS-721's question, through the chief of staff. Why now: runs record their command as `node packages/next/bench/dyno.mjs …` until this lands, and every brief spells out the long path. Rough size: small. Decider: the executor, within the touches above. The root `package.json` and lockfile are shared with 1.x, so change only the workspaces list and what the lockfile needs for it, and list that under `deviations`. Filed: 2026-11-20.

## Done when

- `packages/next/tools/dyno/package.json` has `"private": true`, a `bin` named `dyno` that runs `packages/next/bench/dyno.mjs`, and no dependencies of its own.
- The root workspaces list includes it, and `npm install` at the root leaves `npx dyno --help` working from the root and from `packages/next`. A test checks that the package is private and that its bin resolves.
- Nothing in it publishes. `npm pack --dry-run` for `@cesium/next` is unchanged.
- The dyno skill, `--help` text and CS-721's docs say `npx dyno`. Runs record `npx dyno …` as their command.
