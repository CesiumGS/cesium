// Orion's marker while the clock plays (examples/frames-explorer/orionLayer.ts,
// callouts.ts and frameLoop.ts together, Task 4c item 2): the page's own
// parts, over a fake globe and worker, driven tick by tick. The owner saw the
// dot vanish at 1 h/s: the statement is asked for again every 150 ms of real
// time, and by its reply the clock had moved past the fixed two minutes a
// statement counted as "now". The marker must stay drawn at every tick, on
// the drawn path, and still hide after a scrub until its new statement is in.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallouts } from "../examples/frames-explorer/callouts.ts";
import { createFrameLoop } from "../examples/frames-explorer/frameLoop.ts";
import type { LabelSpec } from "../examples/frames-explorer/globe.ts";
import { createOrionLayer } from "../examples/frames-explorer/orionLayer.ts";
import type { OverlayState } from "../examples/frames-explorer/overlayConfig.ts";
import type { PageCore } from "../examples/frames-explorer/page.ts";
import type {
  OverlayGeometry,
  TrajectoryInfo,
} from "../examples/frames-explorer/protocol.ts";
import type { LabelBoard } from "../examples/frames-explorer/triadLayer.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

/** Orion parked at one point of GCRF: its drawn path (in GCRF) is that point, wherever the clock is. */
const PARKED = [3e8, 1e8, 5e7] as const;
const FRAME_MS = 16;

const apply = (m: ArrayLike<number>, p: ArrayLike<number>): number[] => [
  m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
  m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
  m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
];
const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

let real = 0;
let frame: (() => void) | undefined;

beforeEach(() => {
  real = 1000;
  frame = undefined;
  vi.spyOn(performance, "now").mockImplementation(() => real);
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => {
    frame = fn;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frame = undefined;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The page's Orion parts over a fake globe and a worker that answers `latencyMs` of real time later. */
function page(latencyMs: number) {
  const frames = createFrames(syntheticFrameData());
  const leap = frames.data.leapSeconds;
  const clock = {
    time: Date.UTC(2000, 0, 1, 12),
    rate: 1,
    mode: "paused" as "paused" | "playing",
  };
  const instantNow = () => Instant.fromUtc(clock.time, leap);
  /** Orion in ITRF at `instant`: the parked GCRF point turned with the Earth. */
  const orionItrf = (instant: Instant) =>
    apply(frameTransform(frames.gcrf, frames.itrf, instant), PARKED);
  const replies: { due: number; resolve: () => void }[] = [];
  let loaded: (() => void) | undefined;
  const geometry: OverlayGeometry = {
    kind: "trajectoryPath",
    layers: [
      {
        chunks: [{ mesh: {} as never, origin: Float64Array.from(PARKED) }],
      },
    ] as never,
    ms: 0,
  };
  const core = {
    viewer: { clock },
    globe: {
      setOverlay: () => {},
      placeOverlay: () => {},
      update: () => {},
      triadOrigin: () => undefined,
    },
    loading: {
      get: () => ({ state: "ready" }),
      subscribe: (fn: () => void) => {
        loaded = fn;
        return () => {};
      },
    },
    client: {
      overlay: () => Promise.resolve(geometry),
      trajectoryInfo: (at: number) =>
        new Promise<TrajectoryInfo>((resolve) => {
          const itrf = orionItrf(Instant.fromTdb(at));
          replies.push({
            due: real + latencyMs,
            resolve: () =>
              resolve({
                node: { id: "orion", label: "Orion", children: [] },
                parent: "EME2000",
                composed: {},
                itrf: itrf as [number, number, number],
                at,
              } as unknown as TrajectoryInfo),
          });
        }),
    },
    view: { get: () => ({ selection: undefined }) },
    frames: () => frames,
    instantNow,
    invalidate: () => {},
    disposed: () => false,
    scrub: (t: string) => t,
  } as unknown as PageCore;
  const state: OverlayState = { on: true, state: "waiting", token: 0 };
  const labels: LabelBoard = new Map();
  const orion = createOrionLayer({
    core,
    state,
    refreshCallouts: () => callouts.refresh(),
    rebuildTree: () => {},
    drawn: () => {},
  });
  const callouts = createCallouts({
    core,
    labels,
    scene: () => undefined,
    local: () => [],
    evaluation: () => undefined,
    stale: () => false,
    orion,
    orionOverlay: state,
    lunarSiteOrigin: () => undefined,
    refreshTriads: () => {},
  });
  const loop = createFrameLoop({
    core,
    rebuildTree: () => {},
    orion,
    callouts,
    overlays: {
      updateMinorGrid: () => {},
      biasOn: () => false,
      biasAt: () => 0,
      drawBias: () => {},
    },
    followOrbit: () => {},
    sceneTick: () => {},
    walk: { active: () => false, draw: () => {} },
  });
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };
  /** One frame: real time and the clock move on, due replies come in, the loop ticks. */
  const tick = async () => {
    real += FRAME_MS;
    if (clock.mode === "playing") {
      clock.time += clock.rate * FRAME_MS;
    }
    for (const r of replies.filter((r) => r.due <= real)) {
      replies.splice(replies.indexOf(r), 1);
      r.resolve();
    }
    await settle();
    frame?.();
  };
  /** Orion's marker on the globe now, and where it is drawn. */
  const marker = (): { text: string; at: ArrayLike<number> } | undefined => {
    const spec: LabelSpec | undefined = labels
      .get("callouts")
      ?.find((l) => l.id === "marker:orion-now");
    if (spec === undefined) {
      return undefined;
    }
    const at = typeof spec.at === "function" ? spec.at() : spec.at;
    return at === undefined ? undefined : { text: spec.text, at };
  };
  return {
    clock,
    orion,
    loop,
    tick,
    marker,
    /** Where the drawn path (the parked point) is on the globe now. */
    pathNow: () => orionItrf(instantNow()),
    async open() {
      loop.start();
      orion.draw();
      loaded?.();
      await settle();
      for (let i = 0; i < 40 && marker() === undefined; i++) {
        await tick();
      }
      expect(marker()).toBeDefined();
    },
  };
}

describe("Orion's marker while the clock plays (Task 4c item 2)", () => {
  for (const [name, rate] of [
    ["1 min/s", 60],
    ["1 h/s", 3600],
    ["1 day/s", 86_400],
  ] as const) {
    it(`stays drawn at every tick at ${name}, on the drawn path`, async () => {
      const p = page(40);
      await p.open();
      p.clock.rate = rate;
      p.clock.mode = "playing";
      for (let i = 0; i < 200; i++) {
        await p.tick();
        const m = p.marker();
        expect(m, `tick ${i}`).toBeDefined();
        // On the path (here a point fixed in GCRF), wherever the Earth has
        // turned since the statement was asked for.
        expect(distance(m!.at, p.pathNow()), `tick ${i}`).toBeLessThan(1);
      }
      p.loop.dispose();
    });
  }

  it("names the time of the statement it shows, which follows the clock", async () => {
    const p = page(40);
    await p.open();
    const first = p.marker()!.text;
    p.clock.rate = 3600;
    p.clock.mode = "playing";
    for (let i = 0; i < 120; i++) {
      await p.tick();
    }
    expect(p.marker()!.text).not.toBe(first);
    expect(p.marker()!.text).toMatch(/^Orion, \d\d:\d\d UTC$/);
    p.loop.dispose();
  });

  it("still hides after a scrub while paused, until the statement for the new time is in", async () => {
    const p = page(40);
    await p.open();
    p.clock.time += 4 * 3600_000;
    await p.tick();
    expect(p.marker()).toBeUndefined();
    for (let i = 0; i < 40 && p.marker() === undefined; i++) {
      await p.tick();
    }
    expect(p.marker()).toBeDefined();
    expect(distance(p.marker()!.at, p.pathNow())).toBeLessThan(1);
    p.loop.dispose();
  });
});
