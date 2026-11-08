// Design coordinates on the globe (plan 4b Task 18; DESIGN.md): a 50 km
// highway designed in California State Plane, drawn two ways, rigidly at
// one anchor as most viewers place a model, or reprojected through its CRS
// at every vertex, with a morph between them; and a portfolio of sites,
// each in its own country's CRS and height system.
//
// `run` returns its panel at once and loads afterwards (siteLoader.ts): the
// corridor's two tilesets draw, and morph, before PROJ is in; once each
// site's placements are in, its facts (siteFacts.ts) and, for the corridor,
// the whiskers, the anchor ring and the sag chart appear. The parts:
//   - siteLoader.ts: tilesets, answers, PROJ, the catalog, grids, placements;
//   - morphDriver.ts: the morph's clock (plan 5's animation core replaces it);
//   - placementPair.ts, overlays.ts: what the placements draw;
//   - cursor.ts: picks and the HUD readout (`pickAt`, the measure tool's seam);
//   - measureTool.ts, measureOverlay.ts: the measure tool, the openers and
//     their lines on the globe (Task 19);
//   - shots.ts: the camera;
//   - panelModel.ts: the panel's model from a snapshot of the state here;
//   - checksView.ts: the checks (Task 20), from the measure tool's shown values;
//   - tour.ts, tourRuntime.ts: the short tour (Task 20);
//   - viewParams.ts: the compass and error ribbon toggles (Task 20).
import { createElement } from "react";
import { Alignment } from "../../src/engineering/alignment.ts";
import type { ProjApi } from "../../src/engineering/proj.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import type { Answers } from "./answers.ts";
import { checksView } from "./checksView.ts";
import { ANCHOR_STATION, CORRIDOR_ALIGNMENT } from "./corridor.ts";
import { createCursor, drawnPlacement } from "./cursor.ts";
import { createMeasureTool } from "./measureTool.ts";
import { pointsLink } from "./measureState.ts";
import type { MeasurePanel } from "./measureView.ts";
import { createFrameDriver } from "./frameDriver.ts";
import { MorphDriver, type MorphTarget } from "./morphDriver.ts";
import { hexLinear } from "./colors.ts";
import {
  AnchorRing,
  ErrorRibbon,
  Whiskers,
  sagSamples,
  type SagSample,
} from "./overlays.ts";
import {
  EXAGGERATION,
  SITES,
  errorText,
  formatParams,
  loadingFor,
  nextLoading,
  parseParams,
  type LoadEvent,
  type LoadItem,
  type PageParams,
  type Placement,
} from "./page.ts";
import type { MeasureActions } from "./panel/Measure.tsx";
import { Panel } from "./panel/Panel.tsx";
import type { LiveValues, PanelActions, PanelModel } from "./panel/model.ts";
import { buildPanelModel, type SiteSnapshot } from "./panelModel.ts";
import { reducedTransparency, type PairLook } from "./placementPair.ts";
import {
  CameraMoves,
  createShots,
  markGapFraming,
  openerFraming,
  reducedMotion,
  rulerFraming,
} from "./shots.ts";
import { siteFacts } from "./siteFacts.ts";
import { clearTimeControls, createStore, escapeHtml } from "./stores.ts";
import { combinedFactorOf, corridorTerms, tourFactsOf } from "./storyFacts.ts";
import { createSiteLoader, type SiteRuntime } from "./siteLoader.ts";
import {
  clearTerrainClips,
  footprintRegion,
  stripRegion,
  syncTerrainClip,
} from "./terrainClips.ts";
import { tourCard, type TourTarget } from "./tour.ts";
import { createTour, type TourRuntime } from "./tourRuntime.ts";
import { formatView, parseView, type ViewParams } from "./viewParams.ts";

const deg = Math.PI / 180;
/** The corridor's clipped strip, either side of the centreline, ftUS (terrainClips.ts). */
const CORRIDOR_CLIP_HALF_WIDTH = 52;
/** A site's clipped footprint reaches this far past rigid's error at its edge, metres. */
const CLIP_MARGIN = 3;
/** How far the tour's shots lift their subject, as a share of the range (shots.ts `CameraMoves.lift`). */
const TOUR_LIFT = 0.2;

/** The placements' colours (DESIGN.md "On the globe"): orange rigid, cyan true. */
export const RIGID_HEX = "#fc9252";
export const REPROJECTED_HEX = "#3bcddc";
const LOOK: PairLook = {
  rigidTint: hexLinear("#ffc8a0"),
  reprojectedTint: hexLinear("#a8eef4"),
  rigidLine: hexLinear(RIGID_HEX),
  reprojectedLine: hexLinear(REPROJECTED_HEX),
  // The generator's one material (scripts/designTiles/gltf.mjs).
  // Lifted from the generator's 0.45 grey, so the true road reads over the
  // fainter rigid ghost (Task 20 fix 1, I4).
  baseColor: [0.58, 0.58, 0.56, 1],
};

export function run(context: ExampleContext): ExampleRun {
  const { viewer, scope, signal } = context;
  const token = context.accessToken;
  /** The token never enters what the page shows. */
  const scrub = (text: string) =>
    token !== undefined && token.length >= 8
      ? text.split(token).join("[redacted]")
      : text;
  let disposed = false;
  scope.defer(() => {
    disposed = true;
  });

  // The HUD over the canvas: the cursor readout, the legend, the anchor's label.
  const hud = document.createElement("div");
  hud.className = "dg-hud-host";
  viewer.container.append(hud);
  scope.defer(() => hud.remove());
  viewer.view.camera.near = 0.1;
  // The clock in the selected site's civil time (its IANA zone, feedback
  // F9); each Fly to sets it to the site's daylight (shots.ts `daylight`).
  // On leaving, the zone, label and clock go back.
  const prior = {
    zone: viewer.timeControls?.zone(),
    label: viewer.timeControls?.label(),
    time: viewer.clock.time,
    mode: viewer.clock.mode,
  };
  /** The time controls show `entry`'s civil time. */
  const siteClock = (entry: {
    readonly timeZone: string;
    readonly name: string;
  }) => {
    viewer.timeControls?.setZone({ iana: entry.timeZone });
    viewer.timeControls?.setLabel(
      `Time at ${entry.name} (${entry.timeZone}), and the sun there`,
    );
  };
  scope.defer(() => {
    if (prior.zone !== undefined) {
      viewer.timeControls?.setZone(prior.zone);
    }
    if (prior.label) {
      viewer.timeControls?.setLabel(prior.label);
    }
    viewer.clock.time = prior.time;
    viewer.clock.mode = prior.mode;
  });
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);

  // ------------------------------------------------------------ state
  let params: PageParams = parseParams(context.params);
  /** The viewer toggles, off by default (viewParams.ts). */
  let view: ViewParams = parseView(context.params);
  /** The link as it is now, for "Copy link": every parameter the page set. */
  const linkParams: Record<string, string | undefined> = { ...context.params };
  const setLink = (next: Readonly<Record<string, string | undefined>>) => {
    Object.assign(linkParams, next);
    context.setParams(next);
  };
  let loading: readonly LoadItem[] = [];
  let answers: Answers | undefined;
  let samples: readonly SagSample[] | undefined;
  let whiskers: Whiskers | undefined;
  let ring: AnchorRing | undefined;
  let ribbon: ErrorRibbon | undefined;
  let anchorPoint: Float64Array | undefined;
  const sites = new Map<string, SiteRuntime>(
    SITES.map((entry) => [entry.id, { entry }]),
  );
  const corridor = sites.get("corridor")!;
  siteClock((sites.get(params.site) ?? corridor).entry);
  scope.defer(() => {
    whiskers?.dispose();
    ring?.dispose();
    ribbon?.dispose();
  });

  // The page's frames are the engine's (frameDriver.ts): animations before
  // its render, overlays and the stores' listeners after it.
  const frames = createFrameDriver(viewer.engine);
  scope.defer(() => frames.dispose());
  /** The camera and canvas size the overlays were last placed for. */
  let lastCamera = -1;
  let lastSize = "";
  /** The morph started or ended: the labels again after the render. */
  let placeLabels = false;

  const live = createStore<LiveValues>({}, frames);
  scope.defer(() => live.dispose());
  /** The panel's model: made once everything it reads is set up (below). */
  const model: {
    store?: ReturnType<typeof createStore<PanelModel>>;
    measure?: ReturnType<typeof createStore<MeasurePanel>>;
  } = {};
  const refresh = () => {
    if (!disposed) {
      // A linked tour step that waited for its data (the openers, the answers).
      if (model.store !== undefined) {
        tour?.flush();
      }
      model.store?.set(buildModel());
      model.measure?.set(tool.view());
    }
  };
  const report = (event: LoadEvent) => {
    const next = nextLoading(loading, {
      ...event,
      ...("detail" in event && { detail: scrub(event.detail ?? "") }),
    } as LoadEvent);
    if (next !== loading) {
      loading = next;
      refresh();
    }
  };

  // ------------------------------------------------------------ parts
  // The measure tool (measureTool.ts), first of the parts: the morph draws
  // it and `refresh` reads it. Its snaps are judged by the cursor's seam, by
  // the site they hit; what it reads of the morph, the cursor and the frame
  // loop it reads when called, after they are made below.
  const tool = createMeasureTool({
    viewer,
    signal,
    sites: () => sites.values(),
    site: (id) => sites.get(id),
    alignment,
    answers: () => answers,
    pickState: () => {
      const selected = sites.get(params.site) ?? corridor;
      return {
        mode: drawnPlacement(selected, morph.t()),
        t: morph.t(),
        morphing: morph.morphing,
        exaggeration: morph.exaggeration,
        selectedPaired: selected.pair !== undefined,
      };
    },
    pickAt: (x, y) => cursor.pickAt(x, y),
    snapMode: () => params.snap,
    drawState: () => ({
      t: morph.t(),
      exaggeration: morph.exaggeration,
      morphing: morph.morphing,
      ghost: morph.ghost,
    }),
    setLink: (link) => setLink(link),
    changed: refresh,
    wake: () => viewer.engine.requestRender(),
    frame: frames,
    report,
    disposed: () => disposed,
    away: () => {
      const site = sites.get(params.site);
      if (site === undefined || site === corridor) {
        return undefined;
      }
      const story = site.view?.story;
      return {
        name: site.entry.name,
        ...(story !== undefined && {
          story: `${story.extent}; rigid is ${story.edgeError} off at its edge${story.cause}. ${story.verdict}`,
        }),
      };
    },
  });
  scope.defer(() => tool.dispose());

  const morph = new MorphDriver(
    {
      targets: () =>
        [...sites.values()]
          .map((s): MorphTarget | undefined => s.pair)
          .concat(whiskers, tool.target)
          .filter((x): x is MorphTarget => x !== undefined),
      requestRender: () => viewer.engine.requestRender(),
      changed: () => {
        cursor.update();
        placeLabels = true;
        refresh();
      },
      disposed: () => disposed,
      animate: (step) => frames.animate(step),
    },
    params.mode,
  );
  scope.defer(() => morph.dispose());

  const cursor = createCursor({
    viewer,
    signal,
    sites: () => sites.values(),
    // As the selected site is drawn: a one-tileset site is rigid, unmoving.
    state: () => {
      const selected = sites.get(params.site) ?? corridor;
      const paired = selected.pair !== undefined;
      return {
        mode: drawnPlacement(selected, morph.t()),
        t: morph.t(),
        morphing: morph.morphing,
        exaggeration: morph.exaggeration,
        selectedPaired: paired,
      };
    },
    changed: refresh,
    disposed: () => disposed,
    compass: () => view.compass,
  });

  const camera = new CameraMoves(
    viewer,
    () => {
      if (!camera.flying && shots.alongStation() !== undefined) {
        shots.endAlong();
      }
      refresh();
    },
    (step) => frames.animate(step),
  );
  scope.defer(() => camera.stop());
  const shots = createShots({
    viewer,
    camera,
    alignment,
    answers: () => answers,
    samples: () => samples,
    alongChanged: (station) => {
      live.set({ ...live.get(), station });
      if (station === undefined) {
        refresh();
      }
    },
  });

  const loader = createSiteLoader({
    viewer,
    scope,
    signal,
    // The ghost deck translucent, or hatched for less transparency.
    look: {
      ...LOOK,
      ghostDeck: reducedTransparency() ? "hatch" : "translucent",
    },
    report,
    disposed: () => disposed,
    paired: () => morph.apply(),
    // Every paired site but the corridor (whose whiskers stand on its
    // alignment) gets whiskers from its own vertices: about twelve across
    // it, coloured against its largest rigid error.
    pairOptions: (site) =>
      site === corridor
        ? { wake: () => frames.wake() }
        : {
            wake: () => frames.wake(),
            whiskers: {
              spacing: Math.max(2, site.entry.extent / 12),
              scale:
                answers?.sites[site.entry.id]?.displayError ??
                Math.max(1e-3, (site.entry.extent / 2) ** 2 / (2 * 6_371_000)),
            },
          },
    placed: (site, api) => {
      placedApi.set(site, api);
      if (
        site === corridor &&
        site.rigidPlacement &&
        site.reprojectedPlacement
      ) {
        samples = sagSamples(
          alignment,
          site.rigidPlacement,
          site.reprojectedPlacement,
          1000,
        );
        buildCorridorEvidence(site);
      }
      computeFacts(site);
      clipTerrain(site);
      // The openers and exact snapping (the corridor), or a linked measurement.
      tool.placementsChanged();
      tour?.flush();
      // The grids' credits, with the data credits (bottom left).
      const credits = (site.rigidPlacement ?? site.reprojectedPlacement)!.frame
        .gridCredits;
      if (credits.length > 0) {
        viewer.addAttributions(
          site,
          credits.map((c) => ({
            html: `Grids: ${escapeHtml(c)}`,
            collapsible: true,
          })),
        );
        scope.defer(() => viewer.addAttributions(site, []));
      }
      refresh();
    },
    warn: (message) => console.warn(scrub(message)),
  });

  /**
   * The terrain under the site's design (feedback F11): its footprint, or
   * the corridor's strip, padded by rigid's error there, so the ground
   * never pokes through a flat design surface in either placement.
   */
  function clipTerrain(site: SiteRuntime): void {
    const globe = viewer.globe;
    const placement = site.reprojectedPlacement ?? site.rigidPlacement;
    if (globe === undefined || !globe.terrain || placement === undefined) {
      return;
    }
    const displayed = (d: ArrayLike<number>) => placement.displayed(d);
    const mpu = placement.frame.units.metersPerUnit;
    const corners = site.entry.corners;
    const rigidError = (d: ArrayLike<number>) =>
      site.rigidPlacement?.displayError(d) ?? 0;
    const polygon =
      site === corridor
        ? // The paved section and its barriers (±41 ftUS), and room for
          // the rigid copy's sideways shift (the scale factor's 2.3 m).
          stripRegion(alignment, displayed, CORRIDOR_CLIP_HALF_WIDTH, 500)
        : corners !== undefined
          ? footprintRegion(
              corners,
              displayed,
              (Math.max(...corners.map(rigidError)) + CLIP_MARGIN) / mpu,
            )
          : undefined;
    const why = syncTerrainClip(globe, site.entry.id, polygon);
    if (why !== undefined) {
      console.warn(scrub(`${site.entry.name}: terrain not clipped: ${why}`));
    }
  }
  scope.defer(() => {
    const globe = viewer.globe;
    if (globe !== undefined && !globe.isDestroyed()) {
      clearTerrainClips(globe);
    }
  });

  /** PROJ, as each placed site was placed with (for its facts again). */
  const placedApi = new Map<SiteRuntime, ProjApi>();
  /** A site's facts, again when the answers arrive (a ladder site's story is theirs). */
  function computeFacts(site: SiteRuntime): void {
    const api = placedApi.get(site);
    if (api === undefined) {
      return;
    }
    site.view = siteFacts({
      entry: site.entry,
      ...(site.rigidPlacement && { rigid: site.rigidPlacement }),
      ...(site.reprojectedPlacement && {
        reprojected: site.reprojectedPlacement,
      }),
      api,
      ...combinedFactorOf(site, { answers, corridor, alignment }),
      ...(site === corridor &&
        samples !== undefined && {
          along: {
            alignment,
            errors: samples.map((s) => s.error),
            ...corridorTerms(site, samples, { answers, corridor, alignment }),
          },
        }),
      ...(answers?.sites[site.entry.id] !== undefined && {
        answer: answers.sites[site.entry.id]!,
      }),
    });
  }

  /** The error ribbon, drawn while its toggle is on (built once the corridor is placed). */
  function syncRibbon(): void {
    const site = corridor;
    if (
      view.ribbon &&
      ribbon === undefined &&
      site.rigidPlacement &&
      site.reprojectedPlacement
    ) {
      ribbon = new ErrorRibbon(
        viewer.world,
        alignment,
        site.rigidPlacement,
        site.reprojectedPlacement,
        100,
      );
    }
    ribbon?.setVisible(view.ribbon);
    viewer.engine.requestRender();
    frames.wake();
  }

  /** The whiskers and the anchor ring. */
  function buildCorridorEvidence(site: SiteRuntime): void {
    if (
      samples === undefined ||
      !site.rigidPlacement ||
      !site.reprojectedPlacement
    ) {
      return;
    }
    whiskers?.dispose();
    whiskers = new Whiskers(viewer.world, samples, 40 * EXAGGERATION + 1);
    const station = answers?.anchorStation ?? ANCHOR_STATION;
    const [e, n] = alignment.pointAt(station, 0);
    anchorPoint = site.reprojectedPlacement.displayed([
      e!,
      n!,
      alignment.elevationAt(station),
    ]);
    ring?.dispose();
    ring = new AnchorRing(viewer.world, anchorPoint, 30);
    // The ribbon again on the new placements.
    ribbon?.dispose();
    ribbon = undefined;
    syncRibbon();
    placeAnchorLabel();
    morph.apply();
  }

  // ----------------------------------------------------- the frame loop
  // In the engine's frames (frameDriver.ts), which run only while something
  // changes: a settled page requests no frames, so on-demand rendering
  // idles. The camera, the tilesets and the world wake the engine
  // themselves; the morph and the flights are its animations.
  // Before the render: the pairs whose tiles unloaded since.
  scope.defer(
    viewer.engine.onTick(() => {
      if (disposed) {
        return false;
      }
      for (const site of sites.values()) {
        site.pair?.sweep();
        if (site.pair?.takeChanged()) {
          viewer.engine.requestRender();
        }
      }
      return false;
    }),
  );
  // After it: what is placed against the frame drawn, from the camera and
  // the morph it was drawn with.
  scope.defer(
    frames.afterRender(() => {
      if (disposed) {
        return;
      }
      const cam = viewer.view.camera;
      const size = `${viewer.canvas.clientWidth}x${viewer.canvas.clientHeight}`;
      if (cam.version !== lastCamera || size !== lastSize) {
        lastCamera = cam.version;
        lastSize = size;
        // What was under the cursor no longer is.
        cursor.cameraMoved();
        placeAnchorLabel();
        tool.place();
      } else if (morph.morphing || placeLabels) {
        tool.place();
      }
      placeLabels = false;
    }),
  );
  scope.defer(clearTimeControls(viewer.container, hud, viewer.canvas));
  /** The user has taken the camera: no opening shot cuts it away after. */
  let userMoved = false;
  const tookCamera = () => {
    userMoved = true;
    endRulerView();
  };
  for (const type of ["pointerdown", "wheel", "keydown"]) {
    viewer.canvas.addEventListener(type, tookCamera, { signal, passive: true });
  }

  /** The anchor's label: in front of the camera, above its horizon and near. */
  function placeAnchorLabel(): void {
    if (anchorPoint === undefined) {
      return;
    }
    const cam = viewer.view.camera;
    const to = [0, 1, 2].map((k) => cam.position[k]! - anchorPoint![k]!);
    const up = new Float64Array(3);
    Ellipsoid.WGS84.geodeticSurfaceNormal(anchorPoint, up);
    const seen =
      Math.hypot(to[0]!, to[1]!, to[2]!) < 60_000 &&
      to[0]! * up[0]! + to[1]! * up[1]! + to[2]! * up[2]! > 0;
    const px = seen ? viewer.view.toPixel(anchorPoint) : undefined;
    const anchor = px ? { x: px[0]!, y: px[1]! } : undefined;
    live.set({ ...live.get(), anchor });
  }

  // ---------------------------------------------------------- the model
  function buildModel(): PanelModel {
    const base = buildPanelModel({
      params,
      // Another site's own failures stay on it.
      loading: loadingFor(loading, params.site),
      t: morph.t(),
      morphing: morph.morphing,
      ghost: userGhost(),
      exaggerate: morph.exaggerate,
      sites: new Map(
        [...sites].map(([id, s]): [string, SiteSnapshot] => [
          id,
          {
            entry: s.entry,
            paired: s.pair !== undefined,
            started: s.tiles !== undefined || s.frame !== undefined,
            drawn: s.rigid !== undefined,
            ...(s.view && { view: s.view }),
          },
        ]),
      ),
      ...(samples && { samples }),
      ...(answers && { anchorStation: answers.anchorStation }),
      // Fly along starts at the self-check's station, the opening shot's.
      ...(answers !== undefined && { alongFrom: answers.marker.station }),
      stations: { start: alignment.startStation, end: alignment.endStation },
      cursor: cursor.view(),
      ...(answers && {
        extents: new Map(
          Object.entries(answers.sites).map(([id, a]) => [id, a.extent]),
        ),
        edgeErrors: new Map(
          Object.entries(answers.sites).map(([id, a]) => [id, a.displayError]),
        ),
      }),
      flyingAlong: camera.flying && shots.alongStation() !== undefined,
      evidence: whiskers !== undefined && ring !== undefined,
    });
    const user = tool.userEnds();
    const state = tour?.state();
    return {
      ...base,
      legend: {
        ...base.legend,
        ...(view.ribbon &&
          ribbon !== undefined && {
            ribbon: { min: "0 m", max: errorText(ribbon.max) },
          }),
      },
      checks: checksView(answers, tool.shownValues(), user),
      // The card waits for the answers and the opening shot (story M7).
      ...(state !== undefined &&
        answers !== undefined && {
          tour: tourCard(state, tourFactsOf(answers, corridor)),
        }),
      view: {
        compass: view.compass,
        ribbon: view.ribbon,
        ribbonReady:
          corridor.rigidPlacement !== undefined &&
          corridor.reprojectedPlacement !== undefined,
      },
    };
  }

  // -------------------------------------------------------- the actions
  function setMode(mode: Placement): void {
    if (mode === params.mode && morph.heading(mode)) {
      return;
    }
    params = { ...params, mode };
    setLink(formatParams(params));
    morph.setMode(mode, reducedMotion());
    refresh();
  }

  /** Selects a site: its tiles and frame load; the camera flies to it when `fly`. */
  function selectSite(id: string, fly: boolean): void {
    const site = sites.get(id);
    if (site === undefined) {
      return;
    }
    params = { ...params, site: id };
    setLink(formatParams(params));
    siteClock(site.entry);
    // In the site's daylight at once (again on arrival, shots.ts `flyLit`),
    // whatever time it was where the camera was.
    const known = site.rigid?.root.volume.sphere.center;
    if (fly && known !== undefined) {
      shots.daylight(known);
    }
    // The corridor's openers are drawn on the corridor only.
    tool.siteChanged();
    refresh();
    void loader
      .loadTiles(site)
      .then(() => {
        const t = site.rigid;
        if (fly && t !== undefined && params.site === id && !disposed) {
          shots.flyToTileset(t, id === "corridor", answers?.sites[id]);
        }
        refresh();
        return loader.loadFrame(site);
      })
      .catch(() => {})
      .finally(refresh);
  }

  /** Flies to a framing in its own daylight. */
  function flyLit(to: Parameters<typeof camera.flyTo>[0]): void {
    shots.daylight(to.center);
    camera.flyTo(to, () => shots.daylight(to.center));
  }

  /**
   * Shows a tour step (tour.ts `tourTarget`): its site, its placement (the
   * morph runs, or cuts under reduced motion) and its shot, at true scale.
   * False while what it shows isn't in yet; the tour tries again.
   */
  function applyTour(target: TourTarget): boolean {
    if (target.shot === "keep") {
      return true;
    }
    if (
      answers === undefined ||
      corridor.rigidPlacement === undefined ||
      corridor.reprojectedPlacement === undefined
    ) {
      return false;
    }
    if (
      (target.shot === "mark" || target.shot === "pair") &&
      tool.openerFocus(target.shot) === undefined
    ) {
      return false;
    }
    if (morph.exaggerate) {
      morph.exaggerate = false;
      morph.apply();
      cursor.update();
    }
    if (target.site !== params.site || target.shot === "site") {
      selectSite(target.site, target.shot === "site");
    }
    setMode(target.mode);
    if (target.shot === "opening") {
      const f = shots.openingShot(answers);
      if (f !== undefined) {
        flyLit(f);
      }
    } else if (target.shot === "mark" || target.shot === "pair") {
      measureActions.show(target.shot);
    }
    return true;
  }

  /**
   * "Close in on the ruler" sets the ghost deck and the ribbon aside, so the
   * ruler isn't seen through an orange field (Task 20 fix 1, I7); the next
   * time the user takes the camera, or sets either, they come back.
   */
  let rulerView: { readonly ghost: boolean } | undefined;
  function beginRulerView(): void {
    rulerView ??= { ghost: morph.ghost };
    morph.ghost = false;
    morph.apply();
    ribbon?.setVisible(false);
    viewer.engine.requestRender();
    frames.wake();
  }
  function endRulerView(): void {
    if (rulerView === undefined) {
      return;
    }
    morph.ghost = rulerView.ghost;
    rulerView = undefined;
    morph.apply();
    syncRibbon();
    refresh();
  }
  /** The ghost as the user set it (the ruler's view sets it aside for a while). */
  const userGhost = () => rulerView?.ghost ?? morph.ghost;

  const actions: PanelActions = {
    setMode,
    setGhost(on) {
      rulerView = undefined;
      morph.ghost = on;
      morph.apply();
      syncRibbon();
      refresh();
    },
    setExaggerate(on) {
      morph.exaggerate = on;
      morph.apply();
      cursor.update();
      // On the corridor's opening view, keep the deck in frame: the shot
      // pulls back with the drawn gap, and returns when it's off.
      if (
        params.site === "corridor" &&
        answers !== undefined &&
        !camera.flying
      ) {
        const f = shots.openingShot(answers, morph.exaggeration);
        if (f !== undefined) {
          camera.flyTo(f);
        }
      }
      refresh();
    },
    flyAlong: () => shots.flyAlong(),
    stopFlight: () => camera.stop(),
    selectSite: (id) => selectSite(id, true),
    // Everything that failed, answers included: the corridor, the selected
    // site, and any site whose tiles failed.
    retry() {
      void loader
        .retry(
          [...sites.values()].filter(
            (s) =>
              s === corridor ||
              s.entry.id === params.site ||
              s.tilesFailed === true,
          ),
        )
        .finally(refresh);
      void fetchAnswers();
      tool.retry();
    },
    link: () => context.link(linkParams),
    setCompass(on) {
      view = { ...view, compass: on };
      setLink(formatView(view));
      // The compass shows with the next pick; off, it goes now.
      cursor.cameraMoved();
      refresh();
    },
    setRibbon(on) {
      view = { ...view, ribbon: on };
      setLink(formatView(view));
      syncRibbon();
      refresh();
    },
    tour: (action) => tour?.go(action),
    measurePair(id) {
      const pair = answers?.pairs.find((p) => p.id === id);
      const a = pair && answers?.points[pair.from];
      const b = pair && answers?.points[pair.to];
      if (a === undefined || b === undefined) {
        return;
      }
      const link = pointsLink(a.design, b.design, "corridor");
      setLink(link);
      tool.applyLink({ ...linkParams });
      // Over the pair, where it truly is.
      const center = a.bodyFixed.map((x, k) => (x + b.bodyFixed[k]!) / 2);
      const length = Math.hypot(
        ...a.bodyFixed.map((x, k) => x - b.bodyFixed[k]!),
      );
      flyLit({
        center,
        heading: -35 * deg,
        pitch: -40 * deg,
        range: Math.max(200, length * 1.3),
      });
      refresh();
    },
  };

  const measureActions: MeasureActions = {
    setSnap(snap) {
      params = { ...params, snap };
      setLink(formatParams(params));
      tool.snapChanged();
      refresh();
    },
    clear: () => tool.clear(),
    pointAtCentre: () => tool.pointAtCentre(),
    retryMeasure: () => tool.retryMeasure(),
    toCorridor: () => selectSite("corridor", true),
    closeInOnRuler() {
      const focus = tool.rulerFocus();
      if (focus === undefined) {
        return;
      }
      const to = rulerFraming(focus);
      beginRulerView();
      shots.daylight(to.center);
      camera.flyTo(to, () => shots.daylight(to.center));
    },
    show(id) {
      const focus = tool.openerFocus(id);
      if (focus === undefined) {
        return;
      }
      const rigid = corridor.rigidPlacement;
      const reprojected = corridor.reprojectedPlacement;
      if (id === "mark" && answers && rigid && reprojected) {
        const near = answers.mark.nearestDesign;
        flyLit(
          markGapFraming(
            answers.mark.bodyFixed,
            reprojected.displayed(near),
            rigid.displayed(near),
          ),
        );
        return;
      }
      const to = openerFraming(id, focus, answers, alignment);
      shots.daylight(to.center);
      camera.flyTo(to, () => shots.daylight(to.center));
    },
  };

  // -------------------------------------------------------- deep links
  scope.defer(
    context.watchParams((next) => {
      for (const key of Object.keys(linkParams)) {
        delete linkParams[key];
      }
      Object.assign(linkParams, next);
      const v = parseView(next);
      if (v.compass !== view.compass) {
        actions.setCompass(v.compass);
      }
      if (v.ribbon !== view.ribbon) {
        actions.setRibbon(v.ribbon);
      }
      tour?.fromLink(next);
      const p = parseParams(next);
      // The snap first: the mode and the site write the link with it.
      if (p.snap !== params.snap) {
        params = { ...params, snap: p.snap };
        tool.snapChanged();
      }
      if (p.mode !== params.mode) {
        setMode(p.mode);
      }
      if (p.site !== params.site) {
        actions.selectSite(p.site);
      }
      tool.applyLink(next);
      refresh();
    }),
  );

  // The tour (tour.ts): on a bare link from its first step, which is the
  // page's own opening; at a linked step once that step's data is in.
  const tour: TourRuntime | undefined = createTour({
    initial: context.params,
    setLink,
    apply: applyTour,
    changed: () => {
      liftForTour();
      refresh();
    },
  });
  /** While the tour's card covers the view's lower middle, shots lift their subject above it. */
  function liftForTour(): void {
    camera.lift = tour?.state() !== undefined ? TOUR_LIFT : 0;
  }
  liftForTour();

  const store = createStore<PanelModel>(buildModel(), frames);
  model.store = store;
  scope.defer(() => store.dispose());
  const measureStore = createStore<MeasurePanel>(tool.view(), frames);
  model.measure = measureStore;
  scope.defer(() => measureStore.dispose());
  // A deep link's measurement, once its site's placements are in.
  tool.applyLink(context.params);

  /** The answers (again on Retry); the opening shot once they're in. */
  let opened = false;
  async function fetchAnswers(): Promise<void> {
    try {
      const a = await loader.loadAnswers();
      if (disposed || answers === a) {
        return;
      }
      answers = a;
      tool.answersChanged();
      tour?.flush();
      // Ladder sites placed before the answers: their story is the answers'.
      for (const site of sites.values()) {
        computeFacts(site);
      }
      // The opening shot (DESIGN.md "The story"): true scale, near the far
      // end; once, and not over a view the user has chosen since.
      // A linked tour step past the first frames its own shot.
      if (
        params.site === "corridor" &&
        !opened &&
        !userMoved &&
        (tour?.state()?.step ?? 0) === 0
      ) {
        opened = true;
        const f = shots.openingShot(a);
        if (f) {
          camera.cut(f);
          shots.daylight(f.center);
          frames.wake();
        }
      }
      refresh();
    } catch {
      // Reported as the answers' item (siteLoader.ts), with Retry.
    }
  }

  // ------------------------------------------------------------ startup
  // The corridor first: its tiles draw and morph before PROJ is in.
  void loader.loadTiles(corridor).catch(() => {});
  void fetchAnswers();
  void loader.loadFrame(corridor);
  if (params.site !== "corridor") {
    actions.selectSite(params.site);
  }
  // Before the answers arrive, frame the corridor from above its middle.
  {
    const center = new Float64Array(3);
    Ellipsoid.WGS84.cartographicToCartesian(
      { longitude: -122.02 * deg, latitude: 37.76 * deg, height: 200 },
      center,
    );
    viewer.controller.focus(center, 0, -50 * deg, 60_000);
    // In daylight from the start, even if nothing loads (story M12).
    shots.daylight(center);
  }

  return {
    dispose: () => {
      disposed = true;
      camera.stop();
    },
    panel: createElement(Panel, {
      source: store,
      live,
      actions,
      hud,
      measure: {
        source: measureStore,
        live: tool.live,
        actions: measureActions,
      },
    }),
  };
}
