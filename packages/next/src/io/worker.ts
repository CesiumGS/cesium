/// <reference lib="webworker" />
import { parseGltf } from "./gltfParse.ts";
import { decodeQuantizedMesh, type Rectangle } from "../globe/quantizedMesh.ts";

/** Quantized-mesh with the extensions we decode, as 1.x requests it. */
const TERRAIN_ACCEPT =
  "application/vnd.quantized-mesh;extensions=octvertexnormals-metadata,application/octet-stream;q=0.9,*/*;q=0.01";
import type { TextureFormatSupport } from "./decoders.ts";

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
