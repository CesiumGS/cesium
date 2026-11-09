/**
 * The globe: a tileset of terrain or of the ellipsoid
 * (`Engine.addTerrain`, `Engine.addEllipsoid`). It is a `Tileset3D` with
 * `terrain`, where the regions of its terrain live (`GlobeTerrain`). A
 * 3D Tiles tileset has no `terrain`: asking it for one is a compile error.
 *
 * The regions' shapes, limits and per-fragment test are in terrainClip.ts;
 * this file is their API, and how a region's opacity, `ground` and
 * `pickThrough` reach the tiles, the queries and the picks.
 *
 * A region's opacity is a number from 0 to 1 that can change at any time
 * without compiling its shape again: a change writes one row of the
 * world's directory. Only crossing 0 or 1 touches the tiles, once, as
 * the region joins or leaves what they test (`Tileset3D.regionsChanged`):
 * at 1 no tile tests it and none draws blended for it, so an idle region
 * costs its slot and blocks only, and nothing a tick.
 */
import type { Engine } from "../scene/Engine.ts";
import type { World } from "../scene/World.ts";
import type { DrawHandle } from "../scene/world/types.ts";
import { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  type TileSource,
  type TilesetOptions,
} from "../streaming/tilesetTypes.ts";
import {
  TerrainRegionError,
  compileTerrainClip,
  packClipShape,
  type ClipEntry,
  type TerrainClips,
  type TerrainRegionShape,
} from "./terrainClip.ts";
import {
  castTerrainRay,
  TERRAIN_BAND,
  type TerrainRayTarget,
} from "./terrainRay.ts";

/** What `GlobeTerrain.addRegion` takes besides the shape. */
export interface TerrainRegionOptions {
  /**
   * How much of the terrain inside shows, 0 to 1 (both included). 0, the
   * default, doesn't draw it: a cut, where content placed there shows
   * instead. Between, the terrain is drawn blended, so what lies under
   * the ground there (a tunnel, a culvert) shows through it in place. 1
   * changes nothing while the region stays in place.
   */
  opacity?: number;
  /**
   * Whether the terrain inside counts as ground for `sampleHeight`,
   * `surfaceHeight` and `exactHeight`, terrain rays and lines of sight,
   * and height clamping. Default true, unless the region is added with
   * `opacity` 0, then false. Setting `opacity` later never changes it:
   * `{ opacity: 0, ground: true }` is invisible ground that things still
   * stand on.
   */
  ground?: boolean;
  /**
   * Picks go through the ground inside to what shows through, where it
   * isn't drawn fully opaque. Default false: picks stop at it, as at
   * opaque terrain. A region with `ground` false is a hole for picks
   * wherever its terrain is not drawn opaque; at opacity 1, or drawn
   * opaque from 0.999, a pick hits the drawn terrain.
   */
  pickThrough?: boolean;
}

/**
 * A region of a globe's terrain, from `GlobeTerrain.addRegion`. Where
 * regions overlap, the least opacity wins.
 */
export interface TerrainRegion {
  /** The shape as it was given, or "everywhere". */
  readonly shape: TerrainRegionShape | "everywhere";
  /**
   * 0 to 1, both included; set it at any time. A value outside that range
   * throws a RangeError. Setting it costs one small write, with no
   * recompile, so a fade can set it every tick. Crossing 0 or 1 does more,
   * once: it tests the tiles under the region again, and can make a
   * blended twin of their material. A whole-globe region ("everywhere")
   * also takes one of the world's region slots while its opacity is below
   * 1, so raising it to 1 frees the slot, and lowering it again can throw
   * a `TerrainRegionError` when none is free.
   */
  opacity: number;
  /**
   * Whether the terrain inside counts as ground for queries. Fixed by
   * `addRegion` unless set here: a change tells height listeners.
   */
  ground: boolean;
  /** Picks go through the ground inside (`TerrainRegionOptions`). */
  pickThrough: boolean;
  /** True once `remove` ran, or the globe was destroyed. */
  readonly removed: boolean;
  /** Draws the terrain inside as if there were no region. Idempotent. */
  remove(): void;
}

/** The globe's terrain: the regions that change how it draws. */
export class GlobeTerrain {
  /** @internal Use `Globe.terrain`. */
  constructor(private readonly globe: Globe) {}

  /**
   * Adds a region: a rectangle or a simple polygon (geodetic degrees on the
   * globe's body), or "everywhere" for the whole globe. With the default
   * options, a cut: the terrain inside isn't drawn and isn't ground.
   *
   * Throws a `TerrainRegionError`, saying why and what to change, for a
   * shape it can't take: not a simple polygon; reaching within 5° of a
   * pole, or going round one; spanning more than 10° from its middle; more
   * than 1,024 vertices (`MAX_TERRAIN_CLIP_VERTICES`); edges crowded
   * together (more than 32 in one cell of its grid); with the regions it
   * overlaps, more than 128 edges for a fragment to test
   * (`MAX_CLIP_FRAGMENT_EDGES`); past the blocks the world sets aside for
   * regions (`WorldOptions.maxClipBlocks`); or past 32 regions in the world
   * (`MAX_TERRAIN_CLIPS`; "everywhere" takes a slot only while its opacity
   * is below 1). Throws a RangeError for an `opacity` outside 0 to 1, and
   * an Error on a destroyed globe.
   *
   * Edges are exact per pixel. The terrain a region draws below full
   * opacity is a blended surface like any other, ordered with the rest by
   * the view's `translucencyMethod` and tested against the opaque depth per
   * sample, so content under it shows at its true depth and still hides
   * what lies behind it. Its tile skirts are hidden where its opacity is below
   * 0.999. Where regions overlap, the least opacity wins. From 0.999
   * down the terrain draws blended: it casts no shadow, takes no ambient
   * occlusion and writes no depth, which a fade shows as a step in
   * lighting at that opacity.
   *
   * Queries follow `ground`. A region that isn't ground is a hole, as it is
   * on screen: picks (`View.pick`) hit what shows through;
   * `terrainRayTarget` rays (`terrainLineOfSight`) pass through it;
   * `sampleHeight`, `surfaceHeight` and `exactHeight` are undefined there,
   * and so is the terrain's part of `Engine.sampleHeightMostDetailed`.
   * Height clamping follows: content clamped inside it stands on the
   * tilesets with collision there (`clampToGround`, `clampTo3DTiles`); with
   * only terrain to stand on (`clampToTerrain`) it keeps the height it has.
   * Ground answers all of them as if there were no region, drawn or not.
   * Picks (`View.pick`, `pickPosition`, `pickPoint`) stop at ground that
   * isn't fully opaque, as at opaque terrain, unless `pickThrough`: then
   * they go on to what shows through it. A pick that may stop at it costs
   * one exact CPU ray through the terrain (`terrainRayTarget`), over the
   * region's reach only, in the tick it reads. At opacity 1 the terrain is
   * drawn, so a pick lands on it whatever `ground` is. GPU ray casts
   * (`World.castRays`) don't see regions: a terrain with `enableCollision`
   * is still hit there by them.
   *
   * Costs nothing without regions, or with every region at opacity 1: only
   * a region below 1 is tested, by the tiles it touches, per fragment, and
   * only against the few edges of their place in its grid, so a long
   * corridor strip costs only where it runs. Wakes the frame loop.
   *
   * Regions are geodetic on the Earth, evaluated in the globe's anchor
   * (`Tileset3D.anchor`, the Earth's): a view's camera there (its body
   * camera) is what the shader compares fragments with, so regions stay put
   * wherever a view's render space places the Earth.
   */
  addRegion(
    shape: TerrainRegionShape | "everywhere",
    options: TerrainRegionOptions = {},
  ): TerrainRegion {
    const globe = this.globe;
    if (globe.isDestroyed()) {
      throw new Error(
        "Globe.terrain.addRegion: the globe was destroyed; add regions to the globe that replaced it.",
      );
    }
    const opacity = options.opacity ?? 0;
    checkOpacity(opacity, "Globe.terrain.addRegion");
    const clips = globe.clips;
    const everywhere = shape === "everywhere";
    if (typeof shape === "string" && !everywhere) {
      throw new TerrainRegionError(
        `the shape "${shape}" isn't one: give a rectangle or a polygon, or "everywhere".`,
      );
    }
    const compiled = everywhere
      ? undefined
      : compileTerrainClip(shape, clips.ellipsoid);
    if (compiled) {
      clips.checkBudget(compiled);
    }
    // The whole globe holds a slot only while it changes how terrain draws.
    const ground = options.ground ?? opacity > 0;
    const slot =
      compiled || opacity < 1
        ? globe.world.addTerrainClipRegion(
            compiled ? packClipShape(compiled) : new Float32Array(0),
            opacity,
            ground,
          )
        : -1;
    const handle = new RegionHandle(
      everywhere ? "everywhere" : frozenShape(shape),
      this,
    );
    const entry: ClipEntry = {
      clip: handle,
      shape: compiled,
      slot,
      opacity,
      ground,
      pickThrough: options.pickThrough === true,
    };
    handle.entry = entry;
    clips.add(entry);
    globe.regionsChanged(
      opacity < 1 ? clips.boundsOf(entry) : [],
      entry.ground ? [] : clips.boundsOf(entry),
    );
    return handle;
  }

  /** The regions in effect, oldest first. */
  get regions(): readonly TerrainRegion[] {
    return this.globe.clips.entries.map((e) => e.clip as TerrainRegion);
  }

  /** @internal */
  entryOf(handle: RegionHandle): ClipEntry | undefined {
    return this.globe.clips.entries.find((e) => e.clip === handle);
  }

  /** @internal `TerrainRegion.opacity`. */
  setOpacity(handle: RegionHandle, opacity: number): void {
    checkOpacity(opacity, "TerrainRegion.opacity");
    const entry = this.entryOf(handle);
    if (!entry || this.globe.isDestroyed() || entry.opacity === opacity) {
      return;
    }
    const globe = this.globe;
    const clips = globe.clips;
    const before = entry.opacity;
    if (!entry.shape) {
      // The whole globe holds a slot only below 1.
      if (before === 1) {
        entry.slot = globe.world.addTerrainClipRegion(
          new Float32Array(0),
          opacity,
          entry.ground,
        );
      } else if (opacity === 1) {
        globe.world.removeTerrainClipRegion(entry.slot);
        entry.slot = -1;
      } else {
        globe.world.setTerrainClipOpacity(entry.slot, opacity);
      }
    } else {
      globe.world.setTerrainClipOpacity(entry.slot, opacity);
    }
    entry.opacity = opacity;
    clips.version++;
    // Tiles change only where a region joins or leaves the opaque path
    // (0) or what they test (1); anywhere else it is the one row.
    if (
      (before === 0) !== (opacity === 0) ||
      (before === 1) !== (opacity === 1)
    ) {
      globe.regionsChanged(clips.boundsOf(entry), []);
    } else {
      globe.touched();
    }
  }

  /** @internal `TerrainRegion.ground`. */
  setGround(handle: RegionHandle, ground: boolean): void {
    const entry = this.entryOf(handle);
    if (!entry || this.globe.isDestroyed() || entry.ground === ground) {
      return;
    }
    entry.ground = ground;
    if (entry.slot >= 0) {
      this.globe.world.setTerrainClipGround(entry.slot, ground);
    }
    this.globe.clips.version++;
    this.globe.regionsChanged([], this.globe.clips.boundsOf(entry));
  }

  /** @internal `TerrainRegion.pickThrough`. */
  setPickThrough(handle: RegionHandle, pickThrough: boolean): void {
    const entry = this.entryOf(handle);
    if (
      !entry ||
      this.globe.isDestroyed() ||
      entry.pickThrough === pickThrough
    ) {
      return;
    }
    entry.pickThrough = pickThrough;
    this.globe.clips.version++;
    this.globe.touched();
  }

  /** @internal `TerrainRegion.remove`. */
  remove(handle: RegionHandle): void {
    const clips = this.globe.clips;
    const entry = clips.remove(handle);
    if (!entry) {
      return;
    }
    if (entry.slot >= 0) {
      this.globe.world.removeTerrainClipRegion(entry.slot);
    }
    this.globe.regionsChanged(
      entry.opacity < 1 ? clips.boundsOf(entry) : [],
      entry.ground ? [] : clips.boundsOf(entry),
    );
  }
}

/** A region's handle: its values live in the region's entry. */
class RegionHandle implements TerrainRegion {
  /** Set by `addRegion`, right after. */
  entry!: ClipEntry;

  constructor(
    readonly shape: TerrainRegionShape | "everywhere",
    private readonly owner: GlobeTerrain,
  ) {}

  get opacity(): number {
    return this.entry.opacity;
  }
  set opacity(value: number) {
    this.owner.setOpacity(this, value);
  }
  get ground(): boolean {
    return this.entry.ground;
  }
  set ground(value: boolean) {
    this.owner.setGround(this, value);
  }
  get pickThrough(): boolean {
    return this.entry.pickThrough;
  }
  set pickThrough(value: boolean) {
    this.owner.setPickThrough(this, value);
  }
  get removed(): boolean {
    return this.owner.entryOf(this) === undefined;
  }
  remove(): void {
    this.owner.remove(this);
  }
}

function checkOpacity(opacity: number, who: string): void {
  if (!(Number.isFinite(opacity) && opacity >= 0 && opacity <= 1)) {
    throw new RangeError(`${who}: opacity must be from 0 to 1, got ${opacity}`);
  }
}

/** A frozen copy of a region's shape, as its handle keeps it. */
function frozenShape(shape: TerrainRegionShape): TerrainRegionShape {
  if (shape.rectangle) {
    const { west, south, east, north } = shape.rectangle;
    return Object.freeze({
      rectangle: Object.freeze({ west, south, east, north }),
    });
  }
  return Object.freeze({
    polygon: Object.freeze(
      shape.polygon.map(({ longitude, latitude }) =>
        Object.freeze({ longitude, latitude }),
      ),
    ),
  });
}

/**
 * A globe: the tileset `Engine.addTerrain` and `Engine.addEllipsoid`
 * return. Its `terrain` holds the regions that change how the terrain
 * draws; other tilesets have none.
 */
export class Globe extends Tileset3D {
  /** Regions of the terrain: cuts, ground that is faded, tinted glass. */
  readonly terrain: GlobeTerrain;

  private constructor(
    engine: Engine,
    world: World,
    source: TileSource,
    options: TilesetOptions,
  ) {
    super(
      engine,
      world,
      source.url,
      options,
      source.root,
      source.geometricError,
      source,
    );
    this.terrain = new GlobeTerrain(this);
  }

  /** @internal Streams a terrain source as a globe (`Engine`). */
  static create(
    engine: Engine,
    world: World,
    source: TileSource,
    options: TilesetOptions = {},
  ): Globe {
    const globe = new Globe(engine, world, source, options);
    globe.attachSource(source);
    return globe;
  }

  /** @internal The regions as the CPU tests them. */
  get clips(): TerrainClips {
    return this.source!.clips!;
  }

  /** @internal A region's value changed that tiles needn't hear of. */
  touched(): void {
    this.changed();
  }

  /**
   * @internal Where a pick ray (Earth-fixed, in the globe's anchor's
   * coordinates; `direction` need not be unit) first meets ground that
   * isn't fully opaque and that picks stop at, before any opaque terrain:
   * the distance along it in `direction`'s units, and the tile's draw
   * there. Undefined without such ground, or when the ray meets opaque
   * terrain or nothing first. Only the stretch of the ray within the
   * regions' reach is traced (the whole globe's while one of them is
   * "everywhere").
   */
  stoppingTerrainHit(
    origin: ArrayLike<number>,
    direction: ArrayLike<number>,
    viewMask?: number,
  ): { distance: number; draw: DrawHandle | undefined } | undefined {
    const source = this.source;
    const clips = source?.clips;
    if (!source || !clips || !source.rayTarget || !this.show) {
      return undefined;
    }
    const stoppers = clips.partial.filter((e) => !e.pickThrough);
    if (stoppers.length === 0) {
      return undefined;
    }
    const length = Math.hypot(direction[0]!, direction[1]!, direction[2]!);
    if (!(length > 0)) {
      return undefined;
    }
    const d = [0, 1, 2].map((k) => direction[k]! / length);
    // The stretch to trace, m along the unit ray.
    let near = Infinity;
    let far = -Infinity;
    const take = (center: ArrayLike<number>, radius: number) => {
      const o = [0, 1, 2].map((k) => origin[k]! - center[k]!);
      const b = o[0]! * d[0]! + o[1]! * d[1]! + o[2]! * d[2]!;
      const c = o[0]! ** 2 + o[1]! ** 2 + o[2]! ** 2 - radius * radius;
      const disc = b * b - c;
      if (disc < 0) {
        return;
      }
      const root = Math.sqrt(disc);
      near = Math.min(near, Math.max(0, -b - root));
      far = Math.max(far, -b + root);
    };
    const ellipsoid = clips.ellipsoid;
    if (stoppers.some((e) => !e.shape)) {
      // The ray's part inside the highest terrain's shell, and no further
      // than where it dives under the lowest terrain (a ray looking down
      // would otherwise cross the whole globe); `castTerrainRay` clips it to
      // the height band from there.
      take([0, 0, 0], Math.max(...ellipsoid.radii) + TERRAIN_BAND);
      near = 0;
      const inner = Math.min(...ellipsoid.radii) - TERRAIN_BAND;
      const b = origin[0]! * d[0]! + origin[1]! * d[1]! + origin[2]! * d[2]!;
      const c =
        origin[0]! ** 2 + origin[1]! ** 2 + origin[2]! ** 2 - inner ** 2;
      if (b < 0 && c > 0 && b * b - c >= 0) {
        far = Math.min(far, -b - Math.sqrt(b * b - c));
      }
    } else {
      for (const e of stoppers) {
        const [x0, y0, x1, y1] = e.shape!.box;
        const extent = Math.max(
          Math.hypot(x0, y0),
          Math.hypot(x0, y1),
          Math.hypot(x1, y0),
          Math.hypot(x1, y1),
        );
        take(e.shape!.anchor, extent + TERRAIN_BAND);
      }
    }
    if (!(far > near)) {
      return undefined;
    }
    const base = source.rayTarget(viewMask);
    // Where the ground is drawn below full opacity and every region there
    // lets picks through, it is a hole for the ray, as a cut is.
    const passes = (p: ArrayLike<number>): boolean => {
      const at = clips.partialAt(p);
      return at.inside && !at.stops;
    };
    const target: TerrainRayTarget = {
      ...base,
      clipped: (p) => clips.clippedPoint(p) || passes(p),
    };
    const from = [0, 1, 2].map((k) => origin[k]! + d[k]! * near);
    const to = [0, 1, 2].map((k) => origin[k]! + d[k]! * far);
    const ray = castTerrainRay(from, to, target);
    // Surface crossings only: `hit` also counts the first sample below the
    // surface, which for a camera under the ground is next to the camera.
    const hit = ray?.surface;
    if (!hit || !(hit.t > 0)) {
      return undefined;
    }
    if (!clips.partialAt(hit.point).inside) {
      return undefined; // opaque terrain first: the GPU's pick has it
    }
    const carto = ellipsoid.cartesianToCartographic(hit.point, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    const rayTile =
      carto && target.patchAt(carto.longitude, carto.latitude).tile;
    const tile = rayTile ? source.tileOf?.(rayTile) : undefined;
    return {
      distance: (near + hit.t * (far - near)) / length,
      draw: tile?.placement?.draws[0],
    };
  }
}

/** Whether a tileset is a globe (it has `terrain`). */
export function isGlobe(tileset: Tileset3D): tileset is Globe {
  return tileset instanceof Globe;
}
