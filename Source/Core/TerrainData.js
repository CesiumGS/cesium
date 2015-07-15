/*global define*/
define([
        './defineProperties',
        './DeveloperError'
    ], function(
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Terrain data for a single tile.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias TerrainData
     * @constructor
     *
     * @see HeightmapTerrainData
     * @see QuantizedMeshTerrainData
     */
    var TerrainData = function TerrainData() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(TerrainData.prototype, {
        /**
         * The water mask included in this terrain data, if any.  A water mask is a rectangular
         * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
         * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
         * @memberof TerrainData.prototype
         * @type {Uint8Array|Image|Canvas}
         */
        waterMask : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Computes the terrain height at a specified longitude and latitude.
     * @function
     *
     * @param {Rectangle} rectangle The rectangle covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the rectangle, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the rectangle.
     */
    TerrainData.prototype.interpolateHeight = DeveloperError.throwInstantiationError;

    /**
     * Determines if a given child tile is available, based on the
     * {@link TerrainData#childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     * @function
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    TerrainData.prototype.isChildAvailable = DeveloperError.throwInstantiationError;

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     * @function
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    TerrainData.prototype.createMesh = DeveloperError.throwInstantiationError;

    /**
     * Upsamples this terrain data for use by a descendant tile.
     * @function
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     * @returns {Promise.<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile,
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
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    TerrainData.prototype.wasCreatedByUpsampling = DeveloperError.throwInstantiationError;

    return TerrainData;
});
