import type { MipGenerator } from "../gpu/MipGenerator.ts";
import type { CustomShader } from "./CustomShader.ts";
import {
  UNIFORM_BINDING,
  textureBinding,
  type TextureUniform,
} from "./uniforms.ts";

interface Texture {
  view: GPUTextureView;
  sampler: GPUSampler;
  texture?: GPUTexture;
  /** The declaration it was made from (a newer one replaces it). */
  from: TextureUniform;
}

interface Resources {
  buffer?: GPUBuffer;
  /** `shader.uniformVersion` the buffer holds. */
  written: number;
  textures: Map<string, Texture>;
  /** `shader.textureVersion` the textures were made from. */
  made: number;
  /** Bumped when a texture changes (bind groups are made again). */
  version: number;
}

/**
 * Custom shaders' uniforms and textures on the device (uniforms.ts): per
 * shader a uniform buffer and its textures, bound in group 2 beside a
 * texture set's (`Pipelines.setLayout`). Written before frames (`flush`);
 * textures load in the background and read white meanwhile.
 */
export class ShaderBindings {
  private readonly resources = new Map<CustomShader, Resources>();
  private changed = false;
  /** Bumped when any shader's textures change: worlds record again. */
  generation = 0;

  constructor(
    private readonly device: GPUDevice,
    private readonly defaults: { whiteView: GPUTextureView },
    private readonly mips: MipGenerator,
  ) {}

  /**
   * The shader's entries for group 2 beside a texture set's, and a key
   * that changes when they do.
   */
  entries(shader: CustomShader): {
    entries: GPUBindGroupEntry[];
    version: number;
  } {
    const r = this.resourcesOf(shader);
    const entries: GPUBindGroupEntry[] = [];
    if (r.buffer) {
      entries.push({
        binding: UNIFORM_BINDING,
        resource: { buffer: r.buffer },
      });
    }
    shader.uniformLayout.textures.forEach((name, k) => {
      const texture = r.textures.get(name)!;
      entries.push(
        { binding: textureBinding(k), resource: texture.view },
        { binding: textureBinding(k) + 1, resource: texture.sampler },
      );
    });
    return { entries, version: r.version };
  }

  /**
   * Writes changed uniform buffers and starts changed textures loading;
   * whether anything changed since the last call that consumed it
   * (frames then redraw).
   */
  flush(consume = true): boolean {
    for (const [shader, r] of this.resources) {
      if (r.buffer && r.written !== shader.uniformVersion) {
        this.device.queue.writeBuffer(r.buffer, 0, shader.uniformData);
        r.written = shader.uniformVersion;
        this.changed = true;
      }
      if (r.made !== shader.textureVersion) {
        r.made = shader.textureVersion;
        this.loadTextures(shader, r);
      }
    }
    const changed = this.changed;
    if (consume) {
      this.changed = false;
    }
    return changed;
  }

  destroy(): void {
    for (const r of this.resources.values()) {
      r.buffer?.destroy();
      for (const t of r.textures.values()) {
        t.texture?.destroy();
      }
    }
    this.resources.clear();
  }

  private resourcesOf(shader: CustomShader): Resources {
    let r = this.resources.get(shader);
    if (r) {
      return r;
    }
    const { bytes } = shader.uniformLayout;
    r = {
      written: shader.uniformVersion,
      textures: new Map(),
      made: shader.textureVersion,
      version: 0,
    };
    if (bytes > 0) {
      r.buffer = this.device.createBuffer({
        label: `${shader.label} uniforms`,
        size: bytes,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(r.buffer, 0, shader.uniformData);
    }
    this.resources.set(shader, r);
    // Changes reach the device before the next frame, which they request.
    shader.onChange(() => {
      this.changed = true;
    });
    this.loadTextures(shader, r);
    return r;
  }

  /** Textures whose declaration changed: white until each has loaded. */
  private loadTextures(shader: CustomShader, r: Resources): void {
    for (const [name, declaration] of shader.textures) {
      const current = r.textures.get(name);
      if (current?.from === declaration) {
        continue;
      }
      const sampler = this.device.createSampler({
        label: `${shader.label} ${name}Sampler`,
        addressModeU: declaration.clamp ? "clamp-to-edge" : "repeat",
        addressModeV: declaration.clamp ? "clamp-to-edge" : "repeat",
        magFilter: declaration.nearest ? "nearest" : "linear",
        minFilter: declaration.nearest ? "nearest" : "linear",
        mipmapFilter: declaration.nearest ? "nearest" : "linear",
      });
      if (!current) {
        r.textures.set(name, {
          view: this.defaults.whiteView,
          sampler,
          from: declaration,
        });
      } else {
        current.from = declaration;
      }
      void this.image(declaration.value).then(
        (image) => {
          const latest = r.textures.get(name)!;
          if (latest.from !== declaration) {
            return; // replaced while it loaded
          }
          const texture = this.device.createTexture({
            label: `${shader.label} ${name}`,
            size: [image.width, image.height],
            format: "rgba8unorm",
            mipLevelCount:
              Math.floor(Math.log2(Math.max(image.width, image.height))) + 1,
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
          });
          this.device.queue.copyExternalImageToTexture(
            { source: image },
            { texture },
            [image.width, image.height],
          );
          this.mips.generate(texture);
          latest.texture?.destroy();
          latest.texture = texture;
          latest.view = texture.createView();
          latest.sampler = sampler;
          r.version++;
          this.generation++;
          this.changed = true;
        },
        (error: unknown) => {
          console.error(
            `[cesium/next] ${shader.label}: texture ${name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      );
    }
  }

  private async image(
    source: TextureUniform["value"],
  ): Promise<Exclude<TextureUniform["value"], string>> {
    if (typeof source !== "string") {
      return source;
    }
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`${source}: HTTP ${response.status}`);
    }
    return createImageBitmap(await response.blob(), {
      colorSpaceConversion: "none",
      premultiplyAlpha: "none",
    });
  }
}
