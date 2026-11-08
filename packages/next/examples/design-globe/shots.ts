// The design globe's camera (plan 4b Task 18): its moves (eased, on the
// wall clock, ended by the user taking the camera, a cut under reduced
// motion) and its shots: the opening shot near the corridor's far end, "Fly
// along" down the corridor to the anchor, a site's framing, and the daylight
// each site is seen in.
import type { Alignment } from "../../src/engineering/alignment.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { AnswerSite, Answers } from "./answers.ts";
import type { OpenerId } from "./measureOpeners.ts";
import { enuAt, type SagSample } from "./overlays.ts";
import { morphEase } from "./page.ts";

const deg = Math.PI / 180;

/**
 * The opening shot (review I1): looking back along the road toward the
 * anchor, 28° off its axis, from between the two levels: the true road on
 * the ground below, receding with its lanes and barriers, and the rigid copy
 * of it floating overhead, a whisker standing between the two in the
 * foreground. Centred `lift` of the way from where the centreline truly is
 * up to where rigid draws it. (A camera at the rigid deck's own height sees
 * it edge-on; one above both reads as two parallel roads.) Heading relative
 * to the alignment's azimuth there.
 */
export const OPENING_VIEW = {
  heading: 208 * deg,
  pitch: -6 * deg,
  range: 120,
  lift: 0.4,
};
/** A model whose rigid error reaches this many metres is framed where it is largest. */
const VISIBLE_GAP = 3;

/** "Fly along" looks across the road, relative to the alignment's azimuth. */
const ALONG_HEADING = -75 * deg;
/** "Fly along": about 24 km in 24 s, slow enough for the tiles to keep up. */
export const ALONG_MS = 24_000;

/** A camera framing: look at `center` from `range` m, heading and pitch in its east-north-up frame. */
export interface Framing {
  readonly center: ArrayLike<number>;
  readonly heading: number;
  readonly pitch: number;
  readonly range: number;
}

/** Whether the viewer asked for less motion. */
export const reducedMotion = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The camera's moves: one at a time; the user's input ends one. */
export class CameraMoves {
  private token = 0;
  private flying_ = false;
  /**
   * Where a framing's subject sits above the view's centre, as a share of
   * its range (0: centred). The tour's card covers the lower middle of the
   * view, so its shots lift their subject clear of it (`cut`, `flyTo`).
   */
  lift = 0;

  /** Ends the running move's frames. */
  private end: (() => void) | undefined;

  /**
   * `animate`: the engine's frames (frameDriver.ts): each step of a move
   * places the camera before the render, busy while it flies.
   */
  constructor(
    private readonly viewer: Pick<Viewer, "controller" | "engine" | "view">,
    private readonly changed: () => void,
    private readonly animate: (step: (now: number) => boolean) => () => void,
  ) {}

  get flying(): boolean {
    return this.flying_;
  }

  /**
   * `to` from the same camera position, turned to look `atan(lift)` lower,
   * so its subject shows that much above the view's centre. (Moving the look
   * point down instead lowered the camera with it, under the true road in
   * the opening shot: Task 20 fix 1.)
   */
  private lifted(to: Framing): Framing {
    if (this.lift === 0) {
      return to;
    }
    const { east, north, up } = enuAt(to.center);
    const forward = (pitch: number) =>
      [0, 1, 2].map(
        (k) =>
          Math.cos(pitch) *
            (Math.sin(to.heading) * east[k]! +
              Math.cos(to.heading) * north[k]!) +
          Math.sin(pitch) * up[k]!,
      );
    const f0 = forward(to.pitch);
    const camera = [0, 1, 2].map((k) => to.center[k]! - to.range * f0[k]!);
    const pitch = Math.max(-89 * deg, to.pitch - Math.atan(this.lift));
    const f1 = forward(pitch);
    return {
      ...to,
      pitch,
      center: [0, 1, 2].map((k) => camera[k]! + to.range * f1[k]!),
    };
  }

  /** Places the camera at `framing` at once (lifted for the tour). */
  cut(framing: Framing): void {
    this.place(this.lifted(framing));
  }

  /** Places the camera at `to` at once, as given. */
  private place(to: Framing): void {
    this.stop();
    this.viewer.controller.focus(
      Float64Array.from(to.center),
      to.heading,
      to.pitch,
      to.range,
    );
    this.viewer.engine.requestRender();
  }

  stop(): void {
    this.token++;
    this.end?.();
    this.end = undefined;
    if (this.flying_) {
      this.flying_ = false;
      this.changed();
    }
  }

  /**
   * Runs `path(u)` for u from 0 to 1 over `ms` on the wall clock (eased in
   * and out when `ease`), ending early when the user takes the camera;
   * under reduced motion, a cut to `path(1)`. `done` is called on arrival.
   */
  run(
    path: (u: number) => Framing,
    ms: number,
    options: { ease?: boolean; done?: () => void } = {},
  ): void {
    this.stop();
    if (reducedMotion() || ms <= 0) {
      this.place(path(1));
      options.done?.();
      return;
    }
    const token = this.token;
    const { controller, engine, view } = this.viewer;
    const inputs = controller.inputs;
    const start = performance.now();
    this.flying_ = true;
    this.changed();
    this.end = this.animate((now) => {
      if (token !== this.token) {
        return false;
      }
      if (controller.inputs !== inputs) {
        this.stop();
        return false;
      }
      const u = Math.min(1, Math.max(0, (now - start) / ms));
      const f = path(options.ease === false ? u : morphEase(u));
      view.camera.lookAt(
        Float64Array.from(f.center),
        f.heading,
        f.pitch,
        f.range,
      );
      engine.requestRender();
      if (u < 1) {
        return true;
      }
      controller.focus(
        Float64Array.from(f.center),
        f.heading,
        f.pitch,
        f.range,
      );
      this.end = undefined;
      this.flying_ = false;
      this.changed();
      options.done?.();
      return false;
    });
  }

  /**
   * Flies from where the camera looks now to `to`: the look point and range
   * eased (range on a log scale), heading and pitch the short way round.
   */
  flyTo(framing: Framing, done?: () => void): void {
    const to = this.lifted(framing);
    const cam = this.viewer.view.camera;
    const from = this.viewer.controller;
    const fromCenter = Float64Array.from(from.target);
    const fromRange = Math.max(1, from.range);
    const dist = Math.hypot(
      ...[0, 1, 2].map((k) => to.center[k]! - cam.position[k]!),
    );
    const decades = Math.abs(Math.log10(Math.max(fromRange, dist) / to.range));
    const ms = 1000 * Math.min(3.5, Math.max(1.2, 1.2 + 0.35 * decades));
    const dh =
      ((to.heading - from.heading + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    // High enough mid-way to see where it goes: the range bows up.
    const lift = Math.max(fromRange, to.range, dist * 0.6);
    this.run(
      (u) => ({
        center: [0, 1, 2].map(
          (k) => fromCenter[k]! + (to.center[k]! - fromCenter[k]!) * u,
        ),
        heading: from.heading + dh * u,
        pitch: from.pitch + (to.pitch - from.pitch) * u,
        range: Math.exp(
          Math.log(fromRange) * (1 - u) +
            Math.log(to.range) * u +
            Math.sin(Math.PI * u) *
              Math.max(
                0,
                Math.log(lift) -
                  Math.max(Math.log(fromRange), Math.log(to.range)),
              ),
        ),
      }),
      ms,
      done === undefined ? {} : { done },
    );
  }
}

/** What the shots read from the page. */
export interface ShotsDeps {
  readonly viewer: Viewer;
  readonly camera: CameraMoves;
  readonly alignment: Alignment;
  answers(): Answers | undefined;
  samples(): readonly SagSample[] | undefined;
  /** The camera's station while it flies along (undefined: not flying along). */
  alongChanged(station: number | undefined): void;
}

/** The page's camera shots. */
export interface Shots {
  /** The opening shot, from the answers' point about 20 km out, at exaggeration `k`. */
  openingShot(a: Answers, k?: number): Framing | undefined;
  /** "Fly along": to the far end, then down the corridor to the anchor. */
  flyAlong(): void;
  /** The flight along ended (arrived, or the user took the camera). */
  endAlong(): void;
  /** The station the camera flies along at, if it does. */
  alongStation(): number | undefined;
  /** The clock at 10:30 local solar time at a body-fixed point. */
  daylight(at: ArrayLike<number>): void;
  /** Flies to a tileset (the corridor to its opening shot). */
  /** Flies to a tileset: the corridor to its opening shot, a large ladder site to its farthest point. */
  flyToTileset(
    tileset: Tileset3D,
    corridorShot: boolean,
    answer?: AnswerSite,
  ): void;
}

export function createShots(deps: ShotsDeps): Shots {
  const { viewer, camera, alignment } = deps;
  let alongStation: number | undefined;

  /**
   * The opening shot at exaggeration `k`: the same view, centred and
   * pulled back with the drawn gap so the rigid deck stays in frame.
   */
  function openingShot(a: Answers, k = 1): Framing | undefined {
    // At station 170,000, the opening measurement's (the design against
    // itself, Task 19), about 20 km from the anchor.
    const p =
      a.points[a.marker.point] ??
      a.points.find((q) => q.nearKm === 20) ??
      a.points.reduce((x, y) => (y.displayError > x.displayError ? y : x));
    if (p === undefined) {
      return undefined;
    }
    const v = OPENING_VIEW;
    if (k === 1) {
      return {
        center: p.bodyFixed.map(
          (t, i) => t + (p.rigidDisplayed[i]! - t) * v.lift,
        ),
        heading: alignment.azimuthAt(p.station) + v.heading,
        pitch: v.pitch,
        range: v.range,
      };
    }
    // Exaggerated: centred halfway up the drawn gap, pulled back to about
    // twice it, so the deck and the road below both stay in frame.
    const gap = p.displayError * k;
    return {
      center: p.bodyFixed.map(
        (t, i) => t + (p.rigidDisplayed[i]! - t) * k * 0.5,
      ),
      heading: alignment.azimuthAt(p.station) + v.heading,
      pitch: -8 * deg,
      range: 2.2 * gap,
    };
  }

  /** The corridor's point at `station`, halfway between the placements, by the samples. */
  function corridorAt(station: number): Float64Array | undefined {
    const samples = deps.samples();
    if (samples === undefined || samples.length < 2) {
      return undefined;
    }
    const first = samples[0]!.station;
    const step = samples[1]!.station - first;
    const i = Math.max(
      0,
      Math.min(samples.length - 2, Math.floor((station - first) / step)),
    );
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const f = Math.max(
      0,
      Math.min(1, (station - a.station) / (b.station - a.station)),
    );
    // Halfway between the placements, so both stay in view.
    return Float64Array.from([0, 1, 2], (k) => {
      const mid = (s: SagSample) => (s.truth[k]! + s.rigid[k]!) / 2;
      return mid(a) + (mid(b) - mid(a)) * f;
    });
  }

  /**
   * The camera along the corridor at `station`, `u` of the way to the
   * anchor: across the road at the rigid deck's height at first, rising as
   * the gap closes so the anchor ring shows from above at the end.
   */
  function framingAlong(station: number, u: number): Framing | undefined {
    const center = corridorAt(station);
    const k = u * u;
    return center === undefined
      ? undefined
      : {
          center,
          // Across the road from its right, so the deck and the road below
          // slide past side by side; rising as the gap closes.
          heading: alignment.azimuthAt(station) + ALONG_HEADING,
          pitch: -8 * deg + (-30 * deg + 8 * deg) * k,
          range: 220 + (420 - 220) * k,
        };
  }

  function endAlong(): void {
    if (alongStation !== undefined) {
      alongStation = undefined;
      deps.alongChanged(undefined);
    }
  }

  function flyAlong(): void {
    const answers = deps.answers();
    if (answers === undefined || deps.samples() === undefined) {
      return;
    }
    // The self-check's station, where the opening shot looks (one figure
    // for "where rigid is 30.6 m off", Task 20 fix 1).
    const from = answers.marker.station;
    const to = answers.anchorStation;
    const first = framingAlong(from, 0);
    if (first === undefined) {
      return;
    }
    const along = () => {
      alongStation = from;
      camera.run(
        (u) => {
          const station = from + (to - from) * u;
          alongStation = station;
          deps.alongChanged(station);
          return framingAlong(station, u)!;
        },
        reducedMotion() ? 0 : ALONG_MS,
        { done: endAlong },
      );
    };
    // To the far end first, unless the camera is there.
    camera.flyTo(first, along);
  }

  /**
   * The clock at 10:30 local solar time on the 2026 September equinox, at
   * a body-fixed point's longitude, paused: every site is seen in the same
   * mid-morning light, the sun to the east and high enough for relief.
   */
  function daylight(at: ArrayLike<number>): void {
    const longitude = Math.atan2(at[1]!, at[0]!);
    const hours = 10.5 - longitude / deg / 15;
    viewer.clock.time = Date.UTC(2026, 8, 23) + hours * 3_600_000;
    viewer.clock.mode = "paused";
  }

  /** Flies to `to` in its own daylight, set again on arrival for the clock's place. */
  function flyLit(to: Framing): void {
    daylight(to.center);
    camera.flyTo(to, () => daylight(to.center));
  }

  function flyToTileset(
    tileset: Tileset3D,
    corridorShot: boolean,
    answer?: AnswerSite,
  ): void {
    const answers = deps.answers();
    if (corridorShot && answers !== undefined) {
      const f = openingShot(answers);
      if (f) {
        flyLit(f);
        return;
      }
    }
    const far = answer?.points[1];
    if (far !== undefined && far.displayError >= VISIBLE_GAP) {
      // A model whose rigid error you can see: where it is largest, close
      // enough to read the model and the gap (the pole line is thin at
      // full extent).
      const gap = far.displayError;
      flyLit({
        center: far.bodyFixed.map(
          (t, i) => t + (far.rigidDisplayed[i]! - t) * 0.4,
        ),
        heading: -40 * deg,
        pitch: -14 * deg,
        range: Math.max(90, 3.5 * gap + 60),
      });
      return;
    }
    const sphere = tileset.root.volume.sphere;
    flyLit({
      center: sphere.center,
      heading: -35 * deg,
      pitch: -28 * deg,
      range: Math.max(150, sphere.radius * 2.4),
    });
  }

  return {
    openingShot,
    flyAlong,
    endAlong,
    alongStation: () => alongStation,
    daylight,
    flyToTileset,
  };
}

/**
 * "Close in on the ruler": along the pair's line, looking down at its far
 * end from about 22 m. The bracket between ground's last foot tick and
 * design's, about 0.23 m across, reads, seen through the other placement's
 * translucent ghost deck (8 m above at the pair's far end; Task 20).
 */
export function rulerFraming(focus: {
  readonly center: Float64Array;
  readonly along: ArrayLike<number>;
}): Framing {
  const { east, north } = enuAt(focus.center);
  const a = focus.along;
  const heading = Math.atan2(
    a[0]! * east[0]! + a[1]! * east[1]! + a[2]! * east[2]!,
    a[0]! * north[0]! + a[1]! * north[1]! + a[2]! * north[2]!,
  );
  return { center: focus.center, heading, pitch: -70 * deg, range: 22 };
}

/** An opener's "Show" framing: its line's middle, across the road for the marker and the mark. */
export function openerFraming(
  id: OpenerId,
  focus: { readonly center: Float64Array; readonly length: number },
  answers: Answers | undefined,
  alignment: Alignment,
): Framing {
  const station =
    id === "marker"
      ? answers?.marker.station
      : id === "mark"
        ? answers?.mark.nearest.station
        : undefined;
  return {
    center: focus.center,
    heading:
      station !== undefined
        ? alignment.azimuthAt(station) + OPENING_VIEW.heading
        : -35 * deg,
    pitch: id === "pair" ? -32 * deg : -10 * deg,
    range: Math.max(140, focus.length * (id === "pair" ? 1.4 : 2.2)),
  };
}

/**
 * The survey mark's shot (Task 20 fix 1, I5): from behind the disk, looking
 * at the road's two centrelines at the mark's nearest point (where it truly
 * is and where rigid draws it, about 19 m apart), the disk in the
 * foreground: both ends of the measurement and the gap in one view.
 */
export function markGapFraming(
  disk: ArrayLike<number>,
  road: ArrayLike<number>,
  ghost: ArrayLike<number>,
): Framing {
  const far = [0, 1, 2].map((k) => (road[k]! + ghost[k]!) / 2);
  const { east, north } = enuAt(disk);
  const d = [0, 1, 2].map((k) => far[k]! - disk[k]!);
  const heading = Math.atan2(
    d[0]! * east[0]! + d[1]! * east[1]! + d[2]! * east[2]!,
    d[0]! * north[0]! + d[1]! * north[1]! + d[2]! * north[2]!,
  );
  const length = Math.hypot(d[0]!, d[1]!, d[2]!);
  return {
    center: [0, 1, 2].map((k) => disk[k]! + 0.62 * d[k]!),
    heading,
    pitch: -50 * deg,
    range: Math.max(200, 3.4 * length),
  };
}
