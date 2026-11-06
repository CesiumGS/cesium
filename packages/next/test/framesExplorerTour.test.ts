// The frames explorer's tour stops (examples/frames-explorer/content.ts, R16):
// what each stop draws and how it lights the globe; and the page's fixed
// copy for what a result is compared against.
import { describe, expect, it } from "vitest";
import {
  NARROW_VIEW,
  SITE_TRIADS,
  TOUR,
  comparedFor,
  defaultTriads,
  groupRunIds,
  stopExposure,
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
  it("dims the imagery by −1.5 at desktop widths, where the eye brightens the small globe (F43)", () => {
    expect(stopExposure(stop("gcrf-itrf-day"), 728)).toBe(-1.5);
    expect(stopExposure(stop("gcrf-itrf-day"), NARROW_VIEW)).toBe(-1.5);
  });

  it("keeps −0.6 on narrow views, where the globe fills the view", () => {
    expect(stopExposure(stop("gcrf-itrf-day"), 520)).toBe(-0.6);
    expect(stopExposure(stop("gcrf-itrf-day"), NARROW_VIEW - 1)).toBe(-0.6);
  });

  it("draws only the geocentric triads: a site triad would cross GCRF's turning x", () => {
    const ids = defaultTriads(stop("gcrf-itrf-day"));
    expect(ids).toEqual(["ITRF", "GCRF"]);
    for (const site of SITE_TRIADS) {
      expect(ids).not.toContain(site);
    }
  });
});

describe("each stop's exposure", () => {
  it("dims the engineering stop by −0.6 at any width and leaves the others", () => {
    for (const w of [400, 1200]) {
      expect(stopExposure(stop("design-grid"), w)).toBe(-0.6);
      expect(stopExposure(stop("earth-frames"), w)).toBe(0);
      expect(stopExposure(stop("rigid-exact"), w)).toBe(0);
    }
  });

  it("is 0 outside the tour", () => {
    expect(stopExposure(undefined, 1200)).toBe(0);
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

describe("what each overridden result is compared against, word for word", () => {
  const group: Comparison = { kind: "formula", text: "the group's" };
  const EXPECTED: Record<string, Comparison> = {
    "measurement.clothoid": {
      kind: "roundTrip",
      text: "Each point's station and offset, given back by the alignment from the point it placed.",
    },
    "measurement.design-vs-itrf": {
      kind: "independent",
      text: "The same distance measured from the design point fixed in ITRF first.",
    },
    "trajectory.moon-me.distance": {
      kind: "independent",
      text: "Orion's distance from the Moon's centre before the conversion to MOON_ME: a rotation about the centre keeps it.",
    },
    "trajectory.moon-me.round-trip": {
      kind: "roundTrip",
      text: "Orion's position after the trip to MOON_ME and back.",
    },
    "bound-crss.ed50-utm31n.frame": {
      kind: "independent",
      text: "The CRS builds an engineering frame, or the error that it can't.",
    },
    "bound-crss.ed50-utm31n.source-crs": {
      kind: "independent",
      text: "The source CRS's own axis unit, type and grid factors: its WKT, and a frame on the source CRS alone.",
    },
    "bound-crss.ed50-utm31n.recorded-operation": {
      kind: "independent",
      text: "The WKT's own TOWGS84 numbers and convention, against the operation PROJ records.",
    },
    "bound-crss.ed50-utm31n.round-trip": {
      kind: "roundTrip",
      text: "The design point after design → body-fixed → design, at three heights.",
    },
    "bound-crss.ed50-utm31n.registry": {
      kind: "formula",
      text: "The EPSG record's parameters by hand where there is one; otherwise PROJ's best registry operation, shown, not judged.",
    },
    "bound-crss.ed50-utm31n.accuracy": {
      kind: "independent",
      text: "Shown, not judged: the accuracy the measurement states for the frame.",
    },
    // A plain EPSG code's checks compare against its EPSG record, not a WKT.
    "bound-crss.epsg-30169.recorded-operation": {
      kind: "published",
      text: "The EPSG record's Helmert parameters, as the registry prints them, against the operation PROJ records.",
    },
    "bound-crss.epsg-30169.helmert": {
      kind: "formula",
      text: "The EPSG record's Helmert coded by hand (IOGP 373-7-2).",
    },
    "bound-crss.epsg-30169.round-trip": {
      kind: "roundTrip",
      text: "The design point after design → body-fixed → design, at three heights.",
    },
  };

  for (const [id, expected] of Object.entries(EXPECTED)) {
    it(id, () => {
      expect(comparedFor(id, group)).toEqual(expected);
    });
  }
});

describe("a selected result's frames (R14)", () => {
  const frames = (id: string) =>
    GROUP_INFO.find((g) => g.id === id)?.focus?.frames ?? [];
  const CALIFORNIA = ["ITRF", "engineering:California zone 3"];

  it("names only the frames each group's cases use from the tree", () => {
    // Read from each group's cases (stress/groups/*.ts): the built-in frames
    // they reach (frames.itrf, f.moonMe, ...), ITRF for an engineering frame
    // on the Earth, MOON_ME for one on the Moon, and the page's California
    // grid node for the cases on EPSG:6420.
    expect(frames("projections")).toEqual(["ITRF", "MOON_ME"]);
    expect(frames("units")).toEqual(CALIFORNIA);
    expect(frames("site-grids")).toEqual(CALIFORNIA);
    expect(frames("recorded-operations")).toEqual(CALIFORNIA);
    expect(frames("measurement")).toEqual(CALIFORNIA);
    expect(frames("heights-and-wgs84")).toEqual(CALIFORNIA);
    expect(frames("time")).toEqual(["GCRF", "ITRF"]);
    expect(frames("trajectory")).toEqual(["EME2000", "MOON_ICRF", "MOON_ME"]);
    expect(frames("lunar-time")).toEqual(["ICRF", "ITRF", "MOON_ME"]);
    expect(frames("space")).toEqual([
      "ICRF",
      "HCRS",
      "GCRF",
      "ITRF",
      "EARTH_ICRF",
      "EME2000",
      "MOON_ICRF",
      "MOON_ME",
      "MOON_PA",
    ]);
    for (const id of [
      "reference-values",
      "distortion",
      "rigid-placement-budget",
      "axes-and-the-antimeridian",
      "ifc-map-conversion",
      "below-the-ellipsoid",
      "bound-crss",
    ]) {
      expect(frames(id), id).toEqual(["ITRF"]);
    }
  });

  it("names none for a group whose cases place nothing in the tree", () => {
    // Design arithmetic, time-scale offsets, and PROJ's own CRS-to-CRS
    // operations (epochs, candidates, plate motion), which never reach the
    // frame tree.
    const without = GROUP_INFO.filter(
      (g) => !g.virtual && (g.focus?.frames.length ?? 0) === 0,
    ).map((g) => g.id);
    expect(without.sort()).toEqual([
      "coordinate-epoch",
      "operation-candidates",
      "plate-motion",
      "time-scales",
      "vertical-profile",
    ]);
  });
});

describe("what Run this group runs", () => {
  const fingerprinted = [
    "projections.epsg-32610",
    "bound-crss.ed50-utm31n.frame",
    "reference-values.gu2195.ne",
  ];

  it("runs a real group by its id", () => {
    expect(groupRunIds("time", fingerprinted)).toEqual(["time"]);
  });

  it("runs the fingerprinted results' cases for the Reproducibility card, which collects from other groups", () => {
    expect(groupRunIds("reproducibility", fingerprinted)).toEqual(
      fingerprinted,
    );
  });
});
