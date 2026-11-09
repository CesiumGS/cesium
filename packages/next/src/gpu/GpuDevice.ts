import { trackTextures } from "./textureTracking.ts";
import { Emitter } from "../core/Emitter.ts";
import { checkLayouts, requiredLimitsFor, type LimitsTier } from "./limits.ts";

/**
 * Optional WebGPU features, grouped by what they unlock. Every entry has a
 * fallback path; nothing here is required.
 */
const OPTIONAL_FEATURES: readonly GPUFeatureName[] = [
  "core-features-and-limits",
  "indirect-first-instance",
  "timestamp-query",
  "texture-compression-bc",
  "texture-compression-etc2",
  "texture-compression-astc",
  "shader-f16",
  "float32-filterable",
  "float32-blendable",
  "subgroups",
  "clip-distances",
  "dual-source-blending",
] as GPUFeatureName[];

export interface Capabilities {
  /** `firstInstance` in indirect draws is honored (else it is a silent no-op). */
  indirectFirstInstance: boolean;
  timestampQuery: boolean;
  subgroups: boolean;
  shaderF16: boolean;
  /** 32-bit float targets blend (translucency's moments; else 16-bit). */
  float32Blendable: boolean;
  textureCompression: { bc: boolean; etc2: boolean; astc: boolean };
}

export interface GpuDeviceOptions {
  powerPreference?: GPUPowerPreference;
  /** Recreate the device automatically after an unexpected loss. Default true. */
  recoverFromLoss?: boolean;
  /**
   * Which limits the device gets (`gpu/limits.ts`, §13.15). `base` (the
   * default): binding counts at the spec defaults, capacities at the
   * adapter's. `minimum`: everything at the spec defaults, to see what the
   * smallest device would. `adapter`: everything raised, for experiments.
   */
  limits?: LimitsTier;
}

export interface DeviceEvents {
  /** Fired after a device was lost and a replacement is ready. */
  restored: GPUDevice;
  lost: GPUDeviceLostInfo;
  error: GPUError;
}

/** What the adapter says of itself (`GpuDevice.adapterInfo`). */
export interface GpuAdapterInfo {
  vendor: string;
  architecture: string;
  isFallbackAdapter: boolean;
}

/**
 * Owns the GPUDevice. Requires core WebGPU (compatibility mode is a
 * non-goal) and treats device loss as a normal event: when the browser drops
 * the device, a new one is created and `restored` fires so owners can rebuild
 * GPU resources from CPU-side sources.
 */
export class GpuDevice {
  readonly events = new Emitter<DeviceEvents>();
  readonly preferredCanvasFormat: GPUTextureFormat;
  private _device: GPUDevice;
  private _adapter: GPUAdapter;
  private _caps: Capabilities;
  private _destroyed = false;
  private infoFor: GPUAdapter | undefined;
  private info: GpuAdapterInfo | undefined;

  private constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    private readonly options: Required<GpuDeviceOptions>,
  ) {
    this._adapter = adapter;
    this._device = device;
    this._caps = capabilitiesOf(device);
    this.preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.watch(device);
  }

  static async create(options: GpuDeviceOptions = {}): Promise<GpuDevice> {
    const resolved: Required<GpuDeviceOptions> = {
      powerPreference: options.powerPreference ?? "high-performance",
      recoverFromLoss: options.recoverFromLoss ?? true,
      limits: options.limits ?? "base",
    };
    const { adapter, device } = await requestDevice(
      resolved.powerPreference,
      resolved.limits,
    );
    return new GpuDevice(adapter, device, resolved);
  }

  get device(): GPUDevice {
    return this._device;
  }

  get adapter(): GPUAdapter {
    return this._adapter;
  }

  /** What glare's tiers go by: read once from the adapter (a new one on recovery). */
  get adapterInfo(): GpuAdapterInfo {
    if (this.infoFor !== this._adapter) {
      this.infoFor = this._adapter;
      const { info } = this._adapter;
      const fallback = (info as { isFallbackAdapter?: boolean })
        .isFallbackAdapter;
      this.info = {
        vendor: `${info.vendor}`,
        architecture: `${info.architecture}`,
        isFallbackAdapter: fallback === true,
      };
    }
    return this.info!;
  }

  get caps(): Capabilities {
    return this._caps;
  }

  /** The limits tier the device was created with. */
  get limitsTier(): LimitsTier {
    return this.options.limits;
  }

  destroy(): void {
    this._destroyed = true;
    this._device.destroy();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }

  private watch(device: GPUDevice): void {
    trackTextures(device);
    device.addEventListener("uncapturederror", (event) => {
      const error = (event as GPUUncapturedErrorEvent).error;
      // Listened to (the engine's EngineErrors): logged there, once each.
      if (!this.events.has("error")) {
        console.error(`[cesium/next] WebGPU error: ${error.message}`);
      }
      this.events.emit("error", error);
    });
    void device.lost.then(async (info) => {
      if (this._destroyed || info.reason === "destroyed") {
        return;
      }
      console.warn(`[cesium/next] WebGPU device lost: ${info.message}`);
      this.events.emit("lost", info);
      if (!this.options.recoverFromLoss) {
        return;
      }
      const { adapter, device: replacement } = await requestDevice(
        this.options.powerPreference,
        this.options.limits,
      );
      this._adapter = adapter;
      this._device = replacement;
      this._caps = capabilitiesOf(replacement);
      this.watch(replacement);
      this.events.emit("restored", replacement);
    });
  }
}

async function requestDevice(
  powerPreference: GPUPowerPreference,
  tier: LimitsTier,
): Promise<{ adapter: GPUAdapter; device: GPUDevice }> {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    throw new Error("WebGPU is not available in this browser.");
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference });
  if (!adapter) {
    throw new Error("No WebGPU adapter is available.");
  }
  const requiredFeatures = OPTIONAL_FEATURES.filter((f) =>
    adapter.features.has(f),
  );
  // Capacities at the adapter's values (vertex pulling and draw records live
  // in large storage buffers; imagery in array layers); binding counts at
  // the tier's, which for `base` means none raised (gpu/limits.ts).
  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: requiredLimitsFor(tier, adapter.limits),
  });
  // Layouts over the limits fail here with a readable message.
  checkLayouts(device);
  return { adapter, device };
}

function capabilitiesOf(device: GPUDevice): Capabilities {
  const has = (name: string) => device.features.has(name as GPUFeatureName);
  return {
    indirectFirstInstance: has("indirect-first-instance"),
    timestampQuery: has("timestamp-query"),
    subgroups: has("subgroups"),
    shaderF16: has("shader-f16"),
    float32Blendable: has("float32-blendable"),
    textureCompression: {
      bc: has("texture-compression-bc"),
      etc2: has("texture-compression-etc2"),
      astc: has("texture-compression-astc"),
    },
  };
}
