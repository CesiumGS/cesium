import { parseGltf } from "../../src/io/gltfParse.ts";
import type { TextureFormatSupport } from "../../src/io/decoders.ts";
import {
  decodeQuantizedMesh,
  flatTerrainTile,
  type Rectangle,
} from "../../src/globe/quantizedMesh.ts";
import { extractStars, type StarMapFace } from "../../src/atmosphere/stars.ts";
import { demTile, overlaps, type Dem } from "./terrain.ts";

/**
 * Stands in for `src/io/WorkerPool.ts` in the handbook's reel only (the build
 * swaps it in, vite.config.ts). The engine starts module workers, and Chromium
 * refuses those from a page opened from disk, even from a blob. So the jobs run
 * here, between ticks. The reel's tiles need no Draco or Basis, so they're light.
 */
let dem: Dem | undefined;

/** The ground the ellipsoid's tiles take where they cross it. */
export function setGround(ground: Dem | undefined): void {
  dem = ground;
}

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
      const rect = payload.rect as Rectangle;
      const skirt = payload.skirtHeight as number | readonly number[];
      if (dem && overlaps(dem, rect)) {
        const { asset, info } = decodeQuantizedMesh(
          demTile(dem, rect),
          rect,
          skirt,
        );
        return { asset, info } as T;
      }
      const { asset, info } = flatTerrainTile(rect, skirt);
      return { asset, info } as T;
    }
    if (type === "image") {
      const response = await fetch(payload.url as string, {
        signal: signal ?? null,
      });
      const blob = await response.blob();
      if (blob.size === 0) {
        return { empty: true, bytes: 0 } as T;
      }
      const bitmap = await createImageBitmap(blob, {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      return { bitmap, bytes: blob.size } as T;
    }
    if (type === "gltf") {
      const { asset } = await parseGltf(
        payload.url as string,
        payload.textureSupport as TextureFormatSupport,
        payload.headers as Record<string, string> | undefined,
        signal,
      );
      return asset as T;
    }
    if (type === "stars") {
      const faces: StarMapFace[] = await Promise.all(
        (payload.urls as string[]).map(async (url) => {
          const response = await fetch(url);
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
      return extractStars(faces) as T;
    }
    throw new Error(`The reel has no ${type} content.`);
  }
}

/** The engine's other workers start from here. This scene starts none. */
export function workerStart(url: URL): string {
  return url.href;
}
