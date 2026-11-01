import { MipGenerator } from "../gpu/MipGenerator.ts";
import { MaterialFlags } from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type {
  CompressedFormat,
  CompressedImage,
  GltfAsset,
  GltfMaterial,
  GltfSampler,
} from "../io/gltfTypes.ts";
import type { RenderContext } from "./RenderContext.ts";
import type {
  DrawHandle,
  MeshHandle,
  TextureBinding,
  TransformHandle,
  World,
} from "./World.ts";

export interface ModelOptions {
  /**
   * Float64 transform of the model (e.g. an east-north-up frame):
   * Earth-fixed, or relative to `parent`.
   */
  modelMatrix: Mat4;
  /** A transform the model hangs off (e.g. a tileset's root transform). */
  parent?: TransformHandle;
  /** Force unlit shading for every draw (used by parity tests). */
  unlit?: boolean;
  /**
   * How color textures are decoded: "srgb" (default) uses -srgb texture
   * formats; "gamma2.2" matches CesiumJS 1.x (unorm storage, pow 2.2 in the
   * shader, filtering in gamma space).
   */
  colorTransfer?: "srgb" | "gamma2.2";
  name?: string;
  /**
   * Axis convention: "gltf" (default) is y-up, z-forward like 1.x `Model`;
   * "3d-tiles" is tile content (b3dm/glb in a tileset), y-up, x-forward, like
   * 1.x `Cesium3DTileset`. "none": already in the frame of `modelMatrix`
   * (terrain, whose positions are Earth-fixed).
   */
  axes?: "gltf" | "3d-tiles" | "none";
  /** Initial view mask of every draw (default: all views). */
  viewMask?: number;
}

export interface ModelInstance {
  draws: DrawHandle[];
  /**
   * The model's root transform (`modelMatrix`): `World.setTransform` moves
   * the whole model, `setTransformVisible` hides it. Node transforms hang
   * off it.
   */
  readonly transform: TransformHandle;
  /** Bounding sphere where the model was placed, Earth-fixed. */
  center: Vec3;
  radius: number;
  /**
   * GPU bytes of the asset (arena geometry plus textures), shared by every
   * instance of it in the world.
   */
  bytes: number;
  /** The uploaded asset, freed when its last instance is removed. */
  readonly resources: UploadedAsset;
}

/**
 * A glTF asset's GPU resources in one world: uploaded once, shared by all
 * of its instances (glTF 2.1 external assets and repeated placements),
 * freed with the last.
 */
export interface UploadedAsset {
  meshes: MeshHandle[];
  materials: number[];
  textureSets: number[];
  textures: GPUTexture[];
  /** Per glTF material, and the default material last. */
  readonly drawMaterials: Array<{
    index: number;
    textureSet: number;
    doubleSided: boolean;
  }>;
  bytes: number;
  references: number;
}

/**
 * Uploads per world, asset and color transfer. Weak keys: a cached upload
 * never keeps a parsed asset (and its CPU geometry) alive.
 */
const uploads = new WeakMap<
  World,
  WeakMap<GltfAsset, Map<string, UploadedAsset>>
>();

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
 * Uploads a glTF asset into a world once: textures (sRGB where glTF says so,
 * with mips), materials and texture sets, and meshes. Later placements of
 * the same asset in the same world share them.
 */
function uploadAsset(
  ctx: RenderContext,
  world: World,
  asset: GltfAsset,
  gamma22: boolean,
): UploadedAsset {
  let byAsset = uploads.get(world);
  if (!byAsset) {
    byAsset = new WeakMap();
    uploads.set(world, byAsset);
  }
  let byTransfer = byAsset.get(asset);
  if (!byTransfer) {
    byTransfer = new Map();
    byAsset.set(asset, byTransfer);
  }
  const key = gamma22 ? "gamma2.2" : "srgb";
  const existing = byTransfer.get(key);
  if (existing && existing.references > 0) {
    existing.references++;
    return existing;
  }
  const textures = new TextureUploader(ctx, asset);
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
  const arenaBefore = world.arenaBytes;
  const meshes: MeshHandle[] = asset.meshes.map((mesh) => world.addMesh(mesh));
  const arenaBytes = world.arenaBytes - arenaBefore;
  textures.release();
  const upload: UploadedAsset = {
    meshes,
    materials: [...materials.map((m) => m.index), defaultMaterial.index],
    textureSets: materials.map((m) => m.textureSet),
    textures: textures.textures,
    drawMaterials: [...materials, defaultMaterial],
    bytes: arenaBytes + textures.bytes,
    references: 1,
  };
  byTransfer.set(key, upload);
  return upload;
}

/**
 * Places a parsed glTF asset in a world: its resources are uploaded once
 * per world (`uploadAsset`); each placement adds a root transform
 * (`modelMatrix`), a transform per node below it and one draw per node
 * primitive. Transforms compose in float64, so large Earth-fixed
 * coordinates never reach float32. `EXT_mesh_gpu_instancing` nodes draw
 * their mesh once per instance, culled per instance on the GPU.
 */
export function addGltf(
  ctx: RenderContext,
  world: World,
  asset: GltfAsset,
  options: ModelOptions,
): ModelInstance {
  const upload = uploadAsset(
    ctx,
    world,
    asset,
    options.colorTransfer === "gamma2.2",
  );
  const root = world.addTransform(options.modelMatrix, options.parent);

  // Below the root: RTC_CENTER × axis correction × node, as 1.x
  // ModelSceneGraph composes modelMatrix × RTC_CENTER × axis × node.
  const correction = m4.mat4();
  if (asset.rtcCenter) {
    correction[12] = asset.rtcCenter[0];
    correction[13] = asset.rtcCenter[1];
    correction[14] = asset.rtcCenter[2];
  }
  if (options.axes !== "none") {
    m4.multiply(
      correction,
      correction,
      options.axes === "3d-tiles" ? Y_UP_TO_Z_UP : AXIS_CORRECTION,
    );
  }
  const rootWorld = world.worldMatrix(root);
  const nodes = new Map<Float64Array, TransformHandle>();
  const draws: DrawHandle[] = [];
  const spheres: Array<{ center: Vec3; radius: number }> = [];
  for (const draw of asset.draws) {
    // One transform per node: its primitives share the node's matrix.
    const local = m4.multiply(m4.mat4(), correction, draw.matrix);
    let node = nodes.get(draw.matrix);
    if (!node) {
      node = world.addTransform(local, root);
      nodes.set(draw.matrix, node);
    }
    const worldMatrix = m4.multiply(m4.mat4(), rootWorld, local);
    const material =
      upload.drawMaterials[
        draw.material >= 0 ? draw.material : upload.drawMaterials.length - 1
      ]!;
    const mesh = upload.meshes[draw.mesh]!;
    // A mirroring transform flips the winding; draw those without culling.
    const mirrored = determinant3(worldMatrix) < 0;
    const handle = world.addDraw({
      mesh,
      transform: node,
      material: material.index,
      textureSet: material.textureSet,
      doubleSided: material.doubleSided || mirrored,
      unlit: options.unlit,
      name: options.name,
      viewMask: options.viewMask,
      features:
        asset.meshes[draw.mesh]!.featureTable !== undefined
          ? asset.featureTables[asset.meshes[draw.mesh]!.featureTable!]
          : undefined,
      ...(draw.instances
        ? {
            instances: {
              matrices: draw.instances,
              ...(draw.instanceFeatureIds
                ? { featureIds: draw.instanceFeatureIds }
                : {}),
            },
          }
        : {}),
    });
    draws.push(handle);
    const meshCenter = v3.vec3(...mesh.center);
    const placements: Mat4[] = [];
    if (draw.instances) {
      for (let k = 0; k < draw.instances.length; k += 16) {
        const instance = m4.mat4();
        instance.set(draw.instances.subarray(k, k + 16));
        placements.push(m4.multiply(instance, worldMatrix, instance));
      }
    } else {
      placements.push(worldMatrix);
    }
    for (const m of placements) {
      spheres.push({
        center: m4.transformPoint(v3.vec3(), m, meshCenter),
        radius: mesh.radius * (Math.cbrt(Math.abs(determinant3(m))) || 1),
      });
    }
  }
  return {
    draws,
    transform: root,
    ...unionSphere(spheres),
    bytes: upload.bytes,
    resources: upload,
  };
}

/**
 * Removes a placed glTF from its world; the asset's GPU resources are freed
 * with its last instance there.
 */
export function removeGltf(world: World, instance: ModelInstance): void {
  for (const draw of instance.draws) {
    world.removeDraw(draw);
  }
  instance.draws.length = 0;
  world.removeTransform(instance.transform);
  const upload = instance.resources;
  if (upload.references === 0 || --upload.references > 0) {
    return;
  }
  for (const mesh of upload.meshes) {
    world.removeMesh(mesh);
  }
  for (const material of upload.materials) {
    world.removeMaterial(material);
  }
  for (const set of upload.textureSets) {
    world.removeTextureSet(set);
  }
  for (const texture of upload.textures) {
    texture.destroy();
  }
  upload.meshes.length = 0;
  upload.materials.length = 0;
  upload.textureSets.length = 0;
  upload.textures.length = 0;
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
  /** Every texture created, for `removeGltf`. */
  readonly textures: GPUTexture[] = [];
  /** Approximate GPU bytes of those textures (mips included). */
  bytes = 0;
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
      if (image instanceof ImageBitmap) {
        image.close();
      }
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
      if (!(image instanceof ImageBitmap)) {
        const texture = uploadCompressed(
          this.ctx,
          image,
          srgb,
          mipmaps,
          imageIndex,
        );
        this.textures.push(texture);
        this.bytes += image.levels.reduce((n, l) => n + l.byteLength, 0);
        view = texture.createView();
        this.views.set(key, view);
        return view;
      }
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
      this.textures.push(texture);
      // RGBA8 plus a full mip chain ≈ 4/3 of the base level.
      this.bytes += Math.round(
        image.width *
          image.height *
          4 *
          (texture.mipLevelCount > 1 ? 4 / 3 : 1),
      );
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

const BLOCK_FORMATS: Record<
  Exclude<CompressedFormat, "rgba8">,
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
  ctx: RenderContext,
  image: CompressedImage,
  srgb: boolean,
  mipmaps: boolean,
  index: number,
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
    label: `gltf.ktx2.image${index}`,
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
  image.levels.forEach((data, level) => {
    const width = Math.max(1, image.width >> level);
    const height = Math.max(1, image.height >> level);
    // Block formats: 4×4 blocks of 16 bytes; copies cover whole blocks.
    const columns = block ? Math.ceil(width / 4) : width;
    const rows = block ? Math.ceil(height / 4) : height;
    device.queue.writeTexture(
      { texture, mipLevel: level },
      data,
      { bytesPerRow: columns * (block ? 16 : 4), rowsPerImage: rows },
      block ? [columns * 4, rows * 4] : [width, height],
    );
  });
  if (generate) {
    mips.generate(texture);
  }
  return texture;
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
