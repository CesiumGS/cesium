/// <reference lib="webworker" />

/**
 * The Moon map's worker (`loadIonMoonMap`, moonMapLoad.ts): reads and
 * composes the map off the page (moonMap.ts; at the band's level 2 a few
 * hundred milliseconds of decoding, resampling and matching, at level 3
 * over a second). One request, `{ url, headers, level }`, the asset's root
 * tileset and the headers its requests carry; replied `{ ok: true, image,
 * warnings, mean }`, the finished map as a transferred ImageBitmap and its
 * mean albedo (albedo.ts, so the page needn't read the map back), or
 * `{ ok: false, error }`.
 */

import { meanAlbedo } from "../atmosphere/albedo.ts";
import { decodeImage, readMoonMap } from "./moonMap.ts";

export interface MoonMapRequest {
  url: string;
  headers: Record<string, string>;
  level: number;
}

export type MoonMapReply =
  | { ok: true; image: ImageBitmap; warnings: string[]; mean: number }
  | { ok: false; error: string };

self.onmessage = async (event: MessageEvent<MoonMapRequest>) => {
  const { url, headers, level } = event.data;
  let reply: MoonMapReply;
  try {
    const { map, warnings } = await readMoonMap(
      url,
      {
        fetch: async (resource) => {
          const response = await fetch(resource, { headers });
          if (!response.ok) {
            throw new Error(`Moon map: ${resource} (${response.status})`);
          }
          return response;
        },
        decode: decodeImage,
      },
      level,
    );
    const image = await createImageBitmap(
      new ImageData(
        map.data as Uint8ClampedArray<ArrayBuffer>,
        map.width,
        map.height,
      ),
      { colorSpaceConversion: "none" },
    );
    reply = {
      ok: true,
      image,
      warnings,
      mean: meanAlbedo(map.data, map.width, map.height),
    };
  } catch (error) {
    reply = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  self.postMessage(reply, reply.ok ? [reply.image] : []);
};
