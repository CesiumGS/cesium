// The picture-in-picture view of the rigid line's gap at 20 km (stop 4,
// owner's rework, 2026-11-06): where it sits over the globe's view and how
// its camera frames the gap. Plain functions; gapInset.ts adds the engine view
// (`engine.addView`) and its frame in the HUD.
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Viewport } from "../../src/scene/renderTarget.ts";
import { NARROW_VIEW } from "./content.ts";

/** Sizes, CSS px; `fill` is the share of the picture's height the gap takes. */
export const INSET = {
  /** The legend's width. */
  width: 240,
  height: 140,
  /** The caption strip over the picture, inside the frame. */
  caption: 24,
  /** From the view's edge (the HUD's space-300). */
  gutter: 12,
  /** On a narrow view: at most this wide (the caption's width), at most `narrowShare` of the view. */
  narrowWidth: 212,
  narrowShare: 0.56,
  /**
   * On a narrow view, from the top: under Dyno's inspector, which spans
   * nearly the whole width there (8 px down, 28 px tall).
   */
  narrowTop: 48,
  fill: 0.45,
  /** On a wide view, the narrowest it goes to stay clear of the tour caption. */
  minWidth: 140,
} as const;

/** A rectangle in CSS px from the view's top left. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const meets = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/**
 * Where the inset goes in a view `view` px big whose time controls take
 * `hudBottom` px at the bottom: `frame` is the bordered box with its caption,
 * `view` the picture (the engine view's viewport). `avoid` is the tour
 * caption's box, when it shows.
 *
 * Wide views: bottom left, above the time controls and the credits under
 * them, the legend's width; clear of Dyno's inspector (top left), the tour
 * caption (top right) and the legend (bottom right), which stay put, and of
 * stop 4's line, which runs across the middle. Narrow views (under
 * `NARROW_VIEW`): small at the top right, under Dyno's inspector, which
 * spans nearly the whole width there; the rest is free (the tour caption
 * moves to the bottom and the legend sits at the bottom right).
 */
export function insetBox(
  view: { width: number; height: number },
  hudBottom: number,
  avoid?: Box,
): { frame: Box; view: Box } {
  if (view.width < NARROW_VIEW) {
    const width = Math.min(
      INSET.narrowWidth,
      Math.floor(INSET.narrowShare * view.width),
    );
    const height = Math.round((width * INSET.height) / INSET.width);
    const x = view.width - INSET.gutter - width;
    const at = (y: number) => ({
      frame: { x, y, width, height: height + INSET.caption },
      view: { x, y: y + INSET.caption, width, height },
    });
    const top = at(INSET.narrowTop);
    // A scenario's callout over the view's top right: the inset steps
    // down under it (Task 6a: the BIM site's answer and its gap).
    return avoid !== undefined && meets(top.frame, avoid)
      ? at(Math.round(avoid.y + avoid.height + INSET.gutter))
      : top;
  }
  const wide = (width: number) => {
    const height = Math.round((width * INSET.height) / INSET.width);
    const x = INSET.gutter;
    const y = view.height - hudBottom - height;
    return {
      frame: { x, y: y - INSET.caption, width, height: height + INSET.caption },
      view: { x, y, width, height },
    };
  };
  const full = wide(INSET.width);
  if (avoid === undefined || !meets(full.frame, avoid)) {
    return full;
  }
  // Between about 560 and 620 px the 340 px caption reaches over the
  // inset's corner on a short view: the inset narrows, at its place, to end
  // a gutter short of the caption.
  return wide(
    Math.max(
      INSET.minWidth,
      Math.min(INSET.width, Math.floor(avoid.x - 2 * INSET.gutter)),
    ),
  );
}

/** A box as the engine's viewport: fractions of the view. */
export function insetViewport(
  box: Box,
  view: { width: number; height: number },
): Viewport {
  return {
    x: box.x / view.width,
    y: box.y / view.height,
    width: box.width / view.width,
    height: box.height / view.height,
  };
}

/** A camera's pose, Earth-fixed meters and unit vectors. */
export interface Pose {
  position: Float64Array;
  direction: Float64Array;
  up: Float64Array;
  right: Float64Array;
}

const sub = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Float64Array.from([a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!]);
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Float64Array.from([
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ]);
const unit = (a: Float64Array) => {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!);
  return a.map((v) => v / l);
};

/** The vertical field of view for `fov` (the larger dimension's, as `Camera`). */
const fovy = (fov: number, aspect: number) =>
  aspect <= 1 ? fov : 2 * Math.atan(Math.tan(fov / 2) / aspect);

/**
 * The inset's camera: side-on to the line at the mark, level (up the
 * ellipsoid's normal there), looking across the line so that `along` points
 * right (from the south for a line heading east), at the range where the gap
 * between `exact` and `rigid` takes `fill` of the picture's height, centred
 * on the gap.
 */
export function insetCamera(
  exact: ArrayLike<number>,
  rigid: ArrayLike<number>,
  along: ArrayLike<number>,
  aspect: number,
  fov: number,
  fill: number = INSET.fill,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): Pose {
  const up = ellipsoid.geodeticSurfaceNormal(
    Float64Array.from(exact),
    new Float64Array(3),
  );
  if (up === undefined) {
    throw new RangeError("insetCamera: the mark is at the body's centre");
  }
  const level = sub(
    along,
    up.map((u) => u * dot(along, up)),
  );
  const right = unit(level);
  // up × east is north: the camera looks north from the south of the line.
  const direction = unit(cross(up, right));
  const gap = Math.hypot(...sub(rigid, exact));
  const range = gap / (fill * 2 * Math.tan(fovy(fov, aspect) / 2));
  const middle = [0, 1, 2].map((i) => (exact[i]! + rigid[i]!) / 2);
  return {
    position: Float64Array.from(
      middle.map((m, i) => m - direction[i]! * range),
    ),
    direction,
    up: Float64Array.from(up),
    right,
  };
}

/**
 * The gap between the exact and rigid placements at the mark, split as the
 * inset sees it (`insetCamera`'s axes): `drop`, the rigid point's height
 * over the exact one along the ellipsoid's normal there (the curvature);
 * `along`, its offset along the line levelled there (the grid's scale
 * factor, which rigid placement ignores: why the leader leans); `across`,
 * the rest, square to both. Meters; `apart` is the whole gap.
 */
export function gapParts(
  exact: ArrayLike<number>,
  rigid: ArrayLike<number>,
  along: ArrayLike<number>,
  ellipsoid: Ellipsoid = Ellipsoid.WGS84,
): { apart: number; drop: number; along: number; across: number } {
  const up = ellipsoid.geodeticSurfaceNormal(
    Float64Array.from(exact),
    new Float64Array(3),
  );
  if (up === undefined) {
    throw new RangeError("gapParts: the mark is at the body's centre");
  }
  const right = unit(
    sub(
      along,
      up.map((u) => u * dot(along, up)),
    ),
  );
  const d = sub(rigid, exact);
  return {
    apart: Math.hypot(d[0]!, d[1]!, d[2]!),
    drop: dot(d, up),
    along: dot(d, right),
    across: dot(d, cross(up, right)),
  };
}

/**
 * Where `p` shows in a picture taken from `pose`: fractions of its width and
 * height from the top left, or undefined behind the camera.
 */
export function projectInto(
  p: ArrayLike<number>,
  pose: {
    readonly position: ArrayLike<number>;
    readonly direction: ArrayLike<number>;
    readonly up: ArrayLike<number>;
    readonly right: ArrayLike<number>;
  },
  aspect: number,
  fov: number,
): { x: number; y: number } | undefined {
  const d = sub(p, pose.position);
  const z = dot(d, pose.direction);
  if (z <= 0) {
    return undefined;
  }
  const t = Math.tan(fovy(fov, aspect) / 2);
  return {
    x: (dot(d, pose.right) / (z * t * aspect) + 1) / 2,
    y: (1 - dot(d, pose.up) / (z * t)) / 2,
  };
}
