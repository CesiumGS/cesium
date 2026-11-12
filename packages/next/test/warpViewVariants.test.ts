// Per-view variants of a draw (scene/world/variants.ts): a switch frame whose
// choices differ in structure for different views (an exaggeration for one,
// the identity or another smooth edge for another) is drawn by one draw per
// shape of route, each restricted to its views by the view masks. On the CPU,
// against the routes' own float64 maps and the draws' records; the GPU's side
// is spikes/warpViews.ts.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { routeForward, type Route } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { switchFrame, type SwitchChoice } from "../src/frames/smoothFrame.ts";
import {
  heightOffset,
  verticalExaggeration,
} from "../src/georeference/heightWarps.ts";
import { heightNormalInfo } from "../src/globe/heightNormal.ts";
import { upsampleTerrainTile } from "../src/globe/quantizedMesh.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import {
  COLOR_WORD,
  FEATURE_ID_WORD,
  FLAGS_WORD,
  RECORD_WORDS,
  RecordFlags,
  VIEW_MASK_WORD,
} from "../src/render/layout.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox, type MeshData } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import { weightOf } from "../src/scene/warpEvaluate.ts";
import type { World } from "../src/scene/World.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import { drawnTile } from "../src/streaming/tileWarp.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { gridTile } from "./terrainRayFixtures.ts";

const R = 6_378_137;
const WGS84 = Ellipsoid.WGS84;
const ALL = 0xffffffff;
let engine: Engine;
const worlds: World[] = [];
const views: View[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
});

afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
});

const at = (height: number) =>
  Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + height, 0, 0, 1);

/** The height of a point `height` above the equator at the prime meridian, after the route (none: as it is). */
function heightAfter(route: Route | undefined, height: number): number {
  const p = Float64Array.of(R + height, 0, 0);
  const out = route ? routeForward(route, p, new Float64Array(3)) : p;
  return WGS84.cartesianToCartographic(out, {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!.height;
}

interface Setup {
  world: World;
  earth: AnchorHandle;
  a: View;
  b: View;
  mesh: ReturnType<World["addMesh"]>;
  transform: ReturnType<World["addTransform"]>;
  /** Another view, choosing `choice`, one of the switch's. */
  addView(choice: SwitchChoice): View;
  step(): void;
  settle(): Promise<void>;
  draw: DrawHandle;
}

/**
 * A world whose Earth anchor sits in a switch frame under ITRF: view A sees
 * `choiceA`, view B `choiceB`. Every view's rig is on ITRF. One box draw is
 * under the anchor, and the warp context has run (unless `draw` is false).
 */
async function setup(
  choiceA: SwitchChoice,
  choiceB: SwitchChoice,
  options: { draw?: boolean } = {},
): Promise<Setup> {
  const world = engine.createWorld({ maxDraws: 32 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const byView = new Map<object, SwitchChoice>();
  const rig = (view: View) =>
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
  const spawn = () => {
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    views.push(view);
    return view;
  };
  // A switch takes its choices when it is made, so the views are made first.
  const a = spawn();
  const b = spawn();
  byView.set(a, choiceA);
  byView.set(b, choiceB);
  const frame = switchFrame("chart", itrf, { byView });
  catalog.add(frame);
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, frame);
  engine.cameras.setResolver(world, resolver);
  rig(a);
  rig(b);
  const mesh = world.addMesh(createBox());
  const transform = world.addTransform(at(1000), earth);
  const step = () => {
    engine.cameras.update();
    world.warps.frame(
      views
        .filter((view) => view.world === world)
        .map((view) => ({
          id: engine.scene.viewIds.get(view)!,
          routes: view.anchorRoutes(),
        })),
      Infinity,
      (m) => {
        throw new Error(m);
      },
    );
  };
  // A route's pipelines are made asynchronously: draws wait for them across ticks.
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      step();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    step();
  };
  const draw = world.addDraw({ mesh, transform });
  if (options.draw !== false) {
    await settle();
  }
  return {
    world,
    earth,
    a,
    b,
    mesh,
    transform,
    addView(choice) {
      const view = spawn();
      byView.set(view, choice);
      rig(view);
      return view;
    },
    step,
    settle,
    draw,
  };
}

const bit = (view: View): number =>
  (1 << engine.scene.viewIds.get(view)!) >>> 0;

const maskOf = (world: World, draw: DrawHandle): number =>
  world.raster.recordsU32[draw.index * RECORD_WORDS + VIEW_MASK_WORD]!;

const twinOf = (s: Setup, view: View, draw = s.draw): DrawHandle =>
  s.world.drawForRoute(draw, view.anchorRoute(s.earth));

const removeView = (view: View) => {
  engine.removeView(view);
  views.splice(views.indexOf(view), 1);
};

describe("a switch frame with structurally different choices", () => {
  it("draws an exaggeration for one view and the true place for the other, each by its own draw", async () => {
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity");
    expect(s.world.warpStats().variants).toEqual({ groups: 2, draws: 1 });
    // The source is A's, drawn by its compiled route; the twin is B's, unwarped.
    const twin = twinOf(s, s.b);
    expect(twin.index).not.toBe(s.draw.index);
    expect(twinOf(s, s.a)).toEqual(s.draw);
    expect(s.world.warps.routes.has(s.draw.index)).toBe(true);
    expect(s.world.warps.routes.has(twin.index)).toBe(false);
    expect(s.world.warps.status(twin)).toBeUndefined();
    expect(drawTerms(s.world, twin)).toBeUndefined();
    expect(maskOf(s.world, s.draw)).toBe(bit(s.a));
    expect(maskOf(s.world, twin)).toBe(bit(s.b));
    // Each view's route: A's takes 1000 m to 10 000 m, B's has no smooth edge.
    expect(heightAfter(s.a.anchorRoute(s.earth), 1000)).toBeCloseTo(10_000, 2);
    expect(s.b.anchorRoute(s.earth)).toBeUndefined();
    expect(heightAfter(undefined, 1000)).toBeCloseTo(1000, 6);
    // The twin is the source's draw otherwise: its feature IDs are the source's, so a pick in B finds the source.
    const featureOf = (d: DrawHandle) =>
      s.world.raster.recordsU32[d.index * RECORD_WORDS + FEATURE_ID_WORD]!;
    expect(featureOf(twin)).toBe(featureOf(s.draw));
    expect(s.world.feature(featureOf(twin))?.draw.index).toBe(s.draw.index);
  });

  it("gives each view its own route to picks, and its own map to selection", async () => {
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity");
    const slot = s.earth.slot;
    expect(s.a.pickPlacements().routes[slot]).toBeDefined();
    expect(s.b.pickPlacements().routes[slot]).toBeUndefined();
    const [ida, idb] = [s.a, s.b].map((v) => engine.scene.viewIds.get(v)!);
    // Selection: A's tiles are bounded where the exaggeration puts them, B's where they are.
    const warp = s.world.tileWarp(s.earth, ida!);
    expect(warp).toBeDefined();
    expect(s.world.tileWarp(s.earth, idb!)).toBeUndefined();
    const centre = warp!.bounds([R + 1000, 0, 0]).center;
    expect(centre[0]! - R).toBeCloseTo(10_000, 1);
  });

  it("draws two different smooth edges, each view by the compiled route of its own", async () => {
    const s = await setup(
      verticalExaggeration({ factor: 10 }),
      heightOffset(500),
    );
    expect(s.world.warpStats().variants).toEqual({ groups: 2, draws: 1 });
    const twin = twinOf(s, s.b);
    expect(twin.index).not.toBe(s.draw.index);
    const first = s.world.warps.routes.routeOf(s.draw.index);
    const second = s.world.warps.routes.routeOf(twin.index);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second!.compiled.key).not.toBe(first!.compiled.key);
    expect(s.world.warpStats()).toMatchObject({ fitsRun: 0 });
    // Each program's route is its own view's route in float64.
    const p = Float64Array.of(R + 1000, 12, -7);
    for (const [view, anchor] of [
      [s.a, first!],
      [s.b, second!],
    ] as const) {
      const got = anchor.bridged.route.forward(p, new Float64Array(3));
      const want = routeForward(view.anchorRoute(s.earth)!, p);
      for (let k = 0; k < 3; k++) {
        expect(got[k]).toBeCloseTo(want[k]!, 3);
      }
    }
    expect(heightAfter(s.a.anchorRoute(s.earth), 1000)).toBeCloseTo(10_000, 2);
    expect(heightAfter(s.b.anchorRoute(s.earth), 1000)).toBeCloseTo(1500, 2);
    // Each view's selection runs on its own map.
    const [ida, idb] = [s.a, s.b].map((v) => engine.scene.viewIds.get(v)!);
    const bounds = (id: number) =>
      s.world.tileWarp(s.earth, id)!.bounds([R + 1000, 0, 0]).center[0]! - R;
    expect(bounds(ida!)).toBeCloseTo(10_000, 1);
    expect(bounds(idb!)).toBeCloseTo(1500, 1);
    expect(s.world.tileWarp(s.earth, ida!)).not.toBe(
      s.world.tileWarp(s.earth, idb!),
    );
  });

  it("narrows what the owner sets to each group's views", async () => {
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity");
    const twin = twinOf(s, s.b);
    s.world.setViewMask(s.draw, bit(s.b));
    expect(maskOf(s.world, s.draw)).toBe(0);
    expect(maskOf(s.world, twin)).toBe(bit(s.b));
    s.world.setViewMask(s.draw, bit(s.a));
    expect(maskOf(s.world, s.draw)).toBe(bit(s.a));
    expect(maskOf(s.world, twin)).toBe(0);
    s.world.setViewMask(s.draw, 0);
    expect(maskOf(s.world, s.draw)).toBe(0);
    expect(maskOf(s.world, twin)).toBe(0);
    s.world.setViewMask(s.draw, ALL);
    expect(maskOf(s.world, s.draw)).toBe(bit(s.a));
    expect(maskOf(s.world, twin)).toBe(bit(s.b));
  });

  it("makes a twin only when a view of its group shows the draw, and follows its source", async () => {
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity", {
      draw: false,
    });
    // Shown to A only: no twin is made for B.
    s.world.setViewMask(s.draw, bit(s.a));
    await s.settle();
    expect(s.world.warpStats().variants).toEqual({ groups: 2, draws: 0 });
    // B shows it: a twin follows.
    s.world.setViewMask(s.draw, ALL);
    s.step();
    expect(s.world.warpStats().variants.draws).toBe(1);
    const twin = twinOf(s, s.b);
    // What the owner does to the source follows to the twin: its tint, and its visibility.
    s.world.setColor(s.draw, [0.25, 0.5, 0.75, 1]);
    s.world.setVisible(s.draw, false);
    s.step();
    const tint = (d: DrawHandle, k: number) =>
      s.world.raster.recordsF32[d.index * RECORD_WORDS + COLOR_WORD + k]!;
    expect(tint(twin, 0)).toBeCloseTo(0.25, 6);
    expect(tint(twin, 2)).toBeCloseTo(0.75, 6);
    const hidden = (d: DrawHandle) =>
      (s.world.raster.recordsU32[d.index * RECORD_WORDS + FLAGS_WORD]! &
        RecordFlags.hidden) !==
      0;
    expect(hidden(twin)).toBe(true);
    s.world.setVisible(s.draw, true);
    s.step();
    expect(hidden(twin)).toBe(false);
    // A draw added now gets one too, and removing it takes its twin.
    const later = s.world.addDraw({ mesh: s.mesh, transform: s.transform });
    s.step();
    expect(s.world.warpStats().variants.draws).toBe(2);
    const laterTwin = twinOf(s, s.b, later);
    expect(laterTwin.index).not.toBe(later.index);
    s.world.removeDraw(later);
    expect(s.world.hasDraw(laterTwin)).toBe(false);
    expect(s.world.warpStats().variants.draws).toBe(1);
  });

  it("shares a group's draw between its views, and costs nothing while the views agree", async () => {
    const warp = verticalExaggeration({ factor: 10 });
    const s = await setup(warp, "identity");
    const c = s.addView(warp);
    s.step();
    s.step();
    expect(s.world.warpStats().variants).toEqual({ groups: 2, draws: 1 });
    expect(maskOf(s.world, s.draw)).toBe((bit(s.a) | bit(c)) >>> 0);
    // B takes the exaggeration too: one shape, so no twin and no narrowed mask.
    const same = await setup(warp, warp);
    expect(same.world.warpStats().variants).toEqual({ groups: 0, draws: 0 });
    expect(maskOf(same.world, same.draw)).toBe(ALL);
  });

  it("releases the twin when the second view goes away", async () => {
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity");
    const twin = twinOf(s, s.b);
    expect(s.world.hasDraw(twin)).toBe(true);
    removeView(s.b);
    s.step();
    expect(s.world.hasDraw(twin)).toBe(false);
    expect(s.world.warpStats().variants).toEqual({ groups: 0, draws: 0 });
    // The source shows what its owner asked for again.
    expect(maskOf(s.world, s.draw)).toBe(ALL);
    expect(s.world.warps.routes.has(s.draw.index)).toBe(true);
  });

  it("releases a routed twin's block with it", async () => {
    const s = await setup(
      verticalExaggeration({ factor: 10 }),
      heightOffset(500),
    );
    const twin = twinOf(s, s.b);
    expect(s.world.warps.routes.has(twin.index)).toBe(true);
    removeView(s.b);
    s.step();
    expect(s.world.hasDraw(twin)).toBe(false);
    expect(s.world.warps.routes.has(twin.index)).toBe(false);
    expect(s.world.warpStats().variants.draws).toBe(0);
  });
});

describe("tiles across a switch frame", () => {
  const BASE = "https://tiles.test/switch/";
  const URL_ = `${BASE}tileset.json`;
  const TILESET = {
    asset: { version: "1.1" },
    geometricError: 100,
    root: {
      geometricError: 640,
      refine: "REPLACE",
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + 3000, 0, 0, 1],
      boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
      content: { uri: "tile.gltf" },
    },
  };
  const triangle = (): GltfAsset => ({
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
    draws: [
      {
        mesh: 0,
        material: -1,
        matrix: Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
      },
    ],
    featureTables: [],
    warnings: [],
  });
  const selection = (id: number): SelectionView => ({
    id,
    position: new Float64Array([R + 4000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 4000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 4000,
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("selects each view on its own route's map and draws each tile by the draw of the view's group", async () => {
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const s = await setup(verticalExaggeration({ factor: 10 }), "identity", {
      draw: false,
    });
    const [ida, idb] = [s.a, s.b].map((v) => engine.scene.viewIds.get(v)!);
    await s.settle();
    const tileset = await engine.addTileset(s.world, URL_);
    try {
      const update = () => tileset.update([selection(ida!), selection(idb!)]);
      for (let i = 0; i < 100 && tileset.root.state !== "ready"; i++) {
        update();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      expect(tileset.root.state).toBe("ready");
      const select = vi.spyOn(tileset.state.policy, "select");
      update();
      const asked = new Map(select.mock.calls.map((c) => [c[2].id, c[2]]));
      // A's selection runs on the exaggeration's drawn volume, B's on the true one.
      expect(asked.get(ida!)?.warp).toBeDefined();
      expect(asked.get(idb!)?.warp).toBeUndefined();
      const drawn = drawnTile(tileset.root, asked.get(ida!)!.warp!).volume;
      expect(drawn.sphere.center[0]! - R).toBeCloseTo(30_000, 0);
      await s.settle();
      const draws = tileset.root.placement!.draws;
      expect(draws.length).toBeGreaterThan(0);
      // Each draw has a twin for B, and shows in the views of its group.
      for (const draw of draws) {
        const twin = twinOf(s, s.b, draw);
        expect(twin.index).not.toBe(draw.index);
        expect(maskOf(s.world, draw) & bit(s.b)).toBe(0);
        expect(maskOf(s.world, twin) & bit(s.a)).toBe(0);
      }
    } finally {
      engine.removeTileset(tileset);
    }
  });
});

describe("terrain's exact height term, per view", () => {
  /** A tile of terrain over (0.3, 0.2) as the worker would decode it for a warped globe. */
  function terrain(): { asset: GltfAsset; mesh: MeshData } {
    const rect = { west: 0.3, south: 0.2, east: 0.3004, north: 0.2004 };
    const { heights } = gridTile(rect, 9, () => 1500);
    const { asset } = upsampleTerrainTile(heights, rect, rect, 50, {
      heightNormal: true,
    });
    const m = asset.meshes[0]!;
    return {
      asset,
      mesh: {
        positions: m.positions,
        normals: m.normals!,
        uvs: m.uvs!,
        indices: m.indices,
        skirtStart: m.skirtStart!,
        attributes: m.attributes!,
      },
    };
  }

  async function withTile(a: SwitchChoice, b: SwitchChoice) {
    const s = await setup(a, b, { draw: false });
    const { asset, mesh } = terrain();
    const centre = asset.draws[0]!.matrix;
    const tile = s.world.addDraw({
      mesh: s.world.addMesh(mesh),
      parent: s.earth,
      origin: Float64Array.of(centre[12]!, centre[13]!, centre[14]!),
    });
    s.world.setDrawHeightNormal(tile, heightNormalInfo(asset)!);
    await s.settle();
    return { s, tile, twin: twinOf(s, s.b, tile) };
  }

  it("is exaggerated in one view and true in the other, each by its own draw", async () => {
    const { s, tile, twin } = await withTile(
      verticalExaggeration({ factor: 10 }),
      "identity",
    );
    expect(twin.index).not.toBe(tile.index);
    // A's tile is drawn by its height term, B's by none: its vertices are where they are.
    expect(s.world.warps.status(tile)).toMatchObject({ exact: true });
    expect(drawTerms(s.world, twin)).toBeUndefined();
    const terms = drawTerms(s.world, tile)!;
    expect(weightOf(terms.at(-1)!.weight)).toBeCloseTo(9, 9);
  });

  it("is exaggerated by two different factors, each view's own", async () => {
    const { s, tile, twin } = await withTile(
      verticalExaggeration({ factor: 10 }),
      verticalExaggeration({ factor: 3 }),
    );
    expect(twin.index).not.toBe(tile.index);
    expect(s.world.warps.status(tile)).toMatchObject({ exact: true });
    expect(s.world.warps.status(twin)).toMatchObject({ exact: true });
    const weight = (d: DrawHandle) =>
      weightOf(drawTerms(s.world, d)!.at(-1)!.weight);
    expect(weight(tile)).toBeCloseTo(9, 9);
    expect(weight(twin)).toBeCloseTo(2, 9);
  });
});
