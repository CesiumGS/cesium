// The stub's stand-ins for what 6b adds to each case (rulings F27, F28; UX
// review I14, I15): a short row label, the accuracy note that applies when a
// result states no position, and what its expected value is.
import type { Comparison } from "./model.ts";

/** Short row labels (60 characters or fewer), by result id. */
export const STUB_LABELS: Readonly<Record<string, string>> = {
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

/** F27's accuracy note, per group, for results with no position statement. */
export const GROUP_ACCURACY_NOTE: Readonly<Record<string, string>> = {
  projections: "exact arithmetic: a round trip",
  units: "exact arithmetic: unit definitions",
  "site-grids": "exact arithmetic: the site formula",
  "recorded-operations": "the recorded operation itself",
  "frame-tree": "exact arithmetic: compositions",
  time: "exact arithmetic: time scales",
  trajectory: "the OEM's own coverage",
  measurement: "exact arithmetic: the design geometry",
  "reference-values": "published value ± half its last digit",
  "vertical-profile": "exact arithmetic: the design manual's formulas",
  distortion: "hand formula, exact to 10⁻⁹",
  "rigid-placement-budget": "hand formula √(2Rε), within 10%",
  "coordinate-epoch": "published example ± its rounding",
  "axes-and-the-antimeridian": "published value ± half its last digit",
  space: "SPICE fixture, plan 3's tolerances",
  "operation-candidates": "the EPSG registry's stated accuracies",
  "ifc-map-conversion": "published IfcSite ± half its last digit",
  "plate-motion": "published manual values ± rounding",
  "below-the-ellipsoid": "hand formula R/(R + h), exact to 10⁻¹²",
  "heights-and-wgs84": "datasheet values ± half the last digit",
  "bound-crss": "the WKT's own parameters, hand Helmert",
  "time-scales": "exact by definition: IERS and IS-GPS-200",
  "lunar-time": "Ashby & Patla (2024), within 2%",
};

/** What each group's expected values are, for the inspector's "Compared against". */
export const GROUP_COMPARED: Readonly<Record<string, Comparison>> = {
  projections: {
    kind: "roundTrip",
    text: "The input itself, after forward and inverse: this proves the library agrees with itself, not that it's right (Reference values does that).",
  },
  units: {
    kind: "formula",
    text: "The foot definitions' ratio, (1200/3937)/0.3048, by hand.",
  },
  "site-grids": {
    kind: "formula",
    text: "The site formula (rotate by θ, scale by s) by hand, then a round trip.",
  },
  "recorded-operations": {
    kind: "independent",
    text: "The pipeline PROJ records, against the grid the CRS names.",
  },
  "frame-tree": {
    kind: "roundTrip",
    text: "The same transform by every route through the tree: self-consistency.",
  },
  time: {
    kind: "formula",
    text: "UTC's leap-second rule by hand (Bulletin C 52).",
  },
  trajectory: {
    kind: "error",
    text: "The OEM's covered spans, and a round trip through MOON_ME.",
  },
  measurement: {
    kind: "formula",
    text: "Design distance × site scale × metres per foot ÷ the combined factor, by hand.",
  },
  "reference-values": {
    kind: "published",
    text: "NGS datasheets and IOGP 373-7-2 worked examples, copied verbatim.",
  },
  "vertical-profile": {
    kind: "published",
    text: "The design manual's worked vertical curve.",
  },
  distortion: {
    kind: "formula",
    text: "√(1 − e² sin² φ) / cos φ and the handbook's target band, by hand.",
  },
  "rigid-placement-budget": {
    kind: "formula",
    text: "√(2Rε): the extent where a flat site leaves the ellipsoid by ε.",
  },
  "coordinate-epoch": {
    kind: "published",
    text: "IOGP 373-7-2's Helmert examples and EPSG 8970's parameters.",
  },
  "axes-and-the-antimeridian": {
    kind: "published",
    text: "GU2195's published UTM coordinates, and a round trip at ±180°.",
  },
  space: {
    kind: "independent",
    text: "Plan 3's SPICE fixture (spkpos, CN) and hand geometry.",
  },
  "operation-candidates": {
    kind: "published",
    text: "The EPSG registry's transformations 1311, 1133 and 1134.",
  },
  "ifc-map-conversion": {
    kind: "published",
    text: "IFC 4.3 Annex E's example: IfcSite latitude, longitude and height.",
  },
  "plate-motion": {
    kind: "published",
    text: "The GDA2020 technical manual's ALIC example (Table 3.2, Eq. 18).",
  },
  "below-the-ellipsoid": {
    kind: "formula",
    text: "R/(R + h) with R = √(MN), by hand.",
  },
  "heights-and-wgs84": {
    kind: "published",
    text: "GU2195's datasheet heights and the EPSG WGS 84 ensemble's 2 m.",
  },
  "bound-crss": {
    kind: "formula",
    text: "The WKT's TOWGS84 Helmert coded by hand (EPSG 9606).",
  },
  "time-scales": {
    kind: "published",
    text: "IERS Bulletin C 52 and IS-GPS-200N's GPS time.",
  },
  "lunar-time": {
    kind: "published",
    text: "Ashby & Patla (2024): 56.02 µs/day.",
  },
};
