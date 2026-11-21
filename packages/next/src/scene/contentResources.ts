// Content resources (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// "What the scene half must expose"): what content hands a device to upload
// and composite, in no device's terms. Content describes textures and
// imagery composites; each device makes its own GPU objects from them, so a
// second device (src/webgl2/, CS-35) can implement these.
//
// A world's device copy (`WorldMirror.textures`, `WorldMirror.imagery`)
// provides them. Handles a device returns are opaque to content: it holds
// them and gives them back to the same device, nothing more.
//
// These are internal types: nothing here is exported from an entry point,
// and they name no GPU type.
import type { CompressedImage, GltfSampler } from "../io/gltfTypes.ts";
import type { TextureBinding } from "./world/types.ts";

/** How a texture is sampled: glTF's sampler description. */
export type SamplerDescription = GltfSampler;

/** A worker-transcoded KTX2 image: its format and levels. */
export type CompressedTexture = CompressedImage;

/** A texture a device made for content: freed with `destroy`. */
export interface DeviceTexture {
  destroy(): void;
}

// ------------------------------------------------------------- textures

/**
 * An image content asks a device to make a texture of: decoded RGBA8 (an
 * `ImageBitmap`), or a worker-transcoded KTX2 image's levels.
 */
export interface TextureImage {
  /** Names the texture in the device's labels and errors. */
  readonly label: string;
  readonly image: ImageBitmap | CompressedTexture;
  /** Color data, decoded from sRGB when sampled. */
  readonly srgb: boolean;
  /** Give it a mip chain (generated where the image has one level). */
  readonly mipmaps: boolean;
}

/** A content texture on a device, with what it costs there. */
export interface ContentTexture extends DeviceTexture {
  /** Approximate device bytes (mips included). */
  readonly bytes: number;
}

/** A sampler on a device, made from a description (glTF's sampler). */
export interface DeviceSampler {
  readonly description: SamplerDescription;
}

/** What content uploads textures through: a world's device copy. */
export interface ContentTextures {
  /** Makes a texture of `image` on the device, its data copied there. */
  createTexture(image: TextureImage): ContentTexture;
  createSampler(description: SamplerDescription): DeviceSampler;
  /** What a texture set binds: `texture` sampled with `sampler`. */
  binding(texture: ContentTexture, sampler: DeviceSampler): TextureBinding;
}

// ------------------------------------------------------------- imagery

/**
 * Compositing steps a layer runs per tick, each a fill, a source tile or a
 * mip level of one slice. Bounds what one `composite` call is given.
 */
export const IMAGERY_STEPS_PER_TICK = 256;

/**
 * One world's array of globe imagery slices on a device: `layers` square
 * slices of `size` texels, with a full mip chain.
 */
export interface SliceArray extends DeviceTexture {
  readonly layers: number;
}

/**
 * How one source tile maps onto a slice, computed in float64 by content:
 * the source's s coordinate is `s0 + ds · (column + 0.5)`, linear in the
 * column; its t coordinate is `t[row]`, per row (Web Mercator latitude is
 * not linear).
 */
export interface SourceMapping {
  readonly s0: number;
  readonly ds: number;
  /** Per destination row, `size` of them. */
  readonly t: Float64Array;
}

/**
 * One slice's composite: the base color over the whole slice, then each
 * source tile over it in order (coarse stand-ins first), then the mips.
 */
export interface SliceComposite {
  readonly slice: number;
  /** Linear RGB, 0 to 1, opaque. */
  readonly baseColor: readonly [number, number, number];
  readonly sources: ReadonlyArray<{
    readonly texture: DeviceTexture;
    readonly mapping: SourceMapping;
  }>;
}

/** What one imagery layer composites with (its own, made for it). */
export interface ImageryCompositor {
  /** Compiled: until then nothing composites, and tiles draw ancestors' slices or none. */
  readonly ready: boolean;
  /**
   * Composites `slices` into `array`, in order, in one submission. Their
   * steps (a fill, a step per source, and one per mip level below the
   * first) sum to at most `IMAGERY_STEPS_PER_TICK`.
   */
  composite(array: SliceArray, slices: readonly SliceComposite[]): void;
  destroy(): void;
}

/**
 * The device side of a world's globe imagery: its slice array, which every
 * imagery layer of the world composites into, and the layers' sources and
 * compositors. The level choice, the row mapping and the slices' LRU stay
 * in content (`GlobeImagery`, `SlicePool`).
 */
export interface ImageryDevice {
  /** The most layers a slice array may have on the device. */
  readonly maxLayers: number;
  /** Uploads a decoded source tile (the caller closes the bitmap). */
  createSource(bitmap: ImageBitmap, label: string): DeviceTexture;
  /** A compositor for one layer, for slices of `size` texels. */
  createCompositor(size: number): ImageryCompositor;
  /** A slice array of `layers` slices of `size` texels, `mipLevels` each. */
  createSlices(size: number, mipLevels: number, layers: number): SliceArray;
  /**
   * The same, checked for running out of device memory: `settle` is called
   * once the device has said, with its error or none.
   */
  tryCreateSlices(
    size: number,
    mipLevels: number,
    layers: number,
    settle: (error: unknown) => void,
  ): SliceArray;
  /**
   * Copies the first `layers` slices of `from` into `to`, every mip level,
   * then each of `moves` (one slice from its old index to its new). One
   * submission, named `label`.
   */
  copySlices(
    from: SliceArray,
    to: SliceArray,
    layers: number,
    moves: ReadonlyArray<readonly [from: number, to: number]>,
    label: string,
  ): void;
  /** What the world's draws sample: `array`, or none before it's destroyed. */
  bindSlices(array: SliceArray | undefined): void;
}
