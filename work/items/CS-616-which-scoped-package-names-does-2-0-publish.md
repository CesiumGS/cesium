---
id: CS-616
title: Which scoped package names does 2.0 publish under, beside cesium@2.0.0?
kind: decision
state: planned
created: 2026-11-17
project: CS-615
decider: owner
---

## Question

Every first-party package releases in lockstep at `cesium`'s version, starting at 2.0.0. The npm registry (read 2026-11-17) shows `@cesium/engine` (last 26.5.0) and `@cesium/widgets` (last 16.3.1) already published 2.0.0, and npm never reuses a version; `cesium` (last 1.147.0) has no 2.0.0; `@cesium/core` and `@cesium/gltf` are at 0.1.1 and belong to the 1.x team's current work. Which names does 2.0 use for its core and modules, so no one sees a version go backwards?

## Options and recommendation

- **Fresh scoped names** that are free at 2.0.0.
- **`@cesium/core` and `@cesium/gltf`** for 2.0, after agreeing with the 1.x team, and fresh names for the rest.
- **Jump past the existing majors** for `@cesium/engine` and `@cesium/widgets` (losing the shared version on those two).

Recommendation: fresh names, unless the 1.x team is glad to hand over `@cesium/core` and `@cesium/gltf`. Due before alpha.1.

The owner, 2026-11-21: the StrataKit widgets package is `@cesium/ui`. Adapters take seam prefixes (`source-*`, `loader-*`, `imagery-*`, `data-*`, `geocoder-*`), and today's `/proj` becomes `@cesium/crs`, with PROJ as `@cesium/crs-proj`. The full list comes from CS-834's package map, reviewed with the API review (CS-102).

1.x's `@cesium/core` keeps a 0.x line under a `1x` dist-tag, and 2.0 takes `latest` at 2.0.0 (CS-880, the owner, 2026-11-21).

## Answer

Open.
