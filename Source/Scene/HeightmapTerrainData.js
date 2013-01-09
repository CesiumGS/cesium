/*global define*/
define([
        '../Core/defaultValue'
    ], function(
        defaultValue) {
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
    var HeightmapTerrainData = function HeightmapTerrainData(buffer, width, height, structure) {
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
     * @returns {HeightmapTerrainData} Upsampled heightmap terrain data for the descendant tile.
     */
    HeightmapTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
    };

    return HeightmapTerrainData;
});