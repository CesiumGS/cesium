// A world's per-draw placements and the parameters that move them.
import {
  RECORD_WORDS,
  FLAGS_WORD,
  RecordFlags,
  INSTANCE_COUNT_WORD,
  RADIUS_WORD,
  NO_PLACEMENT,
  VIEW_MASK_WORD,
  CENTER_WORD,
} from "../../render/layout.ts";
import type { World } from "../World.ts";
import {
  type Placement,
  type PlacementParameter,
  checkParameterValue,
  checkPlacement,
  finite32,
} from "../placement.ts";
import {
  checkTerms,
  termBounds,
  termsMaxDisplacement,
  termsOf,
  termsParameters,
} from "../warpEvaluate.ts";
import type { CubicLattice, WarpTerms } from "../warpTerms.ts";
import type { ParameterSlot, DrawHandle } from "./types.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** Scene side, writing the rasterizer's placement table and records. */
export interface PlacementWorld extends Pick<
  World,
  "changedViews" | "hasDraw" | "markDirty" | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawBatches"
    | "drawConstants"
    | "placementTable"
    | "recordsF32"
    | "recordsU32"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    "contentRevision_" | "drawPlacements" | "meshRanges" | "parameters"
  >;
}

function isTerms(placement: Placement | WarpTerms): placement is WarpTerms {
  return Array.isArray(placement);
}

export function createPlacementParameter(
  world: PlacementWorld,
  value: number,
): PlacementParameter {
  checkParameterValue("createPlacementParameter", value);
  const word = world.raster.placementTable.allocateParameter(value);
  const slot: ParameterSlot = { word, draws: new Set() };
  let current = value;
  const changed = () => parameterChanged(world, slot, current);
  const parameter: PlacementParameter = Object.seal({
    get value() {
      return current;
    },
    set value(next: number) {
      checkParameterValue("PlacementParameter", next);
      if (next === current) {
        return;
      }
      const old = current;
      current = next;
      try {
        changed();
      } catch (error) {
        current = old; // refused: nothing was written
        throw error;
      }
    },
  });
  world.scene.parameters.set(parameter, slot);
  return parameter;
}

/**
 * Sets a draw's warp (`World.setPlacement` for a public `Placement`,
 * converted by `termsOf`; `WarpTerms` directly, for the engine's own
 * routes): the same refusals, the same bounds growth.
 */
export function setPlacement(
  world: PlacementWorld,
  handle: DrawHandle,
  placement: Placement | WarpTerms | undefined,
): void {
  if (!world.hasDraw(handle)) {
    throw new Error("setPlacement: the draw was removed.");
  }
  const index = handle.index;
  let source: Placement | undefined;
  let next: WarpTerms | undefined;
  if (placement !== undefined && isTerms(placement)) {
    checkTerms("setPlacement", placement);
    next = placement;
  } else if (placement !== undefined && placement.kind !== "affine") {
    checkPlacement("setPlacement", placement);
    source = placement;
    next = termsOf(placement);
  }
  const o = index * RECORD_WORDS;
  if (next) {
    const flags = world.raster.recordsU32[o + FLAGS_WORD]!;
    if (flags & (RecordFlags.billboard | RecordFlags.points)) {
      throw new Error(
        "setPlacement: a billboard or point draw's positions are offsets on screen; it has no per-vertex placement.",
      );
    }
    if (world.raster.recordsU32[o + INSTANCE_COUNT_WORD]! > 0) {
      throw new Error(
        "setPlacement: an instanced draw has no per-vertex placement: it would move a mesh's vertices before each instance's matrix, and not the instances.",
      );
    }
    for (const t of termsParameters(next)) {
      if (!world.scene.parameters.has(t)) {
        throw new Error(
          "setPlacement: the placement's t isn't a parameter of this world (World.createPlacementParameter).",
        );
      }
    }
    for (const { term } of next) {
      if (term.kind === "attribute") {
        const mesh = world.raster.drawBatches[index]!.mesh;
        const components = world.scene.meshRanges
          .get(mesh.id)
          ?.named?.get(term.semantic);
        if (components === undefined || components < 3) {
          throw new RangeError(
            `setPlacement: the draw's mesh has no ${term.semantic} attribute of 3 components for its dual position.`,
          );
        }
      }
    }
  }
  const old = world.scene.drawPlacements[index];
  const base = old ? old.base : world.raster.recordsF32[o + RADIUS_WORD]!;
  const reach = next ? placementReach(world, index, next, base) : 1;
  const bounds = next ? termBounds(next, reach) : [];
  const pad = next ? termsMaxDisplacement(next, reach, bounds) : 0;
  if (next) {
    finite32("setPlacement", "the draw's grown bounding radius", base + pad);
  }
  releasePlacement(world, index);
  if (!next) {
    if (old) {
      world.raster.drawConstants.setPlacement(index, NO_PLACEMENT);
      world.raster.drawConstants.setRadius(index, base);
      world.scene.contentRevision_++;
      world.markDirty(index);
    }
    return;
  }
  const at = world.raster.placementTable.add(
    next,
    (t) => world.scene.parameters.get(t)!.word,
  );
  const slots = termsParameters(next).map((t) =>
    world.scene.parameters.get(t)!,
  );
  for (const slot of slots) {
    slot.draws.add(index);
  }
  world.scene.drawPlacements[index] = {
    placement: source,
    terms: next,
    at,
    base,
    pad,
    reach,
    bounds,
    slots,
  };
  world.raster.drawConstants.setPlacement(index, at);
  world.raster.drawConstants.setRadius(index, base + pad);
  world.scene.contentRevision_++;
  world.markDirty(index);
}

export function drawPlacement(
  world: PlacementWorld,
  handle: DrawHandle,
): Placement | undefined {
  return world.hasDraw(handle)
    ? world.scene.drawPlacements[handle.index]?.placement
    : undefined;
}

/** The terms the draw's GPU evaluates, whichever way they were set. */
export function drawTerms(
  world: PlacementWorld,
  handle: DrawHandle,
): WarpTerms | undefined {
  return world.hasDraw(handle)
    ? world.scene.drawPlacements[handle.index]?.terms
    : undefined;
}

/** A parameter changed: its float, and its draws' bounds and views. */
function parameterChanged(
  world: PlacementWorld,
  slot: ParameterSlot,
  value: number,
): void {
  if (slot.draws.size === 0) {
    world.raster.placementTable.setParameter(slot.word, value);
    return;
  }
  // The bounds first, all checked before anything is written: each draw's
  // from its terms' cached bounds, so a morph's tick costs a few
  // multiplications a draw (they come out equal, between 0 and 1).
  const pads: number[] = [];
  for (const index of slot.draws) {
    const placed = world.scene.drawPlacements[index]!;
    const pad = termsMaxDisplacement(placed.terms, placed.reach, placed.bounds);
    finite32(
      "PlacementParameter",
      "a draw's grown bounding radius",
      placed.base + pad,
    );
    pads.push(pad);
  }
  world.raster.placementTable.setParameter(slot.word, value);
  let views = 0;
  let k = 0;
  for (const index of slot.draws) {
    const placed = world.scene.drawPlacements[index]!;
    const pad = pads[k++]!;
    if (pad !== placed.pad) {
      placed.pad = pad;
      world.raster.drawConstants.setRadius(index, placed.base + pad);
      world.raster.uploadsPending = true;
    }
    views |= world.raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }
  world.version++;
  world.changedViews |= views;
}

/** Frees a draw's placement block and its parameters' links to it. */
export function releasePlacement(world: PlacementWorld, index: number): void {
  const placed = world.scene.drawPlacements[index];
  if (!placed) {
    return;
  }
  world.raster.placementTable.remove(placed.at, placed.terms);
  for (const slot of placed.slots) {
    slot.draws.delete(index);
  }
  world.scene.drawPlacements[index] = undefined;
}

/**
 * How far a draw's vertices reach in its lattices' normalized coordinates
 * (at least 1): its bounding sphere's farthest point from a lattice's
 * center over its scale, the largest of them.
 */
function placementReach(
  world: PlacementWorld,
  index: number,
  terms: WarpTerms,
  radius: number,
): number {
  const o = index * RECORD_WORDS + CENTER_WORD;
  const f32 = world.raster.recordsF32;
  const reach = (l: CubicLattice) =>
    (Math.hypot(
      f32[o]! - l.center[0]!,
      f32[o + 1]! - l.center[1]!,
      f32[o + 2]! - l.center[2]!,
    ) +
      radius) /
    l.scale;
  let r = 1;
  for (const { term } of terms) {
    if (term.kind === "cubic") {
      r = Math.max(r, reach(term));
    }
  }
  return r;
}

export function releasePlacementParameter(
  world: PlacementWorld,
  parameter: PlacementParameter,
): void {
  const slot = world.scene.parameters.get(parameter);
  if (slot !== undefined) {
    world.scene.parameters.delete(parameter);
    world.raster.placementTable.releaseParameter(slot.word);
  }
}
