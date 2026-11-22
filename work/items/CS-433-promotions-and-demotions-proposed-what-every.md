---
id: CS-433
title: "Promotions and demotions proposed: what every app needs, and what is exported only for examples"
kind: work
state: planned
created: 2026-11-14
project: CS-437
needs: [CS-101]
---

## Done when

Two lists for the review (CS-102), each entry with what it breaks among the examples and the bench:

- **Promote** what examples had to build that every app will need: the accuracy types and their composition, `branchPath` and the tree model, app-defined reference frames with their accuracy, point placement for labels and markers, camera rigs and orbit controls, the stale-answer and generation patterns around async work.
- **Demote** what is exported only because an example reaches into it, or exposes internals. Candidates already recorded: `LEVEL_ZERO_ERROR`; `castTerrainRay` and five terrain tile types; production modules exporting test-only helpers; `Trajectory.velocitySigma`; the stress context's getters; widgets exposing their occluders; `View.body`.
- **Names and placement left for the review:** the transform graph's `Warp`, `Route`, `resolveRoute` and `NonRigidRouteError`, not exported until the review names them; whether `GpuDevice` and `World` belong in the public surface (a host that shares a device may need `GpuDevice`); what to call the main entry point and "core" in the docs; `Tileset3D.world`, `Tileset3D.addItem` and `Globe.load`, whose public signatures still name `World` and `Engine`.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2; `docs/superpowers/plans/2026-11-09-split-second-pass.md` (public signatures); the API review notes in `docs/design/` (the review "collects the renames and open API questions the design notes left for it", CS-102).
