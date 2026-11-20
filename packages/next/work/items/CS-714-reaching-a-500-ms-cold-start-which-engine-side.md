---
id: CS-714
title: "Reaching a 500 ms cold start: which engine-side work"
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

To bring Dyno's viewer from about 1.26 s back toward the 500 ms cold start, which engine-side work should be filed?

CS-706 bisected the cold start: under 500 ms on 11-01 (df9d4918d4, 491 ms), 1,345 ms at ac8caf26bc. Of the +836 ms, engine setup grew 28 to 425 ms (+397, 47%; Engine.create awaits three rounds of compiles: atmosphere, sky and the render context, 119 pipelines), the dev server's modules grew 123 to 475 through the @cesium/next barrel (+293, 35%), and holding until the content is framed added +119 (14%). CS-706 fixed what was in its scope (one engine through StrictMode, one manifest request, settings after the first frame) and set a 1,400 ms regression budget with 500 ms as the goal. The rest is engine and package-structure work across areas, so it is the owner's call.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. File both items: Two engine items: compile the pipelines while the sky builds instead of in three rounds, and load optional subsystems (b-rep, the transform graph, georeference, measure, engineering) lazily instead of through the barrel; each measures with the coldstart run, and the budget tightens as they land. (cost: Two medium items in the engine and the package's entry structure; lazy loading changes what the barrel pulls in.)
- B. Pipelines only: One engine item for concurrent pipeline compiles; the module count stays. (cost: Recovers the largest share (engine setup) but leaves about 290 ms of module loading.)
- C. Lazy modules only: One item for lazy optional subsystems; engine setup stays. (cost: Recovers module loading but leaves about 400 ms of engine setup.)
- D. Not now: Nothing is filed; the viewer stays near 1.26 s, held by the 1,400 ms check, with 500 ms recorded as the goal.

Recommended: File both items. Together they account for 82% of the growth CS-706 measured, they are independent of each other, and the coldstart run now measures each one.

If unanswered by 2026-11-23T12:00:00Z: Not now.

## Answer

Recorded in the front matter once answered.
