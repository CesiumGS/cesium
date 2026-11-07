// "Survey a corridor" (spec scenario 6): the catalog's clothoid road
// (measurement.clothoid's) on the measurement site's grid, California zone 3
// rotated 12.5° and scaled 1.0000375, so its design units are US survey
// feet. The question is what station and offset a point on the ground is
// at. The knobs (or the point, dragged on the globe) set it; the answer
// takes it from the ground (ITRF) back through PROJ into the site grid and
// drops a perpendicular onto the road, to the alignment's own 1e-9 ft.
//
// The tree adds the design CRS under ITRF and the site grid under it; the
// road is data, pinned beside the site grid its elements are in. The page
// draws the site grid (scenes.ts); the evaluation draws the road with its
// station ticks, the point and its offset, and labels them.
//
// Off the checked setup it re-runs live what measurement.clothoid checks
// (the station and offset back from the design point, within 1e-9 ft), and
// the trip through the ground the answer takes.
import { Alignment } from "../../../src/engineering/alignment.ts";
import { EngineeringFrame } from "../../../src/engineering/EngineeringFrame.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { EARTH } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import { overlayMesh, polyline, segments } from "../overlays.ts";
import type { OverlayGeometry } from "../protocol.ts";
import {
  fmt,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import {
  ALIGNMENT_RECOVERY,
  DESIGN_ROUND_TRIP,
  proj,
} from "../stress/shared.ts";
import type { AddedFrameSpec } from "../tree.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import {
  BIM_CRS,
  CLOTHOID_ROAD,
  CORRIDOR_SITE,
  CORRIDOR_SITE_GRID,
  FTUS_PER_M,
  offsetText,
  stationText,
} from "./sites.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "corridor")!;
const CA = BIM_CRS["ca-zone-3"];
const road = new Alignment(CLOTHOID_ROAD);

/** The road's elements by station, for the answer's words. */
const ELEMENTS: readonly { to: number; name: string }[] = [
  { to: 500, name: "on the first tangent" },
  { to: 800, name: "in the entry spiral" },
  { to: 1200, name: "on the arc (radius 800 ft)" },
  { to: 1500, name: "in the exit spiral" },
  { to: Infinity, name: "on the last tangent" },
];
const elementAt = (station: number) =>
  ELEMENTS.find((e) => station < e.to)!.name;

let frames: { site: EngineeringFrame; plain: EngineeringFrame } | undefined;
function framesOf(ctx: StressContext) {
  frames ??= {
    site: EngineeringFrame.create(
      {
        name: `${CA.name} site`,
        body: EARTH,
        crs: CA.crs,
        site: CORRIDOR_SITE,
      },
      proj(ctx),
    ),
    plain: EngineeringFrame.create(
      { name: CA.name, body: EARTH, crs: CA.crs },
      proj(ctx),
    ),
  };
  return frames;
}

/** The colours the page tints by layer (main.ts): the road engineering, the offset white. */
const WHITE = [255, 255, 255, 255] as const;

/** The road, its station ticks and the point's offset, Earth-fixed (ITRF). */
function roadOverlays(
  site: EngineeringFrame,
  station: number,
  offset: number,
): { id: string; geometry: OverlayGeometry }[] {
  const at = (s: number, o: number) =>
    site.toBodyFixed([...road.pointAt(s, o), 0]);
  const steps = 200;
  const centre = new Float64Array(3 * (steps + 1));
  for (let i = 0; i <= steps; i++) {
    centre.set(at((i * road.length) / steps, 0), 3 * i);
  }
  // A tick across the road every 100 ft, longer every 500 ft.
  const ticks: number[] = [];
  for (let s = 0; s <= road.endStation; s += 100) {
    const half = s % 500 === 0 ? 12 : 6;
    ticks.push(...at(s, -half), ...at(s, half));
  }
  const foot = at(station, 0);
  const point = at(station, offset);
  const layer = (name: string, g: ReturnType<typeof polyline>) => ({
    name,
    chunks: overlayMesh(g),
  });
  return [
    {
      id: "road",
      geometry: {
        kind: "scenario",
        layers: [
          layer("centreline", polyline(centre, [...WHITE])),
          layer("ticks", segments(Float64Array.from(ticks), [...WHITE])),
        ],
        ms: 0,
      },
    },
    {
      id: "offset",
      geometry: {
        kind: "scenario",
        layers: [
          layer(
            "leader",
            segments(Float64Array.of(...foot, ...point), [...WHITE]),
          ),
        ],
        ms: 0,
      },
    },
  ];
}

/**
 * ITRF to the site grid's design plane near the road's middle: the exact
 * placement's local derivative there (finite differences of 100 ft),
 * inverted. Over the road's 2,000 ft it is good to well under the knobs'
 * steps; the page reads the knobs off it while the point is dragged.
 */
function localInverse(site: EngineeringFrame): number[] {
  const d0 = [...road.pointAt(1000, 0), 0];
  const p0 = site.toBodyFixed(d0);
  const h = 100;
  const column = (axis: number) => {
    const d = [...d0];
    d[axis]! += h;
    const p = site.toBodyFixed(d);
    return [0, 1, 2].map((i) => (p[i]! - p0[i]!) / h);
  };
  // p = p0 + J (d − d0), J's columns the three derivatives; so
  // d = d0 + J⁻¹ (p − p0), J⁻¹ by its adjugate (rows: the columns' cross
  // products over the determinant).
  const [a, b, c] = [column(0), column(1), column(2)];
  const cross = (u: number[], v: number[]) => [
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ];
  const rows = [cross(b, c), cross(c, a), cross(a, b)];
  const det =
    a[0]! * rows[0]![0]! + a[1]! * rows[0]![1]! + a[2]! * rows[0]![2]!;
  const inv = rows.map((r) => r.map((x) => x / det));
  // Column-major 4×4: element (row i, column j) at 4j + i.
  const out = new Array<number>(16).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[4 * j + i] = inv[i]![j]!;
    }
    out[12 + i] =
      d0[i]! -
      (inv[i]![0]! * p0[0]! + inv[i]![1]! * p0[1]! + inv[i]![2]! * p0[2]!);
  }
  out[15] = 1;
  return out;
}

let inverse: number[] | undefined;
/** The checked setup's station, as the answer finds it (once per worker). */
let checkedStation: number | undefined;

export const evaluateCorridor: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => {
  const instant = Instant.fromTdb(epochTdb);
  const station = Number(knobs.station);
  const offset = Number(knobs.offset);
  const { site, plain } = framesOf(ctx);
  inverse ??= localInverse(site);
  const design = [...road.pointAt(station, offset), 0];
  // The point on the ground, and back from it: the trip the answer takes.
  const itrf = Float64Array.from(site.toBodyFixed(design));
  const back = site.fromBodyFixed(itrf);
  const found = road.stationOffset(back);
  const direct = road.stationOffset(design);
  const viaGround = Math.max(
    Math.abs(found.station - station),
    Math.abs(found.offset - offset),
  );
  const alignmentOnly = Math.max(
    Math.abs(direct.station - station),
    Math.abs(direct.offset - offset),
  );
  const geo = Ellipsoid.WGS84.cartesianToCartographic(itrf, {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const lat = (geo.latitude * 180) / Math.PI;
  const lon = (geo.longitude * 180) / Math.PI;
  // The answer's accuracy: the alignment's inverse (measurement.clothoid's
  // 1e-9 ft), or the trip through the ground if it adds more.
  const feet = Math.max(ALIGNMENT_RECOVERY, viaGround);
  const op = plain.operation;
  const edge: AddedFrameSpec["edge"] = {
    kind: "proj-operation",
    detail: `PROJ operation: ${op.pipeline}; grids: ${op.grids.join(", ") || "none"}`,
    accuracy:
      !op.ballpark && op.accuracy !== undefined && op.accuracy > 0
        ? {
            meters: op.accuracy,
            note: "PROJ's stated accuracy for the recorded operation (the datum to WGS 84)",
          }
        : { note: "not known: PROJ states no accuracy for the operation" },
  };
  const live: StressResult[] = [
    {
      id: "measurement.clothoid.live",
      group: "measurement",
      title: `The point at station ${stationText(station)}, ${offsetText(offset)}, on the clothoid road gives back its station and offset within 1e-9 design units`,
      pass: true,
      value: alignmentOnly,
      tolerance: ALIGNMENT_RECOVERY,
      unit: "design units",
      detail: `station ${fmt(direct.station, 13)}, offset ${fmt(direct.offset, 13)}; ${elementAt(station)}`,
      accuracyNote: "exact arithmetic: the alignment's own inverse",
      instant: instant.tdb(),
    },
    {
      id: "corridor.through-the-ground",
      group: "measurement",
      title:
        "The point taken to the ground (ITRF) through PROJ and back into the site grid lands where it started, within 1e-4 m",
      pass: true,
      value:
        Math.hypot(back[0]! - design[0]!, back[1]! - design[1]!) / FTUS_PER_M,
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: `station and offset off by ${fmt(viaGround)} ft after the trip`,
      accuracyNote: "exact arithmetic: a round trip",
      instant: instant.tdb(),
    },
  ];
  checkedStation ??= road.stationOffset(
    site.fromBodyFixed(
      site.toBodyFixed([
        ...road.pointAt(
          Number(SPEC.checked.knobs.station),
          Number(SPEC.checked.knobs.offset),
        ),
        0,
      ]),
    ),
  ).station;
  const method: NonNullable<ScenarioAnswer["method"]> = [
    {
      title: "The road",
      text: "A tangent, a clothoid spiral, an arc of radius 800 ft, a spiral and a tangent: 2,000 ft of centreline in the site grid's design feet, as a road design file gives it.",
    },
    {
      title: "From the ground to the site grid",
      text: `The point's place on the Earth (ITRF) goes back through PROJ into ${CA.name} and the site grid's map conversion (rotation 12.5°, scale 1.0000375) to design feet.`,
    },
    {
      title: "Station and offset",
      text: "The nearest foot of the perpendicular on the centreline: its station is the distance along the road from its start, and the offset the distance out to the point, positive to the right of the direction of travel.",
    },
  ];
  return {
    scenario: "corridor",
    added: [
      { id: CA.name, label: CA.name, parentId: "ITRF", edge },
      {
        id: CORRIDOR_SITE_GRID,
        label: CORRIDOR_SITE_GRID,
        parentId: CA.name,
        edge: {
          kind: "constant",
          detail: `map conversion: origin ${CORRIDOR_SITE.origin[0].toLocaleString("en-US")} ftUS E, ${CORRIDOR_SITE.origin[1].toLocaleString("en-US")} ftUS N; rotation 12.5°; scale ${CORRIDOR_SITE.scale}`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: the site formula, a rotation and a scale",
          },
        },
      },
    ],
    data: {
      label: "The clothoid road",
      frame: CORRIDOR_SITE_GRID,
      source: "alignment",
      describes: "its tangents, spirals and arc, in design feet",
      accuracy: {
        byDefinition: true,
        note: "exact: the road's own design",
      },
    },
    answer: {
      label: `along the road, ${offsetText(found.offset)}`,
      aside: `Station ${stationText(found.station)}, ${elementAt(found.station)} · ${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? "E" : "W"}`,
      headline: `The point is at station ${stationText(found.station)}, ${offsetText(found.offset)} of the centreline, ${elementAt(found.station)}. Its place on the ground goes back through PROJ into ${CA.name} and the site grid, then a perpendicular dropped onto the road finds the nearest point on it: how far along the road that is, and how far out.`,
      value: found.station,
      unit: "ft",
      accuracy: {
        meters: feet / FTUS_PER_M,
        note: `within ${fmt(feet, 2)} ft: the alignment gives a station and offset back to 1e-9 ft (measurement.clothoid's tolerance)${viaGround > ALIGNMENT_RECOVERY ? `; the trip through the ground adds ${fmt(viaGround, 2)} ft` : ", and the trip through the ground adds less"}`,
      },
      path: { from: CORRIDOR_SITE_GRID, to: "ITRF" },
      method,
    },
    overlays: roadOverlays(site, station, offset),
    labels: [
      ...[0, 500, 1000, 1500, 2000].map((s) => ({
        id: `corridor:station-${s}`,
        text: stationText(s).replace(".00", ""),
        at: Array.from(site.toBodyFixed([...road.pointAt(s, -30), 0])),
      })),
      {
        id: "corridor:point",
        text: `${stationText(found.station)}, ${offsetText(found.offset)}`,
        at: Array.from(itrf),
        marker: true,
      },
    ],
    drag: { at: Array.from(itrf), toDesign: inverse },
    live,
    checkedAnswerValue: checkedStation,
  };
};

registerScenario("corridor", evaluateCorridor);
