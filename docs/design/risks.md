# Risks

**What this holds:** Bindless textures, platform and WebGPU risks, and project risks. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

## Bindless textures: not in the PoC, designed for in 2.0

- **Status (late 2026)**:
  - `sized-binding-arrays` and `bindless` resource tables (`GPUResourceTable`, `getResource<T>(i)`) are **draft proposals**.
  - Chrome has shipped only groundwork and lists bindless as "under consideration".
  - Firefox and Safari have nothing.
- **For our data, bindless isn't needed yet**:
  - Photogrammetry/P3DT tiles carry 1–2 textures, so one bind group per tile baked into its bundle is effectively free.
  - Untextured CAD uses the material table.
  - Imagery uses a texture array.
- **What we do now**: every texture access goes through a `TextureHandle` and a single shader interface boundary. A resource-table backend can then drop in when `sampling-resource-table` ships, with no caller changes.
- **The material seam, built (r50, [gpu-limits-and-capacities.md](gpu-limits-and-capacities.md))**: setting the stage for bindless.
  - Material records carry their texture references (six 16-bit refs in the record's last three words, `MaterialData.textures`).
  - `World.textureRefs` makes them: today a reference is the slot in the batch's texture set.
  - Shaders read material textures only through opaque.wgsl `materialTexture(material, slot, uv)` and `materialHasTexture` (common.wgsl). `test/bindless.test.ts` fails on any other read of the group-2 material textures.
  - For bindless, three things change: `materialTexture` (to `textureSample(table[ref], …)`), `World.textureRefs` (to return table indices) and group 2 (one group for the world). Callers, the record's layout, material sharing and custom shaders don't.
- **Reassess at 2.0 GA.** If bindless is broadly available by then, the visibility buffer becomes a 2.x option.

## Platform and WebGPU risks

| Risk                                                                            | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Hi/lo precision broken by compiler reassociation or fusion (Metal relaxed math) | Single compute draw-prep site; integer-assisted subtraction if needed; M0 Metal test                                                        |
| Silent no-op indirect draws without `indirect-first-instance`                   | Instance-step attribute fallback always compiled in                                                                                         |
| Integer MRT can't be MSAA-resolved                                              | Sample-0 custom resolve in the pick pass                                                                                                    |
| Dawn indirect-draw validation overhead                                          | Measure in M0; keep args in bounds provably where possible                                                                                  |
| No VRAM budget API; OOM = device loss                                           | Heuristic budgets, adaptive after loss, robust device-loss replay                                                                           |
| Single queue, no async compute; uploads stall rendering                         | Per-frame upload byte/ms budget; encode compute early                                                                                       |
| `mapAsync` latency of 1–3 frames                                                | Async pick/query APIs by design                                                                                                             |
| Subgroups ≈0% on Safari/Firefox                                                 | Portable kernel paths (wait-free radix sort, workgroup reductions)                                                                          |
| Render bundles invalidated by pipeline or bind-group changes                    | Rebuild per tile on change; limit target configurations                                                                                     |
| Slang WGSL backend gaps                                                         | Hand-written WGSL kernels allowed; WGSL-level ABI; WESL fallback (user contract superseded 2026-11-13: Cesium IR, [core-ir.md](core-ir.md)) |
| Browser coverage                                                                | Chromium first; parity suite on Safari and Firefox where available                                                                          |
| Compatibility mode not supported                                                | Stated non-goal                                                                                                                             |
| Fragment storage writes run once per sample under MSAA (Apple, Metal)           | Lists' nodes carry their samples; per-sample pass where probed; parity ground truth                                                         |

## Project risks

- **Schedule**: 5–6 months across everything here is optimistic. Droppable in this order:
  1. M6
  2. two-phase occlusion culling
  3. MBOIT (keep the exact linked-list mode, at its higher cost)
  4. `Budgeted` prediction and GPU feedback
  5. pixel-exact horizon-culling parity
- **Globe scope**: defaults plus terrain and imagery only.
- **Parity rabbit holes**: thresholds plus L3 sign-off.
- **Draw-record format churn**: designed in M1 with the globe's needs, so M2 and M3 don't break it.
