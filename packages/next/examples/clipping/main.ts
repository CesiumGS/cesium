import "./clipping.css";
import {
  CapScheduler,
  InspectController,
  enuBasis,
  orbitPose,
  type BrepForm,
  type CapColor,
  type ClipSet,
  type DrawHandle,
  type MeshCapTile,
  type View,
  type WorldClip,
} from "@cesium/next";
import type { Frame } from "@cesium/next/frames";
import {
  boundsFromKernel,
  KernelSession,
  patchesFromKernel,
} from "../brep-first-look/kernels.ts";
import { filletedBlockBrep } from "../brep-first-look/fixtures.ts";
import { formBounds } from "../../src/brep/formBounds.ts";
import type { Dispose, ExampleContext } from "../types.ts";
import { SectionCaps, type CapPart, type CapsReport } from "./caps.ts";
import { loadGltfTriangles } from "./gltf.ts";
import { SectionOverlay } from "./overlay.ts";
import { createPanel, el, type PanelModel } from "./panel.ts";
import {
  brepTarget,
  firstHit,
  meshTarget,
  tilesetTarget,
  type Found,
  type PickTarget,
} from "./picks.ts";
import {
  boxClip,
  createDesignFrame,
  cutPlanes,
  initialState,
  planeAxes,
  planeClip,
} from "./sections.ts";
import {
  add,
  createSite,
  dot,
  length,
  placement,
  scale,
  sub,
  type V3,
} from "./site.ts";

/**
 * Clipping and sections: the clip API on a b-rep, a closed mesh and a mesh
 * tileset at once, in one place on the Earth (the sample tileset's, in
 * Philadelphia).
 *
 * The content: NIST's CTC-05 from the STEP store, imported by Open CASCADE
 * in its worker and drawn as exact faces (a block with a bore if the worker
 * can't load), a closed torus (a glTF from the specs data, read twice: by the
 * engine for drawing and here for its triangles, which the engine keeps for
 * no caller), and the specs data's sample tileset of ten buildings.
 *
 * The section is two clip sets in the world, named in ITRF: a set of one or
 * two planes (union or intersection, keeping the inside or the outside) and
 * a set of one box. `View.setClips` opts the main view into them; the second
 * view, when split screen is on, doesn't, so one world is cut in one view and
 * whole in the other. The handles are a drawing over the view (overlay.ts),
 * because a handle in the scene would be cut by its own plane.
 *
 * The caps are the application's (nothing yet makes them): `BrepCaps` for the
 * part, exact, and `MeshCaps` for the torus and the tileset's tiles, which it
 * is fed (`setTile`) from `Tile.geometry`, a tileset's retained triangles. A
 * `CapScheduler` rebuilds them within a budget as a handle moves. A pick
 * is asked of the GPU (clip-aware, as the view draws) and of the geometry
 * queries in float64 (`rayHit`, with the view's clips and without them).
 *
 * Curved clip: the plane is named in a frame under ITRF that a reprojection
 * waves (sections.ts), so no rigid test can draw it and the engine cuts it
 * along a signed distance fitted per draw. Caps are for planes in a rigid
 * frame; this one has none.
 */

const TORUS =
  "/specs-data/Models/glTF-2.0/TorusQuantized/glTF/TorusQuantized.gltf";
const TILESET = "/specs-data/Cesium3DTiles/Tilesets/Tileset/tileset.json";
/** NIST's CTC-05: a flanged base with bolt holes and a stepped post. */
const STEP_FILE = "nist_ctc_05_asme1_rd.stp";
/** The part's largest extent as drawn, m. */
const PART_SIZE = 56;
/** The torus model is 2.5 units across; drawn this many metres across. */
const TORUS_SIZE = 40;
/** Where the part and the torus stand, local metres. */
const PART_AT: V3 = [-75, -150, 0];
const TORUS_AT: V3 = [60, -150, 0];
const DEG = Math.PI / 180;
const DEFAULT_CAP_COLOR = "#e8913a";
/** How long a moving clip rests before the b-rep caps are rebuilt, ms. */
const BREP_SETTLE_MS = 200;
/** The camera frames the scene about here, local metres. */
const MIDDLE: V3 = [0, -60, 18];

/** A colour input's #rrggbb as linear RGBA. */
function linearColor(hex: string): CapColor {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(0), channel(1), channel(2), 1];
}

const metres = (m: number) =>
  Math.abs(m) >= 100 ? `${m.toFixed(0)} m` : `${m.toFixed(2)} m`;

export async function run({
  viewer,
  panel,
  scope,
  signal,
  accessToken,
}: ExampleContext): Promise<Dispose> {
  const { engine, world, view } = viewer;
  const kernels = new KernelSession();
  viewer.creditsShown = false;
  viewer.setControls("orbit");
  view.background = "color";
  view.clearColor = [0.78, 0.82, 0.88];
  view.lighting.environment = "procedural";
  view.observer.exposure = { ev100: 15 };
  const scrub = (text: string) =>
    accessToken !== undefined && accessToken.length >= 8
      ? text.split(accessToken).join("[redacted]")
      : text;

  const site = createSite();
  const itrf = viewer.frames.get("ITRF") as Frame;
  const state = initialState();
  const model: PanelModel = {
    state,
    caps: { brep: true, mesh: true, color: DEFAULT_CAP_COLOR },
    split: false,
    secondClipped: false,
  };
  const capColor = (): CapColor => linearColor(model.caps.color);

  // ------------------------------------------------ the loading overlay
  const container = viewer.container;
  container.classList.add("cl-view");
  const loadingText = el("span");
  const loading = el(
    "div",
    { className: "cl-loading", role: "status", hidden: true },
    el(
      "div",
      {},
      el("span", { className: "cl-spinner", ariaHidden: "true" }),
      loadingText,
    ),
  );
  container.append(loading);
  const stage = (text: string) => {
    loadingText.textContent = text;
  };
  scope.defer(() => {
    container.classList.remove("cl-view");
    delete container.dataset.loading;
    loading.remove();
  });

  // ----------------------------------------------------------- the ground
  const groundMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.95,
  });
  const partMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.55,
    metallic: 0.2,
  });
  const capMaterial = world.addMaterial({
    baseColor: [1, 1, 1, 1],
    roughness: 0.8,
  });
  const half = 420;
  const ground: DrawHandle = world.addDraw({
    mesh: world.addMesh({
      positions: new Float32Array([
        -half,
        -half,
        -0.05,
        half,
        -half,
        -0.05,
        half,
        half,
        -0.05,
        -half,
        half,
        -0.05,
      ]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    }),
    origin: site.origin,
    model: site.rotation(placement([0, 0, 0], 1)),
    material: groundMaterial,
    color: [0.62, 0.66, 0.6, 1],
    doubleSided: true,
    name: "Ground",
  });
  scope.defer(() => world.removeDraw(ground));

  // ------------------------------------------------------ clips and views
  const scheduler = new CapScheduler();
  let design: ReturnType<typeof createDesignFrame> | undefined;
  let planeSet: ClipSet = planeClip(site, state, itrf);
  let boxSet: ClipSet = boxClip(site, state, itrf);
  const planeWorldClip: WorldClip = world.addClip(planeSet);
  const boxWorldClip: WorldClip = world.addClip(boxSet);
  scope.defer(() => {
    view.clipMask = 0;
    world.removeClip(planeWorldClip);
    world.removeClip(boxWorldClip);
  });
  // The plane's caps and the box's, made when the content has loaded: they
  // need the part's forms.
  const capSets: SectionCaps[] = [];

  let second: View | undefined;
  let secondController: InspectController | undefined;
  let removeSecondLayer: (() => void) | undefined;

  const overlay = new SectionOverlay(container, site, state, () => {
    panelControls.sync();
    applyClips();
  });
  scope.defer(() => overlay.dispose());
  overlay.addLayer(view, true);

  /** The state's clips into the world, the views' masks and the caps. */
  function applyClips(): void {
    const planeFrame = state.curved && design ? (design as Frame) : itrf;
    planeSet = planeClip(site, state, planeFrame);
    boxSet = boxClip(site, state, itrf);
    world.setClip(planeWorldClip, planeSet);
    world.setClip(boxWorldClip, boxSet);
    const used: WorldClip[] = [];
    if (state.plane.on) {
      used.push(planeWorldClip);
    }
    if (state.box.on) {
      used.push(boxWorldClip);
    }
    view.setClips(used);
    second?.setClips(model.secondClipped ? used : []);
    followCaps(true);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => followCaps(false), BREP_SETTLE_MS);
    overlay.update();
    engine.requestRender();
  }
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  scope.defer(() => clearTimeout(settleTimer));

  /** `moving`: a clip is being dragged, so the b-rep caps wait for it to settle. */
  function followCaps(moving = false): void {
    // Caps are for planes in a rigid frame: a curved plane has none.
    capSets[0]?.follow(
      state.plane.on && !state.curved ? planeSet : undefined,
      model.caps.brep,
      model.caps.mesh,
      moving,
    );
    capSets[1]?.follow(
      state.box.on ? boxSet : undefined,
      model.caps.brep,
      model.caps.mesh,
      moving,
    );
    panelControls.setCapNote(
      state.curved && state.plane.on
        ? "The plane is curved: caps are built for planes in a rigid frame, so it has none. The box's still do."
        : undefined,
    );
    // The scheduler runs in the engine's tick, which a resting engine skips:
    // nothing wakes it when caps go out of date.
    engine.requestRender();
  }

  // ----------------------------------------------------------- the views
  const frameScene = () => {
    viewer.zoomTo(
      { center: site.world(MIDDLE), radius: 120 },
      20 * DEG,
      -30 * DEG,
    );
  };

  /** The main view's orbit pose now: about its pivot, or the plane's middle. */
  const currentPose = () => {
    const pivot = viewer.orbitPivot ?? site.world(state.plane.center);
    return orbitPose(view.camera.position, pivot, enuBasis(pivot), 0);
  };

  let glideFrame = 0;
  scope.defer(() => cancelAnimationFrame(glideFrame));
  /** Turns the main view's orbit to a pose in a third of a second. */
  const glide = (
    target: Float64Array,
    to: { heading: number; pitch: number; range: number },
  ) => {
    cancelAnimationFrame(glideFrame);
    const from = currentPose() ?? to;
    // The shortest way round.
    let turn = (to.heading - from.heading) % (2 * Math.PI);
    if (turn > Math.PI) {
      turn -= 2 * Math.PI;
    } else if (turn < -Math.PI) {
      turn += 2 * Math.PI;
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 350);
      const e = k * k * (3 - 2 * k);
      viewer.setControls("orbit", {
        target,
        heading: from.heading + turn * e,
        pitch: from.pitch + (to.pitch - from.pitch) * e,
        range: from.range + (to.range - from.range) * e,
      });
      engine.requestRender();
      if (k < 1) {
        glideFrame = requestAnimationFrame(step);
      }
    };
    glideFrame = requestAnimationFrame(step);
  };

  /** Looks square at the cut from where its cap faces: out of what is kept. */
  const sectionView = () => {
    const { n } = planeAxes(state.plane.heading, state.plane.tilt);
    const out = state.planeKeeps === "inside" ? n : scale(n, -1);
    const target = site.world(state.plane.center);
    const range = Math.max(
      90,
      Math.hypot(...sub(site.local(view.camera.position), state.plane.center)),
    );
    const pose = orbitPose(
      site.world(add(state.plane.center, scale(out, range))),
      target,
      enuBasis(target),
      state.plane.heading * DEG,
    );
    if (pose) {
      glide(target, pose);
    }
  };

  const mainLabel = el("div", { className: "cl-label cl-label-main" });
  const secondLabel = el("div", { className: "cl-label cl-label-second" });
  const paintLabels = () => {
    mainLabel.hidden = secondLabel.hidden = !second;
    mainLabel.textContent = "Cut by the clips";
    secondLabel.textContent = model.secondClipped
      ? "Cut by the clips too"
      : "Not using the clips: whole";
  };
  container.append(mainLabel, secondLabel);
  scope.defer(() => {
    mainLabel.remove();
    secondLabel.remove();
  });
  function closeSecond(): void {
    if (second) {
      removeSecondLayer?.();
      secondController?.dispose();
      engine.removeView(second);
      second = secondController = removeSecondLayer = undefined;
    }
    view.viewport = { x: 0, y: 0, width: 1, height: 1 };
  }
  function setSplit(on: boolean): void {
    model.split = on;
    if (on && !second) {
      view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
      second = engine.addView({
        target: viewer.target,
        world,
        viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
        background: "color",
        clearColor: view.clearColor,
      });
      Object.assign(second.lighting, view.lighting);
      second.observer.exposure = view.observer.exposure;
      second.outputEncoding = view.outputEncoding;
      secondController = new InspectController(second, viewer.canvas, {
        minRange: 1,
      });
      // From the other side of the scene.
      secondController.focus(site.world(MIDDLE), 200 * DEG, -25 * DEG, 420);
      removeSecondLayer = overlay.addLayer(second, false);
    } else if (!on) {
      closeSecond();
    }
    paintLabels();
    panelControls.sync();
    applyClips();
  }
  paintLabels();
  scope.defer(closeSecond);

  // ------------------------------------------------------------ the panel
  const panelControls = createPanel(panel, model, {
    clipChanged: applyClips,
    capsChanged: followCaps,
    colorChanged: () => {
      for (const caps of capSets) {
        caps.restyle();
      }
    },
    sectionView,
    resetView: frameScene,
    setSplit,
    secondClipChanged: () => {
      paintLabels();
      applyClips();
    },
    curvedChanged: () => {
      if (state.curved && !design) {
        design = createDesignFrame(viewer.frames, site);
      }
      applyClips();
    },
  });
  scope.defer(() => panel.replaceChildren());

  // -------------------------------------------------------------- content
  const notes: string[] = [];
  const targets: PickTarget[] = [];
  /** The part's draws, to tell a pick on it. */
  const partDraws = new Set<number>();
  const parts: CapPart[] = [];
  let torusTile: Omit<MeshCapTile, "id" | "revision"> | undefined;
  let tilesetFeed: (() => void) | undefined;

  const loadPart = async (): Promise<void> => {
    stage("Importing NIST CTC-05 with Open CASCADE…");
    let forms: BrepForm[];
    const load = await kernels.loadStep(STEP_FILE, stage);
    if ("problem" in load) {
      forms = [filletedBlockBrep()];
      notes.push(
        `The STEP part didn't load (${scrub(load.problem)}): a block with a bore stands in.`,
      );
    } else {
      forms = load.forms;
      notes.push(
        `${load.file}: ${load.forms.length} solid${load.forms.length === 1 ? "" : "s"}, imported by Open CASCADE.`,
      );
    }
    if (signal.aborted) {
      return;
    }
    stage("Preparing the faces for the GPU…");
    const boxes = forms.map((f) => boundsFromKernel(f) ?? formBounds(f));
    const lo = [0, 1, 2].map((k) => Math.min(...boxes.map((b) => b.min[k]!)));
    const hi = [0, 1, 2].map((k) => Math.max(...boxes.map((b) => b.max[k]!)));
    const longest = Math.max(...[0, 1, 2].map((k) => hi[k]! - lo[k]!));
    const s = PART_SIZE / longest;
    const local = placement(
      [
        PART_AT[0] - ((lo[0]! + hi[0]!) / 2) * s,
        PART_AT[1] - ((lo[1]! + hi[1]!) / 2) * s,
        -lo[2]! * s,
      ],
      s,
    );
    const drawn = site.rotation(local);
    const formToFrame = site.matrix(local);
    for (const form of forms) {
      const prepared = patchesFromKernel(form);
      const handle = world.addBrep(form, {
        origin: site.origin,
        model: drawn,
        material: partMaterial,
        color: [0.74, 0.79, 0.88, 1],
        doubleSided: true,
        name: "B-rep part",
        ...(prepared ? { prepared } : {}),
      });
      scope.defer(() => world.removeBrep(handle));
      for (const draw of [handle.patches, handle.trimmed, handle.mesh]) {
        if (draw) {
          partDraws.add(draw.index);
        }
      }
      parts.push({ form, origin: site.origin, model: drawn, formToFrame });
      targets.push(
        brepTarget("B-rep part", () => form, formToFrame, site.origin),
      );
    }
  };

  const loadTorus = async (): Promise<void> => {
    stage("Loading the closed mesh model…");
    const size = TORUS_SIZE / 2.5;
    // Y up to Z up, scaled, and set on the ground (its tube is 0.5 across).
    const matrix = site.matrix(
      placement([TORUS_AT[0], TORUS_AT[1], 0.25 * size], size, true),
    );
    const [triangles, resource] = await Promise.all([
      loadGltfTriangles(TORUS, signal),
      viewer.loadModel(TORUS, {
        signal,
        axes: "none",
        name: "Closed mesh model",
      }),
    ]);
    using held = resource;
    if (signal.aborted) {
      return;
    }
    scope.use(held.place({ modelMatrix: matrix, name: "Closed mesh model" }));
    torusTile = { ...triangles, matrix, geometricError: 0 };
    targets.push(
      meshTarget(
        "Closed mesh model",
        triangles.positions,
        triangles.indices,
        matrix,
      ),
    );
    notes.push(
      `TorusQuantized.gltf: ${triangles.indices.length / 3} triangles, closed.`,
    );
  };

  const loadTileset = async (): Promise<void> => {
    stage("Loading the tileset…");
    const tileset = await viewer.addTileset(
      new URL(TILESET, location.href).href,
      { retainGeometry: true },
    );
    if (signal.aborted) {
      viewer.remove(tileset);
      return;
    }
    scope.defer(() => viewer.remove(tileset));
    targets.push(tilesetTarget("Tileset", tileset));
    // Each loaded tile's triangles go to both sets' mesh caps, and leave
    // with the tile.
    const known = new Map<object, string[]>();
    let counter = 0;
    const nextId = () => `tile ${counter++}`;
    tilesetFeed = () => {
      if (capSets.length === 0) {
        return;
      }
      const seen = new Set<object>();
      for (const tile of tileset.state.loaded) {
        seen.add(tile);
        if (known.has(tile) || !tile.geometry) {
          continue;
        }
        const base = nextId();
        const ids = tile.geometry.map((g, i) => {
          const id = `${base}:${i}`;
          for (const caps of capSets) {
            caps.setTile({
              id,
              revision: 1,
              positions: g.positions,
              indices: g.indices,
              matrix: g.matrix,
              // One element for the whole tileset: its buildings stand apart.
              featureIds: new Uint32Array(g.positions.length / 3).fill(2),
              geometricError: tile.geometricError,
            });
          }
          return id;
        });
        known.set(tile, ids);
      }
      for (const [tile, ids] of known) {
        if (!seen.has(tile)) {
          for (const id of ids) {
            for (const caps of capSets) {
              caps.removeTile(id);
            }
          }
          known.delete(tile);
        }
      }
    };
    notes.push("The sample tileset: ten buildings, as meshes.");
  };

  frameScene();
  viewer.setSun(150, 40);
  container.dataset.loading = "";
  loading.hidden = false;
  const loads = await Promise.allSettled([
    loadPart(),
    loadTorus(),
    loadTileset(),
  ]);
  loading.hidden = true;
  delete container.dataset.loading;
  loads.forEach((result, i) => {
    if (result.status === "rejected") {
      notes.push(
        `${["The part", "The torus", "The tileset"][i]} didn't load: ${scrub(String(result.reason))}`,
      );
    }
  });
  panelControls.setContent(notes.join(" "));
  if (signal.aborted) {
    return () => kernels.dispose();
  }

  // The caps, a set of them for each clip, fed the torus and the tiles.
  const makeCaps = (name: string) => {
    const caps = new SectionCaps({
      world,
      scheduler,
      parts,
      material: capMaterial,
      color: capColor,
      name,
    });
    scope.defer(() => caps.dispose());
    if (torusTile) {
      caps.setTile({
        id: "torus",
        revision: 1,
        ...torusTile,
        featureIds: new Uint32Array(torusTile.positions.length / 3).fill(1),
      });
    }
    return caps;
  };
  capSets.push(makeCaps("Section cap (plane)"), makeCaps("Section cap (box)"));
  parts.forEach((part, i) => {
    targets.push(
      brepTarget(
        "B-rep cap (plane)",
        () => capSets[0]?.capForm(i),
        part.formToFrame,
        site.origin,
      ),
      brepTarget(
        "B-rep cap (box)",
        () => capSets[1]?.capForm(i),
        part.formToFrame,
        site.origin,
      ),
    );
  });
  applyClips();

  // ------------------------------------------------------------ each tick
  let lastReport = 0;
  const showCaps = () => {
    const reports = capSets.map((c) => c.report());
    const sum = (f: (r: CapsReport) => number) =>
      reports.reduce((n, r) => n + f(r), 0);
    const { capReadout } = panelControls;
    const unsupported = reports.find((r) => r.brep.unsupported)?.brep
      .unsupported;
    capReadout.set(
      "B-rep caps",
      unsupported
        ? unsupported
        : `${sum((r) => r.brep.faces)} faces, ${sum((r) => r.brep.area).toFixed(1)} m²`,
    );
    const near = sum((r) => r.mesh.nearMisses);
    capReadout.set(
      "Mesh caps",
      `${sum((r) => r.mesh.closedLoops)} closed loops${near > 0 ? `, ${near} near misses` : ""}`,
    );
    const open = sum((r) => r.mesh.openChains);
    capReadout.set(
      "Section lines",
      open > 0 ? `${open} open chains, drawn as lines` : "none",
    );
    capReadout.set(
      "Rebuilt in",
      `b-rep ${sum((r) => r.brep.ms).toFixed(0)} ms, mesh ${sum((r) => r.mesh.ms).toFixed(0)} ms`,
    );
  };

  const mark = el("div", { className: "cl-pick", hidden: true });
  container.append(mark);
  scope.defer(() => mark.remove());
  let picked: Float64Array | undefined;
  let pickedIn: View = view;
  const markPick = () => {
    const px = picked && pickedIn.toPixel(picked);
    mark.hidden = !px;
    if (px) {
      const { x, y } = pickedIn.viewport;
      const rect = container.getBoundingClientRect();
      mark.style.transform = `translate(${(px[0]! + x * rect.width).toFixed(1)}px, ${(px[1]! + y * rect.height).toFixed(1)}px) translate(-50%, -50%)`;
    }
  };

  const offTick = engine.onAfterTick((now) => {
    tilesetFeed?.();
    const tick = scheduler.tick();
    if (tick.rebuilt > 0 || tick.pending > 0) {
      engine.requestRender();
    }
    overlay.update();
    markPick();
    if (now - lastReport > 250) {
      lastReport = now;
      showCaps();
    }
  });
  scope.defer(offTick);

  // -------------------------------------------------------------- picking
  const onPick = async (event: PointerEvent) => {
    const rect = viewer.canvas.getBoundingClientRect();
    const ratio = viewer.canvas.width / Math.max(1, rect.width);
    const px = (event.clientX - rect.left) * ratio;
    const py = (event.clientY - rect.top) * ratio;
    const at = [view, second].find((v) => v?.contains(px, py));
    if (!at) {
      return;
    }
    const area = at.pixelRect();
    const x = px - area.x;
    const y = py - area.y;
    // The camera as it is now, for the exact ray.
    const camera = at.camera;
    const direction = camera.rayDirection(
      (x / area.width) * 2 - 1,
      1 - (y / area.height) * 2,
      area.width / area.height,
      new Float64Array(3),
    );
    const from = Float64Array.from(camera.position);
    const [hit, point] = await Promise.all([
      at.pick(x, y),
      at.pickPosition(x, y),
    ]);
    if (signal.aborted) {
      return;
    }
    picked = point;
    pickedIn = at;
    const { pickReadout } = panelControls;
    const where = (p: ArrayLike<number>) => {
      const l = site.local(p);
      return `east ${metres(l[0])}, north ${metres(l[1])}, up ${metres(l[2])}`;
    };
    // The draw that drew the pixel says what it is: a cap of one of the
    // sets, the part (its feature is a face), or something else (the
    // ground, a tile).
    const info = hit && world.feature(hit.featureId);
    const draw = info?.draw;
    const capSet = draw ? capSets.findIndex((caps) => caps.owns(draw)) : -1;
    const label = !draw
      ? undefined
      : capSet >= 0
        ? `section cap of the ${capSet === 0 ? "plane" : "box"}`
        : partDraws.has(draw.index)
          ? `B-rep part, face ${info?.localId}`
          : (draw.name ?? `tileset, feature ${hit?.name ?? hit?.featureId}`);
    pickReadout.set(
      "Drawn",
      label && point
        ? `${label}, ${where(point)}`
        : "nothing: the sky, or all of it cut away",
    );
    // The same ray in float64 through the exact geometry, with this view's
    // clips and without them.
    const describe = (found: Found | undefined) =>
      found
        ? `${found.target}, ${found.entity}, ${found.distance.toFixed(2)} m along; ${found.accuracy}`
        : "no hit";
    pickReadout.set(
      "Exact, clipped",
      describe(
        firstHit(
          targets,
          from,
          direction,
          3000,
          site.origin,
          engine.clipFilter(at),
        ),
      ),
    );
    pickReadout.set(
      "Exact, whole",
      describe(firstHit(targets, from, direction, 3000, site.origin)),
    );
    // On a cap, the point on the cut face: the ray meets the cap's plane in
    // float64, where the depth read is good to float32 at this range.
    if (point && capSet >= 0) {
      const l = site.local(point);
      const planes = cutPlanes(state, capSet === 0 ? "plane" : "box");
      const nearest = planes.reduce((best, p) =>
        Math.abs(dot(sub(l, p.point), p.normal)) <
        Math.abs(dot(sub(l, best.point), best.normal))
          ? p
          : best,
      );
      const o = site.local(from);
      const d = site.localDirection(direction);
      const t =
        dot(sub(nearest.point, o), nearest.normal) / dot(d, nearest.normal);
      const exact = add(o, scale(d, t));
      const offset = sub(exact, nearest.point);
      pickReadout.set(
        "On the cap",
        `${nearest.name}: u ${metres(dot(offset, nearest.u))}, v ${metres(dot(offset, nearest.v))} on the cut face; the depth read is ${(length(sub(l, exact)) * 1000).toFixed(0)} mm from it`,
      );
    } else {
      pickReadout.set("On the cap", "not on a cap");
    }
    engine.requestRender();
  };
  let down: { x: number; y: number } | undefined;
  const pointerDown = (e: PointerEvent) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : undefined;
  };
  const pointerUp = (e: PointerEvent) => {
    const from = down;
    down = undefined;
    if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 4) {
      void onPick(e);
    }
  };
  viewer.canvas.addEventListener("pointerdown", pointerDown);
  viewer.canvas.addEventListener("pointerup", pointerUp);
  scope.defer(() => {
    viewer.canvas.removeEventListener("pointerdown", pointerDown);
    viewer.canvas.removeEventListener("pointerup", pointerUp);
  });

  // F-REP PLACEHOLDER: when the engine draws an f-rep (a signed distance
  // field), add one here beside the torus. `sdfGeometry` already answers
  // clipped rays (`clips` on `RayHitOptions`); a plane's cap on one is the
  // zero set of its field in the plane, a 2-D contour that would join
  // `SectionCaps` as a third kind of cap, and its pick joins `targets`.

  return () => {
    kernels.dispose();
  };
}
