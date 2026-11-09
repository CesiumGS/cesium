// What each tileset selects for: the views' cameras, ahead of motion, and the
// shadow cascades' casters; and the tick's turn and upload budget for tilesets.
import { type Cartographic, Ellipsoid } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Camera } from "./Camera.ts";
import type { Engine } from "./Engine.ts";
import type { View } from "./View.ts";
import type { World } from "./World.ts";
import type { AnchorHandle } from "./world/types.ts";
import { shadowLight, moonFrom } from "./lightSources.ts";
import { CanvasTarget } from "./renderTarget.ts";
import { fitShadowCascades, casterPlanes } from "./shadows.ts";
import type { SelectionView } from "../streaming/Stepwise.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type { EngineRaster } from "../render/view/engineRaster.ts";
import type { EngineScene } from "./engineScene.ts";

/** Scene side, reading the rasterizer's view targets: what tilesets select for, and the tick's upload budget. */
export interface SelectionEngine extends Pick<
  Engine,
  | "bodyCamera"
  | "clamping"
  | "icrfToFixed"
  | "maximumUploadBytesPerFrame"
  | "minimumUploadBytesPerFrame"
  | "moonAxes"
  | "moonPosition"
  | "sunDirection"
  | "tilesets"
  | "treeBuildMsPerFrame"
  | "uploadBytesPerFrame"
  | "views"
> {
  readonly raster: Pick<EngineRaster, "viewFrames">;
  readonly scene: Pick<
    EngineScene,
    | "aheadCamera"
    | "budgetFilled"
    | "frameIntervalCount"
    | "frameIntervals"
    | "lastUpdateAt"
    | "lastUpdateInterval"
    | "selectionAhead"
    | "selectionCascades"
    | "selections"
    | "tilesetRotation"
    | "uploadBudget"
    | "viewIds"
    | "viewMotion"
  >;
}

/**
 * Prefetching looks this far ahead: content the camera would reveal in
 * this time at its current velocity loads before it comes into view (about
 * a load's latency).
 */
const PREFETCH_AHEAD_SECONDS = 1;
/** The prefetch frustum's margin (tangent scale) around that view. */
const PREFETCH_MARGIN = 1.1;

/** A view's camera at its last selection, and its velocity per second. */
export interface ViewMotion {
  at: number;
  position: Vec3;
  direction: Vec3;
  up: Vec3;
  velocity: { position: Vec3; direction: Vec3; up: Vec3 };
  /** Speeds of the last estimate (position m/s, direction 1/s). */
  speeds: [number, number];
  /**
   * The velocity continues the previous one: motion, not a jump. A camera
   * set somewhere else in one frame (a teleport, a flight's end) reads as
   * thousands of meters per second for that frame; prefetching a second
   * ahead of it requested content nowhere near the view.
   */
  steady: boolean;
}

/** `m` (rigid, column-major) times a vector, without its translation. */
export function rotateVector(
  m: ArrayLike<number>,
  v: ArrayLike<number>,
  out: Vec3,
) {
  const x = v[0]!,
    y = v[1]!,
    z = v[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z;
  return out;
}

/** A camera moved by `m` (rigid): written into `out`, which is returned. */
function transformCamera(m: m4.Mat4, from: Camera, out: Camera): Camera {
  out.copyFrom(from);
  m4.transformPoint(out.position, m, from.position);
  rotateVector(m, from.direction, out.direction);
  rotateVector(m, from.up, out.up);
  rotateVector(m, from.right, out.right);
  return out;
}
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};
const scratchSelection = m4.mat4();
const scratchSelectionInverse = m4.mat4();
const scratchSelectionBody = new Float64Array(16);
const scratchCasters = m4.mat4();
const scratchCastersInverse = m4.mat4();
const scratchCastersBody = new Float64Array(16);

/**
 * The selection inputs of the tilesets under `anchor` in `world`, made
 * once per update (`updateTilesets`) and shared by those tilesets: per
 * view, a cost per anchor with tilesets, not per tileset (plan 5a's call
 * 21).
 */
function selectionFor(
  engine: SelectionEngine,
  world: World,
  anchor: AnchorHandle,
): SelectionView[] {
  let byAnchor = engine.scene.selections.get(world);
  if (!byAnchor) {
    byAnchor = new Map();
    engine.scene.selections.set(world, byAnchor);
  }
  let views = byAnchor.get(anchor);
  if (!views) {
    views = selectionViews(engine, world, anchor);
    byAnchor.set(anchor, views);
  }
  return views;
}

/**
 * Builds the selection inputs for every enabled view of `world`, with
 * each view's camera in `anchor` (`View.anchorCamera`): positions,
 * directions, planes and the camera's cartographic are in the anchor's
 * coordinates (Earth-fixed for the Earth's). In the view's body anchor
 * it is the body camera, as drawn.
 */
function selectionViews(
  engine: SelectionEngine,
  world: World,
  anchor: AnchorHandle,
): SelectionView[] {
  const out: SelectionView[] = [];
  for (const view of engine.views) {
    if (!view.enabled || view.world !== world) {
      continue;
    }
    const rect = view.pixelRect();
    const aspect = rect.width / rect.height;
    const body = view.bodyAnchor;
    const inBody = anchor === body;
    // Each view its own camera: its SelectionView keeps the arrays.
    const camera = inBody ? engine.bodyCamera(view) : view.anchorCamera(anchor);
    const p = camera.position;
    const d = camera.direction;
    // World-space planes in float64: camera-relative planes shifted by the
    // camera position, plus 1.x's far plane (5e8 m).
    const worldPlanes = (c: Camera, widen: number) => {
      const planes = new Float64Array(24);
      const cp = c.position;
      const cd = c.direction;
      c.frustumPlanes(planes, aspect, widen);
      for (let k = 0; k < 5; k++) {
        planes[k * 4 + 3] =
          planes[k * 4 + 3]! -
          (planes[k * 4]! * cp[0]! +
            planes[k * 4 + 1]! * cp[1]! +
            planes[k * 4 + 2]! * cp[2]!);
      }
      planes[20] = -cd[0]!;
      planes[21] = -cd[1]!;
      planes[22] = -cd[2]!;
      planes[23] = cd[0]! * cp[0]! + cd[1]! * cp[1]! + cd[2]! * cp[2]! + 5e8;
      return planes;
    };
    const planes = worldPlanes(camera, 1);
    const casters = selectionCasters(engine, view, anchor, camera, aspect);
    // Prefetch: the view the camera will have shortly at its current
    // velocity, so only content it is about to reveal loads ahead. None
    // while it is still: a margin around a still view (r37) was half the
    // bytes of a jump into OSM Philadelphia, rarely drawn (L1′).
    let ahead = cameraAhead(engine, view, PREFETCH_AHEAD_SECONDS);
    let motion = ahead && motionOf(engine, view);
    if (ahead && motion && !inBody) {
      // Measured in the body anchor: re-expressed in this one.
      const m = m4.multiply(
        scratchSelection,
        m4.invertAffine(scratchSelectionInverse, view.anchorPlacement(anchor)),
        view.anchorPlacement(body, scratchSelectionBody),
      );
      ahead = transformCamera(m, ahead, engine.scene.selectionAhead);
      motion = {
        velocity: rotateVector(m, motion.velocity, v3.vec3()),
        angular: rotateVector(m, motion.angular, v3.vec3()),
      };
    }
    const pixelRatio =
      view.target instanceof CanvasTarget ? view.target.pixelRatio : 1;
    out.push({
      id: engine.scene.viewIds.get(view)!,
      position: p,
      direction: d,
      cartographic: Ellipsoid.WGS84.cartesianToCartographic(p, {
        longitude: 0,
        latitude: 0,
        height: 0,
      }) ?? { longitude: 0, latitude: 0, height: 0 },
      planes,
      ...(casters ? { casterPlanes: casters } : {}),
      ...(ahead && motion
        ? {
            prefetchPlanes: worldPlanes(ahead, PREFETCH_MARGIN),
            motion,
          }
        : {}),
      sseDenominator: 2 * Math.tan(camera.fovy(aspect) / 2),
      height: rect.height / pixelRatio,
      pixelRatio,
    });
  }
  return out;
}

/**
 * Where `view`'s shadow casters may stand, for selection, in `anchor`'s
 * coordinates (`camera`, the view's there): the cascades as fitted now,
 * from the last depth range; undefined without shadows.
 */
function selectionCasters(
  engine: SelectionEngine,
  view: View,
  anchor: AnchorHandle,
  camera: Camera,
  aspect: number,
): Float64Array | undefined {
  const body = engine.bodyCamera(view);
  const light = shadowLight(
    engine,
    view,
    body.position,
    moonFrom(engine, body.position),
  );
  if (!light) {
    return undefined;
  }
  let direction: ArrayLike<number> = light.direction;
  if (anchor !== view.bodyAnchor) {
    // The light is in the body anchor's axes: re-expressed in this one.
    const m = m4.multiply(
      scratchCasters,
      m4.invertAffine(scratchCastersInverse, view.anchorPlacement(anchor)),
      view.anchorPlacement(view.bodyAnchor, scratchCastersBody),
    );
    direction = rotateVector(m, light.direction, v3.vec3());
  }
  const height = view.body.ellipsoid.cartesianToCartographic(
    body.position,
    scratchCartographic,
  )?.height;
  const frame = engine.raster.viewFrames.get(view);
  fitShadowCascades(
    engine.scene.selectionCascades,
    camera,
    aspect,
    direction,
    Math.max(height ?? 0, 2),
    frame?.cascadeRange,
  );
  return casterPlanes(engine.scene.selectionCascades, camera.position);
}

/**
 * `view`'s camera extrapolated `seconds` ahead at its velocity (measured
 * between selections at least 4 ms apart; still after a pause of over
 * 250 ms, as on-demand rendering idles).
 */
/** The view's steady motion (`cameraAhead` measured it this selection). */
function motionOf(
  engine: SelectionEngine,
  view: View,
): { velocity: Vec3; angular: Vec3 } | undefined {
  const motion = engine.scene.viewMotion.get(view);
  return motion
    ? {
        velocity: motion.velocity.position,
        angular: v3.cross(
          v3.vec3(),
          engine.bodyCamera(view).direction,
          motion.velocity.direction,
        ),
      }
    : undefined;
}

function cameraAhead(
  engine: SelectionEngine,
  view: View,
  seconds: number,
): Camera | undefined {
  const camera = engine.bodyCamera(view);
  const now = performance.now();
  let motion = engine.scene.viewMotion.get(view);
  if (!motion) {
    motion = {
      at: now,
      position: v3.copy(v3.vec3(), camera.position),
      direction: v3.copy(v3.vec3(), camera.direction),
      up: v3.copy(v3.vec3(), camera.up),
      velocity: { position: v3.vec3(), direction: v3.vec3(), up: v3.vec3() },
      speeds: [0, 0],
      steady: false,
    };
    engine.scene.viewMotion.set(view, motion);
  }
  const dt = (now - motion.at) / 1000;
  if (dt >= 0.004) {
    const v = motion.velocity;
    const still = dt > 0.25;
    for (const key of ["position", "direction", "up"] as const) {
      const current = camera[key];
      for (let i = 0; i < 3; i++) {
        v[key][i] = still ? 0 : (current[i]! - motion[key][i]!) / dt;
      }
      v3.copy(motion[key], current);
    }
    motion.at = now;
    // Steady: each speed zero, or within 4x of the previous estimate's.
    const speeds = [v3.length(v.position), v3.length(v.direction)];
    motion.steady = speeds.every(
      (s, i) =>
        s === 0 ||
        (motion!.speeds[i]! > 0 &&
          s <= 4 * motion!.speeds[i]! &&
          s >= motion!.speeds[i]! / 4),
    );
    motion.speeds = speeds as [number, number];
  }
  if (!motion.steady || motion.speeds.every((s) => s === 0)) {
    return undefined;
  }
  const ahead = engine.scene.aheadCamera.copyFrom(camera);
  const v = motion.velocity;
  for (let i = 0; i < 3; i++) {
    ahead.position[i] = camera.position[i]! + v.position[i]! * seconds;
    ahead.direction[i] = camera.direction[i]! + v.direction[i]! * seconds;
    ahead.up[i] = camera.up[i]! + v.up[i]! * seconds;
  }
  v3.normalize(ahead.direction, ahead.direction);
  return ahead.orient(v3.normalize(ahead.up, ahead.up));
}

/**
 * Runs selection, requests and uploads for the tilesets `due` picks,
 * starting with a different one each frame so none starves the others
 * of the shared upload budget.
 */
export function updateTilesets(
  engine: SelectionEngine,
  due: (tileset: Tileset3D) => boolean,
): void {
  adaptUploadBudget(engine, performance.now());
  // Budgets are per 60 Hz frame; a faster loop gets its share by time.
  const share = Math.min(1, engine.scene.lastUpdateInterval / (1000 / 60));
  engine.scene.uploadBudget.bytes = engine.uploadBytesPerFrame * share;
  engine.scene.uploadBudget.uploads = 0;
  engine.scene.uploadBudget.ms = engine.treeBuildMsPerFrame * share;
  engine.scene.uploadBudget.trees = 0;
  const n = engine.tilesets.length;
  const start = n > 0 ? engine.scene.tilesetRotation++ % n : 0;
  engine.scene.selections.clear();
  for (let k = 0; k < n; k++) {
    const tileset = engine.tilesets[(start + k) % n]!;
    if (due(tileset)) {
      tileset.update(selectionFor(engine, tileset.world, tileset.anchor));
    }
  }
  engine.scene.selections.clear();
  engine.scene.budgetFilled = engine.scene.uploadBudget.bytes <= 0;
  // After the tilesets: their loads and unloads announce height changes.
  engine.clamping.update();
}

/**
 * The upload budget from the time between updates: late (over 1.5× the
 * recent median and 8 ms more) halves it; on time with the budget used
 * up grows it by a quarter. Gaps over a second (hidden
 * tab, paused loop) are ignored.
 */
function adaptUploadBudget(engine: SelectionEngine, now: number): void {
  const interval = now - engine.scene.lastUpdateAt;
  engine.scene.lastUpdateAt = now;
  if (interval <= 0 || interval > 1000) {
    return;
  }
  engine.scene.lastUpdateInterval = interval;
  const intervals = engine.scene.frameIntervals;
  intervals[engine.scene.frameIntervalCount++ % intervals.length] = interval;
  const count = Math.min(engine.scene.frameIntervalCount, intervals.length);
  if (count < 8) {
    return;
  }
  const median = Float64Array.from(intervals.subarray(0, count)).sort()[
    count >> 1
  ]!;
  if (interval > Math.max(1.5 * median, median + 8)) {
    engine.uploadBytesPerFrame = Math.max(
      engine.minimumUploadBytesPerFrame,
      engine.uploadBytesPerFrame / 2,
    );
  } else if (engine.scene.budgetFilled) {
    // Proportional growth reaches what a big tileset needs within a few
    // frames (a quarter MiB per frame left Google 1.1 s slower).
    engine.uploadBytesPerFrame = Math.min(
      engine.maximumUploadBytesPerFrame,
      engine.uploadBytesPerFrame * 1.25,
    );
  }
}
