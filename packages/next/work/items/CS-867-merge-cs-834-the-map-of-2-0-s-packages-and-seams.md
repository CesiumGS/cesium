---
id: CS-867
title: Merge CS-834, the map of 2.0's packages and seams
kind: decision
state: planned
created: 2026-11-21
project: CS-615
decider: owner
---

## Question

Merge CS-834, the design note mapping 2.0's packages, seams, directory layout and CS-835's move plan (docs/design/package-map.md), with a new handbook section 'From entry points to packages', into main? It is docs and one handbook tab. Merging doesn't answer its three owner decisions (D1 to D3); the main session files those, and the owner's review with the API review (CS-102) is still to come.

The note maps every package by kind: capability packages (@cesium/core, /time, /frames, /crs, /measure, /ui), adapter packages by seam prefix (source-*, loader-*, imagery-*, data-*, geocoder-*, crs-proj, tiling-native), plain-name service bundles (ion, iTwin, Esri), and the umbrella, cesium, the one place that wires defaults. It lists every seam with its owning package and today's and planned adapters; sets the directory layout (`packages/next/packages/<name>`, the umbrella staying at packages/next) and the rule that replaces layerOf (package.json dependencies define the layers, and a test checks no capability package depends on an adapter); gives CS-616's name list including @cesium/ui and how 1.x's @cesium/core and @cesium/gltf give way; and plans CS-835 as 10 ordered commits with a table of what can't be a pure move. In the umbrella, /proj becomes /crs and /widgets becomes /ui, the only surface change in CS-835; PROJ isn't split out there. Read first: 'The map in one page', then 'Decisions for the owner'. Its decisions: D1, shared utilities live in core with one @cesium/core/internal subpath (recommended), or a seventh package, or copies; CS-835 depends only on this. D2, 1.x's @cesium/core 0.1.1 gives way as one name with two version lines, 1.x on 0.x under a 1x dist-tag and 2.0 at latest from 2.0.0, which needs the 1.x team's agreement (recommended; a one-way door), or 1.x renames, or 2.0 takes a fresh name. D3, low priority: catalog adapters are catalog-* (recommended), or source-*. It suggests one new item (PROJ behind a coordinate-operations seam, @cesium/crs-proj) and notes for CS-617, CS-835 and CS-554, and answers CS-552's D5. Checked by the orchestrator on main 9b0f5410df (replay 6950aed4d1 of d6fdde4ca5, patch identical outside work/; the claim's touches conflict with the chief of staff's fix on main was resolved by keeping main's touches): markdownlint with the root config 0, prettier clean, eslint and prettier on the handbook tab clean, hitld work check 854 files, staleNames 0, its relative links resolve, the handbook's data step and vite build pass with the new section in the built page; npm run handbook's type check fails only on the known workerPool error (CS-851). A scan of the added text finds nothing internal-only.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. The main session files D1 to D3, the new item and the notes. CS-835 waits on D1.
- B. Hold it: Nothing merges; CS-835 and CS-617 read the map from its branch.

Recommended: Merge it. Docs and one handbook section, every check passes, it covers every part the item asks for, and its open questions go to the owner as their own items.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
