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
  lengthText,
  formatParams,
  loadingFor,
  loadingSummary,
  morphEase,
  morphValue,
  nextLoading,
  parseParams,
  probeVerdict,
  retargetMorph,
  rigidVerdict,
  siteGridText,
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
import {
  cause,
  partsText,
  rigidErrorTerms,
  scaleText,
} from "../examples/design-globe/siteFacts.ts";
import type { SiteRuntime } from "../examples/design-globe/siteLoader.ts";
import type { DesignPick } from "../src/engineering/pick.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import {
  EA_LIDAR_CREDIT,
  OGL_V3,
  USGS_3DEP,
  siteCredits,
} from "../examples/design-globe/dataCredits.ts";

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
    // Under a centimetre, to 0.1 mm: one figure for Amsterdam's 2.6 mm everywhere.
    expect(errorText(0.0025631575)).toBe("2.6 mm");
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
    expect(m.switchNote).toMatch(/^Drawn rigid: one tileset/);
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
    selectedPaired: true,
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
      selectedPaired: true,
    });
    expect(trueScale.hit?.design).toBeDefined();
  });

  it("gates a pick by the site it hits, with an unpaired site selected", () => {
    // The site-grid building (one tileset) is selected; the corridor beside
    // it still morphs and is still drawn exaggerated: a pick on it gives no
    // design coordinates.
    const selectedOne = {
      mode: "rigid" as const,
      selectedPaired: false,
    };
    const moving = judgePick(pick(rigidSet), site, {
      ...selectedOne,
      t: 0.4,
      morphing: true,
      exaggeration: 1,
    });
    expect(moving.hit?.design).toBeUndefined();
    expect(moving.refused).toMatch(/between placements/);
    const exaggerated = judgePick(pick(rigidSet), site, {
      ...selectedOne,
      t: 0,
      morphing: false,
      exaggeration: EXAGGERATION,
    });
    expect(exaggerated.hit?.design).toBeUndefined();
    expect(exaggerated.refused).toMatch(new RegExp(`×${EXAGGERATION}`));
    // The selected one-tileset site itself still gives them.
    const own = judgePick(pick(rigidSet), oneTileset, {
      ...selectedOne,
      t: 0.4,
      morphing: true,
      exaggeration: EXAGGERATION,
    });
    expect(own.hit?.design).toBeDefined();
  });

  it("treats a one-tileset site as rigid, whatever the page's mode", () => {
    const r = judgePick(pick(rigidSet), oneTileset, {
      mode: "reprojected",
      t: 1,
      morphing: true,
      exaggeration: EXAGGERATION,
      selectedPaired: true,
    });
    expect(r.drawn).toBe("rigid");
    expect(r.hit?.design).toBeDefined();
  });
});

describe("design globe error causes", () => {
  it("names the largest part of a rigid error", () => {
    expect(cause({ curvature: 0.0001, scale: 0.0026, geoid: 0.0003 })).toBe(
      ", mostly the scale factor rigid ignores",
    );
    expect(cause({ curvature: 18, scale: 2, geoid: -1 })).toBe(
      ", mostly the Earth's curvature",
    );
    expect(cause({ curvature: 0.1, scale: 0.05, geoid: 0.4 })).toBe(
      ", mostly the geoid's rise from the anchor",
    );
    expect(cause(undefined)).toBe("");
  });
});

describe("design globe combined factor (Task 20)", () => {
  it("says the anchor's combined factor in ppm and what rigid does with it", () => {
    const t = scaleText(0.9998910622771672);
    expect(t).toMatch(/^0\.99989106 at the anchor \(−108\.9 ppm\)/);
    expect(t).toMatch(/ground distances are 108\.9 ppm longer than the grid's/);
    expect(t).toMatch(/rigid ignores it/);
    expect(scaleText(1.0001373259917115)).toMatch(/137\.3 ppm shorter/);
    expect(scaleText(1 + 1e-9)).toMatch(/agree to 0\.1 ppm/);
  });
});

describe("design globe Task 20 fix 1: per-site loading, site grids, words", () => {
  it("keeps a site's items to that site, with the engine's words apart", () => {
    let items: readonly LoadItem[] = [];
    for (const e of [
      { type: "start", id: "proj", label: "PROJ" },
      {
        type: "start",
        id: "frame:jakarta",
        label: "Jakarta: placements",
        site: "jakarta",
      },
      {
        type: "error",
        id: "frame:jakarta",
        detail: "Jakarta: its placement failed the engine's check.",
        technical: "BENTLEY_engineering_frame: … at most 1e-9",
      },
      {
        type: "error",
        id: "tiles:tokyo:later",
        detail: "Tokyo: a tile didn't load.",
        site: "tokyo",
      },
    ] as LoadEvent[]) {
      items = nextLoading(items, e);
    }
    const jakarta = items.find((i) => i.id === "frame:jakarta")!;
    expect(jakarta.site).toBe("jakarta");
    expect(jakarta.state).toBe("error");
    expect(jakarta.technical).toMatch(/at most 1e-9/);
    expect(loadingFor(items, "jakarta").map((i) => i.id)).toEqual([
      "proj",
      "frame:jakarta",
    ]);
    expect(loadingFor(items, "london").map((i) => i.id)).toEqual(["proj"]);
    expect(loadingFor(items, "tokyo").map((i) => i.id)).toEqual([
      "proj",
      "tiles:tokyo:later",
    ]);
  });

  it("says a site grid in words: origin, rotation and scale", () => {
    const t = siteGridText(
      {
        origin: [6_050_000, 2_100_000, 0],
        rotation: (12.5 * Math.PI) / 180,
        scale: 1.0000375,
      },
      "ftUS",
    );
    expect(t).toBe(
      "origin E 6,050,000.000, N 2,100,000.000 ftUS; rotated 12.5° from grid east; scale 1.0000375",
    );
  });

  it("says a rigid-only site is so by design, with its site grid", () => {
    const m = buildPanelModel({
      params: { mode: "rigid", site: "site-building", snap: "exact" },
      loading: [],
      t: 0,
      morphing: false,
      ghost: true,
      exaggerate: false,
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
    });
    expect(m.switchNote).toMatch(
      /^Drawn rigid: one tileset, on a site grid \(/,
    );
    expect(m.switchNote).toContain("12.5°");
    expect(m.switchNote).not.toMatch(/on the way/);
  });

  it("starts Fly along at the self-check's station, and says which", () => {
    const m = buildPanelModel({
      params: { mode: "rigid", site: "corridor", snap: "exact" },
      loading: [],
      t: 0,
      morphing: false,
      ghost: true,
      exaggerate: false,
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
      samples: [
        { station: 92_021, error: 0 },
        { station: 170_000, error: 30.6 },
        { station: 171_255, error: 31.4 },
      ] as never,
      anchorStation: 92_021,
      alongFrom: 170_000,
      stations: { start: 10_000, end: 174_042 },
      cursor: { text: "", muted: false },
      flyingAlong: false,
      evidence: true,
    });
    expect(m.alongNote).toBe(
      "From station 1700+00, where rigid is 30.6 m off, down the corridor to the anchor.",
    );
    // The anchor's station explained once.
    expect(m.legend.solidText).toBe(
      "Rigid, anchored at station 920+21 (92,021 ftUS along the road)",
    );
  });

  it("doesn't repeat the error's size in the verdict", () => {
    expect(rigidVerdict(34.1).text).toBe("Rigid can't place it: reproject it.");
  });
});

describe("design globe Task 20 fix 1: the error's parts (I11)", () => {
  it("says the three parts as numbers", () => {
    expect(partsText({ curvature: 17.93, scale: 1.204, geoid: -0.41 })).toBe(
      "curvature 17.9 m, the scale factor 1.2 m, the geoid's rise −410 mm",
    );
  });

  it("finds the parts as the generator does: d²/2R, d·|1 − 1/k|, the geoid's rise", () => {
    const deg = Math.PI / 180;
    const frame = {
      units: { metersPerUnit: 1 },
      metersPerHeightUnit: 1,
      body: { ellipsoid: { radii: [6_378_137, 6_378_137, 6_356_752.314245] } },
      toGeodetic: (d: ArrayLike<number>) => ({
        longitude: 0,
        latitude: 37.7 * deg,
        // The geoid rises 0.5 m over the 20 km.
        height: d[2]! - 30 + (d[0]! / 20_000) * 0.5,
      }),
    };
    const t = rigidErrorTerms(frame, [0, 0, 100], [20_000, 0, 120], 0.9999);
    const a = 6_378_137;
    const e2 = 1 - (6_356_752.314245 / a) ** 2;
    const w = Math.sqrt(1 - e2 * Math.sin(37.7 * deg) ** 2);
    const r = Math.sqrt(((a * (1 - e2)) / w ** 3) * (a / w));
    expect(t.curvature).toBeCloseTo((20_000 * 20_000) / (2 * r), 9);
    expect(t.scale).toBeCloseTo(20_000 * Math.abs(1 - 1 / 0.9999), 9);
    expect(t.geoid).toBeCloseTo(0.5, 9);
  });
});

describe("design globe data credits (UX review I3)", () => {
  it("credits the Environment Agency's lidar under the OGL v3.0 with London", () => {
    const credits = siteCredits("london", ["OSTN15: Ordnance Survey <OGL>"]);
    expect(credits).toHaveLength(2);
    // The grids' credits first, escaped (catalog fields are data).
    expect(credits[0]!.html).toBe("Grids: OSTN15: Ordnance Survey &lt;OGL&gt;");
    const ea = credits[1]!;
    expect(ea.html).toBe(`<a href="${OGL_V3}">${EA_LIDAR_CREDIT}</a>`);
    expect(EA_LIDAR_CREDIT).toBe(
      "Contains Environment Agency information © Environment Agency and/or database right 2022, Open Government Licence v3.0",
    );
  });

  it("credits USGS 3DEP for the corridor's ground and the building's", () => {
    for (const site of ["corridor", "site-building"]) {
      const credits = siteCredits(site, []);
      expect(credits, site).toHaveLength(1);
      expect(credits[0]!.html, site).toContain(`href="${USGS_3DEP}"`);
      expect(credits[0]!.html, site).toContain("3DEP");
    }
    // Every site is in the list the page draws; no other ground data.
    expect(siteCredits("tokyo", [])).toEqual([]);
    expect(SITES.map((s) => s.id)).toEqual(
      expect.arrayContaining(["london", "corridor", "site-building"]),
    );
  });
});

describe("design globe lengths", () => {
  it("say three figures, across the unit's steps too (UX review M-k)", () => {
    expect(lengthText(60)).toBe("60 m");
    expect(lengthText(999.4)).toBe("999 m");
    expect(lengthText(999.6)).toBe("1.00 km");
    expect(lengthText(3_050)).toBe("3.05 km");
    expect(lengthText(9_996)).toBe("10.0 km");
    expect(lengthText(30_700)).toBe("30.7 km");
    expect(lengthText(99_960)).toBe("100 km");
  });
});
