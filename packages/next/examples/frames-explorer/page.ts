// What every part of the page shares (main.ts builds it): the viewer and
// the globe, the loading model, the view store and the worker client, the
// frame data once it's in, and the panel's model, rebuilt on its next read
// after `invalidate`. The page's parts take this as their first dependency;
// state of their own stays in their module, behind its API.
//
// While the clock plays the model is invalidated every frame. It keeps every
// unchanged part's identity (share.ts), so with nothing but the time moved
// it is the previous object and the panel doesn't render again; the times
// themselves, which do move every frame, are their own small source
// (`createTimeSource`), read only by the few lines that print them (Task 4d).
import type { Frames } from "../../src/frames/frames.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Instant } from "../../src/time/Instant.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Globe } from "./globe.ts";
import type { LoadingModel } from "./loading.ts";
import { length } from "./panel/format.ts";
import type {
  LiveTime,
  OrionFrame,
  PanelModel,
  Selection,
  TimeSource,
} from "./panel/model.ts";
import type { ModelSource } from "./panel/Panel.tsx";
import type { Client, DataItem, FrameName } from "./protocol.ts";
import type { ViewStore } from "./selection.ts";
import { share } from "./share.ts";
import { FLYBY_UTC } from "./stress/epochs.ts";

export const deg = Math.PI / 180;
export const WGS84 = Ellipsoid.WGS84;
export { EARTH_MEAN_RADIUS } from "./units.ts";

/** The Artemis II flyby (R4's clock preset), and the instant the page opens at. */
export const FLYBY = Date.parse(FLYBY_UTC);

export const IDENTITY = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

export const ITEM_NAME: Record<DataItem, string> = {
  frames: "frame data",
  proj: "PROJ",
  geoid: "GEOID18",
  orion: "Orion's OEM",
  grids: "the country geoid grids",
  egm2008: "EGM2008",
};

/** An item the frames store doesn't have (R5). */
export const missingText = (item: DataItem): string =>
  `${ITEM_NAME[item]} isn't in the frames store: run npm run setup in packages/next, then reload.`;

/** The frame Orion's path is drawn in, by the worker's name for it. */
export const DRAW_IN: Record<OrionFrame, FrameName> = {
  GCRF: "gcrf",
  ITRF: "itrf",
  MOON_ME: "moonMe",
};

/** Meters as the panel writes them (SI prefixes, powers of ten written out). */
export const meters = (x: number): string => length(x, 3);

/** A selection of a frame: a frame, a tree diagram's node, or an edge (by its child node). */
export const isFrame = (
  s: Selection,
): s is Extract<Selection, { kind: "frame" | "node" | "edge" }> =>
  s.kind === "frame" || s.kind === "node" || s.kind === "edge";

export { messageOf } from "./errors.ts";
export const isAbort = (e: unknown): boolean =>
  e instanceof DOMException && e.name === "AbortError";

/** What every part of the page is given. */
export interface PageCore {
  readonly viewer: Viewer;
  readonly globe: Globe;
  readonly loading: LoadingModel;
  readonly view: ViewStore;
  readonly client: Client;
  /** The frame data, once it's in (frameData.ts). */
  frames(): Frames | undefined;
  /** The clock's instant, once the frame data (its leap seconds) is in. */
  instantNow(): Instant | undefined;
  /** The panel's model is stale (`createModelSource`). */
  invalidate(): void;
  /** The example was left. */
  disposed(): boolean;
  /** The ion token never enters a message the page shows (R18). */
  scrub(text: string): string;
}

/**
 * The panel's model: rebuilt on the next read after `invalidate`, its
 * listeners told once per frame (R13: a run streams 225 results). Each
 * rebuild shares what didn't change with the last model, so a rebuild that
 * changed nothing reads as the same object.
 */
export function createModelSource(deps: {
  build(): PanelModel;
  disposed(): boolean;
}): { source: ModelSource; invalidate(): void; dispose(): void } {
  let model: PanelModel | undefined;
  /** The last model built, kept across `invalidate` to share with. */
  let last: PanelModel | undefined;
  const listeners = new Set<() => void>();
  let notifyQueued = 0;
  const invalidate = () => {
    model = undefined;
    if (notifyQueued === 0 && !deps.disposed()) {
      notifyQueued = requestAnimationFrame(() => {
        notifyQueued = 0;
        for (const l of [...listeners]) {
          l();
        }
      });
    }
  };
  return {
    source: {
      subscribe: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      get: () => (model ??= last = share(last, deps.build())),
    },
    invalidate,
    dispose: () => cancelAnimationFrame(notifyQueued),
  };
}

/** The clock's UTC as the panel prints it: ISO 8601, to the second. */
export const clockUtc = (time: number): string =>
  new Date(time).toISOString().replace(/\.\d+Z$/, "Z");

/**
 * The clock's and the scenario's times for the panel (Task 4d): the only
 * values it shows that move every frame while the clock plays, kept out of
 * the model so the rest of the panel doesn't render with them. `changed`
 * is called on each clock change; listeners are told once per frame, and
 * `get` is a new object only when a time it gives changed.
 */
export function createTimeSource(deps: {
  /** The clock's time, UTC ms. */
  clock(): number;
  /** The scenario's time, UTC ms, if a scenario shows. */
  epoch(): number | undefined;
  disposed(): boolean;
}): { source: TimeSource; changed(): void; dispose(): void } {
  const listeners = new Set<() => void>();
  let notifyQueued = 0;
  let time: LiveTime | undefined;
  const read = (): LiveTime => {
    const epoch = deps.epoch();
    const next: LiveTime = {
      utc: clockUtc(deps.clock()),
      ...(epoch !== undefined && { epochUtc: new Date(epoch).toISOString() }),
    };
    return share(time, next);
  };
  return {
    source: {
      subscribe: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      get: () => (time ??= read()),
    },
    changed: () => {
      const next = read();
      if (next === time) {
        return;
      }
      time = next;
      if (notifyQueued === 0 && !deps.disposed()) {
        notifyQueued = requestAnimationFrame(() => {
          notifyQueued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    dispose: () => cancelAnimationFrame(notifyQueued),
  };
}
