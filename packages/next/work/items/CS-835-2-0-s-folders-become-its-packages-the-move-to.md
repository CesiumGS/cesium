---
id: CS-835
title: "2.0's folders become its packages: the move to the package map, with the layer rule read from package.json"
kind: work
state: planned
created: 2026-11-21
project: CS-615
needs: [CS-834, CS-809, CS-814, CS-552]
touches: [packages/next/src/**, packages/next/package.json, packages/next/test/importBoundary.test.ts, packages/next/tsconfig*.json, packages/next/scripts/**, package.json]
---

Moves 2.0's folders into the package layout that CS-834 sets. After the move, the layer rule comes from each package's `package.json` dependencies, not from `layerOf`'s path patterns.

Source: the owner, 2026-11-21, with CS-834. Why now: it runs right after the batch in flight (CS-809, CS-814, CS-552) merges, with new starts paused, so later seams land in their final homes. Rough size: large but mechanical. Decider: the executor, within CS-834's map. Any public name that changes beyond the map comes back as a question. Filed: 2026-11-21.

## Done when

- Every folder sits in its package from CS-834's map. Each package has its own `package.json` and entry point, and `@cesium/next` becomes the umbrella's development name until CS-616's names are final.
- The moves are pure: a type check per commit, then the full `npm test`, `npm run test:data`, the parity suites against the previous commit and a base, `shaders:check`, the bundle check and `npm run surface` once at the end. `api/surface.txt` changes only where the map renames an entry point.
- The import-boundary test reads the layer rule from package dependencies. It fails if a capability package depends on an adapter.
- No other work starts while it runs, and orch-11 pauses new starts for it.
