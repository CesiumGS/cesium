// Picks: the pick pass's encoding, and reading its answers back into a tick's
// camera and placements.
import { Globe } from "../../globe/Globe.ts";
import type { ViewFrame } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import {
  type PickTick,
  corePick,
  depthDistance,
  pickResult,
} from "../../scene/pick.ts";
import { CanvasTarget } from "../../scene/renderTarget.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";

/** @internal Rasterizer side, reading the scene's view ids: encoding picks and reading their answers. */
export interface PickEngine extends Pick<
  Engine,
  "bodyCamera" | "cameras" | "ctx" | "tilesets" | "views"
> {
  readonly raster: Pick<
    EngineRaster,
    | "commandBuffers"
    | "pickParams"
    | "pickParamsData"
    | "pickReadback"
    | "pickResult"
    | "picks"
    | "viewFrames"
  >;
  readonly scene: Pick<EngineScene, "viewIds">;
}

/**
 * Maps a readback buffer for reading, then calls `then`. The mapping is
 * abandoned without error when the engine is destroyed first.
 */
export function whenMapped(buffer: GPUBuffer, then: () => void): void {
  void buffer.mapAsync(GPUMapMode.READ).then(then, (error: unknown) => {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      throw error;
    }
  });
}

export interface PendingPick {
  view: View;
  readback: GPUBuffer;
  request: View["pendingPicks"][number];
  /** What a `View.pickPoint` keeps of its tick. */
  tick: PickTick | undefined;
  /** The body anchor's camera, for a `View.pickPosition`. */
  camera: PendingCamera | undefined;
  /**
   * Translucent terrain the pick stops at, nearer than the GPU's hit or
   * not (`translucentTerrainPick`).
   */
  translucent: { depth: number; featureId: number } | undefined;
}

interface PendingCamera {
  position: Float64Array;
  direction: Float64Array;
  up: Float64Array;
  right: Float64Array;
  near: number;
  tanX: number;
  tanY: number;
  ndcX: number;
  ndcY: number;
}
const PICK_PASS: GPUComputePassDescriptor = { label: "pick" };
const PICK_ENCODER: GPUCommandEncoderDescriptor = { label: "pick" };

/**
 * Environment-map frame at `position`: x = east, y = up, z = −north, the y-up
 * convention CesiumJS 1.x also uses for image-based lighting.
 */
/** An IEEE half-precision float's value. */
export function halfToFloat(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exponent = (h >> 10) & 0x1f;
  const fraction = h & 0x3ff;
  if (exponent === 0) {
    return sign * 2 ** -14 * (fraction / 1024);
  }
  if (exponent === 31) {
    return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** @internal */
export function encodePick(
  engine: PickEngine,
  enc: GPUCommandEncoder,
  view: View,
  frame: ViewFrame,
  request: View["pendingPicks"][number],
): void {
  const { device, pipelines } = engine.ctx;
  const { width, height } = frame;
  engine.raster.pickParamsData[0] = Math.min(
    Math.max(Math.floor(request.x), 0),
    width - 1,
  );
  engine.raster.pickParamsData[1] = Math.min(
    Math.max(Math.floor(request.y), 0),
    height - 1,
  );
  device.queue.writeBuffer(
    engine.raster.pickParams,
    0,
    engine.raster.pickParamsData,
  );
  const group = device.createBindGroup({
    layout: pipelines.pick.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: frame.idsView },
      { binding: 1, resource: { buffer: engine.raster.pickParams } },
      { binding: 2, resource: { buffer: engine.raster.pickResult } },
      { binding: 3, resource: frame.depthView },
    ],
  });
  const pass = enc.beginComputePass(PICK_PASS);
  pass.setPipeline(pipelines.pick);
  pass.setBindGroup(0, group);
  pass.dispatchWorkgroups(1);
  pass.end();
  const readback =
    engine.raster.pickReadback.pop() ??
    device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  enc.copyBufferToBuffer(engine.raster.pickResult, 0, readback, 0, 16);
  const tanY = Math.tan(view.camera.fovy(width / height) / 2);
  const tanX = tanY * (width / height);
  const ndcX = ((engine.raster.pickParamsData[0]! + 0.5) / width) * 2 - 1;
  const ndcY = 1 - ((engine.raster.pickParamsData[1]! + 0.5) / height) * 2;
  engine.raster.picks.push({
    view,
    readback,
    request,
    tick:
      request.resolvePoint &&
      pickTick(engine, view, frame, tanX, tanY, ndcX, ndcY),
    camera:
      request.resolvePosition &&
      positionCamera(engine, view, tanX, tanY, ndcX, ndcY),
    translucent: translucentTerrainPick(engine, view, tanX, tanY, ndcX, ndcY),
  });
}

/**
 * Ground below full opacity that a pick stops at (a region of
 * `Globe.terrain` without `pickThrough`): the opaque pass the pick reads doesn't hold it,
 * so the drawn terrain is traced on the CPU along the pick's ray, in the
 * tick the pick reads, and its depth and feature are kept to stand in for
 * the GPU's where they are nearer (`resolvePicks`). Undefined without
 * such terrain on the ray.
 */
function translucentTerrainPick(
  engine: PickEngine,
  view: View,
  tanX: number,
  tanY: number,
  ndcX: number,
  ndcY: number,
): { depth: number; featureId: number } | undefined {
  const globes = engine.tilesets.filter(
    (t): t is Globe =>
      t instanceof Globe &&
      t.world === view.world &&
      t.show &&
      t.anchor === view.bodyAnchor,
  );
  if (globes.length === 0) {
    return undefined;
  }
  const camera = engine.bodyCamera(view);
  // Along the view axis this direction is 1 long, so distances along it
  // are the depth's.
  const direction = [0, 1, 2].map(
    (k) =>
      camera.direction[k]! +
      ndcX * tanX * camera.right[k]! +
      ndcY * tanY * camera.up[k]!,
  );
  const id = engine.scene.viewIds.get(view);
  const mask = id === undefined ? undefined : 1 << id;
  let best: { depth: number; featureId: number } | undefined;
  for (const globe of globes) {
    const hit = globe.stoppingTerrainHit(camera.position, direction, mask);
    if (!hit || !(hit.distance >= camera.near)) {
      continue;
    }
    // Reverse-Z, infinite far (`depthDistance`).
    const depth = camera.near / hit.distance;
    if (best === undefined || depth > best.depth) {
      best = {
        depth,
        featureId:
          hit.draw === undefined ? 0 : view.world.featureIdOf(hit.draw),
      };
    }
  }
  return best;
}

/**
 * The camera of this tick in the body anchor (as drawn), to turn a
 * `pickPosition`'s depth into a position.
 */
function positionCamera(
  engine: PickEngine,
  view: View,
  tanX: number,
  tanY: number,
  ndcX: number,
  ndcY: number,
): PendingCamera {
  const camera = engine.bodyCamera(view);
  return {
    position: Float64Array.from(camera.position),
    direction: Float64Array.from(camera.direction),
    up: Float64Array.from(camera.up),
    right: Float64Array.from(camera.right),
    near: camera.near,
    tanY,
    tanX,
    ndcX,
    ndcY,
  };
}

/**
 * What a pick keeps of the tick it reads (`View.pickPoint`, plan 5a's
 * Review Focus 3): the view's camera in render space, its placements, its
 * render root and the scene time, as of the image the pick pass reads. A
 * view picked while idle hasn't moved since that image (its on-demand
 * fingerprint holds its camera and placements), and `frame.seconds` is
 * that image's.
 */
function pickTick(
  engine: PickEngine,
  view: View,
  frame: ViewFrame,
  tanX: number,
  tanY: number,
  ndcX: number,
  ndcY: number,
): PickTick {
  const c = view.camera;
  const ratio =
    view.target instanceof CanvasTarget ? view.target.pixelRatio : 1;
  return {
    view,
    world: view.world,
    root: engine.cameras.root(view),
    seconds: frame.seconds,
    bodyAnchor: view.bodyAnchor,
    placements: view.pickPlacements(),
    camera: {
      position: Float64Array.from(c.position),
      direction: Float64Array.from(c.direction),
      up: Float64Array.from(c.up),
      right: Float64Array.from(c.right),
    },
    near: c.near,
    fovy: c.fovy(frame.width / frame.height),
    width: frame.width / ratio,
    height: frame.height / ratio,
    tanX,
    tanY,
    ndcX,
    ndcY,
  };
}

export function resolvePicks(engine: PickEngine, picks: PendingPick[]): void {
  for (const pick of picks) {
    const { view, readback, request, camera: c, tick } = pick;
    whenMapped(readback, () => {
      const words = new Uint32Array(readback.getMappedRange());
      let featureId = words[0]!;
      let depth = new Float32Array(words.buffer, 4, 1)[0]!;
      readback.unmap();
      // Translucent terrain nearer than what the opaque pass holds
      // (reverse-Z: nearer is greater) stands in for it.
      const translucent = pick.translucent;
      if (translucent && translucent.depth > depth) {
        featureId = translucent.featureId;
        depth = translucent.depth;
      }
      engine.raster.pickReadback.push(readback);
      if (request.resolvePoint) {
        request.resolvePoint(corePick(tick!, featureId, depth));
        return;
      }
      if (request.resolvePosition && c) {
        // Reverse-Z, infinite far: distance along the view axis is
        // near / depth (`depthDistance`).
        const z = depthDistance(c.near, depth);
        if (z === undefined) {
          request.resolvePosition(undefined);
          return;
        }
        const p = new Float64Array(3);
        for (let i = 0; i < 3; i++) {
          p[i] =
            c.position[i]! +
            z *
              (c.direction[i]! +
                c.ndcX * c.tanX * c.right[i]! +
                c.ndcY * c.tanY * c.up[i]!);
        }
        request.resolvePosition(p);
        return;
      }
      request.resolve!(pickResult(featureId, view.world.feature(featureId)));
    });
  }
}

/**
 * Serves one pick of a view that doesn't render this tick from its last
 * frame's feature IDs and depth, which still show what is on screen: just
 * the pick pass, no render (hovering picks on every pointer move).
 */
export function serveIdlePick(engine: PickEngine, rendering: Set<View>): void {
  const views = engine.views;
  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    const frame = engine.raster.viewFrames.get(view);
    if (
      !view.enabled ||
      rendering.has(view) ||
      view.pendingPicks.length === 0 ||
      !frame?.rendered
    ) {
      continue;
    }
    const encoder = engine.ctx.device.createCommandEncoder(PICK_ENCODER);
    encodePick(engine, encoder, view, frame, view.pendingPicks.shift()!);
    engine.raster.commandBuffers[0] = encoder.finish();
    engine.ctx.device.queue.submit(engine.raster.commandBuffers);
    resolvePicks(engine, engine.raster.picks);
    engine.raster.picks.length = 0;
    return; // one per tick: the params and result buffers are shared
  }
}
