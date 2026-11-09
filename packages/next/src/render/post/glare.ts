// Glare (CESIUM2_WEBGPU_PLAN.md §13.22, §13.32): settings to passes. It comes after the
// meter and the eye's adaptation, so neither sees it. Its light list (glare.slang
// `glareSources`) gives the sun's record, and the stars that get a sprite.
import type { Sky } from "../../atmosphere/Sky.ts";
import { GLARE_BRIGHT_STARS } from "../../atmosphere/starCells.ts";
import type { GpuTimer } from "../../gpu/GpuTimer.ts";
import type { Camera } from "../../scene/Camera.ts";
import { lightListFor, type LightList } from "../../scene/lightList.ts";
import type { View } from "../../scene/View.ts";
import type { FrameGraph } from "../FrameGraph.ts";
import type { ChainEntry, ChainEngine, ChainIo, GraphStage } from "./chain.ts";

export { GLARE_BRIGHT_STARS };

/** Records in a view's list, the sun's among them (glare.slang `GLARE_SOURCES`). */
export const GLARE_SOURCES = 256;
/** Taps over the sun's disc (glare.slang `GLARE_DISC_TAPS`). */
export const GLARE_DISC_TAPS = 32;
/** The pixels a view's sprites may cover. */
export const GLARE_SPRITE_PIXELS = 4_000_000;
/** A sprite's largest radius, pixels (glare.slang `GLARE_SPRITE_MAX_RADIUS`). */
export const GLARE_SPRITE_MAX_RADIUS = 512;

/** Bytes of a record; the header is one more. */
const RECORD_BYTES = 32;
/** The list's buffer: the header, then the records. */
export const GLARE_SOURCES_BYTES = (GLARE_SOURCES + 1) * RECORD_BYTES;
/** glare.slang's `GlareFrame`, floats. */
const FRAME_FLOATS = 88;

/**
 * `n` points evenly spread in the unit disc: a Vogel spiral. glare.slang holds
 * `discTaps(32)` as a constant.
 */
export function discTaps(n: number): [number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i): [number, number] => {
    const r = Math.sqrt((i + 0.5) / n);
    return [r * Math.cos(i * golden), r * Math.sin(i * golden)];
  });
}

/** What glare adds to the engine's pipelines, made when first asked for. */
export interface GlarePipelines {
  sources: GPUComputePipeline;
}

/** What a view's glare needs of the engine. */
export interface GlareEngine {
  readonly ctx: ChainEngine["ctx"] & {
    readonly pipelines: { glare(): Promise<GlarePipelines> };
  };
  readonly raster: {
    readonly sky: Sky;
    readonly timer: Pick<GpuTimer, "passWrites">;
  };
  requestRender(): void;
}

/** A view's glare: its list, and what fills it. */
export class GlareViewState {
  /** The list: the header, then the records (glare.slang `GlareSource`). */
  readonly sources: GPUBuffer;
  private readonly frameBuffer: GPUBuffer;
  private readonly data = new Float32Array(FRAME_FLOATS);
  private readonly list: LightList = { sun: false, stars: 0 };
  private group: GPUBindGroup | undefined;
  private pipelines: GlarePipelines | undefined;
  /** This tick wrote its frame: its sky was drawn. */
  private fresh = false;
  /** The list holds nothing, for a view with no sky. */
  private cleared = true;

  constructor(
    private readonly engine: GlareEngine,
    private readonly view: View,
  ) {
    const { device } = engine.ctx;
    this.sources = device.createBuffer({
      label: "glare.sources",
      size: GLARE_SOURCES_BYTES,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    this.frameBuffer = device.createBuffer({
      label: "glare.frame",
      size: FRAME_FLOATS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    void engine.ctx.pipelines.glare().then((pipelines) => {
      this.pipelines = pipelines;
      engine.requestRender();
    });
  }

  /**
   * This view's values for the kernel: from the sky's uniform, as the sky just wrote it
   * for this view, so there's no new read of the field of view.
   */
  writeFrame(camera: Pick<Camera, "position">): void {
    const { engine, view, data, list } = this;
    const { sky } = engine.raster;
    lightListFor(view, sky.glareStarCount, list);
    sky.writeGlareFrame(data, view.body.ellipsoid, camera.position);
    const sun = view.lighting.sunIlluminance;
    data[22] = sun === "atmosphere" ? -1 : sun;
    data[23] = list.sun ? 1 : 0;
    // Sprites show nothing until a kernel says how far they reach.
    data[31] = 0;
    data[48] = GLARE_SPRITE_PIXELS;
    data[49] = GLARE_SOURCES;
    engine.ctx.device.queue.writeBuffer(this.frameBuffer, 0, data);
    this.fresh = true;
  }

  /** The list's pass: after the adaptation, reading depth. */
  private encode(enc: GPUCommandEncoder, depth: GPUTextureView): void {
    const { pipelines } = this;
    const fresh = this.fresh && (this.list.sun || this.list.stars > 0);
    this.fresh = false;
    if (!fresh) {
      if (!this.cleared) {
        enc.clearBuffer(this.sources);
        this.cleared = true;
      }
      return;
    }
    if (!pipelines) {
      return;
    }
    const { device } = this.engine.ctx;
    const { sky, timer } = this.engine.raster;
    this.group ??= device.createBindGroup({
      label: "glare.sources",
      layout: pipelines.sources.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: depth },
        { binding: 2, resource: sky.sunLightView },
        { binding: 3, resource: sky.tableSampler },
        { binding: 4, resource: { buffer: sky.glareStarBuffer() } },
        { binding: 5, resource: { buffer: this.sources } },
      ],
    });
    this.descriptor.timestampWrites = timer.passWrites("glare.sources");
    const pass = enc.beginComputePass(this.descriptor);
    pass.setPipeline(pipelines.sources);
    pass.setBindGroup(0, this.group);
    pass.dispatchWorkgroups(1);
    pass.end();
    this.cleared = false;
  }
  private readonly descriptor: GPUComputePassDescriptor = {
    label: "glare.sources",
  };

  /** The stage that fills the list. It leaves no image. */
  sourcesStage(): GraphStage {
    return {
      name: "glare-sources",
      slot: "scene",
      kind: "physics",
      label: "Glare's light list",
      enabled: false,
      register: (graph: FrameGraph, io: ChainIo) => {
        graph.addPass(
          "glare.sources",
          { reads: [io.depth], sideEffect: true },
          (enc, get) => this.encode(enc, get(io.depth)),
        );
      },
    };
  }

  destroy(): void {
    this.sources.destroy();
    this.frameBuffer.destroy();
  }
}

/** A view's glare, if it has any: what joins its chain, and its state. */
export function glareFor(
  engine: GlareEngine,
  view: View,
  width: number,
  height: number,
): { entries: readonly ChainEntry[]; state: GlareViewState } | undefined {
  if (view.observer.glare === null || width < 2 || height < 2) {
    return undefined;
  }
  const state = new GlareViewState(engine, view);
  return { entries: [state.sourcesStage()], state };
}
