// The WebGPU device (`RenderDevice`, scene/renderSeam.ts): the engine's GPU
// device, its render context and the sky's tables, the engine-wide
// rasterizer state (`EngineRaster`), each world's mirror and each view's
// renderer. `Engine` reaches the WebGPU renderer only through this object.
import { GpuDevice, type GpuDeviceOptions } from "../gpu/GpuDevice.ts";
import { enableGpuWork } from "../gpu/GpuWork.ts";
import { GpuTimer } from "../gpu/GpuTimer.ts";
import { runStartupProbes } from "../gpu/sampleRateProbe.ts";
import { RealtimeAtmosphere } from "../atmosphere/RealtimeAtmosphere.ts";
import { Sky } from "../atmosphere/Sky.ts";
import { deviceChoices } from "../profile/paths.ts";
import { support } from "../profile/support.ts";
import type { SupportReport } from "../profile/types.ts";
import { EARTH } from "../scene/Body.ts";
import type { Engine } from "../scene/Engine.ts";
import { LIGHTS_SIZE } from "../scene/lights.ts";
import {
  createRenderContext,
  SCENE_TARGETS,
  type RenderContext,
  type ShaderOverrides,
} from "../scene/RenderContext.ts";
import type {
  RenderDevice,
  RenderTick,
  ViewRenderer,
} from "../scene/renderSeam.ts";
import { SHADOW_CASCADES, SHADOWS_STRIDE } from "../scene/shadows.ts";
import type { View } from "../scene/View.ts";
import type { World } from "../scene/World.ts";
import { TexturePool } from "./FrameGraph.ts";
import { VIEW_STRIDE } from "./layout.ts";
import { GlareKernels } from "./post/glare.ts";
import { EngineRaster } from "./view/engineRaster.ts";
import { scratchFrame } from "./view/environment.ts";
import { updateExposure } from "./view/exposure.ts";
import { serveIdlePick } from "./view/picks.ts";
import { dropPersistent, render } from "./view/renderTick.ts";
import {
  scratchPlanes,
  scratchView,
  scratchViewProj,
} from "./view/viewBlocks.ts";
import { destroyViewFrame } from "./view/viewFrameData.ts";
import { WebGpuWorldMirror } from "./world/worldMirror.ts";

/** What opening the device made: the device, its context and the sky. */
export interface OpenedWebGpu {
  readonly gpu: GpuDevice;
  readonly ctx: RenderContext;
  readonly sky: Sky;
}

/** One per engine, made by its constructor. */
export class WebGpuDevice implements RenderDevice {
  readonly kind = "webgpu" as const;
  /** The engine-wide rasterizer state the renderer's passes read. */
  readonly raster: EngineRaster = new EngineRaster();
  readonly gpu: GpuDevice;
  readonly ctx: RenderContext;
  /** The device's facts and support report, made once a device (again after device loss). */
  private facts_: GpuDevice["facts"] | undefined;
  private support_: SupportReport | undefined;

  /**
   * Opens the device: requests it, runs the startup probes while the
   * atmosphere precomputes, then makes the render context from the paths
   * the device's facts choose.
   */
  static async open(
    options: GpuDeviceOptions & { shaders?: ShaderOverrides } = {},
  ): Promise<OpenedWebGpu> {
    const gpu = await GpuDevice.create(options);
    // The startup probes record into the device's facts, which the paths
    // are chosen from; they run while the atmosphere precomputes.
    const probed = runStartupProbes(gpu.device);
    const atmosphere = await RealtimeAtmosphere.create(gpu.device);
    const sky = await Sky.create(gpu.device, atmosphere, SCENE_TARGETS);
    await probed;
    const ctx = await createRenderContext(
      gpu.device,
      deviceChoices(gpu.facts),
      gpu.preferredCanvasFormat,
      {
        sunLight: sky.sunLight.createView(),
        aerialVolume: sky.aerialVolume.createView({ dimension: "3d" }),
        aerialScreen: sky.aerialScreen.createView({ dimension: "2d-array" }),
        air: sky.air,
        airTransmittance: sky.airTransmittance.createView({
          dimension: "2d-array",
        }),
        airScattering: sky.airScattering.createView({
          dimension: "2d-array",
        }),
      },
      options.shaders,
    );
    return { gpu, ctx, sky };
  }

  /**
   * Counts the CPU-side GPU work between frames (`FrameStats.work`): wraps
   * WebGPU's methods once for the page. False where they aren't available.
   */
  static trackWork(): boolean {
    return enableGpuWork();
  }

  /** The engine-wide staging buffers, pools and blocks for `maxViews` views. */
  constructor(
    private readonly engine: Engine,
    opened: OpenedWebGpu,
    maxViews: number,
  ) {
    const { gpu, ctx, sky } = opened;
    this.gpu = gpu;
    this.ctx = ctx;
    // A replacement device has facts of its own, and so a support report:
    // views resolve their looks again from them. The render context keeps
    // the paths it was made with (nothing rebuilds it after a loss yet).
    gpu.events.on("restored", () => {
      this.facts_ = undefined;
      this.support_ = undefined;
      engine.wake();
    });
    ctx.createMirror = (world) => this.createWorld(world);
    const raster = this.raster;
    raster.sky = sky;
    const device = ctx.device;
    raster.pool = new TexturePool(device);
    raster.timer = new GpuTimer(device, ctx.paths.gpuTiming === "timestamps");
    raster.glareKernels = new GlareKernels(
      device,
      (aperture, size) =>
        engine.scene.workers.request("glareKernel", { aperture, size }),
      () => engine.requestRender(),
      (message) => ctx.errors.report("frame", message),
    );
    raster.viewData = new Float32Array((maxViews * VIEW_STRIDE) / 4);
    raster.viewDataU32 = new Uint32Array(raster.viewData.buffer);
    raster.viewStaging = device.createBuffer({
      label: "viewStaging",
      size: maxViews * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    raster.cascadeData = new Float32Array(
      (maxViews * SHADOW_CASCADES * VIEW_STRIDE) / 4,
    );
    raster.cascadeDataU32 = new Uint32Array(raster.cascadeData.buffer);
    raster.cascadeStaging = device.createBuffer({
      label: "cascadeStaging",
      size: maxViews * SHADOW_CASCADES * VIEW_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    raster.shadowData = new Float32Array((maxViews * SHADOWS_STRIDE) / 4);
    raster.shadowStaging = device.createBuffer({
      label: "shadowStaging",
      size: maxViews * SHADOWS_STRIDE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    raster.lightStaging = device.createBuffer({
      label: "lightStaging",
      size: maxViews * LIGHTS_SIZE,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    raster.viewBlock = {
      viewProj: scratchViewProj,
      viewRotation: scratchView,
      cameraPosition: engine.sunDirection,
      near: 0,
      aspect: 1,
      planes: scratchPlanes,
      sunDirection: engine.sunDirection,
      width: 1,
      height: 1,
      iblFrame: scratchFrame,
      lighting: {
        sunIlluminance: 0,
        environment: "procedural",
        diffuseIbl: 0,
        specularIbl: 0,
      },
      specularMaxLod: 0,
      exposure: 1,
      body: EARTH,
      aerial: undefined,
      moon: undefined,
      moonAir: 0,
      cityLights: true,
      time: 0,
      // MORPH_SECONDS until the engine sets its own (`EngineScene`).
      transitionSeconds: engine.scene.transitionSeconds,
    };
    raster.pickParams = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    raster.pickResult = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
  }

  /** What was observed about the device: one object a device, so a change of it is a new device. */
  get facts(): GpuDevice["facts"] {
    return (this.facts_ ??= this.gpu.facts);
  }

  /** What views can do on this device, in scene terms (`View.support`). */
  get support(): SupportReport {
    return (this.support_ ??= support(this.facts));
  }

  createWorld(world: World): WebGpuWorldMirror {
    return new WebGpuWorldMirror(world);
  }

  createRenderer(view: View): WebGpuViewRenderer {
    return new WebGpuViewRenderer(this.engine, view, this);
  }

  render(tick: RenderTick): void {
    render(this.engine, tick.tilesetsUpdated, tick.targets, tick.views);
  }

  servePicks(rendering: ReadonlySet<View>): void {
    serveIdlePick(this.engine, rendering);
  }

  /** Destroys the engine-wide GPU state, then the device. */
  destroy(): void {
    const raster = this.raster;
    raster.pool.destroy();
    raster.lists?.destroy();
    raster.timer.destroy();
    raster.glareKernels.destroy();
    raster.sky.atmosphere.destroy();
    raster.sky.destroy();
    this.gpu.destroy();
  }
}

/** What draws one view on the WebGPU device: its frame, image and probe. */
export class WebGpuViewRenderer implements ViewRenderer {
  constructor(
    private readonly engine: Engine,
    readonly view: View,
    private readonly device: WebGpuDevice,
  ) {}

  /** The device's support report: every view on a WebGPU device can do the same. */
  get support(): SupportReport {
    return this.device.support;
  }

  exposure(): number {
    return updateExposure(this.engine, this.view);
  }

  /** Its persistent image, environment probe, frame and overlay resources. */
  destroy(): void {
    const { engine, view } = this;
    const raster = engine.raster;
    dropPersistent(engine, view);
    const probe = raster.probes.get(view);
    if (probe) {
      engine.ctx.environment.destroyProbe(probe.probe);
      raster.probes.delete(view);
    }
    const frame = raster.viewFrames.get(view);
    if (frame) {
      destroyViewFrame(frame);
    }
    raster.viewFrames.delete(view);
    raster.overlayResources.get(view)?.buffer.destroy();
    raster.overlayResources.get(view)?.params.destroy();
    raster.overlayResources.delete(view);
  }
}
