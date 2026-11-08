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
//   - cursor.ts: picks and the HUD readout (`pickAt`, Task 19's seam);
//   - shots.ts: the camera;
//   - panelModel.ts: the panel's model from a snapshot of the state here.
import { createElement } from "react";
import { Alignment } from "../../src/engineering/alignment.ts";
import type { ProjApi } from "../../src/engineering/proj.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import type { Answers } from "./answers.ts";
import { ANCHOR_STATION, CORRIDOR_ALIGNMENT } from "./corridor.ts";
import { createCursor, drawnPlacement } from "./cursor.ts";
import { createFrameDriver } from "./frameDriver.ts";
import { MorphDriver, type MorphTarget } from "./morphDriver.ts";
import { hexLinear } from "./colors.ts";
import {
  AnchorRing,
  Whiskers,
  sagSamples,
  type SagSample,
} from "./overlays.ts";
import {
  EXAGGERATION,
  SITES,
  formatParams,
  nextLoading,
  parseParams,
  type LoadEvent,
  type LoadItem,
  type PageParams,
  type Placement,
} from "./page.ts";
import { Panel } from "./panel/Panel.tsx";
import type { LiveValues, PanelActions, PanelModel } from "./panel/model.ts";
import { buildPanelModel, type SiteSnapshot } from "./panelModel.ts";
import type { PairLook } from "./placementPair.ts";
import { CameraMoves, createShots, reducedMotion } from "./shots.ts";
import { siteFacts } from "./siteFacts.ts";
import { createSiteLoader, type SiteRuntime } from "./siteLoader.ts";

const deg = Math.PI / 180;

/** The placements' colours (DESIGN.md "On the globe"): orange rigid, cyan true. */
export const RIGID_HEX = "#fc9252";
export const REPROJECTED_HEX = "#3bcddc";
const LOOK: PairLook = {
  rigidTint: hexLinear("#ffc8a0"),
  reprojectedTint: hexLinear("#a8eef4"),
  rigidLine: hexLinear(RIGID_HEX),
  reprojectedLine: hexLinear(REPROJECTED_HEX),
  // The generator's one material (scripts/designTiles/gltf.mjs).
  baseColor: [0.45, 0.45, 0.43, 1],
};

/** A small store: `get` the current value; listeners told once per frame. */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  let queued = 0;
  return {
    get: () => value,
    set(next: T) {
      if (next === value) {
        return;
      }
      value = next;
      if (queued === 0) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => cancelAnimationFrame(queued),
  };
}

/** Text that goes into an HTML credit: escaped (catalog fields are data). */
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

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
  // The clock in local solar time, the one the page sets each site's light
  // by (shots.ts `daylight`); on leaving, the zone, label and clock go back.
  const prior = {
    zone: viewer.timeControls?.zone(),
    label: viewer.timeControls?.label(),
    time: viewer.clock.time,
    mode: viewer.clock.mode,
  };
  viewer.timeControls?.setZone("solar");
  viewer.timeControls?.setLabel("Sun at the site (local solar time)");
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
  let loading: readonly LoadItem[] = [];
  let answers: Answers | undefined;
  let samples: readonly SagSample[] | undefined;
  let whiskers: Whiskers | undefined;
  let ring: AnchorRing | undefined;
  let anchorPoint: Float64Array | undefined;
  const sites = new Map<string, SiteRuntime>(
    SITES.map((entry) => [entry.id, { entry }]),
  );
  const corridor = sites.get("corridor")!;
  scope.defer(() => {
    whiskers?.dispose();
    ring?.dispose();
  });

  const live = createStore<LiveValues>({});
  scope.defer(() => live.dispose());
  /** The panel's model: made once everything it reads is set up (below). */
  const model: { store?: ReturnType<typeof createStore<PanelModel>> } = {};
  const refresh = () => {
    if (!disposed) {
      model.store?.set(buildModel());
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
  const morph = new MorphDriver(
    {
      targets: () =>
        [...sites.values()]
          .map((s): MorphTarget | undefined => s.pair)
          .concat(whiskers)
          .filter((x): x is MorphTarget => x !== undefined),
      requestRender: () => {
        viewer.engine.requestRender();
        frames.wake();
      },
      changed: () => {
        cursor.update();
        refresh();
      },
      disposed: () => disposed,
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
        morphing: paired && morph.morphing,
        exaggeration: paired ? morph.exaggeration : 1,
      };
    },
    changed: refresh,
    disposed: () => disposed,
  });

  const camera = new CameraMoves(viewer, () => {
    frames.wake();
    if (!camera.flying && shots.alongStation() !== undefined) {
      shots.endAlong();
    }
    refresh();
  });
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
    look: LOOK,
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
      ...(site === corridor &&
        samples !== undefined && {
          along: { alignment, errors: samples.map((s) => s.error) },
        }),
      ...(answers?.sites[site.entry.id] !== undefined && {
        answer: answers.sites[site.entry.id]!,
      }),
    });
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
    placeAnchorLabel();
    morph.apply();
  }

  // ----------------------------------------------------- the frame loop
  // Only while something changes (frameDriver.ts): a settled page requests
  // no frames, so on-demand rendering idles.
  let lastCamera = -1;
  const frames = createFrameDriver({
    request: (cb) => requestAnimationFrame(cb),
    cancel: (h) => cancelAnimationFrame(h),
    step() {
      if (disposed) {
        return false;
      }
      let busy = false;
      for (const site of sites.values()) {
        site.pair?.sweep();
        if (site.pair?.takeChanged()) {
          viewer.engine.requestRender();
          busy = true;
        }
      }
      const cam = viewer.view.camera;
      if (cam.version !== lastCamera) {
        lastCamera = cam.version;
        busy = true;
        // What was under the cursor no longer is.
        cursor.cameraMoved();
        placeAnchorLabel();
      }
      return busy || camera.flying || morph.morphing;
    },
  });
  scope.defer(() => frames.dispose());
  const wake = () => frames.wake();
  // The user takes the camera (the controller's input), or the view resizes.
  for (const type of ["pointerdown", "pointermove", "wheel", "keydown"]) {
    viewer.canvas.addEventListener(type, wake, { signal, passive: true });
  }
  window.addEventListener("resize", wake, { signal });

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
    return buildPanelModel({
      params,
      loading,
      t: morph.t(),
      morphing: morph.morphing,
      ghost: morph.ghost,
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
      ...(answers?.points.find((q) => q.nearKm === 20) !== undefined && {
        alongFrom: answers.points.find((q) => q.nearKm === 20)!.station,
      }),
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
  }

  // -------------------------------------------------------- the actions
  function setMode(mode: Placement): void {
    if (mode === params.mode && morph.heading(mode)) {
      return;
    }
    params = { ...params, mode };
    context.setParams(formatParams(params));
    morph.setMode(mode, reducedMotion());
    refresh();
  }

  const actions: PanelActions = {
    setMode,
    setGhost(on) {
      morph.ghost = on;
      morph.apply();
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
    selectSite(id) {
      const site = sites.get(id);
      if (site === undefined) {
        return;
      }
      params = { ...params, site: id };
      context.setParams(formatParams(params));
      refresh();
      void loader
        .loadTiles(site)
        .then(() => {
          const t = site.rigid;
          if (t !== undefined && params.site === id && !disposed) {
            shots.flyToTileset(t, id === "corridor", answers?.sites[id]);
          }
          refresh();
          return loader.loadFrame(site);
        })
        .catch(() => {})
        .finally(refresh);
    },
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
    },
  };

  // -------------------------------------------------------- deep links
  scope.defer(
    context.watchParams((next) => {
      const p = parseParams(next);
      if (p.mode !== params.mode) {
        setMode(p.mode);
      }
      if (p.site !== params.site) {
        actions.selectSite(p.site);
      }
      params = { ...params, snap: p.snap };
      refresh();
    }),
  );

  const store = createStore<PanelModel>(buildModel());
  model.store = store;
  scope.defer(() => store.dispose());

  /** The answers (again on Retry); the opening shot once they're in. */
  let opened = false;
  async function fetchAnswers(): Promise<void> {
    try {
      const a = await loader.loadAnswers();
      if (disposed || answers === a) {
        return;
      }
      answers = a;
      // Ladder sites placed before the answers: their story is the answers'.
      for (const site of sites.values()) {
        computeFacts(site);
      }
      // The opening shot (DESIGN.md "The story"): true scale, near the far
      // end; once, and not over a view the user has chosen since.
      if (params.site === "corridor" && !opened) {
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
  }

  return {
    dispose: () => {
      disposed = true;
      camera.stop();
    },
    panel: createElement(Panel, { source: store, live, actions, hud }),
  };
}
