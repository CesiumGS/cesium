---
id: CS-921
title: A compiled route's center term subtracts its highs as integers on both emitters
kind: work
state: done
created: 2026-11-22
project: CS-10
needs: [CS-54]
claimed_by: orch-11-CS-921
---

> **Committed by the owner (2026-11-22, for alpha.1).** Source: CS-54's executor (2026-11-22). Why: a real accuracy loss in the shipping viewer. Under relaxed math on Apple GPUs, a compiled route's center term (`tgCenter`) loses df64's low halves. That costs 0.1 to 0.3 m at the Earth's surface on WebGPU for separable routes (vertical exaggeration, flatten), and down to float32 precision on WebGL 2. CS-54 bounded the term at what it measured and documented why. Size: medium. Filed 2026-11-22.

## Done when

- A compiled route's center term subtracts its high parts as integers on both emitters, so relaxed math can't drop the low parts.
- The error at the Earth's surface is measured on WebGPU and WebGL 2, before and after, on Apple GPUs and at least one other vendor where available. Units and the measured spread are stated.
- The goldens are regenerated, and the parity suites run against the previous commit and a base. Every pixel difference is explained.

## Evidence

**The bound (CS-986, option A).** The derivation is in `packages/core/src/transform/centerTerm.ts`, and `centerTermBound` computes it. Whole units and 2⁻²⁴ units are int32 and exact, so they cost nothing. Only the float32 rests and the final sum cost anything. With J separable parameters, m = 6 + 3J and u = 2⁻²⁴, the center term T is within

m·u/(1 − m·u) · min(|T| + 1 + 2S, 3|T| + 4S) + (5 + 10J)·2⁻¹²⁶

of the exact value of its parts, in any order relaxed math may sum it, with or without fused multiply-adds. S is the sum of the float32 terms' magnitudes. Assumptions: float32 add, multiply and conversion round to nearest; relaxed math reassociates and contracts but doesn't expand a product into a sum of products (an assumption: p.w and g.w each appear in two products); int32 wraps modulo 2³²; results under 2⁻¹²⁶ may flush. A reassociated `a.w − b.w` makes 4 + 3J leaves and 3 + 3J adds, the same as written, and m = 6 + 3J still holds because the leaves' magnitudes are at least twice S. A Node emulation sums the end over random trees at worst-case parts (wholes near 2³⁰, fractions near ±1/2, rests ±2⁻²⁵): within the bound everywhere, worst ratio 0.226, and the test holds it above 0.2, so a derivation 5 times too small would fail. In meters at the Earth's surface:

- Eye at the draw's image, integer-valued parameters: under 10⁻¹³ m, or 10⁻¹¹ m for flatten.
- Fractional parameters: transverse Mercator 1.4 × 10⁻⁷ m, radial distortion 4.5 × 10⁻⁷ image-plane units, lattices up to 1.8 × 10⁻⁵ m.
- Eye d away: about 3.6 × 10⁻⁷·d with no separable parameter, and 5.4 × 10⁻⁷·d with one. That is 0.54 m at 1,000 km.

The exact range is every value under 2³⁰ units (1.07 × 10⁹ m) and each s·G under 2³¹ units. At or past 2³⁰ units a value falls back to float32 and costs up to 2⁻²⁴ of itself. Every writer of parts falls back the same way (`fixParts` on the CPU, `tg_splitParts` for the renderer's eye, `tgc_parts` for compute-written records), so F(c) less the eye can't wrap: a readback case puts F(c) and the eye on either side of the origin, 3 × 10⁹ m apart.

**The compute pass's records.** Round 3 fixed `tgc_parts`, which added the high's and the low's whole units in float32 (`i32(w + tw)`) and so lost whole units past 2²⁴: 1 m at 3 × 10⁷ m, 2 m at 4.2 × 10⁷ m, 13 m at 3.8 × 10⁸ m. It now converts each to i32 and adds them as integers. The readback can't reach the compute path (its records come from the CPU), so a Node emulation of `tgc_parts` checks it. Not covered by the bound: `tgc_parts`' inputs are df64 sums, which relaxed math can still fold, so compute-written records at the Earth's surface can keep the 0.1 to 0.3 m error measured before CS-921 (for example flatten's records when an anchor's records are remade on the GPU). That is CS-955's to measure (the df64 route-center pass, with its CPU fallback).

**Tolerance.** `CENTER` is the bound itself (`{abs: 0, rel: 1}` of `centerTermBound` at each lane's parts). The CPU's parts against the float64 map have their own check, `INPUTS`: 2·2⁻⁵² of (1 + Σ|s|)·(|F(c)| + |eye|), one float64 ulp for each of the 2 + 2J evaluations, weighted by |s| (an assumption about the built-ins' float64 programs), plus 10⁻⁹ measured for routes whose float64 work runs through larger values than their outputs. For flatten that is 6 × 10⁻⁷ m, against 6.6 × 10⁻⁸ m measured: round 2's fixed 10⁻⁷ m had less room than the plausible worst, 150 ulps of 6.4 × 10⁶ m (1.4 × 10⁻⁷ m).

**Measured** (Apple M2, `dyno lab irWgsl irGlsl`, 146 of 146 rows on each backend, `bench/results/2026-11-23T06-58-32-064Z-apple-metal-3.json` at 36581a528f): 16 cases with the eye 0 m, 10 m, 1 km, 100 km and 1,000 km from the image, in three directions. They cover the separable routes, both corridors and geographic to geocentric at the Earth's surface. The rows with the eye within 1 km take a corner of the draw's box, so the change and J are read with the eye away too (worst ratios 0.395 and 0.065). Two more cases cover a draw past 2³¹ m and F(c) and the eye on either side of the origin past 2³⁰ m (worst center ratio 0.011, no wrap). The worst ratio to the bound is 0.109 on WebGPU and 0.109 on WebGL 2, with the eye 100 km away. The largest error is 0.021 m, with the eye 1,000 km away, under float32's own rounding there. With the eye at the image, the worst error is 1.5 × 10⁻⁸ m.
