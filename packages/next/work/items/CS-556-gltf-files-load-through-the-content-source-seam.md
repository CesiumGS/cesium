---
id: CS-556
title: glTF files load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/io/**]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

Single glTF and GLB files load as a source through the seam, beside glTF as 3D Tiles content. Related: CS-273 (glTF extension gaps).

## Done when

- Set by CS-552's plan.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
