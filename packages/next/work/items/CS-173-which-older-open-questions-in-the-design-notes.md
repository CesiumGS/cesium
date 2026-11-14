---
id: CS-173
title: Which older open questions in the design notes are still open?
kind: decision
status: Planned
created: 2026-11-13
project: CS-18
decided-by: owner
---

## Question

Some design notes written before 2026-11-13 end with questions for the owner that have no recorded answer. They belong to no project yet, so they weren't made decision items one by one. Which are still open, and which project should each join?

- The black hole visualization (`docs/design/black-hole-visualization.md`): how much physics; the Moon lensed or ray traced; the warp in the engine or the app; integrated-GPU cost; the colour model; an engine feature or gallery only.
- The styling language (`docs/design/styling-language.md`, and `docs/design/styling-and-a-shared-ir.md`): where the spec lives; element-wise overrides; labels' collision pass; porting order; strings and 64-bit IDs; the colour model; who takes a spec proposal to the 3D Tiles working group, and when. The core IR's decisions answered JSON versus text and the numeric semantics.
- B-reps (`docs/design/breps-and-geometry-queries.md`): OpenSubdiv or a TypeScript patch conversion; the OCCT licence; kernel robustness; the extension's name and schema review; NURBS or Bézier storage; USD input.
- Bodies, frames and engineering coordinates (`docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open"): the owner's long models for the design globe's ion slots; hosting NOAA VDatum surfaces; taking the upstream proposals to the right people; a hosted grid service; frames plan 5's four questions; whether `geoidFallback` with `allowBallpark` takes the ballpark. Also Earth orientation and leap seconds with no primary terms found.
- Geometry through placement (`docs/design/geometry-through-placement-review.md`): the names `Warp` and `BezierWarp`; accuracy as a bound or 1σ (provisional).
- Water and sun glare: ocean waves. The sun and sky example: shutter-time star trails.

## Options and recommendation

Recommend a short triage with the owner: mark each answered, dropped, or a decision item in a named project.

## Answer

Open.
