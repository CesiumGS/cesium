# B-rep step 4: the render form and the glTF extension draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The engine's own B-rep form, as typed arrays. It comes with exact float64 evaluation of its surfaces and curves, an exact split of NURBS into rational Bézier pieces, a builder and a validator, and a draft glTF extension, `BENTLEY_brep`, that carries the form beside a fallback mesh, read by `parseGltf`.

**Architecture:** A new core module, `src/brep/`. It has no drawing: GPU tessellation is step 5, after the placement review (§13.26). The form is plain typed arrays, so it moves between workers without copying, and a host with its own kernel can write it directly. Every surface and curve is either analytic, with a fixed parameterization, or rational Bézier. NURBS are split into Bézier pieces by knot insertion, which is exact. Trims (pcurves) and 3D edge curves are stored exactly, as rational Bézier segments of degree 1 to 3. Making quadratic segments for the coverage kernel is the renderer's job later (step 6). This is a draft, and the choices below are review material: the extension's name and schema are open in §13.33.

**Tech Stack:** TypeScript, vitest. No new dependencies.

**Spec:** `CESIUM2_WEBGPU_PLAN.md` §13.33: "One render b-rep form, produced two ways", "The form: …", and Spike B's result. Read §13.33 before starting.

## Global Constraints

- Package: `packages/next`. Run commands from there. Type check: `npm run typecheck`. Tests: `npx vitest run <file>`.
- Branch `brep-4-render-form`, cut from `cesium-2.0-webgpu-poc`. Commit by pathspec only (`git add <paths> && git commit -m … -- <paths>`). Never push.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Words: never "master", "competitors", "ghost" or "presentation" in `src/`; never "frame" alone for a reference frame or a tick. Comments use the house style of `src/query/*.ts` and `src/geometry/*.ts`: plain sentences, with units.
- All geometry arithmetic is float64. Lengths are metres, angles radians.
- Tests are tiered: each task runs its own test files and the type check. The full suite runs once, in Task 5.

## The form (fixed by this plan)

`src/brep/form.ts` exports exactly this (comments abridged here; write full ones):

```ts
/** Surface kinds. Analytic kinds use the parameterizations below; Bézier surfaces are lists of patches. */
export const enum SurfaceKind { Plane = 0, Cylinder = 1, Cone = 2, Sphere = 3, Torus = 4, Bezier = 5 }

export interface BrepForm {
  /** The content version: goes up when the geometry changes. */
  readonly version: number;

  // Surfaces, one entry each.
  readonly surfaceKind: Uint8Array;
  /** 9 per surface: origin (3), x axis (3), y axis (3), unit and orthogonal; z = x × y. Unused for Bézier. */
  readonly surfaceFrame: Float64Array;
  /** 2 per surface: Cylinder [r, 0]; Cone [r at v = 0, half-angle]; Sphere [r, 0]; Torus [major R, minor r]; else 0. */
  readonly surfaceParams: Float64Array;
  /** 2 per surface: [first patch, patch count]; Bézier only, else [0, 0]. */
  readonly surfacePatches: Uint32Array;

  // Rational Bézier patches.
  /** 2 per patch: degree in u, degree in v (1 to 7). */
  readonly patchDegree: Uint8Array;
  /** Per patch: index of its first control point in patchPoints (in points, not floats). Points run u fastest. */
  readonly patchFirst: Uint32Array;
  /** 4 per control point, homogeneous: x·w, y·w, z·w, w (w > 0). */
  readonly patchPoints: Float64Array;
  /** 4 per patch: u0, u1, v0, v1, its span in its surface's parameter space. */
  readonly patchDomain: Float64Array;

  // Faces.
  readonly faceSurface: Uint32Array;
  /** 1 when the face's outward normal is −(∂u × ∂v), else 0. */
  readonly faceReversed: Uint8Array;
  /** 2 per face: [first loop, loop count]. A face's first loop is its outer loop. */
  readonly faceLoops: Uint32Array;

  /** 2 per loop: [first use, use count]. Uses run in order around the loop: outer loops counter-clockwise in (u, v), inner loops clockwise. */
  readonly loopUses: Uint32Array;

  // Edge uses (coedges).
  readonly useEdge: Uint32Array;
  /** 1 when the use runs from the edge's end vertex to its start. */
  readonly useReversed: Uint8Array;
  /** 2 per use: [first segment, segment count] in curves2. Already in the use's direction. */
  readonly usePcurve: Uint32Array;

  // Edges.
  /** 2 per edge: start vertex, end vertex. */
  readonly edgeVertices: Uint32Array;
  /** 2 per edge: [first segment, segment count] in curves3, start to end. */
  readonly edgeCurve: Uint32Array;
  /** Per edge: how far its curve and its uses' images may be apart, m. */
  readonly edgeTolerance: Float32Array;

  // Vertices.
  /** 3 per vertex, m. */
  readonly vertexPosition: Float64Array;
  readonly vertexTolerance: Float32Array;

  /** Curve segments in 2D (u, v), rational Bézier, degree 1 to 3. */
  readonly curves2: BezierCurves;
  /** Curve segments in 3D, rational Bézier, degree 1 to 3. */
  readonly curves3: BezierCurves;

  /** Stable source IDs: faces, then edges, then vertices. An empty string means none. */
  readonly ids: readonly string[];
}

export interface BezierCurves {
  /** Per segment, 1 to 3. */
  readonly degree: Uint8Array;
  /** Per segment: its first control point (in points). */
  readonly first: Uint32Array;
  /** (dimension + 1) per point, homogeneous; w > 0. */
  readonly points: Float64Array;
}

export function faceCount(form: BrepForm): number;
export function edgeCount(form: BrepForm): number;
export function vertexCount(form: BrepForm): number;
export function surfaceCount(form: BrepForm): number;
```

Parameterizations, with frame origin `o`, axes `x`, `y` and `z = x × y`. Units: u and v in radians where angular, metres otherwise.

- Plane: `P = o + u·x + v·y`.
- Cylinder: `P = o + r(cos u·x + sin u·y) + v·z`.
- Cone: `P = o + (r + v·tan a)(cos u·x + sin u·y) + v·z`.
- Sphere: `P = o + r(cos v(cos u·x + sin u·y) + sin v·z)`. u is longitude, v latitude.
- Torus: `P = o + (R + r·cos v)(cos u·x + sin u·y) + r·sin v·z`.
- Bézier: the patch whose domain holds (u, v). The patch's local parameters are `s = (u − u0)/(u1 − u0)` and `t = (v − v0)/(v1 − v0)`. A point on a shared boundary takes the lower-index patch.

## Review Focus

1. A NURBS with interior knots of full multiplicity already, or with repeated end knots wider than the degree: the split must still be exact, and produce no zero-width patches. Test in Task 2.
2. Rational weights far from 1 (0.1 and 10): the split and evaluation stay exact within 1e-9 relative. Test in Task 2.
3. A Bézier surface queried exactly on a patch boundary, or at the domain's edge: deterministic, with no NaN. Test in Task 2.
4. A malformed form (an index out of range, an open loop, a pcurve whose image misses its edge): `validateBrep` names the problem and the entity, and doesn't throw. Test in Task 3.
5. A glTF whose `BENTLEY_brep` is malformed or truncated: the mesh still loads and draws, with a warning, and the b-rep is dropped. Test in Task 4.

---

### Task 1: The form, and analytic surfaces

**Files:**

- Create: `packages/next/src/brep/form.ts` (the types above, the four count helpers)
- Create: `packages/next/src/brep/evaluate.ts`
- Test: `packages/next/test/brepEvaluate.test.ts`

**Interfaces:**

- Produces, in `evaluate.ts`:

```ts
/** A surface point and its first derivatives, m and m per parameter unit. */
export interface SurfaceSample { readonly position: Float64Array; readonly du: Float64Array; readonly dv: Float64Array }
export function evaluateSurface(form: BrepForm, surface: number, u: number, v: number): SurfaceSample;
/** Unit outward normal of a face at (u, v): normalized ∂u × ∂v, reversed when faceReversed. Undefined where the derivatives are parallel (a pole). */
export function faceNormal(form: BrepForm, face: number, u: number, v: number): Float64Array | undefined;
```

In Task 1, `evaluateSurface` throws `Error("evaluateSurface: Bézier surfaces come in Task 2")` for the Bézier kind. Task 2 replaces that.

- [ ] **Step 1: Write the failing tests.** Build a one-surface form with a small helper in the test file. Frames use `o = (10, 20, 30)`, `x = (0, 1, 0)`, `y = (−1, 0, 0)` (so `z = (0, 0, 1)`).
  - Plane at (2, 3): position `o + 2x + 3y`, du = x, dv = y.
  - Cylinder r = 5 at (π/2, 4): position `o + 5y + 4z`. du = −5x, dv = z.
  - Cone r = 5, a = π/6, at (0, 2): radius `5 + 2·tan(π/6)`, and dv = `tan(π/6)·x + z`.
  - Sphere r = 2 at (0, π/2): the pole `o + 2z`. du there is the zero vector, and `faceNormal` answers undefined.
  - Torus R = 10, r = 1, at (π, 0): `o − 11x`.
  - For every kind, at 20 random (u, v): du and dv agree with central differences (h = 1e-6) within 1e-6 relative.
  - `faceNormal` with `faceReversed` 1 is the negation of the 0 case. On the cylinder it points away from the axis.
  - The counts read from the arrays (for example `faceCount` = `faceSurface.length`).
- [ ] **Step 2: Run and see it fail.** `npx vitest run test/brepEvaluate.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `form.ts` and `evaluate.ts`.**
- [ ] **Step 4: Run the tests, then `npm run typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "brep: the render form and analytic surfaces" -- src/brep/form.ts src/brep/evaluate.ts test/brepEvaluate.test.ts`

### Task 2: Rational Bézier evaluation, and the exact NURBS split

**Files:**

- Create: `packages/next/src/brep/bezier.ts`
- Create: `packages/next/src/brep/nurbs.ts`
- Modify: `packages/next/src/brep/evaluate.ts` (the Bézier kind, curves)
- Test: `packages/next/test/brepNurbs.test.ts`

**Interfaces:**

- Produces, in `bezier.ts`:

```ts
/** A rational Bézier patch at (s, t) in [0, 1]²: position, ∂s and ∂t, from homogeneous control points (4 per point, u fastest). */
export function evaluatePatch(points: Float64Array, first: number, degreeU: number, degreeV: number, s: number, t: number): SurfaceSample;
/** A rational Bézier curve segment at t in [0, 1]: position and derivative, in `dimension` 2 or 3. */
export function evaluateSegment(points: Float64Array, first: number, degree: number, dimension: 2 | 3, t: number): { readonly position: Float64Array; readonly derivative: Float64Array };
```

- Produces, in `nurbs.ts`:

```ts
export interface NurbsSurface {
  readonly degreeU: number; readonly degreeV: number;
  readonly knotsU: Float64Array; readonly knotsV: Float64Array;
  readonly countU: number; readonly countV: number;
  /** 3 per control point, m, u fastest. */
  readonly points: Float64Array;
  /** Per control point; default all 1. */
  readonly weights?: Float64Array;
}
export interface NurbsCurve { readonly degree: number; readonly knots: Float64Array; readonly count: number; readonly dimension: 2 | 3; readonly points: Float64Array; readonly weights?: Float64Array }
/** The surface as rational Bézier patches, exactly, by knot insertion to full multiplicity. Patches run u fastest. */
export function nurbsSurfaceToPatches(surface: NurbsSurface): { degreeU: number; degreeV: number; domains: Float64Array; points: Float64Array };
/** The curve as rational Bézier segments, exactly; degree must be 1 to 3 (throws otherwise). */
export function nurbsCurveToSegments(curve: NurbsCurve): { degree: number; domains: Float64Array; points: Float64Array };
/** De Boor's algorithm, for tests and the reference: a NURBS surface point. */
export function evaluateNurbsSurface(surface: NurbsSurface, u: number, v: number): Float64Array;
export function evaluateNurbsCurve(curve: NurbsCurve, t: number): Float64Array;
```

- Produces, in `evaluate.ts`: the Bézier kind in `evaluateSurface`, by the patch whose domain holds (u, v), with derivatives scaled by the domain widths. Also:

```ts
export function evaluateCurve2(form: BrepForm, segment: number, t: number): { position: Float64Array; derivative: Float64Array };
export function evaluateCurve3(form: BrepForm, segment: number, t: number): { position: Float64Array; derivative: Float64Array };
```

- [ ] **Step 1: Write the failing tests.**
  - A bicubic NURBS of 6 × 6 points on 100 m with clamped uniform knots (3 × 3 spans) has one control point of weight 2. Split it, and at 200 random (u, v) the patch evaluation equals `evaluateNurbsSurface` within 1e-9 m. This is Spike B's surface: heights are a saddle of amplitude 8 m plus a 15 m bump at the middle.
  - The same with weights 0.1 and 10 on two points.
  - Knots with an interior knot already at full multiplicity: no zero-width patch, and still exact.
  - A biquadratic surface: degree 2 in the output.
  - A circle as a rational quadratic NURBS curve (9 points, weights 1 and √2/2, knots `[0,0,0,¼,¼,½,½,¾,¾,1,1,1]`) splits into 4 segments. At 100 points every point is at radius 1 within 1e-12.
  - A degree-4 curve throws.
  - A Bézier-kind surface in a form: `evaluateSurface` at a shared patch boundary equals both neighbours' values within 1e-12, and takes the lower patch's derivatives. At the domain's corners, nothing is NaN.
  - Derivatives of `evaluatePatch` and `evaluateSegment` agree with central differences within 1e-6 relative.
- [ ] **Step 2: Run and see it fail.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Use Boehm knot insertion (Piegl and Tiller, "The NURBS Book", A5.1 for curves, and A5.3 applied in each direction for surfaces) in homogeneous coordinates, up to multiplicity = degree at every interior knot. Evaluate rational Bézier by de Casteljau in homogeneous coordinates, and get derivatives from the quotient rule on the homogeneous derivatives. Skip knot spans of zero width.
- [ ] **Step 4: Run the tests, then `npm run typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "brep: rational Bézier evaluation and the exact NURBS split" -- src/brep/bezier.ts src/brep/nurbs.ts src/brep/evaluate.ts test/brepNurbs.test.ts`

### Task 3: A builder and a validator, with three fixtures

**Files:**

- Create: `packages/next/src/brep/build.ts`
- Create: `packages/next/src/brep/validate.ts`
- Create: `packages/next/test/brepFixtures.ts` (fixtures only, for this test and Task 4's)
- Test: `packages/next/test/brepBuild.test.ts`

**Interfaces:**

- Produces, in `build.ts`. The builder is the host's way to write a form without counting offsets:

```ts
export class BrepBuilder {
  constructor(options?: { version?: number });
  /** Each returns the new entity's index. */
  plane(origin: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>): number;
  cylinder(origin: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>, radius: number): number;
  cone(origin: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>, radius: number, halfAngle: number): number;
  sphere(origin: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>, radius: number): number;
  torus(origin: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>, major: number, minor: number): number;
  nurbsSurface(surface: NurbsSurface): number;
  vertex(position: ArrayLike<number>, options?: { tolerance?: number; id?: string }): number;
  /** The edge's 3D curve, start to end: a line between its vertices when omitted. */
  edge(start: number, end: number, options?: { curve?: NurbsCurve; tolerance?: number; id?: string }): number;
  /** A face on a surface, with its outer loop then its inner loops. Each use names its edge, its direction, and its pcurve in the use's direction (a line in (u, v) when given as two points). */
  face(surface: number, loops: readonly (readonly BrepUse[])[], options?: { reversed?: boolean; id?: string }): number;
  build(): BrepForm;
}
export interface BrepUse {
  readonly edge: number;
  readonly reversed?: boolean;
  readonly pcurve: NurbsCurve | readonly [ArrayLike<number>, ArrayLike<number>];
}
```

- Produces, in `validate.ts`:

```ts
export interface BrepProblem { readonly kind: "index" | "openLoop" | "pcurveOffEdge" | "edgeUses" | "degenerate"; readonly entity: "surface" | "face" | "loop" | "use" | "edge" | "vertex"; readonly index: number; readonly message: string }
/** Never throws. Checks index ranges and degrees; that each loop closes (each use's pcurve end, through the surface, within the edge's tolerance of the next use's start); that each use's pcurve maps onto its edge's 3D curve within the edge's tolerance (at its two ends and 3 interior points, against 64 samples of the edge curve); and that each edge has 1 or 2 uses. */
export function validateBrep(form: BrepForm): BrepProblem[];
```

- `test/brepFixtures.ts` exports `boxBrep()` (a 2 × 3 × 4 m box: 6 planar faces, 12 line edges, 8 vertices, closed), `cappedCylinderBrep()` (r = 1, h = 3: one cylinder face with a seam edge used twice, two planar caps, two circular edges as rational quadratics) and `trimmedNurbsBrep()`. That one is Spike B's surface as one face. Its outer loop is the domain boundary: line pcurves, and four 3D edges, each the surface's boundary row of control points as an exact cubic NURBS curve. Its inner loop is a hole of r = 0.2 around (0.5, 0.5) in (u, v). The hole's pcurve is an exact rational quadratic circle. Its 3D edge is the surface image of 65 points on that circle, as a degree-1 NURBS (a closed polyline, start = end vertex), with an edge tolerance of 0.05 m: the chord sag of 64 segments is about 0.024 m.

- [ ] **Step 1: Write the failing tests.**
  - `validateBrep` on each fixture gives `[]`.
  - The box has 6 faces, 12 edges and 8 vertices, and every edge has 2 uses.
  - Each face of the box, at its loop's (u, v) centroid, has a `faceNormal` pointing away from the box's centre.
  - Breaking things, one at a time on a copy of the box's arrays:
    - `useEdge` out of range gives an `index` problem naming the use.
    - Swapping two uses' order gives `openLoop`.
    - Moving a vertex by 1 cm gives `pcurveOffEdge` or `openLoop`, naming an entity.
    - Removing a face so an edge has 0 uses gives `edgeUses`.
  - IDs land in order: faces, then edges, then vertices, with `""` where none was given.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Implement.** The builder stores NURBS through Task 2's split. Patches go into the form's patch arrays, and pcurves and 3D curves go into `curves2` and `curves3` (a line is one degree-1 segment). A pcurve given as two points is a degree-1 segment.
- [ ] **Step 4: Run the tests, then `npm run typecheck`.**
- [ ] **Step 5: Commit.** `git commit -m "brep: a builder and a validator" -- src/brep/build.ts src/brep/validate.ts test/brepFixtures.ts test/brepBuild.test.ts`

### Task 4: The glTF extension draft, `BENTLEY_brep`

**Files:**

- Create: `packages/next/src/brep/gltf.ts`
- Create: `packages/next/src/brep/BENTLEY_brep.md` (the draft's text)
- Modify: `packages/next/src/io/gltfParse.ts` (`SUPPORTED_EXTENSIONS`; the per-primitive loop near `meshes.push(mesh)`; the asset's `transfer`)
- Modify: `packages/next/src/io/gltfTypes.ts` (`GltfMesh.brep?: number`, `GltfAsset.breps?: BrepForm[]`)
- Test: `packages/next/test/brepGltf.test.ts`

**Interfaces:**

- The extension. At the root, `extensions.BENTLEY_brep = { breps: [ … ] }`. Each b-rep is an object with:
  - `version`, a number.
  - For every typed array of `BrepForm`, a property of the same name holding a bufferView index. The bufferView's bytes are the array, little-endian, with its type fixed by the schema: the TypeScript types above.
  - `curves2` and `curves3`, each `{ degree, first, points }` as bufferView indices.
  - `ids`: `{ values, offsets }`. `values` is UTF-8 bytes; `offsets` is Uint32, count + 1 entries, as `EXT_structural_metadata` strings.

  On a primitive, `extensions.BENTLEY_brep = { brep: <index> }`: this primitive's triangles are the b-rep's fallback mesh. A client without the extension draws the triangles. The extension is never in `extensionsRequired`.

  Each bufferView's byteOffset must be a multiple of its element size. The writer pads to 8 bytes.
- Produces, in `gltf.ts`:

```ts
/** Reads the root extension's b-reps; one that fails to read is skipped, with a warning naming it. */
export function readBrepExtension(json: unknown, bufferView: (index: number) => Uint8Array, warnings: string[]): (BrepForm | undefined)[];
/** Writes forms as the extension's JSON and one binary chunk, for a GLB writer and the tests. bufferView indices start at `firstBufferView`, with byteOffsets relative to the chunk. */
export function writeBrepExtension(forms: readonly BrepForm[], firstBufferView: number): { extension: object; bufferViews: object[]; binary: Uint8Array };
```

- [ ] **Step 1: Write the failing tests.**
  - Round trip: for each of Task 3's three fixtures, `readBrepExtension(write(...))` equals the original, array by array and ID by ID.
  - `parseGltf` on a GLB built in the test, sent as a `data:` URL as `test/composite.test.ts` does. The GLB holds one triangle-list primitive (the box's 12 triangles) carrying `BENTLEY_brep` `{brep: 0}`, with the extension in `extensionsUsed`. Expected: `asset.meshes[0].brep === 0`, `asset.breps[0]` validates clean, and the form's arrays' buffers are in `transfer`.
  - The same GLB with the root extension truncated (one bufferView index past the end): the mesh loads, `asset.breps` is `[undefined]` or absent, `mesh.brep` is absent, and `warnings` names `BENTLEY_brep`.
  - A typed array whose bufferView byteOffset is not aligned gets copied, not misread: build one by hand.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Implement.** In `gltfParse.ts`: add `"BENTLEY_brep"` to `SUPPORTED_EXTENSIONS` with a comment, "draft: b-rep beside a fallback mesh (src/brep/BENTLEY_brep.md)". Read the root extension once, where `featureTables` is read, using the same `bufferView` function. Set `mesh.brep` from the primitive's extension when that b-rep read cleanly. Add the forms' array buffers to `transfer`, without duplicates. Write `BENTLEY_brep.md` in the style of a glTF extension README: status (draft, for this proof of concept, free to change), dependencies (glTF 2.0), overview, the schema (the root and primitive objects, every property with its type), the parameterizations (copy them from `form.ts`), the fallback rule, and the open questions in §13.33 that concern the format. No vendor or product names beyond the extension's own prefix.
- [ ] **Step 4: Run the tests, then `npm run typecheck`, plus `npx vitest run test/composite.test.ts` (it must still pass).**
- [ ] **Step 5: Commit.** `git commit -m "brep: the BENTLEY_brep glTF extension draft" -- src/brep/gltf.ts src/brep/BENTLEY_brep.md src/io/gltfParse.ts src/io/gltfTypes.ts test/brepGltf.test.ts`

### Task 5: Exports, the handbook, the overall plan, the full suite

**Files:**

- Create: `packages/next/src/brep/index.ts`
- Modify: `packages/next/src/index.ts`, `packages/next/api/surface.txt` (via `npm run surface`) and `packages/next/handbook/src/apiMap.ts` (one new row in group `picking`, after the geometry queries row)
- Modify: `packages/next/handbook/src/tabs/specs.tsx` (a `DECLARATIONS` entry for `BENTLEY_brep`) and `packages/next/handbook/src/tabs/breps.tsx` (the status note and "Still to write")
- Modify: `CESIUM2_WEBGPU_PLAN.md` §13.33 (a "Step 4 draft" paragraph after "Step 3 draft")

- [ ] **Step 1: Export** from `src/index.ts`, by name (the handbook's surface reader doesn't follow `export *`): `BrepBuilder`, `validateBrep`, `nurbsSurfaceToPatches`, `nurbsCurveToSegments`, `evaluateSurface`, `faceNormal`, and the types `BrepForm`, `BezierCurves`, `BrepUse`, `BrepProblem`, `NurbsSurface`, `NurbsCurve`, `SurfaceSample`. `SurfaceKind` is a `const enum`, so export it as a type and document its values. Then run `npm run surface` and add the apiMap row (status `new`, with a note naming it a draft).
- [ ] **Step 2: Handbook.**
  - The specs tab gets a `BENTLEY_brep` declaration: "A B-rep beside a fallback mesh: surfaces, trims, edges and stable IDs as typed arrays", with the state "Draft. Read by the loader; nothing draws it yet."
  - The B-reps tab's note says the form and the extension are drafted, and "Still to write" drops "the extension's name and schema", replaced by "The extension's name, and review of its schema".
- [ ] **Step 3: §13.33.** A "Step 4 draft (2026-11-10, plan …)" paragraph: what the form holds, the exact NURBS split, the builder and validator, the extension and its fallback rule. Then its questions for the review:
  1. Bézier patches are stored in place of NURBS: size against loader work.
  2. Pcurves and edges are exact rational Bézier of degree ≤ 3, and quadratic segments are made later.
  3. One `ids` string table.
  4. Float64 everywhere in the file.
  5. The `BENTLEY_` prefix.
- [ ] **Step 4: Run the full suite once** (`npm run typecheck`, `npx tsc -p handbook --noEmit`, `npx vitest run`), and Snyk on `src/brep`, `src/io/gltfParse.ts` and `src/io/gltfTypes.ts`.
- [ ] **Step 5: Commit** from the repo root by pathspec: `git commit -m "brep: export the draft; handbook and §13.33" -- …`
