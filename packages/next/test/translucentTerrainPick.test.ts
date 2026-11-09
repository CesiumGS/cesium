// The engine's part of a pick on translucent terrain: the CPU ray's hit
// (Globe.stoppingTerrainHit) is turned into a reverse-Z depth and a
// feature, and stands in for the GPU's pick where it is nearer
// (`translucentTerrainPick` and `resolvePicks`, render/view/picks.ts). The globe is a stub that
// answers the ray; test/terrainTranslucency.test.ts covers the real ray.
// The engine runs on the fake device of test/fakeGpu.ts and the tests
// answer each pick's readback as the GPU's pick pass would, as
// test/corePick.test.ts does.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Globe } from "../src/globe/Globe.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const WIDTH = 64;
const HEIGHT = 48;

interface Hit {
  distance: number;
  draw: DrawHandle | undefined;
}
type HitFn = (
  origin: ArrayLike<number>,
  direction: ArrayLike<number>,
  viewMask?: number,
) => Hit | undefined;

let engine: Engine;
let world: World;
let earth: AnchorHandle;
let view: View;
let boxDraw: DrawHandle;
let tileDraw: DrawHandle;
/** What the next pick pass reads: a feature ID and a reverse-Z depth. */
let gpu: { featureId: number; depth: number };

const settle = () => new Promise((resolve) => setImmediate(resolve));

function firstFeature(w: World, d: DrawHandle): number {
  for (let id = 1; id < 10_000; id++) {
    if (w.feature(id)?.draw.index === d.index) {
      return id;
    }
  }
  throw new Error("no feature for the draw");
}

/** Answers each pick pass as the GPU would (pick.slang). */
function answerPicks(): void {
  const picks = engine.raster.picks;
  picks.push = (...items) => {
    for (const item of items) {
      const words = new Uint32Array(4);
      words[0] = gpu.featureId;
      new Float32Array(words.buffer)[1] = gpu.depth;
      item.readback = {
        mapAsync: () => Promise.resolve(),
        getMappedRange: () => words.buffer.slice(0),
        unmap: () => {},
        destroy: () => {},
      } as unknown as GPUBuffer;
    }
    return Array.prototype.push.apply(picks, items);
  };
}

/** A globe's stand-in in the engine's list: only what the pick reads. */
function addGlobe(
  hit: HitFn,
  options: { show?: boolean; anchor?: AnchorHandle | undefined } = {},
) {
  // A Globe in the engine's eyes (instanceof) that answers only the ray.
  const globe = Object.defineProperties(Object.create(Globe.prototype), {
    world: { value: world, writable: true },
    show: { value: options.show ?? true, writable: true },
    anchor: {
      value: "anchor" in options ? options.anchor : earth,
      writable: true,
    },
    update: { value: () => {} },
    stoppingTerrainHit: { value: vi.fn(hit) },
  }) as { stoppingTerrainHit: ReturnType<typeof vi.fn<HitFn>> };
  (engine.tilesets as unknown[]).push(globe);
  return globe;
}

async function pickAt(): Promise<
  Awaited<ReturnType<View["pickPoint"]>> | undefined
> {
  const point = view.pickPoint(32, 24);
  for (let i = 0; i < 3; i++) {
    engine.renderFrame();
    await settle();
  }
  return point;
}

beforeEach(async () => {
  vi.spyOn(performance, "now").mockImplementation(() => 1000);
  engine = await fakeEngine();
  answerPicks();
  world = engine.createWorld({ maxDraws: 16 });
  earth = world.bodyAnchor(EARTH);
  const mesh = world.addMesh(createBox());
  boxDraw = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
    name: "box",
  });
  tileDraw = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
    name: "tile",
  });
  view = engine.addView({
    target: new OffscreenTarget(WIDTH, HEIGHT),
    world,
  });
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.of(0, 0, 1));
  view.setCameraFromAnchor(earth, camera);
  // The GPU's pick: the box, 1,000 m away.
  gpu = {
    featureId: firstFeature(world, boxDraw),
    depth: Math.fround(view.camera.near / 1000),
  };
});

afterEach(() => {
  (engine.tilesets as unknown[]).length = 0;
  engine.destroy();
  vi.restoreAllMocks();
});

describe("a pick that translucent terrain may stop", () => {
  it("is asked with the pick's ray: from the camera, 1 long along the view axis, in the view's bit", async () => {
    const globe = addGlobe(() => undefined);
    await pickAt();
    expect(globe.stoppingTerrainHit).toHaveBeenCalledTimes(1);
    const [origin, direction, mask] = globe.stoppingTerrainHit.mock.calls[0]!;
    expect(Array.from(origin)).toEqual(Array.from(view.camera.position));
    const along = [0, 1, 2].reduce(
      (sum, k) => sum + direction[k]! * view.camera.direction[k]!,
      0,
    );
    expect(along).toBeCloseTo(1, 12);
    expect(Number.isInteger(Math.log2(mask!))).toBe(true);
  });

  it("stands in for the GPU's pick where its hit is nearer, with its tile's feature", async () => {
    const feature = firstFeature(world, tileDraw);
    addGlobe(() => ({ distance: 400, draw: tileDraw }));
    const pick = (await pickAt())!;
    expect(pick.feature).toEqual({ featureId: feature, name: "tile" });
    expect(pick.draw?.index).toBe(tileDraw.index);
    // Reverse-Z: the depth is near / distance along the view axis, so the
    // position is 400 m from the camera along the view axis.
    const alongAxis = [0, 1, 2].reduce(
      (sum, k) =>
        sum +
        (pick.position[k]! - view.camera.position[k]!) *
          view.camera.direction[k]!,
      0,
    );
    expect(alongAxis).toBeCloseTo(400, 3);
  });

  it("leaves the GPU's pick where its own is nearer", async () => {
    const feature = firstFeature(world, boxDraw);
    addGlobe(() => ({ distance: 2500, draw: tileDraw }));
    const pick = (await pickAt())!;
    expect(pick.feature?.featureId).toBe(feature);
    expect(pick.draw?.index).toBe(boxDraw.index);
    const alongAxis = [0, 1, 2].reduce(
      (sum, k) =>
        sum +
        (pick.position[k]! - view.camera.position[k]!) *
          view.camera.direction[k]!,
      0,
    );
    expect(alongAxis).toBeCloseTo(1000, 2);
  });

  it("stands in where the GPU saw only sky", async () => {
    gpu = { featureId: 0, depth: 0 };
    addGlobe(() => ({ distance: 700, draw: tileDraw }));
    const pick = (await pickAt())!;
    expect(pick.draw?.index).toBe(tileDraw.index);
  });

  it("ignores a hit nearer than the camera's near plane", async () => {
    const feature = firstFeature(world, boxDraw);
    addGlobe(() => ({ distance: view.camera.near / 2, draw: tileDraw }));
    const pick = (await pickAt())!;
    expect(pick.feature?.featureId).toBe(feature);
  });

  it("takes the nearest of several globes, and a hit with no draw keeps feature 0", async () => {
    addGlobe(() => ({ distance: 600, draw: tileDraw }));
    addGlobe(() => ({ distance: 300, draw: undefined }));
    gpu = { featureId: 0, depth: 0 };
    const pick = (await pickAt())!;
    expect(pick.draw).toBeUndefined();
    expect(pick.feature).toBeUndefined();
    const alongAxis = [0, 1, 2].reduce(
      (sum, k) =>
        sum +
        (pick.position[k]! - view.camera.position[k]!) *
          view.camera.direction[k]!,
      0,
    );
    expect(alongAxis).toBeCloseTo(300, 3);
  });

  it("doesn't ask a hidden globe, one in another world, or one on another anchor", async () => {
    const hidden = addGlobe(() => ({ distance: 400, draw: tileDraw }), {
      show: false,
    });
    const elsewhere = addGlobe(() => ({ distance: 400, draw: tileDraw }), {
      anchor: undefined,
    });
    const other = engine.createWorld({ maxDraws: 4 });
    const foreign = addGlobe(() => ({ distance: 400, draw: tileDraw }));
    (foreign as unknown as { world: World }).world = other;
    const feature = firstFeature(world, boxDraw);
    const pick = (await pickAt())!;
    expect(pick.feature?.featureId).toBe(feature);
    for (const g of [hidden, elsewhere, foreign]) {
      expect(g.stoppingTerrainHit).not.toHaveBeenCalled();
    }
  });
});
