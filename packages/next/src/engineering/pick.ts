import type { Body } from "../scene/Body.ts";
import type { PickResult } from "../scene/View.ts";
import type { DrawHandle } from "../scene/World.ts";
import type { Tile } from "../streaming/Tile.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  sphereDistance,
  obbDistanceSquaredTo,
  volumeObb,
  type TileVolume,
} from "../streaming/volumes.ts";
import type { CorePick, PickInterpreter } from "../scene/pick.ts";
import { designPoint, type DesignPoint } from "./EngineeringFrame.ts";
import { engineeringPlacement } from "./placement.ts";

/**
 * The camera a pick's position and feature were read with, for projecting
 * into that same tick (`projectToPixel`): the core's (`CorePick.camera`),
 * named in this entry too; public as `SnapCamera`.
 */
export type PickCamera = CorePick["camera"];

/**
 * The part of a `View` that `pickDesign` uses, so tests can pass fakes.
 * `pick`, `pickPosition` and `pickPoint` take target (device) pixels
 * relative to the view's top-left; `camera.fovy` is the vertical field of
 * view for an aspect ratio (the scene's `Camera` stores the larger
 * dimension's), and `direction`, `up` and `right` its unit axes
 * (Earth-fixed).
 */
export interface PickView {
  /**
   * A `View`'s pick from one tick (`View.pickPoint`): with it, `pickDesign`
   * reads the position, the feature and the camera together. Without it,
   * it reads `pickPosition` and `pick` and checks the camera stayed put.
   */
  pickPoint?(x: number, y: number): Promise<CorePick | undefined>;
  pick(x: number, y: number): Promise<PickResult | undefined>;
  pickPosition(x: number, y: number): Promise<Float64Array | undefined>;
  readonly body: Body;
  readonly camera: {
    readonly position: ArrayLike<number>;
    readonly direction: ArrayLike<number>;
    readonly up: ArrayLike<number>;
    readonly right: ArrayLike<number>;
    /** Metres; nothing nearer is drawn (0 when absent). */
    readonly near?: number;
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
   * the position, the feature and the camera all come from one tick and
   * the hit tile's bounds contain the position.
   */
  readonly design?: DesignPoint;
  /** Metres: one CSS pixel's footprint at the hit. */
  readonly tolerance: number;
}

/** @internal `pickDesign`'s answer, with what snapping builds on. */
export interface FramedPick {
  readonly pick: DesignPick;
  /**
   * The camera the pick was read with, in the coordinates of `pick.position`.
   * Absent when a view without `pickPoint` kept its camera moving (the pick
   * then has no feature).
   */
  readonly camera?: PickCamera;
  /** The hit draw and its tile, on a listed tileset. */
  readonly draw?: DrawHandle;
  readonly tile?: Tile;
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

/** The hit tileset's warning when its placement can't invert a pick. */
export const DESIGN_NOT_INVERTED =
  "a pick on this tileset has no design coordinates: its placement can't invert the hit (outside the operation's domain, or at the body's centre)";

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
 * is in `tilesets`. On a `View`, the position (the hit draw's anchor's
 * coordinates: Earth-fixed for content on the Earth), the feature and the
 * camera are one tick's (`View.pickPoint`). A view without `pickPoint` gives
 * them on different frames: if the camera moved in between the pick is
 * tried once more, and if it still moved only the position returns, with
 * no tileset, feature or design. When the placement can't invert the hit
 * (`designOf` throws), the pick resolves without design coordinates and the
 * tileset warns (`DESIGN_NOT_INVERTED`).
 */
export async function pickDesign(
  view: PickView,
  x: number,
  y: number,
  tilesets: readonly Tileset3D[],
): Promise<DesignPick | undefined> {
  return (await pickInFrame(view, x, y, tilesets))?.pick;
}

const copy3 = (v: ArrayLike<number>) =>
  Float64Array.from([v[0]!, v[1]!, v[2]!]);
const same3 = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const sameRect = (
  r: { readonly width: number; readonly height: number },
  width: number,
  height: number,
) => r.width === width && r.height === height;

/**
 * @internal The engineering module's `PickInterpreter`: a core pick as
 * `pickDesign`'s answer, design coordinates from `tilesets`' placements.
 * The position is the pick's `anchorPosition`, and the camera its own (in
 * the same coordinates), so the eye and the hit come from one tick in one
 * anchor whatever the render root.
 */
export function designPickInterpreter(
  view: PickView,
  tilesets: readonly Tileset3D[],
): PickInterpreter<FramedPick> {
  return {
    interpret: (core) =>
      framed(
        core.anchor?.body ?? view.body,
        core.anchorPosition,
        core.feature,
        core.draw,
        core.camera,
        tilesets,
      ),
  };
}

/**
 * `pickDesign`'s answer for a hit at `position` on `draw`, read with
 * `camera` (in `position`'s coordinates).
 */
function framed(
  body: Body,
  position: Float64Array,
  feature: PickResult | undefined,
  draw: DrawHandle | undefined,
  camera: PickCamera,
  tilesets: readonly Tileset3D[],
): FramedPick {
  const distance = Math.hypot(
    camera.position[0]! - position[0]!,
    camera.position[1]! - position[1]!,
    camera.position[2]! - position[2]!,
  );
  const tolerance = (distance * 2 * Math.tan(camera.fovy / 2)) / camera.height;
  let tileset: Tileset3D | undefined;
  let volume: TileVolume | undefined;
  let hitDraw: DrawHandle | undefined;
  let hitTile: Tile | undefined;
  if (feature !== undefined && draw !== undefined) {
    for (const t of tilesets) {
      const tile = t.isDestroyed() ? undefined : t.tileOfDraw(draw);
      if (tile !== undefined) {
        tileset = t;
        volume = tile.contentVolume ?? tile.volume;
        hitDraw = draw;
        hitTile = tile;
        break;
      }
    }
  }
  const placement = engineeringPlacement(tileset?.placement);
  const inside =
    volume !== undefined && nearVolume(volume, position, tolerance + 1);
  let design: DesignPoint | undefined;
  if (placement !== undefined && inside) {
    try {
      design = designPoint(placement.frame, placement.designOf(position), {
        how: "pick",
        tolerance,
      });
    } catch {
      // The placement can't invert this hit (EngineeringFrame.fromBodyFixed
      // throws outside the operation's domain, or at the body's centre):
      // the true values stand, without design coordinates.
      tileset!.warnings.add(DESIGN_NOT_INVERTED);
    }
  }
  const pick: DesignPick = {
    body,
    position,
    ...(tileset !== undefined && { tileset }),
    ...(feature !== undefined && { feature }),
    ...(design !== undefined && { design }),
    tolerance,
  };
  return {
    pick,
    camera,
    ...(hitDraw !== undefined && { draw: hitDraw, tile: hitTile }),
  };
}

/**
 * @internal `pickDesign`, also giving the camera the answer was read with,
 * and the hit draw and tile.
 */
export async function pickInFrame(
  view: PickView,
  x: number,
  y: number,
  tilesets: readonly Tileset3D[],
): Promise<FramedPick | undefined> {
  const ratio = targetPixelRatio(view.target);
  const px = x * ratio;
  const py = y * ratio;
  if (view.pickPoint) {
    const core = await view.pickPoint(px, py);
    return core && designPickInterpreter(view, tilesets).interpret(core);
  }
  const cam = view.camera;

  for (let attempt = 0; attempt < 2; attempt++) {
    // The camera of the frame the position is read in.
    const version = cam.version;
    const eye = copy3(cam.position);
    const direction = copy3(cam.direction);
    const up = copy3(cam.up);
    const right = copy3(cam.right);
    const near = cam.near ?? 0;
    const rect = view.pixelRect();
    const width = rect.width;
    const height = rect.height;
    const fovy = cam.fovy(width / height);
    const [position, feature] = await Promise.all([
      view.pickPosition(px, py),
      view.pick(px, py),
    ]);
    if (position === undefined) {
      return undefined;
    }
    const camera: PickCamera = {
      position: eye,
      direction,
      up,
      right,
      fovy,
      near,
      width: width / ratio,
      height: height / ratio,
    };
    const moved =
      cam.version !== version ||
      !same3(cam.position, eye) ||
      !same3(cam.direction, direction) ||
      !same3(cam.up, up) ||
      (cam.near ?? 0) !== near ||
      cam.fovy(width / height) !== fovy ||
      !sameRect(view.pixelRect(), width, height);
    if (moved) {
      if (attempt === 0) {
        continue;
      }
      // Only the position: the feature may be another tick's.
      const { pick } = framed(
        view.body,
        position,
        undefined,
        undefined,
        camera,
        tilesets,
      );
      return { pick };
    }
    const draw =
      feature === undefined
        ? undefined
        : view.world.feature(feature.featureId)?.draw;
    return framed(view.body, position, feature, draw, camera, tilesets);
  }
  throw new Error("unreachable");
}
