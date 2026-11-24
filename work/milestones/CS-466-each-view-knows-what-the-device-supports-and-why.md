---
id: CS-466
title: Each view knows what the device supports and why
kind: milestone
state: planned
created: 2026-11-15
project: CS-8
outcome: "An app can ask any view what the device supports, what each feature was given and why, and no fallback happens without being reported."
done_when:
  - "c1: On every named persona, from `m2-chrome` down to `swiftshader`, `minimum-limits` and `no-optional-features`, every feature in the catalog resolves to a step the device can run or to its documented fallback; the step given is never better than the step asked, and unknown hardware gets the best supported step with the reason that no rule matched."
  - "c2: The path `view.support.paths` names is the path that runs (star submission, the moments format, the KTX2 transcode target, the sample-rate path and GPU timing), and no code outside the profile and device layers reads device features, adapter info or limits to choose behaviour; a test names any line that does."
  - "c3: On a live view, an app reads `view.support`, `view.effective` and `view.explain(feature)` and gets, for each feature, what it asked for, what it was given, and the rule and reason behind it; the values stay right after a resize and after device loss."
  - "c4: Each fallback that is silent today raises a support notice on `Engine.errors` (glare's auto, moments without `float32-blendable`, the ambient occlusion pixel cap, World capacity clamps, the imagery slice ceiling, and screen-space error raised over budget), warns once in the console where the notice table says to, and throws under `strict`."
constraints: [CS-20 c1, CS-21 c1, CS-22 c2, CS-23 c3, CS-507 c4, CS-921 c?, CS-955 c?]
check: "integration-test test/viewSupport.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written: a fake engine on each persona (test/fakeGpu.ts) reads `support`, `effective` and `explain`, triggers each silent fallback in the plan's section 4 table, and checks the notice, the single warning and the `strict` throw; test/seams.test.ts covers c2. The glare and translucency parity pages (`node bench/run.mjs translucency`) stay unchanged.

## Shaping questions

- c3's device-loss part rests on a claim the plan marks unconfirmed (the render context keeps its formats after loss); CS-20 checks it first.
- Out of scope here: the inspector's Profile section and `emulate` (CS-27), so the why is reachable only through the API.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 4 items are constraints marked `c?` until shaping links each to a clause.
