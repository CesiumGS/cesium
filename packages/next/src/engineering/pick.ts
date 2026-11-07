import type { Body } from "../scene/Body.ts";
import type { PickResult } from "../scene/View.ts";
import type { DrawHandle } from "../scene/World.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  sphereDistance,
  obbDistanceSquaredTo,
  volumeObb,
  type TileVolume,
} from "../streaming/volumes.ts";
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
    /** Bumped on every camera change. */
    readonly version: number;
    fovy(aspect: number): number;
  };
  /** A canvas target must give its `pixelRatio`; an offscreen one is at 1. */
  readonly target: {
    readonly kind: "canvas" | "offscreen";
    readonly width: number;
    readonly pixelRatio?: number;
  };
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
  /**
   * Present only for a hit on a listed tileset that has a placement, when
   * the position, the feature and the camera all come from one frame and
   * the hit tile's bounds contain the position.
   */
  readonly design?: DesignPoint;
  /** Metres: one CSS pixel's footprint at the hit. */
  readonly tolerance: number;
}

function targetPixelRatio(target: PickView["target"]): number {
  if (target.kind === "offscreen") {
    return 1;
  }
  const ratio = target.pixelRatio;
  if (!(typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0)) {
    throw new Error(
      "pickDesign: a canvas target must give a positive pixelRatio",
    );
  }
  return ratio;
}

/** Whether `p` is within `margin` metres of the tile volume. */
function nearVolume(
  volume: TileVolume,
  p: ArrayLike<number>,
  margin: number,
): boolean {
  const q = Float64Array.from([p[0]!, p[1]!, p[2]!]);
  if (volume.kind === "sphere") {
    return sphereDistance(volume.sphere, q) <= margin;
  }
  const box = volumeObb(volume);
  return box !== undefined && obbDistanceSquaredTo(box, q) <= margin * margin;
}

/**
 * Picks the surface under a position of `view`: `x` and `y` are CSS pixels
 * relative to the view's top-left. Resolves undefined over the sky. Design
 * coordinates come from the hit tileset's placement, only when that tileset
 * is in `tilesets`. The position and the feature are read on different frames:
 * if the camera moved in between the pick is tried once more, and if it still
 * moved only the position returns, with no tileset, feature or design.
 */
export async function pickDesign(
  view: PickView,
  x: number,
  y: number,
  tilesets: readonly Tileset3D[],
): Promise<DesignPick | undefined> {
  const ratio = targetPixelRatio(view.target);
  const px = x * ratio;
  const py = y * ratio;
  const cam = view.camera;

  for (let attempt = 0; attempt < 2; attempt++) {
    // The camera of the frame the position is read in.
    const version = cam.version;
    const eye = Float64Array.from([
      cam.position[0]!,
      cam.position[1]!,
      cam.position[2]!,
    ]);
    const rect = view.pixelRect();
    const height = rect.height;
    const fovy = cam.fovy(rect.width / height);
    const [position, feature] = await Promise.all([
      view.pickPosition(px, py),
      view.pick(px, py),
    ]);
    if (position === undefined) {
      return undefined;
    }
    const distance = Math.hypot(
      eye[0]! - position[0]!,
      eye[1]! - position[1]!,
      eye[2]! - position[2]!,
    );
    const tolerance = (distance * 2 * Math.tan(fovy / 2)) / (height / ratio);
    const moved =
      cam.version !== version ||
      cam.position[0] !== eye[0] ||
      cam.position[1] !== eye[1] ||
      cam.position[2] !== eye[2];
    if (moved) {
      if (attempt === 0) {
        continue;
      }
      return { body: view.body, position, tolerance };
    }

    let tileset: Tileset3D | undefined;
    let volume: TileVolume | undefined;
    if (feature !== undefined) {
      const draw = view.world.feature(feature.featureId)?.draw;
      if (draw !== undefined) {
        for (const t of tilesets) {
          const tile = t.isDestroyed() ? undefined : t.tileOfDraw(draw);
          if (tile !== undefined) {
            tileset = t;
            volume = tile.contentVolume ?? tile.volume;
            break;
          }
        }
      }
    }
    const placement = tileset?.placement;
    const inside =
      volume !== undefined && nearVolume(volume, position, tolerance + 1);
    return {
      body: view.body,
      position,
      ...(tileset !== undefined && { tileset }),
      ...(feature !== undefined && { feature }),
      ...(placement !== undefined &&
        inside && {
          design: designPoint(placement.frame, placement.designOf(position), {
            how: "pick",
            tolerance,
          }),
        }),
      tolerance,
    };
  }
  throw new Error("unreachable");
}
