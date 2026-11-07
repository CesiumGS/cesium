// The ten scenarios, in the strip's order: open on the most striking for a
// graphics engineer (one trajectory that looks utterly different in three
// frames), work down from space to the ground, and end on the capstone.
//
// Each checked setup is where the scenario's `proof` (stress-catalog result
// ids) really applies: the catalog case's own epoch, site and parameters.
// The comment beside each says which. Scenarios whose checks arrive with
// their own tasks carry `proof: []` until then (ruling S1).
import type { KnobSpec, ScenarioSpec } from "./spec.ts";

/** The catalog's measurement epoch (stress/shared.ts MEASURED_AT). */
const MEASURED_AT = "2026-03-01T00:00:00Z";

/** The lunar flyby (stress/shared.ts FLYBY). */
const FLYBY = "2026-04-06T23:00:00Z";

/**
 * signal.json's "spread" row at TDB 828752222.2056508 s past J2000, in UTC
 * (to the ms): Orion 1.315 light-seconds from DSS-43 and 28° above its
 * horizon, so the dish can see it. The catalog's space.dss43-orion uses this
 * row (it isn't in one of the OEM's gaps).
 */
const SIGNAL_ROW = "2026-04-06T12:55:53.020Z";

const HEIGHT_DATUM: KnobSpec = {
  id: "datum",
  label: "Height datum",
  kind: "choice",
  options: [
    { value: "ellipsoid", label: "Ellipsoid (GRS 80)" },
    { value: "navd88", label: "NAVD88 (through GEOID18)" },
  ],
};

/** The capstone's objects, one on each branch of the tree. */
const CAPSTONE_OBJECTS: KnobSpec["options"] = [
  { value: "dish", label: "The dish" },
  { value: "ship", label: "The ship" },
  { value: "orion", label: "Orion" },
  { value: "lunar-site", label: "The lunar site" },
];

export const SCENARIOS: readonly ScenarioSpec[] = [
  {
    id: "one-path",
    title: "One path, three frames",
    // The headline answers it directly: the speed in the drawn-in frame
    // (fix 1: the owner, "the questions and answers don't line up").
    question: "How fast is Orion going?",
    knobs: [
      {
        id: "frame",
        label: "Draw Orion's path in",
        kind: "choice",
        options: [
          { value: "GCRF", label: "GCRF (inertial, Earth-centred)" },
          { value: "ITRF", label: "ITRF (turning with the Earth)" },
          { value: "MOON_ME", label: "MOON_ME (fixed to the Moon)" },
        ],
      },
    ],
    // trajectory.moon-me.*: Orion at the flyby, converted to MOON_ME.
    checked: { epochUtc: FLYBY, knobs: { frame: "MOON_ME" } },
    needs: ["orion"],
    globe: "ellipsoid",
    proof: ["trajectory.moon-me.distance", "trajectory.moon-me.round-trip"],
  },
  {
    id: "earth-turns",
    title: "The Earth turns",
    question: "Where is Greenwich pointing, against the stars?",
    knobs: [
      {
        id: "rate",
        label: "Clock rate",
        kind: "range",
        min: 1,
        max: 86_400,
        step: 1,
        unit: "×",
      },
    ],
    // frame-tree.compositions.itrf-gcrf samples ITRF and GCRF at five
    // instants; this is one of them (the March equinox). 3,600× is the old
    // tour's GCRF-to-ITRF stop: a sidereal day in about 24 seconds.
    checked: { epochUtc: "2026-03-20T12:00:00Z", knobs: { rate: 3600 } },
    needs: [],
    globe: "ellipsoid",
    proof: ["frame-tree.compositions.itrf-gcrf"],
  },
  {
    id: "moon-from-here",
    title: "Where's the Moon from here?",
    question: "Where is it in the sky, and how far?",
    knobs: [],
    // frame-tree.compositions.itrf-moon-icrf samples ITRF and MOON_ICRF (the
    // path from a California site to the Moon, through ICRF) at five
    // instants; at this one, the June solstice, the Moon is 18° above
    // Sacramento's horizon.
    checked: { epochUtc: "2026-06-21T06:00:00Z", knobs: {} },
    needs: [],
    globe: "ellipsoid",
    proof: ["frame-tree.compositions.itrf-moon-icrf"],
  },
  {
    id: "stand-on-moon",
    title: "Stand on the Moon",
    question: "How fast does a clock here run?",
    knobs: [
      {
        id: "latitude",
        label: "Site latitude",
        kind: "range",
        min: -90,
        max: 90,
        step: 0.5,
        unit: "°",
      },
    ],
    // lunar-time.moon-vs-earth.synodic: a clock at the lunar south pole,
    // averaged over a synodic month from 2026-01-01T00:00 UTC, against Ashby
    // & Patla (its sidereal twin is display-only, so it isn't proof). The
    // MOON_ME-to-MOON_PA offset (space.effects.moon-me-pa) is also at the
    // south pole; it is a constant rotation, so it holds at any epoch.
    checked: { epochUtc: "2026-01-01T00:00:00Z", knobs: { latitude: -90 } },
    needs: [],
    globe: "ellipsoid",
    proof: ["lunar-time.moon-vs-earth.synodic", "space.effects.moon-me-pa"],
  },
  {
    id: "dish-tracks",
    title: "A dish tracks a spacecraft",
    question:
      "Where do I point, how long does the signal take, and can I see it?",
    knobs: [
      {
        id: "station",
        label: "Station",
        kind: "choice",
        options: [
          { value: "DSS-14", label: "Goldstone (DSS-14)" },
          { value: "DSS-43", label: "Canberra (DSS-43)" },
          { value: "DSS-63", label: "Madrid (DSS-63)" },
        ],
      },
    ],
    // space.dss43-orion.*: DSS-43's light time and Doppler against plan 3's
    // SPICE fixture, at signal.json's rows; this is one of them.
    checked: { epochUtc: SIGNAL_ROW, knobs: { station: "DSS-43" } },
    needs: ["orion"],
    globe: "ellipsoid",
    proof: ["space.dss43-orion.light-time", "space.dss43-orion.doppler"],
  },
  {
    id: "bim-site",
    title: "A BIM site on the globe",
    question:
      "Where exactly does this model sit, and how far off would a rigid placement be?",
    knobs: [
      {
        id: "site",
        label: "Site",
        kind: "choice",
        options: [
          {
            value: "san-francisco",
            label: "San Francisco: the catalog's California measurement site",
            short: "San Francisco",
          },
          {
            value: "portland",
            label: "Portland, Oregon: the OCRS Portland zone's origin",
            short: "Portland",
          },
        ],
      },
      {
        id: "crs",
        label: "Design CRS",
        kind: "choice",
        options: [
          {
            value: "ca-zone-3",
            label:
              "California zone 3 (EPSG:6420), state plane, US survey feet; it covers San Francisco only",
            short: "CA zone 3",
          },
          {
            value: "utm-10n",
            label: "UTM zone 10N (EPSG:32610), metres; it covers both sites",
            short: "UTM 10N",
          },
          {
            value: "low-distortion",
            label:
              "Oregon's Portland zone (EPSG:6854), a low-distortion projection, metres; it covers Portland only",
            short: "Portland LDP",
          },
        ],
      },
      {
        id: "rotation",
        label: "Site rotation",
        kind: "range",
        min: -180,
        max: 180,
        step: 0.5,
        unit: "°",
      },
      {
        id: "scale",
        label: "Site scale",
        kind: "range",
        min: 0.9999,
        max: 1.0001,
        step: 0.0000005,
      },
    ],
    // The catalog's measurement site on EPSG:6420 (+6360, GEOID18), rotated
    // 12.5° and scaled 1.0000375, at its measurement epoch:
    // measurement.grid-to-ground and measurement.design-vs-itrf, the site
    // grid's round trip at that rotation and scale, and the CRS's own round
    // trip; and the answer itself, the gap 20 km out against its hand
    // formula, the drop and the part along the line each within 1 mm
    // (rigid-placement-budget.site-gap.drop and .along, Task 6a fix 1). (NGS GU2195's
    // convergence is checked about 115 km away, so it isn't the site's true
    // north and isn't proof here.)
    checked: {
      epochUtc: MEASURED_AT,
      knobs: {
        site: "san-francisco",
        crs: "ca-zone-3",
        rotation: 12.5,
        scale: 1.0000375,
      },
    },
    // The scenario's own frames are 2D (ellipsoidal heights): GEOID18 is
    // only its compound-CRS proof checks' need, which the catalog meets.
    needs: ["proj"],
    // Task 6a's ruling: the ellipsoid. The exact line lies at height 0, so
    // its gap from the rigid line reads against the ground it curves with;
    // terrain would lift the line by up to 3 km along its 400 km, swamping
    // a 31 m gap, and a lift for display would be a second, misleading
    // height.
    globe: "ellipsoid",
    proof: [
      "rigid-placement-budget.site-gap.drop",
      "rigid-placement-budget.site-gap.along",
      "measurement.grid-to-ground",
      "measurement.design-vs-itrf",
      "site-grids.round-trip.rotation-12.5.scale-1.0000375",
      "projections.epsg-6420-6360",
    ],
    checkedBy: "hand formulas and round trips",
    proofNotes: Object.fromEntries(
      [
        "measurement.grid-to-ground",
        "measurement.design-vs-itrf",
        "site-grids.round-trip.rotation-12.5.scale-1.0000375",
        "projections.epsg-6420-6360",
      ].map((id) => [
        id,
        "Checked in the compound CRS, California zone 3 with NAVD88 heights through GEOID18; the scenario uses the 2D CRS with ellipsoidal heights, so it carries over in E and N only.",
      ]),
    ),
  },
  {
    id: "corridor",
    title: "Survey a corridor",
    question: "What station and offset is this point at?",
    knobs: [
      {
        id: "station",
        label: "Station",
        kind: "range",
        min: 0,
        max: 2000,
        step: 1,
        unit: "ft",
      },
      {
        id: "offset",
        label: "Offset",
        kind: "range",
        min: -50,
        max: 50,
        step: 0.5,
        unit: "ft",
      },
    ],
    // The catalog's clothoid road (stations 0 to 2,000) at one of
    // measurement.clothoid's points: station 650, in the entry spiral, 15
    // right. It recovers every one of its points within 1e-9 design units.
    checked: { epochUtc: MEASURED_AT, knobs: { station: 650, offset: 15 } },
    needs: ["proj"],
    globe: "ellipsoid",
    proof: ["measurement.clothoid"],
    checkedBy: "hand formulas and round trips",
  },
  {
    id: "drone",
    title: "A drone over the site",
    question: "What is the camera looking at on the design grid?",
    knobs: [
      {
        id: "tilt",
        label: "Camera tilt below the horizon",
        kind: "range",
        min: 0,
        max: 90,
        step: 1,
        unit: "°",
      },
      {
        id: "along",
        label: "Position along the track",
        kind: "range",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
      },
      HEIGHT_DATUM,
    ],
    // Over the BIM site, at its epoch. Its proof comes with Task 8.
    checked: {
      epochUtc: MEASURED_AT,
      knobs: { tilt: 45, along: 50, datum: "navd88" },
    },
    needs: ["proj", "geoid", "terrain"],
    globe: "terrain",
    proof: [],
  },
  {
    id: "ship",
    title: "A ship enters San Francisco Bay",
    question:
      "Where is the ship on the port's design grid, and can the mast see the buoy past the headland?",
    knobs: [
      {
        id: "mast",
        label: "Mast sensor height",
        kind: "range",
        min: 5,
        max: 60,
        step: 0.5,
        unit: "m",
      },
      HEIGHT_DATUM,
    ],
    // A placeholder epoch: Task 7 pins it to the track's (AIS or
    // synthetic), and adds its proof.
    checked: { epochUtc: MEASURED_AT, knobs: { mast: 25, datum: "navd88" } },
    needs: ["proj", "geoid", "terrain", "ships"],
    globe: "terrain",
    proof: [],
  },
  {
    id: "everything",
    title: "Everything at once",
    question:
      "Pick any two, and get their distance, light time and line of sight, with the path through the tree lit.",
    knobs: [
      {
        id: "from",
        label: "From",
        kind: "choice",
        options: CAPSTONE_OBJECTS,
      },
      {
        id: "to",
        label: "To",
        kind: "choice",
        options: CAPSTONE_OBJECTS,
      },
    ],
    // The ship and the lunar site meet only at ICRF: the longest path
    // through the tree. At the dish's signal row, while Orion is in
    // transit. Its proof comes with Task 8.
    checked: {
      epochUtc: SIGNAL_ROW,
      knobs: { from: "ship", to: "lunar-site" },
    },
    needs: ["orion", "terrain", "ships"],
    globe: "terrain",
    proof: [],
  },
];
