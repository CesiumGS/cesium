import * as v3 from "../math/vec3.ts";
import { Ellipsoid, cartographic } from "../math/ellipsoid.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Overlay, View } from "./View.ts";

export type ViewLinkMode =
  /** Target camera copies the source camera. */
  | "mirror"
  /** Target looks straight down at the point the source is looking at. */
  | "follow"
  /** Target draws the source view's ground footprint as an overlay. */
  | "footprint";

export interface ViewLinkOptions {
  modes: ViewLinkMode[];
  /** For "follow": target altitude as a multiple of the source's distance to its focus. */
  followScale?: number;
  footprintColor?: readonly [number, number, number, number];
}

/**
 * Relates two views. Links are evaluated once per frame before rendering, so
 * linked views always render from consistent cameras. Input routing ("control")
 * is done by pointing a camera controller at the source view's camera.
 */
export class ViewLink {
  private readonly overlay: Overlay;
  private readonly ellipsoid = Ellipsoid.WGS84;
  private readonly mirror: boolean;
  private readonly followMode: boolean;
  private readonly footprint: boolean;

  constructor(
    readonly source: View,
    readonly target: View,
    readonly options: ViewLinkOptions,
  ) {
    this.overlay = {
      positions: new Float64Array(BORDER.length * 2 * 3),
      count: 0,
      color: options.footprintColor ?? [1, 0.8, 0.2, 1],
    };
    this.mirror = options.modes.includes("mirror");
    this.followMode = options.modes.includes("follow");
    this.footprint = options.modes.includes("footprint");
    if (this.footprint) {
      target.overlays.push(this.overlay);
    }
  }

  evaluate(): void {
    if (this.mirror) {
      this.target.camera.copyFrom(this.source.camera);
    }
    if (this.followMode) {
      this.follow();
    }
    if (this.footprint) {
      this.updateFootprint();
    }
  }

  dispose(): void {
    const index = this.target.overlays.indexOf(this.overlay);
    if (index >= 0) {
      this.target.overlays.splice(index, 1);
    }
  }

  private follow(): void {
    const camera = this.source.camera;
    const focus = this.groundPoint(0, 0, scratchFocus);
    const distance = v3.distance(camera.position, focus);
    const range = Math.max(500, distance * (this.options.followScale ?? 3));
    this.target.camera.lookAt(
      focus,
      0,
      -Math.PI / 2 + 1e-4,
      range,
      this.ellipsoid,
    );
  }

  /** Walks the source viewport's border and connects consecutive ground hits. */
  private updateFootprint(): void {
    const positions = this.overlay.positions;
    let count = 0;
    const n = BORDER.length;
    let previous = this.groundPoint(
      BORDER[n - 1]![0],
      BORDER[n - 1]![1],
      scratchHitA,
    );
    let current = scratchHitB;
    for (let i = 0; i < n; i++) {
      const hit = this.groundPoint(BORDER[i]![0], BORDER[i]![1], current);
      {
        const o = count * 3;
        positions[o] = previous[0]!;
        positions[o + 1] = previous[1]!;
        positions[o + 2] = previous[2]!;
        positions[o + 3] = hit[0]!;
        positions[o + 4] = hit[1]!;
        positions[o + 5] = hit[2]!;
        count += 2;
      }
      // Swap scratch points: this hit is the next segment's start.
      current = current === scratchHitA ? scratchHitB : scratchHitA;
      previous = hit;
    }
    this.overlay.count = count;
  }

  /**
   * Where a viewport ray meets the ground, continuously: a ray that misses
   * the ellipsoid (above the horizon) or hits beyond a cap (20× the camera's
   * altitude, at least 5 km) uses the point at the cap dropped onto the surface.
   * Grazing rays would otherwise jump thousands of kilometres between
   * frames (or drop out), making the footprint and the follow target flicker.
   */
  private groundPoint(ndcX: number, ndcY: number, out: Vec3): Vec3 {
    const camera = this.source.camera;
    const direction = camera.rayDirection(
      ndcX,
      ndcY,
      this.source.aspect,
      scratchDirection,
    );
    const altitude = Math.max(
      this.ellipsoid.cartesianToCartographic(camera.position, scratchCarto)
        ?.height ?? 0,
      1,
    );
    // A floor keeps level, near-ground views on their real ground hits.
    const cap = Math.max(altitude * 20, 5000);
    const hit = this.ellipsoid.rayIntersection(camera.position, direction, out);
    if (hit && v3.distance(hit, camera.position) <= cap) {
      return hit;
    }
    v3.scaleAndAdd(out, camera.position, direction, cap);
    return this.subPoint(out, out);
  }

  private subPoint(position: Vec3, out: Vec3): Vec3 {
    return (
      this.ellipsoid.scaleToGeodeticSurface(position, out) ??
      v3.copy(out, position)
    );
  }
}

/** Normalized viewport border, counter-clockwise from the bottom-left corner. */
const BORDER: ReadonlyArray<readonly [number, number]> = (() => {
  const steps = 12;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < steps; i++) {
    points.push([-1 + (2 * i) / steps, -1]);
  }
  for (let i = 0; i < steps; i++) {
    points.push([1, -1 + (2 * i) / steps]);
  }
  for (let i = 0; i < steps; i++) {
    points.push([1 - (2 * i) / steps, 1]);
  }
  for (let i = 0; i < steps; i++) {
    points.push([-1, 1 - (2 * i) / steps]);
  }
  return points;
})();

const scratchHitA = v3.vec3();
const scratchHitB = v3.vec3();
const scratchFocus = v3.vec3();
const scratchCarto = cartographic();
const scratchDirection = v3.vec3();
