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
  /** Per-vertex local feature IDs (0xffffffff: no feature). */
  featureIds?: Uint32Array;
  /** Size of the local feature-ID space. */
  featureCount?: number;
  /** Index into `GltfAsset.featureTables` describing the features. */
  featureTable?: number;
  /** "line-list" for glTF LINES/LINE_STRIP/LINE_LOOP; default triangle-list. */
  topology?: "triangle-list" | "line-list";
}

/** A property value of one feature (null: the property's noData). */
export type FeatureValue =
  string | number | boolean | null | Array<string | number | boolean>;

/**
 * Per-feature properties, column-oriented: an `EXT_structural_metadata`
 * property table or a b3dm batch table.
 */
export interface FeatureTable {
  name?: string;
  className?: string;
  count: number;
  columns: Record<string, FeatureValue[]>;
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

/** How a content load spent its time in the worker, and its image types. */
export interface ContentTiming {
  /** Container: "glb", "gltf" (JSON with external resources) or "b3dm". */
  format: string;
  /** Request start to the last byte of the main resource, ms. */
  networkMs: number;
  /** Bytes of the main resource as received (after content decoding). */
  bytes: number;
  /** Negotiated protocol ("http/1.1", "h2", "h3"), when the server shows it. */
  protocol?: string;
  /** Request sent to first response byte, ms, when the server shows it. */
  ttfbMs?: number;
  /** Served from the HTTP cache, when the server shows it. */
  cached?: boolean;
  /**
   * Everything after: unwrap, parse, Draco, image decode, KTX2 transcode,
   * and fetching external buffers and images, ms.
   */
  decodeMs: number;
  /** Texture images by source type. */
  images: Record<string, number>;
}

export interface GltfAsset {
  meshes: GltfMesh[];
  materials: GltfMaterial[];
  textures: GltfTexture[];
  images: GltfImage[];
  draws: GltfDraw[];
  /** Property tables (or the b3dm batch table) that meshes' features index. */
  featureTables: FeatureTable[];
  /** b3dm RTC_CENTER: translation of the whole model, in tile (z-up) space. */
  rtcCenter?: [number, number, number];
  /** glTF `asset.copyright`: data credit to show while the content is on screen. */
  copyright?: string;
  /** Features skipped while parsing (unsupported extensions, attributes, modes). */
  warnings: string[];
  /** Worker-side timing of the load. */
  timing?: ContentTiming;
  /** Globe tiles: ellipsoid-scaled horizon-occlusion point (cull test). */
  horizonOcclusionPoint?: [number, number, number];
}
