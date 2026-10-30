/**
 * Globe imagery (plan §3.8): each drawn terrain tile gets one slice of a
 * `texture_2d_array`, composited on the GPU from the imagery provider's
 * tiles and reprojected to the tile's geographic grid, so every terrain
 * draw samples one texture through one bind group.
 *
 * - Level: as 1.x, the imagery level whose texel spacing best matches the
 *   terrain tile's geometric error (errorRatio 1), clamped to the
 *   provider's levels.
 * - Compositing: a fill with the base color, one compute pass per source
 *   tile (texel rows mapped in float64 on the CPU), then mips.
 * - Until a tile's own slice is ready it draws its nearest ancestor's
 *   (up to `MAX_IMAGERY_LEVELS_UP` levels), as 1.x draws ancestor imagery.
 * - Slices are recycled least recently used; source tiles are fetched
 *   through the origin's request window and decoded in workers.
 */
import type { Tile } from "../streaming/Tile.ts";
import type { World } from "../scene/World.ts";
import type { RenderContext } from "../scene/RenderContext.ts";
import type { RequestScheduler } from "../streaming/RequestScheduler.ts";
import type { WorkerPool } from "../io/WorkerPool.ts";
import type { ModelInstance } from "../scene/gltfModel.ts";
import {
  MAX_IMAGERY_LEVELS_UP,
  MAX_IMAGERY_SLICES,
  packImagery,
} from "../render/layout.ts";
import type { ImageryProvider } from "./ImageryProvider.ts";
import imageryWgsl from "../shaders/imagery.wgsl?raw";

const WGS84_RADIUS = 6378137;
/** Web Mercator's latitude limit. */
const MAX_LATITUDE = 1.4844222297453324; // 85.05112878°
/** Bytes of one `Params` block, padded to the uniform offset alignment. */
const PARAMS_BYTES = 1056;
const PARAMS_STRIDE = 1280;
/** Compositing passes per frame (each a source tile or a mip). */
const PASSES_PER_FRAME = 256;
/** Decoded source tiles kept for later composites (about 256 KB each). */
const MAX_SOURCES = 512;

export interface GlobeImageryOptions {
  /** Slices in the array (default 512, at most the device limit). */
  slices?: number;
  /** Slice width and height in texels (default 256). */
  size?: number;
  /** Color where no imagery covers the tile (1.x Globe.baseColor, dark blue). */
  baseColor?: readonly [number, number, number];
}

interface Source {
  /** "empty": the provider has no imagery there (an ancestor's stands in). */
  state: "loading" | "ready" | "empty" | "failed";
  texture?: GPUTexture;
  used: number;
}

interface Job {
  level: number;
  /** Source tiles covering the terrain tile: [x, y] at `level`. */
  tiles: [number, number][];
}

export class GlobeImagery {
  readonly texture: GPUTexture;
  readonly size: number;
  /** Slice per terrain tile, and the frame it was last wanted. */
  private readonly slices = new Map<Tile, { slice: number; used: number }>();
  private readonly free: number[] = [];
  private readonly jobs = new Map<Tile, Job>();
  private readonly sources = new Map<string, Source>();
  private readonly applied = new WeakMap<ModelInstance, number>();
  private readonly pipelines: {
    fill: GPUComputePipeline;
    composite: GPUComputePipeline;
    downsample: GPUComputePipeline;
  };
  private readonly layout: GPUBindGroupLayout;
  private readonly params: GPUBuffer;
  private readonly sampler: GPUSampler;
  private readonly placeholder: GPUTextureView;
  private readonly baseColor: readonly [number, number, number];
  private readonly origin: string;
  private frame = 0;
  private loading = 0;

  constructor(
    private readonly ctx: RenderContext,
    private readonly world: World,
    readonly provider: ImageryProvider,
    private readonly requests: RequestScheduler,
    private readonly workers: WorkerPool,
    options: GlobeImageryOptions = {},
  ) {
    const device = ctx.device;
    this.size = options.size ?? 256;
    const slices = Math.min(
      options.slices ?? 512,
      device.limits.maxTextureArrayLayers,
      MAX_IMAGERY_SLICES,
    );
    this.baseColor = options.baseColor ?? [0, 0, 0.5];
    this.texture = device.createTexture({
      label: "globe.imagery",
      size: [this.size, this.size, slices],
      format: "rgba8unorm",
      mipLevelCount: Math.log2(this.size) + 1,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST,
    });
    for (let i = slices - 1; i >= 0; i--) {
      this.free.push(i);
    }
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
      device.createComputePipeline({
        label: `globe.imagery.${entryPoint}`,
        layout: pipelineLayout,
        compute: { module, entryPoint },
      });
    this.pipelines = {
      fill: pipeline("fill"),
      composite: pipeline("composite"),
      downsample: pipeline("downsample"),
    };
    this.params = device.createBuffer({
      label: "globe.imagery.params",
      size: PARAMS_STRIDE * PASSES_PER_FRAME,
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
    this.origin = new URL(
      provider.tileUrl(0, 0, Math.max(provider.minimumLevel, 1)),
    ).origin;
    requests.register(this.origin);
    world.setImageryArray(this.texture.createView({ dimension: "2d-array" }));
  }

  /** Loading or compositing: the terrain tileset stays active. */
  get busy(): boolean {
    return this.loading > 0 || this.jobs.size > 0;
  }

  /**
   * One frame: `wanted` are the terrain tiles drawn in any view, with their
   * priority (lower first). Requests and composites their slices, and
   * points each tile's draws at its slice or its nearest ancestor's.
   */
  update(wanted: Map<Tile, number>): void {
    const frame = ++this.frame;
    const order = [...wanted.entries()].sort((a, b) => a[1] - b[1]);
    for (const [tile] of order) {
      const own = this.slices.get(tile);
      if (own) {
        own.used = frame;
      } else if (!this.jobs.has(tile)) {
        this.jobs.set(tile, this.job(tile));
      }
    }
    // Jobs for tiles no longer drawn are dropped (their sources stay cached).
    for (const tile of this.jobs.keys()) {
      if (!wanted.has(tile)) {
        this.jobs.delete(tile);
      }
    }
    // Fetch sources, nearest tiles first, within the origin's window.
    for (const [tile] of order) {
      const job = this.jobs.get(tile);
      if (job) {
        for (const [x, y] of job.tiles) {
          if (this.resolve(x, y, job.level, frame) === "full") {
            break;
          }
        }
      }
    }
    this.composite(order, frame);
    for (const [tile] of order) {
      this.apply(tile);
    }
    this.trimSources(frame);
  }

  /** Drops the least recently used settled source tiles over the cap. */
  private trimSources(frame: number): void {
    if (this.sources.size <= MAX_SOURCES) {
      return;
    }
    const settled = [...this.sources.entries()]
      .filter(([, s]) => s.state !== "loading" && s.used < frame)
      .sort((a, b) => a[1].used - b[1].used);
    for (const [key, source] of settled) {
      if (this.sources.size <= MAX_SOURCES) {
        break;
      }
      source.texture?.destroy();
      this.sources.delete(key);
    }
  }

  /** Releases the GPU resources and the origin. */
  destroy(): void {
    this.requests.unregister(this.origin);
    for (const source of this.sources.values()) {
      source.texture?.destroy();
    }
    this.sources.clear();
    this.texture.destroy();
    this.params.destroy();
  }

  // ------------------------------------------------------------- levels

  /** 1.x ImageryLayer: the level whose texel spacing matches the error. */
  private job(tile: Tile): Job {
    const g = tile.globe!;
    const r = g.rectangle;
    const p = this.provider;
    const latitudeClosestToEquator =
      r.south > 0 ? r.south : r.north < 0 ? r.north : 0;
    const latitudeFactor =
      p.tilingScheme === "webMercator" ? Math.cos(latitudeClosestToEquator) : 1;
    const levelZeroTiles = p.tilingScheme === "webMercator" ? 1 : 2;
    const levelZeroSpacing =
      (WGS84_RADIUS * 2 * Math.PI * latitudeFactor) /
      (p.tileSize * levelZeroTiles);
    const level = Math.min(
      Math.max(
        Math.round(Math.log2(levelZeroSpacing / tile.geometricError)),
        p.minimumLevel,
      ),
      p.maximumLevel,
    );
    const tiles: [number, number][] = [];
    const n = 2 ** level;
    const x0 = Math.floor(((r.west + Math.PI) / (2 * Math.PI)) * n);
    const x1 = Math.ceil(((r.east + Math.PI) / (2 * Math.PI)) * n) - 1;
    const y0 = Math.floor(mercatorY(r.north) * n);
    const y1 = Math.ceil(mercatorY(r.south) * n) - 1;
    for (let y = Math.max(y0, 0); y <= Math.min(y1, n - 1); y++) {
      for (let x = Math.max(x0, 0); x <= Math.min(x1, n - 1); x++) {
        tiles.push([x, y]);
      }
    }
    return { level, tiles };
  }

  // ------------------------------------------------------------- sources

  /**
   * The tile that supplies imagery at (x, y, level): itself, or where the
   * provider has none, its nearest ancestor with imagery (as 1.x). Requests
   * what it needs; "wait" while loading, "full" when the window is full,
   * undefined when nothing above has imagery (the base color shows).
   */
  private resolve(
    x: number,
    y: number,
    level: number,
    frame: number,
  ): [number, number, number] | "wait" | "full" | undefined {
    for (; level >= this.provider.minimumLevel; level--, x >>= 1, y >>= 1) {
      const source = this.sources.get(`${level}/${x}/${y}`);
      if (!source) {
        return this.requestSource(x, y, level, frame) ? "wait" : "full";
      }
      source.used = frame;
      if (source.state === "loading") {
        return "wait";
      }
      if (source.state === "ready") {
        return [x, y, level];
      }
    }
    return undefined;
  }

  /** Requests a source tile if needed; false when the window is full. */
  private requestSource(
    x: number,
    y: number,
    level: number,
    frame: number,
  ): boolean {
    const key = `${level}/${x}/${y}`;
    const existing = this.sources.get(key);
    if (existing) {
      existing.used = frame;
      return true;
    }
    if (!this.requests.tryAcquire(this.origin)) {
      return false;
    }
    const source: Source = { state: "loading", used: frame };
    this.sources.set(key, source);
    this.loading++;
    void this.workers
      .request<{ bitmap?: ImageBitmap; bytes: number; empty?: true }>("image", {
        url: this.provider.tileUrl(x, y, level),
        ...(this.provider.headers ? { headers: this.provider.headers } : {}),
      })
      .then(({ bitmap, bytes, empty }) => {
        this.requests.release(this.origin, { bytes });
        if (empty || !bitmap) {
          source.state = "empty";
          return;
        }
        const texture = this.ctx.device.createTexture({
          label: `globe.imagery.source ${key}`,
          size: [bitmap.width, bitmap.height],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.ctx.device.queue.copyExternalImageToTexture(
          { source: bitmap },
          { texture },
          [bitmap.width, bitmap.height],
        );
        bitmap.close();
        source.texture = texture;
        source.state = "ready";
      })
      .catch(() => {
        this.requests.release(this.origin);
        source.state = "failed";
      })
      .finally(() => {
        this.loading--;
      });
    return true;
  }

  // ------------------------------------------------------------- compositing

  /** Composites ready jobs, nearest first, within the per-frame pass budget. */
  private composite(order: [Tile, number][], frame: number): void {
    const device = this.ctx.device;
    const mips = this.texture.mipLevelCount;
    let passes = 0;
    const blocks: ArrayBuffer[] = [];
    const dispatches: Array<{
      pipeline: GPUComputePipeline;
      group: GPUBindGroup;
      offset: number;
    }> = [];
    for (const [tile] of order) {
      const job = this.jobs.get(tile);
      if (!job) {
        continue;
      }
      const resolved = job.tiles.map(([x, y]) =>
        this.resolve(x, y, job.level, frame),
      );
      if (resolved.some((r) => r === "wait" || r === "full")) {
        continue;
      }
      // Distinct supplying tiles, coarse (stand-in ancestors) first, so the
      // tiles with their own imagery draw over them.
      const supply = new Map<string, [number, number, number]>();
      for (const r of resolved) {
        if (Array.isArray(r)) {
          supply.set(`${r[2]}/${r[0]}/${r[1]}`, r);
        }
      }
      const keys = [...supply.keys()].sort(
        (a, b) => supply.get(a)![2] - supply.get(b)![2],
      );
      if (passes + keys.length + mips + 1 > PASSES_PER_FRAME) {
        break;
      }
      const slice = this.allocate(frame);
      if (slice === undefined) {
        break;
      }
      const r = tile.globe!.rectangle;
      const destination = this.sliceView(slice, 0);
      const block = (params: Float32Array) => {
        blocks.push(params.buffer as ArrayBuffer);
        return (blocks.length - 1) * PARAMS_STRIDE;
      };
      // Base color, then each source tile over it.
      const fill = new Float32Array(PARAMS_BYTES / 4);
      fill[2] = this.size;
      fill.set([...this.baseColor, 1], 4);
      const fillOffset = block(fill);
      const fillGroup = this.bindGroup(this.placeholder, destination);
      dispatches.push({
        pipeline: this.pipelines.fill,
        group: fillGroup,
        offset: fillOffset,
      });
      for (const key of keys) {
        const [x, y, level] = supply.get(key)!;
        const source = this.sources.get(key)!;
        const offset = block(this.mapping(r, x, y, level));
        const group = this.bindGroup(source.texture!.createView(), destination);
        dispatches.push({
          pipeline: this.pipelines.composite,
          group: group,
          offset: offset,
        });
      }
      for (let level = 1; level < mips; level++) {
        const params = new Float32Array(PARAMS_BYTES / 4);
        params[2] = this.size >> level;
        const offset = block(params);
        const group = this.bindGroup(
          this.sliceView(slice, level - 1),
          this.sliceView(slice, level),
        );
        dispatches.push({
          pipeline: this.pipelines.downsample,
          group: group,
          offset: offset,
        });
      }
      passes += keys.length + mips + 1;
      this.slices.set(tile, { slice, used: frame });
      this.jobs.delete(tile);
    }
    if (dispatches.length === 0) {
      return;
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

  /**
   * Source coordinates for each destination texel, in float64: s linear in
   * the column, t per row (Web Mercator latitude is not linear).
   */
  private mapping(
    r: { west: number; south: number; east: number; north: number },
    x: number,
    y: number,
    level: number,
  ): Float32Array {
    const params = new Float32Array(PARAMS_BYTES / 4);
    const n = 2 ** level;
    const size = this.size;
    // Longitude → source s: lon = west + (i + 0.5) / size * width.
    const width = r.east - r.west;
    const sourceWest = (x / n) * 2 * Math.PI - Math.PI;
    const sourceWidth = (2 * Math.PI) / n;
    params[0] = (r.west - sourceWest) / sourceWidth;
    params[1] = width / size / sourceWidth;
    params[2] = size;
    for (let j = 0; j < size; j++) {
      const latitude = r.north - ((j + 0.5) / size) * (r.north - r.south);
      params[8 + j] =
        this.provider.tilingScheme === "webMercator"
          ? mercatorY(latitude) * n - y
          : ((Math.PI / 2 - latitude) / Math.PI) * n - y;
    }
    return params;
  }

  private dispatch(
    encoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    group: GPUBindGroup,
    offset: number,
  ): void {
    const pass = encoder.beginComputePass();
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
    return this.ctx.device.createBindGroup({
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

  private sliceView(slice: number, level: number): GPUTextureView {
    return this.texture.createView({
      dimension: "2d",
      baseArrayLayer: slice,
      arrayLayerCount: 1,
      baseMipLevel: level,
      mipLevelCount: 1,
    });
  }

  /** A free slice, or the least recently used one not wanted this frame. */
  private allocate(frame: number): number | undefined {
    const free = this.free.pop();
    if (free !== undefined) {
      return free;
    }
    let oldest: Tile | undefined;
    let used = frame;
    for (const [tile, s] of this.slices) {
      if (s.used < used) {
        used = s.used;
        oldest = tile;
      }
    }
    if (!oldest) {
      return undefined;
    }
    const { slice } = this.slices.get(oldest)!;
    this.slices.delete(oldest);
    return slice;
  }

  // ------------------------------------------------------------- draws

  /** Points the tile's draws at its slice, or its nearest ancestor's. */
  private apply(tile: Tile): void {
    const instance = tile.instance;
    if (!instance) {
      return;
    }
    let packed = 0;
    const g = tile.globe!;
    for (
      let t: Tile | undefined = tile, up = 0;
      t?.globe && up <= MAX_IMAGERY_LEVELS_UP;
      t = t.parent, up++
    ) {
      const own = this.slices.get(t);
      if (own) {
        const scale = 2 ** up;
        packed = packImagery(
          own.slice,
          up,
          g.x - t.globe.x * scale,
          g.y - t.globe.y * scale,
        );
        break;
      }
    }
    if (this.applied.get(instance) !== packed) {
      for (const draw of instance.draws) {
        this.world.setImagery(draw, packed);
      }
      this.applied.set(instance, packed);
    }
  }
}

/** Web Mercator y in [0, 1], 0 at the north limit. */
function mercatorY(latitude: number): number {
  const lat = Math.min(Math.max(latitude, -MAX_LATITUDE), MAX_LATITUDE);
  const s = Math.sin(lat);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}
