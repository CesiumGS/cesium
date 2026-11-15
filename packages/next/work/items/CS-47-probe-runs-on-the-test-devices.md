---
id: CS-47
title: Probe runs on the test devices
kind: work
status: Planned
created: 2026-11-13
project: CS-9
needs: [CS-35, CS-46]
---

Run the probe (CS-35) through its Dyno page on the devices CS-46 names. It settles three things from the browser research: the Safari and iOS float and S3TC/BPTC cohort (53% to 58%), the Samsung `EXT_clip_control` mismatch (1.21% in the survey against MDN's Samsung Internet 26.0) and Firefox's `EXT_clip_control` (survey 60.29% against MDN's version 159). On a real Android device it also checks the inference that WebGPU compatibility mode wouldn't widen reach (research question 2). The personas `webgl2-firefox`, `webgl2-apple-mobile` and `webgl2-android` are added only after Apple's float result is measured (research question 5). CS-39's trilinear filtering default and CS-42's float-table choice read its results.

Detail: `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
