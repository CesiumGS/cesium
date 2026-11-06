// The frames explorer (plan Task 6): the frame tree and engineering frames,
// drawn on the globe and stress-tested in the page. Its first view is the
// scenarios (spec 2026-11-06): each a problem solved by the tree it builds;
// scenarioHost.ts runs their lifecycle, and this file gives it the worker,
// the globe and the clock (each scenario's scene: scenarios/scenes.ts).
//
// `run` returns its panel at once (R17) and loads afterwards: frame data on
// the main thread (the triads follow the clock every frame), and everything
// else, the stress catalog, PROJ, GEOID18, Orion and the PROJ-dependent
// overlay geometry, through the compute worker (R13, protocol.ts). One view
// store (selection.ts) is the selection the tree, the globe and the tests
// share (R14), kept in step with the example's params (R15). Every async step
// stops on `context.signal`, and everything drawn goes through `scope`.
import { createElement } from "react";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { fromDegrees } from "../../src/math/ellipsoid.ts";
import { earthOrientationSigma } from "../../src/measure/accuracy.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import {
  NARROW_VIEW,
  RESULT_LABELS,
  comparedFor,
  groupRunIds,
} from "./content.ts";
import { createScenarioHost } from "./scenarioHost.ts";
import { createOrionLayer } from "./orionLayer.ts";
import { createOverlayControl } from "./overlayControl.ts";
import { createTreeState } from "./treeState.ts";
import { createTriadLayer, type LabelBoard } from "./triadLayer.ts";
import { createWalkPath } from "./walkPath.ts";
import { createCatalogRuns } from "./catalogRuns.ts";
import { createFrameData } from "./frameData.ts";
import { createPageReport } from "./pageReport.ts";
import { createUserCrs } from "./userCrs.ts";
import {
  CONVERGENCE_FACTOR,
  DISTORTION,
  OVERLAYS,
  RIGID_FRAMING,
} from "./overlayConfig.ts";
import {
  DRAW_IN,
  EARTH_RADIUS,
  FLYBY,
  IDENTITY,
  WGS84,
  createModelSource,
  deg,
  isFrame,
  meters,
} from "./page.ts";
import { routeSteps } from "./panel/routeSteps.ts";
import { proofRows, type ProofRow } from "./scenarios/proof.ts";
import {
  LUNAR_SITE,
  READY,
  SCENES,
  earthSiteFrame,
  lunarSiteFrame,
  sceneExposure,
  type SceneSpec,
} from "./scenarios/scenes.ts";
import {
  checkedState,
  type KnobState,
  type ScenarioId,
} from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";
import { Globe, familyRgba, type Framing, type LabelSpec } from "./globe.ts";
import { LoadingModel } from "./loading.ts";
import { compose, planeFraming } from "./orion.ts";
import type {
  ClockView,
  OverlayId,
  PanelActions,
  PanelModel,
  ResultExtras,
  ScenarioPanelView,
} from "./panel/model.ts";
import { Panel } from "./panel/Panel.tsx";
import { createClient, type ClientWorker, type DataItem } from "./protocol.ts";
import {
  ViewStore,
  formatParams,
  loadLinkedResult,
  parseParams,
  type Known,
  type Tab,
} from "./selection.ts";
import { GROUP_INFO, groupInfo, type Lens } from "./stress/groupInfo.ts";
import type { StressResult } from "./tests.ts";
import { branchPath, pathToRoot } from "./tree.ts";
import references from "./references.json";
import { RunQueue } from "./runQueue.ts";
import { GapInset } from "./gapInset.ts";
import {
  AXES_RIG,
  SITE_RIG,
  earthMoonRig,
  followRig,
  frameRig,
  frameTarget,
  lunarSiteRange,
  placeRig,
  rangeLimits,
  rigFraming,
  viewHeading,
  CameraFlow,
  landedLimits,
  moonOrbitNormal,
  type Rig,
  type RigKind,
} from "./orbit.ts";
import { PivotMarker } from "./pivot.ts";
import fingerprintFile from "./fingerprints.json";

/** The fingerprinted results' ids (R12), which the Reproducibility card runs. */
const FINGERPRINTED = Object.keys(
  (fingerprintFile as { fingerprints: Record<string, unknown> }).fingerprints,
);

export function run(context: ExampleContext): ExampleRun {
  const { viewer, scope, signal, params } = context;
  const token = context.accessToken;
  /** The token never enters a message the page shows (R18). */
  const scrub = (text: string): string =>
    token !== undefined && token.length >= 8
      ? text.split(token).join("[redacted]")
      : text;

  // The HUD host over the canvas: the legend, tour captions and labels (R17).
  const hud = document.createElement("div");
  hud.className = "fx-hud-host";
  viewer.container.append(hud);
  scope.defer(() => hud.remove());

  const globe = new Globe(viewer, scope, hud);
  // The rigid line's gap at 20 km, a second engine view (stop 4). Deferred
  // after the globe, so it goes first: its view before the viewer's world.
  const gapInset = new GapInset(viewer, hud, (bits) =>
    globe.hideTriadsFrom(bits),
  );
  scope.defer(() => gapInset.dispose());
  const loading = new LoadingModel();
  // Items left fetching when the example is left go back to idle: the
  // stopped client sends no final state (Task 4's deferred note).
  scope.defer(() => loading.reset());
  const view = new ViewStore();
  const initial = parseParams(params);
  view.apply(initial);

  // ----------------------------------------------------------- the worker
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const client = createClient(worker as unknown as ClientWorker, signal);
  client.onProgress((reply) => {
    // Frame data's indicator is the main thread's own load; the worker's
    // second fetch (from the HTTP cache) shows only when it fails.
    if (
      reply.item === "frames" &&
      !(
        reply.type === "state" &&
        (reply.state === "missing" || reply.state === "error")
      )
    ) {
      return;
    }
    loading.reply(reply);
  });

  // ------------------------------------------------------------ frame data
  const frameData = createFrameData({
    viewer,
    loading,
    signal,
    ready: () => {
      frames = frameData.frames();
      treeState.rebuild();
      triads.refresh();
      startFrameLoop();
      // The scenario a deep link names (R15), at its knobs and time, or the
      // strip's first at its checked setup; then the link's selection (a
      // result runs its group first, then is selected and flown to).
      void host.show(
        readyScenario(initial.scenario),
        initial.knobs,
        initial.time,
      );
      lastSelection = { kind: "none" };
      onView();
    },
    failed: (message) => {
      treeState.fail(
        `The frame tree can't draw: frame data didn't load (${message}). Everything else that needs no frame data still works.`,
      );
      invalidate();
    },
  });
  scope.defer(() => frameData.dispose());

  // ------------------------------------------------------------ page state
  let frames: Frames | undefined;
  /** The scene's own frames on the main thread (the lunar site), for its triads and camera. */
  let local: Frame[] = [];
  /** The deep-linked result being loaded (`loadLinkedResult`). */
  let linking: string | undefined;
  /** A message for the panel's snackbar (a deep link that didn't resolve). */
  let notice: { id: number; text: string } | undefined;
  /** Every part's labels on the globe, shown with the triads' (triadLayer.ts). */
  const labels: LabelBoard = new Map();
  let disposed = false;
  scope.defer(() => {
    disposed = true;
  });

  // -------------------------------------------------------- the model
  const modelSource = createModelSource({
    build: () => buildModel(),
    disposed: () => disposed,
  });
  const { source, invalidate } = modelSource;
  scope.defer(() => modelSource.dispose());
  loading.subscribe(invalidate);

  const instantNow = (): Instant | undefined =>
    frames
      ? Instant.fromUtc(viewer.clock.time, frames.data.leapSeconds)
      : undefined;

  function clockView(): ClockView {
    const utc = new Date(viewer.clock.time)
      .toISOString()
      .replace(/\.\d+Z$/, "Z");
    const instant = instantNow();
    if (!frames || !instant) {
      return { utc, eop: { kind: "measured" } };
    }
    const sigma = earthOrientationSigma(frames, instant);
    return {
      utc,
      eop: sigma.degraded
        ? { kind: "outside", span: sigma.span }
        : sigma.predicted
          ? { kind: "predicted", ageDays: sigma.ageDays }
          : { kind: "measured" },
    };
  }

  function extrasOf(r: StressResult): ResultExtras {
    const g = groupInfo(r.group);
    const label = RESULT_LABELS[r.id];
    return {
      ...(label !== undefined && { label }),
      ...(r.accuracyNote !== undefined && { accuracyNote: r.accuracyNote }),
      compared:
        r.expectedError !== undefined
          ? { kind: "error", text: `An error matching /${r.expectedError}/.` }
          : comparedFor(
              r.id,
              g?.compared ?? {
                kind: "independent",
                text: "The case's own check.",
              },
            ),
      ...(r.trace !== undefined && { trace: r.trace }),
      ...(r.source !== undefined && { source: r.source }),
      ...(r.group === "measurement" &&
        r.accuracy?.meters !== undefined && {
          relative: `The site's absolute placement is ±${meters(r.accuracy.meters)} (1σ); this check measures a distance, which that placement doesn't affect.`,
        }),
    };
  }

  /** Groups waiting for an item (R9): a need still loading, or not yet tried while a run goes on. */
  function waiting(): Record<string, DataItem> {
    const out: Record<string, DataItem> = {};
    for (const g of GROUP_INFO) {
      for (const need of g.needs) {
        const s = loading.get(need).state;
        const pending =
          s === "fetching" ||
          (catalogRuns.runView().state === "running" && s === "idle");
        const has = catalogRuns.results().some((r) => r.group === g.id);
        if (pending && !has) {
          out[g.id] = need;
          break;
        }
      }
    }
    return out;
  }

  function buildModel(): PanelModel {
    const tree = treeState.tree();
    const treeNote = treeState.note();
    const all = [...catalogRuns.results(), ...user.results()];
    const extras: Record<string, ResultExtras> = {};
    for (const r of all) {
      extras[r.id] = extrasOf(r);
    }
    return {
      items: loading.items,
      ...(tree ? { tree } : {}),
      ...(treeNote !== undefined && { treeNote }),
      composed: treeState.composed(),
      clock: clockView(),
      overlays: overlays.views(),
      orionFrame: orion.frame(),
      ...overlays.settings(),
      convergenceFactor: CONVERGENCE_FACTOR,
      triadScale:
        "triads drawn at 6% of the camera's distance, 2 m to 2,000 km; ITRF and GCRF at 1.5 Earth radii",
      groups: GROUP_INFO,
      results: all,
      extras,
      waiting: waiting(),
      run: catalogRuns.runView(),
      ...(catalogRuns.runView().state === "running"
        ? { runBusy: "A run is going on; this group can run when it ends." }
        : user.view().state === "running"
          ? {
              runBusy:
                "Your CRS's checks are running; this group can run when they end.",
            }
          : {}),
      token: token !== undefined ? "available" : undefined,
      userCrs: user.view(),
      exampleWkt2: (
        references.entries as unknown as Record<string, { wkt2?: string }>
      )["input-wkt2-tokyo-jprcs-ix"]!.wkt2!,
      ...scenarioView(),
      environment: pageReport.lines(),
      ...(notice !== undefined && { notice }),
    };
  }

  // ------------------------------------------------------------ the tree
  const treeState = createTreeState({
    core: { frames: () => frames, instantNow, invalidate },
    local: () => local,
    evaluation: () => evaluationNow(),
    orion: () => (orion.error() === undefined ? orion.info()?.info : undefined),
    updateKnown: () => updateKnown(),
  });
  scope.defer(() => treeState.dispose());

  function updateKnown(): void {
    const repro = groupInfo("reproducibility")!.lenses;
    const lensesOf = new Map<string, readonly Lens[]>();
    for (const r of [...catalogRuns.results(), ...user.results()]) {
      const own = groupInfo(r.group)?.lenses ?? [];
      lensesOf.set(
        r.id,
        r.fingerprint ? [...new Set([...own, ...repro])] : own,
      );
    }
    // The groups that have run: a result of another group (a deep link
    // after a group's own run) is kept until its group runs (R15).
    const ran = new Set(catalogRuns.results().map((r) => r.group));
    const known: Known = {
      // Only once the scenario's frames are in: a link to a frame it adds
      // (the lunar site) waits for its evaluation rather than being cleared.
      ...(treeState.tree() && evaluationNow() && { frames: treeState.ids() }),
      ...(catalogRuns.lastRun() !== undefined && { results: lensesOf, ran }),
    };
    view.setKnown(known);
  }

  // --------------------------------------------------------------- triads
  const triads = createTriadLayer({
    core: { frames: () => frames, instantNow, globe, view },
    labels,
    tree: () => treeState.tree(),
    local: () => local,
    on: () => overlays.state("triads").on,
    scene: () => scene,
    sceneKnobs: () => sceneKnobs,
    emphasis: () => emphasisFrames(),
  });
  scope.defer(() => triads.dispose());

  // ------------------------------------------------------------- overlays
  const overlays = createOverlayControl({
    core: {
      viewer,
      globe,
      loading,
      client,
      frames: () => frames,
      instantNow,
      invalidate,
      disposed: () => disposed,
      scrub,
    },
    labels,
    gapInset,
    tree: () => treeState.tree(),
    results: () => catalogRuns.results(),
    orion: {
      draw: () => orion.draw(),
      off: () => orion.off(),
      accuracy: () => orion.accuracy(),
    },
    noteEngineering: (g, center) => treeState.noteEngineering(g, center),
    refreshTriads: () => triads.refresh(),
    refreshCallouts: () => refreshCallouts(),
  });
  scope.defer(() => overlays.dispose());

  // --------------------------------------------------------- the walk's path
  const walkPath = createWalkPath({
    core: {
      frames: () => frames,
      instantNow,
      globe,
      view,
      disposed: () => disposed,
    },
    labels,
    tree: () => treeState.tree(),
    familyOf: (id) => triads.familyOf(id),
    refreshTriads: () => triads.refresh(),
    placedOrigin: (id) => {
      const engineering = treeState.engineering();
      const info = orion.info();
      return id === info?.info.node.id
        ? info.info.itrf
        : id === engineering?.node.id
          ? engineering.placed.itrf
          : undefined;
    },
  });
  scope.defer(() => walkPath.dispose());

  // ---------------------------------------------------------------- Orion
  const orion = createOrionLayer({
    core: {
      viewer,
      globe,
      loading,
      client,
      frames: () => frames,
      instantNow,
      invalidate,
      disposed: () => disposed,
      scrub,
    },
    state: overlays.state("orion"),
    refreshCallouts: () => refreshCallouts(),
    rebuildTree: () => treeState.rebuild(),
    drawn: () => {
      if (reframeOrion) {
        // A new frame reads as a change: the camera frames the new path
        // (the ITRF spiral is far larger than the figure-eight).
        reframeOrion = false;
        flyToScene();
      }
    },
  });
  scope.defer(() => orion.dispose());

  // --------------------------------------------------------------- camera
  const framingAt = (
    lon: number,
    lat: number,
    range: number,
    heading = 0,
    pitch = -Math.PI / 2 + 1e-3,
  ): Framing => ({
    center: WGS84.cartographicToCartesian(
      fromDegrees(lon, lat, 0),
      new Float64Array(3),
    ),
    range,
    heading: heading * deg,
    pitch,
  });
  const OPENING = framingAt(-135, 25, 2 * EARTH_RADIUS);

  /** The Moon's centre in ITRF at the clock's instant. */
  function moonCenter(): Float64Array | undefined {
    const instant = instantNow();
    if (!frames || !instant) {
      return undefined;
    }
    const m = frameTransform(frames.moonIcrf, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  function framing(
    camera:
      | "opening"
      | "northPole"
      | "designGrid"
      | "rigidVsExact"
      | "earthMoon"
      | "lunarSite"
      | "moon"
      | "site"
      | "portland",
  ): Framing | undefined {
    switch (camera) {
      case "opening":
        return OPENING;
      case "northPole":
        // Stop 2 (S-I10): straight down the pole, so both triads' x and y
        // stay clear of the disc as GCRF's turn against ITRF's, and their
        // z axes point at the camera.
        return framingAt(0, 90, 5.5 * EARTH_RADIUS, 0, -Math.PI / 2 + 1e-3);
      case "designGrid":
        return framingAt(-120.5, 37.85, 180_000, 0, -35 * deg);
      case "rigidVsExact": {
        // Stop 4 (owner's rework): from the side, south of the 400 km line
        // looking north, a little down, the whole line across the left of
        // the view (the legend and the inset take the bottom right), so the
        // straight tangent visibly leaves the curving ground.
        const built = overlays.rigidBuilt();
        const geo = (p: ArrayLike<number>) =>
          WGS84.cartesianToCartographic(Float64Array.from(p), {
            longitude: 0,
            latitude: 0,
            height: 0,
          });
        const a = built && geo(built.start);
        const b = built && geo(built.end);
        const lon0 = a ? a.longitude / deg : -122.443;
        const lon1 = b ? b.longitude / deg : -117.904;
        const lat = a && b ? (a.latitude + b.latitude) / 2 / deg : 37.745;
        // The range fits the line across the view's width: on a portrait
        // (narrow) view the camera's field of view is the height's, so it
        // steps back by the aspect.
        const { clientWidth: w, clientHeight: h } = viewer.container;
        const aspect = w > 0 && h > 0 ? w / h : 1;
        return framingAt(
          lon0 + (lon1 - lon0) * RIGID_FRAMING.along,
          lat - RIGID_FRAMING.south,
          RIGID_FRAMING.range / Math.min(1, aspect),
          0,
          RIGID_FRAMING.pitch * deg,
        );
      }
      case "site":
        return framingAt(-122.43, 37.76, 8000, 0, -45 * deg);
      case "portland":
        return framingAt(-122.75, 45.5, 90_000, 0, -50 * deg);
      case "earthMoon":
        return earthMoonView()?.framing;
      case "moon":
        return moonView()?.framing;
      case "lunarSite":
        return lunarSiteView()?.framing;
    }
  }

  // ------------------------------------------------- orbits off the surface
  /**
   * A framing and, for a view off the Earth's surface, the orbit it hands
   * over to when the flight ends (orbit.ts): its rig in `frame`'s own
   * coordinates, placed Earth-fixed at the clock's instant.
   */
  interface CameraView {
    framing: Framing;
    rig?: { kind: RigKind; local: Rig; frame: Frame };
  }

  const placed = (local: Rig, frame: Frame): Rig | undefined => {
    const instant = instantNow();
    return frames && instant
      ? placeRig(local, frameTransform(frame, frames.itrf, instant))
      : undefined;
  };

  /** Stop 2, the polar view: the Earth's centre, up its axis. */
  function geocentricView(f: Framing): CameraView {
    return {
      framing: f,
      ...(frames && {
        rig: { kind: "geocentric", local: AXES_RIG, frame: frames.itrf },
      }),
    };
  }

  /** The Moon's frames: its centre at 20,000 km, from the Earth's side, a little above its equator. */
  function moonView(): CameraView | undefined {
    const rig = frames && placed(AXES_RIG, frames.moonMe);
    return (
      frames &&
      rig && {
        framing: rigFraming(rig, Math.PI, -20 * deg, 2e7),
        rig: { kind: "moon", local: AXES_RIG, frame: frames.moonMe },
      }
    );
  }

  /**
   * Stop 6 and the site: straight down its vertical from a few thousand
   * kilometres, the whole lunar disk in view. The disk is the sky's
   * backdrop, right only along that vertical (lunar-pole-investigation.md),
   * so the triad sits on the imagery's pole region from here alone.
   */
  function lunarSiteView(): CameraView | undefined {
    const site = local.find((f) => f.name === LUNAR_SITE);
    const rig = site && placed(SITE_RIG, site);
    if (!site || !rig) {
      return undefined;
    }
    const { clientWidth: w, clientHeight: h } = viewer.container;
    const range = lunarSiteRange(
      viewer.view.camera.fov,
      w > 0 && h > 0 ? w / h : 1,
    );
    return {
      framing: rigFraming(rig, 0, -Math.PI / 2 + 1e-3, range),
      rig: { kind: "lunarSite", local: SITE_RIG, frame: site },
    };
  }

  /**
   * Down on the orbit plane (tour stop 5): along the normal of the Moon's
   * orbit at the flyby, where Orion's free return lies, with the Earth–Moon
   * line across the screen, framing the Earth, the Moon and Orion's path as
   * drawn. Its orbit turns about the framing's centre, between the Earth and
   * the Moon, up that normal and heading 0 toward the Moon at the flyby:
   * fixed in GCRF (DE440 through the frames), as Orion's path is.
   */
  function earthMoonView(): CameraView | undefined {
    const moon = moonCenter();
    const instant = instantNow();
    if (!moon || !frames || !instant) {
      return undefined;
    }
    const leap = frames.data.leapSeconds;
    // In GCRF the Moon's motion is its orbit's; then turned to ITRF.
    const at = (ms: number) =>
      frameTransform(
        frames!.moonIcrf,
        frames!.gcrf,
        Instant.fromUtc(FLYBY + ms, leap),
      );
    // Up the prograde normal of the Moon's orbit at the flyby, in GCRF.
    const g = moonOrbitNormal((ms) => {
      const t = at(ms);
      return [t[12]!, t[13]!, t[14]!];
    });
    const m = frameTransform(frames.gcrf, frames.itrf, instant);
    const toItrf = (v: ArrayLike<number>) =>
      [0, 1, 2].map(
        (i) => m[i]! * v[0]! + m[4 + i]! * v[1]! + m[8 + i]! * v[2]!,
      );
    const normal = toItrf(g);
    // The Earth and the Moon with room around them, and Orion's path.
    const points: number[][] = [];
    for (const [c, radius] of [
      [[0, 0, 0], 2.5e7],
      [Array.from(moon), 2.5e7],
    ] as const) {
      for (const d of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const p = [...c];
          p[k] = p[k]! + d * radius;
          points.push(p);
        }
      }
    }
    const orionBuilt = orion.built();
    if (orionBuilt) {
      const place =
        orionBuilt.frame === "ITRF"
          ? IDENTITY
          : compose(
              frameTransform(
                frames[DRAW_IN[orionBuilt.frame]],
                frames.itrf,
                instant,
              ),
              orionBuilt.inverse,
            );
      for (const c of orionBuilt.chunks) {
        const o = c.origin;
        points.push(
          [0, 1, 2].map(
            (i) =>
              place[i]! * o[0]! +
              place[4 + i]! * o[1]! +
              place[8 + i]! * o[2]! +
              place[12 + i]!,
          ),
        );
      }
    }
    const canvas = viewer.canvas;
    const f = planeFraming(points, normal, moon, {
      fov: viewer.view.camera.fov,
      aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
    });
    // The focus back in GCRF (the transform is a rotation: GCRF and ITRF
    // share the Earth's centre), with the Moon at the flyby.
    const center = [0, 1, 2].map(
      (i) =>
        m[4 * i]! * f.center[0]! +
        m[4 * i + 1]! * f.center[1]! +
        m[4 * i + 2]! * f.center[2]!,
    );
    const flyby = at(0);
    return {
      framing: {
        center: f.center,
        range: f.range,
        heading: 0,
        pitch: -Math.PI / 2,
        from: f.from,
      },
      rig: {
        kind: "earthMoon",
        local: earthMoonRig(center, [flyby[12]!, flyby[13]!, flyby[14]!], g),
        frame: frames.gcrf,
      },
    };
  }

  /** What "Show on globe" and Frame content frame for a frame: Earth frames the opening shot, the Moon's at 20,000 km, sites close. */
  function frameView(id: string): CameraView | undefined {
    switch (frameRig(id, orion.info()?.info.node.id)) {
      case "moon":
        return moonView();
      case "lunarSite":
        return lunarSiteView();
      case "earthMoon":
        return earthMoonView();
    }
    if (id === "Sacramento ENU") {
      return { framing: framingAt(-121.4944, 38.5816, 8000, 0, -45 * deg) };
    }
    if (id.startsWith("engineering:")) {
      const f = framing("designGrid");
      return f && { framing: f };
    }
    return { framing: OPENING };
  }

  /** A scenario's view: its framing and the orbit it names (scenes.ts). */
  function sceneView(sc: SceneSpec): CameraView | undefined {
    switch (sc.camera) {
      case "earthMoon":
        return earthMoonView();
      case "lunarSite":
        return lunarSiteView();
      case "northPole": {
        const f = framing("northPole");
        return f && geocentricView(f);
      }
    }
  }

  /**
   * The orbit in effect off the surface, followed as the clock moves its
   * subject: its rig, where it was last placed and the heading it had (kept
   * when the camera is straight above the pivot).
   */
  let orbit:
    | {
        kind: RigKind;
        local: Rig;
        frame: Frame;
        placed: Rig;
        heading: number;
        at: number;
        /** The destination's wheel limits, the range it landed at, and the limits set now (`landedLimits`). */
        limits: { minRange: number; maxRange: number };
        landed: number;
        applied: { minRange: number; maxRange: number };
      }
    | undefined;
  /** Set while the example itself sets the orbit: any other change is the user's. */
  let orbitInternal = false;
  /** Which controls each flight lands in, at its arrival or the user's first input (orbit.ts). */
  const flow = new CameraFlow<NonNullable<CameraView["rig"]>>();
  const setOrbit = (options: Parameters<typeof viewer.setControls>[1]) => {
    orbitInternal = true;
    try {
      viewer.setControls("orbit", options);
    } finally {
      orbitInternal = false;
    }
  };

  /** The globe controls again, for a view on the Earth's surface. */
  function leaveOrbit(): void {
    orbit = undefined;
    orbitInternal = true;
    try {
      viewer.setControls("globe");
    } finally {
      orbitInternal = false;
    }
  }

  /**
   * Flies to `v`. A surface view takes the globe controls at once (so a
   * grab ends the flight there). A view off the surface takes an interim
   * orbit about the camera's own line of sight, which moves nothing, so a
   * drag or wheel ends the flight and lands in the destination's orbit at
   * once (`onOrbitChange`); otherwise it lands there when the flight
   * arrives, the camera read where the flight left it.
   */
  function show(v: CameraView, seconds?: number): void {
    orbit = undefined;
    if (flow.fly(v.rig) === "globe") {
      leaveOrbit();
    } else {
      interimOrbit(v.framing);
    }
    globe.flyTo(v.framing, seconds, () => {
      const rig = flow.arrive();
      if (rig) {
        startOrbit(rig);
      }
    });
  }

  /**
   * The orbit while flying to one: about the point straight ahead at the
   * destination's distance, up the camera's own up, so taking it moves the
   * camera not at all; any limits off.
   */
  function interimOrbit(to: Framing): void {
    const cam = viewer.view.camera;
    const d = Math.max(
      1,
      Math.hypot(...[0, 1, 2].map((i) => to.center[i]! - cam.position[i]!)),
    );
    setOrbit({
      target: [0, 1, 2].map((i) => cam.position[i]! + cam.direction[i]! * d),
      frame: { up: Array.from(cam.up), headingRef: Array.from(cam.direction) },
      heading: 0,
      pitch: 0,
      range: d,
      minRange: 0.01,
      maxRange: Infinity,
    });
  }

  function startOrbit(rig: NonNullable<CameraView["rig"]>): void {
    const at = placed(rig.local, rig.frame);
    if (disposed || !at) {
      return;
    }
    const moon = moonCenter();
    // Pitch and range are read from where the flight left the camera; the
    // heading too, from the view, so the hand-over doesn't turn it. A flight
    // interrupted outside the destination's range widens its limits to
    // take it (fix round 2).
    const heading = viewHeading(viewer.view.camera, at);
    const limits = rangeLimits(
      rig.kind,
      moon ? Math.hypot(moon[0]!, moon[1]!, moon[2]!) : 3.844e8,
    );
    const landed = cameraRange(at.target);
    const applied = landedLimits(limits, landed, landed);
    setOrbit({
      target: at.target,
      frame: { up: at.up, headingRef: at.headingRef },
      heading,
      ...applied,
    });
    orbit = {
      ...rig,
      placed: at,
      heading,
      at: viewer.clock.time,
      limits,
      landed,
      applied,
    };
  }

  const cameraRange = (pivot: ArrayLike<number>) =>
    Math.hypot(
      ...[0, 1, 2].map((i) => viewer.view.camera.position[i]! - pivot[i]!),
    );

  /** After the user's change: the widened limits hold until the camera is inside the destination's. */
  function narrowLimits(): void {
    const pivot = viewer.orbitPivot;
    if (!orbit || !pivot) {
      return;
    }
    const next = landedLimits(orbit.limits, orbit.landed, cameraRange(pivot));
    if (
      next.minRange !== orbit.applied.minRange ||
      next.maxRange !== orbit.applied.maxRange
    ) {
      orbit.applied = next;
      setOrbit(next);
    }
  }

  /**
   * The Moon and the site move in the Earth-fixed world as the clock runs
   * (the Moon at about 28 km/s; stop 5's plane turns with GCRF): once a
   * frame at most, never during a flight, the orbit is carried with its
   * subject, during a drag too. Heading, pitch and range are the
   * controller's own (`followRig` reads them back from the camera it
   * placed), so the drag goes on by its own increments, unfought.
   */
  function followOrbit(): void {
    if (
      !orbit ||
      viewer.controls !== "orbit" ||
      globe.flying ||
      viewer.clock.time === orbit.at
    ) {
      return;
    }
    const to = placed(orbit.local, orbit.frame);
    const pivot = viewer.orbitPivot;
    if (!to || !pivot) {
      return;
    }
    orbit.at = viewer.clock.time;
    const next = followRig(
      viewer.view.camera.position,
      pivot,
      orbit.placed,
      to,
      orbit.heading,
    );
    if (next) {
      setOrbit(next);
      orbit.placed = to;
      orbit.heading = next.heading;
    }
  }

  /** Frame content (F): the selected frame or result, else the scenario's view, else the opening view. */
  function frameContent(): void {
    const t = frameTarget(scene?.id, view.get().selection);
    if (t.kind === "scenario") {
      flyToScene();
      return;
    }
    const v =
      t.kind === "frame"
        ? frameView(t.id)
        : t.kind === "result"
          ? resultFraming(t.id).view
          : { framing: OPENING };
    if (v) {
      show(v);
    }
  }

  // The pivot marker while the orbit is dragged (HUD); a drag or wheel of
  // the orbit ends a flight, as a grab of the globe does.
  const pivotMarker = new PivotMarker(viewer, hud);
  viewer.onOrbitChange = () => {
    pivotMarker.update();
    if (orbitInternal) {
      return;
    }
    // The user's drag or wheel during a flight ends it, in the
    // destination's orbit (if it was flying to one).
    if (globe.flying) {
      globe.stopFlight();
    }
    const rig = flow.interrupt();
    if (rig) {
      startOrbit(rig);
    } else {
      narrowLimits();
    }
  };
  scope.defer(() => {
    viewer.onOrbitChange = undefined;
    pivotMarker.dispose();
    leaveOrbit();
  });

  function lunarSiteOrigin(): Float64Array | undefined {
    const instant = instantNow();
    const site = local.find((f) => f.name === LUNAR_SITE);
    if (!frames || !instant || !site) {
      return undefined;
    }
    const m = frameTransform(site, frames.itrf, instant);
    return Float64Array.from([m[12]!, m[13]!, m[14]!]);
  }

  /** Where a result's group points: its overlay's framing, its site, or its frames. */
  /** A view on the Earth's surface: the globe controls. */
  const surface = (f: Framing | undefined): CameraView | undefined =>
    f && { framing: f };

  function resultFraming(id: string): {
    view?: CameraView | undefined;
    overlay?: OverlayId;
    engineering: boolean;
  } {
    const r =
      catalogRuns.results().find((x) => x.id === id) ??
      user.results().find((x) => x.id === id);
    const g = r && groupInfo(r.group);
    if (!g) {
      return { engineering: false };
    }
    const overlay: OverlayId | undefined =
      g.focus?.overlay === "designGrid"
        ? "designGrid"
        : g.focus?.overlay === "trajectoryPath"
          ? "orion"
          : g.id === "rigid-placement-budget"
            ? "rigidVsExact"
            : g.id === "distortion"
              ? "distortion"
              : undefined;
    const engineering = g.needs.includes("proj");
    if (g.id === "lunar-time") {
      return { view: lunarSiteView(), engineering: false };
    }
    if (g.id === "space" || g.id === "trajectory") {
      return {
        view: earthMoonView(),
        overlay: "orion",
        engineering: false,
      };
    }
    if (overlay === "designGrid") {
      return { view: surface(framing("designGrid")), overlay, engineering };
    }
    if (overlay === "rigidVsExact") {
      return { view: surface(framing("rigidVsExact")), overlay, engineering };
    }
    if (overlay === "distortion") {
      const d = DISTORTION[overlays.settings().distortionCrs].look;
      return {
        view: surface(framingAt(d[0], d[1], d[2], 0, -60 * deg)),
        overlay,
        engineering,
      };
    }
    if (g.focus?.site === "california") {
      return { view: surface(framing("site")), engineering };
    }
    if (engineering) {
      // A check with no site of its own: show the fingerprint's first point.
      const c = r?.fingerprint?.coordinates;
      if (c && c.length >= 3 && Math.hypot(c[0]!, c[1]!, c[2]!) > 6.3e6) {
        return {
          view: surface({
            center: [c[0]!, c[1]!, c[2]!],
            range: 30_000,
            heading: 0,
            pitch: -50 * deg,
          }),
          engineering,
        };
      }
    }
    return { view: surface(OPENING), engineering: false };
  }

  // ------------------------------------------------- selection on the globe
  /** The frames the selection highlights (R14): a frame's path, a result's group's frames. */
  function emphasisFrames(): Set<string> {
    const s = view.get().selection;
    const out = new Set<string>();
    const tree = treeState.tree();
    if (isFrame(s) && tree) {
      try {
        for (const n of pathToRoot(tree, s.id)) {
          out.add(n.id);
        }
      } catch {
        // Not in the tree: reconcile clears it.
      }
    } else if (s.kind === "result" && scene === undefined) {
      // A result's group's frames, but not over a scenario's scene: a
      // catalog check through every frame (frame-tree.compositions) would
      // draw the Moon's triads in "The Earth turns" (fix 1, item 5).
      const r = catalogRuns.results().find((x) => x.id === s.id);
      for (const f of (r && groupInfo(r.group)?.focus?.frames) ?? []) {
        out.add(f);
      }
    }
    return out;
  }

  /** A result to select without flying (Open in Verification from a proof row). */
  let quietResult: string | undefined;
  let lastSelection = view.get().selection;
  let lastAgainst = view.get().against;
  function onView(): void {
    const v = view.get();
    context.setParams(formatParams({ ...v, ...host.params() }));
    if (v.selection !== lastSelection) {
      lastSelection = v.selection;
      applySelection();
    } else if (v.against !== lastAgainst && isFrame(v.selection)) {
      // The walk's reference changed: its path on the globe follows (S-I5).
      walkPath.start(v.selection.id);
    }
    lastAgainst = v.against;
    invalidate();
  }

  function applySelection(): void {
    const s = view.get().selection;
    triads.refresh();
    walkPath.start(isFrame(s) ? s.id : undefined);
    refreshCallouts();
    if (s.kind === "none") {
      globe.emphasize(undefined);
      globe.dimGround(exposure());
      return;
    }
    if (isFrame(s)) {
      // Selecting a frame highlights; flying is "Show on globe" (I6).
      globe.emphasize({ frames: emphasisFrames(), selected: s.id });
      return;
    }
    // A result not in hand (a deep link, back or forward): run its group
    // (retrying once), then show it, or clear it and say why (R15).
    const has = (id: string) =>
      catalogRuns.results().some((r) => r.id === id) ||
      user.results().some((r) => r.id === id);
    if (!has(s.id)) {
      if (linking !== s.id) {
        linking = s.id;
        void loadLinkedResult(view, s.id, {
          has,
          run: async (group) => {
            const outcome = await catalogRuns.run([group]);
            if (outcome !== undefined) {
              throw new Error(outcome);
            }
          },
          notice: (text) => {
            notice = { id: (notice?.id ?? 0) + 1, text };
            invalidate();
          },
        })
          .then((outcome) => {
            if (
              outcome === "shown" &&
              !disposed &&
              view.get().selection === s
            ) {
              applySelection();
            }
          })
          .finally(() => {
            linking = undefined;
          });
      }
      return;
    }
    // Asked for from a scenario's proof: shown in Verification, the
    // scenario's camera and overlays left as they are (fix 2).
    if (quietResult === s.id) {
      quietResult = undefined;
      globe.emphasize({ frames: emphasisFrames() });
      return;
    }
    // A result: its overlay on, its frames highlighted, the camera at its site (R14).
    const where = resultFraming(s.id);
    if (where.overlay) {
      overlays.set(where.overlay, true);
    }
    globe.emphasize({
      ...(where.overlay && { overlay: where.overlay }),
      frames: emphasisFrames(),
    });
    globe.dimGround(where.engineering);
    if (where.view) {
      show(where.view);
    }
  }

  // ------------------------------------------------------------ scenarios
  /** The scene on the globe (scenes.ts), and the knobs it shows. */
  let scene: SceneSpec | undefined;
  let sceneKnobs: KnobState = {};
  /** The clock's rate and mode before the scene set them, restored when it's left. */
  let sceneClock: { rate: number; mode: typeof viewer.clock.mode } | undefined;
  /** Orion's frame changed: frame the new path once it is drawn. */
  let reframeOrion = false;
  /** A flight to the site's new latitude, after the knob's burst. */
  let siteFlight = 0;
  scope.defer(() => clearTimeout(siteFlight));

  /** The imagery's exposure: the scene's, or dimmed under an engineering result. */
  const exposure = (): number =>
    sceneExposure(scene, viewer.container.clientWidth, NARROW_VIEW);

  /**
   * Earth-turns (S-I6): played at 3,600× the framed side passes into night,
   * so the globe is lit from the camera instead, set after the viewer's own
   * sun on every clock change (this listener comes after the viewer's).
   */
  let headlight = false;
  function lightFromCamera(): void {
    const p = viewer.view.camera.position;
    const l = Math.hypot(p[0]!, p[1]!, p[2]!);
    if (l > 0) {
      viewer.engine.sunDirection.set([p[0]! / l, p[1]! / l, p[2]! / l]);
      viewer.engine.requestRender();
    }
  }
  scope.defer(
    viewer.clock.events.on("change", () => {
      if (headlight) {
        lightFromCamera();
      }
    }),
  );
  scope.defer(() => {
    if (headlight) {
      viewer.sunFromClock = true;
    }
  });

  /**
   * On-canvas callouts (S-I8, minor 9): the lunar clock's gain at the site
   * while stand-on-moon shows or the site is selected, and Orion at the
   * clock's instant while its path is drawn.
   */
  /** Orion's statement is for about the clock's time (not one it was scrubbed from). */
  const orionNowCurrent = (): boolean => orion.nowCurrent();
  let orionNowShown = false;

  function refreshCallouts(): void {
    orionNowShown = orionNowCurrent();
    const orionInfo = orion.info();
    const orionInfoError = orion.error();
    const orionBuilt = orion.built();
    const out: LabelSpec[] = [];
    const s = view.get().selection;
    const e = evaluationNow();
    // Not a stale setup's gain (fix 1, item 1): "computing" until it's in.
    const gain =
      e?.scenario === "stand-on-moon" && !host.state().stale
        ? e.answer.value
        : undefined;
    if (
      local.some((f) => f.name === LUNAR_SITE) &&
      (scene?.id === "stand-on-moon" || (isFrame(s) && s.id === LUNAR_SITE))
    ) {
      out.push({
        id: "callout:lunar-time",
        text:
          gain !== undefined
            ? // Short, so it stays inside the view (fix 2).
              `lunar clock ${gain >= 0 ? "+" : "−"}${Math.abs(gain).toFixed(2)} µs/day`
            : "lunar clock: computing its rate",
        at: () => globe.triadOrigin(LUNAR_SITE) ?? lunarSiteOrigin(),
        priority: 4,
        leader: true,
      });
    }
    const o = overlays.state("orion");
    // Only while it is Orion's position now: a statement for another time
    // (the clock was just scrubbed) would hang the marker off the path.
    if (
      o.on &&
      o.state === "drawn" &&
      orionInfo &&
      orionNowCurrent() &&
      !orionInfoError
    ) {
      // One clear indicator (fix 1): a dot on the path at Orion's place at
      // the clock's time, its time beside it; the accuracy is the answer's,
      // on the callout. Orion's place in ITRF is on the drawn path in every
      // frame: the path is placed by its frame now (placeOrion), so its
      // sample at this time lands here (test/data/framesExplorerScenarios).
      const hhmm = new Date(orionInfo.utc).toISOString().slice(11, 16);
      out.push({
        id: "marker:orion-now",
        text: `Orion, ${hhmm} UTC`,
        at: orionInfo.info.itrf,
        family: "trajectory",
        priority: 5,
        marker: true,
        pinned: true,
      });
    }
    // The path says which frame it is drawn in, where it is drawn.
    if (o.on && o.state === "drawn" && orionBuilt) {
      const built = orionBuilt;
      const middle = built.chunks[Math.floor(built.chunks.length / 3)];
      if (middle) {
        out.push({
          id: "label:orion-path",
          text: `Orion's path, drawn in ${built.frame}`,
          at: () => orion.pathPoint(middle.origin),
          family: "trajectory",
          priority: 2,
        });
      }
    }
    labels.set("callouts", out);
    triads.refresh();
  }
  // Earth-turns' exposure depends on the view's width (F43): follow it.
  const exposureObserver = new ResizeObserver(() => {
    if (scene?.dim !== undefined) {
      globe.dimGround(exposure());
    }
  });
  exposureObserver.observe(viewer.container);
  scope.defer(() => exposureObserver.disconnect());

  /** The scene's camera, flown to (one-path in 3.0 s, stand-on-moon in 3.5 s). */
  function flyToScene(): void {
    const v = scene && sceneView(scene);
    if (v) {
      show(v, scene!.flight);
    }
  }

  /** The knobs on the globe: the clock's rate, the lunar site, Orion's frame. */
  function applySceneKnobs(): void {
    if (!scene || !frames) {
      return;
    }
    if (scene.clockRate) {
      viewer.clock.rate = scene.clockRate(sceneKnobs);
    }
    const latitude = scene.lunarSite?.(sceneKnobs);
    const itrf = frames.itrf;
    local = [
      ...(latitude !== undefined
        ? [lunarSiteFrame(frames.moonMe, latitude)]
        : []),
      ...(scene.earthSites ?? []).map((s) => earthSiteFrame(itrf, s)),
    ];
    const drawIn = scene.orion?.(sceneKnobs);
    if (drawIn !== undefined) {
      const o = overlays.state("orion");
      if (!o.on || drawIn !== orion.frame()) {
        orion.setFrame(drawIn);
        overlays.drawOn("orion");
      }
    }
    treeState.rebuild();
    triads.refresh();
    refreshCallouts();
  }

  function enterScene(id: ScenarioId, knobs: KnobState): void {
    scene = SCENES[id];
    sceneKnobs = knobs;
    // The overlays no scenario owns (turned on from Verification's results)
    // go with the scene they were drawn over.
    for (const o of OVERLAYS) {
      if (o !== "triads" && overlays.state(o).on) {
        overlays.set(o, false);
      }
    }
    sceneClock = { rate: viewer.clock.rate, mode: viewer.clock.mode };
    if (scene?.light === "camera") {
      headlight = true;
      lightFromCamera();
    }
    applySceneKnobs();
    globe.dimGround(exposure());
    flyToScene();
    // Its proof at the checked setup: the catalog's checks, run if they
    // aren't in hand (queued after the scenario's own evaluation).
    queueMicrotask(() => ensureProof(id));
  }

  function updateScene(knobs: KnobState): void {
    const moved = scene?.lunarSite?.(knobs) !== scene?.lunarSite?.(sceneKnobs);
    if (scene?.orion && scene.orion(knobs) !== scene.orion(sceneKnobs)) {
      reframeOrion = true;
    }
    sceneKnobs = knobs;
    applySceneKnobs();
    if (moved) {
      // The camera follows the site once the slider rests.
      clearTimeout(siteFlight);
      siteFlight = window.setTimeout(() => {
        if (!disposed && scene?.lunarSite) {
          flyToScene();
        }
      }, 400);
    }
  }

  function leaveScene(): void {
    if (scene?.orion) {
      overlays.set("orion", false);
    }
    if (headlight) {
      headlight = false;
      viewer.sunFromClock = true;
    }
    if (sceneClock) {
      // The rate and the mode the scene found (fix 1, item 10).
      viewer.clock.rate = sceneClock.rate;
      viewer.clock.mode = sceneClock.mode;
      sceneClock = undefined;
    }
    clearTimeout(siteFlight);
    // A switch mid-draw mustn't fly to the old scene's path (fix 2).
    reframeOrion = false;
    scene = undefined;
    local = [];
    globe.dimGround(false);
    treeState.rebuild();
    triads.refresh();
    refreshCallouts();
  }

  /** The catalog's proof checks for scenario `id`, run if the page doesn't have them. */
  function ensureProof(id: ScenarioId): void {
    const spec = SCENARIOS.find((s) => s.id === id);
    const missing = (spec?.proof ?? []).filter(
      (p) => !catalogRuns.results().some((r) => r.id === p),
    );
    if (!disposed && missing.length > 0) {
      void catalogRuns.run(missing);
    }
  }

  /** The current scenario's evaluation, if the host has one. */
  const evaluationNow = () => host.state().evaluation;

  let paramsGeneration = -1;
  let shownEvaluation: unknown;
  const host = createScenarioHost({
    evaluate: (id, knobs, ms) => {
      if (!frames) {
        return Promise.reject(new Error("frame data isn't in yet"));
      }
      return client.scenario(
        id,
        knobs,
        Instant.fromUtc(ms, frames.data.leapSeconds).tdb(),
      );
    },
    drawOverlay: (id, g) =>
      globe.setOverlay(id, [
        {
          chunks: g.layers.flatMap((l) => l.chunks),
          color: familyRgba("engineering"),
        },
      ]),
    removeOverlay: (id) => globe.removeOverlay(id),
    enter: (spec, knobs) => enterScene(spec.id, knobs),
    update: (_spec, knobs) => updateScene(knobs),
    leave: () => leaveScene(),
    setClock: (ms) => {
      viewer.clock.time = ms;
      viewer.clock.mode = "paused";
    },
    clock: () => viewer.clock.time,
    changed: (state) => {
      if (state.evaluation !== shownEvaluation) {
        // New frames attach in the tree; the callouts take the answer.
        shownEvaluation = state.evaluation;
        treeState.rebuild();
        refreshCallouts();
      }
      if (state.generation !== paramsGeneration) {
        // The link follows each asked-for setup, not every clock frame.
        paramsGeneration = state.generation;
        context.setParams(formatParams({ ...view.get(), ...host.params() }));
      }
      invalidate();
    },
    busy: () =>
      catalogRuns.runView().state === "running"
        ? "Waiting for the catalog run to end"
        : user.view().state === "running"
          ? "Waiting for your CRS's checks to end"
          : undefined,
  });
  scope.defer(() => host.dispose());
  scope.defer(viewer.clock.events.on("change", () => host.clockChanged()));

  /** The scenario a link names, or the strip's first when it isn't on the page yet. */
  const readyScenario = (id: ScenarioId | undefined): ScenarioId =>
    id !== undefined && READY.includes(id) ? id : READY[0]!;

  /** The scenario's part of the panel model. */
  function scenarioView(): { scenario: ScenarioPanelView } {
    const st = host.state();
    const spec = st.spec;
    const catalog = new Map(catalogRuns.results().map((r) => [r.id, r]));
    const tree = treeState.tree();
    const e = st.evaluation;
    // Only the time moved while the clock plays: one steady state that
    // follows it, rather than rows flipping to loading every evaluation.
    const following =
      st.stale &&
      viewer.clock.mode === "playing" &&
      st.staleBy.every((c) => c === "time");
    const freshness: ScenarioPanelView["freshness"] = !st.stale
      ? "current"
      : following
        ? "following"
        : "updating";
    let proof: ProofRow[];
    if (e && st.evaluatedAt) {
      // The rows of the setup it was made at; `freshness` says whether
      // that is the current one (the panel withholds stale verdicts).
      const at = checkedState(
        spec,
        st.evaluatedAt.knobs,
        st.evaluatedAt.epochUtcMs,
      ).atChecked;
      proof = proofRows(spec, at, catalog, e);
    } else if (st.atChecked) {
      proof = proofRows(spec, true, catalog, {
        scenario: spec.id,
        added: [],
        answer: { label: "", headline: "", accuracy: { note: "" } },
        overlays: [],
        live: [],
      });
    } else {
      // Re-running: nothing is claimed until the live checks are in (R9).
      proof = spec.proof.map((id) => ({
        kind: "pending" as const,
        id,
        title: catalog.get(id)?.title ?? id,
      }));
    }
    const liveExtras: Record<string, ResultExtras> = {};
    for (const r of e?.live ?? []) {
      // A live re-run is compared with itself by another route, not with
      // its catalog group's reference: the group's words don't apply.
      const rest = extrasOf(r);
      delete rest.compared;
      liveExtras[r.id] = rest;
    }
    let path: ScenarioPanelView["path"];
    if (tree && e?.answer.path) {
      try {
        const b = branchPath(tree, e.answer.path.from, e.answer.path.to);
        path = {
          up: b.up.map((n) => n.id),
          ancestor: b.ancestor.id,
          down: b.down.map((n) => n.id),
        };
      } catch {
        // A node the tree hasn't yet (its evaluation is still on its way).
      }
    }
    const instant = instantNow();
    return {
      scenario: {
        id: spec.id,
        title: spec.title,
        question: spec.question,
        strip: READY.map((id) => {
          const s = SCENARIOS.find((x) => x.id === id)!;
          return { id, title: s.title, question: s.question };
        }),
        knobs: spec.knobs,
        values: st.knobs,
        checked: spec.checked.knobs,
        epochUtc: new Date(st.epochUtcMs).toISOString(),
        checkedEpochUtc: new Date(
          Date.parse(spec.checked.epochUtc),
        ).toISOString(),
        atChecked: st.atChecked,
        changed: st.changed,
        status: st.status,
        freshness,
        ...(st.queued !== undefined && { queued: st.queued }),
        ...(st.problem !== undefined && {
          problem: { ...st.problem, message: scrub(st.problem.message) },
        }),
        ...(e && { answer: e.answer }),
        ...(() => {
          const pub = e?.answer.published;
          if (!pub) {
            return {};
          }
          const base = {
            printed: pub.printed,
            document: pub.document,
            ...(pub.url !== undefined && { url: pub.url }),
            tolerance: pub.tolerance,
            unit: pub.unit,
          };
          const r = catalog.get(pub.proofId);
          if (!st.atChecked) {
            const ref = proof.find(
              (row) => row.kind === "reference-only" && row.id === pub.proofId,
            );
            return {
              published: {
                ...base,
                state: "off" as const,
                ...(freshness === "current" &&
                  ref?.kind === "reference-only" &&
                  ref.delta && { delta: ref.delta }),
              },
            };
          }
          if (!r || freshness !== "current") {
            return { published: { ...base, state: "loading" as const } };
          }
          return {
            published: {
              ...base,
              state: "checked" as const,
              ...(r.effect && { ours: r.effect.value }),
              ...(r.value !== undefined && {
                difference: {
                  value: r.value,
                  ...(r.unit !== undefined && { unit: r.unit }),
                },
              }),
              pass: r.pass,
            },
          };
        })(),
        ...(path && { path }),
        proof,
        liveExtras,
        ...(scene?.note !== undefined && { note: scene.note }),
        focus: SCENES[spec.id]?.focus ?? [],
        ...(() => {
          const c = SCENES[spec.id]?.treeControl;
          const knob = c && spec.knobs.find((k) => k.id === c.knob);
          return knob?.options
            ? {
                treeControl: {
                  knob: knob.id,
                  verb: c!.verb,
                  options: knob.options,
                },
              }
            : {};
        })(),
        ...(SCENES[spec.id]?.diagramNote !== undefined && {
          diagramNote: SCENES[spec.id]!.diagramNote!,
        }),
        ...(e?.data && {
          data: {
            label: e.data.label,
            frame: e.data.frame,
            source: e.data.source,
          },
        }),
        ...(() => {
          // The route spelled out: from the data (or the answer's start)
          // through each lit edge to the drawn-in frame (or its end).
          const sc = SCENES[spec.id];
          const p = e?.answer.path;
          if (!tree || !path || !p) {
            return {};
          }
          const start = e.data
            ? {
                title: `${e.data.label}, as delivered`,
                does: `position and velocity, expressed in ${e.data.frame} (${e.data.source})`,
                accuracy: e.data.accuracy,
              }
            : (sc?.routeEnds?.start ?? { title: p.from, does: "" });
          const end = e.data
            ? {
                title: `Drawn in ${p.to}`,
                does: sc?.drawnView?.[p.to] ?? "",
              }
            : (sc?.routeEnds?.end ?? { title: p.to, does: "" });
          return { route: routeSteps(tree, path, start, end) };
        })(),
        playing: viewer.clock.mode === "playing",
        rate: viewer.clock.rate,
        ...(instant && frames && { eop: clockView().eop }),
      },
    };
  }

  // ------------------------------------------------------------------ runs
  /** Every run, catalog or "Try your own", one at a time (final review, Important 1). */
  const runs = new RunQueue();
  const catalogRuns = createCatalogRuns({
    core: { client, invalidate, disposed: () => disposed, scrub },
    runs,
    updateKnown: () => updateKnown(),
    ran: () => {
      if (overlays.state("roundTrip").on) {
        overlays.draw("roundTrip");
      }
    },
  });
  scope.defer(() => catalogRuns.dispose());
  const user = createUserCrs({
    core: { viewer, client, invalidate, disposed: () => disposed, scrub },
    runs,
    token,
    imodel: initial.imodel,
    camera: {
      ask: () => flow.ask(),
      frameIfStill: (asked, zoom) => {
        if (flow.arrival(asked, globe.flying)) {
          flow.fly(undefined);
          leaveOrbit();
          zoom();
        }
      },
    },
    updateKnown: () => updateKnown(),
  });
  const pageReport = createPageReport({
    loading,
    manifest: () => frameData.manifest(),
    lastRun: () => catalogRuns.lastRun(),
    results: () => [...catalogRuns.results(), ...user.results()],
    token,
  });
  scope.defer(() => pageReport.dispose());

  // ------------------------------------------------------------- actions
  const actions: PanelActions = {
    runAll: () => void catalogRuns.run(),
    runGroup: (group) =>
      void catalogRuns.run(groupRunIds(group, FINGERPRINTED)),
    cancel: () => client.cancel(),
    retryItem: (item) => {
      if (item === "frames") {
        void frameData.load();
      } else {
        void client.load(item).catch(() => {});
      }
    },
    setOverlay: (id, on) => overlays.set(id, on),
    setOrionFrame: (f) => {
      orion.setFrame(f);
      overlays.draw("orion");
    },
    setDistortionCrs: (crs) => {
      overlays.setDistortionCrs(crs);
      const d = DISTORTION[crs].look;
      show({ framing: framingAt(d[0], d[1], d[2], 0, -60 * deg) });
    },
    setDistortionHeight: (h) => overlays.setDistortionHeight(h),
    setBiasFactor: (k) => overlays.setBiasFactor(k),
    setTrueScale: (on) => overlays.setTrueScale(on),
    jumpToFlyby: () => {
      viewer.clock.time = FLYBY;
    },
    showOnGlobe: (target) => {
      const v =
        "frame" in target
          ? frameView(target.frame)
          : resultFraming(target.result).view;
      if (v) {
        show(v);
      }
    },
    frameContent,
    fetchAsset: (id) => void user.showAsset(id),
    runUserCrs: (wkt2) => void user.run(wkt2),
    copyReport: async () => {
      await navigator.clipboard.writeText(pageReport.report().markdown);
    },
    saveReport: (format) => {
      const r = pageReport.report();
      const blob =
        format === "json"
          ? new Blob([JSON.stringify(r.json, null, 2)], {
              type: "application/json",
            })
          : new Blob([r.markdown], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `frames-explorer-report.${format === "json" ? "json" : "md"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    },
    linkTo: (target) =>
      context.link(
        formatParams({
          selection: target,
          lens: view.get().lens,
          ...host.params(),
        }),
      ),
    selectScenario: (id) => {
      view.select({ kind: "none" });
      void host.show(readyScenario(id));
    },
    setKnob: (id, value) => host.setKnob(id, value),
    backToChecked: () => host.backToChecked(),
    selectQuietly: (id) => {
      quietResult = id;
    },
    setPlaying: (on) => {
      viewer.clock.mode = on ? "playing" : "paused";
      invalidate();
    },
  };

  // "Try your own"'s asset goes with the example.
  scope.defer(() => user.dispose());

  // ------------------------------------------------------------- startup
  /** Every frame: the triads at the clock's instant; now and then, what depends on it. */
  function startFrameLoop(): void {
    let raf = 0;
    let lastTree = viewer.clock.time;
    // Real time too: at the tour's 3,600× the clock passes a minute every
    // frame, and rebuilding the walk's statements each frame cost frames
    // (R13). Once a second at most.
    let lastTreeReal = performance.now();
    let lastBiasReal = performance.now();
    let walkAt = viewer.clock.time;
    let walkReal = performance.now();
    const tick = () => {
      if (disposed) {
        return;
      }
      const instant = instantNow();
      if (frames && instant) {
        globe.update(frames.itrf, instant);
        const now = viewer.clock.time;
        const real = performance.now();
        if (Math.abs(now - lastTree) > 60_000 && real - lastTreeReal > 1000) {
          // The tree's Earth-orientation sigma and the walk's statements (R8).
          lastTree = now;
          lastTreeReal = real;
          treeState.rebuild();
        }
        // Orion's path moves with its drawing frame every frame; its
        // statement (the tree and the legend) is asked for again after a
        // minute of clock time, at most once a second (R8).
        orion.place();
        if (orionNowCurrent() !== orionNowShown) {
          refreshCallouts();
        }
        overlays.updateMinorGrid();
        followOrbit();
        if (headlight) {
          // Follows the camera through the stop's flight.
          lightFromCamera();
        }
        if (
          walkPath.active() &&
          Math.abs(now - walkAt) > 1000 &&
          real - walkReal > 250
        ) {
          walkAt = now;
          walkReal = real;
          walkPath.draw();
        }
        orion.askIfMoved(now, real);
        if (
          overlays.state("bias").on &&
          Math.abs(now - overlays.biasAt()) > 60_000 &&
          real - lastBiasReal > 250
        ) {
          lastBiasReal = real;
          overlays.draw("bias");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    scope.defer(() => cancelAnimationFrame(raf));
  }

  // The clock opens at the flyby, paused (DESIGN.md "The opening shot");
  // the panel and the time controls show the same instant (I13).
  viewer.clock.time = FLYBY;
  viewer.clock.mode = "paused";
  scope.defer(viewer.clock.events.on("change", () => invalidate()));
  viewer.controller.maximumHeight = 2e9;
  viewer.view.camera.near = 0.1;
  viewer.controller.focus(
    Float64Array.from(OPENING.center),
    OPENING.heading,
    OPENING.pitch,
    OPENING.range,
  );

  scope.defer(view.subscribe(onView));
  scope.defer(
    context.watchParams((p) => {
      // Back, forward or an edited link: the scenario, knobs and time it
      // names. A selection is checked against this scenario's tree only:
      // another scenario's frames aren't drawn yet (fix 1, item 9).
      const now = host.params();
      const id = readyScenario(parseParams(p).scenario);
      const known: Known =
        id === now.scenario && treeState.tree()
          ? { frames: treeState.ids() }
          : {};
      const parsed = parseParams(p, known);
      view.apply(parsed);
      const sameKnobs = (
        READY.includes(id) ? SCENARIOS.find((x) => x.id === id)!.knobs : []
      ).every((k) => parsed.knobs?.[k.id] === now.knobs[k.id]);
      // A link without a time leaves the clock where it is (it may be
      // playing); one with a time sets it.
      const timeMoved = p.t !== undefined && parsed.time !== now.time;
      if (frames && (id !== now.scenario || !sameKnobs || timeMoved)) {
        void host.show(
          id,
          parsed.knobs,
          id !== now.scenario || p.t !== undefined ? parsed.time : now.time,
        );
      }
    }),
  );
  void frameData.load();

  const initialTab: Tab | undefined =
    params.tab === "verify" ||
    params.tab === "report" ||
    params.tab === "explore"
      ? params.tab
      : initial.selection.kind === "result"
        ? "verify"
        : undefined;

  return {
    dispose: () => {
      disposed = true;
      globe.stopFlight();
      loading.reset();
    },
    panel: createElement(Panel, {
      source,
      view,
      actions,
      hud,
      ...(initialTab && { initialTab }),
    }),
  };
}
