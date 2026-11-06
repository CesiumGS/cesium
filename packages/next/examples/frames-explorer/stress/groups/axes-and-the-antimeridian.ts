// Axes and the antimeridian
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { resolveOperation } from "../../../../src/engineering/crs.ts";
import { framePoint } from "../../../../src/frames/local.ts";
import { fromDegrees } from "../../../../src/math/ellipsoid.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  DEGREE,
  type NgsMark,
  PI_REMAINDER,
  cited,
  ellipsoidOf,
  onEarth,
  printed,
  radii,
  sexagesimal,
} from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  DESIGN_ROUND_TRIP,
  EFFECT,
  MEASURED_AT,
  SAME_DISTANCE,
  epsg,
  proj,
  stressCase,
  utc,
  worstRoundTrip,
} from "../shared.ts";

const axesCase = stressCase(
  "axes-and-the-antimeridian.axes",
  "axes-and-the-antimeridian",
  "Axis order: GU2195's latitude and longitude given as EPSG:4326 in the documented longitude-first order land on its published UTM coordinates, and a northing-first CRS (EPSG:31467) still takes design E east and N north",
  ["proj"],
  async (ctx, base) => {
    const mark = cited<NgsMark>("ngs-GU2195");
    const lat = sexagesimal(mark.latitude).value;
    const lon = sexagesimal(mark.longitude).value;
    // RecordedOperation's documented order: longitude before latitude.
    const op = resolveOperation(proj(ctx), epsg(4326), "EPSG:6339");
    const utm = op.forward([lon, lat, 0]);
    const north = printed(mark.utm.north).value;
    const east = printed(mark.utm.east).value;
    // DHDN / 3-degree Gauss-Kruger zone 3, whose EPSG axis order is northing
    // first. A point on its central meridian (E = FE = 3 500 000): its
    // longitude is 9° up to the datum shift; 1 km steps east and north move
    // the longitude by 1000/(N cos φ) and the latitude by 1000/M, by hand.
    const gk = EngineeringFrame.create(
      {
        name: "DHDN / 3-degree Gauss-Kruger zone 3",
        body: EARTH,
        crs: epsg(31467),
      },
      proj(ctx),
    );
    const p0 = gk.toGeodetic([3_500_000, 5_540_000, 0]);
    const pe = gk.toGeodetic([3_501_000, 5_540_000, 0]);
    const pn = gk.toGeodetic([3_500_000, 5_541_000, 0]);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const r = radii(wgs84.a, wgs84.e2, p0.latitude / DEGREE);
    const handLon = 1000 / (r.N * Math.cos(p0.latitude));
    const handLat = 1000 / r.M;
    const eastError = Math.abs((pe.longitude - p0.longitude) / handLon - 1);
    const northError = Math.abs((pn.latitude - p0.latitude) / handLat - 1);
    const onMeridian = Math.abs(p0.longitude / DEGREE - 9) < 0.01;
    return [
      {
        ...base,
        id: `${base.id}.epsg-4326`,
        title: `GU2195's ${mark.latitude} ${mark.longitude} as EPSG:4326, longitude first, to NAD83(2011) / UTM zone 10N: within 1 mm of its published N ${mark.utm.north}, E ${mark.utm.east}`,
        pass: true,
        value: Math.hypot(utm[0]! - east, utm[1]! - north),
        tolerance: 1e-3,
        unit: "m",
        detail: `computed E ${utm[0]!.toFixed(4)}, N ${utm[1]!.toFixed(4)}; pipeline ${op.pipeline}`,
      },
      {
        ...base,
        id: `${base.id}.northing-first`,
        title:
          "EPSG:31467 (northing first in EPSG): design (3 500 000, 5 540 000) lies on the 9° meridian, and 1 km steps in design E and N move east and north by the hand-computed angles, within 2%",
        pass:
          onMeridian && Math.abs(pe.latitude - p0.latitude) < 0.01 * handLat,
        value: Math.max(eastError, northError),
        tolerance: EFFECT,
        detail: `origin ${fmt(p0.longitude / DEGREE, 9)}°E ${fmt(p0.latitude / DEGREE, 9)}°N; east step ${fmt((pe.longitude - p0.longitude) / DEGREE, 7)}° (hand ${fmt(handLon / DEGREE, 7)}°), north step ${fmt((pn.latitude - p0.latitude) / DEGREE, 7)}° (hand ${fmt(handLat / DEGREE, 7)}°)`,
      },
    ];
  },
);

const antimeridianCase = stressCase(
  "axes-and-the-antimeridian.antimeridian",
  "axes-and-the-antimeridian",
  "UTM zones 1 and 60 at ±179.999°: points round-trip within 1e-4 m, a design line across 180° in zone 60 has continuous E, and two equator points either side of 180° are 2a sin(∆λ/2) apart within 1e-9 m",
  ["proj"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    for (const zone of [1, 60]) {
      const frame = EngineeringFrame.create(
        {
          name: `WGS 84 / UTM zone ${zone}N`,
          body: EARTH,
          crs: epsg(32600 + zone),
        },
        proj(ctx),
      );
      const designs = [-179.999, 179.999].flatMap((lon) =>
        [0, 45].map((lat) => frame.fromBodyFixed(onEarth(lon, lat))),
      );
      results.push({
        ...base,
        id: `${base.id}.zone-${zone}`,
        title: `UTM zone ${zone}N: points at ±179.999° (latitudes 0° and 45°) round-trip within 1e-4 m`,
        pass: true,
        value: worstRoundTrip(frame, designs),
        tolerance: DESIGN_ROUND_TRIP,
        unit: "m",
        detail: designs.map((d) => `E ${d[0]!.toFixed(3)}`).join(", "),
      });
      if (zone === 60) {
        // Longitudes 179.97° to −179.97° (180.03°) in 0.01° steps, across 180°.
        const steps = Array.from({ length: 7 }, (_, i) => {
          const lon = 179.97 + 0.01 * i;
          return frame.fromBodyFixed(
            onEarth(lon > 180 ? lon - 360 : lon, 0),
          )[0]!;
        });
        const deltas = steps.slice(1).map((e, i) => e - steps[i]!);
        const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        const spread = Math.max(...deltas.map((d) => Math.abs(d / mean - 1)));
        results.push({
          ...base,
          id: `${base.id}.zone-60-line`,
          title:
            "A design line across 180° in UTM zone 60N (179.97° to −179.97° at the equator): E increases in equal steps, with no jump",
          pass: deltas.every((d) => d > 0),
          value: spread,
          tolerance: 0.01,
          detail: `E steps ${deltas.map((d) => d.toFixed(3)).join(", ")} m`,
        });
      }
    }
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const a = framePoint(ctx.frames.itrf, onEarth(179.999, 0));
    const b = framePoint(ctx.frames.itrf, onEarth(-179.999, 0));
    const instant = utc(ctx, MEASURED_AT);
    const m = measure(a, b, instant, ctx.frames, { signal: false });
    // ∆λ/2 = π − λ for the float64 longitude λ the points are made of (their
    // longitudes are ±λ), with π in two parts: Math.PI is π less
    // 1.2246467991473532e-16, which at a = 6378 km is 1.6e-9 m of chord. So
    // the input's own rounding (λ is 179.999° only to 2e-16 rad, 1.4e-9 m)
    // is not counted against the library.
    const lambda = fromDegrees(179.999, 0).longitude;
    const halfGap = Math.PI - lambda + PI_REMAINDER;
    const hand = 2 * wgs84.a * Math.sin(halfGap);
    results.push({
      ...base,
      id: `${base.id}.chord`,
      title:
        "Equator points at 179.999° and −179.999°: their measured straight-line distance is 2a sin(∆λ/2) for ∆λ = 0.002°, within 1e-9 m",
      pass: true,
      value: Math.abs(m.distance - hand),
      tolerance: SAME_DISTANCE,
      unit: "m",
      detail: `measured ${m.distance} m, by hand ${hand} m (∆λ/2 = ${halfGap} rad)`,
      instant: instant.tdb(),
    });
    return results;
  },
);

export const axesAndTheAntimeridianCases: readonly StressCase[] = [
  axesCase,
  antimeridianCase,
];
