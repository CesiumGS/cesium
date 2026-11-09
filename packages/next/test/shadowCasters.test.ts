// Off-screen shadow casters (owner, 2026-11-08: "for that station imodel in
// the viewer if the camera was inside of the structure sometimes shadows
// from tiles that were off screen weren't rendered"). A shadow cascade
// draws what its view selected (its records' view masks) inside the sun's
// box. A tile behind the camera, toward the sun, shadows ground the camera
// sees, but the view's selection culls it by the camera's frustum alone,
// so it isn't selected and casts nothing. Through the real tileset on the
// fake engine (test/fakeGpu.ts). The view now selects them for its cascades
// alone (`SelectionResult.casters`, `DrawRecord.casterMask`): what they cost
// is bounded, and nothing but the cascades sees them.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import {
  CASTER_MASK_WORD,
  FLAGS_WORD,
  NO_PLACEMENT,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  TRANSFORM_WORD,
  TRANSFORM_WORDS,
  VIEW_MASK_WORD,
  VIEW_TIME_WORD,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import type { TilesetOptions } from "../src/streaming/tilesetTypes.ts";
import {
  casterPlanes,
  createShadowCascades,
  fitShadowCascades,
} from "../src/scene/shadows.ts";
import { Camera } from "../src/scene/Camera.ts";
import { readFileSync } from "node:fs";
import { PLACEMENT_TERMS } from "../src/scene/placement.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/station/";
const URL_ = `${BASE}tileset.json`;

/** A square slab of `half` metres, across y and z (Earth-fixed, at lon 0). */
function slab(half: number): GltfAsset {
  const h = half;
  return {
    meshes: [
      {
        positions: new Float32Array([0, -h, -h, 0, h, -h, 0, h, h, 0, -h, h]),
        normals: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    // Square in glTF's y-up axes as in Earth-fixed ones: the tile's turn
    // to z-up leaves it across y and z.
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

interface TileJson {
  geometricError: number;
  refine: "REPLACE";
  boundingVolume: { box: number[] };
  transform: number[];
  content: { uri: string };
  children?: TileJson[];
}

const tile = (
  uri: string,
  at: readonly number[],
  half: readonly number[],
  geometricError = 0,
  children: TileJson[] = [],
): TileJson => ({
  geometricError,
  refine: "REPLACE",
  boundingVolume: {
    box: [0, 0, 0, half[0]!, 0, 0, 0, half[1]!, 0, 0, 0, half[2]!],
  },
  transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, at[0]!, at[1]!, at[2]!, 1],
  content: { uri },
  children,
});

/** The floor, 20 m north of the camera (at longitude 0, latitude 0, up +x). */
const FLOOR = tile("floor.gltf", [R, 0, 20], [1, 10, 10]);
/** A roof 15 m up and 5 m south: behind the camera, toward the sun. */
const ROOF = tile("roof.gltf", [R + 15, 0, -5], [1, 5, 5]);

/** A root without content over `children`, drawn in addition (ADD). */
const tilesetJson = (children: readonly TileJson[]) => ({
  asset: { version: "1.1" },
  geometricError: 1000,
  root: {
    geometricError: 1000,
    refine: "ADD",
    boundingVolume: {
      box: [R, 0, 0, 5000, 0, 0, 0, 5000, 0, 0, 0, 5000],
    },
    children,
  },
});

describe("shadow casters off screen", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async (url) =>
      slab(String(url).includes("floor") ? 10 : 5),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  /** The scene settled: 2 m over the floor's level, looking north along it. */
  async function scene(
    children: readonly TileJson[],
    { shadows = true, ...options }: TilesetOptions & { shadows?: boolean } = {},
  ) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(tilesetJson(children)), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const world: World = engine.createWorld({ maxDraws: 64 });
    const tileset = await engine.addTileset(world, URL_, options);
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world,
      shadows,
    });
    view.camera.position.set([R + 2, 0, 0]);
    view.camera.direction.set([0, 0, 1]);
    view.camera.orient(Float64Array.of(1, 0, 0));
    view.camera.version++;
    // High in the south, behind the camera: the roof's shadow falls on the
    // floor in view, 10 m ahead.
    v3.normalize(engine.sunDirection, v3.vec3(1, 0, -1));
    const frames = async (count: number) => {
      for (let i = 0; i < count; i++) {
        engine.renderFrame();
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };
    await frames(12);
    return {
      world,
      tileset,
      view,
      frames,
      remove() {
        engine.removeView(view);
        engine.removeTileset(tileset);
      },
    };
  }

  type Scene = Awaited<ReturnType<typeof scene>>;
  const tiles = (s: Scene) => s.tileset.root.children as Tile[];

  /** What a cascade's cull draws (cull.slang `drawable`, `inFrustum`). */
  function casts({ world, view }: Scene, tile: Tile): boolean {
    const bit = engine.viewBit(view);
    const { planes } = (
      engine as unknown as { cascades: { planes: Float32Array[] } }
    ).cascades;
    const draws: readonly DrawHandle[] = tile.placement?.draws ?? [];
    return draws.some((draw) => {
      const u = world.raster.recordsU32;
      const f = world.raster.recordsF32;
      const o = draw.index * RECORD_WORDS;
      const mask = u[o + VIEW_MASK_WORD]! | u[o + CASTER_MASK_WORD]!;
      if ((mask & bit) === 0 || u[o + FLAGS_WORD]! & 1) {
        return false;
      }
      const t = u[o + TRANSFORM_WORD]!;
      const m = world.scene.transformWorld.subarray(t * 16, t * 16 + 16);
      const c = [0, 1, 2].map(
        (k) =>
          m[k]! * f[o]! +
          m[4 + k]! * f[o + 1]! +
          m[8 + k]! * f[o + 2]! +
          m[12 + k]! -
          view.camera.position[k]!,
      );
      const radius =
        f[o + RADIUS_WORD]! *
        world.raster.transforms.f32[t * TRANSFORM_WORDS + 3]!;
      return planes.some((p) => {
        for (let k = 0; k < 5; k++) {
          const d =
            p[k * 4]! * c[0]! +
            p[k * 4 + 1]! * c[1]! +
            p[k * 4 + 2]! * c[2]! +
            p[k * 4 + 3]!;
          if (d < -radius) {
            return false;
          }
        }
        return true;
      });
    });
  }

  it("a tile behind the camera, toward the sun, is drawn into the cascades, and by nothing else", async () => {
    const s = await scene([FLOOR, ROOF]);
    try {
      const [floor, roof] = tiles(s) as [Tile, Tile];
      expect(floor.state).toBe("ready");
      expect(casts(s, floor)).toBe(true);
      expect(roof.state).toBe("ready");
      expect(casts(s, roof)).toBe(true);
      // The view doesn't draw it: its passes, picks, ray casts and depth
      // ranges read the view mask, and its stats count what it draws.
      const bit = engine.viewBit(s.view);
      expect(floor.viewMask & bit).not.toBe(0);
      expect(roof.viewMask).toBe(0);
      expect(roof.casterMask & bit).not.toBe(0);
      expect(s.tileset.stats.selected.get(Math.log2(bit))).toBe(1);
      expect(s.tileset.stats.casters).toBe(1);
      expect(s.tileset.stats.purposes.caster.requests).toBe(1);
      // Away from the sun, it no longer casts.
      v3.normalize(engine.sunDirection, v3.vec3(1, 0, 1));
      await s.frames(3);
      expect(roof.casterMask).toBe(0);
      expect(s.tileset.stats.casters).toBe(0);
    } finally {
      s.remove();
    }
  });

  it("selects none without shadows, or under 1.x's policy", async () => {
    for (const options of [
      { shadows: false },
      { policy: "stepwise" as const },
      { casterErrorScale: 0 },
    ]) {
      const s = await scene([FLOOR, ROOF], options);
      try {
        const [floor, roof] = tiles(s) as [Tile, Tile];
        expect(floor.state).toBe("ready");
        expect(roof.state).toBe("unloaded");
      } finally {
        s.remove();
      }
    }
  });

  it("loads casters coarser than the view would", async () => {
    // 12 m from the camera, the parent's error (5 m) is about 23 pixels
    // over a 48-pixel view: over the threshold of 16, under twice it.
    const parent = () =>
      tile("roof.gltf", [R + 15, 0, -5], [1, 5, 5], 5, [
        tile("roofChild.gltf", [0, 0, 0], [1, 5, 5]),
      ]);
    const coarse = await scene([FLOOR, parent()]);
    try {
      const roof = tiles(coarse)[1]!;
      expect(roof.casterMask).not.toBe(0);
      expect(roof.children[0]!.state).toBe("unloaded");
    } finally {
      coarse.remove();
    }
    const fine = await scene([FLOOR, parent()], { casterErrorScale: 1 });
    try {
      const roof = tiles(fine)[1]!;
      const child = roof.children[0]!;
      expect(child.state).toBe("ready");
      expect(child.casterMask).not.toBe(0);
    } finally {
      fine.remove();
    }
  });

  it("casts the nearest loaded ancestor while the frontier loads", async () => {
    let release = () => {};
    const parent = tile("roof.gltf", [R + 15, 0, -5], [1, 5, 5], 500, [
      tile("roofChild.gltf", [0, 0, 0], [1, 5, 5]),
    ]);
    const s = await scene([FLOOR, parent], { casterErrorScale: 200 });
    try {
      const roof = tiles(s)[1]!;
      const child = roof.children[0]!;
      expect(roof.casterMask).not.toBe(0);
      expect(child.state).toBe("unloaded");
      // Now the frontier is the child: the parent casts until it arrives.
      const held = new Promise<void>((resolve) => (release = resolve));
      vi.mocked(engine.loadGltf).mockImplementationOnce(async () => {
        await held;
        return slab(5);
      });
      (
        s.tileset.selection as unknown as { casterErrorScale: number }
      ).casterErrorScale = 1;
      await s.frames(3);
      expect(child.state).toBe("loading");
      expect(roof.casterMask).not.toBe(0);
      release();
      await s.frames(6);
      expect(child.state).toBe("ready");
      expect(child.casterMask).not.toBe(0);
      expect(roof.casterMask).toBe(0);
    } finally {
      release();
      s.remove();
    }
  });

  it("doesn't load what can't shadow what the view draws", async () => {
    // Up-sun, but 500 m to the side: its shadow falls beside the floor.
    const s = await scene([
      FLOOR,
      ROOF,
      tile("beside.gltf", [R + 15, 500, -5], [1, 5, 5]),
    ]);
    try {
      const [, roof, beside] = tiles(s) as [Tile, Tile, Tile];
      expect(roof.state).toBe("ready");
      expect(beside.state).toBe("unloaded");
    } finally {
      s.remove();
    }
  });

  it("yields to what views draw over the byte budget", async () => {
    const s = await scene([FLOOR, ROOF]);
    const t = s.tileset as unknown as { cacheBytes: number };
    try {
      const [floor, roof] = tiles(s) as [Tile, Tile];
      const threshold = s.tileset.selection.memoryAdjustedScreenSpaceError;
      expect(roof.state).toBe("ready");
      // Over the budget with both: the caster goes, the floor stays, and
      // the view's detail doesn't drop.
      t.cacheBytes = floor.bytes;
      await s.frames(4);
      expect(roof.state).toBe("unloaded");
      expect(roof.casterMask).toBe(0);
      expect(floor.state).toBe("ready");
      expect(floor.viewMask).not.toBe(0);
      expect(s.tileset.selection.memoryAdjustedScreenSpaceError).toBe(
        threshold,
      );
      // At the budget it isn't loaded straight back.
      await s.frames(4);
      expect(roof.state).toBe("unloaded");
      // With room, it is.
      t.cacheBytes = 100 * floor.bytes;
      s.view.camera.version++;
      await s.frames(4);
      expect(roof.state).toBe("ready");
      expect(roof.casterMask).not.toBe(0);
    } finally {
      s.remove();
    }
  });

  it("casts a placed tile through the cascades: the placement and the caster mask are both on its record", async () => {
    const s = await scene([FLOOR, ROOF]);
    try {
      const [, roof] = tiles(s) as [Tile, Tile];
      const draw = roof.placement!.draws[0]!;
      const u = s.world.raster.recordsU32;
      const f = s.world.raster.recordsF32;
      const o = draw.index * RECORD_WORDS;
      expect(u[o + PLACEMENT_WORD]).toBe(NO_PLACEMENT);
      const radius = f[o + RADIUS_WORD]!;
      const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
      coefficients.set([0.5, 0, 0], 3);
      s.world.setPlacement(draw, {
        kind: "fitted",
        center: [0, 0, 0],
        scale: 2,
        coefficients,
        errorBound: 0.01,
      });
      // The word set, the bounding radius grown by the displacement (the
      // cascade's cull reads it), and the caster mask untouched by both.
      expect(u[o + PLACEMENT_WORD]).not.toBe(NO_PLACEMENT);
      expect(f[o + RADIUS_WORD]!).toBeGreaterThan(radius);
      expect(u[o + CASTER_MASK_WORD]).not.toBe(0);
      expect(casts(s, roof)).toBe(true);
      // The next selection keeps it a caster.
      s.view.camera.version++;
      await s.frames(3);
      expect(u[o + PLACEMENT_WORD]).not.toBe(NO_PLACEMENT);
      expect(u[o + CASTER_MASK_WORD]).not.toBe(0);
    } finally {
      s.remove();
    }
  });

  it("re-expresses the light in a tileset's anchor", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify(tilesetJson([FLOOR, ROOF])), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const world = engine.createWorld({ maxDraws: 64 });
    const site = world.addAnchor("site");
    const tileset = await engine.addTileset(world, URL_, { anchor: site });
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world,
      shadows: true,
    });
    try {
      // The site is turned about z from the body anchor (render space).
      const angle = 0.5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      // prettier-ignore
      view.setAnchorPlacement(site, Float64Array.of(
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ));
      const pose = new Camera();
      pose.position.set([R + 2, 0, 0]);
      pose.direction.set([0, 0, 1]);
      pose.orient(Float64Array.of(1, 0, 0));
      view.setCameraFromAnchor(site, pose);
      // In the site's axes, the sun of the other cases; in the body's, turned.
      const sun = [Math.SQRT1_2, 0, -Math.SQRT1_2];
      engine.sunDirection.set([c * sun[0]!, s * sun[0]!, sun[2]!]);
      let seen: Float64Array | undefined;
      vi.spyOn(tileset, "update").mockImplementation((views) => {
        seen = views[0]?.casterPlanes;
      });
      engine.renderFrame();
      const cascades = createShadowCascades();
      fitShadowCascades(cascades, pose, 64 / 48, sun, 2);
      const expected = casterPlanes(cascades, pose.position);
      expect(seen).toBeDefined();
      for (let i = 0; i < expected.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          expect(seen![i + k]).toBeCloseTo(expected[i + k]!, 5);
        }
        // Offsets are about the camera's distance from the Earth's centre.
        expect(Math.abs(seen![i + 3]! - expected[i + 3]!)).toBeLessThan(3);
      }
    } finally {
      engine.removeView(view);
      engine.removeTileset(tileset);
    }
  });
});

describe("the cascades' block", () => {
  it("sets View.time.z in each cascade's view block and in no other", async () => {
    const engine = await fakeEngine();
    const writes: Array<{ buffer: unknown; time: number }> = [];
    const device = engine.gpu.device as unknown as Record<string, unknown>;
    device.queue = new Proxy(
      {},
      {
        get: (_t, key) =>
          key === "writeBuffer"
            ? (
                buffer: unknown,
                _offset: number,
                data: Float32Array,
                dataOffset: number,
                size: number,
              ) => {
                if (size > VIEW_TIME_WORD + 3) {
                  writes.push({
                    buffer,
                    time: data[dataOffset + VIEW_TIME_WORD + 2]!,
                  });
                }
              }
            : () => Promise.resolve(),
      },
    );
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify(tilesetJson([FLOOR])), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const world = engine.createWorld({ maxDraws: 8 });
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world,
      shadows: true,
    });
    try {
      view.camera.position.set([R + 2, 0, 0]);
      view.camera.direction.set([0, 0, 1]);
      view.camera.orient(Float64Array.of(1, 0, 0));
      view.camera.version++;
      v3.normalize(engine.sunDirection, v3.vec3(1, 0, -1));
      engine.renderFrame();
      const internals = engine as unknown as {
        cascadeStaging: unknown;
        viewStaging: unknown;
      };
      const cascades = writes.filter(
        (w) => w.buffer === internals.cascadeStaging,
      );
      const views = writes.filter((w) => w.buffer === internals.viewStaging);
      expect(cascades.length).toBe(4);
      expect(cascades.every((w) => w.time === 1)).toBe(true);
      expect(views.length).toBeGreaterThan(0);
      expect(views.every((w) => w.time === 0)).toBe(true);
    } finally {
      engine.removeView(view);
      vi.unstubAllGlobals();
    }
  });
});

describe("the shadow pipeline", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("places vertices as the view's passes do: the cascades' vertex stage is the common one", () => {
    const surface = source("src/shaders/surface.slang");
    // Both vertex entries end in the one function that applies the placement.
    expect(surface).toMatch(
      /surfaceDepthVertex\(uint vertexIndex, uint item\) \{\s*return vertexOut\(vertexIndex, item, false\);/,
    );
    expect(surface).toMatch(
      /surfaceVertex\(uint vertexIndex, uint item\) \{\s*return vertexOut\(vertexIndex, item, true\);/,
    );
    expect(surface.match(/placePosition\(/g)!.length).toBe(1);
    // The caster pipelines use the depth entry, of the engine's own module.
    const context = source("src/scene/RenderContext.ts");
    const shadow = context.slice(context.indexOf("const shadowPipeline = ("));
    expect(shadow.slice(0, 600)).toContain('entryPoint: "vsDepth"');
    expect(source("src/shaders/surfaceVertex.wgsl")).toMatch(
      /fn vsDepth[^}]*surfaceDepthVertex/,
    );
  });
});

describe("the cull", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("reads the caster mask only in a cascade's view, in `drawable`", () => {
    const tables = source("src/shaders/cullTables.slang");
    const start = tables.indexOf("public bool drawable(");
    expect(start).toBeGreaterThan(0);
    const end = tables.indexOf("\n}\n", start);
    const body = tables.slice(start, end);
    expect(end).toBeGreaterThan(start);
    // The mask joins the view mask only where View.time.z says cascade.
    expect(body).toMatch(
      /view\.time\.z\s*>\s*0\.5\s*\?\s*r\.viewMask\s*\|\s*r\.casterMask\s*:\s*r\.viewMask/,
    );
    expect(body.match(/casterMask/g)!.length).toBe(1);
    // Nothing else reads it, and nothing else reads the view mask but
    // this function (passes without a cascade's block draw views' only).
    for (const file of [
      "src/shaders/cull.slang",
      "src/shaders/pointCull.slang",
      "src/shaders/raycast.slang",
      "src/shaders/surface.slang",
      "src/shaders/cullTables.slang",
    ]) {
      const text = source(file)
        .replace(body, "")
        .replace(/\/\/.*$/gm, "");
      expect(text, file).not.toMatch(/\.casterMask/);
      expect(text, file).not.toMatch(/\.viewMask/);
    }
  });
});

describe("casterPlanes", () => {
  it("closes each cascade's box 50 km past its sphere toward the light, in the coordinates given", () => {
    const cascades = createShadowCascades();
    const camera = new Camera();
    const at = [R + 2, 0, 0];
    camera.position.set(at);
    camera.direction.set([0, 0, 1]);
    camera.orient(Float64Array.of(1, 0, 0));
    const sun = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    fitShadowCascades(cascades, camera, 4 / 3, sun, 2, { near: 1, far: 300 });
    const planes = casterPlanes(cascades, at);
    expect(planes.length).toBe(4 * 6 * 4);
    const inside = (box: number, p: readonly number[]) => {
      for (let k = 0; k < 6; k++) {
        const o = box * 24 + k * 4;
        if (
          planes[o]! * p[0]! +
            planes[o + 1]! * p[1]! +
            planes[o + 2]! * p[2]! +
            planes[o + 3]! <
          0
        ) {
          return false;
        }
      }
      return true;
    };
    const ahead = [at[0]!, at[1]!, at[2]! + 200];
    const along = (d: number) => ahead.map((x, i) => x + sun[i]! * d);
    expect(inside(3, ahead)).toBe(true);
    // No reach set by the shadows' far distance: a tile 20 km toward the
    // sun, as one 100 m away, is inside; the ceiling is 50 km past the
    // sphere.
    expect(inside(3, along(cascades.far))).toBe(true);
    expect(inside(3, along(20_000))).toBe(true);
    expect(inside(3, along(60_000))).toBe(false);
    // Plane 4 faces the light: selection reads its direction.
    for (let k = 0; k < 3; k++) {
      expect(planes[16 + k]).toBeCloseTo(sun[k]!, 5);
    }
  });
});
