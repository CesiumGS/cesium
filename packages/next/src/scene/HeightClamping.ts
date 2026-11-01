import * as v3 from "../math/vec3.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
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
  remove(): void;
}

interface Entry extends Clamp {
  world: World;
  transform: TransformHandle;
  /** Where the anchor is now; the transform moves by the difference. */
  current: number;
  /** Highest 3D Tiles surface under the anchor (GPU probe), if any. */
  tilesHeight?: number;
  up: Float64Array;
  dirty: boolean;
}

const ellipsoid = Ellipsoid.WGS84;

/**
 * Keeps clamped content on the ground as terrain and tilesets load (1.x
 * `Scene.updateHeight` with its per-surface callbacks): terrain announces
 * the rectangles whose heights changed and only content anchored there is
 * re-clamped, instead of re-querying every frame. Content moves along the
 * local vertical only, as 1.x models do: its root transform (an Earth-fixed
 * transform without a parent, e.g. `ModelInstance.transform`) is
 * translated, so everything placed by it follows.
 */
export class HeightClamping {
  private readonly entries = new Set<Entry>();
  private readonly listening = new WeakSet<Tileset3D>();

  constructor(private readonly tilesets: () => readonly Tileset3D[]) {}

  /** Clamps what `transform` places (e.g. a model) per `options`. */
  add(world: World, transform: TransformHandle, options: ClampOptions): Clamp {
    const carto = {
      longitude: options.longitude,
      latitude: options.latitude,
      height: 0,
    };
    const entry: Entry = {
      options,
      world,
      transform,
      current: options.height,
      up: ellipsoid.geodeticSurfaceNormalCartographic(carto, v3.vec3()),
      dirty: true,
      get height() {
        return this.current;
      },
      remove: () => {
        this.entries.delete(entry);
      },
    };
    this.entries.add(entry);
    return entry;
  }

  /** The 3D Tiles height under an entry arrived (GPU probe). */
  setTilesHeight(clamp: Clamp, height: number | undefined): void {
    const entry = clamp as Entry;
    if (entry.tilesHeight !== height) {
      entry.tilesHeight = height;
      entry.dirty = true;
    }
  }

  /** Entries that use 3D Tiles surfaces (for the probes). */
  tileClamps(): Clamp[] {
    return [...this.entries].filter((e) =>
      /Ground|3DTiles/.test(e.options.heightReference),
    );
  }

  /** Re-clamps what changed; once per frame. */
  update(): void {
    if (this.entries.size === 0) {
      return;
    }
    for (const tileset of this.tilesets()) {
      if (!this.listening.has(tileset)) {
        this.listening.add(tileset);
        tileset.onHeightsChanged((r) => {
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
        });
      }
    }
    for (const entry of this.entries) {
      if (entry.dirty) {
        entry.dirty = false;
        this.clamp(entry);
      }
    }
  }

  private clamp(e: Entry): void {
    const reference = e.options.heightReference;
    if (reference === "none") {
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
    const relative = reference.startsWith("relative");
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
