// The Earth's content hangs under the Earth's anchor (plan 5a, Task 10):
// tilesets, the globe, models, point sources, vector layers and height
// captures default to `world.bodyAnchor(EARTH)`, and to a given anchor when
// asked. Selection, clamping, view links and the Viewer work with the camera
// in that anchor, so a view whose Earth anchor is turned (as a rig on an
// inertial reference frame turns it) selects, clamps and links as one where
// it isn't. The fake engine of test/fakeGpu.ts; a stubbed `fetch` serves
// tileset.json and `engine.loadGltf` answers with one triangle, as in
// test/tilesetPlacement.test.ts.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { HeightClamping } from "../src/scene/HeightClamping.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { ViewLink } from "../src/scene/ViewLink.ts";
import type { AnchorHandle, World } from "../src/scene/World.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { PointSource } from "../src/vector/PointSource.ts";
import { VectorLayer } from "../src/vector/VectorLayer.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/earth/";
const URL_ = `${BASE}tileset.json`;

/** One triangle, one draw, the default material (as test/models.test.ts). */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** A one-tile tileset at the equator and prime meridian. */
const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

function serve(): void {
  vi.stubGlobal("fetch", async (input: string | URL) => {
    if (String(input) === URL_) {
      return new Response(JSON.stringify(TILESET), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
}

/** A rotation by `angle` about z, then a translation by `t` (column-major). */
function rotationZ(angle: number, t: readonly number[] = [0, 0, 0]) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  // prettier-ignore
  return Float64Array.of(
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    t[0]!, t[1]!, t[2]!, 1,
  );
}

/** A camera looking down at Philadelphia from about 1 km up (Earth-fixed). */
function pose(): Camera {
  const camera = new Camera();
  camera.position.set([1_253_000.37, -4_733_000.81, 4_074_000.06]);
  camera.direction.set([-0.19, 0.72, -0.62]);
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

function expectClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  tolerance: number,
): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(tolerance);
  }
}

let engine: Engine;
const views: View[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
  vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
});

afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  vi.unstubAllGlobals();
});

function addView(world: World): View {
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  return view;
}

/** Loads the tile's content (selection by hand, as the engine would). */
async function loadTile(tileset: Tileset3D): Promise<void> {
  const view: SelectionView = {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
  for (let i = 0; i < 100 && tileset.root.state !== "ready"; i++) {
    tileset.update([view]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(tileset.root.state).toBe("ready");
}

describe("the Earth's content under its anchor (plan 5a, Task 10)", () => {
  it("tilesets and the globe hang under the Earth's anchor, or the one given", async () => {
    serve();
    const world = engine.createWorld();
    const tileset = await Tileset3D.load(engine, world, URL_);
    const earth = world.bodyAnchor(EARTH);
    expect(tileset.anchor).toBe(earth);
    await loadTile(tileset);
    expect(world.anchorOf(tileset.root.placement!.transform)).toBe(earth);

    const site = world.addAnchor("site");
    const onSite = await Tileset3D.load(engine, world, URL_, { anchor: site });
    expect(onSite.anchor).toBe(site);
    await loadTile(onSite);
    expect(world.anchorOf(onSite.root.placement!.transform)).toBe(site);
    // Only this world's anchors.
    const elsewhere = engine.createWorld().addAnchor("elsewhere");
    await expect(
      Tileset3D.load(engine, world, URL_, { anchor: elsewhere }),
    ).rejects.toThrow(/Tileset3D: elsewhere is not an anchor of this world/);

    const globe = engine.addEllipsoid(world);
    const siteGlobe = engine.addEllipsoid(world, { anchor: site });
    try {
      expect(globe.anchor).toBe(earth);
      expect(siteGlobe.anchor).toBe(site);
    } finally {
      engine.removeTileset(globe);
      engine.removeTileset(siteGlobe);
    }
  });

  it("models hang under the Earth's anchor, or the one given, or their parent's", () => {
    const world = engine.createWorld();
    const model = engine.uploadModel(world, triangle(), {
      releaseSourceData: false,
    });
    const earth = world.bodyAnchor(EARTH);
    const site = world.addAnchor("site");
    const placed = model.place({ modelMatrix: m4.mat4() });
    expect(world.anchorOf(placed.transform)).toBe(earth);
    const at = model.place({ at: { longitude: 10, latitude: 20 } });
    expect(world.anchorOf(at.transform)).toBe(earth);
    const onSite = model.place({ modelMatrix: m4.mat4(), anchor: site });
    expect(world.anchorOf(onSite.transform)).toBe(site);
    // A parent's anchor is the model's; a different one given is refused.
    const child = model.place({
      modelMatrix: m4.mat4(),
      parent: onSite.transform,
    });
    expect(world.anchorOf(child.transform)).toBe(site);
    expect(() =>
      model.place({
        modelMatrix: m4.mat4(),
        parent: onSite.transform,
        anchor: earth,
      }),
    ).toThrow(/place: the parent hangs under site, not Earth/);
    // Clamped content stands on the Earth.
    expect(() =>
      model.place({
        at: { longitude: 10, latitude: 20 },
        heightReference: "clampToGround",
        anchor: site,
      }),
    ).toThrow(/place: a heightReference clamps to the Earth's ground/);
    const clamped = model.place({
      at: { longitude: 10, latitude: 20 },
      heightReference: "clampToGround",
    });
    expect(world.anchorOf(clamped.transform)).toBe(earth);
    const elsewhere = engine.createWorld().addAnchor("elsewhere");
    expect(() =>
      model.place({ modelMatrix: m4.mat4(), anchor: elsewhere }),
    ).toThrow(/place: elsewhere is not an anchor of this world/);
    model.release();
  });

  it("point sources, their layers, model pools and height captures hang under the Earth's anchor, or the one given", async () => {
    vi.stubGlobal("location", { href: "https://tiles.test/" });
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const site = world.addAnchor("site");
    const origin = v3.vec3(R, 0, 0);
    const capture = engine.addHeightCapture(world, {
      origin,
      halfExtent: 100,
      size: 4,
    });
    const siteCapture = engine.addHeightCapture(world, {
      origin,
      halfExtent: 100,
      size: 4,
      anchor: site,
    });
    expect(capture.anchor).toBe(earth);
    expect(siteCapture.anchor).toBe(site);
    engine.removeHeightCapture(capture);
    engine.removeHeightCapture(siteCapture);

    const source = new PointSource(engine, world, { capacity: 4, origin });
    expect(source.anchor).toBe(earth);
    const onSite = new PointSource(engine, world, {
      capacity: 4,
      origin,
      anchor: site,
      clamp: { halfExtent: 100, size: 4 },
    });
    expect(onSite.anchor).toBe(site);
    expect(onSite.heights!.anchor).toBe(site);

    // The anchor of each draw's transform: its own (under `parent`) or a
    // shared one (a model's nodes).
    const parents: Array<AnchorHandle | undefined> = [];
    const addDraw = world.addDraw.bind(world);
    vi.spyOn(world, "addDraw").mockImplementation((options) => {
      const draw = addDraw(options);
      const under = options.transform ?? options.parent;
      parents.push(under && world.anchorOf(under));
      return draw;
    });
    const style = {
      layers: [
        { shape: "circle", size: 8, fill: { color: "#ff0000" } },
        { shape: "model('truck')" },
      ],
    };
    const layer = await VectorLayer.create(engine, world, {
      source,
      style,
      models: { truck: "truck.glb" },
      slots: 2,
    });
    const siteLayer = await VectorLayer.create(engine, world, {
      source: onSite,
      style,
      models: { truck: "truck.glb" },
      slots: 2,
    });
    // The layers' symbols and their pools' models, under their sources'
    // anchors.
    expect(parents.length).toBeGreaterThanOrEqual(4);
    const half = parents.length / 2;
    expect(parents.slice(0, half).every((p) => p === earth)).toBe(true);
    expect(parents.slice(half).every((p) => p === site)).toBe(true);
    // A layer given another anchor than its source's is refused.
    await expect(
      VectorLayer.create(engine, world, { source, style, anchor: site }),
    ).rejects.toThrow(
      /VectorLayer: the source's points are under Earth, not site/,
    );
    layer.destroy();
    siteLayer.destroy();
    source.destroy();
    onSite.destroy();
  });

  it("selection reads the camera in the tileset's anchor: a turned Earth selects as one that isn't", async () => {
    serve();
    const world = engine.createWorld({ maxDraws: 64 });
    const earth = world.bodyAnchor(EARTH);
    const site = world.addAnchor("site");
    const tileset = await engine.addTileset(world, URL_);
    const siteTileset = await engine.addTileset(world, URL_, { anchor: site });
    try {
      const still = addView(world);
      still.camera.copyFrom(pose());
      const turned = addView(world);
      turned.setAnchorPlacement(earth, rotationZ(0.3));
      turned.setCameraFromAnchor(earth, pose());
      // The site, a kilometer east of the Earth's center and turned.
      turned.setAnchorPlacement(site, rotationZ(-1.1, [1000, 0, 0]));
      const selected = new Map<Tileset3D, SelectionView[]>();
      for (const t of [tileset, siteTileset]) {
        vi.spyOn(t, "update").mockImplementation((v) => {
          selected.set(t, v);
        });
      }
      engine.renderFrame();
      const [a, b] = selected.get(tileset)!;
      expect(a!.id).not.toBe(b!.id);
      expectClose(b!.position, a!.position, 1e-9);
      expectClose(b!.direction, a!.direction, 1e-12);
      expect(b!.planes.length).toBe(a!.planes.length);
      for (let k = 0; k < a!.planes.length / 4; k++) {
        expectClose(
          b!.planes.subarray(k * 4, k * 4 + 3),
          a!.planes.subarray(k * 4, k * 4 + 3),
          1e-12,
        );
        // An offset is -n·p (plus 500,000 km on the far plane): the
        // camera's re-expressed coordinates carry about one float64 step of
        // rounding (about a nanometer at 6,400 km), so a nanometer, or two
        // float64 steps of the larger of the offset and the camera's
        // distance from the Earth's center (2.8 nm here; 0.22 µm on the
        // far plane).
        const d = a!.planes[k * 4 + 3]!;
        const scale = Math.max(Math.abs(d), v3.length(a!.position));
        expect(Math.abs(b!.planes[k * 4 + 3]! - d)).toBeLessThanOrEqual(
          Math.max(1e-9, 2 * Number.EPSILON * scale),
        );
      }
      expect(
        Math.abs(b!.cartographic.longitude - a!.cartographic.longitude),
      ).toBeLessThanOrEqual(1e-12);
      expect(
        Math.abs(b!.cartographic.latitude - a!.cartographic.latitude),
      ).toBeLessThanOrEqual(1e-12);
      // The height is the camera's distance from the ellipsoid, found from
      // its coordinates: the same rounding as the planes' offsets.
      expect(
        Math.abs(b!.cartographic.height - a!.cartographic.height),
      ).toBeLessThanOrEqual(2 * Number.EPSILON * v3.length(a!.position));
      // The site's tileset selects with each view's camera in the site's
      // anchor (its own, not the last view's).
      const [r, s] = selected.get(siteTileset)!;
      for (const [entry, view] of [
        [r, still],
        [s, turned],
      ] as const) {
        const inSite = view.anchorCamera(site);
        expectClose(entry!.position, inSite.position, 1e-9);
        expectClose(entry!.direction, inSite.direction, 1e-12);
      }
      expect(v3.distance(r!.position, s!.position)).toBeGreaterThan(1000);
    } finally {
      engine.removeTileset(tileset);
      engine.removeTileset(siteTileset);
    }
  });

  it("clamping and sampleHeightMostDetailed cast their rays in the Earth's anchor", async () => {
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    // A collision tileset, as clamping sees one.
    const tiles = {
      world,
      anchor: earth,
      url: URL_,
      show: true,
      enableCollision: true,
      terrain: false,
      changedAt: 1,
      onHeightsChanged: () => () => {},
      exactHeight: () => undefined,
      surfaceHeight: () => undefined,
      terrainClipped: () => false,
      ownsDraw: () => false,
    } as unknown as Tileset3D;
    const clamping = new HeightClamping(
      () => [tiles],
      () => 1,
      async (_w, positions) => positions.map(() => undefined),
    );
    clamping.add(world, world.addTransform(m4.mat4(), earth), {
      heightReference: "clampToGround",
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    clamping.update();
    expect(cast).toHaveBeenCalledTimes(1);
    expect(cast.mock.calls[0]![1]).toMatchObject({
      anchor: earth,
      collisionOnly: true,
    });

    cast.mockClear();
    const draws = [] as never[];
    const sampled = {
      world,
      anchor: earth,
      queryRays: async () => ({ draws, release: () => {} }),
      terrainClipped: () => false,
    } as unknown as Tileset3D;
    await engine.sampleHeightMostDetailed(
      world,
      [{ longitude: 0, latitude: 0 }],
      { tilesets: [sampled] },
    );
    expect(cast).toHaveBeenCalledTimes(1);
    expect(cast.mock.calls[0]![1]).toMatchObject({ anchor: earth, draws });
    // A tileset given under another anchor is refused, naming both.
    const elsewhere = {
      ...sampled,
      url: "https://tiles.test/site/tileset.json",
      anchor: world.addAnchor("site"),
    } as unknown as Tileset3D;
    await expect(
      engine.sampleHeightMostDetailed(world, [{ longitude: 0, latitude: 0 }], {
        tilesets: [elsewhere],
      }),
    ).rejects.toThrow(
      /sampleHeightMostDetailed: the tileset https:\/\/tiles\.test\/site\/tileset\.json is under site, not the Earth's anchor/,
    );
  });

  it("a view link gives the target the source's pose in the Earth's anchor", () => {
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    world.bodyAnchor(MOON);
    const still = addView(world);
    const turned = addView(world);
    turned.setAnchorPlacement(earth, rotationZ(0.3, [5000, -2000, 700]));
    for (const [source, target] of [
      [turned, still],
      [still, turned],
    ] as const) {
      source.setCameraFromAnchor(earth, pose());
      target.camera.copyFrom(new Camera());
      const link = new ViewLink(source, target, { modes: ["mirror"] });
      link.evaluate();
      const got = target.anchorCamera(earth);
      const want = pose();
      expectClose(got.position, want.position, 1e-9);
      for (const key of ["direction", "up", "right"] as const) {
        expectClose(got[key], want[key], 1e-12);
      }
      link.dispose();
    }
    // The footprint is drawn in the Earth's anchor: the same ground from a
    // turned source as from one that isn't.
    const footprint = (source: View) => {
      source.setCameraFromAnchor(earth, pose());
      const link = new ViewLink(source, still, { modes: ["footprint"] });
      link.evaluate();
      const overlay = still.overlays.at(-1)!;
      const positions = overlay.positions.slice(0, overlay.count * 3);
      link.dispose();
      return positions;
    };
    const fromStill = footprint(still);
    expect(fromStill.length).toBeGreaterThan(0);
    expectClose(footprint(turned), fromStill, 1e-6);
  });
});

describe("an anchor placement change on demand (plan 5a, Task 10)", () => {
  let now = 0;
  let queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;

  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
  });

  async function frames(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  it("wakes the engine and renders the view", async () => {
    now = 1000;
    queue = new Map();
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const view = addView(world);
    view.camera.copyFrom(pose());
    engine.start();
    await frames(30);
    expect(queue.size).toBe(0);
    const before = engine.stats.framesRendered;
    view.setAnchorPlacement(earth, rotationZ(0.3));
    expect(queue.size).toBe(1);
    await frames(30);
    expect(engine.stats.framesRendered - before).toBe(1);
    expect(queue.size).toBe(0);
  });
});

describe("the Viewer's camera through the Earth's anchor (plan 5a, Task 10)", () => {
  function element() {
    const device = fakeDevice({});
    const el = {
      style: {},
      dataset: {},
      width: 300,
      height: 150,
      clientWidth: 300,
      clientHeight: 150,
      append: () => {},
      remove: () => {},
      addEventListener: () => {},
      getContext: () => ({
        configure: () => {},
        unconfigure: () => {},
        getCurrentTexture: () =>
          device.createTexture({
            size: [el.width, el.height],
            format: "bgra8unorm",
            usage: 0x10,
          }),
      }),
      getBoundingClientRect: () =>
        ({ left: 0, top: 0, width: 300, height: 150 }) as DOMRect,
    };
    return el;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
  });

  it("zoomTo and the orbit controls pose the camera in the Earth's anchor", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal("document", { createElement: () => element() });
    vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
    vi.stubGlobal("devicePixelRatio", 1);
    const { Viewer } = await import("../widgets/Viewer.ts");
    const make = () =>
      Viewer.create(element() as unknown as HTMLElement, {
        engine,
        globe: false,
        imagery: false,
        credits: false,
        timeControls: false,
        stars: false,
        moon: false,
        cityLights: false,
      });
    const still = await make();
    const turned = await make();
    try {
      const earthOf = (v: typeof still) => v.world.bodyAnchor(EARTH);
      turned.view.setAnchorPlacement(
        earthOf(turned),
        rotationZ(0.3, [5000, -2000, 700]),
      );
      const compare = () => {
        const a = still.view.anchorCamera(earthOf(still));
        const b = turned.view.anchorCamera(earthOf(turned));
        expectClose(b.position, a.position, 1e-6);
        for (const key of ["direction", "up", "right"] as const) {
          expectClose(b[key], a[key], 1e-12);
        }
      };
      for (const v of [still, turned]) {
        v.zoomTo({ longitude: -75.16, latitude: 39.95, range: 2000 });
      }
      compare();
      for (const v of [still, turned]) {
        v.setControls("orbit", { pitch: -0.6 });
      }
      compare();
      for (const v of [still, turned]) {
        v.zoomTo({ longitude: -75.2, latitude: 39.9, range: 800 });
      }
      compare();
    } finally {
      still.destroy();
      turned.destroy();
    }
  });
});
