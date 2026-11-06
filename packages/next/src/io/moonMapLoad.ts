// The Moon map worker's built URL (`?worker&url`, as WorkerPool's).
import moonMapWorkerUrl from "./moonMapWorker.ts?worker&url";
import {
  type IonAttribution,
  type IonOptions,
  resolveIonAsset,
} from "./ion.ts";
import { CESIUM_MOON_TERRAIN } from "./moonMap.ts";
import type { MoonMapReply, MoonMapRequest } from "./moonMapWorker.ts";
import { workerStart } from "./WorkerPool.ts";

export interface MoonMap {
  /**
   * Equirectangular, longitude 0 (the near side's center) in the middle,
   * north up, sRGB (`Engine.setMoonMap`).
   */
  image: ImageBitmap;
  /** What the map must credit on screen. */
  attributions: IonAttribution[];
  /**
   * What went wrong without failing the load: a polar cap that did not
   * load, the band's last row stretched over it instead.
   */
  warnings: string[];
}

/**
 * Reads the map from the band's `level` (2: 8 × 4 tiles of 256², a map of
 * 2048 × 1024; each level doubles it), and the polar caps at the matching
 * resolution (moonMap.ts). Rejects without access to the asset; a cap that
 * does not load leaves the band's last row stretched over it, and a
 * warning.
 *
 * The endpoint resolves here; the tiles are fetched, decoded and composed
 * in a worker of their own (moonMapWorker.ts), which hands back the
 * finished map and stops: the page only uploads it.
 */
export async function loadIonMoonMap(
  options: IonOptions & { level?: number } = {},
): Promise<MoonMap> {
  const asset = await resolveIonAsset(CESIUM_MOON_TERRAIN, options);
  const { image, warnings } = await composeInWorker({
    url: asset.url,
    headers: asset.headers,
    level: options.level ?? 2,
  });
  return { image, attributions: asset.attributions, warnings };
}

let script: string | undefined;

function composeInWorker(
  request: MoonMapRequest,
): Promise<{ image: ImageBitmap; warnings: string[] }> {
  script ??= workerStart(new URL(moonMapWorkerUrl, import.meta.url));
  const worker = new Worker(script, { type: "module" });
  return new Promise<{ image: ImageBitmap; warnings: string[] }>(
    (resolve, reject) => {
      worker.onmessage = (event: MessageEvent<MoonMapReply>) => {
        const reply = event.data;
        if (reply.ok) {
          resolve({ image: reply.image, warnings: reply.warnings });
        } else {
          reject(new Error(reply.error));
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        reject(
          new Error(
            `Moon map: the worker failed (${event.message || "it did not start"})`,
          ),
        );
      };
      worker.onmessageerror = () => {
        reject(new Error("Moon map: the worker's reply could not be read"));
      };
      worker.postMessage(request);
    },
  ).finally(() => {
    worker.terminate();
  });
}
