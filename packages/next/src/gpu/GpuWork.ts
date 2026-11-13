// Counts the CPU-side GPU work between two rendered frames, to find where
// time the timestamps don't cover goes: queue writes, copies encoded,
// submits, resources created (a new buffer or texture is zero-filled by the
// driver before its first use), and mapAsync calls. Off until
// `enableGpuWork()`: the inspector's and recorder's turning it on wraps the
// WebGPU prototypes' methods once, and nothing is wrapped before, so a page
// that never asks pays nothing.

/** One label's share of a counter. */
export type WorkBy = Array<[label: string, bytes: number, calls: number]>;

/** What happened since the last `takeGpuWork`. */
export interface GpuWork {
  /** `queue.writeBuffer`: calls and bytes. */
  uploadCalls: number;
  uploadBytes: number;
  /** `queue.writeTexture` and `copyExternalImageToTexture`: calls and bytes (data given; 0 for images). */
  textureCalls: number;
  textureBytes: number;
  /** `queue.submit` calls. */
  submits: number;
  /** Copies encoded (buffer to buffer, texture to texture, either way), and their bytes (textures estimated). */
  copyCalls: number;
  copyBytes: number;
  /** Buffers and textures created: count and bytes (textures estimated from format, mips included). */
  createdCount: number;
  createdBytes: number;
  /** `GPUBuffer.mapAsync` calls. */
  mapCalls: number;
  /** The largest writers and creators by label (`buffer.label`), biggest first. */
  uploadBy: WorkBy;
  createdBy: WorkBy;
}

const TOP = 6;
let on = false;
let state = fresh();

function fresh() {
  return {
    uploadCalls: 0,
    uploadBytes: 0,
    textureCalls: 0,
    textureBytes: 0,
    submits: 0,
    copyCalls: 0,
    copyBytes: 0,
    createdCount: 0,
    createdBytes: 0,
    mapCalls: 0,
    uploadBy: new Map<string, [number, number]>(),
    createdBy: new Map<string, [number, number]>(),
  };
}

function add(
  map: Map<string, [number, number]>,
  label: string,
  bytes: number,
): void {
  const key = label || "(unlabeled)";
  const entry = map.get(key);
  if (entry) {
    entry[0] += bytes;
    entry[1]++;
  } else {
    map.set(key, [bytes, 1]);
  }
}

/** Bytes a texel of `format` takes (a close estimate; compressed formats count 1). */
export function texelBytes(format: string): number {
  if (/32float|32uint|32sint/.test(format)) {
    return /^rgba/.test(format) ? 16 : /^rg/.test(format) ? 8 : 4;
  }
  if (/^rgba16/.test(format)) {
    return 8;
  }
  if (/^rg16/.test(format)) {
    return 4;
  }
  if (/^r16/.test(format)) {
    return 2;
  }
  if (/^rg8/.test(format)) {
    return 2;
  }
  if (/^r8/.test(format)) {
    return 1;
  }
  if (/^(bc|etc2|astc)/.test(format)) {
    return 1;
  }
  return 4;
}

function extent(size: GPUExtent3D): [number, number, number] {
  if (Array.isArray(size)) {
    return [size[0] ?? 1, size[1] ?? 1, size[2] ?? 1];
  }
  const d = size as GPUExtent3DDict;
  return [d.width, d.height ?? 1, d.depthOrArrayLayers ?? 1];
}

function textureBytes(d: GPUTextureDescriptor): number {
  const [w, h, l] = extent(d.size);
  const mips = d.mipLevelCount && d.mipLevelCount > 1 ? 4 / 3 : 1;
  return Math.round(w * h * l * texelBytes(d.format) * mips);
}

/** Whether counting is on. */
export function gpuWorkEnabled(): boolean {
  return on;
}

/**
 * Starts counting (once; later calls do nothing). False where WebGPU's
 * classes aren't there (a Node test with a fake device), which then counts
 * nothing.
 */
export function enableGpuWork(): boolean {
  const g = globalThis as unknown as Record<string, { prototype: object }>;
  if (on) {
    return true;
  }
  if (!g.GPUQueue || !g.GPUCommandEncoder || !g.GPUDevice || !g.GPUBuffer) {
    return false;
  }
  on = true;
  const wrap = <T extends object>(
    proto: T,
    name: string,
    before: (...args: never[]) => void,
  ): void => {
    const table = proto as unknown as Record<
      string,
      (...a: unknown[]) => unknown
    >;
    const original = table[name]!;
    table[name] = function (this: unknown, ...args: unknown[]) {
      (before as (...a: unknown[]) => void).apply(this, args);
      return original.apply(this, args);
    };
  };
  const queue = g.GPUQueue.prototype;
  wrap(
    queue,
    "writeBuffer",
    (
      buffer: GPUBuffer,
      _offset: number,
      data: ArrayBufferView | ArrayBuffer,
      dataOffset?: number,
      size?: number,
    ) => {
      const per =
        (data as { BYTES_PER_ELEMENT?: number }).BYTES_PER_ELEMENT ?? 1;
      const length =
        (data as { length?: number }).length ??
        (data as ArrayBuffer).byteLength;
      const bytes = (size ?? length - (dataOffset ?? 0)) * per;
      state.uploadCalls++;
      state.uploadBytes += bytes;
      add(state.uploadBy, buffer.label, bytes);
    },
  );
  wrap(
    queue,
    "writeTexture",
    (_dest: unknown, data: ArrayBufferView | ArrayBuffer) => {
      state.textureCalls++;
      state.textureBytes += data.byteLength;
    },
  );
  wrap(queue, "copyExternalImageToTexture", () => {
    state.textureCalls++;
  });
  wrap(queue, "submit", () => {
    state.submits++;
  });
  const encoder = g.GPUCommandEncoder.prototype;
  wrap(
    encoder,
    "copyBufferToBuffer",
    (_a: unknown, _b: unknown, _c: unknown, _d: unknown, size?: number) => {
      state.copyCalls++;
      state.copyBytes += size ?? 0;
    },
  );
  const texels = (
    texture: { texture: GPUTexture },
    size: GPUExtent3D,
  ): number => {
    const [w, h, l] = extent(size);
    return w * h * l * texelBytes(texture.texture.format);
  };
  wrap(
    encoder,
    "copyBufferToTexture",
    (_s: unknown, d: { texture: GPUTexture }, size: GPUExtent3D) => {
      state.copyCalls++;
      state.copyBytes += texels(d, size);
    },
  );
  wrap(
    encoder,
    "copyTextureToBuffer",
    (s: { texture: GPUTexture }, _d: unknown, size: GPUExtent3D) => {
      state.copyCalls++;
      state.copyBytes += texels(s, size);
    },
  );
  wrap(
    encoder,
    "copyTextureToTexture",
    (s: { texture: GPUTexture }, _d: unknown, size: GPUExtent3D) => {
      state.copyCalls++;
      state.copyBytes += texels(s, size);
    },
  );
  const device = g.GPUDevice.prototype;
  wrap(device, "createBuffer", (d: GPUBufferDescriptor) => {
    state.createdCount++;
    state.createdBytes += d.size;
    add(state.createdBy, d.label ?? "", d.size);
  });
  wrap(device, "createTexture", (d: GPUTextureDescriptor) => {
    const bytes = textureBytes(d);
    state.createdCount++;
    state.createdBytes += bytes;
    add(state.createdBy, d.label ?? "texture", bytes);
  });
  wrap(g.GPUBuffer.prototype, "mapAsync", () => {
    state.mapCalls++;
  });
  return true;
}

const top = (map: Map<string, [number, number]>): WorkBy =>
  [...map]
    .sort((a, b) => b[1][0] - a[1][0])
    .slice(0, TOP)
    .map(([label, [bytes, calls]]) => [label, bytes, calls]);

/** What was counted since the last call, and starts the next window. */
export function takeGpuWork(): GpuWork {
  const s = state;
  state = fresh();
  return { ...s, uploadBy: top(s.uploadBy), createdBy: top(s.createdBy) };
}
