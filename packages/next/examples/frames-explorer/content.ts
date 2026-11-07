// The page's fixed copy: short row labels for results (UX review I14) and
// what each is compared against. Plain data, imported by the main thread.
// (The guided tour that was here gave way to the scenarios, scenarios/.)
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
  "frame-tree.compositions.itrf-gcrf":
    "ITRF ↔ GCRF, checked by every route through the tree (including frames this scenario doesn't draw)",
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
  "space.moon-from-sacramento.direction":
    "The Moon's direction from Sacramento",
  "space.moon-from-sacramento.range": "The Moon's range from Sacramento",
  "space.moon-from-sacramento.horizon": "The Moon's azimuth and elevation",
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
  "space.effects.moon-me-pa": "MOON_ME against MOON_PA at the south pole",
  "frame-tree.compositions.itrf-gcrf.live":
    "ITRF ↔ GCRF at your time, checked by every route through the tree (including frames this scenario doesn't draw)",
  "trajectory.moon-me.distance.live": "Orion by two routes, in your frame",
  "trajectory.moon-me.round-trip.live": "Orion through your frame and back",
  "stand-on-moon.site-triad": "The site's axes, at your latitude",
  "stand-on-moon.site-round-trip": "The site through ICRF and back",
  "frame-tree.body-frame.heading": "A track's heading against its hand azimuth",
  "frame-tree.body-frame.level": "A level body's z along the local up",
  "frame-tree.body-frame.roll": "A 10° roll turns y about x by 10°",
  "frame-tree.body-frame.footprint":
    "The camera's footprint on flat ground, by hand",
  "frame-tree.body-frame.round-trip":
    "Camera mount and mast sensor to ITRF and back",
  "frame-tree.body-frame.sight-over-hill":
    "Sight line over a test hill: blocked, then clear",
  "frame-tree.body-frame.heading.live": "The heading at your setting, by hand",
  "frame-tree.body-frame.level.live": "The drone level at your setting",
  "frame-tree.body-frame.roll.live": "The sea state's roll now, by hand",
  "frame-tree.body-frame.footprint.live":
    "Your tilt's footprint on flat ground, by hand",
  "frame-tree.body-frame.round-trip.live": "Your frames to ITRF and back",
  "frame-tree.body-frame.sight-over-hill.live":
    "Your mast over the test hill, by hand",
  // The robot arm (Task 7b).
  "reference-values.ngs-di3564.itrf2020":
    "CCV6 through PROJ against NGS's own ITRF2020 computation",
  "frame-tree.joint-chain.forward-kinematics":
    "The arm's tool at three poses against the closed form",
  "frame-tree.joint-chain.accuracy":
    "The tool's composed accuracy against the lever-arm rule",
  "frame-tree.joint-chain.round-trip": "The arm's joints to ITRF and back",
  "frame-tree.joint-chain.forward-kinematics.live":
    "Your pose's tool against the closed form",
  "frame-tree.joint-chain.accuracy.live":
    "Your pose's accuracy against the lever-arm rule",
  "frame-tree.joint-chain.round-trip.live":
    "Your pose's joints to ITRF and back",
};

/**
 * What a result is compared against, where it differs from its group's
 * (groupInfo.ts `compared`): the Measurement card mixes a hand formula, a
 * round trip and an independent route.
 */
const RESULT_COMPARED: Readonly<Record<string, Comparison>> = {
  // The drone's and the ship's frames from their tracks (Task 7).
  "frame-tree.body-frame.heading": {
    kind: "formula",
    text: "The track's horizontal velocity's azimuth, resolved on east and north from latitude and longitude by hand: within 10⁻⁹°.",
  },
  "frame-tree.body-frame.level": {
    kind: "formula",
    text: "The geodetic normal from latitude and longitude by hand: within 10⁻¹² rad.",
  },
  "frame-tree.body-frame.roll": {
    kind: "formula",
    text: "The roll angle itself: it turns y about x by that much, within 10⁻¹² rad.",
  },
  "frame-tree.body-frame.footprint": {
    kind: "formula",
    text: "The ray–plane intersection by hand, (H − gimbal)/tan(tilt) ahead of the nadir: within 1 mm plus d²/2R ÷ sin(tilt).",
  },
  "frame-tree.body-frame.sight-over-hill": {
    kind: "formula",
    text: "The segment's height over the ridge's crest by hand: blocked below it, clear above it and its tile's error.",
  },
  // The robot arm's chain against its hand closed form and lever-arm rule (Task 7b).
  "frame-tree.joint-chain.forward-kinematics": {
    kind: "formula",
    text: "The closed-form planar solution by hand: the boom, forearm and tool at their summed elevations, turned by the yaw: within 10⁻⁹ m.",
  },
  "frame-tree.joint-chain.accuracy": {
    kind: "formula",
    text: "Each encoder's angle times the tool's distance from that joint, the links and the base's survey, root-sum-square, worked by hand: within 1 nm.",
  },
  // The BIM site's gap in its two parts, not the group's √(2Rε) (Task 6a fix 1).
  "rigid-placement-budget.site-gap.drop": {
    kind: "formula",
    text: "d²/2R by hand, R the ellipsoid's radius of curvature in the site axis's true azimuth: within 1 mm.",
  },
  "rigid-placement-budget.site-gap.along": {
    kind: "formula",
    text: "d(s/k̄ − 1) + d³/3R² by hand, k̄ the grid's mean scale along the line: within 1 mm.",
  },
  "measurement.clothoid": {
    kind: "roundTrip",
    text: "Each point's station and offset, given back by the alignment from the point it placed.",
  },
  "measurement.design-vs-itrf": {
    kind: "independent",
    text: "The same distance measured from the design point fixed in ITRF first.",
  },

  // The Moon from Sacramento against JPL Horizons, not plan 3's SPICE fixture (Task 6b).
  "space.moon-from-sacramento.direction": {
    kind: "published",
    text: "JPL Horizons' astrometric R.A. and DEC (ICRF, light time) of the Moon from the same site: within 0.01″.",
  },
  "space.moon-from-sacramento.range": {
    kind: "published",
    text: "JPL Horizons' delta, the light-time range, from the same site: within 1 m.",
  },
  "space.moon-from-sacramento.horizon": {
    kind: "published",
    text: "Shown, not judged: JPL Horizons' airless apparent azimuth and elevation, about 0.3″ from ours for a reason not yet found.",
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

/** Below this view width the HUD goes compact (I18, F42). */
export const NARROW_VIEW = 560;
