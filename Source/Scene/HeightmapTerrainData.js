/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/TaskProcessor',
        './GeographicTilingScheme',
        './TerrainMesh',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        TaskProcessor,
        GeographicTilingScheme,
        TerrainMesh,
        TerrainProvider,
        when) {
    "use strict";

    var defaultStructure = {
            heightScale : 1.0,
            heightOffset : 0.0,
            stride : 1,
            strideMultiplier : 256.0,
            isBigEndian : false
        };

    /**
     * Terrain data for a single {@link Tile} where the terrain data is represented as a heightmap.  A heightmap
     * is a rectangular array of heights in row-major order.
     *
     * @alias HeightmapTerrainData
     * @constructor
     *
     * @param {TypedArray} buffer The buffer containing height data.
     * @param {Number} width The width (longitude direction) of the heightmap, in samples.
     * @param {Number} height The height (latitude direction) of the heightmap, in samples.
     * @param {Number} [childTileMask=15] A bit mask indicating which of this tile's four children exist.
     *                 If a child's bit is set, geometry will be requested for that tile as well when it
     *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
     *                 instead upsampled from the parent.  The bit values are as follows:
     *                 <table>
     *                  <th><td>Bit Position</td><td>Bit Value</td><td>Child Tile</td></th>
     *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *                  <tr><td>2</td><td>4</td><td>Northwest</td></tr>
     *                  <tr><td>3</td><td>8</td><td>Northeast</td></tr>
     *                 </table>
     * @param {Object} [structure] An object describing the structure of the height data.
     * @param {Number} [structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
     *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
     *                 height after multiplying by the scale.
     * @param {Number} [structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
     *                 height in meters.  The offset is added after the height sample is multiplied by the
     *                 heightScale.
     * @param {Number} [structure.stride=1] The number of elements in the buffer that make up a single height
     *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
     *                 it is greater than 1, that number of elements together form the height sample, which is
     *                 computed according to the structure.strideMultiplier and structure.isBigEndian properties.
     * @param {Number} [structure.strideMultiplier=256.0] The multiplier used to compute the height value when the
     *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
     *                 is 256, the height is computed as follows:
     *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
     *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
     *                 elements is reversed.
     * @param {Boolean} [structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
     *                  stride property is greater than 1.  If this property is false, the first element is the
     *                  low-order element.  If it is true, the first element is the high-order element.
     */
    var HeightmapTerrainData = function HeightmapTerrainData(buffer, width, height, childTileMask, structure) {
        /**
         * The buffer containing the height data.
         * @type {TypedArray}
         */
        this.buffer = buffer;

        /**
         * The width (longitude direction) of the heightmap, in samples.
         * @type {Number}
         */
        this.width = width;

        /**
         * The height (latitude direction) of the heightmap, in samples.
         * @type {Number}
         */
        this.height = height;

        /**
         * A bit mask indicating which of this tile's four children exist.
         * If a child's bit is set, geometry will be requested for that tile as well when it
         * is needed.  If the bit is cleared, the child tile is not requested and geometry is
         * instead upsampled from the parent.  The bit values are as follows:
         * <table>
         *   <th><td>Bit Position</td><td>Bit Value</td><td>Child Tile</td></th>
         *   <tr><td>0</td><td>1</td><td>Southwest</td></tr>
         *   <tr><td>1</td><td>2</td><td>Southeast</td></tr>
         *   <tr><td>2</td><td>4</td><td>Northwest</td></tr>
         *   <tr><td>3</td><td>8</td><td>Northeast</td></tr>
         * </table>
         * @type {Number}
         */
        this.childTileMask = defaultValue(childTileMask, 15);

        if (typeof structure === 'undefined') {
            structure = defaultStructure;
        } else {
            structure.heightScale = defaultValue(structure.heightScale, defaultStructure.heightScale);
            structure.heightOffset = defaultValue(structure.heightOffset, defaultStructure.heightOffset);
            structure.stride = defaultValue(structure.stride, defaultStructure.stride);
            structure.strideMultiplier = defaultValue(structure.strideMultiplier, defaultStructure.strideMultiplier);
            structure.isBigEndian = defaultValue(structure.isBigEndian, defaultStructure.isBigEndian);
        }

        /**
         * Describes the structure of the height data.
         * @type {Object}
         */
        this.structure = structure;
    };

    var taskProcessor = new TaskProcessor('createVerticesFromHeightmap');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @memberof HeightmapTerrainData
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to which this terrain data applies.
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @returns {Promise|TerrainMesh} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    HeightmapTerrainData.prototype.createMesh = function(ellipsoid, tilingScheme, x, y, level) {
        var nativeExtent = tilingScheme.tileXYToNativeExtent(x, y, level);
        var extent = tilingScheme.tileXYToExtent(x, y, level);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var structure = this.structure;

        var levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, this.width, tilingScheme.getNumberOfXTilesAtLevel(0));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : this.buffer,
            heightScale : structure.heightScale,
            heightOffset : structure.heightOffset,
            stride : structure.stride,
            width : this.width,
            height : this.height,
            extent : nativeExtent,
            relativeToCenter : center,
            radiiSquared : ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : ellipsoid.getMaximumRadius(),
            skirtHeight : Math.min(thisLevelMaxError * 10.0, 1000.0),
            isGeographic : tilingScheme instanceof GeographicTilingScheme
        });

        if (typeof verticesPromise === 'undefined') {
            // Postponed
            return undefined;
        }

        var that = this;
        return when(verticesPromise, function(result) {
            return new TerrainMesh(
                    center,
                    new Float32Array(result.vertices),
                    TerrainProvider.getRegularGridIndices(that.width + 2, that.height + 2),
                    result.statistics.minHeight,
                    result.statistics.maxHeight);
        });
    };

    /**
     * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
     * height samples in this instance, interpolated if necessary.
     *
     * @memberof HeightmapTerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     *
     * @returns {Promise|HeightmapTerrainData} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    HeightmapTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        // TODO: should we upsample the mesh instead of the raw data?

        var levelDifference = descendantLevel - thisLevel;
        if (levelDifference > 1) {
            throw new DeveloperError('Upsampling through more than one level at a time is not currently supported.');
        }

        var result;

        if ((this.width % 2) === 1 && (this.height % 2) === 1) {
            // We have an odd number of posts greater than 2 in each direction,
            // so we can upsample by simply dropping half of the posts in each direction.
            result = upsampleBySubsetting(this, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel);
        } else {
            // The number of posts in at least one direction is even, so we must upsample
            // by interpolating heights.
            result = upsampleByInterpolating(this, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel);
        }

        return result;
    };

    /**
     * Determines if a given child tile is available, based on the
     * {@link HeightmapTerrainData#childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     *
     * @memberof HeightmapTerrainData
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    HeightmapTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
        var bitNumber = 2; // northwest child
        if (childX !== thisX * 2) {
            ++bitNumber; // east child
        }
        if (childY !== thisY * 2) {
            bitNumber -= 2; // south child
        }

        return (this.childTileMask & (1 << bitNumber)) !== 0;
    };

    function upsampleBySubsetting(terrainData, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        // TODO: allow greater level differences?
        var levelDifference = 1;

        var width = terrainData.width;
        var height = terrainData.height;

        // Compute the post indices of the corners of this tile within its own level.
        var leftPostIndex = descendantX * (width - 1);
        var rightPostIndex = leftPostIndex + width - 1;
        var topPostIndex = descendantY * (height - 1);
        var bottomPostIndex = topPostIndex + height - 1;

        // Transform the post indices to the ancestor's level.
        var twoToTheLevelDifference = 1 << levelDifference;
        leftPostIndex /= twoToTheLevelDifference;
        rightPostIndex /= twoToTheLevelDifference;
        topPostIndex /= twoToTheLevelDifference;
        bottomPostIndex /= twoToTheLevelDifference;

        // Adjust the indices to be relative to the northwest corner of the source tile.
        var sourceLeft = thisX * (width - 1);
        var sourceTop = thisY * (height - 1);
        leftPostIndex -= sourceLeft;
        rightPostIndex -= sourceLeft;
        topPostIndex -= sourceTop;
        bottomPostIndex -= sourceTop;

        var leftInteger = leftPostIndex | 0;
        var rightInteger = rightPostIndex | 0;
        var topInteger = topPostIndex | 0;
        var bottomInteger = bottomPostIndex | 0;

        var upsampledWidth = (rightInteger - leftInteger + 1);
        var upsampledHeight = (bottomInteger - topInteger + 1);

        var sourceHeights = terrainData.buffer;
        var structure = terrainData.structure;

        // Copy the relevant posts.
        var numberOfHeights = upsampledWidth * upsampledHeight;
        var numberOfElements = numberOfHeights * structure.stride;
        var heights = new sourceHeights.constructor(numberOfElements);

        if (structure.stride > 1) {
            // TODO: implement this.
        } else {
            var outputIndex = 0;
            for (var j = topInteger; j <= bottomInteger; ++j) {
                for (var i = leftInteger; i <= rightInteger; ++i) {
                    heights[outputIndex++] = sourceHeights[j * width + i];
                }
            }
        }

        return new HeightmapTerrainData(heights, upsampledWidth, upsampledHeight, 0, terrainData.structure);
    }

    function upsampleByInterpolating(terrainData, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        throw new DeveloperError('Upsampling by interpolation is not currently supported.');
    }

    return HeightmapTerrainData;
});