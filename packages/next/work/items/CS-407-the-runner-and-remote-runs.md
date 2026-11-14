---
id: CS-407
title: The runner and remote runs
kind: work
status: Planned
created: 2026-11-13
project: CS-389
needs: [CS-390, CS-406]
---

`runner pair` and `runner` on the laptop: the outbound WebSocket, the device token, the pinned authority, jobs as browser sessions (`launchServer` on loopback, the Playwright protocol carried in the WebSocket), the laptop's run lock and wake lock, the telemetry stream, the versions and flags report. `bench/suite/browserArgs.mjs` shared by both sides. On the Mac: `run --on` and `images --on`, the hub fronting each run's servers with a session cookie, origins rewritten for pages, `chromium.connect` to the hub's local endpoint, the runner's telemetry in place of the local sampler, the link measured, `servedFrom` and the machine key, the runner's state on Getting started.

Baseline runs in the laptop's browser follow CS-411's answer (the plan assumes the recommendation).

## Done when

The α study's run, started on the Mac with `--on win`, measures in the laptop's Edge in a secure, cross-origin-isolated context and lands in the Mac's store as `machine: win`, served from `mac`. A remote run's first content differs from a local one on the laptop while frame time doesn't, and the two never share a series or reuse each other's repetitions. A second job waits on the laptop's lock and is told whose run holds it. Ctrl-C on the Mac, or a dropped connection, leaves no browser or lock on the laptop. A Playwright mismatch is refused with the fix. Nothing listens on the laptop's network interfaces.

## Files

new `bench/suite/runner/runner.mjs`, `bench/suite/hub/jobs.mjs`, `hub/front.mjs`, `browserArgs.mjs`; `commands/runner.mjs`, `cli.mjs`, `images.mjs`, `telemetry.mjs`, `reuse.mjs` (the machine key), `views/FirstRun.tsx`

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
