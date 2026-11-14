// Two-phase occlusion culling of a view's draws (docs/design/investigations-2026-11-13.md;
// the kernels are cull.slang's `...Occluded` and `retestOccluded`). A view's
// tick, when it culls by occlusion (`cullsByOcclusion`):
//
//   cull              the frustum, then each item it keeps against the pyramid
//                     the view's last tick left, seen from that tick's camera:
//                     an item it hides goes to the retest list, the rest to
//                     their batches (phase 1);
//   prepass           with ambient occlusion this tick, the prepass splits in
//                     two: it draws phase 1; `hzb` builds a pyramid of its
//                     single-sampled depth (each level-0 texel taking the ring
//                     of pixels round its block too, so no multisample sees
//                     farther than it says); `occlusion-retest` tests the
//                     listed items against it from this tick's camera, the
//                     visible ones to their batches' second set of arguments
//                     (phase 2); the prepass then draws phase 2 into the same
//                     targets;
//   occlusion-depth   without the prepass this tick: phase 1's depth alone
//                     (the opaque pass's depth bundle), then `hzb` from it
//                     (multisampled) and `occlusion-retest`;
//   opaque            both phases' depth, then both shaded (the depth pass's
//                     phase 1 loaded where it had a pass of its own).
//
// The pyramid is built once a tick, there; the tile queries after the opaque
// pass (occlusionPass.ts) and the next tick's first phase read it. It lacks
// what the second phase drew, which only leaves a box visible, never hides one;
// and it is built before point splats draw.
//
// What last tick's depth hid and this tick's doesn't is drawn this tick, so
// nothing pops in; a wrong first-phase verdict (the camera jumped, the scene
// changed) costs time, never an image. Only opaque triangles in the engine's
// pipelines are culled (bundles.ts `occludable`): translucent draws never,
// and they are no occluders (the pyramid is built from the opaque depth).
import type { TextureHandle } from "../FrameGraph.ts";
import { OCCLUSION_COUNTERS } from "../drawArguments.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { OcclusionSwitch } from "../../scene/occlusionFeedback.ts";
import type { EngineRaster } from "./engineRaster.ts";
import {
  FrameOcclusion,
  cullCamera,
  type DepthPyramid,
} from "./occlusionPass.ts";
import { OCCLUSION_BIAS } from "./occlusionMath.ts";
import type { PassBody, ViewFrame } from "./viewFrameData.ts";

/** The switch in force for a view: its own, else the engine's. */
export function occlusionCullingOn(
  engine: { occlusionCulling: OcclusionSwitch },
  view: { occlusionCulling: OcclusionSwitch | undefined },
): boolean {
  return (view.occlusionCulling ?? engine.occlusionCulling) === "on";
}

/**
 * Whether a view's tick culls by occlusion: its switch is on, the engine has
 * the opaque pass's depth prepass (the first phase's depth is its bundle), the
 * world draws through the cull ("indirect" submission), and the view has no
 * clips (no clipped second-phase bundles, and section caps read the cull).
 */
export function cullsByOcclusion(state: {
  on: boolean;
  depthPrepass: boolean;
  indirect: boolean;
  clipped: boolean;
}): boolean {
  return state.on && state.depthPrepass && state.indirect && !state.clipped;
}

/** What the uniforms need of a camera, in its body's fixed axes. */
export interface CullCamera {
  readonly position: ArrayLike<number>;
  readonly right: ArrayLike<number>;
  readonly up: ArrayLike<number>;
  readonly direction: ArrayLike<number>;
  /** Tangents of half the field of view, across and up. */
  readonly tanX: number;
  readonly tanY: number;
  readonly near: number;
}

/** Bytes of cull.slang's `OcclusionCull`. */
export const OCCLUSION_CULL_BYTES = 160;

/**
 * cull.slang's `OcclusionCull` for a tick: `last`, the camera the pyramid
 * was built for (undefined: none, the first phase tests nothing), as seen
 * from `current`'s eye (each axis's w is the offset of `current`'s eye from
 * `last`'s along it, in float64 before it is rounded); `current`'s axes and
 * lens; the frame; where the second phase's arguments, slices, list and
 * counters are (`DrawArguments.occlusionLayout`).
 */
export function occlusionCullParams(
  out: ArrayBuffer,
  current: CullCamera,
  last: CullCamera | undefined,
  frame: { width: number; height: number; levels: number },
  layout: { argumentRows: number; itemRows: number; counterWord: number },
): void {
  const f = new Float32Array(out, 0, 32);
  const u = new Uint32Array(out, 128, 8);
  const axes = (camera: CullCamera, offset: ArrayLike<number>, at: number) => {
    const rows = [camera.right, camera.up, camera.direction];
    for (let r = 0; r < 3; r++) {
      const axis = rows[r]!;
      f[at + r * 4] = axis[0]!;
      f[at + r * 4 + 1] = axis[1]!;
      f[at + r * 4 + 2] = axis[2]!;
      f[at + r * 4 + 3] =
        axis[0]! * offset[0]! + axis[1]! * offset[1]! + axis[2]! * offset[2]!;
    }
    f[at + 12] = camera.tanX;
    f[at + 13] = camera.tanY;
    f[at + 14] = camera.near;
    f[at + 15] = OCCLUSION_BIAS;
  };
  if (last) {
    axes(
      last,
      [
        current.position[0]! - last.position[0]!,
        current.position[1]! - last.position[1]!,
        current.position[2]! - last.position[2]!,
      ],
      0,
    );
  } else {
    f.fill(0, 0, 16);
  }
  axes(current, [0, 0, 0], 16);
  u[0] = frame.width;
  u[1] = frame.height;
  u[2] = frame.levels;
  u[3] = last ? 1 : 0;
  u[4] = layout.argumentRows;
  u[5] = layout.itemRows;
  u[6] = layout.counterWord;
  u[7] = 0;
}

/**
 * What a tick's counters say (`OCCLUSION_COUNTERS`, cull.slang): draw items
 * and their whole triangles left undrawn because the pyramid hid them. The
 * first phase listed `listed`; the second showed `shown` of them again.
 */
export function hiddenByOcclusion(counters: ArrayLike<number>): {
  draws: number;
  triangles: number;
} {
  return {
    draws: Math.max(0, counters[0]! - counters[2]!),
    triangles: Math.max(0, counters[1]! - counters[3]!),
  };
}

/** Readbacks a view keeps for its counters: one being written, others mapping. */
const READBACKS = 3;

/** A view frame's occlusion cull: its uniforms, group and counters. */
export class ViewOcclusionCull {
  readonly params: GPUBuffer;
  private readonly data = new ArrayBuffer(OCCLUSION_CULL_BYTES);
  private group: GPUBindGroup | undefined;
  private groupPyramid: DepthPyramid | undefined;
  private readonly free: GPUBuffer[] = [];
  private readonly reading: GPUBuffer[] = [];
  /** Copied this tick, mapped after the submit (`afterSubmit`). */
  private copied: GPUBuffer | undefined;
  /** This tick culls by occlusion (set by the cull pass, read by the rest). */
  active = false;
  /**
   * Where this tick's first phase draws its depth: the ambient-occlusion
   * prepass, split into the two phases ("prepass", when the view has one this
   * tick), or the opaque pass's depth prepass, split into a pass of its own
   * and the opaque pass ("opaque").
   */
  firstDepth: "prepass" | "opaque" = "opaque";
  /** The latest counters read back: what the pyramid hid in a tick. */
  hidden = { draws: 0, triangles: 0 };

  constructor(private readonly device: GPUDevice) {
    this.params = device.createBuffer({
      label: "occlusionCull.params",
      size: OCCLUSION_CULL_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    for (let i = 0; i < READBACKS; i++) {
      this.free.push(
        device.createBuffer({
          label: "occlusionCull.counters",
          size: OCCLUSION_COUNTERS * 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
      );
    }
  }

  /** Writes the tick's uniforms; returns the group the kernels take. */
  prepare(
    layout: GPUBindGroupLayout,
    pyramid: DepthPyramid,
    current: CullCamera,
    frame: { width: number; height: number },
    arguments_: {
      argumentRows: number;
      itemRows: number;
      counterWord: number;
    },
  ): GPUBindGroup {
    occlusionCullParams(
      this.data,
      current,
      pyramid.built,
      { ...frame, levels: pyramid.shape.levels },
      arguments_,
    );
    this.device.queue.writeBuffer(this.params, 0, this.data);
    if (!this.group || this.groupPyramid !== pyramid) {
      this.groupPyramid = pyramid;
      this.group = this.device.createBindGroup({
        label: "occlusionCull",
        layout,
        entries: [
          { binding: 0, resource: { buffer: this.params } },
          { binding: 1, resource: pyramid.view },
        ],
      });
    }
    return this.group;
  }

  get bindGroup(): GPUBindGroup | undefined {
    return this.group;
  }

  /**
   * A readback to copy the tick's counters into, if one is free: the same
   * one again until the submit (`afterSubmit`), the last copy winning.
   */
  takeReadback(): GPUBuffer | undefined {
    this.copied ??= this.free.pop();
    return this.copied;
  }

  /** After the submit: maps the counters copied this tick. */
  afterSubmit(): void {
    const buffer = this.copied;
    this.copied = undefined;
    if (!buffer) {
      return;
    }
    this.reading.push(buffer);
    void buffer.mapAsync(GPUMapMode.READ).then(
      () => {
        this.hidden = hiddenByOcclusion(
          new Uint32Array(buffer.getMappedRange().slice(0)),
        );
        buffer.unmap();
        this.release(buffer);
      },
      () => this.release(buffer),
    );
  }

  private release(buffer: GPUBuffer): void {
    const at = this.reading.indexOf(buffer);
    if (at >= 0) {
      this.reading.splice(at, 1);
      this.free.push(buffer);
    }
  }

  destroy(): void {
    this.params.destroy();
    for (const b of [...this.free, ...this.reading]) {
      b.destroy();
    }
    this.free.length = 0;
    this.reading.length = 0;
  }
}

/** Rasterizer side: what the occlusion cull reads of the engine. */
export interface OcclusionCullEngine extends Pick<
  Engine,
  "bodyCamera" | "ctx" | "occlusionCulling"
> {
  readonly raster: Pick<EngineRaster, "frameNumber" | "timer">;
}

/**
 * The cull pass's half: whether this tick culls by occlusion, and if so the
 * group its kernels take (the view's pyramid made on first use).
 */
export function prepareOcclusionCull(
  engine: OcclusionCullEngine,
  view: View,
  frame: ViewFrame,
): GPUBindGroup | undefined {
  const { device, pipelines } = engine.ctx;
  const active = cullsByOcclusion({
    on: occlusionCullingOn(engine, view),
    depthPrepass: pipelines.depthPrepass,
    indirect: view.world.submission === "indirect",
    clipped: frame.clipBytes > 0,
  });
  if (!active) {
    if (frame.cull) {
      frame.cull.active = false;
    }
    return undefined;
  }
  const cull = (frame.cull ??= new ViewOcclusionCull(device));
  cull.active = true;
  cull.firstDepth = frame.ambient ? "prepass" : "opaque";
  const occlusion = (frame.occlusion ??= new FrameOcclusion(
    device,
    pipelines,
    frame.depthView,
    frame.width,
    frame.height,
  ));
  return cull.prepare(
    pipelines.occlusionCullLayout,
    occlusion.pyramid,
    cullCamera(engine, view, frame),
    frame,
    view.world.occlusionLayout,
  );
}

/**
 * Between the two phases: the pyramid of the first phase's depth (the
 * multisampled depth, or `pixels`, the prepass's single-sampled one), built
 * once this tick, then the second phase (`World.encodeRetest`) and the copy of
 * its counters.
 */
export function encodeSecondPhase(
  engine: OcclusionCullEngine,
  view: View,
  frame: ViewFrame,
  enc: GPUCommandEncoder,
  pixels?: GPUTextureView,
): void {
  const cull = frame.cull;
  const group = cull?.bindGroup;
  if (!cull?.active || !group || !frame.occlusion) {
    return;
  }
  const { pyramid } = frame.occlusion;
  const hzbWrites = engine.raster.timer.passWrites("hzb");
  const hzb = enc.beginComputePass({
    label: "hzb",
    ...(hzbWrites ? { timestampWrites: hzbWrites } : {}),
  });
  pyramid.encode(hzb, engine.ctx.pipelines, pixels);
  hzb.end();
  pyramid.built = cullCamera(engine, view, frame);
  pyramid.builtTick = engine.raster.frameNumber;
  view.world.encodeRetest(
    enc,
    group,
    engine.raster.timer.passWrites("occlusion-retest"),
  );
  const readback = cull.takeReadback();
  if (readback) {
    view.world.copyOcclusionCounters(enc, readback);
  }
}

/**
 * The pass after the cull, when the tick culls by occlusion and the view
 * draws no ambient-occlusion prepass this tick: the first phase's depth (the
 * opaque pass's depth bundle, in a pass of its own), then the second phase.
 * The depth pass has the opaque pass's attachments (the depth bundle was
 * recorded for them); its colors are cleared and not stored. With a prepass
 * the prepass does this (`scenePasses.ts` `prepassPassBody`).
 */
export function occlusionCullPass(
  engine: OcclusionCullEngine,
  view: View,
  frame: ViewFrame,
  {
    color,
    ids,
    display,
    depth,
  }: {
    color: TextureHandle;
    ids: TextureHandle;
    display: TextureHandle;
    depth: TextureHandle;
  },
): PassBody {
  const clear = (): GPURenderPassColorAttachment => ({
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "discard",
  });
  const colors = [clear(), clear(), clear()];
  const depthAttachment: GPURenderPassDepthStencilAttachment = {
    view: undefined as never,
    depthClearValue: 0, // reverse-Z: far is 0
    depthLoadOp: "clear",
    depthStoreOp: "store",
  };
  const descriptor: GPURenderPassDescriptor = {
    label: "occlusion-depth",
    colorAttachments: colors,
    depthStencilAttachment: depthAttachment,
  };
  return (enc, get) => {
    if (!frame.cull?.active || frame.cull.firstDepth !== "opaque") {
      return;
    }
    colors[0]!.view = get(color);
    colors[1]!.view = get(ids);
    colors[2]!.view = get(display);
    depthAttachment.view = get(depth);
    descriptor.timestampWrites =
      engine.raster.timer.passWrites("occlusion-depth");
    const pass = enc.beginRenderPass(descriptor);
    pass.executeBundles([view.world.depthBundle()]);
    pass.end();
    encodeSecondPhase(engine, view, frame, enc);
  };
}

/** The second phase's bundle of `kind`, if the tick culls by occlusion and it is recorded. */
export function secondPhaseBundle(
  view: View,
  kind: "opaque" | "depth" | "prepass",
): GPURenderBundle | undefined {
  return view.world.retestBundle(kind);
}
