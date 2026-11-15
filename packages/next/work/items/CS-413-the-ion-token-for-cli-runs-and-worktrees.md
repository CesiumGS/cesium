---
id: CS-413
title: The ion token for CLI runs and worktrees, without writing it into a build
kind: work
status: Planned
created: 2026-11-14
project: CS-199
---

Found 2026-11-14: `cli.mjs run` on an ion scene (osm-philadelphia) fails every measurement with "needs a Cesium ion token", in a worktree and, by the code, in the main checkout too. The CLI serves a production build of the frozen tree, and production builds never contain `VITE_ION_TOKEN` (by design: `keepEnvSecretsOut`). Each run opens a fresh browser context, so no pasted token is there either. Only `--dev` (a dev server, which reads `.env.local`) gets one. Worktrees add a second gap: they have no `.env.local`, so their dev servers fall back to the evaluation token.

Proposal:

- **One place the token is found, outside every checkout's build:** `ION_TOKEN` in the environment, else this checkout's `packages/next/.env.local`, else the main checkout's (found through `git rev-parse --git-common-dir`). Worktrees then need nothing of their own.
- **Runs get it at run time, never in the build:** the CLI sets it in each run's browser context with an init script writing the page's session storage (the same place a token pasted in Dyno goes), so it is in no file, URL, log or report.
- **The dev server in a worktree** reads the main checkout's `.env.local` when its own is missing.
- **A test** that a production build of the bench pages contains no token, with one set.

## Done when

`cli.mjs run --scenes osm-philadelphia` measures both engines from the main checkout and from a fresh worktree with no setup, and no build, report or log contains the token.
