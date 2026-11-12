// A tileset placed in a reference frame: its anchor bound to a frame
// (`FramesResolver.bindAnchor`, `TilesetOptions.anchor`), so its tiles are in
// that frame's coordinates and drawn through the route to the camera. An ECEF
// tileset belongs in a frame whose local coordinates are body-fixed; one in a
// projected CRS belongs in the CRS's frame, its root transform (the rigid
// placement at an anchor) left out (`rootTransform: "none"`). Small fixture
// tilesets, and the fake engine of test/fakeGpu.ts.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { routeForward } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { placementOf } from "../src/frames/placementQuery.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { smoothFrame } from "../src/frames/smoothFrame.ts";
import {
  geographicToGeocentric,
  utmToGeographic,
  verticalExaggeration,
} from "../src/georeference/index.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import type { TilesetOptions } from "../src/streaming/tilesetTypes.ts";
import { liveEdge } from "../src/transforms/index.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const BASE = "https://tiles.test/framed/";
const ECEF_URL = `${BASE}ecef/tileset.json`;
const PROJECTED_URL = `${BASE}projected/tileset.json`;

/** Where a tile sits in UTM 48S grid metres: the port of Jakarta. */
const DESIGN = [709_000, 9_325_000, 29] as const;
/** A rigid placement's matrix, as a design tileset's root transform: not the identity, not near the origin. */
// prettier-ignore
const RIGID = [
  -0.95, -0.29, 0.0035, 0,
  -0.027, 0.1, 0.994, 0,
  -0.288, 0.951, -0.106, 0,
  -907_246.5, 5_316_237.4, -9_948_187, 1,
];

/** An ECEF tileset: one tile 3 km above the equator and the prime meridian. */
const ECEF = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6_381_137, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

/** A design tileset: a rigid placement at the root, a tile at design coordinates under it. */
const PROJECTED = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 640,
    refine: "REPLACE",
    transform: RIGID,
    boundingVolume: {
      box: [...DESIGN, 100, 0, 0, 0, 100, 0, 0, 0, 20],
    },
    children: [
      {
        geometricError: 0,
        refine: "REPLACE",
        transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...DESIGN, 1],
        boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
        content: { uri: "tile.gltf" },
      },
    ],
  },
};

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

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];

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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A world with a view on ITRF, and the frames a tileset is placed in. */
function setup() {
  vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input);
    const json =
      url === ECEF_URL ? ECEF : url === PROJECTED_URL ? PROJECTED : undefined;
    return json
      ? new Response(JSON.stringify(json), {
          headers: { "Content-Type": "application/json" },
        })
      : new Response("not found", { status: 404 });
  });
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const exaggerated = smoothFrame(
    "Earth content (exaggerated)",
    itrf,
    verticalExaggeration({ factor: 5, ceiling: 9000 }),
  );
  catalog.add(exaggerated);
  const geographic = smoothFrame(
    "Geographic to geocentric",
    itrf,
    liveEdge(geographicToGeocentric(), { description: "to body-fixed metres" }),
  );
  catalog.add(geographic);
  const utmFrame = smoothFrame(
    "UTM 48S",
    geographic,
    liveEdge(utmToGeographic({ zone: 48, hemisphere: "south" }), {
      description: "UTM 48S grid to geographic",
    }),
  );
  catalog.add(utmFrame);
  const resolver = createFramesResolver(catalog);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const step = () => {
    engine.cameras.update();
    world.warps.frame(
      [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
      Infinity,
      (message) => {
        throw new Error(message);
      },
    );
  };
  step();
  return { world, view, resolver, exaggerated, utmFrame, step };
}

/** Loads a tileset and its root tile (selection by hand, the camera at `at`, in the anchor). */
async function load(
  world: World,
  url: string,
  options: TilesetOptions,
  at: readonly number[],
): Promise<Tileset3D> {
  const tileset = await engine.addTileset(world, url, options);
  const view: SelectionView = {
    id: 0,
    position: Float64Array.from(at),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
  const tile = () => {
    let t = tileset.root;
    while (t.children.length > 0) {
      t = t.children[0]!;
    }
    return t;
  };
  for (let i = 0; i < 100 && tile().state !== "ready"; i++) {
    tileset.update([view]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(tile().state).toBe("ready");
  return tileset;
}

const leaf = (tileset: Tileset3D) => {
  let t = tileset.root;
  while (t.children.length > 0) {
    t = t.children[0]!;
  }
  return t;
};

describe("a tileset in a reference frame", () => {
  it("an ECEF tileset on an anchor bound to the exaggeration is drawn through it", async () => {
    const s = setup();
    const site = s.world.addAnchor("Earth content");
    s.resolver.bindAnchor(site, s.exaggerated);
    const tileset = await load(
      s.world,
      ECEF_URL,
      { anchor: site },
      [6_384_000, 0, 0],
    );
    try {
      expect(tileset.anchor).toBe(site);
      expect(s.world.anchorOf(tileset.root.placement!.transform)).toBe(site);
      s.step();
      const route = s.view.anchorRoute(site)!;
      expect(route.steps.filter((step) => step.kind === "warp")).toHaveLength(
        1,
      );
      // 3 km up, ×5 below the ceiling (a lift of 4 × 3000 m).
      const drawn = routeForward(route, [6_381_137, 0, 0]);
      expect(drawn[0]).toBeCloseTo(6_378_137 + 5 * 3000, 3);
      const draw = tileset.root.placement!.draws[0]!;
      const info = placementOf(s.world, draw, s.view, s.resolver)!;
      expect(info.route?.warps[0]?.description).toMatch(
        /vertical exaggeration/,
      );
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("a tileset in a projected CRS, with its root transform left out, is drawn through the projection", async () => {
    const s = setup();
    const site = s.world.addAnchor("Jakarta");
    s.resolver.bindAnchor(site, s.utmFrame);
    const tileset = await load(
      s.world,
      PROJECTED_URL,
      { anchor: site, rootTransform: "none" },
      [...DESIGN],
    );
    try {
      // The tile is at its design coordinates: no rigid placement in its transform.
      const t = leaf(tileset).transform;
      expect([t[0], t[5], t[10]]).toEqual([1, 1, 1]);
      expect([t[12], t[13], t[14]]).toEqual([...DESIGN]);
      s.step();
      const route = s.view.anchorRoute(site)!;
      expect(route.steps.filter((step) => step.kind === "warp")).toHaveLength(
        2,
      );
      // The route is the projection: the grid point's geographic, then body-fixed, position.
      const geo = utmToGeographic({ zone: 48, hemisphere: "south" });
      const lonLat = new Float64Array(3);
      geo.spec.forward(DESIGN, geo.spec.params, lonLat);
      const toEcef = geographicToGeocentric();
      const expected = new Float64Array(3);
      toEcef.spec.forward(lonLat, toEcef.spec.params, expected);
      const drawn = routeForward(route, DESIGN);
      for (let i = 0; i < 3; i++) {
        expect(drawn[i]).toBeCloseTo(expected[i]!, 6);
      }
      // About Jakarta: 106.89°E, 6.10°S.
      expect(lonLat[0]).toBeCloseTo(106.8885, 3);
      expect(lonLat[1]).toBeCloseTo(-6.1034, 3);
      const draw = leaf(tileset).placement!.draws[0]!;
      const info = placementOf(s.world, draw, s.view, s.resolver)!;
      expect(info.route?.warps).toHaveLength(2);
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("applies the root transform as 3D Tiles says unless told not to", async () => {
    const s = setup();
    const declared = await engine.addTileset(s.world, PROJECTED_URL);
    const none = await engine.addTileset(s.world, PROJECTED_URL, {
      rootTransform: "none",
    });
    const moved = await engine.addTileset(s.world, PROJECTED_URL, {
      rootTransform: "none",
      modelMatrix: m4.setTranslation(m4.mat4(), Float64Array.of(5, 6, 7)),
    });
    try {
      for (let i = 0; i < 16; i++) {
        expect(declared.root.transform[i]).toBeCloseTo(RIGID[i]!, 9);
        expect(none.root.transform[i]).toBe(i % 5 === 0 ? 1 : 0);
      }
      // modelMatrix still applies.
      expect([...moved.root.transform.slice(12, 15)]).toEqual([5, 6, 7]);
    } finally {
      engine.removeTileset(declared);
      engine.removeTileset(none);
      engine.removeTileset(moved);
    }
  });
});
