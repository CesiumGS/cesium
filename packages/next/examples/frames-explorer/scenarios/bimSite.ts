// "A BIM site on the globe" (spec scenario 5; the tour's stops 3 and 4): a
// BIM model's site grid, an IFC map conversion (its origin in a design CRS,
// a rotation and a scale), on the design CRS's PROJ operation to the Earth.
// The question is where the model sits, and how far off a rigid placement
// would be: the model dropped flat at its origin (an iModel's
// `ecefLocation`, `RigidPlacement`) against placed exactly, point by point,
// through PROJ. The answer is the gap 20 km out along the site grid's x axis
// (the inset's mark on the 400 km line the page draws), by the one
// computation the catalog checks against its hand formula
// (`siteGap`, rigid-placement-budget.site-gap).
//
// The tree adds the design CRS under ITRF (its PROJ edge) and the site grid
// under it (the map conversion, exact by definition); the model's site
// origin is data, pinned beside the CRS its numbers are in. The page draws
// the CRS's design grid with true north, the site grid and the line
// (scenes.ts, overlayControl.ts): the evaluation draws nothing itself.
//
// Off the checked setup it re-runs live what its proof checks at the
// catalog's site: the gap against the hand formula, the site grid's formula
// and round trip, grid to ground, design against ITRF, and the CRS's round
// trip, each in the knobs' CRS and site grid.
import {
  EngineeringFrame,
  designPoint,
  type SiteTransform,
} from "../../../src/engineering/EngineeringFrame.ts";
import { framePoint } from "../../../src/frames/local.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";
import { measure } from "../../../src/measure/measure.ts";
import { EARTH } from "../../../src/scene/Body.ts";
import { Instant } from "../../../src/time/Instant.ts";
import type { FrameCache } from "../frameCache.ts";
import { siteGap } from "../stress/groups/rigid-placement-budget.ts";
import {
  fmt,
  plainAccuracy,
  type StressContext,
  type StressResult,
} from "../stress/runner.ts";
import {
  DESIGN_ROUND_TRIP,
  GRID_TO_GROUND,
  SAME_DISTANCE,
  proj,
  worstRoundTrip,
} from "../stress/shared.ts";
import type { AddedFrameSpec } from "../tree.ts";
import {
  registerScenario,
  type ScenarioAnswer,
  type ScenarioEvaluator,
} from "./evaluate.ts";
import { BIM_LINE, BIM_SITE_GRID, bimSite, type BimCrs } from "./sites.ts";
import type { KnobState } from "./spec.ts";
import { SCENARIOS } from "./specs.ts";

const SPEC = SCENARIOS.find((s) => s.id === "bim-site")!;

/**
 * The CRS's frame, or its site grid's, through the worker's bounded cache
 * (frameCache.ts): PROJ resolves an operation once per CRS and site, and a
 * dragged rotation knob makes a new one per value.
 */
function frameOf(
  ctx: StressContext,
  cache: FrameCache<EngineeringFrame>,
  crs: BimCrs,
  site?: SiteTransform,
): EngineeringFrame {
  return cache.get(`bim-site:${JSON.stringify([crs.id, site ?? null])}`, () =>
    EngineeringFrame.create(
      {
        name: site ? `${crs.name} site` : crs.name,
        body: EARTH,
        crs: crs.crs,
        ...(site && { site }),
      },
      proj(ctx),
    ),
  );
}

const metres = (m: number, digits = 2) =>
  `${m.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} m`;

/** "6,000,000 ftUS", "549,095.540 m". */
const designText = (v: number, crs: BimCrs) =>
  `${v.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${crs.unit}`;

const degrees = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;

/** The design CRS's edge: its recorded PROJ operation, with the accuracy PROJ states (R8). */
function crsEdge(frame: EngineeringFrame): AddedFrameSpec["edge"] {
  const op = frame.operation;
  const known = !op.ballpark && op.accuracy !== undefined && op.accuracy > 0;
  return {
    kind: "proj-operation",
    detail: `PROJ operation: ${op.pipeline}; grids: ${op.grids.join(", ") || "none"}`,
    accuracy: known
      ? {
          meters: op.accuracy!,
          note: "PROJ's stated accuracy for the recorded operation (the datum to WGS 84)",
        }
      : op.accuracy === 0
        ? {
            byDefinition: true,
            note: "exact: the CRS is on WGS 84, so the operation is the projection alone",
          }
        : { note: "not known: PROJ states no accuracy for the operation" },
  };
}

/** The live re-runs of the proof's checks, in the knobs' CRS and site grid. */
function liveChecks(
  ctx: StressContext,
  frame: EngineeringFrame,
  plain: EngineeringFrame,
  crs: BimCrs,
  site: SiteTransform,
  gap: ReturnType<typeof siteGap>,
  instant: Instant,
): StressResult[] {
  const u = crs.unitsPerMeter;
  const rotation = (site.rotation * 180) / Math.PI;
  const where = `${crs.code}, θ = ${fmt(rotation, 4)}°, s = ${site.scale}`;
  // The site formula, written out: [E, N] = [E0, N0] + s R(θ) [e, n]; U = U0 + u.
  const designs = [
    [0, 0, 0],
    [1000, 800, 35],
    [-5000, 12_000, 100],
    [30_000, -20_000, 0],
  ];
  let formula = 0;
  for (const [e, n, h] of designs) {
    const c = Math.cos(site.rotation);
    const s = Math.sin(site.rotation);
    const p = frame.projected([e!, n!, h!]);
    formula = Math.max(
      formula,
      Math.hypot(
        p[0]! - (site.origin[0] + site.scale * (c * e! - s * n!)),
        p[1]! - (site.origin[1] + site.scale * (s * e! + c * n!)),
        p[2]! - (site.origin[2] + h!),
      ),
    );
  }
  const formulaMeters = formula * frame.units.metersPerUnit;
  // Grid to ground: a 10,000-unit line along the site grid's x axis.
  const length = 10_000;
  const m = measure(
    designPoint(frame, [2000, 1000, 25]),
    designPoint(frame, [2000 + length, 1000, 25]),
    instant,
    ctx.frames,
    { signal: false },
  );
  const cf = m.design!.combinedFactor.mean;
  const predicted = (length * site.scale * frame.units.metersPerUnit) / cf;
  // A design point against its own ITRF position, to a point elsewhere.
  const a = designPoint(frame, [2000, 1000, 25]);
  const other = framePoint(
    ctx.frames.itrf,
    frame.toBodyFixed([9000, -4000, 400]),
  );
  const fromDesign = measure(a, other, instant, ctx.frames, { signal: false });
  const fromItrf = measure(
    framePoint(ctx.frames.itrf, frame.toBodyFixed(a.design)),
    other,
    instant,
    ctx.frames,
    { signal: false },
  );
  // The CRS's own round trip: the site origin, a 50 km line north, and a
  // point 100 km east.
  const origin = Float64Array.of(crs.origin[0], crs.origin[1], 0);
  const crsDesigns: Float64Array[] = [origin];
  for (let i = 1; i <= 10; i++) {
    crsDesigns.push(Float64Array.of(origin[0]!, origin[1]! + i * 5000 * u, 0));
  }
  crsDesigns.push(Float64Array.of(origin[0]! + 100_000 * u, origin[1]!, 0));
  return [
    {
      id: "rigid-placement-budget.site-gap.live",
      group: "rigid-placement-budget",
      title: `The site grid at ${where}: placed rigidly at its origin, the point 20 km along its x axis is off the exact placement by the hand formula's √((d²/2R)² + (d(s/k − 1))²), within 1%`,
      pass: true,
      value: Math.abs(gap.gap / gap.hand.gap - 1),
      tolerance: 0.01,
      detail: `gap ${fmt(gap.gap, 6)} m; by hand ${fmt(gap.hand.gap, 6)} m (d²/2R ${fmt(gap.hand.drop, 5)} m, R ${fmt(gap.radius, 7)} m; d(s/k − 1) ${fmt(gap.hand.along, 4)} m, k ${fmt(gap.gridScale, 10)})`,
      accuracyNote:
        "exact arithmetic: both placements through the same PROJ operation",
      instant: instant.tdb(),
    },
    {
      id: "site-grids.round-trip.rotation-12.5.scale-1.0000375.live",
      group: "site-grids",
      title: `The site grid at ${where}: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m`,
      pass: formulaMeters < 1e-9,
      value: worstRoundTrip(frame, designs),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: `site formula off by ${fmt(formulaMeters)} m`,
      accuracyNote: "exact arithmetic: the site formula and a round trip",
      instant: instant.tdb(),
    },
    {
      id: "measurement.grid-to-ground.live",
      group: "measurement",
      title: `A ${length.toLocaleString("en-US")} ${crs.unit} design line on the site grid at ${where}: design distance × site scale × metres per unit ÷ mean combined factor is the true distance, within 0.01 m`,
      pass: true,
      value: Math.abs(m.distance - predicted),
      tolerance: GRID_TO_GROUND,
      unit: "m",
      detail: `true ${fmt(m.distance, 10)} m; predicted ${fmt(predicted, 10)} m; combined factor ${fmt(cf, 10)}`,
      accuracy: plainAccuracy(m.accuracy),
      instant: instant.tdb(),
    },
    {
      id: "measurement.design-vs-itrf.live",
      group: "measurement",
      title: `A design point on the site grid at ${where} measured to another point gives the same distance as the design point fixed in ITRF, within 1e-9 m`,
      pass: true,
      value: Math.abs(fromDesign.distance - fromItrf.distance),
      tolerance: SAME_DISTANCE,
      unit: "m",
      detail: `${fmt(fromDesign.distance, 10)} m from the design point, ${fmt(fromItrf.distance, 10)} m from its ITRF position`,
      accuracy: plainAccuracy(fromDesign.accuracy),
      instant: instant.tdb(),
    },
    {
      id: "projections.epsg-6420-6360.live",
      group: "projections",
      title: `${crs.code} (${crs.name}): the site origin, a 50 km line north and a point 100 km east round-trip through the body-fixed frame within 1e-4 m`,
      pass: true,
      value: worstRoundTrip(plain, crsDesigns),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail: `${crsDesigns.length} points; operation accuracy ${plain.operation.accuracy === undefined ? "not stated" : `${plain.operation.accuracy} m`}`,
      accuracyNote: "exact arithmetic: a round trip",
      instant: instant.tdb(),
    },
  ];
}

/** How the answer is worked out, in plain words (Task 4c item 1). */
function method(crs: BimCrs): NonNullable<ScenarioAnswer["method"]> {
  return [
    {
      title: "The model's site grid",
      text: `A BIM model's coordinates are in its site grid: x east and y north on the building's own axes, in ${crs.unit === "ftUS" ? "US survey feet" : "metres"}. Its IFC map conversion places that grid in ${crs.name} (${crs.code}): an origin, a rotation and a scale.`,
    },
    {
      title: "Exact placement",
      text: `Each point goes through the map conversion into ${crs.name}, then through PROJ's recorded operation to latitude, longitude and height, and so to ITRF. The grid follows the ellipsoid, and the projection's scale is in it.`,
    },
    {
      title: "Rigid placement",
      text: "The whole model is placed once, flat, at its origin: x and y on the tangent plane there, a design unit taken as its length in metres. That is what an iModel's ecefLocation, or a glTF placed by one matrix, does.",
    },
    {
      title: "The gap",
      text: `The two placements of one point ${BIM_LINE.mark / 1000} km along the site grid's x axis. Most of it is the drop, d²/2R: the Earth curving away under the flat model. The rest is along the line: the site scale against the projection's, which rigid placement ignores. The catalog checks the gap against that hand formula within 1%.`,
    },
  ];
}

/** The checked setup's gap, once per worker (it is the same every time). */
let checkedGap: number | undefined;

export const evaluateBimSite: ScenarioEvaluator = async (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
  cache: FrameCache<EngineeringFrame>,
) => {
  const instant = Instant.fromTdb(epochTdb);
  const { crs, site, rotation, scale } = bimSite(knobs);
  const frame = frameOf(ctx, cache, crs, site);
  const plain = frameOf(ctx, cache, crs);
  const gap = siteGap(frame, site, BIM_LINE.mark);
  const far = siteGap(frame, site, BIM_LINE.length);
  if (checkedGap === undefined) {
    const c = bimSite(SPEC.checked.knobs);
    checkedGap = siteGap(
      frameOf(ctx, cache, c.crs, c.site),
      c.site,
      BIM_LINE.mark,
    ).gap;
  }
  const origin = Ellipsoid.WGS84.cartesianToCartographic(
    frame.toBodyFixed([0, 0, 0]),
    { longitude: 0, latitude: 0, height: 0 },
  )!;
  const lat = (origin.latitude * 180) / Math.PI;
  const lon = (origin.longitude * 180) / Math.PI;
  const edge = crsEdge(plain);
  const datum =
    edge.accuracy.meters !== undefined
      ? `±${edge.accuracy.meters} m (PROJ's operation to WGS 84)`
      : edge.accuracy.byDefinition
        ? "exact (the CRS is on WGS 84)"
        : "not known (PROJ states no accuracy)";
  const drop = gap.parts.drop;
  const along = gap.parts.along;
  return {
    scenario: "bim-site",
    added: [
      { id: crs.name, label: crs.name, parentId: "ITRF", edge },
      {
        id: BIM_SITE_GRID,
        label: BIM_SITE_GRID,
        parentId: crs.name,
        edge: {
          kind: "constant",
          detail: `IFC map conversion: origin ${designText(crs.origin[0], crs)} E, ${designText(crs.origin[1], crs)} N; rotation ${fmt(rotation, 4)}° (counterclockwise from grid east); scale ${scale}`,
          accuracy: {
            byDefinition: true,
            note: "exact by definition: the site formula, a rotation and a scale",
          },
        },
      },
    ],
    data: {
      label: "The model's site origin",
      frame: crs.name,
      source: "IFC map conversion",
      describes: `its easting and northing, ${designText(crs.origin[0], crs)} and ${designText(crs.origin[1], crs)}`,
      accuracy: {
        byDefinition: true,
        note: "exact: the model's own numbers, as its map conversion gives them",
      },
    },
    answer: {
      label: "rigid against exact, 20 km along the site grid",
      aside: `Site origin at ${degrees(lat, "N", "S")}, ${degrees(lon, "E", "W")} (${crs.place.where}), to ${datum}`,
      headline: `Placed exactly, every point of the model goes through its map conversion and ${crs.name}'s PROJ operation to the Earth. Placed rigidly, the model is laid flat at its origin, and ${BIM_LINE.mark / 1000} km out along its x axis it is ${metres(gap.gap)} off: ${metres(drop)} above the ground as the Earth curves away, and ${metres(Math.abs(along))} ${along >= 0 ? "too far" : "short"} along the line, the site scale (${scale}) against ${crs.name}'s (${fmt(gap.gridScale, 8)} there). At ${BIM_LINE.length / 1000} km the two lines are ${metres(far.gap / 1000, 1).replace(" m", " km")} apart.`,
      value: gap.gap,
      unit: "m",
      accuracy: {
        note: `exact arithmetic: both placements go through the same PROJ operation, so its datum accuracy, ${datum}, moves them together and stays out of the gap; it is where the whole site sits on the Earth`,
      },
      path: { from: crs.name, to: "ITRF" },
      method: method(crs),
    },
    overlays: [],
    live: liveChecks(ctx, frame, plain, crs, site, gap, instant),
    checkedAnswerValue: checkedGap,
  };
};

registerScenario("bim-site", evaluateBimSite);
