// The time controls on the time library's formatter (frames 5b, Task 12): what
// a page shows for every choice it had is unchanged. The expected values are
// today's functions (the controls' own formulas before this task), written out.
import { describe, expect, it } from "vitest";
import { Instant, LeapSeconds, timeParts } from "@cesium/next/time";
import { ianaAbbreviation, ianaOffsetMinutes } from "../src/time/format.ts";
import { zoneOf, type TimeZoneChoice } from "../widgets/timeControls.ts";

const leap = LeapSeconds.builtIn();
const deg = Math.PI / 180;
const place = { longitude: -122.4 * deg, latitude: 37.8 * deg };
const utc = (iso: string) => Instant.fromIso(iso, "UTC", leap);
// A winter day, a day inside a daylight-saving change, a summer day, a leap
// second, and the day after it.
const MOMENTS = [
  "2026-01-15T12:00:00",
  "2026-03-29T00:59:59",
  "2026-07-01T12:00:00",
  "2016-12-31T23:59:60.25",
  "2017-01-01T00:00:00",
];

/** What the controls computed before: minutes ahead of UTC. */
function offsetBefore(choice: TimeZoneChoice, ms: number): number {
  if (choice === "utc") {
    return 0;
  }
  if (choice === "local") {
    return -new Date(ms).getTimezoneOffset();
  }
  if (typeof choice === "object") {
    return ianaOffsetMinutes(ms, choice.iana);
  }
  const solar = (place.longitude / deg) * 4;
  return choice === "solar" ? solar : Math.round(solar / 60) * 60;
}

describe("zoneOf", () => {
  it("maps each choice to the time library's zone", () => {
    expect(zoneOf("utc", place)).toEqual({ kind: "utc" });
    expect(zoneOf("local", place)).toEqual({ kind: "local" });
    expect(zoneOf({ iana: "Europe/London" }, place)).toEqual({
      kind: "civil",
      iana: "Europe/London",
    });
    expect(zoneOf("solar", place)).toEqual({
      kind: "solar",
      longitude: place.longitude,
    });
    expect(zoneOf("nominal", place)).toEqual({
      kind: "nominal",
      longitude: place.longitude,
    });
    // UTC without a place, as the controls always did.
    expect(zoneOf("solar", undefined)).toEqual({ kind: "utc" });
    expect(zoneOf("nominal", undefined)).toEqual({ kind: "utc" });
    expect(zoneOf("place", undefined)).toEqual({ kind: "utc" });
  });

  it('"place" gives the civil zone through a lookup, and solar time without one', () => {
    const lookup = { zoneAt: () => "America/Los_Angeles" };
    expect(zoneOf("place", place, lookup)).toEqual({
      kind: "civil",
      iana: "America/Los_Angeles",
    });
    const solar = zoneOf("place", place);
    expect(solar.kind).toBe("solar");
    expect(timeParts(utc("2026-04-02T00:00:00"), solar).zoneLong).toMatch(
      /civil time zone isn't known/,
    );
  });
});

describe("what the controls show for each choice they had", () => {
  const choices: TimeZoneChoice[] = [
    "utc",
    "local",
    "solar",
    "nominal",
    { iana: "Europe/London" },
    { iana: "America/Los_Angeles" },
  ];
  for (const choice of choices) {
    it(`${typeof choice === "object" ? choice.iana : choice}: the offset and the short label equal what they were`, () => {
      for (const moment of MOMENTS) {
        const instant = utc(moment);
        const ms = instant.toUtc(leap);
        const parts = timeParts(instant, zoneOf(choice, place), {
          leapSeconds: leap,
        });
        // A leap second is read at the last millisecond before the step.
        expect(parts.offsetMinutes, moment).toBeCloseTo(
          offsetBefore(choice, ms),
          9,
        );
        const short =
          typeof choice === "object"
            ? ianaAbbreviation(ms, choice.iana)
            : choice === "utc"
              ? "UTC"
              : choice === "solar"
                ? "solar time"
                : choice === "nominal"
                  ? (() => {
                      const hours = Math.round(
                        offsetBefore("nominal", ms) / 60,
                      );
                      return hours === 0
                        ? "UTC"
                        : `UTC${hours > 0 ? "+" : "−"}${Math.abs(hours)}`;
                    })()
                  : new Intl.DateTimeFormat(undefined, {
                      timeZoneName: "short",
                    })
                      .formatToParts(new Date(ms))
                      .find((p) => p.type === "timeZoneName")!.value;
        expect(parts.zoneShort, moment).toBe(short);
      }
    });
  }
});
