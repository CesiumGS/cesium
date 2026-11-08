// The design globe's measure tool (plan 4b Task 19; DESIGN.md "The story"):
// two points on a model, snapped as the snap mode says, measured through the
// library's `measure` between their design points, and drawn on the globe
// in whichever placement is drawn, morphing with it; and the measurements
// the page opens with.
//
// What a measurement says, in both placements:
//   - the design distance (design units, what CAD reports) and the true
//     distance (metres, between where the design points truly are), side by
//     side: from the design, so the same whichever placement is drawn;
//   - "on the globe": the straight line between the two points as they are
//     drawn now, which is the true distance when the drawing is true
//     (reprojected) and isn't when it isn't (rigid).
//
// The parts, each its own module:
//   - measureState.ts: the points, the two-click state machine, the snap
//     mode's choice of service and the deep link;
//   - measureOpeners.ts: the openers, their figures and Details;
//   - measureShown.ts: what is shown, for the checks;
//   - measureView.ts: the panel's strings;
//   - measureLabels.ts: the labels over the globe;
//   - measureOverlay.ts: the lines on the globe;
//   - measureFrames.ts: the frame data `measure` needs, and `measure`;
//   - here, the runtime (`createMeasureTool`): the frame data and `measure`,
//     the snap services, pointer and keyboard input (one AbortController per
//     pointer event, the previous aborted; each snap judged by the site it
//     hit, as cursor.ts judges picks), the link and the morph target.
import type { Alignment } from "../../src/engineering/alignment.ts";
import {
  designPoint,
  type DesignPoint,
  type EngineeringFrame,
} from "../../src/engineering/EngineeringFrame.ts";
import {
  ClientSnapService,
  type SnapResult,
  type SnapService,
} from "../../src/engineering/snap.ts";
import type { Measurement } from "../../src/measure/measure.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Answers } from "./answers.ts";
import type { ShownValues } from "./checks.ts";
import { hitRefusal, type PagePick, type PickState } from "./cursor.ts";
import { sectionSurface } from "./corridor.ts";
import { ExactSnapService, visibleRise } from "./exactSnap.ts";
import { createMeasureFrames } from "./measureFrames.ts";
import { measurementModel, type MeasureView } from "./measureModel.ts";
import { liveStore, placeLabels, type MeasureLive } from "./measureLabels.ts";
import {
  dist,
  drawnAt,
  openerDetails,
  openingMeasurements,
  type DrawState,
  type DrawnEnd,
  type Opener,
  type OpenerId,
} from "./measureOpeners.ts";
import { MeasureOverlay, measureLines } from "./measureOverlay.ts";
import { shownOf, shownValues } from "./measureShown.ts";
import {
  formatMeasureLink,
  nextMeasure,
  parseMeasureLink,
  snapWith,
  type MeasureEnd,
  type MeasureInput,
  type MeasureState,
  type SnapDeps,
} from "./measureState.ts";
import {
  measurePanel,
  userResult,
  type MeasurePanel,
  type Measured,
} from "./measureView.ts";
import type { MorphTarget } from "./morphDriver.ts";
import type { LoadEvent, SnapMode } from "./page.ts";
import type { SiteRuntime } from "./siteLoader.ts";

/** How far from the cursor a snap may land, CSS pixels. */
export const APERTURE = 12;
/** A click: the pointer moved less than this between down and up, CSS pixels. */
const CLICK_SLOP = 5;

export interface MeasureToolDeps {
  readonly viewer: Viewer;
  readonly signal: AbortSignal;
  sites(): Iterable<SiteRuntime>;
  site(id: string): SiteRuntime | undefined;
  /** The corridor's alignment (the exact snap's). */
  readonly alignment: Alignment;
  answers(): Answers | undefined;
  /** As the cursor judges a pick (cursor.ts). */
  pickState(): PickState;
  pickAt(x: number, y: number): Promise<PagePick>;
  snapMode(): SnapMode;
  /** The morph now (the openers' figures, the overlay). */
  drawState(): DrawState & { readonly ghost: boolean };
  /** The link's measure parameters changed. */
  setLink(params: ReturnType<typeof formatMeasureLink>): void;
  /** The panel's view changed. */
  changed(): void;
  /** Something on the globe changed: draw a frame and run the frame loop. */
  wake(): void;
  /** Loading items (the frame data `measure` needs). */
  report(event: LoadEvent): void;
  disposed(): boolean;
}

export interface MeasureTool {
  view(): MeasurePanel;
  readonly live: {
    get(): MeasureLive;
    subscribe(listener: () => void): () => void;
  };
  /** Draws the openers and the user's line in both placements. */
  readonly target: MorphTarget;
  /** Places the labels (each frame the camera or the morph moves). */
  place(): void;
  /** The corridor's placements are in (or changed): the openers and exact snapping. */
  placementsChanged(): void;
  /** The answers are in. */
  answersChanged(): void;
  /** A point at the view's centre (keyboard). */
  pointAtCentre(): void;
  clear(): void;
  /** A link's measurement (deep link, back or forward). */
  applyLink(params: Readonly<Record<string, string | undefined>>): void;
  /** Loads the frame data again after a failure. */
  retry(): void;
  /** What the measure section shows, for the checks (Task 20). */
  shownValues(): ShownValues | undefined;
  /** Where to look at an opener: its middle as drawn, and its length. */
  openerFocus(
    id: OpenerId,
  ): { center: Float64Array; length: number } | undefined;
  dispose(): void;
}

/** A snap result for a measured end, for `measurementModel`. */
function asSnap(end: MeasureEnd, point: DesignPoint): SnapResult {
  return {
    snapPoint: end.reprojected,
    hitPoint: end.reprojected,
    distance: 0,
    kind: end.kind ?? "point",
    design: point,
    tolerance: end.tolerance,
    exact: end.how === "exact" || end.how === "link",
    source: end.how === "exact" ? "server" : "client",
    provisional: false,
  };
}

export function createMeasureTool(deps: MeasureToolDeps): MeasureTool {
  const { viewer, signal } = deps;
  let state: MeasureState = { phase: "empty" };
  let instruction: string | undefined;
  let refused = false;
  let busy = false;
  /** The user's measurement through `measure`, once both ends are in. */
  let measured: Measured | undefined;
  let openers: Opener[] = [];
  let openerViews = new Map<OpenerId, MeasureView>();
  let openerMeasures = new Map<OpenerId, Measurement>();
  let markDesign: Float64Array | undefined;
  let hover: MeasureLive["hover"];
  let crosshair = false;

  const live = liveStore<MeasureLive>({
    pills: [],
    dots: [],
    crosshair: false,
    figures: {},
  });
  const overlay = new MeasureOverlay(viewer.world);

  // ------------------------------------------------------ frame data
  const frames = createMeasureFrames({
    viewer,
    report: deps.report,
    disposed: deps.disposed,
    loaded: () => remeasure(),
    failed: () => deps.changed(),
  });
  const measureDesign = frames.measure;

  // --------------------------------------------------- the placements
  const corridor = () => deps.site("corridor");
  let client:
    { tilesets: readonly Tileset3D[]; service: ClientSnapService } | undefined;
  const exact = new Map<Tileset3D, ExactSnapService>();

  function pickable(): Tileset3D[] {
    return [...deps.sites()].flatMap((s) =>
      [s.rigid, s.reprojected].filter((t): t is Tileset3D => t !== undefined),
    );
  }
  function clientService(): ClientSnapService {
    const tilesets = pickable();
    if (
      client === undefined ||
      client.tilesets.length !== tilesets.length ||
      client.tilesets.some((t, i) => t !== tilesets[i])
    ) {
      client = { tilesets, service: new ClientSnapService(tilesets) };
    }
    return client.service;
  }
  /** One `ExactSnapService` per corridor tileset, routed by the request's. */
  const server: SnapService = {
    snap: (request, abort) =>
      exact.get(request.tileset)?.snap(request, abort) ??
      Promise.resolve(undefined),
  };

  function siteOf(tileset: Tileset3D | undefined): SiteRuntime | undefined {
    if (tileset === undefined) {
      return undefined;
    }
    return [...deps.sites()].find(
      (s) => s.rigid === tileset || s.reprojected === tileset,
    );
  }

  /** Where each placement of `site` draws `design` (a one-tileset site: rigid in both). */
  function drawnEnd(
    site: SiteRuntime,
    design: ArrayLike<number>,
  ): DrawnEnd | undefined {
    const rigid = site.rigidPlacement ?? site.reprojectedPlacement;
    if (rigid === undefined) {
      return undefined;
    }
    const r = rigid.displayed(design);
    const p =
      site.pair !== undefined && site.reprojectedPlacement !== undefined
        ? site.reprojectedPlacement.displayed(design)
        : r;
    return { rigid: r, reprojected: p };
  }
  const frameOf = (site: SiteRuntime): EngineeringFrame | undefined =>
    (site.reprojectedPlacement ?? site.rigidPlacement)?.frame;

  // ---------------------------------------------------------- openers
  function buildOpeners(): void {
    const a = deps.answers();
    const site = corridor();
    const rigid = site?.rigidPlacement;
    const reprojected = site?.reprojectedPlacement;
    if (a === undefined || rigid === undefined || reprojected === undefined) {
      return;
    }
    // Marked on the visible top: the barrier's over the profile grade line.
    openers = openingMeasurements(
      a,
      { rigid, reprojected },
      (offset) => visibleRise(offset) - sectionSurface(offset),
    );
    // PROJ's zone 3 for the mark, from NGS's published position.
    markDesign = reprojected.designOf(Float64Array.from(a.mark.bodyFixed));
    openerViews = new Map();
    remeasure();
    redraw();
  }

  /** The openers' and the user's `measure` (again once the frame data is in). */
  function remeasure(): void {
    const a = deps.answers();
    const frame = corridor()?.reprojectedPlacement?.frame;
    if (a !== undefined && frame !== undefined && frames.loaded()) {
      const views = new Map<OpenerId, MeasureView>();
      const measures = new Map<OpenerId, Measurement>();
      const exactEnd = (design: ArrayLike<number>): MeasureEnd => ({
        site: "corridor",
        design: Float64Array.from(design),
        rigid: Float64Array.from(design),
        reprojected: Float64Array.from(design),
        how: "exact",
        kind: "point",
        tolerance: 0,
      });
      const pairs: [OpenerId, ArrayLike<number>, ArrayLike<number>][] = [
        ["mark", a.mark.design, a.mark.nearestDesign],
      ];
      const first = a.pairs[0];
      if (first !== undefined) {
        pairs.push([
          "pair",
          a.points[first.from]!.design,
          a.points[first.to]!.design,
        ]);
      }
      for (const [id, da, db] of pairs) {
        const pa = designPoint(frame, da);
        const pb = designPoint(frame, db);
        const m = measureDesign(frame, pa, pb);
        if (m !== undefined) {
          measures.set(id, m);
          views.set(
            id,
            measurementModel(
              asSnap(exactEnd(da), pa),
              asSnap(exactEnd(db), pb),
              m,
            ),
          );
        }
      }
      openerViews = views;
      openerMeasures = measures;
    }
    measureUser();
    deps.changed();
  }

  function measureUser(): void {
    if (state.phase !== "done") {
      measured = undefined;
      return;
    }
    if (measured?.state === state) {
      return;
    }
    const site = deps.site(state.a.site);
    const frame = site && frameOf(site);
    if (frame === undefined) {
      measured = undefined;
      return;
    }
    const point = (end: MeasureEnd) =>
      designPoint(
        frame,
        end.design,
        end.how === "link"
          ? undefined
          : end.how === "pick"
            ? { how: "pick", tolerance: end.tolerance }
            : {
                how: "snap",
                tolerance: end.tolerance,
                ...(end.kind !== undefined && { kind: end.kind }),
              },
      );
    const pa = point(state.a);
    const pb = point(state.b);
    const m = measureDesign(frame, pa, pb);
    measured =
      m === undefined
        ? undefined
        : {
            state,
            m,
            view: measurementModel(asSnap(state.a, pa), asSnap(state.b, pb), m),
          };
  }

  // -------------------------------------------------------- the globe
  function redraw(): void {
    overlay.set(measureLines(openers, deps.answers(), state));
    overlay.setState(deps.drawState());
    deps.wake();
    place();
  }

  // ------------------------------------------------------ the labels
  function place(): void {
    if (deps.disposed()) {
      return;
    }
    const r = canvas.getBoundingClientRect();
    const next = placeLabels({
      view: viewer.view,
      width: r.width,
      height: r.height,
      answers: deps.answers(),
      draw: deps.drawState(),
      openers,
      state,
      userText:
        measured !== undefined
          ? `${measured.view.designDistance} design`
          : "Measuring…",
      hover,
      crosshair,
    });
    if (JSON.stringify(next) !== JSON.stringify(live.get())) {
      live.set(next);
    }
  }

  // -------------------------------------------------------- the input
  let hoverAbort: AbortController | undefined;
  let hoverBusy = false;
  let hoverNext: [number, number] | undefined;
  let clickAbort: AbortController | undefined;

  const snapDeps = (): SnapDeps => ({
    client: clientService(),
    server,
    pick: async (x, y) => {
      const { hit } = await deps.pickAt(x, y);
      if (hit === undefined) {
        return undefined;
      }
      return {
        snapPoint: hit.position,
        hitPoint: hit.position,
        distance: 0,
        kind: "surface",
        ...(hit.design !== undefined && { design: hit.design }),
        tolerance: hit.tolerance,
        exact: false,
        ...(hit.tileset !== undefined && { tileset: hit.tileset }),
        source: "client",
        provisional: false,
      };
    },
  });

  /** A snap as a measured end, or why it isn't one. */
  function toEnd(result: SnapResult | undefined): MeasureEnd | string {
    if (result === undefined) {
      return "Nothing to measure there: point at a model.";
    }
    const site = siteOf(result.tileset);
    if (site === undefined) {
      return "No design model there: the ghost and the ground aren't measurable.";
    }
    const judged = hitRefusal(site, result.tileset, deps.pickState());
    if (judged.refused !== undefined) {
      return judged.refused;
    }
    const placement = result.tileset?.placement;
    if (result.design === undefined || placement === undefined) {
      return "This site's frame is still loading: no design coordinates yet.";
    }
    const design = Float64Array.from(result.design.design);
    const shownDesign =
      result.shownPoint !== undefined
        ? placement.designOf(result.shownPoint)
        : undefined;
    const drawn = drawnEnd(site, shownDesign ?? design);
    if (drawn === undefined) {
      return "This site's frame is still loading: no design coordinates yet.";
    }
    const mode = deps.snapMode();
    return {
      site: site.entry.id,
      design,
      ...drawn,
      how:
        result.source === "server" && result.exact
          ? "exact"
          : mode === "none"
            ? "pick"
            : "geometry",
      kind: result.kind,
      tolerance: result.tolerance,
      ...(shownDesign !== undefined && { shownAbove: true }),
    };
  }

  function apply(input: MeasureInput): void {
    const next = nextMeasure(state, input);
    if (input.type === "point" && next === state) {
      instruction = "Both points go on one model: this one is another site's.";
      refused = true;
      deps.changed();
      return;
    }
    state = next;
    instruction = undefined;
    refused = false;
    measureUser();
    deps.setLink(formatMeasureLink(state));
    redraw();
    deps.changed();
  }

  /** A point where the user clicked (or the view's centre). */
  function pointAt(x: number, y: number): void {
    clickAbort?.abort();
    const ctl = new AbortController();
    clickAbort = ctl;
    const camera = viewer.view.camera.version;
    const before = deps.pickState();
    busy = true;
    deps.changed();
    void snapWith(
      deps.snapMode(),
      { view: viewer.view, x, y, aperture: APERTURE },
      snapDeps(),
      () => {},
      ctl.signal,
    )
      .then((result) => {
        if (ctl.signal.aborted || deps.disposed()) {
          return;
        }
        const now = deps.pickState();
        // Stale: the camera or the morph moved while it ran.
        if (
          camera !== viewer.view.camera.version ||
          now.t !== before.t ||
          now.exaggeration !== before.exaggeration
        ) {
          instruction = "The view moved while snapping: click again.";
          refused = true;
          return;
        }
        const end = toEnd(result);
        if (typeof end === "string") {
          instruction = end;
          refused = true;
          return;
        }
        apply({ type: "point", end });
      })
      .catch(() => {
        instruction = "That snap failed: click again.";
        refused = true;
      })
      .finally(() => {
        if (clickAbort === ctl) {
          clickAbort = undefined;
          busy = false;
          deps.changed();
        }
      });
  }

  function hoverAt(x: number, y: number): void {
    if (deps.snapMode() === "none") {
      setHover(undefined);
      return;
    }
    hoverNext = [x, y];
    if (hoverBusy) {
      return;
    }
    const [hx, hy] = hoverNext;
    hoverNext = undefined;
    hoverAbort?.abort();
    const ctl = new AbortController();
    hoverAbort = ctl;
    hoverBusy = true;
    const camera = viewer.view.camera.version;
    const show = (result: SnapResult) => {
      if (ctl.signal.aborted || camera !== viewer.view.camera.version) {
        return;
      }
      const site = siteOf(result.tileset);
      if (
        site === undefined ||
        hitRefusal(site, result.tileset, deps.pickState()).refused !==
          undefined ||
        result.design === undefined
      ) {
        setHover(undefined);
        return;
      }
      const px = viewer.view.toPixel(result.shownPoint ?? result.snapPoint);
      setHover(
        px === undefined
          ? undefined
          : { x: px[0]!, y: px[1]!, kind: result.kind, exact: result.exact },
      );
    };
    void snapWith(
      deps.snapMode(),
      { view: viewer.view, x: hx, y: hy, aperture: APERTURE },
      snapDeps(),
      show,
      ctl.signal,
    )
      .then((r) => {
        if (r === undefined && !ctl.signal.aborted) {
          setHover(undefined);
        }
      })
      .catch(() => setHover(undefined))
      .finally(() => {
        hoverBusy = false;
        if (hoverNext !== undefined && !deps.disposed()) {
          hoverAt(...hoverNext);
        }
      });
  }

  function setHover(next: MeasureLive["hover"]): void {
    if (JSON.stringify(next) === JSON.stringify(hover)) {
      return;
    }
    hover = next;
    place();
  }

  const canvas = viewer.canvas;
  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  let down: { x: number; y: number; id: number } | undefined;
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button === 0) {
        down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      const d = down;
      down = undefined;
      if (
        d !== undefined &&
        d.id === e.pointerId &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) < CLICK_SLOP
      ) {
        pointAt(...local(e));
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.buttons === 0) {
        hoverAt(...local(e));
      } else {
        setHover(undefined);
      }
    },
    { signal },
  );
  canvas.addEventListener("pointerleave", () => setHover(undefined), {
    signal,
  });
  // Keyboard: the canvas takes focus; Enter places a point at the centre
  // (the crosshair marks it), Escape clears.
  const priorTabIndex = canvas.getAttribute("tabindex");
  if (priorTabIndex === null) {
    canvas.tabIndex = 0;
  }
  canvas.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pointAtCentre();
      } else if (e.key === "Escape") {
        clear();
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "focus",
    () => {
      crosshair = canvas.matches(":focus-visible");
      place();
    },
    { signal },
  );
  canvas.addEventListener(
    "blur",
    () => {
      crosshair = false;
      place();
    },
    { signal },
  );

  function pointAtCentre(): void {
    const r = canvas.getBoundingClientRect();
    pointAt(r.width / 2, r.height / 2);
  }
  function clear(): void {
    clickAbort?.abort();
    apply({ type: "escape" });
  }

  // --------------------------------------------------------- the link
  let pendingLink: ReturnType<typeof parseMeasureLink> | undefined;
  function applyLink(
    params: Readonly<Record<string, string | undefined>>,
  ): void {
    const linked = parseMeasureLink(
      params,
      [...deps.sites()].map((s) => s.entry.id),
    );
    const current = formatMeasureLink(state);
    if (
      linked === undefined
        ? current.a === undefined
        : current.a === params.a && current.b === params.b
    ) {
      return;
    }
    pendingLink = linked;
    if (linked === undefined) {
      apply({ type: "escape" });
      return;
    }
    resolveLink();
  }
  /** A linked measurement once its site's placements are in. */
  function resolveLink(): void {
    const linked = pendingLink;
    const site = linked && deps.site(linked.site);
    if (linked === undefined || site === undefined) {
      return;
    }
    const a = drawnEnd(site, linked.a);
    const b = drawnEnd(site, linked.b);
    if (a === undefined || b === undefined) {
      return;
    }
    pendingLink = undefined;
    const end = (design: Float64Array, drawn: DrawnEnd): MeasureEnd => ({
      site: linked.site,
      design,
      ...drawn,
      how: "link",
      tolerance: 0,
    });
    state = { phase: "done", a: end(linked.a, a), b: end(linked.b, b) };
    measureUser();
    redraw();
    deps.changed();
  }

  // --------------------------------------------------------- the view
  function view(): MeasurePanel {
    const s = deps.drawState();
    const site = state.phase === "done" ? deps.site(state.a.site) : undefined;
    return measurePanel({
      answers: deps.answers(),
      draw: s,
      openers,
      details: (id, a) => openerDetails(id, a, openerViews, markDesign),
      snap: deps.snapMode(),
      state,
      instruction,
      refused,
      busy,
      result:
        state.phase === "done" && measured !== undefined
          ? userResult(
              measured,
              s,
              site?.pair !== undefined,
              site && frameOf(site),
            )
          : undefined,
      framesFailed: frames.failed(),
      framesLoaded: frames.loaded(),
    });
  }

  // ------------------------------------------------------- the target
  const target: MorphTarget = {
    setState(st) {
      overlay.setState(st);
    },
  };

  void frames.load();
  signal.addEventListener("abort", () => {
    hoverAbort?.abort();
    clickAbort?.abort();
  });

  return {
    view,
    live,
    target,
    place,
    placementsChanged() {
      exact.clear();
      const site = corridor();
      for (const t of [site?.rigid, site?.reprojected]) {
        if (t !== undefined && t.placement !== undefined) {
          exact.set(t, new ExactSnapService(t, deps.alignment));
        }
      }
      buildOpeners();
      resolveLink();
    },
    answersChanged() {
      buildOpeners();
    },
    pointAtCentre,
    clear,
    applyLink,
    retry: () => frames.retry(),
    shownValues() {
      const a = deps.answers();
      if (a === undefined) {
        return undefined;
      }
      const s = deps.drawState();
      const marker = openers.find((o) => o.id === "marker");
      const pair = openerMeasures.get("pair");
      const pairShown = pair && shownOf(pair);
      const settled = !s.morphing && s.exaggeration === 1;
      const done = state.phase === "done" ? state : undefined;
      const userShown =
        done !== undefined && measured?.state === done
          ? shownOf(measured.m)
          : undefined;
      return shownValues(a, {
        ...(pairShown !== undefined && { pair: pairShown }),
        ...(settled &&
          marker !== undefined && {
            marker: {
              separation: dist(
                drawnAt(marker.a, s.t, 1),
                drawnAt(marker.b, s.t, 1),
              ),
              mode: s.t >= 0.5 ? "reprojected" : "rigid",
            },
          }),
        ...(markDesign !== undefined && { mark: markDesign }),
        ...(done !== undefined && {
          user: {
            a: done.a,
            b: done.b,
            ...(userShown !== undefined && { measurement: userShown }),
          },
        }),
      });
    },
    openerFocus(id) {
      const o = openers.find((x) => x.id === id);
      if (o === undefined) {
        return undefined;
      }
      const s = deps.drawState();
      const pa = drawnAt(o.a, s.t, s.exaggeration);
      const pb = drawnAt(o.b, s.t, s.exaggeration);
      return {
        center: Float64Array.from([0, 1, 2].map((k) => (pa[k]! + pb[k]!) / 2)),
        length: dist(pa, pb),
      };
    },
    dispose() {
      live.dispose();
      overlay.dispose();
      if (priorTabIndex === null) {
        canvas.removeAttribute("tabindex");
      }
    },
  };
}
