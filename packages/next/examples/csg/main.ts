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
import { liftedEdges } from "../brep-first-look/meshes.ts";
import {
  EvaluationScheduler,
  KERNEL_NAMES,
  KernelSession,
  type Evaluated,
} from "./evaluator.ts";
import {
  DEFAULT_LIGHTING,
  LIGHTING_RANGES,
  applyLighting,
  decodeLighting,
  encodeLighting,
  type Lighting,
} from "./lighting.ts";
import { outlineOf } from "./preview.ts";
import { STEP_SAMPLES, fetchStepSample, isStepFile } from "./stepFiles.ts";
import { DoubleBuffer } from "./swap.ts";
import {
  OPERATIONS,
  OPERATION_LABELS,
  PRIMITIVE_KINDS,
  PRIMITIVE_SPECS,
  addChild,
  createLeaf,
  createOp,
  createStepLeaf,
  defaultBracket,
  duplicateNode,
  facesOfNode,
  findNode,
  indentNode,
  isStepLeaf,
  leavesOf,
  moveNode,
  outdentNode,
  parentOf,
  pathTo,
  recipeOf,
  removeNode,
  type CsgTree,
  type LeafNode,
  type OpNode,
  type PrimitiveKind,
  type TreeNode,
} from "./tree.ts";
import { CSS, el, field, segmented, type Phase } from "./ui.ts";

/**
 * A solid modeling sample with CSG (plan §13.33): a small CAD tool whose
 * interface is a tree of primitives and booleans. The application owns the
 * modeling and the engine draws and queries the result.
 *
 * - The tree (`tree.ts`) is plain data: leaves are primitives with
 *   parameters and a placement, nodes are unions, differences and
 *   intersections. It becomes a recipe (`SolidRecipe`) that a kernel in a Web
 *   Worker evaluates: Open CASCADE (the default, which measured faster here)
 *   or SMLib, switched in the panel, each converting its solid to the
 *   engine's one render form and saying which leaf made every face. The page
 *   only receives the form, with its patches prepared for the GPU, and gives
 *   it to `World.addBrep`.
 * - A STEP leaf is an imported solid (`stepFiles.ts`: a NIST sample from
 *   /step-samples/, a picked file or one dropped on the view). Open CASCADE's
 *   worker keeps the part (`registerStep`), centred on its bounds, and a
 *   recipe's `step` leaf is a copy of it with its own placement, so its faces
 *   carry the leaf's tag like a primitive's. Only Open CASCADE builds with
 *   it; with SMLib selected the sample says so and keeps the last solid.
 * - Picks go to the tree: a picked face names its leaf from the kernel's face
 *   tags (SMLib's attribute, OCCT's history) and the tree row, the path to the
 *   root and the leaf's faces light up; selecting a row lights the faces of
 *   everything under it.
 * - Editing: dragging a slider shows the edited primitive's wire at once as
 *   transient geometry (`preview.ts`) while the solid re-evaluates at a
 *   throttled rate in the worker (a newer evaluation supersedes one still
 *   pending, so a slow kernel skips states); the solid is checked on release.
 *   Picking is off while a parameter is dragged, so queries never read what
 *   the drag is about to replace.
 * - Changing the solid never shows a bad frame (`swap.ts`): a new solid's
 *   draws used a stand-in until their shader's texture loaded, and the face
 *   palette read from that stand-in gave black, so the whole model flashed
 *   black at every re-evaluation. The new solid is added hidden, drawn until
 *   `engine.whenReady` says no draw uses a stand-in (with a timeout, so a
 *   swap can't hang; a newer solid aborts the wait), and swapped in for the
 *   old one in one step; a new palette
 *   replaces the texture of the shader that is there rather than making a
 *   shader whose texture has to load.
 * - Lighting (`lighting.ts`): the sun's direction and strength, shadows,
 *   ambient occlusion and its radius, the sky's light and the exposure, kept
 *   in the link's `light` parameter.
 *
 * TODO (plan §13.33, owner 2026-11-10): the four-view layout, CAD's quad
 * view in third-angle projection (Top over Front, Right beside Front, and an
 * isometric perspective), with the three projected views linked and a pick in
 * any highlighting the same face and tree node in all four. It needs step
 * 5d's orthographic camera and the engine's linked views, which aren't built;
 * until then this is one perspective view. The pick-to-tree code
 * (`pickFace`) and the highlight (`applyColours`) are view-independent, so
 * the other views only add their own picks.
 */

const SITE = fromDegrees(-75.1652, 39.9526, 0);
const DEG = Math.PI / 180;
/** Linear RGBA of the B-rep edges, the selection's faces, the picked face and the drag preview. */
const EDGE_COLOR: [number, number, number, number] = [0, 0, 0, 1];
const SELECT = [1, 0.01, 0.26] as const;
const PICK = [1, 0.85, 0.02] as const;
const PREVIEW_COLOR: [number, number, number, number] = [1, 0.32, 0, 1];
/** How far edges lift off the faces, as a fraction of the solid's size. */
const LIFT = 0.0025;
const PALETTE_WIDTH = 256;
const PALETTE_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  if (fsInput.featureId < uniforms.base) {
    return;
  }
  // Until the palette has loaded the engine binds a 1 x 1 stand-in, and
  // reading a face's texel from it gives black: the plain colour then.
  if (textureDimensions(palette, 0).x < ${PALETTE_WIDTH}u) {
    return;
  }
  let face = fsInput.featureId - uniforms.base;
  let at = vec2<i32>(i32(face % ${PALETTE_WIDTH}u), i32(face / ${PALETTE_WIDTH}u));
  (*material).baseColor *= textureLoad(palette, at, 0).rgb;
}
`;

/** A leaf's colour in sRGB hue steps of the golden angle, so neighbours differ. */
function leafHsl(id: number): [number, number, number] {
  return [(id * 137.508) % 360, 0.6, 0.5];
}
function leafSwatch(id: number): string {
  const [h, s, l] = leafHsl(id);
  return `hsl(${h.toFixed(0)} ${s * 100}% ${l * 100}%)`;
}
/** Linear RGB of a leaf's colour. */
function leafColour(id: number): [number, number, number] {
  const [h, s, l] = leafHsl(id);
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [f(0), f(8), f(4)];
}
const PLAIN = linearOf("#c9ced6");

const OP_ICONS = { union: "∪", difference: "−", intersection: "∩" } as const;

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
  viewer.setControls("orbit");
  view.background = "color";
  view.clearColor = [0.78, 0.82, 0.88];
  view.lighting.environment = "procedural";

  const session = new KernelSession();
  const scheduler = new EvaluationScheduler({
    run: (final) => void evaluate(final),
  });
  const tree: { current: CsgTree } = { current: defaultBracket() };
  const settings = {
    kernel: (params.kernel === "smlib" ? "smlib" : "occt") as KernelName,
    edges: true,
    byLeaf: true,
  };
  /** The sun, shadows, occlusion, sky and exposure (`lighting.ts`), from the link's `light`. */
  const lighting: Lighting = decodeLighting(params.light);
  /** The selected node, and the face a pick chose (the node's own faces are drawn lighter than it). */
  let selectedId: number | undefined;
  let pickedFace: number | undefined;
  /** A slider is being dragged: picks are off, and the solid shown is a preview's. */
  let dragging = false;
  let previewLeaf: LeafNode | undefined;

  // ------------------------------------------------------------ the scene
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
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
  viewer.zoomTo(
    {
      center: vec3.add(
        vec3.vec3(),
        origin,
        mat4.transformPoint(vec3.vec3(), enu, vec3.vec3(0, -0.05, 0.6)),
      ),
      radius: 2.6,
    },
    -30 * DEG,
    -32 * DEG,
  );
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

  const removeSolid = (solid: Shown) => {
    world.removeBrep(solid.handle);
    if (solid.edges) {
      world.removeDraw(solid.edges.draw);
      world.removeMesh(solid.edges.mesh);
    }
  };
  /** Shows or hides all of a solid's draws. */
  const setSolidVisible = (solid: Shown, visible: boolean) => {
    for (const draw of faceDraws(solid.handle)) {
      world.setVisible(draw, visible);
    }
    if (solid.edges) {
      world.setVisible(solid.edges.draw, visible);
    }
  };
  const buffer = new DoubleBuffer<Shown>({
    reveal: (next, previous) => {
      shown = next;
      setSolidVisible(next, true);
      if (previous) {
        removeSolid(previous);
      }
      if (next.result.final && !dragging) {
        clearPreview();
      }
      refreshResult();
      refreshTree();
      refreshPicked();
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

  /** The leaf and the node ids a face's colour depends on. */
  const selectedLeafIds = (): Set<number> => {
    const node =
      selectedId === undefined ? undefined : findNode(tree.current, selectedId);
    return new Set(node ? leavesOf(node).map((leaf) => leaf.id) : []);
  };

  const paletteOf = (result: Evaluated) => {
    const faces = result.form.faceSurface.length;
    const image = new ImageData(
      PALETTE_WIDTH,
      Math.max(1, Math.ceil(faces / PALETTE_WIDTH)),
    );
    const chosen = selectedLeafIds();
    for (let face = 0; face < faces; face++) {
      const tag = result.faceTags[face]!;
      const colour =
        face === pickedFace
          ? PICK
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

  /** Colours a solid's faces by leaf; the selection's and the picked face's in their own colours. */
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
   * The shaders are compiled first, which saves frames of waiting.
   */
  const settled = async (solid: Shown, superseded: AbortSignal) => {
    await Promise.allSettled(
      [...solid.shaders.values()].map((shader) => engine.compileShader(shader)),
    );
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
      material: facesMaterial,
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

  /** The form's edges, lifted off the faces, as a line overlay (a CPU mesh of edges only). */
  const addEdges = (target: Shown) => {
    const start = performance.now();
    const form = target.result.form;
    const { min, max } = target.result.bounds;
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    try {
      const mesh = tessellateBrep(form, {
        tolerance: 0.001,
        faces: () => false,
      });
      if (mesh.edges.indices.length === 0) {
        return;
      }
      const lines = liftedEdges(form, mesh, size * LIFT);
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

  // ------------------------------------------------------- evaluation
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
    { className: "csg-loading", role: "status", hidden: true },
    el(
      "div",
      {},
      el("span", { className: "csg-spinner", ariaHidden: "true" }),
      loadingText,
    ),
  );
  const status = el("div", {
    className: "csg-status",
    role: "status",
    hidden: true,
  });
  view_.append(style, loading, status);

  let sequence = 0;
  let busyTimer: ReturnType<typeof setTimeout> | undefined;
  /** A line over the view, shown only if the kernel takes longer than a blink. */
  const busy = (text: string | undefined) => {
    clearTimeout(busyTimer);
    if (text === undefined) {
      status.hidden = true;
      return;
    }
    busyTimer = setTimeout(() => {
      status.textContent = text;
      delete status.dataset.bad;
      status.hidden = false;
    }, 200);
  };
  const setLoading = (text: string | undefined) => {
    loading.hidden = text === undefined;
    view_.toggleAttribute("data-loading", text !== undefined);
    if (text !== undefined) {
      loadingText.textContent = text;
    }
  };

  const evaluate = async (final: boolean) => {
    const mine = ++sequence;
    const recipe = recipeOf(tree.current.root);
    if (!recipe) {
      removeShown();
      failure = undefined;
      busy(undefined);
      setLoading(undefined);
      status.textContent = "Nothing to build: no node is enabled.";
      status.hidden = false;
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
          }
        },
      });
      if (mine !== sequence || signal.aborted) {
        return;
      }
      failure = undefined;
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
      busy(undefined);
      setLoading(undefined);
      if (failure) {
        status.textContent = `${KERNEL_NAMES[kernel]} failed: ${failure}. Showing the last good solid.`;
        status.dataset.bad = "";
        status.hidden = false;
      }
      refreshResult();
      refreshTree();
      refreshPicked();
    }
  };

  // ------------------------------------------------------------- picks
  /**
   * The tree node a pick of the view hits: the picked face's leaf. A face's
   * tag is its leaf's id, from the kernel's record of which input each
   * output face came from. Returns false when nothing of the solid was hit.
   */
  const pickFace = async (x: number, y: number): Promise<boolean> => {
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
        // Nothing drawn here.
        return false;
      }
      if (!shown?.faceDraws.has(info.draw.index)) {
        continue;
      }
      const face = info.localId;
      const tag = shown.result.faceTags[face];
      pickedFace = face;
      select(leavesOf(tree.current.root).find((l) => l.id === tag)?.id, true);
      return true;
    }
    return false;
  };
  const onPick = async (event: PointerEvent) => {
    // Nothing is picked while a parameter is dragged: the solid under the pointer is about to be replaced.
    if (dragging) {
      return;
    }
    const rect = viewer.canvas.getBoundingClientRect();
    if (
      !(await pickFace(event.clientX - rect.left, event.clientY - rect.top))
    ) {
      select(undefined);
    }
  };
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
  view_.addEventListener("pointerdown", pointerDown);
  view_.addEventListener("pointerup", pointerUp);

  // ------------------------------------------------------------- the panel
  const kernelChoice = segmented<KernelName>(
    "Kernel",
    [
      {
        value: "occt",
        label: "Open CASCADE",
        title: "Open CASCADE in WebAssembly (LGPL 2.1), about 23 MB",
      },
      {
        value: "smlib",
        label: "SMLib",
        title: "SMLib in WebAssembly (Apache 2.0)",
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
    kernelNote();
    scheduler.commit();
  };
  const kernelAbout = el("p", { className: "csg-note" });
  const kernelNote = () => {
    kernelAbout.textContent =
      settings.kernel === "smlib"
        ? "SMLib: every face arrives as Bézier patches, carrying its analytic identity. Provenance is an attribute SMLib copies through booleans. It doesn't read STEP files."
        : "Open CASCADE: faces stay analytic. Provenance is each boolean's history (Modified, IsDeleted). It also reads STEP files.";
  };
  kernelNote();

  const treeList = el("div", {
    className: "csg-tree",
    role: "tree",
    ariaLabel: "CSG tree",
  });
  const tools = el("div", { className: "csg-tools" });
  const stepTools = el("div", { className: "csg-tools" });
  const inspector = el("div", { className: "csg-group" });
  const resultBox = el("div", { className: "csg-group" });
  const pickedBox = el("div", { className: "csg-group" });

  /** STEP parts the OCCT worker holds for leaves of the tree, by key. */
  const stepKeys = new Set<number>();
  let nextStepKey = 1;
  /** Frees the parts no leaf uses any more (a leaf removed, or one of a copy). */
  const releaseUnusedSteps = () => {
    const used = new Set(
      leavesOf(tree.current.root)
        .filter(isStepLeaf)
        .map((leaf) => leaf.step.key),
    );
    for (const key of [...stepKeys]) {
      if (!used.has(key)) {
        stepKeys.delete(key);
        session.releaseStep(key).catch(() => undefined);
      }
    }
  };

  const structureChanged = () => {
    releaseUnusedSteps();
    refreshTree();
    refreshInspector();
    scheduler.commit();
  };
  const select = (id: number | undefined, fromPick = false) => {
    selectedId = id;
    if (!fromPick) {
      pickedFace = undefined;
    }
    refreshTree();
    refreshInspector();
    refreshPicked();
    applyColours();
    treeList
      .querySelector<HTMLElement>(`[data-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  /** How many faces each node made in the solid shown. */
  const faceCount = (node: TreeNode) =>
    shown ? facesOfNode(node, shown.result.faceTags).length : undefined;

  const ancestors = (): Set<number> =>
    new Set(
      selectedId === undefined
        ? []
        : pathTo(tree.current, selectedId)
            .slice(0, -1)
            .map((n) => n.id),
    );

  const refreshTree = () => {
    const rows: HTMLElement[] = [];
    const path = ancestors();
    const visit = (node: TreeNode, depth: number) => {
      const faces = faceCount(node);
      const toggle = el("input", {
        type: "checkbox",
        checked: node.enabled,
        title: node.enabled ? "In the model" : "Left out of the model",
        ariaLabel: `Include ${node.name}`,
        onclick: (e: Event) => e.stopPropagation(),
        onchange: () => {
          node.enabled = toggle.checked;
          structureChanged();
        },
      });
      const row = el(
        "div",
        {
          className: "csg-row",
          role: "treeitem",
          tabIndex: 0,
          ariaSelected: String(node.id === selectedId),
          ariaLevel: String(depth + 1),
          onclick: () => select(node.id),
          onkeydown: (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              select(node.id);
            } else if (e.key === "Delete" || e.key === "Backspace") {
              e.preventDefault();
              removeSelected(node.id);
            }
          },
        },
        toggle,
        node.type === "leaf"
          ? el("span", {
              className: "csg-swatch",
              style: `background:${leafSwatch(node.id)}`,
            })
          : el("span", { className: "csg-badge" }, OP_ICONS[node.operation]),
        el("span", { className: "csg-name", title: node.name }, node.name),
        el(
          "span",
          { className: "csg-badge" },
          node.type === "leaf"
            ? isStepLeaf(node)
              ? "STEP"
              : PRIMITIVE_SPECS[node.kind].label
            : OPERATION_LABELS[node.operation],
          faces === undefined
            ? ""
            : ` · ${faces} face${faces === 1 ? "" : "s"}`,
        ),
      );
      row.style.setProperty("--depth", String(depth));
      row.dataset.id = String(node.id);
      if (!node.enabled) {
        row.dataset.off = "";
      }
      if (path.has(node.id)) {
        row.dataset.under = "";
      }
      rows.push(row);
      if (node.type === "op") {
        node.children.forEach((child) => visit(child, depth + 1));
      }
    };
    visit(tree.current.root, 0);
    treeList.replaceChildren(...rows);
    refreshTools();
  };

  /** Where a new node goes: under the selected operation, or after the selected leaf. */
  const insertion = ():
    { target: OpNode; at: number | undefined } | undefined => {
    const selected =
      selectedId === undefined ? undefined : findNode(tree.current, selectedId);
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
  ) => {
    addChild(tree.current, place.target.id, node, place.at);
    selectedId = node.id;
    pickedFace = undefined;
    structureChanged();
    refreshPicked();
    applyColours();
  };
  const addAt = (what: string) => {
    const place = insertion();
    if (!place) {
      return;
    }
    const node: TreeNode = (PRIMITIVE_KINDS as readonly string[]).includes(what)
      ? createLeaf(tree.current, what as PrimitiveKind, {
          translate: [0, 0, 0.6],
        })
      : createOp(tree.current, what as OpNode["operation"]);
    addNode(node, place);
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
        throw new Error("it isn't a STEP file");
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
        addNode(leaf, place);
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
      busy(undefined);
      setLoading(undefined);
      if (problem) {
        status.textContent = problem;
        status.dataset.bad = "";
        status.hidden = false;
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
  const removeSelected = (id = selectedId) => {
    if (id === undefined) {
      return;
    }
    const parent = parentOf(tree.current, id);
    if (!parent) {
      return;
    }
    const at = parent.children.findIndex((child) => child.id === id);
    removeNode(tree.current, id);
    const neighbour = parent.children[Math.min(at, parent.children.length - 1)];
    selectedId = neighbour?.id ?? parent.id;
    pickedFace = undefined;
    structureChanged();
    refreshPicked();
  };

  const refreshTools = () => {
    const selected =
      selectedId === undefined ? undefined : findNode(tree.current, selectedId);
    const parent = selected ? parentOf(tree.current, selected.id) : undefined;
    const index = parent ? parent.children.indexOf(selected!) : -1;
    const button = (
      label: string,
      title: string,
      enabled: boolean,
      action: () => boolean | void,
    ) =>
      el(
        "button",
        {
          type: "button",
          title,
          ariaLabel: title,
          disabled: !enabled,
          onclick: () => {
            if (action() !== false) {
              structureChanged();
              refreshPicked();
              applyColours();
            }
          },
        },
        label,
      );
    const add = el(
      "select",
      {
        ariaLabel: "Add a node",
        title:
          selected?.type === "op"
            ? `Adds under ${selected.name}`
            : "Adds after the selected leaf, or under the model",
        onchange: () => {
          if (add.value) {
            addAt(add.value);
          }
        },
      },
      el("option", { value: "", textContent: "Add…" }),
      ...PRIMITIVE_KINDS.map((kind) =>
        el("option", { value: kind, textContent: PRIMITIVE_SPECS[kind].label }),
      ),
      ...OPERATIONS.map((op) =>
        el("option", { value: op, textContent: OPERATION_LABELS[op] }),
      ),
    );
    const id = selected?.id;
    tools.replaceChildren(
      add,
      button("↑", "Move up", index > 0, () => moveNode(tree.current, id!, -1)),
      button(
        "↓",
        "Move down",
        !!parent && index < parent.children.length - 1,
        () => moveNode(tree.current, id!, 1),
      ),
      button(
        "←",
        "Move out of its operation",
        !!parent && !!parentOf(tree.current, parent.id),
        () => outdentNode(tree.current, id!),
      ),
      button(
        "→",
        "Move into the operation above",
        index > 0 && parent!.children[index - 1]!.type === "op",
        () => indentNode(tree.current, id!),
      ),
      button("⧉", "Duplicate", !!parent, () => {
        const copy = duplicateNode(tree.current, id!);
        selectedId = copy?.id;
        pickedFace = undefined;
      }),
      button("✕", "Remove", !!parent, () => {
        removeSelected();
        return false;
      }),
    );
  };

  /** The value of an edit to the selected leaf: the preview at once, the evaluation at the scheduler's pace. */
  const edited = (leaf: LeafNode, phase: Phase) => {
    showPreview(leaf);
    if (phase === "drag") {
      dragging = true;
      scheduler.drag();
    } else if (phase === "type") {
      scheduler.edit();
    } else {
      dragging = false;
      scheduler.commit();
    }
  };

  const refreshInspector = () => {
    const node =
      selectedId === undefined ? undefined : findNode(tree.current, selectedId);
    if (!node) {
      inspector.replaceChildren(
        el(
          "p",
          { className: "csg-note" },
          "Select a node in the tree, or click a face of the solid, to edit it.",
        ),
      );
      return;
    }
    const name = el("input", {
      type: "text",
      value: node.name,
      ariaLabel: "Name",
      oninput: () => {
        node.name = name.value;
        treeList.querySelector(
          `[data-id="${node.id}"] .csg-name`,
        )!.textContent = node.name;
      },
    });
    const parts: Array<Node> = [
      el(
        "label",
        { className: "csg-name-field" },
        el("span", {}, "Name"),
        name,
      ),
    ];
    if (node.type === "op") {
      const operation = segmented(
        "Operation",
        OPERATIONS.map((op) => ({
          value: op,
          label: OPERATION_LABELS[op],
        })),
        () => node.operation,
        (op) => {
          node.operation = op;
          refreshTree();
          scheduler.commit();
        },
      );
      parts.push(
        operation.element,
        el(
          "p",
          { className: "csg-note" },
          node.operation === "difference"
            ? "The first operand minus all the rest."
            : `The ${node.operation} of all its operands.`,
        ),
      );
    } else {
      parts.push(
        ...(isStepLeaf(node)
          ? [
              el("h4", {}, "STEP part"),
              el(
                "p",
                { className: "csg-note" },
                `${node.step.file}, ${node.step.size.map((v) => v.toFixed(3)).join(" × ")} m, centred on its bounds. Open CASCADE only.`,
              ),
            ]
          : [
              el("h4", {}, "Parameters"),
              ...PRIMITIVE_SPECS[node.kind].params.map((spec) =>
                field({
                  label: spec.label,
                  value: node.params[spec.key]!,
                  min: spec.min,
                  max: spec.max,
                  step: spec.step,
                  floor: spec.min,
                  unit: "m",
                  onChange: (value, phase) => {
                    node.params[spec.key] = value;
                    edited(node, phase);
                  },
                }),
              ),
            ]),
        el("h4", {}, "Turn about x, then y, then z"),
        ...(["x", "y", "z"] as const).map((axis, i) =>
          field({
            label: `Rotate ${axis}`,
            value: node.rotate[i]!,
            min: -180,
            max: 180,
            step: 1,
            floor: -360,
            unit: "°",
            onChange: (value, phase) => {
              node.rotate[i] = value;
              edited(node, phase);
            },
          }),
        ),
        el("h4", {}, "Place its middle"),
        ...(["x", "y", "z"] as const).map((axis, i) =>
          field({
            label: `Move ${axis}`,
            value: node.translate[i]!,
            min: -2,
            max: 2,
            step: 0.01,
            floor: -100,
            unit: "m",
            onChange: (value, phase) => {
              node.translate[i] = value;
              edited(node, phase);
            },
          }),
        ),
      );
    }
    inspector.replaceChildren(...parts);
  };

  const refreshResult = () => {
    if (!shown) {
      resultBox.replaceChildren(
        el(
          "p",
          { className: "csg-note" },
          failure ? `Nothing to show: ${failure}` : "Waiting for the kernel…",
        ),
      );
      return;
    }
    const { result } = shown;
    const t = result.timings;
    const faces = result.form.faceSurface.length;
    const problems = result.problems;
    const row = (label: string, value: Node | string, title?: string) =>
      el(
        "tr",
        title ? { title } : {},
        el("td", {}, label),
        el("td", {}, value),
      );
    const valid =
      problems === undefined
        ? "not checked while dragging"
        : problems.length === 0
          ? el("span", { className: "csg-ok" }, "✓ valid, no problems")
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
            );
    const kinds = new Map<string, number>();
    for (let f = 0; f < faces; f++) {
      const name =
        KIND_NAMES[result.form.surfaceIdentity[result.form.faceSurface[f]!]!] ??
        "Free-form";
      kinds.set(name, (kinds.get(name) ?? 0) + 1);
    }
    resultBox.replaceChildren(
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
            "Validity",
            valid,
            "validateBrep, run in the worker on a final evaluation",
          ),
          row(
            `Kernel (${result.booleans} booleans)`,
            ms(t.kernelMs),
            "Making the primitives, placing and tagging them, and every boolean, in the kernel",
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
    );
  };

  const refreshPicked = () => {
    if (!shown || pickedFace === undefined) {
      pickedBox.replaceChildren(
        el(
          "p",
          { className: "csg-note" },
          "Click a face to see which node made it.",
        ),
      );
      return;
    }
    const { form, faceTags } = shown.result;
    const surface = form.faceSurface[pickedFace];
    if (surface === undefined) {
      pickedBox.replaceChildren();
      return;
    }
    const identity = KIND_NAMES[form.surfaceIdentity[surface]!] ?? "Free-form";
    const drawn = form.surfaceKind[surface] === 5 ? " (Bézier patches)" : "";
    const tag = faceTags[pickedFace]!;
    const path = tag > 0 ? pathTo(tree.current, tag) : [];
    pickedBox.replaceChildren(
      el(
        "p",
        {},
        `Face ${pickedFace}: ${identity.toLowerCase()}${drawn}`,
        path.length > 0
          ? `, made by ${path[path.length - 1]!.name}`
          : ", from no leaf of the tree (the kernel gave it no tag)",
      ),
      ...(path.length > 0
        ? [
            el(
              "div",
              { className: "csg-crumbs", ariaLabel: "Path to the root" },
              ...[...path].reverse().flatMap((node, i) => [
                ...(i > 0 ? ["‹"] : []),
                el(
                  "button",
                  {
                    type: "button",
                    title: `Select ${node.name}: its faces light up`,
                    onclick: () => select(node.id, true),
                  },
                  node.name,
                ),
              ]),
            ),
          ]
        : []),
    );
  };

  const toggles = el(
    "div",
    { className: "csg-toggles" },
    (() => {
      const box = el("input", {
        type: "checkbox",
        checked: settings.edges,
        onchange: () => setEdges(box.checked),
      });
      return el(
        "label",
        { title: "The exact edges, drawn over the faces." },
        "B-rep edges",
        box,
      );
    })(),
    (() => {
      const box = el("input", {
        type: "checkbox",
        checked: settings.byLeaf,
        onchange: () => {
          settings.byLeaf = box.checked;
          applyColours();
        },
      });
      return el(
        "label",
        { title: "Each face in the colour of the leaf that made it." },
        "Colour by leaf",
        box,
      );
    })(),
  );

  // ------------------------------------------------------------ lighting
  const lit = () => {
    applyLighting(viewer, lighting);
  };
  const persistLighting = () => setParams({ light: encodeLighting(lighting) });
  const lightingFields = el("div", { className: "csg-group" });
  const refreshLighting = () => {
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
            persistLighting();
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
          persistLighting();
        },
      });
      return el("label", { title }, label, box);
    };
    lightingFields.replaceChildren(
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
          title: "Back to the sample's own light",
          onclick: () => {
            Object.assign(lighting, DEFAULT_LIGHTING);
            lit();
            persistLighting();
            refreshLighting();
          },
        },
        "Reset lighting",
      ),
      el(
        "p",
        { className: "csg-note" },
        "Intensity 1 is the atmosphere's own light; another value is a white sun of that many times 100 klx. The engine's shadows have no softness or cascade options yet, and ambient occlusion has a radius but no strength.",
      ),
    );
  };

  // ----------------------------------------------------------- the panel
  const stepSelect = el(
    "select",
    {
      ariaLabel: "Import a NIST STEP sample",
      title:
        "A NIST test model, served from /step-samples/ (npm run setup fetches them)",
      onchange: () => {
        if (stepSelect.value) {
          void importSample(stepSelect.value);
          stepSelect.value = "";
        }
      },
    },
    el("option", { value: "", textContent: "STEP sample…" }),
    ...STEP_SAMPLES.map((sample) =>
      el("option", {
        value: sample.file,
        textContent: `${sample.name}: ${sample.description}`,
      }),
    ),
  );
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
  stepTools.append(
    stepSelect,
    el(
      "button",
      {
        type: "button",
        title:
          "Import a STEP file from disk (or drop one on the view): Open CASCADE builds with it",
        onclick: () => stepInput.click(),
      },
      "Open STEP…",
    ),
    stepInput,
  );
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

  panel.append(
    kernelChoice.element,
    kernelAbout,
    el("h3", {}, "Tree"),
    treeList,
    tools,
    stepTools,
    el("h3", {}, "Selected node"),
    inspector,
    el("h3", {}, "Solid"),
    resultBox,
    el("h3", {}, "Picked face"),
    pickedBox,
    el("h3", {}, "Display"),
    toggles,
    el("h3", {}, "Lighting"),
    lightingFields,
    el(
      "p",
      { className: "csg-note" },
      "One perspective view for now. The four-view layout (top, front, right and an isometric) waits for the orthographic camera.",
    ),
  );
  refreshLighting();
  refreshTree();
  refreshInspector();
  refreshResult();
  refreshPicked();

  const onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (event.key === "Escape" && target.tagName !== "INPUT") {
      select(undefined);
    }
  };
  view_.addEventListener("keydown", onKey);

  // The first evaluation: loads the kernel, then the default bracket.
  scheduler.commit();

  return () => {
    scheduler.stop();
    sequence++;
    clearTimeout(busyTimer);
    cancelAnimationFrame(previewFrame);
    view_.removeEventListener("pointerdown", pointerDown);
    view_.removeEventListener("pointerup", pointerUp);
    view_.removeEventListener("keydown", onKey);
    view_.removeEventListener("dragover", dragOver);
    view_.removeEventListener("drop", drop);
    view_.classList.remove("csg-view");
    if (previousTabIndex === null) {
      view_.removeAttribute("tabindex");
    }
    delete view_.dataset.loading;
    style.remove();
    loading.remove();
    status.remove();
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
