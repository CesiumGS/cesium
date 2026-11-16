---
id: CS-408
title: The device lab
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-394, CS-404, CS-407]
---

The runner for Firefox on Linux, and for Android Chrome over `adb` from the machine the phone is plugged into. Manual device runs: `device-run` with one-time links and QR codes, the suite page's post-back of scenes, checks and the capability report, device aliases and hardware classes, validity "warning" by design. Which Android browsers and versions honour user-installed authorities and resolve `.local` names, checked and recorded in `bench/suite/DEVICES.md`.

It serves the WebGL 2 probe runs on real devices (CS-47, on the devices CS-46 names) and gives CS-334 (benchmarks across OS, browser and GPU vendor) its first devices.

## Done when

A paired iPhone opens a run link, and its capability report and one scene's timings land in the Mac's store under its alias. Firefox on Linux runs a scene automatically. An Android phone runs a WebGPU scene in a secure context. A link works once.

## Files

`commands/device.mjs`, new `bench/suite/hub/deviceRuns.mjs`, `capabilities.ts`, `DEVICES.md`; `suite.ts` (post-back), `runner/runner.mjs` (Firefox, Android), `manifest.mjs`, `views/Runs.tsx` (devices)

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
