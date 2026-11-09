// An engine's rasterizer data: what its views' passes keep from tick to tick.
// The scene's half is `EngineScene`.
import { LIGHTS_SIZE } from "../../scene/lights.ts";
import { createShadowCascades } from "../../scene/shadows.ts";
import type { Sky } from "../../atmosphere/Sky.ts";
import type { TexturePool } from "../FrameGraph.ts";
import type { GpuTimer } from "../../gpu/GpuTimer.ts";
import type { ImageryProvider } from "../../globe/ImageryProvider.ts";
import type { CityLight } from "../../globe/cityLight.ts";
import type { View, HdrImage } from "../../scene/View.ts";
import type {
  ViewFrame,
  TargetFrame,
  WorldFrame,
  OverlayResources,
  PersistentImage,
} from "./viewFrameData.ts";
import type { RenderTarget } from "../../scene/renderTarget.ts";
import type { World } from "../../scene/World.ts";
import type { EnvironmentProbe } from "../../gpu/Environment.ts";
import type { PendingPick } from "./picks.ts";
import type { ViewBlock } from "../layout.ts";
import type { HeightCapture } from "../../scene/heightCaptures.ts";

/** One per engine, made once with it, and filled by its constructor. */
export class EngineRaster {
  /** The real-time atmosphere and the sky drawn from it. */
  sky!: Sky;
  pool!: TexturePool;
  timer!: GpuTimer;
  viewStaging!: GPUBuffer;
  viewData!: Float32Array;
  /**
   * Per view slot: a view block per shadow cascade (the sun's projection
   * and box, for culling and drawing the casters), and the receivers'
   * `Shadows` uniform; staged like the views' blocks.
   */
  cascadeData!: Float32Array;
  cascadeDataU32!: Uint32Array;
  cascadeStaging!: GPUBuffer;
  shadowData!: Float32Array;
  shadowStaging!: GPUBuffer;
  /** The night lights' mean around each view's camera (`cityLightAt`). */
  readonly cityLights = new WeakMap<ImageryProvider, CityLight>();
  readonly cityLightPlaces = new WeakMap<
    View,
    { city: CityLight; longitude: number; latitude: number; light: number }
  >();
  /** This tick's view's city light, cd/m² (`cityLightAt`). */
  viewCityLight = 0;
  /** Each drawn view's lights (lights.ts `packViewLights`), by slot. */
  lightStaging!: GPUBuffer;
  readonly lightData = new Float32Array(LIGHTS_SIZE / 4);
  readonly cascades = createShadowCascades();
  viewDataU32!: Uint32Array;
  readonly viewFrames = new Map<View, ViewFrame>();
  readonly targetFrames = new WeakMap<RenderTarget, TargetFrame>();
  readonly worldFrames = new WeakMap<World, WorldFrame>();
  readonly overlayResources = new Map<View, OverlayResources>();
  /**
   * Views lit by their atmosphere's environment: its probe, and the local
   * sun direction and altitude it was built for.
   */
  readonly probes = new Map<
    View,
    {
      probe: EnvironmentProbe;
      key: Float64Array;
      /** The exposure it was built at (its sky is pre-exposed). */
      exposure: number;
      pending: boolean;
    }
  >();
  /** The environment of a body without an atmosphere: black. */
  darkProbe: EnvironmentProbe | undefined;
  readonly pickReadback: GPUBuffer[] = [];
  pickParams!: GPUBuffer;
  pickResult!: GPUBuffer;
  readonly pickParamsData = new Uint32Array(4);
  readonly picks: PendingPick[] = [];
  /** Exposure meter readings this tick, mapped after submit. */
  readonly meters: Array<{
    view: View;
    readback: GPUBuffer;
    scratch: GPUBuffer[];
  }> = [];
  /** Depth ranges reduced this tick (`depthRange.slang`), mapped after submit. */
  readonly depthRanges: Array<{
    frame: ViewFrame;
    readback: GPUBuffer;
    scratch: GPUBuffer[];
  }> = [];
  /** HDR images copied this tick (`View.readHdr`), mapped after submit. */
  readonly hdrReads: Array<{
    buffer: GPUBuffer;
    bytesPerRow: number;
    width: number;
    height: number;
    /** The pre-exposure of the image read: divided out. */
    exposure: number;
    resolvers: Array<(image: HdrImage) => void>;
  }> = [];
  /**
   * Translucency's per-pixel lists ("exact", translucent.wgsl), shared by
   * the views (each clears and fills them in turn): the nodes they hold,
   * grown when a tick needed more (its count read back, one at a time).
   */
  lists?: GPUBuffer;
  listNodes = 0;
  listCountPending = false;
  readonly listCounts: GPUBuffer[] = [];
  /** Bound where a translucent pass doesn't read the lists or moments. */
  translucentDummies?: {
    buffer: GPUBuffer;
    zero: GPUTextureView;
    higher: GPUTextureView;
    /** For the meter, where the view draws no layers. */
    color: GPUTextureView;
  };
  readonly translucentData = new DataView(new ArrayBuffer(32));
  readonly presentData = new DataView(new ArrayBuffer(48));
  readonly adaptData = new Float32Array(4);
  /** The eye's local adaptation grid, sampled trilinearly. */
  adaptSampler?: GPUSampler;
  /** FXAA's image, sampled bilinearly. */
  fxaaSampler?: GPUSampler;
  readonly fxaaData = new DataView(new ArrayBuffer(32));
  readonly overlayColor = new Float32Array(4);
  viewBlock!: ViewBlock;
  /** Height captures (`addHeightCapture`). */
  readonly captures: HeightCapture[] = [];
  readonly commandBuffers: GPUCommandBuffer[] = [];
  frameNumber = 0;
  /**
   * Views sharing a canvas, on demand: each one's last presented image, so
   * a clean view is copied instead of re-rendered.
   */
  readonly persistent = new Map<View, PersistentImage>();
  readonly viewsPerTarget = new Map<RenderTarget, number>();
  readonly sharedTargets = new Set<RenderTarget>();
  readonly drawnViews = new Set<View>();
  readonly compositeClear: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  readonly compositePass: GPURenderPassDescriptor = {
    label: "composite.clear",
    colorAttachments: [this.compositeClear],
  };
  readonly copySource: GPUTexelCopyTextureInfo = {
    texture: undefined as never,
  };
  readonly copyDestination: GPUTexelCopyTextureInfo = {
    texture: undefined as never,
    origin: { x: 0, y: 0 },
  };
  cityLightRead = 0;
  cityLightSeen = 0;
}
