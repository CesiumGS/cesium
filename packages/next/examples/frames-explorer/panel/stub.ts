// The panel's stub data (part 6a's prototype): a realistic model built from
// the real types, so the design pass shows real titles, values, accuracies
// and states before 6b wires the worker, the overlays and the selection.
// `stubModel(scenario)` gives the page in one of the states the design
// covers; the example's `stub` param picks it.
import type {
  AccuracyStatement,
  AccuracyTerm,
} from "../../../src/measure/accuracy.ts";
import type { DataItem, RunSummary } from "../protocol.ts";
import references from "../references.json";
import type { StressResult } from "../tests.ts";
import type { TreeNode } from "../tree.ts";
import { length } from "./format.ts";
import {
  type ComposedAccuracy,
  type Comparison,
  type ComposedView,
  REFERENCES,
  type GroupInfo,
  type ItemStatus,
  type OverlayView,
  type PanelModel,
  type Reference,
  type ResultExtras,
  type TourStop,
} from "./model.ts";
import {
  GROUP_ACCURACY_NOTE,
  GROUP_COMPARED,
  STUB_LABELS,
} from "./stubLabels.ts";
import { STUB_RESULTS } from "./stubResults.ts";

export type Scenario = "ready" | "fetching" | "missing" | "failure" | "start";

export const SCENARIOS: readonly Scenario[] = [
  "ready",
  "fetching",
  "missing",
  "failure",
  "start",
];

/** The question cards, as plain data (stress/stressGroups.ts's, without its functions). */
export const STUB_GROUPS: readonly GroupInfo[] = [
  {
    id: "projections",
    name: "Projections",
    question: "Do design coordinates survive the trip to the globe and back?",
    lenses: ["gis", "offshore"],
    focus: { frames: ["ITRF"], overlay: "designGrid" },
  },
  {
    id: "units",
    name: "Units",
    question: "Does the library tell US survey feet from international feet?",
    lenses: ["civil", "bim"],
    focus: { frames: ["ITRF"], site: "california" },
  },
  {
    id: "site-grids",
    name: "Site grids",
    question: "Do rotated and scaled site grids land where they should?",
    lenses: ["civil", "bim"],
    focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" },
  },
  {
    id: "recorded-operations",
    name: "Recorded operations",
    question: "Is the datum operation fixed, with its grids accounted for?",
    lenses: ["bim", "offshore"],
    focus: { frames: ["ITRF"], site: "california" },
  },
  {
    id: "frame-tree",
    name: "Frame tree",
    question:
      "Do the frames agree with each other however you go between them?",
    lenses: ["space"],
    focus: { frames: ["ICRF", "GCRF", "ITRF", "MOON_ME", "MOON_PA"] },
  },
  {
    id: "time",
    name: "Time",
    question:
      "Is time continuous through leap seconds, and honest at the tables' ends?",
    lenses: ["space", "timing"],
    focus: { frames: ["ICRF", "GCRF", "ITRF"] },
  },
  {
    id: "trajectory",
    name: "Trajectory",
    question: "Is Orion's path used only where there is data?",
    lenses: ["space"],
    focus: { frames: ["EME2000", "MOON_ME"], overlay: "trajectoryPath" },
  },
  {
    id: "measurement",
    name: "Measurement",
    question: "Do design measurements agree with distances on the ground?",
    lenses: ["civil"],
    focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" },
  },
  {
    id: "reference-values",
    name: "Reference values",
    question: "Do results match published survey and geodesy values?",
    lenses: ["civil"],
  },
  {
    id: "vertical-profile",
    name: "Vertical profile",
    question: "Are vertical curves computed as the design manuals do?",
    lenses: ["civil"],
  },
  {
    id: "distortion",
    name: "Distortion",
    question: "How much does a projection stretch distances?",
    lenses: ["civil", "gis"],
  },
  {
    id: "rigid-placement-budget",
    name: "Rigid placement budget",
    question: "How big can a site be before rigid placement is off?",
    lenses: ["civil", "bim"],
  },
  {
    id: "coordinate-epoch",
    name: "Coordinate epoch",
    question: "How far do coordinates move between epochs?",
    lenses: ["gis", "av"],
  },
  {
    id: "axes-and-the-antimeridian",
    name: "Axes and the antimeridian",
    question: "Are axis order and the 180° meridian handled?",
    lenses: ["gis"],
  },
  {
    id: "space",
    name: "Space",
    question: "Do light time, Doppler and line of sight match the references?",
    lenses: ["space"],
  },
  {
    id: "operation-candidates",
    name: "Operation candidates",
    question:
      "Which datum operation was chosen, and what were the alternatives?",
    lenses: ["gis", "offshore"],
  },
  {
    id: "ifc-map-conversion",
    name: "IFC map conversion",
    question: "Does an IFC map conversion place the model correctly?",
    lenses: ["bim"],
  },
  {
    id: "plate-motion",
    name: "Plate motion",
    question: "How fast does a map go stale as the plates move?",
    lenses: ["av"],
  },
  {
    id: "below-the-ellipsoid",
    name: "Below the ellipsoid",
    question: "Do scale factors and sight lines work below the ellipsoid?",
    lenses: ["civil"],
  },
  {
    id: "heights-and-wgs84",
    name: "Heights and WGS84",
    question: "Which height, and which WGS84, is this?",
    lenses: ["civil", "gis", "av"],
  },
  {
    id: "bound-crss",
    name: "Bound CRSs",
    question: "Are exported CRSs with TOWGS84 placed by their own parameters?",
    lenses: ["bim", "gis", "offshore"],
  },
  {
    id: "time-scales",
    name: "Time scales",
    question: "Are the GPS, TAI, TT and UTC offsets exact?",
    lenses: ["timing"],
  },
  {
    id: "lunar-time",
    name: "Lunar time",
    question: "How much faster does a clock on the Moon tick?",
    lenses: ["space", "timing"],
  },
  {
    id: "reproducibility",
    name: "Reproducibility",
    question: "Does the same file land the same in browser and Node?",
    lenses: ["bim", "offshore"],
    virtual: true,
  },
];

/** The groups that need each item (R6), for "waiting for …". */
const NEEDS: Readonly<Record<string, DataItem>> = {
  projections: "proj",
  units: "proj",
  "site-grids": "proj",
  "recorded-operations": "proj",
  measurement: "proj",
  "reference-values": "proj",
  distortion: "proj",
  "rigid-placement-budget": "proj",
  "coordinate-epoch": "proj",
  "axes-and-the-antimeridian": "proj",
  "operation-candidates": "proj",
  "ifc-map-conversion": "proj",
  "plate-motion": "proj",
  "below-the-ellipsoid": "proj",
  "heights-and-wgs84": "geoid",
  "bound-crss": "proj",
  trajectory: "orion",
  space: "orion",
};

// ----------------------------------------------------------------- the tree

const node = (
  id: string,
  edge: TreeNode["edge"],
  children: TreeNode[] = [],
  label = id,
): TreeNode => ({ id, label, edge, children });

/** UT1 35 µs at ω, and polar motion 0.1 mas, in quadrature (tree.ts's ITRF edge). */
const EOP_RAD = Math.hypot(35e-6 * 7.292115e-5, 1e-4 * (Math.PI / 648000));

const DE440 =
  "DE440 Earth-Moon fit to lunar laser ranging (stated model accuracy)";

export const STUB_TREE: TreeNode = node(
  "ICRF",
  {
    kind: "root",
    detail: "the International Celestial Reference Frame",
    accuracy: { note: "the root defines the frame; there is no edge to bound" },
  },
  [
    node("HCRS", {
      kind: "translation",
      detail: "ephemeris: sun (DE440)",
      accuracy: {
        note: "not stated: heliocentric geometry has no stated absolute accuracy (DE440's 0.01 m is its Earth-Moon fit)",
      },
    }),
    node(
      "EARTH_ICRF",
      {
        kind: "translation",
        detail: "ephemeris: earth (DE440)",
        accuracy: { meters: 0.01, note: DE440 },
      },
      [
        node(
          "EME2000",
          {
            kind: "constant",
            detail: "frame bias (IAU 2006)",
            accuracy: {
              byDefinition: true,
              note: "exact by definition: the IAU 2006 frame bias is a set of adopted constants",
            },
          },
          [
            node(
              "orion",
              {
                kind: "trajectory",
                detail:
                  "trajectory (Artemis II OEM, NASA), accuracy class operational, in EME2000",
                accuracy: {
                  meters: 0.278,
                  note: "trajectory position sigma at the instant (covariance or the stated positionSigma)",
                },
              },
              [],
              "Orion",
            ),
          ],
        ),
      ],
    ),
    node(
      "GCRF",
      {
        kind: "iers-affine",
        detail:
          "IERS Conventions 2010 eq. 11.19 (TT to TDB scale and Lorentz term), origin from ephemeris: earth (DE440)",
        accuracy: { meters: 0.01, note: DE440 },
      },
      [
        node(
          "ITRF",
          {
            kind: "rotation",
            detail: "IAU 2006/2000A + EOP",
            accuracy: {
              radians: EOP_RAD,
              note: "measured Earth orientation (UT1 35 µs, polar motion 0.1 mas). An angular bound: the Earth's spin (UT1) and the tilt of its axis (polar motion) combined, in radians; a point's error in metres is this times its distance from the geocentre",
            },
          },
          [
            node(
              "engineering:California zone 3 site",
              {
                kind: "proj-operation",
                detail:
                  "PROJ operation: +proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=cart +ellps=GRS80; grids: us_noaa_g2018u0.tif; accuracy ±2.015 m",
                accuracy: {
                  meters: 2.015,
                  note: "PROJ's stated accuracy for the recorded operation: horizontal by the WGS 84 ensemble, 2 m; heights to NAVD88 by GEOID18 (us_noaa_g2018u0.tif)",
                },
              },
              [],
              "California zone 3 site",
            ),
            node(
              "engineering:ED50 / UTM zone 31N",
              {
                kind: "proj-operation",
                detail:
                  "PROJ operation: +proj=pipeline +step +inv +proj=utm +zone=31 +ellps=intl +step +proj=push +v_3 +step +proj=cart +ellps=intl +step +proj=helmert +x=-87 +y=-98 +z=-121 +convention=position_vector +step +inv +proj=cart +ellps=WGS84 +step +proj=pop +v_3; grids: none; accuracy unknown",
                accuracy: {
                  note: "unknown: PROJ states no accuracy for the recorded operation",
                },
              },
              [],
              "ED50 / UTM zone 31N",
            ),
            node("Sacramento ENU", {
              kind: "constant",
              detail: "local frame: a fixed placement in its parent",
              accuracy: {
                note: "not known: set by the position it was built at",
              },
            }),
          ],
        ),
      ],
    ),
    node(
      "MOON_ICRF",
      {
        kind: "translation",
        detail: "ephemeris: moon (DE440)",
        accuracy: { meters: 0.01, note: DE440 },
      },
      [
        node(
          "MOON_ME",
          {
            kind: "rotation",
            detail: "lunar PCK libration (DE440)",
            accuracy: {
              note: "not stated: the library gives no lunar orientation accuracy",
            },
          },
          [
            node("MOON_PA", {
              kind: "constant",
              detail:
                "principal axes from mean Earth / polar axes (fixed rotation)",
              accuracy: {
                note: "not stated: the library gives no principal-axes accuracy",
              },
            }),
            node("Lunar south-pole site", {
              kind: "constant",
              detail: "local frame: a fixed placement in its parent",
              accuracy: {
                note: "not known: set by the position it was built at",
              },
            }),
          ],
        ),
      ],
    ),
  ],
);

// --------------------------------------------- composed accuracies (R8, accuracyOf)

/*
 * The stub's stand-in for accuracyOf (6b calls the library): a point at a
 * frame's origin against a reference frame, walking the path the statement
 * uses (the reference up to the common ancestor, then down to the frame),
 * with each term tied to the edges it comes from (C2). The rules:
 *
 * - A rotation on the reference's side turns the whole vector to the point:
 *   its error is σθ × the point's distance from the rotation's centre
 *   (Earth orientation at the Moon: about 1 m).
 * - A rotation on the frame's side, with no translation after it, turns
 *   about the frame's own origin, so it moves that origin not at all; a
 *   point away from the origin would need it.
 * - DE440 origins on both sides of the ancestor enter once, as the vector
 *   between them; the Earth's on both sides cancels.
 * - The Moon's relativistic terms sit on no edge.
 */

/** A body's distance from the geocentre, m, for the rotation terms. */
const DISTANCE_M: Record<string, number> = {
  ICRF: 1.496e11,
  HCRS: 1.496e11,
  MOON_ICRF: 3.844e8,
  MOON_ME: 3.844e8,
  MOON_PA: 3.844e8,
  "Lunar south-pole site": 3.844e8,
  orion: 3.8e8,
  "engineering:California zone 3 site": 6.371e6,
  "engineering:ED50 / UTM zone 31N": 6.371e6,
  "Sacramento ENU": 6.371e6,
};
const MOON_SUBTREE = new Set([
  "MOON_ICRF",
  "MOON_ME",
  "MOON_PA",
  "Lunar south-pole site",
]);
const ROTATIONS = new Set(["ITRF", "EME2000", "MOON_ME", "MOON_PA"]);
/** Edges whose origin is the Earth's in DE440. */
const EARTH_ORIGIN = new Set(["GCRF", "EARTH_ICRF"]);

function parents(tree: TreeNode): Map<string, TreeNode> {
  const out = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    for (const c of n.children) {
      out.set(c.id, n);
      walk(c);
    }
  };
  walk(tree);
  return out;
}
const PARENT = parents(STUB_TREE);
const byId = (() => {
  const out = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    out.set(n.id, n);
    n.children.forEach(walk);
  };
  walk(STUB_TREE);
  return out;
})();
const chain = (id: string): string[] => {
  const out = [id];
  for (let p = PARENT.get(id); p; p = PARENT.get(p.id)) {
    out.push(p.id);
  }
  return out;
};

const term = (
  source: AccuracyTerm["source"],
  meters: number | undefined,
  note: string,
  edges: string[],
) => ({ t: { source, meters, note }, edges });

/** The stub's composed statement for `target` against `reference`. */
function composedFor(reference: Reference, target: string): ComposedView {
  const up = chain(reference);
  const down = chain(target);
  const ancestor = up.find((id) => down.includes(id))!;
  // Edges are named by their child: the reference's side, then the target's.
  const upEdges = up.slice(0, up.indexOf(ancestor));
  const downEdges = down.slice(0, down.indexOf(ancestor)).reverse();
  const terms: { t: AccuracyTerm; edges: string[] }[] = [];
  const zeroAtOrigin: { edge: string; why: string }[] = [];
  const distance = DISTANCE_M[target] ?? 0;
  const label = (id: string) => byId.get(id)?.label ?? id;

  // Rotations on the reference's side turn the vector to the point.
  for (const e of upEdges) {
    if (e === "ITRF") {
      if (distance === 0) {
        zeroAtOrigin.push({
          edge: e,
          why: "Earth orientation turns about the geocentre, which is this origin",
        });
      } else {
        terms.push(
          term(
            "earthOrientation",
            EOP_RAD * distance,
            `measured Earth orientation (UT1 35 µs, polar motion 0.1 mas) × the point's ${length(distance, 3)} from the geocentre`,
            [e],
          ),
        );
      }
    }
  }
  // DE440 origins: once, as the vector between the two sides.
  const de440 = [...upEdges, ...downEdges].filter(
    (e) => byId.get(e)?.edge.kind === "translation" || e === "GCRF",
  );
  const earth = de440.filter((e) => EARTH_ORIGIN.has(e));
  const others = de440.filter((e) => !EARTH_ORIGIN.has(e));
  if (earth.length === 2) {
    zeroAtOrigin.push({
      edge: earth[1]!,
      why: `${earth.map(label).join(" and ")} are the same DE440 Earth position, so it cancels`,
    });
  }
  for (const e of others) {
    if (e === "HCRS") {
      terms.push(
        term(
          "ephemeris",
          undefined,
          "DE440 states no absolute accuracy for the Sun's position",
          [e],
        ),
      );
    } else {
      const pair = earth.length === 1 ? [earth[0]!, e] : [e];
      terms.push(
        term(
          "ephemeris",
          0.01,
          pair.length === 2
            ? "DE440's Earth–Moon vector (lunar laser ranging fit), which both origins come from"
            : "DE440 position (stated model accuracy)",
          pair,
        ),
      );
    }
  }
  if (earth.length === 1 && others.length === 0) {
    terms.push(
      term(
        "ephemeris",
        0.01,
        "DE440's Earth position (stated model accuracy)",
        [earth[0]!],
      ),
    );
  }
  // The target's side: rotations about the origin, then its own edge.
  downEdges.forEach((e, i) => {
    const after = downEdges.slice(i + 1);
    const translationAfter = after.some(
      (a) => !ROTATIONS.has(a) && byId.get(a)?.edge.kind !== "translation",
    );
    if (e === "ITRF" && distance === 0) {
      zeroAtOrigin.push({
        edge: e,
        why: "Earth orientation turns about the geocentre, which is this origin",
      });
    } else if (e === "ITRF") {
      terms.push(
        term(
          "earthOrientation",
          EOP_RAD * distance,
          `measured Earth orientation × the point's ${length(distance, 3)} from the geocentre`,
          [e],
        ),
      );
    } else if (e === "EME2000") {
      zeroAtOrigin.push({
        edge: e,
        why: "the frame bias is exact by definition (IAU 2006 adopted constants)",
      });
    } else if (e === "MOON_ME" || e === "MOON_PA") {
      if (translationAfter) {
        terms.push(
          term(
            "ephemeris",
            undefined,
            `${label(e)}'s orientation has no stated accuracy, and the point is 1,737 km from the Moon's centre`,
            [e],
          ),
        );
      } else {
        zeroAtOrigin.push({
          edge: e,
          why: "a rotation about the Moon's centre, which is this origin",
        });
      }
    } else if (e === "orion") {
      terms.push(
        term("trajectory", 0.278, "the OEM's covariance at the instant", [e]),
        term(
          "coordinateScale",
          10.33,
          "the OEM doesn't state its time scale (TDB or TT); taken as TDB: 2.5 × 10⁻⁸ of the geocentric distance",
          [e],
        ),
      );
    } else if (e.startsWith("engineering:")) {
      const a = byId.get(e)!.edge.accuracy;
      terms.push(
        term(
          "projection",
          a.meters,
          a.meters !== undefined
            ? "PROJ's stated accuracy for the recorded operation: horizontal by the WGS 84 ensemble, 2 m; heights to NAVD88 by GEOID18"
            : "PROJ states no accuracy for the recorded operation",
          [e],
        ),
      );
    } else if (e === "Sacramento ENU" || e === "Lunar south-pole site") {
      terms.push(
        term(
          "projection",
          undefined,
          "a local frame placed at a position it was given, with no stated accuracy",
          [e],
        ),
      );
    }
  });
  if (MOON_SUBTREE.has(target) && !up.some((id) => MOON_SUBTREE.has(id))) {
    terms.push(
      term(
        "relativity",
        0.03,
        "the Moon's relativistic terms (its clock), stated and not applied",
        [],
      ),
    );
  }
  const ts = terms.map((x) => x.t);
  const statement: AccuracyStatement = {
    meters: ts.some((t) => t.meters === undefined)
      ? undefined
      : Math.hypot(...ts.map((t) => t.meters!)),
    terms: ts,
    warnings:
      target === "orion"
        ? ["the OEM's time scale is assumed (TDB), not stated"]
        : [],
  };
  const lunarRotation = zeroAtOrigin.some(
    (z) => z.edge === "MOON_ME" || z.edge === "MOON_PA",
  );
  return {
    statement,
    termEdges: terms.map((x) => x.edges),
    zeroAtOrigin,
    ...(lunarRotation && {
      note: "A point away from the Moon's centre isn't bounded: MOON_ME's orientation has no stated accuracy (see the lunar south-pole site).",
    }),
  };
}

export const STUB_COMPOSED: ComposedAccuracy = Object.fromEntries(
  REFERENCES.map((ref) => [
    ref,
    Object.fromEntries(
      [...byId.keys()].map((id) => [id, composedFor(ref, id)]),
    ),
  ]),
) as ComposedAccuracy;

// ------------------------------------------------- inspector extras (R16)

const entries = (
  references as unknown as {
    entries: Record<string, { source: Record<string, string>; wkt2?: string }>;
  }
).entries;

export const STUB_EXTRAS: Readonly<Record<string, ResultExtras>> = {
  "measurement.grid-to-ground": {
    trace: [
      {
        kind: "input",
        label: "Design line, California zone 3 (EPSG:6420, US survey feet)",
        value: "10,000 ftUS",
      },
      {
        kind: "step",
        label: "× site scale",
        value: "1.0000375",
        note: "the site grid's scale factor (S)",
      },
      {
        kind: "step",
        label: "× metres per US survey foot",
        value: "0.30480060960121924 m",
        note: "1200/3937, from PROJ's unit table",
      },
      {
        kind: "step",
        label: "÷ mean combined factor along the line",
        value: "0.9999330941186371",
        note: "grid scale × elevation factor, averaged over 64 samples",
      },
      {
        kind: "step",
        label: "PROJ operation, design to ITRF",
        value:
          "+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=cart +ellps=GRS80",
        code: true,
      },
      {
        kind: "output",
        label: "Predicted ground distance",
        value: "3048.3243470679126 m",
      },
      {
        kind: "expected",
        label: "True distance (both ends in ITRF, geodesic on the ellipsoid)",
        value: "3048.324343749235 m",
      },
    ],
    formula:
      "true ≈ design × S × (1200/3937) ÷ k̄, where k̄ is the mean combined factor (grid scale × R/(R + h)) along the line",
  },
  "reference-values.ngs-gu2195.grid": {
    accuracyNote: "published value ± half its last digit (0.5 mm)",
    source: {
      document: entries["ngs-GU2195"]!.source.document!,
      publisher: entries["ngs-GU2195"]!.source.publisher,
      locator: "PID GU2195, SPC CA 3 northing and easting",
      url: entries["ngs-GU2195"]!.source.url,
      retrieved: entries["ngs-GU2195"]!.source.retrieved!,
    },
    trace: [
      {
        kind: "input",
        label: "Datasheet position, NAD83(2011) epoch 2010.00",
        value: "36 59 44.62514(N) 121 33 44.16406(W)",
      },
      {
        kind: "step",
        label: "PROJ operation, geographic to SPC CA 3 (EPSG:6420 in metres)",
        value:
          "+proj=pipeline +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000 +y_0=500000 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg",
        code: true,
      },
      {
        kind: "output",
        label: "Computed northing, easting",
        value: "N 555553.8189 m, E 1905441.0526 m",
      },
      {
        kind: "expected",
        label: "Published northing, easting",
        value: "N 555,553.819 m, E 1,905,441.053 m",
      },
    ],
  },
  "lunar-time.moon-vs-earth.synodic": {
    source: {
      document: entries["ashby-patla-2024"]!.source.document!,
      locator: "abstract: 56.02 μs/day",
      url: "https://doi.org/10.3847/1538-3881/ad643a",
      retrieved: entries["ashby-patla-2024"]!.source.retrieved!,
    },
    trace: [
      {
        kind: "input",
        label: "Window",
        value:
          "29.530589 days from 2026-01-01T00:00:00 UTC, 709 hourly samples",
      },
      {
        kind: "step",
        label: "Proper-time rate at the selenoid and at the geoid, each hour",
        value: "properTimeRate(MOON_ME surface) − properTimeRate(ITRF geoid)",
        code: true,
      },
      {
        kind: "output",
        label: "Mean gain of the lunar clock",
        value: "55.98967099147918 µs/day",
      },
      {
        kind: "expected",
        label: "Ashby & Patla (2024)",
        value: "56.02 µs/day",
      },
    ],
  },
};

/** Tokyo / Japan Plane Rectangular CS IX as a bound CRS (references.json, an input). */
export const EXAMPLE_WKT2 = entries["input-wkt2-tokyo-jprcs-ix"]!.wkt2!;

/** Every shown result's extras: its label, F27's note, what it's compared against, then the specific ones above. */
function stubExtras(
  rs: readonly StressResult[],
): Readonly<Record<string, ResultExtras>> {
  const out: Record<string, ResultExtras> = {};
  for (const r of rs) {
    const own = STUB_EXTRAS[r.id];
    const compared: Comparison | undefined =
      r.expectedError !== undefined
        ? { kind: "error", text: `An error matching /${r.expectedError}/.` }
        : GROUP_COMPARED[r.group];
    out[r.id] = {
      ...(STUB_LABELS[r.id] && { label: STUB_LABELS[r.id] }),
      ...(r.accuracy === undefined &&
        GROUP_ACCURACY_NOTE[r.group] && {
          accuracyNote: GROUP_ACCURACY_NOTE[r.group],
        }),
      ...(compared && { compared }),
      ...(r.group === "measurement" &&
        r.accuracy !== undefined && {
          relative:
            "The site's absolute placement is ±2.8 m (1σ); this check measures a distance, which that placement doesn't affect.",
        }),
      ...own,
    };
  }
  return out;
}

// ------------------------------------------------------------------- tour

export const STUB_TOUR: readonly TourStop[] = [
  {
    id: "earth-frames",
    title: "Earth's frames",
    caption:
      "ITRF turns with the Earth; GCRF doesn't. Each triad is a frame's axes at the clock's time.",
    overlays: ["triads"],
  },
  {
    id: "gcrf-itrf-day",
    title: "GCRF to ITRF over a day",
    caption:
      "Run the clock: the globe is drawn Earth-fixed, so GCRF's triad turns once against ITRF's in a sidereal day.",
    overlays: ["triads"],
  },
  {
    id: "design-grid",
    title: "The California design grid",
    caption:
      "Grid north and true north part ways away from the central meridian: the convergence angle.",
    overlays: ["designGrid"],
  },
  {
    id: "rigid-exact",
    title: "Rigid against exact",
    caption:
      "A 20 km design line placed rigidly sags 31 m below the exact one at its far end.",
    overlays: ["rigidVsExact"],
  },
  {
    id: "orion",
    title: "Orion's figure-eight",
    caption:
      "Drawn in GCRF, Artemis II loops the Moon in a figure-eight; in MOON_ME it swings round the far side.",
    overlays: ["orion"],
  },
  {
    id: "lunar-time",
    title: "The Moon's south pole and lunar time",
    caption:
      "A clock at the lunar south pole gains about 56 µs a day on one on Earth.",
    overlays: ["triads"],
  },
];

// ---------------------------------------------------------------- scenarios

const MB = 1e6;

function items(scenario: Scenario): ItemStatus[] {
  const setup =
    "Not in the frames store. Run npm run setup in packages/next, then reload.";
  switch (scenario) {
    case "start":
      return [
        {
          item: "frames",
          state: "fetching",
          received: 1.2 * MB,
          total: 5.22 * MB,
        },
        { item: "proj", state: "idle" },
        { item: "geoid", state: "idle" },
        { item: "orion", state: "idle" },
      ];
    case "fetching":
      return [
        { item: "frames", state: "ready", bytes: 5.22 * MB, ms: 820 },
        {
          item: "proj",
          state: "fetching",
          received: 6.8 * MB,
          total: 16.0 * MB,
        },
        { item: "geoid", state: "idle" },
        { item: "orion", state: "fetching", received: 1.9 * MB },
      ];
    case "missing":
      return [
        { item: "frames", state: "ready", bytes: 5.22 * MB, ms: 790 },
        { item: "proj", state: "missing", detail: setup },
        { item: "geoid", state: "missing", detail: setup },
        { item: "orion", state: "missing", detail: setup },
      ];
    case "failure":
      return [
        { item: "frames", state: "ready", bytes: 5.22 * MB, ms: 810 },
        { item: "proj", state: "ready", bytes: 16.0 * MB, ms: 1460 },
        {
          item: "geoid",
          state: "error",
          detail:
            "The response for us_noaa_g2018u0.tif ended at 7.9 of 16.7 MB: a network error.",
        },
        { item: "orion", state: "ready", bytes: 6.26 * MB, ms: 540 },
      ];
    case "ready":
      return [
        { item: "frames", state: "ready", bytes: 5.22 * MB, ms: 810 },
        { item: "proj", state: "ready", bytes: 16.0 * MB, ms: 1460 },
        { item: "geoid", state: "ready", bytes: 16.7 * MB, ms: 2900 },
        { item: "orion", state: "ready", bytes: 6.26 * MB, ms: 540 },
      ];
  }
}

function overlays(scenario: Scenario): OverlayView[] {
  const projState: OverlayView["state"] =
    scenario === "missing"
      ? "missing"
      : scenario === "fetching"
        ? "waiting"
        : "drawn";
  const missing =
    "PROJ isn't in the frames store: run npm run setup, then reload.";
  return [
    {
      id: "triads",
      label: "Triads",
      short: "Triads",
      on: true,
      state: "drawn",
      accuracy:
        "axes: GCRF against ITRF ±2.6 × 10⁻⁹ rad (Earth orientation, measured)",
    },
    {
      id: "designGrid",
      label: "California design grid, with true north",
      short: "Design grid",
      on: scenario !== "start",
      state: scenario === "start" ? "off" : projState,
      waitingFor: "proj",
      accuracy: "±2.0 m (1σ): the WGS 84 ensemble; round trip ≤ 3.4 nm",
      ...(scenario === "missing" && { problem: missing }),
    },
    {
      id: "siteGrid",
      label: "Site grid (θ = 12.5°, s = 1.0000375)",
      short: "Site grid",
      on: false,
      state: "off",
      accuracy: "±2.0 m (1σ), the design grid's; site formula exact to 1 nm",
    },
    {
      id: "rigidVsExact",
      label: "Rigid and exact 20 km line",
      short: "Rigid vs exact",
      on: scenario === "ready" || scenario === "failure",
      state: scenario === "ready" || scenario === "failure" ? "drawn" : "off",
      accuracy: "sag 31.2 m at 20 km (geometry, exact)",
    },
    {
      id: "roundTrip",
      label: "Round-trip markers from the last run",
      short: "Round trips",
      on: false,
      state: "off",
      accuracy: "worst round trip 3.4 nm against 0.10 mm",
    },
    {
      id: "orion",
      label: "Orion's path",
      short: "Orion",
      on: scenario === "fetching" || scenario === "ready",
      state:
        scenario === "fetching"
          ? "waiting"
          : scenario === "ready"
            ? "drawn"
            : "off",
      waitingFor: "orion",
      accuracy: "±10 m (1σ), mostly the unstated time scale, taken as TDB",
      caution: true,
    },
    {
      id: "distortion",
      label: "Distortion",
      short: "Distortion",
      on: false,
      state: "off",
      accuracy:
        "Tissot ellipses in true-north axes (convergence not applied); contours from PROJ's factors, exact to 10⁻¹⁰",
    },
    {
      id: "bias",
      label: "Frame bias exaggeration",
      short: "Frame bias",
      on: false,
      state: "off",
      accuracy:
        "the frame bias, 23 mas: exact by definition (IAU 2006 adopted constants)",
    },
  ];
}

function results(scenario: Scenario): StressResult[] {
  const all = [...STUB_RESULTS];
  switch (scenario) {
    case "start":
      return [];
    case "fetching":
      // A run in progress: the groups that need only frame data are in.
      return all.filter((r) => NEEDS[r.group] === undefined);
    case "missing":
      return all
        .filter((r) => NEEDS[r.group] === undefined)
        .concat(
          all
            .filter((r) => NEEDS[r.group] !== undefined)
            .filter((r, i, a) => a.findIndex((x) => x.group === r.group) === i)
            .map((r) => ({
              id: `${r.group}.skipped`,
              group: r.group,
              title: r.title,
              pass: false,
              missing: [NEEDS[r.group] === "orion" ? "orion" : "proj"],
              detail:
                "Skipped: its data isn't in the frames store. Run npm run setup in packages/next, then reload.",
            })),
        );
    case "failure":
      return all.map((r) =>
        r.id === "axes-and-the-antimeridian.antimeridian.zone-1"
          ? {
              ...r,
              pass: false,
              fingerprintCheck: {
                match: false,
                difference:
                  "coordinates differ by 2.4 × 10⁻⁸ m (limit 10⁻⁹ m); pipeline and grids match",
              },
            }
          : r,
      );
    case "ready":
      return all;
  }
}

function summary(rs: readonly StressResult[], ms: number): RunSummary {
  const judged = rs.filter((r) => !r.displayOnly && !r.userInput);
  return {
    passed: judged.filter((r) => r.pass).length,
    failed: judged.filter((r) => !r.pass && !r.missing).length,
    skipped: judged.filter((r) => r.missing).length,
    shown: rs.filter((r) => r.displayOnly).length,
    ms,
    cancelled: false,
  };
}

/** The panel's model in one of the design's states. */
export function stubModel(scenario: Scenario): PanelModel {
  const rs = results(scenario);
  const waiting: Record<string, DataItem> = {};
  if (scenario === "fetching") {
    for (const [group, item] of Object.entries(NEEDS)) {
      waiting[group] = item;
    }
  }
  const running = scenario === "fetching";
  return {
    items: items(scenario),
    ...(scenario === "start"
      ? { treeNote: "The frame tree draws once frame data is in." }
      : { tree: STUB_TREE }),
    composed: STUB_COMPOSED,
    clock: {
      utc: "2026-04-06T23:00:00Z",
      eop:
        scenario === "failure"
          ? { kind: "predicted", ageDays: 38.5 }
          : { kind: "measured" },
    },
    overlays: overlays(scenario),
    orionFrame: "GCRF",
    distortionCrs: "6420",
    distortionHeight: 0,
    biasFactor: 1e6,
    triadScale: "triads drawn at 6% of the camera's distance, 2 m to 2,000 km",
    groups: STUB_GROUPS,
    results: rs,
    extras: stubExtras(rs),
    waiting,
    run: running
      ? { state: "running", done: rs.length, total: STUB_RESULTS.length }
      : scenario === "start"
        ? { state: "idle", done: 0, total: STUB_RESULTS.length }
        : {
            state: "done",
            done: rs.length,
            total: rs.length,
            summary: summary(rs, 4230),
          },
    token: scenario === "missing" ? undefined : "env",
    userCrs:
      scenario === "failure"
        ? {
            state: "noCrs",
            id: "2954117",
            message:
              "ion has no CRS for asset 2954117: its tileset is already placed in Earth-fixed coordinates, and neither the asset's metadata nor its tileset names the CRS it came from.",
          }
        : { state: "idle" },
    exampleWkt2: EXAMPLE_WKT2,
    tour: STUB_TOUR,
    environment: [
      ["Run", "2026-11-06 09:14:03 UTC, 4.2 s"],
      ["Package", "@cesium/next 2.0.0-poc.0"],
      ["PROJ", "9.7.1, WebAssembly; proj.db sha256 b192cb2fd7eb…"],
      [
        "GEOID18",
        scenario === "failure"
          ? "not loaded: the fetch failed"
          : "us_noaa_g2018u0.tif, sha256 fa9a407ac7ee…",
      ],
      [
        "Frame data",
        "DE440 2000–2050 (planets ae871820c05f…, Moon e5bcd7c4ec5e…), EOP-All.csv d35352cb8269…, Leap_Second.dat 6cb6f5d4b819…",
      ],
      ["Artemis II OEM", "EM2_FODNAVBET_revF_PUBLIC.oem, sha256 d8ed8a5a16d4…"],
      ["Browser", "Chrome 142 on macOS (from the user agent)"],
    ],
  };
}
