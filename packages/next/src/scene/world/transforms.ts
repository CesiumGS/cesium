// A world's transform tree and anchors: what exists where. Bookkeeping; the GPU
// reads the table it writes.
import { rigidMatrixError } from "../../math/transforms.ts";
import {
  ALL_VIEWS,
  RECORD_WORDS,
  TRANSFORM_WORD,
  MAX_ANCHORS,
  writeTransform,
} from "../../render/layout.ts";
import { type Body, bodyKey } from "../Body.ts";
import { CapacityError } from "../CapacityError.ts";
import type { World } from "../World.ts";
import type {
  TransformHandle,
  DrawHandle,
  AnchorHandle,
  TransformFrameKey,
} from "./types.ts";
import {
  reserveTransforms,
  growTransforms,
} from "../../render/world/tables.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** Scene side, growing the rasterizer's transform table: adding and removing transforms and anchors. */
export interface TransformWorld extends Pick<
  World,
  | "addAnchor"
  | "addTransform"
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
  | "transformAlive"
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
    | "drawGeneration"
    | "drawOwnedTransform"
    | "drawRows"
    | "freePointCounters"
    | "imageryPlaceholder"
    | "imagerySampler"
    | "imageryView"
    | "instances"
    | "materialRows"
    | "materialsDirty"
    | "materialsF32"
    | "materialsU32"
    | "placementTable"
    | "pointCounts"
    | "patchDraws"
    | "patchWorldBindGroup"
    | "pointCullBindGroup"
    | "pointDraws"
    | "pointSetCount"
    | "recordsU32"
    | "splats"
    | "transforms"
    | "translucentDraws"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    | "anchorList"
    | "anchorPlaceRevision_"
    | "anchorPlaces"
    | "anchorRemovals_"
    | "anchorSlots"
    | "bodyAnchors"
    | "freeTransforms"
    | "maxClipBlocks"
    | "transformAnchor"
    | "transformChildren"
    | "transformCount"
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

/** Scene side, writing the rasterizer's transform table: moving transforms and resolving the tree. */
export interface ResolveWorld extends Pick<
  World,
  | "addAnchor"
  | "changedViews"
  | "ctx"
  | "hasDraw"
  | "transformAlive"
  | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    "recordsU32" | "transforms" | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    | "anchorPlaceRevision_"
    | "anchorPlaces"
    | "anchorSlots"
    | "bodyAnchors"
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

/** Scene side: looking up anchors and reference frames. */
export interface AnchorWorld extends Pick<
  World,
  "addAnchor" | "hasDraw" | "transformAlive"
> {
  readonly raster: Pick<WorldRaster, "recordsU32">;
  readonly scene: Pick<
    WorldScene,
    "anchorSlots" | "bodyAnchors" | "transformAnchor"
  >;
}

export const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);

/** out[o..o+16) = a[ao..] × b[bo..] (column-major); `out` may alias `a`'s slot only via distinct offsets. */
function multiplyInto(
  out: Float64Array,
  o: number,
  a: Float64Array,
  ao: number,
  b: Float64Array,
  bo: number,
): void {
  for (let c = 0; c < 4; c++) {
    const b0 = b[bo + c * 4]!;
    const b1 = b[bo + c * 4 + 1]!;
    const b2 = b[bo + c * 4 + 2]!;
    const b3 = b[bo + c * 4 + 3]!;
    for (let r = 0; r < 4; r++) {
      out[o + c * 4 + r] =
        a[ao + r]! * b0 +
        a[ao + 4 + r]! * b1 +
        a[ao + 8 + r]! * b2 +
        a[ao + 12 + r]! * b3;
    }
  }
}

export function addTransform(
  world: TransformWorld,
  matrix: ArrayLike<number>,
  parent?: TransformHandle,
): TransformHandle {
  if (parent && !world.transformAlive(parent)) {
    throw new Error("addTransform: the parent was removed.");
  }
  const index =
    world.scene.freeTransforms.pop() ?? world.scene.transformCount++;
  if (index >= world.maxTransforms) {
    world.scene.transformCount--;
    throw new CapacityError("transform table");
  }
  reserveTransforms(world, index + 1);
  if (index >= world.raster.transforms.gpuRows) {
    growTransforms(world, index + 1);
  }
  world.scene.transformLocal.set(matrix, index * 16);
  world.scene.transformParent[index] = parent ? parent.index : -1;
  if (parent) {
    (world.scene.transformChildren[parent.index] ??= []).push(index);
  }
  world.scene.transformChildren[index] = undefined;
  world.scene.transformLive[index] = 1;
  world.scene.transformHidden[index] = 0;
  world.scene.transformAnchor[index] = parent
    ? world.scene.transformAnchor[parent.index]!
    : 0;
  pendTransform(world, index);
  return { index, generation: world.scene.transformGeneration[index]! };
}

export function setTransform(
  world: ResolveWorld,
  handle: TransformHandle,
  matrix: ArrayLike<number>,
): void {
  if (!world.transformAlive(handle)) {
    return;
  }
  const anchor = anchorAt(world, handle.index);
  if (anchor) {
    throw new Error(
      `setTransform: ${anchor.name} is an anchor, whose matrix is the identity; place it per view (View.setAnchorPlacement) or in the table root (placeAnchor).`,
    );
  }
  world.scene.transformLocal.set(matrix, handle.index * 16);
  pendTransform(world, handle.index);
  world.scene.transformRevision_++;
  world.changedViews = ALL_VIEWS;
}

export function setTransformVisible(
  world: ResolveWorld,
  handle: TransformHandle,
  visible: boolean,
): void {
  if (!world.transformAlive(handle)) {
    return;
  }
  const hidden = visible ? 0 : 1;
  if (world.scene.transformHidden[handle.index] !== hidden) {
    world.scene.transformHidden[handle.index] = hidden;
    pendTransform(world, handle.index);
    world.changedViews = ALL_VIEWS;
  }
}

export function localMatrix(
  world: ResolveWorld,
  handle: TransformHandle,
  out = new Float64Array(16),
): Float64Array {
  out.set(
    world.scene.transformLocal.subarray(
      handle.index * 16,
      handle.index * 16 + 16,
    ),
  );
  return out;
}

export function worldMatrix(
  world: ResolveWorld,
  handle: TransformHandle,
  out = new Float64Array(16),
): Float64Array {
  resolveTransforms(world);
  out.set(
    world.scene.transformWorld.subarray(
      handle.index * 16,
      handle.index * 16 + 16,
    ),
  );
  return out;
}

export function drawMatrix<T extends Float64Array = Float64Array<ArrayBuffer>>(
  world: ResolveWorld,
  handle: DrawHandle,
  out: T = new Float64Array(16) as T,
): T | undefined {
  if (!world.hasDraw(handle)) {
    return undefined;
  }
  const t =
    world.raster.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
  resolveTransforms(world);
  out.set(world.scene.transformWorld.subarray(t * 16, t * 16 + 16));
  return out;
}

export function removeTransform(
  world: TransformWorld,
  handle: TransformHandle,
): void {
  if (!world.transformAlive(handle)) {
    return;
  }
  const index = handle.index;
  const anchor = anchorAt(world, index);
  if (anchor) {
    throw new Error(
      `removeTransform: ${anchor.name} is an anchor; remove it with removeAnchor.`,
    );
  }
  const parent = world.scene.transformParent[index]!;
  if (parent >= 0) {
    const siblings = world.scene.transformChildren[parent];
    const at = siblings?.indexOf(index) ?? -1;
    if (at >= 0) {
      siblings!.splice(at, 1);
    }
  }
  freeTransformTree(world, index);
}

export function transformAlive(
  world: ResolveWorld,
  handle: TransformHandle,
): boolean {
  return (
    world.scene.transformLive[handle.index] === 1 &&
    world.scene.transformGeneration[handle.index] === handle.generation
  );
}

function freeTransformTree(world: TransformWorld, index: number): void {
  world.scene.transformRevision_++;
  for (const child of world.scene.transformChildren[index] ?? []) {
    freeTransformTree(world, child);
  }
  world.scene.transformChildren[index] = undefined;
  world.scene.transformLive[index] = 0;
  world.scene.transformParent[index] = -1;
  world.scene.transformAnchor[index] = 0;
  world.scene.transformFrames.delete(index);
  world.scene.transformGeneration[index] =
    world.scene.transformGeneration[index]! + 1;
  world.scene.freeTransforms.push(index);
}

export function addAnchor(
  world: TransformWorld,
  name: string,
  options: { body?: Body } = {},
): AnchorHandle {
  const body = options.body;
  const key = body ? bodyKey(body) : undefined;
  if (key !== undefined && world.scene.bodyAnchors.has(key)) {
    throw new Error(
      `addAnchor: ${body!.name} already has an anchor (${world.scene.bodyAnchors.get(key)!.name}).`,
    );
  }
  let slot = 1;
  while (slot < MAX_ANCHORS && world.scene.anchorSlots[slot]) {
    slot++;
  }
  if (slot === MAX_ANCHORS) {
    throw new CapacityError("anchor table");
  }
  const transform = world.addTransform(IDENTITY);
  world.scene.transformAnchor[transform.index] = slot;
  const anchor: AnchorHandle = Object.freeze({
    index: transform.index,
    generation: transform.generation,
    name,
    slot,
    ...(body ? { body } : {}),
  });
  world.scene.anchorSlots[slot] = anchor;
  world.scene.anchorPlaces.set(IDENTITY, slot * 16);
  if (key !== undefined) {
    world.scene.bodyAnchors.set(key, anchor);
  }
  world.scene.anchorList = undefined;
  return anchor;
}

export function bodyAnchor(world: AnchorWorld, body: Body): AnchorHandle {
  return (
    world.scene.bodyAnchors.get(bodyKey(body)) ??
    world.addAnchor(body.name, { body })
  );
}

export function findBodyAnchor(
  world: AnchorWorld,
  key: string,
): AnchorHandle | undefined {
  return world.scene.bodyAnchors.get(key);
}

export function anchorOf(
  world: AnchorWorld,
  handle: TransformHandle,
): AnchorHandle | undefined {
  if (!world.transformAlive(handle)) {
    return undefined;
  }
  return world.scene.anchorSlots[world.scene.transformAnchor[handle.index]!];
}

export function drawAnchor(
  world: AnchorWorld,
  handle: DrawHandle,
): AnchorHandle | undefined {
  if (!world.hasDraw(handle)) {
    return undefined;
  }
  const t =
    world.raster.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
  return world.scene.anchorSlots[world.scene.transformAnchor[t]!];
}

export function placeAnchor(
  world: ResolveWorld,
  anchor: AnchorHandle,
  matrix: ArrayLike<number>,
): void {
  checkAnchor(world, anchor, "placeAnchor");
  const error = rigidMatrixError(matrix);
  if (error) {
    throw new Error(
      `placeAnchor: ${anchor.name}'s place is not rigid: ${error}.`,
    );
  }
  for (let i = 0; i < 16; i++) {
    world.scene.anchorPlaces[anchor.slot * 16 + i] = matrix[i]!;
  }
  // Views placed through the table resolver follow on the next tick.
  world.scene.transformRevision_++;
  world.scene.anchorPlaceRevision_++;
  world.ctx.wake();
}

export function anchorMatrix(
  world: ResolveWorld,
  anchor: AnchorHandle,
  out = new Float64Array(16),
): Float64Array {
  checkAnchor(world, anchor, "anchorMatrix");
  out.set(
    world.scene.anchorPlaces.subarray(anchor.slot * 16, anchor.slot * 16 + 16),
  );
  return out;
}

export function removeAnchor(
  world: TransformWorld,
  anchor: AnchorHandle,
): void {
  if (
    !world.transformAlive(anchor) ||
    world.scene.anchorSlots[anchor.slot] !== anchor
  ) {
    return;
  }
  if ((world.scene.transformChildren[anchor.index]?.length ?? 0) > 0) {
    throw new Error(
      `removeAnchor: transforms still hang under ${anchor.name}; remove them first.`,
    );
  }
  world.scene.anchorSlots[anchor.slot] = undefined;
  if (anchor.body) {
    world.scene.bodyAnchors.delete(bodyKey(anchor.body));
  }
  world.scene.anchorList = undefined;
  freeTransformTree(world, anchor.index);
  world.scene.anchorRemovals_++;
  world.scene.anchorPlaceRevision_++;
  world.version++;
  world.changedViews = ALL_VIEWS;
}

export function frameOf(
  world: World,
  handle: TransformHandle,
  name: string,
): TransformFrameKey {
  if (!world.transformAlive(handle)) {
    throw new Error(`frameOf: the transform for ${name} was removed.`);
  }
  const known = world.scene.transformFrames.get(handle.index);
  if (known) {
    if (known.name !== name) {
      throw new Error(
        `frameOf: the transform is already the reference frame ${known.name}, not ${name}.`,
      );
    }
    return known;
  }
  const key: TransformFrameKey = Object.freeze({
    name,
    world: world,
    transform: Object.freeze({
      index: handle.index,
      generation: handle.generation,
    }),
  });
  world.scene.transformFrames.set(handle.index, key);
  return key;
}

/** The anchor at a transform slot, if that transform is one. */
export function anchorAt(
  world: AnchorWorld,
  index: number,
): AnchorHandle | undefined {
  const anchor = world.scene.anchorSlots[world.scene.transformAnchor[index]!];
  return anchor?.index === index ? anchor : undefined;
}

export function checkAnchor(
  world: AnchorWorld,
  anchor: AnchorHandle,
  caller: string,
): void {
  if (
    world.scene.anchorSlots[anchor.slot] !== anchor ||
    !world.transformAlive(anchor)
  ) {
    throw new Error(
      `${caller}: ${anchor.name} is not an anchor of this world.`,
    );
  }
}

function pendTransform(world: ResolveWorld, index: number): void {
  if (world.scene.transformPendingFlag[index] === 0) {
    world.scene.transformPendingFlag[index] = 1;
    world.scene.transformPending.push(index);
  }
  world.version++;
}

/** Composes changed transforms and their descendants, parents first. */
export function resolveTransforms(world: ResolveWorld): void {
  if (world.scene.transformPending.length === 0) {
    return;
  }
  const stamp = ++world.scene.transformResolve;
  for (const index of world.scene.transformPending) {
    world.scene.transformPendingFlag[index] = 0;
    if (world.scene.transformLive[index] === 1) {
      // From the highest pending ancestor, so each subtree composes once.
      let top = index;
      for (
        let p = world.scene.transformParent[index]!;
        p >= 0;
        p = world.scene.transformParent[p]!
      ) {
        if (
          world.scene.transformPendingFlag[p] === 1 ||
          world.scene.transformStamp[p] === stamp
        ) {
          top = p;
        }
      }
      if (world.scene.transformStamp[top] !== stamp) {
        composeTransform(world, top, stamp);
      }
    }
  }
  world.scene.transformPending.length = 0;
}

function composeTransform(
  owner: ResolveWorld,
  index: number,
  stamp: number,
): void {
  owner.scene.transformStamp[index] = stamp;
  const parent = owner.scene.transformParent[index]!;
  const world = owner.scene.transformWorld;
  // An anchor's matrix is the identity: its children's are their own,
  // bit for bit (as before anchors, at the top level).
  if (parent >= 0 && anchorAt(owner, parent) === undefined) {
    multiplyInto(
      world,
      index * 16,
      world,
      parent * 16,
      owner.scene.transformLocal,
      index * 16,
    );
  } else {
    world.set(
      owner.scene.transformLocal.subarray(index * 16, index * 16 + 16),
      index * 16,
    );
  }
  const hidden =
    owner.scene.transformHidden[index] === 1 ||
    (parent >= 0 && owner.scene.transformHiddenWorld[parent] === 1);
  owner.scene.transformHiddenWorld[index] = hidden ? 1 : 0;
  writeTransform(
    owner.raster.transforms.f32,
    owner.raster.transforms.u32,
    index,
    world.subarray(index * 16, index * 16 + 16),
    hidden,
    owner.scene.transformAnchor[index],
  );
  owner.raster.transforms.mark(index);
  owner.raster.uploadsPending = true;
  for (const child of owner.scene.transformChildren[index] ?? []) {
    composeTransform(owner, child, stamp);
  }
}
