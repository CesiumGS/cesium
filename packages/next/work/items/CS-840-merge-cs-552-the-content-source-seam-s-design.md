---
id: CS-840
title: Merge CS-552, the content-source seam's design (ContentSource) and its plan for CS-554 to CS-559
kind: decision
state: planned
created: 2026-11-21
project: CS-191
decider: owner
---

## Question

Merge CS-552, the design of the content-source seam (one ContentSource interface every source implements) with its plan for CS-554 to CS-559 and a new handbook section, into main? It is a design note, a plan and one handbook tab; no engine code changes. Merging it doesn't answer its six owner decisions (D1 to D6); the main session files those as their own decision items.

New: docs/design/content-source-seam.md (415 lines) and docs/superpowers/plans/2026-11-21-content-source-seam.md (149 lines); docs/design/modular-renderer.md is marked superseded; the handbook's architecture tab gets the section 'Content sources as modules', replacing the old one. The note maps each source onto the interface: 3D Tiles, terrain, imagery, glTF files, MVT, Esri, USD, PostGIS and live feeds. It leaves room for CS-831 (editing: a capability declaration, an override contract and a ChangeSet type), CS-806 (the Cesium Native host spike) and CS-818, and designs push updates and registered passes. The owner reads first 'The interface in one page', then 'Decisions for the owner'. Its six decisions, each to be filed as its own item: D1, do renderer passes register (recommended: inside the engine first, RenderFeature in named slots); D2, the globe as an item (one terrain source and ordered imagery layers, placed per body); D3, a USD runtime (a spike first; a new dependency); D4, push transport (connect for streams on CS-809's provider, after CS-809 merges); D5, one entry point per family of sources, named with the package names; D6, ion's interface (an AssetResolver and a credential provider; ion is a resolver, not a source). It proposes new items A (the seam's core), B (render features) and C (streams for push), and new done-whens and needs for CS-554 to CS-559; the full list is in CS-552-handover.md in the shared notes. Names such as ContentSource, SourceKind and SourceHost are working names until the API review. Checked by the orchestrator on main 026520244f (replay cbf8da34b6 of 8e88dcdb76): markdownlint with the root config, prettier, hitld work check, staleNames, the handbook's data step and its vite build pass, and the new section is in the built page. npm run handbook's type check fails with TS2305 (handbook/viewer/workerPool.ts imports TextureFormatSupport, which src/io/decoders.ts doesn't export), on main and on the base too; that is a separate item. A scan of the added text finds nothing internal-only. Snyk (executor): 0 on architecture.tsx. Presentation: orch-11-merge-ready-CS-552.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns markdownlint, the work check and the handbook build, fast-forwards main, regenerates the views and logs the merge. The main session files D1 to D6, items A, B and C, and the changes to CS-554 to CS-559. CS-834 and CS-831, which read this design, then build on main's copy.
- B. Hold it: Nothing merges. CS-554 to CS-559, items A to C and CS-835 wait, and CS-834 and CS-831 read the design from its branch.

Recommended: Merge it. It is docs only, every check passes, it covers every source the item names, and its open questions go to the owner as their own items rather than being settled in the note.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
