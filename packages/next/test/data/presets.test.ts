// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
// Rig presets on the catalog against the same SPICE two-vector fixture as
// twoVector.test.ts (see its notes on the near-point frame and on angular
// velocity).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrameCatalog } from "../../src/frames/catalog.ts";
import { Frame, frameTransform } from "../../src/frames/Frame.ts";
import { rotationPart } from "../../src/frames/matrix.ts";
import { rigPreset } from "../../src/frames/presets.ts";
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
const data = {
  leapSeconds: LeapSeconds.builtIn(),
  eop: { atInstant: () => SAMPLE } as unknown as EarthOrientationParameters,
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData;

/** The angle (rad) of the rotation taking `a` to `b`, both row-major. */
function angleBetween(a: ArrayLike<number>, b: ArrayLike<number>): number {
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

describe("rig presets against SPICE's two-vector frames", () => {
  it("orbital, inertial and level match ORION_LVLH, ORION_INERTIAL and ORION_LEVEL within 1e-8 rad", async () => {
    const catalog = createFrameCatalog({ data });
    const tree = await catalog.tree();
    const orion = Trajectory.fromSpk([bytes(MAIN), bytes(GAPFILL)], -24, tree, {
      name: "ORION",
      accuracy: "precise",
      j2000: "icrf",
    });
    const r = fixture.orionBodyToJ2000;
    const m = new Float64Array(16);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        m[col * 4 + row] = r[row * 3 + col]!;
      }
    }
    m[15] = 1;
    const body = Frame.constant("ORION_BODY", orion.frame, m);
    const base = { catalog, target: orion.frame };
    const orbital = rigPreset("orbital", base).frames[1]!;
    const inertial = rigPreset("inertial", {
      ...base,
      at: Instant.fromTdb(fixture.freezeTdb),
    }).frames[1]!;
    const level = rigPreset("level", { ...base, body }).frames[1]!;
    const cockpit = rigPreset("cockpit", { ...base, body });
    expect(cockpit.rig.position.frame).toBe(body);
    const worst = { orbital: 0, inertial: 0, level: 0 };
    for (const row of fixture.rows) {
      const at = Instant.fromTdb(row.tdb);
      const check = (key: keyof typeof worst, f: Frame, name: string) => {
        const ref = (row as unknown as Record<string, { toJ2000: number[] }>)[
          name
        ]!;
        const angle = angleBetween(
          rotationPart(frameTransform(f, tree.earthIcrf, at)),
          ref.toJ2000,
        );
        worst[key] = Math.max(worst[key], angle);
        expect(angle, `${key} at ${row.tdb}`).toBeLessThan(1e-8);
      };
      check("orbital", orbital, "ORION_LVLH");
      check("inertial", inertial, "ORION_INERTIAL");
      check("level", level, "ORION_LEVEL");
    }
    process.stdout.write(
      `presets: worst axes error orbital ${worst.orbital}, inertial ${worst.inertial}, level ${worst.level} rad\n`,
    );
  });
});
