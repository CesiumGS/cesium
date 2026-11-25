---
id: CS-309
title: B-rep trims and edges on the vector design's shared kernels
kind: work
state: planned
created: 2026-11-13
project: CS-193
needs: [CS-258, CS-261]
---

## Done when

B-rep trims and vector fills use one coverage and curve contract over `coverage.slang`. (Edges moved to CS-1336 on 2026-11-24.)

Detail: `docs/design/breps-and-geometry-queries.md`, "Order", step 6, and "Sequencing with the vector design".

2026-11-24, from CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 4, on CS-258's branch until it merges): this item keeps B-rep trims, on the coverage and curve contract CS-261 lands. B-rep edges and sections move to CS-1336, on the stroke path in CS-260's same-feature depth mode, so the trims don't wait on CS-260. The done-when above now reads: B-rep trims and vector fills use one coverage and curve contract over `coverage.slang`.
