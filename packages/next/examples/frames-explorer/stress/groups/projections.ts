// Projections: design round trips on 17 CRSs (Global Constraints: 1e-4 m).
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { type CrsRef, crsDefinition } from "../../../../src/engineering/crs.ts";
import { fromDegrees } from "../../../../src/math/ellipsoid.ts";
import { type Body, EARTH, MOON } from "../../../../src/scene/Body.ts";
import { CALIFORNIA, type Need, type StressCase } from "../runner.ts";
import {
  DESIGN_ROUND_TRIP,
  epsg,
  fingerprintOf,
  proj,
  stressCase,
  worstRoundTrip,
} from "../shared.ts";

interface ProjectionSet {
  readonly crs: CrsRef;
  readonly name: string;
  readonly body: Body;
  /** The projection's natural origin (or the pole), degrees. */
  readonly origin: readonly [number, number];
  /** A point at the zone's edge, degrees. */
  readonly edge: readonly [number, number];
  readonly needs: readonly Need[];
}

const utmSet = (zone: number, south = false): ProjectionSet => {
  const centralMeridian = -183 + 6 * zone;
  return {
    crs: epsg((south ? 32700 : 32600) + zone),
    name: `WGS 84 / UTM zone ${zone}${south ? "S" : "N"}`,
    body: EARTH,
    origin: [centralMeridian, 0],
    // The zone's edge at the equator, where it is widest.
    edge: [centralMeridian + 3, 0],
    needs: ["proj"],
  };
};

const PROJECTION_SETS: readonly ProjectionSet[] = [
  ...Array.from({ length: 10 }, (_, i) => utmSet(10 + i)),
  utmSet(32),
  utmSet(33, true),
  {
    crs: CALIFORNIA,
    name: "NAD83(2011) / California zone 3 (ftUS) + NAVD88 height (ftUS), with GEOID18",
    body: EARTH,
    origin: [-120.5, 36.5],
    // The zone's north-east corner.
    edge: [-117.83, 38.71],
    needs: ["proj", "geoid"],
  },
  {
    crs: epsg(2223),
    name: "NAD83 / Arizona Central (ft)",
    body: EARTH,
    origin: [-111.916666666667, 31],
    edge: [-113.35, 34],
    needs: ["proj"],
  },
  {
    crs: epsg(3413),
    name: "WGS 84 / NSIDC Sea Ice Polar Stereographic North",
    body: EARTH,
    origin: [-45, 90],
    edge: [0, 60],
    needs: ["proj"],
  },
  {
    crs: epsg(3031),
    name: "WGS 84 / Antarctic Polar Stereographic",
    body: EARTH,
    origin: [0, -90],
    edge: [0, -60],
    needs: ["proj"],
  },
  {
    crs: { format: "wkid", authority: "IAU_2015", wkid: 30135 },
    name: "Moon (2015) - Sphere / Ocentric / South Polar",
    body: MOON,
    origin: [0, -90],
    edge: [90, -60],
    needs: ["proj"],
  },
];

function projectionCase(set: ProjectionSet): StressCase {
  const code = crsDefinition(set.crs);
  const id = `projections.${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const title = `${code} (${set.name}): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 10⁻⁴ m`;
  return stressCase(id, "projections", title, set.needs, async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: set.name, body: set.body, crs: set.crs },
      proj(ctx),
    );
    const designOf = (lonLat: readonly [number, number]) =>
      frame.fromBodyFixed(
        set.body.ellipsoid.cartographicToCartesian(
          fromDegrees(lonLat[0], lonLat[1], 0),
          new Float64Array(3),
        ),
      );
    const origin = designOf(set.origin);
    const unit = frame.units.metersPerUnit;
    const designs: Float64Array[] = [origin];
    // 50 km along grid north, in eleven points.
    for (let i = 1; i <= 10; i++) {
      designs.push(
        Float64Array.of(origin[0]!, origin[1]! + (i * 5000) / unit, origin[2]!),
      );
    }
    designs.push(
      Float64Array.of(origin[0]! + 100_000 / unit, origin[1]!, origin[2]!),
    );
    designs.push(designOf(set.edge));
    const worst = worstRoundTrip(frame, designs);
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: DESIGN_ROUND_TRIP,
        unit: "m",
        detail: `${designs.length} points; operation accuracy ${frame.operation.accuracy === undefined ? "not stated" : `${frame.operation.accuracy} m`}`,
        fingerprint: fingerprintOf(ctx, frame, designs),
      },
    ];
  });
}

export const projectionsCases: readonly StressCase[] =
  PROJECTION_SETS.map(projectionCase);
