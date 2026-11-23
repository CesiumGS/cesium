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

m·u/(1 − m·u) · min(|T| + 1 + 2S, 3|T| + 4S) + m·2⁻¹²⁶

of the exact value of its parts, in any order relaxed math may sum it. S is the sum of the float32 terms' magnitudes. Assumptions: float32 add, multiply and conversion round to nearest; int32 wraps modulo 2³²; denormals may flush. In meters at the Earth's surface:

- Eye at the draw's image, integer-valued parameters: under 10⁻¹³ m, or 10⁻¹¹ m for flatten.
- Fractional parameters: transverse Mercator 1.4 × 10⁻⁷ m, radial distortion 4.5 × 10⁻⁷ image-plane units, lattices up to 1.8 × 10⁻⁵ m.
- Eye d away: about 3.6 × 10⁻⁷·d with no separable parameter, and 5.4 × 10⁻⁷·d with one. That is 0.54 m at 1,000 km.

The exact range is every value, each s·G and the term under 2³¹ units (2.1 × 10⁹ m). Past it, a value is float32 and costs up to 2⁻²⁴ of itself.

**Tolerance.** `CENTER` is the bound itself (`{abs: 0, rel: 1}` of `centerTermBound` at each lane's parts). The CPU's parts against the float64 map have their own check, `INPUTS` (10⁻⁷ m, a measured ceiling, not derived).

**Measured** (Apple M2, `dyno lab irWgsl irGlsl`, 145 of 145 rows on each backend): 17 cases with the eye 0 m, 10 m, 1 km, 100 km and 1,000 km from the image, in three directions. They cover the separable routes, both corridors, geographic to geocentric at the Earth's surface, and a draw past 2³¹ m. The worst ratio to the bound is 0.109 on WebGPU and 0.109 on WebGL 2, with the eye 100 km away. The largest error is 0.021 m, with the eye 1,000 km away, under float32's own rounding there. With the eye at the image, the worst error is 1.5 × 10⁻⁸ m.
