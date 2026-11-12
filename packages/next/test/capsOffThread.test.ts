// Caps that follow a moving clip without stalling the page (src/scene/world/
// caps.ts, src/brep/section*.ts): the section in steps within a budget, or in
// a worker, the caps already drawn kept until the new ones are whole, the
// scheduler waking a resting engine, names for picks, the mesh caps' default
// bias and their exact picks.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  SectionClient,
  type SectionWorkerLike,
} from "../src/brep/sectionClient.ts";
import {
  SectionHost,
  runSection,
  type SectionMessage,
  type SectionReply,
  type SectionRequest,
  type SectionRunner,
} from "../src/brep/sectionHost.ts";
import { sectionBrep, SectionJob } from "../src/brep/section.ts";
import { validateBrep } from "../src/brep/validate.ts";
import type { Engine } from "../src/scene/Engine.ts";
import {
  BREP_CAP_NAME,
  BrepCaps,
  CapScheduler,
  MESH_CAP_LINE_NAME,
  MESH_CAP_NAME,
  MeshCaps,
  type CapEngine,
} from "../src/scene/world/caps.ts";
import type { ClipSet } from "../src/scene/world/clips.ts";
import {
  rayHitRegions,
  tileBounds,
  type MeshCapRegion,
  type MeshCapTile,
} from "../src/scene/world/meshCaps.ts";
import { planeFrame } from "../src/brep/sectionCurves.ts";
import { boxBrep } from "./brepFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

const FRAME = { name: "test" } as ClipSet["frame"];
const planeAt = (z: number): ClipSet => ({
  frame: FRAME,
  shapes: [{ kind: "plane", point: [0, 0, z], normal: [0, 0, 1] }],
});
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const options = { maxDraws: 64, vertexBytes: 1 << 20, indexBytes: 1 << 20 };

describe("SectionJob", () => {
  it("does the work of sectionBrep in steps, and says when it is done", () => {
    const form = boxBrep();
    const planes = [{ point: [0, 0, 1.5], normal: [0, 0, 1] }];
    const whole = sectionBrep(form, planes);
    const job = new SectionJob(form, planes);
    let calls = 0;
    // No time at all: a step is still taken, so it always ends.
    while (!job.step(0)) {
      calls++;
      expect(calls).toBeLessThan(10_000);
      expect(() => job.result).toThrow(/not done/);
    }
    expect(calls).toBeGreaterThan(3);
    expect(job.done).toBe(true);
    expect(job.result.faces.map((f) => f.area)).toEqual(
      whole.faces.map((f) => f.area),
    );
    expect(job.result.report.facesCut).toBe(whole.report.facesCut);
  });

  it("refuses a tolerance that is not a length, at once", () => {
    expect(
      () => new SectionJob(boxBrep(), [], { tolerance: Number.NaN }),
    ).toThrow(RangeError);
  });
});

describe("BrepCaps in steps and in a worker", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("rebuilds within a budget and keeps the caps it had until the new ones are whole", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    caps.setClip(planeAt(1.5));
    caps.rebuild();
    const first = caps.draw;
    expect(first).toBeDefined();
    caps.setClip(planeAt(1));
    let calls = 0;
    while (!caps.rebuild(0)) {
      calls++;
      expect(calls).toBeLessThan(10_000);
      expect(caps.dirty).toBe(true);
      expect(caps.draw).toBe(first);
    }
    expect(calls).toBeGreaterThan(3);
    expect(caps.draw).not.toBe(first);
    expect(caps.dirty).toBe(false);
    expect(caps.capForm!.surfaceFrame[2]!).toBeLessThan(1);
    expect(caps.report.offThread).toBe(false);
    caps.dispose();
  });

  it("names the draws of the b-rep it adds and of its caps, for picks", () => {
    const world = engine.createWorld(options);
    const part = world.addBrep(boxBrep());
    expect((part.patches ?? part.trimmed ?? part.mesh)!.name).toBe("brep");
    const named = world.addBrep(boxBrep(), { name: "Part" });
    expect((named.patches ?? named.trimmed ?? named.mesh)!.name).toBe("Part");
    const caps = new BrepCaps(world, { form: boxBrep() });
    caps.setClip(planeAt(1.5));
    caps.rebuild();
    const cap = caps.draw!;
    expect((cap.patches ?? cap.trimmed ?? cap.mesh)!.name).toBe(BREP_CAP_NAME);
    const mine = new BrepCaps(world, {
      form: boxBrep(),
      draw: { name: "my cap" },
    });
    mine.setClip(planeAt(1.5));
    mine.rebuild();
    const own = mine.draw!;
    expect((own.patches ?? own.trimmed ?? own.mesh)!.name).toBe("my cap");
  });

  /** A runner that records its requests and answers when the test says. */
  function manualRunner() {
    const requests: SectionRequest[] = [];
    const answers: Array<(error?: Error) => void> = [];
    const runner: SectionRunner = {
      run: (request) => {
        requests.push(request);
        return new Promise((resolve, reject) => {
          answers.push((error) =>
            error ? reject(error) : resolve(runSection(request)),
          );
        });
      },
    };
    return { runner, requests, answers };
  }

  it("lets a runner section off this thread: waiting, then drawn when it answers", async () => {
    const world = engine.createWorld(options);
    const { runner, requests, answers } = manualRunner();
    const caps = new BrepCaps(world, {
      form: boxBrep(),
      runner,
      draw: { trimTolerance: 1e-3 },
    });
    let changes = 0;
    caps.onChange = () => changes++;
    caps.setClip(planeAt(1.5));
    expect(changes).toBe(1);
    expect(caps.rebuild()).toBe(false);
    expect(caps.waiting).toBe(true);
    expect(caps.draw).toBeUndefined();
    // Asking again before the answer starts nothing else.
    expect(caps.rebuild()).toBe(false);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.prepare).toEqual({ trimTolerance: 1e-3 });
    answers[0]!();
    await flush();
    // The answer wakes whoever ticks the caps.
    expect(changes).toBe(2);
    expect(caps.waiting).toBe(false);
    expect(caps.rebuild()).toBe(true);
    expect(caps.dirty).toBe(false);
    expect(caps.draw).toBeDefined();
    expect(caps.report.offThread).toBe(true);
    expect(caps.report.faces).toBe(1);
    expect(validateBrep(caps.capForm!)).toEqual([]);
    caps.dispose();
  });

  it("draws a section that finishes after the clip moved, and starts the next", async () => {
    const world = engine.createWorld(options);
    const { runner, requests, answers } = manualRunner();
    const caps = new BrepCaps(world, { form: boxBrep(), runner });
    caps.setClip(planeAt(1.5));
    caps.rebuild();
    caps.setClip(planeAt(2.5));
    answers[0]!();
    await flush();
    // Close to where the clip is, not yet where it is: drawn, and still out of date.
    expect(caps.rebuild()).toBe(false);
    expect(caps.dirty).toBe(true);
    expect(caps.draw).toBeDefined();
    expect(caps.capForm!.surfaceFrame[2]!).toBeLessThan(1.5);
    expect(requests).toHaveLength(1);
    expect(caps.rebuild()).toBe(false);
    expect(requests).toHaveLength(2);
    answers[1]!();
    await flush();
    expect(caps.rebuild()).toBe(true);
    expect(caps.capForm!.surfaceFrame[2]!).toBeGreaterThan(2.4);
    caps.dispose();
  });

  it("draws nothing for a clip that went while the section ran", async () => {
    const world = engine.createWorld(options);
    const { runner, answers } = manualRunner();
    const caps = new BrepCaps(world, { form: boxBrep(), runner });
    caps.setClip(planeAt(1.5));
    caps.rebuild();
    caps.setClip(undefined);
    answers[0]!();
    await flush();
    expect(caps.rebuild()).toBe(false);
    expect(caps.draw).toBeUndefined();
    expect(caps.rebuild()).toBe(true);
    expect(caps.report.planes).toBe(0);
  });

  it("throws a failed section once, and tries again when the clip changes", async () => {
    const world = engine.createWorld(options);
    const { runner, answers } = manualRunner();
    const caps = new BrepCaps(world, { form: boxBrep(), runner });
    caps.setClip(planeAt(1.5));
    caps.rebuild();
    answers[0]!(new Error("the worker failed"));
    await flush();
    expect(() => caps.rebuild()).toThrow(/worker failed/);
    expect(caps.dirty).toBe(false);
    expect(caps.rebuild()).toBe(true);
    caps.setClip(planeAt(1));
    expect(caps.dirty).toBe(true);
  });

  it("says nothing after it is disposed", async () => {
    const world = engine.createWorld(options);
    const { runner, answers } = manualRunner();
    const caps = new BrepCaps(world, { form: boxBrep(), runner });
    let changes = 0;
    caps.setClip(planeAt(1.5));
    caps.onChange = () => changes++;
    caps.rebuild();
    caps.dispose();
    answers[0]!();
    await flush();
    expect(changes).toBe(0);
    expect(caps.draw).toBeUndefined();
  });
});

describe("the section worker", () => {
  /** A worker that runs a SectionHost in-process, cloning every message as a real one does. */
  function inProcessWorker() {
    const sent: SectionMessage[] = [];
    const listeners: Array<(event: { data: SectionReply }) => void> = [];
    const host = new SectionHost({
      post: (reply, transfer) => {
        const data = structuredClone(reply, { transfer });
        queueMicrotask(() => listeners.forEach((l) => l({ data })));
      },
    });
    let terminated = false;
    const worker: SectionWorkerLike = {
      postMessage: (message) => {
        sent.push(message);
        const copy = structuredClone(message);
        queueMicrotask(() => host.receive(copy));
      },
      terminate: () => {
        terminated = true;
      },
      addEventListener: ((type: string, listener: never) => {
        if (type === "message") {
          listeners.push(listener);
        }
      }) as SectionWorkerLike["addEventListener"],
    };
    return { worker, sent, terminated: () => terminated };
  }

  const request = (z: number): SectionRequest => ({
    form: boxBrep(),
    planes: [{ point: [0, 0, z], normal: [0, 0, 1] }],
    prepare: {},
  });

  it("sends a form once, and answers with caps that moved by transfer and are whole", async () => {
    const { worker, sent } = inProcessWorker();
    const client = new SectionClient({ createWorker: () => worker });
    const form = boxBrep();
    const a = await client.run({ ...request(1.5), form });
    const b = await client.run({ ...request(2), form });
    expect(sent.filter((m) => m.type === "form")).toHaveLength(1);
    expect(sent.filter((m) => m.type === "section")).toHaveLength(2);
    expect(a.result.faces[0]!.area).toBeCloseTo(6, 3);
    expect(validateBrep(a.result.form!)).toEqual([]);
    expect(a.patches?.faces).toHaveLength(1);
    expect(b.result.form!.surfaceFrame[2]!).toBeGreaterThan(1.9);
    // Forgotten, it is sent again.
    client.forget(form);
    await client.run({ ...request(1.5), form });
    expect(sent.filter((m) => m.type === "form")).toHaveLength(2);
    client.dispose();
  });

  it("reports an error the section threw, and rejects what waits when it ends", async () => {
    const { worker, terminated } = inProcessWorker();
    const client = new SectionClient({ createWorker: () => worker });
    await expect(
      client.run({
        ...request(1.5),
        options: { tolerance: Number.NaN },
      }),
    ).rejects.toThrow(/tolerance/);
    const waiting = client.run(request(1.5));
    client.dispose();
    await expect(waiting).rejects.toThrow(/ended/);
    expect(terminated()).toBe(true);
    await expect(client.run(request(1.5))).rejects.toThrow(/ended/);
  });

  it("drives BrepCaps as its runner", async () => {
    const { worker } = inProcessWorker();
    const client = new SectionClient({ createWorker: () => worker });
    const engine = await fakeEngine();
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep(), runner: client });
    caps.setClip(planeAt(1.5));
    expect(caps.rebuild()).toBe(false);
    for (let i = 0; i < 20 && !caps.rebuild(); i++) {
      await flush();
    }
    expect(caps.dirty).toBe(false);
    expect(caps.report.area).toBeCloseTo(6, 3);
    caps.dispose();
    client.dispose();
  });
});

describe("the scheduler wakes a resting engine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const fake = () => {
    const listeners: Array<(now: number) => void> = [];
    let wakes = 0;
    const engine: CapEngine = {
      onAfterTick: (listener) => {
        listeners.push(listener);
        return () => listeners.splice(listeners.indexOf(listener), 1);
      },
      wake: () => {
        wakes++;
      },
    };
    return { engine, listeners, wakes: () => wakes };
  };

  const item = (state: {
    dirty: boolean;
    waiting: boolean;
    done: boolean;
  }) => ({
    get dirty() {
      return state.dirty;
    },
    get waiting() {
      return state.waiting;
    },
    changedAt: 0,
    onChange: undefined as (() => void) | undefined,
    rebuild() {
      if (state.done) {
        state.dirty = false;
      }
      return state.done;
    },
  });

  it("wakes when an item goes out of date, and ticks with the engine's frames", () => {
    const { engine, listeners, wakes } = fake();
    const scheduler = new CapScheduler({ engine, intervalMs: 0 });
    const state = { dirty: false, waiting: false, done: true };
    const a = item(state);
    scheduler.add(a);
    expect(wakes()).toBe(0);
    state.dirty = true;
    a.onChange!();
    expect(wakes()).toBe(1);
    // The engine's tick rebuilds it, with nobody calling `tick`.
    listeners[0]!(0);
    expect(state.dirty).toBe(false);
    scheduler.dispose();
    expect(listeners).toHaveLength(0);
    expect(a.onChange).toBeUndefined();
  });

  it("wakes at once for an item that is already out of date when added", () => {
    const { engine, wakes } = fake();
    const scheduler = new CapScheduler({ engine });
    scheduler.add(item({ dirty: true, waiting: false, done: true }));
    expect(wakes()).toBe(1);
  });

  it("keeps ticking while work remains, and rests while a worker has it", () => {
    const { engine, wakes } = fake();
    const scheduler = new CapScheduler({ engine, intervalMs: 0 });
    const slow = { dirty: true, waiting: false, done: false };
    scheduler.add(item(slow));
    const before = wakes();
    scheduler.tick(0);
    expect(wakes()).toBe(before + 1);
    slow.waiting = true;
    scheduler.tick(1);
    expect(wakes()).toBe(before + 1);
  });

  it("wakes when a throttled item is due, so the last move lands", () => {
    vi.useFakeTimers();
    const { engine, wakes } = fake();
    const scheduler = new CapScheduler({ engine, intervalMs: 100 });
    const state = { dirty: true, waiting: false, done: true };
    scheduler.add(item(state));
    scheduler.tick(0);
    state.dirty = true;
    const before = wakes();
    scheduler.tick(40);
    expect(wakes()).toBe(before);
    vi.advanceTimersByTime(60);
    expect(wakes()).toBe(before + 1);
    scheduler.dispose();
  });

  it("works with a wake function alone, as the application's own tick does", () => {
    let woken = 0;
    const scheduler = new CapScheduler({ wake: () => woken++ });
    const a = item({ dirty: true, waiting: false, done: true });
    scheduler.add(a);
    expect(woken).toBe(1);
    a.onChange!();
    expect(woken).toBe(2);
  });
});

describe("MeshCaps' bias, exact picks and names", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  /** A closed box (±1) as one tile, outward winding, scaled by `k`. */
  function box(k = 1, id = "box"): MeshCapTile {
    const positions: number[] = [];
    const indices: number[] = [];
    for (let a = 0; a < 3; a++) {
      for (const s of [-1, 1]) {
        const u = (a + 1) % 3;
        const v = (a + 2) % 3;
        const corners = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([p, q]) => {
          const x = [0, 0, 0];
          x[a] = s;
          x[u] = p!;
          x[v] = q!;
          return x;
        });
        if (s < 0) {
          corners.reverse();
        }
        const base = positions.length / 3;
        corners.forEach((c) => positions.push(...c));
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    return {
      id,
      revision: 1,
      positions: Float32Array.from(positions),
      indices: Uint32Array.from(indices),
      featureIds: new Uint32Array(positions.length / 3).fill(4),
      matrix: [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1],
    };
  }

  it("takes a default bias from the content's size, as the b-rep caps do", () => {
    const world = engine.createWorld(options);
    const small = new MeshCaps(world);
    small.setTile(box(1));
    small.setClip(planeAt(0.3));
    small.rebuild();
    // 2e-5 of the diagonal (3.46 m), up to a power of two.
    expect(small.surfaces[0]!.bias).toBe(2 ** -13);
    small.dispose();
    const large = new MeshCaps(world);
    large.setTile(box(100));
    large.setClip(planeAt(30));
    large.rebuild();
    expect(large.surfaces[0]!.bias).toBe(2 ** -7);
    expect(30 - large.surfaces[0]!.plane.origin[2]).toBeCloseTo(2 ** -7, 9);
    // Content that grows past a power of two moves it once, not at every tile.
    large.setTile(box(100, "again"));
    large.rebuild();
    expect(large.surfaces[0]!.bias).toBe(2 ** -7);
    large.dispose();
    const none = new MeshCaps(world);
    none.setClip(planeAt(0));
    none.rebuild();
    expect(none.surfaces[0]!.regions).toEqual([]);
    expect(none.surfaces[0]!.bias).toBe(1e-6);
    const set = new MeshCaps(world, { bias: { meters: 0.01 } });
    set.setTile(box(100));
    set.setClip(planeAt(30));
    set.rebuild();
    expect(set.surfaces[0]!.bias).toBe(0.01);
  });

  it("names its draws for picks", () => {
    const world = engine.createWorld(options);
    // A side missing, so the section is an open chain: a line.
    const open = box();
    const tile = { ...open, indices: (open.indices as Uint32Array).slice(6) };
    const namesOf = (caps: MeshCaps) =>
      (caps as unknown as { draws: { draw: { name?: string } }[] }).draws.map(
        (d) => d.draw.name,
      );
    const caps = new MeshCaps(world);
    caps.setTile({ ...tile, indices: open.indices as Uint32Array });
    caps.setClip(planeAt(0.3));
    caps.rebuild();
    expect(namesOf(caps)).toEqual([MESH_CAP_NAME]);
    const lines = new MeshCaps(world);
    lines.setTile(tile);
    lines.setClip(planeAt(0.3));
    lines.rebuild();
    expect(namesOf(lines)).toContain(MESH_CAP_LINE_NAME);
    const mine = new MeshCaps(world, { name: "mine" });
    mine.setTile(tile);
    mine.setClip(planeAt(0.3));
    mine.rebuild();
    expect(new Set(namesOf(mine))).toEqual(new Set(["mine"]));
  });

  it("exposes the caps as polygons and answers exact picks on them", () => {
    const world = engine.createWorld(options);
    const caps = new MeshCaps(world);
    caps.setTile(box());
    caps.setClip(planeAt(0.3));
    caps.rebuild();
    expect(caps.surfaces).toHaveLength(1);
    const [surface] = caps.surfaces;
    expect(surface!.regions).toHaveLength(1);
    expect(surface!.regions[0]!.feature).toBe(4);
    expect(surface!.plane.z[2]).toBeCloseTo(1, 12);
    const hit = caps.rayHit([0.2, 0.1, 5], [0.2, 0.1, -5])!;
    expect(hit.surface).toBe(0);
    expect(hit.feature).toBe(4);
    expect(hit.point[0]).toBeCloseTo(0.2, 12);
    // On the cap's plane, a bias inside the clip's.
    expect(hit.point[2]).toBeCloseTo(0.3 - surface!.bias, 12);
    expect(hit.t).toBeCloseTo((5 - hit.point[2]) / 10, 12);
    // Beside the box, parallel to the plane, and a hit the clips remove: none.
    expect(caps.rayHit([3, 3, 5], [3, 3, -5])).toBeUndefined();
    expect(caps.rayHit([0, 0, 1], [1, 0, 1])).toBeUndefined();
    expect(caps.rayHit([0, 0, 5], [0, 0, -5], () => false)).toBeUndefined();
    // Nothing once the clip goes.
    caps.setClip(undefined);
    caps.rebuild();
    expect(caps.rayHit([0.2, 0.1, 5], [0.2, 0.1, -5])).toBeUndefined();
  });

  it("tests a point against a region's loops: in the outer, not in a hole", () => {
    const frame = planeFrame([0, 0, 0], [0, 0, 1]);
    const region: MeshCapRegion = {
      feature: 2,
      outer: [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ],
      holes: [
        [
          [-0.5, -0.5],
          [-0.5, 0.5],
          [0.5, 0.5],
          [0.5, -0.5],
        ],
      ],
    };
    const through = (x: number, y: number) =>
      rayHitRegions(frame, [region], [x, y, 1], [x, y, -1]);
    expect(through(0.75, 0)?.feature).toBe(2);
    expect(through(0, 0)).toBeUndefined();
    expect(through(1.5, 0)).toBeUndefined();
    // A segment that stops short of the plane meets nothing.
    expect(rayHitRegions(frame, [region], [0.75, 0, 2], [0.75, 0, 1])).toBe(
      undefined,
    );
  });

  it("boxes a tile in the clip's frame", () => {
    const tile = box(2);
    const bounds = tileBounds({
      ...tile,
      matrix: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 10, 0, 0, 1],
    })!;
    expect(bounds.lo).toEqual([8, -2, -2]);
    expect(bounds.hi).toEqual([12, 2, 2]);
    expect(tileBounds({ ...tile, positions: [] })).toBeUndefined();
  });
});
