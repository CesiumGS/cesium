// The frames explorer's worker protocol (examples/frames-explorer/protocol.ts,
// the client and messages, and host.ts, the worker's side): the host and the
// client joined by a Node MessageChannel, with a stub catalog
// and synthetic frames. Messages cross a real structured clone, and transfers
// really detach. The real catalog runs through the host against the frames
// data store in test/data/framesExplorerProtocol.test.ts; a browser run is
// Task 6's.
import { readFileSync } from "node:fs";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MissingDataError,
  browserContext,
  createHost,
  type HostOptions,
  type HostPort,
  type MakeContext,
  yielding,
} from "../examples/frames-explorer/host.ts";
import {
  createClient,
  type ClientWorker,
  type OverlayGeometry,
  type ProgressReply,
  type Reply,
  type Request,
  type StateReply,
} from "../examples/frames-explorer/protocol.ts";
import {
  registerScenario,
  unregisterScenarioForTests,
  type ScenarioEvaluation,
  type ScenarioEvaluator,
} from "../examples/frames-explorer/scenarios/evaluate.ts";
import { evaluateEarthTurns } from "../examples/frames-explorer/scenarios/earthTurns.ts";
import { evaluateStandOnMoon } from "../examples/frames-explorer/scenarios/standOnMoon.ts";
import {
  FRAME_CACHE_LIMIT,
  FrameCache,
} from "../examples/frames-explorer/frameCache.ts";
import type { ScenarioId } from "../examples/frames-explorer/scenarios/spec.ts";
import type { AddedFrameSpec } from "../examples/frames-explorer/tree.ts";
import {
  boundCrsChecks,
  type DataContext,
  expectThrow,
  runStress,
  type Fingerprint,
  type StressCase,
  type StressContext,
  type StressResult,
} from "../examples/frames-explorer/tests.ts";
import {
  addOverlayChunks,
  designGrid,
  overlayMesh,
  type DesignFrameLike,
} from "../examples/frames-explorer/overlays.ts";
import type { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import type { ProjApi } from "../src/engineering/proj.ts";
import type { World } from "../src/scene/World.ts";
import { createFrames } from "../src/frames/frames.ts";
import type { AccuracyStatement } from "../src/measure/accuracy.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const frames = createFrames(syntheticFrameData());

// The page hands createClient a real Worker (checked by tsc).
export const workerIsAClientWorker = (worker: Worker): ClientWorker => worker;

const context = (extra: Partial<StressContext> = {}): StressContext => ({
  frames,
  loadProj: () => Promise.reject(new MissingDataError("PROJ is not here")),
  loadOrion: () => Promise.reject(new MissingDataError("Orion is not here")),
  ...extra,
});

const base = (id: string) => ({
  id,
  group: "projections",
  title: `Stub ${id}`,
});

/** A case with no needs that returns `run()`'s results. */
const stub = (
  id: string,
  run: (ctx?: StressContext) => Promise<StressResult[]>,
  extra: Partial<StressCase> = {},
): StressCase => ({ ...base(id), needs: [], run, ...extra });

/** An accuracy whose total is not bounded: one term is unknown (R8). */
const notBounded: AccuracyStatement = {
  meters: undefined,
  terms: [
    { source: "trajectory", meters: undefined, note: "no covariance" },
    { source: "projection", meters: 1e-9, note: "round trip" },
  ],
  warnings: ["ballpark"],
};

const fingerprint: Fingerprint = {
  pipeline: "+proj=pipeline +step +proj=noop",
  grids: [{ name: "g.tif", sha256: "ab".repeat(32) }],
  coordinates: [1, 2, 3],
};

/**
 * The stub catalog: a pass with an undefined accuracy total and a
 * fingerprint, a NaN value, an expected throw, a display-only effect, a case
 * that throws and a case whose data is missing.
 */
const CATALOG: readonly StressCase[] = [
  stub("stub.pass", async () => [
    {
      ...base("stub.pass"),
      pass: true,
      value: 1e-5,
      tolerance: 1e-4,
      unit: "m",
      accuracy: notBounded,
      instant: 1234.5,
      fingerprint,
    },
  ]),
  stub("stub.nan", async () => [
    { ...base("stub.nan"), pass: true, value: NaN, tolerance: 1, unit: "m" },
  ]),
  stub("stub.leap", async () => [
    await expectThrow(base("stub.leap"), /leap second/, () => {
      throw new RangeError("2016-12-31T23:59:60 is a leap second");
    }),
  ]),
  stub("stub.display", async () => [
    {
      ...base("stub.display"),
      pass: false,
      displayOnly: true,
      effect: { value: 31.2, unit: "m", label: "sag at 20 km" },
    },
  ]),
  stub("stub.throws", () => Promise.reject(new TypeError("boom: it broke"))),
  stub("stub.proj", async () => [{ ...base("stub.proj"), pass: true }], {
    needs: ["proj"],
  }),
  stub("stub.frames", async () => [{ ...base("stub.frames"), pass: true }], {
    needs: ["frames"],
  }),
];

const FINGERPRINTS = { "stub.pass": fingerprint };

const open: MessagePort[] = [];
afterEach(() => {
  for (const port of open.splice(0)) {
    port.close();
  }
  vi.unstubAllGlobals();
  // Back to the real evaluator, which registers as host.ts imports it (P4).
  stubScenario("earth-turns", evaluateEarthTurns);
});

/** Registers `evaluator` for `id` in place of any evaluator it has. */
function stubScenario(id: ScenarioId, evaluator: ScenarioEvaluator): void {
  unregisterScenarioForTests(id);
  registerScenario(id, evaluator);
}

interface Sent {
  message: Reply;
  transfer: readonly Transferable[] | undefined;
}

/**
 * A host and a client over a MessageChannel. `sent` records what the host
 * posted with its transfer list; `log` the client side's posts and
 * terminations in order.
 */
function connect(
  makeContext: MakeContext,
  options: HostOptions = {},
  signal = new AbortController().signal,
) {
  const { port1, port2 } = new MessageChannel();
  open.push(port1, port2);
  const sent: Sent[] = [];
  const hostPort: HostPort = {
    postMessage(message, transfer) {
      port1.postMessage(message, transfer as never);
      sent.push({ message, transfer });
    },
    get onmessage() {
      return null;
    },
    set onmessage(handler) {
      port1.onmessage = handler as never;
    },
  };
  createHost(hostPort, makeContext, options);
  const log: string[] = [];
  const terminate = vi.fn(() => {
    log.push("terminate");
  });
  const worker: ClientWorker = {
    postMessage(message: Request) {
      log.push(message.type);
      port2.postMessage(message);
    },
    get onmessage() {
      return null;
    },
    set onmessage(handler) {
      port2.onmessage = handler as never;
    },
    onerror: null,
    onmessageerror: null,
    terminate,
  };
  const client = createClient(worker, signal);
  return { client, sent, log, terminate };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("run", () => {
  it("streams one result per case, then done, equal to a direct run (Review Focus 7)", async () => {
    const direct = await runStress(context(), {
      cases: CATALOG,
      fingerprints: FINGERPRINTS,
    });
    const { client, sent } = connect(async () => context(), {
      cases: CATALOG,
      fingerprints: FINGERPRINTS,
    });
    const streamed: StressResult[] = [];
    const summary = await client.run(undefined, (r) => streamed.push(r));

    expect(streamed).toStrictEqual(direct);
    expect(streamed).toHaveLength(CATALOG.length);
    // Every result reply comes before the run's done.
    const types = sent.map((s) => s.message.type);
    expect(types.filter((t) => t === "result")).toHaveLength(CATALOG.length);
    expect(types.lastIndexOf("result")).toBeLessThan(types.indexOf("done"));

    const byId = new Map(streamed.map((r) => [r.id, r]));
    // Not bounded stays undefined, a key and all, not null or a number.
    const pass = byId.get("stub.pass")!;
    expect(pass.pass).toBe(true);
    expect("meters" in pass.accuracy!).toBe(true);
    expect(pass.accuracy!.meters).toBeUndefined();
    expect(pass.accuracy!.terms[0]!.meters).toBeUndefined();
    expect(pass.fingerprintCheck).toEqual({ match: true });
    // NaN stays NaN and fails its tolerance.
    const nan = byId.get("stub.nan")!;
    expect(Number.isNaN(nan.value)).toBe(true);
    expect(nan.pass).toBe(false);
    // The expected throw was matched in the worker, before serializing (R7).
    const leap = byId.get("stub.leap")!;
    expect(leap.pass).toBe(true);
    expect(leap.expectedError).toBe("leap second");
    expect(leap.error).toMatch(/leap second/);
    const display = byId.get("stub.display")!;
    expect(display).toMatchObject({ displayOnly: true, pass: true });
    expect(byId.get("stub.proj")!.missing).toEqual(["proj"]);
    expect(byId.get("stub.frames")!.pass).toBe(true);

    expect(summary).toMatchObject({
      passed: 3,
      failed: 2,
      skipped: 1,
      shown: 1,
      cancelled: false,
    });
    expect(summary.ms).toBeGreaterThanOrEqual(0);
  });

  it("runs only the cases asked for", async () => {
    const { client } = connect(async () => context(), { cases: CATALOG });
    const ids: string[] = [];
    await client.run(["stub.nan", "stub.leap"], (r) => ids.push(r.id));
    expect(ids).toEqual(["stub.nan", "stub.leap"]);
  });

  it("gives a case that throws as a failed result carrying its message", async () => {
    const { client } = connect(async () => context(), { cases: CATALOG });
    const results: StressResult[] = [];
    const summary = await client.run(["stub.throws"], (r) => results.push(r));
    expect(results).toMatchObject([
      { ...base("stub.throws"), pass: false, error: "boom: it broke" },
    ]);
    expect(summary).toMatchObject({ passed: 0, failed: 1, skipped: 0 });
  });

  it("stops before the next case on cancel, and done gives the partial counts", async () => {
    const later = vi.fn(async () => [{ ...base("later"), pass: true }]);
    let cancel = () => {};
    const cases = [
      stub("first", async () => {
        cancel();
        // The cancel arrives while this case is still working.
        await sleep(30);
        return [{ ...base("first"), pass: true }];
      }),
      stub("second", later),
      stub("third", later),
    ];
    const { client } = connect(async () => context(), { cases });
    cancel = () => client.cancel();
    const ids: string[] = [];
    const summary = await client.run(undefined, (r) => ids.push(r.id));
    expect(ids).toEqual(["first"]);
    expect(later).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      passed: 1,
      failed: 0,
      skipped: 0,
      cancelled: true,
    });
  });

  it("yields between cases, so a cancel sent during a busy case lands before the next", async () => {
    const later = vi.fn(async () => [{ ...base("later"), pass: true }]);
    let cancel = () => {};
    const cases = [
      stub("busy", async () => {
        cancel();
        // Synchronous work: nothing can be received until the case ends.
        const end = performance.now() + 20;
        while (performance.now() < end) {
          // busy
        }
        return [{ ...base("busy"), pass: true }];
      }),
      stub("next", later),
    ];
    const { client } = connect(async () => context(), { cases });
    cancel = () => client.cancel();
    const summary = await client.run();
    expect(later).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ passed: 1, cancelled: true });
  });

  it("keeps a case's optional needs through the host: the frames reach a case that reads them where it can (F44)", async () => {
    const reads = stub(
      "stub.optional",
      async (ctx?: StressContext) => [
        {
          ...base("stub.optional"),
          pass: ctx!.frames === frames,
        },
      ],
      { optionalNeeds: ["frames"] },
    );
    const { client } = connect(async () => context(), { cases: [reads] });
    const streamed: StressResult[] = [];
    await client.run(undefined, (r) => streamed.push(r));
    expect(streamed).toHaveLength(1);
    expect(streamed[0]!.error).toBeUndefined();
    expect(streamed[0]!.pass).toBe(true);
  });

  it("rejects the run with the error when the data context can't be made", async () => {
    const { client } = connect(() =>
      Promise.reject(new MissingDataError("no store; run `npm run setup`")),
    );
    await expect(client.run()).rejects.toMatchObject({
      name: "MissingDataError",
      message: "no store; run `npm run setup`",
    });
  });

  it("runs the checks that need no frame data without it, and skips the rest as missing (R5, F44)", async () => {
    const loadFrames = vi.fn(() =>
      Promise.reject(
        new MissingDataError("no frame data; run `npm run setup`"),
      ),
    );
    const { client } = connect(
      async () => ({
        loadFrames,
        loadProj: () =>
          Promise.reject(new MissingDataError("PROJ is not here")),
        loadOrion: () => Promise.reject(new Error("never asked")),
      }),
      { cases: CATALOG },
    );
    const streamed: StressResult[] = [];
    const summary = await client.run(undefined, (r) => streamed.push(r));
    const byId = new Map(streamed.map((r) => [r.id, r]));
    expect(byId.get("stub.frames")!.missing).toEqual(["frames"]);
    expect(byId.get("stub.frames")!.detail).toMatch(
      /frame data.*npm run setup/,
    );
    // The frame-free cases ran: an expected throw passes, a display-only
    // effect is shown.
    expect(byId.get("stub.leap")!.pass).toBe(true);
    expect(byId.get("stub.display")!.displayOnly).toBe(true);
    expect(byId.get("stub.pass")!.pass).toBe(true);
    expect(summary).toMatchObject({ skipped: 2, cancelled: false });
    expect(loadFrames).toHaveBeenCalledTimes(1);
  });
});

describe("the host's yielding wrapper", () => {
  it("keeps every field of a case, including ones added later, and still runs it", async () => {
    const run = vi.fn(async () => [{ ...base("stub.extra"), pass: true }]);
    const original = {
      ...stub("stub.extra", run, { optionalNeeds: ["frames"], cites: ["x"] }),
      somethingNew: 42,
    } as StressCase & { somethingNew: number };
    const [wrapped] = yielding([original]) as (StressCase & {
      somethingNew?: number;
    })[];
    expect(wrapped).toMatchObject({
      id: "stub.extra",
      group: "projections",
      needs: [],
      optionalNeeds: ["frames"],
      cites: ["x"],
      somethingNew: 42,
    });
    expect(wrapped!.run).not.toBe(original.run);
    expect(await wrapped!.run(context())).toHaveLength(1);
    expect(run).toHaveBeenCalledOnce();
  });
});

describe("userCrs (R18)", () => {
  it("streams boundCrsChecks's results like run, equal to a direct call", async () => {
    const wkt2 = 'PROJCRS["not a real CRS"]';
    const direct = await boundCrsChecks(context(), wkt2, "My site");
    expect(direct.length).toBeGreaterThan(0);
    const { client } = connect(async () => context());
    const streamed: StressResult[] = [];
    const summary = await client.userCrs(wkt2, "My site", (r) =>
      streamed.push(r),
    );
    expect(streamed).toStrictEqual(direct);
    expect(streamed.every((r) => r.userInput === true)).toBe(true);
    expect(summary.passed + summary.failed + summary.skipped).toBe(
      direct.filter((r) => !r.displayOnly).length,
    );
  });
});

/** A design frame on a sphere, enough for designGrid without PROJ. */
const R = 6.4e6;
const sphere = new Ellipsoid(R, R, R);
const stubFrame: DesignFrameLike & {
  operation: Pick<
    EngineeringFrame["operation"],
    "pipeline" | "accuracy" | "ballpark" | "grids"
  >;
} = {
  operation: {
    pipeline: "+proj=pipeline +step +proj=noop",
    accuracy: 2,
    ballpark: false,
    grids: ["g.tif"],
  },
  body: { ellipsoid: sphere },
  toGeodetic(design) {
    return {
      longitude: 0.3 + design[0]! / (R * Math.cos(0.5)),
      latitude: 0.5 + design[1]! / R,
      height: design[2] ?? 0,
    };
  },
  toBodyFixed(design, out = new Float64Array(3)) {
    return sphere.cartographicToCartesian(stubFrame.toGeodetic(design), out);
  },
};

describe("overlay", () => {
  const params = {
    frame: {
      name: "stub",
      body: "earth" as const,
      crs: { format: "wkid" as const, authority: "EPSG", wkid: 32611 },
    },
    extent: {
      min: [0, 0] as [number, number],
      max: [300_000, 200_000] as [number, number],
    },
    step: 50_000,
    segment: 10_000,
  };

  it("transfers its buffers: the sender's are detached after posting", async () => {
    const createFrame = vi.fn(() => stubFrame as unknown as EngineeringFrame);
    const { client, sent } = connect(
      async () => context({ loadProj: async () => ({}) as ProjApi }),
      { createFrame },
    );
    const geometry = await client.overlay("designGrid", params);
    expect(createFrame).toHaveBeenCalledOnce();

    const reply = sent.find((s) => s.message.type === "overlay")!;
    const transfer = reply.transfer ?? [];
    // Several chunks: the extent is wider than one chunk's 1e5 m.
    const chunks = geometry.layers[0]!.chunks;
    expect(chunks.length).toBeGreaterThan(1);
    expect(transfer).toHaveLength(4 * chunks.length);
    for (const buffer of transfer) {
      expect((buffer as ArrayBuffer).byteLength).toBe(0);
    }
    // What arrived is what overlayMesh gives on the main thread's side.
    const want = overlayMesh(
      designGrid(stubFrame, params.extent, params.step, params.segment),
    );
    expect(geometry.kind).toBe("designGrid");
    expect(geometry.layers.map((l) => l.name)).toEqual(["grid"]);
    // The frame's operation, for the legend's accuracy (R8).
    expect(geometry.operation).toEqual(stubFrame.operation);
    expect(chunks).toStrictEqual(want);
    expect(chunks[0]!.mesh.positions.byteLength).toBeGreaterThan(0);
  });

  it("draws a reply's chunks on the main thread, one mesh and draw each, removed together", async () => {
    const { client } = connect(
      async () => context({ loadProj: async () => ({}) as ProjApi }),
      { createFrame: () => stubFrame as unknown as EngineeringFrame },
    );
    const geometry = await client.overlay("designGrid", params);
    const chunks = geometry.layers[0]!.chunks;
    const world = {
      addMesh: vi.fn((mesh: unknown) => ({ mesh })),
      addDraw: vi.fn(() => ({})),
      removeDraw: vi.fn(),
      removeMesh: vi.fn(),
    };
    const scope = new DisposableStack();
    const remove = addOverlayChunks(world as unknown as World, chunks, scope);
    expect(world.addMesh.mock.calls.map((c) => c[0])).toEqual(
      chunks.map((c) => c.mesh),
    );
    expect(world.addDraw.mock.calls).toEqual(
      chunks.map((c) => [
        {
          mesh: { mesh: c.mesh },
          origin: c.origin,
          unlit: true,
          name: "frames explorer overlay",
        },
      ]),
    );
    scope.dispose();
    remove();
    expect(world.removeDraw).toHaveBeenCalledTimes(chunks.length);
    expect(world.removeMesh).toHaveBeenCalledTimes(chunks.length);
  });

  it("rejects with the builder's error, named, and the host keeps serving", async () => {
    const { client } = connect(
      async () => context({ loadProj: async () => ({}) as ProjApi }),
      { createFrame: () => stubFrame as unknown as EngineeringFrame },
    );
    await expect(
      client.overlay("designGrid", { ...params, step: -1 }),
    ).rejects.toMatchObject({
      name: "RangeError",
      message: expect.stringMatching(/step must be a positive number/),
    });
    await expect(client.overlay("designGrid", params)).resolves.toMatchObject({
      kind: "designGrid",
    });
  });
});

describe("scenario", () => {
  const params = {
    extent: {
      min: [0, 0] as [number, number],
      max: [300_000, 200_000] as [number, number],
    },
    step: 50_000,
    segment: 10_000,
  };
  /** A grid overlay as an evaluator builds it: several chunks, fresh buffers. */
  const grid = (): OverlayGeometry => ({
    kind: "designGrid",
    layers: [
      {
        name: "grid",
        chunks: overlayMesh(
          designGrid(stubFrame, params.extent, params.step, params.segment),
        ),
      },
    ],
    ms: 0,
  });
  const evaluation = (
    live: StressResult[] = [],
    geometry = grid(),
  ): ScenarioEvaluation => ({
    scenario: "earth-turns",
    added: [
      {
        id: "here",
        label: "Here",
        parentId: "ITRF",
        edge: {
          kind: "constant",
          detail: "a site on the ground",
          accuracy: { meters: 0.01, note: "surveyed" },
        },
      } satisfies AddedFrameSpec,
    ],
    answer: {
      label: "an hour",
      headline: "The ground turns 15.04° an hour against the stars",
      value: 15.04,
      unit: "°/h",
      accuracy: { note: "IERS rotation" },
      path: { from: "here", to: "GCRF" },
    },
    overlays: [{ id: "grid", geometry }],
    sightLines: [{ id: "up", from: [0, 0, 0], to: [0, 0, 1], label: "Up" }],
    live,
    checkedAnswerValue: 15.04,
  });

  it("returns a registered evaluator's evaluation, its overlay buffers transferred and its live checks judged", async () => {
    const geometry = grid();
    // A live check whose evaluator called it a pass, beyond its tolerance:
    // the host judges it as the runner would.
    const live: StressResult = {
      ...base("live.round-trip"),
      pass: true,
      value: 2,
      tolerance: 1,
      unit: "m",
    };
    const evaluator = vi.fn(async (ctx: StressContext) => {
      expect(ctx.frames).toBe(frames);
      return evaluation([live], geometry);
    });
    stubScenario("earth-turns", evaluator);
    const { client, sent } = connect(async () => context());
    const got = await client.scenario(
      "earth-turns",
      // Out of range: the worker clamps it, as a deep link's would be.
      { rate: 1e9, stray: "dropped" },
      1234.5,
    );
    expect(evaluator).toHaveBeenCalledOnce();
    expect(evaluator.mock.calls[0]!.slice(1, 3)).toEqual([
      { rate: 86_400 },
      1234.5,
    ]);
    // And the worker's bounded frame cache (frameCache.ts).
    expect((evaluator.mock.calls[0] as unknown[])[3]).toBeInstanceOf(
      FrameCache,
    );

    const reply = sent.find((s) => s.message.type === "scenario")!;
    const chunks = got.overlays[0]!.geometry.layers[0]!.chunks;
    expect(chunks.length).toBeGreaterThan(1);
    const transfer = reply.transfer ?? [];
    expect(transfer).toHaveLength(4 * chunks.length);
    for (const buffer of transfer) {
      expect((buffer as ArrayBuffer).byteLength).toBe(0);
    }
    // The sender's arrays are detached; what arrived is the evaluation.
    expect(geometry.layers[0]!.chunks[0]!.mesh.positions.byteLength).toBe(0);
    expect({ ...got, live: [] }).toStrictEqual(evaluation([], grid()));
    expect(got.live).toHaveLength(1);
    expect(got.live[0]).toMatchObject({
      id: "live.round-trip",
      pass: false,
      detail: expect.stringMatching(/beyond its tolerance/),
    });
  });

  it("refuses a second evaluator for one scenario", () => {
    stubScenario("earth-turns", async () => evaluation());
    expect(() =>
      registerScenario("earth-turns", async () => evaluation()),
    ).toThrow(/"earth-turns".*already/);
  });

  it("strips a live check's source: a published reference doesn't apply at the user's setting", async () => {
    stubScenario("earth-turns", async () =>
      evaluation([
        {
          ...base("live.round-trip"),
          pass: true,
          value: 0,
          tolerance: 1,
          unit: "m",
          source: {
            reference: "iers-conventions-2010",
            document: "IERS Conventions (2010)",
            retrieved: "2026-01-01",
          },
        },
      ]),
    );
    const { client } = connect(async () => context());
    const got = await client.scenario("earth-turns", { rate: 3600 }, 0);
    expect(got.live).toHaveLength(1);
    expect(got.live[0]!.pass).toBe(true);
    expect("source" in got.live[0]!).toBe(false);
  });

  it("refuses a live check under one of the scenario's catalog check ids, naming it", async () => {
    // earth-turns's checks: its catalog check against the published reference.
    stubScenario("earth-turns", async () =>
      evaluation([
        {
          ...base("frame-tree.compositions.itrf-gcrf"),
          pass: true,
        },
      ]),
    );
    const { client } = connect(async () => context());
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, 0),
    ).rejects.toThrow(
      /earth-turns.*"frame-tree\.compositions\.itrf-gcrf".*catalog checks/,
    );
  });

  it("waits for a run in progress: a scenario queued behind a run doesn't start until it ends", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cases = [
      stub("slow", async () => {
        await gate;
        return [{ ...base("slow"), pass: true }];
      }),
    ];
    /** What the host had posted when the evaluator started. */
    let postedBefore: string[] | undefined;
    const evaluator = vi.fn(async () => {
      postedBefore = sent.map((s) => s.message.type);
      return evaluation();
    });
    stubScenario("earth-turns", evaluator);
    const { client, sent } = connect(async () => context(), { cases });
    const run = client.run();
    const scenario = client.scenario("earth-turns", { rate: 3600 }, 0);
    await sleep(30);
    expect(evaluator).not.toHaveBeenCalled();
    release();
    await Promise.all([run, scenario]);
    expect(evaluator).toHaveBeenCalledOnce();
    // The run had ended, its done sent, before the evaluator began.
    expect(postedBefore).toContain("done");
    expect(sent.map((s) => s.message.type).slice(-1)).toEqual(["scenario"]);
  });

  it("stops a run that waits in the queue on cancel: it sends its done, cancelled, and runs nothing", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const later = vi.fn(async () => [{ ...base("later"), pass: true }]);
    stubScenario("earth-turns", async () => {
      await gate;
      return evaluation();
    });
    const { client } = connect(async () => context(), {
      cases: [stub("later", later)],
    });
    const scenario = client.scenario("earth-turns", { rate: 3600 }, 0);
    const run = client.run();
    await sleep(10);
    client.cancel();
    await sleep(10);
    release();
    await scenario;
    expect(await run).toMatchObject({ passed: 0, cancelled: true });
    expect(later).not.toHaveBeenCalled();
  });

  it("ends a run cancelled while its data context is made with done, cancelled, not an error", async () => {
    let fail = () => {};
    const made = new Promise<never>((_, reject) => {
      fail = () => reject(new MissingDataError("no store"));
    });
    const { client } = connect(() => made, { cases: CATALOG });
    const run = client.run();
    await sleep(10);
    client.cancel();
    await sleep(10);
    fail();
    await expect(run).resolves.toMatchObject({
      passed: 0,
      failed: 0,
      skipped: 0,
      cancelled: true,
    });
  });

  it("rejects naming the scenario when its evaluator throws, and the host keeps serving", async () => {
    stubScenario("earth-turns", () =>
      Promise.reject(new TypeError("boom: it broke")),
    );
    const { client } = connect(async () => context());
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, 0),
    ).rejects.toMatchObject({
      name: "TypeError",
      message: expect.stringMatching(/earth-turns.*boom: it broke/),
    });
    stubScenario("earth-turns", async () => evaluation());
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, 0),
    ).resolves.toMatchObject({ scenario: "earth-turns" });
  });

  it("rejects naming the scenario when none is registered, or the request is malformed", async () => {
    const { client } = connect(async () => context());
    await expect(
      client.scenario("nowhere" as ScenarioId, {}, 0),
    ).rejects.toMatchObject({
      name: "RangeError",
      message: expect.stringMatching(/"nowhere"/),
    });
    await expect(client.scenario("everything", {}, 0)).rejects.toMatchObject({
      name: "RangeError",
      message: expect.stringMatching(/"everything".*no evaluator/),
    });
    stubScenario("earth-turns", async () => evaluation());
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, NaN),
    ).rejects.toMatchObject({
      name: "RangeError",
      message: expect.stringMatching(/earth-turns.*epoch/),
    });
  });

  it("rejects an evaluation for another scenario", async () => {
    stubScenario("earth-turns", async () => ({
      ...evaluation(),
      scenario: "bim-site",
    }));
    const { client } = connect(async () => context());
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, 0),
    ).rejects.toThrow(/earth-turns.*bim-site/);
  });

  it("rejects naming what is missing when the scenario's data can't be had", async () => {
    stubScenario("earth-turns", async () => evaluation());
    const { client } = connect(async () => ({
      loadFrames: () =>
        Promise.reject(new MissingDataError("no frame data here")),
      loadProj: () => Promise.reject(new MissingDataError("no PROJ")),
      loadOrion: () => Promise.reject(new MissingDataError("no Orion")),
    }));
    await expect(
      client.scenario("earth-turns", { rate: 3600 }, 0),
    ).rejects.toMatchObject({
      name: "MissingDataError",
      message: expect.stringMatching(/earth-turns.*frame data/),
    });
  });
});

describe("loading state (R9, Review Focus 5)", () => {
  type Event = ProgressReply | StateReply;

  /** The events for `item`, as `state:x` or `progress:received/total`. */
  const trace = (events: readonly Event[], item: string) =>
    events
      .filter((e) => e.item === item)
      .map((e) =>
        e.type === "state"
          ? `state:${e.state}`
          : `progress:${e.received}/${e.total ?? "?"}`,
      );

  it("reports progress in order and ends in ready, missing or error, never fetching", async () => {
    const makeContext: MakeContext = async (report) => {
      // The frames as a loader, not in hand.
      const rest: DataContext = { ...context(), frames: undefined };
      return {
        ...rest,
        loadFrames: async () => {
          report("frames", 0, 100);
          await sleep(1);
          report("frames", 60, 100);
          report("frames", 100, 100);
          return frames;
        },
        loadProj: async () => {
          report("proj", 0, undefined);
          report("proj", 10, undefined);
          throw new MissingDataError(
            "PROJ is not in the frames store; run `npm run setup`",
          );
        },
        loadOrion: async () => {
          report("orion", 0, 6e6);
          throw new TypeError("Failed to fetch");
        },
      };
    };
    const { client } = connect(makeContext);
    const events: Event[] = [];
    client.onProgress((e) => events.push(e));

    const framesState = await client.load("frames");
    expect(framesState).toMatchObject({
      item: "frames",
      state: "ready",
      bytes: 100,
    });
    const proj = await client.load("proj");
    expect(proj.state).toBe("missing");
    expect(proj.detail).toMatch(/npm run setup/);
    const orion = await client.load("orion");
    expect(orion).toMatchObject({ state: "error", detail: "Failed to fetch" });

    expect(trace(events, "frames")).toEqual([
      "state:fetching",
      "progress:0/100",
      "progress:60/100",
      "progress:100/100",
      "state:ready",
    ]);
    expect(trace(events, "proj")).toEqual([
      "state:fetching",
      "progress:0/?",
      "progress:10/?",
      "state:missing",
    ]);
    expect(trace(events, "orion")).toEqual([
      "state:fetching",
      "progress:0/6000000",
      "state:error",
    ]);
    const ready = events.find(
      (e): e is StateReply => e.type === "state" && e.state === "ready",
    )!;
    expect(ready.ms).toBeGreaterThanOrEqual(0);
  });

  it("loads once: a second load of a ready item reports ready without fetching", async () => {
    const loadFrames = vi.fn(async () => frames);
    const makeContext = vi.fn(async () => {
      // The frames as a loader, not in hand.
      const rest: DataContext = { ...context(), frames: undefined };
      return { ...rest, loadFrames };
    });
    const { client } = connect(makeContext);
    const events: Event[] = [];
    client.onProgress((e) => events.push(e));
    await client.load("frames");
    await client.load("frames");
    expect(makeContext).toHaveBeenCalledOnce();
    expect(loadFrames).toHaveBeenCalledOnce();
    expect(trace(events, "frames")).toEqual([
      "state:fetching",
      "state:ready",
      "state:ready",
    ]);
  });

  it("retries an item that failed, so setup can be run without a reload", async () => {
    let attempt = 0;
    const { client } = connect(async () =>
      context({
        loadProj: async () => {
          attempt++;
          if (attempt === 1) {
            throw new MissingDataError("not yet");
          }
          return {} as ProjApi;
        },
      }),
    );
    expect((await client.load("proj")).state).toBe("missing");
    expect((await client.load("proj")).state).toBe("ready");
  });

  it("Orion, placed in the frame tree, is missing with the frame data, saying why; PROJ loads without it (F44)", async () => {
    const loadOrion = vi.fn(async () => ({}) as never);
    const { client } = connect(async () => ({
      loadFrames: () =>
        Promise.reject(new MissingDataError("no store; run `npm run setup`")),
      loadProj: async () => ({}) as ProjApi,
      loadOrion,
    }));
    const orion = await client.load("orion");
    expect(orion.state).toBe("missing");
    expect(orion.detail).toMatch(/frame data.*npm run setup/);
    expect(loadOrion).not.toHaveBeenCalled();
    expect((await client.load("proj")).state).toBe("ready");
  });

  it("geoid loads PROJ first, and is ready when PROJ needs no fetch for it", async () => {
    const { client } = connect(async () =>
      context({ loadProj: async () => ({}) as ProjApi }),
    );
    const events: Event[] = [];
    client.onProgress((e) => events.push(e));
    expect((await client.load("geoid")).state).toBe("ready");
    expect(trace(events, "proj")).toEqual(["state:fetching", "state:ready"]);
  });
});

describe("browserContext's loading states", () => {
  it("gives missing, with the setup hint, when the store isn't served", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const { client } = connect(browserContext("/frames-data/"));
    const frames = await client.load("frames");
    expect(frames.state).toBe("missing");
    expect(frames.detail).toMatch(/npm run setup/);
  });

  it("gives missing when the server answers with a page that isn't the manifest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!doctype html><title>Dyno</title>")),
    );
    const { client } = connect(browserContext("/frames-data/"));
    expect((await client.load("frames")).state).toBe("missing");
  });

  it("gives error, not missing and never fetching, when the fetch itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const { client } = connect(browserContext("/frames-data/"));
    const events: (ProgressReply | StateReply)[] = [];
    client.onProgress((e) => events.push(e));
    const frames = await client.load("frames");
    expect(frames.state).toBe("error");
    expect(frames.detail).toMatch(/Failed to fetch/);
    expect(events.at(-1)).toMatchObject({ type: "state", state: "error" });
  });
});

describe("the client's signal (R13, Review Focus 9)", () => {
  it("rejects pending promises with an AbortError, posts cancel, then terminates once", async () => {
    const controller = new AbortController();
    const cases = [stub("forever", () => new Promise(() => {}))];
    const { client, log, terminate } = connect(
      async () =>
        context({
          loadOrion: () => new Promise(() => {}),
        }),
      { cases },
      controller.signal,
    );
    const run = client.run();
    const load = client.load("orion");
    await sleep(10);
    controller.abort();
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    await expect(load).rejects.toMatchObject({ name: "AbortError" });
    expect(terminate).toHaveBeenCalledOnce();
    expect(log.slice(-2)).toEqual(["cancel", "terminate"]);
    // Afterwards nothing is posted, and every call rejects at once.
    await expect(client.load("frames")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(log.at(-1)).toBe("terminate");
    controller.abort();
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("terminates at once for a signal that is already aborted", () => {
    const { terminate } = connect(
      async () => context(),
      {},
      AbortSignal.abort(),
    );
    expect(terminate).toHaveBeenCalledOnce();
  });
});

describe("a worker that fails (Review Focus 5)", () => {
  /** A worker with no host behind it, as one whose script didn't load. */
  function dead() {
    const posted: Request[] = [];
    const worker: ClientWorker = {
      postMessage: (message) => posted.push(message),
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      terminate: vi.fn(),
    };
    const client = createClient(worker, new AbortController().signal);
    const events: StateReply[] = [];
    client.onProgress((e) => {
      if (e.type === "state") {
        events.push(e);
      }
    });
    const reply = (data: Reply) =>
      worker.onmessage!({ data } as MessageEvent<Reply>);
    return { worker, client, posted, events, reply };
  }

  it("onerror rejects every pending promise and ends every unfinished item in error", async () => {
    const { worker, client, posted, events, reply } = dead();
    // frames finished; proj is fetching (a run asked for it); orion has a
    // pending load and no state yet.
    reply({ type: "state", item: "frames", state: "ready" });
    reply({ type: "state", item: "proj", state: "fetching" });
    const run = client.run();
    const orion = client.load("orion");
    worker.onerror!({ message: "" } as ErrorEvent);
    for (const pending of [run, orion]) {
      await expect(pending).rejects.toMatchObject({
        name: "WorkerError",
        message: expect.stringMatching(
          /worker failed: its script did not load/,
        ),
      });
    }
    expect(events.map((e) => `${e.item}:${e.state}`)).toEqual([
      "frames:ready",
      "proj:fetching",
      "proj:error",
      "orion:error",
    ]);
    expect(events.at(-1)!.detail).toMatch(/worker failed/);
    // The worker is gone: later calls reject at once and post nothing.
    const count = posted.length;
    await expect(client.load("frames")).rejects.toMatchObject({
      name: "WorkerError",
    });
    client.cancel();
    expect(posted).toHaveLength(count);
  });

  it("onerror carries the worker's own message when it has one", async () => {
    const { worker, client } = dead();
    const load = client.load("frames");
    worker.onerror!({ message: "SyntaxError: bad token" } as ErrorEvent);
    await expect(load).rejects.toThrow(/worker failed: SyntaxError: bad token/);
  });

  it("onmessageerror rejects pending promises and ends unfinished items, and the worker goes on", async () => {
    const { worker, client, posted, events } = dead();
    const load = client.load("geoid");
    const overlay = client.overlay("trajectoryPath", {
      drawIn: "gcrf",
      t0: 0,
      t1: 600,
      step: 60,
      at: 0,
    });
    worker.onmessageerror!({} as MessageEvent);
    await expect(load).rejects.toMatchObject({
      name: "WorkerError",
      message: expect.stringMatching(/could not be read/),
    });
    await expect(overlay).rejects.toMatchObject({ name: "WorkerError" });
    expect(events.map((e) => `${e.item}:${e.state}`)).toEqual(["geoid:error"]);
    // Still running: a later call is posted.
    void client.load("frames");
    expect(posted.at(-1)).toMatchObject({ type: "load", item: "frames" });
  });

  it("an aborted client leaves the handlers cleared", () => {
    const controller = new AbortController();
    const worker: ClientWorker = {
      postMessage: () => {},
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      terminate: () => {},
    };
    createClient(worker, controller.signal);
    expect(worker.onerror).not.toBeNull();
    controller.abort();
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
    expect(worker.onmessageerror).toBeNull();
  });
});

describe("the main thread's module", () => {
  it("protocol.ts imports types only, so the page doesn't bundle the catalog or PROJ", () => {
    const source = readFileSync(
      new URL("../examples/frames-explorer/protocol.ts", import.meta.url),
      "utf8",
    );
    const imports = [...source.matchAll(/^import\b[^;]*;/gm)].map((m) => m[0]);
    expect(imports.length).toBeGreaterThan(0);
    for (const statement of imports) {
      expect(statement, statement).toMatch(/^import type\b/);
    }
    expect(source).not.toMatch(/\bimport\(/);
  });
});

describe("the worker's frame cache (Task 6a follow-up: it never evicted)", () => {
  /** The overlay a dragged rotation knob asks for: a new site at every value. */
  const atRotation = (rotation: number) => ({
    frame: {
      name: "site",
      body: "earth" as const,
      crs: { format: "wkid" as const, authority: "EPSG", wkid: 32611 },
      site: { origin: [0, 0, 0] as const, rotation, scale: 1 },
    },
    extent: {
      min: [0, 0] as [number, number],
      max: [20_000, 20_000] as [number, number],
    },
    step: 10_000,
    segment: 10_000,
  });
  const proj = async () => ({}) as ProjApi;
  const quiet = (id: ScenarioId): ScenarioEvaluation => ({
    scenario: id,
    added: [],
    answer: { label: "", headline: "", accuracy: { note: "a stub" } },
    overlays: [],
    live: [],
  });

  it("keeps the most recently used, least recent out first, and refuses a limit below 1", () => {
    const cache = new FrameCache<number>(2);
    const made: string[] = [];
    const get = (k: string) =>
      cache.get(k, () => {
        made.push(k);
        return made.length;
      });
    get("a");
    get("b");
    get("a"); // a is now the most recent
    get("c"); // b goes
    get("a");
    get("b");
    expect(made).toEqual(["a", "b", "c", "b"]);
    expect(cache.size).toBe(2);
    expect(() => new FrameCache(0)).toThrow(RangeError);
  });

  it("stays at its bound through 1,000 slider moves, reusing the recent ones", async () => {
    const cache = new FrameCache<EngineeringFrame>();
    const createFrame = vi.fn(() => stubFrame as unknown as EngineeringFrame);
    const { client } = connect(async () => context({ loadProj: proj }), {
      createFrame,
      frameCache: cache,
    });
    let largest = 0;
    for (let i = 0; i < 1000; i++) {
      await client.overlay("designGrid", atRotation(i * 0.5));
      largest = Math.max(largest, cache.size);
    }
    expect(createFrame).toHaveBeenCalledTimes(1000);
    expect(largest).toBe(FRAME_CACHE_LIMIT);
    expect(cache.size).toBe(FRAME_CACHE_LIMIT);
    // A knob moved back to a recent value reuses its frame.
    await client.overlay("designGrid", atRotation(998 * 0.5));
    expect(createFrame).toHaveBeenCalledTimes(1000);
  }, 60_000);

  it("empties the old scenario's entries when the worker turns to another, its evaluator's and its overlays' alike", async () => {
    const cache = new FrameCache<EngineeringFrame>();
    const stub = () => stubFrame as unknown as EngineeringFrame;
    const { client } = connect(async () => context({ loadProj: proj }), {
      createFrame: stub,
      frameCache: cache,
    });
    // Made before any scenario (the catalog's overlays): kept.
    await client.overlay("designGrid", atRotation(-1));
    try {
      stubScenario("earth-turns", async (_ctx, _knobs, _t, frames) => {
        for (const k of ["crs", "site", "site-2"]) {
          frames.get(`earth-turns:${k}`, stub);
        }
        return quiet("earth-turns");
      });
      stubScenario("stand-on-moon", async (_ctx, _knobs, _t, frames) => {
        frames.get("stand-on-moon:site", stub);
        return quiet("stand-on-moon");
      });
      await client.scenario("earth-turns", { rate: 3600 }, 0);
      await client.overlay("designGrid", atRotation(1));
      await client.overlay("designGrid", atRotation(2));
      expect(cache.madeIn("earth-turns")).toBe(5);
      expect(cache.madeIn(undefined)).toBe(1);
      await client.scenario("stand-on-moon", { latitude: -90 }, 0);
      expect(cache.madeIn("earth-turns")).toBe(0);
      expect(cache.madeIn("stand-on-moon")).toBe(1);
      expect(cache.madeIn(undefined)).toBe(1);
      expect(cache.size).toBe(2);
    } finally {
      stubScenario("earth-turns", evaluateEarthTurns);
      stubScenario("stand-on-moon", evaluateStandOnMoon);
    }
  });
});
