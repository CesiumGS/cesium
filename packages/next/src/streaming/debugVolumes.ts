/**
 * Wireframes of tile bounding volumes for inspection (1.x
 * `Cesium3DTileset.debugShowBoundingVolume` and
 * `debugShowContentBoundingVolume`): one line-list draw per shown volume,
 * placed under the tileset's transform so a runtime `modelMatrix` moves
 * them with the content.
 */
import type { DrawSink } from "./DrawSink.ts";
import type {
  DrawHandle,
  MeshHandle,
  TransformHandle,
} from "../scene/world/types.ts";
import type { Tile } from "./Tile.ts";
import type { TileVolume } from "./volumes.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";

/** Linear RGBA. */
export type DebugColor = readonly [number, number, number, number];

/** 1.x's colors (`Cesium3DTile` `applyDebugSettings`), in linear RGB. */
export const VOLUME_COLORS = {
  /** Drawn while finer tiles load (1.x: not `_finalResolution`). */
  refining: [1, 1, 0, 1],
  /** No renderable content of its own. */
  empty: [0.4, 0.4, 0.4, 1],
  /** Drawn at its final resolution. */
  final: [1, 1, 1, 1],
  /** Content volumes (1.x `debugShowContentBoundingVolume`). */
  content: [0, 0, 1, 1],
} as const satisfies Record<string, DebugColor>;

interface Shown {
  volume: TileVolume;
  mesh: MeshHandle;
  transform: TransformHandle;
  draw: DrawHandle;
  color: DebugColor;
}

/** The volumes currently drawn for one kind (bounding or content). */
export class DebugVolumes {
  private readonly shown = new Map<Tile, Shown>();

  constructor(
    private readonly world: DrawSink,
    private readonly parent: TransformHandle,
  ) {}

  /** Draws exactly these tiles' volumes, in these colors. */
  update(wanted: Map<Tile, { volume: TileVolume; color: DebugColor }>): void {
    for (const [tile, shown] of this.shown) {
      const want = wanted.get(tile);
      if (!want || want.volume !== shown.volume) {
        this.remove(shown);
        this.shown.delete(tile);
      }
    }
    for (const [tile, { volume, color }] of wanted) {
      const shown = this.shown.get(tile);
      if (!shown) {
        this.shown.set(tile, this.add(volume, color));
      } else if (shown.color !== color) {
        this.world.setColor(shown.draw, color);
        shown.color = color;
      }
    }
  }

  get size(): number {
    return this.shown.size;
  }

  clear(): void {
    this.update(new Map());
  }

  private add(volume: TileVolume, color: DebugColor): Shown {
    const { center, positions, indices } = volumeLines(volume);
    const mesh = this.world.addMesh({
      positions,
      indices,
      topology: "line-list",
    });
    const transform = this.world.addTransform(
      m4.setTranslation(m4.mat4(), center),
      this.parent,
    );
    const draw = this.world.addDraw({
      mesh,
      transform,
      color,
      unlit: true,
      name: "debug volume",
    });
    return { volume, mesh, transform, draw, color };
  }

  private remove(shown: Shown): void {
    this.world.removeDraw(shown.draw);
    this.world.removeTransform(shown.transform);
    this.world.removeMesh(shown.mesh);
  }
}

/**
 * Line-list geometry of a volume, relative to its center (float32 is
 * plenty for an outline): a box's 12 edges; a sphere's three great
 * circles; a region's top and bottom outlines following the ellipsoid,
 * with its four vertical edges, as 1.x draws them.
 */
export function volumeLines(volume: TileVolume): {
  center: Vec3;
  positions: Float32Array;
  indices: Uint32Array;
} {
  const points: number[] = [];
  const indices: number[] = [];
  const line = (a: number, b: number) => indices.push(a, b);
  let center: Vec3;
  if (volume.kind === "box") {
    center = volume.obb.center;
    const h = volume.obb.halfAxes;
    for (let i = 0; i < 8; i++) {
      const sx = i & 1 ? 1 : -1;
      const sy = i & 2 ? 1 : -1;
      const sz = i & 4 ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        points.push(sx * h[k]! + sy * h[3 + k]! + sz * h[6 + k]!);
      }
    }
    for (let i = 0; i < 8; i++) {
      for (const bit of [1, 2, 4]) {
        if (!(i & bit)) {
          line(i, i | bit);
        }
      }
    }
  } else if (volume.kind === "sphere") {
    center = volume.sphere.center;
    const r = volume.sphere.radius;
    const n = 48;
    for (let axis = 0; axis < 3; axis++) {
      const first = points.length / 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        const p = [0, 0, 0];
        p[(axis + 1) % 3] = r * Math.cos(a);
        p[(axis + 2) % 3] = r * Math.sin(a);
        points.push(...p);
        line(first + i, first + ((i + 1) % n));
      }
    }
  } else {
    const { west, south, north, minimumHeight, maximumHeight } = volume.region;
    const east =
      volume.region.east < west
        ? volume.region.east + 2 * Math.PI
        : volume.region.east;
    center = volume.sphere.center;
    const n = 16;
    const p = v3.vec3();
    // The outline's corners in order (west to east along the south edge,
    // and so on around), each edge subdivided to follow the surface.
    const ring: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      ring.push([west + ((east - west) * i) / n, south]);
    }
    for (let i = 0; i < n; i++) {
      ring.push([east, south + ((north - south) * i) / n]);
    }
    for (let i = 0; i < n; i++) {
      ring.push([east - ((east - west) * i) / n, north]);
    }
    for (let i = 0; i < n; i++) {
      ring.push([west, north - ((north - south) * i) / n]);
    }
    const heights =
      maximumHeight > minimumHeight
        ? [minimumHeight, maximumHeight]
        : [minimumHeight];
    for (const height of heights) {
      const first = points.length / 3;
      ring.forEach(([longitude, latitude], i) => {
        Ellipsoid.WGS84.cartographicToCartesian(
          { longitude, latitude, height },
          p,
        );
        points.push(p[0]! - center[0]!, p[1]! - center[1]!, p[2]! - center[2]!);
        line(first + i, first + ((i + 1) % ring.length));
      });
    }
    if (heights.length === 2) {
      for (let corner = 0; corner < 4; corner++) {
        line(corner * n, ring.length + corner * n);
      }
    }
  }
  return {
    center,
    positions: Float32Array.from(points),
    indices: Uint32Array.from(indices),
  };
}
