// Recorded operations: the GEOID18 grid recorded, and a missing grid named (R7).
import {
  EngineeringFrame,
  designPoint,
} from "../../../../src/engineering/EngineeringFrame.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  CALIFORNIA,
  GEOID,
  type StressCase,
  expectThrow,
  plainAccuracy,
} from "../runner.ts";
import {
  MEASURED_AT,
  epsg,
  fingerprintOf,
  proj,
  stressCase,
  utc,
} from "../shared.ts";

const geoidGridCase = stressCase(
  "recorded-operations.geoid",
  "recorded-operations",
  "EPSG:6420+6360 records its operation once, with the GEOID18 grid us_noaa_g2018u0.tif in its pipeline",
  ["frames", "proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: "California zone 3", body: EARTH, crs: CALIFORNIA },
      proj(ctx),
    );
    const op = frame.operation;
    const designs = [
      [6_561_666.667, 1_640_416.667, 0],
      [6_000_000, 2_100_000, 100],
      [6_600_000, 2_300_000, 1000],
    ];
    const instant = utc(ctx, MEASURED_AT);
    const m = measure(
      designPoint(frame, designs[0]!),
      designPoint(frame, designs[1]!),
      instant,
      ctx.frames,
      { signal: false },
    );
    return [
      {
        ...base,
        pass:
          op.grids.includes(GEOID) &&
          op.pipeline.includes(`+grids=${GEOID}`) &&
          !op.ballpark,
        detail: `pipeline ${op.pipeline}; accuracy ${op.accuracy} m`,
        accuracy: plainAccuracy(m.accuracy),
        fingerprint: fingerprintOf(ctx, frame, designs),
        instant: instant.tdb(),
      },
    ];
  },
);

const missingGridCase = stressCase(
  "recorded-operations.missing-grid",
  "recorded-operations",
  "EPSG:22617+9245 (NAD83(CSRS)v6 / UTM 17N + CGVD2013a(2010) height) needs ca_nrc_CGG2013an83.tif, which is never loaded: creating the frame throws, naming that grid",
  ["proj"],
  async (ctx, base) => [
    await expectThrow(base, /missing: .*ca_nrc_CGG2013an83\.tif/, () =>
      EngineeringFrame.create(
        { name: "Ontario", body: EARTH, crs: epsg(22617, 9245) },
        proj(ctx),
      ),
    ),
  ],
);

export const recordedOperationsCases: readonly StressCase[] = [
  geoidGridCase,
  missingGridCase,
];
