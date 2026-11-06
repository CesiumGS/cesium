// Each scenario on the globe (main thread): its camera and the orbit rig it
// hands over to, the triads it draws, how it lights and exposes the globe,
// what drives the clock, and the limit it says plainly. Plain data with a
// few pure functions, so the page (stage.ts) applies it and the tests read
// it (test/framesExplorerScenes.test.ts). The tour's stops 1, 2, 5 and 6
// live on here: earth-turns is stop 2's polar view (stop 1's triads), one-path
// is stop 5's plane, stand-on-moon is stop 6's site.
//
// Light imports only: the worker's evaluators import the lunar site from
// here, and the page never bundles the catalog (protocol.ts's rule).
import type { Frame } from "../../../src/frames/Frame.ts";
import { eastNorthUpFrame } from "../../../src/frames/local.ts";
import { Ellipsoid, fromDegrees } from "../../../src/math/ellipsoid.ts";
import { MOON } from "../../../src/scene/Body.ts";
import type { RigKind } from "../orbit.ts";
import type { KnobState, ScenarioId } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

/** The lunar site's node id: its triad's, its camera's and the tree's. */
export const LUNAR_SITE = "Lunar site";

/** The site's position in MOON_ME at `latitude` (degrees), on the IAU sphere at 0° longitude, m. */
export function lunarSitePosition(latitude: number): Float64Array {
  return MOON.ellipsoid.cartographicToCartesian(
    fromDegrees(0, latitude, 0),
    new Float64Array(3),
  );
}

/** The site's east-north-up frame on MOON_ME. */
export function lunarSiteFrame(moonMe: Frame, latitude: number): Frame {
  return eastNorthUpFrame(
    LUNAR_SITE,
    moonMe,
    MOON.ellipsoid,
    lunarSitePosition(latitude),
  );
}

/** "89.5° S", "the equator", "12° N". */
export function latitudeText(latitude: number): string {
  if (latitude === 0) {
    return "the equator";
  }
  return `${Math.abs(latitude)}° ${latitude < 0 ? "S" : "N"}`;
}

/** Sacramento's east-north-up frame (the old tour's site), riding the turning Earth in earth-turns. */
export const SACRAMENTO = {
  name: "Sacramento ENU",
  longitude: -121.4944,
  latitude: 38.5816,
} as const;

/** An east-north-up site on the Earth (WGS 84, at h = 0), under ITRF. */
export function earthSiteFrame(
  itrf: Frame,
  site: { name: string; longitude: number; latitude: number },
): Frame {
  return eastNorthUpFrame(
    site.name,
    itrf,
    Ellipsoid.WGS84,
    Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(site.longitude, site.latitude, 0),
      new Float64Array(3),
    ),
  );
}

/** Orion's draw-in frame (one-path's knob). */
export type DrawnFrame = "GCRF" | "ITRF" | "MOON_ME";

/** A named framing; cameraViews.ts places each at the clock's instant. */
export type SceneCamera = "northPole" | "earthMoon" | "lunarSite";

export interface SceneSpec {
  id: ScenarioId;
  camera: SceneCamera;
  /** The orbit the flight lands in (orbit.ts): each scenario names its rig. */
  rig: RigKind;
  /** The flight's length, s (the tour's: 3.0 to the plane, 3.5 to the site). */
  flight?: number;
  /**
   * The base frames its answer and proof name: the docked diagram keeps
   * them (and their ancestors) in view from the start, before the
   * evaluation's path is in.
   */
  focus: readonly string[];
  /** The triads drawn whatever is selected, at these knobs. */
  triads(knobs: KnobState): string[];
  /** Each geocentric axis named and kept clear of the declutter (stop 1's S-I1). */
  pinnedAxes?: boolean;
  /** Lit from the camera, not the clock's sun (stop 2's S-I6). */
  light?: "camera";
  /** The imagery's exposure compensation: at a desktop width and under `NARROW_VIEW` (F43). */
  dim?: { wide: number; narrow: number };
  /** The clock's rate while it shows, from the knobs; otherwise it is left. */
  clockRate?(knobs: KnobState): number;
  /** Orion's path, drawn in this frame. */
  orion?(knobs: KnobState): DrawnFrame;
  /** The lunar site at this latitude. */
  lunarSite?(knobs: KnobState): number;
  /** Sites on the Earth the scene adds (their frames under ITRF). */
  earthSites?: readonly { name: string; longitude: number; latitude: number }[];
  /** A limit the scenario says plainly, under its answer and on the globe. */
  note?: string;
  /**
   * The knob the tree itself drives: its options are nodes you click to
   * choose (one-path: "Draw Orion's path in" this frame), and the globe
   * shows the same choice beside the answer.
   */
  treeControl?: { knob: string; verb: string };
  /** A short line under the diagram's key. */
  diagramNote?: string;
  /** The route's last step, by the drawn-in frame: what you see. */
  drawnView?: Readonly<Record<string, string>>;
  /** The route's first and last steps, for a scenario with no data (its answer relates two frames). */
  routeEnds?: {
    start: { title: string; does: string };
    end: { title: string; does: string };
  };
}

export const SCENES: Readonly<Partial<Record<ScenarioId, SceneSpec>>> = {
  "one-path": {
    id: "one-path",
    camera: "earthMoon",
    rig: "earthMoon",
    flight: 3,
    focus: ["GCRF", "ITRF", "MOON_ME"],
    // The drawn-in frame's own triad beside the Earth's pair: the frame you
    // look from, at the Moon when it is MOON_ME.
    triads: (k) => [
      "ITRF",
      "GCRF",
      ...(k.frame === "MOON_ME" ? ["MOON_ME"] : []),
    ],
    orion: (k) => (k.frame as DrawnFrame | undefined) ?? "MOON_ME",
    treeControl: { knob: "frame", verb: "Draw Orion's path in" },
    diagramNote:
      "Orion's data stays where it is defined. Changing the frame changes the route, not the tree.",
    drawnView: {
      GCRF: "a smooth loop out to the Moon and back: the Earth's spin isn't in it",
      ITRF: "the path loops round and round because the Earth turns under it",
      MOON_ME:
        "the path as seen standing on the Moon: it swings round the far side",
    },
  },
  "earth-turns": {
    id: "earth-turns",
    camera: "northPole",
    rig: "geocentric",
    focus: ["ITRF", "GCRF", SACRAMENTO.name],
    // The geocentric pair, and Sacramento's site riding the turning Earth
    // while GCRF's axes hold still against the stars (owner, fix 1).
    triads: () => ["ITRF", "GCRF", SACRAMENTO.name],
    routeEnds: {
      start: {
        title: "ITRF, the ground",
        does: "the Earth-fixed frame: Greenwich and Sacramento turn with it",
      },
      end: {
        title: "GCRF, the stars",
        does: "the frame that doesn't turn: the stars hold still in it",
      },
    },
    earthSites: [SACRAMENTO],
    pinnedAxes: true,
    light: "camera",
    // Lit from the camera, the polar globe washes out behind the axes; at
    // desktop width the eye brightens the small globe on black (F43).
    dim: { wide: -1.5, narrow: -0.6 },
    clockRate: (k) => Number(k.rate),
  },
  "stand-on-moon": {
    id: "stand-on-moon",
    camera: "lunarSite",
    rig: "lunarSite",
    flight: 3.5,
    focus: ["MOON_ME", "ITRF"],
    triads: () => [LUNAR_SITE],
    routeEnds: {
      start: {
        title: "The lunar site's clock",
        does: "a clock at rest on the Moon's surface",
      },
      end: {
        title: "ITRF, a clock on the Earth",
        does: "the clock it is compared with, at rest on the Earth's surface",
      },
    },
    lunarSite: (k) => Number(k.latitude),
    note: "The Moon's imagery is the sky's distant backdrop until plan 5 draws the Moon as a tileset in MOON_ME, so it lines up with the site only from straight above, as here.",
  },
};

/** The scenarios the page shows: those with a scene (and an evaluator), in the strip's order. */
export const READY: readonly ScenarioId[] = SCENARIOS.filter(
  (s) => SCENES[s.id] !== undefined,
).map((s) => s.id);

/** The exposure compensation while `scene` shows in a view `viewWidth` px wide. */
export function sceneExposure(
  scene: SceneSpec | undefined,
  viewWidth: number,
  narrowView: number,
): number {
  const dim = scene?.dim;
  if (dim === undefined) {
    return 0;
  }
  return viewWidth < narrowView ? dim.narrow : dim.wide;
}
