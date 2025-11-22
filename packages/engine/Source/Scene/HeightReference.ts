/**
 * Represents the position relative to the terrain.
 *
 * @enum {number}
 */
const HeightReference = {
  /**
   * The position is absolute.
   * @type {number}
   * @constant
   */
  NONE: 0,

  /**
   * The position is clamped to the terrain and 3D Tiles. When clamping to 3D Tilesets such as photorealistic 3D Tiles, ensure the tileset has {@link Cesium3DTileset#enableCollision} set to <code>true</code>. Otherwise, the entity may not be correctly clamped to the tileset surface.
   * @type {number}
   * @constant
   */
  CLAMP_TO_GROUND: 1,

  /**
   * The position height is the height above the terrain and 3D Tiles.
   * @type {number}
   * @constant
   */
  RELATIVE_TO_GROUND: 2,

  /**
   * The position is clamped to terain.
   * @type {number}
   * @constant
   */
  CLAMP_TO_TERRAIN: 3,

  /**
   * The position height is the height above terrain.
   * @type {number}
   * @constant
   */
  RELATIVE_TO_TERRAIN: 4,

  /**
   * The position is clamped to 3D Tiles.
   * @type {number}
   * @constant
   */
  CLAMP_TO_3D_TILE: 5,

  /**
   * The position height is the height above 3D Tiles.
   * @type {number}
   * @constant
   */
  RELATIVE_TO_3D_TILE: 6,
};

export default Object.freeze(HeightReference);

/**
 * Returns true if the height should be clamped to the surface
 * @param {HeightReference} heightReference
 * @returns true if the height should be clamped to the surface
 * @private
 */
export function isHeightReferenceClamp(heightReference) {
  return (
    heightReference === HeightReference.CLAMP_TO_GROUND ||
    heightReference === HeightReference.CLAMP_TO_3D_TILE ||
    heightReference === HeightReference.CLAMP_TO_TERRAIN
  );
}

/**
 * Returns true if the height should be offset relative to the surface
 * @param {HeightReference} heightReference
 * @returns true if the height should be offset relative to the surface
 * @private
 */
export function isHeightReferenceRelative(heightReference) {
  return (
    heightReference === HeightReference.RELATIVE_TO_GROUND ||
    heightReference === HeightReference.RELATIVE_TO_3D_TILE ||
    heightReference === HeightReference.RELATIVE_TO_TERRAIN
  );
}
