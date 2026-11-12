import {
  CustomShader,
  Ellipsoid,
  MaterialFlags,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  readBrepExtension,
  tessellateBrep,
  validateBrep,
  vec3,
  writeBrepExtension,
  type BrepForm,
  type BrepMesh,
  type DrawHandle,
  type MeshData,
} from "../../src/index.ts";
import { SurfaceKind } from "../../src/brep/index.ts";
import type { BrepProblem } from "../../src/brep/validate.ts";
import type { ExampleContext } from "../types.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  coneFrustumBrep,
  filletedBlockBrep,
  plateBrep,
  sphereBrep,
  torusBrep,
  trimmedNurbsBrep,
} from "./fixtures.ts";
import {
  KIND_COLORS,
  KIND_NAMES,
  isoLines,
  linearOf,
  normalWhiskers,
} from "./analysis.ts";
import {
  edgeLength,
  faceArea,
  nearestOnFace,
  nearestVertexUv,
  MAX_ITERATIONS,
} from "./exact.ts";
import {
  boundsSize,
  edgeLines,
  flatFaces,
  wireLines,
  type DisplayMode,
  type LineMesh,
} from "./meshes.ts";
import {
  KERNELS,
  KernelSession,
  RECIPES,
  STEP_SAMPLES,
  boundsFromKernel,
  patchesFromKernel,
  problemsFromKernel,
  type KernelLoad,
  type KernelResult,
  type StageReporter,
  type StepImport,
  type StepSample,
} from "./kernels.ts";
import { formBounds, type FormBounds } from "../../src/brep/formBounds.ts";

/**
 * B-reps, a first look, in three scenes.
 *
 * - Gallery: nine exact CAD shapes held as B-reps (a box, a capped cylinder,
 *   a trimmed NURBS face, a sphere, a torus, a cone frustum, a plate with
 *   bolt holes, a filleted block with a hole, and the box again through the
 *   draft `BENTLEY_brep` glTF extension) on a 3 x 3 grid.
 * - Two kernels: three booleans (a box minus a cylinder, and a box and a
 *   sphere united and intersected) made live by SMLib and by Open CASCADE in
 *   WebAssembly, side by side, each converted to the same render form: the
 *   CSG spike (plan §13.33). SMLib's faces arrive as Bézier patches that
 *   carry their analytic identity, OCCT's as analytic kinds. A picked face
 *   says which input it came from. The kernels load only when the scene is
 *   first shown.
 * - STEP file: real CAD parts, NIST's public-domain MBE PMI test models
 *   (geometry only), fetched from the dev server's /step-samples/ (`npm run
 *   setup` puts them in the store), imported with Open CASCADE and converted
 *   to the same render form, one part at a time. The panel says what came in
 *   and how long each step took, and whether the form is valid. The part is
 *   drawn scaled to about 2.4 m; PMI is not shown.
 *
 * Faces are drawn by one of two tessellators, chosen in the panel.
 *
 * - GPU (default): `World.addBrep` (provisional, plan §13.33, step 5) puts
 *   each shape's faces in the engine, diced per view on the GPU to an error
 *   target in pixels (the slider, `setPatchErrorPixels`). Faces the GPU path
 *   can't draw yet are a CPU mesh inside `addBrep`; the panel counts both,
 *   from what `addBrep` returns. Colours by face come from a custom shader
 *   that reads a palette by the face's feature ID, so picks, colours and the
 *   CPU-meshed faces all go through the same feature IDs.
 * - CPU: `tessellateBrep` at a chordal tolerance, as before.
 *
 * In GPU mode the wireframe, flat shading and iso lines are the GPU's too
 * (`World.setPatchDisplay`, provisional): the patch draws' fragment stage
 * draws the dice grid's cell edges and triangle diagonals at a constant width
 * on screen, so the tessellation can be watched changing as the camera moves
 * (the panel counts its cells and triangles for the view, live); iso lines are
 * fixed divisions of each face's (u, v) rect, and flat shading is each
 * triangle's own normal. A trimmed face keeps its trim cut in all of them.
 * B-rep edges, normals and the selected face are CPU geometry (1 mm in the
 * scene in GPU mode, made when asked for); the CPU mode makes triangles and
 * lines of its own for all of them.
 *
 * The first frame is the right one: the host's start spinner, and the overlay
 * of scene, model, tessellator and colour changes, stay up until
 * `Engine.whenReady` says the shaders' pipelines are compiled, their palettes
 * loaded and the faces diced, so nothing pops from the default material.
 *
 * A toolbar over the view switches the display mode (keys 1 to 4): shaded,
 * shaded + wireframe, flat + wireframe, wireframe. The panel's analysis views
 * colour faces by what their surface is, draw iso lines (kept inside each face's trim)
 * and normal whiskers. A click picks a face or an edge: the face is
 * highlighted and the panel shows the exact point of the surface nearest the
 * pick, found by Gauss-Newton in (u, v), a preview of the exact queries to
 * come.
 *
 * The CPU tessellator is the small, kept one (`tessellateBrep`), not the
 * reference. Its slider is the chordal tolerance in millimetres in the scene:
 * each shape is drawn at a scale and tessellated at the tolerance divided by
 * it. A trimmed face's hole is cut by dropping triangles whose centre falls
 * outside the trim, so it reads jagged; the edges drawn on top hide that.
 *
 * `parseGltf` runs in the engine's worker and is not public, so the glTF
 * shape reads the GLB's JSON and binary chunk here and hands them to
 * `readBrepExtension`, which is what `parseGltf` calls. The shape files
 * import the B-rep entry's module directly, so that tests can run them
 * without a GPU.
 */

const SITE = fromDegrees(-75.1652, 39.9526, 0);
const DEG = Math.PI / 180;
/** Between the middles of neighbouring shapes in the grid, m. */
const SPACING = 4;

/** A shape in the row: its form, where it stands and how big it is drawn. */
interface Shape {
  name: string;
  form: BrepForm;
  /** East of the layout's middle, m. */
  x: number;
  /** North of the layout's middle, m. */
  y: number;
  /** Where it stands in the grid, in words: "top row, left". */
  place: string;
  scale: number;
  /** A sheet is seen from both sides. */
  doubleSided: boolean;
  /** Said in the panel: where the form came from. */
  note?: string;
  /** The kernel that made it, for the Kernels scene's shapes. */
  kernel?: string;
  /** Per face: the input of a boolean it came from, said when it's picked. */
  faceSources?: readonly string[];
}

/** What one shape's tessellation gives, and what the display modes make of it. */
interface Prepared {
  /** The CPU mesh the overlays are made from. In GPU mode its faces are empty until something needs them (`faces`). */
  mesh: BrepMesh;
  /** Whether `mesh` has its faces. */
  faces: boolean;
  /** How far lines are lifted off the faces, m in the b-rep's units. */
  lift: number;
  /** The lowest point of the faces, m in the b-rep's coordinates. */
  floor: number;
  wire?: LineMesh;
  flat?: ReturnType<typeof flatFaces>;
  edges?: LineMesh;
  iso?: LineMesh;
  whiskers?: LineMesh;
  /** The largest extent of the faces, m. */
  size: number;
  /** Where the shape's origin stands, m: its z in the layout's coordinates, so it rests on the ground. */
  stand: number;
  /** The shape's draws' model matrix: the b-rep's mesh-relative positions to the layout. */
  model?: ReturnType<typeof mat4.mat4>;
}

/** The display modes, in the order of the toolbar and the keys 1 to 4. */
const MODES: ReadonlyArray<{
  id: DisplayMode;
  label: string;
  /** The picture on the button: the faces and the strokes of a cube. */
  icon: string;
}> = [
  { id: "shaded", label: "Shaded", icon: iconOf("fill") },
  { id: "shadedWire", label: "Shaded + wireframe", icon: iconOf("fill wire") },
  { id: "flatWire", label: "Flat + wireframe", icon: iconOf("facets wire") },
  { id: "wire", label: "Wireframe", icon: iconOf("wire hidden") },
];

/** A 20 px cube for a toolbar button, drawn in the button's own colour. */
function iconOf(parts: string): string {
  const on = parts.split(" ");
  const top = "10,2 16.9,6 10,10 3.1,6";
  const left = "3.1,6 10,10 10,18 3.1,14";
  const right = "10,10 16.9,6 16.9,14 10,18";
  const fill = (points: string, opacity: number) =>
    `<polygon points="${points}" fill="currentColor" fill-opacity="${opacity}" stroke="none"/>`;
  let body = "";
  if (on.includes("fill")) {
    body += fill(top, 0.3) + fill(left, 0.55) + fill(right, 0.85);
  }
  if (on.includes("facets")) {
    // Each face split in two, the halves lit differently: flat shading.
    body +=
      fill("10,2 16.9,6 10,10", 0.22) +
      fill("10,2 10,10 3.1,6", 0.4) +
      fill("3.1,6 10,10 10,18", 0.45) +
      fill("3.1,6 10,18 3.1,14", 0.68) +
      fill("10,10 16.9,6 16.9,14", 0.95) +
      fill("10,10 16.9,14 10,18", 0.72);
  }
  let strokes = "";
  if (on.includes("wire")) {
    const outline = "10,2 16.9,6 16.9,14 10,18 3.1,14 3.1,6";
    strokes += `<polygon points="${outline}" fill="none"/><polyline points="3.1,6 10,10 16.9,6" fill="none"/><line x1="10" y1="10" x2="10" y2="18"/>`;
    if (on.includes("fill") || on.includes("facets")) {
      strokes += `<line x1="10" y1="2" x2="10" y2="10" opacity="0.6"/>`;
    }
    if (on.includes("hidden")) {
      strokes += `<line x1="10" y1="2" x2="10" y2="10"/><line x1="3.1" y1="6" x2="16.9" y2="14" opacity="0.55"/>`;
    }
    if (on.includes("facets")) {
      strokes += `<line x1="10" y1="2" x2="10" y2="10"/><line x1="3.1" y1="6" x2="10" y2="18"/><line x1="10" y1="10" x2="16.9" y2="14"/>`;
    }
  }
  return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">${body}<g stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${strokes}</g></svg>`;
}

/** The look of the toolbar over the view: themed by the UI custom properties, as the widgets are. */
const TOOLBAR_CSS = `
.bf-toolbar {
  position: absolute; top: 12px; left: 12px; z-index: 2;
  display: flex; gap: 2px; padding: 3px;
  border-radius: 8px;
  background: color-mix(in oklab, Canvas 88%, transparent);
  color: CanvasText;
  border: 1px solid color-mix(in oklab, CanvasText 18%, transparent);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  backdrop-filter: blur(8px);
  font: 400 12px/16px var(--cesium-ui-font, system-ui, sans-serif);
}
.bf-toolbar button {
  position: relative;
  display: grid; place-items: center;
  width: 34px; height: 30px; padding: 0;
  border: 0; border-radius: 6px;
  background: transparent; color: inherit; cursor: pointer;
}
.bf-toolbar button:hover { background: color-mix(in oklab, CanvasText 10%, transparent); }
.bf-toolbar button[aria-pressed="true"] {
  background: var(--cesium-ui-accent, AccentColor);
  color: var(--cesium-ui-on-accent, #fff);
}
.bf-toolbar button:focus-visible {
  outline: 2px solid var(--cesium-ui-focus, Highlight);
  outline-offset: 2px;
}
.bf-toolbar button::after {
  content: attr(data-tip);
  position: absolute; top: calc(100% + 8px); left: 0;
  padding: 4px 8px; border-radius: 4px; white-space: nowrap;
  background: CanvasText; color: Canvas;
  opacity: 0; pointer-events: none; transition: opacity 120ms;
}
.bf-toolbar button:hover::after,
.bf-toolbar button:focus-visible::after { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .bf-toolbar button::after { transition: none; }
  .bf-spinner { animation: none; }
  .bf-view canvas { transition: none; }
}
.bf-view:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }

/* A load in progress: the view dims behind a card that names the stage. */
.bf-view canvas { transition: opacity 160ms; }
.bf-view[data-loading] canvas { opacity: 0.5; }
.bf-loading {
  position: absolute; inset: 0; z-index: 3;
  display: grid; place-items: center; pointer-events: none;
}
.bf-loading[hidden] { display: none; }
.bf-loading > div {
  display: flex; align-items: center; gap: 10px;
  max-width: calc(100% - 24px); padding: 10px 16px;
  border-radius: 8px;
  background: color-mix(in oklab, Canvas 88%, transparent);
  color: CanvasText;
  border: 1px solid color-mix(in oklab, CanvasText 18%, transparent);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  backdrop-filter: blur(8px);
  font: 400 13px/18px var(--cesium-ui-font, system-ui, sans-serif);
}
.bf-spinner {
  flex: none; width: 16px; height: 16px; box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid color-mix(in oklab, CanvasText 22%, transparent);
  border-top-color: var(--cesium-ui-accent, AccentColor);
  animation: bf-spin 0.8s linear infinite;
}
@keyframes bf-spin { to { transform: rotate(360deg); } }

/* The panel: a scene switch, compact toggles and tables. */
.bf-segmented {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
  padding: 2px; gap: 2px;
  border-radius: var(--stratakit-radius-md, 6px);
  background: var(--stratakit-color-bg-page-depth, rgb(0 0 0 / 0.06));
  border: 1px solid var(--stratakit-color-border-neutral-base, rgb(0 0 0 / 0.15));
}
:where(.examples-panel) .bf-segmented button {
  border: 0; border-radius: calc(var(--stratakit-radius-md, 6px) - 2px);
  background: transparent; padding: 5px 8px; font-weight: 500;
}
:where(.examples-panel) .bf-segmented button[aria-pressed="true"] {
  background: var(--stratakit-color-bg-accent-base, var(--cesium-ui-accent, AccentColor));
  color: var(--stratakit-color-text-accent-on-base, #fff);
}
.bf-segmented button:disabled { opacity: 0.6; cursor: progress; }
.bf-toggles {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 4px var(--stratakit-space-300, 12px);
}
:where(.examples-panel) .bf-toggles label { justify-content: flex-end; flex-direction: row-reverse; }
:where(.examples-panel) .bf-tolerance { grid-template-columns: auto 1fr auto; }
.bf-tolerance output { white-space: nowrap; }
.bf-live { font-size: 0.9em; }
.bf-live output { font-variant-numeric: tabular-nums; }
.bf-legend { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.bf-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.bf-table th, .bf-table td {
  padding: 4px 6px; text-align: left; vertical-align: top;
  border-bottom: 1px solid var(--stratakit-color-border-neutral-muted, rgb(0 0 0 / 0.08));
}
.bf-table th {
  font-weight: 600;
  color: var(--stratakit-color-text-neutral-secondary, inherit);
}
.bf-table td small { display: block; color: var(--stratakit-color-text-neutral-secondary, inherit); }
.bf-table td small.bf-place { display: inline; margin-inline-start: 6px; }
.bf-table caption {
  caption-side: bottom; text-align: left; padding-top: 6px;
  color: var(--stratakit-color-text-neutral-secondary, inherit);
}
.bf-ok { color: var(--stratakit-color-text-positive-base, #1a7f37); }
.bf-bad { color: var(--stratakit-color-text-critical-base, #cf222e); }
.bf-stats > summary { font-weight: 500; }
.bf-stats > dl { margin-top: 6px; }
`;

/** How far lines lift off the faces, as a fraction of a shape's size. */
const LIFT = 0.0025;
/** In GPU mode, the CPU mesh of the overlays, and of the modes that need triangles: its chordal tolerance, m in the scene. */
const OVERLAY_TOLERANCE = 0.001;
/** The GPU's iso lines: divisions of each face's (u, v) rect, as many lines each way less one. */
const ISO_DIVISIONS = 8;
/** How long a scene may take to show right before it shows anyway, ms (a pipeline or palette that never arrives). */
const READY_TIMEOUT_MS = 15000;
/** The error targets the GPU slider spans, pixels (a log scale). */
const MIN_PIXELS = 0.25;
const MAX_PIXELS = 4;
/** A form's bounds, m in its coordinates, found once per form: from the worker that made it, else from the form itself (`formBounds`: no tessellation). */
const boundsCache = new WeakMap<BrepForm, FormBounds>();
function boundsOfForm(form: BrepForm): FormBounds {
  let bounds = boundsCache.get(form) ?? boundsFromKernel(form);
  bounds ??= formBounds(form);
  boundsCache.set(form, bounds);
  return bounds;
}

/** The bounds of several. */
function unionBounds(all: readonly FormBounds[]) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const bounds of all) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, bounds.min[k]!);
      max[k] = Math.max(max[k]!, bounds.max[k]!);
    }
  }
  return { min, max };
}
/** The palette's width in texels: a face's colour is at (id mod width, id div width). */
const PALETTE_WIDTH = 256;
/** Colours a face by its place in a palette (`uniforms.base`: the draw's first feature ID). */
const PALETTE_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  if (fsInput.featureId < uniforms.base) {
    return;
  }
  let face = fsInput.featureId - uniforms.base;
  let at = vec2<i32>(i32(face % ${PALETTE_WIDTH}u), i32(face / ${PALETTE_WIDTH}u));
  (*material).baseColor *= textureLoad(palette, at, 0).rgb;
}
`;
/** Linear colours of unlit lines: the B-rep edges, and the tessellation's wire. */
const EDGE_COLOR: [number, number, number, number] = [0, 0, 0, 1];
const WIRE_MID: [number, number, number, number] = [0.2, 0.2, 0.22, 1];
const WIRE_DARK: [number, number, number, number] = [0.09, 0.09, 0.1, 1];
const ISO_COLOR: [number, number, number, number] = [0.02, 0.12, 0.55, 1];
/** The selection's colour, linear: a hot pink, which none of the kind colours is. */
const SELECT_COLOR: [number, number, number, number] = [1, 0.01, 0.26, 1];
const WHISKER_COLOR: [number, number, number, number] = [0, 0.42, 0.12, 1];
/** About this many normal whiskers in all, shared between the shapes. */
const WHISKER_BUDGET = 2000;
/** A whisker is this fraction of its shape's size. */
const WHISKER_LENGTH = 0.05;

/** What a feature ID of a draw stands for. */
interface Part {
  shape: Shape;
  kind: "face" | "edge";
}

/** A translation. */
function translation(x: number, y: number, z: number) {
  const m = mat4.mat4();
  mat4.setTranslation(m, vec3.vec3(x, y, z));
  return m;
}

/** The tint of face `i`, linear: a light grey, a little different each. */
function tint(i: number): [number, number, number] {
  const t = (i * 0.37) % 1;
  return [0.62 + 0.18 * t, 0.62 + 0.18 * ((t * 3) % 1), 0.66 + 0.16 * (1 - t)];
}

/** A GLB holding one primitive, the box's fallback triangles, tagged with b-rep 0, and the b-rep. */
function boxGlb(form: BrepForm, fallback: BrepMesh): Uint8Array {
  const pad = (n: number) => Math.ceil(n / 8) * 8;
  const count = fallback.faces.positions.length / 3;
  const positions = new Float32Array(count * 3);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      const p = fallback.faces.positions[i * 3 + k]! + fallback.origin[k]!;
      positions[i * 3 + k] = p;
      min[k] = Math.min(min[k]!, p);
      max[k] = Math.max(max[k]!, p);
    }
  }
  const indices = fallback.faces.indices;
  const positionBytes = new Uint8Array(positions.buffer);
  const indexBytes = new Uint8Array(
    indices.buffer,
    indices.byteOffset,
    indices.byteLength,
  );
  const indexAt = pad(positionBytes.length);
  const brepAt = indexAt + pad(indexBytes.length);
  const written = writeBrepExtension([form], 2);
  const bin = new Uint8Array(brepAt + written.binary.length);
  bin.set(positionBytes, 0);
  bin.set(indexBytes, indexAt);
  bin.set(written.binary, brepAt);
  const json = {
    asset: { version: "2.0" },
    extensionsUsed: ["BENTLEY_brep"],
    extensions: { BENTLEY_brep: written.extension },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length },
      { buffer: 0, byteOffset: indexAt, byteLength: indexBytes.length },
      ...(written.bufferViews as Array<{ byteOffset: number }>).map((v) => ({
        ...v,
        byteOffset: v.byteOffset + brepAt,
      })),
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: "VEC3", min, max },
      {
        bufferView: 1,
        componentType: 5125,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            extensions: { BENTLEY_brep: { brep: 0 } },
          },
        ],
      },
    ],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const jsonBytes = new Uint8Array(pad(encoded.length)).fill(0x20);
  jsonBytes.set(encoded);
  const binBytes = new Uint8Array(pad(bin.length));
  binBytes.set(bin);
  const out = new Uint8Array(12 + 8 + jsonBytes.length + 8 + binBytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  view.setUint32(20 + jsonBytes.length, binBytes.length, true);
  view.setUint32(24 + jsonBytes.length, 0x004e4942, true);
  out.set(binBytes, 28 + jsonBytes.length);
  return out;
}

/** The b-rep a GLB's first primitive names, read through `readBrepExtension`. */
function readGlb(bytes: Uint8Array): { form?: BrepForm; warnings: string[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)),
  ) as {
    bufferViews: Array<{ byteOffset: number; byteLength: number }>;
    meshes: Array<{
      primitives: Array<{ extensions?: { BENTLEY_brep?: { brep: number } } }>;
    }>;
  };
  const binStart = 28 + jsonLength;
  const warnings: string[] = [];
  const forms = readBrepExtension(
    json,
    (index) => {
      const v = json.bufferViews[index]!;
      return bytes.subarray(
        binStart + v.byteOffset,
        binStart + v.byteOffset + v.byteLength,
      );
    },
    warnings,
  );
  const index = json.meshes[0]?.primitives[0]?.extensions?.BENTLEY_brep?.brep;
  return { form: index === undefined ? undefined : forms[index], warnings };
}

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world, view } = viewer;
  // The kernels' Web Workers, made when a scene first needs them.
  const kernels = new KernelSession();
  viewer.creditsShown = false;
  viewer.setControls("orbit");
  view.background = "color";
  view.clearColor = [0.78, 0.82, 0.88];
  view.lighting.environment = "procedural";
  // A camera set for daylight, so the sunlit shapes read as light grey.
  view.observer.exposure = { ev100: 15 };

  const settings = {
    /** CPU mode: the chordal tolerance, m in the scene. */
    tolerance: 0.001,
    /** Whether the faces are diced on the GPU (`World.addBrep`) or tessellated on the CPU. */
    gpu: true,
    /** GPU mode: the error target, pixels. */
    pixels: 0.5,
    mode: "shaded" as DisplayMode,
    edges: true,
    byKind: false,
    iso: false,
    normals: false,
  };
  const kindColors = KIND_COLORS.map(linearOf);

  // ----------------------------------------------------------- the shapes
  const box = boxBrep();
  // The box through the glTF extension: its fallback mesh is its own
  // tessellation, and the shape is drawn from the b-rep read back.
  const glb = boxGlb(box, tessellateBrep(box, { tolerance: 0.001 }));
  const url = URL.createObjectURL(new Blob([glb as BlobPart]));
  let viaGltf: BrepForm | undefined;
  let gltfNote: string;
  try {
    const response = await fetch(url, { signal });
    const read = readGlb(new Uint8Array(await response.arrayBuffer()));
    viaGltf = read.form;
    gltfNote =
      read.warnings.length > 0
        ? read.warnings.join("; ")
        : `${(glb.length / 1024).toFixed(1)} KiB GLB, b-rep read with readBrepExtension (parseGltf runs in a worker and is not public)`;
  } finally {
    URL.revokeObjectURL(url);
  }
  if (signal.aborted) {
    return () => undefined;
  }
  // The gallery: a 3 × 3 grid on the ground, 4 m between the middles, the
  // first shape at the top left (north-west) and rows running south. Each
  // shape is drawn at a scale that makes them read together.
  const ROWS = ["top", "middle", "bottom"];
  const COLUMNS = ["left", "middle", "right"];
  const entries: Array<Omit<Shape, "x" | "y" | "place">> = [
    { name: "Box", form: box, scale: 0.55, doubleSided: false },
    {
      name: "Capped cylinder",
      form: cappedCylinderBrep(),
      scale: 0.8,
      doubleSided: false,
    },
    {
      name: "Trimmed NURBS face",
      form: trimmedNurbsBrep(),
      scale: 0.03,
      doubleSided: true,
      note: "100 m across, drawn at 0.03",
    },
    { name: "Sphere", form: sphereBrep(), scale: 1.2, doubleSided: false },
    { name: "Torus", form: torusBrep(), scale: 0.9, doubleSided: false },
    {
      name: "Cone frustum",
      form: coneFrustumBrep(),
      scale: 1.3,
      doubleSided: false,
    },
    {
      name: "Plate with bolt holes",
      form: plateBrep(),
      scale: 0.8,
      doubleSided: false,
    },
    {
      name: "Filleted block with a hole",
      form: filletedBlockBrep(),
      scale: 1.4,
      doubleSided: false,
    },
  ];
  if (viaGltf) {
    entries.push({
      name: "Box via glTF",
      form: viaGltf,
      scale: 0.55,
      doubleSided: false,
      note: gltfNote,
    });
  }
  const gallery: Shape[] = entries.map((entry, i) => ({
    ...entry,
    x: ((i % 3) - 1) * SPACING,
    y: (1 - Math.floor(i / 3)) * SPACING,
    place: `${ROWS[Math.floor(i / 3)]} row, ${COLUMNS[i % 3]}`,
  }));

  // The kernels: each boolean in SMLib (west) and Open CASCADE (east), one
  // row each, made when the scene is first shown.
  let kernelScene:
    | { shapes: Shape[]; loads: KernelLoad[]; results: KernelResult[] }
    | undefined;
  const makeKernelScene = async (stage: StageReporter) => {
    const { loads, results } = await kernels.runKernels(stage);
    const shapes: Shape[] = [];
    for (const result of results) {
      if (!result.form) {
        continue;
      }
      const row = RECIPES.indexOf(result.recipe);
      const column = KERNELS.indexOf(result.kernel);
      shapes.push({
        name: result.recipe.name,
        kernel: result.kernel,
        form: result.form,
        scale: result.recipe.scale,
        doubleSided: false,
        x: (column - 0.5) * SPACING,
        y: (1 - row) * SPACING,
        place: `${ROWS[row]} row, ${column === 0 ? "west" : "east"}`,
        faceSources: result.faceSources,
      });
    }
    return { shapes, loads, results };
  };

  /** How big a STEP part is drawn, its largest extent, m: NIST's run from 63 mm to over 500 mm. */
  const STEP_SIZE = 2.4;
  /** A STEP part as the scene shows it, or why it can't be. */
  interface StepScene {
    sample: StepSample;
    shapes: Shape[];
    load?: StepImport;
    problem?: string;
    /** How the camera frames the part: the height of its middle and its radius, m in the scene. */
    framing: { height: number; radius: number };
  }
  let stepScene: StepScene | undefined;
  let stepChoice = 0;
  // A NIST part, fetched and imported with Open CASCADE, drawn alone in the
  // middle at a scale of its own.
  const makeStepScene = async (
    sample: StepSample,
    stage: StageReporter,
  ): Promise<StepScene> => {
    const none = { height: 1, radius: 3 };
    const load = await kernels.loadStep(sample.file, stage);
    if ("problem" in load) {
      return { sample, shapes: [], problem: load.problem, framing: none };
    }
    try {
      // The part's size, from its form (the worker measured it).
      const { min, max } = unionBounds(load.forms.map(boundsOfForm));
      const size = [0, 1, 2].map((k) => max[k]! - min[k]!);
      const longest = Math.max(...size);
      const scale = longest > 0 ? STEP_SIZE / longest : 1;
      const shapes: Shape[] = load.forms.map((form, i) => ({
        name:
          load.forms.length === 1
            ? sample.name
            : `${sample.name}, solid ${i + 1}`,
        form,
        scale,
        x: 0,
        y: 0,
        place: sample.file,
        doubleSided: false,
      }));
      return {
        sample,
        shapes,
        load,
        framing: {
          height: (size[2]! * scale) / 2,
          radius: (Math.hypot(size[0]!, size[1]!, size[2]!) * scale) / 2,
        },
      };
    } catch (error) {
      return {
        sample,
        shapes: [],
        problem: `${sample.file} couldn't be tessellated (${String(error)})`,
        framing: none,
      };
    }
  };

  type SceneName = "gallery" | "kernels" | "step";
  let scene: SceneName = "gallery";
  let shapes: Shape[] = gallery;

  // ------------------------------------------------------------ the scene
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const toWorld = (local: ReturnType<typeof mat4.mat4>) =>
    mat4.multiply(mat4.mat4(), enu, local);

  const facesMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.7,
  });
  const groundMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.95,
  });
  const lineMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    flags: MaterialFlags.unlit,
  });

  const extras: DrawHandle[] = [];
  // A light ground and its grid, 1 m a line.
  const half = 16;
  const groundMesh = world.addMesh({
    positions: new Float32Array([
      -half,
      -half,
      -0.02,
      half,
      -half,
      -0.02,
      half,
      half,
      -0.02,
      -half,
      half,
      -0.02,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
  extras.push(
    world.addDraw({
      mesh: groundMesh,
      origin,
      model: toWorld(mat4.mat4()),
      material: groundMaterial,
      color: [0.86, 0.88, 0.9, 1],
      doubleSided: true,
    }),
  );
  const grid: number[] = [];
  const gridIndices: number[] = [];
  // 4 mm under the shapes' feet, so an edge of a shape that lies on a grid
  // line draws over it (lines of equal depth show in no fixed order).
  const GRID_Z = -0.004;
  for (let i = -half; i <= half; i++) {
    const at = grid.length / 3;
    grid.push(
      i,
      -half,
      GRID_Z,
      i,
      half,
      GRID_Z,
      -half,
      i,
      GRID_Z,
      half,
      i,
      GRID_Z,
    );
    gridIndices.push(at, at + 1, at + 2, at + 3);
  }
  extras.push(
    world.addDraw({
      mesh: world.addMesh({
        positions: new Float32Array(grid),
        indices: new Uint32Array(gridIndices),
        topology: "line-list",
      }),
      origin,
      model: toWorld(mat4.mat4()),
      material: lineMaterial,
      color: [0.62, 0.66, 0.72, 1],
    }),
  );

  /** What each shape's draws are, rebuilt when the tolerance or the mode changes. */
  let draws: DrawHandle[] = [];
  /** GPU mode: the shapes' b-reps in the world (`World.addBrep`), kept while their colours and the mode keep them. */
  type BrepHandle = ReturnType<typeof world.addBrep>;
  let breps: Array<{ shape: Shape; handle: BrepHandle }> = [];
  /** What `breps` was made for: the colours it carries and the tolerance of its CPU mesh. */
  let brepsFor = "";
  const parts = new Map<number, Part>();
  const stats = {
    triangles: 0,
    wireLines: 0,
    edgeLines: 0,
    isoLines: 0,
    whiskers: 0,
    ms: 0,
    /** The worst chordal error on screen, m: each shape's error × its scale. */
    error: 0,
    /** Shapes whose grid cap leaves more than the tolerance. */
    capped: [] as string[],
    /** GPU mode. */
    gpu: {
      /** ms in `addBrep`: the CPU's work to prepare the spans and the CPU mesh. */
      prepareMs: 0,
      failed: [] as string[],
    },
  };
  const prepared: Array<Prepared | undefined> = [];
  /** GPU mode's CPU meshes by shape: edges only, and with faces once something needs them. */
  const overlayEdges = new Map<Shape, BrepMesh>();
  const overlayFaces = new Map<Shape, BrepMesh>();
  /** A shape's size and lowest point, m in its b-rep. */
  const boundsOf = (shape: Shape) => {
    const { min, max } = boundsOfForm(shape.form);
    return {
      size: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
      floor: min[2],
    };
  };

  const problemCache = new Map<Shape, readonly BrepProblem[]>();
  const problemsOf = (shape: Shape) => {
    let problems = problemCache.get(shape);
    if (!problems) {
      problems = problemsFromKernel(shape.form) ?? validateBrep(shape.form);
      problemCache.set(shape, problems);
    }
    return problems;
  };

  /** The overlays' CPU mesh in GPU mode, edges only. */
  const overlayOf = (shape: Shape, withFaces: boolean) => {
    const cache = withFaces ? overlayFaces : overlayEdges;
    let mesh = cache.get(shape);
    if (!mesh) {
      mesh = tessellateBrep(shape.form, {
        tolerance: OVERLAY_TOLERANCE / shape.scale,
        ...(withFaces ? {} : { faces: () => false }),
      });
      cache.set(shape, mesh);
    }
    return mesh;
  };

  // Tessellates every shape: when the tolerance changes, or in GPU mode when the scene does.
  const tessellate = () => {
    const start = performance.now();
    stats.error = 0;
    stats.capped = [];
    shapes.forEach((shape, s) => {
      try {
        if (settings.gpu) {
          const { size, floor } = boundsOf(shape);
          const faces = overlayFaces.has(shape);
          prepared[s] = {
            mesh: overlayOf(shape, faces),
            faces,
            lift: size * LIFT,
            floor,
            size,
            stand: 0,
          };
          return;
        }
        // The slider is millimetres in the scene: the shape is drawn at
        // `scale`, so its b-rep is tessellated at tolerance ÷ scale.
        const mesh = tessellateBrep(shape.form, {
          tolerance: settings.tolerance / shape.scale,
        });
        const p = mesh.faces.positions;
        let lowest = Infinity;
        for (let i = 2; i < p.length; i += 3) {
          lowest = Math.min(lowest, p[i]!);
        }
        // Lines sit this far off the faces: a fraction of the shape's size.
        const size = boundsSize(
          mesh.faces.positions.length > 0
            ? mesh.faces.positions
            : mesh.edges.positions,
        );
        prepared[s] = {
          mesh,
          faces: true,
          lift: size * LIFT,
          floor: lowest + mesh.origin[2]!,
          size,
          stand: 0,
        };
        stats.error = Math.max(stats.error, mesh.error * shape.scale);
        if (mesh.error > (settings.tolerance / shape.scale) * 1.0000001) {
          stats.capped.push(shape.name);
        }
      } catch (error) {
        console.warn(`tessellating ${shape.name}:`, error);
        prepared[s] = undefined;
      }
    });
    stats.ms = performance.now() - start;
  };
  /** GPU mode: gives a shape's CPU mesh its faces (a wireframe, flat shading, normals or a selected face needs them). True if they were made, which moves the mesh's origin: draws made from it are made again. */
  const withFaces = (s: number): boolean => {
    const prep = prepared[s];
    if (!settings.gpu || !prep || prep.faces) {
      return false;
    }
    prepared[s] = {
      mesh: overlayOf(shapes[s]!, true),
      faces: true,
      lift: prep.lift,
      floor: prep.floor,
      size: prep.size,
      stand: prep.stand,
    };
    return true;
  };

  // ------------------------------------------------------------ selection
  /** What was picked: a face or an edge, and where, in the shape's b-rep coordinates (m). */
  let selection:
    | {
        shape: Shape;
        kind: "face" | "edge";
        index: number;
        point: [number, number, number] | undefined;
      }
    | undefined;
  let selectionDraws: DrawHandle[] = [];
  /** Filled by the panel: shows the selection's readout. */
  let showSelection: () => void = () => undefined;

  /** Draws the selected face as a recoloured overlay, or the selected edge in the selection colour. */
  const applySelection = () => {
    for (const d of selectionDraws) {
      world.removeDraw(d);
      parts.delete(d.index);
    }
    selectionDraws = [];
    const sel = selection;
    const prep = sel ? prepared[shapes.indexOf(sel.shape)] : undefined;
    if (sel && prep?.model) {
      const mesh = prep.mesh;
      if (sel.kind === "face") {
        const { positions, normals, indices, featureIds } = mesh.faces;
        const renumber = new Map<number, number>();
        const outPositions: number[] = [];
        const outNormals: number[] = [];
        const outIndices: number[] = [];
        for (let t = 0; t < indices.length; t += 3) {
          if (featureIds[indices[t]!] !== sel.index) {
            continue;
          }
          for (let k = 0; k < 3; k++) {
            const i = indices[t + k]!;
            let at = renumber.get(i);
            if (at === undefined) {
              at = renumber.size;
              renumber.set(i, at);
              for (let c = 0; c < 3; c++) {
                // Above the face, below the wireframe.
                outPositions.push(
                  positions[i * 3 + c]! + normals[i * 3 + c]! * prep.lift * 0.4,
                );
                outNormals.push(normals[i * 3 + c]!);
              }
            }
            outIndices.push(at);
          }
        }
        if (outIndices.length > 0) {
          const draw = world.addDraw({
            mesh: world.addMesh({
              positions: Float32Array.from(outPositions),
              normals: Float32Array.from(outNormals),
              indices: Uint32Array.from(outIndices),
              featureIds: new Uint32Array(outPositions.length / 3).fill(
                sel.index,
              ),
              featureCount: Math.max(1, sel.shape.form.faceSurface.length),
            }),
            origin,
            model: prep.model,
            material: facesMaterial,
            color: SELECT_COLOR,
            doubleSided: sel.shape.doubleSided,
            name: `${sel.shape.name}: selected face`,
          });
          selectionDraws.push(draw);
          parts.set(draw.index, { shape: sel.shape, kind: "face" });
        }
      } else {
        // The same polylines as the drawn edges, over them (the later draw
        // wins a tie in depth).
        const lines = edgeLines(mesh);
        const outPositions: number[] = [];
        const outIndices: number[] = [];
        for (let i = 0; i < lines.indices.length; i += 2) {
          const a = lines.indices[i]!;
          if (lines.featureIds[a] !== sel.index) {
            continue;
          }
          for (const v of [a, lines.indices[i + 1]!]) {
            outIndices.push(outPositions.length / 3);
            outPositions.push(...lines.positions.subarray(v * 3, v * 3 + 3));
          }
        }
        if (outIndices.length > 0) {
          const draw = world.addDraw({
            mesh: world.addMesh({
              positions: Float32Array.from(outPositions),
              indices: Uint32Array.from(outIndices),
              featureIds: new Uint32Array(outPositions.length / 3).fill(
                sel.index,
              ),
              featureCount: Math.max(1, sel.shape.form.edgeVertices.length / 2),
              topology: "line-list",
            }),
            origin,
            model: prep.model,
            material: lineMaterial,
            color: SELECT_COLOR,
            name: `${sel.shape.name}: selected edge`,
          });
          selectionDraws.push(draw);
          parts.set(draw.index, { shape: sel.shape, kind: "edge" });
        }
      }
    }
    showSelection();
    engine.requestRender();
  };

  /** The tint of a shape's face as drawn: by what its surface is, or a light grey each. */
  const faceColor = (shape: Shape, face: number) =>
    settings.byKind
      ? kindColors[shape.form.surfaceIdentity[shape.form.faceSurface[face]!]!]!
      : tint(face);
  /** A shape's face colours as the GPU draws read them: texel `face` is its colour (linear, as stored). */
  const paletteOf = (shape: Shape) => {
    const faces = shape.form.faceSurface.length;
    const image = new ImageData(
      PALETTE_WIDTH,
      Math.max(1, Math.ceil(faces / PALETTE_WIDTH)),
    );
    for (let face = 0; face < faces; face++) {
      const [r, g, b] = faceColor(shape, face);
      image.data.set(
        [r, g, b, 1].map((v) => Math.round(v * 255)),
        face * 4,
      );
    }
    return image;
  };
  /** Colours a draw of a b-rep by face: its feature IDs index the palette, from the draw's first one. */
  const paletteShader = (shape: Shape, draw: DrawHandle) =>
    new CustomShader({
      fragment: PALETTE_WGSL,
      uniforms: {
        base: { type: "u32", value: world.featureIdOf(draw) },
        palette: {
          type: "texture2d",
          value: paletteOf(shape),
          nearest: true,
          clamp: true,
        },
      },
      label: `${shape.name}: face colours`,
    });
  /** Takes a b-rep's draws, meshes and transforms out of the world. */
  const releaseBreps = () => {
    for (const { handle } of breps) {
      world.removeBrep(handle);
    }
    breps = [];
    brepsFor = "";
    stats.gpu.prepareMs = 0;
    stats.gpu.failed = [];
  };
  /** A shape's faces by `World.addBrep`, placed as the CPU draws are, and coloured by face. */
  const addGpuFaces = (shape: Shape, stand: number) => {
    const start = performance.now();
    try {
      const handle = world.addBrep(shape.form, {
        origin,
        model: toWorld(
          mat4.multiply(
            mat4.mat4(),
            translation(shape.x, shape.y, stand),
            mat4.fromScale(mat4.mat4(), shape.scale, shape.scale, shape.scale),
          ),
        ),
        material: facesMaterial,
        color: [1, 1, 1, 1],
        doubleSided: shape.doubleSided,
        name: `${shape.name}: face`,
        errorPixels: settings.pixels,
        // The CPU mesh of any faces the GPU path doesn't draw yet.
        cpuTolerance: OVERLAY_TOLERANCE / shape.scale,
        // From the kernel's worker when the shape came from one.
        ...(patchesFromKernel(shape.form)
          ? { prepared: patchesFromKernel(shape.form)! }
          : {}),
      });
      stats.gpu.prepareMs += performance.now() - start;
      // Each draw of the solid (the complete faces, the trimmed ones, the CPU mesh) reads its own palette.
      for (const draw of [handle.patches, handle.trimmed, handle.mesh]) {
        if (draw) {
          world.setDrawShader(draw, paletteShader(shape, draw));
        }
      }
      breps.push({ shape, handle });
    } catch (error) {
      console.warn(`drawing ${shape.name} on the GPU:`, error);
      stats.gpu.failed.push(shape.name);
    }
  };

  /**
   * GPU mode: how the display mode and the iso toggle show on the faces,
   * as fragment-stage display of each patch draw (`World.setPatchDisplay`):
   * the wireframe is the dice grid itself, so it changes with the view.
   */
  const applyDisplay = () => {
    if (!settings.gpu) {
      return;
    }
    const display = {
      wire: settings.mode !== "shaded",
      flat: settings.mode === "flatWire",
      linesOnly: settings.mode === "wire",
      iso: settings.iso ? ISO_DIVISIONS : false,
    };
    for (const { handle } of breps) {
      for (const draw of [handle.patches, handle.trimmed]) {
        if (draw) {
          world.setPatchDisplay(draw, display);
        }
      }
    }
    engine.requestRender();
  };

  const build = () => {
    for (const d of draws) {
      world.removeDraw(d);
    }
    draws = [];
    parts.clear();
    stats.triangles = 0;
    stats.wireLines = 0;
    stats.edgeLines = 0;
    stats.isoLines = 0;
    stats.whiskers = 0;
    const showFaces = settings.mode !== "wire";
    const showWire = settings.mode !== "shaded";
    // GPU mode: every mode's faces come from the GPU, and its wireframe, flat
    // shading and iso lines are drawn by the fragment stage from each view's
    // dice (`applyDisplay`). The CPU mode builds triangles and lines of its own.
    const gpuFaces = settings.gpu;
    if (!gpuFaces || brepsFor !== String(settings.byKind)) {
      releaseBreps();
    }
    brepsFor = gpuFaces ? String(settings.byKind) : "";
    shapes.forEach((shape, s) => {
      if (
        settings.gpu &&
        (settings.normals ||
          (selection?.kind === "face" && selection.shape === shape))
      ) {
        withFaces(s);
      }
      const prep = prepared[s];
      if (!prep) {
        return;
      }
      const mesh = prep.mesh;
      // Relative positions, then the mesh's own centre, then scaled, then
      // stood on the ground at the shape's place.
      const centre = mesh.origin;
      const lift = -prep.floor * shape.scale;
      prep.stand = lift;
      const place = translation(shape.x, shape.y, lift);
      // place · scale · translate(centre)
      const model = (prep.model = toWorld(
        mat4.multiply(
          mat4.mat4(),
          place,
          mat4.multiply(
            mat4.mat4(),
            mat4.fromScale(mat4.mat4(), shape.scale, shape.scale, shape.scale),
            translation(centre[0]!, centre[1]!, centre[2]!),
          ),
        ),
      ));

      if (gpuFaces) {
        if (!breps.some((b) => b.shape === shape)) {
          addGpuFaces(shape, lift);
        }
        const made = breps.find((b) => b.shape === shape);
        for (const draw of [
          made?.handle.patches,
          made?.handle.trimmed,
          made?.handle.mesh,
        ]) {
          if (draw) {
            parts.set(draw.index, { shape, kind: "face" });
          }
        }
      } else if (showFaces && mesh.faces.indices.length > 0) {
        const source =
          settings.mode === "flatWire"
            ? (prep.flat ??= flatFaces(mesh))
            : mesh.faces;
        const count = source.positions.length / 3;
        const colors = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
          colors.set([...faceColor(shape, source.featureIds[i]!), 1], i * 4);
        }
        const data: MeshData = {
          positions: source.positions,
          normals: source.normals,
          indices: source.indices,
          colors,
          featureIds: source.featureIds,
          featureCount: Math.max(1, shape.form.faceSurface.length),
        };
        const draw = world.addDraw({
          mesh: world.addMesh(data),
          origin,
          model,
          material: facesMaterial,
          color: [1, 1, 1, 1],
          doubleSided: shape.doubleSided,
          name: `${shape.name}: face`,
        });
        draws.push(draw);
        parts.set(draw.index, { shape, kind: "face" });
        stats.triangles += mesh.faces.indices.length / 3;
      }
      if (!gpuFaces && showWire && mesh.faces.indices.length > 0) {
        const wire = (prep.wire ??= wireLines(mesh, prep.lift));
        const data: MeshData = {
          positions: wire.positions,
          indices: wire.indices,
          featureIds: wire.featureIds,
          featureCount: Math.max(1, shape.form.faceSurface.length),
          topology: "line-list",
        };
        const draw = world.addDraw({
          mesh: world.addMesh(data),
          origin,
          model,
          material: lineMaterial,
          color: settings.mode === "wire" ? WIRE_DARK : WIRE_MID,
          name: `${shape.name}: wireframe`,
        });
        draws.push(draw);
        // A wire line is part of its face: picking it picks the face.
        parts.set(draw.index, { shape, kind: "face" });
        stats.wireLines += wire.indices.length / 2;
      }
      if (settings.edges && mesh.edges.indices.length > 0) {
        const edges = (prep.edges ??= edgeLines(mesh));
        const data: MeshData = {
          positions: edges.positions,
          indices: edges.indices,
          featureIds: edges.featureIds,
          featureCount: Math.max(1, shape.form.edgeVertices.length / 2),
          topology: "line-list",
        };
        const draw = world.addDraw({
          mesh: world.addMesh(data),
          origin,
          model,
          material: lineMaterial,
          color: EDGE_COLOR,
          name: `${shape.name}: edge`,
        });
        draws.push(draw);
        parts.set(draw.index, { shape, kind: "edge" });
        stats.edgeLines += edges.indices.length / 2;
      }
      const lineDraw = (
        lines: LineMesh,
        color: [number, number, number, number],
        name: string,
      ) => {
        const data: MeshData = {
          positions: lines.positions,
          indices: lines.indices,
          featureIds: lines.featureIds,
          featureCount: Math.max(1, shape.form.faceSurface.length),
          topology: "line-list",
        };
        const draw = world.addDraw({
          mesh: world.addMesh(data),
          origin,
          model,
          material: lineMaterial,
          color,
          name: `${shape.name}: ${name}`,
        });
        draws.push(draw);
        // These lines belong to faces: picking one picks its face.
        parts.set(draw.index, { shape, kind: "face" });
        return lines.indices.length / 2;
      };
      if (settings.iso && !gpuFaces) {
        const iso = (prep.iso ??= isoLines(shape.form, mesh.origin, prep.lift));
        stats.isoLines += lineDraw(iso, ISO_COLOR, "iso lines");
      }
      if (settings.normals && mesh.faces.indices.length > 0) {
        const whiskers = (prep.whiskers ??= normalWhiskers(
          mesh,
          WHISKER_BUDGET / shapes.length,
          prep.size * WHISKER_LENGTH,
        ));
        stats.whiskers += lineDraw(whiskers, WHISKER_COLOR, "normals");
      }
    });
    applyDisplay();
    applySelection();
  };
  tessellate();
  build();

  // Frames the scene from its middle, Earth-fixed: the gallery's 3 × 3, the
  // kernels' 2 × 3, or the STEP part.
  const frame = () => {
    const part = scene === "step" ? stepScene?.framing : undefined;
    viewer.zoomTo(
      {
        center: part
          ? vec3.add(
              vec3.vec3(),
              origin,
              mat4.transformPoint(
                vec3.vec3(),
                enu,
                vec3.vec3(0, 0, part.height),
              ),
            )
          : vec3.add(vec3.vec3(), origin, vec3.vec3(0, 0, 0.6)),
        radius: part ? part.radius * 0.8 : scene === "gallery" ? 6.8 : 6.2,
      },
      0,
      -42 * DEG,
    );
  };
  frame();
  viewer.setSun(150, 40);

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  // ---------------------------------------------------- the display modes
  // A toolbar over the view, as a viewport in a DCC tool has. The keys 1 to 4
  // work while the view has focus.
  const view_ = viewer.container;
  const style = el("style", { textContent: TOOLBAR_CSS });
  const previousTabIndex = view_.getAttribute("tabindex");
  if (previousTabIndex === null) {
    view_.tabIndex = 0;
  }
  view_.classList.add("bf-view");
  const toolbar = el("div", {
    className: "bf-toolbar",
    role: "toolbar",
    ariaLabel: "Display mode",
  });
  const modeButtons = MODES.map((mode, i) => {
    const button = el("button", {
      type: "button",
      ariaLabel: mode.label,
    });
    button.innerHTML = mode.icon;
    button.dataset.tip = `${mode.label} (${i + 1})`;
    button.title = `${mode.label} (${i + 1})`;
    button.addEventListener("click", () => setMode(mode.id));
    return button;
  });
  toolbar.append(...modeButtons);
  const syncButtons = () => {
    MODES.forEach((mode, i) => {
      modeButtons[i]!.setAttribute(
        "aria-pressed",
        String(mode.id === settings.mode),
      );
    });
  };
  const setMode = (mode: DisplayMode) => {
    if (mode === settings.mode) {
      return;
    }
    settings.mode = mode;
    syncButtons();
    build();
    showStats();
  };
  syncButtons();
  const loadingText = el("span");
  const loading = el(
    "div",
    { className: "bf-loading", role: "status", hidden: true },
    el(
      "div",
      {},
      el("span", { className: "bf-spinner", ariaHidden: "true" }),
      loadingText,
    ),
  );
  view_.append(style, toolbar, loading);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      clearSelection();
      return;
    }
    const target = event.target as HTMLElement;
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      target.tagName === "INPUT"
    ) {
      return;
    }
    const mode = MODES[Number(event.key) - 1];
    if (mode) {
      setMode(mode.id);
    }
  };
  view_.addEventListener("keydown", onKey);

  // ------------------------------------------------------------ the panel
  const check = (
    label: string,
    get: () => boolean,
    set: (v: boolean) => void,
    title?: string,
  ) => {
    const box = el("input", {
      type: "checkbox",
      checked: get(),
      onchange: () => set(box.checked),
    });
    return el("label", title ? { title } : {}, label, box);
  };

  // Tolerance on a log scale: 0.1 mm to 50 mm.
  const MIN_TOLERANCE = 0.0001;
  const SPAN = 500;
  const toleranceOf = (t: number) => MIN_TOLERANCE * Math.pow(SPAN, t);
  const toleranceT = (m: number) =>
    Math.log(m / MIN_TOLERANCE) / Math.log(SPAN);
  const mm = (m: number) => `${(m * 1000).toFixed(m < 0.001 ? 2 : 1)} mm`;

  const toleranceOut = el("output", {}, mm(settings.tolerance));
  const toleranceInput = el("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.001",
    value: String(toleranceT(settings.tolerance)),
    ariaLabel: "Chordal tolerance, millimetres in the scene",
    oninput: () => {
      settings.tolerance = toleranceOf(Number(toleranceInput.value));
      toleranceOut.textContent = mm(settings.tolerance);
      tessellate();
      build();
      showStats();
    },
  });
  const toleranceRow = el(
    "label",
    {
      className: "slider bf-tolerance",
      title:
        "Millimetres in the scene: each shape is tessellated at the tolerance divided by the scale it's drawn at.",
    },
    "Tolerance",
    toleranceInput,
    toleranceOut,
  );

  // The GPU's error target on a log scale: a quarter of a pixel to 4.
  const pixelsOf = (t: number) =>
    MIN_PIXELS * Math.pow(MAX_PIXELS / MIN_PIXELS, t);
  const pixelsT = (px: number) =>
    Math.log(px / MIN_PIXELS) / Math.log(MAX_PIXELS / MIN_PIXELS);
  const px = (v: number) => `${v.toFixed(2)} px`;
  const pixelsOut = el("output", {}, px(settings.pixels));
  const pixelsInput = el("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.001",
    value: String(pixelsT(settings.pixels)),
    ariaLabel: "Error target of the GPU's dicing, pixels",
    oninput: () => {
      settings.pixels = pixelsOf(Number(pixelsInput.value));
      pixelsOut.textContent = px(settings.pixels);
      for (const { handle } of breps) {
        for (const draw of [handle.patches, handle.trimmed]) {
          if (draw) {
            world.setPatchErrorPixels(draw, settings.pixels);
          }
        }
      }
      showStats();
    },
  });
  const pixelsRow = el(
    "label",
    {
      className: "slider bf-tolerance",
      title:
        "The most a diced cell may leave between its triangles and the surface, in pixels on screen: each view dices to it, so zooming in refines.",
    },
    "Error",
    pixelsInput,
    pixelsOut,
  );
  const tessellationNote = el("small", {});
  /** The cells and triangles the view's dice made right now, live (`World.readPatchStats`). */
  const liveOut = el("output", {}, "…");
  const liveRow = el(
    "div",
    {
      className: "bf-live",
      title:
        "What the GPU diced for the view in its last frame: it changes as the camera moves, and the wireframe draws exactly these cells.",
    },
    "In this view: ",
    liveOut,
  );
  const tessellatorButtons = (["GPU", "CPU"] as const).map((name) =>
    el("button", {
      type: "button",
      textContent: name,
      title:
        name === "GPU"
          ? "World.addBrep: every face diced per view on the GPU to an error in pixels."
          : "tessellateBrep: one mesh on the CPU at a chordal tolerance in millimetres.",
      onclick: () => setTessellator(name === "GPU"),
    }),
  );
  const syncTessellator = () => {
    tessellatorButtons.forEach((button, i) => {
      button.setAttribute("aria-pressed", String((i === 0) === settings.gpu));
    });
    pixelsRow.hidden = !settings.gpu;
    toleranceRow.hidden = settings.gpu;
    tessellationNote.textContent = settings.gpu
      ? `The wireframe, flat shading and iso lines are drawn by the GPU from each view's dice grid, so the cells change as the camera moves. B-rep edges, normals and the selected face are CPU geometry at ${OVERLAY_TOLERANCE * 1000} mm.`
      : "";
    tessellationNote.hidden = !settings.gpu;
    liveRow.hidden = !settings.gpu;
  };
  const setTessellator = (gpu: boolean) => {
    if (gpu === settings.gpu) {
      return;
    }
    settings.gpu = gpu;
    syncTessellator();
    const change = () => {
      releaseBreps();
      overlayEdges.clear();
      overlayFaces.clear();
      tessellate();
      build();
      showStats();
    };
    if (gpu) {
      void settle("Compiling shaders and dicing the faces…", change);
    } else {
      change();
    }
  };

  // The tessellation's numbers, folded to one line.
  const statsSummary = el("summary");
  const statsOut = el("dl");
  /** The STEP part's tessellation: what drew it and what it cost, which moves with the controls. */
  const stepTessellateOut = el("span");
  const stepDrawnOut = el("span");
  /** The GPU's time in the passes that dice and draw, smoothed by the engine. */
  const gpuTimeOut = el("dd");
  /** What the view's dice made, read back from the GPU (`World.readPatchStats`, engine-internal). */
  const gpuCountsOut = el("dd");
  let countsPending = false;
  const showGpuCounts = () => {
    if (countsPending || breps.length === 0) {
      return;
    }
    countsPending = true;
    world
      .readPatchStats()
      .then((draws) => {
        const diced = draws.filter((d) => d.diced);
        if (diced.length === 0) {
          gpuCountsOut.textContent =
            "no view has diced these yet (waiting for a frame, or none shows them)";
          liveOut.textContent = "waiting for a frame…";
          return;
        }
        const sum = (f: (d: (typeof draws)[number]) => number) =>
          diced.reduce((n, d) => n + f(d), 0);
        const cells = sum((d) => d.cells);
        liveOut.textContent =
          cells > 0
            ? `${cells.toLocaleString()} cells, ${sum((d) => d.triangles).toLocaleString()} triangles`
            : "nothing diced";
        gpuCountsOut.textContent =
          cells > 0
            ? `${cells.toLocaleString()} cells, ${sum((d) => d.triangles).toLocaleString()} triangles in ${sum((d) => d.chunks).toLocaleString()} chunks of 4 × 4; ${sum((d) => d.vertices).toLocaleString()} vertex invocations (${(sum((d) => d.vertices) / cells).toFixed(1)} a cell)${sum((d) => d.chunksAsked - d.chunks) > 0 ? "; chunk list full: raise maxChunks" : ""}`
            : "nothing diced in this view";
      })
      .catch((error: unknown) => {
        gpuCountsOut.textContent = `not read: ${error instanceof Error ? error.message : String(error)}`;
      })
      .finally(() => {
        countsPending = false;
      });
  };
  const showGpuTime = () => {
    const passes = engine.gpuPasses;
    const ms = (name: string) =>
      passes[name] !== undefined ? `${passes[name]!.toFixed(2)} ms` : undefined;
    const cull = ms("cull");
    const dice = ms("dice");
    const opaque = ms("opaque");
    gpuTimeOut.textContent =
      cull && opaque
        ? `${cull} cull, ${dice ?? "no"} dice, ${opaque} opaque pass (whole scene)`
        : "not measured: needs the timestamp-query feature";
    showGpuCounts();
  };
  /** GPU mode: what `addBrep` made, summed over the shapes. */
  const gpuSums = () => {
    const sums = {
      faces: 0,
      cpuFaces: 0,
      cpuTriangles: 0,
      spans: 0,
      unsupported: [] as string[],
    };
    for (const { shape, handle } of breps) {
      sums.faces += handle.gpuFaces.length;
      sums.cpuFaces += handle.cpuFaces.length;
      for (const mesh of handle.meshes) {
        const patches = (mesh as { patches?: { spans: number } }).patches;
        if (patches) {
          sums.spans += patches.spans;
        } else {
          sums.cpuTriangles += mesh.indexCount / 3;
        }
      }
      for (const { face, reason } of handle.unsupported) {
        sums.unsupported.push(`${shape.name}, face ${face}: ${reason}`);
      }
    }
    return sums;
  };
  const showStats = () => {
    const lines =
      stats.wireLines + stats.edgeLines + stats.isoLines + stats.whiskers;
    const linesOut = el(
      "dd",
      {},
      lines.toLocaleString(),
      el(
        "small",
        {},
        ` (${[
          [stats.wireLines, "wireframe"],
          [stats.edgeLines, "B-rep edges"],
          [stats.isoLines, "iso lines"],
          [stats.whiskers, "normals"],
        ]
          .filter(([n]) => (n as number) > 0)
          .map(([n, what]) => `${(n as number).toLocaleString()} ${what}`)
          .join(", ")})`,
      ),
    );
    if (settings.gpu) {
      const sums = gpuSums();
      const total = sums.faces + sums.cpuFaces;
      const drawn = breps.length > 0;
      const cpuTriangles = drawn ? sums.cpuTriangles : stats.triangles;
      stepTessellateOut.textContent = drawn
        ? `prepare ${stats.gpu.prepareMs.toFixed(0)} ms, edges ${stats.ms.toFixed(0)} ms`
        : `edges and bounds ${stats.ms.toFixed(0)} ms`;
      stepDrawnOut.textContent = drawn
        ? `GPU, ${sums.faces} of ${total} faces diced per view${sums.cpuFaces > 0 ? `, ${sums.cpuFaces} on a CPU mesh` : ""}`
        : "no faces on the GPU";
      statsSummary.textContent = drawn
        ? `${sums.faces} faces on the GPU, ${sums.cpuFaces} on the CPU, error ≤ ${px(settings.pixels)}`
        : "no faces on the GPU";
      showGpuTime();
      statsOut.replaceChildren(
        ...(drawn
          ? [
              ...row(
                "On the GPU",
                `${sums.faces} of ${total} faces, ${sums.spans.toLocaleString()} spans`,
              ),
              ...row(
                "On a CPU mesh",
                sums.cpuFaces > 0
                  ? `${sums.cpuFaces} faces, ${cpuTriangles.toLocaleString()} triangles at ≤ ${OVERLAY_TOLERANCE * 1000} mm`
                  : "none",
              ),
              ...(sums.unsupported.length > 0
                ? row("Not on the GPU", sums.unsupported.join("; "))
                : []),
              ...(stats.gpu.failed.length > 0
                ? row("Failed", stats.gpu.failed.join(", "))
                : []),
              ...row(
                "CPU prepare",
                `${stats.gpu.prepareMs.toFixed(1)} ms in addBrep for ${breps.length} shapes, edges and bounds ${stats.ms.toFixed(1)} ms`,
              ),
              el("dt", {}, "GPU time"),
              gpuTimeOut,
              el("dt", {}, "Cells, triangles"),
              gpuCountsOut,
              ...row(
                "Error target",
                `${px(settings.pixels)} on screen, per view`,
              ),
            ]
          : row(
              "Faces",
              "none on the GPU (drawing them failed: see the console)",
            )),
        el("dt", {}, "Lines"),
        linesOut,
      );
      return;
    }
    stepTessellateOut.textContent = `tessellate ${stats.ms.toFixed(0)} ms`;
    stepDrawnOut.textContent = `CPU, ${stats.triangles.toLocaleString()} triangles at ≤ ${mm(stats.error)}`;
    statsSummary.textContent = `${stats.triangles.toLocaleString()} triangles, ${stats.ms.toFixed(0)} ms, error ${
      stats.capped.length > 0
        ? `${mm(stats.error)} (over)`
        : `≤ ${mm(stats.error)}`
    }`;
    statsOut.replaceChildren(
      el("dt", {}, "Triangles"),
      el("dd", {}, stats.triangles.toLocaleString()),
      el("dt", {}, "Lines"),
      linesOut,
      el("dt", {}, "tessellateBrep"),
      el("dd", {}, `${stats.ms.toFixed(1)} ms for ${shapes.length} shapes`),
      el("dt", {}, "Chordal error"),
      el(
        "dd",
        {},
        stats.capped.length > 0
          ? `${mm(stats.error)} on screen, over the tolerance: the grid cap binds on ${stats.capped.join(", ")}`
          : `${mm(stats.error)} on screen, within the tolerance`,
      ),
    );
  };
  // The engine smooths the pass times as frames render: the panel follows.
  const gpuTimer = setInterval(() => {
    if (settings.gpu && breps.length > 0) {
      showGpuTime();
    }
  }, 500);

  // The legend of the surface kinds, with how many faces of each are in view.
  const legend = el("ul", {
    hidden: true,
    className: "bf-legend",
    ariaLabel: "Surface kinds",
  });
  const renderLegend = () => {
    legend.replaceChildren();
    KIND_NAMES.forEach((name, kind) => {
      const faces = shapes.reduce(
        (n, shape) =>
          n +
          [...shape.form.faceSurface].filter(
            (surface) => shape.form.surfaceIdentity[surface] === kind,
          ).length,
        0,
      );
      if (faces === 0) {
        return;
      }
      const swatch = el("span", {
        ariaHidden: "true",
        style: `display:inline-block;width:12px;height:12px;border-radius:3px;margin-inline-end:8px;vertical-align:-1px;background:${KIND_COLORS[kind]};box-shadow:inset 0 0 0 1px rgb(0 0 0 / 0.35)`,
      });
      legend.append(
        el("li", {}, swatch, `${name}, ${faces} face${faces === 1 ? "" : "s"}`),
      );
    });
  };
  const toggle = (
    label: string,
    key: "byKind" | "iso" | "normals",
    title: string,
  ): HTMLLabelElement =>
    check(
      label,
      () => settings[key],
      (on) => {
        settings[key] = on;
        legend.hidden = !settings.byKind;
        const change = () => {
          build();
          showStats();
        };
        // New colours are new draws, with palettes to load: behind the overlay.
        if (key === "byKind" && settings.gpu) {
          void settle("Colouring the faces…", change);
        } else {
          change();
        }
      },
      title,
    );

  // What's in the scene: the gallery's shapes, or the kernels side by side.
  const mark = (ok: boolean, text: string) =>
    el("span", { className: ok ? "bf-ok" : "bf-bad" }, text);
  const row = (label: string, ...value: Array<Node | string>) => [
    el("dt", {}, label),
    el("dd", {}, ...value),
  ];
  const problemList = (shape: Shape) => {
    const list = el("ul");
    for (const problem of problemsOf(shape)) {
      list.append(
        el(
          "li",
          {},
          `${problem.kind}, ${problem.entity} ${problem.index}: ${problem.message}`,
        ),
      );
    }
    return list;
  };
  const shapesOut = el("div");
  const renderGallery = () => {
    const body = el("tbody");
    for (const shape of shapes) {
      const problems = problemsOf(shape);
      body.append(
        el(
          "tr",
          { title: shape.note ?? "" },
          el(
            "td",
            {},
            shape.name,
            el("small", { className: "bf-place" }, shape.place),
          ),
          el("td", {}, String(shape.form.faceSurface.length)),
          el(
            "td",
            {},
            problems.length === 0
              ? mark(true, "valid")
              : mark(false, `${problems.length} problems`),
          ),
        ),
      );
    }
    const broken = shapes.filter((s) => problemsOf(s).length > 0);
    shapesOut.replaceChildren(
      el(
        "table",
        { className: "bf-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            el("th", {}, "Shape"),
            el("th", {}, "Faces"),
            el("th", {}, "Form"),
          ),
        ),
        body,
      ),
      ...broken.map((shape) =>
        el(
          "details",
          {},
          el("summary", {}, `${shape.name}: problems`),
          problemList(shape),
        ),
      ),
    );
  };
  /** "6 planes, 1 cylinder as Bézier": the faces of some forms by what their surface is, and held as patches. */
  const kindsOf = (forms: readonly BrepForm[]) => {
    const counts = new Map<number, number>();
    for (const form of forms) {
      for (const surface of form.faceSurface) {
        const patches =
          form.surfaceKind[surface] === SurfaceKind.Bezier &&
          form.surfaceIdentity[surface] !== SurfaceKind.Bezier;
        const key = form.surfaceIdentity[surface]! * 2 + (patches ? 1 : 0);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts]
      .sort((a, b) => a[0] - b[0])
      .map(([key, n]) => {
        const name = KIND_NAMES[key >> 1] ?? "?";
        // Bézier is a name; the others are words.
        const word = name === "Bézier" ? name : name.toLowerCase();
        const plural =
          n === 1 || word === "Bézier"
            ? word
            : word === "torus"
              ? "tori"
              : `${word}s`;
        return `${n} ${plural}${key & 1 ? " as Bézier" : ""}`;
      })
      .join(", ");
  };
  const renderKernels = () => {
    const ks = kernelScene;
    if (!ks) {
      return;
    }
    const body = el("tbody");
    for (const recipe of RECIPES) {
      const cells = KERNELS.map((kernel) => {
        const result = ks.results.find(
          (r) => r.recipe === recipe && r.kernel === kernel,
        );
        const shape = ks.shapes.find(
          (s) => s.kernel === kernel && s.name === recipe.name,
        );
        if (!result?.form || !shape) {
          return el(
            "td",
            {},
            mark(false, "failed"),
            el("small", {}, result?.problem ?? ""),
          );
        }
        const problems = problemsOf(shape);
        return el(
          "td",
          {},
          `${result.booleanMs!.toFixed(1)} + ${result.convertMs!.toFixed(1)} ms `,
          problems.length === 0 ? mark(true, "✓") : mark(false, "✗"),
          el("small", {}, kindsOf([result.form])),
        );
      });
      body.append(
        el("tr", {}, el("th", { scope: "row" }, recipe.name), ...cells),
      );
    }
    const loads = ks.loads
      .map((l) =>
        l.ms !== undefined
          ? `${l.kernel} loaded in ${l.ms.toFixed(0)} ms`
          : `${l.kernel} ${l.problem}`,
      )
      .join("; ");
    const broken = ks.shapes.filter((s) => problemsOf(s).length > 0);
    shapesOut.replaceChildren(
      el(
        "table",
        { className: "bf-table" },
        el(
          "caption",
          {},
          `Boolean + conversion to the render form, then the faces by what their surface is (as Bézier when held as patches); ✓ is a valid form. ${loads}.`,
        ),
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            el("th", {}, ""),
            ...KERNELS.map((k) => el("th", { scope: "col" }, k)),
          ),
        ),
        body,
      ),
      ...broken.map((shape) =>
        el(
          "details",
          {},
          el("summary", {}, `${shape.name}, ${shape.kernel}: problems`),
          problemList(shape),
        ),
      ),
    );
  };
  /** The STEP scene's panel: what came in from the file, what it took, and whether the form is valid. */
  const renderStep = () => {
    const ss = stepScene;
    if (!ss) {
      return;
    }
    if (!ss.load) {
      shapesOut.replaceChildren(
        el("p", { className: "bf-bad" }, ss.problem ?? "Nothing to show."),
      );
      return;
    }
    const { load } = ss;
    const forms = ss.shapes.map((shape) => shape.form);
    const faces = forms.reduce((n, form) => n + form.faceSurface.length, 0);
    const broken = ss.shapes.filter((shape) => problemsOf(shape).length > 0);
    const problems = broken.reduce(
      (n, shape) => n + problemsOf(shape).length,
      0,
    );
    const { min, max } = unionBounds(forms.map(boundsOfForm));
    const scale = ss.shapes[0]?.scale ?? 1;
    const ms = (t: number) => `${t.toFixed(0)} ms`;
    const list = el("dl");
    list.append(
      ...row("File", `${load.file}, ${(load.bytes / 1024).toFixed(1)} KiB`),
      ...row("Solids", String(ss.shapes.length)),
      ...row("Faces", `${faces}: ${kindsOf(forms)}`),
      ...row(
        "Size",
        `${[0, 1, 2].map((k) => ((max[k]! - min[k]!) * 1000).toFixed(0)).join(" × ")} mm`,
        el("small", {}, ` (drawn ×${scale.toFixed(1)})`),
      ),
      ...row(
        "Form",
        problems === 0
          ? mark(true, "✓ valid")
          : mark(false, `✗ ${problems} problems`),
      ),
      ...row("Drawn by", stepDrawnOut),
      ...row(
        "Times",
        `${load.loadMs > 0 ? `load Open CASCADE ${ms(load.loadMs)}, ` : ""}fetch ${ms(load.fetchMs)}, import ${ms(load.importMs)}, convert ${ms(load.convertMs)}, `,
        stepTessellateOut,
      ),
    );
    shapesOut.replaceChildren(
      list,
      ...broken.map((shape) =>
        el(
          "details",
          {},
          el("summary", {}, `${shape.name}: problems`),
          problemList(shape),
        ),
      ),
      el(
        "p",
        {},
        el(
          "small",
          {},
          "NIST MBE PMI test model, public domain (",
          el(
            "a",
            {
              href: "https://www.nist.gov/open/license",
              target: "_blank",
              rel: "noreferrer",
            },
            "NIST open licence",
          ),
          "), ",
          el(
            "a",
            {
              href: "https://doi.org/10.18434/mds2-1452",
              target: "_blank",
              rel: "noreferrer",
            },
            "doi:10.18434/mds2-1452",
          ),
          ". PMI (GD&T annotations) is not shown.",
        ),
      ),
    );
  };
  const renderShapes = () =>
    scene === "gallery"
      ? renderGallery()
      : scene === "kernels"
        ? renderKernels()
        : renderStep();

  // The scene switch.
  const SCENES: Record<SceneName, { label: string; note: string }> = {
    gallery: {
      label: "Gallery",
      note: "Nine b-reps written with BrepBuilder, the last read back through the draft BENTLEY_brep glTF extension.",
    },
    kernels: {
      label: "Two kernels",
      note: "Each boolean made live by SMLib (west) and Open CASCADE (east) in WebAssembly, converted to the same render form. A picked face says which input it came from.",
    },
    step: {
      label: "STEP file",
      note: "A real CAD part from NIST, imported from its STEP file by Open CASCADE in WebAssembly and converted to the same render form.",
    },
  };
  const sceneNote = el("p");
  const sceneButtons = (Object.keys(SCENES) as SceneName[]).map((name) =>
    el("button", {
      type: "button",
      textContent: SCENES[name].label,
      onclick: () => void setScene(name),
    }),
  );
  const stepSelect = el(
    "select",
    { onchange: () => void showStep(Number(stepSelect.value)) },
    ...STEP_SAMPLES.map((sample, i) =>
      el("option", { value: String(i) }, sample.name),
    ),
  );
  const stepAbout = el("p");
  const stepPicker = el(
    "div",
    { hidden: true },
    el("label", {}, "Model", stepSelect),
    stepAbout,
  );
  const syncScene = () => {
    sceneButtons.forEach((button, i) => {
      button.setAttribute(
        "aria-pressed",
        String((Object.keys(SCENES) as SceneName[])[i] === scene),
      );
    });
    sceneNote.textContent = SCENES[scene].note;
    stepPicker.hidden = scene !== "step";
    stepAbout.textContent = STEP_SAMPLES[stepChoice]?.description ?? "";
    shapesTitle.textContent = scene === "step" ? "Model" : "Shapes";
  };
  const busy = (on: boolean) => {
    for (const button of sceneButtons) {
      button.disabled = on;
    }
    stepSelect.disabled = on;
  };
  /** Makes `next` the scene, drawing its shapes. */
  const show = (next: SceneName) => {
    scene = next;
    shapes =
      next === "gallery"
        ? gallery
        : next === "kernels"
          ? kernelScene!.shapes
          : stepScene!.shapes;
    selection = undefined;
    prepared.length = 0;
    releaseBreps();
    overlayEdges.clear();
    overlayFaces.clear();
    tessellate();
    build();
    syncScene();
    renderShapes();
    renderLegend();
    showStats();
    frame();
  };
  /** Lets the browser paint before the work that follows blocks it; a hidden tab never paints, so it only waits a moment. */
  const nextPaint = () =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 150);
      requestAnimationFrame(() =>
        setTimeout(() => {
          clearTimeout(timer);
          resolve();
        }),
      );
    });
  /** Names the load's stage on the view and waits for it to be painted: for stages that block this thread. */
  const reportStage: StageReporter = async (text) => {
    loadingText.textContent = text;
    await nextPaint();
  };
  /** Names a stage a worker is working on, which doesn't block this thread: nothing to wait for. */
  const workerStage: StageReporter = (text) => {
    loadingText.textContent = text;
  };
  /**
   * Runs a load behind the overlay: the controls off, the view dimmed (the
   * scene it shows stays until the new one replaces it) and a card naming
   * the stage the load is in.
   */
  const loadScene = async (work: (stage: StageReporter) => Promise<void>) => {
    busy(true);
    view_.dataset.loading = "";
    loading.hidden = false;
    try {
      await work(reportStage);
    } finally {
      loading.hidden = true;
      delete view_.dataset.loading;
      busy(false);
    }
  };
  const facesOf = (list: Shape[]) =>
    list.reduce((n, shape) => n + shape.form.faceSurface.length, 0);
  /** Makes a change behind the overlay and keeps it up until the scene shows right. */
  const settle = (text: string, change: () => void) =>
    loadScene(async (stage) => {
      await stage(text);
      if (signal.aborted) {
        return;
      }
      change();
      await untilReady();
    });
  /** Every draw the scene shows now: the faces, their overlays and the selection. */
  const sceneDraws = () => [
    ...draws,
    ...selectionDraws,
    ...breps.flatMap(({ handle }) =>
      [handle.patches, handle.trimmed, handle.mesh].filter(
        (draw): draw is DrawHandle => draw !== undefined,
      ),
    ),
  ];
  /**
   * Resolves once the scene's next frames show it right: its shaders' pipelines
   * compiled and palettes loaded (a face drawn before is the default material,
   * which then pops) and its patches diced (`Engine.whenReady`). Never rejects:
   * a slow or failed pipeline shows what there is after a timeout.
   */
  const untilReady = (): Promise<void> =>
    engine
      .whenReady(view, {
        draws: sceneDraws(),
        signal,
        timeoutMs: READY_TIMEOUT_MS,
      })
      .catch(() => undefined);
  /** `show`, timed and logged, then the wait for the new scene's first right frame, which the overlay covers. */
  const showLoaded = async (next: SceneName, label: string) => {
    const start = performance.now();
    show(next);
    const shownMs = performance.now() - start;
    performance.measure(`brep-first-look: ${label}: show (main thread)`, {
      start,
      duration: shownMs,
    });
    await reportStage("Compiling shaders and dicing the faces…");
    await untilReady();
    console.info(
      `brep-first-look: ${label} shown in ${shownMs.toFixed(0)} ms (GPU prepare ${stats.gpu.prepareMs.toFixed(0)} ms, edges and bounds ${stats.ms.toFixed(0)} ms), first right frame after ${(performance.now() - start - shownMs).toFixed(0)} ms more`,
    );
  };
  /** Imports one of NIST's parts and shows it: the first one loads Open CASCADE. */
  const showStep = async (index: number) => {
    const sample = STEP_SAMPLES[index]!;
    sceneNote.textContent = `Importing ${sample.name} with Open CASCADE (about 23 MB to load the first time)…`;
    await loadScene(async (stage) => {
      const made = await makeStepScene(sample, workerStage);
      if (signal.aborted) {
        return;
      }
      stepChoice = index;
      stepSelect.value = String(index);
      stepScene = made;
      if (made.load) {
        const { load } = made;
        console.info(
          `brep-first-look: ${sample.name}: load Open CASCADE ${load.loadMs.toFixed(0)} ms, fetch ${load.fetchMs.toFixed(0)} ms, import ${load.importMs.toFixed(0)} ms, convert ${load.convertMs.toFixed(0)} ms`,
        );
        await stage(`Preparing ${facesOf(made.shapes)} faces for the GPU…`);
        if (signal.aborted) {
          return;
        }
      }
      await showLoaded("step", sample.name);
    });
  };
  const setScene = async (next: SceneName) => {
    if (next === scene) {
      return;
    }
    if (next === "step") {
      await showStep(stepChoice);
      return;
    }
    if (next === "kernels") {
      await loadScene(async (stage) => {
        if (!kernelScene) {
          sceneNote.textContent =
            "Loading SMLib and Open CASCADE (about 28 MB the first time)…";
          const start = performance.now();
          kernelScene = await makeKernelScene(workerStage);
          console.info(
            `brep-first-look: kernels loaded and run in ${(performance.now() - start).toFixed(0)} ms`,
          );
        }
        if (signal.aborted) {
          return;
        }
        await stage(
          `Preparing ${facesOf(kernelScene.shapes)} faces for the GPU…`,
        );
        if (signal.aborted) {
          return;
        }
        await showLoaded("kernels", "Two kernels");
      });
      return;
    }
    await loadScene(async (stage) => {
      await stage("Compiling shaders and dicing the faces…");
      if (signal.aborted) {
        return;
      }
      await showLoaded(next, "Gallery");
    });
  };

  const picked = el("div", { className: "bf-selection" });
  const shapesTitle = el("h3", {}, "Shapes");

  panel.append(
    el(
      "div",
      {
        className: "bf-segmented",
        role: "group",
        ariaLabel: "Scene",
      },
      ...sceneButtons,
    ),
    sceneNote,
    stepPicker,
    el("h3", {}, "Tessellation"),
    el(
      "div",
      { className: "bf-segmented", role: "group", ariaLabel: "Tessellator" },
      ...tessellatorButtons,
    ),
    pixelsRow,
    liveRow,
    toleranceRow,
    tessellationNote,
    el("h3", {}, "Display"),
    el(
      "div",
      { className: "bf-toggles" },
      check(
        "B-rep edges",
        () => settings.edges,
        (on) => {
          settings.edges = on;
          build();
          showStats();
        },
        "The exact edges, drawn over the faces.",
      ),
      toggle(
        "Colour by kind",
        "byKind",
        "Each face coloured by what its surface is, so a cylinder held as NURBS patches still reads as a cylinder (Okabe–Ito colours, which stay apart under colour blindness).",
      ),
      toggle(
        "Iso lines",
        "iso",
        "8 lines each way across every face, through the exact surface, kept inside the trim (in GPU mode: 8 equal steps of each face's (u, v) rect, drawn live by the GPU).",
      ),
      toggle(
        "Normals",
        "normals",
        "Whiskers along the face normal at a sample of vertices, 5% of the shape's size.",
      ),
    ),
    legend,
    el("details", { className: "bf-stats" }, statsSummary, statsOut),
    shapesTitle,
    shapesOut,
    el("h3", {}, "Selection"),
    picked,
    el(
      "details",
      {},
      el("summary", {}, "About the tessellators"),
      el(
        "p",
        {},
        "GPU: each face is diced per view into cells of a grid in (u, v), sized so a cell leaves at most the error in pixels, and its surface is evaluated in the vertex stage. The wireframe draws those cells (and each cell's triangle diagonal) in the fragment stage, so it changes with the view. Faces the GPU path can't draw yet are meshed on the CPU inside World.addBrep. The edges drawn over the faces are exact.",
      ),
      el(
        "p",
        {},
        "CPU: the small tessellator, not the reference, on a grid in (u, v). A trimmed face's hole is cut by dropping the triangles whose centre falls outside it, so its rim is jagged.",
      ),
    ),
  );
  syncScene();
  syncTessellator();
  renderShapes();
  renderLegend();
  showStats();

  // What the selection says: the face or edge, and for a face the exact
  // point of the surface nearest where it was picked.
  const mmOf = (m: number) => `${(m * 1000).toFixed(3)} mm`;
  const num = (x: number) => x.toFixed(4);
  const triple = (v: ArrayLike<number>) =>
    `(${num(v[0]!)}, ${num(v[1]!)}, ${num(v[2]!)})`;
  showSelection = () => {
    const sel = selection;
    const prep = sel ? prepared[shapes.indexOf(sel.shape)] : undefined;
    if (!sel || !prep) {
      picked.replaceChildren(
        el(
          "p",
          {},
          "Click a face or an edge. A face is highlighted and its exact point is worked out from the surface; an edge is drawn in the selection colour (edges are 1-pixel lines and hard to hit). Esc or a click on empty space clears it.",
        ),
      );
      return;
    }
    const form = sel.shape.form;
    const faces = form.faceSurface.length;
    const id = form.ids[sel.kind === "face" ? sel.index : faces + sel.index];
    const list = el("dl");
    list.append(
      ...row(
        "Shape",
        `${sel.shape.name}${sel.shape.kernel ? `, by ${sel.shape.kernel}` : ""}`,
        el("small", {}, ` (${sel.shape.place})`),
      ),
      ...(sel.shape.note ? row("About it", sel.shape.note) : []),
      ...row(
        sel.kind === "face" ? "Face" : "Edge",
        `${sel.index}${id ? `, ID "${id}"` : ""}`,
      ),
    );
    if (sel.kind === "edge") {
      list.append(
        ...row(
          "Length",
          `${num(edgeLength(prep.mesh, sel.index))} m, from the tessellation`,
        ),
        ...row(
          "Vertices",
          `${form.edgeVertices[sel.index * 2]} to ${form.edgeVertices[sel.index * 2 + 1]}`,
        ),
      );
      picked.replaceChildren(list);
      return;
    }
    const surface = form.faceSurface[sel.index]!;
    const held =
      form.surfaceKind[surface] === SurfaceKind.Bezier &&
      form.surfaceIdentity[surface] !== SurfaceKind.Bezier;
    list.append(
      ...row(
        "Surface",
        `${KIND_NAMES[form.surfaceIdentity[surface]!] ?? "?"}${held ? ", held as Bézier patches" : ""}`,
      ),
      ...(sel.shape.faceSources
        ? row(
            "Made from",
            `${sel.shape.faceSources[sel.index] ?? "?"} `,
            el(
              "small",
              {},
              sel.shape.kernel === "Open CASCADE"
                ? "from OCCT's history of the boolean"
                : "from SMLib's face tags, carried through the boolean",
            ),
          )
        : []),
      ...row(
        "Area",
        `${num(faceArea(prep.mesh, sel.index))} m² `,
        el("small", {}, "from the tessellation"),
      ),
    );
    picked.replaceChildren(list);
    const start = sel.point
      ? nearestVertexUv(prep.mesh, sel.index, sel.point)
      : undefined;
    const exact =
      sel.point && start
        ? nearestOnFace(form, sel.index, sel.point, start)
        : undefined;
    const exactList = el("dl");
    if (exact) {
      exactList.append(
        ...row("Point", `${triple(exact.position)} m`),
        ...row(
          "Normal",
          exact.normal ? triple(exact.normal) : "undefined here (a pole)",
        ),
        ...row("(u, v)", `(${num(exact.u)}, ${num(exact.v)})`),
        ...row(
          "Mesh point off the surface",
          `${mmOf(exact.distance)} in the shape, ${mmOf(exact.distance * sel.shape.scale)} in the scene`,
        ),
        ...row(
          "Newton",
          `${exact.iterations} of at most ${MAX_ITERATIONS} iterations`,
        ),
      );
    }
    picked.append(
      el("h4", {}, "Exact point on the surface (Newton in u, v)"),
      exact ? exactList : el("p", {}, "No depth was read under the pointer."),
      el(
        "p",
        {},
        el(
          "small",
          {},
          "A preview of step 7's exact queries: Gauss–Newton on |S(u, v) − p|² from the nearest tessellation vertex, with the depth buffer's point as p. The mesh distance includes the depth read.",
        ),
      ),
    );
  };
  showSelection();

  /** An Earth-fixed point as b-rep coordinates of a shape, m. */
  const toShape = (ecef: Float64Array, shape: Shape, stand: number) => {
    const local = mat4.transformPoint(
      vec3.vec3(),
      mat4.invertAffine(mat4.mat4(), enu),
      vec3.sub(vec3.vec3(), ecef, origin),
    );
    return [
      (local[0]! - shape.x) / shape.scale,
      (local[1]! - shape.y) / shape.scale,
      (local[2]! - stand) / shape.scale,
    ] as [number, number, number];
  };
  const onPick = async (event: PointerEvent) => {
    const rect = viewer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // The depth is read at the same pixel, in the view's device pixels.
    const scale = viewer.canvas.width / Math.max(1, viewer.canvas.clientWidth);
    const area = view.pixelRect();
    const [result, ecef] = await Promise.all([
      viewer.pick(x, y),
      view.pickPosition(x * scale - area.x, y * scale - area.y),
    ]);
    const info = result ? world.feature(result.featureId) : undefined;
    const part = info ? parts.get(info.draw.index) : undefined;
    if (!info || !part) {
      clearSelection();
      return;
    }
    const prep = prepared[shapes.indexOf(part.shape)];
    selection = {
      shape: part.shape,
      kind: part.kind,
      index: info.localId,
      point: ecef && prep ? toShape(ecef, part.shape, prep.stand) : undefined,
    };
    // A face's overlay and its area come from the CPU mesh's faces, which GPU mode makes now.
    if (part.kind === "face" && withFaces(shapes.indexOf(part.shape))) {
      build();
    } else {
      applySelection();
    }
  };
  const clearSelection = () => {
    if (selection) {
      selection = undefined;
      applySelection();
    }
  };
  // A click, not a drag: the orbit controls own drags.
  let down: { x: number; y: number } | undefined;
  const pointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const pointerUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) {
      void onPick(e);
    }
    down = undefined;
  };
  viewer.container.addEventListener("pointerdown", pointerDown);
  viewer.container.addEventListener("pointerup", pointerUp);

  // The host keeps its start spinner up until `run` returns: the first frame it
  // reveals shows the faces coloured, not in the default material. It holds
  // the view undrawn meanwhile (and the canvas hidden), so the view is drawn
  // here, unseen, for the pipelines to compile and the faces to dice.
  const drawnHidden =
    !view.enabled && viewer.canvas.style.visibility === "hidden";
  if (drawnHidden) {
    view.enabled = true;
  }
  try {
    await untilReady();
  } finally {
    if (drawnHidden) {
      view.enabled = false;
    }
  }

  return () => {
    viewer.container.removeEventListener("pointerdown", pointerDown);
    viewer.container.removeEventListener("pointerup", pointerUp);
    view_.removeEventListener("keydown", onKey);
    view_.classList.remove("bf-view");
    if (previousTabIndex === null) {
      view_.removeAttribute("tabindex");
    }
    style.remove();
    toolbar.remove();
    loading.remove();
    delete view_.dataset.loading;
    clearInterval(gpuTimer);
    kernels.dispose();
    releaseBreps();
    for (const d of [...draws, ...selectionDraws, ...extras]) {
      world.removeDraw(d);
    }
    panel.replaceChildren();
  };
}
