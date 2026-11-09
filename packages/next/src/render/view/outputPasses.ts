// The bodies of a view's passes from the composite to the target: the meter, the
// readbacks, the eye's adaptation and the present pass. buildViewFrame registers
// them.
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";

/** @internal */
export function drawOverlays(
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
