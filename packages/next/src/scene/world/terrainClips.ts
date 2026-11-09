// A world's clip boxes and terrain clip regions: their block and run allocation,
// and the rows the shaders read.
import { TerrainRegionError } from "../../globe/terrainClip.ts";
import { splitVec3 } from "../../math/transforms.ts";
import type { Vec3 } from "../../math/vec3.ts";
import {
  CLIP_BOXES,
  CLIP_BOX_FLOATS,
  packClip,
  MAX_TERRAIN_CLIPS,
  CLIP_BLOCK_ROWS,
  MAX_TERRAIN_CLIP_BLOCKS,
  ALL_VIEWS,
} from "../../render/layout.ts";
import type { World } from "../World.ts";
import type { ClipBox, ClipHandle, DrawHandle } from "./types.ts";

/** Throws unless `opacity` is a terrain region's: 0 to 1, both included. */
function checkTerrainOpacity(opacity: number): void {
  if (!(Number.isFinite(opacity) && opacity >= 0 && opacity <= 1)) {
    throw new RangeError(`terrain opacity must be from 0 to 1, got ${opacity}`);
  }
}

export function allocateClip(
  world: World,
  boxes: readonly ClipBox[],
): ClipHandle | undefined {
  if (
    boxes.length === 0 ||
    boxes.length > CLIP_BOXES ||
    world.placeholderBlocks >= world.placeholderCapacity
  ) {
    return undefined;
  }
  const block =
    world.freeClipBlocks.pop() ??
    (world.clipBlockCount < world.maxClipBlocks
      ? world.clipBlockCount++
      : blockFromRuns(world));
  if (block < 0) {
    return undefined;
  }
  world.placeholderBlocks++;
  if (block >= world.clipRows) {
    world.growClips(block + 1);
  }
  const f = world.clipScratch;
  f.fill(0);
  boxes.forEach((box, i) => {
    const o = i * CLIP_BOX_FLOATS;
    splitVec3(box.center as Vec3, f, o, f, o + 4);
    for (let k = 0; k < 3; k++) {
      f[o + 8 + k] = box.rows[k]!;
      f[o + 12 + k] = box.rows[3 + k]!;
      f[o + 16 + k] = box.rows[6 + k]!;
    }
  });
  world.ctx.device.queue.writeBuffer(world.clipBuffer, block * f.byteLength, f);
  return { block, count: boxes.length };
}

export function freeClip(world: World, clip: ClipHandle): void {
  world.freeClipBlocks.push(clip.block);
  world.placeholderBlocks--;
}

/**
 * A placeholder's block from the terrain regions' free runs, when no
 * other is left: the end of the smallest, so larger runs stay whole.
 * -1 when there is none.
 */
function blockFromRuns(world: World): number {
  const runs = world.freeClipRuns;
  let smallest = -1;
  for (let i = 0; i < runs.length; i++) {
    if (smallest < 0 || runs[i]!.blocks < runs[smallest]!.blocks) {
      smallest = i;
    }
  }
  if (smallest < 0) {
    return -1;
  }
  const run = runs[smallest]!;
  run.blocks--;
  const block = run.block + run.blocks;
  if (run.blocks === 0) {
    runs.splice(smallest, 1);
  }
  return block;
}

export function setPlaceholder(
  world: World,
  handle: DrawHandle,
  mask: number,
  clip?: ClipHandle,
): void {
  if (!world.hasDraw(handle)) {
    return;
  }
  const m = clip ? mask >>> 0 : 0;
  const packed = clip ? packClip(clip.block, clip.count) : 0;
  if (world.drawConstants.setPlaceholder(handle.index, m, packed)) {
    world.markDirty(handle.index);
  }
}

export function addTerrainClipRegion(
  world: World,
  rows: Float32Array,
  opacity = 0,
  ground = opacity > 0,
): number {
  checkTerrainOpacity(opacity);
  let slot = 0;
  while (slot < MAX_TERRAIN_CLIPS && world.terrainClipRuns[slot]) {
    slot++;
  }
  if (slot === MAX_TERRAIN_CLIPS) {
    throw new TerrainRegionError(
      `at most ${MAX_TERRAIN_CLIPS} terrain regions per world are supported; remove one, or merge neighboring regions into one polygon.`,
    );
  }
  const everywhere = rows.length === 0;
  if (everywhere) {
    world.terrainClipRuns[slot] = {
      block: 0,
      blocks: 0,
      rows,
      opacity,
      ground,
      everywhere,
    };
    writeTerrainClip(world, slot);
    world.version++;
    return slot;
  }
  const blocks = Math.ceil(rows.length / (CLIP_BLOCK_ROWS * 4));
  if (blocks > MAX_TERRAIN_CLIP_BLOCKS) {
    throw new TerrainRegionError(
      `the region takes ${blocks} clip blocks, more than the ${MAX_TERRAIN_CLIP_BLOCKS} a region may; simplify the polygon, or split it.`,
    );
  }
  if (world.terrainClipBlocks + blocks > world.terrainClipBudget) {
    throw new TerrainRegionError(
      `the world's terrain regions would take ${world.terrainClipBlocks + blocks} clip blocks, more than the ${world.terrainClipBudget} set aside for them (WorldOptions.maxClipBlocks); simplify the polygon, or remove a region.`,
    );
  }
  let block = allocateClipRun(world, blocks);
  if (block < 0) {
    // The free blocks are there but broken up: move the regions together.
    packTerrainClips(world);
    block = allocateClipRun(world, blocks);
  }
  if (block < 0) {
    throw new TerrainRegionError(
      `no run of ${blocks} clip blocks is free for the region (placeholders hold the rest of the world's ${world.maxClipBlocks}, WorldOptions.maxClipBlocks); simplify the polygon, or remove a region.`,
    );
  }
  world.terrainClipRuns[slot] = {
    block,
    blocks,
    rows,
    opacity,
    ground,
    everywhere,
  };
  world.terrainClipBlocks += blocks;
  writeTerrainClip(world, slot);
  world.version++;
  world.contentRevision_++; // rays pass through clipped terrain
  return slot;
}

export function removeTerrainClipRegion(world: World, slot: number): void {
  const run = world.terrainClipRuns[slot];
  if (!run) {
    return;
  }
  world.terrainClipRuns[slot] = undefined;
  if (run.blocks > 0) {
    world.terrainClipBlocks -= run.blocks;
    world.contentRevision_++;
    freeRun(world, run.block, run.blocks);
  }
  // An empty directory row: a stale mask bit would read a region of no
  // rows at row 0, never the freed blocks (removal also clears the
  // tiles' masks at once).
  world.ctx.device.queue.writeBuffer(
    world.clipBuffer,
    slot * 16,
    new Uint32Array(4),
  );
  world.version++;
}

export function setTerrainClipOpacity(
  world: World,
  slot: number,
  opacity: number,
): void {
  const run = world.terrainClipRuns[slot];
  if (!run || run.opacity === opacity) {
    return;
  }
  checkTerrainOpacity(opacity);
  run.opacity = opacity;
  writeDirectoryRow(world, slot);
  world.version++;
  // Masks and materials stay as they are, so nothing else marks the
  // views: an on-demand loop would keep the old opacity on screen.
  world.changedViews = ALL_VIEWS;
}

export function setTerrainClipGround(
  world: World,
  slot: number,
  ground: boolean,
): void {
  const run = world.terrainClipRuns[slot];
  if (!run || run.ground === ground) {
    return;
  }
  run.ground = ground;
  writeDirectoryRow(world, slot);
  world.version++;
  // Height captures (and rays) read the world's content revision.
  world.contentRevision_++;
  world.changedViews = ALL_VIEWS;
}

/** A region's rows into its run's blocks, and its directory row. */
function writeTerrainClip(world: World, slot: number): void {
  const run = world.terrainClipRuns[slot]!;
  if (run.blocks > 0) {
    const floats = CLIP_BLOCK_ROWS * 4;
    const data = new Float32Array(run.blocks * floats);
    data.set(run.rows);
    world.ctx.device.queue.writeBuffer(
      world.clipBuffer,
      run.block * floats * 4,
      data,
    );
  }
  writeDirectoryRow(world, slot);
}

/**
 * A slot's directory row (surface.slang `terrainOpacity`): its region's
 * first row, its opacity's bits, 1 when it holds everywhere, and 1 when
 * its terrain is ground.
 */
function writeDirectoryRow(world: World, slot: number): void {
  const run = world.terrainClipRuns[slot]!;
  const entry = new Uint32Array(4);
  entry[0] = run.block * CLIP_BLOCK_ROWS;
  new Float32Array(entry.buffer, 4, 1)[0] = run.opacity;
  entry[2] = run.everywhere ? 1 : 0;
  entry[3] = run.ground ? 1 : 0;
  world.ctx.device.queue.writeBuffer(world.clipBuffer, slot * 16, entry);
}

/**
 * Returns a run of blocks to the regions' free runs, merging neighbors,
 * and (`trim`) lowers the blocks in use when it reaches the top.
 */
function freeRun(
  world: World,
  block: number,
  blocks: number,
  trim = true,
): void {
  const runs = world.freeClipRuns;
  let i = 0;
  while (i < runs.length && runs[i]!.block < block) {
    i++;
  }
  runs.splice(i, 0, { block, blocks });
  if (i + 1 < runs.length && block + blocks === runs[i + 1]!.block) {
    runs[i]!.blocks += runs[i + 1]!.blocks;
    runs.splice(i + 1, 1);
  }
  if (i > 0 && runs[i - 1]!.block + runs[i - 1]!.blocks === block) {
    runs[i - 1]!.blocks += runs[i]!.blocks;
    runs.splice(i, 1);
  }
  if (trim) {
    trimClipRuns(world);
  }
}

/** A free run at the top lowers the blocks in use. */
function trimClipRuns(world: World): void {
  const runs = world.freeClipRuns;
  const last = runs[runs.length - 1];
  if (last && last.block + last.blocks === world.clipBlockCount) {
    world.clipBlockCount = last.block;
    runs.pop();
  }
}

/**
 * Slides every terrain region down, lowest first, to the first free run
 * of the regions' that holds it (at worst where it was), so their free
 * runs come together above them. Only the directory points at a region,
 * and the writes are queued before any later draw.
 */
function packTerrainClips(world: World): void {
  const slots = world.terrainClipRuns
    .map((run, slot) => (run && run.blocks > 0 ? slot : -1))
    .filter((slot) => slot >= 0)
    .sort(
      (a, b) =>
        world.terrainClipRuns[a]!.block - world.terrainClipRuns[b]!.block,
    );
  const runs = world.freeClipRuns;
  for (const slot of slots) {
    const run = world.terrainClipRuns[slot]!;
    freeRun(world, run.block, run.blocks, false);
    // Its own blocks are free again, so some run holds it.
    const i = runs.findIndex((r) => r.blocks >= run.blocks);
    const free = runs[i]!;
    const moved = free.block !== run.block;
    run.block = free.block;
    free.block += run.blocks;
    free.blocks -= run.blocks;
    if (free.blocks === 0) {
      runs.splice(i, 1);
    }
    if (moved) {
      writeTerrainClip(world, slot);
    }
  }
  trimClipRuns(world);
}

export function setTerrainClip(
  world: World,
  handle: DrawHandle,
  mask: number,
): void {
  if (!world.hasDraw(handle)) {
    return;
  }
  if (world.drawConstants.setTerrainClip(handle.index, mask)) {
    world.markDirty(handle.index);
  }
}

/**
 * `count` consecutive clip blocks for a terrain region: the smallest of
 * the regions' free runs that holds them, else a run of placeholders'
 * free blocks, else new ones (the buffer grows). -1 when none is free.
 */
function allocateClipRun(world: World, count: number): number {
  const runs = world.freeClipRuns;
  let fit = -1;
  for (let i = 0; i < runs.length; i++) {
    if (
      runs[i]!.blocks >= count &&
      (fit < 0 || runs[i]!.blocks < runs[fit]!.blocks)
    ) {
      fit = i;
    }
  }
  if (fit >= 0) {
    const run = runs[fit]!;
    const block = run.block;
    run.block += count;
    run.blocks -= count;
    if (run.blocks === 0) {
      runs.splice(fit, 1);
    }
    return block;
  }
  const free = world.freeClipBlocks;
  if (free.length >= count) {
    free.sort((a, b) => a - b);
    for (let i = 0; i + count <= free.length; i++) {
      if (free[i + count - 1]! - free[i]! === count - 1) {
        const block = free[i]!;
        free.splice(i, count);
        return block;
      }
    }
  }
  const block = world.clipBlockCount;
  if (block + count > world.maxClipBlocks) {
    return -1;
  }
  world.clipBlockCount += count;
  if (block + count > world.clipRows) {
    world.growClips(block + count);
  }
  return block;
}
