// The cursor (plan 4b Task 18): design picks under the pointer (Task 15's
// `pickDesign`), one at a time, the latest position winning, and the HUD's
// readout from them: the rigid error there, the design coordinates in the
// CRS's own units and height system, the pick's tolerance.
//
// `pickAt` is the seam the measure tool (Task 19) takes, and it holds the
// rule (page.ts `designRefusal`): no design coordinates while the drawn
// geometry is between placements, while rigid is drawn exaggerated, or on a
// tileset whose placement isn't the one drawn there. A pick's answer is
// applied only if nothing changed while it ran (a generation counter: the
// camera, the cursor's position, the morph and the exaggeration).
import { gridFactors } from "../../src/engineering/factors.ts";
import { pickDesign, type DesignPick } from "../../src/engineering/pick.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import {
  compassNeedles,
  convergenceShort,
  convergenceText,
} from "./compass.ts";
import { fixed, unitSymbol } from "./measureModel.ts";
import { enuAt } from "./overlays.ts";
import {
  cursorReadout,
  designRefusal,
  errorText,
  type Placement,
} from "./page.ts";
import type { CompassView, CursorView } from "./panel/model.ts";
import type { SiteRuntime } from "./siteLoader.ts";

/**
 * The page's state a pick is judged by. The morph and the exaggeration are
 * global (the morph driver's): every paired site draws them, so a pick is
 * gated by the site it hits (`judgePick`), whatever site is selected.
 */
export interface PickState {
  /** The selected site's drawn placement (for the HUD's words). */
  readonly mode: Placement;
  /** The morph's `t`: which placement a paired site draws its own tiles in. */
  readonly t: number;
  /** A morph runs (the driver's, global). */
  readonly morphing: boolean;
  /** The exaggeration paired sites are drawn at (global). */
  readonly exaggeration: number;
  /** The selected site has both placements (the HUD's gate). */
  readonly selectedPaired: boolean;
}

export interface CursorDeps {
  readonly viewer: Viewer;
  readonly signal: AbortSignal;
  sites(): Iterable<SiteRuntime>;
  state(): PickState;
  /** The readout changed. */
  changed(): void;
  disposed(): boolean;
  /** The convergence compass toggle is on. */
  compass?(): boolean;
}

/** A pick as the page gives it: design coordinates only where honest. */
export interface PagePick {
  /** The pick; `design` is left out when `refused`. */
  readonly hit: DesignPick | undefined;
  readonly site: SiteRuntime | undefined;
  /** Why there are no design coordinates, when a design pick was refused. */
  readonly refused?: string;
  /** The placement drawn where it hit (a one-tileset site's is rigid). */
  readonly drawn?: Placement;
}

export interface Cursor {
  /** A design pick at CSS pixel (x, y) of the view, with the page's rule applied. */
  pickAt(x: number, y: number): Promise<PagePick>;
  /** The readout, again from the state (a morph or the exaggeration began or ended). */
  update(): void;
  /** The camera moved: what was under the cursor no longer is. */
  cameraMoved(): void;
  view(): CursorView;
}

/** The placement a site draws its own tiles in now. */
export function drawnPlacement(site: SiteRuntime, t: number): Placement {
  return site.pair === undefined || t < 0.5 ? "rigid" : "reprojected";
}

/**
 * The page's rule (`designRefusal`) for a hit on `tileset` of `site`: why
 * there are no design coordinates there, if there are none, and the
 * placement drawn there. Picks (`judgePick`) and the measure tool's snaps
 * (measureTool.ts) are both judged by it, by the site that was hit.
 */
export function hitRefusal(
  site: SiteRuntime,
  tileset: Tileset3D | undefined,
  state: PickState,
): { readonly refused?: string; readonly drawn: Placement } {
  const drawn = drawnPlacement(site, state.t);
  const drawnTileset = drawn === "rigid" ? site.rigid : site.reprojected;
  const refused = designRefusal({
    mode: drawn,
    morphing: site.pair !== undefined && state.morphing,
    exaggeration: site.pair !== undefined ? state.exaggeration : 1,
    hitIsDrawn: tileset === drawnTileset,
  });
  return refused === undefined ? { drawn } : { refused, drawn };
}

/** `pick` with the page's rule applied (`designRefusal`). */
export function judgePick(
  hit: DesignPick | undefined,
  site: SiteRuntime | undefined,
  state: PickState,
): PagePick {
  if (hit === undefined || site === undefined) {
    return { hit, site };
  }
  const { refused, drawn } = hitRefusal(site, hit.tileset, state);
  if (refused === undefined || hit.design === undefined) {
    return { hit, site, drawn };
  }
  const rest: DesignPick = { ...hit };
  delete (rest as { design?: unknown }).design;
  return { hit: rest, site, refused, drawn };
}

/** How long the compass's directions are taken, in pixels' footprints at the hit. */
const COMPASS_REACH_PX = 40;

/**
 * The compass at a design pick: PROJ's convergence at the design point, and
 * true north and grid north there as the view projects them. Undefined on a
 * site grid, where the projection has no convergence (a singular point), or
 * where the point is off screen.
 */
function compassAt(
  viewer: Viewer,
  hit: DesignPick,
  frame: Parameters<typeof gridFactors>[0],
  design: ArrayLike<number>,
): CompassView | undefined {
  // A site grid's north is turned from the CRS's by its own rotation: the
  // compass would show the CRS's grid north, not the design's, so it shows none.
  if (frame.definition.site !== undefined) {
    return undefined;
  }
  let convergence: number;
  try {
    convergence = gridFactors(frame, design).convergence;
  } catch {
    return undefined;
  }
  const p = hit.position;
  const { east, north } = enuAt(p);
  const reach = Math.max(hit.tolerance, 1e-3) * COMPASS_REACH_PX;
  const c = Math.cos(convergence);
  const s = Math.sin(convergence);
  const along = (dir: (k: number) => number) =>
    Float64Array.from([0, 1, 2], (k) => p[k]! + dir(k) * reach);
  const at = viewer.view.toPixel(p);
  const trueTip = viewer.view.toPixel(along((k) => north[k]!));
  const gridTip = viewer.view.toPixel(
    along((k) => c * north[k]! + s * east[k]!),
  );
  if (at === undefined) {
    return undefined;
  }
  const needles =
    trueTip !== undefined && gridTip !== undefined
      ? compassNeedles(at, trueTip, gridTip)
      : undefined;
  return {
    x: at[0]!,
    y: at[1]!,
    ...(needles && {
      trueNorth: needles.trueNorth,
      gridNorth: needles.gridNorth,
    }),
    text: convergenceText(convergence),
    short: convergenceShort(convergence),
  };
}

export function createCursor(deps: CursorDeps): Cursor {
  const { viewer } = deps;
  const st = deps.state;
  let cursor: CursorView = {
    text: cursorReadout({ ...st(), morphing: false, exaggeration: 1 }).text,
    muted: false,
  };
  let picking = false;
  /** The readout says why there are no design coordinates (moving, exaggerated). */
  let blocked = false;
  let pending: [number, number] | undefined;
  /** Bumped by anything that makes a pick in flight stale. */
  let generation = 0;

  const pickable = () =>
    [...deps.sites()].flatMap((s) =>
      [s.rigid, s.reprojected].filter((t): t is Tileset3D => t !== undefined),
    );

  async function pickAt(x: number, y: number): Promise<PagePick> {
    const hit = await pickDesign(viewer.view, x, y, pickable());
    const site = [...deps.sites()].find(
      (s) =>
        hit?.tileset !== undefined &&
        (s.rigid === hit.tileset || s.reprojected === hit.tileset),
    );
    return judgePick(hit, site, st());
  }

  function set(next: CursorView): void {
    cursor = next;
    deps.changed();
  }

  /** The readout with no pick: what pointing would show. */
  const idle = (mode: Placement): CursorView => ({
    text: cursorReadout({ mode, morphing: false, exaggeration: 1 }).text,
    muted: false,
  });

  function update(at?: [number, number]): void {
    // A new pointer position doesn't make a pick in flight stale: under
    // continuous motion its answer (a few pixels behind) still shows, and the
    // latest position is picked next.
    if (at !== undefined) {
      pending = at;
    }
    const s = st();
    // The HUD's words follow the selected site; picks are gated by the
    // site they hit (`judgePick`).
    const base = cursorReadout({
      mode: s.mode,
      morphing: s.selectedPaired && s.morphing,
      exaggeration: s.selectedPaired ? s.exaggeration : 1,
    });
    if (!base.design) {
      if (!blocked) {
        generation++;
      }
      blocked = true;
      set({ text: base.text, muted: true });
      return;
    }
    if (blocked) {
      // Settled again: the readout waits for the next pick.
      blocked = false;
      generation++;
      set(idle(s.mode));
    }
    if (picking || pending === undefined) {
      return;
    }
    const [x, y] = pending;
    pending = undefined;
    picking = true;
    const issued = generation;
    const camera = viewer.view.camera.version;
    void pickAt(x, y)
      .then(({ hit, site, refused, drawn }) => {
        // Anything that changed while it ran (the camera, the pointer, the
        // morph) makes it stale: it says nothing now.
        if (
          deps.disposed() ||
          issued !== generation ||
          camera !== viewer.view.camera.version
        ) {
          return;
        }
        const mode = drawn ?? st().mode;
        if (refused !== undefined) {
          cursor = { text: refused, muted: true };
          return;
        }
        const design = hit?.design;
        if (design === undefined || site === undefined) {
          cursor =
            hit === undefined
              ? { ...idle(mode), muted: true }
              : {
                  text:
                    site === undefined
                      ? /ghost|deck/.test(hit.feature?.name ?? "")
                        ? "That's the other placement's ghost: point at the solid model for design coordinates."
                        : "No design model here."
                      : "This site's frame is still loading: no design coordinates yet.",
                  muted: true,
                };
          return;
        }
        const d = design.design;
        const frame = design.engineeringFrame;
        let station: number | undefined;
        let offset: number | undefined;
        const alignment = frame.alignments[0];
        if (alignment !== undefined) {
          try {
            const so = alignment.stationOffset(d);
            if (
              so.station >= alignment.startStation &&
              so.station <= alignment.endStation
            ) {
              station = so.station;
              offset = so.offset;
            }
          } catch {
            // No station off the alignment's ends: none is shown.
          }
        }
        const error = site.rigidPlacement?.displayError(d) ?? 0;
        const symbol = unitSymbol(frame.units.horizontalUnitName);
        const read = cursorReadout({
          mode,
          morphing: false,
          exaggeration: 1,
          hit: {
            error,
            ...(station !== undefined && { station }),
            ...(offset !== undefined && { offset }),
          },
        });
        const vertical = site.view?.frame?.vertical;
        const compass =
          deps.compass?.() === true
            ? compassAt(viewer, hit!, design.engineeringFrame, d)
            : undefined;
        cursor = {
          text: read.text,
          coordinates: `E ${fixed(d[0]!, 2)}  N ${fixed(d[1]!, 2)} ${symbol}  ·  H ${fixed(d[2]!, 2)} ${vertical ?? symbol}`,
          tolerance: `pick ±${errorText(hit!.tolerance)} (one pixel there)`,
          muted: false,
          ...(compass !== undefined && { compass }),
        };
      })
      .catch(() => {
        // A pick that fails (the view resized away) shows nothing new.
      })
      .finally(() => {
        picking = false;
        deps.changed();
        if (pending !== undefined) {
          update();
        }
      });
  }

  viewer.canvas.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      if (e.buttons !== 0) {
        return;
      }
      const r = viewer.canvas.getBoundingClientRect();
      update([e.clientX - r.left, e.clientY - r.top]);
    },
    { signal: deps.signal },
  );

  return {
    pickAt,
    update: () => update(),
    cameraMoved() {
      generation++;
      if (cursor.coordinates !== undefined || (!blocked && cursor.muted)) {
        set(idle(st().mode));
      }
    },
    view: () => cursor,
  };
}
