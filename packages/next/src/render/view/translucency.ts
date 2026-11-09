// A view's translucency per tick: its parameters, its list buffer, and the bind
// groups of its passes.
import { LIST_HEADER, type ViewFrame } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";

/** Nodes a list's `next` word can address (28 bits, the node plus one). */
const LIST_NODES_MAX = (1 << 28) - 2;

/**
 * Whether a view draws blended surfaces this frame, and its translucent
 * passes' parameters: the lists' layout ("exact", grown to what the last
 * reading needed) or the moments' depth range.
 */
export function writeTranslucency(engine: Engine, view: View): void {
  const frame = engine.viewFrames.get(view)!;
  // Only what this view draws: a blended draw in no view (viewMask) or
  // hidden switches none of the passes on.
  const range = view.world.translucentRange(
    engine.bodyCamera(view).position,
    engine.viewBit(view),
  );
  frame.translucent = range !== undefined;
  if (!range) {
    return;
  }
  const pixels = frame.width * frame.height;
  let capacity = 0;
  if (view.translucencyMethod === "exact") {
    const { limits } = engine.ctx.device;
    const heads = (LIST_HEADER + pixels) * 4;
    // At most what a node's `next` can address (translucent.wgsl
    // LIST_SAMPLE_SHIFT: 28 bits, the node plus one).
    const most = Math.min(
      Math.floor(
        (Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize) -
          heads) /
          16,
      ),
      LIST_NODES_MAX,
    );
    // Half a layer a pixel to start; more once a frame needs it.
    engine.listNodes = Math.max(engine.listNodes, Math.ceil(pixels / 2));
    capacity = Math.max(Math.min(engine.listNodes, most), 0);
    const size = heads + capacity * 16;
    if (!engine.lists || engine.lists.size < size) {
      engine.lists?.destroy();
      engine.lists = engine.ctx.device.createBuffer({
        label: "translucent.lists",
        size,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_SRC |
          GPUBufferUsage.COPY_DST,
      });
    }
    capacity = Math.min(
      Math.floor((engine.lists.size - heads) / 16),
      LIST_NODES_MAX,
    );
  }
  // The moments' depths: the blended surfaces' own range (the moments
  // can't tell apart layers whose warped depths nearly agree: a range
  // reaching kilometers past a model's centimeters speckled it).
  const near = Math.max(range.near, engine.bodyCamera(view).near, 1e-3);
  const far = Math.max(range.far, near * 1.01);
  const d = engine.translucentData;
  d.setUint32(0, frame.width, true);
  d.setUint32(4, frame.height, true);
  d.setUint32(8, LIST_HEADER + pixels, true);
  d.setUint32(12, capacity, true);
  d.setFloat32(16, Math.log(near), true);
  d.setFloat32(20, 1 / Math.log(far / near), true);
  d.setFloat32(24, engine.ctx.pipelines.momentBias, true);
  engine.ctx.device.queue.writeBuffer(frame.translucentParams, 0, d.buffer);
}

/** @internal What a translucent pass binds where it reads no lists or moments. */
export function translucentInputs(
  engine: Engine,
): NonNullable<Engine["translucentDummies"]> {
  if (!engine.translucentDummies) {
    const { device, pipelines } = engine.ctx;
    const texture = (format: GPUTextureFormat) =>
      device
        .createTexture({
          label: "translucent.placeholder",
          size: [1, 1],
          format,
          usage:
            GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        })
        .createView();
    engine.translucentDummies = {
      buffer: device.createBuffer({
        label: "translucent.placeholder",
        size: 16,
        usage: GPUBufferUsage.STORAGE,
      }),
      zero: texture(pipelines.momentFormats[0]),
      higher: texture(pipelines.momentFormats[1]),
      color: texture("rgba16float"),
    };
  }
  return engine.translucentDummies;
}

/**
 * @internal A view's translucent pass's group 3 (translucent.wgsl): its parameters
 * and depth, with the lists and the moments given; kept by role while
 * they stay the same.
 */
export function translucentGroup(
  engine: Engine,
  frame: ViewFrame,
  role: number,
  [lists, zero, higher]: [GPUBuffer, GPUTextureView, GPUTextureView],
): GPUBindGroup {
  return keptGroup(engine, frame, role, [lists, zero, higher], () =>
    engine.ctx.device.createBindGroup({
      label: "translucent",
      layout: engine.ctx.pipelines.translucentLayout,
      entries: [
        { binding: 0, resource: { buffer: frame.translucentParams } },
        { binding: 1, resource: { buffer: lists } },
        { binding: 2, resource: frame.depthView },
        { binding: 3, resource: zero },
        { binding: 4, resource: higher },
      ],
    }),
  );
}

/**
 * @internal A view's composite's group (composite.slang): what "exact" blended
 * (lit, unlit: bindings 3, 4), or the moments' zeroth and sums (2–4).
 */
export function compositeGroup(
  engine: Engine,
  frame: ViewFrame,
  role: number,
  pipeline: GPURenderPipeline,
  inputs: GPUTextureView[],
): GPUBindGroup {
  const first = 5 - inputs.length;
  return keptGroup(engine, frame, role, inputs, () =>
    engine.ctx.device.createBindGroup({
      label: "composite",
      layout: pipeline.getBindGroupLayout(0),
      entries: inputs.map((resource, i) => ({
        binding: first + i,
        resource,
      })),
    }),
  );
}

/** @internal */
export function keptGroup(
  engine: Engine,
  frame: ViewFrame,
  role: number,
  inputs: readonly (GPUBuffer | GPUTextureView)[],
  create: () => GPUBindGroup,
): GPUBindGroup {
  const kept = frame.translucentGroups[role];
  if (kept && kept.inputs.every((input, i) => input === inputs[i])) {
    return kept.group;
  }
  const group = create();
  frame.translucentGroups[role] = { group, inputs };
  return group;
}
