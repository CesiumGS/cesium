// Tileset3D's declaration, placement and tileOfDraw (plan 4b task 11). No
// earlier test constructs a Tileset3D; this one sets up the harness: the fake
// engine of test/fakeGpu.ts, a stubbed `fetch` serving tileset.json, and
// `engine.loadGltf` answering with a decoded one-triangle asset (the fake
// engine's workers never answer, and the glTF parser's Basis transcoder
// doesn't load in Node).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import { ENGINEERING_FRAME_EXTENSION } from "../src/engineering/georeference.ts";
import { georeferenceTileset } from "../src/engineering/georeferenceTileset.ts";
import { GridCatalog } from "../src/engineering/gridCatalog.ts";
import type { GridSource } from "../src/engineering/proj.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import { Tileset3D, type TilesetOptions } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/corridor/";
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

const reprojected = {
  crs: {
    format: "wkid",
    extensions: {
      EXT_geospatial_crs_wkid: { authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
    },
  },
  placement: { mode: "reprojected" },
};

/** A one-tile tileset at the equator and prime meridian. */
function tilesetJson(extensions?: Record<string, unknown>) {
  return {
    asset: { version: "1.1" },
    geometricError: 100,
    root: {
      geometricError: 0,
      refine: "REPLACE",
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
      boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
      content: { uri: "tile.gltf" },
    },
    ...(extensions ? { extensions } : {}),
  };
}

function serve(json: unknown): void {
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input);
    if (url === URL_) {
      return new Response(JSON.stringify(json), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
}

/** A view 1 km above the tile, looking down. */
function view(): SelectionView {
  return {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

describe("Tileset3D: the declaration, placement and tileOfDraw", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    // Content as the worker would decode it: only the content URL is checked.
    vi.spyOn(engine, "loadGltf").mockImplementation(async (url) => {
      expect(String(url)).toBe(`${BASE}tile.gltf`);
      return triangle();
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function load(json: unknown, options: TilesetOptions = {}) {
    serve(json);
    return Tileset3D.load(engine, engine.createWorld(), URL_, options);
  }

  it("reads extensions and the declaration", async () => {
    const tileset = await load(
      tilesetJson({
        [ENGINEERING_FRAME_EXTENSION]: { name: "Corridor", ...reprojected },
        EXT_other: { a: 1 },
      }),
    );
    expect(Object.keys(tileset.extensions)).toEqual([
      ENGINEERING_FRAME_EXTENSION,
      "EXT_other",
    ]);
    expect(tileset.extensions.EXT_other).toEqual({ a: 1 });
    expect(tileset.georeference).toEqual({
      name: "Corridor",
      body: EARTH,
      crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
      placement: { mode: "reprojected" },
      // Derived from the root's 10 m box at (0°, 0°).
      areaOfInterest: expect.any(Object),
      sources: {
        declaration: "extensions.BENTLEY_engineering_frame",
        crs: "extensions.BENTLEY_engineering_frame.crs",
        areaOfInterest: "root.boundingVolume",
      },
      warnings: [],
    });
    const area = tileset.georeference!.areaOfInterest!;
    for (const degrees of Object.values(area)) {
      expect(Math.abs(degrees)).toBeLessThan(1e-3);
    }
    expect(area.west).toBeLessThan(area.east);
    expect(area.south).toBeLessThan(area.north);
    // Parsing loads nothing: no placement until georeferenceTileset.
    expect(tileset.placement).toBeUndefined();
    expect([...tileset.warnings]).toEqual([]);
  });

  it("loads a declaration under the old name, EXT_engineering_frame, with a warning", async () => {
    const tileset = await load(
      tilesetJson({
        EXT_engineering_frame: { name: "Corridor", ...reprojected },
      }),
    );
    expect(tileset.georeference!.name).toBe("Corridor");
    expect(tileset.georeference!.sources.declaration).toBe(
      "extensions.EXT_engineering_frame",
    );
    expect([...tileset.warnings]).toEqual([
      "EXT_engineering_frame is renamed BENTLEY_engineering_frame",
    ]);
  });

  it("has no extensions and no declaration when the tileset has none", async () => {
    const tileset = await load(tilesetJson());
    expect(tileset.extensions).toEqual({});
    expect(tileset.georeference).toBeUndefined();
    expect(tileset.placement).toBeUndefined();
  });

  it("warns about a malformed declaration, naming the path, and still loads", async () => {
    const tileset = await load(
      tilesetJson({
        [ENGINEERING_FRAME_EXTENSION]: {
          ...reprojected,
          placement: { mode: "warped" },
        },
      }),
    );
    expect(tileset.georeference).toBeUndefined();
    const warnings = [...tileset.warnings];
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(
      "extensions.BENTLEY_engineering_frame.placement.mode",
    );
    expect(tileset.root).toBeDefined();
  });

  it("takes an application's placement for an undeclared tileset", async () => {
    const placement = { mode: "reprojected" } as unknown as TilesetPlacement;
    const tileset = await load(tilesetJson(), { placement });
    expect(tileset.placement).toBe(placement);
    tileset.placement = undefined;
    expect(tileset.placement).toBeUndefined();
  });

  it("drops a placement when modelMatrix changes, with a warning", async () => {
    const placement = { mode: "reprojected" } as unknown as TilesetPlacement;
    const tileset = await load(tilesetJson(), { placement });
    // The same matrix again changes nothing.
    tileset.modelMatrix = m4.mat4();
    expect(tileset.placement).toBe(placement);
    tileset.modelMatrix = m4.setTranslation(
      m4.mat4(),
      new Float64Array([0, 0, 5]),
    );
    expect(tileset.placement).toBeUndefined();
    expect([...tileset.warnings].join("\n")).toContain("modelMatrix");
  });

  it("georeferenceTileset refuses a non-identity modelMatrix, and warns", async () => {
    const proj = new Proxy(
      {},
      {
        get() {
          throw new Error("PROJ was used");
        },
      },
    ) as ProjApi;
    const declared = tilesetJson({
      [ENGINEERING_FRAME_EXTENSION]: reprojected,
    });
    const lifted = m4.setTranslation(m4.mat4(), new Float64Array([0, 0, 5]));
    const atLoad = await load(declared, { modelMatrix: lifted });
    await expect(georeferenceTileset(atLoad, { proj })).rejects.toThrow(
      /modelMatrix/,
    );
    expect([...atLoad.warnings].join("\n")).toContain("modelMatrix");
    expect(atLoad.placement).toBeUndefined();

    const later = await load(declared);
    later.modelMatrix = lifted;
    await expect(georeferenceTileset(later, { proj })).rejects.toThrow(
      /modelMatrix/,
    );
    expect([...later.warnings].join("\n")).toContain("modelMatrix");
  });

  it("georeferenceTileset refuses a tileset that declares nothing", async () => {
    const tileset = await load(tilesetJson());
    await expect(
      georeferenceTileset(tileset, { proj: {} as ProjApi }),
    ).rejects.toThrow(/BENTLEY_engineering_frame/);
    expect(tileset.placement).toBeUndefined();
  });

  describe("georeferenceTileset around the frame's load (EngineeringFrame.load stubbed)", () => {
    const declared = () =>
      tilesetJson({ [ENGINEERING_FRAME_EXTENSION]: reprojected });
    const frame = { definition: { name: "stub" } } as EngineeringFrame;

    it("places a reprojected declaration when nothing changes", async () => {
      const tileset = await load(declared());
      const spy = vi.spyOn(EngineeringFrame, "load").mockResolvedValue(frame);
      try {
        const placement = await georeferenceTileset(tileset, {
          proj: {} as ProjApi,
        });
        expect(placement.mode).toBe("reprojected");
        expect(placement.frame).toBe(frame);
        expect(tileset.placement).toBe(placement);
        expect(spy.mock.calls[0]![0]).toMatchObject({ name: URL_ });
        expect([...tileset.warnings]).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });

    const PIPELINE =
      "+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1";
    const catalog = GridCatalog.parse(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: "us_noaa_g2018u0.tif",
              url: "https://cdn.proj.org/us_noaa_g2018u0.tif",
              sha256sum: "a".repeat(64),
              file_size: 1,
            },
          },
        ],
      }),
    );
    const grids = { base: "/proj-grids/", catalog } as GridSource;

    it("passes a declared pipeline, or a geoid fallback, to the frame's load", async () => {
      const spy = vi.spyOn(EngineeringFrame, "load").mockResolvedValue(frame);
      try {
        const pinned = await load(
          tilesetJson({
            [ENGINEERING_FRAME_EXTENSION]: {
              ...reprojected,
              pipeline: PIPELINE,
            },
          }),
        );
        await georeferenceTileset(pinned, { proj: {} as ProjApi, grids });
        expect(spy.mock.calls[0]![0]).toMatchObject({ pipeline: PIPELINE });
        const fallback = await load(
          tilesetJson({
            [ENGINEERING_FRAME_EXTENSION]: {
              ...reprojected,
              geoidFallback: "EGM96",
              fallbackSigma: 0.5,
            },
          }),
        );
        await georeferenceTileset(fallback, { proj: {} as ProjApi });
        expect(spy.mock.calls[1]![0]).toMatchObject({
          geoidFallback: "EGM96",
          fallbackSigma: 0.5,
        });
        expect(spy.mock.calls[1]![0]).not.toHaveProperty("pipeline");
      } finally {
        spy.mockRestore();
      }
    });

    it("refuses, and warns, a declared pipeline whose grids no catalog checks, before loading", async () => {
      const spy = vi.spyOn(EngineeringFrame, "load").mockResolvedValue(frame);
      try {
        for (const options of [
          { proj: {} as ProjApi },
          {
            proj: {} as ProjApi,
            grids: {
              base: "/proj-grids/",
              catalog: GridCatalog.parse('{"features": []}'),
            } as GridSource,
          },
        ]) {
          const tileset = await load(
            tilesetJson({
              [ENGINEERING_FRAME_EXTENSION]: {
                ...reprojected,
                pipeline: PIPELINE,
              },
            }),
          );
          await expect(georeferenceTileset(tileset, options)).rejects.toThrow(
            /pipeline/,
          );
          expect([...tileset.warnings].join("\n")).toContain("pipeline");
          expect(tileset.placement).toBeUndefined();
        }
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it("refuses, and warns, when modelMatrix changes while the frame loads", async () => {
      const tileset = await load(declared());
      const spy = vi
        .spyOn(EngineeringFrame, "load")
        .mockImplementation(async () => {
          // The application moves the tileset while grids download.
          tileset.modelMatrix = m4.setTranslation(
            m4.mat4(),
            new Float64Array([0, 0, 5]),
          );
          return frame;
        });
      try {
        await expect(
          georeferenceTileset(tileset, { proj: {} as ProjApi }),
        ).rejects.toThrow(/modelMatrix/);
        expect(spy).toHaveBeenCalledOnce();
        expect(tileset.placement).toBeUndefined();
        expect([...tileset.warnings].join("\n")).toContain("modelMatrix");
      } finally {
        spy.mockRestore();
      }
    });

    it("places nothing, and doesn't warn, when the tileset is destroyed while the frame loads", async () => {
      const tileset = await load(declared());
      const spy = vi
        .spyOn(EngineeringFrame, "load")
        .mockImplementation(async () => {
          tileset.destroy();
          return frame;
        });
      try {
        expect(tileset.isDestroyed()).toBe(false);
        await expect(
          georeferenceTileset(tileset, { proj: {} as ProjApi }),
        ).rejects.toThrow(/was destroyed while its frame loaded/);
        expect(tileset.isDestroyed()).toBe(true);
        expect(tileset.placement).toBeUndefined();
        expect([...tileset.warnings]).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });

    it("refuses, and warns, a rigid placement whose frame gives non-finite numbers", async () => {
      const rigidDeclaration = () =>
        tilesetJson({
          [ENGINEERING_FRAME_EXTENSION]: {
            ...reprojected,
            placement: { mode: "rigid", anchor: [0, 0, 0] },
          },
        });
      const frames = [
        // A Helmert of absurd values: PROJ answers NaN.
        () => Float64Array.of(Number.NaN, Number.NaN, Number.NaN),
        // The transformer's own refusal of a non-finite result.
        () => {
          throw new RangeError("PROJ cannot transform (0, 0, 0)");
        },
      ].map(
        (toBodyFixed) =>
          ({
            definition: { name: "stub" },
            units: { metersPerUnit: 1, verticalDirection: "up" },
            metersPerHeightUnit: 1,
            body: EARTH,
            toBodyFixed,
          }) as unknown as EngineeringFrame,
      );
      for (const stub of frames) {
        const tileset = await load(rigidDeclaration());
        const spy = vi.spyOn(EngineeringFrame, "load").mockResolvedValue(stub);
        try {
          await expect(
            georeferenceTileset(tileset, { proj: {} as ProjApi }),
          ).rejects.toThrow(/placement\.anchor/);
          expect([...tileset.warnings].join("\n")).toContain(
            "placement.anchor",
          );
          expect(tileset.placement).toBeUndefined();
        } finally {
          spy.mockRestore();
        }
      }
    });

    it("refuses, and warns, when the frame doesn't load", async () => {
      const tileset = await load(declared());
      const spy = vi
        .spyOn(EngineeringFrame, "load")
        .mockRejectedValue(new Error(`PROJ said no ${"x".repeat(500)}`));
      try {
        await expect(
          georeferenceTileset(tileset, { proj: {} as ProjApi }),
        ).rejects.toThrow(/doesn't load: PROJ said no/);
        const warning = [...tileset.warnings].join("\n");
        expect(warning).toContain("doesn't load");
        expect(warning.length).toBeLessThan(400);
        expect(tileset.placement).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
    });
  });

  it("tileOfDraw finds a loaded tile's draw, and nothing once it unloads", async () => {
    const tileset = await load(tilesetJson(), { cacheBytes: 0 });
    const tile = tileset.root;
    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([view()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tile.state).toBe("ready");
    const draws = tile.placement!.draws;
    expect(draws.length).toBeGreaterThan(0);
    for (const draw of draws) {
      expect(tileset.tileOfDraw(draw)).toBe(tile);
    }
    // Another generation of the same slot is not this tile's.
    const stale = { ...draws[0]!, generation: draws[0]!.generation + 1 };
    expect(tileset.tileOfDraw(stale)).toBeUndefined();

    // No view touches it: over a zero budget, it is evicted.
    tileset.update([]);
    expect(tile.state).toBe("unloaded");
    for (const draw of draws) {
      expect(tileset.tileOfDraw(draw)).toBeUndefined();
    }

    // Loaded again, then destroyed.
    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([view()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const again = tile.placement!.draws;
    expect(tileset.tileOfDraw(again[0]!)).toBe(tile);
    tileset.destroy();
    expect(tileset.tileOfDraw(again[0]!)).toBeUndefined();
  });
});
