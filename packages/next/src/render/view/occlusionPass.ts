// A view's depth pyramid and the tile queries tested against it (plan Task 12,
// fix 7). After the opaque pass, when selection asked about boxes this tick:
//
//   hzb              the farthest depth of every block of the view's own drawn
//                    depth, level by level (hzb.slang), kept in a texture of
//                    the view's with the camera it was built for;
//   occlusion-query  each box against it, one bit a query (occlusionQuery.slang),
//                    read back through a few pooled buffers a tick or two later
//                    (`readOcclusion`), where `OcclusionFeedback.apply` counts
//                    what was hidden.
//
// The pyramid is built from the opaque depth alone, so translucent content
// blocks nothing, and the sky (depth 0) hides nothing. Shadow cascades and
// height captures are other passes: they build none and read none.
import type { TextureHandle } from "../FrameGraph.ts";
import type { ViewFrame } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import {
  LISTS_PER_VIEW,
  occlusionOn,
  MAX_QUERIES,
  QUERY_FLOATS,
  type OcclusionQueries,
} from "../../scene/occlusionFeedback.ts";
import {
  OCCLUSION_BIAS,
  pyramidShape,
  type PyramidShape,
} from "./occlusionMath.ts";
import type { EngineRaster } from "./engineRaster.ts";
import type { EngineScene } from "../../scene/engineScene.ts";

export interface OcclusionPassEngine extends Pick<
  Engine,
  "bodyCamera" | "ctx" | "occlusionFeedback"
> {
  readonly raster: Pick<
    EngineRaster,
    "frameNumber" | "occlusionReads" | "timer"
  >;
  readonly scene: Pick<EngineScene, "viewIds">;
}

/** Words of results: one bit a query. */
const RESULT_WORDS = MAX_QUERIES / 32;
const PARAMS_BYTES = 32;

/** A view's pyramid: its texture, bind groups and the camera it was built for. */
export class DepthPyramid {
  readonly texture: GPUTexture;
  readonly shape: PyramidShape;
  /** All levels, for the queries. */
  readonly view: GPUTextureView;
  /** Level 0 alone, as storage: what `priors` draw into. */
  readonly level0: GPUTextureView;
  /**
   * Analytic occluders drawn into level 0 after the depth is folded and
   * before the levels above are reduced (a hook; none is registered yet).
   * Each writes, per texel, the nearer (larger, reverse-Z) of what is there
   * and its own depth, for a shape that is certainly opaque where it is: the
   * body occluder's ellipsoid (`streaming/occluders.ts` `BodyShape`, inside
   * the drawn terrain) would be one, from its center and radii seen from
   * `built`'s camera. Both phases of the draws' occlusion cull and the tile
   * queries then read it, so a shape hidden in the drawn depth adds nothing
   * and one the depth lacks (terrain not loaded yet) hides what it proves.
   */
  readonly priors: Array<
    (pass: GPUComputePassEncoder, pyramid: DepthPyramid) => void
  > = [];
  private readonly groups: GPUBindGroup[] = [];
  /** Level 0's group from a single-sampled depth, and the view it binds (`encode`'s `pixels`). */
  private pixelsGroup: GPUBindGroup | undefined;
  private pixelsFor: GPUTextureView | undefined;
  /**
   * The tick (`EngineRaster.frameNumber`) it was last built in: the occlusion
   * cull builds it once a tick, and the tile queries then read that one.
   */
  builtTick = -1;
  /**
   * The camera it was built for: what the queries' camera space is, and what
   * the next tick's occlusion cull sees it from (occlusionCull.ts).
   */
  built:
    | {
        tanX: number;
        tanY: number;
        near: number;
        position: Float64Array;
        direction: Float64Array;
        up: Float64Array;
        right: Float64Array;
      }
    | undefined;

  constructor(
    private readonly device: GPUDevice,
    pipelines: Pick<
      OcclusionPassEngine["ctx"]["pipelines"],
      "hzbLevel0" | "hzbReduce"
    >,
    depth: GPUTextureView,
    readonly width: number,
    readonly height: number,
  ) {
    this.shape = pyramidShape(width, height);
    this.texture = device.createTexture({
      label: "occlusion.pyramid",
      size: [this.shape.width, this.shape.height],
      format: "r32float",
      mipLevelCount: this.shape.levels,
      // COPY_SRC: reading a level back to look at it (spikes/occlusion.ts).
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.view = this.texture.createView({ label: "occlusion.pyramid" });
    const level = (mip: number) =>
      this.texture.createView({ baseMipLevel: mip, mipLevelCount: 1 });
    this.level0 = level(0);
    this.groups.push(
      device.createBindGroup({
        layout: pipelines.hzbLevel0.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: depth },
          { binding: 1, resource: this.level0 },
        ],
      }),
    );
    for (let mip = 1; mip < this.shape.levels; mip++) {
      this.groups.push(
        device.createBindGroup({
          layout: pipelines.hzbReduce.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: level(mip - 1) },
            { binding: 1, resource: level(mip) },
          ],
        }),
      );
    }
  }

  /**
   * Encodes every level, in order, into one compute pass: level 0 from the
   * multisampled depth it was made with, or from `pixels`, a single-sampled
   * depth of the same size (the ambient-occlusion prepass's; hzb.slang
   * `level0Pixels`).
   */
  encode(
    pass: GPUComputePassEncoder,
    pipelines: Pick<
      OcclusionPassEngine["ctx"]["pipelines"],
      "hzbLevel0" | "hzbLevel0Pixels" | "hzbReduce"
    >,
    pixels?: GPUTextureView,
  ): void {
    if (pixels && (!this.pixelsGroup || this.pixelsFor !== pixels)) {
      this.pixelsFor = pixels;
      this.pixelsGroup = this.device.createBindGroup({
        label: "occlusion.pyramid.pixels",
        layout: pipelines.hzbLevel0Pixels.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: pixels },
          { binding: 1, resource: this.level0 },
        ],
      });
    }
    for (let mip = 0; mip < this.shape.levels; mip++) {
      if (mip === 1) {
        for (const prior of this.priors) {
          prior(pass, this);
        }
      }
      pass.setPipeline(
        mip > 0
          ? pipelines.hzbReduce
          : pixels
            ? pipelines.hzbLevel0Pixels
            : pipelines.hzbLevel0,
      );
      pass.setBindGroup(
        0,
        mip === 0 && pixels ? this.pixelsGroup! : this.groups[mip]!,
      );
      const width = Math.max(this.shape.width >> mip, 1);
      const height = Math.max(this.shape.height >> mip, 1);
      pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
    }
  }

  destroy(): void {
    this.texture.destroy();
  }
}

/** The buffers one pooled list is answered through. */
interface QuerySlot {
  readonly params: GPUBuffer;
  readonly queries: GPUBuffer;
  readonly hidden: GPUBuffer;
  readonly readback: GPUBuffer;
  group: GPUBindGroup | undefined;
}

/** A view frame's occlusion resources, made when the first list is asked. */
export class FrameOcclusion {
  readonly pyramid: DepthPyramid;
  private readonly slots: QuerySlot[] = [];

  constructor(
    private readonly device: GPUDevice,
    pipelines: OcclusionPassEngine["ctx"]["pipelines"],
    depth: GPUTextureView,
    width: number,
    height: number,
  ) {
    this.pyramid = new DepthPyramid(device, pipelines, depth, width, height);
    for (let i = 0; i < LISTS_PER_VIEW; i++) {
      this.slots.push({
        params: device.createBuffer({
          label: "occlusion.params",
          size: PARAMS_BYTES,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }),
        queries: device.createBuffer({
          label: "occlusion.queries",
          size: MAX_QUERIES * QUERY_FLOATS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }),
        hidden: device.createBuffer({
          label: "occlusion.hidden",
          size: RESULT_WORDS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        }),
        readback: device.createBuffer({
          label: "occlusion.readback",
          size: RESULT_WORDS * 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
        group: undefined,
      });
    }
  }

  slot(
    index: number,
    pipelines: OcclusionPassEngine["ctx"]["pipelines"],
  ): QuerySlot {
    const slot = this.slots[index]!;
    slot.group ??= this.device.createBindGroup({
      layout: pipelines.occlusionQuery.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: slot.params } },
        { binding: 1, resource: this.pyramid.view },
        { binding: 2, resource: { buffer: slot.queries } },
        { binding: 3, resource: { buffer: slot.hidden } },
      ],
    });
    return slot;
  }

  /**
   * Builds the pyramid from the depth and tests the list's boxes against it,
   * in two compute passes (`writes` to time them), and copies the bits to the
   * list's readback buffer: what `readOcclusion` then maps. `camera` is the
   * one the depth was drawn with and the boxes were made for. `build` false:
   * the pyramid was built this tick for that camera already (the occlusion
   * cull's), and the boxes are tested against it.
   */
  encode(
    enc: GPUCommandEncoder,
    pipelines: OcclusionPassEngine["ctx"]["pipelines"],
    list: OcclusionQueries,
    camera: NonNullable<DepthPyramid["built"]>,
    writes: {
      hzb?: GPUComputePassTimestampWrites | undefined;
      query?: GPUComputePassTimestampWrites | undefined;
    } = {},
    build = true,
  ): { readback: GPUBuffer; words: number } {
    const { pyramid } = this;
    const slot = this.slot(list.index, pipelines);
    if (build) {
      const hzb = enc.beginComputePass({
        label: "hzb",
        ...(writes.hzb ? { timestampWrites: writes.hzb } : {}),
      });
      pyramid.encode(hzb, pipelines);
      hzb.end();
      pyramid.built = camera;
    }
    const params = new ArrayBuffer(PARAMS_BYTES);
    new Uint32Array(params, 0, 4).set([
      list.count,
      pyramid.width,
      pyramid.height,
      pyramid.shape.levels,
    ]);
    new Float32Array(params, 16, 4).set([
      camera.tanX,
      camera.tanY,
      camera.near,
      OCCLUSION_BIAS,
    ]);
    this.device.queue.writeBuffer(slot.params, 0, params);
    this.device.queue.writeBuffer(
      slot.queries,
      0,
      list.data,
      0,
      list.count * QUERY_FLOATS,
    );
    const query = enc.beginComputePass({
      label: "occlusion-query",
      ...(writes.query ? { timestampWrites: writes.query } : {}),
    });
    query.setPipeline(pipelines.occlusionQuery);
    query.setBindGroup(0, slot.group!);
    query.dispatchWorkgroups(Math.ceil(list.count / 32));
    query.end();
    const words = Math.ceil(list.count / 32);
    enc.copyBufferToBuffer(slot.hidden, 0, slot.readback, 0, words * 4);
    return { readback: slot.readback, words };
  }

  destroy(): void {
    this.pyramid.destroy();
    for (const slot of this.slots) {
      slot.params.destroy();
      slot.queries.destroy();
      slot.hidden.destroy();
      slot.readback.destroy();
    }
  }
}

/** The camera a tick draws a view with, as a pyramid keeps it (`DepthPyramid.built`). */
export function cullCamera(
  engine: Pick<Engine, "bodyCamera">,
  view: View,
  frame: { width: number; height: number },
): NonNullable<DepthPyramid["built"]> {
  const camera = engine.bodyCamera(view);
  const aspect = frame.width / frame.height;
  const tanY = Math.tan(camera.fovy(aspect) / 2);
  return {
    tanX: tanY * aspect,
    tanY,
    near: camera.near,
    position: Float64Array.from(camera.position),
    direction: Float64Array.from(camera.direction),
    up: Float64Array.from(camera.up),
    right: Float64Array.from(camera.right),
  };
}

/** Whether two float64 vectors are the same. */
function same(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * The pass after `opaque`: the pyramid and the queries selection made this
 * tick, if any. A list made for another camera than the one drawn (selection
 * ran earlier, and the camera moved) isn't tested: its tiles stay unknown.
 * In a tick that culls the view's draws by occlusion (occlusionCull.ts), the
 * cull built the pyramid already, once, from its first phase's depth: the
 * queries read that one (it lacks only what the second phase drew, which
 * leaves a box visible, never hides one), and the next tick's first phase
 * tests against it.
 */
export function occlusionPass(
  engine: OcclusionPassEngine,
  view: View,
  frame: ViewFrame,
  { depth }: { depth: TextureHandle },
): (enc: GPUCommandEncoder, get: (h: TextureHandle) => GPUTextureView) => void {
  const { device, pipelines } = engine.ctx;
  return (enc, get) => {
    const feedback = view.occlusionState;
    const list = feedback.current;
    const camera = engine.bodyCamera(view);
    // The occlusion cull built this tick's pyramid already (occlusionCull.ts),
    // from the first phase's depth, before any splat: the queries read it.
    const built =
      frame.occlusion !== undefined &&
      frame.occlusion.pyramid.builtTick === engine.raster.frameNumber;
    // Off, nothing asked, or splats drawn into the depth it would be built
    // from: their depth is written for any covered pixel, translucent symbols
    // included, so it isn't an occluder.
    if (
      !occlusionOn(engine, view) ||
      !list ||
      list.count === 0 ||
      (frame.splatted && !built) ||
      !same(camera.position, list.position) ||
      !same(camera.direction, list.direction)
    ) {
      return;
    }
    const occlusion = (frame.occlusion ??= new FrameOcclusion(
      device,
      pipelines,
      get(depth),
      frame.width,
      frame.height,
    ));
    const taken = feedback.take()!;
    const { readback, words } = occlusion.encode(
      enc,
      pipelines,
      taken,
      cullCamera(engine, view, frame),
      {
        hzb: built ? undefined : engine.raster.timer.passWrites("hzb"),
        query: engine.raster.timer.passWrites("occlusion-query"),
      },
      !built,
    );
    engine.raster.occlusionReads.push({
      view,
      viewId: engine.scene.viewIds.get(view)!,
      list: taken,
      readback,
      words,
    });
  };
}

/** A render asked for at a time (ms, `performance.now`), per view: the earliest asked. */
const wakes = new WeakMap<
  View,
  { at: number; timer: ReturnType<typeof setTimeout> }
>();

/** Asks for a render at `at` (a hidden tile may coarsen then), unless one is due sooner. */
function wakeAt(view: View, at: number, requestRender: () => void): void {
  const pending = wakes.get(view);
  if (pending && pending.at <= at) {
    return;
  }
  if (pending) {
    clearTimeout(pending.timer);
  }
  const timer = setTimeout(
    () => {
      wakes.delete(view);
      requestRender();
    },
    Math.max(0, at - performance.now()) + 1,
  );
  wakes.set(view, { at, timer });
}

/**
 * After the submit: maps each list's readback and hands its bits to the
 * view's feedback. A readback that fails (the frame was rejected, the
 * buffer destroyed) frees its list and tells nothing.
 */
export function readOcclusion(
  reads: Array<{
    view: View;
    viewId: number;
    list: OcclusionQueries;
    readback: GPUBuffer;
    words: number;
  }>,
  /** Asks for a tick: selection runs again when a result changed what it sees. */
  requestRender: () => void,
): void {
  for (const read of reads.splice(0)) {
    void read.readback.mapAsync(GPUMapMode.READ, 0, read.words * 4).then(
      () => {
        const bits = new Uint32Array(
          read.readback.getMappedRange(0, read.words * 4).slice(0),
        );
        read.readback.unmap();
        const feedback = read.view.occlusionState;
        const flipped = feedback.apply(read.list, bits, read.viewId);
        if (flipped > 0) {
          requestRender();
        }
        if (feedback.coarsenAt !== undefined) {
          wakeAt(read.view, feedback.coarsenAt, requestRender);
        }
      },
      () => read.view.occlusionState.release(read.list),
    );
  }
}
