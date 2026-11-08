import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type { Rectangle } from "../globe/quantizedMesh.ts";
import type { TransformHandle, World } from "./World.ts";

/**
 * How content's height relates to the ground (1.x `HeightReference`):
 *
 * - `"none"`: as placed.
 * - `"clampToGround"` / `"relativeToGround"`: on (or `height` above) the
 *   highest of the globe and the tilesets with `enableCollision`.
 * - `"clampToTerrain"` / `"relativeToTerrain"`: the globe only.
 * - `"clampTo3DTiles"` / `"relativeTo3DTiles"`: those tilesets only.
 */
export type HeightReference =
  | "none"
  | "clampToGround"
  | "relativeToGround"
  | "clampToTerrain"
  | "relativeToTerrain"
  | "clampTo3DTiles"
  | "relativeTo3DTiles";

export interface ClampOptions {
  heightReference: HeightReference;
  /** Where the content is anchored: radians; `height` is its own height. */
  longitude: number;
  latitude: number;
  height: number;
  /**
   * Meters above the ground for the "relative" references (default: the
   * anchor's own `height`), and added to the "clamp" ones (default 0).
   */
  offset?: number;
}

export interface Clamp {
  readonly options: ClampOptions;
  /** Height of the anchor now (meters above the ellipsoid). */
  readonly height: number;
  /** How far the content moved from where it was placed (Earth-fixed). */
  readonly displacement: Vec3;
  /**
   * The content stands where it will: the ground's most detailed height
   * under the anchor is known and applied. Until then it stays where it
   * was placed (the surfaces loaded first can be kilometers off), also
   * while there is nothing under it to stand on. False again while it
   * settles on changed surfaces (another globe).
   */
  readonly settled: boolean;
  /** Resolves once `settled`. */
  whenSettled(): Promise<void>;
  remove(): void;
}

/** The ground's most detailed heights at places, from these surfaces. */
export type SampleHeights = (
  world: World,
  positions: ReadonlyArray<{ longitude: number; latitude: number }>,
  tilesets: readonly Tileset3D[],
) => Promise<Array<number | undefined>>;

interface Entry extends Clamp {
  world: World;
  transform: TransformHandle;
  /** Where the anchor is now; the transform moves by the difference. */
  current: number;
  /** Settling: its most detailed ground is wanted, requested or applied. */
  phase: "wanted" | "sampling" | "sampled" | "settled";
  /** The most detailed ground found (undefined: none under it). */
  sampled?: number;
  /** The highest exactly known surface under it (the ellipsoid), if any. */
  exact?: number;
  waiters: Array<() => void>;
  /** Highest 3D Tiles surface under the anchor (ray cast), if any. */
  tilesHeight?: number;
  up: Float64Array;
  dirty: boolean;
  /** Needs a 3D Tiles ray cast (new, or the tilesets changed). */
  cast: boolean;
}

const ellipsoid = Ellipsoid.WGS84;
/** 3D Tiles rays start this far above the anchor (1.x: 9000 m, fixed). */
const RAY_START = 10000;
/** ...and reach this far below the ellipsoid. */
const RAY_DEPTH = 12000;
/** Frames between ray casts while collision tilesets change. */
const CAST_INTERVAL = 10;

/**
 * Keeps clamped content on the ground as terrain and tilesets load (1.x
 * `Scene.updateHeight` with its per-surface callbacks), event-driven:
 *
 * - First it settles: the ground's most detailed height under each anchor
 *   is sampled (the tiles there load, whatever the views show; batched per
 *   world) and applied once, so content moves once to where it stands.
 *   1.x clamps to whatever has loaded, starting with the coarsest level
 *   (kilometers off), so content and anything framing it ride every
 *   refinement; 2.0 doesn't move content on those heights.
 * - Terrain announces the rectangles whose heights changed; only content
 *   anchored there is re-clamped, against the drawn surface (1.x
 *   `Globe.getHeight`).
 * - 3D Tiles with `enableCollision` are ray cast on the GPU
 *   (`World.castRays`) down the geodetic normal, against the tiles the
 *   views drew, nearest hit from above (1.x: CPU picking of the first
 *   tile hit along a geocentric ray). Casts are batched for all anchors and
 *   repeat only while those tilesets change.
 * - Ground is the highest of the surfaces the reference allows.
 * - A globe's terrain clips (`Tileset3D.addTerrainClip`) are holes: inside
 *   one the globe gives no ground, so content there stands on collision
 *   tilesets (`clampToGround`, `clampTo3DTiles`), or keeps its height with
 *   only terrain allowed (`clampToTerrain`). Adding or removing a clip
 *   re-clamps the content under it.
 *
 * Content moves along the local vertical only, as 1.x models do: its root
 * transform (Earth-fixed, without a parent, e.g. `ModelPlacement.transform`)
 * is translated, so everything placed by it follows.
 */
export class HeightClamping {
  private readonly entries = new Set<Entry>();
  private readonly listening = new WeakSet<Tileset3D>();
  /** Tilesets and their show/collision state at the last update. */
  private surfaces = "";
  /** Change frames of the collision tilesets at the last cast. */
  private castSignature = "";
  private casting = false;
  private frame = 0;
  private lastCast = -CAST_INTERVAL;

  constructor(
    private readonly tilesets: () => readonly Tileset3D[],
    /** View bits of the enabled views of a world (what they draw). */
    private readonly viewMask: (world: World) => number,
    /** Most detailed ground heights (`Engine.sampleHeightMostDetailed`). */
    private readonly sample: SampleHeights,
    /**
     * Wakes the engine's frame loop (it sleeps on demand once nothing
     * changes): new content to clamp, and heights that arrived.
     */
    private readonly wake: () => void = () => {},
  ) {}

  /**
   * Work waits for a later `update`: re-clamps not yet applied, or a cast
   * held back by `CAST_INTERVAL` while collision tilesets changed. The
   * engine's loop keeps ticking meanwhile; what arrives asynchronously
   * (samples, casts) wakes it.
   */
  get busy(): boolean {
    if (this.entries.size === 0) {
      return false;
    }
    for (const e of this.entries) {
      if (e.dirty) {
        return true;
      }
    }
    if (this.casting) {
      return false; // its end wakes the loop
    }
    const colliders = this.tilesets().filter(
      (t) => t.show && t.enableCollision,
    );
    if (colliders.length === 0) {
      return false;
    }
    const changed =
      colliders.map((t) => t.changedAt).join("|") !== this.castSignature;
    for (const e of this.entries) {
      if (
        usesTiles(e.options.heightReference) &&
        (e.cast || changed) &&
        colliders.some((t) => t.world === e.world)
      ) {
        return true;
      }
    }
    return false;
  }

  /** Clamps what `transform` places (e.g. a model) per `options`. */
  add(world: World, transform: TransformHandle, options: ClampOptions): Clamp {
    const carto = {
      longitude: options.longitude,
      latitude: options.latitude,
      height: 0,
    };
    const none = options.heightReference === "none";
    const entry: Entry = {
      options,
      world,
      transform,
      current: options.height,
      phase: none ? "settled" : "wanted",
      waiters: [],
      up: ellipsoid.geodeticSurfaceNormalCartographic(carto, v3.vec3()),
      dirty: true,
      cast: usesTiles(options.heightReference),
      get height() {
        return this.current;
      },
      get displacement() {
        return v3.scale(v3.vec3(), this.up, this.current - options.height);
      },
      get settled() {
        return this.phase === "settled";
      },
      whenSettled() {
        return this.phase === "settled"
          ? Promise.resolve()
          : new Promise<void>((resolve) => this.waiters.push(resolve));
      },
      remove: () => {
        this.entries.delete(entry);
        settle(entry);
      },
    };
    this.entries.add(entry);
    this.wake();
    return entry;
  }

  /** Re-clamps what changed; once per frame, after tilesets update. */
  update(): void {
    this.frame++;
    if (this.entries.size === 0) {
      return;
    }
    const tilesets = this.tilesets();
    for (const tileset of tilesets) {
      if (!this.listening.has(tileset)) {
        this.listening.add(tileset);
        tileset.onHeightsChanged((r) => this.heightsChanged(tileset, r));
      }
    }
    // A surface came, went, showed, hid or changed collision: everything
    // re-clamps, and tile heights are cast again from scratch.
    const surfaces = tilesets
      .map(
        (t) =>
          `${t.world.id}:${t.url}:${t.show ? 1 : 0}${t.enableCollision ? 1 : 0}`,
      )
      .join("|");
    if (surfaces !== this.surfaces) {
      this.surfaces = surfaces;
      for (const e of this.entries) {
        e.dirty = true;
        e.tilesHeight = undefined;
        e.cast = usesTiles(e.options.heightReference);
        // Settles again on the new surfaces.
        if (e.options.heightReference !== "none" && e.phase !== "sampling") {
          e.phase = "wanted";
        }
      }
    }
    this.sampleWanted(tilesets);
    this.castTiles(tilesets);
    for (const entry of this.entries) {
      if (entry.dirty) {
        entry.dirty = false;
        this.clamp(entry);
      }
    }
  }

  /**
   * Samples the most detailed ground under the anchors that want it, one
   * request per world and set of surfaces. With no surface to stand on yet
   * (the globe still coming), content waits, unsettled.
   */
  private sampleWanted(tilesets: readonly Tileset3D[]): void {
    const groups = new Map<
      string,
      { world: World; surfaces: Tileset3D[]; entries: Entry[] }
    >();
    for (const e of this.entries) {
      if (e.phase !== "wanted") {
        continue;
      }
      const reference = e.options.heightReference;
      const { longitude, latitude } = e.options;
      const allowed = tilesets.filter(
        (t) =>
          t.world === e.world &&
          t.show &&
          (t.terrain
            ? !/3DTiles/.test(reference)
            : t.enableCollision && usesTiles(reference)),
      );
      // A globe clipped here (`addTerrainClip`) has no ground to give.
      const surfaces = allowed.filter(
        (t) => !t.terrain || !t.terrainClipped(longitude, latitude),
      );
      if (surfaces.length === 0) {
        if (allowed.length > 0) {
          // Only clipped terrain: it settles where it is.
          e.exact = e.sampled = undefined;
          e.phase = "sampled";
          e.dirty = true;
        }
        continue; // nothing to stand on yet: waits for a surface
      }
      // Surfaces whose height is known exactly (the ellipsoid) answer at
      // once; sampling them would load ever finer tiles that never end.
      const exact = surfaces
        .map((t) => t.exactHeight(longitude, latitude))
        .filter((h): h is number => h !== undefined);
      const sampled = surfaces.filter(
        (t) => t.exactHeight(longitude, latitude) === undefined,
      );
      e.exact = exact.length > 0 ? Math.max(...exact) : undefined;
      if (sampled.length === 0) {
        e.sampled = e.exact;
        e.phase = "sampled";
        e.dirty = true;
        continue;
      }
      const key = `${e.world.id}|${sampled.map((t) => t.url).join("|")}`;
      const group = groups.get(key) ?? {
        world: e.world,
        surfaces: sampled,
        entries: [],
      };
      group.entries.push(e);
      groups.set(key, group);
    }
    for (const { world, surfaces, entries } of groups.values()) {
      for (const e of entries) {
        e.phase = "sampling";
      }
      void this.sample(
        world,
        entries.map((e) => e.options),
        surfaces,
      )
        .catch(() => entries.map(() => undefined))
        .then((heights) => {
          entries.forEach((e, i) => {
            if (this.entries.has(e) && e.phase === "sampling") {
              const h = heights[i];
              e.sampled =
                h === undefined
                  ? e.exact
                  : e.exact === undefined
                    ? h
                    : Math.max(h, e.exact);
              e.phase = "sampled";
              e.dirty = true;
            }
          });
          this.wake();
        });
    }
  }

  private heightsChanged(tileset: Tileset3D, r: Rectangle): void {
    for (const e of this.entries) {
      const { longitude, latitude } = e.options;
      if (
        e.world === tileset.world &&
        longitude >= r.west &&
        longitude <= r.east &&
        latitude >= r.south &&
        latitude <= r.north
      ) {
        e.dirty = true;
      }
    }
  }

  /**
   * Ray casts for the anchors that use 3D Tiles: when new, and again
   * (every `CAST_INTERVAL` frames at most) while collision tilesets change
   * what they draw. One cast per world covers all of its anchors.
   */
  private castTiles(tilesets: readonly Tileset3D[]): void {
    if (this.casting || this.frame - this.lastCast < CAST_INTERVAL) {
      return;
    }
    const colliders = tilesets.filter((t) => t.show && t.enableCollision);
    const signature = colliders.map((t) => t.changedAt).join("|");
    const changed = signature !== this.castSignature;
    const byWorld = new Map<World, Entry[]>();
    for (const e of this.entries) {
      if (!usesTiles(e.options.heightReference)) {
        continue;
      }
      if ((e.cast || changed) && colliders.some((t) => t.world === e.world)) {
        e.cast = false;
        const list = byWorld.get(e.world) ?? [];
        list.push(e);
        byWorld.set(e.world, list);
      }
    }
    this.castSignature = signature;
    if (byWorld.size === 0) {
      return;
    }
    this.casting = true;
    this.lastCast = this.frame;
    const casts = [...byWorld].map(async ([world, entries]) => {
      const starts = entries.map((e) => Math.max(e.current, 0) + RAY_START);
      const rays = entries.map((e, i) => ({
        origin: ellipsoid.cartographicToCartesian(
          {
            longitude: e.options.longitude,
            latitude: e.options.latitude,
            height: starts[i]!,
          },
          v3.vec3(),
        ),
        direction: v3.negate(v3.vec3(), e.up),
        maxDistance: starts[i]! + RAY_DEPTH,
      }));
      const hits = await world.castRays(rays, {
        collisionOnly: true,
        viewMask: this.viewMask(world),
      });
      entries.forEach((e, i) => {
        const hit = hits[i];
        // Down the geodetic normal the height falls by the distance. No
        // hit keeps the last height (the tiles under it may be culled).
        if (hit !== undefined && this.entries.has(e)) {
          const height = starts[i]! - hit;
          if (e.tilesHeight !== height) {
            e.tilesHeight = height;
            e.dirty = true;
          }
        }
      });
    });
    void Promise.all(casts)
      .catch(() => {
        // A lost device or destroyed world: the next change casts again.
      })
      .finally(() => {
        this.casting = false;
        this.wake();
      });
  }

  private clamp(e: Entry): void {
    const reference = e.options.heightReference;
    if (reference === "none") {
      return;
    }
    // Settling: stays where it was placed until the most detailed ground
    // is known, then moves there once.
    if (e.phase === "wanted" || e.phase === "sampling") {
      return;
    }
    if (e.phase === "sampled") {
      e.phase = "settled";
      if (e.sampled !== undefined) {
        this.moveTo(e, e.sampled);
      }
      settle(e);
      return;
    }
    const { longitude, latitude } = e.options;
    let ground: number | undefined;
    if (!/3DTiles/.test(reference)) {
      // The globe: its drawn surface (1.x Globe.getHeight).
      for (const t of this.tilesets()) {
        if (t.world === e.world && t.show) {
          const h = t.surfaceHeight(longitude, latitude);
          if (h !== undefined) {
            ground = Math.max(ground ?? -Infinity, h);
          }
        }
      }
    }
    if (!/Terrain/.test(reference) && e.tilesHeight !== undefined) {
      ground = Math.max(ground ?? -Infinity, e.tilesHeight);
    }
    if (ground === undefined) {
      return; // nothing loaded there yet
    }
    this.moveTo(e, ground);
  }

  /** Moves the content to stand on (or above) the ground at this height. */
  private moveTo(e: Entry, ground: number): void {
    const relative = e.options.heightReference.startsWith("relative");
    const target =
      ground + (e.options.offset ?? (relative ? e.options.height : 0));
    const delta = target - e.current;
    if (Math.abs(delta) < 1e-4) {
      return;
    }
    if (!e.world.transformAlive(e.transform)) {
      this.entries.delete(e);
      return;
    }
    const m = e.world.localMatrix(e.transform);
    m[12] = m[12]! + e.up[0]! * delta;
    m[13] = m[13]! + e.up[1]! * delta;
    m[14] = m[14]! + e.up[2]! * delta;
    e.world.setTransform(e.transform, m);
    e.current = target;
  }
}

/** Resolves whoever waits for the entry to settle. */
function settle(e: Entry): void {
  for (const resolve of e.waiters.splice(0)) {
    resolve();
  }
}

function usesTiles(reference: HeightReference): boolean {
  return /Ground|3DTiles/.test(reference);
}
