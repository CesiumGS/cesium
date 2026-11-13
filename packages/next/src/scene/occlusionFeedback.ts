// One view's occlusion feedback, on the scene side (plan Task 12, fix 7).
// Selection asks about tile boxes while it walks (`ViewOcclusion.query`); the
// rasterizer tests them against the view's depth pyramid the same tick
// (render/view/occlusionPass.ts) and reads one bit a query back a tick or two
// later; `apply` then counts, per tile and view, the results in a row that
// found it hidden (`TileViewState.occludedTicks`), which selection reads.
//
// Lists are pooled with the GPU buffers that answer them: while every list is
// in flight, a tick asks nothing, and what was known stays known.
import {
  MAX_QUERIES,
  OCCLUDED_TICKS,
  QUERY_FLOATS,
  RESULT_MAX_AGE,
  type ViewOcclusion,
} from "../streaming/occlusion.ts";
import type { Tile, TileViewState } from "../streaming/Tile.ts";
import { volumeObb, type TileVolume } from "../streaming/volumes.ts";
import type { Vec3 } from "../math/vec3.ts";

export { MAX_QUERIES, QUERY_FLOATS };

/** Lists in the pool: one being built, others awaiting their readbacks. */
export const LISTS_PER_VIEW = 3;

/** The camera a box is made relative to: a view's, in a tileset's coordinates. */
export interface OcclusionCamera {
  position: ArrayLike<number>;
  right: ArrayLike<number>;
  up: ArrayLike<number>;
  direction: ArrayLike<number>;
}

/**
 * One tick's boxes for a view: each a centre and three half-axes in camera
 * space (x right, y up, z forward), relative to the eye (made in float64,
 * stored in float32), with the tile its result is for.
 */
export class OcclusionQueries {
  /** `QUERY_FLOATS` a query. */
  readonly data = new Float32Array(MAX_QUERIES * QUERY_FLOATS);
  readonly tiles: Array<Tile | undefined> = new Array<Tile | undefined>(
    MAX_QUERIES,
  );
  count = 0;
  /** The feedback's tick it was made in, and the camera cut count then. */
  tick = 0;
  epoch = 0;
  /** The body camera it was made for (float64): the pass runs only for the same one. */
  readonly position = new Float64Array(3);
  readonly direction = new Float64Array(3);
  /** The list's place in the pool: the rasterizer's buffers go by it. */
  constructor(readonly index: number) {}
  /** Its results are awaited from the GPU: not for reuse. */
  inFlight = false;

  /**
   * Adds a box: `volume`'s oriented box, or for a sphere the cube around it
   * (in camera space, so axis-aligned there), seen from `camera`. False when
   * the list is full.
   */
  add(tile: Tile, volume: TileVolume, camera: OcclusionCamera): boolean {
    if (this.count >= MAX_QUERIES) {
      return false;
    }
    const out = this.data;
    const at = this.count * QUERY_FLOATS;
    const p = camera.position;
    const box = volumeObb(volume);
    const centre = box ? box.center : volume.sphere.center;
    const dx = centre[0]! - p[0]!;
    const dy = centre[1]! - p[1]!;
    const dz = centre[2]! - p[2]!;
    const r = camera.right;
    const u = camera.up;
    const f = camera.direction;
    out[at] = dx * r[0]! + dy * r[1]! + dz * r[2]!;
    out[at + 1] = dx * u[0]! + dy * u[1]! + dz * u[2]!;
    out[at + 2] = dx * f[0]! + dy * f[1]! + dz * f[2]!;
    if (box) {
      const h = box.halfAxes;
      for (let k = 0; k < 3; k++) {
        const x = h[k * 3]!;
        const y = h[k * 3 + 1]!;
        const z = h[k * 3 + 2]!;
        out[at + 3 + k * 3] = x * r[0]! + y * r[1]! + z * r[2]!;
        out[at + 4 + k * 3] = x * u[0]! + y * u[1]! + z * u[2]!;
        out[at + 5 + k * 3] = x * f[0]! + y * f[1]! + z * f[2]!;
      }
    } else {
      const radius = volume.sphere.radius;
      out.fill(0, at + 3, at + 12);
      out[at + 3] = radius;
      out[at + 7] = radius;
      out[at + 11] = radius;
    }
    this.tiles[this.count++] = tile;
    return true;
  }

  clear(): void {
    this.tiles.fill(undefined, 0, this.count);
    this.count = 0;
  }
}

/** A camera jump: the direction turned this far (radians), or it moved this far (m). */
const CUT_ANGLE = 0.5;
const CUT_MIN_DISTANCE = 50;
const CUT_RELATIVE_DISTANCE = 0.25;

/** A view's occlusion feedback: its lists, its tick, its camera cuts. */
export class OcclusionFeedback {
  /** Counts `begin`s: the age of a result. */
  tick = 0;
  /** Counts camera cuts: a result of an older one is dropped. */
  epoch = 0;
  /** The list this tick's selection adds to, if the pool had one. */
  current: OcclusionQueries | undefined;
  readonly lists: OcclusionQueries[] = [];
  /** Ticks asked about and ticks dropped for want of a free list (stats). */
  asked = 0;
  dropped = 0;
  private lastPosition: Float64Array | undefined;
  private lastDirection: Float64Array | undefined;

  constructor() {
    for (let i = 0; i < LISTS_PER_VIEW; i++) {
      this.lists.push(new OcclusionQueries(i));
    }
  }

  /**
   * Starts a tick's selection: with the body camera (to tell a cut from
   * motion, and what the lists are valid for) and its height above the
   * ground model, m.
   */
  begin(position: Vec3, direction: Vec3, height: number): void {
    this.tick++;
    const last = this.lastPosition;
    if (last && this.lastDirection) {
      const moved = Math.hypot(
        position[0]! - last[0]!,
        position[1]! - last[1]!,
        position[2]! - last[2]!,
      );
      const dot =
        direction[0]! * this.lastDirection[0]! +
        direction[1]! * this.lastDirection[1]! +
        direction[2]! * this.lastDirection[2]!;
      const turned = Math.acos(Math.min(1, Math.max(-1, dot)));
      if (
        turned > CUT_ANGLE ||
        moved > Math.max(CUT_MIN_DISTANCE, CUT_RELATIVE_DISTANCE * height)
      ) {
        // What was found from somewhere else tells nothing about here.
        this.epoch++;
      }
    } else {
      this.lastPosition = new Float64Array(3);
      this.lastDirection = new Float64Array(3);
    }
    this.lastPosition!.set(position);
    this.lastDirection!.set(direction);
    // A list built and never used (no render) is reused.
    const list =
      this.current ?? this.lists.find((l) => !l.inFlight && l !== this.current);
    this.current = list;
    this.asked++;
    if (!list) {
      this.dropped++;
      return;
    }
    list.clear();
    list.tick = this.tick;
    list.epoch = this.epoch;
    list.position.set(position);
    list.direction.set(direction);
  }

  /** What selection sees, for a tileset under a camera of its coordinates. */
  forCamera(camera: OcclusionCamera): ViewOcclusion {
    return {
      query: (tile, volume) => {
        this.current?.add(tile, volume, camera);
      },
      occluded: (state) => this.occluded(state),
    };
  }

  /** Whether the tile was hidden `OCCLUDED_TICKS` results in a row, lately. */
  occluded(state: TileViewState): boolean {
    return (
      state.occlusionEpoch === this.epoch &&
      state.occludedTicks >= OCCLUDED_TICKS &&
      this.tick - state.occludedAt <= RESULT_MAX_AGE
    );
  }

  /**
   * A list's results arrived: `bits` has one bit a query, set where the box
   * was hidden, for the view with this id. A result from before a camera cut
   * is dropped.
   */
  apply(list: OcclusionQueries, bits: Uint32Array, id: number): void {
    if (list.epoch === this.epoch) {
      for (let i = 0; i < list.count; i++) {
        const tile = list.tiles[i];
        if (!tile) {
          continue;
        }
        const state = tile.viewState(id);
        if (state.occlusionEpoch !== this.epoch) {
          state.occlusionEpoch = this.epoch;
          state.occludedTicks = 0;
        }
        state.occludedAt = Math.max(state.occludedAt, list.tick);
        const hidden = ((bits[i >> 5]! >>> (i & 31)) & 1) === 1;
        state.occludedTicks = hidden ? state.occludedTicks + 1 : 0;
      }
    }
    list.clear();
    list.inFlight = false;
  }

  /** The tick's list goes to the GPU: it isn't reused until `apply` or `release`. */
  take(): OcclusionQueries | undefined {
    const list = this.current;
    if (list) {
      list.inFlight = true;
      this.current = undefined;
    }
    return list;
  }

  /** A list whose results won't come (its buffers were destroyed). */
  release(list: OcclusionQueries): void {
    list.clear();
    list.inFlight = false;
  }
}
