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
import type { Frames } from "../../src/frames/frames.ts";
import { earthOrientationSigma } from "../../src/measure/accuracy.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import { RESULT_LABELS, comparedFor, groupRunIds } from "./content.ts";
import { createScenarioHost } from "./scenarioHost.ts";
import { createCallouts } from "./callouts.ts";
import { createStage } from "./scenarios/stage.ts";
import { createCameraRig } from "./cameraRig.ts";
import {
  OPENING,
  createCameraViews,
  framingAt,
  surface,
  type CameraView,
} from "./cameraViews.ts";
import { createOrionLayer } from "./orionLayer.ts";
import { createOverlayControl } from "./overlayControl.ts";
import { createTreeState } from "./treeState.ts";
import { createTriadLayer, type LabelBoard } from "./triadLayer.ts";
import { createWalkPath } from "./walkPath.ts";
import { createCatalogRuns } from "./catalogRuns.ts";
import { createFrameData } from "./frameData.ts";
import { createPageReport } from "./pageReport.ts";
import { createUserCrs } from "./userCrs.ts";
import { CONVERGENCE_FACTOR, DISTORTION } from "./overlayConfig.ts";
import { FLYBY, createModelSource, deg, isFrame, meters } from "./page.ts";
import { routeSteps } from "./panel/routeSteps.ts";
import { proofRows, type ProofRow } from "./scenarios/proof.ts";
import { READY, SCENES } from "./scenarios/scenes.ts";
import { checkedState, type ScenarioId } from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";
import { Globe, familyRgba } from "./globe.ts";
import { LoadingModel } from "./loading.ts";
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
import { frameTarget } from "./orbit.ts";
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
    local: () => stage.local(),
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
    local: () => stage.local(),
    on: () => overlays.state("triads").on,
    scene: () => stage.scene(),
    sceneKnobs: () => stage.knobs(),
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
    refreshCallouts: () => callouts.refresh(),
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
    refreshCallouts: () => callouts.refresh(),
    rebuildTree: () => treeState.rebuild(),
    drawn: () => stage.orionDrawn(),
  });
  scope.defer(() => orion.dispose());

  // --------------------------------------------------------------- camera
  const cameraViews = createCameraViews({
    core: { viewer, frames: () => frames, instantNow },
    local: () => stage.local(),
    orionBuilt: () => orion.built(),
    orionNodeId: () => orion.info()?.info.node.id,
    rigidBuilt: () => overlays.rigidBuilt(),
  });
  scope.defer(() => cameraViews.dispose());

  /** Frame content (F): the selected frame or result, else the scenario's view, else the opening view. */
  function frameContent(): void {
    const t = frameTarget(stage.scene()?.id, view.get().selection);
    if (t.kind === "scenario") {
      stage.flyToScene();
      return;
    }
    const v =
      t.kind === "frame"
        ? cameraViews.frameView(t.id)
        : t.kind === "result"
          ? resultFraming(t.id).view
          : { framing: OPENING };
    if (v) {
      cameraRig.show(v);
    }
  }

  // The pivot marker while the orbit is dragged (HUD); a drag or wheel of
  // the orbit ends a flight, as a grab of the globe does.
  const cameraRig = createCameraRig({
    core: { viewer, globe, disposed: () => disposed },
    hud,
    views: cameraViews,
  });
  scope.defer(() => cameraRig.dispose());

  /** Where a result's group points: its overlay's framing, its site, or its frames. */
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
      return { view: cameraViews.lunarSiteView(), engineering: false };
    }
    if (g.id === "space" || g.id === "trajectory") {
      return {
        view: cameraViews.earthMoonView(),
        overlay: "orion",
        engineering: false,
      };
    }
    if (overlay === "designGrid") {
      return {
        view: surface(cameraViews.framing("designGrid")),
        overlay,
        engineering,
      };
    }
    if (overlay === "rigidVsExact") {
      return {
        view: surface(cameraViews.framing("rigidVsExact")),
        overlay,
        engineering,
      };
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
      return { view: surface(cameraViews.framing("site")), engineering };
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
    } else if (s.kind === "result" && stage.scene() === undefined) {
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
    callouts.refresh();
    if (s.kind === "none") {
      globe.emphasize(undefined);
      globe.dimGround(stage.exposure());
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
      cameraRig.show(where.view);
    }
  }

  // ------------------------------------------------------------ scenarios
  const stage = createStage({
    core: { viewer, globe, frames: () => frames, disposed: () => disposed },
    overlays,
    orion,
    sceneView: (sc) => cameraViews.sceneView(sc),
    show: (v, seconds) => cameraRig.show(v, seconds),
    catalog: {
      results: () => catalogRuns.results(),
      run: (ids) => catalogRuns.run(ids),
    },
    rebuildTree: () => treeState.rebuild(),
    refreshTriads: () => triads.refresh(),
    refreshCallouts: () => callouts.refresh(),
  });
  scope.defer(() => stage.dispose());
  const callouts = createCallouts({
    core: { globe, view },
    labels,
    scene: () => stage.scene(),
    local: () => stage.local(),
    evaluation: () => evaluationNow(),
    stale: () => host.state().stale,
    orion,
    orionOverlay: overlays.state("orion"),
    lunarSiteOrigin: () => cameraViews.lunarSiteOrigin(),
    refreshTriads: () => triads.refresh(),
  });
  scope.defer(() => callouts.dispose());

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
    enter: (spec, knobs) => stage.enter(spec.id, knobs),
    update: (_spec, knobs) => stage.update(knobs),
    leave: () => stage.leave(),
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
        callouts.refresh();
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
        ...(stage.scene()?.note !== undefined && {
          note: stage.scene()!.note!,
        }),
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
      ask: () => cameraRig.ask(),
      frameIfStill: (asked, zoom) => cameraRig.frameIfStill(asked, zoom),
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
      cameraRig.show({ framing: framingAt(d[0], d[1], d[2], 0, -60 * deg) });
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
          ? cameraViews.frameView(target.frame)
          : resultFraming(target.result).view;
      if (v) {
        cameraRig.show(v);
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
        if (callouts.orionNowChanged()) {
          callouts.refresh();
        }
        overlays.updateMinorGrid();
        cameraRig.follow();
        // The headlight follows the camera through the stop's flight.
        stage.tick();
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
