// A view's render graph: its targets and its passes, in the order they run.
// Pass order is registration order: FrameGraph has no sort.
import { FrameGraph } from "../FrameGraph.ts";
import { VIEW_SIZE } from "../layout.ts";
import {
  type ViewFrame,
  destroyViewFrame,
  LIST_HEADER,
  TONE_MAPPINGS,
} from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { PixelRect } from "../../scene/renderTarget.ts";
import { encodePick } from "./picks.ts";
import {
  translucentInputs,
  translucentGroup,
  keptGroup,
  compositeGroup,
} from "./translucency.ts";
import { drawOverlays } from "./outputPasses.ts";
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

/** The view's frame graph for its current size, built on first use and on resize. */
export function viewFrameFor(
  engine: Engine,
  view: View,
  rect: Readonly<PixelRect>,
): ViewFrame {
  let frame = engine.viewFrames.get(view);
  if (
    !frame ||
    frame.width !== rect.width ||
    frame.height !== rect.height ||
    frame.x !== rect.x ||
    frame.y !== rect.y
  ) {
    if (frame) {
      destroyViewFrame(frame);
      releaseTargets(engine, view, frame);
    }
    frame = buildViewFrame(engine, view, rect);
    engine.viewFrames.set(view, frame);
  }
  return frame;
}

/**
 * Frees a view's render targets at its old size when it resizes, unless
 * another view still renders at that size. Without this, a window resize
 * leaves every intermediate size resident until the pool's idle timeout.
 */
function releaseTargets(engine: Engine, view: View, old: ViewFrame): void {
  for (const [other, frame] of engine.viewFrames) {
    if (
      other !== view &&
      frame.width === old.width &&
      frame.height === old.height
    ) {
      return;
    }
  }
  for (const desc of old.graph.transientDescs()) {
    engine.pool.purge(desc);
  }
}

function buildViewFrame(
  engine: Engine,
  view: View,
  rect: Readonly<PixelRect>,
): ViewFrame {
  const { device, pipelines, targets } = engine.ctx;
  const { x, y, width, height } = rect;
  const graph = new FrameGraph(engine.pool);
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
  const presentColor: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  const presentPass: GPURenderPassDescriptor = {
    label: "present",
    colorAttachments: [presentColor],
  };

  const frame: ViewFrame = {
    x,
    y,
    width,
    height,
    graph,
    output,
    slot: 0,
    viewBytes: VIEW_SIZE,
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
    sky: engine.sky.createView(),
    shadowed: false,
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
  };
  engine.sky.writeWeights(frame.sky);
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
  const cleared = (): GPURenderPassColorAttachment => ({
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  });
  const listTarget: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "discard",
  };
  const listPass: GPURenderPassDescriptor = {
    label: "translucent.lists",
    colorAttachments: [listTarget],
  };
  const momentTargets = [cleared(), cleared()];
  const momentPass: GPURenderPassDescriptor = {
    label: "translucent.moments",
    colorAttachments: momentTargets,
  };
  const colorTargets = [cleared(), cleared()];
  const colorPass: GPURenderPassDescriptor = {
    label: "translucent.color",
    colorAttachments: colorTargets,
  };
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
    (enc, get) => {
      if (!frame.translucent) {
        return;
      }
      const world = view.world;
      const dummies = translucentInputs(engine);
      if (view.translucencyMethod === "exact") {
        const lists = engine.lists!;
        enc.clearBuffer(lists, 0, (LIST_HEADER + width * height) * 4);
        listTarget.view = get(color);
        listPass.timestampWrites = engine.timer.passWrites("translucent-lists");
        const pass = enc.beginRenderPass(listPass);
        world.encodeTranslucent(
          pass,
          (doubleSided) =>
            doubleSided ? "translucentListDoubleSided" : "translucentList",
          translucentGroup(engine, frame, 0, [
            lists,
            dummies.zero,
            dummies.higher,
          ]),
        );
        pass.end();
        // Each pixel's list sorted and blended, into the accumulation
        // targets (composite.slang `sortLists`).
        const lit = get(accumulatedLit);
        const unlit = get(accumulatedUnlit);
        const sort = enc.beginComputePass({
          label: "translucent.sort",
          timestampWrites: engine.timer.passWrites("translucent-sort"),
        });
        sort.setPipeline(pipelines.translucentSort);
        sort.setBindGroup(
          0,
          keptGroup(engine, frame, 5, [lists, lit, unlit], () =>
            device.createBindGroup({
              label: "translucent.sort",
              layout: pipelines.translucentSort.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: frame.translucentParams } },
                { binding: 1, resource: { buffer: lists } },
                { binding: 5, resource: lit },
                { binding: 6, resource: unlit },
              ],
            }),
          ),
        );
        sort.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 4));
        sort.end();
        if (!engine.listCountPending) {
          engine.listCountPending = true;
          const readback = device.createBuffer({
            label: "translucent.count",
            size: 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
          });
          enc.copyBufferToBuffer(lists, 0, readback, 0, 4);
          engine.listCounts.push(readback);
        }
        return;
      }
      const zero = get(momentsZero);
      const higher = get(momentsHigher);
      momentTargets[0]!.view = zero;
      momentTargets[1]!.view = higher;
      momentPass.timestampWrites = engine.timer.passWrites(
        "translucent-moments",
      );
      const first = enc.beginRenderPass(momentPass);
      world.encodeTranslucent(
        first,
        (doubleSided) =>
          doubleSided ? "translucentMomentsDoubleSided" : "translucentMoments",
        translucentGroup(engine, frame, 1, [
          dummies.buffer,
          dummies.zero,
          dummies.higher,
        ]),
      );
      first.end();
      colorTargets[0]!.view = get(accumulatedLit);
      colorTargets[1]!.view = get(accumulatedUnlit);
      colorPass.timestampWrites = engine.timer.passWrites("translucent-color");
      const second = enc.beginRenderPass(colorPass);
      world.encodeTranslucent(
        second,
        (doubleSided) =>
          doubleSided ? "translucentColorDoubleSided" : "translucentColor",
        translucentGroup(engine, frame, 2, [dummies.buffer, zero, higher]),
      );
      second.end();
    },
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
    (enc, get) => {
      const auto = view.autoExposure;
      const adapts = "auto" in view.exposure || "eye" in view.exposure;
      // Not a column or a row: a canvas squeezed to 0 width draws 1 pixel
      // across, which says nothing of the view (stars alone, from a view
      // half full of a sunlit Earth, opened the eye: white on the way back).
      if (adapts && auto?.pending) {
        auto.skipped = true;
        return;
      }
      if (!adapts || !auto || width < 2 || height < 2) {
        return;
      }
      auto.pending = true;
      const params = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const data = new ArrayBuffer(16);
      new Float32Array(data, 0, 1)[0] = view.exposureScale;
      const exact = view.translucencyMethod === "exact";
      const layers = !frame.translucent ? 0 : exact ? 1 : 2;
      new Uint32Array(data, 4, 3).set([width, height, layers]);
      device.queue.writeBuffer(params, 0, data);
      const dummies = translucentInputs(engine);
      const result = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      const readback = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      const pass = enc.beginComputePass({ label: "meter" });
      pass.setPipeline(pipelines.meter);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: pipelines.meter.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: get(resolved) },
            { binding: 1, resource: { buffer: params } },
            { binding: 2, resource: { buffer: result } },
            {
              binding: 3,
              resource: layers ? get(accumulatedLit) : dummies.color,
            },
            {
              binding: 4,
              resource: layers ? get(accumulatedUnlit) : dummies.color,
            },
            {
              binding: 5,
              resource: layers === 2 ? get(momentsZero) : dummies.zero,
            },
          ],
        }),
      );
      pass.dispatchWorkgroups(1);
      pass.end();
      enc.copyBufferToBuffer(result, 0, readback, 0, 16);
      engine.meters.push({ view, readback, scratch: [params, result] });
    },
  );

  const compositeScene: GPURenderPassColorAttachment = {
    view: undefined as never,
    loadOp: "load",
    storeOp: "store",
  };
  const compositeDisplay: GPURenderPassColorAttachment = {
    view: undefined as never,
    loadOp: "load",
    storeOp: "store",
  };
  const compositePass: GPURenderPassDescriptor = {
    label: "composite",
    colorAttachments: [compositeScene, compositeDisplay],
  };
  graph.addPass(
    "composite",
    {
      reads: [momentsZero, momentsHigher, accumulatedLit, accumulatedUnlit],
      writes: [resolved, displayResolved],
    },
    (enc, get) => {
      if (!frame.translucent) {
        return;
      }
      compositeScene.view = get(resolved);
      compositeDisplay.view = get(displayResolved);
      compositePass.timestampWrites = engine.timer.passWrites(
        "translucent-composite",
      );
      const pass = enc.beginRenderPass(compositePass);
      if (view.translucencyMethod === "exact") {
        pass.setPipeline(pipelines.compositeExact);
        pass.setBindGroup(
          0,
          compositeGroup(engine, frame, 3, pipelines.compositeExact, [
            get(accumulatedLit),
            get(accumulatedUnlit),
          ]),
        );
      } else {
        pass.setPipeline(pipelines.compositeMoments);
        pass.setBindGroup(
          0,
          compositeGroup(engine, frame, 4, pipelines.compositeMoments, [
            get(momentsZero),
            get(accumulatedLit),
            get(accumulatedUnlit),
          ]),
        );
      }
      pass.draw(3);
      pass.end();
    },
  );

  // The nearest and farthest surface shown, for the next frame's shadow
  // cascades (`writeShadows`): read back a frame or so late.
  graph.addPass(
    "depth-range",
    { reads: [depth], sideEffect: true },
    (enc, get) => {
      if (!frame.shadowed || frame.rangePending) {
        return;
      }
      frame.rangePending = true;
      const params = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const data = new ArrayBuffer(16);
      new Float32Array(data, 0, 1)[0] = engine.bodyCamera(view).near;
      new Uint32Array(data, 4, 2).set([width, height]);
      device.queue.writeBuffer(params, 0, data);
      const result = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      new Uint32Array(result.getMappedRange()).set([0x7f7fffff, 0]);
      result.unmap();
      const readback = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      const pass = enc.beginComputePass({ label: "depth-range" });
      pass.setPipeline(pipelines.depthRange);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: pipelines.depthRange.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: get(depth) },
            { binding: 1, resource: { buffer: params } },
            { binding: 2, resource: { buffer: result } },
          ],
        }),
      );
      pass.dispatchWorkgroups(8, 8);
      pass.end();
      enc.copyBufferToBuffer(result, 0, readback, 0, 8);
      engine.depthRanges.push({ frame, readback, scratch: [params, result] });
    },
  );

  graph.addPass(
    "hdr-readback",
    { reads: [resolved], sideEffect: true },
    (enc, get) => {
      if (view.pendingHdrReads.length === 0) {
        return;
      }
      get(resolved);
      const bytesPerRow = Math.ceil((width * 8) / 256) * 256;
      const buffer = device.createBuffer({
        label: "view.hdr.readback",
        size: bytesPerRow * height,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      enc.copyTextureToBuffer(
        { texture: graph.texture(resolved)! },
        { buffer, bytesPerRow },
        [width, height],
      );
      engine.hdrReads.push({
        buffer,
        bytesPerRow,
        width,
        height,
        exposure: view.exposureScale,
        resolvers: view.pendingHdrReads.splice(0),
      });
    },
  );

  graph.addPass("pick", { reads: [ids, depth], sideEffect: true }, (enc) => {
    const request = frame.pick;
    if (request) {
      frame.pick = undefined;
      encodePick(engine, enc, view, frame, request);
    }
  });

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
  graph.addPass(
    "adaptation",
    { reads: [resolved], writes: [adaptReduced, adaptation] },
    (enc, get) => {
      if (!("eye" in view.exposure)) {
        return;
      }
      engine.adaptData[0] = view.exposureScale;
      engine.adaptData[1] = view.autoExposure?.cones ?? 0;
      device.queue.writeBuffer(frame.adaptParams, 0, engine.adaptData);
      const reduce = device.createBindGroup({
        layout: pipelines.adaptReduce.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: get(resolved) },
          { binding: 1, resource: { buffer: frame.adaptParams } },
          { binding: 2, resource: get(adaptReduced) },
        ],
      });
      const blur = device.createBindGroup({
        layout: pipelines.adaptBlur.getBindGroupLayout(0),
        entries: [
          { binding: 3, resource: get(adaptReduced) },
          { binding: 4, resource: get(adaptation) },
        ],
      });
      const pass = enc.beginComputePass({ label: "adaptation" });
      const groups = [
        Math.ceil(adaptSize.width / 8),
        Math.ceil(adaptSize.height / 8),
      ] as const;
      pass.setPipeline(pipelines.adaptReduce);
      pass.setBindGroup(0, reduce);
      // A workgroup a cell (adapt.slang `reduce`).
      pass.dispatchWorkgroups(adaptSize.width, adaptSize.height);
      pass.setPipeline(pipelines.adaptBlur);
      pass.setBindGroup(0, blur);
      pass.dispatchWorkgroups(...groups, adaptSize.depth);
      pass.end();
    },
  );

  // With FXAA, the present pass tonemaps into this (encoded), and FXAA
  // reads it into the view's rectangle of the target.
  const ldr = graph.createTexture("ldr", {
    width,
    height,
    format: "rgba8unorm",
    usage: attachment | GPUTextureUsage.TEXTURE_BINDING,
  });
  const ldrColor: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  const ldrPass: GPURenderPassDescriptor = {
    label: "present.ldr",
    colorAttachments: [ldrColor],
  };
  graph.addPass(
    "present",
    {
      reads: [resolved, displayResolved, adaptation],
      writes: [output, ldr],
    },
    (enc, get) => {
      const fxaa = view.fxaa;
      const srgbTarget = engine.ctx.outputFormat.endsWith("-srgb");
      const params = engine.presentData;
      params.setFloat32(0, fxaa ? 0 : x, true);
      params.setFloat32(4, fxaa ? 0 : y, true);
      params.setUint32(8, TONE_MAPPINGS.indexOf(view.toneMapping), true);
      // FXAA reads encoded color (its edges are found in display luma);
      // gamma 2.2 only where the target isn't -srgb, as without it.
      const encoding =
        srgbTarget && !fxaa
          ? 0
          : view.outputEncoding === "gamma2.2" && !srgbTarget
            ? 2
            : 1;
      params.setUint32(12, encoding, true);
      // The eye: its adaptation over the view (log10 cd/m²) and its
      // brightening; per pixel it adapts partly to its region too.
      const e = view.exposure;
      const state = view.autoExposure;
      const eye = "eye" in e && state !== undefined;
      params.setFloat32(16, view.exposureScale, true);
      params.setUint32(20, eye ? 1 : 0, true);
      params.setFloat32(24, eye ? state.cones : 0, true);
      params.setFloat32(28, eye ? state.rods : 0, true);
      params.setFloat32(32, "eye" in e ? (e.compensation ?? 0) : 0, true);
      device.queue.writeBuffer(frame.presentParams, 0, params.buffer);
      // Pooled textures are stable from frame to frame, so the bind group
      // is rebuilt only when the pool hands this view a different one.
      const source = get(resolved);
      const shown = get(displayResolved);
      const adapted = get(adaptation);
      if (
        frame.presentSource !== source ||
        frame.presentDisplay !== shown ||
        frame.presentAdaptation !== adapted
      ) {
        frame.presentSource = source;
        frame.presentDisplay = shown;
        frame.presentAdaptation = adapted;
        engine.adaptSampler ??= device.createSampler({
          label: "adaptation",
          magFilter: "linear",
          minFilter: "linear",
        });
        frame.presentGroup = device.createBindGroup({
          layout: pipelines.present.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: source },
            { binding: 1, resource: { buffer: frame.presentParams } },
            { binding: 2, resource: shown },
            { binding: 3, resource: adapted },
            { binding: 4, resource: engine.adaptSampler },
          ],
        });
      }
      if (fxaa) {
        const image = get(ldr);
        ldrColor.view = image;
        const first = enc.beginRenderPass(ldrPass);
        first.setPipeline(pipelines.presentLdr);
        first.setBindGroup(0, frame.presentGroup!);
        first.draw(3);
        first.end();
        const f = engine.fxaaData;
        f.setFloat32(0, x, true);
        f.setFloat32(4, y, true);
        f.setFloat32(8, 1 / width, true);
        f.setFloat32(12, 1 / height, true);
        f.setUint32(16, srgbTarget && encoding === 1 ? 1 : 0, true);
        device.queue.writeBuffer(frame.fxaaParams, 0, f.buffer);
        if (frame.fxaaImage !== image) {
          frame.fxaaImage = image;
          engine.fxaaSampler ??= device.createSampler({
            label: "fxaa",
            magFilter: "linear",
            minFilter: "linear",
          });
          frame.fxaaGroup = device.createBindGroup({
            label: "fxaa",
            layout: pipelines.fxaa.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: image },
              { binding: 1, resource: engine.fxaaSampler },
              { binding: 2, resource: { buffer: frame.fxaaParams } },
            ],
          });
        }
      }
      presentColor.view = get(output);
      presentColor.loadOp = frame.clearTarget ? "clear" : "load";
      const pass = enc.beginRenderPass(presentPass);
      pass.setViewport(x, y, width, height, 0, 1);
      pass.setScissorRect(x, y, width, height);
      pass.setPipeline(fxaa ? pipelines.fxaa : pipelines.present);
      pass.setBindGroup(0, fxaa ? frame.fxaaGroup! : frame.presentGroup!);
      pass.draw(3);
      drawOverlays(engine, pass, view);
      pass.end();
    },
  );

  return frame;
}
