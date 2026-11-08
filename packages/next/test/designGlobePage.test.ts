// Plan 4b Task 18: the design globe page's state model (examples/design-
// globe/page.ts): its deep-link parameters, the loading states as the page
// reports them (PROJ, the grid catalog, each grid with bytes, the tiles), the
// placement morph's timing, the portfolio's order and the readouts' words.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  EXAGGERATION,
  MORPH_MS,
  SITES,
  cursorReadout,
  designRefusal,
  errorText,
  formatParams,
  loadingSummary,
  morphEase,
  morphValue,
  nextLoading,
  parseParams,
  probeVerdict,
  retargetMorph,
  rigidVerdict,
  type LoadEvent,
  type LoadItem,
  type PageParams,
} from "../examples/design-globe/page.ts";
import {
  buildPanelModel,
  type PageSnapshot,
} from "../examples/design-globe/panelModel.ts";
import { creaseEdges } from "../examples/design-globe/placementPair.ts";
import { judgePick } from "../examples/design-globe/cursor.ts";
import type { SiteRuntime } from "../examples/design-globe/siteLoader.ts";
import type { DesignPick } from "../src/engineering/pick.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";

describe("design globe params", () => {
  it("defaults to the corridor, rigid, with exact snapping", () => {
    expect(DEFAULT_PARAMS).toEqual({
      mode: "rigid",
      site: "corridor",
      snap: "exact",
    });
    expect(parseParams({})).toEqual(DEFAULT_PARAMS);
  });

  it("round-trips every mode, site and snap", () => {
    for (const mode of ["rigid", "reprojected"] as const) {
      for (const snap of ["exact", "geometry", "none"] as const) {
        for (const { id: site } of SITES) {
          const p: PageParams = { mode, site, snap };
          expect(parseParams(formatParams(p))).toEqual(p);
        }
      }
    }
  });

  it("leaves the defaults out of the link", () => {
    expect(formatParams(DEFAULT_PARAMS)).toEqual({
      mode: undefined,
      site: undefined,
      snap: undefined,
    });
    expect(
      formatParams({ mode: "reprojected", site: "london", snap: "none" }),
    ).toEqual({ mode: "reprojected", site: "london", snap: "none" });
  });

  it("falls back to the default for each unknown value on its own", () => {
    expect(
      parseParams({ mode: "bent", site: "atlantis", snap: "magnet" }),
    ).toEqual(DEFAULT_PARAMS);
    expect(parseParams({ mode: "reprojected", site: "nowhere" })).toEqual({
      ...DEFAULT_PARAMS,
      mode: "reprojected",
    });
    expect(parseParams({ site: "tokyo", snap: "" })).toEqual({
      ...DEFAULT_PARAMS,
      site: "tokyo",
    });
    // Not inherited names, not case variants.
    expect(parseParams({ site: "toString", mode: "Rigid" })).toEqual(
      DEFAULT_PARAMS,
    );
  });
});

/** Applies events in order. */
const run = (events: readonly LoadEvent[]): readonly LoadItem[] =>
  events.reduce<readonly LoadItem[]>(nextLoading, []);

describe("design globe loading states", () => {
  const GRID = "us_noaa_g2018u0.tif";
  const events: LoadEvent[] = [
    { type: "start", id: "proj", label: "PROJ" },
    { type: "progress", id: "proj", file: "proj_capi.mjs", received: 0 },
    {
      type: "progress",
      id: "proj",
      file: "proj_capi.wasm",
      received: 1_000_000,
      total: 4_000_000,
    },
    {
      type: "progress",
      id: "proj",
      file: "proj_capi.mjs",
      received: 100_000,
      total: 100_000,
    },
    { type: "ready", id: "proj" },
    { type: "start", id: "catalog", label: "Grid catalog" },
    {
      type: "progress",
      id: "catalog",
      file: "files.geojson",
      received: 331_044,
      total: 331_044,
    },
    { type: "ready", id: "catalog" },
    {
      type: "progress",
      id: `grid:${GRID}`,
      label: "GEOID18",
      file: GRID,
      received: 0,
      total: 16_742_155,
    },
    {
      type: "progress",
      id: `grid:${GRID}`,
      file: GRID,
      received: 8_000_000,
      total: 16_742_155,
    },
    { type: "start", id: "tiles:corridor", label: "Corridor tiles" },
    { type: "ready", id: `grid:${GRID}` },
    { type: "ready", id: "tiles:corridor", detail: "24 tiles" },
  ];

  it("lists the items in the order their first event came", () => {
    expect(run(events).map((i) => i.id)).toEqual([
      "proj",
      "catalog",
      `grid:${GRID}`,
      "tiles:corridor",
    ]);
  });

  it("sums a multi-file item's bytes, with a total once every file states one", () => {
    const afterTwo = run(events.slice(0, 3));
    expect(afterTwo[0]).toMatchObject({
      state: "fetching",
      received: 1_000_000,
    });
    expect(afterTwo[0]!.total).toBeUndefined();
    const afterThree = run(events.slice(0, 4));
    expect(afterThree[0]).toMatchObject({
      state: "fetching",
      received: 1_100_000,
      total: 4_100_000,
    });
  });

  it("gives each grid its bytes while it fetches, and a ready state after", () => {
    const mid = run(events.slice(0, 10));
    expect(mid[2]).toMatchObject({
      label: "GEOID18",
      state: "fetching",
      received: 8_000_000,
      total: 16_742_155,
    });
    const end = run(events);
    expect(end.map((i) => i.state)).toEqual([
      "ready",
      "ready",
      "ready",
      "ready",
    ]);
    expect(end[2]).toMatchObject({ bytes: 16_742_155 });
    expect(end[3]).toMatchObject({ detail: "24 tiles" });
  });

  it("follows each step: waiting, fetching, then a final state", () => {
    const steps = events.map((_, i) => run(events.slice(0, i + 1)));
    const states = (id: string) =>
      steps
        .map((s) => s.find((i) => i.id === id)?.state)
        .filter((s, i, a) => s !== undefined && s !== a[i - 1]);
    expect(states("proj")).toEqual(["waiting", "fetching", "ready"]);
    expect(states("catalog")).toEqual(["waiting", "fetching", "ready"]);
    expect(states(`grid:${GRID}`)).toEqual(["fetching", "ready"]);
    expect(states("tiles:corridor")).toEqual(["waiting", "ready"]);
  });

  it("keeps ready against late progress, and lets an error start again", () => {
    const done = run(events);
    expect(
      nextLoading(done, {
        type: "progress",
        id: "proj",
        file: "proj.db",
        received: 5,
      }),
    ).toBe(done);
    const failed = run([
      { type: "start", id: "proj", label: "PROJ" },
      { type: "error", id: "proj", detail: "proj.db: HTTP 502" },
    ]);
    expect(failed[0]).toMatchObject({
      state: "error",
      detail: "proj.db: HTTP 502",
    });
    const again = nextLoading(failed, {
      type: "start",
      id: "proj",
      label: "PROJ",
    });
    expect(again[0]).toMatchObject({ state: "waiting" });
    expect(again[0]!.detail).toBeUndefined();
  });

  it("drops an item on clear (its site reloaded)", () => {
    const done = run(events);
    const cleared = nextLoading(done, { type: "clear", id: "catalog" });
    expect(cleared.map((i) => i.id)).toEqual([
      "proj",
      `grid:${GRID}`,
      "tiles:corridor",
    ]);
    expect(nextLoading(cleared, { type: "clear", id: "catalog" })).toBe(
      cleared,
    );
  });

  it("sums up: loading, then ready; an error or missing data wins", () => {
    expect(loadingSummary([]).state).toBe("ready");
    expect(loadingSummary(run(events.slice(0, 9))).state).toBe("loading");
    expect(loadingSummary(run(events)).state).toBe("ready");
    const missing = nextLoading(
      nextLoading(run(events), {
        type: "start",
        id: "tiles:london",
        label: "London site tiles",
      }),
      { type: "missing", id: "tiles:london", detail: "not in the store" },
    );
    expect(loadingSummary(missing).state).toBe("missing");
    const error = nextLoading(missing, {
      type: "error",
      id: "proj",
      detail: "x",
    });
    // A ready item stays ready.
    expect(loadingSummary(error).state).toBe("missing");
    const failing = nextLoading(
      run([{ type: "start", id: "catalog", label: "Grid catalog" }]),
      { type: "error", id: "catalog", detail: "HTTP 502" },
    );
    expect(loadingSummary(failing).state).toBe("error");
  });
});

describe("design globe morph timing", () => {
  it("eases in and out over about 2 s", () => {
    expect(MORPH_MS).toBe(2000);
    expect(morphEase(0)).toBe(0);
    expect(morphEase(1)).toBe(1);
    expect(morphEase(0.5)).toBeCloseTo(0.5, 12);
    expect(morphEase(0.1)).toBeLessThan(0.1);
    expect(morphEase(0.9)).toBeGreaterThan(0.9);
    for (let u = 0; u < 1; u += 0.05) {
      expect(morphEase(u + 0.05)).toBeGreaterThanOrEqual(morphEase(u));
    }
  });

  it("runs from rigid to reprojected on the wall clock", () => {
    const m = retargetMorph(undefined, 1, 1000, MORPH_MS);
    expect(morphValue(m, 1000)).toBe(0);
    expect(morphValue(m, 2000)).toBeCloseTo(0.5, 12);
    expect(morphValue(m, 3000)).toBe(1);
    expect(morphValue(m, 9000)).toBe(1);
  });

  it("turns back from where it is, taking the part of the time that's left", () => {
    const m = retargetMorph(undefined, 1, 0, MORPH_MS);
    const at = morphValue(m, 1000);
    const back = retargetMorph(m, 0, 1000, MORPH_MS);
    expect(morphValue(back, 1000)).toBeCloseTo(at, 12);
    expect(back.duration).toBeCloseTo(MORPH_MS * at, 9);
    expect(morphValue(back, 1000 + back.duration)).toBe(0);
  });

  it("switches at once under reduced motion (no duration)", () => {
    const m = retargetMorph(undefined, 1, 500, 0);
    expect(morphValue(m, 500)).toBe(1);
  });
});

describe("design globe portfolio and words", () => {
  it("lists the sites smallest first, the corridor last", () => {
    expect(SITES.at(-1)!.id).toBe("corridor");
    const extents = SITES.map((s) => s.extent);
    expect([...extents].sort((a, b) => a - b)).toEqual(extents);
    expect(new Set(SITES.map((s) => s.id)).size).toBe(SITES.length);
    expect(SITES.map((s) => s.id)).toContain("site-building");
  });

  it("states a rigid error in the unit that reads", () => {
    expect(errorText(31.649)).toBe("31.6 m");
    expect(errorText(1.04)).toBe("1.0 m");
    expect(errorText(0.0844)).toBe("84 mm");
    expect(errorText(0.00031)).toBe("0.3 mm");
    expect(errorText(0.00001)).toBe("under 0.1 mm");
    expect(errorText(0)).toBe("0 mm");
  });

  it("judges rigid by its error at the model's edge", () => {
    expect(rigidVerdict(0.0003).acceptable).toBe(true);
    expect(rigidVerdict(0.03).acceptable).toBe(false);
    expect(rigidVerdict(31.6).acceptable).toBe(false);
    expect(rigidVerdict(31.6).text).toMatch(/reproject/i);
  });

  it("gives no design coordinates while the geometry is between placements", () => {
    const moving = cursorReadout({
      mode: "reprojected",
      morphing: true,
      exaggeration: 1,
    });
    expect(moving.design).toBe(false);
    expect(moving.text).toMatch(/between placements/);
    const exaggerated = cursorReadout({
      mode: "rigid",
      morphing: false,
      exaggeration: EXAGGERATION,
    });
    expect(exaggerated.design).toBe(false);
    expect(exaggerated.text).toContain(`×${EXAGGERATION}`);
    const settled = cursorReadout({
      mode: "rigid",
      morphing: false,
      exaggeration: 1,
      hit: { error: 30.586, station: 170_000, offset: -12 },
    });
    expect(settled.design).toBe(true);
    expect(settled.text).toContain("30.6 m");
    expect(settled.text).toContain("1700+00");
  });
});

describe("design globe seams (fix round 1)", () => {
  it("refuses design coordinates while the drawn geometry isn't a placement's", () => {
    const settled = {
      mode: "rigid" as const,
      morphing: false,
      exaggeration: 1,
      hitIsDrawn: true,
    };
    expect(designRefusal(settled)).toBeUndefined();
    expect(designRefusal({ ...settled, morphing: true })).toMatch(
      /between placements/,
    );
    expect(designRefusal({ ...settled, exaggeration: EXAGGERATION })).toMatch(
      new RegExp(`×${EXAGGERATION}`),
    );
    // Exaggeration moves only the rigid geometry: reprojected stays true.
    expect(
      designRefusal({
        ...settled,
        mode: "reprojected",
        exaggeration: EXAGGERATION,
      }),
    ).toBeUndefined();
    expect(designRefusal({ ...settled, hitIsDrawn: false })).toMatch(
      /not drawn/,
    );
  });

  it("tells a missing tileset from a failing server", () => {
    expect(probeVerdict(200, "application/json")).toBe("ok");
    expect(probeVerdict(404, "text/html")).toBe("missing");
    // A dev server answers a missing file with its own page.
    expect(probeVerdict(200, "text/html")).toBe("missing");
    expect(probeVerdict(502, "text/html")).toBe("error");
    expect(probeVerdict(500, "application/json")).toBe("error");
    expect(probeVerdict(undefined, undefined)).toBe("error");
  });
});

describe("design globe panel model", () => {
  const snapshot = (over: Partial<PageSnapshot> = {}): PageSnapshot => ({
    params: { mode: "reprojected", site: "london", snap: "exact" },
    loading: [],
    t: 1,
    morphing: false,
    ghost: true,
    exaggerate: true,
    sites: new Map(
      SITES.map((entry) => [
        entry.id,
        {
          entry,
          paired: entry.id === "corridor",
          started: true,
          drawn: true,
        },
      ]),
    ),
    stations: { start: 10_000, end: 174_042 },
    cursor: { text: "", muted: false },
    flyingAlong: false,
    evidence: true,
    ...over,
  });

  it("shows a rigid-only site as rigid, its switch and toggles off, with why", () => {
    const m = buildPanelModel(snapshot());
    expect(m.mode).toBe("rigid");
    expect(m.switchable).toBe(false);
    expect(m.ghost).toBe(false);
    expect(m.exaggerate).toBe(false);
    expect(m.switchNote).toMatch(/reprojected tiles are on the way/);
    expect(m.legend.solid).toBe("rigid");
    expect(m.legend.ghostText).toBeUndefined();
    expect(m.legend.exaggeration).toBe(1);
  });

  it("shows the corridor's own state", () => {
    const m = buildPanelModel(
      snapshot({
        params: { mode: "reprojected", site: "corridor", snap: "exact" },
      }),
    );
    expect(m.mode).toBe("reprojected");
    expect(m.switchable).toBe(true);
    expect(m.ghost).toBe(true);
    expect(m.exaggerate).toBe(true);
    expect(m.legend.solid).toBe("reprojected");
  });
});

describe("design globe creases", () => {
  it("finds a box's 12 edges and nothing on a flat strip", () => {
    // A unit box, flat-shaded: 6 faces × 2 triangles, own vertices each.
    const corners = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ];
    const faces = [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ];
    const positions: number[] = [];
    const indices: number[] = [];
    for (const f of faces) {
      const base = positions.length / 3;
      for (const c of f) {
        positions.push(...corners[c]!);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const box = creaseEdges(
      Float32Array.from(positions),
      Uint32Array.from(indices),
    );
    expect(box.length / 2).toBe(12);
    // A strip of three coplanar quads: its shared edges don't fold.
    const strip = creaseEdges(
      Float32Array.from([
        0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 1, 0, 1, 1, 0, 2, 1, 0, 3, 1, 0,
      ]),
      Uint32Array.from([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6]),
    );
    expect(strip.length).toBe(0);
  });
});

describe("design globe pick seam (judgePick)", () => {
  const rigidSet = { name: "rigid" } as unknown as Tileset3D;
  const reproSet = { name: "reprojected" } as unknown as Tileset3D;
  const site = {
    entry: SITES.at(-1)!,
    rigid: rigidSet,
    reprojected: reproSet,
    pair: {},
  } as unknown as SiteRuntime;
  const oneTileset = {
    entry: SITES[0]!,
    rigid: rigidSet,
  } as unknown as SiteRuntime;
  const pick = (tileset: Tileset3D) =>
    ({
      position: new Float64Array(3),
      tileset,
      tolerance: 0.2,
      design: { design: new Float64Array([1, 2, 3]) },
    }) as unknown as DesignPick;
  const settled = {
    mode: "rigid" as const,
    t: 0,
    morphing: false,
    exaggeration: 1,
  };

  it("gives design coordinates on the drawn placement, settled at true scale", () => {
    const r = judgePick(pick(rigidSet), site, settled);
    expect(r.refused).toBeUndefined();
    expect(r.hit?.design).toBeDefined();
    expect(r.drawn).toBe("rigid");
    const p = judgePick(pick(reproSet), site, {
      ...settled,
      mode: "reprojected",
      t: 1,
    });
    expect(p.hit?.design).toBeDefined();
  });

  it("refuses mid-morph, while rigid is exaggerated, and off the drawn placement", () => {
    const moving = judgePick(pick(rigidSet), site, {
      ...settled,
      t: 0.3,
      morphing: true,
    });
    expect(moving.hit?.design).toBeUndefined();
    expect(moving.refused).toMatch(/between placements/);
    const exaggerated = judgePick(pick(rigidSet), site, {
      ...settled,
      exaggeration: EXAGGERATION,
    });
    expect(exaggerated.hit?.design).toBeUndefined();
    // The reprojected tileset hit while rigid is drawn (a stale tile).
    const other = judgePick(pick(reproSet), site, settled);
    expect(other.hit?.design).toBeUndefined();
    expect(other.refused).toMatch(/not drawn/);
    // Reprojected and exaggerated: the drawn geometry is true.
    const trueScale = judgePick(pick(reproSet), site, {
      mode: "reprojected",
      t: 1,
      morphing: false,
      exaggeration: EXAGGERATION,
    });
    expect(trueScale.hit?.design).toBeDefined();
  });

  it("treats a one-tileset site as rigid, whatever the page's mode", () => {
    const r = judgePick(pick(rigidSet), oneTileset, {
      mode: "reprojected",
      t: 1,
      morphing: true,
      exaggeration: EXAGGERATION,
    });
    expect(r.drawn).toBe("rigid");
    expect(r.hit?.design).toBeDefined();
  });
});
