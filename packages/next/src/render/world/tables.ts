// A world's GPU tables and the bind groups over them: growing them, and
// rebuilding what referred to them.
import { MATERIAL_SIZE, DRAW_ITEM_SIZE, ALL_VIEWS } from "../layout.ts";
import { resized, grownSize } from "../../scene/MirroredTable.ts";
import type { Slab } from "../../scene/Slabs.ts";
import type { World } from "../../scene/World.ts";
import { patchGroup } from "../../scene/world/patches.ts";
import { pointGroup } from "../../scene/world/points.ts";
import type { WorldRaster } from "./worldRaster.ts";
import type { WorldScene } from "../../scene/world/worldScene.ts";

/** Rasterizer side: growing the GPU tables and rebinding them. */
export interface TableWorld extends Pick<
  World,
  | "changedViews"
  | "clipBuffer"
  | "ctx"
  | "hasDraw"
  | "instanceBuffer"
  | "instanceGeneration"
  | "itemBuffer"
  | "materialBuffer"
  | "maxDraws"
  | "maxInstances"
  | "maxMaterials"
  | "maxTransforms"
  | "recordBuffer"
  | "slabs"
  | "transformBuffer"
  | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "batchBuffer"
    | "bundle"
    | "clipRows"
    | "clipScratch"
    | "cullBindGroup"
    | "cullParams"
    | "drawArguments"
    | "drawConstants"
    | "drawRows"
    | "freePointCounters"
    | "imageryPlaceholder"
    | "imagerySampler"
    | "imageryView"
    | "instances"
    | "materialRows"
    | "materialsDirty"
    | "placementTable"
    | "pointCounts"
    | "patchDraws"
    | "patchWorldBindGroup"
    | "pointCullBindGroup"
    | "pointDraws"
    | "pointSetCount"
    | "splats"
    | "transforms"
    | "translucentDraws"
  >;
  readonly scene: Pick<WorldScene, "maxClipBlocks">;
}

/** Rasterizer side: a slab's bindings and the item buffers. */
export interface SlabBindWorld extends Pick<
  World,
  | "clipBuffer"
  | "ctx"
  | "itemBuffer"
  | "materialBuffer"
  | "recordBuffer"
  | "slabs"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawArguments"
    | "drawRows"
    | "imagerySampler"
    | "imageryView"
    | "instances"
    | "placementTable"
  >;
}

/** Rasterizer side, growing the scene's arrays with its tables: room for more rows. */
export interface ReserveWorld extends Pick<World, "maxMaterials"> {
  readonly raster: Pick<
    WorldRaster,
    | "drawConstants"
    | "drawGeneration"
    | "drawOwnedTransform"
    | "materialsF32"
    | "materialsU32"
    | "transforms"
  >;
  readonly scene: Pick<
    WorldScene,
    | "transformAnchor"
    | "transformGeneration"
    | "transformHidden"
    | "transformHiddenWorld"
    | "transformLive"
    | "transformLocal"
    | "transformParent"
    | "transformPendingFlag"
    | "transformStamp"
    | "transformWorld"
  >;
}

/** @internal CPU room for draw slots below `count`. */
export function reserveDraws(world: ReserveWorld, count: number): void {
  if (world.raster.drawConstants.reserve(count)) {
    const rows = world.raster.drawConstants.rows;
    world.raster.drawGeneration = resized(world.raster.drawGeneration, rows);
    world.raster.drawOwnedTransform = resized(
      world.raster.drawOwnedTransform,
      rows,
      -1,
    );
  }
}

/** @internal CPU room for transforms below `count`. */
export function reserveTransforms(world: ReserveWorld, count: number): void {
  if (world.raster.transforms.reserve(count)) {
    const t = world.raster.transforms.rows;
    world.scene.transformLocal = resized(world.scene.transformLocal, t * 16);
    world.scene.transformWorld = resized(world.scene.transformWorld, t * 16);
    world.scene.transformParent = resized(world.scene.transformParent, t, -1);
    world.scene.transformGeneration = resized(
      world.scene.transformGeneration,
      t,
    );
    world.scene.transformLive = resized(world.scene.transformLive, t);
    world.scene.transformHidden = resized(world.scene.transformHidden, t);
    world.scene.transformHiddenWorld = resized(
      world.scene.transformHiddenWorld,
      t,
    );
    world.scene.transformAnchor = resized(world.scene.transformAnchor, t);
    world.scene.transformPendingFlag = resized(
      world.scene.transformPendingFlag,
      t,
    );
    world.scene.transformStamp = resized(world.scene.transformStamp, t);
  }
}

/** @internal CPU room for materials below `count`. */
export function reserveMaterials(world: ReserveWorld, count: number): void {
  const rows = world.raster.materialsF32.byteLength / MATERIAL_SIZE;
  if (count > rows) {
    const data = new ArrayBuffer(
      grownSize(rows, count, world.maxMaterials) * MATERIAL_SIZE,
    );
    new Uint32Array(data).set(world.raster.materialsU32);
    world.raster.materialsF32 = new Float32Array(data);
    world.raster.materialsU32 = new Uint32Array(data);
  }
}

/**
 * @internal Room for instance rows below `count` on the GPU: the instance table and
 * the per-item buffers double (up to `maxInstances`), and what binds them
 * is rebuilt.
 */
export function growInstances(world: TableWorld, count: number): void {
  const rows = grownSize(
    world.raster.instances.gpuRows,
    count,
    world.maxInstances,
  );
  world.raster.instances.growGpu(rows);
  world.instanceBuffer = world.raster.instances.buffer;
  recreateItemBuffers(world);
  tablesReplaced(world);
}

/**
 * @internal Room for draw slots below `count` on the GPU (§13.15, growable tables):
 * the records double (copied), the per-batch buffers and the items are
 * recreated (rewritten every frame or with the bundle), and what binds
 * them is rebuilt.
 */
export function growDraws(world: TableWorld, count: number): void {
  const rows = grownSize(world.raster.drawRows, count, world.maxDraws);
  world.raster.drawConstants.growGpu(rows);
  world.recordBuffer = world.raster.drawConstants.buffer;
  world.raster.batchBuffer.destroy();
  world.raster.batchBuffer = createBatchBuffer(world, rows);
  world.raster.drawArguments.growBatches(rows);
  world.raster.drawRows = rows;
  recreateItemBuffers(world);
  tablesReplaced(world);
}

/** @internal Room for transforms below `count` on the GPU (copied, rebound). */
export function growTransforms(world: TableWorld, count: number): void {
  world.raster.transforms.growGpu(
    grownSize(world.raster.transforms.gpuRows, count, world.maxTransforms),
  );
  world.transformBuffer = world.raster.transforms.buffer;
  tablesReplaced(world);
}

/** @internal Room for materials below `count` on the GPU (rewritten, rebound). */
export function growMaterials(world: TableWorld, count: number): void {
  world.raster.materialRows = grownSize(
    world.raster.materialRows,
    count,
    world.maxMaterials,
  );
  world.materialBuffer.destroy();
  world.materialBuffer = world.ctx.device.createBuffer({
    label: "world.materials",
    size: world.raster.materialRows * MATERIAL_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  // The whole table is written with the next frame.
  world.raster.materialsDirty = true;
  tablesReplaced(world);
}

/** @internal Room for clip blocks below `count` on the GPU (copied, rebound). */
export function growClips(world: TableWorld, count: number): void {
  const rows = grownSize(
    world.raster.clipRows,
    count,
    world.scene.maxClipBlocks,
  );
  const { device } = world.ctx;
  const old = world.clipBuffer;
  world.clipBuffer = device.createBuffer({
    label: "world.clipBoxes",
    size: rows * world.raster.clipScratch.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const encoder = device.createCommandEncoder({ label: "world.grow" });
  encoder.copyBufferToBuffer(old, 0, world.clipBuffer, 0, old.size);
  device.queue.submit([encoder.finish()]);
  old.destroy();
  world.raster.clipRows = rows;
  tablesReplaced(world);
}

/**
 * @internal Point-draw counters up to `count` (cleared every frame, so the buffer is
 * only recreated), and the point draws' groups that bind it.
 */
export function growPointSets(world: TableWorld, count: number): void {
  if (count <= world.raster.pointSetCount) {
    return;
  }
  if (world.raster.pointCounts.size < count * 4) {
    world.raster.pointCounts.destroy();
    world.raster.pointCounts = world.ctx.device.createBuffer({
      label: "world.pointCounts",
      size: count * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    for (const draw of world.raster.pointDraws.values()) {
      draw.group = pointGroup(world, draw);
    }
  }
  // The lowest counters first.
  for (let k = count - 1; k >= world.raster.pointSetCount; k--) {
    world.raster.freePointCounters.push(k);
  }
  world.raster.pointSetCount = count;
}

/** The batch table for `rows` batches (their arguments: `drawArguments`). */
export function createBatchBuffer(
  world: SlabBindWorld,
  rows: number,
): GPUBuffer {
  return world.ctx.device.createBuffer({
    label: "world.batches",
    size: rows * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
}

/** The items and their lists for the current draw and instance rows. */
function recreateItemBuffers(world: SlabBindWorld): void {
  const items = world.raster.drawRows + world.raster.instances.gpuRows;
  const { device } = world.ctx;
  world.itemBuffer.destroy();
  world.itemBuffer = device.createBuffer({
    label: "world.items",
    size: items * DRAW_ITEM_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  world.raster.drawArguments.growItems(items);
}

/**
 * A table's buffer was replaced: rebuild the groups that bind it, drop the
 * bundles that baked them (the direct list is rewritten with the
 * batches), and tell outside binders (`tableGeneration`).
 */
export function tablesReplaced(world: TableWorld): void {
  createCullBindGroup(world);
  createDrawBindGroup(world);
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
  world.instanceGeneration++;
}

export function createCullBindGroup(world: TableWorld): void {
  world.raster.cullBindGroup = world.ctx.device.createBindGroup({
    label: "world.cull",
    layout: world.ctx.pipelines.cullWorldLayout,
    // Binding 5 (batch counts) is gone: the cull counts into the
    // arguments' instance counts.
    entries: (
      [
        [0, world.recordBuffer],
        [1, world.transformBuffer],
        [2, world.instanceBuffer],
        [3, world.itemBuffer],
        [4, world.raster.drawArguments.itemList],
        [6, world.raster.batchBuffer],
        [7, world.raster.placementTable.buffer],
        [8, world.raster.cullParams],
        [9, world.raster.drawArguments.buffer],
      ] as const
    ).map(([binding, b]) => ({ binding, resource: { buffer: b } })),
  });
  world.raster.patchWorldBindGroup = world.ctx.device.createBindGroup({
    label: "world.cull.patches",
    layout: world.ctx.pipelines.cullPatchWorldLayout,
    entries: [
      { binding: 0, resource: { buffer: world.recordBuffer } },
      { binding: 3, resource: { buffer: world.itemBuffer } },
      { binding: 9, resource: { buffer: world.raster.drawArguments.buffer } },
    ],
  });
  world.raster.pointCullBindGroup = world.ctx.device.createBindGroup({
    label: "world.cull.points",
    layout: world.ctx.pipelines.cullPointWorldLayout,
    entries: [
      { binding: 0, resource: { buffer: world.recordBuffer } },
      { binding: 1, resource: { buffer: world.transformBuffer } },
      { binding: 9, resource: { buffer: world.raster.drawArguments.buffer } },
    ],
  });
}

/** Every slab's draw group (the world's tables, the slab's arena). */
export function createDrawBindGroup(world: TableWorld): void {
  for (const slab of world.slabs.slabs) {
    if (slab) {
      createSlabDrawGroup(world, slab);
    }
  }
}

function createSlabDrawGroup(world: SlabBindWorld, slab: Slab): void {
  const buffers = [
    world.recordBuffer,
    world.itemBuffer,
    slab.vertexBuffer,
    world.materialBuffer,
    world.clipBuffer,
  ];
  slab.drawGroup = world.ctx.device.createBindGroup({
    label: `world.draw.slab${slab.id}`,
    layout: world.ctx.pipelines.drawWorldLayout,
    entries: [
      ...buffers.map((b, binding) => ({ binding, resource: { buffer: b } })),
      { binding: 5, resource: world.raster.imageryView },
      { binding: 6, resource: world.raster.imagerySampler },
      // Placements (placement.slang): the vertex stage's.
      { binding: 7, resource: { buffer: world.raster.placementTable.buffer } },
      // The slab's indices: the pick variant's vertex stage reads its own.
      { binding: 8, resource: { buffer: slab.indexBuffer } },
    ],
  });
}

/** Binds a slab's group 1 and index buffer for its batches' draws. */
export function bindSlab(
  world: SlabBindWorld,
  pass: GPURenderPassEncoder | GPURenderBundleEncoder,
  id: number,
): void {
  const slab = world.slabs.get(id);
  pass.setBindGroup(1, slab.drawGroup!);
  pass.setIndexBuffer(slab.indexBuffer, "uint32");
}

/**
 * A slab grew, opened or closed (scene/Slabs.ts): its group is rebuilt,
 * point draws in it rebind their arena, bundles are recorded again, and
 * outside binders (point sources, model pools) see `tableGeneration`.
 */
export function slabReplaced(world: TableWorld, slab: Slab): void {
  if (world.slabs.slabs[slab.id] === slab) {
    // The world's own tables exist once the constructor has made them.
    if (world.recordBuffer) {
      createSlabDrawGroup(world, slab);
    }
  } else {
    slab.drawGroup = undefined;
  }
  for (const draw of world.raster.pointDraws.values()) {
    if (draw.mesh.slab === slab.id) {
      draw.group = pointGroup(world, draw);
    }
  }
  for (const draw of world.raster.patchDraws.values()) {
    if (draw.mesh.slab === slab.id) {
      draw.group = patchGroup(world, draw);
    }
  }
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
  world.instanceGeneration++;
}

export function rebind(world: TableWorld): void {
  tablesReplaced(world);
}

export function setImageryArray(
  world: TableWorld,
  view: GPUTextureView | undefined,
): void {
  view ??= world.raster.imageryPlaceholder;
  if (view === world.raster.imageryView) {
    return;
  }
  world.raster.imageryView = view;
  createDrawBindGroup(world);
  // The cached bundle binds the old group (and its soon-destroyed array).
  world.raster.bundle = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
}
