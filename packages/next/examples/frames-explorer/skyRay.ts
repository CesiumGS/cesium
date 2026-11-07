// The lines of sight up from sites on the Earth (Task 6b): the dish's to
// Orion, Sacramento's to the Moon, and from orbit every dish's to Orion.
// They follow the clock, so they are placed on the page's thread every
// frame at the instant the globe shows (`Globe.shownAt`), from the page's
// own frame tree and Orion's track (orionTrack.ts), as Orion's dot is
// (Task 4c): never from a worker reply, which comes on the evaluation's
// cadence and made them step. The worker's evaluation keeps the answer,
// its accuracy and its proof, which may trail the clock ("following").
//
// Each line is drawn once, a unit segment up a local z axis in 200 pieces
// (so a blocked line can be dashed), under a placement moved every frame
// (`Globe.placeOverlay`): z turned to the apparent direction
// (`rayFrom`) and scaled to the line's length. From the dish it runs
// 3,000 km up; from orbit all the way to Orion, only while Orion is above
// that dish's horizon, the chosen dish's at full strength and the others'
// fainter. A line the Moon cuts stops at its limb, dashed and dimmed: the
// signal is lost (the answer's verdict is the worker's `lineOfSight`; this
// is the same sphere, placed at the frame's instant, for the picture).
// Labels follow the lines; their text is set again only when it changes.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { Instant } from "../../src/time/Instant.ts";
import { hexRgba, type Globe, type LabelSpec } from "./globe.ts";
import type { OrionTrack } from "./orionTrack.ts";
import { overlayMesh, polyline } from "./overlays.ts";
import { MOON_RADIUS } from "./scenarios/occultation.ts";
import {
  azimuthElevation,
  compassPoint,
  rayFrom,
} from "./scenarios/pointing.ts";
import {
  earthSiteFrame,
  type EarthSite,
  type SceneSpec,
} from "./scenarios/scenes.ts";
import type { KnobState } from "./scenarios/spec.ts";
import type { LabelBoard } from "./triadLayer.ts";

/** The line's length from the dish, m: out past the view from the ground. */
export const RAY_LENGTH = 3_000_000;

/** Where along the dish's line its label sits, m. */
const LABEL_AT = 40_000;

/** The other dishes' lines from orbit, against the chosen one's. */
const OTHERS = 0.45;

/** A blocked line, dimmed as well as dashed. */
const BLOCKED = 0.5;

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

/** A column-major placement taking local z to `d` (ITRF unit) times `length` at `origin`. */
export function rayPlacement(
  origin: ArrayLike<number>,
  d: ArrayLike<number>,
  length = 1,
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
  // prettier-ignore
  return Float64Array.of(
    x[0]!, x[1]!, x[2]!, 0,
    y[0]!, y[1]!, y[2]!, 0,
    d[0]! * length, d[1]! * length, d[2]! * length, 0,
    origin[0]!, origin[1]!, origin[2]!, 1,
  );
}

/**
 * Where the Moon (a sphere of `radius` at `moon`) first cuts the segment
 * from `origin` along unit `d` for `length`, m along it; undefined when it
 * doesn't.
 */
export function moonCut(
  origin: ArrayLike<number>,
  d: ArrayLike<number>,
  length: number,
  moon: ArrayLike<number>,
  radius = MOON_RADIUS,
): number | undefined {
  const m = [0, 1, 2].map((i) => moon[i]! - origin[i]!);
  const along = m[0]! * d[0]! + m[1]! * d[1]! + m[2]! * d[2]!;
  const off2 = m[0]! ** 2 + m[1]! ** 2 + m[2]! ** 2 - along * along;
  if (off2 >= radius * radius) {
    return undefined;
  }
  const hit = along - Math.sqrt(radius * radius - off2);
  return hit > 0 && hit < length ? hit : undefined;
}

/** One line as it is drawn this frame. */
interface Drawn {
  name: string;
  origin: number[];
  direction: number[];
  length: number;
  blocked: boolean;
  strength: number;
}

export interface SkyRay {
  /** Every frame: the lines and their labels at the instant the globe shows. */
  place(): void;
  /** The chosen site's line now (ITRF unit direction), for checks. */
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
  /** Each site's frame and its fixed placement in ITRF, by its key. */
  const sites = new Map<
    string,
    { frame: Frame; latitude: number; toItrf: Float64Array }
  >();
  /** Each overlay drawn, by id, and how (blocked, strength). */
  const shown = new Map<string, string>();
  let text = "";
  let current: Drawn[] = [];

  const ids = () => [...shown.keys()];

  /** A point `fraction` of the way along line `name` as last placed. */
  function alongLine(name: string, fraction: number) {
    const l = current.find((x) => x.name === name);
    return (
      l && l.origin.map((x, i) => x + fraction * l.length * l.direction[i]!)
    );
  }

  function clear(): void {
    for (const id of ids()) {
      globe.removeOverlay(id);
    }
    shown.clear();
    if (deps.labels.has("sky")) {
      deps.labels.delete("sky");
      text = "";
      deps.refreshLabels();
    }
    current = [];
  }

  function siteOf(frames: Frames, s: EarthSite, instant: Instant) {
    const key = `${s.name}:${s.longitude}:${s.latitude}:${s.height ?? 0}`;
    let site = sites.get(key);
    if (!site) {
      const frame = earthSiteFrame(frames.itrf, s);
      // A fixed placement in ITRF: its matrix doesn't change.
      site = {
        frame,
        latitude: s.latitude,
        toItrf: frameTransform(frame, frames.itrf, instant),
      };
      sites.set(key, site);
    }
    return site;
  }

  function draw(line: Drawn): void {
    const id = `${OVERLAY}:${line.name}`;
    const how = `${line.blocked}:${line.strength}`;
    const placement = rayPlacement(line.origin, line.direction, line.length);
    if (shown.get(id) !== how) {
      const unit = new Float64Array(3 * 201);
      for (let i = 0; i <= 200; i++) {
        unit[3 * i + 2] = i / 200;
      }
      globe.setOverlay(
        id,
        [
          {
            chunks: overlayMesh(polyline(unit, [255, 255, 255, 255])),
            color: hexRgba("#ffffff"),
            strength: line.strength * (line.blocked ? BLOCKED : 1),
            dashed: line.blocked,
          },
        ],
        { placement },
      );
      shown.set(id, how);
    } else {
      globe.placeOverlay(id, placement);
    }
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
    const chosen = ray.site(knobs);
    const all = ray.all?.(knobs);
    const track = deps.orionTrack();
    const target = targetPlace(frames, ray.target, track);
    if (!target || (ray.target === "orion" && !track!.contains(instant))) {
      // Outside Orion's data, or its track not in yet: no line.
      clear();
      return;
    }
    // The Moon's centre in ITRF now, for the picture's blocking.
    const moonNow = frameTransform(frames.moonIcrf, frames.itrf, instant);
    const moon = [moonNow[12]!, moonNow[13]!, moonNow[14]!];
    const lines: Drawn[] = [];
    const words: LabelSpec[] = [];
    let chosenText = "";
    for (const s of all ?? [chosen]) {
      const site = siteOf(frames, s, instant);
      let ray0: { enu: number[]; range: number };
      try {
        ray0 = rayFrom(frames, site.frame, site.latitude, target, instant);
      } catch {
        continue;
      }
      const { enu, range } = ray0;
      const m = site.toItrf;
      const origin = [m[12]!, m[13]!, m[14]!];
      const direction = [0, 1, 2].map(
        (i) => m[i]! * enu[0]! + m[4 + i]! * enu[1]! + m[8 + i]! * enu[2]!,
      );
      const { azimuth, elevation } = azimuthElevation(enu);
      const isChosen = s.name === chosen.name;
      if (isChosen) {
        chosenText = `${ray.label} · ${elevation.toFixed(1)}° ${elevation >= 0 ? "up" : "down"}, az ${azimuth.toFixed(1)}° ${compassPoint(azimuth)}`;
      }
      if (all && elevation < 0) {
        // From orbit, a dish whose horizon hides Orion draws no line.
        words.push({
          id: `sky-ray:${s.name}:below`,
          text: `${s.name.replace(" ENU", "")} · below the horizon`,
          at: Float64Array.from(origin),
          family: "earth",
          priority: 1,
        });
        continue;
      }
      const cut = moonCut(origin, direction, range, moon);
      const blocked = cut !== undefined;
      lines.push({
        name: s.name,
        origin,
        direction,
        length: all ? (cut ?? range) : RAY_LENGTH,
        blocked,
        strength: isChosen ? 1 : OTHERS,
      });
      if (all && !isChosen) {
        const name = s.name;
        words.push({
          id: `sky-ray:${name}`,
          text: `${name.replace(" ENU", "")}${blocked ? " · lost behind the Moon" : ""}`,
          at: () => alongLine(name, 0.12),
          family: "earth",
          priority: 1,
        });
      }
    }
    current = lines;
    // Lines no longer drawn (a dish whose horizon now hides Orion) go.
    const keep = new Set(lines.map((l) => `${OVERLAY}:${l.name}`));
    for (const id of ids()) {
      if (!keep.has(id)) {
        globe.removeOverlay(id);
        shown.delete(id);
      }
    }
    for (const l of lines) {
      draw(l);
    }
    const chosenLine = lines.find((l) => l.name === chosen.name);
    const lost = chosenLine?.blocked === true;
    const label = `${chosenText}${lost ? " · signal lost behind the Moon" : ""}`;
    const key = `${label}|${words.map((w) => w.text).join("|")}`;
    if (key !== text) {
      text = key;
      const specs: LabelSpec[] = [
        ...(chosenLine
          ? [
              {
                id: "sky-ray",
                text: label,
                at: () => {
                  const l = current.find((x) => x.name === chosen.name);
                  const along = all ? 0.12 * (l?.length ?? 0) : LABEL_AT;
                  return (
                    l && l.origin.map((x, i) => x + along * l.direction[i]!)
                  );
                },
                family: "earth" as const,
                priority: 4,
                pinned: true,
              },
            ]
          : []),
        ...words,
      ];
      deps.labels.set("sky", specs);
      deps.refreshLabels();
    }
  }

  return {
    place,
    now: () => {
      const name = deps.scene()?.skyRay?.site(deps.knobs()).name;
      const l = current.find((x) => x.name === name);
      return l && { origin: l.origin, direction: l.direction };
    },
    dispose: clear,
  };
}
