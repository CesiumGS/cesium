// The page's fixed copy: short row labels for results (UX review I14) and
// the guided tour's stops (R16, DESIGN.md "The tour"). Plain data, imported by
// the main thread.
import type { OverlayId } from "./panel/model.ts";
import type { TrueScaleKind } from "./panel/tourScale.ts";
import type { Comparison } from "./stress/groupInfo.ts";

/** Short row labels (60 characters or fewer), by result id; rows fall back to the title. */
export const RESULT_LABELS: Readonly<Record<string, string>> = {
  "projections.epsg-32610": "UTM 10N round trip, five points",
  "projections.epsg-32611": "UTM 11N round trip, five points",
  "projections.epsg-32612": "UTM 12N round trip, five points",
  "projections.epsg-32613": "UTM 13N round trip, five points",
  "projections.epsg-32614": "UTM 14N round trip, five points",
  "units.foot.same-place": "Same place, US and international feet",
  "units.foot.same-numbers": "Same numbers, US and international feet",
  "site-grids.round-trip.rotation-0.scale-1": "Site grid 0°, scale 1",
  "site-grids.round-trip.rotation-0.scale-1.0000375":
    "Site grid 0°, scale 1.0000375",
  "site-grids.round-trip.rotation-0.scale-0.99996":
    "Site grid 0°, scale 0.99996",
  "recorded-operations.geoid": "6420+6360 records GEOID18 once",
  "recorded-operations.missing-grid": "Missing Canadian geoid grid throws",
  "frame-tree.compositions.itrf-gcrf": "ITRF and GCRF, every route",
  "frame-tree.compositions.itrf-earth-icrf": "ITRF and EARTH_ICRF, every route",
  "frame-tree.compositions.itrf-eme2000": "ITRF and EME2000, every route",
  "frame-tree.compositions.itrf-hcrs": "ITRF and HCRS, every route",
  "frame-tree.compositions.itrf-moon-icrf": "ITRF and MOON_ICRF, every route",
  "time.leap-second.monotonic": "TT increases through the 2016 leap second",
  "time.leap-second.two-seconds": "One labelled second, two of TT",
  "time.eop-end": "Past the EOP table: throws with its dates",
  "trajectory.gap": "In an OEM gap: throws with the spans",
  "trajectory.moon-me.distance": "Orion's distance from the Moon in MOON_ME",
  "trajectory.moon-me.round-trip": "Orion through MOON_ME and back",
  "measurement.grid-to-ground": "10,000 ftUS line, grid to ground",
  "measurement.clothoid": "Clothoid stations and offsets",
  "measurement.design-vs-itrf": "Design distance against ITRF distance",
  "reference-values.ngs-gu2195.grid": "GU2195 northing and easting",
  "reference-values.ngs-gu2195.convergence": "GU2195 convergence",
  "reference-values.ngs-ak7130.grid": "AK7130 northing and easting",
  "reference-values.ngs-aa5394.grid": "AA5394 northing and easting",
  "reference-values.iogp-transverse-mercator-forward":
    "IOGP Transverse Mercator, forward (method)",
  "vertical-profile.parabola.elevations": "Vertical curve elevations",
  "vertical-profile.parabola.high-point": "Vertical curve high point",
  "vertical-profile.parabola.k": "Vertical curve K value",
  "distortion.web-mercator-scale.k-0": "Web Mercator scale at 0°",
  "distortion.web-mercator-scale.k-45": "Web Mercator scale at 45°",
  "distortion.low-distortion.portland": "Portland low-distortion zone",
  "rigid-placement-budget.extents.lat-0-1mm": "Rigid extent at 0°, 1 mm",
  "rigid-placement-budget.extents.lat-0-1cm": "Rigid extent at 0°, 1 cm",
  "rigid-placement-budget.extents.lat-0-10cm": "Rigid extent at 0°, 10 cm",
  "coordinate-epoch.nad83-itrf2014.helmert-iogp-position-vector":
    "IOGP Helmert, position vector",
  "coordinate-epoch.nad83-itrf2014.helmert-iogp-time-dependent":
    "IOGP Helmert, time-dependent",
  "coordinate-epoch.nad83-itrf2014.no-epoch": "Leaving the epoch out",
  "axes-and-the-antimeridian.axes.epsg-4326": "EPSG:4326, longitude first",
  "axes-and-the-antimeridian.axes.northing-first": "EPSG:31467, northing first",
  "axes-and-the-antimeridian.antimeridian.zone-1": "UTM 1N at ±179.999°",
  "space.dss43-orion.light-time": "DSS-43 light time to Orion",
  "space.dss43-orion.doppler": "DSS-43 Doppler from Orion",
  "space.effects.earth-orientation": "Earth orientation at the flyby",
  "operation-candidates.ed50-north-sea.candidates":
    "ED50 candidates, North Sea",
  "operation-candidates.ed50-north-sea.recorded": "ED50 recorded candidate",
  "operation-candidates.ed50-north-sea.spread": "Spread of ED50 candidates",
  "ifc-map-conversion.ifc43-utm.origin": "IFC 4.3 model origin, UTM",
  "ifc-map-conversion.ifc43-utm.elevation": "IFC 4.3 model origin height",
  "ifc-map-conversion.ifc43-utm.gauss-kruger": "IFC 4.3 model origin, DHDN",
  "plate-motion.gda94-gda2020.hand": "GDA94 to GDA2020, hand Helmert",
  "plate-motion.gda94-gda2020.library": "GDA94 to GDA2020, the library",
  "plate-motion.gda94-gda2020.shift": "GDA94 to GDA2020 shift at ALIC",
  "below-the-ellipsoid.elevation-factor.equator.500":
    "Elevation factor, −500 m at 0°",
  "below-the-ellipsoid.elevation-factor.equator.2000":
    "Elevation factor, −2,000 m at 0°",
  "below-the-ellipsoid.tunnel.portal-level": "Tunnel line at portal level",
  "heights-and-wgs84.nad83-itrf2014": "NAD83(2011) against ITRF2014",
  "heights-and-wgs84.wgs84-ensemble": "WGS 84 ensemble accuracy",
  "heights-and-wgs84.three-heights.separation": "Geoid separation at GU2195",
  "bound-crss.ed50-utm31n.source-crs": "ED50 / UTM 31N: units and factors",
  "bound-crss.ed50-utm31n.recorded-operation":
    "ED50 / UTM 31N: its own Helmert",
  "bound-crss.ed50-utm31n.accuracy": "ED50 / UTM 31N: stated accuracy",
  "bound-crss.tokyo-jprcs-ix.accuracy": "Tokyo JPRCS IX: stated accuracy",
  "bound-crss.wgs84-utm31n.registry": "WGS 84 / UTM 31N against the registry",
  "time-scales.offsets.tt-tai": "TT − TAI is 32.184 s",
  "time-scales.offsets.gps-zero": "TAI − UTC at GPS zero",
  "time-scales.gps-utc-leap.step": "GPS − UTC steps at the 2016 leap",
  "lunar-time.moon-vs-earth.synodic": "Lunar clock gain, synodic month",
  "lunar-time.moon-vs-earth.sidereal": "Lunar clock gain, sidereal month",
};

/**
 * What a result is compared against, where it differs from its group's
 * (groupInfo.ts `compared`): the Measurement card mixes a hand formula, a
 * round trip and an independent route.
 */
const RESULT_COMPARED: Readonly<Record<string, Comparison>> = {
  "measurement.clothoid": {
    kind: "roundTrip",
    text: "Each point's station and offset, given back by the alignment from the point it placed.",
  },
  "measurement.design-vs-itrf": {
    kind: "independent",
    text: "The same distance measured from the design point fixed in ITRF first.",
  },

  "trajectory.moon-me.distance": {
    kind: "independent",
    text: "Orion's distance from the Moon's centre before the conversion to MOON_ME: a rotation about the centre keeps it.",
  },
  "trajectory.moon-me.round-trip": {
    kind: "roundTrip",
    text: "Orion's position after the trip to MOON_ME and back.",
  },
};

/**
 * The Bound CRSs card's checks by their last id part (`bound-crss.<crs>.<check>`,
 * the catalog's and "Try your own"'s alike). Only `helmert` is the group's
 * hand-coded Helmert, so it isn't listed.
 */
const BOUND_CRS_COMPARED: Readonly<Record<string, Comparison>> = {
  frame: {
    kind: "independent",
    text: "The CRS builds an engineering frame, or the error that it can't.",
  },
  "source-crs": {
    kind: "independent",
    text: "The source CRS's own axis unit, type and grid factors: its WKT, and a frame on the source CRS alone.",
  },
  "recorded-operation": {
    kind: "independent",
    text: "The WKT's own TOWGS84 numbers and convention, against the operation PROJ records.",
  },
  "round-trip": {
    kind: "roundTrip",
    text: "The design point after design → body-fixed → design, at three heights.",
  },
  registry: {
    kind: "formula",
    text: "The EPSG record's parameters by hand where there is one; otherwise PROJ's best registry operation, shown, not judged.",
  },
  accuracy: {
    kind: "independent",
    text: "Shown, not judged: the accuracy the measurement states for the frame.",
  },
};

/** A plain EPSG code's checks in the Bound CRSs card: against its EPSG record. */
const EPSG_RECORD_COMPARED: Readonly<Record<string, Comparison>> = {
  "recorded-operation": {
    kind: "published",
    text: "The EPSG record's Helmert parameters, as the registry prints them, against the operation PROJ records.",
  },
  helmert: {
    kind: "formula",
    text: "The EPSG record's Helmert coded by hand (IOGP 373-7-2).",
  },
  "round-trip": BOUND_CRS_COMPARED["round-trip"]!,
};

/** The inspector's "Compared against" for result `id`: its own, else its group's. */
export function comparedFor(id: string, group: Comparison): Comparison {
  const own = RESULT_COMPARED[id];
  if (own) {
    return own;
  }
  if (id.startsWith("bound-crss.")) {
    const check = id.slice(id.lastIndexOf(".") + 1);
    // A plain EPSG code (`bound-crss.epsg-<code>.<check>`) is checked against
    // its EPSG record, not a WKT's TOWGS84.
    if (/^bound-crss\.epsg-\d+\./.test(id)) {
      return EPSG_RECORD_COMPARED[check] ?? group;
    }
    return BOUND_CRS_COMPARED[check] ?? group;
  }
  return group;
}

/**
 * What a card's "Run this group" asks the worker for: its group, or for the
 * virtual Reproducibility card, which collects other groups' fingerprinted
 * results, those results' ids (the runner runs the cases that make them).
 */
export function groupRunIds(
  group: string,
  fingerprinted: readonly string[],
): string[] {
  return group === "reproducibility" ? [...fingerprinted] : [group];
}

/** A tour stop (R16): its caption, the overlays it turns on and where the camera goes. */
export interface TourStopSpec {
  id: string;
  title: string;
  caption: string;
  overlays: readonly OverlayId[];
  /** The camera: a named framing (`main.ts` places each). */
  camera:
    | "opening"
    | "earthFrames"
    | "northPole"
    | "stay"
    | "designGrid"
    | "rigidVsExact"
    | "earthMoon"
    | "lunarSite";
  /**
   * Dim the imagery: exposure compensation −0.6 (`true`, under an engineering
   * subject), or per width, as stop 2 needs (F43; see `stopExposure`).
   */
  dim?: true | { readonly wide: number; readonly narrow: number };
  /** The clock: plays at this rate while the stop shows. */
  rate?: number;
  /**
   * The caption's "Show true scale" switch, at a stop that exaggerates: the
   * convergence angle or the rigid line's separation.
   */
  trueScaleSwitch?: TrueScaleKind;
  /**
   * The clock: set to this UTC instant (ISO 8601) when the stop opens, so a
   * site is in daylight. Stops without it keep the clock where it is.
   */
  time?: string;
  /** Light the globe from the camera instead of the clock's sun (stop 2, S-I6). */
  light?: "camera";
  /** Orion's draw-in frame at this stop. */
  orionFrame?: "GCRF" | "MOON_ME";
  /**
   * Draw only the geocentric triads (stop 2): a site's triad, the Sacramento
   * one at the top of the view from the pole, crosses GCRF's turning x axis.
   */
  geocentricOnly?: boolean;
}

/** Below this view width the HUD goes compact and the caption folds (I18, F42). */
export const NARROW_VIEW = 560;

/** 13:00 PDT on the flyby day: local midday for the California stops. */
const CALIFORNIA_MIDDAY = "2026-04-06T20:00:00Z";

/** The engineering stops' dimming (DESIGN.md "Lines"). */
const DIM = -0.6;

/** The exposure compensation (stops) while `stop` shows in a view `viewWidth` px wide. */
export function stopExposure(
  stop: TourStopSpec | undefined,
  viewWidth: number,
): number {
  const dim = stop?.dim;
  if (dim === undefined) {
    return 0;
  }
  if (dim === true) {
    return DIM;
  }
  return viewWidth < NARROW_VIEW ? dim.narrow : dim.wide;
}

/** The sites whose triads are drawn by default, beside ITRF's and GCRF's. */
export const SITE_TRIADS = ["Sacramento ENU", "Lunar south-pole site"] as const;

/**
 * The triads drawn whatever is selected: ITRF and GCRF, and the sites unless
 * the tour stop draws the geocentric pair alone. A selected frame's path and
 * a result's frames are drawn on top of these.
 */
export function defaultTriads(stop: TourStopSpec | undefined): string[] {
  return [
    "ITRF",
    "GCRF",
    ...(stop?.geocentricOnly === true ? [] : SITE_TRIADS),
  ];
}

export const TOUR: readonly TourStopSpec[] = [
  {
    id: "earth-frames",
    title: "Earth's frames",
    caption:
      "ITRF turns with the Earth; GCRF doesn't. Each triad is a frame's axes at the clock's time: ITRF's with cones, GCRF's with square heads. Lit from the camera.",
    overlays: ["triads"],
    camera: "earthFrames",
    light: "camera",
  },
  {
    id: "gcrf-itrf-day",
    title: "GCRF to ITRF over a day",
    caption:
      "Seen from above the north pole: the globe is drawn Earth-fixed, so GCRF's x and y turn once round against ITRF's, like clock hands, in a sidereal day. The clock plays at 3,600×; the globe is lit from the camera so the turn stays visible through the night.",
    overlays: ["triads"],
    camera: "northPole",
    rate: 3600,
    light: "camera",
    // Lit from the camera, the polar globe washes out behind the axes (UX
    // re-check 3). At desktop width the eye's auto-exposure brightens the
    // small globe on black, so it takes −1.5 there (F43).
    dim: { wide: -1.5, narrow: -0.6 },
    geocentricOnly: true,
  },
  {
    id: "design-grid",
    title: "The California design grid",
    caption:
      "Grid north and true north part ways away from the central meridian: the convergence angle is −0° 39′ at the grid's west edge. True north is drawn with that angle 20 times larger so the lean shows; Show true scale draws it as it is.",
    overlays: ["designGrid"],
    camera: "designGrid",
    dim: true,
    // 13:00 Pacific daylight time, local midday in California.
    time: CALIFORNIA_MIDDAY,
    trueScaleSwitch: "convergence",
  },
  {
    id: "rigid-exact",
    title: "Rigid against exact",
    caption:
      "A 20 km design line placed rigidly at its start parts from the exact one by about 31 m at its far end. Their separation is drawn 50 times larger so the gap shows; the leader gives the true figure.",
    overlays: ["rigidVsExact"],
    camera: "rigidVsExact",
    time: CALIFORNIA_MIDDAY,
    trueScaleSwitch: "sag",
  },
  {
    id: "orion",
    title: "Orion's figure-eight",
    caption:
      "Drawn in GCRF, Artemis II loops the Moon in a figure-eight; switch Orion's path to MOON_ME to see it swing round the far side.",
    overlays: ["orion"],
    camera: "earthMoon",
    orionFrame: "GCRF",
  },
  {
    id: "lunar-time",
    title: "The Moon's south pole and lunar time",
    caption:
      "A clock at the lunar south pole gains about 56 µs a day on one on Earth. The triad holds still as you orbit it, 384,000 km from the Earth-fixed origin.",
    overlays: ["triads"],
    camera: "lunarSite",
  },
];
