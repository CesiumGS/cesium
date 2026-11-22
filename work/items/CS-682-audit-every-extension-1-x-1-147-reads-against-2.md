---
id: CS-682
title: Audit every extension 1.x 1.147 reads against 2.0, and refresh the parity table
kind: work
state: planned
created: 2026-11-17
project: CS-191
---

The owner, 2026-11-17: "are we missing any extensions that 1.x implements that we haven't done yet? like the AEC extensions (coplanar fill and friends)? ... have we audited 1.x to see what 2.0 might be missing?" The extension table in `docs/design/parity.md` dates from r33, names milestones that no longer exist (M4, M5), and leaves out some of what 1.x reads today. A scan of 1.x's engine source on 2026-11-17 found `BENTLEY_materials_planar_fill`, `BENTLEY_materials_line_style`, `BENTLEY_materials_point_style` (tracked by CS-260, but not in the table), `KHR_blend` and `EXT_voxels` absent from both the table and 2.0's code.

## Done when

- Every glTF and 3D Tiles extension 1.x 1.147 reads (from its source, not from memory) is a row in `docs/design/parity.md`'s table, with what 2.0 does today (supported, tolerated, refused, missing) and the CS item that carries it.
- Each missing extension is carried by an existing item (CS-260, CS-272, CS-273, CS-665 and the like) or by a new one the report lists for the main session to file.
- The table names CS items instead of the old milestone names, and its "checked" date is current.
- WebGL extensions and build-time names, which aren't content extensions, are left out and the report says so.
