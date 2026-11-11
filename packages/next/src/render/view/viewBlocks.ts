// Each view's uniform blocks for a tick: its camera, sun, lights and city lights.
import {
  MOON_ALBEDO,
  moonPhaseBrightness,
} from "../../atmosphere/moonLight.ts";
import { CityLight } from "../../globe/cityLight.ts";
import type { Cartographic } from "../../math/ellipsoid.ts";
import * as m4 from "../../math/mat4.ts";
import * as v3 from "../../math/vec3.ts";
import {
  writeViewBlock,
  VIEW_STRIDE,
  VIEW_BIT_WORD,
  viewBlockBytes,
} from "../layout.ts";
import { environmentFrame } from "./environment.ts";
import { drawsSky, drawsAerialPerspective } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import { observerPointSpread } from "../../scene/observer.ts";
import { computeAnchorEyes, writeAnchorEyes } from "../../scene/anchorEyes.ts";
import { moonFrom } from "../../scene/lightSources.ts";
import {
  packViewLights,
  LIGHTS_SIZE,
  LIGHT_HEADER_FLOATS,
  LIGHT_FLOATS,
} from "../../scene/lights.ts";
import type { PixelRect } from "../../scene/renderTarget.ts";
import { writeViewShadows } from "./shadowBlocks.ts";
import { starSubmission } from "../../atmosphere/starCells.ts";
import { observerShadowGain } from "../post/chain.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";

/** Rasterizer side, reading the scene's anchors: a view's uniform blocks. */
export interface ViewBlockEngine extends Pick<
  Engine,
  | "bodyCamera"
  | "ctx"
  | "icrfToFixed"
  | "moonAxes"
  | "moonPosition"
  | "reportFarAnchors"
  | "requestRender"
  | "sunDirection"
  | "tilesets"
  | "viewBit"
> {
  readonly raster: Pick<
    EngineRaster,
    | "captures"
    | "cascadeData"
    | "cascadeDataU32"
    | "cascadeStaging"
    | "cascades"
    | "cityLightPlaces"
    | "cityLightRead"
    | "cityLightSeen"
    | "cityLights"
    | "frameNumber"
    | "lightData"
    | "lightStaging"
    | "shadowData"
    | "sky"
    | "viewBlock"
    | "viewCityLight"
    | "viewData"
    | "viewDataU32"
    | "viewFrames"
    | "viewStaging"
  >;
  readonly scene: Pick<EngineScene, "anchorEyes" | "startTime">;
}

export const scratchView = m4.mat4();
const scratchProj = m4.mat4();
export const scratchViewProj = m4.mat4();
export const scratchPlanes = new Float32Array(20);
const scratchMoonAxis = v3.vec3();
const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};

/**
 * The light the ground around a view's camera emits, cd/m² (its
 * world's globe's night lights, cityLight.ts), for the sky's glow and
 * the environment's ground; 0 without them or `View.cityLights`. Read
 * again as the camera moves half a kilometer, or a tile arrives.
 */
function cityLightAt(engine: ViewBlockEngine, view: View): number {
  if (!view.cityLights) {
    return 0;
  }
  const provider = engine.tilesets.find(
    (t) => t.world === view.world && t.lights,
  )?.lights?.provider;
  if (!provider) {
    return 0;
  }
  let city = engine.raster.cityLights.get(provider);
  if (!city) {
    city = new CityLight(provider, () => {
      engine.raster.cityLightRead++;
      engine.requestRender();
    });
    engine.raster.cityLights.set(provider, city);
  }
  const c = view.body.ellipsoid.cartesianToCartographic(
    engine.bodyCamera(view).position,
    scratchCartographic,
  );
  if (!c) {
    return 0;
  }
  const last = engine.raster.cityLightPlaces.get(view);
  const moved = last
    ? Math.hypot(
        (c.longitude - last.longitude) * Math.cos(c.latitude),
        c.latitude - last.latitude,
      ) * 6_371_000
    : Infinity;
  if (
    last?.city === city &&
    moved < 500 &&
    engine.raster.cityLightRead === engine.raster.cityLightSeen
  ) {
    return last.light;
  }
  engine.raster.cityLightSeen = engine.raster.cityLightRead;
  const light = city.around(c.longitude, c.latitude);
  if (light === undefined) {
    // Its tiles on their way (they render again as they come).
    return last?.light ?? 0;
  }
  engine.raster.cityLightPlaces.set(view, {
    city,
    longitude: c.longitude,
    latitude: c.latitude,
    light,
  });
  return light;
}

/**
 * A view's point and spot lights, culled to it, camera-relative, into
 * its slot of the staging buffer (copied in before its opaque pass).
 */
function writeLights(
  engine: ViewBlockEngine,
  view: View,
  index: number,
  aspect: number,
): void {
  const frame = engine.raster.viewFrames.get(view)!;
  const camera = engine.bodyCamera(view);
  const tanY = Math.tan(camera.fovy(aspect) / 2);
  frame.tanY = tanY;
  const count = packViewLights(
    engine.raster.lightData,
    0,
    (visit) => view.world.forEachLight(visit),
    {
      position: camera.position,
      direction: camera.direction,
      up: camera.up,
      right: camera.right,
      near: camera.near,
      tanX: tanY * aspect,
      tanY,
    },
    view.exposureScale,
    engine.scene.anchorEyes,
  );
  frame.lightCount = count;
  engine.ctx.device.queue.writeBuffer(
    engine.raster.lightStaging,
    index * LIGHTS_SIZE,
    engine.raster.lightData,
    0,
    LIGHT_HEADER_FLOATS + count * LIGHT_FLOATS,
  );
}

export function writeView(
  engine: ViewBlockEngine,
  view: View,
  index: number,
  rect: Readonly<PixelRect>,
): void {
  const aspect = rect.width / rect.height;
  const camera = engine.bodyCamera(view);
  computeAnchorEyes(camera, view, engine.scene.anchorEyes);
  engine.reportFarAnchors(view);
  camera.viewRotation(scratchView);
  camera.projection(scratchProj, aspect);
  m4.multiply(scratchViewProj, scratchProj, scratchView);
  camera.frustumPlanes(scratchPlanes, aspect);
  const block = engine.raster.viewBlock;
  block.cameraPosition = camera.position;
  block.near = camera.near;
  block.aspect = aspect;
  block.width = rect.width;
  block.height = rect.height;
  block.iblFrame = environmentFrame(camera.position, view.body.ellipsoid);
  block.lighting = view.lighting;
  block.specularMaxLod = engine.ctx.environment.maxLod;
  block.exposure = view.exposureScale;
  block.body = view.body;
  block.cityLights = view.cityLights;
  block.time = (performance.now() - engine.scene.startTime) / 1000;
  engine.raster.viewCityLight = cityLightAt(engine, view);
  block.aerial = undefined;
  // The Moon's light: its full disk gives the albedo's share of the sun's
  // light times its solid angle over π, then less by phase (Allen).
  const moon = moonFrom(engine, camera.position);
  const moonShare = moon
    ? MOON_ALBEDO *
      moon.sinRadius *
      moon.sinRadius *
      moonPhaseBrightness(moon.phaseAngle)
    : 0;
  block.moon = moon && { direction: moon.direction, share: moonShare };
  // The air's light by the Moon: only by night (by day the sun's is a
  // million times more).
  if (moon) {
    const up = v3.normalize(scratchMoonAxis, camera.position);
    moon.airShare = v3.dot(up, engine.sunDirection) < 0 ? moonShare : 0;
  }
  block.moonAir = moon?.airShare ?? 0;
  if (drawsSky(view)) {
    const sky = engine.raster.viewFrames.get(view)!.sky;
    engine.raster.sky.write(
      sky,
      view.body.ellipsoid,
      camera,
      aspect,
      rect.width,
      rect.height,
      engine.sunDirection,
      view.exposureScale,
      view.sunDisk,
      observerPointSpread(view.observer),
      moon,
      engine.raster.viewCityLight,
    );
    engine.raster.sky.writeStars(
      sky,
      engine.icrfToFixed,
      starSubmission(view.world.submission, engine.ctx.caps),
      observerShadowGain(view.observer),
    );
    engine.raster.viewFrames.get(view)!.glare?.writeFrame(camera);
    if (drawsAerialPerspective(view)) {
      block.aerial = {
        start: sky.aerialStart,
        end: sky.aerialEnd,
        march: sky.march,
        screen: sky.screenHaze,
      };
    }
  }
  writeViewBlock(engine.raster.viewData, (index * VIEW_STRIDE) / 4, block);
  writeAnchorEyes(
    engine.raster.viewData,
    (index * VIEW_STRIDE) / 4,
    camera,
    view,
    engine.scene.anchorEyes,
  );
  engine.raster.viewDataU32[(index * VIEW_STRIDE) / 4 + VIEW_BIT_WORD] =
    engine.viewBit(view);
  const bytes = viewBlockBytes(engine.scene.anchorEyes.count);
  const frame = engine.raster.viewFrames.get(view)!;
  frame.viewBytes = bytes;
  // A pick of the view makes its own block from this one (`encodeDomainPick`).
  const at = (index * VIEW_STRIDE) / 4;
  if (frame.block?.length !== bytes / 4) {
    frame.block = new Float32Array(bytes / 4);
  }
  frame.block.set(engine.raster.viewData.subarray(at, at + bytes / 4));
  engine.ctx.device.queue.writeBuffer(
    engine.raster.viewStaging,
    index * VIEW_STRIDE,
    engine.raster.viewData,
    (index * VIEW_STRIDE) / 4,
    bytes / 4,
  );
  writeViewShadows(engine, view, index, aspect);
  writeLights(engine, view, index, aspect);
}
