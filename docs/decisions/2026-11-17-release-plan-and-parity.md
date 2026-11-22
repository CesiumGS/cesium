# The release plan and parity with 1.x (owner, 2026-11-17)

**What this holds:** The owner's calls of 2026-11-17 on what 2.0 drops from 1.x, what it keeps as modules, how it's packaged, and which work each release on the ladder (CS-455) needs. The work items that carry each call are listed at the end. Parity means parity where it makes sense: a 1.x feature can be met by a different 2.0 design.

## What 2.0 drops

- **Already dropped:** the Entity API and the data-source layer (2026-11-08), WebGL render state, custom draw commands and GLSL shader text.
- **`Primitive` and `Appearance` as classes.** `addMesh`, `addDraw`, `ModelPool`, feature IDs, PBR materials, custom shaders and feature styles do their jobs.
- **Fabric as a format and an API.** The vector styling plan and custom shaders are more expressive. Patterns come from the vector pipeline, and MaterialX or a custom shader can also make them. A separate Fabric module that calls into those may come later if users need it; it isn't planned.
- **1.x's billboard clouds.** Clouds come from participating media (CS-286), in scope since 2026-11-08. A stylized look can use the particle module.
- **A runtime Entity compatibility layer,** for now. Migration is an agent-first kit instead (below).

## What 2.0 keeps, as modules on common interfaces

- **Ellipsoid-aware geometry generators** (box, ellipsoid, cylinder, wall, corridor, extruded polygon, polyline volume and the rest), as a module of pure, worker-safe functions that return `MeshData`. The owner expects enough overlap with the vector pipeline for a shared architecture; that's worked out when the work starts.
- **A GPU particle system,** not a port of 1.x's: compute-shader simulation with constant loop bounds, drawing through the point-source seam, forces and emitters as Slang or Cesium IR functions, emitters in the transform graph. Dense smoke stays with volumetric media.
- **Physics representations** across the geometry kinds (meshes, B-reps, SDFs, tiles, terrain), as input to simulators and to the particle system: a design first, as another face of the geometry query seam.
- **A widgets library:** React components on StrataKit, plus thin DOM wrappers for pages without React. React is a peer dependency of the widgets package only. The Viewer is composed from it. It covers what 1.x's widgets do: the geocoder (with a pluggable service), base layer picker, info box, selection indicator, home, fullscreen, navigation help, scene mode and projection pickers, and the VR button, beside the timeline, credits and inspector that exist.
- **Loaders for CZML, KML, GPX and GeoJSON.** File-format loading is modular and extensible in the same way tile sources are: other 3D Tiles servers beyond Cesium ion, MVT, Esri services, PostGIS, GeoParquet and more, each through the content-source seam (2026-11-16).
- **Terrain and imagery providers:** probably all of 1.x's, each a module through one common interface into core, with several imagery layers on a globe.
- **Voxels:** they're part of the 3D Tiles 2.0 work, and loading common voxel formats outside tiles serves smaller datasets.
- **2D and Columbus view,** built from the transform graph's nodes. "Smooth node" gets a new name.
- **One surface-projection design** for classification, draping and decals: vector features, imagery and volumes projected onto terrain, tilesets and models, with one target mask that generalizes `ClassificationType`. Its mechanism is the design's to choose.
- **Lines, polygons and labels** belong to the vector rendering pipeline, which also renders text.
- **Smaller pieces:**
  - `drillPick` returns every hit along the pixel's ray, or every layer drawn at it, with no re-rendering.
  - Time intervals join `/time` as the one-dimensional case of conditional content.
  - Interpolation becomes public through the motion design.
  - A small set of bounding volumes and their tests is promoted.
  - The rhumb line is one edge type beside geodesic and straight-in-a-CRS, shared by `/measure`, the vector pipeline and the geometry generators.
  - GPM (`NGA_gpm_local`) feeds measurement accuracy.
  - `AGI_articulations` becomes transform-graph nodes in the motion design.
  - glTF 1.0 and the deprecated extensions: core refuses them with a clear message, and a legacy module upgrades them on load (CS-274).
  - Panoramas become a module, shown as a backdrop or projected onto the scene.
  - A sensor module.

## Time and motion

Time-dynamic content is one model for every source. 3D Tiles 2.0's time-dynamic tiles are really conditional content, which may be multidimensional or rule-based. When the design starts, it reads the 3D Tiles 2.0 spec for its capabilities and for where a general version may be heading. It fits that with the animation core and with motion across the engine (the animation core, glTF animation, the transform graph, time-bound values, trajectories, articulations), as one consistent whole.

## Migration

An agent-first migration kit, built from the handbook's tested 1.x-to-2.0 map (`handbook/src/apiMap.ts`):

- a machine-readable map with worked patterns;
- a migration skill;
- proof through the parity harness that a migrated app matches;
- a human guide generated from the same map.

1.x's Sandcastle becomes 2.0's gallery. Its examples are the migration corpus: each one is moved with the kit and checked against 1.x.

## Packaging

- Each first-party part is its own scoped package. All of them release in lockstep at one version, with `cesium@2.0.0` as the umbrella package for the full experience.
- An embedding application installs the core alone. Others get everything from one install.
- The names are taken over as a new major version. `@cesium/engine` and `@cesium/widgets` have already published 2.0.0 and higher, and npm never reuses a version, so the scoped names are chosen separately, before alpha.1, so that no one sees a version go backwards.
- How the API marks experimental work, and whether to keep doing so, is decided with the API review.
- A module that arrives after beta.1 ships in the experimental tier and doesn't hold the freeze.

## The releases

The ladder (CS-455): alpha.1 (a host can build on it), beta.1 (feature complete; the API changes only through an approved review), rc.1 (only fixes after it; parity and the docs done), 2.0.0.

- **alpha.1:**
  - the renderer seam and the content-source seam;
  - loading that survives real networks;
  - device profiles;
  - Cesium ion as a module;
  - safe hosting and clean CI;
  - the package split and its names;
  - Sandcastle hosting 2.0's examples.
  The performance and trust tracks start here.
- **beta.1:** every feature above that isn't in the experimental tier, plus the public API review and its changes, worker mode, WebGL 2 drawing, Cesium IR, glTF and 3D Tiles at 1.x's coverage, materials, vector drawing, and bodies and frames.
- **Between beta.1 and rc.1:**
  - performance tuning;
  - the trust and evals track;
  - migrating the Sandcastle corpus;
  - a clean 2.0 branch: the 1.x code replaced, and the build system and CI/CD rebuilt to modern standards;
  - the docs.
- **Between rc.1 and 2.0.0:** fixes only, plus outside validation. Users of extensions such as `AGI_articulations`, GPM and the legacy glTF formats confirm the implementation works with their own data, as part of the release-candidate process.
- **Showcases and the development harness gate no release:** the Artemis II replay, the live MaterialX graph, planets, the CSG sample's editing, GPU rays, and Dyno's and the tracker's own work.

## Trust and evals

The 1.x team needs evidence that this code is production-worthy, which it can check without trusting the agents that wrote it:

- independent oracles: 1.x pinned at 1.147, Khronos's glTF and 3D Tiles sample sets, GeographicLib, SOFA and SPICE;
- test strength measured by mutation scores beside coverage;
- adversarial checks: fuzzed loaders, simulated network faults, GPU device loss, soak runs;
- every stated accuracy checked against measured error;
- each merge's provenance rolled into a trust report per module;
- a random sample of merged changes reviewed by Cesium engineers, giving the process a measured defect rate;
- the Sandcastle migration's pass rate;
- outside validation at rc.

As human-in-the-lead matures, its own evals help along the way.

## Tracked as

- **New projects:** the widgets library (CS-584), trust and evals (CS-596), a clean 2.0 branch and a modern build (CS-609), packaging and package names (CS-615), the agent-first migration kit (CS-622), Sandcastle as 2.0's gallery (CS-628), the particle system (CS-637), geometry generators (CS-642), conditional content and motion (CS-647).
- **In existing projects:** surface projection (CS-654 to CS-657, vector drawing); the loaders, legacy glTF, GPM and panoramas (CS-658 to CS-668 and CS-674, content sources); edge types (CS-643); drillPick (CS-669); bounding volumes (CS-670); the physics-representation design (CS-672); the sensor module (CS-673); the smaller tools' milestone (CS-675).
- **Reused and committed:** providers (CS-279), voxels (CS-339), 2D and Columbus view (CS-253), glTF animation (CS-278), the content-source seam's items (CS-553 to CS-559, milestone CS-560), packaging for pages without a build step (CS-363), the viewshed (CS-348).
- **Decisions for the owner:** the scoped package names (CS-616), whether to keep marking APIs experimental (CS-681), the new name for smooth nodes (CS-671).
- **Answered:** glTF 1.0 and the deprecated extensions (CS-274); which milestones each release needs (CS-526 to CS-529), carried into the release items CS-530 to CS-533.
- **Retired:** the long outcomes CS-1 to CS-7, CS-436 and CS-525, dropped with this record.
- **Tidy-up:** the stale records and the handbook's compatibility and differences tabs (CS-679); triage of the open items no release needs (CS-680).

## Amendment (2026-11-22)

The owner kept the harness milestones, the spike and the sample as alpha.1 gates (CS-953 A): CS-506, CS-519, CS-561, CS-751, CS-722, CS-857 and CS-858. alpha.1 waits on them, alongside the milestones approved on 2026-11-17.
