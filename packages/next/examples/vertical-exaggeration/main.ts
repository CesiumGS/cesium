import "./vertical-exaggeration.css";
import {
  EARTH,
  Ellipsoid,
  defaultRig,
  eastNorthUpToFixedFrame,
  mat4,
  type CorePick,
  type ModelPlacement,
} from "@cesium/next";
import type { Frames } from "@cesium/next/frames";
import { Instant } from "@cesium/next/time";
import type { Dispose, ExampleContext } from "../types.ts";
import {
  MAX_EXAGGERATION,
  createExaggeration,
  scaleOf,
} from "./exaggeration.ts";
import { watchFits } from "./fits.ts";
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
 * Questions are asked in true coordinates. A pick comes back drawn, in the
 * frame the camera is on; the application takes it back through the map
 * (`exaggeration.truth`) and reads its height in ITRF. The ruler's numbers
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
  // Back to the table's root first: a view on ITRF can't re-root rigidly
  // onto a warped frame.
  engine.cameras.setRig(view, defaultRig(world));
  engine.cameras.setRig(view, {
    position: { frame: exaggeration.frame },
    orientation: { kind: "free" },
  });
  // The camera works in the frame it sits on, so it keeps above the ground
  // as drawn: the terrain's true height times the exaggeration.
  const trueGround = viewer.controller.surfaceHeight;
  viewer.controller.surfaceHeight = (longitude, latitude) => {
    const h = trueGround?.(longitude, latitude);
    return h === undefined ? undefined : h * exaggeration.factor;
  };
  scope.defer(() => {
    viewer.controller.surfaceHeight = trueGround;
  });
  const fits = watchFits(world);
  scope.defer(() => fits.stop());

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

  const sites = createSites(PLACES);
  const pins = createPins(viewer, exaggeration, sites, overlay);
  scope.defer(() => pins.dispose());
  const ruler = createRuler(viewer, exaggeration, overlay);
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
  const route = () => view.anchorRoute(world.bodyAnchor(EARTH));

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
    pickFrame.textContent = `True: ${picked.frame}, heights above ${picked.heightsAbove}.`;
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
    routeOut.textContent = r ? String(r.revision) : "–";
    runOut.textContent = `${fits.run.toLocaleString("en-US")}, ${fits.queued.toLocaleString("en-US")} waiting`;
    refitOut.textContent = fits.refits.toLocaleString("en-US");
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
  const drawnMark = new Float64Array(3);
  const offMark = engine.onAfterTick(() => {
    if (!picked) {
      return;
    }
    exaggeration.drawn(picked.point, drawnMark);
    const px = view.toPixel(drawnMark, world.root);
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
    // The pick reads the image of a tick a few frames on: the multiplier
    // it was asked at is the one its point was drawn with.
    const factor = exaggeration.factor;
    void view
      .pickPoint(
        (e.clientX - rect.left) * ratio,
        (e.clientY - rect.top) * ratio,
      )
      .then((pick) => {
        if (pick && !signal.aborted) {
          take(pick, factor);
        }
      });
  };
  viewer.canvas.addEventListener("pointerdown", onDown);
  viewer.canvas.addEventListener("pointerup", onUp);
  scope.defer(() => {
    viewer.canvas.removeEventListener("pointerdown", onDown);
    viewer.canvas.removeEventListener("pointerup", onUp);
  });

  /** A pick, back through the map to the true point it drew. */
  function take(pick: CorePick, factor: number) {
    picked = readPick(exaggeration, itrf, pick.position, factor);
    refresh();
    engine.requestRender();
  }

  // ------------------------------------------------------------ the panel
  const slider = el("input", {
    type: "range",
    min: "1",
    max: String(MAX_EXAGGERATION),
    step: "0.1",
    value: String(exaggeration.factor),
    ariaLabel: "Vertical exaggeration",
  });
  /** One float: the camera keeps its true place, so it stays above the ground it is drawn over. */
  slider.oninput = () => {
    const camera = view.camera;
    const eye = exaggeration.truth(camera.position);
    exaggeration.factor = Number(slider.value);
    exaggeration.drawn(eye, camera.position);
    camera.version++;
    engine.requestRender();
    refresh();
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
    ),
    el(
      "p",
      {},
      "One float a tick: tiles are fitted once, never again. Pins are placed again, which is no fit.",
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
  void viewer
    .addTileset({ ion: ION_OSM_BUILDINGS })
    .then((tileset) => {
      if (signal.aborted) {
        viewer.remove(tileset);
        return;
      }
      scope.defer(() => viewer.remove(tileset));
    })
    .catch((error: unknown) => failed("Cesium OSM Buildings", error));
  void addTruck().catch((error: unknown) => failed("The truck model", error));

  return () => {
    // Everything is undone by the scope, in reverse order.
    notes.length = 0;
  };
}
