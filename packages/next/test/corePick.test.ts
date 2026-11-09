// Core picks (plan 5a, Task 15): `View.pickPoint` gives the render-space
// position with its anchor, the draw and the feature, all from the tick
// whose image the pick read (Review Focus 3), and `View.pickPosition` keeps
// giving the body anchor's coordinates (plan 5a's call 35). The engine runs
// on the fake device of test/fakeGpu.ts; the tests answer each pick's
// readback themselves, as the GPU's pick pass would (pick.slang: the
// feature ID, then the reverse-Z depth), and choose when it maps, as
// test/onDemandIdle.test.ts answers the meter's.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { Clock } from "../src/time/Clock.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const T0 = Date.UTC(2026, 2, 20, 14, 3, 7, 250);
const WIDTH = 64;
const HEIGHT = 48;

interface Internals {
  picks: Array<{ readback: GPUBuffer }>;
  tick(): void;
}

/** What the next pick pass reads: a global feature ID and a reverse-Z depth. */
interface Answer {
  featureId: number;
  depth: number;
}

let engine: Engine;
let world: World;
let earth: AnchorHandle;
let view: View;
let draw: DrawHandle;
let featureId: number;
/** What each pick pass reads, in order (the last one repeats). */
let answers: Answer[];
/** Maps each pick's readback, in order. */
let mappers: Array<() => void>;
/** Map at once (true), or wait for the test (`release`). */
let mapAtOnce: boolean;
let now: number;

/**
 * Answers each pick pass as the GPU would: the readback holds `answers`'
 * next feature ID and depth, and maps when the test says so.
 */
function answerPicks(): void {
  const picks = (engine as unknown as Internals).picks;
  picks.push = (...items) => {
    const maps = mappers;
    for (const item of items) {
      const answer = answers.length > 1 ? answers.shift()! : answers[0]!;
      const words = new Uint32Array(4);
      words[0] = answer.featureId;
      new Float32Array(words.buffer)[1] = answer.depth;
      let map!: () => void;
      const mapped = new Promise<void>((resolve) => (map = resolve));
      if (mapAtOnce) {
        map();
      }
      maps.push(map);
      item.readback = {
        mapAsync: () => mapped,
        getMappedRange: () => words.buffer.slice(0),
        unmap: () => {},
        destroy: () => {},
      } as unknown as GPUBuffer;
    }
    return Array.prototype.push.apply(picks, items);
  };
}

/** Lets mapped readbacks' callbacks run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** The global feature ID of `draw`'s first feature. */
function firstFeature(w: World, d: DrawHandle): number {
  for (let id = 1; id < 10_000; id++) {
    if (w.feature(id)?.draw.index === d.index) {
      return id;
    }
  }
  throw new Error("no feature for the draw");
}

/** A camera 1 km above the equator at the prime meridian, looking down (Earth-fixed). */
function above(): Camera {
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

/**
 * Where the pick pass's pixel `(x, y)` at reverse-Z `depth` is, seen from
 * `camera` (as Engine.ts turns a pick's depth into a position): the depth
 * is near / distance along the view axis.
 */
function expectedAt(
  camera: {
    position: ArrayLike<number>;
    direction: ArrayLike<number>;
    up: ArrayLike<number>;
    right: ArrayLike<number>;
    near: number;
  },
  fovy: number,
  x: number,
  y: number,
  depth: number,
): number[] {
  const tanY = Math.tan(fovy / 2);
  const tanX = tanY * (WIDTH / HEIGHT);
  const ndcX = ((x + 0.5) / WIDTH) * 2 - 1;
  const ndcY = 1 - ((y + 0.5) / HEIGHT) * 2;
  const z = camera.near / depth;
  return [0, 1, 2].map(
    (i) =>
      camera.position[i]! +
      z *
        (camera.direction[i]! +
          ndcX * tanX * camera.right[i]! +
          ndcY * tanY * camera.up[i]!),
  );
}

/** `Rᵀ (p - t)` for a column-major rigid `m`: anchor ← render space. */
function intoAnchor(m: Float64Array, p: ArrayLike<number>): number[] {
  const d = [p[0]! - m[12]!, p[1]! - m[13]!, p[2]! - m[14]!];
  return [0, 1, 2].map(
    (c) => m[c * 4]! * d[0]! + m[c * 4 + 1]! * d[1]! + m[c * 4 + 2]! * d[2]!,
  );
}

const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

beforeEach(async () => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  engine = await fakeEngine();
  answers = [];
  mappers = [];
  mapAtOnce = true;
  answerPicks();
  world = engine.createWorld({ maxDraws: 16 });
  earth = world.bodyAnchor(EARTH);
  draw = world.addDraw({
    mesh: world.addMesh(createBox()),
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
    name: "box",
  });
  featureId = firstFeature(world, draw);
  view = engine.addView({
    target: new OffscreenTarget(WIDTH, HEIGHT),
    world,
  });
  view.setCameraFromAnchor(earth, above());
});

afterEach(() => {
  engine.destroy();
  vi.restoreAllMocks();
});

describe("View.pickPoint", () => {
  it("gives the render-space position, its anchor, the draw and the feature", async () => {
    const depth = Math.fround(view.camera.near / 1000);
    answers = [{ featureId, depth }];
    const point = view.pickPoint(32, 24);
    const position = view.pickPosition(32, 24);
    const feature = view.pick(32, 24);
    for (let i = 0; i < 3; i++) {
      engine.renderFrame();
      await settle();
    }
    const pick = (await point)!;
    expect(pick).toBeDefined();
    expect(pick.view).toBe(view);
    expect(pick.root).toBe(world.root);
    expect(pick.anchor).toBe(earth);
    expect(pick.draw?.index).toBe(draw.index);
    expect(pick.draw?.generation).toBe(draw.generation);
    expect(pick.feature).toEqual({ featureId, name: "box" });
    expect(pick.feature).toEqual(await feature);
    expect(pick.seconds).toBe(0); // no scene clock
    // On the default rig every placement is the identity: render space is
    // Earth-fixed, and the two positions agree bit for bit.
    const fovy = view.camera.fovy(WIDTH / HEIGHT);
    const expected = expectedAt(view.camera, fovy, 32, 24, depth);
    expect(distance(pick.position, expected)).toBeLessThan(1e-6);
    expect(Array.from(pick.anchorPosition)).toEqual(Array.from(pick.position));
    // pickPosition: the body anchor's (Earth-fixed) coordinates, as before.
    expect(Array.from((await position)!)).toEqual(
      Array.from(pick.anchorPosition),
    );
    // The camera it was read with, in the anchor's coordinates, and the
    // view's size in CSS pixels (an offscreen target is at 1).
    expect(Array.from(pick.camera.position)).toEqual(
      Array.from(view.camera.position),
    );
    expect(Array.from(pick.camera.direction)).toEqual(
      Array.from(view.camera.direction),
    );
    expect(pick.camera.fovy).toBe(fovy);
    expect(pick.camera.near).toBe(view.camera.near);
    expect(pick.camera.width).toBe(WIDTH);
    expect(pick.camera.height).toBe(HEIGHT);
  });

  it("resolves undefined over the sky; with depth but no draw, gives the body anchor", async () => {
    answers = [
      { featureId: 0, depth: 0 },
      { featureId: 0, depth: view.camera.near / 1000 },
    ];
    const sky = view.pickPoint(1, 1);
    engine.renderFrame();
    const bare = view.pickPoint(32, 24);
    engine.renderFrame();
    await settle();
    expect(await sky).toBeUndefined();
    const pick = (await bare)!;
    expect(pick.draw).toBeUndefined();
    expect(pick.feature).toBeUndefined();
    expect(pick.anchor).toBe(earth);
    expect(Array.from(pick.anchorPosition)).toEqual(Array.from(pick.position));
  });

  it("a draw under no anchor is in the table root's coordinates", async () => {
    const loose = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
    });
    // The table root placed off the identity, by hand.
    const placement = new Float64Array(16);
    placement[0] = placement[5] = placement[10] = placement[15] = 1;
    placement[12] = 5;
    view.setAnchorPlacement(undefined, placement);
    answers = [
      { featureId: firstFeature(world, loose), depth: view.camera.near / 10 },
    ];
    const point = view.pickPoint(32, 24);
    engine.renderFrame();
    await settle();
    const pick = (await point)!;
    expect(pick.anchor).toBeUndefined();
    expect(pick.draw?.index).toBe(loose.index);
    const back = intoAnchor(placement, pick.position);
    expect(distance(pick.anchorPosition, back)).toBeLessThan(1e-9);
    expect(pick.anchorPosition[0]! - pick.position[0]!).toBeCloseTo(-5, 9);
  });

  it("with a GCRF rig and the clock at 3,600×, reports the tick it read, even resolving three ticks later (Review Focus 3)", async () => {
    const catalog = createFrameCatalog();
    const resolver = createFramesResolver(catalog);
    const clock = new Clock({ time: T0, rate: 3600, mode: "playing" });
    const gcrf = catalog.get("GCRF");
    engine.cameras.setResolver(world, resolver);
    engine.cameras.setClock(world, clock);
    engine.cameras.setRig(view, {
      position: { frame: gcrf },
      orientation: { kind: "free" },
    });
    view.setCameraFromAnchor(earth, above());
    /** One tick of the loop: the clock moves a minute, then a render. */
    const tick = () => {
      now += 1000 / 60;
      clock.tick(now);
      engine.renderFrame();
    };
    tick();
    tick();
    mapAtOnce = false;
    const depth = Math.fround(view.camera.near / 1000);
    answers = [{ featureId, depth }];
    const point = view.pickPoint(32, 24);
    const position = view.pickPosition(32, 24);
    tick(); // tick n: the pick pass reads its image
    expect(mappers).toHaveLength(1);
    const seconds = clock.seconds;
    const placement = view.anchorPlacement(earth);
    const camera = view.anchorCamera(earth);
    const renderEye = Float64Array.from(view.camera.position);
    tick(); // the pickPosition reads at tick n + 1
    tick();
    tick();
    expect(mappers).toHaveLength(2);
    // The Earth turned under the GCRF root since tick n.
    const later = view.anchorPlacement(earth);
    expect(clock.seconds - seconds).toBeCloseTo(180, 6);
    mappers[0]!(); // resolves at tick n + 3
    mappers[1]!();
    await settle();
    const pick = (await point)!;
    expect(pick.root).toBe(gcrf);
    expect(pick.anchor).toBe(earth);
    expect(pick.seconds).toBe(seconds);
    // The camera of tick n, in the Earth's anchor.
    expect(Array.from(pick.camera.position)).toEqual(
      Array.from(camera.position),
    );
    expect(Array.from(pick.camera.direction)).toEqual(
      Array.from(camera.direction),
    );
    expect(Array.from(pick.camera.up)).toEqual(Array.from(camera.up));
    // The render-space position from tick n's camera (the free rig keeps
    // it in GCRF), and the anchor position through tick n's placement.
    const fovy = view.camera.fovy(WIDTH / HEIGHT);
    const inRender = expectedAt(
      { ...view.camera, position: renderEye, near: view.camera.near },
      fovy,
      32,
      24,
      depth,
    );
    expect(distance(pick.position, inRender)).toBeLessThan(1e-6);
    expect(
      distance(pick.anchorPosition, intoAnchor(placement, pick.position)),
    ).toBeLessThan(1e-6);
    // Mixed with tick n + 3's placement it would be kilometres off.
    expect(
      distance(pick.anchorPosition, intoAnchor(later, pick.position)),
    ).toBeGreaterThan(1000);
    // On the ground (the camera was 1 km up, looking down), 1 km from the
    // eye of tick n.
    const radius = (p: ArrayLike<number>) => Math.hypot(p[0]!, p[1]!, p[2]!);
    expect(radius(pick.anchorPosition)).toBeCloseTo(R, 3);
    expect(distance(pick.anchorPosition, camera.position)).toBeCloseTo(1000, 0);
    // pickPosition, read at tick n + 1 with that tick's camera in the
    // Earth's anchor: Earth-fixed coordinates of the ground, a minute of
    // the Earth's turn (about 28 km here) from tick n's.
    const own = (await position)!;
    expect(radius(own)).toBeCloseTo(R, 3);
    expect(distance(own, pick.anchorPosition)).toBeGreaterThan(20_000);
  });

  it("an idle view's pick reads its last render's tick", async () => {
    const clock = new Clock({ time: T0 });
    engine.cameras.setClock(world, clock);
    const internals = engine as unknown as Internals;
    // Ticks until idle: the last image is the one picks then read.
    for (let i = 0; i < 4; i++) {
      internals.tick();
    }
    const idle = engine.stats.framesRendered;
    internals.tick();
    expect(engine.stats.framesRendered).toBe(idle);
    const seconds = clock.seconds;
    // The table's default rig doesn't move with time: no render.
    clock.time = T0 + 60_000;
    const rendered = engine.stats.framesRendered;
    answers = [{ featureId, depth: view.camera.near / 1000 }];
    const point = view.pickPoint(32, 24);
    internals.tick();
    await settle();
    expect(engine.stats.framesRendered).toBe(rendered);
    const pick = (await point)!;
    expect(pick.seconds).toBe(seconds);
    expect(pick.anchor).toBe(earth);
  });
});
