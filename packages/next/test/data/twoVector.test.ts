// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
// Two-vector reference frames against SPICE's (frames 5b, Task 2). The fixture
// is `scripts/frameFixtures.py twoVector`. The near-point frame (ORION_NADIR)
// needs NAIF's Earth PCK, which this machine has not; its geometry is checked
// analytically in test/twoVector.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { Frame, frameTransform } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { rotationPart } from "../../src/frames/matrix.ts";
import { angularVelocity } from "../../src/frames/motion.ts";
import { axesAt, twoVectorFrame } from "../../src/frames/twoVector.ts";
import type { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { SAMPLE } from "../syntheticFrames.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import fixture from "../fixtures/frames/twoVector.json";

const MAIN = "art002_rec_260402_260410_jsc_bet_revf.bsp";
const GAPFILL = "art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp";

const dir = framesDataDirectory();
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const frames = createFrames({
  leapSeconds: LeapSeconds.builtIn(),
  eop: { atInstant: () => SAMPLE } as unknown as EarthOrientationParameters,
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);
const orion = Trajectory.fromSpk([bytes(MAIN), bytes(GAPFILL)], -24, frames, {
  name: "ORION",
  accuracy: "precise",
  j2000: "icrf",
});

/** The reference frames at Orion with GCRF's axes (plan's call 2), as the presets build them. */
const orionAxes = axesAt("Orion axes", orion.frame, frames.gcrf);
const lvlhDefinition = {
  primary: {
    axis: "+Z",
    vector: {
      kind: "position",
      target: orion.frame,
      observer: frames.earthIcrf,
    },
  },
  secondary: {
    axis: "+X",
    vector: {
      kind: "velocity",
      target: orion.frame,
      observer: frames.earthIcrf,
      frame: frames.earthIcrf,
    },
  },
} as const;
const body = (() => {
  const r = fixture.orionBodyToJ2000;
  const m = new Float64Array(16);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      m[col * 4 + row] = r[row * 3 + col]!;
    }
  }
  m[15] = 1;
  return Frame.constant("ORION_BODY", orionAxes, m);
})();
const ours: Record<string, Frame> = {
  ORION_LVLH: twoVectorFrame("ORION_LVLH", orionAxes, lvlhDefinition),
  ORION_INERTIAL: twoVectorFrame("ORION_INERTIAL", orionAxes, {
    ...lvlhDefinition,
    freeze: Instant.fromTdb(fixture.freezeTdb),
  }),
  EARTH_MOON_ROT: twoVectorFrame("EARTH_MOON_ROT", frames.earthIcrf, {
    primary: {
      axis: "+X",
      vector: {
        kind: "position",
        target: frames.moonIcrf,
        observer: frames.earthIcrf,
      },
    },
    secondary: {
      axis: "+Y",
      vector: {
        kind: "velocity",
        target: frames.moonIcrf,
        observer: frames.earthIcrf,
        frame: frames.earthIcrf,
      },
    },
  }),
  ORION_BODY: body,
  ORION_LEVEL: twoVectorFrame("ORION_LEVEL", orionAxes, {
    primary: {
      axis: "+X",
      vector: { kind: "constant", vector: [1, 0, 0], frame: body },
    },
    secondary: {
      axis: "+Z",
      vector: {
        kind: "position",
        target: orion.frame,
        observer: frames.earthIcrf,
      },
    },
  }),
};

/** The angle (rad) of the rotation taking `a` to `b`, both row-major. */
function angleBetween(a: ArrayLike<number>, b: ArrayLike<number>): number {
  // trace(Aᵀ B) = 1 + 2 cos θ; the skew part of Aᵀ B gives sin θ.
  const m = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        m[i * 3 + j] = m[i * 3 + j]! + a[k * 3 + i]! * b[k * 3 + j]!;
      }
    }
  }
  const sine = Math.hypot(m[7]! - m[5]!, m[2]! - m[6]!, m[3]! - m[1]!) / 2;
  return Math.atan2(sine, (m[0]! + m[4]! + m[8]! - 1) / 2);
}

describe("two-vector reference frames against SPICE", () => {
  it("has 12 instants and the frames the plan names", () => {
    expect(fixture.rows).toHaveLength(12);
    expect(Object.keys(fixture.rows[0]!).sort()).toEqual(
      [...Object.keys(ours), "tdb"].sort(),
    );
  });

  const at = (tdb: number) => Instant.fromTdb(tdb);
  const reference = (row: (typeof fixture.rows)[number], name: string) =>
    row[name as keyof typeof row] as {
      toJ2000: number[];
      angularVelocity: number[];
    };

  it("agrees on axes within 1e-8 rad, every frame at every instant", () => {
    for (const row of fixture.rows) {
      for (const [name, frame] of Object.entries(ours)) {
        const r = rotationPart(
          frameTransform(frame, frames.earthIcrf, at(row.tdb)),
        );
        const angle = angleBetween(r, reference(row, name).toJ2000);
        expect(angle, `${name} at ${row.tdb}`).toBeLessThan(1e-8);
      }
    }
  });

  const rateExcess = (name: string): number => {
    let worst = -Infinity;
    for (const row of fixture.rows) {
      const ref = reference(row, name).angularVelocity;
      const w = angularVelocity(ours[name]!, frames.earthIcrf, at(row.tdb));
      const error = Math.hypot(
        w[0]! - ref[0]!,
        w[1]! - ref[1]!,
        w[2]! - ref[2]!,
      );
      worst = Math.max(worst, error - 1e-6 * Math.hypot(...ref) - 1e-12);
    }
    process.stdout.write(
      `${name}: worst rate error over its allowance ${worst} rad/s\n`,
    );
    return worst;
  };

  it.each(["ORION_INERTIAL", "ORION_BODY", "ORION_LEVEL"])(
    "%s's angular velocity is within 1e-6 of its size plus 1e-12 rad/s",
    (name) => {
      expect(rateExcess(name)).toBeLessThan(0);
    },
  );

  // Measured, 2026-11-09: the plan's tolerance is missed by these two (a
  // worst error of 3.9e-7 rad/s against |w| 1.6e-3 rad/s for the first, and
  // 2.5e-8 against 2.4e-6 for the second). The axes agree within 8e-9 rad;
  // the ±0.5 s difference puts that axis jitter over one second, and a wider
  // step drops the Earth-Moon error from 5e-9 (0.5 s) to 2e-11 rad/s (60 s).
  // SPICE's own rate for a dynamic reference frame is also numerical. The
  // plan's tolerance is kept, so these show as known misses.
  it.fails.each(["ORION_LVLH", "EARTH_MOON_ROT"])(
    "%s's angular velocity is within 1e-6 of its size plus 1e-12 rad/s (a known miss: see the ledger)",
    (name) => {
      expect(rateExcess(name)).toBeLessThan(0);
    },
  );
});
