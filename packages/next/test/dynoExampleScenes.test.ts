// Example scenes and the development metrics (CS-394): group D in
// bench/suite/catalog/dev.json, the examples' declared `param.` settings,
// the example host's settle rule and readings (bench/suite/exampleDriver.ts),
// and group D kept out of headline means, the Overview, scorecards and
// budgets.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { EXAMPLES } from "../examples/index.ts";
import {
  allScenes,
  isExampleScene,
  loadCatalog,
  sceneDatasets,
  unsupportedReason,
} from "../bench/suite/manifest.mjs";
import { parseEngine } from "../bench/suite/engines.mjs";
import {
  checkSetting,
  checkVariants,
  configPath,
  findSetting,
  paramsNotTaken,
  planSweep,
  registerExampleParams,
  SettingError,
} from "../bench/suite/settings.mjs";
import {
  headlineSummary,
  metricRow,
  summarizeRun,
} from "../bench/suite/report.mjs";
import { checkBudgets, scorecard } from "../bench/suite/scorecard.mjs";
import {
  createSettleRule,
  exampleParams,
  parseCamera,
  pendingWords,
  readProbe,
  type TilesetState,
} from "../bench/suite/exampleHost.ts";
import { measureCommand } from "../bench/suite/views/exampleRun.ts";
import type { ExampleScene } from "../bench/suite/schema.ts";

const catalog = loadCatalog("");
registerExampleParams(EXAMPLES);

describe("group D's catalog", () => {
  it("loads dev.json's scenes apart from the catalog's", () => {
    const ids = catalog.exampleScenes.map((s: ExampleScene) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "vex-valley",
        "vex-zermatt",
        "vex-x10-zermatt",
        "vex-skirts",
        "translucency-split",
      ]),
    );
    // Default runs, areas and image checks read `scenes`: never group D.
    expect(catalog.scenes.some(isExampleScene)).toBe(false);
    expect(allScenes(catalog).map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(ids),
    );
    // Still one public source, as reports have always counted it.
    expect(catalog.sources).toBe(1);
  });

  it("names an example that exists and datasets the public catalog has", () => {
    for (const scene of catalog.exampleScenes as ExampleScene[]) {
      expect(EXAMPLES.some((e) => e.id === scene.example)).toBe(true);
      const datasets = sceneDatasets(catalog, scene);
      expect(datasets.every(Boolean)).toBe(true);
      expect(datasets.map((d) => d?.id)).toEqual(scene.datasets);
    }
  });

  it("runs on 2.0 only", () => {
    const scene = allScenes(catalog).find((s) => s.id === "vex-x10-zermatt")!;
    expect(unsupportedReason(catalog, scene, "1.x")).toMatch(/2\.0 only/);
    expect(unsupportedReason(catalog, scene, "2.0")).toBeUndefined();
  });

  describe("a private manifest's example scenes", () => {
    const dir = mkdtempSync(join(tmpdir(), "dyno-example-scenes-"));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const write = (scene: Record<string, unknown>) => {
      const file = join(dir, `${String(scene.id)}.json`);
      writeFileSync(file, JSON.stringify({ exampleScenes: [scene] }));
      return file;
    };
    const base = {
      title: "t",
      group: "D",
      example: "vertical-exaggeration",
      datasets: ["cwt"],
    };

    it("are refused with an unknown dataset", () => {
      expect(() =>
        loadCatalog(write({ ...base, id: "a", datasets: ["nope"] })),
      ).toThrow(/example scene a: unknown dataset "nope"/);
    });

    it("are refused without a datasets list, or in another group", () => {
      expect(() =>
        loadCatalog(write({ ...base, id: "b", datasets: undefined })),
      ).toThrow(/example scene b: no datasets list/);
      expect(() =>
        loadCatalog(write({ ...base, id: "c", group: "A" })),
      ).toThrow(/example scene c: group "A", not D/);
    });

    it("merge with dev.json's", () => {
      const merged = loadCatalog(write({ ...base, id: "private-vex" }));
      expect(merged.exampleScenes.map((s: { id: string }) => s.id)).toContain(
        "private-vex",
      );
      expect(merged.sources).toBe(2);
    });
  });
});

describe("param. settings", () => {
  it("are the examples' declared parameters, for example runs only", () => {
    const x = findSetting("param.x");
    expect(x).toMatchObject({
      label: "exaggeration factor",
      type: "number",
      min: 1,
      max: 10,
      kinds: ["example"],
      examples: ["vertical-exaggeration"],
    });
    expect(
      checkSetting("param.x", "10", { engine: "2.0", kind: "example" }).value,
    ).toBe(10);
    expect(() =>
      checkSetting("param.x", "11", { engine: "2.0", kind: "example" }),
    ).toThrow(/param\.x takes 1 to 10/);
    expect(() =>
      checkSetting("param.x", "4", { engine: "2.0", kind: "bench" }),
    ).toThrow(SettingError);
    expect(() =>
      checkSetting("param.nope", "4", { engine: "2.0", kind: "example" }),
    ).toThrow(/unknown setting/);
    // view. settings reach example scenes too.
    expect(
      checkSetting("view.lodExponent", "0.5", { kind: "example" }).value,
    ).toBe(0.5);
  });

  it("registers once, and refuses two meanings of one name", () => {
    const before = registerExampleParams(EXAMPLES).length;
    expect(registerExampleParams(EXAMPLES)).toHaveLength(before);
    expect(() =>
      registerExampleParams([
        {
          id: "other",
          title: "Other",
          params: [{ name: "x", label: "x", type: "number", min: 0, max: 99 }],
        },
      ]),
    ).toThrow(/param\.x: other declares it as 0 to 99/);
  });

  it("sweep: param.x as an axis, its points as configurations", () => {
    const plan = planSweep({
      sweeps: ["param.x=1,4,10", "view.lodExponent=0,1"],
      engine: "2.0",
      kind: "example",
    });
    expect(plan?.axes).toEqual([
      { id: "param.x", values: [1, 4, 10] },
      { id: "view.lodExponent", values: [0, 1] },
    ]);
    expect(plan?.points).toHaveLength(6);
    // A point's configuration: the setting goes to `config.param`
    // (engineBuilds.mjs sets each variant at its configPath).
    const [variant] = checkVariants(parseEngine("2.0+param.x=10"), "example");
    expect(configPath(variant!.setting)).toBe("param.x");
    expect(variant!.value).toBe(10);
  });

  it("are refused for a scene whose example doesn't declare them", () => {
    const scenes = catalog.exampleScenes as ExampleScene[];
    expect(paramsNotTaken(["param.x"], scenes)).toEqual([
      "param.x (translucency-split: translucency)",
    ]);
    expect(
      paramsNotTaken(
        ["param.x", "view.shadows"],
        scenes.filter((s) => s.example === "vertical-exaggeration"),
      ),
    ).toEqual([]);
  });
});

describe("the example host", () => {
  const scene = {
    id: "s",
    title: "s",
    group: "D",
    example: "vertical-exaggeration",
    params: { x: 10, view: "zermatt-close" },
    datasets: [],
  } as ExampleScene;

  it("passes the scene's params, under the configuration's", () => {
    expect(exampleParams(scene, {})).toEqual({
      x: "10",
      view: "zermatt-close",
    });
    expect(exampleParams(scene, { param: { x: 4 } })).toEqual({
      x: "4",
      view: "zermatt-close",
    });
  });

  it("reads the pose contract, and refuses a malformed one", () => {
    expect(parseCamera("7.75,46.02,1660,215,-22,1600")).toEqual({
      longitude: 7.75,
      latitude: 46.02,
      height: 1660,
      heading: 215,
      pitch: -22,
      range: 1600,
    });
    expect(parseCamera(undefined)).toBeUndefined();
    expect(() => parseCamera("1,2,3")).toThrow(/camera=lon,lat,height/);
    expect(() => parseCamera("1,2,3,4,5,0")).toThrow(/range above 0/);
  });

  const quiet = (drawn: number): TilesetState => ({
    label: "terrain",
    show: true,
    idle: true,
    inFlight: 0,
    queued: 0,
    loading: 0,
    imageryBusy: false,
    drawn,
  });

  it("settles once nothing is pending and the counts hold for holdMs", () => {
    const rule = createSettleRule({ holdMs: 3000, capMs: 120_000 });
    const busy = { ...quiet(10), inFlight: 2 };
    expect(rule(500, [busy], 1000)).toBeUndefined();
    expect(rule(1000, [quiet(10)], 1000)).toBeUndefined();
    expect(rule(2000, [quiet(12)], 1200)).toBeUndefined(); // still changing
    expect(rule(4000, [quiet(12)], 1200)).toBeUndefined();
    expect(rule(5000, [quiet(12)], 1200)).toEqual({
      settled: true,
      settleMs: 2000,
    });
  });

  it("reports a capped run as not settled, with what was pending", () => {
    const rule = createSettleRule({ holdMs: 3000, capMs: 10_000 });
    const pending = { ...quiet(10), label: "osm", inFlight: 3, queued: 2 };
    expect(rule(5000, [quiet(10), pending], 900)).toBeUndefined();
    expect(rule(10_000, [quiet(10), pending], 900)).toEqual({
      settled: false,
      reason: "cap of 10 s: osm 3 in flight, 2 queued",
    });
    expect(pendingWords([quiet(1)])).toBe("the drawn counts kept changing");
    const empty = createSettleRule({ holdMs: 0, capMs: 1000 });
    expect(empty(1000, [], 0)).toEqual({
      settled: false,
      reason: "cap of 1 s: nothing drawn",
    });
  });

  it("reads the stretched error from the probe's lines", () => {
    const text = [
      '[probe] {"drawn":3,"threshold":2}',
      "[probe] csv",
      "level,sseBox,sseSurface,sseStretch,sseExact,dBox",
      "10,1,1,1,1.5,100",
      "11,1,1,1,2.5,100",
      "12,1,1,1,0.5,100",
    ].join("\n");
    expect(readProbe(text)).toEqual({
      stretchedErrorMax: 2.5,
      stretchedErrorP99: 1.5,
      stretchedErrorOver: 1,
    });
    expect(readProbe("[probe] no globe tileset")).toBeUndefined();
  });
});

/** A run's record, as the CLI writes it. */
const run = (
  scene: string,
  group: string,
  config: string,
  rep: number,
  metrics: Record<string, unknown>,
) => ({
  scene,
  sceneTitle: scene,
  group,
  scenario: group === "D" ? "cold-start" : "cold-orbit",
  config,
  engine: config === "2.0" ? "2.0" : "1.x",
  rep,
  validity: { verdict: "valid", reasons: [] },
  metrics: { status: "ok", ...metrics },
});

const catalogRuns = [0, 1, 2].flatMap((rep) => [
  run("terrain-rainier", "A", "1.147.0", rep, {
    cpuP50: 4 + rep * 0.1,
    settleMs: 9000 + rep * 100,
    frameP95: 17,
    bytes: 5e7,
  }),
  run("terrain-rainier", "A", "2.0", rep, {
    cpuP50: 1 + rep * 0.05,
    settleMs: 4000 + rep * 100,
    frameP95: 16.8,
    bytes: 4e7,
  }),
]);
const exampleRuns = [0, 1, 2].map((rep) =>
  run("vex-x10-zermatt", "D", "2.0", rep, {
    // Wildly different numbers: they must move nothing.
    cpuP50: 90,
    settleMs: rep === 2 ? undefined : 60_000,
    settled: rep !== 2,
    ...(rep === 2 ? { settleReason: "cap of 120 s: osm 3 in flight" } : {}),
    requestRateEnd: 1.5,
    dev: {
      "tiles.terrain": 400 + rep,
      "tiles.osm": 900,
      "requests.imagery": 120,
      "bytes.ionContent": 3e7,
      triangles: 2e6,
      draws: 300,
      "gpuPass.opaque": 3.2,
      pageErrors: 0,
    },
  }),
);
const results = (runs: unknown[]) => ({
  date: "2026-11-21T00:00:00.000Z",
  commit: "abc",
  baseline: "1.147.0",
  candidate: "2.0",
  runs,
  budgets: [
    {
      id: "cpu-3x",
      metric: "cpuP50",
      setup: "2.0",
      maxRatio: 0.333,
      label: "cpu",
    },
  ],
});

describe("group D and the headlines", () => {
  const withD = summarizeRun(results([...catalogRuns, ...exampleRuns])) as {
    groups: string[];
    scenes: Array<{
      scene: string;
      group?: string;
      metrics: Record<string, { median: number; values: number[] }>;
    }>;
  };
  const withoutD = summarizeRun(results(catalogRuns)) as typeof withD;

  it("summarizes the development metrics as cells' metrics", () => {
    const cell = withD.scenes.find((c) => c.scene === "vex-x10-zermatt")!;
    expect(cell.group).toBe("D");
    expect(cell.metrics["tiles.terrain"]?.values).toEqual([400, 401, 402]);
    expect(cell.metrics["bytes.ionContent"]?.median).toBe(3e7);
    expect(cell.metrics["gpuPass.opaque"]?.median).toBe(3.2);
    // Not settled is a repetition, kept, counted as 0.
    expect(cell.metrics.settled?.values).toEqual([1, 1, 0]);
    expect(cell.metrics.settleMs?.values).toEqual([60_000, 60_000]);
    expect(metricRow("tiles.osm")?.[1]).toBe("tiles drawn, osm");
    expect(metricRow("gpuPass.opaque")?.[2]).toBe("ms");
  });

  it("leaves the Overview's run as it would be without them", () => {
    expect(withD.groups).toEqual(["A", "D"]);
    expect(headlineSummary(withD)?.scenes).toEqual(withoutD.scenes);
    // A run of only example scenes isn't an Overview run at all.
    expect(
      headlineSummary(summarizeRun(results(exampleRuns)) as typeof withD),
    ).toBeUndefined();
    expect(headlineSummary(withoutD)).toBe(withoutD);
  });

  it("leaves scorecards and budgets as they would be without them", () => {
    expect(scorecard(results([...catalogRuns, ...exampleRuns]))).toEqual(
      scorecard(results(catalogRuns)),
    );
    expect(checkBudgets(results([...catalogRuns, ...exampleRuns]))).toEqual(
      checkBudgets(results(catalogRuns)),
    );
  });
});

describe("Measure this", () => {
  const scenes = catalog.exampleScenes as ExampleScene[];
  const declared =
    EXAMPLES.find((e) => e.id === "vertical-exaggeration")?.params ?? [];

  it("names the closest scene, with the page's parameters as param. settings", () => {
    const close = measureCommand("vertical-exaggeration", scenes, declared, {
      x: "10",
      view: "zermatt-close",
    });
    expect(close?.scene.id).toBe("vex-x10-zermatt");
    expect(close?.command).toBe(
      "npx @cesium/dyno suite run --scenes vex-x10-zermatt",
    );
    const seven = measureCommand("vertical-exaggeration", scenes, declared, {
      x: "7",
      view: "valley",
    });
    expect(seven?.scene.id).toBe("vex-valley");
    expect(seven?.command).toBe(
      "npx @cesium/dyno suite run --scenes vex-valley --engines 2.0+param.x=7",
    );
    expect(seven?.others.map((s) => s.id)).toContain("vex-zermatt");
  });

  it("passes on only values the parameters take, and nothing for other examples", () => {
    expect(
      measureCommand("vertical-exaggeration", scenes, declared, {
        x: "40",
        view: "valley",
      })?.overrides,
    ).toEqual([]);
    expect(measureCommand("csg", scenes, [], {})).toBeUndefined();
  });
});
