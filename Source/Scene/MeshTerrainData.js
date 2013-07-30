/*global define*/
define([
        '../Core/defaultValue',
        '../Core/BoundingSphere',
        '../Core/DeveloperError',
        '../Core/HeightmapTessellator',
        '../Core/Math',
        '../Core/TaskProcessor',
        './GeographicTilingScheme',
        './HeightmapTerrainData',
        './TerrainMesh',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        BoundingSphere,
        DeveloperError,
        HeightmapTessellator,
        CesiumMath,
        TaskProcessor,
        GeographicTilingScheme,
        HeightmapTerrainData,
        TerrainMesh,
        TerrainProvider,
        when) {
    "use strict";

    var vertexStride = 6;
    var xIndex = 0;
    var yIndex = 1;
    var zIndex = 2;
    var hIndex = 3;
    var uIndex = 4;
    var vIndex = 5;

    /**
     * Terrain data for a single tile where the terrain data is represented as a heightmap.  A heightmap
     * is a rectangular array of heights in row-major order from south to north and west to east.
     *
     * @alias MeshTerrainData
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
    var MeshTerrainData = function MeshTerrainData(description) {
        if (typeof description === 'undefined' || typeof description.vertexBuffer === 'undefined') {
            throw new DeveloperError('description.vertexBuffer is required.');
        }
        if (typeof description.indexBuffer === 'undefined') {
            throw new DeveloperError('description.indexBuffer is required.');
        }
        if (typeof description.center === 'undefined') {
            throw new DeveloperError('description.center is required.');
        }

        this._center = description.center;
        this._vertexBuffer = description.vertexBuffer;
        this._indexBuffer = new Uint16Array(description.indexBuffer.length);

        for (var i = 0; i < description.indexBuffer.length; ++i) {
            this._indexBuffer[i] = description.indexBuffer[i];
        }

        this._childTileMask = defaultValue(description.childTileMask, 15);

        this._createdByUpsampling = defaultValue(description.createdByUpsampling, false);
        this._waterMask = description.waterMask;
    };

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
    MeshTerrainData.prototype.createMesh = function(tilingScheme, x, y, level) {
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

        var boundingSphere = BoundingSphere.fromVertices(this._vertexBuffer, this._center, 6);
        return new TerrainMesh(this._center, this._vertexBuffer, this._indexBuffer, -1000.0, 10000.0, boundingSphere, undefined);
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
    MeshTerrainData.prototype.interpolateHeight = function(extent, longitude, latitude) {
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

    var vertexMappingScratch = {};

    function addVertexAtEdge(vertices, parentVertices, vertexIndex1, vertexIndex2) {
        var offset1 = vertexIndex1 * vertexStride;
        var x1 = parentVertices[offset1 + xIndex];
        var y1 = parentVertices[offset1 + yIndex];
        var z1 = parentVertices[offset1 + zIndex];
        var h1 = parentVertices[offset1 + hIndex];
        var u1 = parentVertices[offset1 + uIndex];
        var v1 = parentVertices[offset1 + vIndex];

        var offset2 = vertexIndex2 * vertexStride;
        var x2 = parentVertices[offset2 + xIndex];
        var y2 = parentVertices[offset2 + yIndex];
        var z2 = parentVertices[offset2 + zIndex];
        var h2 = parentVertices[offset2 + hIndex];
        var u2 = parentVertices[offset2 + uIndex];
        var v2 = parentVertices[offset2 + vIndex];

        var crossesU = u1 <= 0.5 && u2 >= 0.5 || u1 >= 0.5 && u2 <= 0.5;
        var crossesV = v1 <= 0.5 && v2 >= 0.5 || v1 >= 0.5 && v2 <= 0.5;

        // TODO: handle the case that it crosses both edges.

        var index = vertices.length / vertexStride;

        if (crossesU) {
            var uRatio = (0.5 - u1) / (u2 - u1);
            vertices.push(CesiumMath.lerp(x1, x2, uRatio));
            vertices.push(CesiumMath.lerp(y1, y2, uRatio));
            vertices.push(CesiumMath.lerp(z1, z2, uRatio));
            vertices.push(CesiumMath.lerp(h1, h2, uRatio));
            vertices.push(0.5);
            vertices.push(CesiumMath.lerp(v1, v2, uRatio));
        } else /*if (crossesV)*/ {
            var vRatio = (0.5 - v1) / (v2 - v1);
            vertices.push(CesiumMath.lerp(x1, x2, vRatio));
            vertices.push(CesiumMath.lerp(y1, y2, vRatio));
            vertices.push(CesiumMath.lerp(z1, z2, vRatio));
            vertices.push(CesiumMath.lerp(h1, h2, vRatio));
            vertices.push(CesiumMath.lerp(u1, u2, vRatio));
            vertices.push(0.5);
        }

        return index;
    }

    function addTriangle(indices, vertexIndex1, vertexIndex2, vertexIndex3) {
        indices.push(vertexIndex1);
        indices.push(vertexIndex2);
        indices.push(vertexIndex3);
    }

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
    MeshTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
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

        var isEastChild = thisX * 2 !== descendantX;
        var isNorthChild = thisY * 2 === descendantY;

        var minU = isEastChild ? 0.5 : 0.0;
        var maxU = isEastChild ? 1.0 : 0.5;
        var minV = isNorthChild ? 0.5 : 0.0;
        var maxV = isNorthChild ? 1.0 : 0.5;

        // Enable all parent vertices that are within the child tile's extent.
        var parentVertices = this._vertexBuffer;
        var vertices = [];
        var vertexMapping = vertexMappingScratch;
        vertexMapping.length = 0;
        var vertexCount = 0;
        var i;
        for (i = 0; i < parentVertices.length; i += vertexStride) {
            var u = parentVertices[i + uIndex];
            var v = parentVertices[i + vIndex];
            if (u >= minU && u <= maxU && v >= minV && v <= maxV) {
                vertexMapping[i / 6] = vertexCount;
                vertices.push(parentVertices[i + xIndex]);
                vertices.push(parentVertices[i + yIndex]);
                vertices.push(parentVertices[i + zIndex]);
                vertices.push(parentVertices[i + hIndex]);
                vertices.push(parentVertices[i + uIndex]);
                vertices.push(parentVertices[i + vIndex]);
                ++vertexCount;
            }
        }

        var parentIndices = this._indexBuffer;
        var indices = [];
        for (i = 0; i < parentIndices.length; i += 3) {
            var i1 = parentIndices[i];
            var i2 = parentIndices[i + 1];
            var i3 = parentIndices[i + 2];

            var u1 = parentVertices[i1 * vertexStride + uIndex];
            var v1 = parentVertices[i1 * vertexStride + vIndex];
            var u2 = parentVertices[i2 * vertexStride + uIndex];
            var v2 = parentVertices[i2 * vertexStride + vIndex];
            var u3 = parentVertices[i3 * vertexStride + uIndex];
            var v3 = parentVertices[i3 * vertexStride + vIndex];

            // Which vertices are inside the descendant extent?
            var isInside1 = u1 >= minU && u1 <= maxU && v1 >= minV && v1 <= maxV;
            var isInside2 = u2 >= minU && u2 <= maxU && v2 >= minV && v2 <= maxV;
            var isInside3 = u3 >= minU && u3 <= maxU && v3 >= minV && v3 <= maxV;

            var e1, e2;

            // TODO: what if two vertices are on the border, and the third is
            // outside the extent.  We don't care about that triangle.


            if (isInside1 && isInside2 && isInside3) {
                addTriangle(indices, vertexMapping[i1], vertexMapping[i2], vertexMapping[i3]);
            } else if (isInside1 && isInside2) {
                // Interpolate along the edges connecting to vertex 3.
                e1 = addVertexAtEdge(vertices, parentVertices, i1, i3);
                e2 = addVertexAtEdge(vertices, parentVertices, i2, i3);
                addTriangle(indices, vertexMapping[i1], vertexMapping[i2], e1);
                addTriangle(indices, vertexMapping[i2], e2, e1);
            } else if (isInside2 && isInside3) {
                // Interpolate along the edges connecting to vertex 1.
                e1 = addVertexAtEdge(vertices, parentVertices, i2, i1);
                e2 = addVertexAtEdge(vertices, parentVertices, i3, i1);
                addTriangle(indices, vertexMapping[i2], vertexMapping[i3], e1);
                addTriangle(indices, vertexMapping[i3], e2, e1);
            } else if (isInside1 && isInside3) {
                // Interpolate along the edges connecting to vertex 2.
                e1 = addVertexAtEdge(vertices, parentVertices, i3, i2);
                e2 = addVertexAtEdge(vertices, parentVertices, i1, i2);
                addTriangle(indices, vertexMapping[i3], vertexMapping[i1], e1);
                addTriangle(indices, vertexMapping[i2], e2, e1);
            } else if (isInside1) {
                e1 = addVertexAtEdge(vertices, parentVertices, i1, i2);
                e2 = addVertexAtEdge(vertices, parentVertices, i1, i3);
                addTriangle(indices, vertexMapping[i1], e1, e2);
            } else if (isInside2) {
                e1 = addVertexAtEdge(vertices, parentVertices, i2, i3);
                e2 = addVertexAtEdge(vertices, parentVertices, i2, i1);
                addTriangle(indices, vertexMapping[i2], e1, e2);
            } else if (isInside3) {
                e1 = addVertexAtEdge(vertices, parentVertices, i3, i1);
                e2 = addVertexAtEdge(vertices, parentVertices, i3, i2);
                addTriangle(indices, vertexMapping[i3], e1, e2);
            } else {

            }
        }

        if (indices.length === 0) {
            return new HeightmapTerrainData({
                buffer : new Uint8Array(17 * 17),
                width : 17,
                height : 17
            });
        }

        return new MeshTerrainData({
            center : this._center,
            vertexBuffer : new Float32Array(vertices),
            indexBuffer : new Uint32Array(indices),
            createdByUpsampling : true
        });
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
    MeshTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
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
    MeshTerrainData.prototype.getWaterMask = function() {
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
    MeshTerrainData.prototype.wasCreatedByUpsampling = function() {
        return this._createdByUpsampling;
    };

    return MeshTerrainData;
});