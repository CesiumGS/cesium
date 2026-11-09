// Rays against a world's draws: `World.castRays` and the jobs it dispatches.
import { splitHigh } from "../../math/transforms.ts";
import {
  ALL_VIEWS,
  RECORD_WORDS,
  TRANSFORM_WORD,
  FLAGS_WORD,
  RecordFlags,
  VIEW_MASK_WORD,
  TRANSFORM_WORDS,
  INSTANCE_COUNT_WORD,
  NO_RECORD,
  INSTANCE_FIRST_WORD,
  INSTANCE_WORDS,
} from "../../render/layout.ts";
import type { World } from "../World.ts";
import { uploadTables } from "./featureTables.ts";
import { resolveTransforms, checkAnchor } from "./transforms.ts";
import type { CastRay, CastOptions } from "./types.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** @internal Scene side, reading the rasterizer's records to find what a ray can hit. */
export interface RayWorld extends Pick<
  World,
  "addAnchor" | "hasDraw" | "transformAlive"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawBatches"
    | "drawCount"
    | "instances"
    | "recordsF32"
    | "recordsU32"
    | "transforms"
  >;
  readonly scene: Pick<
    WorldScene,
    | "anchorSlots"
    | "bodyAnchors"
    | "transformAnchor"
    | "transformFrames"
    | "transformHiddenWorld"
    | "transformWorld"
  >;
}

/** @internal Scene side: casting rays, which resolves the tree and uploads feature tables first. */
export interface CastWorld extends Pick<
  World,
  | "addAnchor"
  | "changedViews"
  | "ctx"
  | "flushUploads"
  | "hasDraw"
  | "instanceBuffer"
  | "recordBuffer"
  | "slabs"
  | "transformAlive"
  | "transformBuffer"
  | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawBatches"
    | "drawConstants"
    | "drawCount"
    | "frameComputes"
    | "instances"
    | "pendingUploads"
    | "recordsF32"
    | "recordsU32"
    | "transforms"
    | "uploadChunks"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    | "anchorPlaceRevision_"
    | "anchorPlaces"
    | "anchorSlots"
    | "bodyAnchors"
    | "meshRanges"
    | "nextTableId"
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

/** Hit distance bits meaning "no hit" (the largest finite float). */
const NO_HIT = 0x7f7fffff;

export async function castRays(
  world: CastWorld,
  rays: readonly CastRay[],
  options: CastOptions = {},
): Promise<Array<number | undefined>> {
  const out: Array<number | undefined> = rays.map(() => undefined);
  if (rays.length === 0) {
    return out;
  }
  world.flushUploads();
  resolveTransforms(world);
  // Jobs by slab: each slab's triangles are bound with its own group.
  const bySlab = rayJobs(world, rays, options);
  if (bySlab.size === 0) {
    return out;
  }
  const device = world.ctx.device;
  const rayData = new Float32Array(rays.length * 12);
  const rayWords = new Uint32Array(rayData.buffer);
  rays.forEach((ray, i) => {
    for (let k = 0; k < 3; k++) {
      const value = ray.origin[k]!;
      const hi = splitHigh(value);
      rayData[i * 12 + k] = hi;
      rayData[i * 12 + 4 + k] = Math.fround(value - hi);
      rayData[i * 12 + 8 + k] = ray.direction[k]!;
    }
    rayData[i * 12 + 3] = ray.maxDistance;
    rayWords[i * 12 + 7] = 0;
    rayWords[i * 12 + 11] = 0;
  });
  const buffer = (
    label: string,
    data: ArrayBufferView<ArrayBuffer>,
    usage: number,
  ) => {
    const b = device.createBuffer({
      label: `world.raycast.${label}`,
      size: Math.max(16, data.byteLength),
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(b, 0, data);
    return b;
  };
  const STORAGE = GPUBufferUsage.STORAGE;
  const rayBuffer = buffer("rays", rayData, STORAGE);
  const hitBuffer = buffer(
    "hits",
    new Uint32Array(rays.length).fill(NO_HIT),
    STORAGE | GPUBufferUsage.COPY_SRC,
  );
  const readback = device.createBuffer({
    label: "world.raycast.readback",
    size: Math.max(16, rays.length * 4),
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const pipeline = world.ctx.pipelines.raycast;
  const jobBuffers: GPUBuffer[] = [];
  const encoder = device.createCommandEncoder({ label: "world.raycast" });
  const pass = encoder.beginComputePass({ label: "raycast" });
  // The tables as the CPU has them (draws added since the last frame).
  uploadTables(world, pass);
  pass.setPipeline(pipeline);
  // Every slab's jobs into the same hits (an atomic min per ray).
  for (const [id, jobs] of bySlab) {
    const slab = world.slabs.get(id);
    const jobBuffer = buffer("jobs", jobs, STORAGE);
    jobBuffers.push(jobBuffer);
    const group = device.createBindGroup({
      label: `world.raycast.slab${id}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        rayBuffer,
        jobBuffer,
        world.recordBuffer,
        world.transformBuffer,
        world.instanceBuffer,
        slab.vertexBuffer,
        slab.indexBuffer,
        hitBuffer,
      ].map((b, binding) => ({ binding, resource: { buffer: b } })),
    });
    pass.setBindGroup(0, group);
    const count = jobs.length / 4;
    const x = Math.min(count, 65535);
    pass.dispatchWorkgroups(x, Math.ceil(count / x));
  }
  pass.end();
  encoder.copyBufferToBuffer(hitBuffer, 0, readback, 0, rays.length * 4);
  device.queue.submit([encoder.finish()]);
  try {
    await readback.mapAsync(GPUMapMode.READ);
    const hits = new Uint32Array(readback.getMappedRange(0, rays.length * 4));
    const f32 = new Float32Array(hits.buffer, hits.byteOffset, hits.length);
    for (let i = 0; i < rays.length; i++) {
      out[i] = hits[i] === NO_HIT ? undefined : f32[i];
    }
    readback.unmap();
  } finally {
    for (const b of [rayBuffer, ...jobBuffers, hitBuffer, readback]) {
      b.destroy();
    }
  }
  return out;
}

/**
 * The (ray, record, first triangle, instance) jobs of a cast: each
 * candidate draw's bounding sphere is tested against each ray segment
 * on the CPU, and crossing draws are split into 64-triangle jobs.
 */
export function rayJobs(
  owner: RayWorld,
  rays: readonly CastRay[],
  options: CastOptions,
): Map<number, Uint32Array<ArrayBuffer>> {
  const bySlab = new Map<number, number[]>();
  let jobs: number[] = [];
  const u = owner.raster.recordsU32;
  const f = owner.raster.recordsF32;
  const mask = options.viewMask ?? ALL_VIEWS;
  let anchorSlot = 0;
  if (options.anchor) {
    checkAnchor(owner, options.anchor, "castRays");
    anchorSlot = options.anchor.slot;
  }
  const only = options.draws
    ? new Set(options.draws.filter((d) => owner.hasDraw(d)).map((d) => d.index))
    : undefined;
  if (only) {
    const name = (slot: number) =>
      slot === 0
        ? "no anchor (the table's root)"
        : `the anchor ${owner.scene.anchorSlots[slot]?.name ?? `in slot ${slot}`}`;
    for (const draw of only) {
      const t = u[draw * RECORD_WORDS + TRANSFORM_WORD]!;
      const slot = owner.scene.transformAnchor[t]!;
      if (slot !== anchorSlot) {
        throw new Error(
          `castRays: draw ${draw} is under ${name(slot)}; the cast's rays are under ${name(anchorSlot)}.`,
        );
      }
    }
  }
  const center = new Float64Array(3);
  const drawn = new Set<string>();
  const world = owner.scene.transformWorld;
  const test = (record: number, instance: number, radius: number) => {
    const triangles = Math.floor(u[record * RECORD_WORDS + 11]! / 3);
    rays.forEach((ray, r) => {
      const dx = center[0]! - ray.origin[0]!;
      const dy = center[1]! - ray.origin[1]!;
      const dz = center[2]! - ray.origin[2]!;
      const along =
        dx * ray.direction[0]! +
        dy * ray.direction[1]! +
        dz * ray.direction[2]!;
      if (along < -radius || along > ray.maxDistance + radius) {
        return;
      }
      if (dx * dx + dy * dy + dz * dz - along * along > radius * radius) {
        return;
      }
      for (let first = 0; first < triangles; first += 64) {
        jobs.push(r, record, first, instance);
      }
    });
  };
  for (let i = 0; i < owner.raster.drawCount; i++) {
    const batch = owner.raster.drawBatches[i];
    if (
      !batch ||
      batch.mesh.topology !== "triangle-list" ||
      (only && !only.has(i)) ||
      options.exclude?.(i) === true
    ) {
      continue;
    }
    const o = i * RECORD_WORDS;
    const flags = u[o + FLAGS_WORD]!;
    let slabJobs = bySlab.get(batch.mesh.slab);
    if (!slabJobs) {
      slabJobs = [];
      bySlab.set(batch.mesh.slab, slabJobs);
    }
    jobs = slabJobs;
    if (
      flags & RecordFlags.hidden ||
      (options.collisionOnly && !(flags & RecordFlags.collision)) ||
      (!only && (u[o + VIEW_MASK_WORD]! & mask) === 0)
    ) {
      continue;
    }
    const t = u[o + TRANSFORM_WORD]!;
    if (
      owner.scene.transformHiddenWorld[t] === 1 ||
      owner.scene.transformAnchor[t] !== anchorSlot
    ) {
      continue;
    }
    const w = t * 16;
    const scale = owner.raster.transforms.f32[t * TRANSFORM_WORDS + 3]!;
    const local = [f[o]!, f[o + 1]!, f[o + 2]!];
    const radius = f[o + 3]!;
    const count = u[o + INSTANCE_COUNT_WORD]!;
    if (count === 0) {
      // Scene items draw one mesh on one transform more than once: the
      // same triangles, so test them once.
      const once = `${batch.mesh.id}:${t}`;
      if (drawn.has(once)) {
        continue;
      }
      drawn.add(once);
      for (let k = 0; k < 3; k++) {
        center[k] =
          world[w + k]! * local[0]! +
          world[w + 4 + k]! * local[1]! +
          world[w + 8 + k]! * local[2]! +
          world[w + 12 + k]!;
      }
      test(i, NO_RECORD, radius * scale);
      continue;
    }
    const first = u[o + INSTANCE_FIRST_WORD]!;
    const it = owner.raster.instances.f32;
    for (let j = first; j < first + count; j++) {
      const a = j * INSTANCE_WORDS;
      if (owner.raster.instances.u32[a + 14]! & 1) {
        continue;
      }
      // The instance's affine (rows), then the transform.
      const p = [0, 1, 2].map(
        (row) =>
          it[a + row * 4]! * local[0]! +
          it[a + row * 4 + 1]! * local[1]! +
          it[a + row * 4 + 2]! * local[2]! +
          it[a + row * 4 + 3]!,
      );
      for (let k = 0; k < 3; k++) {
        center[k] =
          world[w + k]! * p[0]! +
          world[w + 4 + k]! * p[1]! +
          world[w + 8 + k]! * p[2]! +
          world[w + 12 + k]!;
      }
      const instanceScale = Math.max(
        Math.hypot(it[a]!, it[a + 4]!, it[a + 8]!),
        Math.hypot(it[a + 1]!, it[a + 5]!, it[a + 9]!),
        Math.hypot(it[a + 2]!, it[a + 6]!, it[a + 10]!),
      );
      test(i, j, radius * scale * instanceScale);
    }
  }
  const out = new Map<number, Uint32Array<ArrayBuffer>>();
  for (const [slab, list] of bySlab) {
    if (list.length > 0) {
      out.set(slab, Uint32Array.from(list));
    }
  }
  return out;
}
