import "./vertical-exaggeration.css";
import {
  EARTH,
  Ellipsoid,
  eastNorthUpToFixedFrame,
  mat4,
  type CorePick,
  type ModelPlacement,
} from "@cesium/next";
import { truePick, type Frames } from "@cesium/next/frames";
import { Instant } from "@cesium/next/time";
import type { Dispose, ExampleContext } from "../types.ts";
import {
  createExaggeration,
  MAX_EXAGGERATION,
  scaleOf,
} from "./exaggeration.ts";
import { createLoading, type LoadingState } from "./loading.ts";
import { createHeightPanel } from "./heightPanel.ts";
import {
  attach,
  createHeightVisuals,
  type HeightKey,
} from "./heightVisuals.ts";
import { createPins } from "./pins.ts";
import { CAMERA, CLOSE_UP, PLACES, positionOf, type Shot } from "./places.ts";
import {
  readMeasurement,
  readPick,
  type MeasurementReading,
  type PickReading,
} from "./readings.ts";
import { createRuler } from "./ruler.ts";
import { createSites, trackGround } from "./sites.ts";

/**
 * Vertical exaggeration: everything in the scene drawn up to ten times as
 * tall, by one reference frame and a camera rig. Nothing is set on any item.
 *
 * The application's part is `exaggeration.ts`: a frame whose edge to ITRF is
 * the warp (`verticalExaggeration`, so no Jacobian is written by hand), and
 * a rig that puts the camera on it. The globe's terrain, a tileset (Cesium
 * OSM Buildings), a model and the pins all keep their true coordinates and
 * are drawn where the route to that frame puts them: terrain exactly (the
 * helper says it scales heights above the ellipsoid), the rest from a fit
 * made once and scaled by the slider's one float. Pins are billboards, so
 * they stay upright; the truck can too (`warpAt: "anchor"`).
 *
 * Questions are asked in true coordinates. A pick's drawn position is in the
 * frame the camera is on, but the pick also gives the true point (`truePick`:
 * the content's own point, or the drawn one taken back through the route it
 * was drawn by) and the page reads its height in ITRF. The ruler's numbers
 * come from the measure module on those true points, so they don't move
 * with the slider; the drawn heights beside them do.
 */

const ION_OSM_BUILDINGS = 96188;
const TRUCK =
  "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
/** The truck is a few metres long: drawn this much larger, it reads from the camera's range. */
const TRUCK_SCALE = 25;
const DEFAULT_FACTOR = 4;
const deg = Math.PI / 180;

const metres = (m: number) => `${Math.round(m).toLocaleString("en-US")} m`;
const signedMetres = (m: number) => `${m < 0 ? "−" : ""}${metres(Math.abs(m))}`;
const distance = (m: number) =>
  m >= 10_000 ? `${(m / 1000).toFixed(1)} km` : metres(m);

/** An end of the measurement: a place, or a picked point. */
interface End {
  readonly name: string;
  /** The site it follows as terrain refines; none for a picked point. */
  readonly siteId?: string;
  position: Float64Array;
}

export async function run({
  viewer,
  panel,
  scope,
  signal,
  params,
  setParams,
  accessToken,
}: ExampleContext): Promise<Dispose> {
  const { engine, world, view } = viewer;
  const scrub = (text: string) =>
    accessToken !== undefined && accessToken.length >= 8
      ? text.split(accessToken).join("[redacted]")
      : text;

  // ------------------------------------------------ the frame and the rig
  const initial = Number(params.x);
  const start =
    Number.isFinite(initial) && initial >= 1 && initial <= MAX_EXAGGERATION
      ? initial
      : DEFAULT_FACTOR;
  const scale = world.createPlacementParameter(scaleOf(start), {
    range: [0, 1],
  });
  const exaggeration = createExaggeration(viewer.frames, scale);
  const itrf = viewer.frames.get("ITRF");
  // The viewer's camera is on ITRF: the rig moves it onto the frame across
  // the warp, the camera carried through the route.
  engine.cameras.setRig(view, {
    position: { frame: exaggeration.frame },
    orientation: { kind: "free" },
  });
  // The camera controller keeps above the ground as drawn: it takes the
  // true ground height (the viewer's) through the view's route itself, and
  // lifts the camera only where the drawn ground would cover it. A margin,
  // since terrain drawn ten times as steep is close to a wall.
  const earth = world.bodyAnchor(EARTH);
  const minimumHeight = viewer.controller.minimumHeight;
  viewer.controller.minimumHeight = 40;
  scope.defer(() => {
    viewer.controller.minimumHeight = minimumHeight;
  });

  // A shot frames the target as it is drawn at the multiplier in force; the
  // camera then stays where it is as the slider moves.
  const frameCamera = (shot: Shot = CAMERA) => {
    const t = shot.target;
    view.camera.lookAt(
      exaggeration.drawn(positionOf(t, t.height)),
      shot.heading * deg,
      shot.pitch * deg,
      shot.range,
    );
    engine.requestRender();
  };
  frameCamera();
  // Low sun from the north-east, raking the faces the camera looks at: the
  // clock's own sun may leave them in shade.
  viewer.setSun(70, 30);

  // --------------------------------------------------------- what's drawn
  const overlay = document.createElement("div");
  overlay.className = "vex-overlay";
  if (viewer.canvas.parentElement === viewer.container) {
    viewer.canvas.after(overlay);
  } else {
    viewer.container.prepend(overlay);
  }
  scope.defer(() => overlay.remove());

  // A card names what the view waits for until the terrain and buildings are
  // drawn and no fit is pending; the view stays live under it, and it takes
  // no input.
  const loadingText = document.createElement("span");
  const loadingCard = document.createElement("div");
  loadingCard.className = "vex-loading";
  loadingCard.setAttribute("role", "status");
  const loadingBody = document.createElement("div");
  const spinner = document.createElement("span");
  spinner.className = "vex-spinner";
  spinner.setAttribute("aria-hidden", "true");
  loadingBody.append(spinner, loadingText);
  loadingCard.append(loadingBody);
  loadingText.textContent = "Loading terrain…";
  overlay.append(loadingCard);
  let buildings: LoadingState["buildings"] = "waiting";
  let tileset:
    | {
        readonly stats: {
          readonly loaded: number;
          readonly selected: ReadonlyMap<number, number>;
        };
      }
    | undefined;
  const loading = createLoading();
  const loadingStarted = performance.now();
  const loadingTimer = setInterval(() => {
    if (
      buildings === "loading" &&
      tileset !== undefined &&
      tileset.stats.loaded > 0 &&
      [...tileset.stats.selected.values()].some((n) => n > 0)
    ) {
      buildings = "drawn";
    }
    const stage = loading.update({ stats: world.warpStats(), buildings });
    // Content that never settles (a tileset with nothing near the camera)
    // doesn't hold the card up forever.
    if (stage === undefined || performance.now() - loadingStarted > 90_000) {
      loadingCard.hidden = true;
      clearInterval(loadingTimer);
      return;
    }
    loadingText.textContent = stage;
  }, 250);
  scope.defer(() => clearInterval(loadingTimer));

  const sites = createSites(PLACES);
  const pins = createPins(viewer, sites, overlay);
  scope.defer(() => pins.dispose());
  const ruler = createRuler(viewer, overlay);
  scope.defer(() => ruler.dispose());

  const notes: string[] = [];
  let truck: ModelPlacement | undefined;
  let upright = false;

  const keepShape = () => {
    for (const draw of truck?.draws ?? []) {
      world.setWarpAt(draw, upright ? "anchor" : "vertex");
    }
    engine.requestRender();
  };

  async function addTruck() {
    using model = await viewer.loadModel(TRUCK, { signal });
    const zermatt = sites.find((s) => s.place.id === "zermatt")!;
    const matrix = eastNorthUpToFixedFrame(
      positionOf(zermatt.place, zermatt.height ?? 1600),
      Ellipsoid.WGS84,
      mat4.mat4(),
    );
    const placed = model.place({
      modelMatrix: mat4.multiply(
        mat4.mat4(),
        matrix,
        mat4.fromScale(mat4.mat4(), TRUCK_SCALE, TRUCK_SCALE, TRUCK_SCALE),
      ),
      heightReference: "clampToGround",
      name: "Milk truck",
    });
    if (signal.aborted) {
      placed.remove();
      return;
    }
    truck = placed;
    scope.use(placed);
    keepShape();
  }

  // ------------------------------------------------------- the readouts
  const ends: { a: End; b: End } = {
    a: { name: "Zermatt", siteId: "zermatt", position: sites[0]!.position },
    b: {
      name: "Matterhorn",
      siteId: "matterhorn",
      position: sites[1]!.position,
    },
  };
  let picked: PickReading | undefined;
  let frames: Frames | undefined;
  let framesError: string | undefined;
  let measured: MeasurementReading | undefined;
  let measureError: string | undefined;

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };

  /** A table of true values beside the drawn ones. */
  const table = (...rows: string[]) => {
    const cells = new Map<string, [HTMLElement, HTMLElement]>();
    const body = el("tbody");
    for (const name of rows) {
      const t = el("td", { className: "true" });
      const d = el("td", { className: "drawn" });
      cells.set(name, [t, d]);
      body.append(el("tr", {}, el("th", { scope: "row" }, name), t, d));
    }
    const head = el(
      "thead",
      {},
      el(
        "tr",
        {},
        el("td"),
        el("th", { scope: "col" }, "True"),
        el("th", { scope: "col" }, "Drawn"),
      ),
    );
    const root = el("table", { className: "vex-table" }, head, body);
    return {
      root,
      set(name: string, trueText: string, drawnText: string) {
        const [t, d] = cells.get(name)!;
        t.textContent = trueText;
        d.textContent = drawnText;
      },
    };
  };

  const pickTable = table("Height", "Terrain there");
  const measureTable = table("Height difference", "Straight line");
  const pickHint = el(
    "p",
    {},
    "Click the view to read a point. Its true height is the same at every exaggeration.",
  );
  const pickFrame = el("p", { className: "vex-frame" });
  const measureTitle = el("h3");
  const measureFrame = el("p", { className: "vex-frame" });
  const measureNote = el("p", { className: "vex-note", role: "status" });

  const factorOut = el("output");
  const routeOut = el("dd");
  const runOut = el("dd");
  const refitOut = el("dd");
  const drawsOut = el("dd");
  const route = () => view.anchorRoute(earth);

  const fillPick = () => {
    pickTable.root.hidden = pickFrame.hidden = picked === undefined;
    pickHint.hidden = picked !== undefined;
    if (!picked) {
      return;
    }
    const ground = viewer.globe?.surfaceHeight(
      picked.true.longitude,
      picked.true.latitude,
    );
    pickTable.set(
      "Height",
      metres(picked.true.height),
      metres(exaggeration.geodetic(exaggeration.drawn(picked.point)).height),
    );
    pickTable.set(
      "Terrain there",
      ground === undefined ? "–" : metres(ground),
      ground === undefined ? "–" : metres(ground * exaggeration.factor),
    );
    pickFrame.textContent = `True: ${picked.frame}, heights above ${picked.heightsAbove}${picked.provisional ? "; estimated by taking the drawn point back through the map" : ""}.`;
  };

  const fillMeasure = () => {
    measureTitle.textContent = `Measurement: ${ends.a.name} to ${ends.b.name}`;
    measureNote.hidden = true;
    measureTable.root.hidden = measureFrame.hidden = true;
    if (!frames) {
      measureNote.hidden = false;
      measureNote.textContent =
        framesError ??
        "Loading the frames data the measure module reads (Earth orientation, leap seconds).";
      return;
    }
    try {
      measured = readMeasurement(
        exaggeration,
        itrf,
        frames,
        ends.a.position,
        ends.b.position,
        Instant.fromUtc(viewer.clock.time, frames.data.leapSeconds),
      );
      measureError = undefined;
    } catch (error) {
      measured = undefined;
      measureError = error instanceof Error ? error.message : String(error);
    }
    if (!measured) {
      measureNote.hidden = false;
      measureNote.textContent = measureError ?? "";
      ruler.clear();
      return;
    }
    measureTable.root.hidden = measureFrame.hidden = false;
    measureTable.set(
      "Height difference",
      signedMetres(measured.heightDifference),
      signedMetres(measured.drawnHeightDifference),
    );
    measureTable.set(
      "Straight line",
      distance(measured.distance),
      distance(measured.drawnDistance),
    );
    measureFrame.textContent = `True: ${measured.frame}, from the measure module; ${distance(measured.groundDistance)} along the ellipsoid.`;
    ruler.set(
      ends.a.position,
      ends.b.position,
      `${signedMetres(measured.heightDifference)} (true)`,
    );
  };

  const fillStats = () => {
    const r = route();
    const stats = world.warpStats();
    const n = (x: number) => x.toLocaleString("en-US");
    routeOut.textContent = r ? String(r.revision) : "–";
    runOut.textContent = `${n(stats.fitsRun)}, ${n(stats.pending)} waiting`;
    refitOut.textContent = n(stats.refits);
    const { draws } = stats;
    // "fitted" counts every draw drawn at its current term; the exact and compiled ones are not fits.
    const fits = Math.max(0, draws.fitted - draws.exact - draws.routed);
    drawsOut.textContent = `${n(draws.total)}: ${n(draws.exact)} exact, ${n(draws.routed)} compiled, ${n(fits)} fitted, ${n(draws.stale)} stale, ${n(draws.pending)} waiting`;
  };

  const refresh = () => {
    factorOut.textContent = `×${exaggeration.factor.toFixed(1)}`;
    fillPick();
    fillMeasure();
    fillStats();
  };

  // ------------------------------------------------------------- the pick
  const mark = el("div", { className: "vex-pick", hidden: true });
  overlay.append(mark);
  const offMark = engine.onAfterTick(() => {
    if (!picked) {
      return;
    }
    // The true point: the view draws it through its route.
    const px = view.toPixel(picked.point, earth);
    mark.hidden = px === undefined;
    if (px) {
      mark.style.transform = `translate(${px[0]!.toFixed(1)}px, ${px[1]!.toFixed(1)}px) translate(-50%, -50%)`;
    }
  });
  scope.defer(offMark);

  let down: { x: number; y: number } | undefined;
  const onDown = (e: PointerEvent) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : undefined;
  };
  const onUp = (e: PointerEvent) => {
    const from = down;
    down = undefined;
    if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > 4) {
      return;
    }
    const rect = viewer.canvas.getBoundingClientRect();
    const ratio = viewer.canvas.width / Math.max(1, rect.width);
    // The pick resolves a few frames on, but carries the route as it was
    // drawn then, so the slider may move meanwhile.
    void view
      .pickPoint(
        (e.clientX - rect.left) * ratio,
        (e.clientY - rect.top) * ratio,
      )
      .then((pick) => {
        if (pick && !signal.aborted) {
          take(pick);
        }
      });
  };
  viewer.canvas.addEventListener("pointerdown", onDown);
  viewer.canvas.addEventListener("pointerup", onUp);
  scope.defer(() => {
    viewer.canvas.removeEventListener("pointerdown", onDown);
    viewer.canvas.removeEventListener("pointerup", onUp);
  });

  /** A pick's true point: the content's own where the pick found one, else the drawn one taken back through the route it was drawn by. */
  function take(pick: CorePick) {
    const truth = truePick(pick);
    // Heights are read in ITRF, the Earth's anchor's coordinates.
    if (truth.frame !== earth) {
      return;
    }
    picked = readPick(exaggeration, itrf, truth);
    refresh();
    engine.requestRender();
  }

  // ------------------------------------------------------------ the panel
  // The height visuals: one custom shader on the globe, there while an
  // effect is on. Their state rides in the URL.
  const keyOf = (v: string | undefined): HeightKey | undefined =>
    v === "trueHeight" ? "true" : v === "drawnHeight" ? "drawn" : undefined;
  const written = (key: HeightKey) =>
    key === "true" ? "trueHeight" : "drawnHeight";
  const contourStart = Number(params.contours);
  const visuals = createHeightVisuals({
    tint: keyOf(params.tint) !== undefined,
    lookup: keyOf(params.tint) ?? "true",
    contours: Number.isFinite(contourStart) ? contourStart : 0,
    haze: keyOf(params.haze) !== undefined,
    hazeKey: keyOf(params.haze) ?? "true",
  });
  const heightPanel = createHeightPanel(
    visuals,
    () => exaggeration.factor,
    () => {
      const s = visuals.state;
      setParams({
        tint: s.tint ? written(s.lookup) : undefined,
        contours: s.contours > 0 ? String(s.contours) : undefined,
        haze: s.haze ? written(s.hazeKey) : undefined,
      });
      attach(viewer.globe, visuals);
      engine.requestRender();
    },
  );
  // The haze's path starts at the camera: its height as drawn and as true
  // (the camera is in the drawn space). The globe is the viewer's, and may
  // be replaced.
  let lastEye = [NaN, NaN];
  const offVisuals = engine.onAfterTick(() => {
    attach(viewer.globe, visuals);
    if (!visuals.state.haze) {
      return;
    }
    const eye = view.camera.position;
    const drawnHeight = exaggeration.geodetic(eye).height;
    const trueHeight = exaggeration.geodetic(exaggeration.truth(eye)).height;
    if (drawnHeight !== lastEye[0] || trueHeight !== lastEye[1]) {
      lastEye = [drawnHeight, trueHeight];
      visuals.setCamera(drawnHeight, trueHeight);
    }
  });
  scope.defer(() => {
    offVisuals();
    if (viewer.globe?.shader === visuals.shader) {
      viewer.globe.shader = undefined;
    }
  });

  const slider = el("input", {
    type: "range",
    min: "1",
    max: String(MAX_EXAGGERATION),
    step: "0.1",
    value: String(exaggeration.factor),
    ariaLabel: "Vertical exaggeration",
  });
  /**
   * One float. The camera is the controller's, in the frame it is drawn in
   * (the view's render space): it stays where it is while the ground rises
   * toward it, and the controller lifts it over the ground only where the
   * drawn ground would cover it, back down to where it was put as the
   * ground falls away again (`GlobeController.update`).
   */
  slider.oninput = () => {
    exaggeration.factor = Number(slider.value);
    engine.requestRender();
    refresh();
    heightPanel.refresh();
  };
  slider.onchange = () => setParams({ x: Number(slider.value).toFixed(1) });

  const uprightBox = el("input", {
    type: "checkbox",
    onchange: () => {
      upright = uprightBox.checked;
      keepShape();
    },
  });
  const measureFromPick = (which: "a" | "b") => () => {
    if (picked) {
      ends[which] = { name: "Picked point", position: picked.point };
      refresh();
    }
  };

  const buildingsNote = el("p", { className: "vex-note", hidden: true });
  panel.append(
    el("h3", {}, "Exaggeration"),
    el("label", { className: "slider" }, "Heights", slider, factorOut),
    el(
      "p",
      {},
      "One reference frame and a camera rig draw everything taller; no item is set.",
    ),
    el(
      "dl",
      {},
      el("dt", {}, "Route revision"),
      routeOut,
      el("dt", {}, "Fits run"),
      runOut,
      el("dt", {}, "Refits"),
      refitOut,
      el("dt", {}, "Warped draws"),
      drawsOut,
    ),
    el(
      "p",
      {},
      "One float a tick: terrain is exact and buildings are drawn by the compiled route, so nothing is fitted or fitted again. Pins are placed again, which is no fit.",
    ),
    el("h3", {}, "View"),
    el(
      "div",
      { className: "buttons" },
      el(
        "button",
        { type: "button", onclick: () => frameCamera(CAMERA) },
        "The valley",
      ),
      el(
        "button",
        { type: "button", onclick: () => frameCamera(CLOSE_UP) },
        "Zermatt, close",
      ),
    ),
    el("label", {}, "Truck keeps its shape", uprightBox),
    heightPanel.root,
    el("h3", {}, "Picked point"),
    pickHint,
    pickTable.root,
    pickFrame,
    el(
      "div",
      { className: "buttons" },
      el(
        "button",
        { type: "button", onclick: measureFromPick("a") },
        "Set as start",
      ),
      el(
        "button",
        { type: "button", onclick: measureFromPick("b") },
        "Set as end",
      ),
    ),
    measureTitle,
    measureTable.root,
    measureFrame,
    measureNote,
    buildingsNote,
  );
  scope.defer(() => panel.replaceChildren());
  refresh();

  // --------------------------------------------------- ground and content
  const stopGround = trackGround(viewer, sites, (moved) => {
    pins.update(moved);
    for (const end of [ends.a, ends.b]) {
      const site = sites.find((s) => s.place.id === end.siteId);
      if (site && moved.includes(site)) {
        end.position = site.position;
      }
    }
    fillMeasure();
  });
  scope.defer(stopGround);

  const stats = setInterval(fillStats, 500);
  scope.defer(() => clearInterval(stats));

  void viewer.frames
    .tree()
    .then((tree) => {
      if (!signal.aborted) {
        frames = tree;
        fillMeasure();
      }
    })
    .catch((error: unknown) => {
      if (!signal.aborted) {
        framesError = `The measure module needs the frames data (npm run setup): ${scrub(error instanceof Error ? error.message : String(error))}`;
        fillMeasure();
      }
    });

  const failed = (what: string, error: unknown) => {
    if (!signal.aborted) {
      notes.push(
        `${what} didn't load: ${scrub(error instanceof Error ? error.message : String(error))}`,
      );
      buildingsNote.hidden = false;
      buildingsNote.textContent = notes.join(" ");
    }
  };
  buildings = "loading";
  void viewer
    .addTileset({ ion: ION_OSM_BUILDINGS })
    .then((added) => {
      if (signal.aborted) {
        viewer.remove(added);
        return;
      }
      tileset = added;
      scope.defer(() => viewer.remove(added));
    })
    .catch((error: unknown) => {
      buildings = "failed";
      failed("Cesium OSM Buildings", error);
    });
  void addTruck().catch((error: unknown) => failed("The truck model", error));

  return () => {
    // Everything is undone by the scope, in reverse order.
    notes.length = 0;
  };
}
