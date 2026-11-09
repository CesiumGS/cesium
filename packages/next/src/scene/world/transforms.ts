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
  world: World,
  matrix: ArrayLike<number>,
  parent?: TransformHandle,
): TransformHandle {
  if (parent && !world.transformAlive(parent)) {
    throw new Error("addTransform: the parent was removed.");
  }
  const index = world.freeTransforms.pop() ?? world.transformCount++;
  if (index >= world.maxTransforms) {
    world.transformCount--;
    throw new CapacityError("transform table");
  }
  world.reserveTransforms(index + 1);
  if (index >= world.transforms.gpuRows) {
    world.growTransforms(index + 1);
  }
  world.transformLocal.set(matrix, index * 16);
  world.transformParent[index] = parent ? parent.index : -1;
  if (parent) {
    (world.transformChildren[parent.index] ??= []).push(index);
  }
  world.transformChildren[index] = undefined;
  world.transformLive[index] = 1;
  world.transformHidden[index] = 0;
  world.transformAnchor[index] = parent
    ? world.transformAnchor[parent.index]!
    : 0;
  pendTransform(world, index);
  return { index, generation: world.transformGeneration[index]! };
}

export function setTransform(
  world: World,
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
  world.transformLocal.set(matrix, handle.index * 16);
  pendTransform(world, handle.index);
  world.transformRevision_++;
  world.changedViews = ALL_VIEWS;
}

export function setTransformVisible(
  world: World,
  handle: TransformHandle,
  visible: boolean,
): void {
  if (!world.transformAlive(handle)) {
    return;
  }
  const hidden = visible ? 0 : 1;
  if (world.transformHidden[handle.index] !== hidden) {
    world.transformHidden[handle.index] = hidden;
    pendTransform(world, handle.index);
    world.changedViews = ALL_VIEWS;
  }
}

export function localMatrix(
  world: World,
  handle: TransformHandle,
  out = new Float64Array(16),
): Float64Array {
  out.set(
    world.transformLocal.subarray(handle.index * 16, handle.index * 16 + 16),
  );
  return out;
}

export function worldMatrix(
  world: World,
  handle: TransformHandle,
  out = new Float64Array(16),
): Float64Array {
  resolveTransforms(world);
  out.set(
    world.transformWorld.subarray(handle.index * 16, handle.index * 16 + 16),
  );
  return out;
}

export function drawMatrix<T extends Float64Array = Float64Array<ArrayBuffer>>(
  world: World,
  handle: DrawHandle,
  out: T = new Float64Array(16) as T,
): T | undefined {
  if (!world.hasDraw(handle)) {
    return undefined;
  }
  const t = world.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
  resolveTransforms(world);
  out.set(world.transformWorld.subarray(t * 16, t * 16 + 16));
  return out;
}

export function removeTransform(world: World, handle: TransformHandle): void {
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
  const parent = world.transformParent[index]!;
  if (parent >= 0) {
    const siblings = world.transformChildren[parent];
    const at = siblings?.indexOf(index) ?? -1;
    if (at >= 0) {
      siblings!.splice(at, 1);
    }
  }
  freeTransformTree(world, index);
}

export function transformAlive(world: World, handle: TransformHandle): boolean {
  return (
    world.transformLive[handle.index] === 1 &&
    world.transformGeneration[handle.index] === handle.generation
  );
}

function freeTransformTree(world: World, index: number): void {
  world.transformRevision_++;
  for (const child of world.transformChildren[index] ?? []) {
    freeTransformTree(world, child);
  }
  world.transformChildren[index] = undefined;
  world.transformLive[index] = 0;
  world.transformParent[index] = -1;
  world.transformAnchor[index] = 0;
  world.transformFrames.delete(index);
  world.transformGeneration[index] = world.transformGeneration[index]! + 1;
  world.freeTransforms.push(index);
}

export function addAnchor(
  world: World,
  name: string,
  options: { body?: Body } = {},
): AnchorHandle {
  const body = options.body;
  const key = body ? bodyKey(body) : undefined;
  if (key !== undefined && world.bodyAnchors.has(key)) {
    throw new Error(
      `addAnchor: ${body!.name} already has an anchor (${world.bodyAnchors.get(key)!.name}).`,
    );
  }
  let slot = 1;
  while (slot < MAX_ANCHORS && world.anchorSlots[slot]) {
    slot++;
  }
  if (slot === MAX_ANCHORS) {
    throw new CapacityError("anchor table");
  }
  const transform = world.addTransform(IDENTITY);
  world.transformAnchor[transform.index] = slot;
  const anchor: AnchorHandle = Object.freeze({
    index: transform.index,
    generation: transform.generation,
    name,
    slot,
    ...(body ? { body } : {}),
  });
  world.anchorSlots[slot] = anchor;
  world.anchorPlaces.set(IDENTITY, slot * 16);
  if (key !== undefined) {
    world.bodyAnchors.set(key, anchor);
  }
  world.anchorList = undefined;
  return anchor;
}

export function bodyAnchor(world: World, body: Body): AnchorHandle {
  return (
    world.bodyAnchors.get(bodyKey(body)) ?? world.addAnchor(body.name, { body })
  );
}

export function findBodyAnchor(
  world: World,
  key: string,
): AnchorHandle | undefined {
  return world.bodyAnchors.get(key);
}

export function anchorOf(
  world: World,
  handle: TransformHandle,
): AnchorHandle | undefined {
  if (!world.transformAlive(handle)) {
    return undefined;
  }
  return world.anchorSlots[world.transformAnchor[handle.index]!];
}

export function drawAnchor(
  world: World,
  handle: DrawHandle,
): AnchorHandle | undefined {
  if (!world.hasDraw(handle)) {
    return undefined;
  }
  const t = world.recordsU32[handle.index * RECORD_WORDS + TRANSFORM_WORD]!;
  return world.anchorSlots[world.transformAnchor[t]!];
}

export function placeAnchor(
  world: World,
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
    world.anchorPlaces[anchor.slot * 16 + i] = matrix[i]!;
  }
  // Views placed through the table resolver follow on the next tick.
  world.transformRevision_++;
  world.anchorPlaceRevision_++;
  world.ctx.wake();
}

export function anchorMatrix(
  world: World,
  anchor: AnchorHandle,
  out = new Float64Array(16),
): Float64Array {
  checkAnchor(world, anchor, "anchorMatrix");
  out.set(world.anchorPlaces.subarray(anchor.slot * 16, anchor.slot * 16 + 16));
  return out;
}

export function removeAnchor(world: World, anchor: AnchorHandle): void {
  if (
    !world.transformAlive(anchor) ||
    world.anchorSlots[anchor.slot] !== anchor
  ) {
    return;
  }
  if ((world.transformChildren[anchor.index]?.length ?? 0) > 0) {
    throw new Error(
      `removeAnchor: transforms still hang under ${anchor.name}; remove them first.`,
    );
  }
  world.anchorSlots[anchor.slot] = undefined;
  if (anchor.body) {
    world.bodyAnchors.delete(bodyKey(anchor.body));
  }
  world.anchorList = undefined;
  freeTransformTree(world, anchor.index);
  world.anchorRemovals_++;
  world.anchorPlaceRevision_++;
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
  const known = world.transformFrames.get(handle.index);
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
  world.transformFrames.set(handle.index, key);
  return key;
}

/** The anchor at a transform slot, if that transform is one. */
export function anchorAt(
  world: World,
  index: number,
): AnchorHandle | undefined {
  const anchor = world.anchorSlots[world.transformAnchor[index]!];
  return anchor?.index === index ? anchor : undefined;
}

export function checkAnchor(
  world: World,
  anchor: AnchorHandle,
  caller: string,
): void {
  if (
    world.anchorSlots[anchor.slot] !== anchor ||
    !world.transformAlive(anchor)
  ) {
    throw new Error(
      `${caller}: ${anchor.name} is not an anchor of this world.`,
    );
  }
}

function pendTransform(world: World, index: number): void {
  if (world.transformPendingFlag[index] === 0) {
    world.transformPendingFlag[index] = 1;
    world.transformPending.push(index);
  }
  world.version++;
}

/** Composes changed transforms and their descendants, parents first. */
export function resolveTransforms(world: World): void {
  if (world.transformPending.length === 0) {
    return;
  }
  const stamp = ++world.transformResolve;
  for (const index of world.transformPending) {
    world.transformPendingFlag[index] = 0;
    if (world.transformLive[index] === 1) {
      // From the highest pending ancestor, so each subtree composes once.
      let top = index;
      for (
        let p = world.transformParent[index]!;
        p >= 0;
        p = world.transformParent[p]!
      ) {
        if (
          world.transformPendingFlag[p] === 1 ||
          world.transformStamp[p] === stamp
        ) {
          top = p;
        }
      }
      if (world.transformStamp[top] !== stamp) {
        composeTransform(world, top, stamp);
      }
    }
  }
  world.transformPending.length = 0;
}

function composeTransform(owner: World, index: number, stamp: number): void {
  owner.transformStamp[index] = stamp;
  const parent = owner.transformParent[index]!;
  const world = owner.transformWorld;
  // An anchor's matrix is the identity: its children's are their own,
  // bit for bit (as before anchors, at the top level).
  if (parent >= 0 && anchorAt(owner, parent) === undefined) {
    multiplyInto(
      world,
      index * 16,
      world,
      parent * 16,
      owner.transformLocal,
      index * 16,
    );
  } else {
    world.set(
      owner.transformLocal.subarray(index * 16, index * 16 + 16),
      index * 16,
    );
  }
  const hidden =
    owner.transformHidden[index] === 1 ||
    (parent >= 0 && owner.transformHiddenWorld[parent] === 1);
  owner.transformHiddenWorld[index] = hidden ? 1 : 0;
  writeTransform(
    owner.transforms.f32,
    owner.transforms.u32,
    index,
    world.subarray(index * 16, index * 16 + 16),
    hidden,
    owner.transformAnchor[index],
  );
  owner.transforms.mark(index);
  owner.uploadsPending = true;
  for (const child of owner.transformChildren[index] ?? []) {
    composeTransform(owner, child, stamp);
  }
}
