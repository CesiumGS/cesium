// Measurement: grid to ground, clothoid stations and offsets, design against ITRF.
import {
  EngineeringFrame,
  type SiteTransform,
  designPoint,
} from "../../../../src/engineering/EngineeringFrame.ts";
import {
  Alignment,
  type AlignmentDefinition,
} from "../../../../src/engineering/alignment.ts";
import { framePoint } from "../../../../src/frames/local.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { CALIFORNIA, type StressCase, plainAccuracy } from "../runner.ts";
import {
  ALIGNMENT_RECOVERY,
  GRID_TO_GROUND,
  MEASURED_AT,
  SAME_DISTANCE,
  SITE_ORIGIN,
  US_SURVEY_FOOT,
  proj,
  stressCase,
  utc,
} from "../shared.ts";

const MEASUREMENT_SITE: SiteTransform = {
  origin: SITE_ORIGIN,
  rotation: (12.5 * Math.PI) / 180,
  scale: 1.0000375,
};

const gridToGroundCase = stressCase(
  "measurement.grid-to-ground",
  "measurement",
  "A 10,000 ftUS design line on California zone 3 (site scale 1.0000375): design distance × site scale × metres per foot ÷ mean combined factor is the true distance, within 0.01 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site",
        body: EARTH,
        crs: CALIFORNIA,
        site: MEASUREMENT_SITE,
      },
      proj(ctx),
    );
    const instant = utc(ctx, MEASURED_AT);
    const length = 10_000; // design ftUS, east along the site grid
    const m = measure(
      designPoint(frame, [2000, 1000, 25]),
      designPoint(frame, [2000 + length, 1000, 25]),
      instant,
      ctx.frames,
      { signal: false },
    );
    const d = m.design!;
    // From the known inputs, not the measurement's own design fields: the
    // only library number in the prediction is the combined factor.
    const predicted =
      (length * MEASUREMENT_SITE.scale * US_SURVEY_FOOT) /
      d.combinedFactor.mean;
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(m.distance - predicted),
        tolerance: GRID_TO_GROUND,
        unit: "m",
        detail: `design ${d.distance} ${d.unitName}; true ${m.distance} m; predicted ${predicted} m; combined factor ${d.combinedFactor.mean}`,
        accuracy: plainAccuracy(m.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

// A tangent, a clothoid in, a left arc of radius 800, a clothoid out and a
// tangent, eastbound from (1000, 1000), stations 0 to 2000.
const CLOTHOID_ROAD: AlignmentDefinition = {
  name: "Clothoid road",
  start: [1000, 1000],
  startAzimuth: Math.PI / 2,
  startStation: 0,
  horizontal: [
    { kind: "line", length: 500 },
    { kind: "spiral", length: 300, startRadius: Infinity, endRadius: 800 },
    { kind: "arc", length: 400, radius: 800 },
    { kind: "spiral", length: 300, startRadius: 800, endRadius: Infinity },
    { kind: "line", length: 500 },
  ],
};

const clothoidCase = stressCase(
  "measurement.clothoid",
  "measurement",
  "Points at stations and offsets along a clothoid alignment (tangent, spiral, arc, spiral, tangent) give back their station and offset within 1e-9 design units",
  [],
  async (_ctx, base) => {
    const road = new Alignment(CLOTHOID_ROAD);
    let worst = 0;
    let count = 0;
    for (const station of [100, 520, 650, 790, 1000, 1210, 1350, 1480, 1900]) {
      for (const offset of [-25, 0, 15]) {
        const point = road.pointAt(station, offset);
        const found = road.stationOffset(point);
        worst = Math.max(
          worst,
          Math.abs(found.station - station),
          Math.abs(found.offset - offset),
        );
        count++;
      }
    }
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: ALIGNMENT_RECOVERY,
        unit: "design units",
        detail: `${count} points, every element`,
      },
    ];
  },
);

const designVsItrfCase = stressCase(
  "measurement.design-vs-itrf",
  "measurement",
  "A design point measured to another point gives the same distance as the design point fixed in ITRF, within 1e-9 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site",
        body: EARTH,
        crs: CALIFORNIA,
        site: MEASUREMENT_SITE,
      },
      proj(ctx),
    );
    const instant = utc(ctx, MEASURED_AT);
    const a = designPoint(frame, [2000, 1000, 25]);
    const other = framePoint(
      ctx.frames.itrf,
      frame.toBodyFixed([9000, -4000, 400]),
    );
    const fromDesign = measure(a, other, instant, ctx.frames, {
      signal: false,
    });
    const fromItrf = measure(
      framePoint(ctx.frames.itrf, frame.toBodyFixed(a.design)),
      other,
      instant,
      ctx.frames,
      { signal: false },
    );
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(fromDesign.distance - fromItrf.distance),
        tolerance: SAME_DISTANCE,
        unit: "m",
        detail: `${fromDesign.distance} m from the design point, ${fromItrf.distance} m from its ITRF position`,
        accuracy: plainAccuracy(fromDesign.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

export const measurementCases: readonly StressCase[] = [
  gridToGroundCase,
  clothoidCase,
  designVsItrfCase,
];
