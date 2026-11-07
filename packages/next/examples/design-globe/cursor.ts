// The cursor (plan 4b Task 18): design picks under the pointer (Task 15's
// `pickDesign`), one at a time, the latest position winning, and the HUD's
// readout from them: the rigid error there, the design coordinates in the
// CRS's own units and height system, the pick's tolerance. `pickAt` is the
// seam the measure tool (Task 19) takes.
import { pickDesign } from "../../src/engineering/pick.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import { fixed, unitSymbol } from "./measureModel.ts";
import { cursorReadout, errorText, type Placement } from "./page.ts";
import type { CursorView } from "./panel/model.ts";
import type { SiteRuntime } from "./siteLoader.ts";

export interface CursorDeps {
  readonly viewer: Viewer;
  readonly signal: AbortSignal;
  sites(): Iterable<SiteRuntime>;
  /** The page's placement and whether the drawn geometry is between placements or exaggerated. */
  state(): {
    readonly mode: Placement;
    readonly morphing: boolean;
    readonly exaggeration: number;
  };
  /** The readout changed. */
  changed(): void;
  disposed(): boolean;
}

export interface Cursor {
  /** A design pick at CSS pixel (x, y) of the view, and the site it hit. */
  pickAt(
    x: number,
    y: number,
  ): Promise<{
    hit: Awaited<ReturnType<typeof pickDesign>>;
    site: SiteRuntime | undefined;
  }>;
  /** The readout, again from the state (a morph or the exaggeration began or ended). */
  update(): void;
  /** The camera moved: what was under the cursor no longer is. */
  cameraMoved(): void;
  view(): CursorView;
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

  const pickable = () =>
    [...deps.sites()].flatMap((s) =>
      [s.rigid, s.reprojected].filter((t): t is Tileset3D => t !== undefined),
    );

  async function pickAt(x: number, y: number) {
    const hit = await pickDesign(viewer.view, x, y, pickable());
    const site = [...deps.sites()].find(
      (s) =>
        hit?.tileset !== undefined &&
        (s.rigid === hit.tileset || s.reprojected === hit.tileset),
    );
    return { hit, site };
  }

  function set(next: CursorView): void {
    cursor = next;
    deps.changed();
  }

  function update(at?: [number, number]): void {
    if (at !== undefined) {
      pending = at;
    }
    const s = st();
    const base = cursorReadout({
      mode: s.mode,
      morphing: s.morphing,
      exaggeration: s.mode === "rigid" ? s.exaggeration : 1,
    });
    if (!base.design) {
      blocked = true;
      set({ text: base.text, muted: true });
      return;
    }
    if (blocked) {
      // Settled again: the readout waits for the next pick.
      blocked = false;
      set({ text: base.text, muted: false });
    }
    if (picking || pending === undefined) {
      return;
    }
    const [x, y] = pending;
    pending = undefined;
    picking = true;
    void pickAt(x, y)
      .then(({ hit, site }) => {
        // A pick from before a morph or the exaggeration began says nothing now.
        if (deps.disposed() || blocked) {
          return;
        }
        const mode = st().mode;
        const design = hit?.design;
        const rigid = site?.rigidPlacement;
        if (design === undefined || site === undefined) {
          cursor = {
            text:
              hit === undefined
                ? cursorReadout({ mode, morphing: false, exaggeration: 1 }).text
                : site === undefined
                  ? "No design model here."
                  : "This site's frame is still loading: no design coordinates yet.",
            muted: hit === undefined || site === undefined,
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
        const error = rigid?.displayError(d) ?? 0;
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
        cursor = {
          text: read.text,
          coordinates: `E ${fixed(d[0]!, 2)}  N ${fixed(d[1]!, 2)} ${symbol}  ·  H ${fixed(d[2]!, 2)} ${vertical ?? symbol}`,
          tolerance: `pick ±${errorText(hit!.tolerance)} (one pixel there)`,
          muted: false,
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
      if (cursor.coordinates !== undefined) {
        set({
          text: cursorReadout({
            mode: st().mode,
            morphing: false,
            exaggeration: 1,
          }).text,
          muted: false,
        });
      }
    },
    view: () => cursor,
  };
}
