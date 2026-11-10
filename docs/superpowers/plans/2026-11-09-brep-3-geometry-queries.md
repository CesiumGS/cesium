# B-rep step 3: the geometry query interface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One query interface, `GeometryQueries`, that a mesh, a b-rep and an implicit surface (f-rep) each implement. It ships with a mesh adapter and a distance-field adapter, and moves today's tileset ray backend and the snap occlusion test onto the mesh adapter with no change in results.

**Architecture:** A new core module, `src/geometry/`, sits below the scene-level ray queries in `src/query/queries.ts`. `GeometryQueries` is per object, synchronous and float64, in the object's placed coordinates. The scene level keeps doing frames, instants, batching, async answers and revisions, and calls the per-object layer through its backends. The b-rep adapter comes in step 4 against this interface. This is a draft made before the API review, so the review has something concrete to read: the open questions are listed in Task 5 and go into the overall plan.

**Tech Stack:** TypeScript, vitest, no new dependencies.

**Spec:** `CESIUM2_WEBGPU_PLAN.md` §13.33, "One query interface for every representation" and "Exact queries, mostly without a kernel". Read §13.33 before starting.

## Global Constraints

- Package: `packages/next`. Run commands from there. Type check: `npm run typecheck`. Tests: `npx vitest run <file>`.
- Branch `brep-3-queries`, cut from `cesium-2.0-webgpu-poc`. Commit by pathspec only (`git commit -- <paths>`), never `git add -A`. Never push.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Words: never "master", "competitors", "ghost" or "presentation" in `src/`. Never "frame" alone for a reference frame or a tick.
- Comments use the house style in `src/query/*.ts`: plain sentences, units stated (m, fractions of the segment).
- All arithmetic float64. Mesh positions stay `Float32Array` as stored, and are placed by the 4x4 column-major `matrix` in float64.
- Pure refactors (Task 3) must leave every existing test passing with no edits to those tests.
- Tests are tiered: each task runs its own test files and the type check. The full suite (`npx vitest run`) runs once, in Task 5.

## Review Focus

1. A mesh far from the origin (ECEF, about 6.4e6 m): a query with `origin` near the geometry must keep millimetre agreement with the same query done in local coordinates. Test in Task 1.
2. Malformed meshes: an index past the vertex count, or a degenerate (zero-area) triangle, must be skipped, never crash and never give NaN. Test in Tasks 1 and 2.
3. A ray that starts inside a distance field's solid hits at its start. A ray grazing the surface tangentially must end as hit, miss or `unknown`, never loop past `maxSteps`. Test in Task 4.
4. A `tMin`/`tMax` window that excludes the only hit must answer `miss`, never a hit outside the window. Test in Task 1.
5. Snap occlusion with the eye at ECEF scale must answer as before. The existing `test/snap.test.ts` and `test/designGlobeExactSnap.test.ts` cover it, and Task 3 runs both.

---

### Task 1: The interface, and mesh ray hits, bounds and display

**Files:**

- Create: `packages/next/src/geometry/query.ts`
- Create: `packages/next/src/geometry/mesh.ts`
- Test: `packages/next/test/geometryMesh.test.ts`

**Interfaces:**

- Consumes: `QueryRay` (`{ from: ArrayLike<number>; to: ArrayLike<number> }`) from `src/query/queries.ts`, imported as a type only.
- Produces (in `query.ts`, exactly):

```ts
export type GeometryKind = "mesh" | "brep" | "frep";
export type EntityKind = "face" | "edge" | "vertex";
/** A face, edge or vertex of one geometry. `feature`: the source's feature ID, when it has one. */
export interface EntityRef {
  readonly kind: EntityKind;
  readonly index: number;
  readonly feature?: number;
}
/** How far an answer may be from the geometry the object stands for. */
export interface GeometryAccuracy {
  readonly meters: number;
  readonly exact: boolean;
  readonly note: string;
}
export interface GeometryBounds {
  readonly min: Float64Array;
  readonly max: Float64Array;
  readonly accuracy: GeometryAccuracy;
}
export interface RayHitOptions {
  /** The part of the segment searched, as fractions from `from` to `to` (defaults 0 and 1, inclusive). */
  readonly tMin?: number;
  readonly tMax?: number;
  /** Where the arithmetic is centred, for precision far from the coordinates' origin. Inputs and outputs stay in placed coordinates. */
  readonly origin?: ArrayLike<number>;
  /** Stop at the first hit found, not the nearest. */
  readonly anyHit?: boolean;
}
export interface GeometryHit {
  readonly t: number;
  readonly position: Float64Array;
  /** Unit normal, turned to face the ray's start. */
  readonly normal: Float64Array;
  readonly entity: EntityRef;
  /** The face's surface parameters, where it has them (b-reps). */
  readonly uv?: readonly [number, number];
  readonly accuracy: GeometryAccuracy;
}
export type GeometryRayAnswer =
  | { readonly verdict: "hit"; readonly hit: GeometryHit }
  | { readonly verdict: "miss"; readonly accuracy: GeometryAccuracy }
  | {
      readonly verdict: "unknown";
      readonly reason: "notConverged" | "unsupported";
      readonly accuracy: GeometryAccuracy;
    };
export interface ClosestPointOptions {
  /** Which kinds of entity may be the answer (default all three). */
  readonly kinds?: readonly EntityKind[];
  /** Answer undefined when the closest point is farther than this, m. */
  readonly maxDistance?: number;
  readonly origin?: ArrayLike<number>;
}
export interface ClosestPoint {
  readonly position: Float64Array;
  readonly distance: number;
  readonly entity: EntityRef;
  readonly normal?: Float64Array;
  readonly uv?: readonly [number, number];
  readonly accuracy: GeometryAccuracy;
}
export interface SegmentDistance {
  readonly distance: number;
  readonly accuracy: GeometryAccuracy;
}
/** An entity's corner points, and the faces that use it (a face lists itself). */
export interface EntityInfo {
  readonly ref: EntityRef;
  readonly points: readonly Float64Array[];
  readonly faces: readonly EntityRef[];
}
export interface DisplayMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly matrix: Float64Array;
  /** How far these triangles may be from the geometry, m. */
  readonly error: number;
}
export interface GeometryQueries {
  readonly kind: GeometryKind;
  /** The content version: goes up when the geometry changes. */
  readonly version: number;
  bounds(): GeometryBounds;
  rayHit(ray: QueryRay, options?: RayHitOptions): GeometryRayAnswer;
  closestPoint(
    point: ArrayLike<number>,
    options?: ClosestPointOptions,
  ): ClosestPoint | undefined;
  segmentDistance(
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    options?: { readonly origin?: ArrayLike<number> },
  ): SegmentDistance;
  entity(ref: EntityRef): EntityInfo | undefined;
  /** Triangles within `tolerance` m, or undefined when it draws only on the GPU. */
  display(tolerance: number): DisplayMesh | undefined;
}
```

- Produces (in `mesh.ts`):

```ts
export interface MeshSource {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** Column-major 4x4 placing `positions` (default identity). `TileGeometry` satisfies this type. */
  readonly matrix?: Float64Array;
  /** One feature ID per vertex: a hit's entity takes its first corner's. */
  readonly featureIds?: Uint32Array;
}
export interface MeshGeometryOptions {
  /** How far the mesh may be from what it stands for, m (default 0: the mesh is the geometry). */
  readonly error?: number;
  readonly note?: string;
  readonly version?: number;
}
export function meshGeometry(
  source: MeshSource,
  options?: MeshGeometryOptions,
): GeometryQueries;
```

Task 1 implements `kind`, `version`, `bounds`, `rayHit` and `display`. `closestPoint`, `segmentDistance` and `entity` throw `Error("meshGeometry: not yet")` until Task 2.

- [ ] **Step 1: Write the failing tests** in `test/geometryMesh.test.ts`. The fixture is a unit square at z = 0 made of two triangles, positions `[0,0,0, 1,0,0, 1,1,0, 0,1,0]` and indices `[0,1,2, 0,2,3]`, optionally placed by a matrix translating it by `T = (6_378_137, 0, 0)`:
  - `rayHit` from `(0.75,0.25,1)` to `(0.75,0.25,-1)`: verdict `hit`, `t` = 0.5 (within 1e-12), position `(0.75,0.25,0)`, normal `(0,0,1)`, entity `{kind:"face", index:0}`, accuracy `{meters:0, exact:true}`.
  - The same ray reversed, from below: normal `(0,0,-1)`.
  - A ray at x = 2: `miss`.
  - The first ray with `tMax: 0.4`: `miss`. With `tMin: 0.6`: `miss`.
  - `featureIds` `[5,6,7,9]`: a hit on triangle 1 at `(0.25,0.75)` has `entity.index` 1 and `entity.feature` 5 (its first corner, vertex 0).
  - Translated by `T`, the ray offset by `T`, with `origin: T`: position equals `T + (0.75,0.25,0)` within 1e-6, and `t` within 1e-9 of 0.5.
  - A degenerate triangle (indices `[0,0,1]`) and one with an index of 99 are added: the answers are unchanged and nothing is NaN.
  - `anyHit: true`: verdict `hit`.
  - `bounds()`: min `(0,0,0)`, max `(1,1,0)`; translated, min `T`.
  - `display(0.1)` returns the source's arrays, an identity matrix when none was given, and `error` equal to the `error` option (test 0 and 0.25). With `error: 0.25`, hit accuracy is `{meters:0.25, exact:false}`.
- [ ] **Step 2: Run it and see it fail.** `npx vitest run test/geometryMesh.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `query.ts` and `mesh.ts`.** Place each vertex as `m·p + (t − origin)`, computing `m[12] − origin[0]` first, as `src/engineering/snap.ts` `hiddenFrom` does. With no origin this is exactly the arithmetic of `castTilesetRays` today. Move `hitTriangle` and its vector helpers from `src/query/geometryBackend.ts` into `mesh.ts` and export them for Task 3, keeping the 1e-18 determinant threshold. Reject a triangle when any index is ≥ the vertex count. Default note: `"the mesh as stored (float32 positions)"`, or the `note` option.
- [ ] **Step 4: Run the tests.** `npx vitest run test/geometryMesh.test.ts`, then `npm run typecheck`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit.** `git commit -m "geometry: the query interface and mesh ray hits" -- src/geometry test/geometryMesh.test.ts` (paths relative to `packages/next`; add the new files first by path).

### Task 2: Mesh closest point, segment distance and topology

**Files:**

- Modify: `packages/next/src/geometry/mesh.ts`
- Test: `packages/next/test/geometryMesh.test.ts` (add a `describe` block)

**Interfaces:**

- Consumes: the types from Task 1.
- Produces: the mesh's `closestPoint`, `segmentDistance` and `entity`. Mesh edge refs use `index = triangle * 3 + side`, where side 0 is corners 0→1, side 1 is 1→2 and side 2 is 2→0. A vertex ref's index is the vertex index. Task 3 relies on `segmentDistance`.

- [ ] **Step 1: Write the failing tests.** Same square fixture:
  - `closestPoint((0.75,0.25,2))`: position `(0.75,0.25,0)`, distance 2, entity kind `face` index 0, normal `(0,0,1)`.
  - `closestPoint((2,0.5,0))`: kind `edge`, position `(1,0.5,0)`, distance 1. The edge is the square's right side (triangle 0, side 1 → index 1).
  - `closestPoint((2,-1,0))`: kind `vertex`, index 1, position `(1,0,0)`.
  - `closestPoint((0.5,0.5,0.1), {kinds:["vertex"]})`: kind `vertex`, distance `hypot(0.5,0.5,0.1)`. With `{kinds:["edge"]}`: kind `edge` on the diagonal (index 2 or 3, either is right), distance 0.1, since interior edges count.
  - `maxDistance: 1.5` with point `(0.5,0.5,2)`: undefined.
  - `segmentDistance((0,0,1),(1,1,1))`: 1. A segment crossing the square: 0. The same, translated by `T` with `origin: T`: within 1e-6.
  - `entity({kind:"edge", index:2})` (the diagonal 2→0): two points, faces `[0, 1]`. `entity({kind:"vertex", index:0})`: one point, faces `[0, 1]`. `entity({kind:"face", index:1})`: three points, faces `[face 1]`. An index out of range: undefined.
  - The malformed triangles from Task 1 change none of these answers.
- [ ] **Step 2: Run it and see it fail.** Expected: FAIL with "meshGeometry: not yet".
- [ ] **Step 3: Implement.** Move `pointTriangle`, `segmentSegment` and `segmentTriangle` from `geometryBackend.ts` into `mesh.ts` and export them. Extend `pointTriangle` into a function that also returns the closest point and its Voronoi region (vertex, edge or interior: Ericson, "Real-Time Collision Detection" §5.1.5, which the existing code already follows). The region gives the entity kind. Map an edge region to the side's ref. When `kinds` excludes `face`, search vertices and/or the triangle sides directly. Build the edge-to-faces and vertex-to-faces maps lazily, on the first `entity` call, keyed by the sorted vertex pair.
- [ ] **Step 4: Run the tests.** `npx vitest run test/geometryMesh.test.ts`, then `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "geometry: mesh closest point, segment distance and topology" -- src/geometry/mesh.ts test/geometryMesh.test.ts`

### Task 3: Tileset rays and snap occlusion on the mesh adapter

**Files:**

- Modify: `packages/next/src/query/geometryBackend.ts:340-385` (the per-geometry triangle loop in `castTilesetRays`) and its imports
- Modify: `packages/next/src/engineering/snap.ts:657-750` (`crossing`, `hiddenFrom`)
- Tests, unchanged: `test/geometryRays.test.ts`, `test/snap.test.ts`, `test/designGlobeExactSnap.test.ts`, `test/seams.test.ts`

**Interfaces:**

- Consumes: `meshGeometry`, `rayHit` with `tMin`, `tMax`, `origin` and `anyHit`, and `segmentDistance` from Tasks 1 and 2.
- Produces: no new API. `geometryBackend.ts` no longer defines triangle maths.

- [ ] **Step 1: Run the four test files before changing anything,** and note the pass counts. `npx vitest run test/geometryRays.test.ts test/snap.test.ts test/designGlobeExactSnap.test.ts test/seams.test.ts`
- [ ] **Step 2: `castTilesetRays`.** For each `g` of `tile.geometry`, call `meshGeometry(g).rayHit(ray, { tMin: Math.max(lo, tolerance / span), tMax: Math.min(hi, 1 - tolerance / span) })`. Take the nearest hit across geometries as `nearest`. Only when no geometry hits, and `tile.geometricError > 0`, compute `near` as the minimum `segmentDistance(ray.from, ray.to)` over the geometries. That is the same set of triangles the old else-branch measured, because none of them hit inside the window. Keep everything else in the function as it is.
- [ ] **Step 3: `hiddenFrom`.** Replace the loop with `meshGeometry(g).rayHit({ from: camera.position, to: point }, { origin: camera.position, tMin: Math.max(first, Number.MIN_VALUE), tMax: limit, anyHit: true }).verdict === "hit"`. Here `first` and `limit` are computed as today. Delete `crossing`. Keep `hiddenFrom`'s signature. The `Scratch` buffers it no longer uses stay for `nearest`.
- [ ] **Step 4: Run the same four test files.** Expected: the same pass counts as Step 1, with no test edited. Then `npm run typecheck`. If a snap test fails, compare the two triangle tests' formulas for a sign or grouping difference. Rounding-level differences in `t` are expected, but verdict changes are not.
- [ ] **Step 5: Commit.** `git commit -m "query, snap: ray tests on the mesh geometry adapter" -- src/query/geometryBackend.ts src/engineering/snap.ts`

### Task 4: The f-rep slot, a distance-field adapter

**Files:**

- Create: `packages/next/src/geometry/sdf.ts`
- Test: `packages/next/test/geometrySdf.test.ts`

**Interfaces:**

- Consumes: the types from Task 1.
- Produces:

```ts
/** A signed distance, m, negative inside: a true distance or a lower bound on it (1-Lipschitz). */
export interface DistanceField {
  distance(x: number, y: number, z: number): number;
  readonly min: ArrayLike<number>;
  readonly max: ArrayLike<number>;
  /** How far `distance` may be off, m (default 0). */
  readonly error?: number;
}
export interface SdfGeometryOptions {
  /** Default 256. */
  readonly maxSteps?: number;
  /** Hit when the distance is below this, m (default 1e-4). */
  readonly epsilon?: number;
  readonly version?: number;
}
export function sdfGeometry(
  field: DistanceField,
  options?: SdfGeometryOptions,
): GeometryQueries;
```

Behaviour:

- `kind` is `"frep"`. The single face is `{kind:"face", index:0}`.
- `rayHit` clips `[tMin, tMax]` to the bounds box (slab test). No overlap is a `miss`. Then it sphere-traces: `t += d / length`. A start inside (distance < 0) hits at the start. Distance < `epsilon` is a hit, with the normal from central differences (step `epsilon`). Passing the end is a miss. Running out of steps is `unknown`, `"notConverged"`. Hit accuracy is `{meters: epsilon + error, exact: false}`.
- `closestPoint` projects up to 8 times (`p −= d·∇d`). When `kinds` excludes `face` it answers undefined. When it hasn't converged, the accuracy has `meters` = |last distance| + error and a note saying so.
- `segmentDistance` marches by `max(|d|, epsilon)`, keeping the smallest |d| seen. It then refines with 20 golden-section steps within one step on either side of the smallest. The note states it is sampled, an upper bound.
- `entity` answers face 0 (`points: []`, `faces: [face 0]`) and undefined for anything else. `display` answers undefined, because f-reps draw by ray marching, later. `bounds` answers the box.

- [ ] **Step 1: Write the failing tests** with a unit sphere (`distance = hypot(x,y,z) − 1`, box ±1):
  - The ray (−3,0,0)→(3,0,0) hits at t = 1/3 within 2e-4, with normal ≈ (−1,0,0) within 1e-3.
  - The ray at y = 2 is a `miss`.
  - The ray (0,0,0)→(3,0,0) hits at t = 0.
  - The tangent ray (−3,1,0)→(3,1,0) ends as hit or miss, within `maxSteps`. Assert the verdict isn't `unknown` at the default 256 steps, and that it is `unknown` with `maxSteps: 2` on the first ray.
  - `closestPoint((0,3,0))`: position (0,1,0) within 1e-6, distance 2. With `kinds:["vertex"]`: undefined.
  - `segmentDistance((−3,2,0),(3,2,0))`: within [1, 1 + 1e-3].
  - `display(0.1)` is undefined. `bounds()` is ±1.
- [ ] **Step 2: Run and see it fail.** `npx vitest run test/geometrySdf.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `sdf.ts`.**
- [ ] **Step 4: Run the tests, then `npm run typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "geometry: the f-rep slot, a distance-field adapter" -- src/geometry/sdf.ts test/geometrySdf.test.ts`

### Task 5: Exports, the overall plan, the full suite

**Files:**

- Create: `packages/next/src/geometry/index.ts` (re-exports `query.ts`, `meshGeometry`, `sdfGeometry` and their option types)
- Modify: `packages/next/src/index.ts` (after the ray query exports near line 336)
- Modify: `CESIUM2_WEBGPU_PLAN.md` §13.33 (repo root)

- [ ] **Step 1: Export.** In `src/index.ts`, after `terrainQueries`, add a comment, "Geometry queries per object (plan §13.33, a draft before the API review): meshes and distance fields today, b-reps next", followed by `export * from "./geometry/index.ts";`. If a name clashes (check `npm run typecheck`), export by name instead.
- [ ] **Step 2: Record the draft and its questions in §13.33.** After the "Spike B result" paragraph, add a paragraph headed `**Step 3 draft (2026-11-09).**` that summarises the interface: per object, synchronous, float64, placed coordinates with an `origin`; three-way ray answers; accuracy on every answer; mesh and distance-field adapters; tileset rays and snap occlusion moved onto it. Follow it with `**Questions for the API review:**` and these items, worded plainly:
  1. Two layers: a synchronous object layer under the asynchronous scene layer. Should a server's staged answers (§13.33) arrive as a scene-layer backend, as drafted, or should the object layer be asynchronous?
  2. Frames and instants live at the scene layer, and object answers are in placed coordinates. Should each object state its frame and instant?
  3. `EntityRef` is a number plus an optional feature ID, and mesh edges are half-edges (`triangle * 3 + side`). Stable source IDs (§13.33, "The tiles must carry") need strings or a source table.
  4. `GeometryAccuracy` is one number in metres. Should it compose with the measure module's `AccuracyTerm`s, and is it a bound or 1σ?
  5. Is `display(tolerance)` a query, or does it belong to the render form (steps 4 and 5)?
  6. `segmentDistance` exists for the "missed by less than its error" verdict. Keep it, or replace it with a ray answer that carries the near miss?
  7. The client snap's search of the screen aperture isn't moved yet: it needs a cone or screen-space query.
  8. There is no acceleration structure: queries are linear in triangles, as before.
- [ ] **Step 3: Run the full suite once.** `npm run typecheck`, then `npx vitest run`. Expected: everything passes. On a failure, find which task caused it: run that task's files, and its parent commit if needed.
- [ ] **Step 4: Snyk.** Run `snyk_code_scan` on `packages/next/src/geometry` and the two modified files. Fix any issue it finds and scan again.
- [ ] **Step 5: Commit.** `git commit -m "geometry: export the draft and record it in §13.33" -- packages/next/src/geometry/index.ts packages/next/src/index.ts CESIUM2_WEBGPU_PLAN.md` (run from the repo root).
