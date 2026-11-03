/// <reference lib="webworker" />
import { parseGltf } from "./gltfParse.ts";
import {
  decodeQuantizedMesh,
  flatTerrainTile,
  type Rectangle,
} from "../globe/quantizedMesh.ts";

/** Quantized-mesh with the extensions we decode, as 1.x requests it. */
const TERRAIN_ACCEPT =
  "application/vnd.quantized-mesh;extensions=octvertexnormals-metadata,application/octet-stream;q=0.9,*/*;q=0.01";
import type { TextureFormatSupport } from "./decoders.ts";
import { extractStars, type StarMapFace } from "../atmosphere/stars.ts";

/**
 * Content worker. Each request is `{ id, type, ...payload }`; each reply is
 * `{ id, ok, result | error }` with large arrays and images transferred.
 * `{ id, type: "cancel" }` aborts request `id` (its fetches stop).
 */
const controllers = new Map<number, AbortController>();

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    type: string;
    url: string;
    headers?: Record<string, string>;
    textureSupport: TextureFormatSupport;
    rect: Rectangle;
    skirtHeight: number;
    /** "stars": the star map's six faces. */
    urls?: string[];
  }>,
) => {
  const { id, type } = event.data;
  if (type === "cancel") {
    controllers.get(id)?.abort();
    return;
  }
  const controller = new AbortController();
  controllers.set(id, controller);
  try {
    if (type === "terrain" && event.data.url.startsWith("ellipsoid:")) {
      // The ellipsoid without terrain data: a flat tile, built here.
      const { asset, info, transfer } = flatTerrainTile(
        event.data.rect,
        event.data.skirtHeight,
      );
      self.postMessage({ id, ok: true, result: { asset, info } }, transfer);
      return;
    }
    if (type === "terrain") {
      const start = performance.now();
      const response = await fetch(event.data.url, {
        headers: { ...event.data.headers, Accept: TERRAIN_ACCEPT },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`terrain tile: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const decodeStart = performance.now();
      const { asset, info, transfer } = decodeQuantizedMesh(
        buffer,
        event.data.rect,
        event.data.skirtHeight,
      );
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
    if (type === "stars") {
      // The stars read out of a star map (atmosphere/stars.ts): about a
      // second of work, here rather than on the page.
      const faces: StarMapFace[] = await Promise.all(
        (event.data.urls ?? []).map(async (url) => {
          const response = await fetch(url, { signal: controller.signal });
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
      const field = extractStars(faces);
      self.postMessage({ id, ok: true, result: field }, [
        field.points.buffer,
        ...field.background.map((face) => face.buffer),
      ]);
      return;
    }
    if (type === "image") {
      // An imagery tile, decoded here (createImageBitmap), off the main thread.
      const start = performance.now();
      const response = await fetch(event.data.url, {
        ...(event.data.headers ? { headers: event.data.headers } : {}),
        signal: controller.signal,
      });
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
      event.data.textureSupport,
      event.data.headers,
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
