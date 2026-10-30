/**
 * `Legacy1x` selection for terrain: CesiumJS 1.x's globe quadtree traversal
 * (QuadtreePrimitive selectTilesForRendering / visitTile, with
 * GlobeSurfaceTileProvider's visibility, distance and bounds), reproduced
 * for parity tests. See docs/globe-legacy1x-spec.md.
 *
 * Differences from 1.x, by construction:
 * - Quadrants without data are drawn by their parent clipped to them (a
 *   mixed-LOD placeholder) instead of by upsampled tiles; their bounds use
 *   the parent's heights, where 1.x upsamples tighter ones.
 * - No imagery: `canRenderWithoutLosingDetail` checks terrain only.
 * - The load queues become request priority bands (high, medium, low), each
 *   ordered by 1.x's load priority; the request scheduler, not a 5 ms time
 *   slice, bounds the work per frame.
 */
import type { Tile } from "../streaming/Tile.ts";
import type {
  SelectionResult,
  SelectionView,
  TileSelection,
} from "../streaming/Legacy1x.ts";
import {
  OUTSIDE,
  obbIntersectPlane,
  regionDistance,
  regionFromJson,
  type Region,
} from "../streaming/volumes.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import type { Vec3 } from "../math/vec3.ts";
import { horizonCullingPoint, isScaledSpacePointVisible } from "./horizon.ts";
import type { GlobeTile, TerrainSource } from "./TerrainSource.ts";

// 1.x TileSelectionResult.
const NONE = 0;
const CULLED = 1;
const RENDERED = 2;
const REFINED = 3;
const CULLED_BUT_NEEDED = 9;
const KICKED = 4;
const original = (result: number) => result & 3;

/** Request priority bands for 1.x's high, medium and low load queues. */
const HIGH = 0;
const MEDIUM = 1e13;
const LOW = 2e13;

/** 1.x computeDistanceToTile without any height source. */
const NO_BOUNDS_DISTANCE = 9999999999.0;

// 1.x Fog defaults.
const FOG_DENSITY = 0.0006;
const FOG_HEIGHT_SCALAR = 0.001;
const FOG_HEIGHT_FALLOFF = 0.59;
const FOG_MAX_HEIGHT = 800000;
const FOG_SSE = 2.0;

const ellipsoid = Ellipsoid.WGS84;

export interface GlobeLegacy1xOptions {
  /** 1.x Globe.maximumScreenSpaceError (default 2). */
  maximumScreenSpaceError?: number;
}

/** A tile's bounding region and occludee point, and whose heights built them. */
interface Bounds {
  source: Tile;
  minimumHeight: number;
  maximumHeight: number;
  region: Region;
  occludee?: Vec3;
}

/** 1.x TraversalDetails. */
interface Details {
  allAreRenderable: boolean;
  anyWereRenderedLastFrame: boolean;
  notYetRenderableCount: number;
}

interface Queued {
  tile: Tile;
  priority: number;
}

/** One selection pass for one view. */
interface Pass {
  view: SelectionView;
  pass: number;
  lastPass: number;
  fogEnabled: boolean;
  density: number;
  pixelRatio: number;
  render: Tile[];
  high: Queued[];
  medium: Queued[];
  low: Queued[];
  touched: Tile[];
}

export class GlobeLegacy1xSelection implements TileSelection {
  maximumScreenSpaceError: number;
  memoryAdjustedScreenSpaceError: number;
  /** 1.x QuadtreePrimitive defaults. */
  loadingDescendantLimit = 20;
  preloadAncestors = true;
  preloadSiblings = false;
  /** 1.x scene.fog.enabled: fog lowers the SSE and culls distant tiles. */
  fog = true;
  private passes = 0;
  /** Last pass per view id (1.x _lastSelectionFrameNumber). */
  private readonly lastPass: number[] = [];
  /** Level-zero tiles, re-sorted in place each pass as 1.x. */
  private roots?: Tile[];

  constructor(
    private readonly source: TerrainSource,
    options: GlobeLegacy1xOptions = {},
  ) {
    this.maximumScreenSpaceError = options.maximumScreenSpaceError ?? 2;
    this.memoryAdjustedScreenSpaceError = this.maximumScreenSpaceError;
  }

  select(root: Tile, _rootError: number, view: SelectionView): SelectionResult {
    const height = view.cartographic.height;
    const fogEnabled = this.fog && height <= FOG_MAX_HEIGHT;
    let density = 0;
    if (fogEnabled) {
      density =
        FOG_DENSITY *
        FOG_HEIGHT_SCALAR *
        Math.pow(Math.max(height / FOG_MAX_HEIGHT, 1e-4), -FOG_HEIGHT_FALLOFF);
      const p = view.position;
      const length = Math.hypot(p[0]!, p[1]!, p[2]!);
      const d = view.direction;
      const dot = Math.abs(
        (d[0]! * p[0]! + d[1]! * p[1]! + d[2]! * p[2]!) / length,
      );
      density *= 1 - dot;
    }
    const P: Pass = {
      view,
      pass: ++this.passes,
      lastPass: this.lastPass[view.id] ?? -1,
      fogEnabled,
      density,
      pixelRatio: view.pixelRatio ?? 1,
      render: [],
      high: [],
      medium: [],
      low: [],
      touched: [],
    };

    // Level-zero tiles nearest first (longitude/latitude distance).
    const roots = (this.roots ??= [...root.children]);
    const camera = view.cartographic;
    const key = (t: Tile) => {
      const r = t.globe!.rectangle;
      const dlon = (r.west + r.east) / 2 - camera.longitude;
      const dlat = (r.south + r.north) / 2 - camera.latitude;
      return dlon * dlon + dlat * dlat;
    };
    roots.sort((a, b) => key(a) - key(b));
    for (const tile of roots) {
      P.touched.push(tile);
      if (!renderable(tile)) {
        this.queue(P, P.high, tile);
      } else {
        this.visitIfVisible(P, tile, false, details());
      }
    }
    this.lastPass[view.id] = P.pass;
    return this.result(P);
  }

  // ------------------------------------------------------------- traversal

  private visitIfVisible(
    P: Pass,
    tile: Tile,
    ancestorMeetsSse: boolean,
    out: Details,
  ): void {
    P.touched.push(tile);
    if (this.visible(P, tile)) {
      this.visitTile(P, tile, ancestorMeetsSse, out);
      return;
    }
    out.allAreRenderable = true;
    out.anyWereRenderedLastFrame = false;
    out.notYetRenderableCount = 0;
    if (rectangleContains(tile.globe!, P.view.cartographic)) {
      if (!renderable(tile)) {
        this.queue(P, P.medium, tile);
      }
      setResult(P, tile, CULLED_BUT_NEEDED);
    } else {
      if (this.preloadSiblings || tile.globe!.level === 0) {
        this.queue(P, P.low, tile);
      }
      setResult(P, tile, CULLED);
    }
  }

  private visitTile(
    P: Pass,
    tile: Tile,
    ancestorMeetsSse: boolean,
    out: Details,
  ): void {
    const meetsSse =
      this.screenSpaceError(P, tile) < this.memoryAdjustedScreenSpaceError;
    const last = lastResult(P, tile);

    if (meetsSse || ancestorMeetsSse) {
      // Rendering this tile must not lose detail drawn last frame.
      let ok =
        original(last) === RENDERED ||
        original(last) === CULLED ||
        last === NONE ||
        renderable(tile);
      if (!ok) {
        ok = this.canRenderWithoutLosingDetail(P, tile);
      }
      if (ok) {
        if (meetsSse) {
          this.queue(P, P.medium, tile);
        }
        this.renderTile(P, tile, last, out);
        return;
      }
      ancestorMeetsSse = true;
      if (meetsSse) {
        this.queue(P, P.high, tile);
      }
    }

    if (this.source.expand(tile) && tile.children.length > 0) {
      setResult(P, tile, REFINED);
      const first = P.render.length;
      const low = P.low.length;
      const medium = P.medium.length;
      const high = P.high.length;
      this.visitChildrenNearToFar(P, tile, ancestorMeetsSse, out);

      if (first !== P.render.length) {
        let queued = false;
        if (!out.allAreRenderable && !out.anyWereRenderedLastFrame) {
          // Kick: nothing below is ready and nothing there was drawn last
          // frame, so this tile draws instead while they load.
          for (let i = first; i < P.render.length; i++) {
            for (
              let t: Tile | undefined = P.render[i];
              t && t !== tile;
              t = t.parent
            ) {
              const s = t.globe!.selection[P.view.id];
              if (s) {
                s.result |= KICKED;
              }
            }
          }
          P.render.length = first;
          P.render.push(tile);
          setResult(P, tile, RENDERED);
          const wasRendered = last === RENDERED;
          if (
            !wasRendered &&
            out.notYetRenderableCount > this.loadingDescendantLimit
          ) {
            // Too many descendants pending: load this tile first.
            P.low.length = low;
            P.medium.length = medium;
            P.high.length = high;
            this.queue(P, P.medium, tile);
            out.notYetRenderableCount = renderable(tile) ? 0 : 1;
            queued = true;
          }
          out.allAreRenderable = renderable(tile);
          out.anyWereRenderedLastFrame = wasRendered;
        }
        if (this.preloadAncestors && !queued) {
          this.queue(P, P.low, tile);
        }
      }
      return;
    }

    // Can't refine (no data below, or availability still unknown).
    this.renderTile(P, tile, last, out);
    this.queue(P, P.high, tile);
  }

  private renderTile(P: Pass, tile: Tile, last: number, out: Details): void {
    P.render.push(tile);
    out.allAreRenderable = renderable(tile);
    out.anyWereRenderedLastFrame = last === RENDERED;
    out.notYetRenderableCount = renderable(tile) ? 0 : 1;
    setResult(P, tile, RENDERED);
  }

  /** Children south-west, south-east, north-west, north-east; nearest first. */
  private visitChildrenNearToFar(
    P: Pass,
    tile: Tile,
    ancestorMeetsSse: boolean,
    out: Details,
  ): void {
    const [sw, se, nw, ne] = tile.children as [Tile, Tile, Tile, Tile];
    const r = sw.globe!.rectangle;
    const camera = P.view.cartographic;
    const order =
      camera.longitude < r.east
        ? camera.latitude < r.north
          ? [sw, se, nw, ne]
          : [nw, sw, ne, se]
        : camera.latitude < r.north
          ? [se, sw, ne, nw]
          : [ne, nw, se, sw];
    out.allAreRenderable = true;
    out.anyWereRenderedLastFrame = false;
    out.notYetRenderableCount = 0;
    for (const child of order) {
      const d = details();
      this.visitIfVisible(P, child, ancestorMeetsSse, d);
      out.allAreRenderable &&= d.allAreRenderable;
      out.anyWereRenderedLastFrame ||= d.anyWereRenderedLastFrame;
      out.notYetRenderableCount += d.notYetRenderableCount;
    }
  }

  /** 1.x canRenderWithoutLosingDetail, terrain only (no imagery). */
  private canRenderWithoutLosingDetail(P: Pass, tile: Tile): boolean {
    const ready = renderable(tile);
    const stack = [...tile.children];
    while (stack.length > 0) {
      const descendant = stack.pop()!;
      const last = lastResult(P, descendant);
      if (last === RENDERED) {
        if (!ready && renderable(descendant)) {
          return false;
        }
      } else if (last === REFINED) {
        stack.push(...descendant.children);
      }
    }
    return true;
  }

  // ------------------------------------------------------------- per tile

  /** 1.x computeTileVisibility; stores the distance for the SSE. */
  private visible(P: Pass, tile: Tile): boolean {
    const view = P.view;
    const b = this.bounds(tile);
    const state = tile.viewState(view.id);
    if (!b) {
      state.distance = NO_BOUNDS_DISTANCE;
    } else if (b.source !== tile) {
      // Heights from an ancestor: the tile can't be nearer than the
      // ancestor's height surface farther from the camera.
      const h = view.cartographic.height;
      const surface =
        Math.abs(h - b.minimumHeight) > Math.abs(h - b.maximumHeight)
          ? b.minimumHeight
          : b.maximumHeight;
      state.distance = regionDistance(
        b.region,
        view.position,
        view.cartographic,
        surface,
        surface,
      );
    } else {
      state.distance = regionDistance(
        b.region,
        view.position,
        view.cartographic,
      );
    }
    state.updated = P.pass;
    if (P.fogEnabled && fog(state.distance, P.density) >= 1.0) {
      return (state.visible = false);
    }
    if (!b) {
      return (state.visible = true);
    }
    const planes = view.planes;
    for (let k = 0; k < planes.length / 4; k++) {
      if (
        obbIntersectPlane(
          b.region.obb,
          planes.subarray(k * 4, k * 4 + 3),
          planes[k * 4 + 3]!,
        ) === OUTSIDE
      ) {
        return (state.visible = false);
      }
    }
    // Two level-zero tiles: the ellipsoid occludes.
    state.visible =
      !b.occludee ||
      isScaledSpacePointVisible(view.position, b.occludee, b.minimumHeight);
    return state.visible;
  }

  /** 1.x QuadtreePrimitive screenSpaceError (perspective) with fog. */
  private screenSpaceError(P: Pass, tile: Tile): number {
    const distance = tile.viewState(P.view.id).distance;
    // view.height is already divided by the pixel ratio.
    let error =
      (tile.geometricError * P.view.height) /
      (distance * P.view.sseDenominator);
    if (P.fogEnabled) {
      error -= (fog(distance, P.density) * FOG_SSE) / P.pixelRatio;
    }
    return error;
  }

  /**
   * 1.x updateTileBoundingRegion: the tile's own heights once loaded, else
   * the nearest loaded ancestor's; undefined when there are none.
   */
  private bounds(tile: Tile): Bounds | undefined {
    let source: Tile | undefined = tile;
    while (source?.globe && !source.globe.own) {
      source = source.parent;
    }
    const heights = source?.globe?.own;
    if (!source || !heights) {
      return undefined;
    }
    const g = tile.globe!;
    const cached = g.bounds as Bounds | undefined;
    if (
      cached &&
      cached.source === source &&
      cached.minimumHeight === heights.minimumHeight &&
      cached.maximumHeight === heights.maximumHeight
    ) {
      return cached;
    }
    const r = g.rectangle;
    const region = regionFromJson([
      r.west,
      r.south,
      r.east,
      r.north,
      heights.minimumHeight,
      heights.maximumHeight,
    ]);
    // A loaded tile culls with its mesh's point; otherwise (or if the mesh
    // has none) one is computed from the box.
    const occludee =
      (source === tile ? heights.occludee : undefined) ??
      occludeePoint(
        region.obb.center,
        g,
        heights.minimumHeight,
        heights.maximumHeight,
      );
    const bounds: Bounds = {
      source,
      minimumHeight: heights.minimumHeight,
      maximumHeight: heights.maximumHeight,
      region,
      ...(occludee ? { occludee } : {}),
    };
    g.bounds = bounds;
    return bounds;
  }

  /** 1.x queueTileLoad with computeTileLoadPriority. */
  private queue(P: Pass, queue: Queued[], tile: Tile): void {
    if (tile.fillFromParent) {
      // Drawn from its parent's content.
      tile = tile.parent!;
    }
    if (tile.empty || tile.state !== "unloaded") {
      return;
    }
    let priority = 0;
    const b = tile.globe!.bounds as Bounds | undefined;
    if (b) {
      const c = b.region.obb.center;
      const p = P.view.position;
      const dx = c[0]! - p[0]!;
      const dy = c[1]! - p[1]!;
      const dz = c[2]! - p[2]!;
      const length = Math.hypot(dx, dy, dz);
      if (length >= 1e-5) {
        const d = P.view.direction;
        priority =
          (1 - (dx * d[0]! + dy * d[1]! + dz * d[2]!) / length) *
          tile.viewState(P.view.id).distance;
      }
    }
    queue.push({ tile, priority });
  }

  private result(P: Pass): SelectionResult {
    const result: SelectionResult = {
      selected: [],
      requested: [],
      touched: P.touched,
      priority: new Map(),
      placeholders: new Map(),
    };
    const selected = new Set<Tile>();
    const holes = new Map<Tile, Tile[]>();
    for (const tile of P.render) {
      if (tile.fillFromParent) {
        const parent = tile.parent!;
        let list = holes.get(parent);
        if (!list) {
          holes.set(parent, (list = []));
        }
        list.push(tile);
        selected.add(parent);
      } else {
        selected.add(tile);
      }
    }
    result.selected.push(...selected);
    for (const [parent, list] of holes) {
      result.placeholders!.set(parent, list);
    }
    const bands: [Queued[], number][] = [
      [P.high, HIGH],
      [P.medium, MEDIUM],
      [P.low, LOW],
    ];
    for (const [queue, band] of bands) {
      for (const { tile, priority } of queue) {
        const previous = result.priority!.get(tile);
        if (previous === undefined) {
          result.requested.push(tile);
          result.priority!.set(tile, band + priority);
        } else if (band + priority < previous) {
          result.priority!.set(tile, band + priority);
        }
      }
    }
    return result;
  }
}

function details(): Details {
  return {
    allAreRenderable: true,
    anyWereRenderedLastFrame: false,
    notYetRenderableCount: 0,
  };
}

/** Ready to draw: own content, or the parent's for a quadrant without data. */
function renderable(tile: Tile): boolean {
  return tile.fillFromParent
    ? tile.parent!.contentAvailable
    : tile.contentAvailable;
}

function lastResult(P: Pass, tile: Tile): number {
  const s = tile.globe!.selection[P.view.id];
  return s && s.pass === P.lastPass ? s.result : NONE;
}

function setResult(P: Pass, tile: Tile, result: number): void {
  const states = tile.globe!.selection;
  const s = states[P.view.id];
  if (s) {
    s.pass = P.pass;
    s.result = result;
  } else {
    states[P.view.id] = { pass: P.pass, result };
  }
}

/** 1.x CesiumMath.fog. */
function fog(distance: number, density: number): number {
  const scalar = distance * density;
  return 1.0 - Math.exp(-(scalar * scalar));
}

/** 1.x Rectangle.contains (EPSILON14 on longitude). */
function rectangleContains(
  g: GlobeTile,
  c: { longitude: number; latitude: number },
): boolean {
  const r = g.rectangle;
  return (
    (c.longitude > r.west || Math.abs(c.longitude - r.west) <= 1e-14) &&
    (c.longitude < r.east || Math.abs(c.longitude - r.east) <= 1e-14) &&
    c.latitude >= r.south &&
    c.latitude <= r.north
  );
}

/** 1.x computeOccludeePoint: from the corners at the maximum height. */
function occludeePoint(
  center: Vec3,
  g: GlobeTile,
  minimumHeight: number,
  maximumHeight: number,
): Vec3 | undefined {
  const r = g.rectangle;
  const corners = new Float64Array(12);
  const scratch = new Float64Array(3);
  [
    [r.west, r.south],
    [r.east, r.south],
    [r.west, r.north],
    [r.east, r.north],
  ].forEach(([longitude, latitude], i) => {
    ellipsoid.cartographicToCartesian(
      { longitude: longitude!, latitude: latitude!, height: maximumHeight },
      scratch,
    );
    corners.set(scratch, i * 3);
  });
  return horizonCullingPoint(center, corners, minimumHeight);
}
