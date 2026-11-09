// Loading content into an engine: models, tilesets and globes.
import { Globe } from "../globe/Globe.ts";
import { GlobeImagery } from "../globe/GlobeImagery.ts";
import type { ImageryProvider } from "../globe/ImageryProvider.ts";
import { TerrainSource } from "../globe/TerrainSource.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { CustomShader } from "./CustomShader.ts";
import type { Engine, GlobeOptions } from "./Engine.ts";
import type { World } from "./World.ts";
import {
  type ModelResourceOptions,
  type ModelResource,
  uploadModel,
} from "./gltfModel.ts";
import { Tileset3D } from "../streaming/Tileset3D.ts";
import type { TilesetOptions } from "../streaming/tilesetTypes.ts";
import type { EngineScene } from "./engineScene.ts";

/** Scene side: loading models and adopting tilesets. */
export interface ContentEngine extends Pick<
  Engine,
  "clamping" | "ctx" | "gpu" | "loadGltf" | "tilesets" | "uploadModel" | "wake"
> {
  readonly scene: Pick<EngineScene, "workers">;
}

export function loadGltfFile(
  engine: ContentEngine,
  url: string | URL,
  options: { headers?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<GltfAsset> {
  return engine.scene.workers.request<GltfAsset>(
    "gltf",
    {
      url: new URL(url, globalThis.location?.href).href,
      headers: options.headers,
      // KTX2/Basis textures are transcoded to a block format this device supports.
      textureSupport: engine.gpu.caps.textureCompression,
    },
    options.signal,
  );
}

export async function compileShader(
  engine: ContentEngine,
  shader: CustomShader,
): Promise<void> {
  await engine.ctx.shaders.compile(shader);
}

export async function loadModel(
  engine: ContentEngine,
  world: World,
  url: string | URL,
  options: ModelResourceOptions & {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {},
): Promise<ModelResource> {
  const { headers, signal, ...upload } = options;
  const asset = await engine.loadGltf(url, {
    ...(headers ? { headers } : {}),
    ...(signal ? { signal } : {}),
  });
  signal?.throwIfAborted();
  return engine.uploadModel(world, asset, {
    name: String(url).split("/").pop(),
    ...upload,
  });
}

export function uploadModelTo(
  engine: ContentEngine,
  world: World,
  asset: GltfAsset,
  options: ModelResourceOptions = {},
): ModelResource {
  return uploadModel(
    { ctx: engine.ctx, clamping: engine.clamping },
    world,
    asset,
    options,
  );
}

export async function loadTileset(
  engine: Engine,
  url: string | URL,
  options?: TilesetOptions,
): Promise<Tileset3D> {
  return Tileset3D.load(
    engine,
    undefined,
    new URL(url, globalThis.location?.href).href,
    options,
  );
}

export function adoptTileset(engine: ContentEngine, tileset: Tileset3D): void {
  engine.tilesets.push(tileset);
  engine.wake();
}

export async function addTileset(
  engine: Engine,
  world: World,
  url: string | URL,
  options?: TilesetOptions,
): Promise<Tileset3D> {
  const tileset = await Tileset3D.load(
    engine,
    world,
    new URL(url, globalThis.location?.href).href,
    options,
  );
  engine.tilesets.push(tileset);
  engine.wake();
  return tileset;
}

export async function addTerrain(
  engine: Engine,
  world: World,
  url: string | URL,
  options: GlobeOptions = {},
): Promise<Globe> {
  const base = new URL(url, globalThis.location?.href);
  const layer = base.pathname.endsWith(".json")
    ? base
    : new URL("layer.json", base.href.endsWith("/") ? base : `${base.href}/`);
  const headers = options.headers;
  const source = await TerrainSource.create(
    layer.href,
    headers,
    engine.scene.terrainLoader,
    { warnings: new Set() },
  );
  return addGlobeSource(engine, world, source, options);
}

export function addEllipsoid(
  engine: Engine,
  world: World,
  options: GlobeOptions = {},
): Globe {
  const source = TerrainSource.ellipsoid(engine.scene.terrainLoader, {
    warnings: new Set(),
  });
  return addGlobeSource(engine, world, source, options);
}

function addGlobeSource(
  engine: Engine,
  world: World,
  source: TerrainSource,
  options: GlobeOptions,
): Globe {
  const tileset = Globe.create(engine, world, source, {
    maximumScreenSpaceError: 2,
    ...options,
  });
  const drape = (provider: ImageryProvider) =>
    new GlobeImagery(
      engine.ctx,
      world,
      provider,
      engine.requests,
      engine.scene.workers,
      options.imageryOptions,
    );
  if (options.lights) {
    void Promise.resolve(options.lights).then(
      (provider) => {
        if (provider && engine.tilesets.includes(tileset)) {
          tileset.lights = new GlobeImagery(
            engine.ctx,
            world,
            provider,
            engine.requests,
            engine.scene.workers,
            { role: "lights" },
          );
          engine.requestRender();
        }
      },
      () => undefined,
    );
  }
  if (options.imagery instanceof Promise) {
    tileset.imageryPending = true;
    void options.imagery.then(
      (provider) => {
        if (engine.tilesets.includes(tileset)) {
          tileset.imagery = provider ? drape(provider) : undefined;
        }
        tileset.imageryPending = false;
        engine.requestRender();
      },
      () => {
        tileset.imageryPending = false;
        engine.requestRender();
      },
    );
  } else if (options.imagery) {
    tileset.imagery = drape(options.imagery);
  }
  engine.tilesets.push(tileset);
  engine.wake();
  return tileset;
}

export function removeTileset(engine: ContentEngine, tileset: Tileset3D): void {
  const index = engine.tilesets.indexOf(tileset);
  if (index >= 0) {
    engine.tilesets.splice(index, 1);
  }
  tileset.destroy();
  engine.wake();
}
