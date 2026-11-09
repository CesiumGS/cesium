// A world's per-draw placements and the parameters that move them.
import {
  RECORD_WORDS,
  FLAGS_WORD,
  RecordFlags,
  INSTANCE_COUNT_WORD,
  RADIUS_WORD,
  NO_PLACEMENT,
  ALL_VIEWS,
  VIEW_MASK_WORD,
  CENTER_WORD,
} from "../../render/layout.ts";
import type { World } from "../World.ts";
import {
  type Placement,
  type PlacementParameter,
  checkParameterValue,
  checkPlacement,
  maxDisplacement,
  finite32,
  type FittedOperation,
} from "../placement.ts";
import type { ParameterSlot, DrawHandle } from "./types.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** @internal Scene side, writing the rasterizer's placement table and records. */
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

/** The parameters a placement reads. */
function parametersOf(placement: Placement): PlacementParameter[] {
  return placement.kind === "dual" || placement.kind === "blend"
    ? [placement.t]
    : [];
}

export function createPlacementParameter(
  world: PlacementWorld,
  value: number,
): PlacementParameter {
  checkParameterValue("createPlacementParameter", value);
  const word = world.raster.placementTable.allocateParameter(value);
  const slot: ParameterSlot = { word, draws: new Set() };
  let current = value;
  const changed = (old: number) => parameterChanged(world, slot, old, current);
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
        changed(old);
      } catch (error) {
        current = old; // refused: nothing was written
        throw error;
      }
    },
  });
  world.scene.parameters.set(parameter, slot);
  return parameter;
}

export function setPlacement(
  world: PlacementWorld,
  handle: DrawHandle,
  placement: Placement | undefined,
): void {
  if (!world.hasDraw(handle)) {
    throw new Error("setPlacement: the draw was removed.");
  }
  const index = handle.index;
  const next =
    placement !== undefined && placement.kind !== "affine"
      ? placement
      : undefined;
  const o = index * RECORD_WORDS;
  if (next) {
    checkPlacement("setPlacement", next);
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
    for (const t of parametersOf(next)) {
      if (!world.scene.parameters.has(t)) {
        throw new Error(
          "setPlacement: the placement's t isn't a parameter of this world (World.createPlacementParameter).",
        );
      }
    }
    if (next.kind === "dual") {
      const mesh = world.raster.drawBatches[index]!.mesh;
      const components = world.scene.meshRanges
        .get(mesh.id)
        ?.named?.get(next.semantic);
      if (components === undefined || components < 3) {
        throw new RangeError(
          `setPlacement: the draw's mesh has no ${next.semantic} attribute of 3 components for its dual position.`,
        );
      }
    }
  }
  const old = world.scene.drawPlacements[index];
  const base = old ? old.base : world.raster.recordsF32[o + RADIUS_WORD]!;
  const reach = next ? placementReach(world, index, next, base) : 1;
  const pad = next ? maxDisplacement(next, reach) : 0;
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
  const slots = parametersOf(next).map((t) => world.scene.parameters.get(t)!);
  for (const slot of slots) {
    slot.draws.add(index);
  }
  world.scene.drawPlacements[index] = {
    placement: next,
    at,
    base,
    pad,
    reach,
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

/** A parameter changed: its float, and its draws' bounds and views. */
function parameterChanged(
  world: PlacementWorld,
  slot: ParameterSlot,
  old: number,
  value: number,
): void {
  if (slot.draws.size === 0) {
    world.raster.placementTable.setParameter(slot.word, value);
    return;
  }
  // Between 0 and 1 no kind's bounds move (a dual position's are fixed
  // for |t| ≤ 1, a blend's for 0 ≤ t ≤ 1): the float alone, and every
  // view redraws, with no walk over the draws (a morph's every tick).
  if (old >= 0 && old <= 1 && value >= 0 && value <= 1) {
    world.raster.placementTable.setParameter(slot.word, value);
    world.version++;
    world.changedViews = ALL_VIEWS;
    return;
  }
  // The bounds first, all checked before anything is written.
  const pads: number[] = [];
  for (const index of slot.draws) {
    const placed = world.scene.drawPlacements[index]!;
    const pad = maxDisplacement(placed.placement, placed.reach);
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
  world.raster.placementTable.remove(placed.at, placed.placement);
  for (const slot of placed.slots) {
    slot.draws.delete(index);
  }
  world.scene.drawPlacements[index] = undefined;
}

/**
 * How far a draw's vertices reach in a fitted operation's normalized
 * coordinates (at least 1): its bounding sphere's farthest point from
 * the operation's center over its scale.
 */
function placementReach(
  world: PlacementWorld,
  index: number,
  placement: Placement,
  radius: number,
): number {
  const o = index * RECORD_WORDS + CENTER_WORD;
  const f32 = world.raster.recordsF32;
  const reach = (f: "identity" | FittedOperation) =>
    f === "identity"
      ? 1
      : (Math.hypot(
          f32[o]! - f.center[0]!,
          f32[o + 1]! - f.center[1]!,
          f32[o + 2]! - f.center[2]!,
        ) +
          radius) /
        f.scale;
  switch (placement.kind) {
    case "fitted":
      return Math.max(1, reach(placement));
    case "blend":
      return Math.max(1, reach(placement.from), reach(placement.to));
    default:
      return 1;
  }
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
