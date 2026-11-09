// The time formatter (frames 5b, Task 11).
import { describe, expect, it } from "vitest";
import {
  ianaAbbreviation,
  ianaOffsetMinutes,
  placeZone,
  timeParts,
} from "../src/time/format.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

const leap = LeapSeconds.builtIn();
const utc = (iso: string) => Instant.fromIso(iso, "UTC", leap);
const deg = Math.PI / 180;

describe("timeParts", () => {
  it("shows a leap second in UTC", () => {
    const p = timeParts(utc("2016-12-31T23:59:60.5"), { kind: "utc" });
    expect([
      p.day,
      p.hour,
      p.minute,
      p.second,
      p.millisecond,
      p.leapSecond,
    ]).toEqual([31, 23, 59, 60, 500, true]);
    const after = timeParts(utc("2017-01-01T00:00:00.5"), { kind: "utc" });
    expect(after.second).toBe(0);
    expect(after.leapSecond).toBe(false);
    const before = timeParts(utc("2016-12-31T23:59:59.5"), { kind: "utc" });
    expect([before.second, before.leapSecond]).toEqual([59, false]);
    expect(p.offset).toBe("UTC");
    expect(p.zoneShort).toBe("UTC");
    expect(p.zoneLong).toBe("Coordinated Universal Time");
  });

  it("shows a leap second in a civil zone", () => {
    const p = timeParts(utc("2016-12-31T23:59:60.5"), {
      kind: "civil",
      iana: "Asia/Tokyo",
    });
    expect([p.year, p.month, p.day, p.hour, p.minute, p.second]).toEqual([
      2017, 1, 1, 8, 59, 60,
    ]);
    expect(p.time).toMatch(/60/);
    expect(p.offset).toBe("UTC+09:00");
    // The whole minute around it reads 08:59:xx on both sides.
    const before = timeParts(utc("2016-12-31T23:59:59"), {
      kind: "civil",
      iana: "Asia/Tokyo",
    });
    expect([before.hour, before.minute, before.second]).toEqual([8, 59, 59]);
    const after = timeParts(utc("2017-01-01T00:00:00"), {
      kind: "civil",
      iana: "Asia/Tokyo",
    });
    expect([after.hour, after.minute, after.second]).toEqual([9, 0, 0]);
  });

  it("follows a daylight-saving change", () => {
    const london = { kind: "civil", iana: "Europe/London" } as const;
    const before = timeParts(utc("2026-03-29T00:59:59"), london);
    expect([before.hour, before.offsetMinutes, before.zoneShort]).toEqual([
      0,
      0,
      "GMT",
    ]);
    const after = timeParts(utc("2026-03-29T01:00:00"), london);
    expect([after.hour, after.offsetMinutes, after.zoneShort]).toEqual([
      2,
      60,
      "BST",
    ]);
    expect(after.offset).toBe("UTC+01:00");
    const newYork = { kind: "civil", iana: "America/New_York" } as const;
    const edt = timeParts(utc("2026-11-01T05:59:59"), newYork);
    expect([edt.hour, edt.minute, edt.zoneShort]).toEqual([1, 59, "EDT"]);
    const est = timeParts(utc("2026-11-01T06:00:00"), newYork);
    expect([est.hour, est.minute, est.zoneShort]).toEqual([1, 0, "EST"]);
    expect(est.offset).toBe("UTC−05:00");
  });

  it("gives solar time on both sides of the date line", () => {
    const at = utc("2026-04-02T00:00:00");
    const east = timeParts(at, { kind: "solar", longitude: 179.9 * deg });
    const west = timeParts(at, { kind: "solar", longitude: -179.9 * deg });
    expect([east.day, east.hour, east.minute, east.second]).toEqual([
      2, 11, 59, 36,
    ]);
    expect([west.day, west.hour, west.minute, west.second]).toEqual([
      1, 12, 0, 24,
    ]);
    expect(east.zoneShort).toBe("solar time");
    expect(east.zoneLong).toBe(
      "Local solar time: noon is when the sun is highest here",
    );
  });

  it("gives nominal time in whole hours from the longitude", () => {
    const at = utc("2026-04-02T00:00:00");
    const east = timeParts(at, { kind: "nominal", longitude: 179.9 * deg });
    const west = timeParts(at, { kind: "nominal", longitude: -179.9 * deg });
    expect([east.month, east.day, east.hour]).toEqual([4, 2, 12]);
    expect([west.month, west.day, west.hour]).toEqual([4, 1, 12]);
    expect(east.zoneShort).toBe("UTC+12");
    expect(west.zoneShort).toBe("UTC−12");
    const home = timeParts(at, { kind: "nominal", longitude: 3 * deg });
    expect(home.zoneShort).toBe("UTC");
    expect(east.zoneLong).toMatch(/whole hours from UTC/);
  });

  it("finds a place's zone through the application's lookup, else solar time, labelled so", () => {
    const place = { longitude: 139.7 * deg, latitude: 35.7 * deg };
    const lookup = { zoneAt: () => "Asia/Tokyo" };
    expect(placeZone(place, lookup)).toEqual({
      kind: "civil",
      iana: "Asia/Tokyo",
    });
    // No lookup, a lookup that doesn't know, and a name Intl doesn't know.
    for (const zone of [
      placeZone(place),
      placeZone(place, { zoneAt: () => undefined }),
      placeZone(place, { zoneAt: () => "Not/AZone" }),
    ]) {
      expect(zone.kind).toBe("solar");
      const p = timeParts(utc("2026-04-02T00:00:00"), zone);
      expect(p.zoneLong).toMatch(/civil time zone isn't known/);
    }
  });

  it("names zones as the time controls do today, and reads the computer's zone by Intl", () => {
    const at = utc("2026-07-01T12:00:00");
    expect(timeParts(at, { kind: "local" }).zoneLong).toBe(
      "This computer's time zone",
    );
    expect(
      timeParts(at, { kind: "civil", iana: "Europe/London" }).zoneLong,
    ).toBe("Europe/London");
    const local = timeParts(at, { kind: "local" });
    expect(local.offsetMinutes).toBe(
      -new Date(at.toUtc(leap)).getTimezoneOffset(),
    );
  });

  it("formats the date and time through Intl in the wall clock", () => {
    const p = timeParts(
      utc("2026-04-02T13:05:09"),
      { kind: "utc" },
      { locale: "en-US" },
    );
    expect(p.date).toBe("4/2/2026");
    expect(p.time).toMatch(/^1:05:09\sPM$/);
    expect(p.weekday).toBe(4);
  });
});

describe("the Intl helpers", () => {
  it("move unchanged", () => {
    const summer = Date.UTC(2026, 6, 1);
    expect(ianaOffsetMinutes(summer, "Europe/London")).toBe(60);
    expect(ianaAbbreviation(summer, "Europe/London")).toBe("BST");
  });
});
