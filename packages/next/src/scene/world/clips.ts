// Clips: sections cut through the world's content (plan §13.26, "Clip planes
// and caps: decided by the owner", increment 8a; caps are 8b).
//
// A `ClipSet` is a world object: shapes (planes, boxes, extruded polygons) named
// in a reference frame, combined by union or intersection, keeping what is
// inside them or outside. Views opt in by mask (`View.clipMask`, a bit per
// `WorldClip`), as draws do by `viewMask`.
//
// Each set is tested where its frame is. Per view, the CPU places each set
// into the shading axes, camera-relative, in float64 (`planClips`,
// `packClipTable`), and the fragment stage reads that table in one loop with
// constant bounds (surface.slang `clipsDiscard`), so no configuration compiles
// a shader:
//
// - **True.** The set's route to the view's body anchor (the content's true
//   side) is rigid, and the content's route to the render root crosses no
//   warp but presentation ones: the table is tested on the true point, the
//   fragment's location 4 (`relPosition`: the draw's transform on the design
//   position, before any placement).
// - **Drawn.** The set's route to the render root is rigid: the table is
//   tested on the drawn point, which a placed draw rebuilds per fragment
//   (surface.slang `drawnPosition`), and an unplaced one reads from location 4.
// - **Curved.** Neither is rigid: the set is a curved surface in the scene
//   (the route from the content to the set's frame crosses a reprojection
//   that bends it). Its signed distance is fitted per draw, over the draw's
//   lattice, into the rows' free fourth channel (`WorldCurvedClips`,
//   curvedClips.ts): the vertex stage evaluates it at the design position
//   (surface.slang `Placed.clip`, in `airTransmittance.w`), the varying
//   interpolates it, and the fragment stage discards by its sign. The cut is
//   accurate to the fit's error, and to the mesh's own chords: the distance
//   is interpolated between vertices as the surface is. A draw carries one
//   field (`.w`), so a world's views may use one set of curved sets (their
//   fields combine by max: kept where every curved set keeps); another
//   view's different curved sets are left out and reported.
//
// Queries test in float64 by routing points into the set's own frame
// (`clipFilter`).
//
// Effects (`ClipSet.effect`): what a set does with what it doesn't keep.
// Discard is the default. A ghost draws the removed side blended in the
// translucent passes (or dithered in the opaque pass: stipple), a shade set
// removes nothing, and any of them tells a custom shader the fragment's
// signed distance to the cut (`FragmentInput.clipDistance`, …). The effect
// rides in three table rows after the set's shapes (`CLIP_EFFECT_ROWS`), so
// changing it recompiles nothing; a draw `clipExempt` is left alone by all.
import type { ClipFilter } from "../../geometry/query.ts";
import type { FrameKey, FrameResolver } from "../../camera/frameResolver.ts";
import {
  NonRigidRouteError,
  resolveRoute,
  routeForward,
  routeIsRigid,
  type Route,
} from "../../camera/route.ts";

/** A point or direction as three numbers. */
export type Vec3Like = readonly [number, number, number];

/**
 * A shape of a clip set, in the set's frame. Its inside is:
 *
 * - `plane`: the side the normal points away from (`n · (p − point) ≤ 0`);
 * - `box`: the oriented box about `center`, `axes` its unit directions (the
 *   frame's own axes by default) and `halfExtents` its half-sizes along them;
 * - `polygon`: the prism over `ring` (x and y in the frame, any winding,
 *   closed implicitly) between `zRange` (the frame's z, unbounded by default).
 *   The extrusion is along the frame's z axis: name a local frame for another.
 */
export type ClipShape =
  | {
      readonly kind: "plane";
      readonly point: Vec3Like;
      readonly normal: Vec3Like;
    }
  | {
      readonly kind: "box";
      readonly center: Vec3Like;
      readonly halfExtents: Vec3Like;
      readonly axes?: readonly [Vec3Like, Vec3Like, Vec3Like];
    }
  | {
      readonly kind: "polygon";
      readonly ring: ReadonlyArray<readonly [number, number]>;
      readonly zRange?: readonly [number, number];
    };

/** Four numbers: a clip effect's parameters for a custom shader. */
export type Vec4Like = readonly [number, number, number, number];

/**
 * What a set does with the fragments on the side it doesn't keep, and what
 * it tells a custom shader (`ClipSet.effect`):
 *
 * - `"discard"` (the default): they are cut out of every pass, picks included.
 * - `{ kind: "discard", params }`: the same, and a custom shader still sees
 *   the kept fragments' `clipDistance` (negative, metres to the cut), to glow
 *   or fade near it.
 * - `{ kind: "translucent", alpha, … }`: a ghost. They are cut out of the opaque
 *   passes (no depth, shadow, ambient occlusion or pick), and drawn blended at
 *   `alpha` in the translucent passes, over what lies behind them. `method:
 *   "stipple"` is the cheap first cut instead: a screen-door dither in the
 *   opaque pass (no extra pass, writes depth and casts shadows, picks stop on
 *   the kept pixels), for scenes where the blended pass is too dear.
 * - `{ kind: "shade", params }`: nothing is removed; the set only tells a custom
 *   shader (`fsInput.clipDistance`, `clipFlags`, `clipId`, `clipParams`) which
 *   side a fragment is on and how far from the cut.
 *
 * Content a draw exempts from clips (`DrawOptions.clipExempt`) is left
 * alone by every effect. Effects are for sets tested on the true or the
 * drawn point; a curved set (increment 8c) always discards.
 */
export type ClipEffect =
  | "discard"
  | {
      readonly kind: "discard";
      /** Given to custom shaders as `fsInput.clipParams`. */
      readonly params?: Vec4Like;
    }
  | {
      readonly kind: "translucent";
      /** How much of the removed surface shows, 0 (none) to 1 (not below it), exclusive. Default 0.25. */
      readonly alpha?: number;
      /** Linear RGB the ghost is tinted toward. Default white. */
      readonly tint?: Vec3Like;
      /** How far toward `tint`, 0 to 1. Default 0 (no tint). */
      readonly tintStrength?: number;
      /**
       * "blend" (default): the translucent passes draw it (needs the view's
       * ghost batches: every opaque triangle batch again in them, with a clip
       * test); "stipple": a dither in the opaque pass.
       */
      readonly method?: "blend" | "stipple";
      readonly params?: Vec4Like;
    }
  | {
      readonly kind: "shade";
      readonly params?: Vec4Like;
    };

/**
 * Shapes in a frame, combined, and what is kept. A fragment of a view is
 * drawn when every set the view uses keeps it, or removes it by an effect that
 * keeps it drawn (`effect`).
 *
 * Exemptions are per draw (`DrawOptions.clipExempt`, `Tileset3D`'s
 * `clipExempt`): the hook where the styling language's, run-time data by
 * element ID, will land (plan §13.26, decision 10). There is no list per clip.
 */
export interface ClipSet {
  /** The reference frame the shapes are named in (any frame, presentation frames included). */
  readonly frame: FrameKey;
  /** At least one, at most `MAX_CLIP_SHAPES`. */
  readonly shapes: readonly ClipShape[];
  /** How the shapes make one region: their union (default) or their intersection. */
  readonly combine?: "union" | "intersection";
  /** What is kept: what is inside the region (default), or outside it. */
  readonly keep?: "inside" | "outside";
  /** What happens to what the set doesn't keep (default "discard"). */
  readonly effect?: ClipEffect;
}

/** A clip set in a world (`World.addClip`): a bit in `View.clipMask`. */
export interface WorldClip {
  readonly id: number;
  /** Its bit in `View.clipMask` (`1 << id`). */
  readonly bit: number;
  readonly world: object;
}

/** Sets a view's table holds. */
export const MAX_CLIP_SETS = 8;
/** Shapes in a set. */
export const MAX_CLIP_SHAPES = 16;
/** Vertices of one polygon. */
export const MAX_CLIP_POLYGON_VERTICES = 128;
/** World clips: the bits of `View.clipMask`. */
export const MAX_WORLD_CLIPS = 32;
/** Rows (four floats) of the table: its header, a row a set, then shapes. */
export const CLIP_HEADER_ROWS = 1 + MAX_CLIP_SETS;
/** Rows one set's shapes may take, so any eight fit. */
export const MAX_CLIP_SET_ROWS = 480;
/** Rows of a view's table. */
export const CLIP_TABLE_ROWS = 4096;
export const CLIP_TABLE_BYTES = CLIP_TABLE_ROWS * 16;

/** Shape kinds in the table (surface.slang `CLIP_PLANE`, …). */
export const CLIP_PLANE = 0;
export const CLIP_BOX = 1;
export const CLIP_POLYGON = 2;
/** Bits of a set row's flags. */
export const CLIP_SET_INTERSECTION = 1;
export const CLIP_SET_KEEP_OUTSIDE = 2;
export const CLIP_SET_DRAWN = 4;
/** A curved set: its signed distance was fitted per draw (the row has no shapes). */
export const CLIP_SET_CURVED = 8;
/** Reserved: the styling language's exemptions by element data (a set row's w). */
export const CLIP_SET_EXEMPT = 3;
/**
 * A ghost set (`ClipEffect` "translucent"): what it removes is drawn blended in
 * the translucent passes, or (`CLIP_SET_STIPPLE`) dithered in the opaque pass.
 */
export const CLIP_SET_GHOST = 16;
export const CLIP_SET_STIPPLE = 32;
/** A set that removes nothing and only reports (`ClipEffect` "shade"). */
export const CLIP_SET_SHADE = 64;
/** A set with effect rows (`CLIP_EFFECT_ROWS`, at the row in bits 8 and up of its flags): it reports to custom shaders. */
export const CLIP_SET_REPORT = 128;
/** Where a set's effect rows start, in its flags. */
export const CLIP_SET_EFFECT_SHIFT = 8;
/** Rows an effect takes: (tint, strength), (alpha, clip id), params. */
export const CLIP_EFFECT_ROWS = 3;
/**
 * The header's flags: some set is tested on the drawn point; some set is
 * curved; some set reports (has effect rows); some set is a blended ghost.
 */
export const CLIP_ANY_DRAWN = 1;
export const CLIP_ANY_CURVED = 2;
export const CLIP_ANY_REPORT = 4;
export const CLIP_ANY_GHOST = 8;
/** What `fsInput.clipFlags` carries: this set removes the fragment; it is a ghost. */
export const CLIP_FLAG_REMOVED = 1;
export const CLIP_FLAG_GHOST = 2;
/** `fsInput.clipDistance` where no set reports. */
export const CLIP_NO_DISTANCE = 3.4e38;
/** `fsInput.clipId` where no set reports. */
export const CLIP_NO_ID = 0xffffffff;
/** The ghost's default alpha. */
export const CLIP_GHOST_ALPHA = 0.25;

/** Beyond this a polygon's z range is unbounded: float32 holds it exactly enough. */
const UNBOUNDED = 1e30;

const finite = (v: ArrayLike<number>, n = 3): boolean => {
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(v[i])) {
      return false;
    }
  }
  return true;
};

/** Rows a shape takes in the table. */
export function shapeRows(shape: ClipShape): number {
  switch (shape.kind) {
    case "plane":
      return 2;
    case "box":
      return 4;
    case "polygon":
      return 5 + Math.ceil(shape.ring.length / 2);
  }
}

/** Throws a `RangeError` naming what is wrong with `set`. */
export function validateClipSet(set: ClipSet): void {
  if (!set.frame || typeof set.frame.name !== "string") {
    throw new RangeError("a clip set needs a reference frame (frame).");
  }
  const shapes = set.shapes;
  if (shapes.length === 0 || shapes.length > MAX_CLIP_SHAPES) {
    throw new RangeError(
      `a clip set holds 1 to ${MAX_CLIP_SHAPES} shapes, not ${shapes.length}.`,
    );
  }
  let rows = 0;
  shapes.forEach((shape, i) => {
    const at = `clip shape ${i} (${shape.kind})`;
    rows += shapeRows(shape);
    if (shape.kind === "plane") {
      const n = shape.normal;
      if (
        !finite(shape.point) ||
        !finite(n) ||
        !(Math.hypot(n[0], n[1], n[2]) > 0)
      ) {
        throw new RangeError(
          `${at}: a point and a normal of finite, nonzero length.`,
        );
      }
    } else if (shape.kind === "box") {
      const h = shape.halfExtents;
      if (
        !finite(shape.center) ||
        !finite(h) ||
        !(h[0] > 0 && h[1] > 0 && h[2] > 0)
      ) {
        throw new RangeError(
          `${at}: a finite center and positive half extents.`,
        );
      }
      if (shape.axes) {
        const a = shape.axes;
        for (let r = 0; r < 3; r++) {
          if (!finite(a[r]!) || Math.abs(Math.hypot(...a[r]!) - 1) > 1e-6) {
            throw new RangeError(`${at}: axes must be unit vectors.`);
          }
          for (let s = r + 1; s < 3; s++) {
            const d =
              a[r]![0] * a[s]![0] + a[r]![1] * a[s]![1] + a[r]![2] * a[s]![2];
            if (Math.abs(d) > 1e-6) {
              throw new RangeError(`${at}: axes must be perpendicular.`);
            }
          }
        }
      }
    } else {
      const n = shape.ring.length;
      if (n < 3 || n > MAX_CLIP_POLYGON_VERTICES) {
        throw new RangeError(
          `${at}: 3 to ${MAX_CLIP_POLYGON_VERTICES} vertices, not ${n}.`,
        );
      }
      if (!shape.ring.every((v) => finite(v, 2))) {
        throw new RangeError(`${at}: every vertex must be finite.`);
      }
      const z = shape.zRange;
      if (z && !(z[0] <= z[1])) {
        throw new RangeError(`${at}: zRange is [least, greatest].`);
      }
    }
  });
  if (rows > MAX_CLIP_SET_ROWS) {
    throw new RangeError(
      `a clip set of these shapes needs ${rows} table rows, more than the ${MAX_CLIP_SET_ROWS} a set may take; split it, or simplify the polygons.`,
    );
  }
  validateClipEffect(set.effect);
}

/** Throws a `RangeError` naming what is wrong with `effect`. */
export function validateClipEffect(effect: ClipEffect | undefined): void {
  if (effect === undefined || effect === "discard") {
    return;
  }
  if (typeof effect !== "object" || effect === null) {
    throw new RangeError(
      `a clip effect is "discard" or an object with a kind, not ${String(effect)}.`,
    );
  }
  const params = "params" in effect ? effect.params : undefined;
  if (params && (params.length !== 4 || !finite(params, 4))) {
    throw new RangeError("a clip effect's params are four finite numbers.");
  }
  if (effect.kind === "translucent") {
    const alpha = effect.alpha ?? CLIP_GHOST_ALPHA;
    if (!(alpha >= 0 && alpha < 1)) {
      throw new RangeError(
        `a ghost's alpha is from 0 up to, not including, 1 (1 is the surface itself, kept or removed): ${alpha}.`,
      );
    }
    const strength = effect.tintStrength ?? 0;
    if (!(strength >= 0 && strength <= 1)) {
      throw new RangeError(`a ghost's tintStrength is 0 to 1: ${strength}.`);
    }
    if (effect.tint && !finite(effect.tint)) {
      throw new RangeError("a ghost's tint is three finite numbers.");
    }
    if (
      effect.method !== undefined &&
      effect.method !== "blend" &&
      effect.method !== "stipple"
    ) {
      throw new RangeError(
        `a ghost's method is "blend" or "stipple": ${String(effect.method)}.`,
      );
    }
  } else if (effect.kind !== "discard" && effect.kind !== "shade") {
    throw new RangeError(
      `unknown clip effect kind "${String((effect as { kind: unknown }).kind)}": discard, translucent or shade.`,
    );
  }
}

/** Whether a set's removed side is drawn as a blended ghost (the translucent passes draw it). */
export function isBlendedGhost(set: ClipSet): boolean {
  const e = set.effect;
  return (
    typeof e === "object" &&
    e.kind === "translucent" &&
    (e.method ?? "blend") === "blend"
  );
}

// --- classification, in float64 ------------------------------------------------

/** Whether `p` (in the set's frame) is inside `shape`. */
export function shapeContains(shape: ClipShape, p: ArrayLike<number>): boolean {
  switch (shape.kind) {
    case "plane": {
      const n = shape.normal;
      const q = shape.point;
      const length = Math.hypot(n[0], n[1], n[2]);
      return (
        (n[0] * (p[0]! - q[0]) +
          n[1] * (p[1]! - q[1]) +
          n[2] * (p[2]! - q[2])) /
          length <=
        0
      );
    }
    case "box": {
      const a = shape.axes ?? IDENTITY_AXES;
      const h = shape.halfExtents;
      const d = [
        p[0]! - shape.center[0],
        p[1]! - shape.center[1],
        p[2]! - shape.center[2],
      ];
      for (let k = 0; k < 3; k++) {
        const u = a[k]![0] * d[0]! + a[k]![1] * d[1]! + a[k]![2] * d[2]!;
        if (Math.abs(u) > h[k]!) {
          return false;
        }
      }
      return true;
    }
    case "polygon": {
      const z = shape.zRange;
      if (z && (p[2]! < z[0] || p[2]! > z[1])) {
        return false;
      }
      const x = p[0]!;
      const y = p[1]!;
      const ring = shape.ring;
      let inside = false;
      for (let i = 0, n = ring.length; i < n; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        if (a[1] > y !== b[1] > y) {
          const crossing = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
          if (x < crossing) {
            inside = !inside;
          }
        }
      }
      return inside;
    }
  }
}

const IDENTITY_AXES: readonly [Vec3Like, Vec3Like, Vec3Like] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * Whether the set keeps `p` (in the set's frame). A "shade" set keeps every
 * point: it removes nothing. A ghost removes what it doesn't keep, as the
 * opaque passes and picks see it.
 */
export function clipSetKeeps(set: ClipSet, p: ArrayLike<number>): boolean {
  if (typeof set.effect === "object" && set.effect.kind === "shade") {
    return true;
  }
  const all = set.combine === "intersection";
  let region = all;
  for (const shape of set.shapes) {
    const inside = shapeContains(shape, p);
    if (all ? !inside : inside) {
      region = !all;
      break;
    }
  }
  return set.keep === "outside" ? !region : region;
}

// --- signed distances, in float64 (what a curved clip fits) --------------------

/** The distance from `(x, y)` to a polygon's ring, negative inside (even-odd, as `shapeContains`). */
function ringDistance(
  ring: ReadonlyArray<readonly [number, number]>,
  x: number,
  y: number,
): number {
  let nearest = Infinity;
  let inside = false;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const length2 = ex * ex + ey * ey;
    const t =
      length2 > 0
        ? Math.min(
            1,
            Math.max(0, ((x - a[0]) * ex + (y - a[1]) * ey) / length2),
          )
        : 0;
    nearest = Math.min(
      nearest,
      Math.hypot(x - a[0] - t * ex, y - a[1] - t * ey),
    );
    if (a[1] > y !== b[1] > y) {
      const crossing = a[0] + ((y - a[1]) * ex) / (b[1] - a[1]);
      if (x < crossing) {
        inside = !inside;
      }
    }
  }
  return inside ? -nearest : nearest;
}

/**
 * The shape's signed distance at `p` (in the set's frame): negative inside,
 * zero on the boundary, positive outside, `shapeContains` where it is ≤ 0.
 * A plane's and a polygon's (extruded: the larger of the ring's and the z
 * range's) are exact; a box's is the largest overshoot along its axes (exact
 * outside a face, a lower bound near an edge or corner).
 */
export function shapeDistance(shape: ClipShape, p: ArrayLike<number>): number {
  switch (shape.kind) {
    case "plane": {
      const n = shape.normal;
      const q = shape.point;
      return (
        (n[0] * (p[0]! - q[0]) +
          n[1] * (p[1]! - q[1]) +
          n[2] * (p[2]! - q[2])) /
        Math.hypot(n[0], n[1], n[2])
      );
    }
    case "box": {
      const a = shape.axes ?? IDENTITY_AXES;
      const h = shape.halfExtents;
      const dx = p[0]! - shape.center[0];
      const dy = p[1]! - shape.center[1];
      const dz = p[2]! - shape.center[2];
      let d = -Infinity;
      for (let k = 0; k < 3; k++) {
        const u = a[k]![0] * dx + a[k]![1] * dy + a[k]![2] * dz;
        d = Math.max(d, Math.abs(u) - h[k]!);
      }
      return d;
    }
    case "polygon": {
      let d = ringDistance(shape.ring, p[0]!, p[1]!);
      const z = shape.zRange;
      if (z) {
        d = Math.max(d, z[0] - p[2]!, p[2]! - z[1]);
      }
      return d;
    }
  }
}

/**
 * The set's signed distance at `p` with its keep rule folded in: the set
 * keeps `p` where it is ≤ 0. The region's is the shapes' least (union) or
 * greatest (intersection); keeping the outside negates it.
 */
export function clipSetDistance(set: ClipSet, p: ArrayLike<number>): number {
  const all = set.combine === "intersection";
  let region = all ? -Infinity : Infinity;
  for (const shape of set.shapes) {
    const d = shapeDistance(shape, p);
    region = all ? Math.max(region, d) : Math.min(region, d);
  }
  return set.keep === "outside" ? -region : region;
}

// --- the world's clips ---------------------------------------------------------

/** A world's clip sets by bit (`World.addClip`). */
export class WorldClips {
  private readonly sets: Array<ClipSet | undefined> = [];
  private readonly handles: Array<WorldClip | undefined> = [];
  /** Goes up when a set is added, changed or removed. */
  revision = 0;

  constructor(private readonly owner: object) {}

  add(set: ClipSet): WorldClip {
    validateClipSet(set);
    let id = 0;
    while (id < MAX_WORLD_CLIPS && this.sets[id]) {
      id++;
    }
    if (id >= MAX_WORLD_CLIPS) {
      throw new RangeError(
        `a world holds at most ${MAX_WORLD_CLIPS} clips (the bits of a view's clipMask); remove one.`,
      );
    }
    const handle: WorldClip = Object.freeze({
      id,
      bit: (1 << id) >>> 0,
      world: this.owner,
    });
    this.sets[id] = freezeSet(set);
    this.handles[id] = handle;
    this.revision++;
    return handle;
  }

  set(clip: WorldClip, set: ClipSet): void {
    this.check(clip);
    validateClipSet(set);
    this.sets[clip.id] = freezeSet(set);
    this.revision++;
  }

  remove(clip: WorldClip): void {
    this.check(clip);
    this.sets[clip.id] = undefined;
    this.handles[clip.id] = undefined;
    this.revision++;
  }

  get(clip: WorldClip): ClipSet | undefined {
    return clip.world === this.owner ? this.sets[clip.id] : undefined;
  }

  /** The handles in `mask` that still exist, by bit. */
  inMask(mask: number): WorldClip[] {
    const out: WorldClip[] = [];
    for (let id = 0; id < MAX_WORLD_CLIPS; id++) {
      const handle = this.handles[id];
      if (handle && (mask & handle.bit) !== 0) {
        out.push(handle);
      }
    }
    return out;
  }

  /** The sets in `mask`, by bit. */
  setsInMask(mask: number): ClipSet[] {
    return this.inMask(mask).map((h) => this.sets[h.id]!);
  }

  private check(clip: WorldClip): void {
    if (clip.world !== this.owner || !this.sets[clip.id]) {
      throw new Error("this clip is not (or is no longer) in this world.");
    }
  }
}

function freezeSet(set: ClipSet): ClipSet {
  return Object.freeze({
    frame: set.frame,
    shapes: Object.freeze(
      set.shapes.map((s) => {
        switch (s.kind) {
          case "plane":
            return Object.freeze({
              kind: "plane" as const,
              point: [...s.point] as unknown as Vec3Like,
              normal: [...s.normal] as unknown as Vec3Like,
            });
          case "box":
            return Object.freeze({
              kind: "box" as const,
              center: [...s.center] as unknown as Vec3Like,
              halfExtents: [...s.halfExtents] as unknown as Vec3Like,
              ...(s.axes && {
                axes: s.axes.map((a) => [...a]) as unknown as [
                  Vec3Like,
                  Vec3Like,
                  Vec3Like,
                ],
              }),
            });
          case "polygon":
            return Object.freeze({
              kind: "polygon" as const,
              ring: s.ring.map((v) => [v[0], v[1]] as const),
              ...(s.zRange && { zRange: [s.zRange[0], s.zRange[1]] as const }),
            });
        }
      }),
    ),
    combine: set.combine ?? "union",
    keep: set.keep ?? "inside",
    ...(set.effect !== undefined &&
      set.effect !== "discard" && { effect: freezeEffect(set.effect) }),
  });
}

function freezeEffect(effect: Exclude<ClipEffect, "discard">): ClipEffect {
  const params = effect.params && ([...effect.params] as unknown as Vec4Like);
  switch (effect.kind) {
    case "discard":
      return Object.freeze({
        kind: "discard" as const,
        ...(params && { params }),
      });
    case "shade":
      return Object.freeze({
        kind: "shade" as const,
        ...(params && { params }),
      });
    case "translucent":
      return Object.freeze({
        kind: "translucent" as const,
        alpha: effect.alpha ?? CLIP_GHOST_ALPHA,
        tint: (effect.tint
          ? [...effect.tint]
          : [1, 1, 1]) as unknown as Vec3Like,
        tintStrength: effect.tintStrength ?? 0,
        method: effect.method ?? "blend",
        ...(params && { params }),
      });
  }
}

// --- which space a set is tested in, per view ----------------------------------

/** What a view tells the placement of its clips. */
export interface ClipViewPlacement {
  readonly resolver: FrameResolver;
  /** The scene time, UTC seconds since 1970. */
  readonly seconds: number;
  /** The view's render root. */
  readonly root: FrameKey;
  /** The view's body anchor (the shading axes' frame), or the world's root: the content's true side. */
  readonly body: FrameKey;
  /** Render space ← the body anchor (`View.anchorPlacement`). */
  readonly bodyPlacement: ArrayLike<number>;
  /** The body anchor's route to the root, when it crosses a warp (`View.anchorRoute`). */
  readonly bodyRoute: Route | undefined;
}

export type ClipSpace = "true" | "drawn" | "curved";

/**
 * A set placed for a view: which point it is tested on, and its frame in the
 * shading axes. A curved set has no matrix (the identity): its distance is
 * fitted per draw (`WorldCurvedClips`).
 */
export interface PlannedClip {
  readonly set: ClipSet;
  readonly space: ClipSpace;
  /** Shading axes ← the set's frame (column-major, rigid). */
  readonly matrix: Float64Array;
}

/**
 * Whether location 4, the draw's transform on the design position, is the
 * true point under `route`: only when every warp it crosses is a
 * presentation warp (plan §13.26, "Gaps found"). A reprojection moves
 * where content is, so the drawn point is the true one there.
 */
export function locationFourIsTrue(route: Route | undefined): boolean {
  return (
    route === undefined ||
    route.steps.every((s) => s.kind === "rigid" || s.warp.presentation)
  );
}

function isNonRigid(error: unknown): boolean {
  return error instanceof NonRigidRouteError;
}

/**
 * Chooses the space `set` is tested in for a view, and the matrix that takes
 * the set's frame to the shading axes there. Throws what the resolver throws
 * when it can't answer (`FrameUnavailableError`). Neither route rigid: the
 * set is `curved` (fitted per draw, `WorldCurvedClips`).
 */
export function planClip(set: ClipSet, view: ClipViewPlacement): PlannedClip {
  if (locationFourIsTrue(view.bodyRoute)) {
    try {
      const matrix = view.resolver.resolve(
        set.frame,
        view.body,
        view.seconds,
        new Float64Array(16),
      );
      return { set, space: "true", matrix };
    } catch (error) {
      if (!isNonRigid(error)) {
        throw error;
      }
    }
  }
  try {
    const toRoot = view.resolver.resolve(
      set.frame,
      view.root,
      view.seconds,
      new Float64Array(16),
    );
    // The drawn point is in render space; the shading axes are the body anchor's.
    const matrix = multiplyRigid(invertRigid(view.bodyPlacement), toRoot);
    return { set, space: "drawn", matrix };
  } catch (error) {
    if (!isNonRigid(error)) {
      throw error;
    }
  }
  return { set, space: "curved", matrix: identity16() };
}

const identity16 = (): Float64Array =>
  Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

function multiplyRigid(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): Float64Array {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += a[k * 4 + r]! * b[c * 4 + k]!;
      }
      out[c * 4 + r] = s;
    }
  }
  return out;
}

function invertRigid(m: ArrayLike<number>): Float64Array {
  const out = new Float64Array(16);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[c * 4 + r] = m[r * 4 + c]!;
    }
  }
  for (let r = 0; r < 3; r++) {
    out[12 + r] = -(
      out[r]! * m[12]! +
      out[4 + r]! * m[13]! +
      out[8 + r]! * m[14]!
    );
  }
  out[15] = 1;
  return out;
}

// --- the table the fragment stage reads -----------------------------------------

/**
 * Writes the table of `plans` into `out` (`CLIP_TABLE_ROWS` rows of four
 * floats), camera-relative: `camera` is the eye in the body anchor's
 * coordinates, float64. Returns the bytes to upload. Layout (surface.slang):
 *
 * - row 0 (uints): the number of sets, `CLIP_ANY_DRAWN` when some set is tested on
 *   the drawn point;
 * - rows 1 to `MAX_CLIP_SETS` (uints): a set's first row, its shape count, its
 *   flags (`CLIP_SET_*`, with the row of its effect in bits 8 and up), and a
 *   reserved word (exemptions). A curved set
 *   (`CLIP_SET_CURVED`, header flag `CLIP_ANY_CURVED`) has no shapes: the
 *   fragment tests the draw's fitted distance (a varying) instead;
 * - then each shape: a header row (uints: kind, rows with the header, vertex
 *   count), and its rows. A plane: (n, d) with inside n·p + d ≤ 0. A box: three
 *   rows (a, w) with u = a·p + w, inside when all |u| ≤ 1. A polygon: three
 *   rows (e, w) the same, giving the local x, y, z, then (z least, z greatest),
 *   then its vertices, two a row (x₀, y₀, x₁, y₁), relative to the polygon's
 *   origin;
 * - after a set's shapes, if it has an effect (`CLIP_SET_REPORT`), its
 *   `CLIP_EFFECT_ROWS`: (tint rgb, tint strength), (alpha), (params).
 */
export function packClipTable(
  plans: readonly PlannedClip[],
  camera: ArrayLike<number>,
  out: Float32Array,
): number {
  if (plans.length > MAX_CLIP_SETS) {
    throw new RangeError(
      `a view uses at most ${MAX_CLIP_SETS} clip sets, not ${plans.length}.`,
    );
  }
  const u32 = new Uint32Array(out.buffer, out.byteOffset, out.length);
  out.fill(0, 0, CLIP_HEADER_ROWS * 4);
  let row = CLIP_HEADER_ROWS;
  let anyDrawn = false;
  let anyCurved = false;
  let anyReport = false;
  let anyGhost = false;
  plans.forEach((plan, s) => {
    const first = row;
    if (plan.space === "curved") {
      // No shapes: the draw's fitted distance is the test.
      const at = (1 + s) * 4;
      u32[at] = first;
      u32[at + 1] = 0;
      u32[at + 2] = CLIP_SET_CURVED;
      u32[at + 3] = 0;
      anyCurved = true;
      return;
    }
    const m = plan.matrix;
    const rotate = (v: ArrayLike<number>): [number, number, number] => [
      m[0]! * v[0]! + m[4]! * v[1]! + m[8]! * v[2]!,
      m[1]! * v[0]! + m[5]! * v[1]! + m[9]! * v[2]!,
      m[2]! * v[0]! + m[6]! * v[1]! + m[10]! * v[2]!,
    ];
    /** The point in the shading axes, relative to the camera. */
    const place = (p: ArrayLike<number>): [number, number, number] => {
      const r = rotate(p);
      return [
        r[0] + m[12]! - camera[0]!,
        r[1] + m[13]! - camera[1]!,
        r[2] + m[14]! - camera[2]!,
      ];
    };
    const unit = (v: ArrayLike<number>): [number, number, number] => {
      const length = Math.hypot(v[0]!, v[1]!, v[2]!);
      return [v[0]! / length, v[1]! / length, v[2]! / length];
    };
    const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
      a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    for (const shape of plan.set.shapes) {
      const head = row++;
      u32[head * 4 + 1] = shapeRows(shape);
      if (shape.kind === "plane") {
        const n = rotate(unit(shape.normal));
        const p = place(shape.point);
        u32[head * 4] = CLIP_PLANE;
        out.set([n[0], n[1], n[2], -dot(n, p)], row * 4);
        row++;
      } else if (shape.kind === "box") {
        const axes = shape.axes ?? IDENTITY_AXES;
        const c = place(shape.center);
        u32[head * 4] = CLIP_BOX;
        for (let k = 0; k < 3; k++) {
          const a = rotate(axes[k]!);
          const h = shape.halfExtents[k]!;
          const scaled: [number, number, number] = [
            a[0] / h,
            a[1] / h,
            a[2] / h,
          ];
          out.set([scaled[0], scaled[1], scaled[2], -dot(scaled, c)], row * 4);
          row++;
        }
      } else {
        const ring = shape.ring;
        let cx = 0;
        let cy = 0;
        for (const v of ring) {
          cx += v[0];
          cy += v[1];
        }
        cx /= ring.length;
        cy /= ring.length;
        const o = place([cx, cy, 0]);
        u32[head * 4] = CLIP_POLYGON;
        u32[head * 4 + 2] = ring.length;
        for (const e of [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ] as const) {
          const a = rotate(e);
          out.set([a[0], a[1], a[2], -dot(a, o)], row * 4);
          row++;
        }
        const z = shape.zRange;
        out.set([z ? z[0] : -UNBOUNDED, z ? z[1] : UNBOUNDED, 0, 0], row * 4);
        row++;
        for (let i = 0; i < ring.length; i += 2) {
          const a = ring[i]!;
          const b = ring[i + 1];
          out.set(
            [a[0] - cx, a[1] - cy, b ? b[0] - cx : 0, b ? b[1] - cy : 0],
            row * 4,
          );
          row++;
        }
      }
    }
    const drawn = plan.space === "drawn";
    anyDrawn ||= drawn;
    const at = (1 + s) * 4;
    u32[at] = first;
    u32[at + 1] = plan.set.shapes.length;
    let flags =
      (plan.set.combine === "intersection" ? CLIP_SET_INTERSECTION : 0) |
      (plan.set.keep === "outside" ? CLIP_SET_KEEP_OUTSIDE : 0) |
      (drawn ? CLIP_SET_DRAWN : 0);
    const effect = plan.set.effect;
    if (effect !== undefined && effect !== "discard") {
      // Three rows after the shapes: (tint, strength), (alpha), params.
      const params = effect.params ?? [0, 0, 0, 0];
      let tint: Vec3Like = [1, 1, 1];
      let strength = 0;
      let alpha = 0;
      flags |= CLIP_SET_REPORT | (row << CLIP_SET_EFFECT_SHIFT);
      if (effect.kind === "translucent") {
        tint = effect.tint ?? tint;
        strength = effect.tintStrength ?? 0;
        alpha = effect.alpha ?? CLIP_GHOST_ALPHA;
        flags |=
          (effect.method ?? "blend") === "stipple"
            ? CLIP_SET_STIPPLE | CLIP_SET_GHOST
            : CLIP_SET_GHOST;
        anyGhost ||= (effect.method ?? "blend") === "blend";
      } else if (effect.kind === "shade") {
        flags |= CLIP_SET_SHADE;
      }
      out.set([tint[0], tint[1], tint[2], strength], row * 4);
      out.set([alpha, 0, 0, 0], (row + 1) * 4);
      out.set(params, (row + 2) * 4);
      row += CLIP_EFFECT_ROWS;
      anyReport = true;
    }
    u32[at + 2] = flags;
    u32[at + 3] = 0;
  });
  u32[0] = plans.length;
  u32[1] =
    (anyDrawn ? CLIP_ANY_DRAWN : 0) |
    (anyCurved ? CLIP_ANY_CURVED : 0) |
    (anyReport ? CLIP_ANY_REPORT : 0) |
    (anyGhost ? CLIP_ANY_GHOST : 0);
  if (row > CLIP_TABLE_ROWS) {
    throw new RangeError(
      `the clip table needs ${row} rows, more than ${CLIP_TABLE_ROWS}.`,
    );
  }
  return row * 16;
}

/** Far depth of a ghost no shape bounds (a plane's, or a box's outside), m. */
export const CLIP_GHOST_FAR = 2e7;

/**
 * The range of distances from the camera at which a view's blended ghosts can
 * be drawn, for the translucent passes' moments (`writeTranslucency`), or
 * undefined for none. A set that removes the inside of its boxes (it keeps the
 * outside) is bounded by them; any other reaches as far as the view does.
 */
export function ghostRange(
  plans: readonly PlannedClip[],
  camera: ArrayLike<number>,
): { near: number; far: number } | undefined {
  let near = Infinity;
  let far = 0;
  for (const { set, matrix: m, space } of plans) {
    if (space === "curved" || !isBlendedGhost(set)) {
      continue;
    }
    const removesInside = set.keep === "outside";
    const boxes = set.shapes.filter((s) => s.kind === "box");
    const bounded =
      removesInside &&
      (set.combine === "intersection"
        ? boxes.length > 0
        : boxes.length === set.shapes.length);
    if (!bounded) {
      near = 0;
      far = Math.max(far, CLIP_GHOST_FAR);
      continue;
    }
    for (const box of boxes) {
      if (box.kind !== "box") {
        continue;
      }
      const c = box.center;
      const x =
        m[0]! * c[0] + m[4]! * c[1] + m[8]! * c[2] + m[12]! - camera[0]!;
      const y =
        m[1]! * c[0] + m[5]! * c[1] + m[9]! * c[2] + m[13]! - camera[1]!;
      const z =
        m[2]! * c[0] + m[6]! * c[1] + m[10]! * c[2] + m[14]! - camera[2]!;
      const radius = Math.hypot(...box.halfExtents);
      const d = Math.hypot(x, y, z);
      near = Math.min(near, Math.max(d - radius, 0));
      far = Math.max(far, d + radius);
    }
  }
  return far > 0 ? { near: Number.isFinite(near) ? near : 0, far } : undefined;
}

/** Whether the shape whose header is row `r` of `table` holds `p`: the fragment test's twin. */
function tableShapeInside(
  table: Float32Array,
  u32: Uint32Array,
  r: number,
  p: ArrayLike<number>,
): boolean {
  const row = (i: number) => table.subarray(i * 4, i * 4 + 4);
  const local = (i: number) => {
    const a = row(r + 1 + i);
    return a[0]! * p[0]! + a[1]! * p[1]! + a[2]! * p[2]! + a[3]!;
  };
  const kind = u32[r * 4]!;
  if (kind === CLIP_PLANE) {
    return local(0) <= 0;
  }
  if (kind === CLIP_BOX) {
    return (
      Math.max(Math.abs(local(0)), Math.abs(local(1)), Math.abs(local(2))) <= 1
    );
  }
  const x = local(0);
  const y = local(1);
  const z = local(2);
  const zr = row(r + 4);
  if (!(z >= zr[0]! && z <= zr[1]!)) {
    return false;
  }
  const n = u32[r * 4 + 2]!;
  const vertex = (i: number): [number, number] => {
    const v = row(r + 5 + (i >> 1));
    return (i & 1) === 0 ? [v[0]!, v[1]!] : [v[2]!, v[3]!];
  };
  let odd = false;
  for (let i = 0; i < n; i++) {
    const a = vertex(i);
    const b = vertex(i + 1 === n ? 0 : i + 1);
    if (a[1] > y !== b[1] > y) {
      const crossing = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      if (x < crossing) {
        odd = !odd;
      }
    }
  }
  return odd;
}

/**
 * The table's float32 view of `plans`, as the GPU reads it (a twin of the
 * fragment test, for checks). `curved` is the draw's fitted distance at the
 * fragment, which a curved set's row tests. A ghost's removed side counts as
 * removed (the opaque passes' view of it) and a "shade" set removes nothing.
 */
export function tableKeeps(
  table: Float32Array,
  space: {
    readonly true: ArrayLike<number>;
    readonly drawn: ArrayLike<number>;
    readonly curved?: number;
  },
): boolean {
  return tableVerdict(table, space).keeps;
}

/** What the clips make of one fragment (surface.slang `clipsKeep`, `clipsReport`). */
export interface ClipVerdict {
  /** The fragment is drawn by the pass asked about. */
  readonly keeps: boolean;
  /** Only ghost sets remove it, and the pass draws it as the ghost (blended passes: the blend ones; opaque: the stipple's kept pixels). */
  readonly ghosted: boolean;
  /** The ghosts' alphas multiplied (1 where none). */
  readonly alpha: number;
  /** What a custom shader sees (`fsInput.clipDistance`, `clipFlags`, `clipId`, `clipParams`). */
  readonly distance: number;
  readonly flags: number;
  readonly id: number;
  readonly params: Vec4Like;
}

/**
 * The table's verdict on a fragment: the twin of the fragment stage's. In
 * `"translucent"` the passes that draw blended ghosts see their sets as
 * keeping what they ghost; in `"opaque"` (the default) a blended ghost's
 * removed side is cut out, and a stippled one keeps the pixels `stipple`
 * (a number from 0 to 1, the dither's value there) is below its alpha at.
 */
export function tableVerdict(
  table: Float32Array,
  space: {
    readonly true: ArrayLike<number>;
    readonly drawn: ArrayLike<number>;
    readonly curved?: number;
  },
  options: { pass?: "opaque" | "translucent"; stipple?: number } = {},
): ClipVerdict {
  const u32 = new Uint32Array(table.buffer, table.byteOffset, table.length);
  const translucentPass = options.pass === "translucent";
  const count = Math.min(u32[0]!, MAX_CLIP_SETS);
  let keeps = true;
  let ghosted = false;
  let alpha = 1;
  let distance = CLIP_NO_DISTANCE;
  let flagsOut = 0;
  let id = CLIP_NO_ID;
  let params: Vec4Like = [0, 0, 0, 0];
  for (let s = 0; s < count; s++) {
    const at = (1 + s) * 4;
    const shapes = Math.min(u32[at + 1]!, MAX_CLIP_SHAPES);
    const flags = u32[at + 2]!;
    if ((flags & CLIP_SET_CURVED) !== 0) {
      if ((space.curved ?? 0) > 0) {
        keeps = false;
      }
      continue;
    }
    const p = (flags & CLIP_SET_DRAWN) !== 0 ? space.drawn : space.true;
    const all = (flags & CLIP_SET_INTERSECTION) !== 0;
    let region = all;
    let r = u32[at]!;
    for (let k = 0; k < shapes; k++) {
      const inside = tableShapeInside(table, u32, r, p);
      if (all ? !inside : inside) {
        region = !all;
        break;
      }
      r += u32[r * 4 + 1]!;
    }
    const kept = (flags & CLIP_SET_KEEP_OUTSIDE) !== 0 ? !region : region;
    const effectRow = flags >>> CLIP_SET_EFFECT_SHIFT;
    if ((flags & CLIP_SET_REPORT) !== 0) {
      // The set with the greatest distance is the one reported.
      let d = all ? -Infinity : Infinity;
      let q = u32[at]!;
      for (let k = 0; k < shapes; k++) {
        const sd = tableShapeDistance(table, u32, q, p);
        d = all ? Math.max(d, sd) : Math.min(d, sd);
        q += u32[q * 4 + 1]!;
      }
      d = (flags & CLIP_SET_KEEP_OUTSIDE) !== 0 ? -d : d;
      if (distance === CLIP_NO_DISTANCE || d > distance) {
        distance = d;
        id = s;
        flagsOut =
          (!kept ? CLIP_FLAG_REMOVED : 0) |
          ((flags & CLIP_SET_GHOST) !== 0 ? CLIP_FLAG_GHOST : 0);
        params = [
          ...table.subarray((effectRow + 2) * 4, (effectRow + 3) * 4),
        ] as unknown as Vec4Like;
      }
    }
    if (kept || (flags & CLIP_SET_SHADE) !== 0) {
      continue;
    }
    if ((flags & CLIP_SET_GHOST) === 0) {
      keeps = false;
      continue;
    }
    const setAlpha = table[(effectRow + 1) * 4]!;
    if ((flags & CLIP_SET_STIPPLE) !== 0) {
      if (translucentPass) {
        continue;
      }
      if ((options.stipple ?? 1) < setAlpha) {
        ghosted = true;
        continue;
      }
      keeps = false;
    } else if (translucentPass) {
      ghosted = true;
      alpha *= setAlpha;
    } else {
      keeps = false;
    }
  }
  return {
    keeps,
    ghosted: keeps && ghosted,
    alpha,
    distance,
    flags: flagsOut,
    id,
    params,
  };
}

/** The shape's signed distance at `p` from the table: the fragment stage's `clipShapeDistance`. */
function tableShapeDistance(
  table: Float32Array,
  u32: Uint32Array,
  r: number,
  p: ArrayLike<number>,
): number {
  const row = (i: number) => table.subarray(i * 4, i * 4 + 4);
  const local = (i: number) => {
    const a = row(r + 1 + i);
    return a[0]! * p[0]! + a[1]! * p[1]! + a[2]! * p[2]! + a[3]!;
  };
  const kind = u32[r * 4]!;
  if (kind === CLIP_PLANE) {
    return local(0);
  }
  if (kind === CLIP_BOX) {
    let d = -Infinity;
    for (let k = 0; k < 3; k++) {
      const a = row(r + 1 + k);
      d = Math.max(
        d,
        (Math.abs(local(k)) - 1) / Math.hypot(a[0]!, a[1]!, a[2]!),
      );
    }
    return d;
  }
  const x = local(0);
  const y = local(1);
  const z = local(2);
  const zr = row(r + 4);
  const n = u32[r * 4 + 2]!;
  const vertex = (i: number): [number, number] => {
    const v = row(r + 5 + (i >> 1));
    return (i & 1) === 0 ? [v[0]!, v[1]!] : [v[2]!, v[3]!];
  };
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    ring.push(vertex(i));
  }
  return Math.max(ringDistance(ring, x, y), zr[0]! - z, z - zr[1]!);
}

// --- pipeline keys: the clipped variant of a surface pipeline -------------------

/** The key of the clipped variant of pipeline `key` (RenderContext `SurfacePipelines`). */
export const clippedKey = <K extends string>(key: K): `${K}Clipped` =>
  `${key}Clipped`;
export const isClipped = (key: string): boolean => key.endsWith("Clipped");
export const unclipped = <K extends string>(key: `${K}Clipped`): K =>
  key.slice(0, -"Clipped".length) as K;

// --- caps: the planes a set's boundary lies on -------------------------------------

/** A plane of a clip set's boundary, in the set's frame, with what limits the cap on it. */
export interface CapPlane {
  /** A point on the plane. */
  readonly point: Vec3Like;
  /** The cap's outward normal: out of what the set keeps. */
  readonly normal: Vec3Like;
  /**
   * Half-spaces the cap is limited to (the other sides of a box, the other
   * planes of the set): a point `p` is kept when `normal · (p − point) ≤ 0`.
   */
  readonly limits: ReadonlyArray<{
    readonly point: Vec3Like;
    readonly normal: Vec3Like;
  }>;
}

/**
 * The planes a set's kept region is bounded by, for caps (plan §13.26, item 5
 * and 6): a set of planes, or of one box. Each plane's cap is the section by it,
 * limited to where it bounds what is kept: with the shapes combined by
 * intersection that is inside the other planes' half-spaces; by union, outside
 * them. A set of polygons or of several boxes has curved or concave
 * boundaries that a plane-by-plane cap cannot say: `unsupported` names why.
 */
export function capPlanes(
  set: ClipSet,
): { readonly planes: CapPlane[] } | { readonly unsupported: string } {
  const shapes = set.shapes;
  type Half = { point: Vec3Like; normal: Vec3Like };
  let halves: Half[];
  let intersection: boolean;
  if (shapes.every((s) => s.kind === "plane")) {
    halves = shapes.map((s) => {
      const p = s as Extract<ClipShape, { kind: "plane" }>;
      return { point: p.point, normal: p.normal };
    });
    intersection = (set.combine ?? "union") === "intersection";
  } else if (shapes.length === 1 && shapes[0]!.kind === "box") {
    const box = shapes[0] as Extract<ClipShape, { kind: "box" }>;
    const axes = box.axes ?? IDENTITY_AXES;
    halves = [];
    for (let k = 0; k < 3; k++) {
      for (const sign of [1, -1]) {
        halves.push({
          point: [
            box.center[0] + sign * box.halfExtents[k]! * axes[k]![0],
            box.center[1] + sign * box.halfExtents[k]! * axes[k]![1],
            box.center[2] + sign * box.halfExtents[k]! * axes[k]![2],
          ],
          normal: [sign * axes[k]![0], sign * axes[k]![1], sign * axes[k]![2]],
        });
      }
    }
    intersection = true;
  } else {
    return {
      unsupported:
        "caps are built for sets of planes, or of one box; this set has polygons or several shapes of other kinds.",
    };
  }
  const outward = set.keep === "outside" ? -1 : 1;
  const planes = halves.map((half, i) => ({
    point: half.point,
    normal: [
      outward * half.normal[0] + 0,
      outward * half.normal[1] + 0,
      outward * half.normal[2] + 0,
    ] as unknown as Vec3Like,
    // The inside of each other half-space where the shapes intersect, its outside where they unite.
    limits:
      halves.length === 1
        ? []
        : halves
            .filter((_, j) => j !== i)
            .map((other) => ({
              point: other.point,
              normal: (intersection
                ? other.normal
                : [
                    0 - other.normal[0],
                    0 - other.normal[1],
                    0 - other.normal[2],
                  ]) as Vec3Like,
            })),
  }));
  return { planes };
}

// --- queries ---------------------------------------------------------------------

/**
 * Which clips a query applies: its view's (picks and snaps), a set or sets
 * of its own, or none (world questions: distance, clearance, line of sight).
 */
export type ClipsOption = "view" | "none" | ClipSet | readonly ClipSet[];

export type { ClipFilter };

/** The sets a `ClipsOption` names, given the view's (`viewSets`) and the default. */
export function clipSetsOf(
  option: ClipsOption | undefined,
  viewSets: readonly ClipSet[] | undefined,
  fallback: "view" | "none",
): readonly ClipSet[] {
  const chosen = option ?? fallback;
  if (chosen === "none") {
    return [];
  }
  if (chosen === "view") {
    return viewSets ?? [];
  }
  return Array.isArray(chosen) ? chosen : [chosen as ClipSet];
}

/**
 * A filter over `sets` for points in `frame` at `seconds`: each point is
 * routed, in float64, into each set's own frame (a rigid route by its
 * matrix; across a warp by the route's forward map) and tested there. A
 * route that crosses a presentation warp is followed: the point is tested
 * where it is drawn, in a set named in a drawn frame. Without a resolver the
 * points are taken to be in the sets' frames. Undefined for no sets.
 */
export function clipFilter(
  sets: readonly ClipSet[],
  options?: {
    readonly resolver: FrameResolver;
    readonly frame: FrameKey;
    readonly seconds: number;
  },
): ClipFilter | undefined {
  if (sets.length === 0) {
    return undefined;
  }
  const tests = sets.map((set) => {
    if (!options || set.frame === options.frame) {
      return (p: ArrayLike<number>) => clipSetKeeps(set, p);
    }
    const route = resolveRoute(
      options.resolver,
      options.frame,
      set.frame,
      options.seconds,
    );
    if (routeIsRigid(route)) {
      const m =
        route.steps[0]!.kind === "rigid" ? route.steps[0]!.matrix : undefined;
      const q = new Float64Array(3);
      return (p: ArrayLike<number>) => {
        const x = p[0]!;
        const y = p[1]!;
        const z = p[2]!;
        q[0] = m![0]! * x + m![4]! * y + m![8]! * z + m![12]!;
        q[1] = m![1]! * x + m![5]! * y + m![9]! * z + m![13]!;
        q[2] = m![2]! * x + m![6]! * y + m![10]! * z + m![14]!;
        return clipSetKeeps(set, q);
      };
    }
    return (p: ArrayLike<number>) => clipSetKeeps(set, routeForward(route, p));
  });
  return { keeps: (point) => tests.every((t) => t(point)) };
}
