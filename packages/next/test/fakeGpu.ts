/**
 * A WebGPU stand-in for Node: every object is a proxy that accepts any
 * call, so engine setup runs end to end and its layouts can be recorded
 * (test/limits.test.ts). Nothing is drawn or validated by it.
 */

const ASYNC = new Set([
  "createComputePipelineAsync",
  "createRenderPipelineAsync",
  "mapAsync",
  "onSubmittedWorkDone",
  "popErrorScope",
  "getCompilationInfo",
]);

function fake(
  label: string,
  overrides: Record<PropertyKey, unknown> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a stand-in for any WebGPU object
): any {
  const target = function () {} as unknown as Record<PropertyKey, unknown>;
  return new Proxy(target, {
    get(_t, key) {
      if (key in overrides) {
        return overrides[key];
      }
      if (key === "then") {
        return undefined;
      }
      if (key === Symbol.toPrimitive) {
        return () => 0;
      }
      if (key === "label") {
        return label;
      }
      if (typeof key === "string" && ASYNC.has(key)) {
        return () =>
          Promise.resolve(
            key === "getCompilationInfo"
              ? { messages: [] }
              : fake(`${label}.${key}`),
          );
      }
      if (key === "getMappedRange") {
        return (_offset = 0, size = 1 << 20) => new ArrayBuffer(size);
      }
      return fake(`${label}.${String(key)}`);
    },
    set(_t, key, value) {
      overrides[key] = value;
      return true;
    },
    apply() {
      return fake(`${label}()`);
    },
    construct() {
      return fake(`new ${label}`);
    },
  });
}

/** What a fake texture was created with, for checking copies. */
interface FakeTexture {
  width: number;
  height: number;
  depthOrArrayLayers: number;
  format: GPUTextureFormat;
  mipLevelCount: number;
  usage: number;
}
const fakeTextures = new WeakMap<object, FakeTexture>();

/** Usage bits as WebGPU defines them (the globals may not be installed). */
const COPY_SRC = 0x1;
const COPY_DST = 0x2;

/**
 * Checks a `copyTextureToTexture` as WebGPU validation would, for textures
 * the fake device made (others pass): each side's mip level exists, the
 * copy's box (origin and size, layers included) lies within that mip, the
 * formats match, the source has COPY_SRC and the destination COPY_DST, and
 * the two are different textures. Throws on the first failure.
 */
export function checkTextureCopy(
  source: GPUTexelCopyTextureInfo,
  destination: GPUTexelCopyTextureInfo,
  size: GPUExtent3D,
): void {
  const src = fakeTextures.get(source.texture);
  const dst = fakeTextures.get(destination.texture);
  if (!src || !dst) {
    return;
  }
  const [w, h, d] = Array.isArray(size)
    ? [size[0] ?? 1, size[1] ?? 1, size[2] ?? 1]
    : [
        (size as GPUExtent3DDict).width,
        (size as GPUExtent3DDict).height ?? 1,
        (size as GPUExtent3DDict).depthOrArrayLayers ?? 1,
      ];
  const fail = (why: string) => {
    throw new Error(`copyTextureToTexture: ${why}`);
  };
  if (source.texture === destination.texture) {
    fail("source and destination are the same texture");
  }
  if (src.format !== dst.format) {
    fail(`formats differ (${src.format}, ${dst.format})`);
  }
  if (!(src.usage & COPY_SRC)) {
    fail("the source lacks COPY_SRC");
  }
  if (!(dst.usage & COPY_DST)) {
    fail("the destination lacks COPY_DST");
  }
  for (const [name, side, t] of [
    ["source", source, src],
    ["destination", destination, dst],
  ] as const) {
    const mip = side.mipLevel ?? 0;
    if (mip >= t.mipLevelCount) {
      fail(`${name} mip ${mip} of ${t.mipLevelCount}`);
    }
    const o = side.origin;
    const [x, y, z] = Array.isArray(o)
      ? [o[0] ?? 0, o[1] ?? 0, o[2] ?? 0]
      : [
          (o as GPUOrigin3DDict | undefined)?.x ?? 0,
          (o as GPUOrigin3DDict | undefined)?.y ?? 0,
          (o as GPUOrigin3DDict | undefined)?.z ?? 0,
        ];
    const mw = Math.max(1, t.width >> mip);
    const mh = Math.max(1, t.height >> mip);
    if (x + w > mw || y + h > mh) {
      fail(`${name} box ${x + w}x${y + h} past mip ${mip}'s ${mw}x${mh}`);
    }
    if (z + d > t.depthOrArrayLayers) {
      fail(`${name} layers ${z} to ${z + d} past ${t.depthOrArrayLayers}`);
    }
  }
}

/** A device with `limits` (any limit not given is large). */
export function fakeDevice(limits: Record<string, number>): GPUDevice {
  const all = new Proxy(limits, {
    get: (t, key: string) => t[key] ?? 2 ** 30,
  });
  const device: Record<PropertyKey, unknown> = {
    limits: all,
    features: new Set<string>(),
    lost: new Promise(() => {}),
    addEventListener: () => {},
    pushErrorScope: () => {},
    popErrorScope: () => Promise.resolve(null),
    destroy: () => {},
  };
  // Buffers report the size they were created with (tables read it).
  device.createBuffer = (d: GPUBufferDescriptor) =>
    fake(`buffer ${d.label ?? ""}`, {
      size: d.size,
      usage: d.usage,
      destroy: () => {},
      getMappedRange: (_o = 0, size = d.size) => new ArrayBuffer(size),
    });
  device.createTexture = (d: GPUTextureDescriptor) => {
    const size = d.size as number[] | GPUExtent3DDict;
    const [width, height, depth] = Array.isArray(size)
      ? [size[0] ?? 1, size[1] ?? 1, size[2] ?? 1]
      : [
          (size as GPUExtent3DDict).width,
          (size as GPUExtent3DDict).height ?? 1,
          (size as GPUExtent3DDict).depthOrArrayLayers ?? 1,
        ];
    const described: FakeTexture = {
      width,
      height,
      depthOrArrayLayers: depth,
      format: d.format,
      mipLevelCount: d.mipLevelCount ?? 1,
      usage: d.usage,
    };
    const texture = fake(`texture ${d.label ?? ""}`, {
      ...described,
      destroy: () => {},
    });
    fakeTextures.set(texture, described);
    return texture;
  };
  // Texture copies are checked as WebGPU would (`checkTextureCopy`).
  device.createCommandEncoder = (d?: GPUCommandEncoderDescriptor) =>
    fake(`encoder ${d?.label ?? ""}`, {
      copyTextureToTexture: checkTextureCopy,
    });
  return fake("device", device) as GPUDevice;
}

/** Installs the WebGPU globals (usage flags) Node lacks. */
export function installGpuGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  g.GPUShaderStage ??= { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
  g.GPUBufferUsage ??= {
    MAP_READ: 0x1,
    MAP_WRITE: 0x2,
    COPY_SRC: 0x4,
    COPY_DST: 0x8,
    INDEX: 0x10,
    VERTEX: 0x20,
    UNIFORM: 0x40,
    STORAGE: 0x80,
    INDIRECT: 0x100,
    QUERY_RESOLVE: 0x200,
  };
  g.GPUTextureUsage ??= {
    COPY_SRC: 0x1,
    COPY_DST: 0x2,
    TEXTURE_BINDING: 0x4,
    STORAGE_BINDING: 0x8,
    RENDER_ATTACHMENT: 0x10,
    TRANSIENT_ATTACHMENT: 0x20,
  };
  g.GPUMapMode ??= { READ: 0x1, WRITE: 0x2 };
  g.GPUColorWrite ??= { RED: 1, GREEN: 2, BLUE: 4, ALPHA: 8, ALL: 15 };
  // Content workers start with the engine; none run here.
  g.Worker ??= class {
    onmessage: unknown = null;
    onerror: unknown = null;
    postMessage(): void {}
    terminate(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
  };
}

/** `navigator.gpu` handing out `device`. */
export function installFakeNavigator(device: GPUDevice): void {
  const adapter = {
    features: new Set<string>(),
    limits: device.limits,
    info: { vendor: "fake", architecture: "fake" },
    requestDevice: () => Promise.resolve(device),
  };
  const gpu = {
    requestAdapter: () => Promise.resolve(adapter),
    getPreferredCanvasFormat: () => "bgra8unorm",
    wgslLanguageFeatures: new Set<string>(),
  };
  Object.defineProperty(globalThis, "navigator", {
    value: { gpu, userAgent: "node", hardwareConcurrency: 4 },
    configurable: true,
  });
}

/** An engine on the fake device (Node), for tests of CPU-side world logic. */
export async function fakeEngine(
  limits: Record<string, number> = {},
): Promise<import("../src/scene/Engine.ts").Engine> {
  installGpuGlobals();
  installFakeNavigator(fakeDevice(limits));
  const { Engine } = await import("../src/scene/Engine.ts");
  return Engine.create({ limits: "adapter" });
}
