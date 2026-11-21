// The WebGPU side of content resources (src/scene/contentResources.ts): a
// world's content textures, its globe imagery slice array, and each imagery
// layer's compute compositor. Moved from gltfModel.ts, SlicePool.ts and
// GlobeImagery.ts unchanged; content now describes what to make and hands
// the device these handles back.
import { GpuTimer } from "../../gpu/GpuTimer.ts";
import { MipGenerator } from "../../gpu/MipGenerator.ts";
import {
  IMAGERY_STEPS_PER_TICK,
  type CompressedTexture,
  type ContentTexture,
  type ContentTextures,
  type DeviceSampler,
  type DeviceTexture,
  type ImageryCompositor,
  type ImageryDevice,
  type SamplerDescription,
  type SliceArray,
  type SliceComposite,
  type TextureImage,
} from "../../scene/contentResources.ts";
import type { RenderContext } from "../../scene/RenderContext.ts";
import type { TextureBinding } from "../../scene/world/types.ts";
import imageryWgsl from "../../shaders/generated/imagery.wgsl?raw";

// ------------------------------------------------------------- textures

/** A content texture: the GPU texture and the view texture sets bind. */
class WebGpuTexture implements ContentTexture {
  readonly view: GPUTextureView;
  constructor(
    readonly texture: GPUTexture,
    readonly bytes: number,
  ) {
    this.view = texture.createView();
  }
  destroy(): void {
    this.texture.destroy();
  }
}

class WebGpuSampler implements DeviceSampler {
  constructor(
    readonly description: SamplerDescription,
    readonly sampler: GPUSampler,
  ) {}
}

/** Content textures and samplers on a WebGPU device (glTF's, today). */
export class WebGpuContentTextures implements ContentTextures {
  constructor(private readonly ctx: Pick<RenderContext, "device" | "mips">) {}

  createTexture({ label, image, srgb, mipmaps }: TextureImage): ContentTexture {
    const { device, mips } = this.ctx;
    if (!(image instanceof ImageBitmap)) {
      const texture = uploadCompressed(this.ctx, image, srgb, mipmaps, label);
      return new WebGpuTexture(
        texture,
        image.levels.reduce((n, l) => n + l.byteLength, 0),
      );
    }
    const texture = device.createTexture({
      label: `gltf.${label}`,
      size: [image.width, image.height],
      format: srgb ? "rgba8unorm-srgb" : "rgba8unorm",
      mipLevelCount: mipmaps
        ? MipGenerator.levelCount(image.width, image.height)
        : 1,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: image }, { texture }, [
      image.width,
      image.height,
    ]);
    mips.generate(texture);
    // RGBA8 plus a full mip chain ≈ 4/3 of the base level.
    return new WebGpuTexture(
      texture,
      Math.round(
        image.width *
          image.height *
          4 *
          (texture.mipLevelCount > 1 ? 4 / 3 : 1),
      ),
    );
  }

  createSampler(s: SamplerDescription): DeviceSampler {
    return new WebGpuSampler(
      s,
      this.ctx.device.createSampler({
        magFilter: s.magFilter,
        minFilter: s.minFilter,
        mipmapFilter: s.mipmapFilter,
        addressModeU: s.addressModeU,
        addressModeV: s.addressModeV,
        maxAnisotropy:
          s.mipmaps &&
          s.minFilter === "linear" &&
          s.magFilter === "linear" &&
          s.mipmapFilter === "linear"
            ? 16
            : 1,
      }),
    );
  }

  binding(texture: ContentTexture, sampler: DeviceSampler): TextureBinding {
    return {
      view: (texture as WebGpuTexture).view,
      sampler: (sampler as WebGpuSampler).sampler,
    };
  }
}

const BLOCK_FORMATS: Record<
  Exclude<CompressedTexture["format"], "rgba8">,
  [GPUTextureFormat, GPUTextureFormat]
> = {
  bc7: ["bc7-rgba-unorm", "bc7-rgba-unorm-srgb"],
  "astc-4x4": ["astc-4x4-unorm", "astc-4x4-unorm-srgb"],
  "etc2-rgba8": ["etc2-rgba8unorm", "etc2-rgba8unorm-srgb"],
};

/**
 * Uploads a worker-transcoded KTX2 image. Block formats get exactly the mip
 * levels the file provides (compressed formats cannot be render targets);
 * the uncompressed fallback gets a generated mip chain like other images.
 */
function uploadCompressed(
  ctx: Pick<RenderContext, "device" | "mips">,
  image: CompressedTexture,
  srgb: boolean,
  mipmaps: boolean,
  label: string,
): GPUTexture {
  const { device, mips } = ctx;
  const block = image.format !== "rgba8";
  const format: GPUTextureFormat =
    image.format === "rgba8"
      ? srgb
        ? "rgba8unorm-srgb"
        : "rgba8unorm"
      : BLOCK_FORMATS[image.format][srgb ? 1 : 0];
  const generate = !block && mipmaps && image.levels.length === 1;
  const texture = device.createTexture({
    label: `gltf.ktx2.${label}`,
    size: [image.width, image.height],
    format,
    mipLevelCount: generate
      ? MipGenerator.levelCount(image.width, image.height)
      : image.levels.length,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      (generate ? GPUTextureUsage.RENDER_ATTACHMENT : 0),
  });
  // Through one mapped staging buffer, as World's geometry: writeTexture
  // goes through the browser's transfer ring, and under a GPU backlog it
  // blocked the main thread for up to 0.5 s (AEC with vsync off, r38).
  // Buffer copies need rows padded to 256 bytes.
  const levels = image.levels.map((data, level) => {
    const width = Math.max(1, image.width >> level);
    const height = Math.max(1, image.height >> level);
    // Block formats: 4×4 blocks of 16 bytes; copies cover whole blocks.
    const columns = block ? Math.ceil(width / 4) : width;
    const rows = block ? Math.ceil(height / 4) : height;
    const rowBytes = columns * (block ? 16 : 4);
    const paddedRow = Math.ceil(rowBytes / 256) * 256;
    return { data, width, height, columns, rows, rowBytes, paddedRow };
  });
  const size = levels.reduce((n, l) => n + l.paddedRow * l.rows, 0);
  const staging = device.createBuffer({
    label: `gltf.ktx2.${label}.staging`,
    size,
    usage: GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  const bytes = new Uint8Array(staging.getMappedRange());
  const encoder = device.createCommandEncoder({ label: "gltf.ktx2.upload" });
  let at = 0;
  levels.forEach((l, level) => {
    if (l.paddedRow === l.rowBytes) {
      bytes.set(l.data.subarray(0, l.rowBytes * l.rows), at);
    } else {
      for (let r = 0; r < l.rows; r++) {
        bytes.set(
          l.data.subarray(r * l.rowBytes, (r + 1) * l.rowBytes),
          at + r * l.paddedRow,
        );
      }
    }
    encoder.copyBufferToTexture(
      {
        buffer: staging,
        offset: at,
        bytesPerRow: l.paddedRow,
        rowsPerImage: l.rows,
      },
      { texture, mipLevel: level },
      block ? [l.columns * 4, l.rows * 4] : [l.width, l.height],
    );
    at += l.paddedRow * l.rows;
  });
  staging.unmap();
  device.queue.submit([encoder.finish()]);
  staging.destroy(); // released once the copies have run
  if (generate) {
    mips.generate(texture);
  }
  return texture;
}

// ------------------------------------------------------------- imagery

/** A world's slice array: a `texture_2d_array` with mips. */
class WebGpuSliceArray implements SliceArray {
  constructor(
    readonly texture: GPUTexture,
    readonly layers: number,
  ) {}
  destroy(): void {
    this.texture.destroy();
  }
}

/** A decoded source tile. */
class WebGpuSource implements DeviceTexture {
  constructor(readonly texture: GPUTexture) {}
  destroy(): void {
    this.texture.destroy();
  }
}

/** What the slices bind into: the world's draws (`World.setImageryArray`). */
export interface SliceBindings {
  setImageryArray(view: GPUTextureView | undefined): void;
}

/** A world's globe imagery on a WebGPU device. */
export class WebGpuImagery implements ImageryDevice {
  constructor(
    private readonly ctx: Pick<RenderContext, "device" | "capacities">,
    private readonly world: SliceBindings,
  ) {}

  get maxLayers(): number {
    return this.ctx.capacities.textureArrayLayers;
  }

  createSource(bitmap: ImageBitmap, label: string): DeviceTexture {
    const device = this.ctx.device;
    const texture = device.createTexture({
      label: `globe.imagery.source ${label}`,
      size: [bitmap.width, bitmap.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
      bitmap.width,
      bitmap.height,
    ]);
    return new WebGpuSource(texture);
  }

  createCompositor(size: number): ImageryCompositor {
    return new WebGpuImageryCompositor(this.ctx.device, size);
  }

  createSlices(size: number, mipLevels: number, layers: number): SliceArray {
    return new WebGpuSliceArray(
      this.ctx.device.createTexture({
        label: "globe.slices",
        size: [size, size, layers],
        format: "rgba8unorm",
        mipLevelCount: mipLevels,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.COPY_SRC,
      }),
      layers,
    );
  }

  tryCreateSlices(
    size: number,
    mipLevels: number,
    layers: number,
    settle: (error: unknown) => void,
  ): SliceArray {
    const device = this.ctx.device;
    device.pushErrorScope("out-of-memory");
    const array = this.createSlices(size, mipLevels, layers);
    void device.popErrorScope().then(settle, settle);
    return array;
  }

  copySlices(
    from: SliceArray,
    to: SliceArray,
    layers: number,
    moves: ReadonlyArray<readonly [from: number, to: number]>,
    label: string,
  ): void {
    const old = (from as WebGpuSliceArray).texture;
    const texture = (to as WebGpuSliceArray).texture;
    const device = this.ctx.device;
    const encoder = device.createCommandEncoder({ label });
    for (let level = 0; level < texture.mipLevelCount; level++) {
      const extent = Math.max(1, texture.width >> level);
      encoder.copyTextureToTexture(
        { texture: old, mipLevel: level },
        { texture, mipLevel: level },
        [extent, extent, layers],
      );
      for (const [from, to] of moves) {
        encoder.copyTextureToTexture(
          { texture: old, mipLevel: level, origin: [0, 0, from] },
          { texture, mipLevel: level, origin: [0, 0, to] },
          [extent, extent, 1],
        );
      }
    }
    device.queue.submit([encoder.finish()]);
  }

  bindSlices(array: SliceArray | undefined): void {
    this.world.setImageryArray(
      array &&
        (array as WebGpuSliceArray).texture.createView({
          dimension: "2d-array",
        }),
    );
  }
}

/** Bytes of one `Params` block, padded to the uniform offset alignment. */
const PARAMS_BYTES = 1056;
const PARAMS_STRIDE = 1280;

/** One layer's compositing: a compute pass per fill, source tile and mip. */
class WebGpuImageryCompositor implements ImageryCompositor {
  /** Compiled asynchronously: a synchronous compile stalls frames. */
  private pipelines?: {
    fill: GPUComputePipeline;
    composite: GPUComputePipeline;
    downsample: GPUComputePipeline;
  };
  private readonly layout: GPUBindGroupLayout;
  private readonly params: GPUBuffer;
  private readonly sampler: GPUSampler;
  private readonly placeholder: GPUTextureView;

  constructor(
    private readonly device: GPUDevice,
    private readonly size: number,
  ) {
    this.layout = device.createBindGroupLayout({
      label: "globe.imagery.composite",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          sampler: { type: "filtering" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba8unorm" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform", hasDynamicOffset: true },
        },
      ],
    });
    const module = device.createShaderModule({
      label: "globe.imagery",
      code: imageryWgsl,
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.layout],
    });
    const pipeline = (entryPoint: string) =>
      device.createComputePipelineAsync({
        label: `globe.imagery.${entryPoint}`,
        layout: pipelineLayout,
        compute: { module, entryPoint },
      });
    void Promise.all([
      pipeline("fill"),
      pipeline("composite"),
      pipeline("downsample"),
    ]).then(([fill, composite, downsample]) => {
      this.pipelines = { fill, composite, downsample };
    });
    this.params = device.createBuffer({
      label: "globe.imagery.params",
      size: PARAMS_STRIDE * IMAGERY_STEPS_PER_TICK,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.placeholder = device
      .createTexture({
        size: [1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
      })
      .createView();
  }

  get ready(): boolean {
    return this.pipelines !== undefined;
  }

  composite(array: SliceArray, slices: readonly SliceComposite[]): void {
    const pipelines = this.pipelines;
    if (!pipelines || slices.length === 0) {
      return;
    }
    const texture = (array as WebGpuSliceArray).texture;
    const mips = texture.mipLevelCount;
    const device = this.device;
    const blocks: ArrayBuffer[] = [];
    const dispatches: Array<{
      pipeline: GPUComputePipeline;
      group: GPUBindGroup;
      offset: number;
    }> = [];
    const block = (params: Float32Array) => {
      blocks.push(params.buffer as ArrayBuffer);
      return (blocks.length - 1) * PARAMS_STRIDE;
    };
    for (const { slice, baseColor, sources } of slices) {
      const destination = sliceView(texture, slice, 0);
      // Base color, then each source tile over it.
      const fill = new Float32Array(PARAMS_BYTES / 4);
      fill[2] = this.size;
      fill.set([...baseColor, 1], 4);
      const fillOffset = block(fill);
      const fillGroup = this.bindGroup(this.placeholder, destination);
      dispatches.push({
        pipeline: pipelines.fill,
        group: fillGroup,
        offset: fillOffset,
      });
      for (const { texture: source, mapping } of sources) {
        const params = new Float32Array(PARAMS_BYTES / 4);
        params[0] = mapping.s0;
        params[1] = mapping.ds;
        params[2] = this.size;
        params.set(mapping.t, 8);
        const offset = block(params);
        const group = this.bindGroup(
          (source as WebGpuSource).texture.createView(),
          destination,
        );
        dispatches.push({
          pipeline: pipelines.composite,
          group: group,
          offset: offset,
        });
      }
      for (let level = 1; level < mips; level++) {
        const params = new Float32Array(PARAMS_BYTES / 4);
        params[2] = this.size >> level;
        const offset = block(params);
        const group = this.bindGroup(
          sliceView(texture, slice, level - 1),
          sliceView(texture, slice, level),
        );
        dispatches.push({
          pipeline: pipelines.downsample,
          group: group,
          offset: offset,
        });
      }
    }
    const encoder = device.createCommandEncoder({ label: "globe.imagery" });
    const data = new Uint8Array(blocks.length * PARAMS_STRIDE);
    blocks.forEach((b, i) => data.set(new Uint8Array(b), i * PARAMS_STRIDE));
    device.queue.writeBuffer(this.params, 0, data);
    for (const d of dispatches) {
      this.dispatch(encoder, d.pipeline, d.group, d.offset);
    }
    device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.params.destroy();
  }

  private dispatch(
    encoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    group: GPUBindGroup,
    offset: number,
  ): void {
    const pass = encoder.beginComputePass({
      timestampWrites: GpuTimer.groupWrites(this.device, "imagery"),
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group, [offset]);
    const groups = Math.ceil(this.size / 8);
    pass.dispatchWorkgroups(groups, groups);
    pass.end();
  }

  private bindGroup(
    source: GPUTextureView,
    destination: GPUTextureView,
  ): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: source },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: destination },
        {
          binding: 3,
          resource: { buffer: this.params, size: PARAMS_BYTES },
        },
      ],
    });
  }
}

function sliceView(
  texture: GPUTexture,
  slice: number,
  level: number,
): GPUTextureView {
  return texture.createView({
    dimension: "2d",
    baseArrayLayer: slice,
    arrayLayerCount: 1,
    baseMipLevel: level,
    mipLevelCount: 1,
  });
}
