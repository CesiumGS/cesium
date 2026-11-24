---
id: CS-1182
title: "Dyno benchmarks both engines at matched visuals: a matched profile, a feature ladder and geometry-only scenes, apart from each engine's defaults"
kind: work
state: planned
created: 2026-11-23
project: CS-389
needs: [CS-1152]
touches: [bench/suite/suite.ts, bench/suite/settings.mjs, bench/suite/engines.mjs, bench/suite/catalog/**, bench/suite/commands/suite.mjs, bench/suite/report.mjs, bench/suite/app.tsx, bench/suite/DESIGN.md, .claude/skills/dyno/**, test/**]
---

## Problem

The owner, 2026-11-24: "i still think these aren't apples to apples comparisons; the default settings of each engine is employing different rendering techniques, we might need a specific set of benchmarks with more control over the visuals to really do the apples to apples benchmarking. like turning off physical sky, or rendering scenes that are geometry only, etc. i think the scenes we're using aren't the right comparison"

Today the suite matches some settings across the engines (`bench/suite/suite.ts`):

- Neither engine draws a sky. 1.x runs with `skyBox: false` and `skyAtmosphere: false`. 2.0 uses `background: "color"`.
- Both use 4× MSAA and HDR, with no fog and no FXAA, at the same pixel ratio.
- The globe and its imagery are unlit in both. 2.0's exposure and sun illuminance are set in 1.x's unitless terms.

Some differences aren't controlled:

- 2.0 still lights the scene with `environment: "procedural"`, a light built from the physical sky. It costs GPU time even when the sky isn't drawn, and 1.x has nothing like it here.
- The engines use different lighting models: 2.0's physically based materials against 1.x's lighting.
- Their post stages and tone mapping differ.
- Shadows follow each engine's default unless a configuration sets them.
- Every catalog scene carries tiles, imagery or terrain, so fixed passes can outweigh geometry and draw work on light scenes.

So a ratio between the engines mixes two questions:

- How efficient is each engine at the same work?
- What does each engine cost at its own defaults?

Both are worth answering, but not in one number.

CS-1177 investigates the GPU-paced gap on three scenes, including the sky's share and heavier scenes. This item is the lasting instrument that CS-1177 and later comparisons use.

## Done when

1. **A matched profile.** A named render profile sets each engine to the same features and nothing extra:
   - no sky or atmosphere, and no environment lighting;
   - one directional sun at the same direction and illuminance;
   - no shadows;
   - the same MSAA, pixel ratio, HDR and tone mapping, with no other post stage.

   Each engine records the settings it actually used, 2.0 through `effectiveRender()`. A run counts as matched only when the two records agree. A mismatch names the setting, and the run is labeled as not matched. Where 1.x can't turn a feature off or match it, the profile says so, and the overview shows it beside the result.
2. **A feature ladder.** One command runs both engines through the same steps on the same scenes:
   - geometry only, unlit;
   - sun-lit;
   - with shadows;
   - with sky and atmosphere;
   - each engine's own defaults.

   The report shows each step's cost and the difference between neighboring steps. That difference is what the feature costs in each engine, in CPU time per frame and in GPU time per frame. GPU time is compared only where CS-1152 allows: within one engine across steps, or between engines only in the GPU-paced orbit.
3. **Geometry-only scenes.** The catalog gains scenes of heavy meshes with no imagery or terrain, so that draw and geometry work dominate a frame. Use what the catalog already has where it fits. Where it doesn't, add scenes from sources whose license allows it, and record the source and license. Coordinate with CS-1177's heavier scenes rather than adding the same ones twice.
4. **Two questions, kept apart.** The overview and the report label every comparison as matched (the same work at the same settings) or defaults (what a user gets out of the box). They never combine the two in one ratio, one tile or one alert. The defaults comparison stays as it is today.
5. **Docs and tests.** `bench/suite/DESIGN.md` and the `dyno` skill describe the profile, the ladder, the scenes and which question each answers. Focused tests cover the profile's agreement check (a mismatch is named, and the run is not labeled matched), the ladder's step differences and the overview's labels.
6. **A first comparison.** One matched run and one ladder run on this Mac, cited by Dyno run IDs, with a short reading of what each feature costs in each engine.
