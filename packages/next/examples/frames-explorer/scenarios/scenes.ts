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
import type { Frames } from "../../../src/frames/frames.ts";
import { Instant } from "../../../src/time/Instant.ts";
import { eastNorthUpFrame } from "../../../src/frames/local.ts";
import { Ellipsoid, fromDegrees } from "../../../src/math/ellipsoid.ts";
import { MOON } from "../../../src/scene/Body.ts";
import type { EngineeringSetup } from "../overlayConfig.ts";
import type { RigKind } from "../orbit.ts";
import type { OverlayId } from "../panel/model.ts";
import {
  BIM_PLACES,
  BIM_SITE_GRID,
  CORRIDOR_SITE_GRID,
  offsetPlace,
  bimEngineering,
  corridorEngineering,
} from "./sites.ts";
import {
  ARM,
  ARM_FRAMES,
  MARK,
  PAD,
  anglesOf,
  armFrames,
  type ArmFrames,
} from "./arm.ts";
import type { ScenarioEvaluation } from "./evaluate.ts";
import type { KnobState, ScenarioId } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";
import {
  BUOY,
  CAMERA_MOUNT,
  DRONE_BODY,
  MAST_SENSOR,
  SHIP,
  SHIP_BODY,
  droneFrames,
  shipFrames,
} from "./vehicles.ts";

const BIM_PLACES_SF = BIM_PLACES["san-francisco"];

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

/** A site on the Earth: its frame's name, and where it is on WGS 84 (degrees; m, 0 when not given). */
export interface EarthSite {
  name: string;
  longitude: number;
  latitude: number;
  height?: number;
}

/** An east-north-up site on the Earth (WGS 84, at its height or h = 0), under ITRF. */
export function earthSiteFrame(itrf: Frame, site: EarthSite): Frame {
  return eastNorthUpFrame(
    site.name,
    itrf,
    Ellipsoid.WGS84,
    Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(site.longitude, site.latitude, site.height ?? 0),
      new Float64Array(3),
    ),
  );
}

/** The dish's stations (Task 6b), by knob value: each one's NAIF id in the store's station SPK. */
export type StationId = "DSS-14" | "DSS-43" | "DSS-63";

/**
 * The three 70 m dishes. The worker places each from NAIF's station SPK
 * (`STATIONS_SPK`, at the scenario's time). The page's triad and camera
 * use the place below: the SPK's at 2026-04-06, to 1e-6° and 0.1 m
 * (test/data/framesExplorerScenarios.test.ts holds them to it within 1 m).
 */
export const DSN_STATIONS: Readonly<
  Record<StationId, EarthSite & { naif: number; complex: string }>
> = {
  "DSS-14": {
    name: "DSS-14 ENU",
    naif: 399014,
    complex: "Goldstone, California",
    longitude: -116.889543,
    latitude: 35.4259,
    height: 1001.4,
  },
  "DSS-43": {
    name: "DSS-43 ENU",
    naif: 399043,
    complex: "Canberra, Australia",
    longitude: 148.981273,
    latitude: -35.402414,
    height: 688.8,
  },
  "DSS-63": {
    name: "DSS-63 ENU",
    naif: 399063,
    complex: "Madrid, Spain",
    longitude: -4.248002,
    latitude: 40.431214,
    height: 864.8,
  },
};

/** The station the knobs choose (DSS-43 for anything else). */
export const stationOf = (knobs: KnobState) =>
  DSN_STATIONS[knobs.station as StationId] ?? DSN_STATIONS["DSS-43"];

/** Orion's draw-in frame (one-path's knob). */
export type DrawnFrame = "GCRF" | "ITRF" | "MOON_ME";

/**
 * A named framing; cameraViews.ts places each at the clock's instant.
 * `rigidLine` is stop 4's side view of the rigid and exact line, as drawn;
 * `engineering` the setup's own look (the corridor's road).
 */
export type SceneCamera =
  | "northPole"
  | "earthMoon"
  | "lunarSite"
  | "rigidLine"
  | "engineering"
  | "site";

/** A ground view (the "site" camera): where it looks, how far, its heading and pitch (degrees). */
export interface SceneLook {
  longitude: number;
  latitude: number;
  range: number;
  heading: number;
  pitch: number;
}

export interface SceneSpec {
  id: ScenarioId;
  camera: SceneCamera;
  /** The camera at these knobs, when a knob chooses it (the dish's view). */
  cameraFor?(knobs: KnobState): SceneCamera;
  /** The orbit the flight lands in (orbit.ts); none for a view on the ground (the globe controls). */
  rig?: RigKind;
  /** The flight's length, s (the tour's: 3.0 to the plane, 3.5 to the site). */
  flight?: number;
  /**
   * The base frames its answer and checks name: the docked diagram keeps
   * them (and their ancestors) in view from the start, before the
   * evaluation's path is in.
   */
  focus: readonly string[];
  /** The triads drawn whatever is selected, at these knobs. */
  triads(knobs: KnobState): string[];
  /** Its own frames' triads' length, as a fraction of the camera's distance (the default 0.06): the arm's joints sit metres apart. */
  triadScale?: number;
  /** Each geocentric axis named and kept clear of the declutter (stop 1's S-I1). */
  pinnedAxes?: boolean;
  /** Lit from the camera, not the clock's sun (stop 2's S-I6). */
  light?: "camera";
  /** The imagery's exposure compensation: at a desktop width and under `NARROW_VIEW` (F43). */
  dim?: { wide: number; narrow: number };
  /** The clock's rate while it shows, from the knobs; otherwise it is left. */
  clockRate?(knobs: KnobState): number;
  /** Orion's path, drawn in this frame (none at knobs it returns undefined for). */
  orion?(knobs: KnobState): DrawnFrame | undefined;
  /** The lunar site at this latitude. */
  lunarSite?(knobs: KnobState): number;
  /**
   * The engineering overlays it draws (overlayControl.ts), in its own
   * setup at these knobs: the BIM site's CRS and site grid, the corridor's.
   */
  engineering?: {
    setup(knobs: KnobState, defaults: EngineeringSetup): EngineeringSetup;
    overlays: readonly OverlayId[];
  };
  /** Sites on the Earth the scene adds at these knobs (their frames under ITRF). */
  earthSites?(knobs: KnobState): readonly EarthSite[];
  /** The "site" camera's view at these knobs. */
  look?(knobs: KnobState): SceneLook;
  /**
   * The line of sight up from a site, placed every frame on the page's
   * thread (skyRay.ts): to the Moon's centre or to Orion (its track), from
   * the site at these knobs, labelled.
   */
  skyRay?: {
    target: "moon" | "orion";
    label: string;
    site(knobs: KnobState): EarthSite;
    /**
     * From orbit (the dish's view knob): a line from each of these sites to
     * the target while it is above that site's horizon, the knobs' own
     * emphasized; none below it.
     */
    all?(knobs: KnobState): readonly EarthSite[] | undefined;
  };
  /** A limit the scenario says plainly, under its answer and on the globe. */
  note?: string;
  /**
   * The knob the tree itself drives: its options are nodes you click to
   * choose (one-path: "Draw Orion's path in" this frame), and the globe
   * shows the same choice beside the answer.
   */
  treeControl?: { knob: string; verb: string };
  /** The frame it draws in, when the scene has no choice of it (at these knobs): the diagram tags it. */
  drawIn?: string | ((knobs: KnobState) => string);
  /** A short line under the diagram's key. */
  diagramNote?: string;
  /** The route's last step, by the drawn-in frame: what you see. */
  drawnView?: Readonly<Record<string, string>>;
  /** The route's first and last steps, for a scenario with no data (its answer relates two frames). */
  routeEnds?: {
    start: { title: string; does: string };
    end: { title: string; does: string };
  };
  /**
   * The route as two legs that meet at the common ancestor, each end walked
   * up to it, with each leg's heading: the answer takes both ends there and
   * compares them (stand-on-moon's two clocks in ICRF, Task 4c item 1).
   */
  routeLegs?: { start: string; end: string };
  /**
   * Moving bodies' frames on the page (Task 7: the drone, the ship), built
   * from the evaluation's track as the worker built them (vehicles.ts):
   * none until it is in. Their triads follow the clock every frame.
   */
  bodies?(
    frames: Frames,
    knobs: KnobState,
    evaluation: ScenarioEvaluation | undefined,
  ): readonly Frame[];
}

/**
 * The arm's frames on the page, one set per frame tree: the knobs set their
 * angles (the frames are uncached, so they move at the same instant), and
 * the same frames stay in the tree.
 */
const ARMS = new WeakMap<Frame, ArmFrames>();

/** The page's arm under `itrf`, its angles set from `knobs`. */
export function pageArm(itrf: Frame, knobs: KnobState): ArmFrames {
  let arm = ARMS.get(itrf);
  if (!arm) {
    arm = armFrames(itrf, anglesOf(knobs));
    ARMS.set(itrf, arm);
  }
  Object.assign(arm.angles, anglesOf(knobs));
  return arm;
}

/** The ship's track's start, TDB s (vehicles.ts `SHIP.startUtc`). */
export const shipStartTdb = (frames: Frames): number =>
  Instant.fromUtc(Date.parse(SHIP.startUtc), frames.data.leapSeconds).tdb();

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
    earthSites: () => [SACRAMENTO],
    pinnedAxes: true,
    light: "camera",
    // Lit from the camera, the polar globe washes out behind the axes; at
    // desktop width the eye brightens the small globe on black (F43).
    dim: { wide: -1.5, narrow: -0.6 },
    clockRate: (k) => Number(k.rate),
  },
  "moon-from-here": {
    id: "moon-from-here",
    // On the ground at Sacramento, looking along the ray to the Moon.
    camera: "site",
    flight: 3,
    focus: ["ITRF", "GCRF", "MOON_ICRF"],
    triads: () => [SACRAMENTO.name],
    earthSites: () => [SACRAMENTO],
    look: () => ({ ...SACRAMENTO, range: 25_000, heading: 0, pitch: -12 }),
    // Lit from the camera: at the checked time it is night in Sacramento,
    // and the ground and the ray would be lost in the dark (fix 1).
    light: "camera",
    skyRay: { target: "moon", label: "To the Moon", site: () => SACRAMENTO },
    drawIn: SACRAMENTO.name,
    routeEnds: {
      start: {
        title: "MOON_ICRF, the Moon's centre",
        does: "where DE440 puts the Moon, light time before you see it",
      },
      end: {
        title: `${SACRAMENTO.name}, the sky from here`,
        does: "east, north and up at the site: the Moon's azimuth and elevation",
      },
    },
    diagramNote:
      "The Moon is a frame of the tree; its centre comes down the route to the site's east-north-up frame.",
    note: "Airless, as Horizons' table: near the horizon the air lifts the Moon by up to about half a degree. The local horizon is the terrain as drawn.",
  },
  "dish-tracks": {
    id: "dish-tracks",
    // On the ground at the station, the line of sight rising to Orion.
    camera: "site",
    flight: 3,
    focus: ["EME2000", "GCRF", "ITRF"],
    triads: (k) => [stationOf(k).name],
    earthSites: (k) => [stationOf(k)],
    look: (k) => ({ ...stationOf(k), range: 25_000, heading: 0, pitch: -12 }),
    light: "camera",
    cameraFor: (k) => (k.view === "orbit" ? "earthMoon" : "site"),
    // From orbit, Orion's path in GCRF beside the Earth and the Moon.
    orion: (k) => (k.view === "orbit" ? "GCRF" : undefined),
    skyRay: {
      target: "orion",
      label: "To Orion",
      site: (k) => stationOf(k),
      all: (k) =>
        k.view === "orbit" ? Object.values(DSN_STATIONS) : undefined,
    },
    drawIn: (k) => stationOf(k).name,
    drawnView: Object.fromEntries(
      Object.values(DSN_STATIONS).map((s) => [
        s.name,
        "east, north and up at the dish: where it points, and whether the Earth, the Moon or the ground is in the way",
      ]),
    ),
    diagramNote:
      "Orion's data stays in EME2000; its route goes up to ICRF and down through GCRF and the turning Earth to the dish's horizon.",
    note: "The local horizon is the terrain as drawn: it decides only the last part of the line of sight; the Earth and the Moon decide the rest.",
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
    // Both clocks are taken into ICRF and their rates compared there.
    routeLegs: {
      start: "The lunar clock's path to ICRF",
      end: "The Earth clock's path to ICRF",
    },
    lunarSite: (k) => Number(k.latitude),
    note: "The Moon's imagery is the sky's distant backdrop until plan 5 draws the Moon as a tileset in MOON_ME, so it lines up with the site only from straight above, as here.",
  },
  "bim-site": {
    id: "bim-site",
    // Stop 4's view (owner's rework): from the side of the 400 km line, so
    // the straight rigid line visibly leaves the curving ground; the inset
    // shows the gap at 20 km.
    camera: "rigidLine",
    flight: 3,
    focus: ["ITRF"],
    triads: () => [],
    engineering: {
      setup: (k) => bimEngineering(k),
      overlays: ["designGrid", "siteGrid", "rigidVsExact"],
    },
    dim: { wide: -0.6, narrow: -0.6 },
    drawIn: "ITRF",
    drawnView: {
      ITRF: "the model on the Earth: where exact placement puts it, on the ellipsoid",
    },
    diagramNote:
      "The model's numbers are in its site grid; the map conversion and PROJ take them to the Earth.",
    note: "Drawn on the WGS 84 ellipsoid, not terrain: the exact line lies at height 0, so its gap from the rigid line reads against the ground it curves with.",
  },
  corridor: {
    id: "corridor",
    camera: "engineering",
    flight: 3,
    focus: ["ITRF"],
    triads: () => [],
    engineering: {
      setup: (_k, defaults) => corridorEngineering(defaults),
      overlays: ["siteGrid"],
    },
    dim: { wide: -0.6, narrow: -0.6 },
    drawIn: "ITRF",
    drawnView: {
      ITRF: "the point on the ground, and the road it's measured along",
    },
    diagramNote:
      "Station and offset are measured along the road, in the site grid; drag the point on the globe, or set it with the knobs.",
  },
  drone: {
    id: "drone",
    // Beside the site, looking north-west across the drone's line: the
    // view's centre 150 m to the right of the site origin, so the drone and
    // its spot sit left of the answer's callout.
    camera: "site",
    flight: 3,
    focus: ["ITRF"],
    triads: () => [DRONE_BODY, CAMERA_MOUNT],
    look: () => ({
      ...offsetPlace(BIM_PLACES_SF.longitude, BIM_PLACES_SF.latitude, 120, 90),
      range: 900,
      heading: 323,
      pitch: -14,
    }),
    bodies: (frames, k, e) =>
      e?.track ? droneFrames(frames.itrf, e.track.heights, k) : [],
    light: "camera",
    drawIn: BIM_SITE_GRID,
    drawnView: {
      [BIM_SITE_GRID]:
        "the spot the camera looks at, in the BIM model's own x and y",
    },
    diagramNote:
      "The camera's ray goes up through the drone to ITRF, where it meets the terrain, then through PROJ and the map conversion to the model's grid.",
    note: "The drone's flight line is synthetic. The spot is where the ray meets the terrain as drawn: only as good as the tiles under it.",
  },
  ship: {
    id: "ship",
    // Over the main ship channel, looking in toward the Golden Gate: the
    // ship's last legs, the headlands and the buoy beyond them, close
    // enough that the terrain the sight line crosses is drawn at levels
    // 11 to 13.
    camera: "site",
    flight: 3,
    focus: ["ITRF"],
    triads: () => [SHIP_BODY, MAST_SENSOR],
    look: () => ({
      longitude: -122.535,
      latitude: 37.795,
      range: 17_000,
      heading: 52,
      pitch: -42,
    }),
    bodies: (frames, k, e) =>
      e?.track
        ? shipFrames(
            frames.itrf,
            e.track.heights,
            shipStartTdb(frames),
            Number(k.mast),
          )
        : [],
    light: "camera",
    drawIn: "California zone 3",
    drawnView: {
      "California zone 3":
        "the ship's easting and northing on the port's grid, in US survey feet",
    },
    diagramNote: `The ship's place comes from its track; the mast rides its body as it pitches and rolls. ${BUOY.short}'s sight line is traced over the terrain on the globe.`,
    note: "The track and the sea state are synthetic (along 33 CFR 167's lanes). The sight line is traced over the terrain as drawn: the sea's curve and the headlands; refraction is left out.",
  },
  "robot-arm": {
    id: "robot-arm",
    // From the north-north-west, looking south-south-east along the arm's
    // line to the station (CCV6 lies 17 km away at a bearing of about
    // 161°), so the line runs into the distance and the arm, reaching
    // east-north-east, is seen side on.
    camera: "site",
    flight: 3,
    focus: ["ITRF", PAD.name],
    // The slewing ring shares the shoulder's origin (the column's top): one
    // triad there, the shoulder's.
    triads: () => ARM_FRAMES.filter((n) => n !== ARM.yaw),
    triadScale: 0.025,
    look: () => ({
      // Centred 35 m to the arm's right as seen, so the arm sits left of
      // the answer's callout.
      ...offsetPlace(PAD.longitude, PAD.latitude, 13, -12),
      range: 140,
      heading: 150,
      pitch: -22,
    }),
    bodies: (frames, k) => pageArm(frames.itrf, k).all,
    light: "camera",
    drawIn: ARM.tool,
    drawnView: {
      [ARM.tool]: `${MARK.name} seen from the tool: the straight line's length is the answer`,
    },
    diagramNote: `The arm's frames are defined by your app with the public Frame API, each with its spec sheet's accuracy. ${MARK.name}'s position comes in NAD83(2011) and goes through PROJ to ITRF, then down the arm.`,
    note: "The arm, its spec sheet and its survey are synthetic. Its pad frame is defined at NGS mark AK1155 on LC-39A's pad, at the datasheet's height (NAVD88 14.137 m, 16 m below the ellipsoid in ITRF2020): the ± is from that point, not a survey of LC-39A. About 1 m per metre along the line, 3.4 mm per metre of height, if the point moves.",
  },
};

/** The frame names the BIM site and the corridor add (their camera views). */
export const SITE_GRIDS = [BIM_SITE_GRID, CORRIDOR_SITE_GRID] as const;

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
