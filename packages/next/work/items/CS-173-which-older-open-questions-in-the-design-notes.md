---
id: CS-173
title: Which older open questions in the design notes are still open?
kind: decision
state: done
created: 2026-11-13
project: CS-18
decider: owner
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

Triaged by the planning audit of 2026-11-13, at the owner's request. Nothing needed the owner's judgement to classify: each question is answered, folded into a work item, or a decision item in a named project.

- **The black hole visualization:** still open. Decision CS-296 in the sky project (CS-192); the example is CS-297.
- **The styling language:** JSON against text and the numeric semantics were answered by Cesium IR's decisions (`docs/design/core-ir.md`). The rest is open: CS-265 (the language's form, where its spec lives, who takes it to the 3D Tiles group and when) and CS-266 (element-wise overrides, strings and 64-bit IDs, the colour model, labels' collision, porting order), in the vector drawing and styling project (CS-190).
- **B-reps:** open. CS-299 (the extension's name and schema, NURBS or Bézier storage, the USD input path), CS-300 (OpenSubdiv or a TypeScript conversion) and CS-301 (whether the CSG sample stops at phase 3), in the B-rep project (CS-193). The OCCT licence is external item CS-310; kernel robustness is work item CS-315.
- **Bodies, frames and engineering coordinates:** open. CS-254 (the design globe's ion slots), CS-255 (hosting NOAA VDatum surfaces), CS-256 (taking the upstream proposals to the working groups), CS-244 (a hosted grid service) and CS-257 (`geoidFallback` with `allowBallpark`), in the frames follow-ups project (CS-189). Frames plan 5's questions are answered: the spec records answers to 1, 3, 4 and 5, and 5a built question 2's default (entry points). The missing terms for Earth orientation and leap-second data are part of external item CS-250 (legal review).
- **Geometry through placement:** the names `Warp` and `BezierWarp` were superseded by the transform graph (smooth and switch nodes; the code says `Warp` and `Route`), and any naming left goes to the public API review (CS-102). Accuracy as a bound or 1σ is settled by 5b's composed accuracy with a stated confidence (`"1σ" | "95%" | "max"`).
- **Water and sun glare:** ocean waves are folded into work item CS-294, whose design settles them.
- **The sun and sky example:** shutter-time star trails are folded into CS-295, to think through when 5e lands, as the owner said.
