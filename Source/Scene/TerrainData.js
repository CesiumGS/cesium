/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Terrain data for a single {@link Tile}.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias TerrainData
     * @constructor
     */
    var TerrainData = function TerrainData() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Computes the terrain height at a specified longitude and latitude.
     *
     * @memberof TerrainData
     *
     * @param {Extent} extent The extent covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the extent, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the extent.
     */
    TerrainData.prototype.interpolateHeight = function(extent, longitude, latitude) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Determines if a given child tile is available, based on the
     * {@link TerrainData#childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     *
     * @memberof TerrainData
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    TerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the water mask included in this terrain data, if any.  A water mask is a rectangular
     * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
     * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
     *
     *  @memberof TerrainData
     *
     *  @returns {Uint8Array|Image|Canvas} The water mask, or undefined if no water mask is associated with this terrain data.
     */
    TerrainData.prototype.getWaterMask = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @memberof TerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @returns {Promise|TerrainMesh} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    TerrainData.prototype.createMesh = function(tilingScheme, x, y, level) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Upsamples this terrain data for use by a descendant tile.
     *
     * @memberof TerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     *
     * @returns {Promise|TerrainData} A promise for upsampled terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    TerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link TerrainData#upsample}.
     *
     * @memberof TerrainData
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    TerrainData.prototype.wasCreatedByUpsampling = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return TerrainData;
});