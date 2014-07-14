/*global define*/
define([
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './GeographicTilingScheme',
        './HeightmapTessellator',
        './Math',
        './Rectangle',
        './TaskProcessor',
        './TerrainMesh',
        './TerrainProvider'
    ], function(
        when,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        GeographicTilingScheme,
        HeightmapTessellator,
        CesiumMath,
        Rectangle,
        TaskProcessor,
        TerrainMesh,
        TerrainProvider) {
    "use strict";

    /**
     * Terrain data for a single tile where the terrain data is represented as a heightmap.  A heightmap
     * is a rectangular array of heights in row-major order from south to north and west to east.
     *
     * @alias HeightmapTerrainData
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {TypedArray} options.buffer The buffer containing height data.
     * @param {Number} options.width The width (longitude direction) of the heightmap, in samples.
     * @param {Number} options.height The height (latitude direction) of the heightmap, in samples.
     * @param {Number} [options.childTileMask=15] A bit mask indicating which of this tile's four children exist.
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
     * @param {Object} [options.structure] An object describing the structure of the height data.
     * @param {Number} [options.structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
     *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
     *                 height after multiplying by the scale.
     * @param {Number} [options.structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
     *                 height in meters.  The offset is added after the height sample is multiplied by the
     *                 heightScale.
     * @param {Number} [options.structure.elementsPerHeight=1] The number of elements in the buffer that make up a single height
     *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
     *                 it is greater than 1, that number of elements together form the height sample, which is
     *                 computed according to the structure.elementMultiplier and structure.isBigEndian properties.
     * @param {Number} [options.structure.stride=1] The number of elements to skip to get from the first element of
     *                 one height to the first element of the next height.
     * @param {Number} [options.structure.elementMultiplier=256.0] The multiplier used to compute the height value when the
     *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
     *                 is 256, the height is computed as follows:
     *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
     *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
     *                 elements is reversed.
     * @param {Boolean} [options.structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
     *                  stride property is greater than 1.  If this property is false, the first element is the
     *                  low-order element.  If it is true, the first element is the high-order element.
     * @param {Boolean} [options.createdByUpsampling=false] True if this instance was created by upsampling another instance;
     *                  otherwise, false.
     *
     * @see TerrainData
     * @see QuantizedMeshTerrainData
     *
     * @example
     * var buffer = ...
     * var heightBuffer = new Uint16Array(buffer, 0, that._heightmapWidth * that._heightmapWidth);
     * var childTileMask = new Uint8Array(buffer, heightBuffer.byteLength, 1)[0];
     * var waterMask = new Uint8Array(buffer, heightBuffer.byteLength + 1, buffer.byteLength - heightBuffer.byteLength - 1);
     * var structure = Cesium.HeightmapTessellator.DEFAULT_STRUCTURE;
     * var terrainData = new Cesium.HeightmapTerrainData({
     *   buffer : heightBuffer,
     *   width : 65,
     *   height : 65,
     *   childTileMask : childTileMask,
     *   structure : structure,
     *   waterMask : waterMask
     * });
     */
    var HeightmapTerrainData = function HeightmapTerrainData(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.buffer)) {
            throw new DeveloperError('options.buffer is required.');
        }
        if (!defined(options.width)) {
            throw new DeveloperError('options.width is required.');
        }
        if (!defined(options.height)) {
            throw new DeveloperError('options.height is required.');
        }
        //>>includeEnd('debug');

        this._buffer = options.buffer;
        this._width = options.width;
        this._height = options.height;
        this._childTileMask = defaultValue(options.childTileMask, 15);

        var defaultStructure = HeightmapTessellator.DEFAULT_STRUCTURE;
        var structure = options.structure;
        if (!defined(structure)) {
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
        this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);
        this._waterMask = options.waterMask;
    };

    defineProperties(HeightmapTerrainData.prototype, {
        /**
         * The water mask included in this terrain data, if any.  A water mask is a rectangular
         * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
         * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
         * @memberof HeightmapTerrainData.prototype
         * @type {Uint8Array|Image|Canvas}
         */
        waterMask : {
            get : function() {
                return this._waterMask;
            }
        }
    });


    var taskProcessor = new TaskProcessor('createVerticesFromHeightmap');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (!defined(x)) {
            throw new DeveloperError('x is required.');
        }
        if (!defined(y)) {
            throw new DeveloperError('y is required.');
        }
        if (!defined(level)) {
            throw new DeveloperError('level is required.');
        }
        //>>includeEnd('debug');

        var ellipsoid = tilingScheme.ellipsoid;
        var nativeRectangle = tilingScheme.tileXYToNativeRectangle(x, y, level);
        var rectangle = tilingScheme.tileXYToRectangle(x, y, level);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        var structure = this._structure;

        var levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, this._width, tilingScheme.getNumberOfXTilesAtLevel(0));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : this._buffer,
            structure : structure,
            width : this._width,
            height : this._height,
            nativeRectangle : nativeRectangle,
            rectangle : rectangle,
            relativeToCenter : center,
            ellipsoid : ellipsoid,
            skirtHeight : Math.min(thisLevelMaxError * 4.0, 1000.0),
            isGeographic : tilingScheme instanceof GeographicTilingScheme
        });

        if (!defined(verticesPromise)) {
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
     * @param {Rectangle} rectangle The rectangle covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the rectangle, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the rectangle.
     */
    HeightmapTerrainData.prototype.interpolateHeight = function(rectangle, longitude, latitude) {
        var width = this._width;
        var height = this._height;

        var heightSample;

        var structure = this._structure;
        var stride = structure.stride;
        if (stride > 1) {
            var elementsPerHeight = structure.elementsPerHeight;
            var elementMultiplier = structure.elementMultiplier;
            var isBigEndian = structure.isBigEndian;

            heightSample = interpolateHeightWithStride(this._buffer, elementsPerHeight, elementMultiplier, stride, isBigEndian, rectangle, width, height, longitude, latitude);
        } else {
            heightSample = interpolateHeight(this._buffer, rectangle, width, height, longitude, latitude);
        }

        return heightSample * structure.heightScale + structure.heightOffset;
    };

    /**
     * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
     * height samples in this instance, interpolated if necessary.
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     * @returns {Promise|HeightmapTerrainData} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    HeightmapTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (!defined(thisX)) {
            throw new DeveloperError('thisX is required.');
        }
        if (!defined(thisY)) {
            throw new DeveloperError('thisY is required.');
        }
        if (!defined(thisLevel)) {
            throw new DeveloperError('thisLevel is required.');
        }
        if (!defined(descendantX)) {
            throw new DeveloperError('descendantX is required.');
        }
        if (!defined(descendantY)) {
            throw new DeveloperError('descendantY is required.');
        }
        if (!defined(descendantLevel)) {
            throw new DeveloperError('descendantLevel is required.');
        }
        var levelDifference = descendantLevel - thisLevel;
        if (levelDifference > 1) {
            throw new DeveloperError('Upsampling through more than one level at a time is not currently supported.');
        }
        //>>includeEnd('debug');

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
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    HeightmapTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(thisX)) {
            throw new DeveloperError('thisX is required.');
        }
        if (!defined(thisY)) {
            throw new DeveloperError('thisY is required.');
        }
        if (!defined(childX)) {
            throw new DeveloperError('childX is required.');
        }
        if (!defined(childY)) {
            throw new DeveloperError('childY is required.');
        }
        //>>includeEnd('debug');

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
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
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

        // PERFORMANCE_IDEA: don't recompute these rectangles - the caller already knows them.
        var sourceRectangle = tilingScheme.tileXYToRectangle(thisX, thisY, thisLevel);
        var destinationRectangle = tilingScheme.tileXYToRectangle(descendantX, descendantY, descendantLevel);

        var i, j, latitude, longitude;

        if (stride > 1) {
            var elementsPerHeight = structure.elementsPerHeight;
            var elementMultiplier = structure.elementMultiplier;
            var isBigEndian = structure.isBigEndian;

            var divisor = Math.pow(elementMultiplier, elementsPerHeight - 1);

            for (j = 0; j < height; ++j) {
                latitude = CesiumMath.lerp(destinationRectangle.north, destinationRectangle.south, j / (height - 1));
                for (i = 0; i < width; ++i) {
                    longitude = CesiumMath.lerp(destinationRectangle.west, destinationRectangle.east, i / (width - 1));
                    var heightSample = interpolateHeightWithStride(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceRectangle, width, height, longitude, latitude);
                    setHeight(heights, elementsPerHeight, elementMultiplier, divisor, stride, isBigEndian, j * width + i, heightSample);
                }
            }
        } else {
            for (j = 0; j < height; ++j) {
                latitude = CesiumMath.lerp(destinationRectangle.north, destinationRectangle.south, j / (height - 1));
                for (i = 0; i < width; ++i) {
                    longitude = CesiumMath.lerp(destinationRectangle.west, destinationRectangle.east, i / (width - 1));
                    heights[j * width + i] = interpolateHeight(sourceHeights, sourceRectangle, width, height, longitude, latitude);
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

    function interpolateHeight(sourceHeights, sourceRectangle, width, height, longitude, latitude) {
        var fromWest = (longitude - sourceRectangle.west) * (width - 1) / (sourceRectangle.east - sourceRectangle.west);
        var fromSouth = (latitude - sourceRectangle.south) * (height - 1) / (sourceRectangle.north - sourceRectangle.south);

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

    function interpolateHeightWithStride(sourceHeights, elementsPerHeight, elementMultiplier, stride, isBigEndian, sourceRectangle, width, height, longitude, latitude) {
        var fromWest = (longitude - sourceRectangle.west) * (width - 1) / (sourceRectangle.east - sourceRectangle.west);
        var fromSouth = (latitude - sourceRectangle.south) * (height - 1) / (sourceRectangle.north - sourceRectangle.south);

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