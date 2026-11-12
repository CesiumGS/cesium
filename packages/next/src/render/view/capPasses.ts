// A view's section caps (`View.clipCaps`, scene/world/capFaces.ts), in two
// parts: the parity pass counts, for each cap face, the solids' surfaces beyond
// it into two single-sampled targets (a bit a face, by the blend that toggles:
// `RenderContext.capParity`); and in the opaque pass, after the content, a
// triangle over the view draws the cap where the count is odd (sectionCap.slang).
// Both run only in a view with caps and clips that make a face.
import type { TextureHandle } from "../FrameGraph.ts";
import type { View } from "../../scene/View.ts";
import type { ViewFrame, PassBody } from "./viewFrameData.ts";
import type { ScenePassEngine } from "./scenePasses.ts";

/** The view has caps to draw this frame. */
export const drawsCaps = (frame: ViewFrame): boolean =>
  frame.capFaces > 0 && frame.clipBytes > 0;

export function sectionCapsPass(
  view: View,
  frame: ViewFrame,
  { capLow, capHigh }: { capLow: TextureHandle; capHigh: TextureHandle },
): PassBody {
  const attachment = (): GPURenderPassColorAttachment => ({
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  });
  const low = attachment();
  const high = attachment();
  const descriptor: GPURenderPassDescriptor = {
    label: "section-caps",
    colorAttachments: [low, high],
  };
  return (enc, get) => {
    if (!drawsCaps(frame)) {
      return;
    }
    low.view = get(capLow);
    high.view = get(capHigh);
    const pass = enc.beginRenderPass(descriptor);
    const bundle = view.world.clippedBundle("caps");
    if (bundle) {
      pass.executeBundles([bundle]);
    }
    pass.end();
  };
}

/**
 * Draws the caps into the opaque pass `pass`, after the content, at their own
 * depth. A cap pipeline still being made draws nothing, and the engine wakes
 * to draw it when it is.
 */
export function drawSectionCaps(
  engine: Pick<ScenePassEngine, "ctx">,
  view: View,
  frame: ViewFrame,
  pass: GPURenderPassEncoder,
  get: (handle: TextureHandle) => GPUTextureView,
  { capLow, capHigh }: { capLow: TextureHandle; capHigh: TextureHandle },
): void {
  if (!drawsCaps(frame)) {
    return;
  }
  const { ctx } = engine;
  const pipeline = ctx.pipelines.sectionCap(() => {
    view.world.shaderReady();
    ctx.wake();
  });
  if (!pipeline) {
    return;
  }
  const parity = ctx.device.createBindGroup({
    label: "sectionCap.parity",
    layout: ctx.pipelines.capLayout,
    entries: [
      { binding: 0, resource: get(capLow) },
      { binding: 1, resource: get(capHigh) },
    ],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, ctx.currentViewBindGroup);
  pass.setBindGroup(1, parity);
  pass.draw(3);
}
