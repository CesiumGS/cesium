// Plan 4b Task 19: the design globe's measure tool (measureTool.ts): the
// two-click state machine, the snap mode's choice of service, the deep link
// with both design points, and the measurements the page opens with (the
// design against itself at station 170,000, the design against NGS's mark,
// and the quieter 10,000 ft pair), their figures from answers.json.
import { describe, expect, it, vi } from "vitest";
import type { Answers } from "../examples/design-globe/answers.ts";
import {
  drawnAt,
  formatMeasureLink,
  nextMeasure,
  openerView,
  openingMeasurements,
  parseMeasureLink,
  snapWith,
  type MeasureEnd,
  type MeasureState,
  type OpenerPlacements,
  shownValues,
} from "../examples/design-globe/measureTool.ts";
import { checkRows } from "../examples/design-globe/checks.ts";
import type {
  ClientSnapService,
  SnapResult,
  SnapService,
} from "../src/engineering/snap.ts";

const MPU = 1200 / 3937;

function end(e: number, o: Partial<MeasureEnd> = {}): MeasureEnd {
  const design = Float64Array.from([e, 2_110_000, 120]);
  return {
    site: "corridor",
    design,
    rigid: Float64Array.from([e * MPU, 0, 0]),
    reprojected: Float64Array.from([e * MPU, 0, 0]),
    how: "exact",
    tolerance: 0,
    ...o,
  };
}

describe("the two-click state machine", () => {
  const empty: MeasureState = { phase: "empty" };

  it("takes a first point, then a second, then starts again from the next", () => {
    const a = end(6_080_000);
    const b = end(6_089_848);
    const c = end(6_100_000);
    const first = nextMeasure(empty, { type: "point", end: a });
    expect(first).toEqual({ phase: "first", a });
    const done = nextMeasure(first, { type: "point", end: b });
    expect(done).toEqual({ phase: "done", a, b });
    // A click after a finished measurement starts the next one there.
    expect(nextMeasure(done, { type: "point", end: c })).toEqual({
      phase: "first",
      a: c,
    });
  });

  it("clears with Escape from either point, and Escape on nothing changes nothing", () => {
    const a = end(6_080_000);
    const first = nextMeasure(empty, { type: "point", end: a });
    expect(nextMeasure(first, { type: "escape" })).toEqual(empty);
    const done = nextMeasure(first, { type: "point", end: end(6_089_848) });
    expect(nextMeasure(done, { type: "escape" })).toEqual(empty);
    expect(nextMeasure(empty, { type: "escape" })).toBe(empty);
  });

  it("refuses a second point on another model: the first stays", () => {
    const first = nextMeasure(empty, { type: "point", end: end(6_080_000) });
    const elsewhere = end(100, { site: "phoenix" });
    expect(nextMeasure(first, { type: "point", end: elsewhere })).toBe(first);
  });
});

describe("the snap mode chooses the service", () => {
  const request = {
    view: {} as never,
    x: 10,
    y: 20,
    aperture: 10,
  };
  const client = { snap: vi.fn() } as unknown as ClientSnapService;
  const server = { snap: vi.fn() } as unknown as SnapService;
  const result = { kind: "point" } as unknown as SnapResult;

  function deps() {
    return {
      client,
      server,
      refine: vi.fn(async () => result),
      pick: vi.fn(async () => result),
    };
  }

  it("Alignment (exact): the client's snap refined by the exact service", async () => {
    const d = deps();
    const onUpdate = vi.fn();
    const signal = new AbortController().signal;
    await expect(snapWith("exact", request, d, onUpdate, signal)).resolves.toBe(
      result,
    );
    expect(d.refine).toHaveBeenCalledWith(
      request,
      client,
      server,
      onUpdate,
      signal,
    );
    expect(d.pick).not.toHaveBeenCalled();
  });

  it("Geometry: the client's snap alone, no server", async () => {
    const d = deps();
    const onUpdate = vi.fn();
    await snapWith("geometry", request, d, onUpdate);
    expect(d.refine).toHaveBeenCalledWith(
      request,
      client,
      undefined,
      onUpdate,
      undefined,
    );
    expect(d.pick).not.toHaveBeenCalled();
  });

  it("None: a plain design pick, no snap at all", async () => {
    const d = deps();
    const onUpdate = vi.fn();
    await snapWith("none", request, d, onUpdate);
    expect(d.pick).toHaveBeenCalledWith(10, 20);
    expect(d.refine).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith(result);
  });
});

describe("the deep link", () => {
  const a = end(6_080_000.123456789);
  const b = end(6_089_848.077530122);

  it("carries both design points, exactly, and leaves the corridor's site out", () => {
    const link = formatMeasureLink({ phase: "done", a, b });
    expect(link).toEqual({
      a: `${String(a.design[0])},2110000,120`,
      b: "6089848.077530122,2110000,120",
      on: undefined,
    });
    const back = parseMeasureLink({ a: link.a!, b: link.b! }, ["corridor"]);
    expect(back?.site).toBe("corridor");
    expect([...back!.a]).toEqual([...a.design]);
    expect([...back!.b]).toEqual([...b.design]);
  });

  it("names a site other than the corridor", () => {
    const link = formatMeasureLink({
      phase: "done",
      a: end(1, { site: "phoenix" }),
      b: end(2, { site: "phoenix" }),
    });
    expect(link.on).toBe("phoenix");
    expect(
      parseMeasureLink({ ...link, on: "phoenix" } as Record<string, string>, [
        "corridor",
        "phoenix",
      ])?.site,
    ).toBe("phoenix");
  });

  it("carries nothing until both points are placed", () => {
    expect(formatMeasureLink({ phase: "empty" })).toEqual({
      a: undefined,
      b: undefined,
      on: undefined,
    });
    expect(formatMeasureLink({ phase: "first", a }).a).toBeUndefined();
  });

  it("refuses a malformed or hostile link: no measurement, nothing guessed", () => {
    const sites = ["corridor"];
    for (const bad of [
      { a: "1,2,3" },
      { a: "1,2", b: "1,2,3" },
      { a: "1,2,3", b: "1,2,NaN" },
      { a: "1,2,3", b: "1,2,Infinity" },
      { a: "1,2,3", b: "1,2,3,4" },
      { a: "1,2,3", b: "1e400,2,3" },
      { a: "1,2,3", b: "100000001,2,3" },
      { a: "1,2,3", b: "0x10,2,3" },
      { a: " ,2,3", b: "1,2,3" },
      { a: "1,2,3", b: "1,2,3", on: "../proj.db" },
      { a: "1,2,3", b: "1,2,3", on: "constructor" },
    ]) {
      expect(parseMeasureLink(bad, sites)).toBeUndefined();
    }
  });
});

/** A small answers.json: the pair's two points, the marker and the mark. */
function answers(): Answers {
  const point = (station: number, e: number, h: number) => ({
    station,
    offset: 0,
    tags: [],
    design: [e, 2_110_000, h] as [number, number, number],
    bodyFixed: [e * MPU, 2_110_000 * MPU, h * MPU] as [number, number, number],
    rigidDisplayed: [e * MPU, 2_110_000 * MPU, h * MPU + 1] as [
      number,
      number,
      number,
    ],
    displayError: 1,
    geodetic: { longitude: 0, latitude: 0, height: 0 },
    combinedFactor: 0.99993,
    convergence: 0,
    distanceFromAnchor: 0,
  });
  const markerPoint = point(170_000, 6_160_821.674872547, 910);
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
      operation: null,
      operationAccuracy: 2.015,
      grids: [],
    },
    notes: [],
    points: [
      point(10_000, 6_080_000, 120),
      point(20_000, 6_089_848.077530122, 320),
      markerPoint,
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
      design: markerPoint.design,
      bodyFixed: markerPoint.bodyFixed,
      rigidDisplayed: [
        markerPoint.bodyFixed[0] - 13.36,
        markerPoint.bodyFixed[1] - 18.88,
        markerPoint.bodyFixed[2] + 20.01,
      ],
      separation: 30.58593643467373,
    },
    mark: {
      pid: "HS5109",
      name: "GOLD CREEK",
      datasheetUrl:
        "https://www.ngs.noaa.gov/cgi-bin/ds_mark.prl?PidBox=HS5109",
      retrieved: "2026-11-07",
      geodetic: { longitude: -2.128, latitude: 0.6577, ellipsoidHeight: 139.9 },
      publishedSpc: { easting: 6_146_924.9, northing: 2_075_186.11 },
      published: { position: "P", ellipsoidHeight: "H", spc: "S" },
      design: [6_146_924.898370231, 2_075_186.1049354423, 565.0405851074022],
      bodyFixed: [6_146_924.9 * MPU, 2_075_186.1 * MPU, 172.2],
      nearest: { station: 154_394.85635582887, offset: -501.1878926694123 },
      nearestDesign: [6_146_710.878865431, 2_074_732.9107658817, 910],
      designDistance: 608.4293727964359,
      horizontalDistance: 501.1878926694269,
      trueDistance: 185.46359940945996,
    },
    sites: {},
  };
}

/**
 * Placements a test can see through: reprojected draws a design point at
 * metres (E·u, N·u, H·u), its true place; rigid draws it 31 m off (a fixed
 * sag), as a rigid placement far from its anchor does.
 */
function placements(): OpenerPlacements {
  const SAG = [10, -20, 21];
  const truth = (d: ArrayLike<number>) =>
    Float64Array.from([d[0]! * MPU, d[1]! * MPU, d[2]! * MPU]);
  return {
    rigid: {
      displayed: (d) => {
        const t = truth(d);
        return Float64Array.from([
          t[0]! + SAG[0]!,
          t[1]! + SAG[1]!,
          t[2]! + SAG[2]!,
        ]);
      },
    },
    reprojected: { displayed: truth },
  };
}

describe("the measurements the page opens with", () => {
  const a = answers();
  const p = placements();
  const settled = (mode: "rigid" | "reprojected") => ({
    t: mode === "rigid" ? 0 : 1,
    exaggeration: 1,
    morphing: false,
  });

  it("opens with the design against itself, against NGS's mark, and the 10,000 ft pair, in that order", () => {
    const openers = openingMeasurements(a, p);
    expect(openers.map((o) => o.id)).toEqual(["marker", "mark", "pair"]);
    expect(openers.map((o) => o.quiet)).toEqual([false, false, true]);
  });

  it("the design against itself: a marker at station 170,000's true position, to the drawn station", () => {
    const [marker] = openingMeasurements(a, p);
    // The marker stands where the point truly is, in either placement.
    expect([...marker!.a.rigid]).toEqual(a.marker.bodyFixed);
    expect([...marker!.a.reprojected]).toEqual(a.marker.bodyFixed);
    // The drawn station is where each placement draws the design point.
    expect([...marker!.b.rigid]).toEqual([
      ...p.rigid.displayed(a.marker.design),
    ]);
    const rigid = openerView(marker!, a, settled("rigid"));
    const reprojected = openerView(marker!, a, settled("reprojected"));
    // The design says one point; the true positions agree.
    expect(rigid.design).toBe("0.000 ftUS");
    expect(rigid.trueDistance).toBe("0.000 m");
    // Rigid draws it apart (here the test's 31 m sag); reprojected, 0.000 m.
    expect(rigid.drawn).toBe(`${Math.hypot(10, 20, 21).toFixed(3)} m`);
    expect(reprojected.drawn).toBe("0.000 m");
    expect(rigid.title).toBe("Station 1700+00.000 against its true position");
  });

  it("the gap shrinks as the morph runs, and says no measurement while exaggerated", () => {
    const [marker] = openingMeasurements(a, p);
    const gap = (t: number) =>
      Number(
        openerView(marker!, a, { t, exaggeration: 1, morphing: true })
          .drawn!.replace(" m", "")
          .replace(",", ""),
      );
    const full = Math.hypot(10, 20, 21);
    expect(gap(0)).toBeCloseTo(full, 3);
    expect(gap(0.25)).toBeCloseTo(full * 0.75, 3);
    expect(gap(0.75)).toBeCloseTo(full * 0.25, 3);
    expect(gap(1)).toBe(0);
    const exaggerated = openerView(marker!, a, {
      t: 0,
      exaggeration: 10,
      morphing: false,
    });
    expect(exaggerated.drawn).toBeUndefined();
    expect(exaggerated.globe).toMatch(/×10/);
  });

  it("the design against NGS's mark: the figures from answers.json, the same in both placements", () => {
    const [, mark] = openingMeasurements(a, p);
    expect([...mark!.a.rigid]).toEqual(a.mark.bodyFixed);
    expect([...mark!.b.reprojected]).toEqual([
      ...p.reprojected.displayed(a.mark.nearestDesign),
    ]);
    for (const mode of ["rigid", "reprojected"] as const) {
      const v = openerView(mark!, a, settled(mode));
      expect(v.design).toBe("608.429 ftUS");
      expect(v.trueDistance).toBe("185.464 m");
      expect(v.title).toBe("HS5109 GOLD CREEK to the centreline");
    }
  });

  it("the 10,000 ft pair: the design distance identical in both placements; only the drawn length differs", () => {
    const [, , pair] = openingMeasurements(a, p);
    const rigid = openerView(pair!, a, settled("rigid"));
    const reprojected = openerView(pair!, a, settled("reprojected"));
    expect(rigid.design).toBe("10,002.000 ftUS");
    expect(reprojected.design).toBe(rigid.design);
    expect(rigid.trueDistance).toBe("3,048.848 m");
    expect(reprojected.trueDistance).toBe(rigid.trueDistance);
    expect(rigid.title).toBe("10,000 ft on the first tangent");
  });

  it("writes no e-notation and names every unit", () => {
    for (const o of openingMeasurements(a, p)) {
      for (const mode of ["rigid", "reprojected"] as const) {
        const v = openerView(o, a, settled(mode));
        for (const text of [v.design, v.trueDistance, v.drawn, v.globe]) {
          if (text !== undefined) {
            expect(text).not.toMatch(/\de[+-]?\d/i);
          }
        }
        expect(v.design).toMatch(/ ftUS$/);
        expect(v.trueDistance).toMatch(/ m$/);
      }
    }
  });
});

describe("drawnAt", () => {
  it("is the morph shader's blend: rigid's error scaled by the exaggeration, then mixed toward reprojected", () => {
    const e = {
      rigid: Float64Array.from([10, 0, 0]),
      reprojected: Float64Array.from([0, 0, 0]),
    };
    expect([...drawnAt(e, 0, 1)]).toEqual([10, 0, 0]);
    expect([...drawnAt(e, 1, 1)]).toEqual([0, 0, 0]);
    expect([...drawnAt(e, 0.5, 1)]).toEqual([5, 0, 0]);
    expect([...drawnAt(e, 0, 10)]).toEqual([100, 0, 0]);
  });
});

describe("what the measure section shows, for the checks", () => {
  const a = answers();
  const pair = a.pairs[0]!;
  const exactPair = {
    designDistance: pair.designDistance,
    horizontalDistance: pair.horizontalDistance,
    trueDistance: pair.trueDistance,
    a: { station: 10_000, offset: 0 },
    b: { station: 20_000, offset: 0 },
  };

  it("fills ShownValues: the pair and its ends exact, the marker's separation, the mark's zone 3", () => {
    const shown = shownValues(a, {
      pair: exactPair,
      marker: { separation: a.marker.separation, mode: "rigid" },
      mark: [a.mark.publishedSpc.easting, a.mark.publishedSpc.northing],
    });
    expect(shown.pairs.get("first-tangent")?.basis).toBe("exact");
    expect([...shown.points.keys()].sort()).toEqual([0, 1, 2]);
    const rows = checkRows(a, shown);
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(status["pair.first-tangent.design"]).toBe("pass");
    expect(status["pair.first-tangent.true"]).toBe("pass");
    expect(status["point.0.station"]).toBe("pass");
    expect(status["marker.separation"]).toBe("pass");
    expect(status["mark.easting"]).toBe("pass");
  });

  it("takes the user's ends where they are answers' points, with the basis their snap gives", () => {
    const at = (i: number, o: Partial<MeasureEnd> = {}) =>
      end(0, { design: Float64Array.from(a.points[i]!.design), ...o });
    const shown = shownValues(a, {
      user: {
        a: at(0, { how: "geometry", kind: "point" }),
        b: at(1, { how: "geometry", kind: "point" }),
        measurement: exactPair,
      },
    });
    expect(shown.points.get(0)?.basis).toBe("vertex");
    expect(shown.pairs.get("first-tangent")?.basis).toBe("vertex");
    // A surface pick states its tolerance; off an answer's point, no row.
    const picked = shownValues(a, {
      user: {
        a: at(0, { how: "pick", kind: "surface", tolerance: 0.07 }),
        b: end(6_100_000),
      },
    });
    expect(picked.points.get(0)).toMatchObject({
      basis: "pick",
      tolerance: 0.07,
    });
    expect(picked.pairs.size).toBe(0);
  });
});
