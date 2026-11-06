// The page's fixed copy: short row labels for results (UX review I14) and
// the guided tour's stops (R16, DESIGN.md "The tour"). Plain data, imported by
// the main thread.
import type { OverlayId } from "./panel/model.ts";

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

/** A tour stop (R16): its caption, the overlays it turns on and where the camera goes. */
export interface TourStopSpec {
  id: string;
  title: string;
  caption: string;
  overlays: readonly OverlayId[];
  /** The camera: a named framing (`main.ts` places each). */
  camera:
    | "opening"
    | "stay"
    | "designGrid"
    | "rigidVsExact"
    | "earthMoon"
    | "lunarSite";
  /** Dim the imagery under an engineering subject (exposure compensation −0.6). */
  dim?: boolean;
  /** The clock: plays at this rate while the stop shows. */
  rate?: number;
  /** Light the globe from the camera instead of the clock's sun (stop 2, S-I6). */
  light?: "camera";
  /** Orion's draw-in frame at this stop. */
  orionFrame?: "GCRF" | "MOON_ME";
}

export const TOUR: readonly TourStopSpec[] = [
  {
    id: "earth-frames",
    title: "Earth's frames",
    caption:
      "ITRF turns with the Earth; GCRF doesn't. Each triad is a frame's axes at the clock's time.",
    overlays: ["triads"],
    camera: "opening",
  },
  {
    id: "gcrf-itrf-day",
    title: "GCRF to ITRF over a day",
    caption:
      "The globe is drawn Earth-fixed, so GCRF's triad turns once against ITRF's in a sidereal day. The clock plays at 3,600×; the globe is lit from the camera so the turn stays visible through the night.",
    overlays: ["triads"],
    camera: "stay",
    rate: 3600,
    light: "camera",
  },
  {
    id: "design-grid",
    title: "The California design grid",
    caption:
      "Grid north and true north part ways away from the central meridian: the convergence angle, −0° 39′ at the grid's west edge, drawn ×20 so it shows.",
    overlays: ["designGrid"],
    camera: "designGrid",
    dim: true,
  },
  {
    id: "rigid-exact",
    title: "Rigid against exact",
    caption:
      "A 20 km design line placed rigidly at its start parts from the exact one by about 31 m at its far end: drawn ×50 here so the gap shows, the leader labelled with the true figure.",
    overlays: ["rigidVsExact"],
    camera: "rigidVsExact",
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
