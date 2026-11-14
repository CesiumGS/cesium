# Parity strategy (1.x as oracle)

**What this holds:** How 2.0 is tested against 1.x as the oracle: the parity levels, the harness and extension coverage. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

The harness is `parity/` side-by-side: a 1.x `Viewer` (WebGL) and a 2.0 `Engine` (WebGPU), driven by **one serialized camera state** and a fixed `JulianDate`, with the same assets and default settings. Parity runs use `Stepwise` selection. Color is judged on 2.0's exact sRGB pipeline, and translucency against 2.0's own exact reference mode rather than 1.x (r9). Because 2.0 defaults to HDR, the primary image baseline is **1.x with `scene.highDynamicRange = true`** and the same tonemapper. A secondary LDR-vs-LDR run covers 1.x's out-of-the-box default.

| Level                      | Check                                                                                                         | Pass criterion                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| L0 math                    | Ellipsoid/Transforms/Sun/projection vs 1.x; **hi/lo precision on Metal, D3D12 and Vulkan**                    | ≤1e-12 relative (CPU); bounded error in meters at canonical distances (GPU) |
| L1 selection (`Stepwise`)  | Selected 3D Tiles and terrain tile IDs after load settles                                                     | ≥ 99% Jaccard (target 100%)                                                 |
| L1′ selection (`Budgeted`) | Image error vs a fully refined reference; bytes downloaded; time-to-full-detail; popping with a static camera | better than `Stepwise` on most metrics and no worse on any                  |
| L2 image                   | NVIDIA FLIP mean / p95 vs 1.x screenshot                                                                      | mean ≤ 0.05, p95 ≤ 0.2 (tune in M0)                                         |
| L3 look-dev                | Swipe slider plus flicker toggle                                                                              | human sign-off                                                              |

Expected sources of drift, each tracked explicitly:

- sRGB placement
- MSAA resolve behavior
- reverse-Z vs log depth at far range
- ground atmosphere and fog
- default IBL
- `KHR_materials_unlit`
- imagery filtering after compositing

Canonical datasets:

- Cesium World Terrain (ion 1) with the ion default imagery
- Cesium OSM Buildings (ion 96188)
- **CAD/BIM tilesets hosted in Cesium ion**, chosen by the team (iModels can be tiled into ion)
- one photogrammetry b3dm tileset
- Google P3DT (ion 2275207)
- `Specs/Data` tilesets for offline CI

## Extension coverage

What 1.x reads (its glTF loader and 3D Tiles code, r33) against 2.0
today. "Tolerated" means 2.0 loads the content but ignores the
extension, so it draws differently from 1.x; the benchmark suite matches
1.x to 2.0 where it can (render settings, §16.3) and the filmstrip shows
the rest. Status as of r33; milestones are where each is planned.

| Extension                                                                                                               | Used by                                             | 2.0                                | Milestone                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `KHR_materials_unlit`, `KHR_mesh_quantization`                                                                          | photogrammetry, Google tiles, most tilers           | supported                          | done                            |
| `KHR_draco_mesh_compression`, `EXT_/KHR_meshopt_compression`                                                            | compressed meshes                                   | supported (worker decode)          | done                            |
| `KHR_texture_basisu`                                                                                                    | KTX2 textures                                       | supported (transcoded per device)  | done                            |
| `EXT_mesh_features`, `EXT_structural_metadata`                                                                          | features and metadata (3D Tiles 1.1)                | supported (vertex IDs, tables)     | done; textures/attributes M6    |
| `EXT_mesh_gpu_instancing`, `EXT_instance_features`                                                                      | instanced glTF, i3dm                                | supported                          | done                            |
| `CESIUM_RTC`, `3DTILES_batch_table_hierarchy`                                                                           | b3dm and legacy tilesets                            | supported                          | done                            |
| `KHR_texture_transform`                                                                                                 | atlased textures, CAD materials                     | tolerated (ignored, warns)         | M4                              |
| `CESIUM_primitive_outline`                                                                                              | OSM Buildings, CAD tilesets                         | tolerated (outlines not drawn)     | M4                              |
| `EXT_mesh_primitive_edge_visibility`, `CESIUM_3D_TILE_EDGES`                                                            | iTwin/CAD edges (Bentley content)                   | missing                            | M4 (CAD edges, §13)             |
| `KHR_materials_emissive_strength`, `_specular`, `_clearcoat`                                                            | PBR assets                                          | missing                            | M4                              |
| `KHR_materials_anisotropy`, `_pbrSpecularGlossiness`                                                                    | PBR and older assets                                | missing                            | M4                              |
| `KHR_node_visibility`, `KHR_/EXT_mesh_primitive_restart`                                                                | glTF 2.1-era assets                                 | missing                            | M4                              |
| `EXT_texture_webp`, `EXT_textureInfo_constant_lod`                                                                      | web-optimized textures, terrain-draped textures     | missing                            | M4                              |
| `3DTILES_implicit_tiling`, `3DTILES_subtree`                                                                            | large tilesets, point clouds, global data           | missing (warns)                    | M5                              |
| `3DTILES_multiple_contents`                                                                                             | layered tilesets                                    | first content only (warns)         | M5                              |
| `3DTILES_bounding_volume_S2`, `_cylinder`, `EXT_implicit_*_region`                                                      | global and cylindrical tilesets                     | missing (box, region, sphere only) | M5                              |
| `3DTILES_metadata`, `3DTILES_content_gltf` (1.0 extensions)                                                             | 3D Tiles 1.0 tilesets with 1.1 features             | missing                            | M5                              |
| `3DTILES_draco_point_compression`, pnts                                                                                 | point clouds                                        | missing                            | point-cloud milestone           |
| `KHR_gaussian_splatting` (and SPZ compression)                                                                          | Gaussian splats                                     | missing                            | splat milestone (§13)           |
| `CESIUM_mesh_vector`, `EXT_mesh_polygon`, `3DTILES_content_gltf_vector`, `MAXAR_content_geojson`                        | vector tiles and vector data                        | missing                            | vector milestone (§13)          |
| `CESIUM_3D_TILE_CLASSIFICATION` (and `_IGNORE_SHOW`, `_MASK`)                                                           | classification                                      | missing                            | after M6                        |
| `EXT_primitive_voxels`, `3DTILES_content_voxels`                                                                        | voxels                                              | missing                            | later                           |
| `KHR_implicit_shapes`, `AGI_articulations`, `NGA_gpm_local`, `EXT_geospatial_crs`                                       | collision shapes, articulated models, accuracy, CRS | missing                            | later                           |
| `KHR_techniques_webgl`, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes`, `EXT_feature_metadata` | glTF 1.0 and deprecated drafts (1.x upgrades them)  | missing                            | decide: upgrade on load or drop |

Of the 3D Tiles 1.0 content formats, b3dm and i3dm are supported; pnts,
cmpt, vctr and geom are not. The table is checked when a milestone closes, and
the benchmark catalog's scenes note which of these their content uses.
