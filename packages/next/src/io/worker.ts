/// <reference lib="webworker" />
import { parseGltf } from "./gltfParse.ts";
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
