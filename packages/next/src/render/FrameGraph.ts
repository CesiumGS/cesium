/**
 * A minimal frame graph. Passes declare the textures they read and write;
 * compiling culls passes whose results nobody consumes and computes each
 * transient texture's last use. Executing allocates transient textures at
 * first use and returns them to the pool after their last use, so later
 * passes (or later views in the same encoder) can alias them.
 *
 * A graph is built once and executed every frame: imported textures (the
 * canvas texture) are rebound with `setImported`, and the compiled pass list
 * is cached until the graph changes. Executing allocates nothing.
 *
 * Buffers are persistent and not tracked here; passes that only touch
 * buffers declare `sideEffect: true`.
 */

export interface TextureDesc {
  label?: string;
  format: GPUTextureFormat;
  width: number;
  height: number;
  sampleCount?: number;
  usage: GPUTextureUsageFlags;
}

export interface TextureHandle {
  readonly id: number;
  readonly name: string;
}

export interface TextureAllocator {
  acquire(desc: TextureDesc): GPUTexture;
  release(desc: TextureDesc, texture: GPUTexture): void;
}

export interface PassSetup {
  reads?: TextureHandle[];
  writes?: TextureHandle[];
  /** Keep the pass even if nothing reads its outputs (buffer writes, readbacks). */
  sideEffect?: boolean;
}

export type ResolveView = (handle: TextureHandle) => GPUTextureView;

interface Resource {
  handle: TextureHandle;
  desc?: TextureDesc;
  imported?: GPUTextureView;
  texture?: GPUTexture;
  view?: GPUTextureView;
  lastUse: number;
}

interface Pass {
  name: string;
  setup: PassSetup;
  execute: (encoder: GPUCommandEncoder, resolve: ResolveView) => void;
  /** Transient resources whose last use is this pass (valid once compiled). */
  releases: Resource[];
}

/** Default views of pooled textures, created once per texture. */
const textureViews = new WeakMap<GPUTexture, GPUTextureView>();

function defaultView(texture: GPUTexture): GPUTextureView {
  let view = textureViews.get(texture);
  if (!view) {
    view = texture.createView();
    textureViews.set(texture, view);
  }
  return view;
}

export class FrameGraph {
  private readonly resources: Resource[] = [];
  private readonly passes: Pass[] = [];
  private live?: Pass[];

  constructor(private readonly allocator: TextureAllocator) {}

  createTexture(name: string, desc: TextureDesc): TextureHandle {
    const handle = { id: this.resources.length, name };
    this.resources.push({ handle, desc, lastUse: -1 });
    this.live = undefined;
    return handle;
  }

  /** An external texture (canvas, offscreen target). Writing it keeps a pass alive. */
  importTexture(name: string, view: GPUTextureView): TextureHandle {
    const handle = { id: this.resources.length, name };
    this.resources.push({ handle, imported: view, lastUse: -1 });
    this.live = undefined;
    return handle;
  }

  /** Rebinds an imported texture, e.g. to this frame's canvas texture. */
  setImported(handle: TextureHandle, view: GPUTextureView): void {
    this.resources[handle.id]!.imported = view;
  }

  addPass(
    name: string,
    setup: PassSetup,
    execute: (encoder: GPUCommandEncoder, resolve: ResolveView) => void,
  ): void {
    this.passes.push({ name, setup, execute, releases: [] });
    this.live = undefined;
  }

  /** Names of the passes that would run, in order. */
  compile(): string[] {
    return this.compiled().map((pass) => pass.name);
  }

  execute(encoder: GPUCommandEncoder): void {
    const live = this.compiled();
    for (let i = 0; i < live.length; i++) {
      const pass = live[i]!;
      encoder.pushDebugGroup(pass.name);
      pass.execute(encoder, this.resolve);
      encoder.popDebugGroup();
      const releases = pass.releases;
      for (let r = 0; r < releases.length; r++) {
        const resource = releases[r]!;
        if (resource.texture) {
          this.allocator.release(resource.desc!, resource.texture);
          resource.texture = undefined;
          resource.view = undefined;
        }
      }
    }
  }

  private readonly resolve: ResolveView = (handle) => {
    const resource = this.resources[handle.id]!;
    if (resource.imported) {
      return resource.imported;
    }
    if (!resource.view) {
      resource.texture = this.allocator.acquire(resource.desc!);
      resource.view = defaultView(resource.texture);
    }
    return resource.view;
  };

  private compiled(): Pass[] {
    if (this.live) {
      return this.live;
    }
    const needed = new Set<number>();
    const consumed = new Set<number>();
    for (let i = this.passes.length - 1; i >= 0; i--) {
      const pass = this.passes[i]!;
      const writes = pass.setup.writes ?? [];
      const keep =
        pass.setup.sideEffect === true ||
        writes.some(
          (h) =>
            this.resources[h.id]!.imported !== undefined || consumed.has(h.id),
        );
      if (keep) {
        needed.add(i);
        for (const h of pass.setup.reads ?? []) {
          consumed.add(h.id);
        }
      }
    }
    const live = this.passes.filter((_, i) => needed.has(i));
    for (const resource of this.resources) {
      resource.lastUse = -1;
    }
    live.forEach((pass, index) => {
      pass.releases.length = 0;
      for (const handle of [
        ...(pass.setup.reads ?? []),
        ...(pass.setup.writes ?? []),
      ]) {
        this.resources[handle.id]!.lastUse = index;
      }
    });
    for (const resource of this.resources) {
      if (resource.desc && resource.lastUse >= 0) {
        live[resource.lastUse]!.releases.push(resource);
      }
    }
    this.live = live;
    return live;
  }
}

interface PoolEntry {
  readonly texture: GPUTexture;
  idleSince: number;
}

interface PoolBucket {
  readonly key: string;
  readonly free: PoolEntry[];
}

/**
 * Pools transient textures across passes, views and frames. Textures unused
 * for `maxIdleFrames` frames are destroyed. Steady-state acquire/release
 * allocates nothing.
 */
export class TexturePool implements TextureAllocator {
  private readonly buckets = new Map<string, PoolBucket>();
  private readonly bucketList: PoolBucket[] = [];
  private readonly entries = new WeakMap<GPUTexture, PoolEntry>();
  private readonly keys = new WeakMap<TextureDesc, string>();
  private frame = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly maxIdleFrames = 120,
  ) {}

  acquire(desc: TextureDesc): GPUTexture {
    const entry = this.bucket(desc).free.pop();
    if (entry) {
      return entry.texture;
    }
    const texture = this.device.createTexture({
      label: desc.label,
      format: desc.format,
      size: { width: desc.width, height: desc.height },
      sampleCount: desc.sampleCount ?? 1,
      usage: desc.usage,
    });
    this.entries.set(texture, { texture, idleSince: this.frame });
    return texture;
  }

  release(desc: TextureDesc, texture: GPUTexture): void {
    const entry = this.entries.get(texture)!;
    entry.idleSince = this.frame;
    this.bucket(desc).free.push(entry);
  }

  endFrame(): void {
    this.frame++;
    // Staleness only needs a coarse check.
    if (this.frame % 30 !== 0) {
      return;
    }
    let emptied = false;
    for (let b = 0; b < this.bucketList.length; b++) {
      const free = this.bucketList[b]!.free;
      let kept = 0;
      for (let i = 0; i < free.length; i++) {
        const entry = free[i]!;
        if (this.frame - entry.idleSince > this.maxIdleFrames) {
          entry.texture.destroy();
        } else {
          free[kept++] = entry;
        }
      }
      if (kept !== free.length) {
        free.length = kept;
        emptied ||= kept === 0;
      }
    }
    if (emptied) {
      for (let b = this.bucketList.length - 1; b >= 0; b--) {
        const bucket = this.bucketList[b]!;
        if (bucket.free.length === 0) {
          this.bucketList.splice(b, 1);
          this.buckets.delete(bucket.key);
        }
      }
    }
  }

  destroy(): void {
    for (const bucket of this.bucketList) {
      for (const entry of bucket.free) {
        entry.texture.destroy();
      }
    }
    this.buckets.clear();
    this.bucketList.length = 0;
  }

  private bucket(desc: TextureDesc): PoolBucket {
    let key = this.keys.get(desc);
    if (key === undefined) {
      key = `${desc.format}|${desc.width}x${desc.height}|${desc.sampleCount ?? 1}|${desc.usage}`;
      this.keys.set(desc, key);
    }
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { key, free: [] };
      this.buckets.set(key, bucket);
      this.bucketList.push(bucket);
    }
    return bucket;
  }
}
