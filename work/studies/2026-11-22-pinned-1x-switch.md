---
id: 2026-11-22-pinned-1x-switch
title: The pinned cesium@1.147.0 against the in-tree 1.x build
kind: comparison
item: CS-611
status: concluded
created: 2026-11-22
instruments: [suite]
baseline: 1.x@hitld/CS-611-1x-leaves
candidate: 1.147.0
primary: [requests:lower:0.05]
guardrails: [bytes:0.05, settleMs:0.25]
runs: 3
order: paired-interleaved
stopping: fixed
alpha: 0.05
power: 0.8
noise: 0.05
prior: normal:0:0.05
health: [power:ac, thermal:nominal]
computed: refuted
outcome: refuted
holds_for: [mac-apple]
cites:
  - 2026-11-22T08-28-45-711Z-mac-apple
---

## Question

Do the published cesium@1.147.0 and the in-tree 1.x build at 1.147.0 load and draw the same, so parity and Dyno's baselines can switch to the pinned dependency?

## Hypothesis

They agree: no change worth detecting in requests, and bytes and settle time within margin. The comparison reads that as refuted (no effect worth having), which here is the agreement the switch needs.

## Design

- Fixed: 3 runs per arm, baseline and candidate paired by device and scene and interleaved.
- `npx @cesium/dyno measure start suite --study 2026-11-22-pinned-1x-switch --baseline 1.x@hitld/CS-611-1x-leaves --candidate 1.147.0 --reps 3`

## Notes

- 2026-11-22: Rewritten once after the first run, with the same question, hypothesis and plan, only to name the baseline as Dyno resolves the in-tree 1.x (`1.x@` and the branch); the first file named it 1.x and excluded the run.
- 2026-11-22: The Lab's parity suites (no Lab metrics until CS-401) ran on the in-tree 1.x (base 07-43Z to 08-27Z results) and on cesium-1x (08-37Z to 08-44Z, reruns 09-11Z and 09-13Z), in bench/results: parity, models, tileset, selection, tracks, translucency, heights, globe and baseline identical with timings aside; imagery within run-to-run noise (two cesium-1x runs differ by more than base and cesium-1x do); customShader's one 2.0-only Slang against WGSL row failed once at base and passed in both cesium-1x runs; lod fails the same way on both (lod.ts reads tileset.policy, a 2.0 bug at the base commit). terrain-rainier needs an ion token, which frozen builds keep out, so the suite run covers nyc-buildings only.

## Verdict

Refuted.

Computed from the pre-stated criteria: refuted (holds for mac-apple).

- mac-apple: primary requests (lower, minimum effect 5.0%): +0.0% (interval +0.0% to +0.0%), 3 runs: no effect worth having
- mac-apple: requests, Bayesian: P(better) 0.50, P(beats the minimum effect) 0.02, expected loss 1.00%
- mac-apple: guardrail bytes (margin 5.0%): pass, worst end +0.0%
- mac-apple: guardrail settleMs (margin 25.0%): pass, worst end +12.3%

- `2026-11-22T08-28-45-711Z-mac-apple`: requests and bytes identical across 3 paired runs (+0.0%), settle time within its 25% margin, the same motion quality frame for frame (nyc-buildings, cold orbit)
