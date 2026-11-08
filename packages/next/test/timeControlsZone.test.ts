// The time controls' civil zones (design globe feedback F9): an IANA zone's
// offset (daylight saving included) and its abbreviation, by Intl.
import { describe, expect, it } from "vitest";
import {
  ianaAbbreviation,
  ianaOffsetMinutes,
} from "../widgets/timeControls.ts";

const summer = Date.parse("2026-07-01T12:00:00Z");
const winter = Date.parse("2026-01-15T12:00:00Z");

describe("ianaOffsetMinutes", () => {
  it("follows daylight saving", () => {
    expect(ianaOffsetMinutes(summer, "Europe/London")).toBe(60);
    expect(ianaOffsetMinutes(winter, "Europe/London")).toBe(0);
    expect(ianaOffsetMinutes(summer, "America/Los_Angeles")).toBe(-420);
    expect(ianaOffsetMinutes(winter, "America/Los_Angeles")).toBe(-480);
    // Arizona keeps standard time all year; Sydney's summer is January.
    expect(ianaOffsetMinutes(summer, "America/Phoenix")).toBe(-420);
    expect(ianaOffsetMinutes(winter, "Australia/Sydney")).toBe(660);
    expect(ianaOffsetMinutes(summer, "Asia/Kolkata")).toBe(330);
  });

  it("throws for a zone Intl doesn't know", () => {
    expect(() => ianaOffsetMinutes(summer, "Mars/Olympus")).toThrow();
  });
});

describe("ianaAbbreviation", () => {
  it("names the zone as people there do, whatever the reader's locale", () => {
    expect(ianaAbbreviation(summer, "Europe/London", "en-US")).toBe("BST");
    expect(ianaAbbreviation(winter, "Europe/London", "en-US")).toBe("GMT");
    expect(ianaAbbreviation(summer, "America/Los_Angeles", "en-GB")).toBe(
      "PDT",
    );
    expect(ianaAbbreviation(winter, "Australia/Sydney", "en-US")).toBe("AEDT");
    expect(ianaAbbreviation(summer, "Asia/Tokyo", "en-US")).toBe("JST");
  });

  it("falls back to the offset where no locale has a name", () => {
    expect(ianaAbbreviation(summer, "Africa/Nairobi", "en-US")).toMatch(
      /^(EAT|UTC\+3)$/,
    );
  });
});
