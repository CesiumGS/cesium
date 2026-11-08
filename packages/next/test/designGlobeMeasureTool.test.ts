// Plan 4b Task 19: the design globe's measure tool (measureTool.ts): the
// two-click state machine, the snap mode's choice of service, the deep link
// with both design points, and the measurements the page opens with (the
// design against itself at station 170,000, the design against NGS's mark,
// and the quieter 10,000 ft pair), their figures from answers.json.
import { describe, expect, it, vi } from "vitest";
import type { Answers } from "../examples/design-globe/answers.ts";
import {
  drawnAt,
  openerView,
  openingMeasurements,
  rulerEnd,
  type OpenerPlacements,
} from "../examples/design-globe/measureOpeners.ts";
import { shownValues } from "../examples/design-globe/measureShown.ts";
import { datasheetUrl } from "../examples/design-globe/measureView.ts";
import { accuracyRows } from "../examples/design-globe/measureModel.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import {
  formatMeasureLink,
  nextMeasure,
  parseMeasureLink,
  routeByTileset,
  snapWith,
  type MeasureEnd,
  type MeasureState,
} from "../examples/design-globe/measureState.ts";
import { checkRows } from "../examples/design-globe/checks.ts";
import type {
  ClientSnapService,
  ServiceSnapRequest,
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

  /** What the page's `measure` gives, distinct from answers.json's to show which is shown. */
  const measured = {
    marker: { design: 0, horizontal: 0, trueDistance: 0 },
    mark: {
      design: 608.4293727,
      horizontal: 501.1878926694,
      trueDistance: 185.4635994097,
    },
    pair: {
      design: 10_001.9998000402,
      horizontal: 10_000.000000000253,
      trueDistance: 3_048.8484955078,
    },
  };

  it("the design against itself: a marker at station 170,000's true position, to the drawn station", () => {
    const [marker] = openingMeasurements(a, p);
    // The marker stands where the point truly is, in either placement.
    expect([...marker!.a.rigid]).toEqual(a.marker.bodyFixed);
    expect([...marker!.a.reprojected]).toEqual(a.marker.bodyFixed);
    // The drawn station is where each placement draws the design point.
    expect([...marker!.b.rigid]).toEqual([
      ...p.rigid.displayed(a.marker.design),
    ]);
    const rigid = openerView(marker!, a, settled("rigid"), measured.marker);
    const reprojected = openerView(
      marker!,
      a,
      settled("reprojected"),
      measured.marker,
    );
    // Rigid draws it apart (here the test's 31 m sag); reprojected, 0.000 m.
    const gap = `${Math.hypot(10, 20, 21).toFixed(3)} m`;
    expect(rigid.hero).toBe(gap);
    expect(reprojected.hero).toBe("0.000 m");
    // The figures, said once: one design point, one true place, and all of
    // the gap rigid's drawing.
    expect(rigid.globe).toBe(
      `Both ends are station 1700+00.000's own design point: 0.000 ftUS apart in the design, 0.000 m apart where it truly is. All ${gap} is rigid's drawing.`,
    );
    expect(reprojected.globe).toBe(
      "Both ends are station 1700+00.000's own design point: 0.000 ftUS apart in the design, 0.000 m apart where it truly is, and reprojected draws it there.",
    );
    expect(rigid.title).toBe("Station 1700+00.000 against its true position");
    // The caption follows the placement (UX review M4): reprojected's
    // 0.000 m is where its design puts it, rigid's figure beside it.
    expect(rigid.heroCaption).toBe(
      "Rigid draws the station this far from where its own design puts it.",
    );
    expect(reprojected.heroCaption).toBe(
      `Drawn where its own design puts it; rigid drew it ${gap} away.`,
    );
  });

  it("the gap shrinks as the morph runs, and says no measurement while exaggerated", () => {
    const [marker] = openingMeasurements(a, p);
    const gap = (t: number) =>
      Number(
        openerView(marker!, a, { t, exaggeration: 1, morphing: true })
          .hero!.replace(" m", "")
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
    expect(exaggerated.hero).toBeUndefined();
    expect(exaggerated.globe).toMatch(/×10/);
  });

  it("the design against NGS's mark: the page's measure, and rigid's offset of the road as the headline", () => {
    const [, mark] = openingMeasurements(a, p);
    expect([...mark!.a.rigid]).toEqual(a.mark.bodyFixed);
    expect([...mark!.b.reprojected]).toEqual([
      ...p.reprojected.displayed(a.mark.nearestDesign),
    ]);
    for (const mode of ["rigid", "reprojected"] as const) {
      const v = openerView(mark!, a, settled(mode), measured.mark);
      // One figure for the line: the horizontal design distance, the
      // slope distance beside it.
      expect(v.design).toBe("501.188 ftUS");
      expect(v.designLabel).toBe("Design distance, horizontal");
      expect(v.slope).toBe("608.429 ftUS");
      expect(v.trueDistance).toBe("185.464 m");
      expect(v.title).toBe("HS5109 GOLD CREEK to the centreline");
    }
    // The headline: how far rigid draws the road from where it is, to the
    // millimetre, shrinking through the morph.
    const hero = (t: number) =>
      openerView(mark!, a, { t, exaggeration: 1, morphing: t > 0 && t < 1 })
        .hero;
    expect(hero(0)).toBe(`${Math.hypot(10, 20, 21).toFixed(3)} m`);
    expect(hero(0.5)).toBe(`${(Math.hypot(10, 20, 21) / 2).toFixed(3)} m`);
    const rigid = openerView(mark!, a, settled("rigid"), measured.mark);
    // The caption names its place, never "here" (C1).
    expect(rigid.heroCaption).toBe(
      "Rigid draws the road this far from where it truly is, at the mark.",
    );
    // Reprojected, the drawn 0.000 m is by construction, so the headline is
    // the independent test: the design's distance to the mark against the
    // same from NGS's own zone 3 (501.193 ftUS here), with rigid's offset
    // in the caption (UX review M4).
    const reprojected = openerView(
      mark!,
      a,
      settled("reprojected"),
      measured.mark,
    );
    expect(reprojected.hero).toBe("0.005 ftUS");
    expect(reprojected.heroCaption).toBe(
      `The design's distance to the mark against the same from NGS's own zone 3, an independent test: within the datasheet's rounding. Rigid drew the road ${Math.hypot(10, 20, 21).toFixed(3)} m from where it is, at the mark.`,
    );
    expect(rigid.globe).toMatch(
      /^On the globe the mark measures [\d,.]+ m, [\d,.]+ m too (far|near)\.$/,
    );
  });

  it("shows no figure before the page has measured: answers.json is only the check", () => {
    for (const o of openingMeasurements(a, p)) {
      const v = openerView(o, a, settled("rigid"));
      expect(v.design).toBe("…");
      expect(v.trueDistance).toBe("…");
    }
  });

  it("the 10,000 ft pair: the design distance identical in both placements; only the drawn length differs", () => {
    const [, , pair] = openingMeasurements(a, p);
    const rigid = openerView(pair!, a, settled("rigid"), measured.pair);
    const reprojected = openerView(
      pair!,
      a,
      settled("reprojected"),
      measured.pair,
    );
    // The horizontal design distance leads (what CAD reports), the slope beside it.
    expect(rigid.design).toBe("10,000.000 ftUS");
    expect(rigid.designLabel).toBe("Design distance, horizontal");
    expect(rigid.slope).toBe("10,002.000 ftUS");
    expect(reprojected.design).toBe(rigid.design);
    expect(rigid.trueDistance).toBe("3,048.848 m");
    expect(reprojected.trueDistance).toBe(rigid.trueDistance);
    expect(rigid.title).toBe("10,000 ft on the first tangent");
  });

  it("writes no e-notation and names every unit", () => {
    for (const o of openingMeasurements(a, p)) {
      for (const mode of ["rigid", "reprojected"] as const) {
        const v = openerView(o, a, settled(mode), measured[o.id]);
        for (const text of [v.design, v.trueDistance, v.hero, v.globe]) {
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

describe("the exact snap's routing", () => {
  it("asks the one service of the request's tileset, and nothing for another", async () => {
    const rigid = {} as Tileset3D;
    const reprojected = {} as Tileset3D;
    const other = {} as Tileset3D;
    const answer = { kind: "point" } as unknown as SnapResult;
    const services = new Map<Tileset3D, SnapService>([
      [rigid, { snap: vi.fn(async () => answer) }],
      [reprojected, { snap: vi.fn(async () => undefined) }],
    ]);
    const router = routeByTileset(services);
    const ask = (tileset: Tileset3D) =>
      router.snap({ tileset } as unknown as ServiceSnapRequest);
    await expect(ask(rigid)).resolves.toBe(answer);
    expect(services.get(rigid)!.snap).toHaveBeenCalledTimes(1);
    expect(services.get(reprojected)!.snap).not.toHaveBeenCalled();
    await expect(ask(other)).resolves.toBeUndefined();
  });
});

describe("the datasheet's link", () => {
  it("is rendered only for https on NGS's own host", () => {
    expect(datasheetUrl(answers().mark.datasheetUrl)).toBe(
      "https://www.ngs.noaa.gov/cgi-bin/ds_mark.prl?PidBox=HS5109",
    );
    expect(datasheetUrl("https://ngs.noaa.gov/x")).toBe(
      "https://ngs.noaa.gov/x",
    );
    for (const hostile of [
      "https://ngs.noaa.gov.evil.com/",
      "https://evilngs.noaa.gov/",
      "http://www.ngs.noaa.gov/",
      "javascript:alert(1)",
      "https://x@evil.com/",
      "data:text/html,hi",
      "//www.ngs.noaa.gov/",
      "not a url",
    ]) {
      expect(datasheetUrl(hostile), hostile).toBeUndefined();
    }
    // Userinfo on NGS's host is still NGS's host, but no link carries it.
    expect(datasheetUrl("https://x@www.ngs.noaa.gov/")).toBeUndefined();
  });
});

describe("the ruler's far end", () => {
  it("parts ground's last 1,000 ft from design's by the measured scale", () => {
    const end = rulerEnd(
      {
        design: 10_001.9998000402,
        horizontal: 10_000,
        trueDistance: 3_048.8484955078,
      },
      MPU,
      "ftUS",
    );
    expect(end.feet).toBe(10_000);
    const groundFeet = 3_048.8484955078 / MPU;
    expect(end.gap).toBeCloseTo(
      10_000 * (1 - 10_001.9998000402 / groundFeet),
      9,
    );
    expect(end.ground).toBeLessThan(end.design);
    expect(end.text).toBe(
      `Ground's 10,000 ft ends ${end.gap.toFixed(3)} ftUS before design's`,
    );
  });
});

describe("the accuracy's parts", () => {
  const term = (
    source: "projection" | "earthOrientation" | "pick",
    end: "a" | "b",
    meters: number,
    note: string,
  ) => ({ source, meters, note: `End ${end}: ${note}` });
  const grid =
    'engineering frame "Highway corridor": PROJ operation (us_noaa_g2018u0.tif)';

  it("on one grid: the distance's accuracy not stated, its known part the snaps, apart from each end's position", () => {
    const rows = accuracyRows({
      meters: Math.hypot(2.015, 2.015, 0.002, 0.002),
      terms: [
        term("projection", "a", 2.015, grid),
        term("projection", "b", 2.015, `${grid}; the rest as end a`),
        term("pick", "a", 0.002, "the design point was snapped to a segment"),
        term("pick", "b", 0.002, "the design point was snapped to a segment"),
      ],
      warnings: [],
    });
    expect(rows.map((r) => r.label)).toEqual([
      "The distance",
      "Each end's position",
      "Projection, each end",
      "Pick or snap at A",
      "Pick or snap at B",
    ]);
    // The grid's common error cancels, but how much it varies between the
    // ends is unknown, so no total: the snaps (√2 × 2 mm) are a known part
    // only (UX review C1).
    expect(rows[0]!.value).toBe(
      "Not stated. The grid's common error cancels, and Earth orientation turns both ends together and cancels exactly. Not known: how much the grid varies between the ends (PROJ gives no figure). Known part: the snaps and picks, ±2.8 mm (1σ, combined as independent).",
    );
    expect(rows[0]!.value).not.toMatch(/doesn't enter|neither enters/);
    expect(rows[1]!.value).toMatch(/^±2\.0 m \(1σ\) on the globe/);
    expect(rows[2]!.value).toBe(
      "±2.0 m: PROJ's stated accuracy for the design CRS's operation (us_noaa_g2018u0.tif)",
    );
    expect(rows.map((r) => r.value).join(" ")).not.toMatch(/2\.8 m\b/);
  });

  it("never states a total from exact snaps, and never reads ±0 m", () => {
    // The page's default: two exact alignment snaps, tolerance 0.
    const rows = accuracyRows({
      meters: Math.hypot(2.015, 2.015),
      terms: [
        term("projection", "a", 2.015, grid),
        term("earthOrientation", "a", 3e-9, "EOP interpolation"),
        term(
          "pick",
          "a",
          0,
          "the design point was snapped to a segment: the snap's tolerance",
        ),
        term("projection", "b", 2.015, grid),
        term("earthOrientation", "b", 3e-9, "EOP interpolation"),
        term(
          "pick",
          "b",
          0,
          "the design point was snapped to a segment: the snap's tolerance",
        ),
      ],
      warnings: [],
    });
    const all = rows.map((r) => r.value).join(" ");
    expect(all).not.toMatch(/±0 m|±0\b/);
    expect(rows[0]!.value).toMatch(/^Not stated\. /);
    expect(rows[0]!.value).toMatch(
      /Known part: the snaps, exact \(no pick error\)\.$/,
    );
    expect(rows.find((r) => r.label === "Pick or snap at A")!.value).toBe(
      "exact (no pick error): the design point was snapped to a segment",
    );
  });

  it("a line as long as London's, on one grid, states no distance total either", () => {
    // 30 km through OSTN15 and OSGM15: the grid isn't uniform over it.
    const london =
      'engineering frame "London": PROJ operation (uk_os_OSTN15_NTv2_OSGBtoETRS.tif, uk_os_OSGM15_GB.tif)';
    const rows = accuracyRows({
      meters: Math.hypot(0.1, 0.1, 0.003, 0.003),
      terms: [
        term("projection", "a", 0.1, london),
        term("projection", "b", 0.1, london),
        term("pick", "a", 0.003, "the design point was snapped to a point"),
        term("pick", "b", 0.003, "the design point was snapped to a point"),
      ],
      warnings: [],
    });
    expect(rows[0]!.label).toBe("The distance");
    expect(rows[0]!.value).toMatch(/^Not stated\. /);
    expect(rows[0]!.value).toMatch(/how much the grid varies between the ends/);
    expect(rows[0]!.value).toMatch(/±4\.2 mm \(1σ, combined as independent\)/);
  });

  it("a geoid fallback's common error cancels too, and its variation is named", () => {
    const rows = accuracyRows({
      meters: undefined,
      terms: [
        term("projection", "a", 1.0, grid),
        {
          source: "geoidFallback",
          meters: undefined,
          note: "End a: EGM96 heights stand in",
        },
        term("projection", "b", 1.0, grid),
        {
          source: "geoidFallback",
          meters: undefined,
          note: "End b: EGM96 heights stand in",
        },
      ],
      warnings: [],
    });
    expect(rows[0]!.value).toMatch(
      /^Not stated\. The grid's and the geoid fallback's common errors cancel/,
    );
    expect(rows[0]!.value).toMatch(
      /how much the geoid fallback's error varies between them/,
    );
    expect(rows[1]!.value).toMatch(/^not stated/);
  });

  it("design points as given: no snap, so no known part; the mark's own accuracy named", () => {
    const rows = accuracyRows(
      {
        meters: Math.hypot(2.015, 2.015),
        terms: [
          term("projection", "a", 2.015, grid),
          term("projection", "b", 2.015, grid),
        ],
        warnings: [],
      },
      { mark: "HS5109" },
    );
    expect(rows[0]!.value).toMatch(/^Not stated\. /);
    expect(rows[0]!.value).not.toMatch(/[Ff]ar finer/);
    expect(rows[0]!.value).toMatch(
      /HS5109's own survey accuracy, which is not a term/,
    );
    expect(rows[0]!.value).toMatch(
      /Known part: none: the ends are design points as given, with no snap\.$/,
    );
  });

  it("ends on different grids: the parts combined as independent, as the statement gives them", () => {
    const rows = accuracyRows({
      meters: Math.hypot(2.015, 1.0),
      terms: [
        term("projection", "a", 2.015, grid),
        term(
          "projection",
          "b",
          1.0,
          'engineering frame "London": PROJ operation (uk_os_OSGM15_GB.tif)',
        ),
      ],
      warnings: [],
    });
    expect(rows.map((r) => r.label)).toEqual([
      "Accuracy",
      "Projection at A",
      "Projection at B",
    ]);
    expect(rows[0]!.value).toBe(
      "±2.2 m (1σ), of the true distance: the parts below, combined as independent",
    );
  });
});

describe("the link's numbers", () => {
  it("carry a tiny coordinate exactly, with no exponent", () => {
    const tiny = end(0, {
      design: Float64Array.from([Math.PI * 1e-7, -3e-12, 0]),
    });
    const link = formatMeasureLink({ phase: "done", a: tiny, b: tiny });
    expect(link.a).not.toMatch(/e/i);
    const back = parseMeasureLink({ a: link.a!, b: link.b! }, ["corridor"]);
    expect([...back!.a]).toEqual([...tiny.design]);
  });
});
