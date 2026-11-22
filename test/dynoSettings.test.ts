// The settings registry and multi-axis sweeps (CS-393,
// bench/suite/settings.mjs): every setting a run can vary is declared,
// checked before a run starts, and, for `view.` settings, applied to the
// view and read back from it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { engineLabel, parseEngine, setupOf } from "../bench/suite/engines.mjs";
import {
  applyViewSettings,
  checkSetting,
  checkVariants,
  findSetting,
  planSweep,
  readSweep,
  readViewSettings,
  SETTINGS,
  SettingError,
  unappliedViewSettings,
} from "../bench/suite/settings.mjs";
import { summarizeRun } from "../bench/suite/report.mjs";
import { OffscreenTarget } from "../packages/next/src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const dynoBin = fileURLToPath(new URL("../bench/dyno.mjs", import.meta.url));

/** Runs `dyno <argv> --json` in a child process: its exit code and JSON. */
function dyno(argv: string[], env: Record<string, string> = {}) {
  const out = spawnSync(process.execPath, [dynoBin, ...argv, "--json"], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 60000,
  });
  return {
    status: out.status,
    json: JSON.parse(out.stdout) as {
      ok: boolean;
      error?: string;
      message?: string;
    },
    stderr: out.stderr,
  };
}

describe("the registry", () => {
  it("declares every setting of the item, each with a label and a range", () => {
    const ids = SETTINGS.map((s) => s.id);
    for (const id of [
      "view.lodExponent",
      "view.shadows",
      "view.debug",
      "view.occlusionCull",
      "view.coarsen",
      "view.lod",
      "engine.maximumScreenSpaceError",
      "engine.policy",
      "engine.render.pixelRatio",
    ]) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SETTINGS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.engines.length).toBeGreaterThan(0);
      if (s.type === "enum") {
        expect(s.values!.length).toBeGreaterThan(1);
      }
      if (s.type === "number" || s.type === "integer") {
        expect(s.min).toBeLessThan(s.max!);
      }
    }
  });

  it("refuses an unknown setting with the list of settings", () => {
    expect(() => checkSetting("lodExponent", "0")).toThrow(SettingError);
    let message = "";
    try {
      checkSetting("lodExponent", "0", { engine: "2.0", kind: "bench" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/unknown setting "lodExponent"/);
    expect(message).toMatch(/did you mean view\.lodExponent\?/);
    for (const s of SETTINGS) {
      expect(message).toContain(s.id);
    }
  });

  it("types values and refuses those out of range", () => {
    expect(checkSetting("view.lodExponent", "0.5").value).toBe(0.5);
    expect(checkSetting("view.shadows", "false").value).toBe(false);
    expect(checkSetting("view.debug", "level").value).toBe("level");
    expect(checkSetting("render.pixelRatio", "device").value).toBe("device");
    expect(() => checkSetting("view.lodExponent", "2")).toThrow(/0 to 1/);
    expect(() => checkSetting("view.lodExponent", "")).toThrow(SettingError);
    expect(() => checkSetting("view.shadows", "yes")).toThrow(/true or false/);
    expect(() => checkSetting("view.lod", "fade")).toThrow(/morph or pop/);
    expect(() => checkSetting("engine.skipLevels", "1.5")).toThrow(
      /an integer/,
    );
  });

  it("refuses a setting the engine doesn't take", () => {
    expect(() =>
      checkVariants(parseEngine("1.146.0+view.lodExponent=0"), "bench"),
    ).toThrow(/view\.lodExponent doesn't apply to 1\.x/);
    expect(() =>
      checkVariants(parseEngine("2.0+view.lodExponent=0"), "lab"),
    ).toThrow(/a lab run doesn't take view\.lodExponent/);
  });

  it("reads old engine ids as before: engine. is the default namespace", () => {
    expect(findSetting("sse")?.id).toBe("engine.maximumScreenSpaceError");
    expect(findSetting("maximumScreenSpaceError")?.id).toBe(
      "engine.maximumScreenSpaceError",
    );
    expect(findSetting("render.pixelRatio")?.id).toBe(
      "engine.render.pixelRatio",
    );
    expect(findSetting("view.nothing")).toBeUndefined();
    expect(
      checkVariants(parseEngine("2.0+sse=32"), "bench").map((v) => [
        v.setting.id,
        v.value,
      ]),
    ).toEqual([["engine.maximumScreenSpaceError", 32]]);
    expect(engineLabel("2.0@main+sse=32")).toBe("2.0 · main · SSE 32");
    expect(engineLabel("2.0+render.pixelRatio=2")).toBe("2.0 · pixel ratio 2");
    expect(setupOf("2.0+stepwise+view.lodExponent=0.5")).toBe("2.0+stepwise");
  });

  it("labels view settings in words", () => {
    expect(
      engineLabel("2.0@main+view.lodExponent=0.5+view.shadows=false"),
    ).toBe("2.0 · main · error exponent 0.5 · shadows off");
  });
});

describe("sweeps", () => {
  it("covers the grid of every axis, each point with its coordinates", () => {
    const plan = planSweep({
      sweeps: ["view.lodExponent=0,1", "maximumScreenSpaceError=8,16"],
      engine: "2.0",
      kind: "bench",
    })!;
    expect(plan.axes).toEqual([
      { id: "view.lodExponent", values: [0, 1] },
      { id: "engine.maximumScreenSpaceError", values: [8, 16] },
    ]);
    expect(plan.points.map((p) => p.coords)).toEqual([
      { "view.lodExponent": 0, "engine.maximumScreenSpaceError": 8 },
      { "view.lodExponent": 0, "engine.maximumScreenSpaceError": 16 },
      { "view.lodExponent": 1, "engine.maximumScreenSpaceError": 8 },
      { "view.lodExponent": 1, "engine.maximumScreenSpaceError": 16 },
    ]);
    expect(plan.reference).toBeUndefined();
  });

  it("refuses an unknown axis, a bad value and a repeated axis", () => {
    expect(() => planSweep({ sweeps: ["lodExponent=0,1"] })).toThrow(
      /unknown setting "lodExponent"/,
    );
    expect(() => planSweep({ sweeps: ["view.lodExponent=0,3"] })).toThrow(
      /0 to 1/,
    );
    expect(() => planSweep({ sweeps: ["view.lodExponent=0"] })).toThrow(
      /at least two values/,
    );
    expect(() => planSweep({ sweeps: ["view.lodExponent"] })).toThrow(
      /--sweep <setting>=<value>,<value>/,
    );
    expect(() =>
      planSweep({ sweeps: ["sse=8,16", "maximumScreenSpaceError=4,8"] }),
    ).toThrow(/engine\.maximumScreenSpaceError is swept twice/);
    expect(planSweep({})).toBeUndefined();
    expect(() => planSweep({ reference: "view.lodExponent=1" })).toThrow(
      /belong to a sweep/,
    );
  });

  it("marks a reference on a swept axis, and repeats it", () => {
    const plan = planSweep({
      sweeps: ["view.lodExponent=0,0.5,1", "view.lod=morph,pop"],
      reference: "view.lodExponent=1",
      referenceReps: "3",
    })!;
    expect(plan.reference).toEqual({
      id: "view.lodExponent",
      value: 1,
      reps: 3,
    });
    expect(plan.points.filter((p) => p.reference).map((p) => p.coords)).toEqual(
      [
        { "view.lodExponent": 1, "view.lod": "morph" },
        { "view.lodExponent": 1, "view.lod": "pop" },
      ],
    );
    expect(() =>
      planSweep({
        sweeps: ["view.lodExponent=0,0.5"],
        reference: "view.lodExponent=1",
      }),
    ).toThrow(/not one of the swept values/);
    expect(() =>
      planSweep({ sweeps: ["view.lodExponent=0,1"], referenceReps: 2 }),
    ).toThrow(/needs --reference/);
    expect(() =>
      planSweep({
        sweeps: ["view.lodExponent=0,1"],
        reference: "view.lodExponent=1",
        referenceReps: 0,
      }),
    ).toThrow(/an integer from 1 to 20/);
  });

  it("adds a reference outside the grid once per point", () => {
    const plan = planSweep({
      sweeps: ["view.lodExponent=0,1"],
      reference: "view.shadows=false",
    })!;
    expect(plan.reference).toEqual({
      id: "view.shadows",
      value: false,
      reps: 1,
      outside: true,
    });
    expect(plan.points).toEqual([
      { coords: { "view.lodExponent": 0 } },
      { coords: { "view.lodExponent": 1 } },
      {
        coords: { "view.lodExponent": 0, "view.shadows": false },
        reference: true,
      },
      {
        coords: { "view.lodExponent": 1, "view.shadows": false },
        reference: true,
      },
    ]);
  });

  it("takes a sweep file with an explicit list of points", () => {
    const plan = planSweep({
      file: {
        axes: [
          { id: "view.lodExponent", values: [0, 0.5, 1] },
          { id: "sse", values: [8, 16] },
        ],
        points: [
          { "view.lodExponent": 0, sse: 8 },
          { "view.lodExponent": 1, sse: 16 },
        ],
      },
    })!;
    expect(plan.axes.map((a) => a.id)).toEqual([
      "view.lodExponent",
      "engine.maximumScreenSpaceError",
    ]);
    expect(plan.points.map((p) => p.coords)).toEqual([
      { "view.lodExponent": 0, "engine.maximumScreenSpaceError": 8 },
      { "view.lodExponent": 1, "engine.maximumScreenSpaceError": 16 },
    ]);
    expect(() =>
      planSweep({
        file: {
          axes: [{ id: "view.lodExponent", values: [0, 1] }],
          points: [{ "view.lodExponent": 0.5 }],
        },
      }),
    ).toThrow(/not one of the axis's values/);
    expect(() =>
      planSweep({
        file: {
          axes: [{ id: "view.lodExponent", values: [0, 1] }],
          points: [{ "view.shadows": true }],
        },
      }),
    ).toThrow(/isn't an axis/);
    expect(() =>
      planSweep({
        sweeps: ["view.lodExponent=0,1"],
        file: { axes: [{ id: "view.lodExponent", values: [0, 1] }] },
      }),
    ).toThrow(/one or the other/);
    expect(() => planSweep({ file: { points: [] } })).toThrow(/expected/);
  });
});

describe("the sweep record", () => {
  // The form runs wrote before CS-393: one parameter, a value per point.
  const OLD = {
    param: "maximumScreenSpaceError",
    values: [8, 16, 32],
    engines: ["2.0@main"],
    points: [8, 16, 32].map((value) => ({
      value,
      configs: [`2.0@main+maximumScreenSpaceError=${value}`],
    })),
  };

  it("reads an old one-axis record as one axis", () => {
    expect(readSweep(OLD)).toEqual({
      axes: [{ id: "maximumScreenSpaceError", values: [8, 16, 32] }],
      engines: ["2.0@main"],
      points: [8, 16, 32].map((value) => ({
        coords: { maximumScreenSpaceError: value },
        configs: [`2.0@main+maximumScreenSpaceError=${value}`],
      })),
    });
    expect(readSweep(undefined)).toBeUndefined();
    expect(readSweep({ something: 1 })).toBeUndefined();
  });

  it("keeps a new record as it is", () => {
    const record = {
      axes: [{ id: "view.lodExponent", values: [0, 1] }],
      reference: { id: "view.lodExponent", value: 1, reps: 1 },
      engines: ["2.0@main"],
      points: [
        {
          coords: { "view.lodExponent": 0 },
          configs: ["2.0@main+view.lodExponent=0"],
        },
        {
          coords: { "view.lodExponent": 1 },
          reference: true,
          configs: ["2.0@main+view.lodExponent=1"],
        },
      ],
    };
    expect(readSweep(record)).toEqual(record);
  });

  it("summarizes an old sweep run in the new form", () => {
    const summary = summarizeRun({
      date: "2026-11-01T00:00:00.000Z",
      commit: "abc",
      baseline: "1.147.0",
      candidate: "2.0@main+maximumScreenSpaceError=8",
      environment: {},
      runs: [],
      sweep: OLD,
    }) as { sweep?: unknown };
    expect(summary.sweep).toEqual(readSweep(OLD));
  });
});

describe("sweep runs plot", () => {
  const analysis = () => import("../bench/suite/views/sweepAxis.ts");
  const summary = (sweep: unknown, configs: string[]) =>
    ({
      sweep,
      configs,
      baseline: "1.147.0",
      scenes: [],
    }) as unknown as Parameters<
      Awaited<ReturnType<typeof analysis>>["axisOf"]
    >[0];

  it("plots an old one-axis sweep: one line per engine, a point per value", async () => {
    const { axisOf } = await analysis();
    const old = {
      param: "maximumScreenSpaceError",
      values: [8, 16, 32],
      engines: ["2.0@main", "2.0@main+stepwise"],
      points: [8, 16, 32].map((value) => ({
        value,
        configs: [
          `2.0@main+maximumScreenSpaceError=${value}`,
          `2.0@main+stepwise+maximumScreenSpaceError=${value}`,
        ],
      })),
    };
    const axis = axisOf(summary(old, []))!;
    expect(axis.param).toBe("maximumScreenSpaceError");
    expect(axis.xNames).toEqual(["8", "16", "32"]);
    expect(axis.lines).toEqual([
      {
        label: "2.0 · main",
        configs: [8, 16, 32].map(
          (v) => `2.0@main+maximumScreenSpaceError=${v}`,
        ),
      },
      {
        label: "2.0 · main · stepwise selection",
        configs: [8, 16, 32].map(
          (v) => `2.0@main+stepwise+maximumScreenSpaceError=${v}`,
        ),
      },
    ]);
    expect(axis.baseline).toBe("1.147.0");
  });

  it("plots a two-axis sweep along its first axis, a line per value of the second", async () => {
    const { axisOf } = await analysis();
    const id = (a: number, b: number) =>
      `2.0@main+view.lodExponent=${a}+maximumScreenSpaceError=${b}`;
    const record = {
      axes: [
        { id: "view.lodExponent", values: [0, 1] },
        { id: "engine.maximumScreenSpaceError", values: [8, 16] },
      ],
      engines: ["2.0@main"],
      points: [0, 1].flatMap((a) =>
        [8, 16].map((b) => ({
          coords: {
            "view.lodExponent": a,
            "engine.maximumScreenSpaceError": b,
          },
          configs: [id(a, b)],
        })),
      ),
    };
    const axis = axisOf(summary(record, []))!;
    expect(axis.param).toBe("view.lodExponent");
    expect(axis.xNames).toEqual(["0", "1"]);
    expect(axis.lines).toEqual([
      { label: "2.0 · main · SSE 8", configs: [id(0, 8), id(1, 8)] },
      { label: "2.0 · main · SSE 16", configs: [id(0, 16), id(1, 16)] },
    ]);
  });

  it("still plots a release sweep", async () => {
    const { axisOf } = await analysis();
    const axis = axisOf(
      summary(undefined, ["1.146.0", "1.147.0", "2.0@main"]),
    )!;
    expect(axis.param).toBe("CesiumJS release");
    expect(axis.lines).toEqual([
      { label: "CesiumJS", configs: ["1.146.0", "1.147.0"] },
    ]);
  });
});

describe("view settings reach the view", () => {
  let engine: Awaited<ReturnType<typeof fakeEngine>>;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterAll(() => engine?.destroy());

  const addView = () =>
    engine.addView({
      target: new OffscreenTarget(64, 64),
      world: engine.createWorld(),
    });

  it("applies every view setting and reads it back from the view", () => {
    const view = addView();
    const before = readViewSettings({ engine, view });
    const asked = {
      lodExponent: 0.75,
      shadows: true,
      debug: "level",
      occlusionCull: "off",
      coarsen: false,
      lod: "pop",
    } as const;
    for (const [key, value] of Object.entries(asked)) {
      expect(before[key]).not.toBe(value);
    }
    applyViewSettings({ engine, view }, asked);
    // The view's own properties, as the engine reads them.
    expect(view.lodExponent).toBe(0.75);
    expect(view.shadows).toBe(true);
    expect(view.debug).toBe("level");
    expect(view.occlusionCulling).toBe("off");
    expect(view.occlusionState.coarsen).toBe(false);
    expect(view.lodTransitions).toBe("pop");
    expect(readViewSettings({ engine, view })).toEqual(asked);
    expect(
      unappliedViewSettings(asked, readViewSettings({ engine, view })),
    ).toEqual([]);
  });

  it("names a setting the page doesn't hold", () => {
    const view = addView();
    expect(
      unappliedViewSettings(
        { lodExponent: 0.5 },
        readViewSettings({ engine, view }),
      ),
    ).toEqual(["view.lodExponent: asked 0.5, the view has 0.3"]);
    // A page from before the registry reports nothing.
    expect(unappliedViewSettings({ shadows: false }, undefined)).toEqual([
      "view.shadows: asked false, the view has nothing",
    ]);
  });

  it("is applied by the catalog adapter before content and reported after settling", async () => {
    // The adapter itself needs a browser: its source must apply the
    // configuration's view settings and report them in the metrics.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("../bench/suite/suite.ts", import.meta.url),
      "utf8",
    );
    const setup = source.slice(source.indexOf("class NextAdapter"));
    const applied = setup.indexOf(
      "applyViewSettings({ engine, view: this.view }, config.view)",
    );
    expect(applied).toBeGreaterThan(0);
    expect(applied).toBeLessThan(setup.indexOf("engine.addTileset("));
    expect(source).toMatch(/metrics\.view = view;/);
  });
});

describe("the CLI checks a sweep before it runs", () => {
  let results: string;
  beforeAll(() => {
    results = mkdtempSync(join(tmpdir(), "dyno-settings-"));
  });
  afterAll(() => rmSync(results, { recursive: true, force: true }));
  const env = () => ({ BENCH_RESULTS: results, DYNO_STATE: results });

  it("refuses --sweep lodExponent=0,1 with the list of settings", () => {
    const out = dyno(
      [
        "suite",
        "run",
        "--scenes",
        "terrain-rainier",
        "--sweep",
        "lodExponent=0,1",
      ],
      env(),
    );
    expect(out.status).toBe(2);
    expect(out.json.ok).toBe(false);
    expect(out.json.message!).toMatch(/unknown setting "lodExponent"/);
    expect(out.json.message!).toMatch(/view\.lodExponent \(0 to 1\)/);
  });

  it("refuses a setting an engine doesn't take, in --engines too", () => {
    const out = dyno(
      [
        "suite",
        "run",
        "--scenes",
        "terrain-rainier",
        "--engines",
        "2.0+lodExponent=0.5",
      ],
      env(),
    );
    expect(out.status).toBe(2);
    expect(out.json.message!).toMatch(
      /engine "2\.0\+lodExponent=0\.5": unknown setting/,
    );
  });

  it("asks for --yes above 60 browser runs, saying the count", () => {
    const out = dyno(
      [
        "suite",
        "run",
        "--engines",
        "2.0",
        "--sweep",
        "view.lodExponent=0,0.5,1",
        "--sweep",
        "view.lod=morph,pop",
        "--reps",
        "3",
      ],
      env(),
    );
    expect(out.status).toBe(4);
    expect(out.stderr).toMatch(
      /sweep: view\.lodExponent \(3\) × view\.lod \(2\): 6 points × \d+ scenes × 2 scenarios × 3 repetitions: \d+ browser runs/,
    );
    expect(out.json.message!).toMatch(/pass --yes to run it/);
  });

  it("reads a sweep file and refuses a bad one", () => {
    const file = join(results, "grid.json");
    writeFileSync(
      file,
      JSON.stringify({ axes: [{ id: "view.nothing", values: [0, 1] }] }),
    );
    const out = dyno(
      ["suite", "run", "--scenes", "terrain-rainier", "--sweep-file", file],
      env(),
    );
    expect(out.status).toBe(2);
    expect(out.json.message!).toMatch(
      /--sweep-file: unknown setting "view\.nothing"/,
    );
    const missing = dyno(
      ["suite", "run", "--sweep-file", join(results, "none.json")],
      env(),
    );
    expect(missing.json.message!).toMatch(/no such file/);
  });
});
