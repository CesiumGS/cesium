// A world's GPU tables and the bind groups over them: growing them, and
// rebuilding what referred to them.
import { MATERIAL_SIZE, DRAW_ITEM_SIZE, ALL_VIEWS } from "../layout.ts";
import { resized, grownSize } from "../../scene/MirroredTable.ts";
import type { Slab } from "../../scene/Slabs.ts";
import type { World } from "../../scene/World.ts";
import { pointGroup } from "../../scene/world/points.ts";

/** @internal CPU room for draw slots below `count`. */
export function reserveDraws(world: World, count: number): void {
  if (world.drawConstants.reserve(count)) {
    const rows = world.drawConstants.rows;
    world.drawGeneration = resized(world.drawGeneration, rows);
    world.drawOwnedTransform = resized(world.drawOwnedTransform, rows, -1);
  }
}

/** @internal CPU room for transforms below `count`. */
export function reserveTransforms(world: World, count: number): void {
  if (world.transforms.reserve(count)) {
    const t = world.transforms.rows;
    world.transformLocal = resized(world.transformLocal, t * 16);
    world.transformWorld = resized(world.transformWorld, t * 16);
    world.transformParent = resized(world.transformParent, t, -1);
    world.transformGeneration = resized(world.transformGeneration, t);
    world.transformLive = resized(world.transformLive, t);
    world.transformHidden = resized(world.transformHidden, t);
    world.transformHiddenWorld = resized(world.transformHiddenWorld, t);
    world.transformAnchor = resized(world.transformAnchor, t);
    world.transformPendingFlag = resized(world.transformPendingFlag, t);
    world.transformStamp = resized(world.transformStamp, t);
  }
}

/** @internal CPU room for materials below `count`. */
export function reserveMaterials(world: World, count: number): void {
  const rows = world.materialsF32.byteLength / MATERIAL_SIZE;
  if (count > rows) {
    const data = new ArrayBuffer(
      grownSize(rows, count, world.maxMaterials) * MATERIAL_SIZE,
    );
    new Uint32Array(data).set(world.materialsU32);
    world.materialsF32 = new Float32Array(data);
    world.materialsU32 = new Uint32Array(data);
  }
}

/**
 * @internal Room for instance rows below `count` on the GPU: the instance table and
 * the per-item buffers double (up to `maxInstances`), and what binds them
 * is rebuilt.
 */
export function growInstances(world: World, count: number): void {
  const rows = grownSize(world.instances.gpuRows, count, world.maxInstances);
  world.instances.growGpu(rows);
  world.instanceBuffer = world.instances.buffer;
  recreateItemBuffers(world);
  tablesReplaced(world);
}

/**
 * @internal Room for draw slots below `count` on the GPU (§13.15, growable tables):
 * the records double (copied), the per-batch buffers and the items are
 * recreated (rewritten every frame or with the bundle), and what binds
 * them is rebuilt.
 */
export function growDraws(world: World, count: number): void {
  const rows = grownSize(world.drawRows, count, world.maxDraws);
  world.drawConstants.growGpu(rows);
  world.recordBuffer = world.drawConstants.buffer;
  world.batchBuffer.destroy();
  world.batchBuffer = createBatchBuffer(world, rows);
  world.drawArguments.growBatches(rows);
  world.drawRows = rows;
  recreateItemBuffers(world);
  tablesReplaced(world);
}

/** @internal Room for transforms below `count` on the GPU (copied, rebound). */
export function growTransforms(world: World, count: number): void {
  world.transforms.growGpu(
    grownSize(world.transforms.gpuRows, count, world.maxTransforms),
  );
  world.transformBuffer = world.transforms.buffer;
  tablesReplaced(world);
}

/** @internal Room for materials below `count` on the GPU (rewritten, rebound). */
export function growMaterials(world: World, count: number): void {
  world.materialRows = grownSize(world.materialRows, count, world.maxMaterials);
  world.materialBuffer.destroy();
  world.materialBuffer = world.ctx.device.createBuffer({
    label: "world.materials",
    size: world.materialRows * MATERIAL_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  // The whole table is written with the next frame.
  world.materialsDirty = true;
  tablesReplaced(world);
}

/** @internal Room for clip blocks below `count` on the GPU (copied, rebound). */
export function growClips(world: World, count: number): void {
  const rows = grownSize(world.clipRows, count, world.maxClipBlocks);
  const { device } = world.ctx;
  const old = world.clipBuffer;
  world.clipBuffer = device.createBuffer({
    label: "world.clipBoxes",
    size: rows * world.clipScratch.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const encoder = device.createCommandEncoder({ label: "world.grow" });
  encoder.copyBufferToBuffer(old, 0, world.clipBuffer, 0, old.size);
  device.queue.submit([encoder.finish()]);
  old.destroy();
  world.clipRows = rows;
  tablesReplaced(world);
}

/**
 * @internal Point-draw counters up to `count` (cleared every frame, so the buffer is
 * only recreated), and the point draws' groups that bind it.
 */
export function growPointSets(world: World, count: number): void {
  if (count <= world.pointSetCount) {
    return;
  }
  if (world.pointCounts.size < count * 4) {
    world.pointCounts.destroy();
    world.pointCounts = world.ctx.device.createBuffer({
      label: "world.pointCounts",
      size: count * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    for (const draw of world.pointDraws.values()) {
      draw.group = pointGroup(world, draw);
    }
  }
  // The lowest counters first.
  for (let k = count - 1; k >= world.pointSetCount; k--) {
    world.freePointCounters.push(k);
  }
  world.pointSetCount = count;
}

/** The batch table for `rows` batches (their arguments: `drawArguments`). */
export function createBatchBuffer(world: World, rows: number): GPUBuffer {
  return world.ctx.device.createBuffer({
    label: "world.batches",
    size: rows * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
}

/** The items and their lists for the current draw and instance rows. */
function recreateItemBuffers(world: World): void {
  const items = world.drawRows + world.instances.gpuRows;
  const { device } = world.ctx;
  world.itemBuffer.destroy();
  world.itemBuffer = device.createBuffer({
    label: "world.items",
    size: items * DRAW_ITEM_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  world.drawArguments.growItems(items);
}

/**
 * A table's buffer was replaced: rebuild the groups that bind it, drop the
 * bundles that baked them (the direct list is rewritten with the
 * batches), and tell outside binders (`tableGeneration`).
 */
export function tablesReplaced(world: World): void {
  createCullBindGroup(world);
  createDrawBindGroup(world);
  world.bundle = undefined;
  world.translucentDraws = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
  world.instanceGeneration++;
}

export function createCullBindGroup(world: World): void {
  world.cullBindGroup = world.ctx.device.createBindGroup({
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
        [4, world.drawArguments.itemList],
        [6, world.batchBuffer],
        [7, world.drawArguments.buffer],
        [8, world.cullParams],
      ] as const
    ).map(([binding, b]) => ({ binding, resource: { buffer: b } })),
  });
  world.pointCullBindGroup = world.ctx.device.createBindGroup({
    label: "world.cull.points",
    layout: world.ctx.pipelines.cullPointWorldLayout,
    entries: [
      { binding: 0, resource: { buffer: world.recordBuffer } },
      { binding: 1, resource: { buffer: world.transformBuffer } },
      { binding: 7, resource: { buffer: world.drawArguments.buffer } },
    ],
  });
}

/** Every slab's draw group (the world's tables, the slab's arena). */
export function createDrawBindGroup(world: World): void {
  for (const slab of world.slabs.slabs) {
    if (slab) {
      createSlabDrawGroup(world, slab);
    }
  }
}

function createSlabDrawGroup(world: World, slab: Slab): void {
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
      { binding: 5, resource: world.imageryView },
      { binding: 6, resource: world.imagerySampler },
      // Placements (placement.slang): the vertex stage's.
      { binding: 7, resource: { buffer: world.placementTable.buffer } },
    ],
  });
}

/** Binds a slab's group 1 and index buffer for its batches' draws. */
export function bindSlab(
  world: World,
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
export function slabReplaced(world: World, slab: Slab): void {
  if (world.slabs.slabs[slab.id] === slab) {
    // The world's own tables exist once the constructor has made them.
    if (world.recordBuffer) {
      createSlabDrawGroup(world, slab);
    }
  } else {
    slab.drawGroup = undefined;
  }
  for (const draw of world.pointDraws.values()) {
    if (draw.mesh.slab === slab.id) {
      draw.group = pointGroup(world, draw);
    }
  }
  world.bundle = undefined;
  world.translucentDraws = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
  world.instanceGeneration++;
}

export function rebind(world: World): void {
  tablesReplaced(world);
}

export function setImageryArray(
  world: World,
  view: GPUTextureView | undefined,
): void {
  view ??= world.imageryPlaceholder;
  if (view === world.imageryView) {
    return;
  }
  world.imageryView = view;
  createDrawBindGroup(world);
  // The cached bundle binds the old group (and its soon-destroyed array).
  world.bundle = undefined;
  world.changedViews = ALL_VIEWS;
  world.version++;
}
