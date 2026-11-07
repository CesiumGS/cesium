// Labels far from the Earth while the clock plays (Task 4c, the owner's
// "the Orion dot wobbles around" and "the MOON_ME label is jittering"): the
// page's own parts (orionLayer.ts, callouts.ts, frameLoop.ts) over a fake
// globe, camera and engine, driven a frame at a time with uneven frame
// times. Each frame the engine renders first, what the loop placed in the
// frame before; then the clock ticks; then the loop runs. The labels must be
// placed against exactly what is rendered (the same camera, the same
// points), so they ride with the canvas without wobble, and Orion's dot,
// placed on this thread from its trajectory, is drawn every frame on the
// path at the instant shown, with no worker statement to wait for.
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
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

/** Orion on a circle in GCRF at the Moon's distance, once round in 10 days. */
const RADIUS = 3.8e8;
const OMEGA = (2 * Math.PI) / (10 * 86_400);
/** A triad far from the Earth, fixed in GCRF (a Moon frame's, near enough). */
const FAR = [3.84e8, 5e7, 2e7] as const;
/** The camera: fixed in GCRF, 1.2e9 m up its z axis, looking down. */
const EYE = [0, 0, 1.2e9] as const;
/** Pixels per radian of the view: about 800 km a pixel at the Moon's distance. */
const FOCAL = 1500;
/** Uneven frame times, ms: the browser's 60 Hz with dropped frames. */
const FRAME_MS = [16, 17, 33, 16, 8, 25, 16, 50, 16, 17] as const;

const apply = (m: ArrayLike<number>, p: ArrayLike<number>): number[] => [
  m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
  m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
  m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
];
const turn = (m: ArrayLike<number>, v: ArrayLike<number>): number[] => [
  m[0]! * v[0]! + m[4]! * v[1]! + m[8]! * v[2]!,
  m[1]! * v[0]! + m[5]! * v[1]! + m[9]! * v[2]!,
  m[2]! * v[0]! + m[6]! * v[1]! + m[10]! * v[2]!,
];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

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

interface Camera {
  position: number[];
  /** The view's right, up and backward axes, Earth-fixed. */
  axes: number[][];
}

/** The page's Orion and label parts over a fake globe, camera and engine. */
function page() {
  const frames = createFrames(syntheticFrameData());
  const leap = frames.data.leapSeconds;
  const clock = {
    time: Date.UTC(2000, 0, 1, 12),
    rate: 1,
    mode: "paused" as "paused" | "playing",
  };
  const instantNow = () => Instant.fromUtc(clock.time, leap);
  const start = instantNow().tdb();
  const orionFrame = new Frame("orion", frames.gcrf, (instant, out) => {
    const a = OMEGA * (instant.tdb() - start);
    out.fill(0);
    out[0] = out[5] = out[10] = out[15] = 1;
    out[12] = RADIUS * Math.cos(a);
    out[13] = RADIUS * Math.sin(a);
  });
  const track = { frame: orionFrame, contains: () => true };
  const farFrame = Frame.constant("FAR", frames.gcrf, [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    FAR[0],
    FAR[1],
    FAR[2],
    1,
  ]);

  // The camera, carried with GCRF by the orbit's follow (cameraRig.ts).
  const camera: Camera = { position: [...EYE], axes: [] };
  const follow = () => {
    const m = frameTransform(frames.gcrf, frames.itrf, instantNow());
    camera.position = apply(m, EYE);
    camera.axes = [turn(m, [1, 0, 0]), turn(m, [0, 1, 0]), turn(m, [0, 0, 1])];
  };
  /** A point's screen position, px from the view's centre. */
  const screen = (cam: Camera, p: ArrayLike<number>) => {
    const d = [0, 1, 2].map((i) => p[i]! - cam.position[i]!);
    const z = -dot(d, cam.axes[2]!);
    return [
      (FOCAL * dot(d, cam.axes[0]!)) / z,
      (FOCAL * dot(d, cam.axes[1]!)) / z,
    ];
  };

  // The globe: the world it places, and its labels, placed when asked.
  let shown: Instant | undefined;
  let farOrigin: Float64Array | undefined;
  const labels: LabelBoard = new Map();
  const farLabel: LabelSpec = {
    id: "FAR",
    text: "MOON_ME",
    at: () => farOrigin,
    priority: 1,
  };
  /** Each label's screen position when it was last placed, by id. */
  let placed = new Map<string, number[]>();
  /** Each label's text when it was last placed, by id. */
  let texts = new Map<string, string>();
  const globe = {
    update: (itrf: Frame, instant: Instant) => {
      shown = instant;
      const m = frameTransform(farFrame, itrf, instant);
      farOrigin = Float64Array.of(m[12]!, m[13]!, m[14]!);
    },
    shownAt: () => shown,
    placeLabels: () => {
      placed = new Map();
      texts = new Map();
      for (const spec of [farLabel, ...(labels.get("callouts") ?? [])]) {
        const p = typeof spec.at === "function" ? spec.at() : spec.at;
        if (p !== undefined) {
          placed.set(spec.id, screen(camera, p));
          texts.set(spec.id, spec.text);
        }
      }
    },
    setOverlay: () => {},
    placeOverlay: () => {},
    triadOrigin: () => undefined,
  };

  const geometry: OverlayGeometry = {
    kind: "trajectoryPath",
    layers: [
      {
        chunks: [{ mesh: {} as never, origin: Float64Array.of(RADIUS, 0, 0) }],
      },
    ] as never,
    ms: 0,
  };
  let loaded: (() => void) | undefined;
  const core = {
    viewer: { clock },
    globe,
    loading: {
      get: () => ({ state: "ready" }),
      subscribe: (fn: () => void) => {
        loaded = fn;
        return () => {};
      },
    },
    client: {
      overlay: () => Promise.resolve(geometry),
      // The worker's statement: never answered, the dot mustn't wait for it.
      trajectoryInfo: () => new Promise<TrajectoryInfo>(() => {}),
    },
    view: { get: () => ({ selection: undefined }) },
    frames: () => frames,
    instantNow,
    invalidate: () => {},
    disposed: () => false,
    scrub: (t: string) => t,
  } as unknown as PageCore;
  const state: OverlayState = { on: true, state: "waiting", token: 0 };
  const orion = createOrionLayer({
    core,
    state,
    refreshCallouts: () => callouts.refresh(),
    refreshTree: () => {},
    drawn: () => {},
    loadTrack: () => Promise.resolve(track),
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
    leapSeconds: () => leap,
  });
  const loop = createFrameLoop({
    core,
    refreshTree: () => {},
    orion,
    callouts,
    overlays: {
      updateMinorGrid: () => {},
      biasOn: () => false,
      biasAt: () => 0,
      drawBias: () => {},
    },
    followOrbit: follow,
    sceneTick: () => {},
    walk: { active: () => false, draw: () => {} },
  });

  /** What the engine draws this frame: the last frame's camera and world. */
  let rendered: { camera: Camera; instant?: Instant; far?: number[] } = {
    camera,
  };
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };
  let n = 0;
  /** One frame: the engine renders, the clock ticks, the loop runs. */
  const tick = async () => {
    const ms = FRAME_MS[n++ % FRAME_MS.length]!;
    real += ms;
    rendered = {
      camera: {
        position: [...camera.position],
        axes: camera.axes.map((a) => [...a]),
      },
      ...(shown && { instant: shown }),
      ...(farOrigin && { far: [...farOrigin] }),
    };
    if (clock.mode === "playing") {
      clock.time += clock.rate * ms;
    }
    await settle();
    frame?.();
  };
  /** Orion's dot and the far triad, where the canvas draws them this frame. */
  const drawn = () => {
    const at = rendered.instant;
    const m = at && frameTransform(orionFrame, frames.itrf, at);
    return {
      orion: m && screen(rendered.camera, [m[12]!, m[13]!, m[14]!]),
      far: rendered.far && screen(rendered.camera, rendered.far),
    };
  };
  return {
    clock,
    loop,
    tick,
    drawn,
    placed: () => placed,
    texts: () => texts,
    /** The instant the canvas shows, as "HH:MM". */
    shownHhmm: () =>
      rendered.instant &&
      new Date(rendered.instant.toUtc(frames.data.leapSeconds))
        .toISOString()
        .slice(11, 16),
    async open() {
      follow();
      loop.start();
      orion.draw();
      loaded?.();
      await settle();
      for (let i = 0; i < 10; i++) {
        await tick();
      }
      expect(placed.has("marker:orion-now")).toBe(true);
    },
  };
}

/** Frame-to-frame steps that reverse by more than `tolerance` px. */
function reversals(path: readonly number[][], tolerance: number): number {
  let count = 0;
  for (let i = 2; i < path.length; i++) {
    const a = [
      path[i - 1]![0]! - path[i - 2]![0]!,
      path[i - 1]![1]! - path[i - 2]![1]!,
    ];
    const b = [
      path[i]![0]! - path[i - 1]![0]!,
      path[i]![1]! - path[i - 1]![1]!,
    ];
    if (
      a[0]! * b[0]! + a[1]! * b[1]! < 0 &&
      Math.min(Math.hypot(a[0]!, a[1]!), Math.hypot(b[0]!, b[1]!)) > tolerance
    ) {
      count++;
    }
  }
  return count;
}

describe("labels far from the Earth while the clock plays (Task 4c: the dot's wobble, the MOON_ME label's jitter)", () => {
  for (const [name, rate] of [
    ["1 min/s", 60],
    ["1 h/s", 3600],
    ["1 day/s", 86_400],
  ] as const) {
    it(`at ${name}, Orion's dot and a Moon-distance triad's label sit on what the canvas draws, every frame, and move smoothly`, async () => {
      const p = page();
      await p.open();
      p.clock.rate = rate;
      p.clock.mode = "playing";
      const dots: number[][] = [];
      const fars: number[][] = [];
      for (let i = 0; i < 200; i++) {
        await p.tick();
        const label = p.placed();
        const drawn = p.drawn();
        const dotAt = label.get("marker:orion-now");
        const farAt = label.get("FAR");
        expect(dotAt, `tick ${i}: the dot`).toBeDefined();
        // Within a hundredth of a pixel of where the canvas draws them.
        expect(
          Math.hypot(
            dotAt![0]! - drawn.orion![0]!,
            dotAt![1]! - drawn.orion![1]!,
          ),
          `tick ${i}: the dot`,
        ).toBeLessThan(0.01);
        expect(
          Math.hypot(farAt![0]! - drawn.far![0]!, farAt![1]! - drawn.far![1]!),
          `tick ${i}: the triad's label`,
        ).toBeLessThan(0.01);
        dots.push(dotAt!);
        fars.push(farAt!);
      }
      // No step back of more than a tenth of a pixel, frame times uneven.
      expect(reversals(dots, 0.1), "the dot").toBe(0);
      expect(reversals(fars, 0.1), "the triad's label").toBe(0);
      p.loop.dispose();
    });
  }

  it("names the time the globe shows, and follows it as the clock plays", async () => {
    const p = page();
    await p.open();
    const first = p.texts().get("marker:orion-now");
    expect(first).toMatch(/^Orion, \d\d:\d\d UTC$/);
    p.clock.rate = 3600;
    p.clock.mode = "playing";
    for (let i = 0; i < 60; i++) {
      await p.tick();
    }
    const text = p.texts().get("marker:orion-now");
    expect(text).not.toBe(first);
    // The minute shown, give or take the one that just turned.
    const [h, m] = p.shownHhmm()!.split(":").map(Number);
    const [th, tm] = text!.slice(7, 12).split(":").map(Number);
    expect(Math.abs(h! * 60 + m! - (th! * 60 + tm!))).toBeLessThanOrEqual(1);
    p.loop.dispose();
  });
});
