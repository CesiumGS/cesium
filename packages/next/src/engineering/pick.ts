import type { Body } from "../scene/Body.ts";
import type { PickResult } from "../scene/View.ts";
import type { DrawHandle } from "../scene/world/types.ts";
import type { Tile } from "../streaming/Tile.ts";
import type { SceneItem } from "../scene/SceneItem.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  sphereDistance,
  obbDistanceSquaredTo,
  volumeObb,
  type TileVolume,
} from "../streaming/volumes.ts";
import type { CorePick, PickInterpreter } from "../scene/pick.ts";
import type { CoordinateOperation } from "../frames/coordinates.ts";
import { designPoint, type DesignPoint } from "./EngineeringFrame.ts";
import { DESIGN_NOT_INVERTED, engineeringPlacement } from "./placement.ts";
import type { DrawnThrough } from "../frames/drawn.ts";
import { truePick, type TruePick } from "../frames/pickTruth.ts";

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
  /**
   * The hit anchor's body (`AnchorHandle.body`), else the view's: the
   * view's for a `PickView` without `pickPoint`.
   */
  readonly body: Body;
  /**
   * Metres, in the hit anchor's coordinates (`CorePick.anchorPosition`'s
   * frame): body-fixed under a body anchor (Earth-fixed for content on the
   * Earth), else that anchor's own. Where the content is, as displayed by
   * its placement: under a warp the view draws it elsewhere (`drawn`), and
   * this is its domain point's true position (`CorePick.truePosition`), or
   * a provisional inverse of the drawn one (`provisional`). Body-fixed
   * always for a `PickView` without `pickPoint` (`pickPosition`).
   */
  readonly position: Float64Array;
  /** The listed tileset whose content was hit. */
  readonly tileset?: Tileset3D;
  /**
   * The item hit: which drawing of the tileset (a translucent one never is:
   * picks see through it).
   */
  readonly item?: SceneItem;
  readonly feature?: PickResult;
  /**
   * Present only for a hit on a listed tileset that has a placement, when
   * the position, the feature and the camera all come from one tick and
   * the hit tile's bounds contain the position. Drawn with a dual position, only at `t` exactly 0 or 1
   * (`SceneItem.georeference`).
   */
  readonly design?: DesignPoint<CoordinateOperation>;
  /**
   * Metres, a worst case: one CSS pixel's footprint at the hit, in true
   * metres (the pixel's drawn size over σ_min of the route, where the view
   * draws the content through a warp), plus the point's own bound where it
   * is one (an inverted drawn position's residual).
   */
  readonly tolerance: number;
  /**
   * What the view drew the hit content through, when through a warp
   * (`drawnThrough`): `position` is where the content is, and this says
   * where it is drawn differs. Absent when drawn as it is.
   */
  readonly drawn?: DrawnThrough;
  /** Where the hit is drawn (the view's render space), m, when `drawn`. */
  readonly drawnPosition?: Float64Array;
  /**
   * True where `position` is an estimate: no domain point was resolved and
   * the drawn position went back through the route's inverse.
   */
  readonly provisional?: boolean;
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
  /** The pick as a true point, from a core pick: its route, σ range and how it was found. */
  readonly truth?: TruePick;
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

export { DESIGN_NOT_INVERTED } from "./placement.ts";

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
    interpret: (core) => {
      const truth = truePick(core);
      return framed(
        core.anchor?.body ?? view.body,
        truth.position,
        core.feature,
        core.draw,
        core.camera,
        tilesets,
        truth,
      );
    },
  };
}

/**
 * `pickDesign`'s answer for a hit at `position` on `draw`, read with
 * `camera` (in `position`'s coordinates). With `truth` (a core pick's),
 * `position` is the true point and the tolerance is the pixel's in true
 * metres: the camera's coordinates are those the content is drawn in, and
 * a pixel there is at most 1/σ_min of that many true metres.
 */
function framed(
  body: Body,
  position: Float64Array,
  feature: PickResult | undefined,
  draw: DrawHandle | undefined,
  camera: PickCamera,
  tilesets: readonly Tileset3D[],
  truth?: TruePick,
): FramedPick {
  const distance = Math.hypot(
    camera.position[0]! - position[0]!,
    camera.position[1]! - position[1]!,
    camera.position[2]! - position[2]!,
  );
  const tolerance = truth
    ? truth.trueFootprint + truth.bound
    : (distance * 2 * Math.tan(camera.fovy / 2)) / camera.height;
  let tileset: Tileset3D | undefined;
  let volume: TileVolume | undefined;
  let hitDraw: DrawHandle | undefined;
  let hitTile: Tile | undefined;
  let item: SceneItem | undefined;
  if (feature !== undefined && draw !== undefined) {
    for (const t of tilesets) {
      const tile = t.isDestroyed() ? undefined : t.tileOfDraw(draw);
      if (tile !== undefined) {
        tileset = t;
        volume = tile.contentVolume ?? tile.volume;
        hitDraw = draw;
        hitTile = tile;
        item = t.itemOfDraw(draw);
        break;
      }
    }
  }
  const placement = engineeringPlacement(
    item !== undefined ? item.georeference : tileset?.placement,
  );
  const inside =
    volume !== undefined && nearVolume(volume, position, tolerance + 1);
  let design: DesignPoint<CoordinateOperation> | undefined;
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
    ...(item !== undefined && { item }),
    ...(feature !== undefined && { feature }),
    ...(design !== undefined && { design }),
    tolerance,
    ...(truth?.drawn !== undefined && { drawn: truth.drawn }),
    ...(truth?.drawnPosition !== undefined && {
      drawnPosition: truth.drawnPosition,
    }),
    ...(truth?.provisional === true && { provisional: true }),
  };
  return {
    pick,
    camera,
    ...(hitDraw !== undefined && { draw: hitDraw, tile: hitTile }),
    ...(truth !== undefined && { truth }),
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
