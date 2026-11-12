// The engine's gaps the "Vertical exaggeration" example found (plan §13.26):
// a pick carries the route it was drawn by, so a slider that moves before it
// resolves doesn't change its true point; `View.toPixel` carries a point of an
// anchor through the view's route; a view on ITRF re-roots onto a frame
// across a warp by carrying its camera through the route; the globe controller
// keeps the camera above the ground as drawn; and the world counts its fits.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  routeForward,
  routeInverse,
  warpScaleOf,
  type Route,
} from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { truePick } from "../src/frames/pickTruth.ts";
import {
  verticalExaggeration,
  type VerticalExaggeration,
} from "../src/georeference/heightWarps.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { smoothFrame, type SmoothFrame } from "../src/frames/smoothFrame.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as v3 from "../src/math/vec3.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera, projectToPixel } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { GlobeController } from "../src/scene/GlobeController.ts";
import { createBox, createBillboard } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { fittedOnly } from "./fittedOnly.ts";

const R = 6_378_137;
const WIDTH = 64;
const HEIGHT = 48;
const WGS84 = Ellipsoid.WGS84;

let engine: Engine;
let now: number;
/** What the next pick pass reads, and the callbacks that map each readback. */
let answers: Array<{ featureId: number; depth: number }>;
let mappers: Array<() => void>;

/** Answers each pick pass as the GPU would, and maps it when the test says (as corePick.test.ts). */
function answerPicks(): void {
  const picks = engine.raster.picks;
  picks.push = (...items) => {
    for (const item of items) {
      const answer = answers.length > 1 ? answers.shift()! : answers[0]!;
      const words = new Uint32Array(4);
      words[0] = answer.featureId;
      new Float32Array(words.buffer)[1] = answer.depth;
      let map!: () => void;
      const mapped = new Promise<void>((resolve) => (map = resolve));
      mappers.push(map);
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

const settle = () => new Promise((resolve) => setImmediate(resolve));

const height = (p: ArrayLike<number>) =>
  WGS84.cartesianToCartographic(Float64Array.of(p[0]!, p[1]!, p[2]!), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!.height;

const apart = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** The scale of the route's warp now. */
function scaleOf(route: Route): number {
  const step = route.steps.find((x) => x.kind === "warp");
  if (step?.kind !== "warp") {
    throw new Error("the route crosses no warp");
  }
  return warpScaleOf(step.warp);
}

interface Scene {
  world: World;
  view: View;
  earth: AnchorHandle;
  box: DrawHandle;
  catalog: ReturnType<typeof createFrameCatalog>;
  resolver: ReturnType<typeof createFramesResolver>;
  frame: SmoothFrame;
  scale: { value: number };
  warp: VerticalExaggeration;
  /** Heights are drawn this many times as tall at scale `s`: 1 + 9 s. */
  factor(): number;
}

/** A world with the Earth's anchor placed in the smooth frame `exaggerated` under ITRF, a box on it and a frames resolver; the view not yet rigged. */
function scene(start = 0.5): Scene {
  const world = engine.createWorld({ maxDraws: 16 });
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const scale = world.createPlacementParameter(start, { range: [0, 1] });
  const warp = fittedOnly(verticalExaggeration({ factor: 10, scale }));
  const frame = smoothFrame("exaggerated", catalog.get("ITRF"), warp);
  catalog.add(frame);
  const resolver = createFramesResolver(catalog);
  engine.cameras.setResolver(world, resolver);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, frame);
  const box = world.addDraw({
    mesh: world.addMesh(createBox()),
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
    name: "box",
  });
  const view = engine.addView({
    target: new OffscreenTarget(WIDTH, HEIGHT),
    world,
  });
  return {
    world,
    view,
    earth,
    box,
    catalog,
    resolver,
    frame,
    scale,
    warp,
    factor: () => 1 + 9 * scale.value,
  };
}

/** The camera `h` metres above the equator at the prime meridian, looking straight down. */
function lookDown(camera: Camera, h: number): void {
  camera.position.set([R + h, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.of(0, 0, 1));
  camera.version++;
}

beforeEach(async () => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  engine = await fakeEngine();
  answers = [];
  mappers = [];
  answerPicks();
});

afterEach(() => {
  engine.destroy();
  vi.restoreAllMocks();
});

describe("a pick carries the route it was drawn by", () => {
  it("is read at the scale of the tick it was drawn at, whatever the slider does before it resolves", async () => {
    const s = scene(0.5);
    engine.cameras.setRig(s.view, {
      position: { frame: s.catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    lookDown(s.view.camera, 20_000);
    engine.renderFrame();
    const feature = [...Array(10_000).keys()].find(
      (id) => s.world.feature(id + 1)?.draw.index === s.box.index,
    )!;
    const depth = Math.fround(s.view.camera.near / 15_000);
    answers = [{ featureId: feature + 1, depth }];
    const point = s.view.pickPoint(32, 24);
    engine.renderFrame(); // the tick whose image the pick reads
    expect(mappers).toHaveLength(1);
    const k = s.factor();
    // The slider moves before the pick resolves.
    s.scale.value = 1;
    engine.renderFrame();
    engine.renderFrame();
    mappers[0]!();
    await settle();
    const pick = (await point)!;
    expect(pick).toBeDefined();

    expect(pick.route).toBeDefined();
    expect(scaleOf(pick.route!)).toBe(0.5);
    // Not the view's route, whose warp is at the slider's new place.
    const live = s.view.anchorRoute(s.earth)!;
    expect(scaleOf(live)).toBe(1);

    const truth = truePick(pick);
    expect(truth.how).toBe("inverse");
    expect(truth.provisional).toBe(true);
    // The drawn point at k times its true height; the true one is the same
    // point the pick's own route gives back.
    expect(height(truth.position)).toBeCloseTo(height(pick.position) / k, 6);
    expect(
      apart(truth.position, routeInverse(pick.route!, pick.position)),
    ).toBe(0);
    expect(truth.drawn?.warps[0]?.scale).toBe(0.5);
    // Read with the view's route now it is ×10 off: what a caller had to
    // work around by remembering the factor at the click.
    const late = routeInverse(live, pick.position);
    expect(Math.abs(height(late) - height(truth.position))).toBeGreaterThan(
      100,
    );
    // The anchor position is where it is drawn, not where the content is.
    expect(apart(pick.anchorPosition, pick.position)).toBeLessThan(1e-6);
    expect(apart(pick.anchorPosition, truth.position)).toBeGreaterThan(100);
  });

  it("has no route where the Earth is drawn rigidly", async () => {
    const world = engine.createWorld({ maxDraws: 16 });
    const earth = world.bodyAnchor(EARTH);
    const box = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    const view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    lookDown(view.camera, 1000);
    engine.renderFrame();
    const id = [...Array(10_000).keys()].find(
      (i) => world.feature(i + 1)?.draw.index === box.index,
    )!;
    answers = [
      { featureId: id + 1, depth: Math.fround(view.camera.near / 500) },
    ];
    const point = view.pickPoint(32, 24);
    engine.renderFrame();
    mappers[0]!();
    await settle();
    const pick = (await point)!;
    expect(pick.route).toBeUndefined();
    expect(truePick(pick).how).toBe("depth");
  });
});

describe("View.toPixel through the view's route", () => {
  it("carries a point of the Earth's anchor through the warp, at the scale now", () => {
    const s = scene(0.5);
    engine.cameras.setRig(s.view, {
      position: { frame: s.catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    lookDown(s.view.camera, 40_000);
    engine.renderFrame();
    const route = s.view.anchorRoute(s.earth)!;
    expect(route).toBeDefined();
    // A true point 3 km above the ground, off the camera's axis.
    const p = WGS84.cartographicToCartesian(
      { longitude: 0.0002, latitude: 0.0001, height: 3000 },
      new Float64Array(3),
    );
    const fovy = s.view.camera.fovy(WIDTH / HEIGHT);
    const project = (q: ArrayLike<number>) => {
      const out = new Float64Array(2);
      projectToPixel(s.view.camera, fovy, WIDTH, HEIGHT, q, out);
      return out;
    };
    for (const scale of [0.5, 1, 0]) {
      s.scale.value = scale;
      const drawn = routeForward(route, p);
      expect(height(drawn)).toBeCloseTo(3000 * (1 + 9 * scale), 5);
      const px = s.view.toPixel(p, s.earth)!;
      expect(px).toBeDefined();
      expect(
        Math.hypot(px[0]! - project(drawn)[0]!, px[1]! - project(drawn)[1]!),
      ).toBeLessThan(1e-9);
      // Without a name it is the body's anchor.
      expect(s.view.toPixel(p)).toEqual(px);
    }
    // Drawn at ×10, 27 km nearer the camera and off the axis by more:
    s.scale.value = 1;
    const far = s.view.toPixel(p, s.earth)!;
    s.scale.value = 0;
    const flat = s.view.toPixel(p, s.earth)!;
    expect(Math.hypot(far[0]! - flat[0]!, far[1]! - flat[1]!)).toBeGreaterThan(
      1,
    );
  });

  it("is unchanged for an anchor drawn rigidly", () => {
    const world = engine.createWorld({ maxDraws: 4 });
    const earth = world.bodyAnchor(EARTH);
    const view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    lookDown(view.camera, 1000);
    engine.renderFrame();
    const center = view.toPixel(Float64Array.of(R, 0, 0), earth)!;
    expect(center[0]).toBeCloseTo(WIDTH / 2, 6);
    expect(center[1]).toBeCloseTo(HEIGHT / 2, 6);
    expect(
      view.toPixel(Float64Array.of(R + 2000, 0, 0), earth),
    ).toBeUndefined();
  });
});

describe("a view on ITRF re-roots onto a frame under a smooth edge", () => {
  it("carries the camera down through the edge's inverse, and back up", () => {
    const s = scene(0.5);
    const itrf = s.catalog.get("ITRF");
    engine.cameras.setRig(s.view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    engine.renderFrame();
    expect(engine.cameras.root(s.view)).toBe(itrf);
    // 5 km up over the Alps' latitude, looking north-east and down.
    const eye = WGS84.cartographicToCartesian(
      { longitude: 0.13, latitude: 0.8, height: 5000 },
      new Float64Array(3),
    );
    const target = WGS84.cartographicToCartesian(
      { longitude: 0.1302, latitude: 0.8002, height: 1500 },
      new Float64Array(3),
    );
    const camera = s.view.camera;
    camera.position.set(eye);
    camera.direction.set(
      v3.normalize(v3.vec3(), v3.sub(v3.vec3(), target, eye)),
    );
    camera.orient(WGS84.geodeticSurfaceNormal(eye, v3.vec3())!);
    camera.version++;
    const before = {
      position: Float64Array.from(camera.position),
      direction: Float64Array.from(camera.direction),
    };

    engine.cameras.setRig(s.view, {
      position: { frame: s.frame },
      orientation: { kind: "free" },
    });
    // On the frame: no failure kept the view on ITRF.
    expect(engine.cameras.held(s.view)).toBeUndefined();
    expect(engine.cameras.root(s.view)).toBe(s.frame);
    const k = s.factor();
    // Position: the edge's inverse, so ITRF's 5 km is 5000 / 5.5 m in the content's true coordinates.
    expect(height(camera.position)).toBeCloseTo(5000 / k, 4);
    const down = s.view.anchorRoute(s.earth);
    expect(down === undefined || down.steps.length === 0).toBe(true);
    // Axes: the Jacobian's inverse image of the direction, orthonormal.
    const step = 1;
    const ahead = routeForward(
      s.resolver.route(itrf, s.frame, 0),
      v3.scaleAndAdd(v3.vec3(), before.position, before.direction, step),
    );
    const along = v3.normalize(
      v3.vec3(),
      v3.sub(v3.vec3(), ahead, camera.position),
    );
    expect(apart(camera.direction, along)).toBeLessThan(1e-6);
    expect(v3.length(camera.direction)).toBeCloseTo(1, 12);
    expect(v3.dot(camera.direction, camera.up)).toBeCloseTo(0, 12);
    expect(v3.dot(camera.direction, camera.right)).toBeCloseTo(0, 12);
    // It looks down less steeply than before: heights are shrunk.
    const pitch = (d: ArrayLike<number>, p: ArrayLike<number>) =>
      Math.asin(
        v3.dot(
          d as Float64Array,
          WGS84.geodeticSurfaceNormal(p as Float64Array, v3.vec3())!,
        ),
      );
    expect(pitch(camera.direction, camera.position)).toBeGreaterThan(
      pitch(before.direction, before.position),
    );

    // And back onto ITRF.
    engine.cameras.setRig(s.view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.held(s.view)).toBeUndefined();
    expect(engine.cameras.root(s.view)).toBe(itrf);
    expect(apart(camera.position, before.position)).toBeLessThan(1e-6);
    expect(apart(camera.direction, before.direction)).toBeLessThan(1e-6);
  });
});

describe("the globe controller keeps above the ground as drawn", () => {
  function controllerOn(s: Scene): GlobeController {
    const element = new EventTarget() as EventTarget & Record<string, unknown>;
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
    });
    return new GlobeController(s.view, element as unknown as HTMLElement, {
      onTick: () => () => {},
    });
  }

  it("lifts a camera that is above the true ground but below the drawn one", () => {
    const s = scene(0.5);
    engine.cameras.setRig(s.view, {
      position: { frame: s.catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    // Ground 1,000 m: drawn at ×5.5, 5,500 m. 3,000 m is above one only.
    lookDown(s.view.camera, 3000);
    engine.renderFrame();
    const controller = controllerOn(s);
    controller.surfaceHeight = () => 1000;
    controller.minimumHeight = 1;
    controller.update();
    expect(height(s.view.camera.position)).toBeCloseTo(5500 + 1, 3);
    // The drawn ground follows the slider; a camera above it stays.
    s.scale.value = 1;
    lookDown(s.view.camera, 9000);
    engine.renderFrame();
    controller.update();
    expect(height(s.view.camera.position)).toBeCloseTo(10_001, 3);
    controller.dispose();
  });

  it("is unchanged with no warp, and with no ground known yet", () => {
    const world = engine.createWorld({ maxDraws: 4 });
    world.bodyAnchor(EARTH);
    const view = engine.addView({
      target: new OffscreenTarget(WIDTH, HEIGHT),
      world,
    });
    lookDown(view.camera, 500);
    engine.renderFrame();
    const element = new EventTarget() as EventTarget & Record<string, unknown>;
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
    });
    const controller = new GlobeController(
      view,
      element as unknown as HTMLElement,
      { onTick: () => () => {} },
    );
    controller.surfaceHeight = () => 1000;
    controller.update();
    expect(height(view.camera.position)).toBeCloseTo(1001, 3);
    controller.surfaceHeight = () => undefined;
    lookDown(view.camera, 500);
    controller.update();
    expect(height(view.camera.position)).toBeCloseTo(500, 3);
    controller.dispose();
  });
});

describe("World.warpStats", () => {
  it("counts fits made, refits and placements, and the draws by state", () => {
    const s = scene(0.2);
    engine.cameras.setRig(s.view, {
      position: { frame: s.catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    const none = s.world.warpStats();
    expect(none).toMatchObject({
      fitsRun: 0,
      refits: 0,
      placed: 0,
      replaced: 0,
      moved: 0,
      pending: 0,
      draws: { total: 0 },
    });
    const pin = s.world.addDraw({
      mesh: s.world.addMesh(createBillboard("bottom")),
      parent: s.earth,
      origin: Float64Array.of(R, 0, 0),
      billboard: { size: 30 },
    });
    const step = () => {
      engine.cameras.update();
      s.world.warps.frame(
        [
          {
            id: engine.scene.viewIds.get(s.view)!,
            routes: s.view.anchorRoutes(),
          },
        ],
        Infinity,
        (message) => {
          throw new Error(message);
        },
      );
    };
    step();
    const first = s.world.warpStats();
    expect(s.world.warps.status(pin)?.state).toBe("fitted");
    expect(first.draws.total).toBeGreaterThanOrEqual(2); // the box and the pin
    expect(first.draws.fitted).toBe(first.draws.total);
    expect(first.fitsRun).toBeGreaterThanOrEqual(1); // the box
    expect(first.placed).toBe(1); // the pin
    expect(first.refits).toBe(0);
    expect(first.replaced).toBe(0);
    expect(first.pending).toBe(0);
    // The slider: the pin is placed again, nothing is fitted again.
    s.scale.value = 0.9;
    step();
    const moved = s.world.warpStats();
    expect(moved.fitsRun).toBe(first.fitsRun);
    expect(moved.refits).toBe(0);
    expect(moved.replaced).toBeGreaterThan(0);
    expect(moved.placed).toBeGreaterThan(first.placed);
    // A draw whose transform moves is fitted again with its route as it was.
    const transform = s.world.addTransform(
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1),
      s.earth,
    );
    s.world.addDraw({
      mesh: s.world.addMesh(createBox()),
      transform,
    });
    step();
    const added = s.world.warpStats();
    expect(added.fitsRun).toBe(moved.fitsRun + 1);
    expect(added.moved).toBe(0);
    s.world.setTransform(
      transform,
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 50, 0, 1),
    );
    step();
    const shifted = s.world.warpStats();
    expect(shifted.moved).toBe(1);
    expect(shifted.fitsRun).toBe(added.fitsRun + 1);
    expect(shifted.refits).toBe(0);
    // The warp itself changes: its route's fits are redone.
    s.warp.factor = 20;
    step();
    const redone = s.world.warpStats();
    expect(redone.refits).toBeGreaterThanOrEqual(2);
    expect(redone.draws.fitted).toBe(redone.draws.total);
  });
});
