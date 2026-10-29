import * as v3 from "../math/vec3.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
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

  constructor(
    readonly source: View,
    readonly target: View,
    readonly options: ViewLinkOptions,
  ) {
    this.overlay = {
      segments: [],
      color: options.footprintColor ?? [1, 0.8, 0.2, 1],
    };
    if (options.modes.includes("footprint")) {
      target.overlays.push(this.overlay);
    }
  }

  evaluate(): void {
    const { modes } = this.options;
    if (modes.includes("mirror")) {
      this.target.camera.copyFrom(this.source.camera);
    }
    if (modes.includes("follow")) {
      this.follow();
    }
    if (modes.includes("footprint")) {
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
    const focus =
      this.groundPoint(0, 0, scratchFocus) ??
      this.subPoint(camera.position, scratchFocus);
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

  private updateFootprint(): void {
    const segments = this.overlay.segments;
    segments.length = 0;
    // Walk the source viewport's border and connect the ground hits.
    const border: Array<[number, number]> = [];
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      border.push([-1 + (2 * i) / steps, -1]);
    }
    for (let i = 0; i < steps; i++) {
      border.push([1, -1 + (2 * i) / steps]);
    }
    for (let i = 0; i < steps; i++) {
      border.push([1 - (2 * i) / steps, 1]);
    }
    for (let i = 0; i < steps; i++) {
      border.push([-1, 1 - (2 * i) / steps]);
    }
    const hits = border.map(([x, y]) => this.groundPoint(x, y, v3.vec3()));
    for (let i = 0; i < hits.length; i++) {
      const a = hits[i];
      const b = hits[(i + 1) % hits.length];
      if (a && b) {
        segments.push(a, b);
      }
    }
  }

  private groundPoint(ndcX: number, ndcY: number, out: Vec3): Vec3 | undefined {
    const camera = this.source.camera;
    const direction = camera.rayDirection(
      ndcX,
      ndcY,
      this.source.aspect,
      scratchDirection,
    );
    const t = this.ellipsoid.rayIntersection(camera.position, direction);
    return t === undefined
      ? undefined
      : v3.scaleAndAdd(out, camera.position, direction, t);
  }

  private subPoint(position: Vec3, out: Vec3): Vec3 {
    return (
      this.ellipsoid.scaleToGeodeticSurface(position, out) ??
      v3.copy(out, position)
    );
  }
}

const scratchFocus = v3.vec3();
const scratchDirection = v3.vec3();
