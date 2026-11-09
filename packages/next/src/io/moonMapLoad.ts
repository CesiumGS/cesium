// The Moon map worker's built URL (`?worker&url`, as WorkerPool's).
import moonMapWorkerUrl from "./moonMapWorker.ts?worker&url";
import { type Attribution, type IonOptions, resolveIonAsset } from "./ion.ts";
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
  attributions: Attribution[];
  /**
   * What went wrong without failing the load: a polar cap that did not
   * load, the band's last row stretched over it instead.
   */
  warnings: string[];
  /**
   * The map's mean albedo (`meanAlbedo` in atmosphere/albedo.ts), for
   * `Engine.setMoonMap(image, mean)`: worked out in the worker, so the page
   * needn't read the map back.
   */
  mean: number;
}

/**
 * How long the worker may take before it is stopped and the load rejects:
 * generous (a warm load at level 2 is under half a second, level 3 about
 * 1.5 s), only so a fetch that hangs can't keep the worker alive.
 */
export const MOON_MAP_TIMEOUT_MS = 120_000;

/**
 * Reads the map from the band's `level` (2: 8 × 4 tiles of 256², a map of
 * 2048 × 1024; each level doubles it), and the polar caps at the matching
 * resolution (moonMap.ts). Rejects without access to the asset; a cap that
 * does not load leaves the band's last row stretched over it, and a
 * warning.
 *
 * The endpoint resolves here; the tiles are fetched, decoded and composed
 * in a worker of their own (moonMapWorker.ts), which hands back the
 * finished map and its mean, and stops: the page only uploads it.
 * Aborting `signal` stops the worker and rejects with an AbortError; so
 * does `timeoutMs` (`MOON_MAP_TIMEOUT_MS`) passing, with an Error.
 */
export async function loadIonMoonMap(
  options: IonOptions & {
    level?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<MoonMap> {
  const asset = await resolveIonAsset(CESIUM_MOON_TERRAIN, options);
  const { image, warnings, mean } = await composeInWorker(
    {
      url: asset.url,
      headers: asset.headers,
      level: options.level ?? 2,
    },
    options,
  );
  return { image, attributions: asset.attributions, warnings, mean };
}

let script: string | undefined;

/**
 * @internal The worker's part of `loadIonMoonMap`: starts it, sends the
 * request, and stops it on its reply, an error, `signal` or the timeout.
 */
export function composeInWorker(
  request: MoonMapRequest,
  {
    signal,
    timeoutMs = MOON_MAP_TIMEOUT_MS,
  }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ image: ImageBitmap; warnings: string[]; mean: number }> {
  if (signal?.aborted) {
    return Promise.reject(aborted());
  }
  script ??= workerStart(new URL(moonMapWorkerUrl, import.meta.url));
  const worker = new Worker(script, { type: "module" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  return new Promise<{ image: ImageBitmap; warnings: string[]; mean: number }>(
    (resolve, reject) => {
      worker.onmessage = (event: MessageEvent<MoonMapReply>) => {
        const reply = event.data;
        if (reply.ok) {
          resolve({
            image: reply.image,
            warnings: reply.warnings,
            mean: reply.mean,
          });
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
      onAbort = () => reject(aborted());
      signal?.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(
        () =>
          reject(new Error(`Moon map: timed out after ${timeoutMs / 1000} s`)),
        timeoutMs,
      );
      worker.postMessage(request);
    },
  ).finally(() => {
    clearTimeout(timer);
    if (onAbort) {
      signal?.removeEventListener("abort", onAbort);
    }
    worker.terminate();
  });
}

function aborted(): DOMException {
  return new DOMException("Moon map: aborted", "AbortError");
}
