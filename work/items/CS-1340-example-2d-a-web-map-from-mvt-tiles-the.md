---
id: CS-1340
title: "Example: 2D, a web map from MVT tiles, the Mercator warp, and plan drawings of a design model"
kind: work
state: planned
created: 2026-11-24
project: CS-628
needs: [CS-557, CS-1170, CS-1329, CS-259, CS-1124, CS-253, CS-591, CS-218, CS-1336, CS-340]
---

The owner, 2026-11-24: "i think in our example gallery we also need a 2d example, showing off MVTs, our mercator projection warping stuff, vectors doing a web map style thing, generating plan drawings of an design model in orthographic projections, etc."

## Done when

- **A web map.** MVT tiles (CS-557) styled with MapLibre expressions (CS-1170) draw like a web map: fills, casings and dashes (CS-1329), and labels placed once across tile edges (CS-259). The view is a flat Web Mercator map with web map panning and zooming (CS-1124).
- **The Mercator warp, shown.** The same layers move between the globe, Columbus view and flat Web Mercator through the transform graph (CS-253). The page shows that the warp is the transform graph working, not a separate 2D engine: the scene mode and projection picker (CS-591), and the inspector's count of warped draws (CS-450) where it helps.
- **Plan drawings of a design model.** A design model is drawn as orthographic plan, elevation and section views (CS-218). It has exact edges and section cuts that carry their feature (CS-1336), CAD line styles, and a capture at a stated scale (CS-340).
- Whether this is one page with modes or two pages (web map, plan drawings) is the page's design call, recorded in its `DESIGN.md`.
- The example uses the public API only. Where it has to reach past the API, that's recorded for the API review.
- Its data comes from the setup store or a named public service, with no token in the page.
- A UX review on the real page, with its findings fixed. The page is checked in both themes, at desktop and 380 px wide, keyboard only, with reduced motion, and with a clean console.
