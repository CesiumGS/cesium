// The bodies of a view's passes up to the opaque image. buildViewFrame registers
// them, and its order is the GPU's.
import type { TextureHandle } from "../FrameGraph.ts";
import { VIEW_STRIDE } from "../layout.ts";
import { encodeEnvironment } from "./environment.ts";
import {
  type ViewFrame,
  type PassBody,
  drawsSky,
  drawsAerialPerspective,
} from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import {
  LIGHTS_SIZE,
  LIGHT_HEADER_FLOATS,
  LIGHT_FLOATS,
  CLUSTERS,
} from "../../scene/lights.ts";
import {
  SHADOW_CASCADES,
  SHADOWS_STRIDE,
  SHADOWS_SIZE,
} from "../../scene/shadows.ts";
import type { EngineRaster } from "./engineRaster.ts";
import { encodeClipTable } from "./clipTable.ts";

/** Rasterizer side: pass bodies up to the opaque image. */
export interface ScenePassEngine extends Pick<
  Engine,
  "bodyCamera" | "ctx" | "stats" | "sunDirection"
> {
  readonly raster: Pick<
    EngineRaster,
    | "captures"
    | "cascadeStaging"
    | "darkProbe"
    | "frameNumber"
    | "lightStaging"
    | "probes"
    | "shadowStaging"
    | "sky"
    | "timer"
    | "viewBlock"
    | "viewCityLight"
    | "viewStaging"
  >;
}

export function shadowsPass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  // The sun's shadow maps: per cascade, its block in place of the view's,
  // the world culled to the sun's box and its casters drawn.
  const shadowDepth: GPURenderPassDepthStencilAttachment = {
    view: undefined as never,
    depthClearValue: 0, // reverse-Z: farthest from the sun is 0
    depthLoadOp: "clear",
    depthStoreOp: "store",
  };
  const shadowPass: GPURenderPassDescriptor = {
    label: "shadow",
    colorAttachments: [],
    depthStencilAttachment: shadowDepth,
  };
  return (enc) => {
    // The view's clip table first: every pass of the view that draws, this
    // one's casters included, reads it.
    encodeClipTable(engine, enc, frame);
    if (!frame.shadowed) {
      return;
    }
    const casters =
      (frame.clipBytes > 0 && view.world.clippedBundle("shadow")) ||
      view.world.shadowBundle();
    for (let k = 0; k < SHADOW_CASCADES; k++) {
      enc.copyBufferToBuffer(
        engine.raster.cascadeStaging,
        (frame.slot * SHADOW_CASCADES + k) * VIEW_STRIDE,
        engine.ctx.currentViewBuffer,
        0,
        frame.viewBytes,
      );
      // Point sets cast no shadows: their cull is the view's alone.
      view.world.encodeCull(enc, undefined, false);
      shadowDepth.view = engine.ctx.shadowLayers[k]!;
      shadowPass.timestampWrites = engine.raster.timer.passWrites("shadows");
      const pass = enc.beginRenderPass(shadowPass);
      pass.executeBundles([casters]);
      pass.end();
    }
  };
}

export function heightCapturesPass(
  engine: ScenePassEngine,
  view: View,
): PassBody {
  return (enc) => {
    for (const c of engine.raster.captures) {
      if (c.by !== view || c.stamp !== engine.raster.frameNumber) {
        continue;
      }
      enc.copyBufferToBuffer(
        c.block,
        0,
        engine.ctx.currentViewBuffer,
        0,
        c.viewBytes,
      );
      view.world.encodeCull(enc, undefined, false);
      const pass = enc.beginRenderPass({
        label: "heightCapture",
        colorAttachments: [],
        depthStencilAttachment: {
          view: c.view,
          depthClearValue: 0, // reverse-Z: nothing (below `bottom`) is 0
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });
      pass.executeBundles([view.world.heightBundle()]);
      pass.end();
      c.captured++;
    }
  };
}

export function selectViewPass(
  engine: ScenePassEngine,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    enc.copyBufferToBuffer(
      engine.raster.viewStaging,
      frame.slot * VIEW_STRIDE,
      engine.ctx.currentViewBuffer,
      0,
      frame.viewBytes,
    );
    enc.copyBufferToBuffer(
      engine.raster.shadowStaging,
      frame.slot * SHADOWS_STRIDE,
      engine.ctx.currentShadowsBuffer,
      0,
      SHADOWS_SIZE,
    );
    enc.copyBufferToBuffer(
      engine.raster.lightStaging,
      frame.slot * LIGHTS_SIZE,
      engine.ctx.lightBuffer,
      0,
      (LIGHT_HEADER_FLOATS + frame.lightCount * LIGHT_FLOATS) * 4,
    );
  };
}

export function lightsPass(
  engine: ScenePassEngine,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    if (frame.lightCount === 0) {
      return;
    }
    const pass = enc.beginComputePass({
      label: "lights",
      timestampWrites: engine.raster.timer.passWrites("lights"),
    });
    pass.setPipeline(engine.ctx.pipelines.lightsAssign);
    pass.setBindGroup(0, engine.ctx.lightAssignGroup);
    // A workgroup per tile, a thread per slice (lights.slang).
    pass.dispatchWorkgroups(CLUSTERS[0], CLUSTERS[1]);
    pass.end();
  };
}

export function cullPass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    view.world.encodeCull(
      enc,
      engine.raster.timer.passWrites("cull"),
      true,
      frame.width * frame.height,
      // The patch dice's own pass, asked for only if it runs.
      () => engine.raster.timer.passWrites("dice"),
    );
  };
}

export function skyViewPass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    if (drawsSky(view) && frame.sky.inside) {
      engine.raster.sky.encodeTable(
        enc,
        frame.sky,
        engine.raster.timer.passWrites("sky-view"),
      );
    }
  };
}

export function environmentPass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    encodeEnvironment(engine, enc, view, frame);
  };
}

export function aerialPerspectivePass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    // Marched per vertex instead from high up: no volume.
    if (drawsAerialPerspective(view) && frame.sky.march < 1) {
      engine.raster.sky.encodeAerial(
        enc,
        frame.sky,
        engine.raster.timer.passWrites("aerial-perspective"),
      );
    }
    if (drawsAerialPerspective(view) && frame.sky.screenHaze > 0) {
      engine.raster.sky.encodeAerialScreen(enc, frame.sky);
    }
  };
}

export function prepassPassBody(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
  {
    prepassNormal,
    prepassDepth,
  }: { prepassNormal: TextureHandle; prepassDepth: TextureHandle },
): PassBody {
  const prepassColor: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 1, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  };
  const prepassDepthAttachment: GPURenderPassDepthStencilAttachment = {
    view: undefined as never,
    depthClearValue: 0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
  };
  const prepassPass: GPURenderPassDescriptor = {
    label: "prepass",
    colorAttachments: [prepassColor],
    depthStencilAttachment: prepassDepthAttachment,
  };
  return (enc, get) => {
    if (!frame.ambient) {
      return;
    }
    prepassColor.view = get(prepassNormal);
    prepassDepthAttachment.view = get(prepassDepth);
    prepassPass.timestampWrites = engine.raster.timer.passWrites("prepass");
    const pass = enc.beginRenderPass(prepassPass);
    pass.executeBundles([
      (frame.clipBytes > 0 && view.world.clippedBundle("prepass")) ||
        view.world.prepassBundle(),
    ]);
    pass.end();
  };
}

export function ambientOcclusionPass(
  engine: ScenePassEngine,
  frame: ViewFrame,
  {
    prepassNormal,
    prepassDepth,
    rawAo,
  }: {
    prepassNormal: TextureHandle;
    prepassDepth: TextureHandle;
    rawAo: TextureHandle;
  },
): PassBody {
  const { device, pipelines } = engine.ctx;
  const { width, height } = frame;

  return (enc, get) => {
    if (!frame.ambient) {
      return;
    }
    const trace = device.createBindGroup({
      layout: pipelines.aoTrace.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: frame.aoParams } },
        { binding: 1, resource: get(prepassDepth) },
        { binding: 2, resource: get(prepassNormal) },
        { binding: 3, resource: get(rawAo) },
      ],
    });
    const blur = device.createBindGroup({
      layout: pipelines.aoDenoise.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: frame.aoParams } },
        { binding: 1, resource: get(prepassDepth) },
        { binding: 4, resource: get(rawAo) },
        { binding: 5, resource: { buffer: engine.ctx.aoBuffer } },
      ],
    });
    const timestampWrites = engine.raster.timer.passWrites("ambient-occlusion");
    const pass = enc.beginComputePass({
      label: "ambient-occlusion",
      ...(timestampWrites ? { timestampWrites } : {}),
    });
    pass.setPipeline(pipelines.aoTrace);
    pass.setBindGroup(0, trace);
    pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
    pass.end();
    const blurWrites = engine.raster.timer.passWrites("ambient-occlusion.blur");
    const second = enc.beginComputePass({
      label: "ambient-occlusion.blur",
      ...(blurWrites ? { timestampWrites: blurWrites } : {}),
    });
    second.setPipeline(pipelines.aoDenoise);
    second.setBindGroup(0, blur);
    second.dispatchWorkgroups(
      Math.ceil(Math.ceil(width / 4) / 8),
      Math.ceil(height / 8),
    );
    second.end();
  };
}

export function starsPass(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
  { starLayer }: { starLayer: TextureHandle },
): PassBody {
  return (enc, get) => {
    if (drawsSky(view)) {
      engine.raster.sky.encodeStars(
        enc,
        frame.sky,
        get(starLayer),
        engine.raster.timer.passWrites("star-cull"),
        engine.raster.timer.passWrites("stars"),
      );
    }
  };
}

export function opaquePassBody(
  engine: ScenePassEngine,
  view: View,
  frame: ViewFrame,
  {
    starLayer,
    color,
    resolved,
    ids,
    display,
    displayResolved,
    depth,
  }: {
    starLayer: TextureHandle;
    color: TextureHandle;
    resolved: TextureHandle;
    ids: TextureHandle;
    display: TextureHandle;
    displayResolved: TextureHandle;
    depth: TextureHandle;
  },
): PassBody {
  // Alpha 0 where nothing is drawn: the exposure meter leaves it out.
  const clearColor: GPUColorDict = { r: 0, g: 0, b: 0, a: 0 };
  const opaqueColor: GPURenderPassColorAttachment = {
    view: undefined as never,
    resolveTarget: undefined,
    clearValue: clearColor,
    loadOp: "clear",
    storeOp: "discard",
  };
  const opaqueIds: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  };
  const opaqueDisplay: GPURenderPassColorAttachment = {
    view: undefined as never,
    resolveTarget: undefined,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "discard",
  };
  const opaqueDepth: GPURenderPassDepthStencilAttachment = {
    view: undefined as never,
    depthClearValue: 0, // reverse-Z: far is 0
    depthLoadOp: "clear",
    depthStoreOp: "store", // picks read it, also while the view is idle
  };
  const opaquePass: GPURenderPassDescriptor = {
    label: "opaque",
    colorAttachments: [opaqueColor, opaqueIds, opaqueDisplay],
    depthStencilAttachment: opaqueDepth,
  };
  return (enc, get) => {
    const atmosphere = drawsSky(view);
    clearColor.r = atmosphere ? 0 : view.clearColor[0];
    clearColor.g = atmosphere ? 0 : view.clearColor[1];
    clearColor.b = atmosphere ? 0 : view.clearColor[2];
    opaqueColor.view = get(color);
    opaqueColor.resolveTarget = get(resolved);
    opaqueIds.view = get(ids);
    opaqueDisplay.view = get(display);
    opaqueDisplay.resolveTarget = get(displayResolved);
    opaqueDepth.view = get(depth);
    opaquePass.timestampWrites = engine.raster.timer.passWrites("opaque");
    const pass = enc.beginRenderPass(opaquePass);
    // Its depth first, then its shading where that depth is (each
    // sample shaded once, not every fragment drawn over it).
    if (engine.ctx.pipelines.depthPrepass) {
      frame.bundles[0] =
        (frame.clipBytes > 0 && view.world.clippedBundle("depth")) ||
        view.world.depthBundle();
      frame.bundles[1] = frame.bundle!;
    } else {
      frame.bundles[0] = frame.bundle!;
    }
    pass.executeBundles(frame.bundles);
    // Tiny point symbols the cull rasterized, depth-tested over them.
    view.world.drawSplats(pass);
    if (atmosphere) {
      engine.raster.sky.draw(pass, frame.sky, get(starLayer));
    }
    pass.end();
  };
}
