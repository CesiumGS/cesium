// The bodies of a view's passes from the composite to the target: the meter, the
// readbacks, the eye's adaptation and the present pass. buildViewFrame registers
// them.
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { TextureHandle } from "../FrameGraph.ts";
import { encodePick } from "./picks.ts";
import { translucentInputs } from "./translucency.ts";
import {
  type ViewFrame,
  type PassBody,
  TONE_MAPPINGS,
} from "./viewFrameData.ts";

/** @internal */
function drawOverlays(
  engine: Engine,
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
  let resources = engine.overlayResources.get(view);
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
    engine.overlayResources.set(view, resources);
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
  engine.overlayColor.set(overlays[0]!.color);
  device.queue.writeBuffer(resources.params, 0, engine.overlayColor);
  pass.setPipeline(engine.ctx.pipelines.overlay);
  pass.setBindGroup(0, engine.ctx.currentViewBindGroup);
  pass.setBindGroup(1, resources.group);
  pass.setVertexBuffer(0, resources.buffer);
  pass.draw(vertices);
}

export function meterPass(
  engine: Engine,
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
  };
}

export function depthRangePass(
  engine: Engine,
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
    engine.depthRanges.push({ frame, readback, scratch: [params, result] });
  };
}

export function hdrReadbackPass(
  engine: Engine,
  view: View,
  frame: ViewFrame,
  { resolved }: { resolved: TextureHandle },
): PassBody {
  const { device } = engine.ctx;
  const { width, height } = frame;
  const { graph } = frame;

  return (enc, get) => {
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
  };
}

export function pickPass(
  engine: Engine,
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
  engine: Engine,
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
  };
}

export function presentPassBody(
  engine: Engine,
  view: View,
  frame: ViewFrame,
  {
    resolved,
    displayResolved,
    adaptation,
    output,
    ldr,
  }: {
    resolved: TextureHandle;
    displayResolved: TextureHandle;
    adaptation: TextureHandle;
    output: TextureHandle;
    ldr: TextureHandle;
  },
): PassBody {
  const { device, pipelines } = engine.ctx;
  const { x, y, width, height } = frame;

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
  return (enc, get) => {
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
  };
}
