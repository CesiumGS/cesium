import {
  PRIMITIVE_SPECS,
  type LeafNode,
  type PrimitiveLeaf,
  type Vec3,
} from "./tree.ts";
import {
  apply,
  applyInverse,
  dot,
  length,
  mad,
  normalize,
  rotationOf,
  scale,
  sub,
  type V3,
} from "./viewMath.ts";

/**
 * Face push-pull (plan §13.33, direct manipulation phase 2): a picked face
 * of the solid is a face of one leaf, and the leaf's kind says which of its
 * parameters that face is. Dragging the face along its normal changes that
 * parameter (and, where the opposite face must stay, the leaf's move), and
 * the solid re-evaluates by what the tree means: a hole's wall pushed into
 * the material is the hole's radius getting larger.
 *
 * - A box's face moves that side: its size on that axis, and its middle by
 *   half the change, so the opposite face stays.
 * - A cylinder's cap is its height, moved the same way; its side is its
 *   radius. A cone's cap is its height; its side moves both radii together.
 * - A sphere's face is its radius, a torus's the tube's (minor) radius.
 * - A face that no parameter explains (made by a boolean's intersection, or
 *   a STEP part's) has no mapping: `pushPullFor` answers undefined.
 *
 * The face's outward normal in the solid and the leaf's own outward normal
 * can be opposite (a cutter's faces face into the material it cuts), and
 * the drag follows the solid's: pushing out of the solid is the leaf
 * getting smaller there.
 */
export interface LeafPose {
  params: Record<string, number>;
  translate: Vec3;
}

export interface PushPullResult extends LeafPose {
  /** The parameter's new value, m. */
  value: number;
  /** How far the face moved along its normal in the solid, m (after limits). */
  moved: number;
}

export interface PushPull {
  leafId: number;
  /** The parameter's name: "Height", "Radius". */
  label: string;
  /** The parameter's value before the drag, m. */
  value: number;
  /** The solid's outward normal at the pick, unit. */
  normal: V3;
  /** The leaf as it was when the drag could start. */
  start: LeafPose;
  /** What dragging the face `distance` metres along its normal (negative: into the solid) does. */
  apply(distance: number): PushPullResult;
}

/** How close to a leaf's surface a pick must be for the leaf to explain it, m. */
const TOLERANCE = 0.01;

/**
 * The parameter a face of `leaf` is, picked at `point` where the solid's
 * outward normal is `normal` (the sample's metres), or undefined.
 */
export function pushPullFor(
  leaf: LeafNode,
  point: ArrayLike<number>,
  normal: ArrayLike<number>,
): PushPull | undefined {
  if (leaf.kind === "step") {
    return undefined;
  }
  const R = rotationOf(leaf.rotate);
  // The leaf as it is now: a drag changes the leaf itself, and each step is made from this.
  const start: LeafPose = {
    params: { ...leaf.params },
    translate: [...leaf.translate],
  };
  const local = applyInverse(R, sub(point, start.translate));
  const nl = normalize(applyInverse(R, normal));
  const params = start.params;
  const spec = (key: string) =>
    PRIMITIVE_SPECS[leaf.kind].params.find((p) => p.key === key)!;

  /**
   * The mapping once the leaf's own outward direction is known (local): the
   * change of `key` per metre of the face's travel is ±1 by whether the
   * leaf's direction and the solid's normal agree; `shift` moves the middle
   * by half the change along the leaf's direction (a face of a box or a
   * cap), and `alsoKeys` change by the same amount.
   */
  const make = (
    key: string,
    label: string,
    direction: V3,
    shift: boolean,
    alsoKeys: readonly string[] = [],
  ): PushPull => {
    const sign = dot(direction, nl) >= 0 ? 1 : -1;
    const value = params[key]!;
    return {
      leafId: leaf.id,
      label,
      value,
      normal: normalize(normal as V3),
      start,
      apply: (distance) => {
        const min = spec(key).min;
        const next = Math.max(min, value + sign * distance);
        const change = next - value;
        const out: Record<string, number> = { ...params, [key]: next };
        for (const also of alsoKeys) {
          out[also] = Math.max(spec(also).min, params[also]! + change);
        }
        return {
          params: out,
          translate: shift
            ? (mad(start.translate, apply(R, direction), change / 2) as Vec3)
            : ([...start.translate] as Vec3),
          value: next,
          moved: sign * change,
        };
      },
    };
  };

  return explain(leaf as PrimitiveLeaf, local, nl, make);
}

function explain(
  leaf: PrimitiveLeaf,
  local: V3,
  nl: V3,
  make: (
    key: string,
    label: string,
    direction: V3,
    shift: boolean,
    alsoKeys?: readonly string[],
  ) => PushPull,
): PushPull | undefined {
  const p = leaf.params;
  const flat = (axis: number) => Math.abs(nl[axis]!) > 0.9;
  switch (leaf.kind) {
    case "box": {
      const keys = ["sizeX", "sizeY", "sizeZ"];
      const labels = ["Size x", "Size y", "Size z"];
      let best: { axis: number; gap: number } | undefined;
      for (let axis = 0; axis < 3; axis++) {
        const gap = Math.abs(Math.abs(local[axis]!) - p[keys[axis]!]! / 2);
        if (flat(axis) && gap < TOLERANCE && (!best || gap < best.gap)) {
          best = { axis, gap };
        }
      }
      if (!best) {
        return undefined;
      }
      const direction: V3 = [0, 0, 0];
      direction[best.axis] = local[best.axis]! >= 0 ? 1 : -1;
      return make(keys[best.axis]!, labels[best.axis]!, direction, true);
    }
    case "cylinder": {
      const half = p.height! / 2;
      if (flat(2) && Math.abs(Math.abs(local[2]) - half) < TOLERANCE) {
        return make("height", "Height", [0, 0, local[2] >= 0 ? 1 : -1], true);
      }
      const rho = Math.hypot(local[0], local[1]);
      if (!flat(2) && Math.abs(rho - p.radius!) < TOLERANCE) {
        return make(
          "radius",
          "Radius",
          [local[0] / rho, local[1] / rho, 0],
          false,
        );
      }
      return undefined;
    }
    case "cone": {
      const half = p.height! / 2;
      if (flat(2) && Math.abs(Math.abs(local[2]) - half) < TOLERANCE) {
        return make("height", "Height", [0, 0, local[2] >= 0 ? 1 : -1], true);
      }
      const rho = Math.hypot(local[0], local[1]);
      const on =
        p.radiusBase! +
        ((p.radiusTop! - p.radiusBase!) * (local[2] + half)) / p.height!;
      if (!flat(2) && rho > 1e-9 && Math.abs(rho - on) < TOLERANCE) {
        return make(
          "radiusBase",
          "Base radius",
          [local[0] / rho, local[1] / rho, 0],
          false,
          ["radiusTop"],
        );
      }
      return undefined;
    }
    case "sphere": {
      const r = length(local);
      return r > 1e-9 && Math.abs(r - p.radius!) < TOLERANCE
        ? make("radius", "Radius", scale(local, 1 / r), false)
        : undefined;
    }
    case "torus": {
      const rho = Math.hypot(local[0], local[1]);
      if (rho < 1e-9) {
        return undefined;
      }
      const ring: V3 = [
        (local[0] / rho) * p.major!,
        (local[1] / rho) * p.major!,
        0,
      ];
      const out = sub(local, ring);
      const r = length(out);
      return Math.abs(r - p.minor!) < TOLERANCE
        ? make("minor", "Tube radius", scale(out, 1 / r), false)
        : undefined;
    }
  }
}

/**
 * Where a dragged face would sit relative to the planar faces of the solid
 * parallel to it: the distance along the drag that puts it on the nearest
 * one within `within` metres, with the face that plane is. `plane` is the
 * drag's start plane (a point and the unit normal it moves along).
 */
export function snapToPlanes(
  planes: ReadonlyArray<{ face: number; normal: V3; offset: number }>,
  startOffset: number,
  normal: ArrayLike<number>,
  distance: number,
  within: number,
  skipFace?: number,
): { distance: number; face: number } | undefined {
  let best: { distance: number; face: number } | undefined;
  for (const plane of planes) {
    const parallel = dot(plane.normal, normal);
    if (plane.face === skipFace || Math.abs(Math.abs(parallel) - 1) > 1e-3) {
      continue;
    }
    // The plane's offset along the drag's own normal.
    const target = plane.offset * Math.sign(parallel) - startOffset;
    if (
      Math.abs(target - distance) <= within &&
      (!best ||
        Math.abs(target - distance) < Math.abs(best.distance - distance))
    ) {
      best = { distance: target, face: plane.face };
    }
  }
  return best;
}
