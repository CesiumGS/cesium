import {
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
  flatFaces,
  liftedEdges,
  wireLines,
  type DisplayMode,
  type LineMesh,
} from "./meshes.ts";

/**
 * B-reps, a first look: nine exact CAD shapes held as B-reps (a box, a capped
 * cylinder, a trimmed NURBS face, a sphere, a torus, a cone frustum, a plate
 * with bolt holes, a filleted block with a hole, and the box again through the
 * draft `BENTLEY_brep` glTF extension) on a 3 x 3 grid, tessellated on the
 * CPU for now.
 *
 * A toolbar over the view switches the display mode (keys 1 to 4): shaded,
 * shaded + wireframe, flat + wireframe, wireframe. The panel's analysis views
 * colour faces by surface kind, draw iso lines (kept inside each face's trim)
 * and normal whiskers. A click picks a face or an edge: the face is
 * highlighted and the panel shows the exact point of the surface nearest the
 * pick, found by Gauss-Newton in (u, v), a preview of the exact queries to
 * come.
 *
 * The CPU tessellator is the small, kept one (`tessellateBrep`), not the
 * reference. The slider is its chordal tolerance in millimetres in the scene:
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
}

/** What one shape's tessellation gives, and what the display modes make of it. */
interface Prepared {
  mesh: BrepMesh;
  /** How far lines are lifted off the faces, m in the b-rep's units. */
  lift: number;
  /** The lowest point of the faces, m. */
  lowest: number;
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
}
.bf-view:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }
`;

/** How far lines lift off the faces, as a fraction of a shape's size. */
const LIFT = 0.0025;
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
  viewer.creditsShown = false;
  viewer.setControls("orbit");
  view.background = "color";
  view.clearColor = [0.78, 0.82, 0.88];
  view.lighting.environment = "procedural";
  // A camera set for daylight, so the sunlit shapes read as light grey.
  view.observer.exposure = { ev100: 15 };

  const settings = {
    /** m. */
    tolerance: 0.001,
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
  // A 3 × 3 grid on the ground, 4 m between the middles, the first shape at
  // the top left (north-west) and rows running south. Each shape is drawn at
  // a scale that makes them read together.
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
  const shapes: Shape[] = entries.map((entry, i) => {
    const row = Math.floor(i / 3);
    const column = i % 3;
    return {
      ...entry,
      x: (column - 1) * SPACING,
      y: (1 - row) * SPACING,
      place: `${ROWS[row]} row, ${COLUMNS[column]}`,
    };
  });

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
  for (let i = -half; i <= half; i++) {
    const at = grid.length / 3;
    grid.push(i, -half, 0, i, half, 0, -half, i, 0, half, i, 0);
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
  };
  const prepared: Array<Prepared | undefined> = [];

  const problemsOf = shapes.map((shape) => validateBrep(shape.form));

  // Tessellates every shape: when the tolerance changes.
  const tessellate = () => {
    const start = performance.now();
    stats.error = 0;
    stats.capped = [];
    shapes.forEach((shape, s) => {
      try {
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
        prepared[s] = { mesh, lift: size * LIFT, lowest, size, stand: 0 };
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
        // Lifted further than the drawn edges, so it covers them.
        const lines = liftedEdges(sel.shape.form, mesh, prep.lift * 1.8);
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
    shapes.forEach((shape, s) => {
      const prep = prepared[s];
      if (!prep) {
        return;
      }
      const mesh = prep.mesh;
      // Relative positions, then the mesh's own centre, then scaled, then
      // stood on the ground at the shape's place.
      const centre = mesh.origin;
      const lift = -(prep.lowest + centre[2]!) * shape.scale;
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

      if (showFaces && mesh.faces.indices.length > 0) {
        const source =
          settings.mode === "flatWire"
            ? (prep.flat ??= flatFaces(mesh))
            : mesh.faces;
        const count = source.positions.length / 3;
        const colors = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
          const face = source.featureIds[i]!;
          const tinted = settings.byKind
            ? kindColors[
                shape.form.surfaceKind[shape.form.faceSurface[face]!]!
              ]!
            : tint(face);
          colors.set([...tinted, 1], i * 4);
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
      if (showWire && mesh.faces.indices.length > 0) {
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
        const edges = (prep.edges ??= liftedEdges(shape.form, mesh, prep.lift));
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
      if (settings.iso) {
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
    applySelection();
  };
  tessellate();
  build();

  // The row's middle, Earth-fixed.
  viewer.zoomTo(
    {
      center: vec3.add(vec3.vec3(), origin, vec3.vec3(0, 0, 0.6)),
      radius: 6.8,
    },
    0,
    -42 * DEG,
  );
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
  view_.append(style, toolbar);
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
  ) => {
    const box = el("input", {
      type: "checkbox",
      checked: get(),
      onchange: () => set(box.checked),
    });
    return el("label", {}, label, box);
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
    oninput: () => {
      settings.tolerance = toleranceOf(Number(toleranceInput.value));
      toleranceOut.textContent = mm(settings.tolerance);
      tessellate();
      build();
      showStats();
    },
  });
  const statsOut = el("dl");
  const showStats = () => {
    statsOut.replaceChildren(
      el("dt", {}, "Triangles drawn"),
      el("dd", {}, stats.triangles.toLocaleString()),
      el("dt", {}, "Lines drawn"),
      el(
        "dd",
        {},
        (
          stats.wireLines +
          stats.edgeLines +
          stats.isoLines +
          stats.whiskers
        ).toLocaleString(),
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
      ),
      el("dt", {}, "tessellateBrep took"),
      el("dd", {}, `${stats.ms.toFixed(1)} ms for ${shapes.length} shapes`),
      el("dt", {}, "Largest chordal error on screen"),
      el(
        "dd",
        {},
        stats.capped.length > 0
          ? `${mm(stats.error)}, over the tolerance: the grid cap binds on ${stats.capped.join(", ")}`
          : `${mm(stats.error)}, within the tolerance`,
      ),
    );
  };
  showStats();

  const toggle = (
    label: string,
    key: "byKind" | "iso" | "normals",
  ): HTMLLabelElement =>
    check(
      label,
      () => settings[key],
      (on) => {
        settings[key] = on;
        legend.hidden = !settings.byKind;
        build();
        showStats();
      },
    );
  // The legend of the surface kinds, with how many faces of each are in view.
  const legend = el("ul", { hidden: true, ariaLabel: "Surface kinds" });
  KIND_NAMES.forEach((name, kind) => {
    const faces = shapes.reduce(
      (n, shape) =>
        n +
        [...shape.form.faceSurface].filter(
          (surface) => shape.form.surfaceKind[surface] === kind,
        ).length,
      0,
    );
    const swatch = el("span", {
      ariaHidden: "true",
      style: `display:inline-block;width:12px;height:12px;border-radius:3px;margin-inline-end:8px;vertical-align:-1px;background:${KIND_COLORS[kind]};box-shadow:inset 0 0 0 1px rgb(0 0 0 / 0.35)`,
    });
    legend.append(
      el("li", {}, swatch, `${name}, ${faces} face${faces === 1 ? "" : "s"}`),
    );
  });
  legend.append(
    el(
      "li",
      {},
      el(
        "small",
        {},
        "Okabe–Ito colours, which stay apart under colour blindness.",
      ),
    ),
  );

  const validity = el("ul");
  shapes.forEach((shape, s) => {
    const problems = problemsOf[s]!;
    const item = el(
      "li",
      {},
      el("strong", {}, `${shape.name}`),
      el("small", {}, ` (${shape.place}): `),
      problems.length === 0
        ? "valid"
        : `${problems.length} problem${problems.length === 1 ? "" : "s"}`,
    );
    if (problems.length > 0) {
      const list = el("ul");
      for (const problem of problems) {
        list.append(
          el(
            "li",
            {},
            `${problem.kind}, ${problem.entity} ${problem.index}: ${problem.message}`,
          ),
        );
      }
      item.append(list);
    }
    if (shape.note) {
      item.append(el("br"), el("small", {}, shape.note));
    }
    validity.append(item);
  });

  const picked = el("div", { className: "bf-selection" });

  panel.append(
    el("h3", {}, "Tessellation"),
    el(
      "label",
      { className: "slider" },
      "Chordal tolerance, mm in the scene",
      toleranceInput,
      toleranceOut,
    ),
    el(
      "p",
      {},
      el(
        "small",
        {},
        "Each shape is drawn at a scale and tessellated at the tolerance divided by it, so the slider is millimetres on screen in the scene's units.",
      ),
    ),
    statsOut,
    check(
      "B-rep edges",
      () => settings.edges,
      (on) => {
        settings.edges = on;
        build();
        showStats();
      },
    ),
    el("h3", {}, "Analysis"),
    toggle("Color by surface kind", "byKind"),
    legend,
    toggle("Iso lines", "iso"),
    el(
      "small",
      {},
      "8 lines each way across every face, through the exact surface, kept inside the trim.",
    ),
    toggle("Normals", "normals"),
    el(
      "small",
      {},
      "Whiskers along the face normal at a sample of vertices, 5% of the shape's size.",
    ),
    el("h3", {}, "Shapes, in grid order"),
    validity,
    el("h3", {}, "Selection"),
    picked,
    el(
      "p",
      {},
      "Faces are tessellated on a grid in (u, v) and the trimmed face's hole is cut by dropping triangles whose centre falls outside it, so its rim is jagged; the edges drawn over it are exact. This is the small CPU tessellator, not the reference.",
    ),
  );

  // What the selection says: the face or edge, and for a face the exact
  // point of the surface nearest where it was picked.
  const mmOf = (m: number) => `${(m * 1000).toFixed(3)} mm`;
  const num = (x: number) => x.toFixed(4);
  const triple = (v: ArrayLike<number>) =>
    `(${num(v[0]!)}, ${num(v[1]!)}, ${num(v[2]!)})`;
  const row = (label: string, ...value: Array<Node | string>) => [
    el("dt", {}, label),
    el("dd", {}, ...value),
  ];
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
      ...row("Shape", `${sel.shape.name} (${sel.shape.place})`),
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
    list.append(
      ...row(
        "Surface",
        KIND_NAMES[form.surfaceKind[form.faceSurface[sel.index]!]!] ?? "?",
      ),
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
    applySelection();
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
    for (const d of [...draws, ...selectionDraws, ...extras]) {
      world.removeDraw(d);
    }
    panel.replaceChildren();
  };
}
