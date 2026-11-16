# Sketch: a gallery example for a vehicle's lidar over the design (owner, 2026-11-12)

**What this holds:** A gallery example sketch: a vehicle's lidar over the design (owner, 2026-11-12). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**The idea (owner):** take a lidar scan, or point data, from an autonomous vehicle and render the points as 3D Tiles. Style them the way the real-time tracks example styles its vehicles. Overlay BIM or CAD data, so the design and the real world it was built into show together. Use synthetic data if no public dataset fits.

**Data** (licenses from a secondary source, 2026-11-12; check each dataset's own terms before use):

| Dataset                                         | License                                                       | Poses                                                                   | Fit                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PandaSet** (Hesai, Scale AI)                  | CC BY 4.0, which allows commercial use with attribution       | Per-frame GPS in latitude and longitude, with semantic labels on points | **First choice.** Urban scenes in San Francisco and Palo Alto, where OSM Buildings and a BIM or CAD stand-in can sit beside them                                                                                                                                                                   |
| nuScenes                                        | CC BY-NC-SA 4.0; a commercial license is available on request | Local poses, convertible                                                | Only with a license                                                                                                                                                                                                                                                                                |
| KITTI, KITTI-360, Waymo Open, Argoverse 2, A2D2 | Non-commercial or no-derivatives                              | Various                                                                 | Not for a shipped example                                                                                                                                                                                                                                                                          |
| **Synthetic**                                   | Ours                                                          | Exact                                                                   | **Fallback, and the test fixture.** Ray-cast a rotating 64- or 128-beam sensor from a moving vehicle against our own content (OSM Buildings, terrain, a b-rep design), using the engine's ray queries. That gives exact ground truth for deviation, and the sensor model is the example's to show. |

**What it shows:**

1. **Points streamed as 3D Tiles:** a drive's accumulated sweeps tiled by space (and by time, for the sweep-by-sweep view), from the vehicle's frames into the world.
2. **Styled like the tracks:** color by intensity, height, return number, semantic class (PandaSet's labels), or time since capture, with the current sweep bright and older ones fading. Point size follows distance, and points are culled by class. The same vector-styling path is used: points up close, a density surface from afar.
3. **The transform graph for the sensor chain:** each sweep's points sit in a lidar node, under an affine extrinsic (sensor to vehicle), under a time-varying vehicle-pose node (a piecewise trajectory from GPS/INS), under ENU, under ITRF.
   - A pick reports the point in the sensor's frame, the vehicle's and the world's.
   - Pose uncertainty propagates to each point through the route's Jacobians (`accuracyAlong`), drawn as error ellipses on picked points.
4. **Over the design:** a BIM or CAD model (b-reps or a design tileset, placed by `Georeference`) under the points.
   - **Deviation:** color points by signed distance to the nearest design surface, using a geometry query (closest point against b-reps or meshes) and a classic as-built-versus-as-designed heat map.
   - **Clipping:** a clip box or section plane cuts both, with clip effects ghosting the design or the points.
5. **Real-time mode:** replay the drive with the clock, adding each sweep as it arrives, following the vehicle with a rig. This is the "tracks" half, and it shares the per-frame budgeted ingestion.

**Engine gaps found while sketching:**

- **Point clouds in 3D Tiles aren't drawn:** glTF `POINTS` primitives are skipped ("points not drawn yet", `src/io/gltfParse.ts`), and `.pnts` is deferred "until the vector renderer" (`src/io/composite.ts`).
  - The vector renderer's points (`PointSource`, the tracks example's path) are the intended home.
  - So the example needs a point-cloud tile path first: glTF points with `EXT_mesh_features` and `EXT_structural_metadata` per point, and `pnts` for 1.x content, feeding `PointSource`-style GPU points with the styling language. Attenuation, eye-dome lighting and splats are options.
- **Tiling the data:** a small offline tiler (LAS/LAZ or PandaSet's per-frame pickles to glTF points in a quadtree or octree by space) as a script, or an ion upload of LAS for the real dataset.
- **Deviation against b-reps at scale:** many closest-point queries. Run the query interface's GPU backend in batches, or precompute in the tiler against the design.

**Order:**

1. The point-cloud tile path (engine).
2. The synthetic sensor and tiler, which also become the test fixture.
3. PandaSet ingestion, after verifying its license.
4. The example, with the design overlay and deviation.
5. Real-time replay.
