/// <reference lib="webworker" />
import { parseGltf } from "./gltfParse.ts";
import { settleWorkerFetch, workerFetch } from "./workerFetch.ts";
import { WorkerDecoders } from "./workerDecoders.ts";
import {
  decodeQuantizedMesh,
  flatTerrainTile,
  upsampleTerrainTile,
  type Rectangle,
  type MorphSource,
  type TerrainRefitParent,
  type TerrainHeights,
} from "../globe/quantizedMesh.ts";
import { deviationFromParent } from "../globe/terrainRefit.ts";

/** Quantized-mesh with the extensions we decode, as 1.x requests it. */
const TERRAIN_ACCEPT =
  "application/vnd.quantized-mesh;extensions=octvertexnormals-metadata,application/octet-stream;q=0.9,*/*;q=0.01";
import type { TextureTranscodePath } from "../profile/paths.ts";
import { loadSkyPack } from "../atmosphere/skyPack.ts";
import { withStarCells } from "../atmosphere/starCells.ts";
import { computeKernel, kernelImage } from "../render/post/glareKernel.ts";
import type { GlarePupil } from "../scene/observer.ts";
import {
  extractStars,
  type StarField,
  type StarMapFace,
} from "../atmosphere/stars.ts";

/**
 * Content worker. Each request is `{ id, type, ...payload }`; each reply is
 * `{ id, ok, result | error }` with large arrays and images transferred.
 * `{ id, type: "cancel" }` aborts request `id` (its fetches stop).
 */
const controllers = new Map<number, AbortController>();

/**
 * Decoders source kinds registered (`WorkerPool.loadDecoder`): their jobs'
 * requests go through the page's provider, as the built-in types' do.
 */
const decoders = new WorkerDecoders(
  undefined,
  (id, signal) => (url, init) =>
    workerFetch(url, {
      kind: "content",
      scope: id,
      signal,
      ...(init?.accept ? { accept: init.accept } : {}),
    }),
);

/** What a star field's reply hands over rather than copies. */
const starFieldBuffers = (field: StarField): ArrayBuffer[] =>
  [
    field.points,
    ...(field.cells ? [field.cells.table, field.cells.illuminance] : []),
    ...(field.glareStars ? [field.glareStars] : []),
    ...field.backgroundLevels.flat(),
  ].map((array) => array.buffer as ArrayBuffer);

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    type: string;
    url: string;
    /** What KTX2 textures are transcoded to: the engine's `textureTranscode` path. */
    textureTarget: TextureTranscodePath;
    rect: Rectangle;
    skirtHeight: number | readonly number[];
    /** A terrain tile also carries `h·n̂` per vertex, or `(n̂, h)` for `"profile"` (`TerrainLoader`). */
    heightNormal?: true | "profile";
    /** A terrain tile also carries its nearest drawn ancestor's height per vertex, for geomorphing (`TerrainLoader`). */
    morph?: MorphSource;
    /** A terrain tile's parent surface: its deviation from it is measured here (`TerrainRefitParent`). */
    refit?: TerrainRefitParent;
    /** A terrain tile below the last level with data (`TerrainLoader`). */
    upsample?: { rect: Rectangle; heights?: TerrainHeights; url?: string };
    /** "stars": the star map's six faces. */
    urls?: string[];
    /** "glareKernel": the pupil, and its grid. */
    aperture?: GlarePupil;
    size?: number;
  }>,
) => {
  if (settleWorkerFetch(event.data) || decoders.handleLoad(event.data)) {
    return;
  }
  const { id, type } = event.data;
  if (type === "cancel") {
    controllers.get(id)?.abort();
    return;
  }
  const controller = new AbortController();
  controllers.set(id, controller);
  if (decoders.has(type)) {
    // A registered decoder's job (a source kind's, CS-847).
    void decoders
      .run(event.data, controller.signal, (reply, transfer) =>
        self.postMessage(reply, transfer),
      )
      .finally(() => controllers.delete(id));
    return;
  }
  // Requests go through the page's provider, with this job's headers there
  // (workerFetch.ts): the worker never holds them.
  const request = (
    url: string,
    kind: "content" | "terrain" | "imagery" | "asset",
    accept?: string,
  ) =>
    workerFetch(url, {
      kind,
      scope: id,
      signal: controller.signal,
      ...(accept ? { accept } : {}),
    });
  try {
    const decodeOptions = {
      ...(event.data.heightNormal
        ? { heightNormal: event.data.heightNormal }
        : {}),
      ...(event.data.morph ? { morph: event.data.morph } : {}),
    };
    if (type === "terrain" && event.data.url.startsWith("ellipsoid:")) {
      // The ellipsoid without terrain data: a flat tile, built here.
      const { asset, info, transfer } = flatTerrainTile(
        event.data.rect,
        event.data.skirtHeight,
        undefined,
        decodeOptions,
      );
      self.postMessage({ id, ok: true, result: { asset, info } }, transfer);
      return;
    }
    const upsample = event.data.upsample;
    if (type === "terrain" && upsample) {
      // Clipped from the nearest tile with data: from its heights, or from
      // its content again once they left the cache.
      const start = performance.now();
      let heights = upsample.heights;
      let bytes = 0;
      if (!heights) {
        const response = await request(
          upsample.url!,
          "terrain",
          TERRAIN_ACCEPT,
        );
        if (!response.ok) {
          throw new Error(`terrain tile: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        bytes = buffer.byteLength;
        heights = decodeQuantizedMesh(buffer, upsample.rect, 0).info.heights!;
      }
      const decodeStart = performance.now();
      const { asset, info, transfer } = upsampleTerrainTile(
        heights,
        upsample.rect,
        event.data.rect,
        event.data.skirtHeight,
        decodeOptions,
      );
      if (bytes > 0) {
        // Fetched again: its bytes count (none without a fetch, as the
        // ellipsoid's).
        asset.timing = {
          format: "quantized-mesh",
          networkMs: decodeStart - start,
          bytes,
          decodeMs: performance.now() - decodeStart,
          images: {},
        };
      }
      self.postMessage({ id, ok: true, result: { asset, info } }, transfer);
      return;
    }
    if (type === "terrain") {
      const start = performance.now();
      const response = await request(event.data.url, "terrain", TERRAIN_ACCEPT);
      if (!response.ok) {
        throw new Error(`terrain tile: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const decodeStart = performance.now();
      const { asset, info, transfer } = decodeQuantizedMesh(
        buffer,
        event.data.rect,
        event.data.skirtHeight,
        decodeOptions,
      );
      const parent = event.data.refit;
      if (parent && info.heights) {
        // The parent's heights came over from the page: the deviation
        // costs the page nothing (`deviationFromParent` keeps its caps).
        info.deviation = deviationFromParent(
          info.heights,
          parent.heights,
          parent.qx,
          parent.qy,
        );
      }
      asset.timing = {
        format: "quantized-mesh",
        networkMs: decodeStart - start,
        bytes: buffer.byteLength,
        decodeMs: performance.now() - decodeStart,
        images: {},
      };
      self.postMessage({ id, ok: true, result: { asset, info } }, transfer);
      return;
    }
    if (type === "terrainDeviation") {
      // A terrain tile's deviation from its parent's mesh, for a pair the
      // decode didn't measure (`TerrainSource`'s refit jobs).
      const d = event.data as unknown as {
        child: TerrainHeights;
        parent: TerrainHeights;
        qx: number;
        qy: number;
      };
      self.postMessage({
        id,
        ok: true,
        result: deviationFromParent(d.child, d.parent, d.qx, d.qy),
      });
      return;
    }
    if (type === "stars") {
      // The stars read out of a star map (atmosphere/stars.ts): about a
      // second of work, here rather than on the page.
      const faces: StarMapFace[] = await Promise.all(
        (event.data.urls ?? []).map(async (url) => {
          const response = await request(url, "asset");
          if (!response.ok) {
            throw new Error(`star map: ${response.status}`);
          }
          const bitmap = await createImageBitmap(await response.blob(), {
            colorSpaceConversion: "none",
            premultiplyAlpha: "none",
          });
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext("2d")!;
          context.drawImage(bitmap, 0, 0);
          return {
            data: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
            width: bitmap.width,
          };
        }),
      );
      const field = withStarCells(extractStars(faces));
      self.postMessage(
        { id, ok: true, result: field },
        starFieldBuffers(field),
      );
      return;
    }
    if (type === "glareKernel") {
      // A pupil's spikes (render/post/glareKernel.ts): computed once, here.
      const image = kernelImage(
        computeKernel(event.data.aperture!, event.data.size!),
      );
      self.postMessage({ id, ok: true, result: image }, [
        ...image.levels.map((level) => level.buffer as ArrayBuffer),
        image.radii.buffer as ArrayBuffer,
      ]);
      return;
    }
    if (type === "skyPack") {
      // A sky data pack (atmosphere/skyPack.ts): read and checked here.
      const loaded = await loadSkyPack(
        event.data.url,
        ((input: RequestInfo | URL, init?: RequestInit) =>
          workerFetch(String(input), {
            kind: "asset",
            scope: id,
            ...(init?.signal ? { signal: init.signal } : {}),
          })) as typeof fetch,
        controller.signal,
      );
      const result = { ...loaded, field: withStarCells(loaded.field) };
      self.postMessage(
        { id, ok: true, result },
        starFieldBuffers(result.field),
      );
      return;
    }
    if (type === "image") {
      // An imagery tile, decoded here (createImageBitmap), off the main thread.
      const start = performance.now();
      const response = await request(event.data.url, "imagery");
      if (!response.ok) {
        throw new Error(`imagery tile: ${response.status}`);
      }
      const blob = await response.blob();
      if (blob.size === 0) {
        // No imagery here (Bing answers missing tiles with an empty body).
        self.postMessage({ id, ok: true, result: { empty: true, bytes: 0 } });
        return;
      }
      const decodeStart = performance.now();
      const bitmap = await createImageBitmap(blob, {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      self.postMessage(
        {
          id,
          ok: true,
          result: {
            bitmap,
            bytes: blob.size,
            networkMs: decodeStart - start,
            decodeMs: performance.now() - decodeStart,
          },
        },
        [bitmap],
      );
      return;
    }
    if (type !== "gltf") {
      throw new Error(`Unknown request type "${type}"`);
    }
    const { asset, transfer } = await parseGltf(
      event.data.url,
      event.data.textureTarget,
      (url, signal) =>
        workerFetch(url, {
          kind: "content",
          scope: id,
          signal: signal ?? controller.signal,
        }),
      controller.signal,
    );
    self.postMessage({ id, ok: true, result: asset }, transfer);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    controllers.delete(id);
  }
};
