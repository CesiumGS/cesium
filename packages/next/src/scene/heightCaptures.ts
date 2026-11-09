// Heights: most-detailed samples, and captures of the ground below a point.
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import { VIEW_SIZE } from "../render/layout.ts";
import type { Engine } from "./Engine.ts";
import type { View } from "./View.ts";
import type { World } from "./World.ts";
import type { AnchorHandle } from "./world/types.ts";
import { earthAnchor, contentAnchor } from "./earthAnchor.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type { EngineRaster } from "../render/view/engineRaster.ts";

/** @internal Rasterizer side: height samples and captures. */
export interface HeightCaptureEngine extends Pick<
  Engine,
  "ctx" | "requestRender" | "tilesets"
> {
  readonly raster: Pick<EngineRaster, "captures">;
}

/** Radians a degree (`Tileset3D.terrainClipped` takes degrees). */
const DEGREES = Math.PI / 180;

/** A height capture (`Engine.addHeightCapture`). */
export interface HeightCapture {
  readonly world: World;
  /** The anchor its square is placed in (default the Earth's). */
  readonly anchor: AnchorHandle;
  /** Its middle, in `anchor`'s coordinates. */
  readonly origin: Vec3;
  /** East, north and up at `origin`. */
  readonly axes: readonly [Vec3, Vec3, Vec3];
  readonly halfExtent: number;
  readonly top: number;
  readonly bottom: number;
  readonly size: number;
  readonly texture: GPUTexture;
  readonly view: GPUTextureView;
  /** Frames it has been drawn. */
  captured: number;
  /** The frame its block was written for, and the view drawing it. */
  stamp: number;
  by: View | undefined;
  readonly data: Float32Array;
  readonly block: GPUBuffer;
  /** @internal Bytes of `data` written for its last draw (`viewBlockBytes`). */
  viewBytes: number;
}

export async function sampleHeightMostDetailed(
  engine: HeightCaptureEngine,
  world: World,
  positions: ReadonlyArray<{ longitude: number; latitude: number }>,
  options: { tilesets?: readonly Tileset3D[] } = {},
): Promise<Array<number | undefined>> {
  const START = 10000;
  // The rays are Earth-fixed: they meet the content under the Earth's
  // anchor (`World.castRays` tests only the cast's anchor).
  const earth = earthAnchor(world);
  for (const t of options.tilesets ?? []) {
    if (t.anchor !== earth) {
      throw new Error(
        `sampleHeightMostDetailed: the tileset ${t.url} is under ${t.anchor.name}, not the Earth's anchor; heights are the Earth's.`,
      );
    }
  }
  const tilesets =
    options.tilesets ??
    engine.tilesets.filter(
      (t) =>
        t.world === world &&
        t.show &&
        t.enableCollision &&
        !t.isGlobe &&
        t.anchor === earth,
    );
  const rays = positions.map(({ longitude, latitude }) => {
    const up = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
      { longitude, latitude, height: 0 },
      v3.vec3(),
    );
    return {
      origin: Ellipsoid.WGS84.cartographicToCartesian(
        { longitude, latitude, height: START },
        v3.vec3(),
      ),
      direction: v3.negate(v3.vec3(), up),
      maxDistance: START + 12000,
    };
  });
  const heights: Array<number | undefined> = positions.map(() => undefined);
  await Promise.all(
    tilesets.map(async (tileset) => {
      const query = await tileset.queryRays(rays);
      try {
        const hits = await world.castRays(rays, {
          draws: query.draws,
          anchor: earth,
        });
        hits.forEach((d, i) => {
          // Terrain that isn't ground there is a hole (`TerrainRegion.ground`): the ray
          // runs down the normal, so the hit is at the point's own
          // longitude and latitude.
          if (
            d !== undefined &&
            !tileset.terrainClipped(
              positions[i]!.longitude / DEGREES,
              positions[i]!.latitude / DEGREES,
              START - d,
            )
          ) {
            heights[i] = Math.max(heights[i] ?? -Infinity, START - d);
          }
        });
      } finally {
        query.release();
      }
    }),
  );
  return heights;
}

export function addHeightCapture(
  engine: HeightCaptureEngine,
  world: World,
  options: {
    origin: Vec3;
    halfExtent: number;
    top?: number;
    bottom?: number;
    size?: number;
    anchor?: AnchorHandle;
  },
): HeightCapture {
  const anchor = contentAnchor(world, options.anchor, "addHeightCapture");
  const device = engine.ctx.device;
  const size = options.size ?? 2048;
  const texture = device.createTexture({
    label: "heightCapture",
    size: [size, size],
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const frame = eastNorthUpToFixedFrame(
    options.origin,
    Ellipsoid.WGS84,
    m4.mat4(),
  );
  const capture: HeightCapture = {
    world,
    anchor,
    origin: v3.vec3(options.origin[0]!, options.origin[1]!, options.origin[2]!),
    axes: [
      v3.vec3(frame[0]!, frame[1]!, frame[2]!),
      v3.vec3(frame[4]!, frame[5]!, frame[6]!),
      v3.vec3(frame[8]!, frame[9]!, frame[10]!),
    ],
    halfExtent: options.halfExtent,
    top: options.top ?? 9000,
    bottom: options.bottom ?? -1000,
    size,
    texture,
    view: texture.createView(),
    captured: 0,
    stamp: -1,
    by: undefined,
    data: new Float32Array(VIEW_SIZE / 4),
    viewBytes: VIEW_SIZE,
    block: device.createBuffer({
      label: "heightCapture.view",
      size: VIEW_SIZE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    }),
  };
  engine.raster.captures.push(capture);
  engine.requestRender();
  return capture;
}

export function removeHeightCapture(
  engine: HeightCaptureEngine,
  capture: HeightCapture,
): void {
  const i = engine.raster.captures.indexOf(capture);
  if (i >= 0) {
    engine.raster.captures.splice(i, 1);
    capture.texture.destroy();
    capture.block.destroy();
  }
}
