// Time: the leap second, the end of the EOP table and the leap-second table's expiry.
import { framePoint } from "../../../../src/frames/local.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { Instant } from "../../../../src/time/Instant.ts";
import { type StressCase, expectThrow, fmt, plainAccuracy } from "../runner.ts";
import { TT_STEP, stressCase, utc } from "../shared.ts";

const leapSecondCase = stressCase(
  "time.leap-second",
  "time",
  "Instant.fromIso across the leap second 2016-12-31T23:59:60: monotonic in 0.5 s steps, with TT advancing 2 s over the one UTC second",
  ["frames"],
  async (ctx, base) => {
    const labels = [
      "2016-12-31T23:59:59.0",
      "2016-12-31T23:59:59.5",
      "2016-12-31T23:59:60.0",
      "2016-12-31T23:59:60.5",
      "2017-01-01T00:00:00.0",
      "2017-01-01T00:00:00.5",
    ];
    const tt = labels.map((label) => utc(ctx, label).tt);
    let steps = 0;
    let monotonic = true;
    for (let i = 1; i < tt.length; i++) {
      monotonic &&= tt[i]! > tt[i - 1]!;
      steps = Math.max(steps, Math.abs(tt[i]! - tt[i - 1]! - 0.5));
    }
    const across = tt[4]! - tt[0]!;
    return [
      {
        ...base,
        id: `${base.id}.monotonic`,
        title:
          "UTC labels every 0.5 s from 23:59:59 through 23:59:60.5 to 00:00:00.5 give TT strictly increasing in 0.5 s steps",
        pass: monotonic,
        value: steps,
        tolerance: TT_STEP,
        unit: "s",
        detail: `TT − TT₀: ${tt.map((t) => fmt(t - tt[0]!, 6)).join(", ")} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
      {
        ...base,
        id: `${base.id}.two-seconds`,
        title:
          "From 2016-12-31T23:59:59 to 2017-01-01T00:00:00 UTC, one labelled second, TT advances 2 s",
        pass: true,
        value: Math.abs(across - 2),
        tolerance: TT_STEP,
        unit: "s",
        detail: `TT advanced ${across} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
    ];
  },
);

/** DSS-43's site (Canberra), ITRF metres, rounded: any Earth-fixed point does. */
const CANBERRA = [-4_460_894.9, 2_682_361.5, -3_674_748.2];

const eopEndCase = stressCase(
  "time.eop-end",
  "time",
  "An Earth-fixed measurement 60 days past the EOP table's predictions throws, giving the table's dates",
  ["frames"],
  async (ctx, base) => {
    const { eop, leapSeconds } = ctx.frames.data;
    const instant = Instant.fromUtc(eop.last + 60 * 86_400_000, leapSeconds);
    const result = await expectThrow(
      base,
      /ITRF: the EOP table covers .* and its predictions end there/,
      () =>
        measure(
          framePoint(ctx.frames.itrf, CANBERRA),
          framePoint(ctx.frames.gcrf, [7_000_000, 0, 0]),
          instant,
          ctx.frames,
        ),
    );
    return [{ ...result, instant: instant.tdb() }];
  },
);

const leapExpiryCase = stressCase(
  "time.leap-expiry",
  "time",
  "A measurement 30 days past the leap-second table's expiry carries the warning that a leap second may have been missed",
  ["frames"],
  async (ctx, base) => {
    const { leapSeconds } = ctx.frames.data;
    const instant = Instant.fromUtc(
      leapSeconds.expires + 30 * 86_400_000,
      leapSeconds,
    );
    // Two GCRF points: no Earth orientation, which ends before the expiry.
    const m = measure(
      framePoint(ctx.frames.gcrf, [7_000_000, 0, 0]),
      framePoint(ctx.frames.gcrf, [0, 42_164_000, 0]),
      instant,
      ctx.frames,
      { signal: false },
    );
    const warned = m.accuracy.warnings.some((w) =>
      /leap-second table has expired/.test(w),
    );
    return [
      {
        ...base,
        pass: warned,
        detail: `table expires ${new Date(leapSeconds.expires).toISOString().slice(0, 10)}; warnings: ${m.accuracy.warnings.join(" | ") || "none"}`,
        accuracy: plainAccuracy(m.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

export const timeCases: readonly StressCase[] = [
  leapSecondCase,
  eopEndCase,
  leapExpiryCase,
];
