// Orion on the globe (DESIGN.md "Lines", 6c): its path, built in the worker
// in the frame it's drawn in and moved with that frame as the clock runs,
// and its node and statements at the clock's instant (the tree and the
// legend), each one request in flight with the latest waiting (orion.ts
// `latestOnly`). Its dot ("Orion now") is placed on this thread every frame
// from the same OEM (orionTrack.ts, Task 4c): it never waits for the worker.
// The overlay's state is overlayControl.ts's, passed in as the shared object
// it is.
import { frameTransform } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { Instant } from "../../src/time/Instant.ts";
import { familyRgba } from "./globe.ts";
import { defaultAccuracy, type OverlayState } from "./overlayConfig.ts";
import type { OverlayChunk, Sampling } from "./overlays.ts";
import { compose, latestOnly, orionLegend, pathPoint } from "./orion.ts";
import {
  DRAW_IN,
  IDENTITY,
  isAbort,
  messageOf,
  missingText,
  type PageCore,
} from "./page.ts";
import type { OrionFrame, OverlayView } from "./panel/model.ts";
import type { TrajectoryInfo } from "./protocol.ts";
import { orionPlace, type OrionTrack } from "./orionTrack.ts";

/** The OEM's span, generously: samples it doesn't cover are skipped. */
const ORION_SPAN = ["2026-04-02T02:00:00", "2026-04-11T00:00:00"] as const;

/**
 * Orion's drawing (6c): a coarse step of an hour, refined where the path
 * bends until no segment departs from it by more than 0.05% of its distance
 * from the drawing frame's origin (500 m at 1,000 km), with no interval
 * under 5 s, within 8,000 samples and 2 s of worker time.
 */
const ORION_STEP = 3600;
const ORION_ADAPTIVE = {
  tolerance: 5e-4,
  minStep: 5,
  floor: 100,
  maxSamples: 8000,
  budgetMs: 2000,
} as const;

/** Orion's drawn path: the frame it's in, the instant it was placed at (TDB) and the inverse of that placement. */
export interface OrionBuilt {
  frame: OrionFrame;
  at: number;
  inverse: Float64Array;
  sampling?: Sampling;
  chunks: readonly OverlayChunk[];
}

export interface OrionLayer {
  /** The frame Orion's path is drawn in (the knob, the Explore control). */
  frame(): OrionFrame;
  setFrame(frame: OrionFrame): void;
  /** Orion's node and statements from the worker (one reply), and the clock time they're for. */
  info(): { info: TrajectoryInfo; utc: number } | undefined;
  /** The last statement request's failure, and the clock time it was for; cleared by the next success. */
  error(): { message: string; utc: number } | undefined;
  built(): OrionBuilt | undefined;
  /** The overlay went on, or its frame changed: builds the path in the worker. */
  draw(): void;
  /** The overlay went off: drops what's in flight and the drawn path. */
  off(): void;
  /** Moves the path with its drawing frame to the clock's instant. */
  place(): void;
  /** A point of the drawn path (Earth-fixed when drawn), where it is placed at the instant the globe shows. */
  pathPoint(p: ArrayLike<number>): Float64Array | undefined;
  /**
   * Orion's place in ITRF at the instant the globe shows (`Globe.shownAt`),
   * from the OEM on this thread: on the drawn path in every frame, with no
   * statement to wait for. Undefined until the OEM is in, or outside it.
   */
  markerPoint(): Float64Array | undefined;
  /** Asks for the statement again if the clock moved since the last ask. */
  askIfMoved(now: number, real: number): void;
  /** The legend's line (R8), from the statement at the clock's instant. */
  accuracy(): Pick<
    OverlayView,
    "accuracy" | "detail" | "drawing" | "caution" | "unbounded" | "note"
  >;
  dispose(): void;
}

export function createOrionLayer(deps: {
  core: Pick<
    PageCore,
    | "viewer"
    | "globe"
    | "loading"
    | "client"
    | "frames"
    | "instantNow"
    | "invalidate"
    | "disposed"
    | "scrub"
  >;
  /** The overlay's state (overlayControl.ts). */
  state: OverlayState;
  /** The callouts follow the path and the statement. */
  refreshCallouts(): void;
  /** The tree takes Orion's node and statements. */
  rebuildTree(): void;
  /** A path was drawn (the scene may frame it). */
  drawn(): void;
  /** Loads Orion's OEM on this thread, once the worker has it (orionTrack.ts `loadOrionTrack`). */
  loadTrack(frames: Frames): Promise<OrionTrack>;
}): OrionLayer {
  const {
    viewer,
    globe,
    loading,
    client,
    frames: framesNow,
    instantNow,
    invalidate,
    disposed,
    scrub,
  } = deps.core;
  const s = deps.state;
  let orionFrame: OrionFrame = "GCRF";
  let orionInfo: { info: TrajectoryInfo; utc: number } | undefined;
  let orionInfoError: { message: string; utc: number } | undefined;
  let orionBuilt: OrionBuilt | undefined;

  const leapOf = () => framesNow()!.data.leapSeconds;
  /** Builds Orion's path in the worker: one build in flight, the latest waiting (orion.ts). */
  const orionBuild = latestOnly(
    (arg: { frame: OrionFrame; at: number }) =>
      client.overlay("trajectoryPath", {
        drawIn: DRAW_IN[arg.frame],
        t0: Instant.fromIso(ORION_SPAN[0], "UTC", leapOf()).tdb(),
        t1: Instant.fromIso(ORION_SPAN[1], "UTC", leapOf()).tdb(),
        step: ORION_STEP,
        at: arg.at,
        adaptive: ORION_ADAPTIVE,
      }),
    (g, arg) => {
      const frames = framesNow();
      if (!s.on || disposed() || arg.frame !== orionFrame || !frames) {
        return;
      }
      const frame = frames[DRAW_IN[arg.frame]];
      const chunks = g.layers[0]!.chunks;
      globe.setOverlay("orion", [{ chunks, color: familyRgba("trajectory") }], {
        placement: IDENTITY,
      });
      orionBuilt = {
        frame: arg.frame,
        at: arg.at,
        inverse: frameTransform(frames.itrf, frame, Instant.fromTdb(arg.at)),
        chunks,
        ...(g.sampling && { sampling: g.sampling }),
      };
      orionPlacedAt = NaN;
      place();
      s.state = "drawn";
      delete s.problem;
      deps.refreshCallouts();
      invalidate();
      deps.drawn();
    },
    (error, arg) => {
      if (isAbort(error) || disposed() || !s.on || arg.frame !== orionFrame) {
        return;
      }
      const missing = loading.get("orion").state === "missing";
      s.state = missing ? "missing" : "error";
      s.problem = missing
        ? missingText("orion")
        : `It didn't draw: ${scrub(messageOf(error))}`;
      invalidate();
    },
  );

  /**
   * Orion's path follows the clock without a rebuild: drawn in GCRF or
   * MOON_ME at one instant, it is moved each frame by the drawing frame's
   * placement now times its inverse then (exact: both are rigid). In ITRF
   * the path doesn't depend on the clock at all.
   */
  let orionPlacedAt = NaN;
  function place(): void {
    const frames = framesNow();
    const instant = instantNow();
    if (!orionBuilt || !frames || !instant || orionBuilt.frame === "ITRF") {
      return;
    }
    const tdb = instant.tdb();
    if (tdb === orionPlacedAt) {
      return;
    }
    let now: Float64Array;
    try {
      now = frameTransform(
        frames[DRAW_IN[orionBuilt.frame]],
        frames.itrf,
        instant,
      );
    } catch {
      // Outside the frame data's span: left where it was last placed.
      return;
    }
    globe.placeOverlay("orion", compose(now, orionBuilt.inverse));
    orionPlacedAt = tdb;
  }

  function orionPathPoint(p: ArrayLike<number>): Float64Array | undefined {
    const frames = framesNow();
    const instant = globe.shownAt();
    if (!orionBuilt || !frames || !instant) {
      return undefined;
    }
    if (orionBuilt.frame === "ITRF") {
      return Float64Array.from([p[0]!, p[1]!, p[2]!]);
    }
    try {
      const now = frameTransform(
        frames[DRAW_IN[orionBuilt.frame]],
        frames.itrf,
        instant,
      );
      return pathPoint(compose(now, orionBuilt.inverse), p);
    } catch {
      return undefined;
    }
  }

  /**
   * Orion's trajectory on this thread (orionTrack.ts): loaded once the
   * worker has the OEM (so it is in the HTTP cache), tried again on the next
   * change after a failure. The dot is placed from it every frame.
   */
  let track: OrionTrack | undefined;
  /** The OEM's load on this thread: under way, or why it failed (R9: said, never silent). */
  let trackLoad: { state: "loading" } | { state: "error"; message: string } = {
    state: "loading",
  };
  let trackLoading = false;
  /**
   * Loads the OEM once the worker has it. After a failure it is tried again
   * only when the path is drawn again (the overlay turned on, its frame
   * changed), not on every change of the loading model.
   */
  function loadTrack(retry = false): void {
    const frames = framesNow();
    if (
      track ||
      trackLoading ||
      (trackLoad.state === "error" && !retry) ||
      !frames ||
      loading.get("orion").state !== "ready"
    ) {
      return;
    }
    trackLoading = true;
    trackLoad = { state: "loading" };
    invalidate();
    deps
      .loadTrack(frames)
      .then((t) => {
        if (!disposed()) {
          track = t;
          deps.refreshCallouts();
          invalidate();
        }
      })
      .catch((error: unknown) => {
        if (disposed() || isAbort(error)) {
          return;
        }
        // The path and the statement still show; the dot can't, and the
        // legend and the overlay's row say why, as the console does.
        const message = scrub(messageOf(error));
        trackLoad = { state: "error", message };
        console.warn(`Orion's dot can't show: ${message}`);
        deps.refreshCallouts();
        invalidate();
      })
      .finally(() => {
        trackLoading = false;
      });
  }

  /** The legend's line about the dot while it isn't placed: loading, or why not. */
  function dotNote(): OverlayView["note"] {
    if (track || loading.get("orion").state !== "ready") {
      return undefined;
    }
    return trackLoad.state === "error"
      ? {
          text: `Orion's dot can't show: ${trackLoad.message}`,
          attention: true,
        }
      : {
          text: "Orion's dot: loading its OEM on this page…",
          attention: false,
        };
  }

  function markerPoint(): Float64Array | undefined {
    const frames = framesNow();
    const instant = globe.shownAt();
    if (!track || !frames || !instant) {
      return undefined;
    }
    try {
      return orionPlace(track, frames, instant);
    } catch {
      // Outside the frame data's span.
      return undefined;
    }
  }

  /** Orion's node and statements at the clock's instant: one in flight, the latest waiting. */
  const orionInfoRequest = latestOnly(
    (arg: { at: number; utc: number }) => client.trajectoryInfo(arg.at),
    (info, arg) => {
      if (disposed()) {
        return;
      }
      orionInfo = { info, utc: arg.utc };
      orionInfoError = undefined;
      deps.rebuildTree();
      deps.refreshCallouts();
    },
    (error, arg) => {
      // Shown in the legend and on the tree's node; the next clock change
      // (a minute of clock time) asks again.
      if (disposed() || isAbort(error)) {
        return;
      }
      orionInfoError = { message: scrub(messageOf(error)), utc: arg.utc };
      deps.rebuildTree();
      deps.refreshCallouts();
    },
  );
  let orionInfoAsked: { clock: number; real: number } | undefined;
  function askOrionInfo(): void {
    const instant = instantNow();
    if (!instant || loading.get("orion").state !== "ready") {
      return;
    }
    orionInfoAsked = { clock: viewer.clock.time, real: performance.now() };
    orionInfoRequest.request({ at: instant.tdb(), utc: viewer.clock.time });
  }
  // When Orion's OEM is in (its overlay or its tests loaded it), the tree
  // and the legend get Orion.
  // When Orion's OEM is in the worker, this thread loads it too, for the dot.
  const unsubscribe = loading.subscribe(() => {
    if (
      orionInfoAsked === undefined &&
      loading.get("orion").state === "ready"
    ) {
      askOrionInfo();
    }
    loadTrack();
  });

  function draw(): void {
    const instant = instantNow();
    if (!framesNow() || !instant) {
      s.state = "error";
      s.problem = "It didn't draw: frame data isn't in yet";
      invalidate();
      return;
    }
    // A new frame shows waiting; the same one keeps its path until the
    // new build replaces it. Whatever is in flight for another frame is
    // dropped, never queued.
    if (orionBuilt?.frame !== orionFrame) {
      s.state = "waiting";
      delete s.problem;
    }
    orionBuild.drop();
    orionBuild.request({ frame: orionFrame, at: instant.tdb() });
    loadTrack(true);
    invalidate();
  }

  function accuracy(): ReturnType<OrionLayer["accuracy"]> {
    if (orionInfo === undefined && loading.get("orion").state !== "ready") {
      // Orion's line doesn't depend on the bias factor.
      return { accuracy: defaultAccuracy("orion", 1) };
    }
    const l = orionLegend(orionInfo?.info.composed.ITRF, {
      drawIn: orionBuilt?.frame ?? orionFrame,
      utc: new Date(
        orionInfoError?.utc ?? orionInfo?.utc ?? viewer.clock.time,
      ).toISOString(),
      ...(orionBuilt?.sampling && { sampling: orionBuilt.sampling }),
      ...(orionInfoError && { error: orionInfoError.message }),
    });
    const note = s.on ? dotNote() : undefined;
    return {
      accuracy: l.accuracy,
      detail: l.detail,
      ...(l.drawing !== undefined && { drawing: l.drawing }),
      ...(l.caution && { caution: true }),
      ...(l.unbounded && { unbounded: true }),
      ...(note && { note }),
    };
  }

  return {
    frame: () => orionFrame,
    setFrame: (frame) => {
      orionFrame = frame;
    },
    info: () => orionInfo,
    error: () => orionInfoError,
    built: () => orionBuilt,
    draw,
    off: () => {
      orionBuild.drop();
      orionBuilt = undefined;
    },
    place,
    pathPoint: orionPathPoint,
    markerPoint,
    askIfMoved: (now, real) => {
      // Scrubbed or played: the tree's statements and the legend's accuracy
      // are asked for again within a moment (one in flight, the latest
      // waiting). Orion's dot doesn't wait for them (`markerPoint`).
      if (
        orionInfoAsked !== undefined &&
        Math.abs(now - orionInfoAsked.clock) > 1000 &&
        real - orionInfoAsked.real > 150
      ) {
        askOrionInfo();
      }
    },
    accuracy,
    dispose: unsubscribe,
  };
}
