// Dyno's cold start (CS-706): the cold-start run's analysis and budget.
import { describe, expect, it } from "vitest";
import {
  COLD_START_BUDGET_MS,
  COLD_START_GOAL_MS,
  analyzeColdStart,
  cpuByCategory,
  cpuCategory,
  median,
  overBudget,
} from "../bench/suite/coldStart.mjs";

describe("analyzeColdStart", () => {
  const base = "http://127.0.0.1:4101";
  const r = (path: string, startTime: number, responseEnd: number) => ({
    name: `${base}${path}`,
    startTime,
    responseEnd,
  });

  it("splits the start into phases and counts data asked for twice", () => {
    const out = analyzeColdStart({
      marks: {
        adapter: 600,
        device: 700,
        host: 720,
        canvas: 1100,
        firstFrame: 1150,
      },
      devices: 2,
      resources: [
        r("/bench/suite/app.tsx", 50, 80),
        r("/src/index.ts", 100, 590),
        r("/node_modules/.vite/deps/react.js", 90, 300),
        // A module asked for after engine start is not module loading.
        r("/src/io/moonMapWorker.ts?worker_file&type=module", 900, 950),
        r("/specs-data/Models/glTF-2.0/Truck/truck.gltf", 750, 900),
        r("/frames-data/manifest.json", 700, 720),
        r("/frames-data/manifest.json", 700, 730),
        r("/frames-data/EOP-All.csv", 720, 1000),
        r("/frames-data/EOP-All.csv", 730, 1010),
        // The board's read is CS-704's and not the page's start.
        r("/work-api/board", 60, 13000),
        // Each worker asks for its WebAssembly: expected, not a repeat.
        r("/draco_decoder.wasm", 900, 950),
        r("/draco_decoder.wasm", 900, 960),
      ],
    });
    expect(out.metrics).toMatchObject({
      firstFrameMs: 1150,
      modulesMs: 590,
      adapterMs: 600,
      deviceMs: 700,
      engineMs: 720,
      contentMs: 900,
      frameDataMs: 1010,
      moduleRequests: 3,
      requests: 11,
      duplicateFetches: 2,
      devices: 2,
    });
    expect(out.phases.map((p) => [p.name, p.ms])).toEqual([
      ["modules", 590],
      ["device", 110],
      ["engine setup", 20],
      ["content", 180],
      ["first frame", 250],
    ]);
    // The reference data loads beside the phases, not as one of them.
    expect(out.frameData).toEqual({ from: 700, to: 1010 });
    expect(out.duplicates.map((d) => d.path)).toEqual([
      "/frames-data/manifest.json",
      "/frames-data/EOP-All.csv",
    ]);
  });

  it("leaves out a phase the page never reached", () => {
    const out = analyzeColdStart({
      marks: { adapter: 300 },
      devices: 0,
      resources: [r("/src/index.ts", 10, 290)],
    });
    expect(out.metrics.firstFrameMs).toBeUndefined();
    expect(out.phases.map((p) => p.name)).toEqual(["modules"]);
    expect(out.frameData).toBeUndefined();
  });
});

describe("the main thread by category", () => {
  const frame = (functionName: string, url = "") => ({ functionName, url });
  const base = "http://127.0.0.1:4101";

  it("names what a sample's stack was busy with", () => {
    expect(cpuCategory([frame("(idle)")])).toBe("idle");
    expect(cpuCategory([frame("(program)")])).toBe("compile");
    expect(
      cpuCategory([
        frame("murmur2", `${base}/node_modules/.vite/deps/useMediaQuery-x.js`),
        frame("Rail", `${base}/bench/suite/shell.tsx`),
      ]),
    ).toBe("dyno");
    expect(
      cpuCategory([
        frame("jsx", `${base}/node_modules/.vite/deps/react_jsx-runtime.js`),
        frame("render", `${base}/node_modules/.vite/deps/react-dom_client.js`),
      ]),
    ).toBe("ui");
    expect(
      cpuCategory([
        frame("parse", `${base}/src/time/eop.ts`),
        frame("load", `${base}/src/frames/providers/earthOrientation.ts`),
      ]),
    ).toBe("reference data");
    expect(cpuCategory([frame("tick", `${base}/src/scene/Engine.ts`)])).toBe(
      "engine",
    );
  });

  it("adds up a profile's samples from the start to the first frame", () => {
    // Nodes: root → idle, root → program; samples 1 ms apart (µs).
    const profile = {
      nodes: [
        { id: 1, callFrame: frame("(root)"), children: [2, 3] },
        { id: 2, callFrame: frame("(idle)") },
        { id: 3, callFrame: frame("(program)") },
      ],
      startTime: 1_000_000,
      samples: [2, 3, 3, 2, 3],
      timeDeltas: [0, 1000, 1000, 1000, 1000],
    };
    // From 1 ms after the profile began, to 2.5 ms after that.
    const out = cpuByCategory(profile, 1_001_000, 2.5);
    expect(out.compile).toBe(2);
    expect(out.idle).toBe(1);
  });
});

describe("the cold-start budget", () => {
  const run = (config: string, scenario: string, firstFrameMs?: number) => ({
    config,
    scenario,
    metrics: { status: "ok", firstFrameMs },
  });

  it("aims at the owner's half a second and holds where CS-706 left it", () => {
    expect(COLD_START_GOAL_MS).toBe(500);
    expect(COLD_START_BUDGET_MS).toBe(1400);
  });

  it("holds each configuration's median without the board to it", () => {
    const results = {
      runs: [
        run("dyno@a", "cold-browser-no-board", 420),
        run("dyno@a", "cold-browser-no-board", 480),
        run("dyno@a", "cold-browser-no-board", 900),
        // With the board it isn't held (CS-704's read).
        run("dyno@a", "cold-browser", 4000),
        run("dyno@b", "cold-browser-no-board", 1600),
        run("dyno@b", "cold-browser-no-board", 1700),
        run("dyno@c", "cold-browser-no-board", undefined),
      ],
    };
    expect(overBudget(results, 500)).toEqual([
      { config: "dyno@b", firstFrameMs: 1600 },
      { config: "dyno@c", firstFrameMs: undefined },
    ]);
  });

  it("takes the lower middle of an even count", () => {
    expect(median([4, 1, 3, 2])).toBe(2);
    expect(median([])).toBeUndefined();
  });
});
