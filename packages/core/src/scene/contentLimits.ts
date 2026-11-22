// Limits and flags that content and the renderer share: plain numbers, so content
// needn't import the renderer's layout. `render/layout.ts` exports them again.

/** Clip boxes per block; each box is 5 vec4s (center hi, lo, 3 rows). */
export const CLIP_BOXES = 8;
export const CLIP_BOX_FLOATS = 20;
/** A clip block's vec4 rows (terrain clip regions span whole blocks). */
export const CLIP_BLOCK_ROWS = (CLIP_BOXES * CLIP_BOX_FLOATS) / 4;

/**
 * Terrain clip regions a world holds at once: a bit each in a record's
 * `terrainClip`, a row each of the directory in clip block 0
 * (surface.slang `MAX_TERRAIN_CLIPS`).
 */
export const MAX_TERRAIN_CLIPS = 32;

/**
 * Clip blocks one terrain clip region takes at most (its packed rows,
 * `CLIP_BLOCK_ROWS` a block). All `MAX_TERRAIN_CLIPS` regions at this
 * size take 3,840 blocks, which the world sets aside from its placeholders'
 * (`WorldOptions.maxClipBlocks`).
 */
export const MAX_TERRAIN_CLIP_BLOCKS = 120;

/** Slices an imagery array can address (`packImagery`). */
export const MAX_IMAGERY_SLICES = 4095;
/** Levels above a tile its imagery may come from (`packImagery`). */
export const MAX_IMAGERY_LEVELS_UP = 8;

/**
 * Packs a tile's imagery reference: bits 0-11 the slice + 1, bits 12-15 how
 * many levels up the tile owning the slice is, bits 16-23 and 24-31 this
 * tile's x and y (rows from the south) within it, in this tile's units.
 * An ancestor's slice draws a tile until its own is composited.
 */
export function packImagery(slice: number, levelsUp = 0, x = 0, y = 0): number {
  return ((slice + 1) | (levelsUp << 12) | (x << 16) | (y << 24)) >>> 0;
}

export const MaterialFlags = {
  unlit: 1,
  doubleSided: 2,
  alphaMask: 4,
  alphaBlend: 8,
  baseColorTexture: 16,
  metallicRoughnessTexture: 32,
  normalTexture: 64,
  occlusionTexture: 128,
  emissiveTexture: 256,
  /**
   * Color textures are stored unorm and decoded with pow(c, 2.2) in the shader,
   * as CesiumJS 1.x does (`czm_srgbToLinear`), instead of by an -srgb format.
   */
  gamma22Textures: 512,
  /**
   * With `alphaBlend`: none of it is opaque, whatever a fragment's alpha, so
   * only the translucent passes draw it, not the opaque, depth, prepass,
   * shadow or height passes (`SceneItem.opacity`). The shaders don't read it.
   */
  blendedOnly: 1024,
} as const;
