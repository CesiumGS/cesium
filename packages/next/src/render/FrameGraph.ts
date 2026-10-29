/**
 * A minimal frame graph. Passes declare the textures they read and write;
 * `execute` culls passes whose results nobody consumes, allocates transient
 * textures at first use and returns them to the pool after their last use,
 * so later passes (or later views in the same encoder) can alias them.
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
}

export class FrameGraph {
  private readonly resources: Resource[] = [];
  private readonly passes: Pass[] = [];

  constructor(private readonly allocator: TextureAllocator) {}

  createTexture(name: string, desc: TextureDesc): TextureHandle {
    const handle = { id: this.resources.length, name };
    this.resources.push({ handle, desc, lastUse: -1 });
    return handle;
  }

  /** An external texture (canvas, offscreen target). Writing it keeps a pass alive. */
  importTexture(name: string, view: GPUTextureView): TextureHandle {
    const handle = { id: this.resources.length, name };
    this.resources.push({ handle, imported: view, lastUse: -1 });
    return handle;
  }

  addPass(
    name: string,
    setup: PassSetup,
    execute: (encoder: GPUCommandEncoder, resolve: ResolveView) => void,
  ): void {
    this.passes.push({ name, setup, execute });
  }

  /** Names of the passes that would run, in order. */
  compile(): string[] {
    return this.livePasses().map((pass) => pass.name);
  }

  execute(encoder: GPUCommandEncoder): void {
    const live = this.livePasses();
    live.forEach((pass, index) => {
      for (const handle of [
        ...(pass.setup.reads ?? []),
        ...(pass.setup.writes ?? []),
      ]) {
        this.resources[handle.id]!.lastUse = index;
      }
    });

    const resolve: ResolveView = (handle) => {
      const resource = this.resources[handle.id]!;
      if (resource.imported) {
        return resource.imported;
      }
      if (!resource.view) {
        resource.texture = this.allocator.acquire(resource.desc!);
        resource.view = resource.texture.createView();
      }
      return resource.view;
    };

    live.forEach((pass, index) => {
      encoder.pushDebugGroup(pass.name);
      pass.execute(encoder, resolve);
      encoder.popDebugGroup();
      for (const resource of this.resources) {
        if (resource.lastUse === index && resource.texture) {
          this.allocator.release(resource.desc!, resource.texture);
          resource.texture = undefined;
          resource.view = undefined;
        }
      }
    });
  }

  private livePasses(): Pass[] {
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
    return this.passes.filter((_, i) => needed.has(i));
  }
}

/**
 * Pools transient textures across passes, views and frames. Textures unused
 * for `maxIdleFrames` frames are destroyed.
 */
export class TexturePool implements TextureAllocator {
  private readonly free = new Map<
    string,
    Array<{ texture: GPUTexture; idleSince: number }>
  >();
  private frame = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly maxIdleFrames = 120,
  ) {}

  acquire(desc: TextureDesc): GPUTexture {
    const list = this.free.get(keyOf(desc));
    const entry = list?.pop();
    if (entry) {
      return entry.texture;
    }
    return this.device.createTexture({
      label: desc.label,
      format: desc.format,
      size: { width: desc.width, height: desc.height },
      sampleCount: desc.sampleCount ?? 1,
      usage: desc.usage,
    });
  }

  release(desc: TextureDesc, texture: GPUTexture): void {
    const key = keyOf(desc);
    let list = this.free.get(key);
    if (!list) {
      list = [];
      this.free.set(key, list);
    }
    list.push({ texture, idleSince: this.frame });
  }

  endFrame(): void {
    this.frame++;
    for (const [key, list] of this.free) {
      const kept = list.filter((entry) => {
        const stale = this.frame - entry.idleSince > this.maxIdleFrames;
        if (stale) {
          entry.texture.destroy();
        }
        return !stale;
      });
      if (kept.length === 0) {
        this.free.delete(key);
      } else {
        this.free.set(key, kept);
      }
    }
  }

  destroy(): void {
    for (const list of this.free.values()) {
      for (const entry of list) {
        entry.texture.destroy();
      }
    }
    this.free.clear();
  }
}

function keyOf(desc: TextureDesc): string {
  return `${desc.format}|${desc.width}x${desc.height}|${desc.sampleCount ?? 1}|${desc.usage}`;
}
