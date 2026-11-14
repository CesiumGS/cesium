# Decisions

**What this holds:** The founding decisions: what the review's recommendations adopted, and the owner's table (shaders, default look, multi-view, CAD data, foundation, platforms, milestone order). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Recommendations already adopted from the review: core-only (no compatibility mode); camera-relative offsets computed in compute; `instance_index` plus fallback; texture-array imagery cache; sample-0 feature-ID resolve; two-phase occlusion culling or none; limited render-target configurations; 32-bit two-pass point rasterization; bindless designed for but not built.

**Decided by the plan owner (r4):**

| Decision        | Choice                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shaders         | Slang for materials and vertex/fragment code; hand-written WGSL allowed for compute kernels; user contract is a WGSL-level ABI. Gated by the M0 spike, with WGSL + WESL as the fallback. (user contract superseded 2026-11-13: Cesium IR, §13.42) |
| Default look    | **HDR + tonemapping by default** for lit color, LDR as a per-view option; unlit color is display-referred and never tonemapped (r26). Parity baseline is 1.x with HDR on for lit color, off for unlit.                                            |
| Multi-view      | All four scenarios in the PoC: split views on one canvas, multiple canvases, offscreen targets, linked views (`ViewLink`).                                                                                                                        |
| CAD data        | Team-chosen CAD/BIM assets in Cesium ion; iModels can be tiled into ion.                                                                                                                                                                          |
| Foundation      | `packages/next` in this monorepo; TypeScript strict; new typed-array math module tested against 1.x.                                                                                                                                              |
| Platforms       | Chromium is the gate; Safari and Firefox best-effort; core WebGPU only.                                                                                                                                                                           |
| Milestone order | 3D Tiles (M2) before globe (M3). The draw-record format is locked in M1 with the globe's needs included.                                                                                                                                          |

**Still open:** none blocking M0. Exact OIT, auto-exposure and the M6 picks are decided at those milestones.
