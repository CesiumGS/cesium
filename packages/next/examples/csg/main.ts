import {
  CustomShader,
  Ellipsoid,
  MaterialFlags,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  tessellateBrep,
  vec3,
  type DrawHandle,
  type MeshHandle,
} from "../../src/index.ts";
import { KernelCancelled } from "../../src/brep/kernelClient.ts";
import type { KernelName } from "../../src/brep/kernelProtocol.ts";
import type { ExampleContext } from "../types.ts";
import { KIND_NAMES, linearOf } from "../brep-first-look/analysis.ts";
import { edgeLines } from "../brep-first-look/meshes.ts";
import {
  EvaluationScheduler,
  KERNEL_NAMES,
  KernelSession,
  type Evaluated,
} from "./evaluator.ts";
import {
  faceNormalAt,
  planarFaces,
  planeOffset,
  surfaceDistance,
} from "./faceGeometry.ts";
import { History, type Snapshot } from "./history.ts";
import {
  DEFAULT_LIGHTING,
  LIGHTING_RANGES,
  applyLighting,
  decodeLighting,
  encodeLighting,
  type Lighting,
} from "./lighting.ts";
import {
  EDGE_COLOR,
  HOVER,
  PALETTE_WGSL,
  PALETTE_WIDTH,
  PICK,
  PREVIEW_COLOR,
  SELECT,
  leafColour,
  leafSwatch,
} from "./look.ts";
import { Manipulator, type FaceHandle } from "./manipulator.ts";
import {
  PICK_MODES,
  pickFlag,
  pickModeForKey,
  pickModeOf,
  selectionFor,
  type PickMode,
} from "./pickMode.ts";
import { outlineOf } from "./preview.ts";
import { createProperties, type FaceSection } from "./properties.ts";
import { pushPullFor } from "./pushPull.ts";
import { STEP_SAMPLES, fetchStepSample, isStepFile } from "./stepFiles.ts";
import { CSS } from "./styles.ts";
import { DoubleBuffer } from "./swap.ts";
import {
  PRIMITIVE_KINDS,
  PRIMITIVE_SPECS,
  addChild,
  applyDrop,
  canWrap,
  cloneTree,
  createLeaf,
  createStepLeaf,
  defaultBracket,
  duplicateNode,
  facesOfNode,
  findNode,
  isStepLeaf,
  leavesOf,
  parentOf,
  pathTo,
  recipeOf,
  removeNode,
  wrapNodes,
  OPERATION_LABELS,
  type CsgTree,
  type LeafNode,
  type OpNode,
  type PrimitiveKind,
  type TreeNode,
} from "./tree.ts";
import { createTreePanel, kindName } from "./treePanel.ts";
import {
  divider,
  el,
  field,
  iconButton,
  popover,
  segmented,
  type IconButton,
} from "./ui.ts";
import { VIEW_ANGLES, createViewCube, type StandardView } from "./viewCube.ts";
import { mad, makeRig, type Rig, type V3 } from "./viewMath.ts";

/**
 * A solid modeling sample with CSG (plan §13.33): a small CAD tool whose
 * interface is a tree of primitives and booleans. The application owns the
 * modeling and the engine draws and queries the result.
 *
 * - The workspace is laid over the view like a CAD application's: a toolbar
 *   (primitives, STEP import, booleans on the selection, undo and redo,
 *   standard views, display toggles, lighting, the kernel), the feature tree
 *   on the left, the selected node's properties on the right and a status
 *   bar (`treePanel.ts`, `properties.ts`, `ui.ts`, `styles.ts`).
 * - The tree (`tree.ts`) is plain data: leaves are primitives with
 *   parameters and a placement, nodes are unions, differences and
 *   intersections. It becomes a recipe (`SolidRecipe`) that a kernel in a Web
 *   Worker evaluates: Open CASCADE (the default, which measured faster here)
 *   or SMLib, each converting its solid to the engine's one render form and
 *   saying which leaf made every face. The page only receives the form, with
 *   its patches prepared for the GPU, and gives it to `World.addBrep`.
 * - Every edit is a command on a stack (`history.ts`): adding, removing,
 *   grouping, dragging a row to reorder or reparent it, renaming, a
 *   parameter, a gizmo or push-pull drag. Undo and redo restore the tree and
 *   the selection and re-evaluate.
 * - What a click selects is a filter in the toolbar (`pickMode.ts`), as in
 *   SolidWorks or Fusion: Face (the default) picks a face and shows only its
 *   push-pull arrow, Part picks the leaf that made the face and shows the
 *   gizmo, Body picks the whole model. A click on a tree row, or on a
 *   breadcrumb of the picked face, selects that node and shows its gizmo.
 * - Direct manipulation (`manipulator.ts`, `gizmo.ts`, `pushPull.ts`):
 *   a translate and rotate gizmo on the selected leaf (arrows, plane
 *   squares, rings) and a push-pull arrow on a picked face, drawn over the
 *   view and tested in pixels. A drag is an edit of the leaf with today's
 *   preview (the wire at once, the solid re-evaluated at a throttled rate)
 *   and one undo step on release. A face is mapped to the parameter of the
 *   leaf that made it from the kernel's face provenance, so pulling a hole's
 *   wall changes the hole's radius.
 * - A STEP leaf is an imported solid (`stepFiles.ts`). Open CASCADE's worker
 *   keeps the part (`registerStep`), centred on its bounds, and a recipe's
 *   `step` leaf is a copy of it with its own placement. Only Open CASCADE
 *   builds with it; with SMLib selected the sample says so and keeps the
 *   last solid.
 * - Changing the solid never shows a bad frame (`swap.ts`): the new solid
 *   is added hidden, drawn until `engine.whenReady` says no draw uses a
 *   stand-in, and swapped in for the old one in one step; a new palette
 *   replaces the texture of the shader that is there.
 * - Lighting (`lighting.ts`), kept in the link's `light` parameter; the
 *   display toggles and the tool in `ui`.
 *
 * Not built: the four-view layout (it needs step 5d's orthographic camera
 * and linked views), and phase 3, OCCT's local operations on a face or edge
 * (fillet, chamfer, extrude) as feature nodes, which the push-pull handle
 * would carry for a face no leaf parameter explains.
 */

const SITE = fromDegrees(-75.1652, 39.9526, 0);
const DEG = Math.PI / 180;
const PLAIN = linearOf("#c9ced6");
/** The grid snapping a drag, m: the ground's grid is every 0.5 m, so ten steps to a square. */
const GRID_STEP = 0.05;

const ms = (value: number | undefined) =>
  value === undefined
    ? "–"
    : `${value < 10 ? value.toFixed(1) : value.toFixed(0)} ms`;

export async function run({
  viewer,
  panel,
  params,
  setParams,
  signal,
}: ExampleContext) {
  const { engine, world, view } = viewer;
  viewer.creditsShown = false;
  view.background = "color";
  view.clearColor = [0.78, 0.82, 0.88];
  view.lighting.environment = "procedural";

  // The loading card first, before anything that takes time: the kernel's
  // worker and module, the first evaluation, the first shaders.
  const view_ = viewer.container;
  const style = el("style", { textContent: CSS });
  view_.classList.add("csg-view");
  const previousTabIndex = view_.getAttribute("tabindex");
  if (previousTabIndex === null) {
    view_.tabIndex = 0;
  }
  const loadingText = el("span");
  const loading = el(
    "div",
    { className: "csg-loading", role: "status" },
    el(
      "div",
      {},
      el("span", { className: "csg-spinner", ariaHidden: "true" }),
      loadingText,
    ),
  );
  view_.append(style, loading);
  const setLoading = (text: string | undefined) => {
    loading.hidden = text === undefined;
    view_.toggleAttribute("data-loading", text !== undefined);
    if (text !== undefined) {
      loadingText.textContent = text;
    }
  };
  /** The first right frame has been shown: the card stays up until then. */
  let firstFrame = false;

  const session = new KernelSession();
  const scheduler = new EvaluationScheduler({
    run: (final) => void evaluate(final),
  });
  const tree: { current: CsgTree } = { current: defaultBracket() };
  const uiFlags = new Set((params.ui ?? "").split(",").filter(Boolean));
  const settings = {
    kernel: (params.kernel === "smlib" ? "smlib" : "occt") as KernelName,
    edges: !uiFlags.has("noedges"),
    byLeaf: !uiFlags.has("nocolour"),
    wire: uiFlags.has("wire"),
    xray: uiFlags.has("xray"),
    snap: !uiFlags.has("nosnap"),
    pick: pickModeOf(uiFlags),
  };
  setLoading(
    settings.kernel === "occt"
      ? "Loading Open CASCADE… (about 23 MB the first time)"
      : "Loading SMLib…",
  );
  const persistUi = () =>
    setParams({
      ui:
        [
          ...(settings.edges ? [] : ["noedges"]),
          ...(settings.byLeaf ? [] : ["nocolour"]),
          ...(settings.wire ? ["wire"] : []),
          ...(settings.xray ? ["xray"] : []),
          ...(settings.snap ? [] : ["nosnap"]),
          ...pickFlag(settings.pick),
        ].join(",") || undefined,
    });
  /** The sun, shadows, occlusion, sky and exposure (`lighting.ts`), from the link's `light`. */
  const lighting: Lighting = decodeLighting(params.light);

  /** Selected node ids, in the order chosen: the last is the one the properties show, and the first is a subtraction's base. */
  let selection: number[] = [];
  /** A parameter or a gizmo is being dragged: picks are off, and the solid shown is a preview's. */
  let dragging = false;
  let previewLeaf: LeafNode | undefined;
  let hoverFace: number | undefined;
  /** A face the pointer picked: its leaf's tag, where, and the solid's normal there. */
  interface Picked {
    face: number;
    tag: number;
    point?: V3;
    normal?: V3;
  }
  let picked: Picked | undefined;
  const history = new History({ tree: cloneTree(tree.current), selection: [] });

  const primary = () => selection[selection.length - 1];
  const selectedNode = (): TreeNode | undefined =>
    primary() === undefined ? undefined : findNode(tree.current, primary()!);

  // ------------------------------------------------------------ the scene
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const frame = [
    [enu[0]!, enu[1]!, enu[2]!],
    [enu[4]!, enu[5]!, enu[6]!],
    [enu[8]!, enu[9]!, enu[10]!],
  ] as const;
  const toWorld = (local: ReturnType<typeof mat4.mat4>) =>
    mat4.multiply(mat4.mat4(), enu, local);
  const translation = (x: number, y: number, z: number) => {
    const m = mat4.mat4();
    mat4.setTranslation(m, vec3.vec3(x, y, z));
    return m;
  };
  const facesMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.7,
  });
  /** X-ray: the faces blended at this opacity, the edges drawn opaque over them. */
  const xrayMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 0.3],
    roughness: 0.7,
    flags: MaterialFlags.alphaBlend | MaterialFlags.blendedOnly,
  });
  const groundMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.95,
  });
  const lineMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    flags: MaterialFlags.unlit,
  });

  // A light ground and its grid, 0.5 m a line, 8 m across.
  const extras: Array<{ draw: DrawHandle; mesh: MeshHandle }> = [];
  const half = 4;
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
  extras.push({
    mesh: groundMesh,
    draw: world.addDraw({
      mesh: groundMesh,
      origin,
      model: toWorld(mat4.mat4()),
      material: groundMaterial,
      color: [0.86, 0.88, 0.9, 1],
      doubleSided: true,
    }),
  });
  const grid: number[] = [];
  const gridIndices: number[] = [];
  for (let i = -half; i <= half; i += 0.5) {
    const at = grid.length / 3;
    grid.push(i, -half, 0, i, half, 0, -half, i, 0, half, i, 0);
    gridIndices.push(at, at + 1, at + 2, at + 3);
  }
  const gridMesh = world.addMesh({
    positions: new Float32Array(grid),
    indices: new Uint32Array(gridIndices),
    topology: "line-list",
  });
  extras.push({
    mesh: gridMesh,
    draw: world.addDraw({
      mesh: gridMesh,
      origin,
      model: toWorld(mat4.mat4()),
      material: lineMaterial,
      color: [0.62, 0.66, 0.72, 1],
    }),
  });
  const ecef = (local: ArrayLike<number>) =>
    vec3.add(
      vec3.vec3(),
      origin,
      mat4.transformPoint(
        vec3.vec3(),
        enu,
        vec3.vec3(local[0]!, local[1]!, local[2]!),
      ),
    );
  /** Looks at the solid (or the bracket's place before there is one) from a standard view. */
  const goView = (name: StandardView | "iso") => {
    const bounds = shown?.result.bounds;
    const centre: V3 = bounds
      ? [
          (bounds.min[0] + bounds.max[0]) / 2,
          (bounds.min[1] + bounds.max[1]) / 2,
          (bounds.min[2] + bounds.max[2]) / 2,
        ]
      : [0, -0.05, 0.6];
    const radius = bounds
      ? Math.max(
          0.3,
          0.58 *
            Math.hypot(
              bounds.max[0] - bounds.min[0],
              bounds.max[1] - bounds.min[1],
              bounds.max[2] - bounds.min[2],
            ),
        )
      : 2.6;
    const { heading, pitch } = VIEW_ANGLES[name];
    viewer.zoomTo({ center: ecef(centre), radius }, heading * DEG, pitch * DEG);
  };
  viewer.setControls("orbit");
  applyLighting(viewer, lighting);

  // ---------------------------------------------------------- the solid
  type BrepHandle = ReturnType<typeof world.addBrep>;
  interface Shown {
    result: Evaluated;
    handle: BrepHandle;
    /** Draw indices of the faces' draws, for picks. */
    faceDraws: Set<number>;
    /**
     * Each face draw's colour shader, kept so a new palette replaces the
     * texture in place: a new shader reads a stand-in until its texture
     * has loaded (a palette read before that was black).
     */
    shaders: Map<DrawHandle, CustomShader>;
    edges?: { draw: DrawHandle; mesh: MeshHandle };
    /** Main thread work, ms: giving the form to `addBrep`, and the edges' overlay. */
    brepMs: number;
    edgesMs: number;
  }
  /** The solid on screen. A newer one is added hidden and swapped in once it has drawn right (`swap.ts`). */
  let shown: Shown | undefined;
  let failure: string | undefined;
  goView("iso");

  const removeSolid = (solid: Shown) => {
    world.removeBrep(solid.handle);
    if (solid.edges) {
      world.removeDraw(solid.edges.draw);
      world.removeMesh(solid.edges.mesh);
    }
  };
  /**
   * Shows or hides all of a solid's draws. In wireframe the faces stay
   * hidden, and the edges alone show.
   */
  const setSolidVisible = (solid: Shown, visible: boolean) => {
    for (const draw of faceDraws(solid.handle)) {
      world.setVisible(draw, visible && !settings.wire);
    }
    if (solid.edges) {
      world.setVisible(solid.edges.draw, visible);
    }
  };
  const buffer = new DoubleBuffer<Shown>({
    reveal: (next, previous) => {
      shown = next;
      if (!firstFrame) {
        firstFrame = true;
        setLoading(undefined);
      }
      setSolidVisible(next, true);
      if (previous) {
        removeSolid(previous);
      }
      if (next.result.final && !dragging) {
        clearPreview();
      }
      if (!manipulator?.dragging && !dragging) {
        refindPicked();
      }
      refreshResult();
      refreshTree();
      refreshProperties();
      applyColours();
      manipulator?.invalidate();
      engine.requestRender();
    },
    discard: removeSolid,
  });

  const removeShown = () => {
    buffer.clear();
    shown = undefined;
  };

  const faceDraws = (handle: BrepHandle) =>
    [handle.patches, handle.trimmed, handle.mesh].filter(
      (draw): draw is DrawHandle => draw !== undefined,
    );

  const selectedLeafIds = (): Set<number> =>
    new Set(
      selection.flatMap((id) => {
        const node = findNode(tree.current, id);
        return node ? leavesOf(node).map((leaf) => leaf.id) : [];
      }),
    );

  const paletteOf = (result: Evaluated) => {
    const faces = result.form.faceSurface.length;
    const image = new ImageData(
      PALETTE_WIDTH,
      Math.max(1, Math.ceil(faces / PALETTE_WIDTH)),
    );
    const chosen = selectedLeafIds();
    const hoveredTag =
      hoverFace === undefined ? undefined : result.faceTags[hoverFace];
    const hovering = (face: number, tag: number) =>
      hoverFace === undefined
        ? false
        : settings.pick === "face"
          ? face === hoverFace
          : settings.pick === "part"
            ? tag === hoveredTag
            : true;
    for (let face = 0; face < faces; face++) {
      const tag = result.faceTags[face]!;
      const colour =
        face === picked?.face
          ? PICK
          : hovering(face, tag)
            ? HOVER
            : chosen.has(tag)
              ? SELECT
              : settings.byLeaf && tag > 0
                ? leafColour(tag)
                : PLAIN;
      image.data.set(
        [colour[0], colour[1], colour[2], 1].map((v) => Math.round(v * 255)),
        face * 4,
      );
    }
    return image;
  };

  /** Colours a solid's faces by leaf; the selection's, the picked and the hovered face in their own colours. */
  const colour = (solid: Shown) => {
    const palette = paletteOf(solid.result);
    for (const draw of faceDraws(solid.handle)) {
      const shader = solid.shaders.get(draw);
      if (shader) {
        shader.setUniform("palette", palette);
        continue;
      }
      const made = new CustomShader({
        fragment: PALETTE_WGSL,
        uniforms: {
          base: { type: "u32", value: world.featureIdOf(draw) },
          palette: {
            type: "texture2d",
            value: palette,
            nearest: true,
            clamp: true,
          },
        },
        label: "CSG: face colours",
      });
      solid.shaders.set(draw, made);
      world.setDrawShader(draw, made);
    }
  };

  /** Colours the solid shown, and the one waiting to replace it. */
  const applyColours = () => {
    if (shown) {
      colour(shown);
    }
    if (buffer.pending) {
      colour(buffer.pending);
    }
    engine.requestRender();
  };

  /** Wireframe: the faces are hidden (and can't be picked), the edges show. */
  const applyWire = () => {
    if (shown) {
      setSolidVisible(shown, true);
    }
    engine.requestRender();
  };

  /**
   * How long a new solid may wait to be right before it is shown as it is, ms:
   * `whenReady` ends the wait then (reporting it), so a swap can't hang on a
   * pipeline or texture that never comes.
   */
  const READY_TIMEOUT_MS = 2000;

  /**
   * Waits until a solid's draws would show what they should: none uses a
   * stand-in (a shader's pipelines compiled, its palette texture loaded) and
   * its patches are diced (`Engine.whenReady`). `superseded` aborts when a
   * newer solid replaces this one, so the wait ends rather than running on.
   */
  const settled = async (solid: Shown, superseded: AbortSignal) => {
    // Not `compileShader` first: it compiles every pipeline of a shader, many
    // seconds on a cold engine, unbounded by the timeout; `whenReady` waits
    // for just the pipelines these draws use.
    await engine.whenReady(view, {
      draws: [
        ...faceDraws(solid.handle),
        ...(solid.edges ? [solid.edges.draw] : []),
      ],
      signal: AbortSignal.any([signal, superseded]),
      timeoutMs: READY_TIMEOUT_MS,
    });
  };

  /** Adds a kernel's result hidden, and shows it, in place of the solid shown, once it has drawn right. */
  const show = (result: Evaluated) => {
    const start = performance.now();
    const handle = world.addBrep(result.form, {
      origin,
      model: toWorld(mat4.mat4()),
      material: settings.xray ? xrayMaterial : facesMaterial,
      color: [1, 1, 1, 1],
      doubleSided: false,
      name: "CSG solid",
      errorPixels: 0.5,
      cpuTolerance: 0.001,
      ...(result.patches ? { prepared: result.patches } : {}),
    });
    const brepMs = performance.now() - start;
    const next: Shown = {
      result,
      handle,
      faceDraws: new Set(faceDraws(handle).map((draw) => draw.index)),
      shaders: new Map(),
      brepMs,
      edgesMs: 0,
    };
    if (settings.edges) {
      addEdges(next);
    }
    colour(next);
    setSolidVisible(next, false);
    engine.requestRender();
    void buffer.stage(next, (superseded) => settled(next, superseded));
  };

  /** The form's edges as a line overlay (a CPU mesh of edges only), pulled toward the camera in depth by the line pipeline. */
  const addEdges = (target: Shown) => {
    const start = performance.now();
    const form = target.result.form;
    try {
      const mesh = tessellateBrep(form, {
        tolerance: 0.001,
        faces: () => false,
      });
      if (mesh.edges.indices.length === 0) {
        return;
      }
      const lines = edgeLines(mesh);
      const handle = world.addMesh({
        positions: lines.positions,
        indices: lines.indices,
        featureIds: lines.featureIds,
        featureCount: Math.max(1, form.edgeVertices.length / 2),
        topology: "line-list",
      });
      target.edges = {
        mesh: handle,
        draw: world.addDraw({
          mesh: handle,
          origin,
          model: toWorld(
            translation(mesh.origin[0]!, mesh.origin[1]!, mesh.origin[2]!),
          ),
          material: lineMaterial,
          color: EDGE_COLOR,
          name: "CSG solid: edges",
        }),
      };
    } catch (error) {
      console.warn("csg: the edges couldn't be drawn:", error);
    } finally {
      target.edgesMs = performance.now() - start;
    }
  };

  const setEdges = (on: boolean) => {
    settings.edges = on;
    for (const solid of [shown, buffer.pending]) {
      if (!solid) {
        continue;
      }
      if (!on && solid.edges) {
        world.removeDraw(solid.edges.draw);
        world.removeMesh(solid.edges.mesh);
        delete solid.edges;
      } else if (on && !solid.edges) {
        addEdges(solid);
        // A solid still waiting stays hidden, edges too.
        const added = solid.edges as Shown["edges"];
        if (added && solid !== shown) {
          world.setVisible(added.draw, false);
        }
      }
    }
    refreshResult();
    engine.requestRender();
  };

  // --------------------------------------------------- the drag's preview
  let preview: { draw: DrawHandle; mesh: MeshHandle } | undefined;
  let previewFrame = 0;
  const clearPreview = () => {
    previewLeaf = undefined;
    cancelAnimationFrame(previewFrame);
    previewFrame = 0;
    if (preview) {
      world.removeDraw(preview.draw);
      world.removeMesh(preview.mesh);
      preview = undefined;
    }
    engine.requestRender();
  };
  /** The wire of the leaf being edited, redrawn at most once a frame. */
  const showPreview = (leaf: LeafNode) => {
    previewLeaf = leaf;
    if (previewFrame) {
      return;
    }
    previewFrame = requestAnimationFrame(() => {
      previewFrame = 0;
      if (!previewLeaf) {
        return;
      }
      const old = preview;
      const outline = outlineOf(previewLeaf);
      const mesh = world.addMesh({
        positions: outline.positions,
        indices: outline.indices,
        topology: "line-list",
      });
      preview = {
        mesh,
        draw: world.addDraw({
          mesh,
          origin,
          model: toWorld(mat4.mat4()),
          material: lineMaterial,
          color: PREVIEW_COLOR,
          name: "CSG: drag preview",
        }),
      };
      if (old) {
        world.removeDraw(old.draw);
        world.removeMesh(old.mesh);
      }
      engine.requestRender();
    });
  };

  // ------------------------------------------------------ the workspace
  view_.dataset.pick = settings.pick;
  const toolbar = el("div", {
    className: "csg-toolbar",
    role: "toolbar",
    ariaLabel: "Modeling tools",
  });
  const treeHead = el("div", { className: "csg-panel-head" });
  const propsHead = el("div", { className: "csg-panel-head" });
  const statusbar = el("div", { className: "csg-statusbar" });
  const app = el("div", { className: "csg-app" });
  view_.append(app);

  // ------------------------------------------------------ messages
  const dot = el("span", { className: "csg-dot", ariaHidden: "true" });
  const kernelText = el("span");
  const validText = el("span");
  const messageText = el("span", { className: "csg-message", role: "status" });
  const timeText = el("span", {
    title: "The kernel's time for the last evaluation",
  });
  /** The selection filter and what a drag does in each mode, the current one in bold. */
  const modeText = el("span", { className: "csg-mode" });
  const refreshMode = () => {
    modeText.replaceChildren(
      ...PICK_MODES.flatMap((info, i) => {
        const name = el("b", {}, info.label);
        name.toggleAttribute("data-active", info.mode === settings.pick);
        return [...(i > 0 ? [" · "] : []), name, `: ${info.hint}`];
      }),
    );
  };
  refreshMode();
  let sequence = 0;
  let busyTimer: ReturnType<typeof setTimeout> | undefined;
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  /** A line in the status bar: a hint, or what failed. */
  const say = (text: string | undefined, bad = false, forMs = 6000) => {
    clearTimeout(messageTimer);
    messageText.textContent = text ?? "";
    messageText.toggleAttribute("data-bad", bad && !!text);
    if (text && !bad && forMs > 0) {
      messageTimer = setTimeout(() => (messageText.textContent = ""), forMs);
    }
  };
  /** A small spinner in the status bar while the kernel works, for the edits the card doesn't cover. */
  const busySpinner = el("span", {
    className: "csg-spinner csg-mini",
    ariaHidden: "true",
    hidden: true,
    title: "The kernel is evaluating",
  });
  /** What the kernel is doing, shown only if it takes longer than a blink. */
  const busy = (text: string | undefined) => {
    clearTimeout(busyTimer);
    if (text === undefined) {
      dot.dataset.state = failure ? "bad" : "ok";
      busySpinner.hidden = true;
      return;
    }
    busyTimer = setTimeout(() => {
      dot.dataset.state = "busy";
      busySpinner.hidden = false;
      say(text, false, 0);
    }, 200);
  };
  // ------------------------------------------------------ evaluation
  const evaluate = async (final: boolean) => {
    const mine = ++sequence;
    const recipe = recipeOf(tree.current.root);
    if (!recipe) {
      removeShown();
      failure = undefined;
      busy(undefined);
      firstFrame = true;
      setLoading(undefined);
      say("Nothing to build: no node is enabled.", false, 0);
      refreshResult();
      refreshTree();
      engine.requestRender();
      return;
    }
    const kernel = settings.kernel;
    busy(`${KERNEL_NAMES[kernel]}: evaluating…`);
    try {
      const result = await session.evaluate(kernel, recipe, {
        final,
        onStage: (stage) => {
          if (mine !== sequence) {
            return;
          }
          if (stage.startsWith("Loading")) {
            setLoading(
              kernel === "occt"
                ? `${stage} (about 23 MB the first time)`
                : stage,
            );
          } else {
            busy(stage);
            if (!firstFrame) {
              setLoading(
                stage.startsWith(`${KERNEL_NAMES[kernel]}:`)
                  ? "Building the solid…"
                  : stage,
              );
            }
          }
        },
      });
      if (mine !== sequence || signal.aborted) {
        return;
      }
      failure = undefined;
      if (!firstFrame) {
        setLoading("Compiling shaders…");
      }
      show(result);
      console.info(
        `csg: ${KERNEL_NAMES[kernel]}${final ? "" : " (preview)"}: kernel ${result.timings.kernelMs.toFixed(1)} ms (${result.booleans} booleans), convert ${result.timings.convertMs.toFixed(1)} ms, prepare ${ms(result.timings.prepareMs)}, ${result.form.faceSurface.length} faces`,
      );
    } catch (error) {
      if (error instanceof KernelCancelled || mine !== sequence) {
        return;
      }
      failure = error instanceof Error ? error.message : String(error);
      console.warn("csg: the kernel failed:", error);
    }
    if (mine === sequence) {
      clearTimeout(busyTimer);
      busySpinner.hidden = true;
      // The card stays until the first solid has drawn right (the buffer's reveal), unless there will be none.
      if (firstFrame || failure) {
        setLoading(undefined);
      }
      if (failure) {
        dot.dataset.state = "bad";
        say(
          `${KERNEL_NAMES[kernel]} failed: ${failure}. Showing the last good solid.`,
          true,
        );
      } else {
        dot.dataset.state = "ok";
        if (
          messageText.hasAttribute("data-bad") ||
          messageText.textContent?.endsWith("…")
        ) {
          say(undefined);
        }
      }
      refreshResult();
      refreshTree();
      refreshProperties();
    }
  };

  // ------------------------------------------------- the camera and picks
  const rig = (): Rig | undefined => {
    const width = viewer.canvas.clientWidth;
    const height = viewer.canvas.clientHeight;
    if (!width || !height) {
      return undefined;
    }
    const camera = view.camera;
    return makeRig(
      camera,
      camera.fovy(width / height),
      width,
      height,
      origin,
      frame,
    );
  };

  /**
   * The face of the solid at a pixel and the leaf that made it (the face's
   * tag is its leaf's id, from the kernel's record of which input each
   * output face came from), or undefined when the pixel isn't over the solid.
   */
  const facePick = async (
    x: number,
    y: number,
  ): Promise<{ face: number; tag: number } | undefined> => {
    // A line of the overlay over the pixel (an edge, the drag's wire) isn't a face: look a pixel or two around it.
    for (const [dx, dy] of [
      [0, 0],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
      [3, 3],
      [-3, -3],
    ] as const) {
      const hit = await viewer.pick(x + dx, y + dy);
      const info = hit ? world.feature(hit.featureId) : undefined;
      if (!info) {
        return undefined;
      }
      if (!shown?.faceDraws.has(info.draw.index)) {
        continue;
      }
      return { face: info.localId, tag: shown.result.faceTags[info.localId]! };
    }
    return undefined;
  };

  /** Where the solid is at a pixel, in the sample's metres. */
  const pointAt = async (x: number, y: number): Promise<V3 | undefined> => {
    const scale = viewer.canvas.width / Math.max(1, viewer.canvas.clientWidth);
    const hit = await view.pickPosition(x * scale, y * scale);
    if (!hit) {
      return undefined;
    }
    const d = [
      hit[0]! - origin[0]!,
      hit[1]! - origin[1]!,
      hit[2]! - origin[2]!,
    ];
    return frame.map(
      (axis) => d[0]! * axis[0]! + d[1]! * axis[1]! + d[2]! * axis[2]!,
    ) as V3;
  };

  /** Fills in where on the face it was picked and the solid's normal there; a plane's point is put on the plane. */
  const locate = (face: Picked, point: V3 | undefined) => {
    if (!shown || !point) {
      return;
    }
    const { form } = shown.result;
    const normal = faceNormalAt(form, face.face, point);
    if (!normal) {
      return;
    }
    // The pick's depth is a little off a plane: the point goes onto it.
    const off = planeOffset(form, face.face, point);
    face.point = off === undefined ? point : mad(point, normal, -off);
    face.normal = normal;
  };

  /** After a new solid: finds the picked face again by where it was, since a kernel may number faces differently. */
  const refindPicked = () => {
    if (!picked || !shown) {
      return;
    }
    const { form, faceTags } = shown.result;
    if (picked.point) {
      let best: { face: number; distance: number } | undefined;
      for (let face = 0; face < faceTags.length; face++) {
        if (faceTags[face] !== picked.tag) {
          continue;
        }
        const distance = surfaceDistance(form, face, picked.point);
        if (distance !== undefined && (!best || distance < best.distance)) {
          best = { face, distance };
        }
      }
      if (best && best.distance < 0.02) {
        picked = { ...picked, face: best.face };
        locate(picked, picked.point);
        return;
      }
    }
    if (faceTags[picked.face] !== picked.tag) {
      picked = undefined;
    } else {
      delete picked.point;
      delete picked.normal;
    }
  };

  const hoverClear = () => {
    if (hoverFace !== undefined) {
      hoverFace = undefined;
      applyColours();
    }
  };
  let hoverBusy = false;
  let hoverAt = 0;
  /** Lights the face under the pointer; one pick at a time. */
  const hovered = async (x: number, y: number) => {
    if (dragging || hoverBusy || performance.now() - hoverAt < 40) {
      return;
    }
    hoverBusy = true;
    hoverAt = performance.now();
    try {
      const hit = await facePick(x, y);
      if (!dragging && hit?.face !== hoverFace) {
        hoverFace = hit?.face;
        applyColours();
      }
    } finally {
      hoverBusy = false;
    }
  };

  const onPick = async (event: PointerEvent) => {
    // Nothing is picked while a parameter is dragged: the solid under the pointer is about to be replaced.
    if (dragging) {
      return;
    }
    const rect = viewer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const additive = event.ctrlKey || event.metaKey || event.shiftKey;
    const hit = await facePick(x, y);
    if (!hit) {
      if (!additive) {
        select([]);
      }
      return;
    }
    const leaf = leavesOf(tree.current.root).find((l) => l.id === hit.tag);
    const next = selectionFor(
      settings.pick,
      { leaf: leaf?.id, root: tree.current.root.id },
      selection,
      additive,
    );
    if (settings.pick !== "face") {
      // A part or the body: the gizmo (or nothing) follows the selection, no face is picked.
      select(next);
      return;
    }
    const face: Picked = { face: hit.face, tag: hit.tag };
    picked = face;
    select(next, true);
    const point = await pointAt(x, y);
    if (picked === face) {
      locate(face, point);
      refreshProperties();
      manipulator.invalidate();
    }
  };
  let down: { x: number; y: number } | undefined;
  const pointerDown = (e: PointerEvent) => {
    down =
      e.target === viewer.canvas ? { x: e.clientX, y: e.clientY } : undefined;
  };
  const pointerUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) {
      void onPick(e);
    }
    down = undefined;
  };
  view_.addEventListener("pointerdown", pointerDown);
  view_.addEventListener("pointerup", pointerUp);
  view_.addEventListener("pointerleave", hoverClear);

  // --------------------------------------------------- history and edits
  const snapshot = (): Snapshot => ({ tree: tree.current, selection });
  const refreshHistory = () => {
    undoButton.setLabel(
      history.undoLabel ? `Undo ${history.undoLabel}` : "Undo",
    );
    redoButton.setLabel(
      history.redoLabel ? `Redo ${history.redoLabel}` : "Redo",
    );
    undoButton.setEnabled(history.canUndo);
    redoButton.setEnabled(history.canRedo);
  };
  const record = (label: string) => {
    history.record(label, snapshot());
    refreshHistory();
  };

  /** STEP parts the OCCT worker holds for leaves of the tree or of any state undo could return to, by key. */
  const stepKeys = new Set<number>();
  let nextStepKey = 1;
  /** Frees the parts no state uses any more. */
  const releaseUnusedSteps = () => {
    const used = history.stepKeys();
    for (const leaf of leavesOf(tree.current.root)) {
      if (isStepLeaf(leaf)) {
        used.add(leaf.step.key);
      }
    }
    for (const key of [...stepKeys]) {
      if (!used.has(key)) {
        stepKeys.delete(key);
        session.releaseStep(key).catch(() => undefined);
      }
    }
  };

  const refreshAll = () => {
    refreshTree();
    refreshProperties();
    refreshToolbar();
    applyColours();
    manipulator?.invalidate();
  };
  /** A finished edit of the tree's structure or a node: one undo step, and the solid re-evaluates. */
  const changed = (label: string) => {
    record(label);
    releaseUnusedSteps();
    refreshAll();
    scheduler.commit();
  };

  const select = (ids: number[], fromPick = false) => {
    selection = ids.filter((id) => !!findNode(tree.current, id));
    if (!fromPick) {
      picked = undefined;
    }
    hoverFace = undefined;
    history.select(selection);
    refreshAll();
    if (primary() !== undefined) {
      treePanel.reveal(primary()!);
    }
  };

  /** A leaf's parameters or placement changed, from a field or a drag in the view. */
  const edited = (
    leaf: LeafNode,
    phase: "drag" | "type" | "commit",
    label: string,
  ) => {
    showPreview(leaf);
    properties.sync();
    if (phase === "drag") {
      dragging = true;
      scheduler.drag();
    } else if (phase === "type") {
      scheduler.edit();
    } else {
      dragging = false;
      scheduler.commit();
      record(label);
    }
    manipulator.invalidate();
  };

  const restore = (
    result: { label: string; state: Snapshot } | undefined,
    verb: string,
  ) => {
    if (!result) {
      return;
    }
    clearPreview();
    dragging = false;
    tree.current = result.state.tree;
    selection = result.state.selection.filter(
      (id) => !!findNode(tree.current, id),
    );
    picked = undefined;
    hoverFace = undefined;
    refreshHistory();
    refreshAll();
    scheduler.commit();
    say(`${verb}: ${result.label}`);
  };
  const undo = () => restore(history.undo(), "Undid");
  const redo = () => restore(history.redo(), "Redid");

  // ---------------------------------------------------------- tree edits
  /** Where a new node goes: under the selected operation, or after the selected leaf. */
  const insertion = ():
    { target: OpNode; at: number | undefined } | undefined => {
    const selected = selectedNode();
    const target: OpNode | undefined =
      selected?.type === "op"
        ? selected
        : selected
          ? parentOf(tree.current, selected.id)
          : tree.current.root;
    if (!target) {
      return undefined;
    }
    return {
      target,
      at:
        selected && selected.type === "leaf"
          ? target.children.indexOf(selected) + 1
          : undefined,
    };
  };
  const addNode = (
    node: TreeNode,
    place: NonNullable<ReturnType<typeof insertion>>,
    label: string,
  ) => {
    addChild(tree.current, place.target.id, node, place.at);
    selection = [node.id];
    picked = undefined;
    changed(label);
    treePanel.reveal(node.id);
  };
  const addPrimitive = (kind: PrimitiveKind) => {
    const place = insertion();
    if (place) {
      addNode(
        createLeaf(tree.current, kind, { translate: [0, 0, 0.6] }),
        place,
        `Add ${PRIMITIVE_SPECS[kind].label.toLowerCase()}`,
      );
    }
  };

  const booleanState = (operation: OpNode["operation"]) => {
    const node = selection.length === 1 ? selectedNode() : undefined;
    if (node?.type === "op") {
      return node.operation !== operation;
    }
    return canWrap(tree.current, selection);
  };
  /** Applies a boolean to the selection: two or more nodes are grouped under it, in the order chosen; one operation changes its kind. */
  const applyBoolean = (operation: OpNode["operation"]) => {
    const node = selection.length === 1 ? selectedNode() : undefined;
    if (node?.type === "op") {
      if (node.operation !== operation) {
        node.operation = operation;
        changed(
          `Make ${node.name} a ${OPERATION_LABELS[operation].toLowerCase()}`,
        );
      }
      return;
    }
    const group = wrapNodes(tree.current, selection, operation);
    if (!group) {
      say(
        selection.length < 2
          ? `Select two or more nodes first${operation === "difference" ? ": the first you select is the base" : ""}.`
          : "Those nodes can't be grouped: one is inside another, or is the model itself.",
        true,
      );
      return;
    }
    selection = [group.id];
    picked = undefined;
    changed(`${OPERATION_LABELS[operation]} of ${group.children.length} nodes`);
    treePanel.reveal(group.id);
  };
  const removeSelected = () => {
    const ids = selection.filter((id) => id !== tree.current.root.id);
    if (ids.length === 0) {
      return;
    }
    const first = ids[0]!;
    const parent = parentOf(tree.current, first)!;
    const at = parent.children.findIndex((child) => child.id === first);
    const names = ids
      .map((id) => findNode(tree.current, id)?.name ?? "")
      .join(", ");
    for (const id of ids) {
      removeNode(tree.current, id);
    }
    const neighbour = parent.children[Math.min(at, parent.children.length - 1)];
    selection = [neighbour?.id ?? parent.id];
    picked = undefined;
    changed(`Delete ${names}`);
  };
  const duplicateSelected = () => {
    const ids = selection.filter((id) => id !== tree.current.root.id);
    const copies = ids
      .map((id) => duplicateNode(tree.current, id))
      .filter((n): n is TreeNode => !!n);
    if (copies.length === 0) {
      return;
    }
    selection = copies.map((n) => n.id);
    picked = undefined;
    changed(
      `Duplicate ${copies.length === 1 ? copies[0]!.name : `${copies.length} nodes`}`,
    );
  };

  // ------------------------------------------------------ STEP leaves
  let importing = 0;
  /**
   * Imports a STEP file in Open CASCADE's worker (whatever kernel builds
   * the solid) and adds it to the tree as a leaf, resting on the ground.
   * The solid is built from it only by Open CASCADE.
   */
  const importStep = async (
    name: string,
    file: string,
    read: () => Promise<Uint8Array>,
  ) => {
    const mine = ++importing;
    let problem: string | undefined;
    busy(`Reading ${file}…`);
    try {
      const bytes = await read();
      if (!isStepFile(bytes)) {
        throw new Error("it isn't a STEP file (it doesn't begin ISO-10303-21)");
      }
      const key = nextStepKey++;
      const { part } = await session.registerStep(key, bytes, (stage) => {
        if (mine !== importing) {
          return;
        }
        if (stage.startsWith("Loading")) {
          setLoading(`${stage} (about 23 MB the first time)`);
        } else {
          busy(`${file}: ${stage}`);
        }
      });
      if (signal.aborted) {
        return;
      }
      stepKeys.add(key);
      const leaf = createStepLeaf(
        tree.current,
        { key, file, size: [part.size[0], part.size[1], part.size[2]] },
        { name, translate: [0, 0, part.size[2] / 2] },
      );
      const place = insertion();
      if (place) {
        addNode(leaf, place, `Import ${name}`);
      }
      console.info(
        `csg: ${file}: ${part.solids} solid${part.solids === 1 ? "" : "s"}, ${part.faces} faces, ${part.size.map((v) => v.toFixed(3)).join(" × ")} m`,
      );
    } catch (error) {
      if (error instanceof KernelCancelled || signal.aborted) {
        return;
      }
      problem = `${file} couldn't be imported: ${error instanceof Error ? error.message : String(error)}`;
      console.warn("csg: the STEP import failed:", error);
    }
    if (mine === importing) {
      clearTimeout(busyTimer);
      setLoading(undefined);
      dot.dataset.state = failure ? "bad" : "ok";
      if (problem) {
        say(problem, true);
      } else {
        say(undefined);
      }
    }
  };
  const importFile = (file: File) =>
    importStep(
      file.name.replace(/\.(step|stp)$/i, ""),
      file.name,
      async () => new Uint8Array(await file.arrayBuffer()),
    );
  const importSample = (file: string) => {
    const sample = STEP_SAMPLES.find((s) => s.file === file)!;
    return importStep(sample.name, sample.file, () =>
      fetchStepSample(sample.file, signal),
    );
  };
  const stepInput = el("input", {
    type: "file",
    accept: ".step,.stp",
    hidden: true,
    onchange: () => {
      const file = stepInput.files?.[0];
      stepInput.value = "";
      if (file) {
        void importFile(file);
      }
    },
  });
  const dragOver = (event: DragEvent) => {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
    }
  };
  const drop = (event: DragEvent) => {
    const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
      /\.(step|stp)$/i.test(f.name),
    );
    if (file) {
      event.preventDefault();
      void importFile(file);
    }
  };
  view_.addEventListener("dragover", dragOver);
  view_.addEventListener("drop", drop);

  // ------------------------------------------------------ the tree panel
  const faceCount = (node: TreeNode) =>
    shown ? facesOfNode(node, shown.result.faceTags).length : undefined;
  const treePanel = createTreePanel({
    tree: () => tree.current,
    selection: () => selection,
    select: (id, mode) => {
      if (mode === "replace") {
        select([id]);
      } else if (selection.includes(id)) {
        select(selection.filter((s) => s !== id));
      } else {
        select([...selection, id]);
      }
    },
    faces: faceCount,
    swatch: leafSwatch,
    setEnabled: (node, enabled) => {
      node.enabled = enabled;
      changed(`${enabled ? "Include" : "Suppress"} ${node.name}`);
    },
    rename: (node, name) => {
      const old = node.name;
      node.name = name;
      changed(`Rename ${old} to ${name}`);
    },
    drop: (dragId, plan, label) => {
      if (applyDrop(tree.current, dragId, plan)) {
        changed(label);
        say(label);
      }
    },
    remove: (id) => {
      if (!selection.includes(id)) {
        selection = [id];
      }
      removeSelected();
    },
  });
  const refreshTree = () => treePanel.refresh();

  // ---------------------------------------------------- the properties
  const properties = createProperties({
    tree: () => tree.current,
    selection: () => selection,
    select: (id) => select([id]),
    edited: (leaf, phase, label) => edited(leaf, phase, label),
    rename: (node, name) => {
      const old = node.name;
      node.name = name;
      changed(`Rename ${old} to ${name}`);
    },
    setOperation: (node, operation) => {
      node.operation = operation;
      changed(
        `Make ${node.name} a ${OPERATION_LABELS[operation].toLowerCase()}`,
      );
    },
    face: (): FaceSection | undefined => {
      if (!shown || !picked) {
        return undefined;
      }
      const { form, faceTags } = shown.result;
      const surface = form.faceSurface[picked.face];
      if (surface === undefined) {
        return undefined;
      }
      const identity =
        KIND_NAMES[form.surfaceIdentity[surface]!] ?? "Free-form";
      const drawn = form.surfaceKind[surface] === 5 ? " (Bézier patches)" : "";
      const tag = faceTags[picked.face]!;
      const path = tag > 0 ? pathTo(tree.current, tag) : [];
      const leaf = path[path.length - 1];
      const handle = faceHandle();
      return {
        label: `Face ${picked.face}`,
        text: `Face ${picked.face}: ${identity.toLowerCase()}${drawn}${leaf ? `, made by ${leaf.name}` : ", from no leaf of the tree (the kernel gave it no tag)"}`,
        crumbs: [...path].reverse(),
        pushPull: handle
          ? `Drag the arrow in the view to push or pull: it changes ${handle.leaf.name}'s ${handle.target.label.toLowerCase()} (${handle.target.value.toFixed(3)} m). Click ${leaf?.name ?? "the part"} above to select the whole part and move it.`
          : leaf && isStepLeaf(leaf as LeafNode)
            ? "A STEP part has no parameters: click its name above to select it, then move it with the gizmo."
            : leaf
              ? picked.point
                ? "No single parameter makes this face: it comes from where nodes meet. (OCCT local edits would change it as a feature node.)"
                : "Locating the face…"
              : "",
      };
    },
    note: (node) =>
      node.type === "leaf" && isStepLeaf(node) && settings.kernel === "smlib"
        ? "SMLib can't build a STEP part: switch to Open CASCADE."
        : leavesOf(node).some(isStepLeaf) && settings.kernel === "smlib"
          ? "Has a STEP part: Open CASCADE only."
          : undefined,
  });
  const refreshProperties = () => {
    properties.refresh();
    updateTitles();
  };

  // ---------------------------------------------- direct manipulation
  let faceCache:
    | {
        picked: Picked;
        point: V3 | undefined;
        normal: V3 | undefined;
        handle: FaceHandle | undefined;
      }
    | undefined;
  const planesCache = new WeakMap<Shown, ReturnType<typeof planarFaces>>();
  const faceHandle = (): FaceHandle | undefined => {
    if (!picked || !shown || !picked.point || !picked.normal) {
      return undefined;
    }
    // Made once for a pick (and again when the pick moves): a drag changes the leaf, and the next evaluation's solid mustn't remake it from the changed leaf.
    if (
      faceCache?.picked === picked &&
      faceCache.point === picked.point &&
      faceCache.normal === picked.normal
    ) {
      return faceCache.handle;
    }
    const leaf = leavesOf(tree.current.root).find((l) => l.id === picked!.tag);
    const target = leaf
      ? pushPullFor(leaf, picked.point, picked.normal)
      : undefined;
    let planes = planesCache.get(shown);
    if (!planes) {
      planes = planarFaces(shown.result.form);
      planesCache.set(shown, planes);
    }
    const handle =
      leaf && target
        ? { leaf, point: picked.point, target, planes, face: picked.face }
        : undefined;
    faceCache = {
      picked,
      point: picked.point,
      normal: picked.normal,
      handle,
    };
    return handle;
  };
  const manipulator: Manipulator = new Manipulator(
    {
      rig,
      tool: () => (picked ? "pushpull" : "move"),
      gizmoLeaf: () => {
        const node = selectedNode();
        return node?.type === "leaf" && node.enabled ? node : undefined;
      },
      face: () => {
        const handle = faceHandle();
        return handle?.leaf.enabled ? handle : undefined;
      },
      grid: () => (settings.snap ? GRID_STEP : 0),
      edited: (leaf, phase, label) => edited(leaf, phase, label),
      pushed: (moved) => {
        if (!picked?.point || !picked.normal) {
          return;
        }
        const next = {
          ...picked,
          point: [
            picked.point[0] + picked.normal[0] * moved,
            picked.point[1] + picked.normal[1] * moved,
            picked.point[2] + picked.normal[2] * moved,
          ] as V3,
        };
        picked = next;
        refreshProperties();
      },
      hovered: (x, y) => void hovered(x, y),
      cursor: (kind) => {
        if (kind) {
          view_.dataset.cursor = kind;
        } else {
          delete view_.dataset.cursor;
        }
      },
    },
    view_,
    viewer.canvas,
    () =>
      `${view.camera.version}|${selection.join(",")}|${settings.pick}|${picked ? "face" : ""}`,
  );

  // ----------------------------------------------------------- the toolbar
  const buttons: Record<string, IconButton> = {};
  const add = (key: string, options: Parameters<typeof iconButton>[0]) => {
    buttons[key] = iconButton(options);
    return buttons[key]!.element;
  };
  const undoButton = iconButton({
    icon: "undo",
    label: "Undo",
    shortcut: "Ctrl+Z",
    onClick: undo,
  });
  const redoButton = iconButton({
    icon: "redo",
    label: "Redo",
    shortcut: "Ctrl+Y",
    onClick: redo,
  });
  /** The selection filter: what a click in the view picks. */
  const setPick = (mode: PickMode) => {
    if (mode === settings.pick) {
      return;
    }
    settings.pick = mode;
    view_.dataset.pick = mode;
    if (mode !== "face") {
      // Without faces to pick, a picked one would hide the gizmo of its part.
      picked = undefined;
    }
    hoverFace = undefined;
    persistUi();
    refreshAll();
    refreshMode();
    const info = PICK_MODES.find((m) => m.mode === mode)!;
    say(`${info.label}: ${info.title}.`);
  };
  const toggle = (
    key: "edges" | "wire" | "xray" | "byLeaf" | "snap",
    on: boolean,
  ) => {
    settings[key] = on;
    if (key === "edges") {
      setEdges(on);
    } else if (key === "xray") {
      if (on && !settings.edges) {
        settings.edges = true;
        setEdges(true);
      }
      // The material is the draw's: the solid shown is added again with it.
      if (shown) {
        show(shown.result);
      }
    } else if (key === "wire") {
      if (on && !settings.edges) {
        // Without faces the edges are all there is to see.
        settings.edges = true;
        setEdges(true);
      }
      applyWire();
    } else if (key === "byLeaf") {
      applyColours();
    }
    persistUi();
    refreshToolbar();
  };

  const lightPopover: { current?: ReturnType<typeof popover> } = {};
  const stepPopover: { current?: ReturnType<typeof popover> } = {};
  const detailsPopover: { current?: ReturnType<typeof popover> } = {};

  const kernelChoice = segmented<KernelName>(
    "Kernel",
    [
      {
        value: "occt",
        label: "Open CASCADE",
        title:
          "Open CASCADE in WebAssembly (LGPL 2.1), about 23 MB. Faces stay analytic; it reads STEP files",
      },
      {
        value: "smlib",
        label: "SMLib",
        title:
          "SMLib in WebAssembly (Apache 2.0). Faces arrive as Bézier patches with their analytic identity; no STEP",
      },
    ],
    () => settings.kernel,
    (kernel) => setKernel(kernel),
  );
  const setKernel = (kernel: KernelName) => {
    if (kernel === settings.kernel) {
      return;
    }
    settings.kernel = kernel;
    setParams({ kernel: kernel === "occt" ? undefined : kernel });
    refreshResult();
    refreshProperties();
    scheduler.commit();
  };

  const group = (...children: Array<HTMLElement | string>) => children;
  /** Which side panels show: by the button, or by default, by how wide the view is. */
  const panelsShown = () => {
    const wide = view_.clientWidth > 640;
    return {
      left: app.dataset.left !== "off",
      right: wide ? app.dataset.right !== "off" : app.dataset.right === "on",
    };
  };
  const syncPanelToggles = () => {
    const shownNow = panelsShown();
    leftToggle.setPressed(shownNow.left);
    rightToggle.setPressed(shownNow.right);
  };
  const leftToggle = iconButton({
    icon: "panelLeft",
    label: "Feature tree",
    onClick: () => {
      app.dataset.left = panelsShown().left ? "off" : "on";
      syncPanelToggles();
    },
  });
  const rightToggle = iconButton({
    icon: "panelRight",
    label: "Properties",
    onClick: () => {
      app.dataset.right = panelsShown().right ? "off" : "on";
      syncPanelToggles();
    },
  });
  const resizeWatch = new ResizeObserver(syncPanelToggles);
  resizeWatch.observe(view_);
  syncPanelToggles();

  toolbar.append(
    ...group(
      el("span", { className: "csg-group-title" }, "Pick"),
      ...PICK_MODES.map((info) =>
        add(`pick-${info.mode}`, {
          icon: info.icon,
          label: info.title,
          shortcut: info.key,
          text: info.label,
          onClick: () => setPick(info.mode),
        }),
      ),
    ),
    divider(),
    ...PRIMITIVE_KINDS.map((kind, i) =>
      add(kind, {
        icon: kind,
        label: `Add ${PRIMITIVE_SPECS[kind].label.toLowerCase()}`,
        shortcut: String(i + 1),
        onClick: () => addPrimitive(kind),
      }),
    ),
    add("step", {
      icon: "step",
      label: "Import a STEP part",
      text: "STEP",
      onClick: () => stepPopover.current?.toggle(),
    }),
    divider(),
    add("union", {
      icon: "union",
      label: "Union of the selection",
      shortcut: "U",
      onClick: () => applyBoolean("union"),
    }),
    add("difference", {
      icon: "difference",
      label: "Subtract: the first selected minus the rest",
      shortcut: "D",
      onClick: () => applyBoolean("difference"),
    }),
    add("intersection", {
      icon: "intersection",
      label: "Intersect the selection",
      shortcut: "I",
      onClick: () => applyBoolean("intersection"),
    }),
    divider(),
    undoButton.element,
    redoButton.element,
    divider(),
    add("duplicate", {
      icon: "copy",
      label: "Duplicate",
      shortcut: "Ctrl+D",
      onClick: duplicateSelected,
    }),
    add("delete", {
      icon: "trash",
      label: "Delete",
      shortcut: "Del",
      onClick: removeSelected,
    }),
    divider(),
    add("fit", {
      icon: "fit",
      label: "Zoom to fit",
      shortcut: "F",
      onClick: () => goView("iso"),
    }),
    add("front", {
      icon: "front",
      label: "Front view",
      shortcut: "⇧F",
      onClick: () => goView("front"),
    }),
    add("top", {
      icon: "top",
      label: "Top view",
      shortcut: "⇧T",
      onClick: () => goView("top"),
    }),
    add("right", {
      icon: "right",
      label: "Right view",
      shortcut: "⇧R",
      onClick: () => goView("right"),
    }),
    add("iso", {
      icon: "iso",
      label: "Isometric view",
      shortcut: "⇧I",
      onClick: () => goView("iso"),
    }),
    divider(),
    add("edges", {
      icon: "edges",
      label: "B-rep edges",
      shortcut: "E",
      onClick: () => toggle("edges", !settings.edges),
    }),
    add("xray", {
      icon: "xray",
      label: "X-ray: see through the faces, edges on top",
      shortcut: "X",
      onClick: () => toggle("xray", !settings.xray),
    }),
    add("wire", {
      icon: "wire",
      label: "Wireframe: hide the faces, keep the edges",
      shortcut: "W",
      onClick: () => toggle("wire", !settings.wire),
    }),
    add("colour", {
      icon: "paint",
      label: "Colour faces by the leaf that made them",
      shortcut: "C",
      onClick: () => toggle("byLeaf", !settings.byLeaf),
    }),
    add("snap", {
      icon: "snap",
      label: "Snap to the 0.05 m grid (hold Alt to drag free)",
      shortcut: "G",
      onClick: () => toggle("snap", !settings.snap),
    }),
    add("light", {
      icon: "light",
      label: "Lighting",
      onClick: () => lightPopover.current?.toggle(),
    }),
    el("span", { className: "csg-spacer" }),
    kernelChoice.element,
    divider(),
    leftToggle.element,
    rightToggle.element,
  );
  buttons.light!.element.setAttribute("aria-haspopup", "dialog");
  buttons.step!.element.setAttribute("aria-haspopup", "dialog");

  const refreshToolbar = () => {
    for (const info of PICK_MODES) {
      buttons[`pick-${info.mode}`]!.setPressed(settings.pick === info.mode);
    }
    buttons.edges!.setPressed(settings.edges);
    buttons.wire!.setPressed(settings.wire);
    buttons.xray!.setPressed(settings.xray);
    buttons.colour!.setPressed(settings.byLeaf);
    buttons.snap!.setPressed(settings.snap);
    const real = selection.filter((id) => id !== tree.current.root.id);
    for (const op of ["union", "difference", "intersection"] as const) {
      buttons[op]!.setEnabled(booleanState(op));
    }
    buttons.duplicate!.setEnabled(real.length > 0);
    buttons.delete!.setEnabled(real.length > 0);
    kernelChoice.sync();
    refreshHistory();
  };

  // -------------------------------------------------- popovers' content
  const fillLighting = (card: HTMLElement) => {
    const lit = () => applyLighting(viewer, lighting);
    const persist = () => setParams({ light: encodeLighting(lighting) });
    const slider = (
      label: string,
      key: keyof typeof LIGHTING_RANGES,
      unit?: string,
    ) =>
      field({
        label,
        value: lighting[key],
        ...LIGHTING_RANGES[key],
        floor: LIGHTING_RANGES[key].min,
        ...(unit ? { unit } : {}),
        onChange: (value, phase) => {
          lighting[key] = value;
          lit();
          if (phase !== "drag") {
            persist();
          }
        },
      });
    const check = (
      label: string,
      title: string,
      key: "shadows" | "ambientOcclusion",
    ) => {
      const box = el("input", {
        type: "checkbox",
        checked: lighting[key],
        onchange: () => {
          lighting[key] = box.checked;
          lit();
          persist();
        },
      });
      return el("label", { title }, label, box);
    };
    card.replaceChildren(
      el("h4", {}, "Sun"),
      slider("Azimuth", "azimuth", "°"),
      slider("Elevation", "elevation", "°"),
      slider("Intensity", "sun", "×"),
      el("h4", {}, "Shadows and occlusion"),
      el(
        "div",
        { className: "csg-toggles" },
        check("Shadows", "The sun's cascaded shadow maps.", "shadows"),
        check(
          "Ambient occlusion",
          "The sky's light hidden by nearby surfaces (GTAO).",
          "ambientOcclusion",
        ),
      ),
      slider("AO radius", "aoRadius", "m"),
      el("h4", {}, "Sky and camera"),
      slider("Sky light", "sky", "×"),
      slider("Exposure", "exposure", "EV"),
      el(
        "button",
        {
          type: "button",
          className: "csg-button",
          title: "Back to the sample's own light",
          onclick: () => {
            Object.assign(lighting, DEFAULT_LIGHTING);
            lit();
            persist();
            fillLighting(card);
          },
        },
        "Reset lighting",
      ),
      el(
        "p",
        { className: "csg-note" },
        "Intensity 1 is what the atmosphere lets through: white at noon, orange when the sun is low.",
      ),
    );
  };
  const fillStep = (card: HTMLElement) => {
    card.replaceChildren(
      el("h4", {}, "Import a STEP part"),
      el(
        "div",
        { className: "csg-menu" },
        ...STEP_SAMPLES.map((sample) =>
          el(
            "button",
            {
              type: "button",
              onclick: () => {
                stepPopover.current?.close();
                void importSample(sample.file);
              },
            },
            sample.name,
            el("small", {}, sample.description),
          ),
        ),
        el(
          "button",
          {
            type: "button",
            onclick: () => {
              stepPopover.current?.close();
              stepInput.click();
            },
          },
          "Open a file…",
          el(
            "small",
            {},
            "or drop one on the view. Open Cascade builds with it.",
          ),
        ),
      ),
      el(
        "p",
        { className: "csg-note" },
        "NIST's test models are served from /step-samples/ (npm run setup fetches them).",
      ),
    );
  };

  // ------------------------------------------------------ the panels
  const treeTitle = el("h3", {}, "Feature tree");
  const propsTitle = el("h3", {}, "Properties");
  treeHead.append(treeTitle);
  propsHead.append(propsTitle);
  const updateTitles = () => {
    const node = selection.length === 1 ? selectedNode() : undefined;
    propsTitle.textContent = node
      ? `Properties: ${kindName(node)}`
      : "Properties";
  };
  treeTitle.title =
    "Drag a row to reorder or move it into an operation. Click selects; Ctrl-click adds to the selection.";
  const treePanelBox = el(
    "section",
    { className: "csg-panel csg-tree-panel", ariaLabel: "Feature tree" },
    treeHead,
    el("div", { className: "csg-panel-body" }, treePanel.element),
  );
  const propsBox = el(
    "section",
    { className: "csg-panel csg-props-panel", ariaLabel: "Properties" },
    propsHead,
    el("div", { className: "csg-panel-body" }, properties.element),
  );
  const cube = createViewCube((name) => goView(name));
  let cubeVersion = -1;
  let cubeFrame = 0;
  const cubeLoop = () => {
    cubeFrame = requestAnimationFrame(cubeLoop);
    if (view.camera.version !== cubeVersion) {
      cubeVersion = view.camera.version;
      cube.update(rig());
    }
  };
  cubeLoop();
  app.append(toolbar, treePanelBox, propsBox, statusbar, cube.element);
  view_.append(stepInput);

  const detailsButton = el(
    "button",
    {
      type: "button",
      className: "csg-button",
      title: "How long each step of the last evaluation took",
      onclick: () => detailsPopover.current?.toggle(),
    },
    "Details",
  );
  statusbar.append(
    el("span", {}, dot, kernelText),
    busySpinner,
    validText,
    modeText,
    messageText,
    timeText,
    detailsButton,
  );
  lightPopover.current = popover(app, buttons.light!.element, fillLighting);
  stepPopover.current = popover(app, buttons.step!.element, fillStep);
  detailsPopover.current = popover(app, detailsButton, (card) =>
    card.replaceChildren(el("h4", {}, "Last evaluation"), ...detailsContent()),
  );

  /** The table of the last evaluation's steps. */
  const detailsContent = (): Node[] => {
    if (!shown) {
      return [
        el(
          "p",
          { className: "csg-note" },
          failure ? `Nothing to show: ${failure}` : "Waiting for the kernel…",
        ),
      ];
    }
    const { result } = shown;
    const t = result.timings;
    const faces = result.form.faceSurface.length;
    const kinds = new Map<string, number>();
    for (let f = 0; f < faces; f++) {
      const name =
        KIND_NAMES[result.form.surfaceIdentity[result.form.faceSurface[f]!]!] ??
        "Free-form";
      kinds.set(name, (kinds.get(name) ?? 0) + 1);
    }
    const row = (label: string, value: string, title?: string) =>
      el(
        "tr",
        title ? { title } : {},
        el("td", {}, label),
        el("td", {}, value),
      );
    return [
      el(
        "table",
        { className: "csg-table" },
        el(
          "tbody",
          {},
          row("Kernel", KERNEL_NAMES[result.kernel]),
          row(
            "Faces",
            `${faces}`,
            [...kinds].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", "),
          ),
          row(
            `Kernel (${result.booleans} booleans)`,
            ms(t.kernelMs),
            "Making the primitives, placing and tagging them, and every boolean",
          ),
          row(
            "Convert to B-rep",
            ms(t.convertMs),
            "The kernel's solid to the render form",
          ),
          row("Check", ms(t.validateMs), "validateBrep, in the worker"),
          row(
            "Prepare for the GPU",
            ms(t.prepareMs),
            "prepareGpuPatches, in the worker",
          ),
          row(
            "addBrep (page)",
            ms(shown.brepMs),
            "World.addBrep with the worker's prepared patches",
          ),
          row(
            "Edges (page)",
            settings.edges ? ms(shown.edgesMs) : "off",
            "The CPU mesh of the edges drawn over the faces",
          ),
          row(
            "Round trip",
            ms(t.roundTripMs),
            "From the request to the reply, on the page",
          ),
        ),
      ),
      ...(t.loadMs > 0
        ? [
            el(
              "p",
              { className: "csg-note" },
              `Loading the module took ${ms(t.loadMs)}.`,
            ),
          ]
        : []),
    ];
  };

  /** The status bar's summary of the solid shown. */
  function refreshResult() {
    kernelText.textContent = KERNEL_NAMES[settings.kernel];
    if (!shown) {
      validText.textContent = "";
      timeText.textContent = "";
      return;
    }
    const { result } = shown;
    const faces = result.form.faceSurface.length;
    const problems = result.problems;
    validText.textContent = "";
    validText.append(
      `${faces} faces · `,
      problems === undefined
        ? "checking…"
        : problems.length === 0
          ? el("span", { className: "csg-ok" }, "✓ valid")
          : el(
              "span",
              {
                className: "csg-bad",
                title: problems
                  .slice(0, 6)
                  .map((p) => `${p.kind}, ${p.entity} ${p.index}: ${p.message}`)
                  .join("\n"),
              },
              `✗ ${problems.length} problem${problems.length === 1 ? "" : "s"}`,
            ),
    );
    timeText.textContent = `${ms(result.timings.kernelMs)} kernel · ${ms(result.timings.roundTripMs)} total`;
  }

  // ----------------------------------------------------------- keyboard
  const onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    // Keys work while focus is anywhere in the workspace, or nowhere (after a click on the view).
    if (target !== document.body && !view_.contains(target)) {
      return;
    }
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA"
    ) {
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod) {
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "d") {
        event.preventDefault();
        duplicateSelected();
      }
      return;
    }
    if (event.altKey) {
      return;
    }
    if (event.key === "Escape") {
      if (picked || selection.length > 0) {
        select([]);
      }
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelected();
    } else if (event.key === "F2") {
      const id = primary();
      if (id !== undefined) {
        treePanel.rename(id);
      }
    } else if (event.shiftKey) {
      const views: Record<string, StandardView | "iso"> = {
        f: "front",
        t: "top",
        r: "right",
        i: "iso",
      };
      const name = views[key];
      if (name) {
        goView(name);
      }
    } else if (/^[1-5]$/.test(key)) {
      addPrimitive(PRIMITIVE_KINDS[Number(key) - 1]!);
    } else if (key === "u") {
      applyBoolean("union");
    } else if (key === "d") {
      applyBoolean("difference");
    } else if (key === "i") {
      applyBoolean("intersection");
    } else if (pickModeForKey(key)) {
      setPick(pickModeForKey(key)!);
    } else if (key === "e") {
      toggle("edges", !settings.edges);
    } else if (key === "w") {
      toggle("wire", !settings.wire);
    } else if (key === "x") {
      toggle("xray", !settings.xray);
    } else if (key === "c") {
      toggle("byLeaf", !settings.byLeaf);
    } else if (key === "g") {
      toggle("snap", !settings.snap);
    } else if (key === "f") {
      goView("iso");
    }
  };
  document.addEventListener("keydown", onKey);

  // The first state.
  refreshHistory();
  refreshToolbar();
  refreshTree();
  refreshProperties();
  refreshResult();
  dot.dataset.state = "busy";
  say("Loading the kernel…", false, 0);

  // The first evaluation: loads the kernel, then the default bracket.
  scheduler.commit();

  return () => {
    scheduler.stop();
    sequence++;
    clearTimeout(busyTimer);
    clearTimeout(messageTimer);
    cancelAnimationFrame(previewFrame);
    cancelAnimationFrame(cubeFrame);
    manipulator.dispose();
    treePanel.dispose();
    resizeWatch.disconnect();
    lightPopover.current?.close();
    stepPopover.current?.close();
    detailsPopover.current?.close();
    view_.removeEventListener("pointerdown", pointerDown);
    view_.removeEventListener("pointerup", pointerUp);
    view_.removeEventListener("pointerleave", hoverClear);
    document.removeEventListener("keydown", onKey);
    view_.removeEventListener("dragover", dragOver);
    view_.removeEventListener("drop", drop);
    view_.classList.remove("csg-view");
    if (previousTabIndex === null) {
      view_.removeAttribute("tabindex");
    }
    delete view_.dataset.loading;
    delete view_.dataset.pick;
    delete view_.dataset.cursor;
    style.remove();
    loading.remove();
    app.remove();
    cube.element.remove();
    stepInput.remove();
    session.dispose();
    removeShown();
    if (preview) {
      world.removeDraw(preview.draw);
      world.removeMesh(preview.mesh);
    }
    for (const { draw, mesh } of extras) {
      world.removeDraw(draw);
      world.removeMesh(mesh);
    }
    panel.replaceChildren();
  };
}
