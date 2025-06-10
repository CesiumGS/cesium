import DeveloperError from "./DeveloperError.js";

/**
 * Terrain data for a single tile.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias TerrainData
 * @constructor
 *
 * @see HeightmapTerrainData
 * @see QuantizedMeshTerrainData
 * @see GoogleEarthEnterpriseTerrainData
 */
function TerrainData() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(TerrainData.prototype, {
  /**
   * An array of credits for this tile.
   * @memberof TerrainData.prototype
   * @type {Credit[]}
   */
  credits: {
    get: DeveloperError.throwInstantiationError,
  },
  /**
   * The water mask included in this terrain data, if any.  A water mask is a rectangular
   * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
   * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
   * @memberof TerrainData.prototype
   * @type {Uint8Array|HTMLImageElement|HTMLCanvasElement|undefined}
   */
  waterMask: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Computes the terrain height at a specified longitude and latitude.
 * @function
 *
 * @param {Rectangle} rectangle The rectangle covered by this terrain data.
 * @param {number} longitude The longitude in radians.
 * @param {number} latitude The latitude in radians.
 * @returns {number} The terrain height at the specified position.  If the position
 *          is outside the rectangle, this method will extrapolate the height, which is likely to be wildly
 *          incorrect for positions far outside the rectangle.
 */
TerrainData.prototype.interpolateHeight =
  DeveloperError.throwInstantiationError;

/**
 * Determines if a given child tile is available, based on the
 * {@link TerrainData#childTileMask}.  The given child tile coordinates are assumed
 * to be one of the four children of this tile.  If non-child tile coordinates are
 * given, the availability of the southeast child tile is returned.
 * @function
 *
 * @param {number} thisX The tile X coordinate of this (the parent) tile.
 * @param {number} thisY The tile Y coordinate of this (the parent) tile.
 * @param {number} childX The tile X coordinate of the child tile to check for availability.
 * @param {number} childY The tile Y coordinate of the child tile to check for availability.
 * @returns {boolean} True if the child tile is available; otherwise, false.
 */
TerrainData.prototype.isChildAvailable = DeveloperError.throwInstantiationError;

/**
 * Creates a {@link TerrainMesh} from this terrain data.
 * @function
 *
 * @private
 *
 * @param {object} options Object with the following properties:
 * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
 * @param {number} options.x The X coordinate of the tile for which to create the terrain data.
 * @param {number} options.y The Y coordinate of the tile for which to create the terrain data.
 * @param {number} options.level The level of the tile for which to create the terrain data.
 * @param {number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @param {boolean} [options.throttle=true] If true, indicates that this operation will need to be retried if too many asynchronous mesh creations are already in progress.
 * @returns {Promise<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
 *          asynchronous mesh creations are already in progress and the operation should
 *          be retried later.
 */
TerrainData.prototype.createMesh = DeveloperError.throwInstantiationError;

/**
 * Upsamples this terrain data for use by a descendant tile.
 * @function
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {number} thisLevel The level of this tile in the tiling scheme.
 * @param {number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile,
 *          or undefined if too many asynchronous upsample operations are in progress and the request has been
 *          deferred.
 */
TerrainData.prototype.upsample = DeveloperError.throwInstantiationError;

/**
 * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
 * terrain data.  If this value is false, the data was obtained from some other source, such
 * as by downloading it from a remote server.  This method should return true for instances
 * returned from a call to {@link TerrainData#upsample}.
 * @function
 *
 * @returns {boolean} True if this instance was created by upsampling; otherwise, false.
 */
TerrainData.prototype.wasCreatedByUpsampling =
  DeveloperError.throwInstantiationError;

/**
 * The maximum number of asynchronous tasks used for terrain processing.
 *
 * @type {number}
 * @private
 */
TerrainData.maximumAsynchronousTasks = 5;

export default TerrainData;
