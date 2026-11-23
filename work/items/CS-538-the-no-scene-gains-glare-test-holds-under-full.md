---
id: CS-538
title: The no-scene-gains glare test holds under full-suite load
kind: work
state: planned
created: 2026-11-15
project: CS-199
touches: [packages/next/test/noSceneGains.test.ts]
tier_override: 1
---

`test/noSceneGains.test.ts`, "tone mapping, glare and a look stage change no byte", failed once under the full suite's load on 2026-11-15 and passed alone three times out of three; it has failed that way before. Find what in it depends on timing or load.

## Done when

- The cause is named: what differs between a loaded run and a lone one.
- The test passes the full suite 20 times in a row on this Mac, and still fails when a look stage changes a byte of the scene.

## Note (2026-11-22)

The cause, found by CS-966's executor: the test compares the view block without zeroing `View.transition` (word 104, from the engine's clock), so it fails under load. A one-line fix zeroes that word before the comparison.
