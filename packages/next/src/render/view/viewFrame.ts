// A view's render graph: its targets and its passes, in the order they run.
// Pass order is registration order: FrameGraph has no sort.
import { FrameGraph, type TextureHandle } from "../FrameGraph.ts";
import { VIEW_SIZE } from "../layout.ts";
import { type ViewFrame, destroyViewFrame } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { PixelRect } from "../../scene/renderTarget.ts";
import {
  shadowsPass,
  heightCapturesPass,
  selectViewPass,
  lightsPass,
  cullPass,
  skyViewPass,
  environmentPass,
  aerialPerspectivePass,
  prepassPassBody,
  ambientOcclusionPass,
  starsPass,
  opaquePassBody,
} from "./scenePasses.ts";
import { translucentPass, compositePassBody } from "./translucentPasses.ts";
import {
  meterPass,
  depthRangePass,
  hdrReadbackPass,
  pickPass,
  adaptationPass,
  presentPasses,
} from "./outputPasses.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";
import {
  ChainSlot,
  ViewChain,
  chainEntries,
  chainOrder,
  registerPerView,
  registerSlot,
  type ChainView,
} from "../post/chain.ts";
import { GLARE_RECORDS, glareFor } from "../post/glare.ts";

/** The same pass, later, in the eye's graph under glare. */
const ADAPTATION_AFTER_GLARE = "adaptation";

/** Rasterizer side: a view's targets and passes, in registration order. */
export interface ViewFrameEngine extends Pick<
  Engine,
  | "bodyCamera"
  | "cameras"
  | "ctx"
  | "gpu"
  | "requestRender"
  | "stats"
  | "sunDirection"
  | "tilesets"
  | "viewBit"
  | "views"
> {
  readonly raster: Pick<
    EngineRaster,
    | "adaptData"
    | "adaptSampler"
    | "captures"
    | "cascadeStaging"
    | "commandBuffers"
    | "darkProbe"
    | "depthRanges"
    | "frameNumber"
    | "fxaaData"
    | "fxaaSampler"
    | "glareKernels"
    | "hdrReads"
    | "lightStaging"
    | "listCountPending"
    | "listCounts"
    | "listNodes"
    | "lists"
    | "meters"
    | "overlayColor"
    | "overlayResources"
    | "pickDomain"
    | "pickParams"
    | "pickParamsData"
    | "pickReadback"
    | "pickResult"
    | "picks"
    | "pool"
    | "presentData"
    | "probes"
    | "shadowStaging"
    | "sky"
    | "timer"
    | "translucentData"
    | "translucentDummies"
    | "viewBlock"
    | "viewCityLight"
    | "viewFrames"
    | "viewStaging"
  >;
  readonly scene: Pick<EngineScene, "viewIds">;
}

/** The view's frame graph for its current size, built on first use and on resize. */
export function viewFrameFor(
  engine: ViewFrameEngine,
  view: View,
  rect: Readonly<PixelRect>,
): ViewFrame {
  let frame = engine.raster.viewFrames.get(view);
  if (
    !frame ||
    frame.width !== rect.width ||
    frame.height !== rect.height ||
    frame.x !== rect.x ||
    frame.y !== rect.y ||
    frame.stagesRevision !== view.stagesRevision
  ) {
    if (frame) {
      destroyViewFrame(frame);
      releaseTargets(engine, view, frame);
    }
    frame = buildViewFrame(engine, view, rect);
    engine.raster.viewFrames.set(view, frame);
  }
  return frame;
}

/**
 * Frees a view's render targets at its old size when it resizes, unless
 * another view still renders at that size. Without this, a window resize
 * leaves every intermediate size resident until the pool's idle timeout.
 */
function releaseTargets(
  engine: ViewFrameEngine,
  view: View,
  old: ViewFrame,
): void {
  for (const [other, frame] of engine.raster.viewFrames) {
    if (
      other !== view &&
      frame.width === old.width &&
      frame.height === old.height
    ) {
      return;
    }
  }
  for (const desc of old.graph.transientDescs()) {
    engine.raster.pool.purge(desc);
  }
}

function buildViewFrame(
  engine: ViewFrameEngine,
  view: View,
  rect: Readonly<PixelRect>,
): ViewFrame {
  const { device, pipelines, targets } = engine.ctx;
  const { x, y, width, height } = rect;
  const graph = new FrameGraph(engine.raster.pool);
  const attachment = GPUTextureUsage.RENDER_ATTACHMENT;
  const color = graph.createTexture("color.msaa", {
    width,
    height,
    format: "rgba16float",
    sampleCount: targets.sampleCount,
    usage: attachment,
  });
  const resolved = graph.createTexture("color", {
    width,
    height,
    format: "rgba16float",
    // COPY_SRC: `View.readHdr`.
    usage:
      attachment | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
  });
  // Display-referred (unlit) color, resolved for the present pass.
  const display = graph.createTexture("display.msaa", {
    width,
    height,
    format: "rgba8unorm-srgb",
    sampleCount: targets.sampleCount,
    usage: attachment,
  });
  const displayResolved = graph.createTexture("display", {
    width,
    height,
    format: "rgba8unorm-srgb",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  // Feature IDs and depth are the view's own, not pooled: what the last
  // frame left in them serves picks while the view is idle, without a
  // render. Read by the pick pass (features, positions).
  const idsTexture = device.createTexture({
    label: "featureId.msaa",
    size: [width, height],
    format: "rg16uint",
    sampleCount: targets.sampleCount,
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  const depthTexture = device.createTexture({
    label: "depth.msaa",
    size: [width, height],
    format: targets.depthFormat,
    sampleCount: targets.sampleCount,
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  const idsView = idsTexture.createView();
  const depthView = depthTexture.createView();
  const ids = graph.importTexture("featureId.msaa", idsView);
  const depth = graph.importTexture("depth.msaa", depthView);
  // Rebound to this frame's target texture before every execute.
  const output = graph.importTexture("output", {} as GPUTextureView);
  // Encoded: what the present pass leaves for FXAA or a display stage, then
  // what FXAA or a copy takes into the view's rectangle of the target.
  const ldr = graph.createTexture("ldr", {
    width,
    height,
    format: "rgba8unorm",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  // Exposed light, between the present pass's halves, for `exposed` stages.
  const response = graph.createTexture("present.response", {
    width,
    height,
    format: "rgba16float",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  // The view's post stages, by slot; a slot with none has no passes.
  const glare = glareFor(engine, view, width, height);
  const entries = chainEntries(view.observer, glare?.entries);
  const stages = chainOrder(entries);
  const chain = new ViewChain({
    scene: new ChainSlot(resolved),
    exposed: new ChainSlot(response),
    display: new ChainSlot(ldr),
  });
  if (glare) {
    chain.share(GLARE_RECORDS, glare.state.sources);
  }
  if (stages.exposed.length + stages.display.length > 0) {
    void engine.ctx.pipelines.chain().then((pipelines) => {
      chain.pipelines = pipelines;
      engine.requestRender();
    });
  }

  const frame: ViewFrame = {
    x,
    y,
    width,
    height,
    graph,
    output,
    slot: 0,
    viewBytes: VIEW_SIZE,
    block: undefined,
    clearTarget: true,
    bundle: undefined,
    bundles: [],
    pick: undefined,
    seconds: 0,
    ids: idsTexture,
    depth: depthTexture,
    idsView,
    depthView,
    rendered: false,
    presentParams: device.createBuffer({
      label: "presentParams",
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    presentGroup: undefined,
    presentSource: undefined,
    presentDisplay: undefined,
    presentAdaptation: undefined,
    adaptParams: device.createBuffer({
      label: "adaptParams",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    fxaaParams: device.createBuffer({
      label: "fxaaParams",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    fxaaGroup: undefined,
    fxaaImage: undefined,
    sky: engine.raster.sky.createView(),
    shadowed: false,
    clipBuffer: undefined,
    clipBytes: 0,
    ambient: false,
    lightCount: 0,
    depthRange: undefined,
    rangePending: false,
    cascadeRange: undefined,
    aoParams: device.createBuffer({
      label: "aoParams",
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    translucent: false,
    translucentParams: device.createBuffer({
      label: "translucentParams",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    translucentGroups: [],
    chain,
    glare: glare?.state,
    stagesRevision: view.stagesRevision,
    tanY: 1,
  };
  engine.raster.sky.writeWeights(frame.sky);
  graph.addPass(
    "shadows",
    { sideEffect: true },
    shadowsPass(engine, view, frame),
  );

  // Height captures this view draws: ground only, straight down.
  graph.addPass(
    "height-captures",
    { sideEffect: true },
    heightCapturesPass(engine, view),
  );

  graph.addPass(
    "select-view",
    { sideEffect: true },
    selectViewPass(engine, frame),
  );

  // Its point and spot lights into its froxels (lights.slang).
  graph.addPass("lights", { sideEffect: true }, lightsPass(engine, frame));

  graph.addPass("cull", { sideEffect: true }, cullPass(engine, view, frame));

  // The sky around the camera, before the opaque pass draws from it.
  graph.addPass(
    "sky-view",
    { sideEffect: true },
    skyViewPass(engine, view, frame),
  );

  // The view's environment lighting, rebuilt from its sky if due.
  graph.addPass(
    "environment",
    { sideEffect: true },
    environmentPass(engine, view, frame),
  );

  // The air between the camera and the scene, for the opaque pass.
  graph.addPass(
    "aerial-perspective",
    { sideEffect: true },
    aerialPerspectivePass(engine, view, frame),
  );

  // Ambient occlusion: a single-sampled depth and normal prepass of what
  // the view culled, the horizon search, then the blur into the buffer
  // the opaque pass reads.
  const prepassNormal = graph.createTexture("prepass.normal", {
    width,
    height,
    format: "rgba16float",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  const prepassDepth = graph.createTexture("prepass.depth", {
    width,
    height,
    format: "depth32float",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  const rawAo = graph.createTexture("ao.raw", {
    width: Math.ceil(width / 2),
    height: Math.ceil(height / 2),
    format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  graph.addPass(
    "prepass",
    { writes: [prepassNormal, prepassDepth], sideEffect: true },
    prepassPassBody(engine, view, frame, { prepassNormal, prepassDepth }),
  );
  graph.addPass(
    "ambient-occlusion",
    {
      reads: [prepassNormal, prepassDepth],
      writes: [rawAo],
      sideEffect: true,
    },
    ambientOcclusionPass(engine, frame, { prepassNormal, prepassDepth, rawAo }),
  );

  // The stars, splatted as points into a layer the sky reads.
  const starLayer = graph.createTexture("stars", {
    width,
    height,
    format: "rgba16float",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  graph.addPass(
    "stars",
    { writes: [starLayer] },
    starsPass(engine, view, frame, { starLayer }),
  );

  graph.addPass(
    "opaque",
    {
      reads: [starLayer],
      writes: [color, resolved, ids, display, displayResolved, depth],
    },
    opaquePassBody(engine, view, frame, {
      starLayer,
      color,
      resolved,
      ids,
      display,
      displayResolved,
      depth,
    }),
  );

  // Translucency (translucent.wgsl): blended surfaces into per-pixel
  // lists ("exact"), or their moments and then their weighted light
  // ("moments"); then composited over the opaque pass's resolved targets
  // (composite.slang), before anything but the meter reads them.
  // Read by the color pass as storage (translucent.wgsl), by the
  // composite as textures.
  const moments =
    attachment |
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.STORAGE_BINDING;
  const momentsZero = graph.createTexture("moments.zero", {
    width,
    height,
    format: pipelines.momentFormats[0],
    usage: moments,
  });
  const momentsHigher = graph.createTexture("moments.higher", {
    width,
    height,
    format: pipelines.momentFormats[1],
    usage: moments,
  });
  // The moments' weighted light, or what "exact" blended (`sortLists`).
  const blended =
    attachment |
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.STORAGE_BINDING;
  const accumulatedLit = graph.createTexture("translucent.lit", {
    width,
    height,
    format: "rgba16float",
    usage: blended,
  });
  const accumulatedUnlit = graph.createTexture("translucent.unlit", {
    width,
    height,
    format: "rgba16float",
    usage: blended,
  });
  graph.addPass(
    "translucent",
    {
      reads: [depth],
      writes: [
        momentsZero,
        momentsHigher,
        accumulatedLit,
        accumulatedUnlit,
        color,
      ],
      sideEffect: true,
    },
    translucentPass(engine, view, frame, {
      color,
      momentsZero,
      momentsHigher,
      accumulatedLit,
      accumulatedUnlit,
    }),
  );
  // The exposure meter, before the composite: it reads the opaque pass's
  // image, whose alpha is the scene's share of each pixel, and puts the
  // layers over it itself (meter.slang). No later pass reads scene alpha.
  graph.addPass(
    "meter",
    {
      reads: [resolved, momentsZero, accumulatedLit, accumulatedUnlit],
      sideEffect: true,
    },
    meterPass(engine, view, frame, {
      resolved,
      momentsZero,
      accumulatedLit,
      accumulatedUnlit,
    }),
  );
  graph.addPass(
    "composite",
    {
      reads: [momentsZero, momentsHigher, accumulatedLit, accumulatedUnlit],
      writes: [resolved, displayResolved],
    },
    compositePassBody(engine, view, frame, {
      resolved,
      displayResolved,
      momentsZero,
      accumulatedLit,
      accumulatedUnlit,
    }),
  );

  // The nearest and farthest surface shown, for the next frame's shadow
  // cascades (`writeViewShadows`): read back a frame or so late.
  graph.addPass(
    "depth-range",
    { reads: [depth], sideEffect: true },
    depthRangePass(engine, view, frame, { depth }),
  );

  graph.addPass(
    "hdr-readback",
    { reads: [resolved], sideEffect: true },
    hdrReadbackPass(engine, view, frame, { resolved }),
  );

  graph.addPass(
    "pick",
    { reads: [ids, depth], sideEffect: true },
    pickPass(engine, view, frame),
  );

  // The eye's local adaptation: a bilateral grid of the image's log
  // luminance, a sixteenth of its size by 16 levels, blurred (adapt.slang).
  const adaptSize = {
    width: Math.ceil(width / 16),
    height: Math.ceil(height / 16),
    depth: 16,
    format: "rgba16float" as const,
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  };
  const adaptReduced = graph.createTexture("adapt.reduced", adaptSize);
  const adaptation = graph.createTexture("adapt.map", adaptSize);
  const adaptationBody = (source: TextureHandle | ChainSlot) =>
    adaptationPass(engine, view, frame, {
      resolved: source,
      adaptReduced,
      adaptation,
      adaptSize,
    });
  // The eye adapts to the light that reaches it: with glare, the veil's too. Its grid is
  // read at each pixel's own brightness, so without that the veil's levels are empty,
  // and draw rings. The view's overall adaptation stays the meter's, before glare.
  const eyeOnGlare = !!glare && "eye" in view.observer.exposure;
  if (!eyeOnGlare) {
    graph.addPass(
      "adaptation",
      { reads: [resolved], writes: [adaptReduced, adaptation] },
      adaptationBody(resolved),
    );
  }

  // The chain, after the meter and (but for the eye under glare) the adaptation, so
  // neither sees a stage's result; the HDR readback has read the image by now too
  // (§13.22).
  const chainView: ChainView = {
    width,
    height,
    depth,
    ids,
    view,
    preExposure: () => view.exposureScale,
    pixelAngle: () => (2 * frame.tanY) / height,
  };
  const { scene, exposed, display: shown } = chain.slots;
  registerPerView(graph, chain, entries, chainView);
  registerSlot(engine, graph, chain, scene!, stages.scene, chainView);
  if (eyeOnGlare) {
    graph.addPass(
      ADAPTATION_AFTER_GLARE,
      { reads: scene!.handles, writes: [adaptReduced, adaptation] },
      adaptationBody(scene!),
    );
  }
  if (glare) {
    graph.addPass(
      "hdr-readback.glare",
      { reads: scene!.handles, sideEffect: true },
      hdrReadbackPass(engine, view, frame, {
        resolved: scene!,
        after: true,
      }),
    );
  }
  const present = presentPasses(engine, view, frame, {
    displayResolved,
    adaptation,
    response,
    output,
    ldr,
  });
  const sceneReads = scene!.handles;
  if (stages.exposed.length > 0) {
    graph.addPass(
      "present.response",
      {
        reads: [...sceneReads, displayResolved, adaptation],
        writes: [response],
      },
      present.response,
    );
    registerSlot(engine, graph, chain, exposed!, stages.exposed, chainView);
  }
  graph.addPass(
    "present",
    {
      reads: [
        ...sceneReads,
        ...(stages.exposed.length > 0 ? exposed!.handles : []),
        displayResolved,
        adaptation,
      ],
      writes: [output, ldr],
    },
    present.present,
  );
  if (stages.display.length > 0) {
    registerSlot(engine, graph, chain, shown!, stages.display, chainView);
    graph.addPass(
      "present.final",
      { reads: shown!.handles, writes: [output] },
      present.final,
    );
  }

  return frame;
}
