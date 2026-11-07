// The line of sight up from a site on the Earth (Task 6b): the dish's to
// Orion, Sacramento's to the Moon. It follows the clock, so it is placed on
// the page's thread every frame at the instant the globe shows
// (`Globe.shownAt`), from the page's own frame tree and Orion's track
// (orionTrack.ts), as Orion's dot is (Task 4c): never from a worker reply,
// which comes on the evaluation's cadence and made it step. The worker's
// evaluation keeps the answer, its accuracy and its proof, which may trail
// the clock ("following").
//
// The line is drawn once, a segment up a local z axis, under a placement
// moved every frame (`Globe.placeOverlay`): the site's frame turned so z is
// the apparent direction (`rayDirection`). Its label follows the line's
// point (a function the labels read as they are placed against the
// rendered frame), and its text, the azimuth and elevation to 0.1°, is set
// again only when it changes.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { Instant } from "../../src/time/Instant.ts";
import { hexRgba, type Globe, type LabelSpec } from "./globe.ts";
import type { OrionTrack } from "./orionTrack.ts";
import { overlayMesh, segments } from "./overlays.ts";
import {
  azimuthElevation,
  compassPoint,
  rayDirection,
} from "./scenarios/pointing.ts";
import { earthSiteFrame, type SceneSpec } from "./scenarios/scenes.ts";
import type { KnobState } from "./scenarios/spec.ts";
import type { LabelBoard } from "./triadLayer.ts";

/** The drawn line's length, m: out past the view from the ground. */
export const RAY_LENGTH = 3_000_000;

/** Where along the line its label sits, m. */
const LABEL_AT = 40_000;

const OVERLAY = "scenario:sky-ray";

/** The target's barycentric place at a TDB time (m), or undefined when it has none then. */
export function targetPlace(
  frames: Frames,
  target: "moon" | "orion",
  track: OrionTrack | undefined,
): ((tdb: number) => ArrayLike<number>) | undefined {
  const frame: Frame | undefined =
    target === "moon" ? frames.moonIcrf : track?.frame;
  if (!frame) {
    return undefined;
  }
  return (tdb) =>
    frameTransform(frame, frames.icrf, Instant.fromTdb(tdb)).subarray(12, 15);
}

/** A column-major placement taking local z to `d` (ITRF unit) at `origin`. */
export function rayPlacement(
  origin: ArrayLike<number>,
  d: ArrayLike<number>,
): Float64Array {
  // Any two unit vectors square to d and each other.
  const helper = Math.abs(d[2]!) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const a = [
    helper[1]! * d[2]! - helper[2]! * d[1]!,
    helper[2]! * d[0]! - helper[0]! * d[2]!,
    helper[0]! * d[1]! - helper[1]! * d[0]!,
  ];
  const la = Math.hypot(a[0]!, a[1]!, a[2]!);
  const x = a.map((v) => v / la);
  const y = [
    d[1]! * x[2]! - d[2]! * x[1]!,
    d[2]! * x[0]! - d[0]! * x[2]!,
    d[0]! * x[1]! - d[1]! * x[0]!,
  ];
  return Float64Array.of(
    x[0]!,
    x[1]!,
    x[2]!,
    0,
    y[0]!,
    y[1]!,
    y[2]!,
    0,
    d[0]!,
    d[1]!,
    d[2]!,
    0,
    origin[0]!,
    origin[1]!,
    origin[2]!,
    1,
  );
}

export interface SkyRay {
  /** Every frame: the line and its label at the instant the globe shows. */
  place(): void;
  /** The line's direction now (ITRF unit) and its far point, for tests and checks. */
  now(): { origin: number[]; direction: number[] } | undefined;
  dispose(): void;
}

export function createSkyRay(deps: {
  globe: Pick<
    Globe,
    "shownAt" | "setOverlay" | "placeOverlay" | "removeOverlay" | "hasOverlay"
  >;
  frames(): Frames | undefined;
  scene(): SceneSpec | undefined;
  knobs(): KnobState;
  orionTrack(): OrionTrack | undefined;
  labels: LabelBoard;
  refreshLabels(): void;
}): SkyRay {
  const { globe } = deps;
  let site:
    | { key: string; frame: Frame; latitude: number; toItrf: Float64Array }
    | undefined;
  let text = "";
  let current: { origin: number[]; direction: number[] } | undefined;

  function clear(): void {
    if (globe.hasOverlay(OVERLAY)) {
      globe.removeOverlay(OVERLAY);
    }
    if (deps.labels.has("sky")) {
      deps.labels.delete("sky");
      text = "";
      deps.refreshLabels();
    }
    current = undefined;
  }

  function place(): void {
    const scene = deps.scene();
    const ray = scene?.skyRay;
    const frames = deps.frames();
    const instant = globe.shownAt();
    if (!ray || !frames || !instant) {
      clear();
      return;
    }
    const knobs = deps.knobs();
    const s = ray.site(knobs);
    const key = `${s.name}:${s.longitude}:${s.latitude}:${s.height ?? 0}`;
    if (site?.key !== key) {
      const frame = earthSiteFrame(frames.itrf, s);
      site = {
        key,
        frame,
        latitude: s.latitude,
        // A fixed placement in ITRF: its matrix doesn't change.
        toItrf: frameTransform(frame, frames.itrf, instant),
      };
    }
    const target = targetPlace(frames, ray.target, deps.orionTrack());
    let enu: number[];
    try {
      if (
        !target ||
        (ray.target === "orion" && !deps.orionTrack()!.contains(instant))
      ) {
        throw new Error("no target now");
      }
      enu = rayDirection(frames, site.frame, site.latitude, target, instant);
    } catch {
      // Outside Orion's data, or its track not in yet: no line.
      clear();
      return;
    }
    const m = site.toItrf;
    const origin = [m[12]!, m[13]!, m[14]!];
    const direction = [0, 1, 2].map(
      (i) => m[i]! * enu[0]! + m[4 + i]! * enu[1]! + m[8 + i]! * enu[2]!,
    );
    current = { origin, direction };
    const placement = rayPlacement(origin, direction);
    if (!globe.hasOverlay(OVERLAY)) {
      globe.setOverlay(
        OVERLAY,
        [
          {
            chunks: overlayMesh(
              segments(
                Float64Array.of(0, 0, 0, 0, 0, RAY_LENGTH),
                [255, 255, 255, 255],
              ),
            ),
            color: hexRgba("#ffffff"),
          },
        ],
        { placement },
      );
    } else {
      globe.placeOverlay(OVERLAY, placement);
    }
    const { azimuth, elevation } = azimuthElevation(enu);
    const next = `${ray.label} · ${elevation.toFixed(1)}° ${elevation >= 0 ? "up" : "down"}, az ${azimuth.toFixed(1)}° ${compassPoint(azimuth)}`;
    if (next !== text) {
      text = next;
      const spec: LabelSpec = {
        id: "sky-ray",
        text,
        at: () =>
          current &&
          current.origin.map((x, i) => x + LABEL_AT * current!.direction[i]!),
        family: "earth",
        priority: 4,
        pinned: true,
      };
      deps.labels.set("sky", [spec]);
      deps.refreshLabels();
    }
  }

  return {
    place,
    now: () => current,
    dispose: clear,
  };
}
