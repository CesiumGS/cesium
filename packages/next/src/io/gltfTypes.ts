/**
 * The CPU-side result of parsing a glTF asset in a worker: GPU-ready attribute
 * streams, materials, decoded images and a flat list of draws with their
 * node transforms. Everything here is transferable.
 */

export interface GltfMesh {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  /** Linear RGBA. */
  colors?: Float32Array;
  /** xyz tangent, w handedness (glTF TANGENT). */
  tangents?: Float32Array;
  indices: Uint32Array;
}

/** Block-compressed (or fallback RGBA8) texture data transcoded in a worker. */
export type CompressedFormat = "bc7" | "astc-4x4" | "etc2-rgba8" | "rgba8";

export interface CompressedImage {
  kind: "compressed";
  format: CompressedFormat;
  width: number;
  height: number;
  /** One buffer per mip level, tightly packed rows of blocks (or pixels). */
  levels: Uint8Array[];
}

/** A decoded image: an ImageBitmap (PNG/JPEG/WebP) or transcoded KTX2. */
export type GltfImage = ImageBitmap | CompressedImage;

export interface GltfSampler {
  magFilter: GPUFilterMode;
  minFilter: GPUFilterMode;
  mipmapFilter: GPUMipmapFilterMode;
  addressModeU: GPUAddressMode;
  addressModeV: GPUAddressMode;
  /** The glTF min filter uses mipmaps. */
  mipmaps: boolean;
}

export interface GltfTexture {
  image: number;
  sampler: GltfSampler;
}

export interface GltfMaterial {
  /** Linear RGBA factor. */
  baseColor: [number, number, number, number];
  metallic: number;
  roughness: number;
  emissive: [number, number, number];
  alphaMode: "OPAQUE" | "MASK" | "BLEND";
  alphaCutoff: number;
  doubleSided: boolean;
  unlit: boolean;
  normalScale: number;
  occlusionStrength: number;
  baseColorTexture?: number;
  metallicRoughnessTexture?: number;
  normalTexture?: number;
  occlusionTexture?: number;
  emissiveTexture?: number;
}

export interface GltfDraw {
  mesh: number;
  /** Index into `materials`, or -1 for the glTF default material. */
  material: number;
  /** Node world matrix in glTF space (column-major float64). */
  matrix: Float64Array;
}

export interface GltfAsset {
  meshes: GltfMesh[];
  materials: GltfMaterial[];
  textures: GltfTexture[];
  images: GltfImage[];
  draws: GltfDraw[];
  /** Features skipped while parsing (unsupported extensions, attributes, modes). */
  warnings: string[];
}
