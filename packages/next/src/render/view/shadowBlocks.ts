// Each view's shadow cascades and height captures for a tick: the blocks their
// passes read.
import type { Cartographic } from "../../math/ellipsoid.ts";
import * as m4 from "../../math/mat4.ts";
import * as v3 from "../../math/vec3.ts";
import type { Vec3 } from "../../math/vec3.ts";
import {
  writeViewBlock,
  VIEW_BIT_WORD,
  VIEW_TIME_WORD,
  viewBlockBytes,
  VIEW_STRIDE,
} from "../layout.ts";
import type { Engine } from "../../scene/Engine.ts";
import { AO_MAX_PIXELS } from "../../scene/RenderContext.ts";
import type { View } from "../../scene/View.ts";
import { writeAnchorEyes } from "../../scene/anchorEyes.ts";
import { shadowLight } from "../../scene/lightSources.ts";
import {
  fitShadowCascades,
  shadowRange,
  SHADOW_CASCADES,
  writeShadows,
  SHADOWS_STRIDE,
} from "../../scene/shadows.ts";
import { rotateVector } from "../../scene/tileSelection.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";

/** @internal Rasterizer side: the shadow cascades' and height captures' blocks. */
export interface ShadowBlockEngine extends Pick<
  Engine,
  | "bodyCamera"
  | "ctx"
  | "icrfToFixed"
  | "moonAxes"
  | "moonPosition"
  | "sunDirection"
  | "viewBit"
> {
  readonly raster: Pick<
    EngineRaster,
    | "captures"
    | "cascadeData"
    | "cascadeDataU32"
    | "cascadeStaging"
    | "cascades"
    | "frameNumber"
    | "shadowData"
    | "viewBlock"
    | "viewFrames"
  >;
  readonly scene: Pick<EngineScene, "anchorEyes">;
}

const scratchCaptureAnchor = new Float64Array(16);
const scratchCaptureOrigin = v3.vec3();
const scratchCaptureAxes = [v3.vec3(), v3.vec3(), v3.vec3()] as const;
const scratchAo = new Float32Array(16);

const scratchCapture = m4.mat4();
const scratchCapturePlanes = new Float32Array(20);
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};
const scratchSelection = m4.mat4();
const scratchSelectionInverse = m4.mat4();
const scratchSelectionBody = new Float64Array(16);

/**
 * A view's shadow cascades (when it has shadows and the sun is up where
 * the camera is): their view blocks, copies of the view's with the sun's
 * projection and box, and the receivers' uniform.
 */
/**
 * The height captures of `view`'s world not yet drawn this frame: their
 * block (the view's, with a straight-down orthographic projection over
 * the capture's square, its culling box, and View.time.y 1: ground
 * only), drawn by `view` (the `height-captures` pass).
 */
function writeCaptures(engine: ShadowBlockEngine, view: View): void {
  const block = engine.raster.viewBlock;
  const bodyCamera = engine.bodyCamera(view);
  const camera = bodyCamera.position;
  for (const c of engine.raster.captures) {
    if (c.world !== view.world || c.stamp === engine.raster.frameNumber) {
      continue;
    }
    c.stamp = engine.raster.frameNumber;
    c.by = view;
    let [e, n, u] = c.axes;
    let origin = c.origin;
    const body = view.bodyAnchor;
    if (c.anchor !== body) {
      // The block is in the body anchor's axes (the shading axes): the
      // capture's square re-expressed there, in float64.
      const m = m4.multiply(
        scratchSelection,
        m4.invertAffine(
          scratchSelectionInverse,
          view.anchorPlacement(body, scratchSelectionBody),
        ),
        view.anchorPlacement(c.anchor, scratchCaptureAnchor),
      );
      origin = m4.transformPoint(scratchCaptureOrigin, m, c.origin);
      e = rotateVector(m, e, scratchCaptureAxes[0]);
      n = rotateVector(m, n, scratchCaptureAxes[1]);
      u = rotateVector(m, u, scratchCaptureAxes[2]);
    }
    const rel = v3.sub(v3.vec3(), origin, camera);
    const h = c.halfExtent;
    const depth = c.top - c.bottom;
    const ce = v3.dot(e, rel);
    const cn = v3.dot(n, rel);
    const cu = v3.dot(u, rel);
    // Column-major: clip = M · (camera-relative p, 1), reverse-Z (top 1).
    const m = scratchCapture;
    m.fill(0);
    for (let k = 0; k < 3; k++) {
      m[k * 4] = e[k]! / h;
      m[k * 4 + 1] = n[k]! / h;
      m[k * 4 + 2] = u[k]! / depth;
    }
    m[12] = -ce / h;
    m[13] = -cn / h;
    m[14] = (-cu - c.bottom) / depth;
    m[15] = 1;
    // Culling: the square's four sides and its bottom.
    const p = scratchCapturePlanes;
    const plane = (i: number, a: Vec3, sign: number, w: number) => {
      p[i * 4] = a[0]! * sign;
      p[i * 4 + 1] = a[1]! * sign;
      p[i * 4 + 2] = a[2]! * sign;
      p[i * 4 + 3] = w;
    };
    plane(0, e, 1, -(ce - h));
    plane(1, e, -1, ce + h);
    plane(2, n, 1, -(cn - h));
    plane(3, n, -1, cn + h);
    plane(4, u, 1, -(cu + c.bottom));
    const viewProj = block.viewProj;
    const planes = block.planes;
    const aerial = block.aerial;
    block.viewProj = m;
    block.planes = p;
    block.aerial = undefined;
    writeViewBlock(c.data, 0, block);
    writeAnchorEyes(c.data, 0, bodyCamera, view, engine.scene.anchorEyes);
    block.viewProj = viewProj;
    block.planes = planes;
    block.aerial = aerial;
    new Uint32Array(c.data.buffer)[VIEW_BIT_WORD] = engine.viewBit(view);
    c.data[VIEW_TIME_WORD + 1] = 1; // View.time.y: ground only
    c.viewBytes = viewBlockBytes(engine.scene.anchorEyes.count);
    engine.ctx.device.queue.writeBuffer(c.block, 0, c.data, 0, c.viewBytes / 4);
  }
}

/** @internal */
export function writeViewShadows(
  engine: ShadowBlockEngine,
  view: View,
  index: number,
  aspect: number,
): void {
  const frame = engine.raster.viewFrames.get(view)!;
  const camera = engine.bodyCamera(view);
  const light = shadowLight(
    engine,
    view,
    camera.position,
    engine.raster.viewBlock.moon,
  );
  frame.shadowed = light !== undefined;
  const moonUp = light?.moon === true;
  const cascades = engine.raster.cascades;
  if (light) {
    const sun = light.direction;
    const c = view.body.ellipsoid.cartesianToCartographic(
      camera.position,
      scratchCartographic,
    );
    fitShadowCascades(
      cascades,
      camera,
      aspect,
      sun,
      Math.max(c?.height ?? 0, 2),
      (frame.cascadeRange = shadowRange(frame.cascadeRange, frame.depthRange)),
    );
    const block = engine.raster.viewBlock;
    const viewProj = block.viewProj;
    const planes = block.planes;
    const aerial = block.aerial;
    block.aerial = undefined;
    for (let k = 0; k < SHADOW_CASCADES; k++) {
      const o = ((index * SHADOW_CASCADES + k) * VIEW_STRIDE) / 4;
      block.viewProj = cascades.matrices.subarray(k * 16, k * 16 + 16);
      block.planes = cascades.planes[k]!;
      writeViewBlock(engine.raster.cascadeData, o, block);
      writeAnchorEyes(
        engine.raster.cascadeData,
        o,
        camera,
        view,
        engine.scene.anchorEyes,
      );
      engine.raster.cascadeDataU32[o + VIEW_BIT_WORD] = engine.viewBit(view);
      engine.raster.cascadeData[o + VIEW_TIME_WORD + 2] = 1; // View.time.z: casters too
      engine.ctx.device.queue.writeBuffer(
        engine.raster.cascadeStaging,
        o * 4,
        engine.raster.cascadeData,
        o,
        frame.viewBytes / 4,
      );
    }
    block.viewProj = viewProj;
    block.planes = planes;
    block.aerial = aerial;
  }
  writeCaptures(engine, view);
  // Ambient occlusion: its prepass and kernels' parameters.
  frame.ambient =
    view.ambientOcclusion && frame.width * frame.height <= AO_MAX_PIXELS;
  if (frame.ambient) {
    const tanY = Math.tan(camera.fovy(aspect) / 2);
    const a = scratchAo;
    a.set(camera.right, 0);
    a[3] = tanY * aspect;
    a.set(camera.up, 4);
    a[7] = tanY;
    a.set(camera.direction, 8);
    a[11] = camera.near;
    a[12] = frame.width;
    a[13] = frame.height;
    a[14] = view.ambientOcclusionRadius;
    a[15] = Math.max(32, 0.15 * frame.height);
    engine.ctx.device.queue.writeBuffer(frame.aoParams, 0, a);
  }
  writeShadows(
    engine.raster.shadowData,
    (index * SHADOWS_STRIDE) / 4,
    cascades,
    camera.direction,
    frame.shadowed,
    frame.ambient,
    frame.shadowed && moonUp,
  );
}
