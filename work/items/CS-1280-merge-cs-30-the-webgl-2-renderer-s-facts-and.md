---
id: CS-1280
title: Merge CS-30, the WebGL 2 renderer's facts and support rules
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

## Question

Merge CS-30 into main? On the WebGL 2 personas, view.support now has WebGPU's shape with WebGL-named facts, and every feature WebGL 2 lacks is off with a reason and its source.

A test compares view.support on webgl2-basic and webgl2-chrome with m2-chrome: the same members, content keys and feature names, renderer webgl2, offered steps in catalog order, and WebGL-named paths (depth log or reversed-z, draws). The two personas differ where EXT_float_blend and EXT_clip_control differ. Every catalog step absent on WebGL 2 (glare's three steps, city lights, exact translucency) has an unmet rule with a reason and a provenance citing the WebGL 2 plan's section 1, so a look that asks for one resolves to off with a 'WebGL 2:' notice. Other steps stay offered, since the plan names no lack for them and the rules never guess a lower step; each milestone that builds one adds a rule if it finds a lack. SupportRule gains an optional provenance field, which is internal, so api/surface.txt is unchanged. The third done-when (required content holds once WebGL 2 draws) can't be exercised yet: WebGL 2 draws nothing, and the report says so. Your question on what content.required lists before WebGL 2 draws is filed separately. A Sonnet review found no Important; Minors: provenance cites a plan section without a quote or date, and provenance is filled on WebGL 2's rules and one WebGPU rule only. No owner paths. Checked by the orchestrator on the replay 870b407409 (patch identical outside work/). Its cheap gates passed except two load-sensitive tests at a load average near 195: dish-tracks in test/data/framesExplorerScenarios.test.ts failed alone once then, and passed alone twice on this replay and once on main later (60 of 60 each), and noSceneGains passed alone. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; WebGL 2's support report keeps WebGPU-named facts and unexplained absences.

Recommended: A. Merge it. It meets the done-when as far as WebGL 2 draws today, every absence is explained, and nothing is guessed.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
