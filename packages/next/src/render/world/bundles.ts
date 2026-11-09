// A world's GPU work for a tick: the cull, its render bundles and its translucent
// draws.
import {
  MATERIAL_SIZE,
  RECORD_WORDS,
  INSTANCE_COUNT_WORD,
  INSTANCE_FIRST_WORD,
  MATERIAL_WORDS,
  MaterialFlags,
  PROPERTY_TEXTURE_BINDING,
  ALL_VIEWS,
  TRANSFORM_WORD,
  FLAGS_WORD,
  RecordFlags,
  VIEW_MASK_WORD,
  TRANSFORM_WORDS,
  INSTANCE_WORDS,
} from "../layout.ts";
import { bindSlab } from "./tables.ts";
import type { SurfaceKey } from "../../scene/RenderContext.ts";
import type { World } from "../../scene/World.ts";
import { uploadTables } from "../../scene/world/featureTables.ts";
import {
  createSplats,
  pointGroup,
  writePointParams,
} from "../../scene/world/points.ts";
import { resolveTransforms } from "../../scene/world/transforms.ts";
import type { Batch } from "../../scene/world/types.ts";

export function prepareFrame(world: World): GPURenderBundle {
  const queue = world.ctx.device.queue;
  world.flushUploads();
  resolveTransforms(world);
  world.uploadsPending = true;
  if (world.materialsDirty) {
    queue.writeBuffer(
      world.materialBuffer,
      0,
      world.materialsF32.buffer,
      0,
      world.materialCount * MATERIAL_SIZE,
    );
    world.materialsDirty = false;
  }
  // A custom shader's texture loaded or changed: its groups are new.
  const generation = world.ctx.shaderBindings.generation;
  if (generation !== world.bindingsGeneration) {
    world.bindingsGeneration = generation;
    world.bundle = undefined;
    world.translucentDraws = undefined;
  }
  if (!world.bundle) {
    writeBatches(world);
    world.bundle = recordBundle(world);
  } else if (world.batchesShownChanged) {
    world.bundle = recordBundle(world);
  }
  world.batchesShownChanged = false;
  world.cullParamsData[0] = world.drawCount;
  world.cullParamsData[1] = world.batchList.length;
  world.cullParamsData[2] = world.instanceHighWater;
  // Instance items follow the draw rows (cull.slang `firstInstanceItem`).
  world.cullParamsData[3] = world.drawRows;
  queue.writeBuffer(world.cullParams, 0, world.cullParamsData);
  return world.bundle;
}

export function shadowBundle(world: World): GPURenderBundle {
  if (!world.casters || world.castersFor !== world.bundle) {
    world.casters = recordBundle(world, "shadow");
    world.castersFor = world.bundle;
  }
  return world.casters;
}

export function heightBundle(world: World): GPURenderBundle {
  if (!world.heights || world.heightsFor !== world.bundle) {
    world.heights = recordBundle(world, "height");
    world.heightsFor = world.bundle;
  }
  return world.heights;
}

export function prepassBundle(world: World): GPURenderBundle {
  if (!world.prepassBundle_ || world.prepassFor !== world.bundle) {
    world.prepassBundle_ = recordBundle(world, "prepass");
    world.prepassFor = world.bundle;
  }
  return world.prepassBundle_;
}

export function depthBundle(world: World): GPURenderBundle {
  if (!world.depthBundle_ || world.depthFor !== world.bundle) {
    world.depthBundle_ = recordBundle(world, "depth");
    world.depthFor = world.bundle;
  }
  return world.depthBundle_;
}

export function encodeCull(
  world: World,
  encoder: GPUCommandEncoder,
  timestampWrites?: GPUComputePassTimestampWrites,
  points = true,
  pixels = 0,
): void {
  const { pipelines, currentViewBindGroup } = world.ctx;
  // The batches' instance counts start at zero (cull.slang `append`
  // counts into them); the rest of the arguments `writeDrawArgs` writes.
  world.drawArguments.clear(encoder, world.batchList.length);
  if (points && world.pointDraws.size) {
    encoder.clearBuffer(world.pointCounts);
    if ([...world.pointDraws.values()].some((d) => d.tiny > 0)) {
      if (pixels > world.splats.pixels) {
        // Larger buffers: every point draw's group binds them.
        world.splats.depth.destroy();
        world.splats.color.destroy();
        world.splats.feature.destroy();
        world.splats = createSplats(world, pixels);
        for (const draw of world.pointDraws.values()) {
          draw.group = pointGroup(world, draw);
        }
      }
      encoder.clearBuffer(world.splats.depth, 0, Math.max(4, pixels * 4));
    }
  }
  world.cullPassDesc.timestampWrites = timestampWrites;
  const pass = encoder.beginComputePass(world.cullPassDesc);
  // Once per frame, before any view's culling reads the tables.
  uploadTables(world, pass);
  pass.setBindGroup(0, currentViewBindGroup);
  pass.setBindGroup(1, world.cullBindGroup);
  pass.setPipeline(pipelines.cullRecords);
  pass.dispatchWorkgroups(Math.ceil(Math.max(world.drawCount, 1) / 64));
  if (world.instanceHighWater > 0) {
    pass.setPipeline(pipelines.cullInstances);
    // Two dimensions past 65,535 groups (`cullInstances` reads them).
    const groups = Math.ceil(world.instanceHighWater / 64);
    const x = Math.min(groups, 65535);
    pass.dispatchWorkgroups(x, Math.ceil(groups / x));
  }
  pass.setPipeline(pipelines.writeDrawArgs);
  pass.dispatchWorkgroups(Math.ceil(Math.max(world.batchList.length, 1) / 64));
  // Point draws: their points in view into their lists (or splatted),
  // then their arguments (over `writeDrawArgs`'), with the narrower
  // world group their kernels read.
  if (points && world.pointDraws.size) {
    pass.setBindGroup(1, world.pointCullBindGroup);
  }
  for (const draw of points ? world.pointDraws.values() : []) {
    pass.setBindGroup(2, draw.group);
    const groups = Math.ceil(Math.max(1, draw.mesh.points.capacity) / 64);
    const x = Math.min(groups, 65535);
    const y = Math.ceil(groups / x);
    if (draw.culler) {
      draw.culler.encode(pass, x, y);
      continue;
    }
    pass.setPipeline(pipelines.cullPoints);
    pass.dispatchWorkgroups(x, y);
    pass.setPipeline(pipelines.writePointArgs);
    pass.dispatchWorkgroups(1);
  }
  pass.end();
}

/** Assigns each batch its slice of the item list and uploads the batch table. */
function writeBatches(world: World): void {
  const table = new Uint32Array(Math.max(1, world.batchList.length) * 4);
  let items = 0;
  for (const batch of world.batchList) {
    items += batch.items;
  }
  const direct = new Uint32Array(Math.max(1, items));
  const fill = new Uint32Array(world.batchList.length);
  let base = 0;
  for (const batch of world.batchList) {
    batch.itemBase = base;
    const o = batch.index * 4;
    table[o] = base;
    table[o + 1] = batch.mesh.indexCount;
    table[o + 2] = batch.mesh.firstIndex;
    base += batch.items;
  }
  for (let i = 0; i < world.drawCount; i++) {
    const batch = world.drawBatches[i];
    if (!batch) {
      continue;
    }
    const o = i * RECORD_WORDS;
    const count = world.recordsU32[o + INSTANCE_COUNT_WORD]!;
    if (count === 0) {
      direct[batch.itemBase + fill[batch.index]!++] = i;
    } else {
      const first = world.drawRows + world.recordsU32[o + INSTANCE_FIRST_WORD]!;
      for (let k = 0; k < count; k++) {
        direct[batch.itemBase + fill[batch.index]!++] = first + k;
      }
    }
  }
  const queue = world.ctx.device.queue;
  queue.writeBuffer(world.batchBuffer, 0, table);
  world.drawArguments.writeDirect(direct);
  for (const [record, draw] of world.pointDraws) {
    writePointParams(world, draw, record);
  }
}

/**
 * One draw per batch, grouped by cull mode and texture set: the opaque
 * pass's, or the sun's shadow casters' (depth only; no lines).
 */
export function recordBundle(
  world: World,
  kind: "opaque" | "shadow" | "height" | "prepass" | "depth" = "opaque",
): GPURenderBundle {
  const { device, targets, currentViewBindGroup } = world.ctx;
  // Height captures draw the casters, with their own pipelines.
  const height = kind === "height";
  const shadow = kind === "shadow" || height;
  const prepass = kind === "prepass";
  const depth = kind === "depth";
  const encoder = device.createRenderBundleEncoder(
    shadow || prepass
      ? {
          label: `world.${kind}Bundle`,
          colorFormats: prepass ? ["rgba16float"] : [],
          depthStencilFormat: "depth32float",
          sampleCount: 1,
        }
      : {
          label: depth ? "world.depthBundle" : "world.bundle",
          colorFormats: targets.colorFormats,
          depthStencilFormat: targets.depthFormat,
          sampleCount: targets.sampleCount,
        },
  );
  encoder.setBindGroup(
    0,
    shadow ? world.ctx.shadowViewBindGroup : currentViewBindGroup,
  );
  // Group 1 and the index buffer are the batch's slab's (set below).
  // Casters: depth, the fragment stage clipping placeholders, and where
  // a material cuts out (alpha mask) its cutoff too.
  // Blended surfaces draw their opaque parts here, cut out where they're
  // translucent (opaque.wgsl `cutOut`); the rest in the translucent
  // passes (`encodeTranslucent`). Glass lets the sun through.
  const masked = (batch: Batch) =>
    (world.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
      (MaterialFlags.alphaMask | MaterialFlags.alphaBlend)) !==
    0;
  const keyOf = (batch: Batch): SurfaceKey =>
    prepass
      ? batch.doubleSided
        ? "prepassDoubleSided"
        : "prepass"
      : depth
        ? masked(batch)
          ? batch.doubleSided
            ? "depthMaskedDoubleSided"
            : "depthMasked"
          : batch.doubleSided
            ? "depthDoubleSided"
            : "depth"
        : height
          ? masked(batch)
            ? batch.doubleSided
              ? "heightMaskedDoubleSided"
              : "heightMasked"
            : batch.doubleSided
              ? "heightDoubleSided"
              : "height"
          : shadow
            ? masked(batch)
              ? batch.doubleSided
                ? "shadowMaskedDoubleSided"
                : "shadowMasked"
              : batch.doubleSided
                ? "shadowDoubleSided"
                : "shadow"
            : batch.points
              ? "opaquePoints"
              : batch.mesh.topology === "line-list"
                ? "opaqueLines"
                : batch.instanced
                  ? batch.doubleSided
                    ? "opaqueInstancedDoubleSided"
                    : "opaqueInstanced"
                  : batch.doubleSided
                    ? "opaqueDoubleSided"
                    : "opaque";
  const rank = (batch: Batch) =>
    batch.mesh.topology === "line-list" ? 2 : Number(batch.doubleSided);
  // Only batches some view draws (`Batch.shown`), and for shadows those
  // some view's cascades alone do: the cache's resident tiles that no
  // view selected cost nothing here.
  const order = world.batchList
    .filter(
      (batch) =>
        (batch.shown > 0 || (kind === "shadow" && batch.casters > 0)) &&
        // Only the translucent passes draw it (`encodeTranslucent`); lines
        // can't blend, and stay here.
        (batch.mesh.topology === "line-list" ||
          (world.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
            MaterialFlags.blendedOnly) ===
            0),
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.shader?.id ?? 0) - (b.shader?.id ?? 0) ||
        a.textureSet - b.textureSet ||
        a.mesh.slab - b.mesh.slab,
    );
  const direct = world._submission === "direct";
  let pipeline: GPURenderPipeline | undefined;
  let group: GPUBindGroup | undefined;
  let slab = -1;
  for (const batch of order) {
    if (
      batch.items === 0 ||
      world.brokenTextureSets.has(batch.textureSet) ||
      ((shadow || prepass || depth) && batch.mesh.topology === "line-list") ||
      // Point sets and instances shade outside the opaque pass's depth
      // prepass; point sets aren't ground either (their strips are the
      // opaque pass's alone).
      (depth && (batch.points || batch.instanced)) ||
      (height && batch.points) ||
      // Billboards face the camera: no shadows, no ambient occlusion.
      ((shadow || prepass) && batch.billboard)
    ) {
      continue;
    }
    if (batch.mesh.slab !== slab) {
      slab = batch.mesh.slab;
      bindSlab(world, encoder, slab);
    }
    const key = keyOf(batch);
    const wanted = batchPipeline(world, batch, key);
    if (wanted !== pipeline) {
      pipeline = wanted;
      encoder.setPipeline(pipeline);
    }
    const wantedGroup = setGroup(world, batch, wanted, key);
    if (wantedGroup !== group) {
      group = wantedGroup;
      encoder.setBindGroup(2, group);
    }
    world.drawArguments.drawBatch(encoder, batch, direct);
  }
  return encoder.finish();
}

/**
 * A batch's pipeline for a pass: its custom shader's once made, else the
 * engine's (then recorded again when it is ready).
 */
function batchPipeline(
  world: World,
  batch: Batch,
  key: SurfaceKey,
): GPURenderPipeline {
  return (
    (batch.shader &&
      world.ctx.shaders.pipeline(batch.shader, key, world.shaderReady)) ??
    world.ctx.pipelines[key]
  );
}

/**
 * A batch's group 2: its texture set's, or with its custom shader's
 * pipeline (not the engine's stand-in) and uniforms, beside the shader's.
 */
function setGroup(
  world: World,
  batch: Batch,
  pipeline: GPURenderPipeline,
  key: SurfaceKey,
): GPUBindGroup {
  const shader = batch.shader;
  const plain = world.textureSets[batch.textureSet]!;
  if (!shader || pipeline === world.ctx.pipelines[key]) {
    return plain;
  }
  const layout = world.ctx.pipelines.setLayout(shader);
  if (!layout) {
    return plain;
  }
  const own = world.ctx.shaderBindings.entries(shader);
  const groupKey = `${batch.textureSet}|${shader.id}|${own.version}`;
  let group = world.shaderGroups.get(groupKey);
  if (!group) {
    group = world.ctx.device.createBindGroup({
      label: `world.textureSet ${shader.label}`,
      layout,
      entries: [
        ...world.textureSetEntries[batch.textureSet]!.filter(
          (e) =>
            shader.readsPropertyTextures ||
            e.binding < PROPERTY_TEXTURE_BINDING,
        ),
        ...own.entries,
      ],
    });
    // Older versions of this shader's group are unused now.
    for (const k of world.shaderGroups.keys()) {
      if (k.startsWith(`${batch.textureSet}|${shader.id}|`)) {
        world.shaderGroups.delete(k);
      }
    }
    world.shaderGroups.set(groupKey, group);
  }
  return group;
}

/** A batch of blended triangles (alpha mode "BLEND"); lines stay opaque. */
function translucent(world: World, batch: Batch): boolean {
  return (
    batch.mesh.topology !== "line-list" &&
    (world.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
      MaterialFlags.alphaBlend) !==
      0
  );
}

export function translucentRange(
  owner: World,
  eye: ArrayLike<number>,
  viewBit: number = ALL_VIEWS,
): { near: number; far: number } | undefined {
  if (!owner.translucentDraws) {
    owner.translucentDraws = [];
    for (let i = 0; i < owner.drawCount; i++) {
      const batch = owner.drawBatches[i];
      if (batch && translucent(owner, batch)) {
        owner.translucentDraws.push(i);
      }
    }
  }
  if (owner.translucentDraws.length === 0) {
    return undefined;
  }
  const u = owner.recordsU32;
  const f = owner.recordsF32;
  const world = owner.transformWorld;
  let near = Infinity;
  let far = 0;
  const sphere = (x: number, y: number, z: number, radius: number) => {
    const d = Math.hypot(x - eye[0]!, y - eye[1]!, z - eye[2]!);
    near = Math.min(near, d - radius);
    far = Math.max(far, d + radius);
  };
  for (const i of owner.translucentDraws) {
    const o = i * RECORD_WORDS;
    const t = u[o + TRANSFORM_WORD]!;
    if (
      u[o + FLAGS_WORD]! & RecordFlags.hidden ||
      (u[o + VIEW_MASK_WORD]! & viewBit) === 0 ||
      owner.transformHiddenWorld[t] === 1
    ) {
      continue;
    }
    const w = t * 16;
    const scale = owner.transforms.f32[t * TRANSFORM_WORDS + 3]!;
    const local = [f[o]!, f[o + 1]!, f[o + 2]!];
    const point = (p: readonly number[], k: number) =>
      world[w + k]! * p[0]! +
      world[w + 4 + k]! * p[1]! +
      world[w + 8 + k]! * p[2]! +
      world[w + 12 + k]!;
    const count = u[o + INSTANCE_COUNT_WORD]!;
    if (count === 0) {
      sphere(
        point(local, 0),
        point(local, 1),
        point(local, 2),
        f[o + 3]! * scale,
      );
      continue;
    }
    const first = u[o + INSTANCE_FIRST_WORD]!;
    const it = owner.instances.f32;
    for (let j = first; j < first + count; j++) {
      const a = j * INSTANCE_WORDS;
      if (owner.instances.u32[a + 14]! & 1) {
        continue;
      }
      const p = [0, 1, 2].map(
        (row) =>
          it[a + row * 4]! * local[0]! +
          it[a + row * 4 + 1]! * local[1]! +
          it[a + row * 4 + 2]! * local[2]! +
          it[a + row * 4 + 3]!,
      );
      const instanceScale = Math.max(
        Math.hypot(it[a]!, it[a + 4]!, it[a + 8]!),
        Math.hypot(it[a + 1]!, it[a + 5]!, it[a + 9]!),
        Math.hypot(it[a + 2]!, it[a + 6]!, it[a + 10]!),
      );
      sphere(
        point(p, 0),
        point(p, 1),
        point(p, 2),
        f[o + 3]! * scale * instanceScale,
      );
    }
  }
  return far > 0 ? { near: Math.max(near, 0), far } : undefined;
}

export function encodeTranslucent(
  world: World,
  pass: GPURenderPassEncoder,
  keyOf: (doubleSided: boolean) => SurfaceKey,
  group: GPUBindGroup,
): void {
  pass.setBindGroup(0, world.ctx.currentViewBindGroup);
  pass.setBindGroup(3, group);
  const direct = world._submission === "direct";
  let current: GPURenderPipeline | undefined;
  let bound: GPUBindGroup | undefined;
  let slab = -1;
  for (const batch of world.batchList) {
    if (
      batch.shown === 0 ||
      !translucent(world, batch) ||
      world.brokenTextureSets.has(batch.textureSet)
    ) {
      continue;
    }
    if (batch.mesh.slab !== slab) {
      slab = batch.mesh.slab;
      bindSlab(world, pass, slab);
    }
    const key = keyOf(batch.doubleSided);
    const wanted = batchPipeline(world, batch, key);
    if (wanted !== current) {
      current = wanted;
      pass.setPipeline(wanted);
    }
    const wantedGroup = setGroup(world, batch, wanted, key);
    if (wantedGroup !== bound) {
      bound = wantedGroup;
      pass.setBindGroup(2, bound);
    }
    world.drawArguments.drawBatch(pass, batch, direct);
  }
}
