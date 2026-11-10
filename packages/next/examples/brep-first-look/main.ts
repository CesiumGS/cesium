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
import { boxBrep, cappedCylinderBrep, trimmedNurbsBrep } from "./fixtures.ts";
import {
  boundsSize,
  flatFaces,
  liftedEdges,
  wireLines,
  type DisplayMode,
  type LineMesh,
} from "./meshes.ts";

/**
 * B-reps, a first look: exact CAD shapes (a box, a capped cylinder, a
 * trimmed NURBS face) held as B-reps and tessellated on the CPU for now,
 * with their edges. A fourth shape, the box again, went through the draft
 * `BENTLEY_brep` glTF extension: written into a GLB, read back, and
 * tessellated from what was read. Tap a face or an edge for its ID.
 *
 * The CPU tessellator is the small, kept one (`tessellateBrep`), not the
 * reference. The slider is its chordal tolerance: the most a triangle may
 * sag from the exact surface. The trimmed face's hole is cut by dropping
 * triangles whose centre falls outside the trim, so it reads jagged; the
 * edges drawn on top hide that.
 *
 * `parseGltf` runs in the engine's worker and is not public, so the glTF
 * shape reads the GLB's JSON and binary chunk here and hands them to
 * `readBrepExtension`, which is what `parseGltf` calls.
 */

const SITE = fromDegrees(-75.1652, 39.9526, 0);
const DEG = Math.PI / 180;

/** A shape in the row: its form, where it stands and how big it is drawn. */
interface Shape {
  name: string;
  form: BrepForm;
  /** East of the layout's middle, m. */
  x: number;
  /** North of the layout's middle, m. */
  y: number;
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
  };

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
  const shapes: Shape[] = [
    { name: "Box", form: box, x: -7.5, y: 0, scale: 1, doubleSided: false },
    {
      name: "Capped cylinder",
      form: cappedCylinderBrep(),
      x: -3,
      y: 0,
      scale: 1,
      doubleSided: false,
    },
    {
      name: "Trimmed NURBS face",
      form: trimmedNurbsBrep(),
      x: 1.5,
      y: 0,
      scale: 0.03,
      doubleSided: true,
      note: "100 m across, drawn at 0.03",
    },
  ];
  if (viaGltf) {
    shapes.push({
      name: "Box via glTF",
      form: viaGltf,
      x: 6,
      y: 0,
      scale: 1,
      doubleSided: false,
      note: gltfNote,
    });
  }

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
    ms: 0,
    error: 0,
  };
  const prepared: Array<Prepared | undefined> = [];

  const problemsOf = shapes.map((shape) => validateBrep(shape.form));

  // Tessellates every shape: when the tolerance changes.
  const tessellate = () => {
    const start = performance.now();
    shapes.forEach((shape, s) => {
      try {
        const mesh = tessellateBrep(shape.form, {
          tolerance: settings.tolerance,
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
        prepared[s] = { mesh, lift: size * LIFT, lowest };
      } catch (error) {
        console.warn(`tessellating ${shape.name}:`, error);
        prepared[s] = undefined;
      }
    });
    stats.ms = performance.now() - start;
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
    stats.error = 0;
    const showFaces = settings.mode !== "wire";
    const showWire = settings.mode !== "shaded";
    shapes.forEach((shape, s) => {
      const prep = prepared[s];
      if (!prep) {
        return;
      }
      const mesh = prep.mesh;
      stats.error = Math.max(stats.error, mesh.error);
      // Relative positions, then the mesh's own centre, then scaled, then
      // stood on the ground at the shape's place.
      const centre = mesh.origin;
      const lift = -(prep.lowest + centre[2]!) * shape.scale;
      const place = translation(shape.x, shape.y, lift);
      // place · scale · translate(centre)
      const model = toWorld(
        mat4.multiply(
          mat4.mat4(),
          place,
          mat4.multiply(
            mat4.mat4(),
            mat4.fromScale(mat4.mat4(), shape.scale, shape.scale, shape.scale),
            translation(centre[0]!, centre[1]!, centre[2]!),
          ),
        ),
      );

      if (showFaces && mesh.faces.indices.length > 0) {
        const source =
          settings.mode === "flatWire"
            ? (prep.flat ??= flatFaces(mesh))
            : mesh.faces;
        const count = source.positions.length / 3;
        const colors = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
          colors.set([...tint(source.featureIds[i]!), 1], i * 4);
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
    });
    engine.requestRender();
  };
  tessellate();
  build();

  // The row's middle, Earth-fixed.
  viewer.zoomTo(
    {
      center: vec3.add(vec3.vec3(), origin, vec3.vec3(-0.5, 0, 1.2)),
      radius: 10,
    },
    0,
    -28 * DEG,
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
        (stats.wireLines + stats.edgeLines).toLocaleString(),
        el(
          "small",
          {},
          ` (${stats.wireLines.toLocaleString()} wireframe, ${stats.edgeLines.toLocaleString()} B-rep edges)`,
        ),
      ),
      el("dt", {}, "tessellateBrep took"),
      el("dd", {}, `${stats.ms.toFixed(1)} ms for all four`),
      el("dt", {}, "Largest chordal error"),
      el(
        "dd",
        {},
        stats.error > settings.tolerance * 1.0000001
          ? `${mm(stats.error)} (the grid cap binds)`
          : `${mm(stats.error)} (the tolerance)`,
      ),
    );
  };
  showStats();

  const validity = el("ul");
  shapes.forEach((shape, s) => {
    const problems = problemsOf[s]!;
    const item = el(
      "li",
      {},
      el("strong", {}, `${shape.name}: `),
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

  const picked = el(
    "p",
    {},
    "Tap a face for its index and ID. Edges carry IDs too, by the draw's feature ID, but they are 1-pixel lines and hard to hit.",
  );

  panel.append(
    el("h3", {}, "Tessellation"),
    el(
      "label",
      { className: "slider" },
      "Tolerance",
      toleranceInput,
      toleranceOut,
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
    el("h3", {}, "Shapes"),
    validity,
    el("h3", {}, "Picked"),
    picked,
    el(
      "p",
      {},
      "Faces are tessellated on a grid in (u, v) and the trimmed face's hole is cut by dropping triangles whose centre falls outside it, so its rim is jagged; the edges drawn over it are exact. This is the small CPU tessellator, not the reference.",
    ),
  );

  const describe = (shape: Shape, kind: "face" | "edge", index: number) => {
    const form = shape.form;
    const faces = form.faceSurface.length;
    const id = form.ids[kind === "face" ? index : faces + index] ?? "";
    return `${shape.name}: ${kind} ${index}${id ? `, ID "${id}"` : ""}`;
  };
  const onPick = async (event: PointerEvent) => {
    const rect = viewer.canvas.getBoundingClientRect();
    const result = await viewer.pick(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    const info = result ? world.feature(result.featureId) : undefined;
    const part = info ? parts.get(info.draw.index) : undefined;
    picked.textContent =
      info && part
        ? describe(part.shape, part.kind, info.localId)
        : "Nothing there.";
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
    for (const d of [...draws, ...extras]) {
      world.removeDraw(d);
    }
    panel.replaceChildren();
  };
}
