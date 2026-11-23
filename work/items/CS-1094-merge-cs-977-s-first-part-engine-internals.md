---
id: CS-1094
title: "Merge CS-977's first part: engine internals leave core's public entry"
kind: decision
state: done
created: 2026-11-23
project: CS-437
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; CS-977 stays open for the adapters."
answered_at: 2026-11-23T20:47:02.780Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-977's first part into main? It takes 18 engine internals off @cesium/core's public entry, makes SectionClient and its four types public so a host can section off the main thread, and maps every adapter to the seam it waits for. CS-977 stays open: the adapters can't move until their seams land.

Under your CS-974 C and CS-973 C. Left the entry: SlicePool (now @cesium/core/internal, for the ui package), BASE_BINDING_LIMITS and BASE_CAPACITY_LIMITS, the mesh-cap helpers (assembleMeshCaps, meshPlane, rayHitRegions, sectionTile, tileBounds, triangulateRegion, MeshCapGeometry, MeshCapPlane), SectionJob and runSection, castTerrainRay with its options and result, LEVEL_ZERO_ERROR and resolveUri. Joined it: SectionClient, SectionClientOptions, SectionWorkerLike, SectionMessage and SectionReply, since SectionRunner was public with no public way to build one; the clipping example now uses the public import. What has no public replacement is said in the package map and the changeset (testing a ray against mesh-cap regions; castTerrainRay's endTolerance, margin and known). The package map gains a section listing each adapter (ion, iTwin, Bing, URL template, 3D Tiles, glTF), its target package and the seam it waits for (CS-269, CS-554, CS-556, CS-810, CS-811), all behind CS-847. Examples that still import by path (formBounds, KernelCanceled) are recorded for the API review. The changeset says package and export names may change until beta.1's API review. No new package, no dependency, nothing in packages/core/src/source/. Owner paths: packages/core/src/index.ts and api/surface.txt. Three fix rounds after Claude reviews (Sonnet): a public SectionRunner with no builder, two unexported types it named, and the protocol table's kinds for the new names. Open for you, separately: if the seams miss alpha.1, does alpha.1 keep waiting (C) or publish the adapters' names in core's entry under the right to rename? The executor and the orchestrator recommend keeping C and ordering CS-847, then CS-554, CS-556 and CS-810, first. Checked by the orchestrator on the replay 2d0bfcc6a5 (patch identical outside work/): build, npm test 6,938 of 6,938, test:data, checkBundle, surface (current), shaders, eslint, the handbook; the executor also ran release:check and the Sandcastle build.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; CS-977 stays open for the adapters.
- B. Hold it: Nothing merges; core's entry keeps the internals until the whole item is done.

Recommended: Merge it. It does the part of CS-974 C that doesn't wait on a seam, each review's findings are fixed, every gate passes, and merging now keeps later branches from conflicting with core's entry.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
