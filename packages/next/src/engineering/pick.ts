import type { Body } from "../scene/Body.ts";
import type { PickResult } from "../scene/View.ts";
import type { DrawHandle } from "../scene/World.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { designPoint, type DesignPoint } from "./EngineeringFrame.ts";

/**
 * The part of a `View` that `pickDesign` uses, so tests can pass fakes.
 * `pick` and `pickPosition` take target (device) pixels relative to the
 * view's top-left; `camera.fovy` is the vertical field of view for an aspect
 * ratio (the scene's `Camera` stores the larger dimension's).
 */
export interface PickView {
  pick(x: number, y: number): Promise<PickResult | undefined>;
  pickPosition(x: number, y: number): Promise<Float64Array | undefined>;
  readonly body: Body;
  readonly camera: {
    readonly position: ArrayLike<number>;
    fovy(aspect: number): number;
  };
  /** `CanvasTarget` has a `pixelRatio`; other targets are at 1. */
  readonly target: { readonly width: number; readonly pixelRatio?: number };
  pixelRect(): { readonly width: number; readonly height: number };
  readonly world: {
    feature(featureId: number): { readonly draw: DrawHandle } | undefined;
  };
}

/** What a pick found: a true position, and design coordinates when placed. */
export interface DesignPick {
  readonly body: Body;
  /** Body-fixed metres, as displayed. */
  readonly position: Float64Array;
  /** The listed tileset whose content was hit. */
  readonly tileset?: Tileset3D;
  readonly feature?: PickResult;
  /** Present only for a hit on a listed tileset that has a placement. */
  readonly design?: DesignPoint;
  /** Metres: one CSS pixel's footprint at the hit. */
  readonly tolerance: number;
}

/**
 * Picks the surface under a CSS-pixel position of `view`. Resolves undefined
 * over the sky. Design coordinates come from the hit tileset's placement and
 * only when that tileset is in `tilesets`; otherwise only true values return.
 */
export async function pickDesign(
  view: PickView,
  x: number,
  y: number,
  tilesets: readonly Tileset3D[],
): Promise<DesignPick | undefined> {
  const ratio = view.target.pixelRatio ?? 1;
  const px = x * ratio;
  const py = y * ratio;
  const [position, feature] = await Promise.all([
    view.pickPosition(px, py),
    view.pick(px, py),
  ]);
  if (position === undefined) {
    return undefined;
  }

  const rect = view.pixelRect();
  const cam = view.camera.position;
  const distance = Math.hypot(
    cam[0]! - position[0]!,
    cam[1]! - position[1]!,
    cam[2]! - position[2]!,
  );
  const fovy = view.camera.fovy(rect.width / rect.height);
  const tolerance = (distance * 2 * Math.tan(fovy / 2)) / (rect.height / ratio);

  let tileset: Tileset3D | undefined;
  if (feature !== undefined) {
    const draw = view.world.feature(feature.featureId)?.draw;
    if (draw !== undefined) {
      tileset = tilesets.find(
        (t) => !t.isDestroyed() && t.tileOfDraw(draw) !== undefined,
      );
    }
  }

  const placement = tileset?.placement;
  return {
    body: view.body,
    position,
    ...(tileset !== undefined && { tileset }),
    ...(feature !== undefined && { feature }),
    ...(placement !== undefined && {
      design: designPoint(placement.frame, placement.designOf(position), {
        how: "pick",
        tolerance,
      }),
    }),
    tolerance,
  };
}
