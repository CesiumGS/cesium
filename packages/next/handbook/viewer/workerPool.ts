import { flatTerrainTile } from "../../src/globe/quantizedMesh.ts";

/**
 * Stands in for `src/io/WorkerPool.ts` in the handbook's live view only (the
 * build swaps it in, vite.config.ts). The engine starts module workers, and
 * Chromium refuses those from a page opened from disk, even from a blob. This
 * scene needs just two of their jobs, both small, so they run here.
 */
export class WorkerPool {
  warm(): void {}

  destroy(): void {}

  async request<T>(
    type: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (type === "terrain") {
      const { asset, info } = flatTerrainTile(
        payload.rect as Parameters<typeof flatTerrainTile>[0],
        payload.skirtHeight as number | readonly number[],
      );
      return { asset, info } as T;
    }
    if (type === "image") {
      const response = await fetch(payload.url as string, {
        signal: signal ?? null,
      });
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob, {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      return { bitmap, bytes: blob.size } as T;
    }
    throw new Error(`The live view has no ${type} content.`);
  }
}

/** The engine's other workers start from here. This scene starts none. */
export function workerStart(url: URL): string {
  return url.href;
}
