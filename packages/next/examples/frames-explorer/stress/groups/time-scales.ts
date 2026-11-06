// Time scales: GPS, TAI, TT and UTC (timing and telecom).
import { Instant } from "../../../../src/time/Instant.ts";
import { citation, cited, printed } from "../references.ts";
import { type StressCase, fmt } from "../runner.ts";
import { TT_STEP, stressCase, utc } from "../shared.ts";

/** The label's own second count from J2000, as if it were TAI: UTC labels minus this are TAI − UTC. */
const labelSeconds = (ctx: Parameters<typeof utc>[0], iso: string) =>
  Instant.fromIso(iso, "TAI", ctx.frames.data.leapSeconds).tai();

/**
 * TAI − GPS, s, from its definitions: GPS time is continuous and was UTC at
 * its zero time-point, 1980-01-06T00:00:00 UTC (IS-GPS-200N §3.3.4), when
 * TAI − UTC was 19 s (IERS Leap_Second.dat).
 */
function taiMinusGps(): number {
  const table = cited<{ taiMinusUtc: string }>("iers-leap-second-1980");
  return printed(table.taiMinusUtc).value;
}

const offsetsCase = stressCase(
  "time-scales.offsets",
  "time-scales",
  "The fixed offsets from Instant.tai(): TT − TAI = 32.184 s exactly (IERS Conventions), and TAI − UTC = 19 s at GPS time's zero point 1980-01-06 (IS-GPS-200N with IERS's leap-second table), so GPS time = TAI − 19 s",
  ["frames"],
  async (ctx, base) => {
    const tt = printed(cited<{ ttMinusTai: string }>("iers-tt-tai").ttMinusTai);
    const instants = [
      "1980-01-06T00:00:00",
      "2000-01-01T12:00:00",
      "2016-12-31T23:59:60.5",
      "2026-03-01T00:00:00",
    ];
    let worst = 0;
    for (const iso of instants) {
      const t = utc(ctx, iso);
      worst = Math.max(worst, Math.abs(t.tt - t.tai() - tt.value));
    }
    const zero = "1980-01-06T00:00:00";
    const atZero = utc(ctx, zero).tai() - labelSeconds(ctx, zero);
    const offset = taiMinusGps();
    return [
      {
        ...base,
        id: `${base.id}.tt-tai`,
        source: citation("iers-tt-tai"),
        title:
          "TT − TAI from Instant.tai() at four instants from 1980 to 2026, including inside the 2016 leap second, against 32.184 s, within a few float64 ulps of TT",
        pass: true,
        value: worst,
        tolerance: TT_STEP,
        unit: "s",
      },
      {
        ...base,
        id: `${base.id}.gps-zero`,
        source: citation("iers-leap-second-1980"),
        title:
          "TAI − UTC at GPS time's zero point (1980-01-06T00:00:00 UTC) from Instant.tai(), against the 19 s that makes GPS time = TAI − 19 s",
        pass: true,
        value: Math.abs(atZero - offset),
        tolerance: TT_STEP,
        unit: "s",
        detail: `TAI − UTC there is ${fmt(atZero, 12)} s; so GPS time = TAI − ${offset} s`,
      },
    ];
  },
);

const leapCase = stressCase(
  "time-scales.gps-utc-leap",
  "time-scales",
  "Across 2016-12-31T23:59:60 UTC (IERS Bulletin C 52): GPS − UTC steps from 17 s to 18 s, and GPS time (TAI − 19 s) stays continuous, advancing 2 s over the one labelled UTC second",
  ["frames"],
  async (ctx, base) => {
    const bulletin = cited<{ before: string; after: string }>(
      "iers-bulletin-c-52",
    );
    const offset = taiMinusGps();
    // GPS − UTC = (TAI − UTC) − (TAI − GPS); Bulletin C prints UTC − TAI.
    const expected = (utcMinusTai: string) =>
      -printed(utcMinusTai).value - offset;
    const gps = (iso: string) => utc(ctx, iso).tai() - offset;
    const gpsMinusUtc = (iso: string) => gps(iso) - labelSeconds(ctx, iso);
    const before = "2016-12-31T23:59:59";
    const after = "2017-01-01T00:00:00";
    const labels = [
      "2016-12-31T23:59:59.0",
      "2016-12-31T23:59:59.5",
      "2016-12-31T23:59:60.0",
      "2016-12-31T23:59:60.5",
      "2017-01-01T00:00:00.0",
    ];
    const g = labels.map(gps);
    let steps = 0;
    for (let i = 1; i < g.length; i++) {
      steps = Math.max(steps, Math.abs(g[i]! - g[i - 1]! - 0.5));
    }
    return [
      {
        ...base,
        id: `${base.id}.step`,
        source: citation("iers-bulletin-c-52"),
        title: `GPS − UTC is ${expected(bulletin.before)} s at ${before} and ${expected(bulletin.after)} s at ${after} (Bulletin C 52's UTC − TAI of ${bulletin.before} and ${bulletin.after} s, less 19 s)`,
        pass: true,
        value: Math.max(
          Math.abs(gpsMinusUtc(before) - expected(bulletin.before)),
          Math.abs(gpsMinusUtc(after) - expected(bulletin.after)),
        ),
        tolerance: TT_STEP,
        unit: "s",
        detail: `GPS − UTC: ${fmt(gpsMinusUtc(before), 12)} s, then ${fmt(gpsMinusUtc(after), 12)} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
      {
        ...base,
        id: `${base.id}.continuous`,
        source: citation("iers-bulletin-c-52"),
        title:
          "GPS time through the leap second in 0.5 s UTC labels advances in 0.5 s steps, 2 s over the one labelled second from 23:59:59 to 00:00:00",
        pass: Math.abs(g[4]! - g[0]! - 2) <= TT_STEP,
        value: steps,
        tolerance: TT_STEP,
        unit: "s",
        detail: `GPS − GPS₀: ${g.map((x) => fmt(x - g[0]!, 6)).join(", ")} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
    ];
  },
);

export const timeScalesCases: readonly StressCase[] = [offsetsCase, leapCase];
