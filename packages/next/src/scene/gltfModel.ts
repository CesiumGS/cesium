import { MipGenerator } from "../gpu/MipGenerator.ts";
import { MaterialFlags } from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { GltfAsset, GltfMaterial, GltfSampler } from "../io/gltfTypes.ts";
import type { RenderContext } from "./RenderContext.ts";
import type { DrawHandle, MeshHandle, TextureBinding, World } from "./World.ts";

export interface ModelOptions {
  /** Earth-fixed float64 transform of the model (e.g. an east-north-up frame). */
  modelMatrix: Mat4;
  /** Force unlit shading for every draw (used by parity tests). */
  unlit?: boolean;
  /**
   * How color textures are decoded: "srgb" (default) uses -srgb texture
   * formats; "gamma2.2" matches CesiumJS 1.x (unorm storage, pow 2.2 in the
   * shader, filtering in gamma space).
   */
  colorTransfer?: "srgb" | "gamma2.2";
  name?: string;
}

export interface ModelInstance {
  draws: DrawHandle[];
  /** Bounding sphere of the placed model, Earth-fixed. */
  center: Vec3;
  radius: number;
}

/**
 * glTF is y-up and z-forward; CesiumJS 1.x maps it to z-up, x-forward with
 * `Y_UP_TO_Z_UP × Z_UP_TO_X_UP` (ModelUtility.getAxisCorrectionMatrix).
 * Column-major, matching 1.x `Axis`.
 */
const Y_UP_TO_Z_UP = Float64Array.from([
  1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1,
]);
const Z_UP_TO_X_UP = Float64Array.from([
  0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,
]);
const AXIS_CORRECTION = m4.multiply(m4.mat4(), Y_UP_TO_Z_UP, Z_UP_TO_X_UP);

/**
 * Uploads a parsed glTF asset into a world: textures (sRGB where glTF says
 * so, with mips), materials and texture sets, meshes, and one draw per node
 * primitive. Node transforms are composed in float64; each draw's origin is
 * its world translation, so large Earth-fixed coordinates never reach float32.
 */
export function addGltf(
  ctx: RenderContext,
  world: World,
  asset: GltfAsset,
  options: ModelOptions,
): ModelInstance {
  const textures = new TextureUploader(ctx, asset);
  const gamma22 = options.colorTransfer === "gamma2.2";
  const materials = asset.materials.map((m) => ({
    index: world.addMaterial(materialData(m, gamma22)),
    textureSet: world.createTextureSet({
      baseColor: textures.binding(m.baseColorTexture, !gamma22),
      metallicRoughness: textures.binding(m.metallicRoughnessTexture, false),
      normal: textures.binding(m.normalTexture, false),
      occlusion: textures.binding(m.occlusionTexture, false),
      emissive: textures.binding(m.emissiveTexture, !gamma22),
    }),
    doubleSided: m.doubleSided,
  }));
  // glTF default material: white, metallic 1, roughness 1.
  const defaultMaterial = {
    index: world.addMaterial({ metallic: 1, roughness: 1 }),
    textureSet: 0,
    doubleSided: false,
  };
  const meshes: MeshHandle[] = asset.meshes.map((mesh) => world.addMesh(mesh));

  const base = m4.multiply(m4.mat4(), options.modelMatrix, AXIS_CORRECTION);
  const draws: DrawHandle[] = [];
  const spheres: Array<{ center: Vec3; radius: number }> = [];
  for (const draw of asset.draws) {
    const worldMatrix = m4.multiply(m4.mat4(), base, draw.matrix);
    const origin = v3.vec3(worldMatrix[12], worldMatrix[13], worldMatrix[14]);
    const model = m4.copy(m4.mat4(), worldMatrix);
    model[12] = model[13] = model[14] = 0;
    const material =
      draw.material >= 0 ? materials[draw.material]! : defaultMaterial;
    const mesh = meshes[draw.mesh]!;
    // A mirroring transform flips the winding; draw those without culling.
    const mirrored = determinant3(model) < 0;
    const handle = world.addDraw({
      mesh,
      origin,
      model,
      material: material.index,
      textureSet: material.textureSet,
      doubleSided: material.doubleSided || mirrored,
      unlit: options.unlit,
      name: options.name,
    });
    draws.push(handle);
    const center = m4.transformPoint(
      v3.vec3(),
      worldMatrix,
      v3.vec3(...mesh.center),
    );
    const scale = Math.cbrt(Math.abs(determinant3(model))) || 1;
    spheres.push({ center, radius: mesh.radius * scale });
  }
  textures.release();
  return { draws, ...unionSphere(spheres) };
}

function materialData(m: GltfMaterial, gamma22: boolean) {
  let flags = gamma22 ? MaterialFlags.gamma22Textures : 0;
  if (m.unlit) {
    flags |= MaterialFlags.unlit;
  }
  if (m.doubleSided) {
    flags |= MaterialFlags.doubleSided;
  }
  if (m.alphaMode === "MASK") {
    flags |= MaterialFlags.alphaMask;
  }
  if (m.alphaMode === "BLEND") {
    flags |= MaterialFlags.alphaBlend;
  }
  if (m.baseColorTexture !== undefined) {
    flags |= MaterialFlags.baseColorTexture;
  }
  if (m.metallicRoughnessTexture !== undefined) {
    flags |= MaterialFlags.metallicRoughnessTexture;
  }
  if (m.normalTexture !== undefined) {
    flags |= MaterialFlags.normalTexture;
  }
  if (m.occlusionTexture !== undefined) {
    flags |= MaterialFlags.occlusionTexture;
  }
  if (m.emissiveTexture !== undefined) {
    flags |= MaterialFlags.emissiveTexture;
  }
  return {
    baseColor: m.baseColor,
    emissive: m.emissive,
    metallic: m.metallic,
    roughness: m.roughness,
    alphaCutoff: m.alphaCutoff,
    normalScale: m.normalScale,
    occlusionStrength: m.occlusionStrength,
    flags,
  };
}

/** Creates GPU textures and samplers on demand, one per (image, color space). */
class TextureUploader {
  private readonly views = new Map<string, GPUTextureView>();
  private readonly samplers = new Map<string, GPUSampler>();

  constructor(
    private readonly ctx: RenderContext,
    private readonly asset: GltfAsset,
  ) {}

  binding(
    textureIndex: number | undefined,
    srgb: boolean,
  ): TextureBinding | undefined {
    if (textureIndex === undefined) {
      return undefined;
    }
    const texture = this.asset.textures[textureIndex];
    if (!texture || this.asset.images[texture.image] === undefined) {
      return undefined;
    }
    return {
      view: this.view(texture.image, srgb, texture.sampler.mipmaps),
      sampler: this.sampler(texture.sampler),
    };
  }

  /** Closes the decoded images once every texture is on the GPU. */
  release(): void {
    for (const image of this.asset.images) {
      image.close();
    }
  }

  private view(
    imageIndex: number,
    srgb: boolean,
    mipmaps: boolean,
  ): GPUTextureView {
    const key = `${imageIndex}|${srgb}|${mipmaps}`;
    let view = this.views.get(key);
    if (!view) {
      const image = this.asset.images[imageIndex]!;
      const { device, mips } = this.ctx;
      const texture = device.createTexture({
        label: `gltf.image${imageIndex}`,
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
      view = texture.createView();
      this.views.set(key, view);
    }
    return view;
  }

  private sampler(s: GltfSampler): GPUSampler {
    const key = JSON.stringify(s);
    let sampler = this.samplers.get(key);
    if (!sampler) {
      sampler = this.ctx.device.createSampler({
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
      });
      this.samplers.set(key, sampler);
    }
    return sampler;
  }
}

function determinant3(m: Mat4): number {
  return (
    m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) -
    m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) +
    m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!)
  );
}

function unionSphere(spheres: Array<{ center: Vec3; radius: number }>): {
  center: Vec3;
  radius: number;
} {
  const center = v3.vec3();
  if (spheres.length === 0) {
    return { center, radius: 0 };
  }
  for (const s of spheres) {
    v3.add(center, center, s.center);
  }
  v3.scale(center, center, 1 / spheres.length);
  let radius = 0;
  for (const s of spheres) {
    radius = Math.max(radius, v3.distance(center, s.center) + s.radius);
  }
  return { center, radius };
}
