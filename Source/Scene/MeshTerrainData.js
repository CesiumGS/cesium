/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/HeightmapTessellator',
        '../Core/Intersections2D',
        '../Core/Math',
        '../Core/TaskProcessor',
        './GeographicTilingScheme',
        './HeightmapTerrainData',
        './TerrainMesh',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        EllipsoidalOccluder,
        HeightmapTessellator,
        Intersections2D,
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
        this._minimumHeight = defaultValue(description.minimumHeight, -1000.0);
        this._maximumHeight = defaultValue(description.maximumHeight, 10000.0);
        this._boundingSphere = description.boundingSphere;
        this._horizonOcclusionPoint = description.horizonOcclusionPoint;
        this._vertexBuffer = description.vertexBuffer;
        this._indexBuffer = description.indexBuffer;
        this._westVertices = toArray(description.westVertices);
        this._southVertices = toArray(description.southVertices);
        this._eastVertices = toArray(description.eastVertices);
        this._northVertices = toArray(description.northVertices);

        this._childTileMask = defaultValue(description.childTileMask, 15);

        this._createdByUpsampling = defaultValue(description.createdByUpsampling, false);
        this._waterMask = description.waterMask;

        if (!defined(this._boundingSphere)) {
            this._boundingSphere = BoundingSphere.fromVertices(this._vertexBuffer, this._center, 6);
        }

        if (!defined(this._horizonOcclusionPoint)) {
            var occluder = new EllipsoidalOccluder(Ellipsoid.WGS84);
            this._horizonOcclusionPoint = occluder.computeHorizonCullingPointFromVertices(this._center, this._vertexBuffer, 6, this._center);
        }
    };

    function toArray(typedArray) {
        var result = new Array(typedArray.length);
        for (var i = 0, len = typedArray.length; i < len; ++i) {
            result[i] = typedArray[i];
        }
        return result;
    }

    var cartesian3Scratch = new Cartesian3();
    var cartographicScratch = new Cartographic();

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

        var edgeVertices = this._westVertices.length + this._eastVertices.length +
                           this._southVertices.length + this._northVertices.length;
        var vertexBuffer = new Float32Array(this._vertexBuffer.length + edgeVertices * vertexStride);
        vertexBuffer.set(this._vertexBuffer, 0);

        var edgeTriangles = (edgeVertices - 4) * 2;
        var indexBuffer = new Uint16Array(this._indexBuffer.length + edgeTriangles * 3);
        indexBuffer.set(this._indexBuffer, 0);

        var ellipsoid = tilingScheme.getEllipsoid();
        var extent = tilingScheme.tileXYToExtent(x, y, level);

        // TODO: for a heightmap?
        var approximateTileWidth = 65;
        var position1Cartographic = new Cartographic(0.0, 0.0, -11500.0);
        var position2Cartographic = new Cartographic(0.5 * Math.PI / (approximateTileWidth - 1), 0.0, 9000.0);
        var position1 = ellipsoid.cartographicToCartesian(position1Cartographic);
        var position2 = ellipsoid.cartographicToCartesian(position2Cartographic);

        var levelZeroMaxError = Cartesian3.magnitude(Cartesian3.subtract(position1, position2));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);

        thisLevelMaxError *= 2.0;

        this._westVertices.sort(function(a, b) {
            return vertexBuffer[a * vertexStride + vIndex] - vertexBuffer[b * vertexStride + vIndex];
        });

        this._southVertices.sort(function(a, b) {
            return vertexBuffer[a * vertexStride + uIndex] - vertexBuffer[b * vertexStride + uIndex];
        });

        this._eastVertices.sort(function(a, b) {
            return vertexBuffer[a * vertexStride + vIndex] - vertexBuffer[b * vertexStride + vIndex];
        });

        this._northVertices.sort(function(a, b) {
            return vertexBuffer[a * vertexStride + uIndex] - vertexBuffer[b * vertexStride + uIndex];
        });

        var vertexBufferIndex = this._vertexBuffer.length;
        var indexBufferIndex = this._indexBuffer.length;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, this._westVertices, this._center, ellipsoid, extent, thisLevelMaxError, true);
        vertexBufferIndex += this._westVertices.length * 6;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, this._southVertices, this._center, ellipsoid, extent, thisLevelMaxError, false);
        vertexBufferIndex += this._southVertices.length * 6;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, this._eastVertices, this._center, ellipsoid, extent, thisLevelMaxError, false);
        vertexBufferIndex += this._eastVertices.length * 6;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, this._northVertices, this._center, ellipsoid, extent, thisLevelMaxError, true);
        vertexBufferIndex += this._northVertices.length * 6;

        return new TerrainMesh(
                this._center,
                vertexBuffer,
                indexBuffer,
                this._minimumHeight,
                this._maximumHeight,
                this._boundingSphere,
                this._horizonOcclusionPoint);
    };

    function addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, edgeVertices, center, ellipsoid, extent, skirtLength, isWestOrNorthEdge) {
        var start, end, increment;
        if (isWestOrNorthEdge) {
            start = edgeVertices.length - 1;
            end = -1;
            increment = -1;
        } else {
            start = 0;
            end = edgeVertices.length;
            increment = 1;
        }

        var previousIndex = -1;

        var vertexIndex = vertexBufferIndex / vertexStride;

        for (var i = start; i !== end; i += increment) {
            var index = edgeVertices[i];
            var offset = index * vertexStride;
            var u = vertexBuffer[offset + uIndex];
            var v = vertexBuffer[offset + vIndex];
            var h = vertexBuffer[offset + hIndex];

            cartographicScratch.longitude = CesiumMath.lerp(extent.west, extent.east, u);
            cartographicScratch.latitude = CesiumMath.lerp(extent.south, extent.north, v);
            cartographicScratch.height = h - skirtLength;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
            Cartesian3.subtract(position, center, position);

            vertexBuffer[vertexBufferIndex++] = position.x;
            vertexBuffer[vertexBufferIndex++] = position.y;
            vertexBuffer[vertexBufferIndex++] = position.z;
            vertexBuffer[vertexBufferIndex++] = cartographicScratch.height;
            vertexBuffer[vertexBufferIndex++] = u;
            vertexBuffer[vertexBufferIndex++] = v;

            if (previousIndex !== -1) {
                indexBuffer[indexBufferIndex++] = previousIndex;
                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = index;

                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = vertexIndex;
                indexBuffer[indexBufferIndex++] = index;
            }

            previousIndex = index;
            ++vertexIndex;
        }

        return indexBufferIndex;
    }

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
        //var width = this._width;
        //var height = this._height;

        var heightSample = 0.0;

        var structure = this._structure;
        var stride = structure.stride;
        if (stride > 1) {
            //var elementsPerHeight = structure.elementsPerHeight;
            //var elementMultiplier = structure.elementMultiplier;
            //var isBigEndian = structure.isBigEndian;

//            heightSample = interpolateHeightWithStride(this._buffer, elementsPerHeight, elementMultiplier, stride, isBigEndian, extent, width, height, longitude, latitude);
        } else {
//            heightSample = interpolateHeight(this._buffer, extent, width, height, longitude, latitude);
        }

        return heightSample * structure.heightScale + structure.heightOffset;
    };


    function Vertex() {
        this.vertexBuffer = undefined;
        this.index = undefined;
        this.first = undefined;
        this.second = undefined;
        this.ratio = undefined;
    }

    Vertex.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new Vertex();
        }

        result.vertexBuffer = this.vertexBuffer;
        result.index = this.index;
        result.first = this.first;
        result.second = this.second;
        result.ratio = this.ratio;

        return result;
    };

    Vertex.prototype.initializeIndexed = function(vertexBuffer, index) {
        this.vertexBuffer = vertexBuffer;
        this.index = index;
        this.first = undefined;
        this.second = undefined;
        this.ratio = undefined;
    };

    Vertex.prototype.initializeInterpolated = function(first, second, ratio) {
        this.vertexBuffer = undefined;
        this.index = undefined;
        this.newIndex = undefined;
        this.first = first;
        this.second = second;
        this.ratio = ratio;
    };

    Vertex.prototype.initializeFromClipResult = function(clipResult, index, vertices) {
        var nextIndex = index + 1;

        if (clipResult[index] !== -1) {
            vertices[clipResult[index]].clone(this);
        } else {
            this.vertexBuffer = undefined;
            this.index = undefined;
            this.first = vertices[clipResult[nextIndex]];
            ++nextIndex;
            this.second = vertices[clipResult[nextIndex]];
            ++nextIndex;
            this.ratio = clipResult[nextIndex];
            ++nextIndex;
        }

        return nextIndex;
    };

    Vertex.prototype.getKey = function() {
        if (this.isIndexed()) {
            return this.index;
        }
        return JSON.stringify({
            first : this.first.getKey(),
            second : this.second.getKey(),
            ratio : this.ratio
        });
    };

    Vertex.prototype.isIndexed = function() {
        return typeof this.index !== 'undefined';
    };

    Vertex.prototype.getH = function() {
        if (typeof this.index !== 'undefined') {
            return this.vertexBuffer[this.index * vertexStride + hIndex];
        }
        return CesiumMath.lerp(this.first.getH(), this.second.getH(), this.ratio);
    };

    Vertex.prototype.getU = function() {
        if (typeof this.index !== 'undefined') {
            return this.vertexBuffer[this.index * vertexStride + uIndex];
        }
        return CesiumMath.lerp(this.first.getU(), this.second.getU(), this.ratio);
    };

    Vertex.prototype.getV = function() {
        if (typeof this.index !== 'undefined') {
            return this.vertexBuffer[this.index * vertexStride + vIndex];
        }
        return CesiumMath.lerp(this.first.getV(), this.second.getV(), this.ratio);
    };

    var polygonVertices = [];
    polygonVertices.push(new Vertex());
    polygonVertices.push(new Vertex());
    polygonVertices.push(new Vertex());
    polygonVertices.push(new Vertex());

    function addClippedPolygon(vertices, indices, vertexMap, clipped, triangleVertices, ellipsoid, extent, center) {
        if (clipped.length === 0) {
            return;
        }

        var numVertices = 0;
        var clippedIndex = 0;
        while (clippedIndex < clipped.length) {
            clippedIndex = polygonVertices[numVertices++].initializeFromClipResult(clipped, clippedIndex, triangleVertices);
        }

        for (var i = 0; i < numVertices; ++i) {
            var polygonVertex = polygonVertices[i];
            if (!polygonVertex.isIndexed()) {
                var key = polygonVertex.getKey();
                if (typeof vertexMap[key] !== 'undefined') {
                    polygonVertex.newIndex = vertexMap[key];
                } else {
                    var newIndex = vertices.length / vertexStride;
                    vertices.push(undefined);
                    vertices.push(undefined);
                    vertices.push(undefined);
                    vertices.push(polygonVertex.getH());
                    vertices.push(polygonVertex.getU());
                    vertices.push(polygonVertex.getV());
                    polygonVertex.newIndex = newIndex;
                    vertexMap[key] = newIndex;
                }
            } else {
                polygonVertex.newIndex = vertexMap[polygonVertex.index];
                polygonVertex.vertexBuffer = vertices;
            }
        }

        if (numVertices === 3) {
            // A triangle.
            indices.push(polygonVertices[0].newIndex);
            indices.push(polygonVertices[1].newIndex);
            indices.push(polygonVertices[2].newIndex);
        } else if (numVertices === 4){
            // A quad - two triangles.
            indices.push(polygonVertices[0].newIndex);
            indices.push(polygonVertices[1].newIndex);
            indices.push(polygonVertices[2].newIndex);

            indices.push(polygonVertices[0].newIndex);
            indices.push(polygonVertices[2].newIndex);
            indices.push(polygonVertices[3].newIndex);
        }
    }

    var clipScratch = [];
    var clipScratch2 = [];
    var verticesScratch = [];
    var indicesScratch = [];

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

        var ellipsoid = tilingScheme.getEllipsoid();
        var extent = tilingScheme.tileXYToExtent(descendantX, descendantY, descendantLevel);

        var isEastChild = thisX * 2 !== descendantX;
        var isNorthChild = thisY * 2 === descendantY;

        var minU = isEastChild ? 0.5 : 0.0;
        var maxU = isEastChild ? 1.0 : 0.5;
        var minV = isNorthChild ? 0.5 : 0.0;
        var maxV = isNorthChild ? 1.0 : 0.5;

        var vertices = verticesScratch;
        vertices.length = 0;
        var indices = indicesScratch;
        indices.length = 0;
        var vertexMap = {};

        var parentVertices = this._vertexBuffer;
        var parentIndices = this._indexBuffer;

        var vertexCount = 0;
        var i, u, v;
        for (i = 0; i < parentVertices.length; i += vertexStride) {
            u = parentVertices[i + uIndex];
            v = parentVertices[i + vIndex];
            if ((isEastChild && u >= 0.5 || !isEastChild && u <= 0.5) &&
                (isNorthChild && v >= 0.5 || !isNorthChild && v <= 0.5)) {

                vertexMap[i / 6] = vertexCount;
                vertices.push(parentVertices[i + xIndex]);
                vertices.push(parentVertices[i + yIndex]);
                vertices.push(parentVertices[i + zIndex]);
                vertices.push(parentVertices[i + hIndex]);
                vertices.push(parentVertices[i + uIndex]);
                vertices.push(parentVertices[i + vIndex]);
                ++vertexCount;
            }
        }

        var triangleVertices = [];
        triangleVertices.push(new Vertex());
        triangleVertices.push(new Vertex());
        triangleVertices.push(new Vertex());

        var clippedTriangleVertices = [];
        clippedTriangleVertices.push(new Vertex());
        clippedTriangleVertices.push(new Vertex());
        clippedTriangleVertices.push(new Vertex());

        var clippedIndex;
        var clipped2;

        for (i = 0; i < parentIndices.length; i += 3) {
            var i0 = parentIndices[i];
            var i1 = parentIndices[i + 1];
            var i2 = parentIndices[i + 2];

            var u0 = parentVertices[i0 * vertexStride + uIndex];
            var u1 = parentVertices[i1 * vertexStride + uIndex];
            var u2 = parentVertices[i2 * vertexStride + uIndex];

            triangleVertices[0].initializeIndexed(parentVertices, i0);
            triangleVertices[1].initializeIndexed(parentVertices, i1);
            triangleVertices[2].initializeIndexed(parentVertices, i2);

            // Clip triangle on the east-west boundary.
            var clipped = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, isEastChild, u0, u1, u2, clipScratch);

            // Get the first clipped triangle, if any.
            clippedIndex = 0;

            if (clippedIndex >= clipped.length) {
                continue;
            }
            clippedIndex = clippedTriangleVertices[0].initializeFromClipResult(clipped, clippedIndex, triangleVertices);

            if (clippedIndex >= clipped.length) {
                continue;
            }
            clippedIndex = clippedTriangleVertices[1].initializeFromClipResult(clipped, clippedIndex, triangleVertices);

            if (clippedIndex >= clipped.length) {
                continue;
            }
            clippedIndex = clippedTriangleVertices[2].initializeFromClipResult(clipped, clippedIndex, triangleVertices);

            // Clip the triangle against the North-south boundary.
            clipped2 = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, isNorthChild, clippedTriangleVertices[0].getV(), clippedTriangleVertices[1].getV(), clippedTriangleVertices[2].getV(), clipScratch2);
            addClippedPolygon(vertices, indices, vertexMap, clipped2, clippedTriangleVertices, ellipsoid, extent, this._center);

            // If there's another vertex in the original clipped result,
            // it forms a second triangle.  Clip it as well.
            if (clippedIndex < clipped.length) {
                clippedTriangleVertices[2].clone(clippedTriangleVertices[1]);
                clippedTriangleVertices[2].initializeFromClipResult(clipped, clippedIndex, triangleVertices);

                clipped2 = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, isNorthChild, clippedTriangleVertices[0].getV(), clippedTriangleVertices[1].getV(), clippedTriangleVertices[2].getV(), clipScratch2);
                addClippedPolygon(vertices, indices, vertexMap, clipped2, clippedTriangleVertices, ellipsoid, extent, this._center);
            }
        }

        var uOffset = isEastChild ? -1.0 : 0.0;
        var vOffset = isNorthChild ? -1.0 : 0.0;

        var center = this._center; // TODO: use a better center?

        var westVertices = [];
        var southVertices = [];
        var eastVertices = [];
        var northVertices = [];

        var minimumHeight = Number.MAX_VALUE;
        var maximumHeight = -minimumHeight;

        for (i = 0; i < vertices.length; i += vertexStride) {
            u = vertices[i + uIndex];
            if (u <= minU) {
                westVertices.push(i / vertexStride);
                u = 0.0;
            } else if (u >= maxU) {
                eastVertices.push(i / vertexStride);
                u = 1.0;
            } else {
                u = u * 2.0 + uOffset;
            }

            vertices[i + uIndex] = u;

            v = vertices[i + vIndex];
            if (v <= minV) {
                southVertices.push(i / vertexStride);
                v = 0.0;
            } else if (v >= maxV) {
                northVertices.push(i / vertexStride);
                v = 1.0;
            } else {
                v = v * 2.0 + vOffset;
            }

            vertices[i + vIndex] = v;

            var height = vertices[i + hIndex];
            if (height < minimumHeight) {
                minimumHeight = height;
            }
            if (height > maximumHeight) {
                maximumHeight = height;
            }

            if (typeof vertices[i + xIndex] === 'undefined') {
                cartographicScratch.longitude = CesiumMath.lerp(extent.west, extent.east, u);
                cartographicScratch.latitude = CesiumMath.lerp(extent.south, extent.north, v);
                cartographicScratch.height = vertices[i + hIndex];

                var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
                Cartesian3.subtract(position, center, position);

                vertices[i + xIndex] = position.x;
                vertices[i + yIndex] = position.y;
                vertices[i + zIndex] = position.z;
            }
        }

        return new MeshTerrainData({
            center : this._center,
            minimumHeight : minimumHeight,
            maximumHeight : maximumHeight,
            vertexBuffer : new Float32Array(vertices),
            indexBuffer : new Uint16Array(indices),
            createdByUpsampling : true,
            westVertices : westVertices,
            southVertices : southVertices,
            eastVertices : eastVertices,
            northVertices : northVertices
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