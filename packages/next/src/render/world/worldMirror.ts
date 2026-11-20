// The WebGPU device's copy of a world (`WorldMirror`, scene/renderSeam.ts):
// the GPU tables mirroring `World.draws`, the bundles and the cull. `World`
// reaches its rasterizer only through this object; its state is
// `World.raster` (`WorldRaster`).
import { onTextureDestroyed } from "../../gpu/textureTracking.ts";
import { INITIAL_ROWS } from "../../scene/CpuTable.ts";
import { MirroredTable } from "../../scene/MirroredTable.ts";
import { PlacementTable } from "../../scene/placementTable.ts";
import type { WorldMirror } from "../../scene/renderSeam.ts";
import type { World } from "../../scene/World.ts";
import { textureDestroyed } from "../../scene/world/materials.ts";
import { createSplats } from "../../scene/world/points.ts";
import { flushUploads } from "../../scene/world/uploads.ts";
import { DrawArguments } from "../drawArguments.ts";
import { DRAW_ITEM_SIZE, MATERIAL_SIZE } from "../layout.ts";
import {
  clippedBundle,
  depthBundle,
  encodeCull,
  encodeRetest,
  encodeTranslucent,
  heightBundle,
  pickBundle,
  prepareFrame,
  prepassBundle,
  retestBundle,
  shadowBundle,
  translucentRange,
} from "./bundles.ts";
import {
  createBatchBuffer,
  createCullBindGroup,
  createDrawBindGroup,
  growPointSets,
  rebind,
  setImageryArray,
  slabReplaced,
  tablesReplaced,
} from "./tables.ts";

/** A function's parameters after its first (the world). */
type Rest<F> = F extends (world: never, ...rest: infer R) => unknown
  ? R
  : never;

/** One per world, made by its constructor once its CPU tables exist. */
export class WebGpuWorldMirror implements WorldMirror {
  /** What `raster.imageryPlaceholder` views: destroyed with the world. */
  private readonly imageryPlaceholder: GPUTexture;
  private readonly stopTracking: () => void;

  /**
   * The GPU tables, groups and lists, sized from the world's rows
   * (`WorldRaster.drawRows`, `materialRows`, `clipRows`) and the instance
   * table's first rows.
   */
  constructor(private readonly world: World) {
    const { ctx, raster, draws } = world;
    const device = ctx.device;
    const instanceRows = Math.max(1, Math.min(world.maxInstances, 16384));
    const items = raster.drawRows + instanceRows;
    raster.records = draws.drawConstants.createMirror(ctx, raster.drawRows);
    raster.transforms = new MirroredTable(
      ctx,
      "transforms",
      draws.transforms,
      Math.min(world.maxTransforms, INITIAL_ROWS),
    );
    raster.instances = new MirroredTable(
      ctx,
      "instances",
      draws.instances,
      instanceRows,
    );

    const buffer = (label: string, size: number, usage: GPUBufferUsageFlags) =>
      device.createBuffer({ label: `world.${label}`, size, usage });
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    world.recordBuffer = raster.records.buffer;
    world.transformBuffer = raster.transforms.buffer;
    world.instanceBuffer = raster.instances.buffer;
    // COPY_SRC lets precision tests read back the cull kernels' output.
    world.itemBuffer = buffer(
      "items",
      items * DRAW_ITEM_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    // Grows with the CPU mirror (`addMaterial`), rewritten when changed.
    world.materialBuffer = buffer(
      "materials",
      raster.materialRows * MATERIAL_SIZE,
      storage,
    );
    // COPY_SRC: copied into a larger buffer as it grows.
    world.clipBuffer = buffer(
      "clipBoxes",
      raster.clipRows * raster.clipScratch.byteLength,
      storage | GPUBufferUsage.COPY_SRC,
    );
    raster.drawArguments = new DrawArguments(
      device,
      draws.drawConstants,
      (record) => draws.drawBatches[record] !== undefined,
      (batch) => raster.batchChunks[batch],
      raster.drawRows,
      items,
    );
    raster.batchBuffer = createBatchBuffer(world, raster.drawRows);
    raster.cullParams = buffer(
      "cullParams",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    raster.pointCounts = buffer("pointCounts", 64 * 4, storage);
    growPointSets(world, 64);
    raster.splats = createSplats(world, 1);

    // The cull binds the placements too (its placed records' offsets).
    raster.placementTable = new PlacementTable(
      device,
      () => {
        tablesReplaced(world);
        world.curvilinearMaps.routes.tableReplaced();
      },
      draws.placements.capacity,
      draws.placements,
    );
    createCullBindGroup(world);
    this.imageryPlaceholder = device.createTexture({
      label: "world.imagery.placeholder",
      size: [1, 1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    raster.imageryPlaceholder = this.imageryPlaceholder.createView({
      dimension: "2d-array",
    });
    raster.imageryView = raster.imageryPlaceholder;
    raster.imagerySampler = device.createSampler({
      label: "world.imagery",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      maxAnisotropy: 16,
    });
    createDrawBindGroup(world);
    this.stopTracking = onTextureDestroyed((t) => textureDestroyed(world, t));
  }

  /** Copies the queued geometry into place (scene/world/uploads.ts). */
  sync(): void {
    flushUploads(this.world);
  }

  /** A geometry slab was replaced by a larger one: its groups bind it again. */
  slabReplaced(...args: Rest<typeof slabReplaced>): void {
    slabReplaced(this.world, ...args);
  }

  rebind(): void {
    rebind(this.world);
  }

  setImageryArray(...args: Rest<typeof setImageryArray>): void {
    setImageryArray(this.world, ...args);
  }

  prepareFrame(): GPURenderBundle {
    return prepareFrame(this.world);
  }

  shadowBundle(): GPURenderBundle {
    return shadowBundle(this.world);
  }

  heightBundle(): GPURenderBundle {
    return heightBundle(this.world);
  }

  prepassBundle(): GPURenderBundle {
    return prepassBundle(this.world);
  }

  depthBundle(): GPURenderBundle {
    return depthBundle(this.world);
  }

  pickBundle(): GPURenderBundle | undefined {
    return pickBundle(this.world);
  }

  clippedBundle(
    ...args: Rest<typeof clippedBundle>
  ): GPURenderBundle | undefined {
    return clippedBundle(this.world, ...args);
  }

  retestBundle(
    ...args: Rest<typeof retestBundle>
  ): GPURenderBundle | undefined {
    return retestBundle(this.world, ...args);
  }

  encodeCull(...args: Rest<typeof encodeCull>): void {
    encodeCull(this.world, ...args);
  }

  encodeRetest(...args: Rest<typeof encodeRetest>): void {
    encodeRetest(this.world, ...args);
  }

  translucentRange(
    ...args: Rest<typeof translucentRange>
  ): ReturnType<typeof translucentRange> {
    return translucentRange(this.world, ...args);
  }

  encodeTranslucent(...args: Rest<typeof encodeTranslucent>): void {
    encodeTranslucent(this.world, ...args);
  }

  /** Destroys the GPU tables, lists and placeholders (not the slabs). */
  destroy(): void {
    const { raster } = this.world;
    this.stopTracking();
    for (const chunk of raster.uploadChunks) {
      chunk.buffer.destroy();
    }
    for (const draw of raster.pointDraws.values()) {
      draw.params.destroy();
    }
    raster.splats.depth.destroy();
    raster.splats.color.destroy();
    raster.splats.feature.destroy();
    raster.pointCounts.destroy();
    raster.records.destroy();
    raster.drawArguments.destroy();
    raster.placementTable.destroy();
    raster.transforms.destroy();
    raster.instances.destroy();
    for (const buffer of [
      this.world.itemBuffer,
      this.world.materialBuffer,
      this.world.clipBuffer,
      raster.batchBuffer,
      raster.cullParams,
    ]) {
      buffer.destroy();
    }
    // Not left on a device that lives on (a shared engine, a parked one).
    this.imageryPlaceholder.destroy();
  }
}
