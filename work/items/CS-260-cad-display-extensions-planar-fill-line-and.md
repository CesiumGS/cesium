---
id: CS-260
title: "CAD display extensions: planar fill, line and point styles, edge visibility"
kind: work
state: planned
created: 2026-11-13
project: CS-190
needs: [CS-258, CS-1329, CS-1118]
---

## Done when

`BENTLEY_materials_planar_fill`, `BENTLEY_materials_line_style`, `BENTLEY_materials_point_style` and `EXT_mesh_primitive_edge_visibility` draw on the shared line-and-point path, with planar fill's coplanar order and exact edges; test asset 4665927 joins the catalog once its licence is checked. No general depth shift (owner, 2026-11-08).

Detail: `docs/design/cad-display-extensions.md`; `docs/history/m1-progress.md`, "Open, for later".

2026-11-24, from CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 4, on CS-258's branch until it merges): CAD line styles need dashes on the stroke path (CS-1329) and draw layers (CS-1118). B-rep edges and sections in this item's same-feature depth mode are CS-1336.
