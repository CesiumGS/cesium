// The ten scenarios, in the strip's order: open on the most striking for a
// graphics engineer (one trajectory that looks utterly different in three
// frames), work down from space to the ground, and end on the capstone.
//
// Each checked setup is where the scenario's `checks` (stress-catalog result
// ids) really apply: the catalog case's own epoch, site and parameters. The
// comment beside each says which. Scenarios whose checks arrive with their
// own tasks carry `checks: []` until then (ruling S1). Each check's kind
// (scenarios/checks.ts) is derived from its result; `checkKinds` names it
// where it can't be.
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
    { value: "ellipsoid", label: "Ellipsoid (GRS 80)", short: "Ellipsoid" },
    {
      value: "navd88",
      label: "NAVD88 (through GEOID18)",
      short: "NAVD88",
    },
  ],
};

/**
 * The drone's and the ship's checks' kinds (Task 7): the body frame's are
 * hand formulas and round trips (no published value); GEOID18's NAVD88
 * height is checked against NGS's datasheet value, a cited computation
 * (the datasheet's geoid height is GEOID18's own), not a measurement.
 */
const BODY_CHECK_KINDS: ScenarioSpec["checkKinds"] = {
  "frame-tree.body-frame.heading": "hand",
  "frame-tree.body-frame.level": "hand",
  "frame-tree.body-frame.roll": "hand",
  "frame-tree.body-frame.footprint": "hand",
  "frame-tree.body-frame.sight-over-hill": "hand",
  "frame-tree.body-frame.round-trip": "roundTrip",
  "projections.epsg-6420-6360": "roundTrip",
  "heights-and-wgs84.three-heights.navd88": "published",
};

/** How far the drone's and the ship's catalog checks carry to them. */
const BODY_CHECK_NOTES: ScenarioSpec["checkNotes"] = {
  "projections.epsg-6420-6360":
    "Checked in the compound CRS, California zone 3 with NAVD88 heights through GEOID18, at the BIM site; the scenario reads easting and northing off the 2D CRS, so it carries over in E and N.",
  "heights-and-wgs84.three-heights.navd88":
    "Checked at NGS mark GU2195, about 115 km from here: it checks the path through GEOID18 that the height datum knob takes, not the geoid height here.",
  "frame-tree.body-frame.footprint":
    "Over flat test ground 150 m below the drone: it checks the camera's ray and the terrain trace by hand; the answer's terrain is the drawn globe's.",
  "frame-tree.body-frame.sight-over-hill":
    "Over a drawn test hill: it checks the trace's verdict by hand; the answer's terrain is the drawn globe's.",
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
    checks: ["trajectory.moon-me.distance", "trajectory.moon-me.round-trip"],
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
    checks: ["frame-tree.compositions.itrf-gcrf"],
  },
  {
    id: "moon-from-here",
    title: "Where's the Moon from here?",
    question: "Where is it in the sky, and how far?",
    knobs: [],
    // JPL Horizons' observer table for the Moon from Sacramento's site
    // (references.json jpl-horizons-moon-sacramento, Task 6b) at the June
    // solstice, 06:00 UTC, the Moon 18.65° above the horizon: the
    // astrometric direction and the light-time range against ours. And
    // frame-tree.compositions.itrf-moon-icrf, which samples ITRF and
    // MOON_ICRF (the path from the site to the Moon, through ICRF) at five
    // instants, this one among them. (Horizons' azimuth and elevation are
    // shown, not judged: space.moon-from-sacramento.horizon.)
    checked: { epochUtc: "2026-06-21T06:00:00Z", knobs: {} },
    needs: ["terrain"],
    // Task 6b: the terrain globe, for the local horizon's line of sight.
    globe: "terrain",
    checks: [
      "space.moon-from-sacramento.range",
      "space.moon-from-sacramento.direction",
      "frame-tree.compositions.itrf-moon-icrf",
    ],
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
    // & Patla (its sidereal twin is display-only, so it isn't a check). The
    // MOON_ME-to-MOON_PA offset (space.effects.moon-me-pa) is also at the
    // south pole; it is a constant rotation, so it holds at any epoch.
    checked: { epochUtc: "2026-01-01T00:00:00Z", knobs: { latitude: -90 } },
    needs: [],
    globe: "ellipsoid",
    checks: ["lunar-time.moon-vs-earth.synodic", "space.effects.moon-me-pa"],
    // R·sqrt(θx² + θy²) by hand: it cites the DE440 frame kernel for its
    // angles, its inputs, not for a value it is compared with.
    checkKinds: { "space.effects.moon-me-pa": "hand" },
  },
  {
    id: "dish-tracks",
    title: "A dish tracks Orion",
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
      {
        id: "view",
        label: "View",
        kind: "choice",
        view: true,
        options: [
          {
            value: "dish",
            label: "From the dish: its horizon, on the terrain",
            short: "From the dish",
          },
          {
            value: "orbit",
            label:
              "From orbit: the Earth and the Moon, Orion's path, every dish's line",
            short: "From orbit",
          },
        ],
      },
    ],
    // space.dss43-orion.*: DSS-43's light time and Doppler against plan 3's
    // SPICE fixture, at signal.json's rows; this is one of them.
    checked: {
      epochUtc: SIGNAL_ROW,
      knobs: { station: "DSS-43", view: "dish" },
    },
    // The stations come from the store's NAIF station SPK (the worker loads
    // it with the scenario); terrain is the page's, for the local horizon.
    needs: ["orion", "terrain"],
    globe: "terrain",
    checks: ["space.dss43-orion.light-time", "space.dss43-orion.doppler"],
    // Both cite DSN 810-005 for the station, their input. The light time is
    // against plan 3's SPICE fixture (signal.json), a cited independent
    // computation; the Doppler ratio against 1 − n·(vO − vS)/c by hand.
    checkKinds: {
      "space.dss43-orion.light-time": "published",
      "space.dss43-orion.doppler": "hand",
    },
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
    // north and isn't one of its checks.)
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
    // only its compound-CRS checks' need, which the catalog meets.
    needs: ["proj"],
    // Task 6a's ruling: the ellipsoid. The exact line lies at height 0, so
    // its gap from the rigid line reads against the ground it curves with;
    // terrain would lift the line by up to 3 km along its 400 km, swamping
    // a 31 m gap, and a lift for display would be a second, misleading
    // height.
    globe: "ellipsoid",
    checks: [
      "rigid-placement-budget.site-gap.drop",
      "rigid-placement-budget.site-gap.along",
      "measurement.grid-to-ground",
      "measurement.design-vs-itrf",
      "site-grids.round-trip.rotation-12.5.scale-1.0000375",
      "projections.epsg-6420-6360",
    ],
    checkedBy: "hand formulas and round trips",
    checkNotes: Object.fromEntries(
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
    checks: ["measurement.clothoid"],
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
    // Over the BIM site, at its epoch: halfway along its line (over the
    // model's site origin), the camera 45° down, its reported height read
    // as NAVD88 (Task 7). Its checks are hand formulas and round trips at
    // that pose (frame-tree.body-frame.*), California zone 3's round trip,
    // and GEOID18's NAVD88 height against NGS's at GU2195.
    checked: {
      epochUtc: MEASURED_AT,
      knobs: { tilt: 45, along: 50, datum: "navd88" },
    },
    needs: ["proj", "geoid", "terrain"],
    globe: "terrain",
    checks: [
      "frame-tree.body-frame.heading",
      "frame-tree.body-frame.level",
      "frame-tree.body-frame.footprint",
      "frame-tree.body-frame.round-trip",
      "projections.epsg-6420-6360",
      "heights-and-wgs84.three-heights.navd88",
    ],
    checkedBy: "hand formulas and round trips",
    checkKinds: BODY_CHECK_KINDS,
    checkNotes: BODY_CHECK_NOTES,
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
    // 80 minutes along its synthetic track (Task 7), in the main ship
    // channel's eastbound lane, a 25 m mast, the sea at NAVD88 0 m through
    // GEOID18. Its checks: the body frame's heading and roll and the test
    // hill's sight line by hand, round trips, California zone 3's round trip,
    // and GEOID18's NAVD88 height against NGS's at GU2195. No AIS: the
    // track is synthetic (vehicles.ts), so it needs no ship data.
    checked: {
      epochUtc: "2026-03-01T18:20:00Z",
      knobs: { mast: 25, datum: "navd88" },
    },
    needs: ["proj", "geoid", "terrain"],
    globe: "terrain",
    checks: [
      "frame-tree.body-frame.heading",
      "frame-tree.body-frame.roll",
      "frame-tree.body-frame.sight-over-hill",
      "frame-tree.body-frame.round-trip",
      "projections.epsg-6420-6360",
      "heights-and-wgs84.three-heights.navd88",
    ],
    checkedBy: "hand formulas and round trips",
    checkKinds: BODY_CHECK_KINDS,
    checkNotes: BODY_CHECK_NOTES,
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
    // transit. Its checks come with Task 8.
    checked: {
      epochUtc: SIGNAL_ROW,
      knobs: { from: "ship", to: "lunar-site" },
    },
    needs: ["orion", "terrain", "ships"],
    globe: "terrain",
    checks: [],
  },
];
