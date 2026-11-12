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
  PICK_DEPTH_FORMAT,
  PICK_FORMATS,
  CAP_PARITY_FORMAT,
} from "../layout.ts";
import { bindSlab } from "./tables.ts";
import type { CapParityKind, SurfaceKey } from "../../scene/RenderContext.ts";
import { clippedKey } from "../../scene/world/clips.ts";
import type { World } from "../../scene/World.ts";
import { uploadTables } from "../../scene/world/featureTables.ts";
import {
  createSplats,
  pointGroup,
  writePointParams,
} from "../../scene/world/points.ts";
import { resolveTransforms } from "../../scene/world/transforms.ts";
import type { Batch, PatchMesh } from "../../scene/world/types.ts";
import type { WorldRaster } from "./worldRaster.ts";
import type { WorldScene } from "../../scene/world/worldScene.ts";

/** Rasterizer side: recording bundles and encoding translucent draws. */
export interface BundleWorld extends Pick<
  World,
  | "clipBuffer"
  | "ctx"
  | "itemBuffer"
  | "materialBuffer"
  | "recordBuffer"
  | "shaderReady"
  | "slabs"
> {
  readonly raster: Pick<
    WorldRaster,
    | "_submission"
    | "batchList"
    | "brokenTextureSets"
    | "bundle"
    | "casters"
    | "castersFor"
    | "clippedBundles"
    | "depthBundle_"
    | "depthFor"
    | "drawArguments"
    | "drawBatches"
    | "drawCount"
    | "drawRows"
    | "heights"
    | "heightsFor"
    | "imagerySampler"
    | "imageryView"
    | "instances"
    | "materialsU32"
    | "pickBundle_"
    | "pickFor"
    | "pipelineGaps"
    | "placementTable"
    | "prepassBundle_"
    | "prepassFor"
    | "recordsF32"
    | "recordsU32"
    | "shaderGroups"
    | "textureSetEntries"
    | "textureSets"
    | "transforms"
    | "translucentDraws"
  >;
  readonly scene: Pick<WorldScene, "transformHiddenWorld" | "transformWorld">;
}

/** Rasterizer side: writing the batch table and encoding the cull. */
export interface CullWorld extends Pick<World, "ctx" | "hasDraw" | "slabs"> {
  readonly raster: Pick<
    WorldRaster,
    | "batchBuffer"
    | "batchList"
    | "cullBindGroup"
    | "cullPassDesc"
    | "dicePassDesc"
    | "drawArguments"
    | "drawBatches"
    | "drawConstants"
    | "drawCount"
    | "drawRows"
    | "frameComputes"
    | "instanceHighWater"
    | "instances"
    | "patchDraws"
    | "patchWorldBindGroup"
    | "pendingUploads"
    | "pointCounts"
    | "pointCullBindGroup"
    | "pointDraws"
    | "recordsU32"
    | "splats"
    | "transforms"
    | "uploadChunks"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    "meshRanges" | "nextTableId" | "tableColumns" | "tableIds"
  >;
}

/** Rasterizer side, resolving the scene's transforms first: one tick's preparation of the tables. */
export interface PrepareWorld extends Pick<
  World,
  | "addAnchor"
  | "changedViews"
  | "clipBuffer"
  | "ctx"
  | "flushUploads"
  | "hasDraw"
  | "itemBuffer"
  | "materialBuffer"
  | "recordBuffer"
  | "shaderReady"
  | "slabs"
  | "transformAlive"
  | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "_submission"
    | "batchBuffer"
    | "batchList"
    | "batchesShownChanged"
    | "bindingsGeneration"
    | "brokenTextureSets"
    | "bundle"
    | "casters"
    | "castersFor"
    | "clippedBundles"
    | "cullBindGroup"
    | "cullParams"
    | "cullParamsData"
    | "cullPassDesc"
    | "depthBundle_"
    | "depthFor"
    | "dicePassDesc"
    | "drawArguments"
    | "drawBatches"
    | "drawConstants"
    | "drawCount"
    | "drawRows"
    | "frameComputes"
    | "heights"
    | "heightsFor"
    | "imagerySampler"
    | "imageryView"
    | "instanceHighWater"
    | "instances"
    | "materialsDirty"
    | "materialsF32"
    | "materialsU32"
    | "patchDraws"
    | "patchWorldBindGroup"
    | "pendingUploads"
    | "pipelineGaps"
    | "placementTable"
    | "pointCounts"
    | "pointCullBindGroup"
    | "pointDraws"
    | "prepassBundle_"
    | "prepassFor"
    | "recordsF32"
    | "recordsU32"
    | "shaderGroups"
    | "splats"
    | "textureSetEntries"
    | "textureSets"
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
    | "materialCount"
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

export function prepareFrame(world: PrepareWorld): GPURenderBundle {
  const queue = world.ctx.device.queue;
  world.flushUploads();
  resolveTransforms(world);
  world.raster.uploadsPending = true;
  if (world.raster.materialsDirty) {
    queue.writeBuffer(
      world.materialBuffer,
      0,
      world.raster.materialsF32.buffer,
      0,
      world.scene.materialCount * MATERIAL_SIZE,
    );
    world.raster.materialsDirty = false;
  }
  // A custom shader's texture loaded or changed: its groups are new.
  const generation = world.ctx.shaderBindings.generation;
  if (generation !== world.raster.bindingsGeneration) {
    world.raster.bindingsGeneration = generation;
    world.raster.bundle = undefined;
    world.raster.translucentDraws = undefined;
  }
  if (!world.raster.bundle) {
    world.raster.pipelineGaps.clear();
    writeBatches(world);
    world.raster.bundle = recordBundle(world);
  } else if (world.raster.batchesShownChanged) {
    world.raster.pipelineGaps.clear();
    world.raster.bundle = recordBundle(world);
  }
  world.raster.batchesShownChanged = false;
  world.raster.cullParamsData[0] = world.raster.drawCount;
  world.raster.cullParamsData[1] = world.raster.batchList.length;
  world.raster.cullParamsData[2] = world.raster.instanceHighWater;
  // Instance items follow the draw rows (cull.slang `firstInstanceItem`).
  world.raster.cullParamsData[3] = world.raster.drawRows;
  queue.writeBuffer(world.raster.cullParams, 0, world.raster.cullParamsData);
  return world.raster.bundle;
}

export function shadowBundle(world: BundleWorld): GPURenderBundle {
  if (
    !world.raster.casters ||
    world.raster.castersFor !== world.raster.bundle
  ) {
    world.raster.casters = recordBundle(world, "shadow");
    world.raster.castersFor = world.raster.bundle;
  }
  return world.raster.casters;
}

export function heightBundle(world: BundleWorld): GPURenderBundle {
  if (
    !world.raster.heights ||
    world.raster.heightsFor !== world.raster.bundle
  ) {
    world.raster.heights = recordBundle(world, "height");
    world.raster.heightsFor = world.raster.bundle;
  }
  return world.raster.heights;
}

export function prepassBundle(world: BundleWorld): GPURenderBundle {
  if (
    !world.raster.prepassBundle_ ||
    world.raster.prepassFor !== world.raster.bundle
  ) {
    world.raster.prepassBundle_ = recordBundle(world, "prepass");
    world.raster.prepassFor = world.raster.bundle;
  }
  return world.raster.prepassBundle_;
}

export function depthBundle(world: BundleWorld): GPURenderBundle {
  if (
    !world.raster.depthBundle_ ||
    world.raster.depthFor !== world.raster.bundle
  ) {
    world.raster.depthBundle_ = recordBundle(world, "depth");
    world.raster.depthFor = world.raster.bundle;
  }
  return world.raster.depthBundle_;
}

/**
 * The bundle drawing what a pick variant draws (`recordBundle` `pick`): meshes
 * non-indexed and patch draws, into the pick's targets, current with
 * `prepareFrame`'s. Undefined before the first.
 */
export function pickBundle(world: BundleWorld): GPURenderBundle | undefined {
  if (!world.raster.bundle) {
    return undefined;
  }
  if (
    !world.raster.pickBundle_ ||
    world.raster.pickFor !== world.raster.bundle
  ) {
    world.raster.pickBundle_ = recordBundle(world, "pick");
    world.raster.pickFor = world.raster.bundle;
  }
  return world.raster.pickBundle_;
}

/**
 * The bundle of `kind` for a view whose clips are on: the same draws with
 * the clipped pipelines (`RenderContext.clippedPipeline`), recorded when
 * first asked for and again whenever the unclipped bundle is (it carries
 * the draws' and pipelines' changes). Undefined before the world's first
 * frame. A view without clips uses the plain bundles above, and their
 * pipelines have no clip test.
 */
export function clippedBundle(
  world: BundleWorld,
  kind: BundleKind,
): GPURenderBundle | undefined {
  const base = world.raster.bundle;
  if (!base) {
    return undefined;
  }
  let entry = world.raster.clippedBundles.get(kind);
  if (!entry || entry.for !== base) {
    entry = { bundle: recordBundle(world, kind, true), for: base };
    world.raster.clippedBundles.set(kind, entry);
  }
  return entry.bundle;
}

export type BundleKind =
  "opaque" | "shadow" | "height" | "prepass" | "depth" | "pick" | "caps";

export function encodeCull(
  world: CullWorld,
  encoder: GPUCommandEncoder,
  timestampWrites?: GPUComputePassTimestampWrites,
  points = true,
  pixels = 0,
  diceWrites?: () => GPUComputePassTimestampWrites | undefined,
): void {
  const { pipelines, currentViewBindGroup } = world.ctx;
  // The batches' instance counts start at zero (cull.slang `append`
  // counts into them); the rest of the arguments `writeDrawArgs` writes.
  world.raster.drawArguments.clear(encoder, world.raster.batchList.length);
  if (points && world.raster.pointDraws.size) {
    encoder.clearBuffer(world.raster.pointCounts);
    if ([...world.raster.pointDraws.values()].some((d) => d.tiny > 0)) {
      if (pixels > world.raster.splats.pixels) {
        // Larger buffers: every point draw's group binds them.
        world.raster.splats.depth.destroy();
        world.raster.splats.color.destroy();
        world.raster.splats.feature.destroy();
        world.raster.splats = createSplats(world, pixels);
        for (const draw of world.raster.pointDraws.values()) {
          draw.group = pointGroup(world, draw);
        }
      }
      encoder.clearBuffer(
        world.raster.splats.depth,
        0,
        Math.max(4, pixels * 4),
      );
    }
  }
  world.raster.cullPassDesc.timestampWrites = timestampWrites;
  const pass = encoder.beginComputePass(world.raster.cullPassDesc);
  // Once per frame, before any view's culling reads the tables.
  uploadTables(world, pass);
  pass.setBindGroup(0, currentViewBindGroup);
  pass.setBindGroup(1, world.raster.cullBindGroup);
  pass.setPipeline(pipelines.cullRecords);
  pass.dispatchWorkgroups(Math.ceil(Math.max(world.raster.drawCount, 1) / 64));
  if (world.raster.instanceHighWater > 0) {
    pass.setPipeline(pipelines.cullInstances);
    // Two dimensions past 65,535 groups (`cullInstances` reads them).
    const groups = Math.ceil(world.raster.instanceHighWater / 64);
    const x = Math.min(groups, 65535);
    pass.dispatchWorkgroups(x, Math.ceil(groups / x));
  }
  pass.setPipeline(pipelines.writeDrawArgs);
  pass.dispatchWorkgroups(
    Math.ceil(Math.max(world.raster.batchList.length, 1) / 64),
  );
  // Point draws: their points in view into their lists (or splatted),
  // then their arguments (over `writeDrawArgs`'), with the narrower
  // world group their kernels read.
  if (points && world.raster.pointDraws.size) {
    pass.setBindGroup(1, world.raster.pointCullBindGroup);
  }
  for (const draw of points ? world.raster.pointDraws.values() : []) {
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
  // Patch draws the cull kept: their spans into chunks of cells, then
  // their draws' arguments (over the item counts the cull wrote there), in
  // a pass of their own so the timer shows the dice apart from the cull.
  // A draw no view shows has zeroed arguments already.
  pass.end();
  if (world.raster.patchDraws.size) {
    for (const draw of world.raster.patchDraws.values()) {
      encoder.clearBuffer(draw.stats);
      draw.diced = false;
    }
    world.raster.dicePassDesc.timestampWrites = diceWrites?.();
    const dice = encoder.beginComputePass(world.raster.dicePassDesc);
    dice.setBindGroup(0, currentViewBindGroup);
    dice.setBindGroup(1, world.raster.patchWorldBindGroup);
    for (const draw of world.raster.patchDraws.values()) {
      if (draw.batch.shown === 0) {
        continue;
      }
      draw.diced = true;
      dice.setBindGroup(2, draw.group);
      dice.setPipeline(pipelines.dicePatches);
      dice.dispatchWorkgroups(Math.ceil(draw.mesh.patches.spans / 64));
      dice.setPipeline(pipelines.writePatchArgs);
      dice.dispatchWorkgroups(1);
    }
    dice.end();
  }
}

/** Assigns each batch its slice of the item list and uploads the batch table. */
function writeBatches(world: CullWorld): void {
  const table = new Uint32Array(Math.max(1, world.raster.batchList.length) * 4);
  let items = 0;
  for (const batch of world.raster.batchList) {
    items += batch.items;
  }
  const direct = new Uint32Array(Math.max(1, items));
  const fill = new Uint32Array(world.raster.batchList.length);
  let base = 0;
  for (const batch of world.raster.batchList) {
    batch.itemBase = base;
    const o = batch.index * 4;
    table[o] = base;
    table[o + 1] = batch.mesh.indexCount;
    table[o + 2] = batch.mesh.firstIndex;
    base += batch.items;
  }
  for (let i = 0; i < world.raster.drawCount; i++) {
    const batch = world.raster.drawBatches[i];
    if (!batch) {
      continue;
    }
    const o = i * RECORD_WORDS;
    const count = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
    if (count === 0) {
      direct[batch.itemBase + fill[batch.index]!++] = i;
    } else {
      const first =
        world.raster.drawRows +
        world.raster.recordsU32[o + INSTANCE_FIRST_WORD]!;
      for (let k = 0; k < count; k++) {
        direct[batch.itemBase + fill[batch.index]!++] = first + k;
      }
    }
  }
  const queue = world.ctx.device.queue;
  queue.writeBuffer(world.raster.batchBuffer, 0, table);
  world.raster.drawArguments.writeDirect(direct);
  for (const [record, draw] of world.raster.pointDraws) {
    writePointParams(world, draw, record);
  }
}

/**
 * One draw per batch, grouped by cull mode and texture set: the opaque
 * pass's, or the sun's shadow casters' (depth only; no lines).
 */
export function recordBundle(
  world: BundleWorld,
  kind: BundleKind = "opaque",
  clipped = false,
): GPURenderBundle {
  const { device, targets, currentViewBindGroup } = world.ctx;
  // Height captures draw the casters, with their own pipelines.
  const height = kind === "height";
  const shadow = kind === "shadow" || height;
  const prepass = kind === "prepass";
  const depth = kind === "depth";
  // The pick variant: single-sampled, into the pick's few-pixel targets.
  const pick = kind === "pick";
  // The section caps' parity pass: the solids' fragments, single-sampled, into
  // its two parity targets, whatever the clips are (`RenderContext.capParity`).
  const caps = kind === "caps";
  const encoder = device.createRenderBundleEncoder(
    caps
      ? {
          label: "world.capsBundle",
          colorFormats: [CAP_PARITY_FORMAT, CAP_PARITY_FORMAT],
          sampleCount: 1,
        }
      : pick
        ? {
            label: "world.pickBundle",
            colorFormats: [...PICK_FORMATS],
            depthStencilFormat: PICK_DEPTH_FORMAT,
            sampleCount: 1,
          }
        : shadow || prepass
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
    (world.raster.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
      (MaterialFlags.alphaMask | MaterialFlags.alphaBlend)) !==
    0;
  // Patch draws: their own pipelines, with the chunk vertex stage; their
  // materials are opaque here (cut-outs are not drawn through them, and
  // blended ones draw in the translucent passes alone).
  // A draw of faces with a trim has its own (`...Trimmed`: the fragment stage
  // tests the trim), so the rest keep early depth.
  const patchKey = (batch: Batch): SurfaceKey => {
    const pass = pick
      ? "pickSurface"
      : prepass
        ? "prepass"
        : depth
          ? "depth"
          : height
            ? "height"
            : shadow
              ? "shadow"
              : "opaque";
    const trimmed = (batch.mesh as PatchMesh).patches.trimmed;
    return `${pass}Patch${trimmed ? "Trimmed" : ""}${batch.doubleSided ? "DoubleSided" : ""}`;
  };
  const keyOf = (batch: Batch): SurfaceKey =>
    batch.patches
      ? patchKey(batch)
      : pick
        ? batch.doubleSided
          ? "pickSurfaceDoubleSided"
          : "pickSurface"
        : prepass
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
  const order = world.raster.batchList
    .filter(
      (batch) =>
        (batch.shown > 0 || (kind === "shadow" && batch.casters > 0)) &&
        // Only the translucent passes draw it (`encodeTranslucent`); lines
        // can't blend, and stay here. A patch draw's blended faces have no
        // opaque part here either (the passes' patch stages don't cut by alpha).
        (batch.mesh.topology === "line-list" ||
          ((world.raster.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
            MaterialFlags.blendedOnly) ===
            0 &&
            !(batch.patches && translucent(world, batch)))),
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.shader?.id ?? 0) - (b.shader?.id ?? 0) ||
        a.textureSet - b.textureSet ||
        a.mesh.slab - b.mesh.slab,
    );
  const direct = world.raster._submission === "direct";
  const gaps = new Set<Batch>();
  let pipeline: GPURenderPipeline | undefined;
  let group: GPUBindGroup | undefined;
  let slab = -1;
  for (const batch of order) {
    if (
      batch.items === 0 ||
      world.raster.brokenTextureSets.has(batch.textureSet) ||
      ((shadow || prepass || depth || pick || caps) &&
        batch.mesh.topology === "line-list") ||
      // Picks of points and billboards are the depth's: their corners are
      // offsets on screen, not a surface of the content's.
      (pick && (batch.points || batch.billboard)) ||
      // Nor are they solids.
      (caps && (batch.points || batch.billboard)) ||
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
    const key = caps ? undefined : keyOf(batch);
    const {
      pipeline: wanted,
      custom,
      pending,
    } = caps
      ? capParityPipeline(world, batch)
      : batchPipeline(world, batch, key!, clipped);
    if (pending) {
      gaps.add(batch);
    }
    if (!wanted) {
      continue;
    }
    if (wanted !== pipeline) {
      pipeline = wanted;
      encoder.setPipeline(pipeline);
    }
    const wantedGroup = setGroup(world, batch, custom);
    if (wantedGroup !== group) {
      group = wantedGroup;
      encoder.setBindGroup(2, group);
    }
    // A patch draw's index buffer replaced the slab's: the next draw binds it again.
    if (world.raster.drawArguments.drawBatch(encoder, batch, direct, pick)) {
      slab = -1;
    }
  }
  const gapKey = clipped ? `${kind}+clip` : kind;
  if (gaps.size > 0) {
    world.raster.pipelineGaps.set(gapKey, gaps);
  } else {
    world.raster.pipelineGaps.delete(gapKey);
  }
  return encoder.finish();
}

/**
 * A batch's pipeline in the section caps' parity pass: the engine's own, by
 * its kind of draw (a custom shader's stages aren't used: only the surfaces'
 * positions count). Undefined, pending, while it is made.
 */
function capParityPipeline(
  world: BundleWorld,
  batch: Batch,
): {
  pipeline: GPURenderPipeline | undefined;
  custom: false;
  pending: boolean;
} {
  const kind: CapParityKind = batch.patches
    ? (batch.mesh as PatchMesh).patches.trimmed
      ? "patchTrimmed"
      : "patch"
    : "mesh";
  const pipeline = world.ctx.pipelines.capParity(kind, () => {
    world.shaderReady();
    world.ctx.wake();
  });
  return {
    pipeline,
    custom: false,
    pending: !pipeline && world.ctx.pipelines.capParityPending(kind),
  };
}

/**
 * A batch's pipeline for a pass: its custom shader's once made, else the
 * engine's (then recorded again when it is ready). `clipped`: for a view with
 * clips, the shader's clipped one, else its plain one, else the engine's
 * clipped one, else the engine's plain one (while the others are made).
 * `custom` is whether it is the shader's.
 */
function batchPipeline(
  world: BundleWorld,
  batch: Batch,
  key: SurfaceKey,
  clipped = false,
): { pipeline: GPURenderPipeline; custom: boolean; pending: boolean } {
  const shader = batch.shader;
  let pending = false;
  if (shader) {
    const { shaders, shaderBindings } = world.ctx;
    // Textures still loading read white: the batch isn't final either.
    pending = shaderBindings.pending(shader);
    if (clipped) {
      const own = shaders.pipeline(shader, clippedKey(key), world.shaderReady);
      if (own) {
        return { pipeline: own, custom: true, pending };
      }
      pending ||= shaders.pending(shader, clippedKey(key));
    }
    const own = shaders.pipeline(shader, key, world.shaderReady);
    if (own) {
      return { pipeline: own, custom: true, pending };
    }
    pending ||= shaders.pending(shader, key);
  }
  const standIn =
    clipped && world.ctx.pipelines.clippedPipeline(key, world.shaderReady);
  if (clipped && !standIn) {
    pending ||= world.ctx.pipelines.clippedPending(key);
  }
  return {
    pipeline: standIn || world.ctx.pipelines[key],
    custom: false,
    pending,
  };
}

/**
 * A batch's group 2: its texture set's, or with its custom shader's
 * pipeline (not the engine's stand-in) and uniforms, beside the shader's.
 */
function setGroup(
  world: BundleWorld,
  batch: Batch,
  custom: boolean,
): GPUBindGroup {
  const shader = batch.shader;
  const plain = world.raster.textureSets[batch.textureSet]!;
  if (!shader || !custom) {
    return plain;
  }
  const layout = world.ctx.pipelines.setLayout(shader);
  if (!layout) {
    return plain;
  }
  const own = world.ctx.shaderBindings.entries(shader);
  const groupKey = `${batch.textureSet}|${shader.id}|${own.version}`;
  let group = world.raster.shaderGroups.get(groupKey);
  if (!group) {
    group = world.ctx.device.createBindGroup({
      label: `world.textureSet ${shader.label}`,
      layout,
      entries: [
        ...world.raster.textureSetEntries[batch.textureSet]!.filter(
          (e) =>
            shader.readsPropertyTextures ||
            e.binding < PROPERTY_TEXTURE_BINDING,
        ),
        ...own.entries,
      ],
    });
    // Older versions of this shader's group are unused now.
    for (const k of world.raster.shaderGroups.keys()) {
      if (k.startsWith(`${batch.textureSet}|${shader.id}|`)) {
        world.raster.shaderGroups.delete(k);
      }
    }
    world.raster.shaderGroups.set(groupKey, group);
  }
  return group;
}

/** A batch of blended triangles (alpha mode "BLEND"); lines stay opaque. */
function translucent(world: BundleWorld, batch: Batch): boolean {
  return (
    batch.mesh.topology !== "line-list" &&
    (world.raster.materialsU32[batch.material * MATERIAL_WORDS + 12]! &
      MaterialFlags.alphaBlend) !==
      0
  );
}

export function translucentRange(
  owner: BundleWorld,
  eye: ArrayLike<number>,
  viewBit: number = ALL_VIEWS,
): { near: number; far: number } | undefined {
  if (!owner.raster.translucentDraws) {
    owner.raster.translucentDraws = [];
    for (let i = 0; i < owner.raster.drawCount; i++) {
      const batch = owner.raster.drawBatches[i];
      if (batch && translucent(owner, batch)) {
        owner.raster.translucentDraws.push(i);
      }
    }
  }
  if (owner.raster.translucentDraws.length === 0) {
    return undefined;
  }
  const u = owner.raster.recordsU32;
  const f = owner.raster.recordsF32;
  const world = owner.scene.transformWorld;
  let near = Infinity;
  let far = 0;
  const sphere = (x: number, y: number, z: number, radius: number) => {
    const d = Math.hypot(x - eye[0]!, y - eye[1]!, z - eye[2]!);
    near = Math.min(near, d - radius);
    far = Math.max(far, d + radius);
  };
  for (const i of owner.raster.translucentDraws) {
    const o = i * RECORD_WORDS;
    const t = u[o + TRANSFORM_WORD]!;
    if (
      u[o + FLAGS_WORD]! & RecordFlags.hidden ||
      (u[o + VIEW_MASK_WORD]! & viewBit) === 0 ||
      owner.scene.transformHiddenWorld[t] === 1
    ) {
      continue;
    }
    const w = t * 16;
    const scale = owner.raster.transforms.f32[t * TRANSFORM_WORDS + 3]!;
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
    const it = owner.raster.instances.f32;
    for (let j = first; j < first + count; j++) {
      const a = j * INSTANCE_WORDS;
      if (owner.raster.instances.u32[a + 14]! & 1) {
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
  world: BundleWorld,
  pass: GPURenderPassEncoder,
  keyOf: (doubleSided: boolean, patches: boolean) => SurfaceKey,
  group: GPUBindGroup,
  clipped = false,
  ghosts = false,
): void {
  pass.setBindGroup(0, world.ctx.currentViewBindGroup);
  pass.setBindGroup(3, group);
  const direct = world.raster._submission === "direct";
  let current: GPURenderPipeline | undefined;
  let bound: GPUBindGroup | undefined;
  let slab = -1;
  for (const batch of world.raster.batchList) {
    // `ghosts`: the view's clips ghost what they remove, which the
    // translucent passes draw from every opaque triangle batch too (the
    // fragment stage keeps only what is ghosted, surface.slang). A patch
    // draw's chunks are its view's dice (the same the opaque pass draws).
    if (
      batch.shown === 0 ||
      (!ghosts && !translucent(world, batch)) ||
      (ghosts && batch.mesh.topology !== "triangle-list") ||
      world.raster.brokenTextureSets.has(batch.textureSet)
    ) {
      continue;
    }
    if (batch.mesh.slab !== slab) {
      slab = batch.mesh.slab;
      bindSlab(world, pass, slab);
    }
    const key = keyOf(batch.doubleSided, batch.patches);
    const { pipeline: wanted, custom } = batchPipeline(
      world,
      batch,
      key,
      clipped,
    );
    if (wanted !== current) {
      current = wanted;
      pass.setPipeline(wanted);
    }
    const wantedGroup = setGroup(world, batch, custom);
    if (wantedGroup !== bound) {
      bound = wantedGroup;
      pass.setBindGroup(2, bound);
    }
    // A patch draw's index buffer replaced the slab's: the next draw binds it again.
    if (world.raster.drawArguments.drawBatch(pass, batch, direct)) {
      slab = -1;
    }
  }
}
