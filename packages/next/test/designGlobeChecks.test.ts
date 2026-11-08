// Plan 4b Task 17: the design globe's answers (answers.ts) and its checks
// (checks.ts): every value the page shows against the generator's exact
// answer, and the survey mark's zone 3 coordinates against NGS's datasheet.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadAnswers,
  parseAnswers,
  type Answers,
} from "../examples/design-globe/answers.ts";
import {
  EXACT_TOLERANCE,
  MARK_OFFSET_TOLERANCE,
  MARK_SPC_TOLERANCE,
  VERTEX_TOLERANCE_M,
  checkRows,
  type CheckRow,
  type ShownValues,
} from "../examples/design-globe/checks.ts";
import { amount, checksView } from "../examples/design-globe/checksView.ts";
import { markTest } from "../examples/design-globe/measureOpeners.ts";

const MPU = 1200 / 3937;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/** A small answers.json: three points, one pair, the marker and the mark. */
function answersJson(): Record<string, unknown> {
  const point = (station: number, offset: number, e: number) => ({
    station,
    offset,
    tags: ["every 4,000"],
    design: [e, 2_110_000, 120],
    bodyFixed: [-2_687_248.5, -4_272_784.1, 3_885_990.8],
    rigidDisplayed: [-2_687_253.2, -4_272_793.3, 3_885_999.0],
    displayError: 13.24,
    geodetic: { longitude: -2.13, latitude: 0.659, height: 4.3 },
    combinedFactor: 0.99993,
    convergence: -0.0178,
    distanceFromAnchor: 12_929.4,
  });
  return {
    version: 2,
    instant: "2026-01-01T00:00:00.000Z",
    anchorStation: 92_021,
    alignment: "Mainline",
    frame: {
      name: "Highway corridor",
      unitName: "US survey foot",
      metersPerUnit: MPU,
      metersPerHeightUnit: MPU,
      operation: "Inverse of SPCS83 California zone 3 (US survey foot) + …",
      operationAccuracy: 2.015,
      grids: ["us_noaa_g2018u0.tif"],
    },
    notes: ["A note."],
    points: [
      point(10_000, 0, 6_080_000),
      point(20_000, 0, 6_089_848.077530122),
      { ...point(170_000, 0, 6_160_821.67), nearKm: 20 },
    ],
    pairs: [
      {
        id: "first-tangent",
        label: "10,000 ft on the first tangent",
        from: 0,
        to: 1,
        designDistance: 10_001.999800040241,
        horizontalDistance: 10_000.000000000253,
        trueDistance: 3_048.8484955078147,
        ends: {
          a: { station: 10_000, offset: 0 },
          b: { station: 20_000, offset: 0 },
        },
      },
    ],
    marker: {
      station: 170_000,
      offset: 0,
      point: 2,
      design: [6_160_821.67, 2_068_069.13, 910],
      bodyFixed: [-2_667_000.1, -4_291_000.2, 3_874_000.3],
      rigidDisplayed: [-2_667_010.1, -4_291_020.2, 3_874_020.3],
      separation: 31.6,
    },
    mark: {
      pid: "HS5109",
      name: "GOLD CREEK",
      datasheetUrl:
        "https://www.ngs.noaa.gov/cgi-bin/ds_mark.prl?PidBox=HS5109",
      retrieved: "2026-11-07",
      geodetic: {
        longitude: -2.128,
        latitude: 0.6577,
        ellipsoidHeight: 139.916,
      },
      publishedSpc: { easting: 6_146_924.9, northing: 2_075_186.11 },
      published: {
        position: "37 41 07.22359(N) 121 55 59.92453(W)",
        ellipsoidHeight: "139.916 (meters)",
        spc: "2,075,186.11  6,146,924.90   sFT",
      },
      design: [6_146_924.901, 2_075_186.112, 565.1],
      bodyFixed: [-2_673_203.826, -4_289_120.954, 3_877_949.143],
      nearest: { station: 154_395.2, offset: -501.3 },
      nearestDesign: [6_147_000, 2_074_700, 910],
      designDistance: 610.2,
      horizontalDistance: 501.3,
      trueDistance: 186.0,
    },
    sites: {
      sydney: {
        name: "Sydney: an airport",
        kind: "airport",
        extent: 3_970.2,
        anchor: [331_800, 6_242_450, 6],
        displayError: 0.371,
        distanceFromAnchor: 1_985.1,
        terms: { curvature: 0.309, scale: 0.13, geoid: -0.02 },
        combinedFactor: 0.999935,
        points: ["Anchor", "Farthest point", "Runway 16R threshold"].map(
          (label, i) => ({
            label,
            design: [331_800 + 900 * i, 6_242_450 - 500 * i, 6],
            bodyFixed: [-4_646_000.1 + i, 2_553_000.2, -3_542_000.3],
            rigidDisplayed: [-4_646_000.1 + i, 2_553_000.2, -3_542_000.0],
            displayError: [0, 0.371, 0.1][i],
            distanceFromAnchor: [0, 1_985.1, 1_029.6][i],
          }),
        ),
        tiles: { count: 61, levels: 4, vertices: 41_000, leafError: 0.001 },
      },
    },
  };
}

const answers = (): Answers => parseAnswers(answersJson());

const empty = (): ShownValues => ({ points: new Map(), pairs: new Map() });

const row = (rows: readonly CheckRow[], id: string): CheckRow => {
  const found = rows.find((r) => r.id === id);
  expect(found, id).toBeDefined();
  return found!;
};

describe("parseAnswers", () => {
  it("reads the generator's shape", () => {
    const a = answers();
    expect(a.pairs[0]!.from).toBe(0);
    expect(a.points[2]!.nearKm).toBe(20);
    expect(a.mark.publishedSpc.northing).toBe(2_075_186.11);
    expect(a.sites.sydney!.points[2]!.label).toBe("Runway 16R threshold");
    expect(a.sites.sydney!.tiles.levels).toBe(4);
  });

  const broken: [string, (j: Json) => void, string][] = [
    ["a missing field", (j) => delete j.anchorStation, "anchorStation"],
    [
      "NaN in a point",
      (j) => (j.points[1].design[1] = Number.NaN),
      "points[1].design[1] is not a finite number",
    ],
    [
      "a string for a number",
      (j) => (j.mark.publishedSpc.easting = "6146924.90"),
      "mark.publishedSpc.easting",
    ],
    [
      "a pair's index out of range",
      (j) => (j.pairs[0].to = 3),
      "pairs[0].to is not an index into points",
    ],
    [
      "a vector of 2",
      (j) => (j.marker.bodyFixed = [1, 2]),
      "marker.bodyFixed is not 3 numbers",
    ],
    ["another version", (j) => (j.version = 1), "version is 1"],
    [
      "a site without its three points",
      (j) => j.sites.sydney.points.pop(),
      "sites.sydney.points is not 3 points",
    ],
    [
      "a site without its combined factor",
      (j) => delete j.sites.sydney.combinedFactor,
      "sites.sydney.combinedFactor is not a finite number",
    ],
    [
      "a site's term as a string",
      (j) => (j.sites.sydney.terms.scale = "0.13"),
      "sites.sydney.terms.scale is not a finite number",
    ],
    ["no sites", (j) => delete j.sites, "sites is not an object"],
  ];
  for (const [name, edit, message] of broken) {
    it(`throws naming the path for ${name}`, () => {
      const json = answersJson();
      edit(json);
      expect(() => parseAnswers(json, "x/answers.json")).toThrow(
        `x/answers.json: ${message}`,
      );
    });
  }
});

describe("loadAnswers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches and checks the file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(answersJson()))),
    );
    const a = await loadAnswers("/a.json", new AbortController().signal);
    expect(a.mark.pid).toBe("HS5109");
  });

  it("throws naming the URL for a failed request, an HTTP error, a non-JSON body and a bad field", async () => {
    const signal = new AbortController().signal;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(loadAnswers("/a.json", signal)).rejects.toThrow(
      "/a.json: request failed",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 404 })),
    );
    await expect(loadAnswers("/a.json", signal)).rejects.toThrow(
      "/a.json: HTTP 404",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{not json")),
    );
    await expect(loadAnswers("/a.json", signal)).rejects.toThrow(
      "/a.json: not JSON",
    );
    const json = answersJson();
    (json.points as Record<string, unknown>[])[0]!.station = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(json))),
    );
    await expect(loadAnswers("/a.json", signal)).rejects.toThrow(
      "/a.json: points[0].station is not a finite number",
    );
  });
});

describe("checkRows", () => {
  it("passes a shown value inside its tolerance, fails one 2× outside, by basis", () => {
    const a = answers();
    const pair = a.pairs[0]!;
    for (const [basis, toleranceDesign, stated] of [
      ["exact", EXACT_TOLERANCE, undefined],
      // A distance's vertex tolerance is one per end.
      ["vertex", (2 * VERTEX_TOLERANCE_M) / MPU, undefined],
      ["pick", 0.05 / MPU, 0.05],
    ] as const) {
      for (const [factor, status] of [
        [0.5, "pass"],
        [2, "fail"],
      ] as const) {
        const shown = empty();
        shown.pairs.set(pair.id, {
          designDistance: pair.designDistance + factor * toleranceDesign,
          horizontalDistance:
            pair.horizontalDistance - factor * toleranceDesign,
          trueDistance: pair.trueDistance + factor * toleranceDesign * MPU,
          basis,
          ...(stated !== undefined && { tolerance: stated }),
        });
        const rows = checkRows(a, shown);
        for (const id of ["design", "horizontal", "true"]) {
          const r = row(rows, `pair.first-tangent.${id}`);
          expect(r.basis, `${basis} ${id}`).toBe(basis);
          expect(r.status, `${basis} ${factor} ${id}`).toBe(status);
          expect(r.kind).toBe("exact answer");
        }
        const d = row(rows, "pair.first-tangent.design");
        expect(d.unit).toBe("ftUS");
        expect(d.tolerance).toBeCloseTo(toleranceDesign, 15);
        expect(d.expected).toBe(pair.designDistance);
        expect(row(rows, "pair.first-tangent.true").unit).toBe("m");
      }
    }
  });

  it("checks a shown point's design coordinates, station and offset", () => {
    const a = answers();
    const p = a.points[1]!;
    const shown = empty();
    shown.points.set(1, {
      design: Float64Array.from([
        p.design[0] + 0.5e-6,
        p.design[1] - 2e-6,
        p.design[2],
      ]),
      station: p.station,
      basis: "exact",
    });
    const rows = checkRows(a, shown);
    expect(row(rows, "point.1.easting").status).toBe("pass");
    expect(row(rows, "point.1.northing").status).toBe("fail");
    expect(row(rows, "point.1.height").status).toBe("pass");
    expect(row(rows, "point.1.station").status).toBe("pass");
    expect(row(rows, "point.1.offset").status).toBe("not-shown");
    expect(row(rows, "point.1.offset").shown).toBeUndefined();
    // Points the page doesn't show have no rows.
    expect(rows.some((r) => r.id.startsWith("point.0."))).toBe(false);
  });

  it("marks what the page doesn't show as not-shown", () => {
    const rows = checkRows(answers(), empty());
    for (const id of [
      "pair.first-tangent.design",
      "pair.first-tangent.horizontal",
      "pair.first-tangent.true",
      "marker.separation",
      "mark.easting",
      "mark.northing",
      "mark.offset",
    ]) {
      expect(row(rows, id).status, id).toBe("not-shown");
    }
  });

  it("checks the marker's separation in either placement", () => {
    const a = answers();
    const shown = empty();
    shown.marker = { separation: 31.6 + 5e-5, mode: "rigid", basis: "vertex" };
    expect(row(checkRows(a, shown), "marker.separation").status).toBe("pass");
    shown.marker = { separation: 31.6, mode: "reprojected", basis: "vertex" };
    const r = row(checkRows(a, shown), "marker.separation");
    expect(r.expected).toBe(0);
    expect(r.status).toBe("fail");
  });

  it("compares PROJ's zone 3 for the mark with the datasheet's, as a published reference", () => {
    const a = answers();
    const shown = empty();
    shown.mark = {
      easting: a.mark.publishedSpc.easting + 0.004,
      northing: a.mark.publishedSpc.northing - 0.011,
    };
    const rows = checkRows(a, shown);
    const e = row(rows, "mark.easting");
    expect(e.kind).toBe("published reference");
    expect(e.basis).toBe("published");
    expect(e.tolerance).toBe(MARK_SPC_TOLERANCE);
    expect(e.unit).toBe("ftUS");
    expect(e.status).toBe("pass");
    expect(row(rows, "mark.northing").status).toBe("fail");
  });

  it("checks the design's horizontal offset from the mark against NGS's own zone 3 (Task 20 fix 1, I6)", () => {
    const a = answers();
    // NGS's zone 3 to the nearest centreline point, horizontally.
    const published = Math.hypot(
      a.mark.publishedSpc.easting - a.mark.nearestDesign[0],
      a.mark.publishedSpc.northing - a.mark.nearestDesign[1],
    );
    const shown = empty();
    expect(row(checkRows(a, shown), "mark.offset").status).toBe("not-shown");
    shown.mark = { offset: published - 0.005 };
    const r = row(checkRows(a, shown), "mark.offset");
    expect(r.kind).toBe("published reference");
    expect(r.basis).toBe("published");
    expect(r.expected).toBeCloseTo(published, 9);
    // Each published coordinate's precision, along the line between them.
    expect(r.tolerance).toBeCloseTo(MARK_SPC_TOLERANCE * Math.SQRT2, 12);
    expect(r.unit).toBe("ftUS");
    expect(r.status).toBe("pass");
    shown.mark = { offset: published + 0.02 };
    expect(row(checkRows(a, shown), "mark.offset").status).toBe("fail");
  });

  it("judges the mark's test against one tolerance, in the headline and in Checks (UX review I1)", () => {
    const a = answers();
    const published = Math.hypot(
      a.mark.publishedSpc.easting - a.mark.nearestDesign[0],
      a.mark.publishedSpc.northing - a.mark.nearestDesign[1],
    );
    // Each coordinate's precision with the datasheet's double rounding
    // (metric to the millimetre, then to 0.01 ftUS), along the line: √2.
    expect(MARK_OFFSET_TOLERANCE).toBe(MARK_SPC_TOLERANCE * Math.SQRT2);
    expect(amount(MARK_OFFSET_TOLERANCE, "ftUS")).toBe("0.0094 ftUS");
    // Either side of the bound, and between the old headline's 0.0071
    // ftUS and it: the headline and the check give one verdict.
    for (const off of [0, 0.005, 0.0072, 0.008, 0.0093, 0.0095, 0.02]) {
      for (const sign of [1, -1]) {
        const horizontal = published + sign * off;
        const test = markTest(a, {
          design: horizontal,
          horizontal,
          trueDistance: horizontal * MPU,
        })!;
        const shown = empty();
        shown.mark = { offset: horizontal };
        const check = row(checkRows(a, shown), "mark.offset");
        expect(test.within, `${sign * off} ftUS`).toBe(check.status === "pass");
        expect(check.tolerance).toBe(MARK_OFFSET_TOLERANCE);
      }
    }
    // Checks states the same bound the headline's caption does.
    const shown = empty();
    shown.mark = { offset: published + 0.005 };
    const view = checksView(a, shown);
    expect(JSON.stringify(view)).toContain("within 0.0094 ftUS");
  });

  it("throws for a shown id that isn't an answer", () => {
    const shown = empty();
    shown.pairs.set("nope", { basis: "exact" });
    expect(() => checkRows(answers(), shown)).toThrow("nope");
    const points = empty();
    points.points.set(9, { basis: "exact" });
    expect(() => checkRows(answers(), points)).toThrow("9");
  });

  it("throws for a pick with no stated tolerance", () => {
    const shown = empty();
    shown.pairs.set("first-tangent", { designDistance: 1, basis: "pick" });
    expect(() => checkRows(answers(), shown)).toThrow("tolerance");
  });
});
