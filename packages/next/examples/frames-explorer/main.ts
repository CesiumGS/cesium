// The frames explorer (plan Task 6): the frame tree and engineering frames,
// drawn on the globe and stress-tested in the page. Its first view is the
// scenarios (spec 2026-11-06): each a problem solved by the tree it builds;
// scenarioHost.ts runs their lifecycle, and this file gives it the worker,
// the globe and the clock (each scenario's scene: scenarios/stage.ts).
//
// `run` returns its panel at once (R17) and loads afterwards: frame data on
// the main thread (the triads follow the clock every frame), and everything
// else, the stress catalog, PROJ, GEOID18, Orion and the PROJ-dependent
// overlay geometry, through the compute worker (R13, protocol.ts). One view
// store (selection.ts) is the selection the tree, the globe and the tests
// share (R14), kept in step with the example's params (R15). Every async step
// stops on `context.signal`, and everything drawn goes through `scope`.
//
// `run` builds the page's parts (DESIGN.md "Files") and wires them: each
// takes what it reads from the others as functions, so the order below is
// the order they set up their listeners and teardown, not a dependency
// order. The DisposableStack undoes them in reverse, and the clock's change
// listeners run in the order registered: the scene's headlight, then the
// scenario host, then the panel.
import { createElement } from "react";
import { Instant } from "../../src/time/Instant.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import { createCallouts } from "./callouts.ts";
import { createCameraRig } from "./cameraRig.ts";
import { OPENING, createCameraViews } from "./cameraViews.ts";
import { createCatalogRuns } from "./catalogRuns.ts";
import {
  createDeepLinks,
  createLinkWriter,
  initialTab,
  readyScenario,
} from "./deepLinks.ts";
import { createFrameData } from "./frameData.ts";
import { createFrameLoop } from "./frameLoop.ts";
import { GapInset } from "./gapInset.ts";
import { Globe, familyRgba, hexRgba } from "./globe.ts";
import { createGlobeSelection } from "./globeSelection.ts";
import { LoadingModel } from "./loading.ts";
import { createOrionLayer } from "./orionLayer.ts";
import { loadOrionTrack } from "./orionTrack.ts";
import { createOverlayControl } from "./overlayControl.ts";
import {
  FLYBY,
  createModelSource,
  createTimeSource,
  type PageCore,
} from "./page.ts";
import { createPageReport } from "./pageReport.ts";
import { createPointDrag } from "./pointDrag.ts";
import { Panel } from "./panel/Panel.tsx";
import { createPanelActions } from "./panelActions.ts";
import { clockView, createPanelModel } from "./panelModel.ts";
import { createClient, type ClientWorker } from "./protocol.ts";
import { RunQueue } from "./runQueue.ts";
import { createScenarioHost } from "./scenarioHost.ts";
import { scenarioView } from "./scenarioModel.ts";
import { createStage } from "./scenarios/stage.ts";
import { createBodyLines } from "./bodyLines.ts";
import { createBuoyWindow } from "./buoyWindow.ts";
import { createSightLines } from "./sightLines.ts";
import { createSkyRay } from "./skyRay.ts";
import { ViewStore, formatParams, parseParams } from "./selection.ts";
import { createTreeState } from "./treeState.ts";
import { createTriadLayer, type LabelBoard } from "./triadLayer.ts";
import { createUserCrs } from "./userCrs.ts";
import { createWalkPath } from "./walkPath.ts";

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
      treeState.rebuild();
      triads.refresh();
      scope.defer(frameLoop.start());
      // The scenario a deep link names (R15), at its knobs and time, or the
      // strip's first at its checked setup; then the link's selection (a
      // result runs its group first, then is selected and flown to).
      void host.show(
        readyScenario(initial.scenario),
        initial.knobs,
        initial.time,
      );
      selection.restart();
    },
    failed: (message) => {
      treeState.fail(
        `The frame tree can't draw: frame data didn't load (${message}). Everything else that needs no frame data still works.`,
      );
      invalidate();
    },
  });
  scope.defer(() => frameData.dispose());

  /** Every part's labels on the globe, shown with the triads' (triadLayer.ts). */
  const labels: LabelBoard = new Map();
  let disposed = false;
  scope.defer(() => {
    disposed = true;
  });

  // ------------------------------------------------------------- the model
  const modelSource = createModelSource({
    build: () => panelModel.build(),
    disposed: () => disposed,
  });
  const { source, invalidate } = modelSource;
  scope.defer(() => modelSource.dispose());
  loading.subscribe(invalidate);

  const frames = () => frameData.frames();
  const instantNow = (): Instant | undefined => {
    const f = frames();
    return f
      ? Instant.fromUtc(viewer.clock.time, f.data.leapSeconds)
      : undefined;
  };
  const core: PageCore = {
    viewer,
    globe,
    loading,
    view,
    client,
    frames,
    instantNow,
    invalidate,
    disposed: () => disposed,
    scrub,
  };

  // ------------------------------------------------- the tree and the globe
  const treeState = createTreeState({
    core,
    local: () => stage.local(),
    evaluation: () => evaluationNow(),
    orion: () => (orion.error() === undefined ? orion.info()?.info : undefined),
    updateKnown: () => selection.updateKnown(),
  });
  scope.defer(() => treeState.dispose());
  const triads = createTriadLayer({
    core,
    labels,
    tree: () => treeState.tree(),
    local: () => stage.local(),
    on: () => overlays.state("triads").on,
    scene: () => stage.scene(),
    sceneKnobs: () => stage.knobs(),
    emphasis: () => selection.emphasis(),
  });
  scope.defer(() => triads.dispose());
  const overlays = createOverlayControl({
    core,
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
    refreshCallouts: () => callouts.refresh(),
  });
  scope.defer(() => overlays.dispose());
  const walkPath = createWalkPath({
    core,
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
  const orion = createOrionLayer({
    core,
    state: overlays.state("orion"),
    refreshCallouts: () => callouts.refresh(),
    refreshTree: () => treeState.orionChanged(),
    drawn: () => stage.orionDrawn(),
    // The dot's OEM, on this thread (orionTrack.ts).
    loadTrack: (f) => loadOrionTrack(f, frameData.manifest(), signal),
  });
  scope.defer(() => orion.dispose());

  // ------------------------------------------------------------ the camera
  const cameraViews = createCameraViews({
    core,
    local: () => stage.local(),
    orionBuilt: () => orion.built(),
    orionNodeId: () => orion.info()?.info.node.id,
    rigidBuilt: () => overlays.rigidBuilt(),
    engineering: () => overlays.engineering(),
    skyAzimuth: (instant) => skyRay.azimuth(instant),
  });
  scope.defer(() => cameraViews.dispose());
  // The pivot marker while the orbit is dragged (HUD); a drag or wheel of
  // the orbit ends a flight, as a grab of the globe does.
  const cameraRig = createCameraRig({ core, hud, views: cameraViews });
  scope.defer(() => cameraRig.dispose());

  // ------------------------------------------------------------- scenarios
  const stage = createStage({
    core,
    overlays,
    orion,
    sceneView: (sc, knobs) => cameraViews.sceneView(sc, knobs),
    show: (v, seconds) => cameraRig.show(v, seconds),
    catalog: {
      results: () => catalogRuns.results(),
      run: (ids) => catalogRuns.run(ids),
    },
    rebuildTree: () => treeState.rebuild(),
    refreshTriads: () => triads.refresh(),
    refreshCallouts: () => callouts.refresh(),
    globeChanged: () => {
      sightLines.globeChanged();
      buoyWindow.globeChanged();
    },
    evaluation: () => host.state().evaluation,
  });
  scope.defer(() => stage.dispose());
  const callouts = createCallouts({
    core,
    labels,
    scene: () => stage.scene(),
    local: () => stage.local(),
    evaluation: () => evaluationNow(),
    stale: () => host.state().stale,
    orion,
    orionOverlay: overlays.state("orion"),
    lunarSiteOrigin: () => cameraViews.lunarSiteOrigin(),
    refreshTriads: () => triads.refresh(),
    leapSeconds: () => frames()?.data.leapSeconds,
    dragPoint: () => pointDrag.point(),
  });
  scope.defer(() => callouts.dispose());
  // The corridor's point, dragged on the globe: it sets the station and
  // offset knobs (the host re-evaluates once the burst ends).
  const pointDrag = createPointDrag({
    viewer,
    hud,
    evaluation: () =>
      stage.scene() !== undefined ? host.state().evaluation : undefined,
    knobs: () => host.state().spec.knobs,
    setKnobs: (k) => {
      host.setKnob("station", k.station);
      host.setKnob("offset", k.offset);
    },
    refreshCallouts: () => callouts.refresh(),
  });
  scope.defer(() => pointDrag.dispose());

  /** The current scenario's evaluation, if the host has one. */
  const evaluationNow = () => host.state().evaluation;

  let paramsGeneration = -1;
  let shownEvaluation: unknown;
  // The link: each asked-for setup, its time held while the clock plays.
  const link = createLinkWriter({
    setup: () => {
      const p = host.params();
      return JSON.stringify([p.scenario, p.knobs]);
    },
    playing: () => viewer.clock.mode === "playing",
    write: () =>
      context.setParams(formatParams({ ...view.get(), ...host.params() })),
  });
  // The scenario's lines of sight over the drawn terrain (Task 6b): traced
  // on demand, trailing the terrain's height changes.
  const sightLines = createSightLines({
    viewer,
    lines: () =>
      stage.scene() !== undefined
        ? host.state().evaluation?.sightLines
        : undefined,
    maskCheck: () =>
      stage.scene() !== undefined
        ? host.state().evaluation?.maskCheck
        : undefined,
    globeShown: () => stage.globeShown(),
    globeProblem: () => stage.globeProblem(),
    changed: () => invalidate(),
  });
  scope.defer(() => sightLines.dispose());
  // When the ship's mast sees the buoy along its whole track (Task 7):
  // traced on demand, its spans on the timeline and its moment in the knobs.
  const buoyWindow = createBuoyWindow({
    viewer,
    frames,
    scenario: () =>
      stage.scene() !== undefined ? host.state().spec.id : undefined,
    knobs: () => host.state().knobs,
    evaluation: () => host.state().evaluation,
    globeShown: () => stage.globeShown(),
    changed: () => {
      refreshMarks();
      invalidate();
    },
  });
  scope.defer(() => buoyWindow.dispose());
  /** The scenario's windows on the timeline: the evaluation's (the dish's behind the Moon) and the page's (the ship's buoy). */
  function refreshMarks(): void {
    const state = host.state();
    viewer.timeControls?.setMarks(
      [
        ...((stage.scene() !== undefined
          ? state.evaluation?.windows
          : undefined) ?? []),
        ...buoyWindow.windows(),
      ].map((w) => ({
        start: w.startUtc,
        end: w.endUtc,
        title: `${w.label}: ${new Date(w.startUtc).toISOString().slice(11, 19)} to ${new Date(w.endUtc).toISOString().slice(11, 19)} UTC`,
      })),
    );
  }
  const host = createScenarioHost({
    evaluate: (id, knobs, ms) => {
      const f = frames();
      if (!f) {
        return Promise.reject(new Error("frame data isn't in yet"));
      }
      return client.scenario(
        id,
        knobs,
        Instant.fromUtc(ms, f.data.leapSeconds).tdb(),
      );
    },
    // A scenario's own lines: engineering by default, a leader white, as
    // the rigid line's are (rigidOverlay.ts).
    drawOverlay: (id, g) =>
      globe.setOverlay(
        id,
        g.layers.map((l) => ({
          chunks: l.chunks,
          color:
            l.name === "leader"
              ? hexRgba("#ffffff")
              : familyRgba("engineering"),
        })),
      ),
    removeOverlay: (id) => globe.removeOverlay(id),
    enter: (spec, knobs) => stage.enter(spec.id, knobs),
    update: (_spec, knobs) => stage.update(knobs),
    leave: () => stage.leave(),
    reframe: () => stage.reframe(),
    setClock: (ms) => {
      viewer.clock.time = ms;
      viewer.clock.mode = "paused";
    },
    clock: () => viewer.clock.time,
    changed: (state) => {
      if (state.evaluation !== shownEvaluation) {
        // New frames attach in the tree (its values update in place when
        // the frames are the same); the callouts take the answer.
        shownEvaluation = state.evaluation;
        treeState.evaluationChanged();
        callouts.refresh();
        sightLines.evaluationChanged();
        stage.evaluationChanged();
        buoyWindow.evaluationChanged();
        refreshMarks();
      }
      if (state.generation !== paramsGeneration) {
        // The link follows each asked-for setup, not every clock frame.
        paramsGeneration = state.generation;
        link.asked();
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
  scope.defer(viewer.clock.events.on("change", () => link.clockChanged()));

  // ------------------------------------------------------ the runs (R13)
  /** Every run, catalog or "Try your own", one at a time (final review, Important 1). */
  const runs = new RunQueue();
  const catalogRuns = createCatalogRuns({
    core,
    runs,
    updateKnown: () => selection.updateKnown(),
    ran: () => {
      if (overlays.state("roundTrip").on) {
        overlays.draw("roundTrip");
      }
    },
  });
  scope.defer(() => catalogRuns.dispose());
  const user = createUserCrs({
    core,
    runs,
    token,
    imodel: initial.imodel,
    camera: cameraRig,
    updateKnown: () => selection.updateKnown(),
  });
  const pageReport = createPageReport({
    loading,
    manifest: () => frameData.manifest(),
    lastRun: () => catalogRuns.lastRun(),
    results: () => [...catalogRuns.results(), ...user.results()],
    token,
  });
  scope.defer(() => pageReport.dispose());

  // ------------------------------------------- the selection and the panel
  const selection = createGlobeSelection({
    core,
    setParams: (next) => context.setParams(next),
    scenarioParams: () => host.params(),
    tree: treeState,
    catalog: catalogRuns,
    userResults: () => user.results(),
    evaluation: () => evaluationNow(),
    overlays,
    views: cameraViews,
    show: (v) => cameraRig.show(v),
    stage,
    refreshTriads: () => triads.refresh(),
    startWalk: (id) => walkPath.start(id),
    refreshCallouts: () => callouts.refresh(),
  });
  scope.defer(() => selection.dispose());
  const panelModel = createPanelModel({
    core,
    token,
    tree: treeState,
    overlays,
    orionFrame: () => orion.frame(),
    catalog: catalogRuns,
    user,
    scenario: () => {
      const f = frames();
      const instant = instantNow();
      return scenarioView({
        st: host.state(),
        results: catalogRuns.results(),
        tree: treeState.tree(),
        playing: viewer.clock.mode === "playing",
        rate: viewer.clock.rate,
        ...(instant && f && { eop: clockView(f, instant).eop }),
        // Not while the scene draws nothing (the BIM site's CRS outside its
        // area of use): its note is about what is drawn.
        ...(stage.scene()?.note !== undefined &&
          (stage.scene()?.engineering === undefined ||
            overlays.engineering().outside === undefined) && {
            sceneNote: stage.scene()!.note!,
          }),
        ...(stage.scene() !== undefined &&
          sightLines.view() !== undefined && { terrain: sightLines.view()! }),
        ...(buoyWindow.presets() !== undefined && {
          pagePresets: buoyWindow.presets()!,
        }),
        scrub,
      });
    },
    sceneLegend: () =>
      stage.scene() !== undefined ? host.state().evaluation?.legend : undefined,
    environment: () => pageReport.lines(),
    notice: () => selection.notice(),
  });
  scope.defer(() => panelModel.dispose());
  const { actions, dispose: disposeActions } = createPanelActions({
    core,
    link: (next) => context.link(next),
    catalog: catalogRuns,
    reloadFrames: () => void frameData.load(),
    overlays,
    orion,
    views: cameraViews,
    show: (v) => cameraRig.show(v),
    selection,
    user,
    report: pageReport,
    host,
  });
  scope.defer(disposeActions);

  // "Try your own"'s asset goes with the example.
  scope.defer(() => user.dispose());

  // ------------------------------------------------------------- startup
  // The line of sight up from the scene's site, every frame (Task 6b).
  const skyRay = createSkyRay({
    globe,
    frames,
    scene: () => stage.scene(),
    knobs: () => stage.knobs(),
    orionTrack: () => orion.track(),
    masks: () =>
      stage.scene() !== undefined
        ? host.state().evaluation?.horizonMasks
        : undefined,
    labels,
    refreshLabels: () => triads.refresh(),
    camera: () => {
      const c = viewer.view.camera;
      const h = viewer.container.clientHeight;
      if (h <= 0) {
        return undefined;
      }
      const k = (2 * Math.tan(c.fov / 2)) / h;
      return {
        position: c.position,
        pixelAt: (p) =>
          Math.hypot(
            p[0]! - c.position[0]!,
            p[1]! - c.position[1]!,
            p[2]! - c.position[2]!,
          ) * k,
      };
    },
  });
  scope.defer(() => skyRay.dispose());
  // The drone's and the ship's lines, every frame (Task 7).
  const bodyLines = createBodyLines({
    globe,
    frames,
    scene: () => stage.scene(),
    local: () => stage.local(),
    evaluation: () =>
      stage.scene() !== undefined ? host.state().evaluation : undefined,
    traces: () => sightLines.view(),
    orionTrack: () => orion.track(),
    labels,
    refreshLabels: () => triads.refresh(),
    camera: () => {
      const c = viewer.view.camera;
      const h = viewer.container.clientHeight;
      if (h <= 0) {
        return undefined;
      }
      const k = (2 * Math.tan(c.fov / 2)) / h;
      return {
        position: c.position,
        pixelAt: (p) =>
          Math.hypot(
            p[0]! - c.position[0]!,
            p[1]! - c.position[1]!,
            p[2]! - c.position[2]!,
          ) * k,
      };
    },
  });
  scope.defer(() => bodyLines.dispose());
  const frameLoop = createFrameLoop({
    core,
    refreshTree: () => treeState.refresh(),
    orion,
    callouts,
    overlays: {
      updateMinorGrid: () => overlays.updateMinorGrid(),
      biasOn: () => overlays.state("bias").on,
      biasAt: () => overlays.biasAt(),
      drawBias: () => overlays.draw("bias"),
    },
    followOrbit: () => cameraRig.follow(),
    sceneTick: () => {
      stage.tick();
      pointDrag.tick();
      skyRay.place();
      bodyLines.place();
    },
    walk: walkPath,
  });
  scope.defer(() => frameLoop.dispose());

  // The clock opens at the flyby, paused (DESIGN.md "The opening shot");
  // the panel and the time controls show the same instant (I13).
  viewer.clock.time = FLYBY;
  viewer.clock.mode = "paused";
  scope.defer(viewer.clock.events.on("change", () => invalidate()));
  // The times the panel prints, after the scenario host has taken the
  // clock's (its listener is registered above).
  const timeSource = createTimeSource({
    clock: () => viewer.clock.time,
    epoch: () => host.params().time,
    disposed: () => disposed,
  });
  scope.defer(() => timeSource.dispose());
  scope.defer(viewer.clock.events.on("change", () => timeSource.changed()));
  viewer.controller.maximumHeight = 2e9;
  viewer.view.camera.near = 0.1;
  viewer.controller.focus(
    Float64Array.from(OPENING.center),
    OPENING.heading,
    OPENING.pitch,
    OPENING.range,
  );

  scope.defer(view.subscribe(() => selection.onView()));
  const deepLinks = createDeepLinks({
    watchParams: (callback) => context.watchParams(callback),
    view,
    host,
    treeIds: () => (treeState.tree() ? treeState.ids() : undefined),
    ready: () => frames() !== undefined,
  });
  scope.defer(() => deepLinks.dispose());
  // Keep this after every `create…`: its `ready` callback uses `frameLoop`,
  // `host` and `selection`, and called earlier it throws a temporal-dead-zone error.
  void frameData.load();

  const tab = initialTab(params, initial);
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
      time: timeSource.source,
      ...(tab && { initialTab: tab }),
    }),
  };
}
