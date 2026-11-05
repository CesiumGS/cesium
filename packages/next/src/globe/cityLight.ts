/**
 * How lit a place's surroundings are at night, from the night lights'
 * image (`GlobeOptions.lights`, e.g. NASA's Black Marble): the mean light
 * the ground emits within `RADIUS` of it, nearer counting more. The sky
 * glows with it (a city's light scattered back down by its air) and lights
 * what stands there from below (sky.slang `cityGlow`), wherever the camera
 * looks. Read from a coarse level of the image, a block of 2 × 2 tiles
 * around the place, each fetched once.
 */

import type { ImageryProvider } from "./ImageryProvider.ts";

/**
 * The night image's brightest white, cd/m² (opaque.wgsl
 * `CITY_LIGHTS_LUMINANCE`), and its dark background (`CITY_LIGHTS_FLOOR`).
 */
export const CITY_LIGHTS_LUMINANCE = 0.3;
const CITY_LIGHTS_FLOOR = 0.004;

/** The surroundings that count, m, and the nearness that stops counting more. */
const RADIUS = 30_000;
const NEAR = 2_000;
const EARTH_RADIUS = 6_371_000;

type Tile = Float32Array | null;

export class CityLight {
  private readonly level: number;
  private readonly tiles = new Map<string, Tile | Promise<Tile>>();

  constructor(
    private readonly provider: ImageryProvider,
    /** Called when a tile it waited for arrives. */
    private readonly loaded: () => void,
  ) {
    // About a kilometer a pixel: Black Marble's half-kilometer texels
    // averaged by two.
    this.level = Math.max(
      provider.minimumLevel,
      Math.min(provider.maximumLevel, 7),
    );
  }

  /**
   * The mean light the ground emits around a place (radians), cd/m²:
   * weighted 1/(d² + NEAR²) within RADIUS. Undefined until its tiles
   * have loaded (or where the image has none).
   */
  around(longitude: number, latitude: number): number | undefined {
    if (this.provider.tilingScheme !== "webMercator") {
      return undefined;
    }
    const n = 2 ** this.level;
    const lat = Math.max(Math.min(latitude, 1.4844), -1.4844);
    const fx = ((longitude + Math.PI) / (2 * Math.PI)) * n;
    const fy =
      ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n;
    const x0 = Math.floor(fx - 0.5);
    const y0 = Math.max(Math.min(Math.floor(fy - 0.5), n - 2), 0);
    const size = this.provider.tileSize;
    const cosLat = Math.cos(lat);
    // All four asked for at once; none read until all have come.
    const tiles: Tile[] = [];
    let waiting = false;
    for (let ty = y0; ty < y0 + 2; ty++) {
      for (let tx = x0; tx < x0 + 2; tx++) {
        const tile = this.tile(((tx % n) + n) % n, ty);
        waiting ||= tile === undefined;
        tiles.push(tile ?? null);
      }
    }
    if (waiting) {
      return undefined;
    }
    let sum = 0;
    let weights = 0;
    for (let ty = y0; ty < y0 + 2; ty++) {
      for (let tx = x0; tx < x0 + 2; tx++) {
        const tile = tiles[(ty - y0) * 2 + (tx - x0)]!;
        if (tile === null) {
          continue;
        }
        for (let j = 0; j < size; j++) {
          const py = ty + (j + 0.5) / size;
          const pLat = Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / n)));
          const dy = (pLat - lat) * EARTH_RADIUS;
          if (Math.abs(dy) > RADIUS) {
            continue;
          }
          for (let i = 0; i < size; i++) {
            const px = tx + (i + 0.5) / size;
            const dx = ((px - fx) / n) * 2 * Math.PI * EARTH_RADIUS * cosLat;
            const d2 = dx * dx + dy * dy;
            if (d2 > RADIUS * RADIUS) {
              continue;
            }
            const w = 1 / (d2 + NEAR * NEAR);
            sum += tile[j * size + i]! * w;
            weights += w;
          }
        }
      }
    }
    return weights > 0 ? (sum / weights) * CITY_LIGHTS_LUMINANCE : undefined;
  }

  /** A tile's light (0 to 1 linear, past the floor); undefined while it loads. */
  private tile(x: number, y: number): Tile | undefined {
    const key = `${x}/${y}`;
    const entry = this.tiles.get(key);
    if (entry === undefined) {
      const loading = this.load(x, y).then(
        (tile) => {
          this.tiles.set(key, tile);
          this.loaded();
          return tile;
        },
        () => {
          this.tiles.set(key, null);
          return null;
        },
      );
      this.tiles.set(key, loading);
      return undefined;
    }
    return entry instanceof Promise ? undefined : entry;
  }

  private async load(x: number, y: number): Promise<Tile> {
    const response = await fetch(this.provider.tileUrl(x, y, this.level), {
      headers: this.provider.headers ?? {},
    });
    if (!response.ok) {
      return null;
    }
    const image = await createImageBitmap(await response.blob(), {
      colorSpaceConversion: "none",
    });
    const size = this.provider.tileSize;
    const canvas = new OffscreenCanvas(size, size);
    const g = canvas.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(image, 0, 0, size, size);
    image.close();
    const rgba = g.getImageData(0, 0, size, size).data;
    const out = new Float32Array(size * size);
    const linear = (c: number) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    for (let k = 0; k < out.length; k++) {
      const y =
        0.2126 * linear(rgba[k * 4]!) +
        0.7152 * linear(rgba[k * 4 + 1]!) +
        0.0722 * linear(rgba[k * 4 + 2]!);
      out[k] = Math.max(y - CITY_LIGHTS_FLOOR, 0) / (1 - CITY_LIGHTS_FLOOR);
    }
    return out;
  }
}
