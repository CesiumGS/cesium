// A world's draws: their records and batches, instances and shader or material
// changes. Records are written only through `drawConstants` (the seam).
import {
  MAX_DIRECTORY_ENTRIES,
  instanceDistanceFlags,
  NO_FEATURE,
  writeInstance,
  packTint,
  NO_STREAM,
  attributeHash,
  RecordFlags,
  RECORD_WORDS,
  VIEW_MASK_WORD,
  INSTANCE_COUNT_WORD,
  CASTER_MASK_WORD,
  RADIUS_WORD,
  TRANSFORM_WORD,
  FLAGS_WORD,
  INSTANCE_FIRST_WORD,
  INSTANCE_WORDS,
  NO_RECORD,
  INSTANCE_STRIDE_WORD,
} from "../../render/layout.ts";
import { CapacityError } from "../CapacityError.ts";
import type { CustomShader } from "../CustomShader.ts";
import type { RouteVariant } from "../routeVariant.ts";
import type { World } from "../World.ts";
import { warnUnavailable } from "./featureTables.ts";
import { releasePlacement } from "./placements.ts";
import {
  createPatchDraw,
  releasePatchDraw,
  writePatchParams,
} from "./patches.ts";
import { POINT_CULL_BYTES, pointGroup, writePointParams } from "./points.ts";
import { anchorAt, IDENTITY, resolveTransforms } from "./transforms.ts";
import type {
  Batch,
  DrawOptions,
  DrawHandle,
  PatchMesh,
  PointMesh,
  PointDraw,
} from "./types.ts";
import { queueUpload } from "./uploads.ts";
import {
  growPointSets,
  growDraws,
  reserveDraws,
  growInstances,
} from "../../render/world/tables.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** Crosses the sides: changing draw records and batches (rasterizer) with what they name (scene). */
export interface DrawWorld extends Pick<
  World,
  | "acceleration"
  | "addDraw"
  | "changedViews"
  | "ctx"
  | "flushUploads"
  | "hasDraw"
  | "markDirty"
  | "removeTransform"
  | "slabs"
  | "version"
  | "warps"
> {
  readonly raster: Pick<
    WorldRaster,
    | "batchList"
    | "batches"
    | "bundle"
    | "drawBatches"
    | "drawConstants"
    | "drawGeneration"
    | "drawOwnedTransform"
    | "frameComputes"
    | "freeBatches"
    | "freePointCounters"
    | "freeSlots"
    | "instanceAllocator"
    | "instanceStreamRanges"
    | "instances"
    | "patchDraws"
    | "pendingUploads"
    | "placementTable"
    | "pointCounts"
    | "pointDraws"
    | "recordsF32"
    | "recordsU32"
    | "splats"
    | "transforms"
    | "translucentDraws"
    | "uploadChunks"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    | "contentRevision_"
    | "drawFeatureFirst"
    | "drawPlacements"
    | "featureTables"
    | "materialReferences"
    | "meshRanges"
    | "names"
    | "nextTableId"
    | "parameters"
    | "pickSources"
    | "tableColumns"
    | "tableIds"
    | "transformGeneration"
  >;
}

/** Crosses the sides: a new draw touches nearly everything, in both. */
export interface AddDrawWorld extends Pick<
  World,
  | "acceleration"
  | "addAnchor"
  | "addDraw"
  | "addTransform"
  | "changedViews"
  | "clipBuffer"
  | "ctx"
  | "flushUploads"
  | "hasDraw"
  | "instanceBuffer"
  | "instanceGeneration"
  | "itemBuffer"
  | "markDirty"
  | "materialBuffer"
  | "maxDraws"
  | "maxInstances"
  | "maxMaterials"
  | "maxPointSets"
  | "maxTransforms"
  | "recordBuffer"
  | "removeTransform"
  | "slabs"
  | "transformAlive"
  | "transformBuffer"
  | "transformsF32Scale"
  | "version"
  | "warps"
> {
  readonly raster: Pick<
    WorldRaster,
    | "batchBuffer"
    | "batchList"
    | "batches"
    | "bundle"
    | "clipRows"
    | "clipScratch"
    | "cullBindGroup"
    | "cullParams"
    | "drawArguments"
    | "drawBatches"
    | "drawConstants"
    | "drawCount"
    | "drawGeneration"
    | "drawOwnedTransform"
    | "drawRows"
    | "frameComputes"
    | "freeBatches"
    | "freePointCounters"
    | "freeSlots"
    | "imageryPlaceholder"
    | "imagerySampler"
    | "imageryView"
    | "instanceAllocator"
    | "instanceHighWater"
    | "instanceStreamRanges"
    | "instances"
    | "materialRows"
    | "materialsDirty"
    | "materialsF32"
    | "materialsU32"
    | "patchDraws"
    | "pendingUploads"
    | "placementTable"
    | "pointCounts"
    | "patchDraws"
    | "patchWorldBindGroup"
    | "pointCullBindGroup"
    | "pointDraws"
    | "pointSetCount"
    | "recordsF32"
    | "recordsU32"
    | "splats"
    | "transforms"
    | "translucentDraws"
    | "uploadChunks"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    | "anchorPlaceRevision_"
    | "anchorPlaces"
    | "anchorSlots"
    | "bodyAnchors"
    | "contentRevision_"
    | "drawFeatureFirst"
    | "drawPlacements"
    | "featureRangeDraw"
    | "featureRangeFirst"
    | "featureTables"
    | "materialReferences"
    | "maxClipBlocks"
    | "meshRanges"
    | "names"
    | "nextFeatureId"
    | "nextTableId"
    | "parameters"
    | "pickSources"
    | "tableColumns"
    | "tableIds"
    | "transformAnchor"
    | "transformChildren"
    | "transformFrames"
    | "transformGeneration"
    | "transformHidden"
    | "transformHiddenWorld"
    | "transformLive"
    | "transformLocal"
    | "transformParent"
    | "transformPending"
    | "transformPendingFlag"
    | "transformResolve"
    | "transformRevision_"
    | "transformStamp"
    | "transformWorld"
  >;
}

const ZERO = Float64Array.of(0, 0, 0);

/**
 * The batch for draws of these fields, made (or a free one reused) when
 * none exists. A point set's draws batch alone: each batch's arguments
 * are its set's list (cull.slang `writePointArgs`); so do a patch draw's,
 * whose dice writes them (dice.slang).
 */
function batchFor(
  world: DrawWorld,
  f: {
    mesh: Batch["mesh"];
    material: number;
    textureSet: number;
    doubleSided: boolean;
    shader: CustomShader | undefined;
    route?: RouteVariant | undefined;
    billboard: boolean;
    points: boolean;
    patches: boolean;
    instanced: boolean;
    draw: number;
  },
): Batch {
  const key = `${f.mesh.id}|${f.material}|${f.textureSet}|${f.doubleSided ? 1 : 0}|${f.shader?.id ?? 0}|${f.billboard ? 1 : 0}|${f.instanced ? 1 : 0}|${f.route?.id ?? 0}${f.points || f.patches ? `|${f.draw}` : ""}`;
  let batch = world.raster.batches.get(key);
  if (batch) {
    return batch;
  }
  const reused = world.raster.freeBatches.pop();
  if (reused) {
    batch = reused;
    batch.key = key;
    batch.mesh = f.mesh;
    batch.textureSet = f.textureSet;
    batch.material = f.material;
    batch.doubleSided = f.doubleSided;
    batch.shader = f.shader;
    batch.route = f.route;
    batch.billboard = f.billboard;
    batch.points = f.points;
    batch.patches = f.patches;
    batch.chunks = undefined;
    batch.instanced = f.instanced;
    batch.shown = 0;
    batch.casters = 0;
  } else {
    batch = {
      index: world.raster.batchList.length,
      key,
      mesh: f.mesh,
      textureSet: f.textureSet,
      material: f.material,
      doubleSided: f.doubleSided,
      shader: f.shader,
      route: f.route,
      billboard: f.billboard,
      points: f.points,
      patches: f.patches,
      chunks: undefined,
      instanced: f.instanced,
      items: 0,
      itemBase: 0,
      shown: 0,
      casters: 0,
    };
    world.raster.batchList.push(batch);
  }
  world.raster.batches.set(key, batch);
  return batch;
}

export function addDraw(world: AddDrawWorld, options: DrawOptions): DrawHandle {
  // Checked before anything is allocated.
  if (options.parent && options.transform) {
    throw new Error(
      "addDraw: a parent is for the transform a draw owns (origin and model), not with a shared transform.",
    );
  }
  if (options.parent && !world.transformAlive(options.parent)) {
    throw new Error("addDraw: the parent was removed.");
  }
  const onAnchor = options.transform
    ? anchorAt(world, options.transform.index)
    : undefined;
  if (onAnchor && world.transformAlive(options.transform!)) {
    throw new Error(
      `addDraw: ${onAnchor.name} is an anchor; hang the draw under it with parent (and origin or model), or under a transform added under it.`,
    );
  }
  const streams = options.instances?.streams;
  const fieldCount = Object.keys(streams?.layout ?? {}).length;
  if (fieldCount > MAX_DIRECTORY_ENTRIES) {
    // surface.slang `readInstance` reads this many at most.
    throw new RangeError(
      `addDraw: ${fieldCount} instance fields; a draw holds at most ${MAX_DIRECTORY_ENTRIES}.`,
    );
  }
  for (const [name, { offset, components }] of Object.entries(
    streams?.layout ?? {},
  )) {
    if (
      components < 1 ||
      components > 4 ||
      offset < 0 ||
      offset + components > streams!.stride
    ) {
      throw new RangeError(
        `addDraw: instance field ${name} is outside the stride`,
      );
    }
  }
  const pointSet = (options.mesh as Partial<PointMesh>).points;
  if (pointSet && (!options.billboard || options.instances)) {
    throw new Error(
      "addDraw: a point mesh draws as a billboard, without instances",
    );
  }
  const patchSet = (options.mesh as Partial<PatchMesh>).patches;
  if (patchSet && (options.billboard || options.instances)) {
    throw new Error(
      "addDraw: a patch mesh draws without instances or billboards",
    );
  }
  // A point draw's own list of points to draw (each view's cull writes
  // it), and its slot among the per-view counts.
  let pointList: number | undefined;
  let pointCounter: number | undefined;
  if (pointSet) {
    if (
      world.raster.freePointCounters.length === 0 &&
      world.raster.pointSetCount < world.maxPointSets
    ) {
      growPointSets(
        world,
        Math.min(world.maxPointSets, world.raster.pointSetCount * 2),
      );
    }
    pointCounter = world.raster.freePointCounters.pop();
    const bytes = Math.max(4, pointSet.capacity * 4);
    // In the mesh's slab: the point cull reads anchors and list together.
    pointList =
      pointCounter === undefined
        ? undefined
        : world.slabs.allocateVertex(world.slabs.get(options.mesh.slab), bytes);
    if (pointList === undefined) {
      if (pointCounter !== undefined) {
        world.raster.freePointCounters.push(pointCounter);
      }
      throw new CapacityError(
        pointCounter === undefined ? "point sets" : "vertex arena",
      );
    }
  }
  // Nothing taken may outlive a failure below (transactional, §13.15).
  const releasePoints = () => {
    if (pointList !== undefined) {
      world.slabs
        .get(options.mesh.slab)
        .vertex.release(pointList, Math.max(4, pointSet!.capacity * 4));
      world.raster.freePointCounters.push(pointCounter!);
    }
  };
  const index = world.raster.freeSlots.pop() ?? world.raster.drawCount++;
  if (index >= world.maxDraws) {
    world.raster.drawCount--;
    releasePoints();
    throw new CapacityError("draw table");
  }
  if (index >= world.raster.drawRows) {
    growDraws(world, index + 1);
  }
  reserveDraws(world, index + 1);
  const mesh = options.mesh;
  // Placement: a shared transform, or one the draw owns.
  let transform: number;
  if (options.transform) {
    if (!world.transformAlive(options.transform)) {
      world.raster.freeSlots.push(index);
      releasePoints();
      throw new Error("addDraw: the transform was removed.");
    }
    transform = options.transform.index;
    world.raster.drawOwnedTransform[index] = -1;
  } else {
    const m = new Float64Array(16);
    m.set(options.model ?? IDENTITY);
    const origin = options.origin ?? ZERO;
    m[12] = origin[0]! + m[12]!;
    m[13] = origin[1]! + m[13]!;
    m[14] = origin[2]! + m[14]!;
    try {
      transform = world.addTransform(m, options.parent).index;
    } catch (error) {
      world.raster.freeSlots.push(index);
      releasePoints();
      throw error;
    }
    world.raster.drawOwnedTransform[index] = transform;
  }

  // Instances: a range in the instance table, culled one by one.
  const instances = options.instances;
  const instanceCount = instances ? instances.matrices.length / 16 : 0;
  let instanceFirst = 0;
  let instanceFeatures = 0;
  if (instances && instanceCount > 0) {
    const first = world.raster.instanceAllocator.allocate(instanceCount);
    if (first === undefined) {
      releaseOwnedTransform(world, index);
      world.raster.freeSlots.push(index);
      releasePoints();
      throw new CapacityError("instance table");
    }
    world.raster.instances.reserve(first + instanceCount);
    if (first + instanceCount > world.raster.instances.gpuRows) {
      growInstances(world, first + instanceCount);
    }
    instanceFirst = first;
    world.raster.instanceHighWater = Math.max(
      world.raster.instanceHighWater,
      first + instanceCount,
    );
    const { f32, u32 } = world.raster.instances;
    const distanceFlags = instanceDistanceFlags(
      instances.visibleWithin,
      instances.visibleBeyond,
    );
    for (let k = 0; k < instanceCount; k++) {
      const feature = instances.featureIds?.[k] ?? NO_FEATURE;
      if (feature !== NO_FEATURE) {
        instanceFeatures = Math.max(instanceFeatures, feature + 1);
      }
      writeInstance(
        f32,
        u32,
        first + k,
        instances.matrices,
        k * 16,
        index,
        feature,
        distanceFlags,
        instances.tints ? packTint(instances.tints, k * 4) : 0xffffffff,
      );
      world.raster.instances.mark(first + k);
    }
  }
  let instanceStreams = NO_STREAM;
  let instanceStride = 0;
  let instanceDirectory = NO_STREAM;
  world.raster.instanceStreamRanges[index] = undefined;
  if (instances?.streams && instanceCount > 0) {
    const data = instances.streams.data;
    // The fields' directory right after the data, in one range.
    const fields = Object.entries(instances.streams.layout ?? {});
    const directory = new Uint32Array(
      fields.length ? 1 + fields.length * 3 : 0,
    );
    if (fields.length) {
      directory[0] = fields.length;
      fields.forEach(([name, { offset, components }], i) => {
        directory[1 + i * 3] = attributeHash(name);
        directory[2 + i * 3] = offset;
        directory[3 + i * 3] = components;
      });
    }
    // In the mesh's slab: the vertex shader reads both from its arena.
    const slab = world.slabs.get(mesh.slab);
    const offset = world.slabs.allocateVertex(
      slab,
      data.byteLength + directory.byteLength,
    );
    if (offset === undefined) {
      releaseInstances(world, instanceFirst, instanceCount);
      releaseOwnedTransform(world, index);
      world.raster.freeSlots.push(index);
      releasePoints();
      throw new CapacityError("vertex arena");
    }
    queueUpload(world, slab.vertexBuffer, offset, data);
    if (fields.length) {
      queueUpload(
        world,
        slab.vertexBuffer,
        offset + data.byteLength,
        directory,
      );
      instanceDirectory = (offset + data.byteLength) / 4;
    }
    world.raster.instanceStreamRanges[index] = [
      offset,
      data.byteLength + directory.byteLength,
      data.byteLength,
      slab.id,
    ];
    instanceStreams = offset / 4;
    instanceStride = instances.streams.stride;
  }
  // A point set's properties are its mesh's, shared by its draws.
  if (pointSet) {
    instanceStreams = pointSet.streams;
    instanceStride = pointSet.stride;
    instanceDirectory = pointSet.directory;
  }

  const material = options.material ?? 0;
  const textureSet = options.textureSet ?? 0;
  const doubleSided = options.doubleSided ?? false;
  const shader = options.shader;
  const billboard = options.billboard !== undefined;
  const instanced = instanceCount > 0;
  const batch = batchFor(world, {
    mesh,
    material,
    textureSet,
    doubleSided,
    shader,
    billboard,
    points: pointSet !== undefined,
    patches: patchSet !== undefined,
    instanced,
    draw: index,
  });
  batch.items += instanceCount > 0 ? instanceCount : 1;
  world.raster.drawBatches[index] = batch;
  if (shader) {
    warnUnavailable(world, mesh, shader);
  }

  // Bounds live in the transform's local frame, so moving or rotating
  // the transform never stales them; an explicit radius is in meters.
  // A custom vertex stage's displacement (model units) pads them.
  resolveTransforms(world);
  const scale = world.transformsF32Scale(transform);
  world.scene.names[index] = options.name;
  world.scene.featureTables[index] = options.features;
  const firstFeature = world.scene.nextFeatureId;
  world.scene.nextFeatureId += Math.max(1, mesh.featureCount, instanceFeatures);
  world.scene.featureRangeFirst.push(firstFeature);
  world.scene.featureRangeDraw.push(index);
  world.scene.drawFeatureFirst[index] = firstFeature;
  world.raster.drawConstants.write(index, {
    transform,
    center: mesh.center,
    radius:
      (options.radius !== undefined
        ? options.radius / (scale || 1)
        : mesh.radius) + (shader?.displacement ?? 0),
    color: options.color ?? [1, 1, 1, 1],
    indexCount: mesh.indexCount,
    firstIndex: mesh.firstIndex,
    // A point draw's list where its uv would be (points have none).
    streams:
      pointList !== undefined
        ? { ...mesh.streams, uv: pointList / 4 }
        : mesh.streams,
    materialIndex: material,
    textureSet,
    batch: batch.index,
    featureId: firstFeature,
    viewMask: options.viewMask,
    // Lines have no surface to light; 1.x draws them unlit too.
    flags:
      (options.unlit || mesh.topology === "line-list" || options.billboard
        ? RecordFlags.unlit
        : 0) |
      (options.billboard ? RecordFlags.billboard : 0) |
      (pointSet ? RecordFlags.points : 0) |
      (patchSet ? RecordFlags.patches : 0) |
      (options.ground === false ? RecordFlags.notGround : 0) |
      (options.collision ? RecordFlags.collision : 0) |
      (options.clipExempt ? RecordFlags.clipExempt : 0) |
      (options.solid ? RecordFlags.solid : 0) |
      (options.underlay ? RecordFlags.underlay : 0),
    instanceFirst,
    instanceCount,
    instanceStreams,
    instanceStride,
    instanceDirectory,
    ...(options.billboard
      ? {
          billboardSize: options.billboard.size,
          billboardDepthTest: options.billboard.depthTestDistance ?? 0,
        }
      : {}),
    ...(mesh.skirtStart !== undefined ? { skirtStart: mesh.skirtStart } : {}),
  });
  if (world.raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD] !== 0) {
    batch.shown++;
  }
  world.markDirty(index);
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  if (pointSet) {
    const params = world.ctx.device.createBuffer({
      label: "world.pointCull",
      size: POINT_CULL_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const draw: PointDraw = {
      mesh: mesh as PointMesh,
      list: pointList!,
      counter: pointCounter!,
      params,
      group: undefined as never,
      batch,
      culler: undefined,
      tiny: 0,
    };
    draw.group = pointGroup(world, draw);
    world.raster.pointDraws.set(index, draw);
  }
  if (patchSet) {
    batch.chunks = createPatchDraw(
      world,
      mesh as PatchMesh,
      batch,
      index,
    ).chunks;
  }
  const handle: DrawHandle = {
    index,
    generation: world.raster.drawGeneration[index]!,
    name: options.name,
  };
  world.scene.contentRevision_++;
  if (options.warpAt !== undefined) {
    world.warps.setWarpAt(handle, options.warpAt, options.warpOrigin);
  }
  world.warps.drawAdded(handle);
  world.acceleration.drawAdded(handle);
  return handle;
}

export function setDrawShader(
  world: DrawWorld,
  handle: DrawHandle,
  shader: CustomShader | undefined,
): void {
  if (!world.hasDraw(handle)) {
    throw new Error("setDrawShader: the draw was removed");
  }
  const old = world.raster.drawBatches[handle.index]!;
  if (old.shader === shader) {
    return;
  }
  if (shader) {
    warnUnavailable(world, old.mesh, shader);
  }
  rebatch(world, handle, shader, old.route);
}

/**
 * Draws with a compiled route's pipeline variant (`undefined`: the engine's
 * or the shader's own): the draw moves to the batch of its mesh, material
 * and shader with that variant, as for a shader.
 */
export function setDrawRoute(
  world: DrawWorld,
  handle: DrawHandle,
  route: RouteVariant | undefined,
): void {
  if (!world.hasDraw(handle)) {
    throw new Error("setDrawRoute: the draw was removed");
  }
  const old = world.raster.drawBatches[handle.index]!;
  if (old.route === route) {
    return;
  }
  rebatch(world, handle, old.shader, route);
}

/** Moves the draw to the batch with `shader` and `route`, its counts and bounds with it. */
function rebatch(
  world: DrawWorld,
  handle: DrawHandle,
  shader: CustomShader | undefined,
  route: RouteVariant | undefined,
): void {
  const index = handle.index;
  const old = world.raster.drawBatches[index]!;
  const o = index * RECORD_WORDS;
  const instanceCount = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
  const items = instanceCount > 0 ? instanceCount : 1;
  const batch = batchFor(world, {
    mesh: old.mesh,
    material: old.material,
    textureSet: old.textureSet,
    doubleSided: old.doubleSided,
    shader,
    route,
    billboard: old.billboard,
    points: old.points,
    patches: old.patches,
    instanced: old.instanced,
    draw: index,
  });
  old.items -= items;
  if (world.raster.recordsU32[o + VIEW_MASK_WORD] !== 0) {
    old.shown--;
    batch.shown++;
  }
  if (world.raster.recordsU32[o + CASTER_MASK_WORD] !== 0) {
    old.casters--;
    batch.casters++;
  }
  if (old.items === 0) {
    world.raster.batches.delete(old.key);
    old.key = "";
    world.raster.freeBatches.push(old);
  }
  batch.items += items;
  world.raster.drawBatches[index] = batch;
  // The bounds' padding for a vertex stage's displacement follows it.
  const placed = world.scene.drawPlacements[index];
  if (placed) {
    placed.base +=
      (shader?.displacement ?? 0) - (old.shader?.displacement ?? 0);
  }
  world.raster.drawConstants.setBatch(
    index,
    batch.index,
    world.raster.recordsF32[o + RADIUS_WORD]! -
      (old.shader?.displacement ?? 0) +
      (shader?.displacement ?? 0),
  );
  const point = world.raster.pointDraws.get(index);
  if (point) {
    point.batch = batch;
    writePointParams(world, point, index);
  }
  const patches = world.raster.patchDraws.get(index);
  if (patches) {
    patches.batch = batch;
    batch.chunks = patches.chunks;
    writePatchParams(world, patches, index);
  }
  world.markDirty(index);
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  world.version++;
}

export function setDrawMaterial(
  world: DrawWorld,
  handle: DrawHandle,
  material: number,
): void {
  if (!world.hasDraw(handle)) {
    throw new Error("setDrawMaterial: the draw was removed");
  }
  if (world.scene.materialReferences[material] === undefined || material < 0) {
    throw new RangeError(`setDrawMaterial: no material ${material}`);
  }
  const index = handle.index;
  const old = world.raster.drawBatches[index]!;
  if (old.material === material) {
    return;
  }
  const o = index * RECORD_WORDS;
  const instanceCount = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
  const items = instanceCount > 0 ? instanceCount : 1;
  const batch = batchFor(world, {
    mesh: old.mesh,
    material,
    textureSet: old.textureSet,
    doubleSided: old.doubleSided,
    shader: old.shader,
    route: old.route,
    billboard: old.billboard,
    points: old.points,
    patches: old.patches,
    instanced: old.instanced,
    draw: index,
  });
  // Any count a batch keeps per draw (items, shown, casters, and one a
  // later change adds) must move with the record here, as in
  // `setDrawShader`.
  old.items -= items;
  if (world.raster.recordsU32[o + VIEW_MASK_WORD] !== 0) {
    old.shown--;
    batch.shown++;
  }
  if (world.raster.recordsU32[o + CASTER_MASK_WORD] !== 0) {
    old.casters--;
    batch.casters++;
  }
  if (old.items === 0) {
    world.raster.batches.delete(old.key);
    old.key = "";
    world.raster.freeBatches.push(old);
  }
  batch.items += items;
  world.raster.drawBatches[index] = batch;
  world.raster.drawConstants.setBatch(
    index,
    batch.index,
    world.raster.recordsF32[o + RADIUS_WORD]!,
  );
  world.raster.drawConstants.setMaterial(index, material);
  const point = world.raster.pointDraws.get(index);
  if (point) {
    point.batch = batch;
    writePointParams(world, point, index);
  }
  const patches = world.raster.patchDraws.get(index);
  if (patches) {
    patches.batch = batch;
    batch.chunks = patches.chunks;
    writePatchParams(world, patches, index);
  }
  world.markDirty(index);
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  world.version++;
}

export function twinDraw(
  world: DrawWorld,
  source: DrawHandle,
): DrawHandle | undefined {
  if (!world.hasDraw(source)) {
    throw new Error("twinDraw: the draw was removed.");
  }
  const index = source.index;
  const batch = world.raster.drawBatches[index]!;
  const o = index * RECORD_WORDS;
  if (
    batch.points ||
    batch.patches ||
    batch.billboard ||
    world.raster.recordsU32[o + INSTANCE_COUNT_WORD]! > 0
  ) {
    return undefined;
  }
  const transform = world.raster.recordsU32[o + TRANSFORM_WORD]!;
  const flags = world.raster.recordsU32[o + FLAGS_WORD]!;
  const features = world.scene.featureTables[index];
  const name = world.scene.names[index];
  return world.addDraw({
    mesh: batch.mesh,
    transform: {
      index: transform,
      generation: world.scene.transformGeneration[transform]!,
    },
    material: batch.material,
    textureSet: batch.textureSet,
    doubleSided: batch.doubleSided,
    ...(batch.shader !== undefined && { shader: batch.shader }),
    unlit: (flags & RecordFlags.unlit) !== 0,
    underlay: (flags & RecordFlags.underlay) !== 0,
    ground: false,
    viewMask: 0,
    ...(name !== undefined && { name }),
    ...(features !== undefined && { features }),
  });
}

export function removeDraw(world: DrawWorld, handle: DrawHandle): void {
  if (!world.hasDraw(handle)) {
    return; // already removed
  }
  world.scene.contentRevision_++;
  world.warps.drawRemoved(handle);
  world.acceleration.drawRemoved(handle);
  const batch = world.raster.drawBatches[handle.index]!;
  const o = handle.index * RECORD_WORDS;
  const instanceCount = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
  world.raster.drawBatches[handle.index] = undefined;
  world.raster.drawGeneration[handle.index] =
    world.raster.drawGeneration[handle.index]! + 1;
  batch.items -= instanceCount > 0 ? instanceCount : 1;
  if (world.raster.recordsU32[o + VIEW_MASK_WORD] !== 0) {
    batch.shown--;
  }
  if (world.raster.recordsU32[o + CASTER_MASK_WORD] !== 0) {
    batch.casters--;
  }
  if (batch.items === 0) {
    world.raster.batches.delete(batch.key);
    batch.key = "";
    world.raster.freeBatches.push(batch);
  }
  // Slices of the item list follow batch sizes: rebuild them.
  world.raster.bundle = undefined;
  world.raster.translucentDraws = undefined;
  if (instanceCount > 0) {
    releaseInstances(
      world,
      world.raster.recordsU32[o + INSTANCE_FIRST_WORD]!,
      instanceCount,
    );
  }
  world.raster.drawConstants.clear(handle.index);
  releasePlacement(world, handle.index);
  const pointDraw = world.raster.pointDraws.get(handle.index);
  if (pointDraw) {
    world.flushUploads();
    world.slabs
      .get(pointDraw.mesh.slab)
      .vertex.release(
        pointDraw.list,
        Math.max(4, pointDraw.mesh.points.capacity * 4),
      );
    pointDraw.params.destroy();
    world.raster.freePointCounters.push(pointDraw.counter);
    world.raster.pointDraws.delete(handle.index);
  }
  const patchDraw = world.raster.patchDraws.get(handle.index);
  if (patchDraw) {
    releasePatchDraw(patchDraw);
    world.raster.patchDraws.delete(handle.index);
  }
  const streams = world.raster.instanceStreamRanges[handle.index];
  if (streams) {
    world.flushUploads(); // before its range can be reused
    world.slabs.get(streams[3]).vertex.release(streams[0], streams[1]);
    world.raster.instanceStreamRanges[handle.index] = undefined;
  }
  releaseOwnedTransform(world, handle.index);
  world.scene.names[handle.index] = undefined;
  world.scene.featureTables[handle.index] = undefined;
  world.scene.pickSources.delete(handle.index);
  // The slot may be reused; its old feature range must not resolve to it.
  world.scene.drawFeatureFirst[handle.index] = -1;
  world.raster.freeSlots.push(handle.index);
  world.markDirty(handle.index);
}

function releaseInstances(
  world: DrawWorld,
  first: number,
  count: number,
): void {
  for (let k = first; k < first + count; k++) {
    world.raster.instances.u32[k * INSTANCE_WORDS + 12] = NO_RECORD;
    world.raster.instances.mark(k);
  }
  world.raster.instanceAllocator.release(first, count);
  world.version++;
}

function releaseOwnedTransform(world: DrawWorld, draw: number): void {
  const owned = world.raster.drawOwnedTransform[draw]!;
  if (owned >= 0) {
    world.raster.drawOwnedTransform[draw] = -1;
    world.removeTransform({
      index: owned,
      generation: world.scene.transformGeneration[owned]!,
    });
  }
}

export function setInstance(
  world: DrawWorld,
  handle: DrawHandle,
  instance: number,
  change: {
    matrix?: ArrayLike<number>;
    visible?: boolean;
    tint?: ArrayLike<number>;
  },
): void {
  if (!world.hasDraw(handle)) {
    return;
  }
  const o = handle.index * RECORD_WORDS;
  const count = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
  if (instance < 0 || instance >= count) {
    throw new RangeError(`instance ${instance} of ${count}`);
  }
  const slot = world.raster.recordsU32[o + INSTANCE_FIRST_WORD]! + instance;
  const { f32, u32 } = world.raster.instances;
  const w = slot * INSTANCE_WORDS;
  if (change.matrix) {
    writeInstance(
      f32,
      u32,
      slot,
      change.matrix,
      0,
      u32[w + 12]!,
      u32[w + 13]!,
      u32[w + 14]!,
      u32[w + 15]!,
    );
  }
  if (change.visible !== undefined) {
    // Its distance rule stays (InstanceFlags).
    u32[w + 14] = (u32[w + 14]! & ~1) | (change.visible ? 0 : 1);
  }
  if (change.tint) {
    u32[w + 15] = packTint(change.tint);
  }
  world.raster.instances.mark(slot);
  world.version++;
  world.changedViews |= world.raster.recordsU32[o + VIEW_MASK_WORD]!;
}

export function setInstanceStreams(
  world: DrawWorld,
  handle: DrawHandle,
  firstInstance: number,
  data: Float32Array | Uint32Array,
): void {
  if (!world.hasDraw(handle)) {
    return;
  }
  const range = world.raster.instanceStreamRanges[handle.index];
  const stride =
    world.raster.recordsU32[
      handle.index * RECORD_WORDS + INSTANCE_STRIDE_WORD
    ]!;
  if (!range || stride === 0) {
    throw new Error("setInstanceStreams: the draw has no instance streams");
  }
  const at = firstInstance * stride * 4;
  if (
    firstInstance < 0 ||
    data.length % stride !== 0 ||
    at + data.byteLength > range[2]
  ) {
    throw new RangeError(
      `setInstanceStreams: ${data.length / stride} instances from ${firstInstance} don't fit`,
    );
  }
  queueUpload(
    world,
    world.slabs.get(range[3]).vertexBuffer,
    range[0] + at,
    data,
  );
  world.version++;
  world.changedViews |=
    world.raster.recordsU32[handle.index * RECORD_WORDS + VIEW_MASK_WORD]!;
}
