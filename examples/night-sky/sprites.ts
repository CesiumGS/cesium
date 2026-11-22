import type {
  ChainIo,
  GraphStage,
  GraphStageBuilder,
} from "../../packages/core/src/index.ts";
import spritesWgsl from "./generated/sprites.wgsl?raw";

/**
 * A lens's diffraction spikes, as the night-sky example's own stage: it is not in the
 * engine. The engine keeps the light list (which sources get a sprite, and how far it
 * reaches, from the pupil's kernel) and gives a stage that records its own passes the list
 * and the kernel (`ChainIo.glare`); this stage draws a sprite of the kernel for each source,
 * added into the image the veil leaves. Through the public interface: `GraphStage`,
 * `ChainIo` and `GlareIo`.
 *
 * It draws one instanced quad strip of `SLOTS` instances (the list's capacity), never an
 * indirect draw: a slot past the list's count, or a source with no sprite, is a degenerate
 * triangle.
 */

/** Slots a view's list holds, the sun's among them (the engine's `GLARE_SOURCES`). */
export const SPRITE_SLOTS = 256;
/** A sprite's largest value at a pixel, pre-exposed (sprites.slang `SPRITE_CLAMP`). */
export const SPRITE_CLAMP = 200;
/** The pass's name in the view's graph, and in `Engine.gpuPasses`. */
export const SPRITES_PASS = "glare.sprites";

const DEG = Math.PI / 180;
/** `SpriteFrame` (sprites.slang), floats. */
const FRAME_FLOATS = 8;

const pipelines = new WeakMap<GPUDevice, GPURenderPipeline>();

function pipelineFor(device: GPUDevice): GPURenderPipeline {
  let pipeline = pipelines.get(device);
  if (!pipeline) {
    const module = device.createShaderModule({
      label: "night-sky sprites",
      code: spritesWgsl,
    });
    pipeline = device.createRenderPipeline({
      label: SPRITES_PASS,
      layout: "auto",
      vertex: { module, entryPoint: "spriteVertex" },
      fragment: {
        module,
        entryPoint: "spriteFragment",
        targets: [
          {
            format: "rgba16float",
            // Added into what's there; the alpha is left as it was.
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-strip" },
    });
    pipelines.set(device, pipeline);
  }
  return pipeline;
}

/**
 * The stage, for `view.observer.stages`, with `glare.spikes` set on the view (the engine
 * computes the list and the kernel only then). A stage can be in several views' lists:
 * each draws with its own values.
 */
export function spritesStage(): GraphStage {
  return {
    name: "night-sky-sprites",
    slot: "scene",
    kind: "physics",
    label: "Glare: a lens's spikes",
    // It leaves no image of its own: it draws into the veil's.
    enabled: false,
    register(graph: GraphStageBuilder, io: ChainIo) {
      const { device } = io;
      const pipeline = pipelineFor(device);
      const values = new Float32Array(FRAME_FLOATS);
      const buffer = device.createBuffer({
        label: "night-sky sprites.frame",
        size: FRAME_FLOATS * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const color: GPURenderPassColorAttachment = {
        view: undefined as never,
        loadOp: "load",
        storeOp: "store",
      };
      const descriptor: GPURenderPassDescriptor = {
        label: SPRITES_PASS,
        colorAttachments: [color],
      };
      let group: GPUBindGroup | undefined;
      let groupKernel: GPUTextureView | undefined;
      graph.addPass(
        SPRITES_PASS,
        { reads: [...io.sources], sideEffect: true },
        (encoder, get) => {
          const kernel = io.glare?.kernel();
          if (!io.glare || !kernel) {
            return;
          }
          // What a pixel of the view is, in the kernel's cells.
          const cellAngle = (2 * kernel.extent * DEG) / kernel.size;
          const pixelsPerCell = cellAngle / io.pixelAngle();
          values[0] = io.width;
          values[1] = io.height;
          values[2] = io.preExposure();
          values[3] = kernel.share / (cellAngle * cellAngle);
          values[4] = kernel.scale;
          values[5] = 1 / (kernel.size * pixelsPerCell);
          values[6] = Math.max(-Math.log2(pixelsPerCell), 0);
          device.queue.writeBuffer(buffer, 0, values);
          if (groupKernel !== kernel.view) {
            groupKernel = kernel.view;
            group = device.createBindGroup({
              label: SPRITES_PASS,
              layout: pipeline.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: { buffer: io.glare.sources } },
                { binding: 2, resource: kernel.view },
                { binding: 3, resource: kernel.sampler },
              ],
            });
          }
          color.view = get(io.source());
          descriptor.timestampWrites = io.passWrites(SPRITES_PASS);
          const pass = encoder.beginRenderPass(descriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, group!);
          pass.draw(4, SPRITE_SLOTS);
          pass.end();
        },
      );
    },
  };
}
