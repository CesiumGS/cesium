// The frames explorer's tour stops (examples/frames-explorer/content.ts, R16):
// what each stop draws and how it lights the globe; and the page's fixed
// copy for what a result is compared against.
import { describe, expect, it } from "vitest";
import {
  SITE_TRIADS,
  TOUR,
  comparedFor,
  defaultTriads,
} from "../examples/frames-explorer/content.ts";
import {
  GROUP_INFO,
  type Comparison,
} from "../examples/frames-explorer/stress/groupInfo.ts";

const GROUP_COMPARED: Comparison = {
  kind: "formula",
  text: "Design distance × site scale × metres per foot ÷ the combined factor, by hand.",
};

const stop = (id: string) => {
  const s = TOUR.find((t) => t.id === id);
  if (!s) {
    throw new Error(`no stop ${id}`);
  }
  return s;
};

describe("tour stop 2: GCRF to ITRF over a day", () => {
  it("dims the imagery, so the polar globe lit from the camera isn't washed out", () => {
    expect(stop("gcrf-itrf-day").dim).toBe(true);
  });

  it("draws only the geocentric triads: a site triad would cross GCRF's turning x", () => {
    const ids = defaultTriads(stop("gcrf-itrf-day"));
    expect(ids).toEqual(["ITRF", "GCRF"]);
    for (const site of SITE_TRIADS) {
      expect(ids).not.toContain(site);
    }
  });
});

describe("the default triads", () => {
  it("are the geocentric pair and the sites outside the tour", () => {
    expect(defaultTriads(undefined)).toEqual(["ITRF", "GCRF", ...SITE_TRIADS]);
  });

  it("keep the sites at every stop but stop 2", () => {
    for (const s of TOUR) {
      if (s.id === "gcrf-itrf-day") {
        continue;
      }
      expect(defaultTriads(s)).toEqual(["ITRF", "GCRF", ...SITE_TRIADS]);
    }
  });

  it("name the Sacramento and lunar south-pole sites", () => {
    expect(SITE_TRIADS).toEqual(["Sacramento ENU", "Lunar south-pole site"]);
  });
});

describe("what a result is compared against (R10, R16)", () => {
  it("names the clothoid's own check, not the grid-to-ground formula", () => {
    const c = comparedFor("measurement.clothoid", GROUP_COMPARED);
    expect(c.kind).toBe("roundTrip");
    expect(c.text).toMatch(/station and offset/);
    expect(c.text).not.toMatch(/combined factor/);
  });

  it("names the design-against-ITRF check's own comparison", () => {
    const c = comparedFor("measurement.design-vs-itrf", GROUP_COMPARED);
    expect(c.kind).toBe("independent");
    expect(c.text).toMatch(/ITRF/);
    expect(c.text).not.toMatch(/combined factor/);
  });

  it("keeps the group's comparison for the grid-to-ground line", () => {
    expect(comparedFor("measurement.grid-to-ground", GROUP_COMPARED)).toBe(
      GROUP_COMPARED,
    );
  });

  it("labels Orion's two non-error results by what they check, not as expected errors", () => {
    const group: Comparison = {
      kind: "error",
      text: "The OEM's covered spans, and a round trip through MOON_ME.",
    };
    const distance = comparedFor("trajectory.moon-me.distance", group);
    expect(distance.kind).toBe("independent");
    expect(distance.text).toMatch(/Moon's centre/);
    expect(comparedFor("trajectory.moon-me.round-trip", group).kind).toBe(
      "roundTrip",
    );
    expect(comparedFor("trajectory.gap", group)).toBe(group);
  });

  it("gives each bound-CRS check its own comparison; only the Helmert is the group's", () => {
    const group: Comparison = {
      kind: "formula",
      text: "The WKT's TOWGS84 Helmert coded by hand (EPSG 9606).",
    };
    for (const base of [
      "bound-crss.ed50-utm31n",
      "bound-crss.epsg-30169",
      "bound-crss.user.tokyo-jprcs-ix",
    ]) {
      expect(comparedFor(`${base}.helmert`, group)).toBe(group);
      for (const check of [
        "frame",
        "source-crs",
        "recorded-operation",
        "round-trip",
        "registry",
        "accuracy",
      ]) {
        const c = comparedFor(`${base}.${check}`, group);
        expect(c, check).not.toBe(group);
        expect(c.text, check).not.toMatch(/TOWGS84 Helmert coded by hand/);
      }
    }
    expect(comparedFor("bound-crss.ed50-utm31n.round-trip", group).kind).toBe(
      "roundTrip",
    );
  });

  it("leaves other groups' round trips alone", () => {
    const group: Comparison = { kind: "roundTrip", text: "x" };
    expect(comparedFor("projections.epsg-32610", group)).toBe(group);
    expect(comparedFor("frame-tree.itrf-gcrf.round-trip", group)).toBe(group);
  });
});

describe("a selected result's frames (R14)", () => {
  it("every group that places something names the frames the tree highlights", () => {
    const without = GROUP_INFO.filter(
      (g) => !g.virtual && (g.focus?.frames.length ?? 0) === 0,
    ).map((g) => g.id);
    // Design arithmetic and time-scale offsets place nothing in a frame.
    expect(without.sort()).toEqual(["time-scales", "vertical-profile"]);
  });

  it("the rigid-placement budget highlights ITRF, where its site is placed", () => {
    const g = GROUP_INFO.find((x) => x.id === "rigid-placement-budget");
    expect(g?.focus?.frames).toContain("ITRF");
  });
});
