// Stable IDs and labels through the engine (CS-815), on the fake GPU
// (test/fakeGpu.ts): two load orders give the same IDs; picks, ray hits and
// ID images give the same ID and labels; labels from a property table and
// from the host, by precedence; host labels kept across a reload.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../packages/core/src/io/gltfTypes.ts";
import * as m4 from "../packages/core/src/math/mat4.ts";
import { createBox } from "../packages/core/src/scene/meshes.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import type { CastOptions } from "../packages/core/src/scene/world/types.ts";
import type { Tile } from "../packages/core/src/streaming/Tile.ts";
import type { Tileset3D } from "../packages/core/src/streaming/Tileset3D.ts";
import type { RayQuery } from "../packages/core/src/query/queries.ts";
import { stableIdOf } from "../packages/core/src/scene/identity.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/site/";
const URL_ = `${BASE}tileset.json?session=not-part-of-an-id`;

/** A square slab of two features (vertices 0, 1: "car"; 2, 3: "truck"). */
function slab(): GltfAsset {
  const h = 10;
  return {
    meshes: [
      {
        positions: new Float32Array([0, -h, -h, 0, h, -h, 0, h, h, 0, -h, h]),
        normals: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        featureIds: Uint32Array.of(0, 0, 1, 1),
        featureCount: 2,
        featureTable: 0,
        featureSets: [
          { index: 0, featureCount: 2, kind: "attribute", propertyTable: 0 },
        ],
        identitySet: 0,
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4(), path: "n0/p0" }],
    featureTables: [
      { count: 2, columns: { kind: ["car", "truck"], name: ["c", "t"] } },
    ],
    warnings: [],
  };
}

const tilesetJson = (children: unknown[]) => ({
  asset: { version: "1.1", gltfUpAxis: "Z" },
  geometricError: 1000,
  root: {
    geometricError: 1000,
    refine: "ADD",
    boundingVolume: { box: [R, 0, 0, 5000, 0, 0, 0, 5000, 0, 0, 0, 5000] },
    children,
  },
});

const tile = (uri: string, at: readonly number[]) => ({
  geometricError: 0,
  refine: "REPLACE",
  boundingVolume: { box: [0, 0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 10] },
  transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, at[0]!, at[1]!, at[2]!, 1],
  content: { uri },
});

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("stable IDs through the engine", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => slab());
  });
  afterEach(() => vi.unstubAllGlobals());

  function serve(children: unknown[]) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(tilesetJson(children)), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
  }

  const frames = async (count = 12) => {
    for (let i = 0; i < count; i++) {
      engine.renderFrame();
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  };

  function aimed(world: World) {
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    view.camera.position.set([R + 2, 0, 0]);
    view.camera.direction.set([0, 0, 1]);
    view.camera.orient(Float64Array.of(1, 0, 0));
    view.camera.version++;
    return view;
  }

  /** Each loaded tile's features by content URI: slot and stable ID. */
  function idsByContent(world: World, tileset: Tileset3D) {
    const out = new Map<string, Array<{ slot: number; id: bigint }>>();
    const visit = (t: Tile) => {
      const draw = t.placement?.draws[0];
      if (draw) {
        const first = world.scene.drawFeatureFirst[draw.index]!;
        out.set(
          t.contentUrl!.slice(BASE.length).replace(/[?].*$/, ""),
          [0, 1].map((local) => ({
            slot: first + local,
            id: world.identities.idOfSlot(first + local),
          })),
        );
      }
      t.children.forEach(visit);
    };
    visit(tileset.root);
    return out;
  }

  async function site(children: unknown[], before?: (world: World) => void) {
    serve(children);
    const world: World = engine.createWorld({ maxDraws: 64 });
    before?.(world);
    const tileset = await engine.loadTileset(URL_);
    const item = world.add(tileset, {
      id: "site",
      labels: { class: ["vehicle"], wikidata: ["Q42889"] },
      taxonomies: [{ taxonomy: "class", from: "property", property: "kind" }],
    });
    const view = aimed(world);
    await frames();
    return { world, tileset, item, view };
  }

  it("gives the same IDs whatever order content loads in", async () => {
    const tiles = [tile("a.gltf", [R, 0, 50]), tile("b.gltf", [R, 0, 60])];
    const one = await site(tiles);
    // The other order, behind an unrelated draw that takes the first slots.
    const two = await site([...tiles].reverse(), (world) =>
      world.addDraw({ mesh: world.addMesh(createBox()), id: "marker" }),
    );
    const a = idsByContent(one.world, one.tileset);
    const b = idsByContent(two.world, two.tileset);
    expect([...a.keys()].sort()).toEqual(["a.gltf", "b.gltf"]);
    for (const uri of ["a.gltf", "b.gltf"]) {
      expect(b.get(uri)!.map((f) => f.id)).toEqual(
        a.get(uri)!.map((f) => f.id),
      );
      // The slots the GPU writes differ: the IDs don't come from them.
      expect(b.get(uri)![0]!.slot).not.toBe(a.get(uri)![0]!.slot);
    }
    // The ID is the hash of the key: the item, the tileset without its
    // query, the content relative to it, the glTF node and primitive, the
    // feature-ID set and the feature.
    expect(a.get("a.gltf")![1]!.id).toBe(
      stableIdOf({
        kind: "content",
        item: "site",
        source: "https://tiles.test/site/tileset.json",
        content: "a.gltf#n0/p0",
        set: 0,
        feature: 1,
      }),
    );
    for (const s of [one, two]) {
      engine.removeView(s.view);
      engine.removeTileset(s.tileset);
    }
  });

  it("gives picks, ray hits and ID images the same ID and labels, by precedence", async () => {
    const s = await site([tile("a.gltf", [R, 0, 50])]);
    const [, truck] = idsByContent(s.world, s.tileset).get("a.gltf")!;
    // The pick pass reads the truck's slot.
    const picks = engine.raster.picks;
    const push = picks.push;
    picks.push = (...items) => {
      for (const item of items) {
        const words = new Uint32Array(4);
        words[0] = truck!.slot;
        new Float32Array(words.buffer)[1] = Math.fround(
          s.view.camera.near / 50,
        );
        item.readback = {
          mapAsync: () => Promise.resolve(),
          getMappedRange: () => words.buffer.slice(0),
          unmap: () => {},
          destroy: () => {},
        } as unknown as GPUBuffer;
      }
      return push.apply(picks, items);
    };
    s.world.identity.setLabels(truck!.id, "condition", ["damaged"]);
    const picked = s.view.pick(32, 24);
    for (let i = 0; i < 3; i++) {
      engine.renderFrame();
      await settle();
    }
    picks.push = push;
    const pick = (await picked)!;
    expect(pick.id).toBe(truck!.id);
    expect(pick.key).toMatchObject({ kind: "content", set: 0, feature: 1 });
    expect(pick.scope).toBe("tile");
    expect(pick.basis).toBe("surface");
    expect(pick.name).toBe("t");
    // The feature's own label wins in `class`; the item's fills `wikidata`;
    // the host's own taxonomy is there too.
    expect(pick.labels).toEqual({
      condition: ["damaged"],
      class: ["truck"],
      wikidata: ["Q42889"],
    });
    expect(pick.time.seconds).toBe(pick.camera.pose.seconds);
    // The host's labels win over the feature's own.
    s.world.identity.setLabels(truck!.id, "class", ["wreck"]);
    expect(s.world.identity.identify(truck!.id)!.labels.class).toEqual([
      "wreck",
    ]);
    s.world.identity.setLabels(truck!.id, "class", undefined);

    // A ray hit: the cast reports the slot it hit, as `rayFeature` writes it.
    vi.spyOn(s.world, "castRays").mockImplementation(
      async (rays, options?: CastOptions) => {
        options?.hitSlots?.push(...rays.map(() => truck!.slot));
        return rays.map(() => 10);
      },
    );
    const query: RayQuery = {
      anchor: s.tileset.anchor,
      seconds: 0,
      rays: [{ from: [R + 2, 0, 0], to: [R + 2, 0, 100] }],
      targets: ["draws"],
    };
    const answer = await engine.queries.castRays(query);
    const hit = answer.rays[0]!.hit!;
    expect(hit.id).toBe(pick.id);
    expect(hit.basis).toBe("surface");
    expect(s.world.identity.identify(hit.id!)!.labels).toEqual(pick.labels);

    // An ID image of the pick pass's slots: two words per pixel, and the
    // label set's index in the default taxonomy (`class`).
    const image = s.world.identities.resolveSlots(
      Uint32Array.of(0, truck!.slot),
    );
    const pixel =
      (BigInt(image.instanceId[3]!) << 32n) | BigInt(image.instanceId[2]!);
    expect(pixel).toBe(pick.id);
    expect(image.instanceId[0]).toBe(0);
    expect(image.taxonomy).toBe("class");
    expect(image.labelSets.get(image.semanticId[1]!)).toEqual(
      pick.labels.class,
    );
    expect(image.semanticId[0]).toBe(0);

    engine.removeView(s.view);
    engine.removeTileset(s.tileset);
  });

  it("keeps host labels across a reload, and gives the reloaded content the same IDs", async () => {
    const s = await site([tile("a.gltf", [R, 0, 50])]);
    const [car] = idsByContent(s.world, s.tileset).get("a.gltf")!;
    s.world.identity.setLabels(car!.id, "class", ["parked"]);
    engine.removeTileset(s.tileset);
    expect(s.world.identity.identify(car!.id)).toBeUndefined();
    // The same tileset, loaded again into the same world.
    const tileset = await engine.loadTileset(URL_);
    s.world.add(tileset, { id: "site" });
    await frames();
    const [again] = idsByContent(s.world, tileset).get("a.gltf")!;
    expect(again!.slot).not.toBe(car!.slot);
    expect(again!.id).toBe(car!.id);
    expect(s.world.identity.identify(car!.id)!.labels).toEqual({
      class: ["parked"],
    });
    engine.removeView(s.view);
    engine.removeTileset(tileset);
  });

  it("gives a model placed twice two sets of IDs, the second's ordinal reported", async () => {
    const world = engine.createWorld({ maxDraws: 16 });
    const model = engine.uploadModel(world, slab(), { name: "slab.glb" });
    const first = model.place({ modelMatrix: m4.mat4() });
    const errors = engine.errors.length;
    const second = model.place({ modelMatrix: m4.mat4() });
    const named = model.place({ modelMatrix: m4.mat4(), id: "truck-7" });
    const idOf = (draw = first.draws[0]!) =>
      world.identities.idOfSlot(world.scene.drawFeatureFirst[draw.index]!);
    expect(
      new Set([idOf(), idOf(second.draws[0]), idOf(named.draws[0])]).size,
    ).toBe(3);
    expect(engine.errors.length).toBe(errors + 1);
    expect(engine.errors.at(-1)!.message).toMatch(/#2.*order/);
    expect(() =>
      model.place({ modelMatrix: m4.mat4(), id: "truck-7" }),
    ).toThrow(/its own/);
    // Placed again after removal, under its id, it has the same IDs.
    const before = idOf(named.draws[0]);
    named.remove();
    const again = model.place({ modelMatrix: m4.mat4(), id: "truck-7" });
    expect(idOf(again.draws[0])).toBe(before);
    expect(() =>
      model.place({
        modelMatrix: m4.mat4(),
        labels: { "embedding:clip": ["x"] },
      }),
    ).toThrow(/reserved/);
  });
});
