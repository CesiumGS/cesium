// The bodies of a view's passes from the composite to the target: the meter, the
// readbacks, the eye's adaptation and the present pass. buildViewFrame registers
// them.
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { ResolveView, TextureHandle } from "../FrameGraph.ts";
import { ChainSlot } from "../post/chain.ts";
import { encodePick } from "./picks.ts";
import { translucentInputs } from "./translucency.ts";
import {
  type ViewFrame,
  type PassBody,
  TONE_MAPPINGS,
} from "./viewFrameData.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";

/** Rasterizer side: meter, readbacks, adaptation, present and overlay pass bodies. */
export interface OutputPassEngine extends Pick<
  Engine,
  "bodyCamera" | "cameras" | "ctx" | "tilesets" | "viewBit" | "views"
> {
  readonly raster: Pick<
    EngineRaster,
    | "adaptData"
    | "adaptSampler"
    | "commandBuffers"
    | "depthRanges"
    | "fxaaData"
    | "fxaaSampler"
    | "hdrReads"
    | "listNodes"
    | "lists"
    | "meters"
    | "overlayColor"
    | "overlayResources"
    | "pickParams"
    | "pickParamsData"
    | "pickReadback"
    | "pickResult"
    | "picks"
    | "presentData"
    | "translucentData"
    | "translucentDummies"
    | "viewFrames"
  >;
  readonly scene: Pick<EngineScene, "viewIds">;
}

/** @internal */
function drawOverlays(
  engine: OutputPassEngine,
  pass: GPURenderPassEncoder,
  view: View,
): void {
  const overlays = view.overlays;
  let vertices = 0;
  for (let i = 0; i < overlays.length; i++) {
    vertices += overlays[i]!.count;
  }
  if (vertices === 0) {
    return;
  }
  const device = engine.ctx.device;
  let resources = engine.raster.overlayResources.get(view);
  if (!resources || resources.capacity < vertices) {
    resources?.buffer.destroy();
    const capacity = Math.max(vertices, 256);
    const buffer = device.createBuffer({
      size: capacity * 12,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const params =
      resources?.params ??
      device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    const group =
      resources?.group ??
      device.createBindGroup({
        layout: engine.ctx.pipelines.overlayLayout,
        entries: [{ binding: 0, resource: { buffer: params } }],
      });
    resources = {
      buffer,
      capacity,
      params,
      group,
      staging: new Float32Array(capacity * 3),
    };
    engine.raster.overlayResources.set(view, resources);
  }
  // Camera-relative in float64, then float32: overlays share the
  // precision scheme of the draw records.
  const data = resources.staging;
  const eye = engine.bodyCamera(view).position;
  const ex = eye[0]!,
    ey = eye[1]!,
    ez = eye[2]!;
  let k = 0;
  for (let i = 0; i < overlays.length; i++) {
    const { positions, count } = overlays[i]!;
    for (let j = 0; j < count * 3; j += 3) {
      data[k++] = positions[j]! - ex;
      data[k++] = positions[j + 1]! - ey;
      data[k++] = positions[j + 2]! - ez;
    }
  }
  device.queue.writeBuffer(resources.buffer, 0, data, 0, vertices * 3);
  engine.raster.overlayColor.set(overlays[0]!.color);
  device.queue.writeBuffer(resources.params, 0, engine.raster.overlayColor);
  pass.setPipeline(engine.ctx.pipelines.overlay);
  pass.setBindGroup(0, engine.ctx.currentViewBindGroup);
  pass.setBindGroup(1, resources.group);
  pass.setVertexBuffer(0, resources.buffer);
  pass.draw(vertices);
}

export function meterPass(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
  {
    resolved,
    momentsZero,
    accumulatedLit,
    accumulatedUnlit,
  }: {
    resolved: TextureHandle;
    momentsZero: TextureHandle;
    accumulatedLit: TextureHandle;
    accumulatedUnlit: TextureHandle;
  },
): PassBody {
  const { device, pipelines } = engine.ctx;
  const { width, height } = frame;

  return (enc, get) => {
    const auto = view.autoExposure;
    const { exposure } = view.observer;
    const adapts = "auto" in exposure || "eye" in exposure;
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
    engine.raster.meters.push({ view, readback, scratch: [params, result] });
  };
}

export function depthRangePass(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
  { depth }: { depth: TextureHandle },
): PassBody {
  const { device, pipelines } = engine.ctx;
  const { width, height } = frame;

  return (enc, get) => {
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
    engine.raster.depthRanges.push({
      frame,
      readback,
      scratch: [params, result],
    });
  };
}

export function hdrReadbackPass(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
  {
    resolved,
    after = false,
  }: {
    /** What it reads: an image, or a slot's latest this tick. */
    resolved: TextureHandle | ChainSlot;
    /** It's the read after glare (`View.readHdr`). */
    after?: boolean;
  },
): PassBody {
  const { device } = engine.ctx;
  const { width, height } = frame;
  const { graph } = frame;
  const glared = !!frame.glare;

  return (enc, get) => {
    // A view with no glare answers both here.
    if (!glared) {
      view.pendingHdrReads.push(...view.pendingGlareReads.splice(0));
    }
    const reads = after ? view.pendingGlareReads : view.pendingHdrReads;
    if (reads.length === 0) {
      return;
    }
    const image = resolved instanceof ChainSlot ? resolved.latest() : resolved;
    get(image);
    const bytesPerRow = Math.ceil((width * 8) / 256) * 256;
    const buffer = device.createBuffer({
      label: "view.hdr.readback",
      size: bytesPerRow * height,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    enc.copyTextureToBuffer(
      { texture: graph.texture(image)! },
      { buffer, bytesPerRow },
      [width, height],
    );
    engine.raster.hdrReads.push({
      buffer,
      bytesPerRow,
      width,
      height,
      exposure: view.exposureScale,
      resolvers: reads.splice(0),
    });
  };
}

export function pickPass(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
): PassBody {
  return (enc) => {
    const request = frame.pick;
    if (request) {
      frame.pick = undefined;
      encodePick(engine, enc, view, frame, request);
    }
  };
}

export function adaptationPass(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
  {
    resolved,
    adaptReduced,
    adaptation,
    adaptSize,
  }: {
    resolved: TextureHandle;
    adaptReduced: TextureHandle;
    adaptation: TextureHandle;
    adaptSize: { width: number; height: number; depth: number };
  },
): PassBody {
  const { device, pipelines } = engine.ctx;

  return (enc, get) => {
    if (!("eye" in view.observer.exposure)) {
      return;
    }
    engine.raster.adaptData[0] = view.exposureScale;
    engine.raster.adaptData[1] = view.autoExposure?.cones ?? 0;
    device.queue.writeBuffer(frame.adaptParams, 0, engine.raster.adaptData);
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
  };
}

/**
 * The present pass, and the two that join it when a view has post stages (see
 * `buildViewFrame`): `response`, the first half of its shader, before the `exposed`
 * stages; `present` itself; and `final`, after the `display` stages, which
 * takes their image into the view's rectangle of the target.
 */
export function presentPasses(
  engine: OutputPassEngine,
  view: View,
  frame: ViewFrame,
  {
    displayResolved,
    adaptation,
    response,
    output,
    ldr,
  }: {
    displayResolved: TextureHandle;
    adaptation: TextureHandle;
    response: TextureHandle;
    output: TextureHandle;
    ldr: TextureHandle;
  },
): { response: PassBody; present: PassBody; final: PassBody } {
  const { device, pipelines } = engine.ctx;
  const { x, y, width, height, chain } = frame;
  const { scene, exposed, display } = chain.slots;

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
  const responseColor: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  const responsePass: GPURenderPassDescriptor = {
    label: "present.response",
    colorAttachments: [responseColor],
  };

  /** The sampler for the eye's adaptation, shared by the present entries. */
  const adaptationSampler = () =>
    (engine.raster.adaptSampler ??= device.createSampler({
      label: "adaptation",
      magFilter: "linear",
      minFilter: "linear",
    }));

  /** Draws `pipeline` into the view's rectangle of the target, then overlays. */
  const toTarget = (
    enc: GPUCommandEncoder,
    get: ResolveView,
    pipeline: GPURenderPipeline,
    group: GPUBindGroup,
  ) => {
    presentColor.view = get(output);
    presentColor.loadOp = frame.clearTarget ? "clear" : "load";
    const pass = enc.beginRenderPass(presentPass);
    pass.setViewport(x, y, width, height, 0, 1);
    pass.setScissorRect(x, y, width, height);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.draw(3);
    drawOverlays(engine, pass, view);
    pass.end();
  };

  /** FXAA's or the copy's parameters and group, for the encoded `image`. */
  const imageGroup = (image: GPUTextureView): GPUBindGroup => {
    const srgbTarget = engine.ctx.outputFormat.endsWith("-srgb");
    const f = engine.raster.fxaaData;
    f.setFloat32(0, x, true);
    f.setFloat32(4, y, true);
    f.setFloat32(8, 1 / width, true);
    f.setFloat32(12, 1 / height, true);
    // Encoded as sRGB (`encoding` 1 below), which a -srgb target encodes again.
    f.setUint32(16, srgbTarget ? 1 : 0, true);
    device.queue.writeBuffer(frame.fxaaParams, 0, f.buffer);
    if (frame.fxaaImage !== image) {
      frame.fxaaImage = image;
      engine.raster.fxaaSampler ??= device.createSampler({
        label: "fxaa",
        magFilter: "linear",
        minFilter: "linear",
      });
      frame.fxaaGroup = device.createBindGroup({
        label: "fxaa",
        layout: pipelines.fxaa.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: image },
          { binding: 1, resource: engine.raster.fxaaSampler },
          { binding: 2, resource: { buffer: frame.fxaaParams } },
        ],
      });
    }
    return frame.fxaaGroup!;
  };

  return {
    // Reads `presentParams`, which the present pass writes this tick: a queue
    // write lands before the encoder's commands run.
    response: (enc, get) => {
      if (!chain.splits) {
        return;
      }
      const source = get(scene!.latest());
      const shown = get(displayResolved);
      const adapted = get(adaptation);
      const inputs = chain.responseInputs;
      if (
        inputs[0] !== source ||
        inputs[1] !== shown ||
        inputs[2] !== adapted
      ) {
        chain.responseInputs = [source, shown, adapted];
        chain.responseGroup = device.createBindGroup({
          label: "present.response",
          layout: pipelines.present.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: source },
            { binding: 1, resource: { buffer: frame.presentParams } },
            { binding: 2, resource: shown },
            { binding: 3, resource: adapted },
            { binding: 4, resource: adaptationSampler() },
          ],
        });
      }
      responseColor.view = get(response);
      const pass = enc.beginRenderPass(responsePass);
      pass.setPipeline(chain.pipelines!.response);
      pass.setBindGroup(0, chain.responseGroup!);
      pass.draw(3);
      pass.end();
    },
    present: (enc, get) => {
      const fxaa = view.fxaa;
      const split = chain.splits;
      const staged = chain.displays;
      const encoded = fxaa || staged;
      const srgbTarget = engine.ctx.outputFormat.endsWith("-srgb");
      const params = engine.raster.presentData;
      params.setFloat32(0, encoded ? 0 : x, true);
      params.setFloat32(4, encoded ? 0 : y, true);
      params.setUint32(
        8,
        TONE_MAPPINGS.indexOf(view.observer.toneMapping),
        true,
      );
      // FXAA and display stages read encoded color (FXAA's edges are found in
      // display luma); gamma 2.2 only where the target isn't -srgb, as without.
      const encoding =
        srgbTarget && !encoded
          ? 0
          : view.outputEncoding === "gamma2.2" && !srgbTarget
            ? 2
            : 1;
      params.setUint32(12, encoding, true);
      // The eye: its adaptation over the view (log10 cd/m²) and its
      // brightening; per pixel it adapts partly to its region too.
      const e = view.observer.exposure;
      const state = view.autoExposure;
      const eye = "eye" in e && state !== undefined;
      params.setFloat32(16, view.exposureScale, true);
      params.setUint32(20, eye ? 1 : 0, true);
      params.setFloat32(24, eye ? state.cones : 0, true);
      params.setFloat32(28, eye ? state.rods : 0, true);
      params.setFloat32(32, "eye" in e ? (e.compensation ?? 0) : 0, true);
      device.queue.writeBuffer(frame.presentParams, 0, params.buffer);
      // Pooled textures are stable from tick to tick, so the bind group
      // is rebuilt only when the pool hands this view a different one.
      const source = get(split ? exposed!.latest() : scene!.latest());
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
        frame.presentGroup = device.createBindGroup({
          layout: pipelines.present.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: source },
            { binding: 1, resource: { buffer: frame.presentParams } },
            { binding: 2, resource: shown },
            { binding: 3, resource: adapted },
            { binding: 4, resource: adaptationSampler() },
          ],
        });
      }
      if (encoded) {
        const image = get(ldr);
        ldrColor.view = image;
        const first = enc.beginRenderPass(ldrPass);
        first.setPipeline(
          split ? chain.pipelines!.toneLdr : pipelines.presentLdr,
        );
        first.setBindGroup(0, frame.presentGroup!);
        first.draw(3);
        first.end();
        if (!staged) {
          // `encoding` here is 1 where the target is -srgb.
          toTarget(enc, get, pipelines.fxaa, imageGroup(image));
        }
        return;
      }
      toTarget(
        enc,
        get,
        split ? chain.pipelines!.tone : pipelines.present,
        frame.presentGroup!,
      );
    },
    // After the `display` stages: FXAA last, so it smooths what they drew.
    final: (enc, get) => {
      if (!chain.displays) {
        return;
      }
      const group = imageGroup(get(display!.latest()));
      toTarget(
        enc,
        get,
        view.fxaa ? pipelines.fxaa : chain.pipelines!.copy,
        group,
      );
    },
  };
}
