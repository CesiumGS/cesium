// Trajectory: Orion's gaps (R7) and its state in MOON_ME at the flyby.
import { frameTransform } from "../../../../src/frames/Frame.ts";
import { convertPoint, framePoint } from "../../../../src/frames/local.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { type StressCase, expectThrow, fmt, plainAccuracy } from "../runner.ts";
import {
  FLYBY,
  compositionTolerance,
  distance,
  norm,
  orion,
  stressCase,
  translationOf,
  utc,
} from "../shared.ts";

const orionGapCase = stressCase(
  "trajectory.gap",
  "trajectory",
  "Orion's state at 2026-04-02T22:49:30 UTC, in a gap between the OEM's segments, throws and names the covered spans",
  ["orion"],
  async (ctx, base) => {
    const instant = utc(ctx, "2026-04-02T22:49:30");
    const result = await expectThrow(
      base,
      /outside its data \(covered: \d{4}-.+ to \d{4}-.+; \d{4}-.+ to \d{4}-/,
      () => orion(ctx).state(instant),
    );
    return [{ ...result, instant: instant.tdb() }];
  },
);

const orionMoonCase = stressCase(
  "trajectory.moon-me",
  "trajectory",
  "Orion at the lunar flyby (2026-04-06T23:00 UTC) in MOON_ME: its distance from the Moon's centre is kept, and it round-trips within 1 mm per 10⁹ m",
  ["orion"],
  async (ctx, base) => {
    const o = orion(ctx);
    const f = ctx.frames;
    const instant = utc(ctx, FLYBY);
    const state = o.state(instant);
    const p = framePoint(o.reference, state.subarray(0, 3), instant);
    const inMe = convertPoint(p, f.moonMe);
    const back = convertPoint(inMe, o.reference);
    const toMe = frameTransform(o.reference, f.moonMe, instant);
    const fromMe = frameTransform(f.moonMe, o.reference, instant);
    // The Moon's centre in Orion's reference frame: a rigid rotation about it
    // keeps the distance.
    const moonCentre = frameTransform(
      f.moonIcrf,
      o.reference,
      instant,
    ).subarray(12, 15);
    const fromCentre = distance(p.position, moonCentre);
    const kept = Math.abs(norm(inMe.position) - fromCentre);
    const tolerance = compositionTolerance(
      [translationOf(toMe), translationOf(fromMe)],
      [norm(p.position), norm(inMe.position)],
    );
    const accuracy = plainAccuracy(
      measure(
        framePoint(f.moonMe, [0, 0, 0]),
        framePoint(o.frame, [0, 0, 0]),
        instant,
        f,
        { signal: false },
      ).accuracy,
    );
    return [
      {
        ...base,
        id: `${base.id}.distance`,
        title:
          "Orion at the lunar flyby, converted to MOON_ME, keeps its distance from the Moon's centre (within 1 mm per 10⁹ m)",
        pass: true,
        value: kept,
        tolerance,
        unit: "m",
        detail: `${fmt(fromCentre / 1000, 7)} km from the Moon's centre`,
        accuracy,
        instant: instant.tdb(),
      },
      {
        ...base,
        id: `${base.id}.round-trip`,
        title:
          "Orion at the lunar flyby round-trips through MOON_ME back to its reference frame within 1 mm per 10⁹ m",
        pass: true,
        value: distance(back.position, p.position),
        tolerance,
        unit: "m",
        detail: `reference ${o.reference.name}`,
        accuracy,
        instant: instant.tdb(),
      },
    ];
  },
);

export const trajectoryCases: readonly StressCase[] = [
  orionGapCase,
  orionMoonCase,
];
