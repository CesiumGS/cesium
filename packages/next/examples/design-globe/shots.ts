// The design globe's camera (plan 4b Task 18): its moves (eased, on the
// wall clock, ended by the user taking the camera, a cut under reduced
// motion) and its shots: the opening shot near the corridor's far end, "Fly
// along" down the corridor to the anchor, a site's framing, and the daylight
// each site is seen in.
import type { Alignment } from "../../src/engineering/alignment.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Answers } from "./answers.ts";
import type { SagSample } from "./overlays.ts";
import { morphEase } from "./page.ts";

const deg = Math.PI / 180;

/**
 * The opening shot's camera, about the point midway between where rigid
 * draws the centreline and where it is: across the road from its left, at
 * about the rigid deck's height, so the rigid road stands in the air against
 * the sky with the true one on the ground below it. Heading relative to the
 * alignment's azimuth there.
 */
export const OPENING_VIEW = {
  heading: -95 * deg,
  pitch: -3.5 * deg,
  range: 180,
};
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

  constructor(
    private readonly viewer: Viewer,
    private readonly changed: () => void,
  ) {}

  get flying(): boolean {
    return this.flying_;
  }

  /** Places the camera at `to` at once. */
  cut(to: Framing): void {
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
      this.cut(path(1));
      options.done?.();
      return;
    }
    const token = this.token;
    const { controller, engine, view } = this.viewer;
    const inputs = controller.inputs;
    const start = performance.now();
    this.flying_ = true;
    this.changed();
    const step = (now: number) => {
      if (token !== this.token) {
        return;
      }
      if (controller.inputs !== inputs) {
        this.stop();
        return;
      }
      const u = Math.min(1, (now - start) / ms);
      const f = path(options.ease === false ? u : morphEase(u));
      view.camera.lookAt(
        Float64Array.from(f.center),
        f.heading,
        f.pitch,
        f.range,
      );
      engine.requestRender();
      if (u < 1) {
        requestAnimationFrame(step);
        return;
      }
      controller.focus(
        Float64Array.from(f.center),
        f.heading,
        f.pitch,
        f.range,
      );
      this.flying_ = false;
      this.changed();
      options.done?.();
    };
    requestAnimationFrame(step);
  }

  /**
   * Flies from where the camera looks now to `to`: the look point and range
   * eased (range on a log scale), heading and pitch the short way round.
   */
  flyTo(to: Framing, done?: () => void): void {
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
  /** The opening shot, from the answers' point about 20 km out. */
  openingShot(a: Answers): Framing | undefined;
  /** "Fly along": to the far end, then down the corridor to the anchor. */
  flyAlong(): void;
  /** The flight along ended (arrived, or the user took the camera). */
  endAlong(): void;
  /** The station the camera flies along at, if it does. */
  alongStation(): number | undefined;
  /** The clock at 10:30 local solar time at a body-fixed point. */
  daylight(at: ArrayLike<number>): void;
  /** Flies to a tileset (the corridor to its opening shot). */
  flyToTileset(tileset: Tileset3D, corridorShot: boolean): void;
}

export function createShots(deps: ShotsDeps): Shots {
  const { viewer, camera, alignment } = deps;
  let alongStation: number | undefined;

  function openingShot(a: Answers): Framing | undefined {
    const p =
      a.points.find((q) => q.nearKm === 20) ??
      a.points.reduce((x, y) => (y.displayError > x.displayError ? y : x));
    if (p === undefined) {
      return undefined;
    }
    const center = p.bodyFixed.map((v, k) => (v + p.rigidDisplayed[k]!) / 2);
    return {
      center,
      ...OPENING_VIEW,
      heading: alignment.azimuthAt(p.station) + OPENING_VIEW.heading,
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
          heading: alignment.azimuthAt(station) + OPENING_VIEW.heading,
          pitch: OPENING_VIEW.pitch + (-30 * deg - OPENING_VIEW.pitch) * k,
          range: OPENING_VIEW.range + (420 - OPENING_VIEW.range) * k,
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
    const from =
      answers.points.find((q) => q.nearKm === 20)?.station ??
      alignment.endStation;
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

  function flyToTileset(tileset: Tileset3D, corridorShot: boolean): void {
    const answers = deps.answers();
    if (corridorShot && answers !== undefined) {
      const f = openingShot(answers);
      if (f) {
        daylight(f.center);
        camera.flyTo(f);
        return;
      }
    }
    const sphere = tileset.root.volume.sphere;
    daylight(sphere.center);
    camera.flyTo({
      center: sphere.center,
      heading: -35 * deg,
      pitch: -28 * deg,
      range: Math.max(150, sphere.radius * 4.5),
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
