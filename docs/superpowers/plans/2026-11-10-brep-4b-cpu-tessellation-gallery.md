# B-rep step 4b: a CPU tessellator and a gallery example — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** See B-reps on screen before GPU tessellation exists. `tessellateBrep` turns a `BrepForm` into ordinary meshes: shaded faces, plus edges as lines. A gallery example draws step 4's three fixtures with them, and one b-rep that went through the `BENTLEY_brep` glTF path.

**Architecture:** `src/brep/tessellate.ts` is a real piece, not throwaway. The plan needs a CPU tessellator anyway, for the tiler's fallback meshes, for `display(tolerance)` in the geometry queries, and as a reference to test the GPU path against (§13.33). Each face's parameter domain is tessellated as a grid whose density comes from a chordal-error bound. Triangles whose centre falls outside the trim are dropped, and the edges, drawn on top as lines, hide the jagged trim boundary. Only the example's glue gets replaced at step 5. Placement is an ordinary rigid model matrix, so this doesn't wait for the placement review (§13.26).

**Tech Stack:** TypeScript, vitest, the engine's `World.addMesh` and `addDraw`, the examples gallery.

**Spec:** `CESIUM2_WEBGPU_PLAN.md` §13.33. Step 4's plan, `docs/superpowers/plans/2026-11-10-brep-4-render-form.md`, defines `BrepForm` (its "The form" section).

## Global Constraints

- Package: `packages/next`. Type check: `npm run typecheck`. Tests: `npx vitest run <file>`.
- Branch `brep-4b-tessellation`, cut from `cesium-2.0-webgpu-poc` after step 4 merges. Commit by pathspec only, with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
- Words: never "master", "competitors", "ghost" or "presentation" in `src/` or `examples/`. "Representation" contains "presentation", so avoid it. Never "frame" alone for a reference frame or a tick.
- Geometry arithmetic in float64. Output positions are float32, relative to the mesh's `origin`.
- The example follows the gallery's contract in `examples/types.ts`, and the patterns of `examples/translucency/main.ts` (globe off, its own meshes, materials and draws).

## Review Focus

1. A face at a pole (a sphere's cap) or with a degenerate edge: no NaN normals. The normal falls back to the triangle's own.
2. A face with only axis-aligned straight outer pcurves and no holes is not trimmed: its grid fills it exactly, so the box's faces are 2 triangles each.
3. A tolerance of 0 or below, or one that would need a grid over the cap, is clamped to the cap (`maxGrid`, default 128 per side) and stated in `error`.
4. A face whose outer loop runs clockwise (wrong) still tessellates the same: the inside test is even-odd.
5. The example tolerates a b-rep that fails `validateBrep`: it draws what it can, and lists the problems in its panel.

---

### Task 1: `tessellateBrep`

**Files:**

- Create: `packages/next/src/brep/tessellate.ts`
- Test: `packages/next/test/brepTessellate.test.ts` (uses `test/brepFixtures.ts`)

**Interfaces:**

```ts
export interface TessellateOptions {
  /** The largest chordal error allowed, m. */
  readonly tolerance: number;
  /** The most grid cells per side of a face's domain (default 128). */
  readonly maxGrid?: number;
  /** Grid cells per side for a trimmed face, so the trim reads (default 48). */
  readonly trimGrid?: number;
}
export interface BrepMesh {
  /** Positions are relative to this, m (the centre of the vertices' bounds). */
  readonly origin: Float64Array;
  /** Every face, unwelded between faces: featureIds holds each vertex's face index. */
  readonly faces: { readonly positions: Float32Array; readonly normals: Float32Array; readonly indices: Uint32Array; readonly featureIds: Uint32Array };
  /** Every edge as a line list: featureIds holds each vertex's edge index. */
  readonly edges: { readonly positions: Float32Array; readonly indices: Uint32Array; readonly featureIds: Uint32Array };
  /** The largest chordal error the bounds allow, m: the tolerance, or more where maxGrid capped a face. */
  readonly error: number;
}
export function tessellateBrep(form: BrepForm, options: TessellateOptions): BrepMesh;
```

Rules (fixed):

- A face's domain is the (u, v) box of its outer loop's pcurve samples, at 16 per segment.
- Grid density per direction is the larger of:
  - **For curvature:**
    - Plane: 1 cell.
    - Cylinder and cone: around u, the smallest n with `r(1 − cos(Δu/2n)) ≤ tolerance`; along v, 1.
    - Sphere and torus: the same chord rule in both directions, with each direction's radius.
    - Bézier: per patch, `n = ceil(sqrt(2 · 0.75 · D / tolerance))`, from Spike B's bound with a safety factor of 2 for rational weights, where D is the patch's largest second difference of its divided control points. Take the max over the face's patches in each direction, times the number of patches the domain covers in that direction.
  - **For the trim:** `trimGrid` per side, unless the face isn't trimmed. A face isn't trimmed when it has no inner loops and every outer pcurve segment is degree 1 and axis-aligned in (u, v).
- n is capped at `maxGrid`. Where the cap binds, the bound for that n goes into `error`.
- Each cell is two triangles. For a trimmed face, keep a triangle when its (u, v) centroid is inside the trim by the even-odd rule over all of the face's loops, each polygonized at 16 points per segment.
- Vertices are `evaluateSurface` positions. Normals are `faceNormal`; where that's undefined, the triangle's geometric normal turned to agree with the face's sense. Triangle winding is counter-clockwise seen from outside (the normal's side).
- Edges: each 3D segment of degree 1 is one line. Higher degrees get `n = ceil(sqrt(0.125 · D / tolerance))` lines (at least 1, at most 256), with D the segment's largest second difference of divided control points.

- [ ] **Step 1: Write the failing tests** (with `boxBrep`, `cappedCylinderBrep` and `trimmedNurbsBrep`):
  - **Box:** 12 triangles, 24 face vertices, and 12 edge lines. Every triangle's geometric normal points away from the box's centre. `featureIds` cover faces 0–5 and edges 0–11. `positions + origin` reproduces the corners within 1e-6 m.
  - **Capped cylinder, tolerance 1 mm:**
    - Every side vertex is at radius 1 within 1e-6 m.
    - Each side triangle's edge midpoints are within 1 mm + 1e-6 of the surface.
    - Normals are radial on the side and ±z on the caps (outward).
    - The circle edges have at least 8 lines each.
  - **Trimmed NURBS, tolerance 0.05 m:**
    - No kept triangle has its (u, v) centroid inside the hole.
    - The kept area in (u, v) is within 5% of `1 − π·0.2²`.
    - At 200 seeded cell centres, the distance from the surface to the triangle's plane point is within the tolerance.
    - `error` is 0.05.
  - **Caps:** `maxGrid: 4` with a tolerance of 1e-6 gives `error` > 1e-6 and no more than 4 × 4 cells per face.
  - **Bad tolerance:** a tolerance of 0 throws `"tessellateBrep: tolerance must be a positive finite number"`.
  - **A sphere face at the pole:** built with `BrepBuilder` (a sphere surface; its domain u in [0, 2π], v in [π/4, π/2]; outer loop on its boundary). No NaN anywhere.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests and `npm run typecheck`.**
- [ ] **Step 5: Commit.** `git commit -m "brep: a CPU tessellator for fallback meshes and the reference" -- src/brep/tessellate.ts test/brepTessellate.test.ts`

### Task 2: The gallery example, "B-reps: a first look"

**Files:**

- Create: `packages/next/examples/brep-first-look/main.ts`
- Create: `packages/next/examples/brep-first-look/fixtures.ts`. This builds the three shapes with `BrepBuilder`, as `test/brepFixtures.ts` does: copy what's needed, since examples don't import tests.
- Modify: `packages/next/examples/index.ts` (register it after `slang-playground`)

**Interfaces:**

- Consumes: `tessellateBrep`, `BrepBuilder`, `validateBrep`, `writeBrepExtension` and `parseGltf`'s output types. Import public names from `@cesium/next` where step 4 exported them. If a needed name isn't exported (`tessellateBrep` and `writeBrepExtension` aren't yet), export it from `src/index.ts` by name in this task, and run `npm run surface`. Add the names to the step 4 row in `handbook/src/apiMap.ts`, and run `npx vitest run test/handbookData.test.ts`.
- Registration: `id: "brep-first-look"`, title `"B-reps: a first look"`, description `"Exact CAD shapes as B-reps: a box, a capped cylinder and a trimmed NURBS face, tessellated on the CPU for now, with their edges. Tap a face or an edge for its ID."`, labels `["B-reps", "CAD"]`, `globe: false`, `layout: "side"`, `stackNarrow: true`.

What it shows:

- **The scene:** the three shapes in a row on a light ground grid, scaled to read together. The NURBS face is 100 m across, so scale it by 0.03; the box and the cylinder stay as they are. Each draw gets an ordinary rigid `model` matrix. Faces get a light grey lit material, each face a slightly different tint from its face index. Edges are near-black lines, unlit.
- **The panel:**
  - A tolerance slider (0.1 mm to 50 mm, logarithmic, default 1 mm) that re-tessellates. Next to it, the triangle and line counts and the time `tessellateBrep` took.
  - Checkboxes for "Faces" and "Edges".
  - A line per shape: "valid", or the `validateBrep` problems.
  - A fourth shape, "via glTF": the box written with `writeBrepExtension` into a GLB, whose fallback mesh is the box's tessellation. The GLB goes through `parseGltf` from a blob URL. The shape is drawn from `asset.breps[mesh.brep]`, re-tessellated. This proves the extension end to end. Look at `test/brepGltf.test.ts` for how its test builds a GLB, and copy the GLB assembly into the example. If `parseGltf` can't be called from an example (it runs in the engine's worker), use `readBrepExtension` on the GLB's JSON and binary chunk directly, and say so in a comment and in the panel.
- **Picking:** a tap or click shows the face or edge picked, by its index and stable ID, from the draw's feature ID. Use `view.pick`; feature IDs are face or edge indices. If picking lines isn't supported, faces only, and say so in the panel.
- **The camera:** framed on the row at the start, orbiting by the viewer's usual controls.

- [ ] **Step 1: Write the example.** No unit test: the gallery's own tests (`test/exampleRun.test.ts` and anything that lists `EXAMPLES`) must still pass. Run `npx vitest run test/exampleRun.test.ts test/handbookData.test.ts` and `npm run typecheck`.
- [ ] **Step 2: Check it in the browser.** Start the dev server with `preview_start` (the config `dyno-dg-5194` in `.claude/launch.json`, port 5194; never 5190 or 5199). Open the gallery's example, then check:
  - It draws, with no console errors.
  - The box's faces are lit from outside, not black.
  - The hole is visible.
  - The slider re-tessellates.
  - A pick shows an ID.

  Take one screenshot for the report; don't commit it.
- [ ] **Step 3: Commit.** `git commit -m "examples: B-reps, a first look" -- examples/brep-first-look examples/index.ts` (plus `src/index.ts`, `api/surface.txt` and `handbook/src/apiMap.ts` if you exported names).
