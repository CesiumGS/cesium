# Custom Map Projections Guide

CesiumJS supports custom map projections for use in Columbus View and 2D scene modes. This guide covers the three new projection classes and the GLSL uniforms they expose for custom shaders.

- [Custom Map Projections Guide](#custom-map-projections-guide)
  - [Overview](#overview)
  - [Using a Projection with the Viewer](#using-a-projection-with-the-viewer)
  - [`Proj4Projection`](#proj4projection)
  - [`CustomProjection`](#customprojection)
  - [`Matrix4Projection`](#matrix4projection)
  - [GLSL Uniforms](#glsl-uniforms)
    - [Example: Lambert LAEA in a vertex shader](#example-lambert-laea-in-a-vertex-shader)
  - [Serialization and Web Workers](#serialization-and-web-workers)
  - [Known Limitations](#known-limitations)
  - [What Is Not Supported](#what-is-not-supported)

## Overview

Three projection classes implement the `MapProjection` interface:

| Class               | Defined by                                                           | Use case                                                                 |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Proj4Projection`   | A [proj4](https://proj.org/) source string (proj4 syntax or OGC WKT) | Standard EPSG projections like Lambert, Mollweide, Robinson, Equal Earth |
| `CustomProjection`  | User-provided `project` / `unproject` functions                      | Bespoke projections not covered by proj4                                 |
| `Matrix4Projection` | A 4x4 affine matrix                                                  | Simple linear transforms from `(lon, lat, h, 1)` to `(x, y, z)`          |

All three can be passed as the `mapProjection` option when creating a `Viewer`. The existing `GeographicProjection` and `WebMercatorProjection` classes also implement this interface and remain the fastest paths — the new classes are enabled for non-cylindrical projections where those fast paths are guarded by `MapProjection#isNormalCylindrical`.

## Using a Projection with the Viewer

```js
const projection = new Cesium.Proj4Projection({
  sourceProjection:
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 " +
    "+ellps=GRS80 +units=m +no_defs",
});

const viewer = new Cesium.Viewer("cesiumContainer", {
  mapProjection: projection,
  sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
});
```

The scene defaults to `MapMode2D.ROTATE` (instead of `INFINITE_SCROLL`) whenever `projection.isNormalCylindrical` is `false`, since non-cylindrical projections cannot wrap around horizontally.

## `Proj4Projection`

Wraps the [proj4](https://github.com/proj4js/proj4js) library and accepts any projection definition that proj4js understands — proj4 syntax (`+proj=...`), OGC Well-Known Text, or registered EPSG identifiers.

```js
// Lambert Azimuthal Equal-Area, Europe (EPSG:3035)
const lambertEurope = new Cesium.Proj4Projection({
  sourceProjection:
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 " +
    "+ellps=GRS80 +units=m +no_defs",
});

// Mollweide
const mollweide = new Cesium.Proj4Projection({
  sourceProjection:
    "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
});

// Equal Earth (Šavrič, Patterson & Jenny, 2018) — equal-area pseudocylindrical
const equalEarth = new Cesium.Proj4Projection({
  sourceProjection:
    "+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
});

// North Polar Stereographic with a restricted valid area
const northPolar = new Cesium.Proj4Projection({
  sourceProjection:
    "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " +
    "+a=6378273 +b=6356889.449 +units=m +no_defs",
  wgs84Bounds: Cesium.Rectangle.fromDegrees(-180, 30, 180, 90),
});
```

Constructor options:

- `sourceProjection` (required) — the proj4 definition string.
- `heightScale` (default `1.0`) — scale factor applied to projected heights.
- `wgs84Bounds` — a `Rectangle` describing the projection's valid geographic area. Points outside this area are clamped before projecting, which avoids singularities (e.g., clamping to ±70° for a polar stereographic).
- `projectedBounds` — the projected area in meters, used when the valid area is known in the projected space.
- `ellipsoid` (default `Ellipsoid.WGS84`).

## `CustomProjection`

Accepts arbitrary `project` / `unproject` functions. Use this when your projection is not expressible as a proj4 string.

```js
const projection = new Cesium.CustomProjection({
  project: function (cartographic, result) {
    result = result || { x: 0, y: 0, z: 0 };
    result.x = cartographic.longitude * 6378137;
    result.y = cartographic.latitude * 6378137;
    result.z = cartographic.height;
    return result;
  },
  unproject: function (cartesian, result) {
    result = result || { longitude: 0, latitude: 0, height: 0 };
    result.longitude = cartesian.x / 6378137;
    result.latitude = cartesian.y / 6378137;
    result.height = cartesian.z;
    return result;
  },
});
```

**Important constraint — functions must be self-contained.** They cannot reference variables, imports, or closures from the surrounding scope. They are serialized via `Function.prototype.toString()` and reconstructed inside web workers, which have no access to the original scope. The same reason is why the example above uses plain objects (`{ x, y, z }`) instead of `Cesium.Cartesian3` — the worker reconstructs the function without Cesium imports.

## `Matrix4Projection`

Applies a 4x4 affine transformation to `(lon, lat, height, 1)`. Useful for simple linear projections or for prototyping.

```js
const projection = new Cesium.Matrix4Projection({
  matrix: Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1e5, 1e5, 1.0)),
  degrees: true, // input longitude/latitude are interpreted in degrees
});
```

Constructor options:

- `matrix` (required) — `Matrix4` applied as `projected = matrix * [lon, lat, h, 1]`, then divided by `w`.
- `degrees` (default `true`) — if `false`, input longitude/latitude are interpreted in radians.
- `ellipsoid` (default `Ellipsoid.WGS84`).

## GLSL Uniforms

When a non-cylindrical projection is active, five automatic uniforms are exposed to every shader, allowing custom vertex shaders (for example via `CustomShader` on a `Model`) to perform projection math on the GPU.

| Uniform                          | Type   | Components                                                                                       |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `czm_mapProjectionType`          | `int`  | A `MapProjectionType` value: `0`=GEOGRAPHIC, `1`=WEBMERCATOR, `2`=PROJ4, `3`=CUSTOM, `4`=MATRIX4 |
| `czm_projectionParams`           | `vec4` | `(lon0, lat0, sinLat0, cosLat0)` in radians                                                      |
| `czm_projectionOffsets`          | `vec3` | `(falseEasting, falseNorthing, semiMajorAxis)` in meters                                         |
| `czm_projectionEllipsoidParams`  | `vec4` | `(sinBeta0, cosBeta0, Rq, D)` for ellipsoidal LAEA                                               |
| `czm_projectionEllipsoidParams2` | `vec4` | `(e2, e, qp, 0)` — squared eccentricity, eccentricity, qp                                        |

The parameters are extracted from the projection's parsed proj4 representation on the CPU side (see `UniformState.updateProjectionUniforms`) so shaders do not need to parse the source string themselves. For `CustomProjection` and `Matrix4Projection`, only `czm_mapProjectionType` is meaningful — the matrix or custom function is not reflected to the GPU.

### Example: Lambert LAEA in a vertex shader

The following vertex shader, used with `CustomShader` on a glTF `Model`, converts an ECEF position to Lambert Azimuthal Equal-Area coordinates on the GPU.

```glsl
void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
  // Convert ECEF → geodetic (lon, lat, h)
  vec3 ecef = vsInput.attributes.positionMC;
  vec3 cartographic = czm_ecefToGeodetic(ecef);

  float lon = cartographic.x;
  float lat = cartographic.y;
  float h   = cartographic.z;

  // Projection center from czm_projectionParams
  float lon0    = czm_projectionParams.x;
  float sinLat0 = czm_projectionParams.z;
  float cosLat0 = czm_projectionParams.w;

  // Ellipsoidal LAEA parameters
  float sinBeta0 = czm_projectionEllipsoidParams.x;
  float cosBeta0 = czm_projectionEllipsoidParams.y;
  float Rq       = czm_projectionEllipsoidParams.z;
  float D        = czm_projectionEllipsoidParams.w;

  // ... apply LAEA formulas using these uniforms, then add the offsets:
  float a            = czm_projectionOffsets.z;
  float falseEasting = czm_projectionOffsets.x;
  float falseNorthing= czm_projectionOffsets.y;

  // projectedX = falseEasting + a * x_from_laea;
  // projectedY = falseNorthing + a * y_from_laea;
}
```

A complete Lambert LAEA implementation involves computing the authalic latitude β from the geodetic latitude using the squared eccentricity `e2`. See [`UniformState.updateProjectionUniforms`](../../packages/engine/Source/Renderer/UniformState.js) for the CPU-side derivation of `sinBeta0`, `cosBeta0`, `Rq`, and `D`.

## Serialization and Web Workers

Primitives are packed into web workers for geometry creation, so projections must be transferable. Each projection class implements `serialize()` and a static `deserialize()`:

```js
const serialized = projection.serialize();
// { mapProjectionType: 2, json: { sourceProjection: "...", ... } }

const restored = Cesium.deserializeMapProjection(serialized);
```

`Scene` caches the serialized form on construction and places it on `FrameState.serializedMapProjection`; `PrimitivePipeline` forwards it to the worker, where `deserializeMapProjection` rehydrates it. For `CustomProjection`, the `project` and `unproject` function sources are serialized via `Function.prototype.toString()` and reconstructed in the worker using `new Function(...)` — this is the reason for the self-contained constraint documented above.

## Known Limitations

The following issues exist with non-cylindrical projections in the current implementation. Workarounds are documented where available; proper fixes would require changes to Cesium pipeline code outside the scope of this change.

### Polygon fill disappears with fine `granularity`

**Symptom:** `PolygonGeometry` (and entity polygons via `GeoJsonDataSource`) render only their outline — the fill is empty — when the default `granularity` (~1°) is used with a non-cylindrical projection in Columbus View or SCENE2D.

**Cause:** `PolygonPipeline.triangulate` runs on the tangent-plane 2D positions, producing a valid triangulation. `PolygonPipeline.computeSubdivision` then adds edge midpoints in 3D ECEF. At render time, `GeometryPipeline.projectTo2D` projects each vertex independently. For cylindrical projections (Geographic, Web Mercator), `project(midpoint(A, B)) ≈ midpoint(project(A), project(B))` — the linear property of midpoints is preserved and subdivided triangles stay valid. For non-cylindrical projections (Lambert, Mollweide, Robinson), this equality fails, so subdivided triangles become self-intersecting or have inverted winding after projection, and the GPU culls them.

**Workaround:** set `granularity: Math.PI / 8` (or any coarse value greater than the angular distance between the polygon's own vertices) to skip edge subdivision. The polygon renders correctly with its original triangulation. See the `Map Projections` Sandcastle demo for an example.

**Proper fix:** modify `GeometryPipeline.projectTo2D` to detect degenerate or wound-reversed triangles after projection, or re-subdivide edges in projected space rather than ECEF. Tracked as follow-up work.

### Off-center / off-meridian projections crash with global geometry

**Symptom:** projections whose center is far from `lon_0=0` and whose valid area covers a small portion of the globe — for example **EPSG:2039** (Israeli TM Grid, `lon_0=35.20°`, `lat_0=31.73°`, with non-zero `false_easting`/`false_northing`) — crash with `RangeError: Failed to set the 'length' property on 'Array': Invalid array length` in `View.updateFrustums` as soon as a primitive containing global geometry (e.g., a world-spanning GeoJSON) is rendered.

**Cause:** when `GeometryPipeline.projectTo2D` projects each vertex of a global polygon individually, vertices near the projection's antipode produce finite but very large coordinates (10⁷ m and beyond). With granularity-driven subdivision, a sufficient number of these large samples accumulate that `BoundingSphere.fromVertices` overflows to `Infinity` during span calculation. The infinite bounding sphere then propagates: `computePlaneDistances` returns `NaN`, and `Math.ceil(Math.log(far / near) / Math.log(farToNearRatio))` becomes `NaN`, which throws when assigned to `frustumCommandsList.length`.

**Workaround:** restrict global geometry to projections whose center is near the prime meridian (Lambert Europe, Mollweide, Robinson, Equal Earth all work) **or** preclip your data to the projection's valid area before rendering. For the test sandcastle, this limitation excludes EPSG:2039 from the menu.

**Proper fix:** clip polygons in `GeometryPipeline.projectTo2D` against the projection's valid area before projecting. likangning93's PR #7502 marked this as an unresolved followup ("fix camera issues with off-center projections like EPSG:2039") and never addressed it. A naive last-finite-value fallback in the projection step prevents the crash but produces visual artifacts (long lines crossing the map) that make the result worse than the crash for users.

## What Is Not Supported

This addition covers the projection infrastructure and uniform exposure. The following are intentionally **not** included:

- **Terrain tile rendering with custom projections.** Terrain tiles in 2D / Columbus View are still computed using the existing cylindrical fast path. Tile alignment for non-cylindrical projections requires a separate vertex-attribute and worker pipeline (`TerrainEncoding.position2D`, `GlobeVS.glsl` `CUSTOM_PROJECTION` path) that is not part of this change.
- **Imagery reprojection.** Imagery is still tiled and reprojected using the existing WebMercator/Geographic paths.
- **2D scene mode wrap-around.** Non-cylindrical projections default to `MapMode2D.ROTATE`; `INFINITE_SCROLL` is not supported because the projection has no horizontal repeat.

For use cases centered on vector geometry, entity primitives, models with custom shaders, and 3D Tiles (outside of terrain), the current feature set is complete. See the `Map Projections` Sandcastle demo for a runnable example.
