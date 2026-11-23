---
id: CS-1104
title: Merge CS-921, the center term as integers with a derived bound
kind: decision
state: planned
created: 2026-11-23
project: CS-10
decider: owner
---

## Question

Merge CS-921 into main? A compiled route's center term now subtracts its high parts as integers on both emitters, with an error bound derived and tested from cases with the eye away from the draw (your CS-986 A), exact for every value under 2³¹ units, and falls back to float32 only for a term whose integer sum would overflow (your CS-1096 A).

The center term is F(c) minus the eye plus the routes' separable parts, split into 16-bit whole units, 2⁻²⁴ units and float32 rests, summed as int32 with a sign test on every sum and the product guarded, so nothing wraps; an overflowing term takes the float32 sum of the same values. The bound, m = 6 + 3J with u = 2⁻²⁴, holds for any summation order and fused multiply-add, and the tolerance is that bound with nothing added; the wide terms have their own bound, 13 + J. Results on the Apple GPU (both WebGPU and WebGL 2): irWgsl and irGlsl pass every case, eye-away rows reach 0.109 of the bound, the case near 1.5 × 10⁹ m with the eye 62.5 m away reads back exactly 62.5 m, and the opposite-sides case falls back without wrapping. Not covered by a bound: the compute path's df64 inputs, which relaxed math can still fold (0.1 to 0.3 m at the Earth's surface), are CS-955's to measure. The route module grows by a fixed 3,551 characters of helpers, so the corridor test's size budget moves from 36,000 to 39,500 characters with the same headroom. Five rounds after Claude reviews (Opus); the last found nothing Important, and its Minors (an int-to-float rounding assumption's wording, 'any partial sum' in the header, the wide floor of 0.05, a misplaced tie note) go to a follow-up. One deviation: round 2 ran a test kernel in a browser before reading its Metal output; the kernel had no loops and clamped indices. Parity before and after: identical apart from timings. Not measured on another vendor's GPU. Checked by the orchestrator on the replay 7c3b59ba4d (patch identical outside work/): build, npm test 7,052 of 7,052, test:data (dish-tracks failed under load and passed alone, 60 of 60, the known load failure), checkBundle, surface, shaders, eslint, the handbook.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; CS-941 and CS-955 can then start.
- B. Hold it: Nothing merges; CS-941 and CS-955 keep waiting.

Recommended: Merge it. It is built as you answered CS-986 and CS-1096, the last review found nothing Important, and every gate passes apart from a known load failure that passes alone.

If unanswered by 2026-11-26T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
