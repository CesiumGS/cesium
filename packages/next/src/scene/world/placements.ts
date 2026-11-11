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
import { updatePatchPlacement } from "./patches.ts";
import {
  type Placement,
  type PlacementParameter,
  checkInRange,
  checkParameterRange,
  checkParameterValue,
  checkPlacement,
  finite32,
} from "../placement.ts";
import { checkTerms, termsOf, termsParameters } from "../warpEvaluate.ts";
import {
  drawnSphere,
  roundUp32,
  termBoundsOver,
  type TermBounds,
} from "../warpBounds.ts";
import type { WarpTerms } from "../warpTerms.ts";
import type { ParameterSlot, DrawHandle, DrawPlacement } from "./types.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** Scene side, writing the rasterizer's placement table and records. */
export interface PlacementWorld extends Pick<
  World,
  "changedViews" | "ctx" | "hasDraw" | "markDirty" | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawBatches"
    | "drawConstants"
    | "patchDraws"
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

/** `World.changedViews` for every view. */
const ALL_VIEWS = 0xffffffff;

export function createPlacementParameter(
  world: PlacementWorld,
  value: number,
  options: { readonly range?: readonly [number, number] } = {},
): PlacementParameter {
  checkParameterValue("createPlacementParameter", value);
  let range: readonly [number, number] | undefined;
  if (options.range !== undefined) {
    checkParameterRange("createPlacementParameter", options.range);
    range = Object.freeze([options.range[0], options.range[1]] as const);
    checkInRange("createPlacementParameter", range, value);
  }
  const word = world.raster.placementTable.allocateParameter(value);
  const slot: ParameterSlot = { word, draws: new Set(), readers: 0 };
  let current = value;
  const changed = () => parameterChanged(world, slot, current);
  const parameter: PlacementParameter = Object.seal({
    get value() {
      return current;
    },
    set value(next: number) {
      checkParameterValue("PlacementParameter", next);
      checkInRange("PlacementParameter", range, next);
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
    get range() {
      return range;
    },
  });
  world.scene.parameters.set(parameter, slot);
  return parameter;
}

/**
 * Where the record's culling sphere is for `placed` at its parameters'
 * values now (`drawnSphere`): its base centre moved by the displacement at
 * it, in float32 as the record holds it, and the base radius grown by the
 * residual and by what rounding the centre cost. Refused where float32
 * can't hold it.
 */
function placedSphere(
  caller: string,
  placed: Pick<DrawPlacement, "base" | "center" | "terms" | "bounds">,
): { center: [number, number, number]; radius: number; pad: number } {
  const { shift, pad } = drawnSphere(placed.terms, placed.bounds);
  const center: [number, number, number] = [0, 0, 0];
  let rounding = 0;
  for (let a = 0; a < 3; a++) {
    const exact = placed.center[a]! + shift[a]!;
    finite32(caller, "the draw's moved bounding centre", exact);
    center[a] = Math.fround(exact);
    rounding += (center[a]! - exact) ** 2;
  }
  const grown = pad + Math.sqrt(rounding);
  finite32(caller, "the draw's grown bounding radius", placed.base + grown);
  return { center, radius: roundUp32(placed.base + grown), pad: grown };
}

/** Writes the record's bounding sphere (which marks the record for upload). */
function writeSphere(
  world: PlacementWorld,
  index: number,
  center: readonly number[],
  radius: number,
): void {
  world.raster.drawConstants.setBounds(index, center, radius);
}

/**
 * Sets a draw's warp (`World.setPlacement` for a public `Placement`,
 * converted by `termsOf`; `WarpTerms` directly, for the engine's own
 * routes): the same refusals. Its culling sphere moves by the displacement
 * at its centre and grows by the residual only (`drawnSphere`), for every
 * value in its parameters' ranges.
 */
export function setPlacement(
  world: PlacementWorld,
  handle: DrawHandle,
  placement: Placement | WarpTerms | undefined,
  options: {
    /** The engine's own route term for a billboard: its placement moves its anchor (lattice terms only). */
    readonly anchored?: boolean;
  } = {},
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
      if (
        !options.anchored ||
        flags & RecordFlags.points ||
        next.some(({ term }) => term.kind !== "cubic")
      ) {
        throw new Error(
          "setPlacement: a billboard or point draw's positions are offsets on screen; it has no per-vertex placement.",
        );
      }
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
  const center: readonly [number, number, number] = old
    ? old.center
    : [
        world.raster.recordsF32[o + CENTER_WORD]!,
        world.raster.recordsF32[o + CENTER_WORD + 1]!,
        world.raster.recordsF32[o + CENTER_WORD + 2]!,
      ];
  let sphere: ReturnType<typeof placedSphere> | undefined;
  let bounds: TermBounds[] = [];
  if (next) {
    bounds = next.map(({ term }) => termBoundsOver(term, center, base));
    sphere = placedSphere("setPlacement", {
      base,
      center,
      terms: next,
      bounds,
    });
  }
  releasePlacement(world, index);
  if (!next || !sphere) {
    if (old) {
      world.raster.drawConstants.setPlacement(index, NO_PLACEMENT);
      writeSphere(world, index, old.center, base);
      updatePatchPlacement(world, index, undefined);
      world.scene.contentRevision_++;
      world.markDirty(index);
    }
    return;
  }
  const at = world.raster.placementTable.add(
    next,
    (t) => world.scene.parameters.get(t)!.word,
  );
  const parameters = termsParameters(next);
  const slots = parameters.map((t) => world.scene.parameters.get(t)!);
  parameters.forEach((t, i) => {
    slots[i]!.readers++;
    if (t.range === undefined) {
      slots[i]!.draws.add(index);
    }
  });
  world.scene.drawPlacements[index] = {
    placement: source,
    terms: next,
    at,
    base,
    center,
    pad: sphere.pad,
    bounds,
    slots,
  };
  world.raster.drawConstants.setPlacement(index, at);
  writeSphere(world, index, sphere.center, sphere.radius);
  updatePatchPlacement(world, index, world.scene.drawPlacements[index]);
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

/**
 * A parameter changed: its float, and the bounds and views of the draws
 * that follow its value (a parameter with a range has none: its draws'
 * bounds hold over the whole range, so only the float is written).
 */
function parameterChanged(
  world: PlacementWorld,
  slot: ParameterSlot,
  value: number,
): void {
  if (slot.readers === 0) {
    world.raster.placementTable.setParameter(slot.word, value);
    return;
  }
  if (slot.draws.size === 0) {
    // Ranged: every reader's bounds hold over the range, so only the float
    // is written (no draw is walked); views redraw, whichever show them.
    world.raster.placementTable.setParameter(slot.word, value);
    world.version++;
    world.changedViews |= ALL_VIEWS;
    return;
  }
  // The spheres first, all checked before anything is written: each from
  // its terms' cached bounds, so a tick costs a few multiplications a draw.
  const spheres: Array<ReturnType<typeof placedSphere>> = [];
  for (const index of slot.draws) {
    spheres.push(
      placedSphere("PlacementParameter", world.scene.drawPlacements[index]!),
    );
  }
  world.raster.placementTable.setParameter(slot.word, value);
  let views = 0;
  let k = 0;
  for (const index of slot.draws) {
    const placed = world.scene.drawPlacements[index]!;
    const sphere = spheres[k++]!;
    placed.pad = sphere.pad;
    writeSphere(world, index, sphere.center, sphere.radius);
    updatePatchPlacement(world, index, placed);
    world.raster.uploadsPending = true;
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
    slot.readers--;
    slot.draws.delete(index);
  }
  world.scene.drawPlacements[index] = undefined;
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
