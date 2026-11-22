---
id: CS-834
title: "A map of 2.0's packages and seams: capability packages, seam-prefixed adapters, the umbrella, and the directory layout"
kind: work
state: in-progress
created: 2026-11-21
project: CS-615
claimed_by: orch-11-CS-834
touches: [docs/design, packages/next/test/importBoundary.test.ts]
---

The owner, 2026-11-21, after the review of 2.0's seams: "how do we think about these packages outside of the seam and how we might name them? … a better directory structure … modules and seams holistically?"

The owner chose:

- seam-prefixed adapter names;
- `@cesium/crs` for today's `/proj` entry point. It holds CRS, WKT2, georeferencing, alignments, placement and snapping (`src/engineering`). PROJ becomes `@cesium/crs-proj`, one provider of coordinate operations.
- that this map "comes along with the api review, so we can think about all of them together". CS-102 reviews packages, seams and API as one.

Today:

- `packages/next/src` has about 30 folders;
- `layerOf` in `test/importBoundary.test.ts` maps them to entry points by path patterns.

Source: the owner, through the chief of staff. Why now: packages publish at alpha.1 (CS-617, CS-621), and the seams being built now (CS-808 to CS-816) should land in their final homes. Rough size: medium (a design note). Decider: the executor drafts it, and the owner reviews it with the API review (CS-102). Filed: 2026-11-21.

## Done when

- A design note maps every package. There are three kinds, and experimental is a 0.x version line (CS-681), not a fourth kind.
  - **Capability packages** define the stable API and own the seams they consume: `@cesium/core`, `/time`, `/frames`, `/crs`, `/measure` and `/ui`.
  - **Adapter packages** implement seams and can be swapped. They're named by seam prefix: `source-*` (streaming sources), `loader-*` (format loaders), `imagery-*` (imagery and terrain), `data-*` (data-resource providers), `crs-proj`, `geocoder-*` and `tiling-native`. Service bundles that span seams keep a plain name, for example `@cesium/ion`.
  - **The umbrella** `cesium` is the one place that wires defaults.
- It lists every seam with its owning capability package, and the adapters behind it, today's and planned. That includes CS-552's content-source seam, CS-808 to CS-811, CS-813 to CS-816, CS-818, CS-831's write path and CS-806.
- It proposes the directory layout, one folder per package, and the rule that replaces `layerOf`:
  - each package's `package.json` dependencies define the layer rule;
  - a test checks that no capability package depends on an adapter.
  - `ir`, `gpu`, `render`, the streaming host and `query` stay internal to core, or it says why not.
- It gives CS-616 its full name list, including `@cesium/ui` (the owner's choice), and says how 1.x's `@cesium/core` and `@cesium/gltf` (0.1.1) give way.
- It plans the move (CS-835) as pure moves, with a type check per commit and the full suite once at the end.
