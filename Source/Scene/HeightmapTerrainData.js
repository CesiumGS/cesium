/*global define*/
define([
        '../Core/defaultValue',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/DeveloperError',
        '../Core/HeightmapTessellator',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/TaskProcessor',
        './GeographicTilingScheme',
        './TerrainMesh',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        DeveloperError,
        HeightmapTessellator,
        CesiumMath,
        Occluder,
        TaskProcessor,
        GeographicTilingScheme,
        TerrainMesh,
        TerrainProvider,
        when) {
    "use strict";

    /**
     * Terrain data for a single tile where the terrain data is represented as a heightmap.  A heightmap
     * is a rectangular array of heights in row-major order from south to north and west to east.
     *
     * @alias HeightmapTerrainData
     * @constructor
     *
     * @param {TypedArray} description.buffer The buffer containing height data.
     * @param {Number} description.width The width (longitude direction) of the heightmap, in samples.
     * @param {Number} description.height The height (latitude direction) of the heightmap, in samples.
     * @param {Number} [description.childTileMask=15] A bit mask indicating which of this tile's four children exist.
     *                 If a child's bit is set, geometry will be requested for that tile as well when it
     *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
     *                 instead upsampled from the parent.  The bit values are as follows:
     *                 <table>
     *                  <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
     *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *                  <tr><td>2</td><td>4</td><td>Northwest</td></tr>
     *                  <tr><td>3</td><td>8</td><td>Northeast</td></tr>
     *                 </table>
     * @param {Object} [description.structure] An object describing the structure of the height data.
     * @param {Number} [description.structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
     *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
     *                 height after multiplying by the scale.
     * @param {Number} [description.structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
     *                 height in meters.  The offset is added after the height sample is multiplied by the
     *                 heightScale.
     * @param {Number} [description.structure.elementsPerHeight=1] The number of elements in the buffer that make up a single height
     *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
     *                 it is greater than 1, that number of elements together form the height sample, which is
     *                 computed according to the structure.elementMultiplier and structure.isBigEndian properties.
     * @param {Number} [description.structure.stride=1] The number of elements to skip to get from the first element of
     *                 one height to the first element of the next height.
     * @param {Number} [description.structure.elementMultiplier=256.0] The multiplier used to compute the height value when the
     *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
     *                 is 256, the height is computed as follows:
     *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
     *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
     *                 elements is reversed.
     * @param {Boolean} [description.structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
     *                  stride property is greater than 1.  If this property is false, the first element is the
     *                  low-order element.  If it is true, the first element is the high-order element.
     * @param {Boolean} [description.createdByUpsampling=false] True if this instance was created by upsampling another instance;
     *                  otherwise, false.
     *
     * @see TerrainData
     *
     * @example
     * var buffer = ...
     * var heightBuffer = new Uint16Array(buffer, 0, that._heightmapWidth * that._heightmapWidth);
     * var childTileMask = new Uint8Array(buffer, heightBuffer.byteLength, 1)[0];
     * var waterMask = new Uint8Array(buffer, heightBuffer.byteLength + 1, buffer.byteLength - heightBuffer.byteLength - 1);
     * var structure = HeightmapTessellator.DEFAULT_STRUCTURE;
     * var terrainData = new HeightmapTerrainData({
     *   buffer : heightBuffer,
     *   width : 65,
     *   height : 65,
     *   childTileMask : childTileMask,
     *   structure : structure,
     *   waterMask : waterMask
     * });
     */
    var HeightmapTerrainData = function HeightmapTerrainData(description) {
        if (typeof description === 'undefined' || typeof description.buffer === 'undefined') {
            throw new DeveloperError('description.buffer is required.');
        }
        if (typeof description.width === 'undefined') {
            throw new DeveloperError('description.width is required.');
        }
        if (typeof description.height === 'undefined') {
            throw new DeveloperError('description.height is required.');
        }

        this._buffer = description.buffer;
        this._width = description.width;
        this._height = description.height;
        this._childTileMask = defaultValue(description.childTileMask, 15);

        var defaultStructure = HeightmapTessellator.DEFAULT_STRUCTURE;
        var structure = description.structure;
        if (typeof structure === 'undefined') {
            structure = defaultStructure;
        } else if (structure !== defaultStructure) {
            structure.heightScale = defaultValue(structure.heightScale, defaultStructure.heightScale);
            structure.heightOffset = defaultValue(structure.heightOffset, defaultStructure.heightOffset);
            structure.elementsPerHeight = defaultValue(structure.elementsPerHeight, defaultStructure.elementsPerHeight);
            structure.stride = defaultValue(structure.stride, defaultStructure.stride);
            structure.elementMultiplier = defaultValue(structure.elementMultiplier, defaultStructure.elementMultiplier);
            structure.isBigEndian = defaultValue(structure.isBigEndian, defaultStructure.isBigEndian);
        }

        this._structure = structure;
        this._createdByUpsampling = defaultValue(description.createdByUpsampling, false);
        this._waterMask = description.waterMask;
    };

    var taskProcessor = new TaskProcessor('createVerticesFromHeightmap');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @memberof HeightmapTerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @returns {Promise|TerrainMesh} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    HeightmapTerrainData.prototype.createMesh = function(tilingScheme, x, y, level) {
        if (typeof tilingScheme === 'undefined') {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (typeof x === 'undefined') {
            throw new DeveloperError('x is required.');
        }
        if (typeof y === 'undefined') {
            throw new DeveloperError('y is required.');
        }
        if (typeof level === 'undefined') {
            throw new DeveloperError('level is required.');
        }

        var ellipsoid = tilingScheme.getEllipsoid();
        var nativeExtent = tilingScheme.tileXYToNativeExtent(x, y, level);
        var extent = tilingScheme.tileXYToExtent(x, y, level);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var structure = this._structure;

        var levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, this._width, tilingScheme.getNumberOfXTilesAtLevel(0));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : this._buffer,
            structure : structure,
            width : this._width,
            height : this._height,
            nativeExtent : nativeExtent,
            extent : extent,
            relativeToCenter : center,
            ellipsoid : ellipsoid,
            skirtHeight : Math.min(thisLevelMaxError * 4.0, 1000.0),
            isGeographic : tilingScheme instanceof GeographicTilingScheme
        });

        if (typeof verticesPromise === 'undefined') {
            // Postponed
            return undefined;
        }

        return when(verticesPromise, function(result) {
            return new TerrainMesh(
                    center,
                    new Float32Array(result.vertices),
                    TerrainProvider.getRegularGridIndices(result.gridWidth, result.gridHeight),
                    result.minimumHeight,
                    result.maximumHeight,
                    result.boundingSphere3D,
                    result.occludeePointInScaledSpace);
        });
    };

    /**
     * Computes the terrain height at a specified longitude and latitude.
     *
     * @memberof HeightmapTerrainData
     *
     * @param {Extent} extent The extent covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the extent, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the extent.
     */
    HeightmapTerrainData.prototype.interpolateHeight = function(extent, longitude, latitude) {
        var width = this._width;
        var height = this._height;

        var heightSample;

        var structure = this._structure;
        var stride = structure.stride;
        if (stride > 1) {
            var elementsPerHeight = structure.elementsPerHeight;
            var elementMultiplier = structure.elementMultiplier;
            var isBigEndian = structure.isBigEndian;

            heightSample = interpolateHeightWithStride(this._buffer, elementsPerHeight, elementMultiplier, stride, isBigEndian, extent, width, height, longitude, latitude);
        } else {
            heightSample = interpolateHeight(this._buffer, extent, width, height, longitude, latitude);
        }

        return heightSample * structure.heightScale + structure.heightOffset;
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
        if (typeof tilingScheme === 'undefined') {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (typeof thisX === 'undefined') {
            throw new DeveloperError('thisX is required.');
        }
        if (typeof thisY === 'undefined') {
            throw new DeveloperError('thisY is required.');
        }
        if (typeof thisLevel === 'undefined') {
            throw new DeveloperError('thisLevel is required.');
        }
        if (typeof descendantX === 'undefined') {
            throw new DeveloperError('descendantX is required.');
        }
        if (typeof descendantY === 'undefined') {
            throw new DeveloperError('descendantY is required.');
        }
        if (typeof descendantLevel === 'undefined') {
            throw new DeveloperError('descendantLevel is required.');
        }

        var levelDifference = descendantLevel - thisLevel;
        if (levelDifference > 1) {
            throw new DeveloperError('Upsampling through more than one level at a time is not currently supported.');
        }

        var result;

        if ((this._width % 2) === 1 && (this._height % 2) === 1) {
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
     * {@link HeightmapTerrainData.childTileMask}.  The given child tile coordinates are assumed
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
        if (typeof thisX === 'undefined') {
            throw new DeveloperError('thisX is required.');
        }
        if (typeof thisY === 'undefined') {
            throw new DeveloperError('thisY is required.');
        }
        if (typeof childX === 'undefined') {
            throw new DeveloperError('childX is required.');
        }
        if (typeof childY === 'undefined') {
            throw new DeveloperError('childY is required.');
        }

        var bitNumber = 2; // northwest child
        if (childX !== thisX * 2) {
            ++bitNumber; // east child
        }
        if (childY !== thisY * 2) {
            bitNumber -= 2; // south child
        }

        return (this._childTileMask & (1 << bitNumber)) !== 0;
    };

    /**
     * Gets the water mask included in this terrain data, if any.  A water mask is a rectangular
     * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
     * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
     *
     *  @memberof HeightmapTerrainData
     *
     *  @returns {Uint8Array|Image|Canvas} The water mask, or undefined if no water mask is associated with this terrain data.
     */
    HeightmapTerrainData.prototype.getWaterMask = function() {
        return this._waterMask;
    };

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
     *
     * @memberof HeightmapTerrainData
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    HeightmapTerrainData.prototype.wasCreatedByUpsampling = function() {
        return this._createdByUpsampling;
    };

    function upsampleBySubsetting(terrainData, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        var levelDifference = 1;

        var width = terrainData._width;
        var height = terrainData._height;

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

        var sourceHeights = terrainData._buffer;
        var structure = terrainData._structure;

        // Copy the relevant posts.
        var numberOfHeights = upsampledWidth * upsampledHeight;
        var numberOfElements = numberOfHeights * structure.stride;
        var heights = new sourceHeights.constructor(numberOfElements);

        var outputIndex = 0;
        var i, j;
        var stride = structure.stride;
        if (stride > 1) {
            for (j = topInteger; j <= bottomInteger; ++j) {
                for (i = leftInteger; i <= rightInteger; ++i) {
                    var index = (j * width + i) * stride;
                    for (var k = 0; k < stride; ++k) {
                        heights[outputIndex++] = sourceHeights[index + k];
                    }
                }
            }
        } else {
            for (j = topInteger; j <= bottomInteger; ++j) {
                for (i = leftInteger; i <= rightInteger; ++i) {
                    heights[outputIndex++] = sourceHeights[j * width + i];
                }
            }
        }

        return new HeightmapTerrainData({
            buffer : heights,
            width : upsampledWidth,
            height : upsampledHeight,
            childTileMask : 0,
            structure : terrainData._structure,
            createdByUpsampling : true
        });
    }

    function upsampleByInterpolating(terrainData, tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        var width = terrainData._width;
        var height = terrainData._height;
        var structure = terrainData._structure;
        var stride = structure.stride;

        var sourceHeights = terrainData._buffer;
        var heights = new sourceHeights.constructor(width * height * stride);

        // PERFORMANCE_IDEA: don't recompute these extents - the caller already knows them.
        var sourceExtent = tilingScheme.tileXYToExtent(thisX, thisY, thisLevel);
        var destinationExtent = tilingScheme.tileXYToExtent(descendantX, descendantY, descendantLevel);

        var i, j, latitude, longitude;

        if (stride > 1) {
            var elementsPerHeight = structure.elementsPerHeight;
            var elementMultiplier = structure.elementMultiplier;
            var isBigEndian = structure.isBigEndian;

            var divisor = Math.pow(elementMultiplier, elementsPerHeight - 1);

            for (j = 0; j < height; ++j) {
                latitude = CesiumMath.lerp(destinationExtent.north, destinationExtent.south, j / (height - 1));
                for (i = 0; i < width; ++i) {
                    longitude = CesiumMath.lerp(destinationExtent.west, destinationExtent.east, i / (width - 1));
                    var heightSample = interpolateHeightWithStride(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceExtent, width, height, longitude, latitude);
                    setHeight(heights, elementsPerHeight, elementMultiplier, divisor, stride, isBigEndian, j * width + i, heightSample);
                }
            }
        } else {
            for (j = 0; j < height; ++j) {
                latitude = CesiumMath.lerp(destinationExtent.north, destinationExtent.south, j / (height - 1));
                for (i = 0; i < width; ++i) {
                    longitude = CesiumMath.lerp(destinationExtent.west, destinationExtent.east, i / (width - 1));
                    heights[j * width + i] = interpolateHeight(sourceHeights, sourceExtent, width, height, longitude, latitude);
                }
            }
        }

        return new HeightmapTerrainData({
            buffer : heights,
            width : width,
            height : height,
            childTileMask : 0,
            structure : terrainData._structure,
            createdByUpsampling : true
        });
    }

    function interpolateHeight(sourceHeights, sourceExtent, width, height, longitude, latitude) {
        var fromWest = (longitude - sourceExtent.west) * (width - 1) / (sourceExtent.east - sourceExtent.west);
        var fromSouth = (latitude - sourceExtent.south) * (height - 1) / (sourceExtent.north - sourceExtent.south);

        var westInteger = fromWest | 0;
        var eastInteger = westInteger + 1;
        if (eastInteger >= width) {
            eastInteger = width - 1;
            westInteger = width - 2;
        }

        var southInteger = fromSouth | 0;
        var northInteger = southInteger + 1;
        if (northInteger >= height) {
            northInteger = height - 1;
            southInteger = height - 2;
        }

        var dx = fromWest - westInteger;
        var dy = fromSouth - southInteger;

        southInteger = height - 1 - southInteger;
        northInteger = height - 1 - northInteger;

        var southwestHeight = sourceHeights[southInteger * width + westInteger];
        var southeastHeight = sourceHeights[southInteger * width + eastInteger];
        var northwestHeight = sourceHeights[northInteger * width + westInteger];
        var northeastHeight = sourceHeights[northInteger * width + eastInteger];

        return triangleInterpolateHeight(dx, dy, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
    }

    function interpolateHeightWithStride(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceExtent, width, height, longitude, latitude) {
        var fromWest = (longitude - sourceExtent.west) * (width - 1) / (sourceExtent.east - sourceExtent.west);
        var fromSouth = (latitude - sourceExtent.south) * (height - 1) / (sourceExtent.north - sourceExtent.south);

        var westInteger = fromWest | 0;
        var eastInteger = westInteger + 1;
        if (eastInteger >= width) {
            eastInteger = width - 1;
            westInteger = width - 2;
        }

        var southInteger = fromSouth | 0;
        var northInteger = southInteger + 1;
        if (northInteger >= height) {
            northInteger = height - 1;
            southInteger = height - 2;
        }

        var dx = fromWest - westInteger;
        var dy = fromSouth - southInteger;

        southInteger = height - 1 - southInteger;
        northInteger = height - 1 - northInteger;

        var southwestHeight = getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, southInteger * width + westInteger);
        var southeastHeight = getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, southInteger * width + eastInteger);
        var northwestHeight = getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, northInteger * width + westInteger);
        var northeastHeight = getHeight(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, northInteger * width + eastInteger);

        return triangleInterpolateHeight(dx, dy, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
    }

    function triangleInterpolateHeight(dX, dY, southwestHeight, southeastHeight, northwestHeight, northeastHeight) {
        // The HeightmapTessellator bisects the quad from southwest to northeast.
        if (dY < dX) {
            // Lower right triangle
            return southwestHeight + (dX * (southeastHeight - southwestHeight)) + (dY * (northeastHeight - southeastHeight));
        }

        // Upper left triangle
        return southwestHeight + (dX * (northeastHeight - northwestHeight)) + (dY * (northwestHeight - southwestHeight));
    }

    function getHeight(heights, elementsPerHeight, elementMultiplier, stride, isBigEndian, index) {
        index *= stride;

        var height = 0;
        var i;

        if (isBigEndian) {
            for (i = 0; i < elementsPerHeight; ++i) {
                height = (height * elementMultiplier) + heights[index + i];
            }
        } else {
            for (i = elementsPerHeight - 1; i >= 0; --i) {
                height = (height * elementMultiplier) + heights[index + i];
            }
        }

        return height;
    }

    function setHeight(heights, elementsPerHeight, elementMultiplier, divisor, stride, isBigEndian, index, height) {
        index *= stride;

        var i;
        if (isBigEndian) {
            for (i = 0; i < elementsPerHeight; ++i) {
                heights[index + i] = (height / divisor) | 0;
                height -= heights[index + i] * divisor;
                divisor /= elementMultiplier;
            }
        } else {
            for (i = elementsPerHeight - 1; i >= 0; --i) {
                heights[index + i] = (height / divisor) | 0;
                height -= heights[index + i] * divisor;
                divisor /= elementMultiplier;
            }
        }
    }

    return HeightmapTerrainData;
});