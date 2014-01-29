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

    /**
     * Terrain data for a single tile where the terrain data is represented as a quantized mesh.  A quantized
     * mesh consists of three vertex attributes, longitude, latitude, and height.  All attributes are expressed
     * as 16-bit values in the range 0 to 32767.  Longitude and latitude are zero at the southwest corner
     * of the tile and 32767 at the northeast corner.  Height is zero at the minimum height in the tile
     * and 32767 at the maximum height in the tile.
     *
     * @alias QuantizedMeshTerrainData
     * @constructor
     *
     * @param {Uint16Array} description.quantizedVertices The buffer containing the quantized mesh.
     * @param {Uint16Array} description.indices The indices specifying how the quantized vertices are linked
     *                      together into triangles.  Each three indices specifies one triangle.
     * @param {Number} description.minimumHeight The minimum terrain height within the tile, in meters above the ellipsoid.
     * @param {Number} description.maximumHeight The maximum terrain height within the tile, in meters above the ellipsoid.
     * @param {BoundingSphere} description.boundingSphere A sphere bounding all of the vertices in the mesh.
     * @param {Cartesian3} description.horizonOcclusionPoint The horizon occlusion point of the mesh.  If this point
     *                      is below the horizon, the entire tile is assumed to be below the horizon as well.
     *                      The point is expressed in ellipsoid-scaled coordinates.
     * @param {Number[]} description.westIndices The indices of the vertices on the western edge of the tile.
     * @param {Number[]} description.southIndices The indices of the vertices on the southern edge of the tile.
     * @param {Number[]} description.eastIndices The indices of the vertices on the eastern edge of the tile.
     * @param {Number[]} description.northIndices The indices of the vertices on the northern edge of the tile.
     * @param {Number} description.westSkirtHeight The height of the skirt to add on the western edge of the tile.
     * @param {Number} description.southSkirtHeight The height of the skirt to add on the southern edge of the tile.
     * @param {Number} description.eastSkirtHeight The height of the skirt to add on the eastern edge of the tile.
     * @param {Number} description.northSkirtHeight The height of the skirt to add on the northern edge of the tile.
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
     * @param {Boolean} [description.createdByUpsampling=false] True if this instance was created by upsampling another instance;
     *                  otherwise, false.
     *
     * @see TerrainData
     * @see HeightmapTerrainData
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
    var QuantizedMeshTerrainData = function QuantizedMeshTerrainData(description) {
        if (!defined(description) || !defined(description.quantizedVertices)) {
            throw new DeveloperError('description.quantizedVertices is required.');
        }
        if (!defined(description.indices)) {
            throw new DeveloperError('description.indices is required.');
        }
        if (!defined(description.minimumHeight)) {
            throw new DeveloperError('description.minimumHeight is required.');
        }
        if (!defined(description.maximumHeight)) {
            throw new DeveloperError('description.maximumHeight is required.');
        }
        if (!defined(description.maximumHeight)) {
            throw new DeveloperError('description.maximumHeight is required.');
        }
        if (!defined(description.boundingSphere)) {
            throw new DeveloperError('description.boundingSphere is required.');
        }
        if (!defined(description.horizonOcclusionPoint)) {
            throw new DeveloperError('description.horizonOcclusionPoint is required.');
        }
        if (!defined(description.westIndices)) {
            throw new DeveloperError('description.westIndices is required.');
        }
        if (!defined(description.southIndices)) {
            throw new DeveloperError('description.southIndices is required.');
        }
        if (!defined(description.eastIndices)) {
            throw new DeveloperError('description.eastIndices is required.');
        }
        if (!defined(description.northIndices)) {
            throw new DeveloperError('description.northIndices is required.');
        }
        if (!defined(description.westSkirtHeight)) {
            throw new DeveloperError('description.westSkirtHeight is required.');
        }
        if (!defined(description.southSkirtHeight)) {
            throw new DeveloperError('description.southSkirtHeight is required.');
        }
        if (!defined(description.eastSkirtHeight)) {
            throw new DeveloperError('description.eastSkirtHeight is required.');
        }
        if (!defined(description.northSkirtHeight)) {
            throw new DeveloperError('description.northSkirtHeight is required.');
        }
        if (!defined(description.childTileMask)) {
            throw new DeveloperError('description.childTileMask is required.');
        }

        this._quantizedVertices = description.quantizedVertices;
        this._indices = description.indices;
        this._minimumHeight = description.minimumHeight;
        this._maximumHeight = description.maximumHeight;
        this._boundingSphere = description.boundingSphere;
        this._horizonOcclusionPoint = description.horizonOcclusionPoint;

        // TODO: these toArray calls are not necessary if we can count on the edge vertices being sorted.
        this._westIndices = toArray(description.westIndices);
        this._southIndices = toArray(description.southIndices);
        this._eastIndices = toArray(description.eastIndices);
        this._northIndices = toArray(description.northIndices);

        this._westSkirtHeight = description.westSkirtHeight;
        this._southSkirtHeight = description.southSkirtHeight;
        this._eastSkirtHeight = description.eastSkirtHeight;
        this._northSkirtHeight = description.northSkirtHeight;

        this._childTileMask = defaultValue(description.childTileMask, 15);

        this._createdByUpsampling = defaultValue(description.createdByUpsampling, false);
        this._waterMask = description.waterMask;

        var vertexCount = this._quantizedVertices.length / 3;
        this._uValues = this._quantizedVertices.subarray(0, vertexCount);
        this._vValues = this._quantizedVertices.subarray(vertexCount, 2 * vertexCount);
        this._heightValues = this._quantizedVertices.subarray(2 * vertexCount, 3 * vertexCount);
    };

    function toArray(typedArray) {
        var result = new Array(typedArray.length);
        for (var i = 0, len = typedArray.length; i < len; ++i) {
            result[i] = typedArray[i];
        }
        return result;
    }

    var createMeshTaskProcessor = new TaskProcessor('createVerticesFromQuantizedTerrainMesh');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @memberof QuantizedMeshTerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @returns {Promise|TerrainMesh} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    QuantizedMeshTerrainData.prototype.createMesh = function(tilingScheme, x, y, level) {
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
        var extent = tilingScheme.tileXYToExtent(x, y, level);

        var verticesPromise = createMeshTaskProcessor.scheduleTask({
            minimumHeight : this._minimumHeight,
            maximumHeight : this._maximumHeight,
            quantizedVertices : this._quantizedVertices,
            indices : this._indices,
            westIndices : this._westIndices,
            southIndices : this._southIndices,
            eastIndices : this._eastIndices,
            northIndices : this._northIndices,
            westSkirtHeight : this._westSkirtHeight,
            southSkirtHeight : this._southSkirtHeight,
            eastSkirtHeight : this._eastSkirtHeight,
            northSkirtHeight : this._northSkirtHeight,
            extent : extent,
            relativeToCenter : this._boundingSphere.center,
            ellipsoid : ellipsoid
        });

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        var that = this;
        return when(verticesPromise, function(result) {
            return new TerrainMesh(
                    that._boundingSphere.center,
                    new Float32Array(result.vertices),
                    new Uint16Array(result.indices),
                    that._minimumHeight,
                    that._maximumHeight,
                    that._boundingSphere,
                    that._horizonOcclusionPoint);
        });
    };

    var upsampleTaskProcessor = new TaskProcessor('upsampleQuantizedTerrainMesh');

    /**
     * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
     * vertices in this instance, interpolated if necessary.
     *
     * @memberof QuantizedMeshTerrainData
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     *
     * @returns {Promise|QuantizedMeshTerrainData} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    QuantizedMeshTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
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

        var ellipsoid = tilingScheme.getEllipsoid();
        var childExtent = tilingScheme.tileXYToExtent(descendantX, descendantY, descendantLevel);

        var upsamplePromise = upsampleTaskProcessor.scheduleTask({
            vertices : this._quantizedVertices,
            indices : this._indices,
            minimumHeight : this._minimumHeight,
            maximumHeight : this._maximumHeight,
            isEastChild : isEastChild,
            isNorthChild : isNorthChild,
            childExtent : childExtent,
            ellipsoid : ellipsoid
        });

        if (!defined(upsamplePromise)) {
            // Postponed
            return undefined;
        }

        var shortestSkirt = Math.min(this._westSkirtHeight, this._eastSkirtHeight);
        shortestSkirt = Math.min(shortestSkirt, this._southSkirtHeight);
        shortestSkirt = Math.min(shortestSkirt, this._northSkirtHeight);

        var westSkirtHeight = isEastChild ? (shortestSkirt * 0.5) : this._westSkirtHeight;
        var southSkirtHeight = isNorthChild ? (shortestSkirt * 0.5) : this._southSkirtHeight;
        var eastSkirtHeight = isEastChild ? this._eastSkirtHeight : (shortestSkirt * 0.5);
        var northSkirtHeight = isNorthChild ? this._northSkirtHeight : (shortestSkirt * 0.5);

        var that = this;
        return when(upsamplePromise, function(result) {
            return new QuantizedMeshTerrainData({
                quantizedVertices : new Uint16Array(result.vertices),
                indices : new Uint16Array(result.indices),
                minimumHeight : result.minimumHeight,
                maximumHeight : result.maximumHeight,
                boundingSphere : BoundingSphere.clone(result.boundingSphere),
                horizonOcclusionPoint : Cartesian3.clone(result.horizonOcclusionPoint),
                westIndices : result.westIndices,
                southIndices : result.southIndices,
                eastIndices : result.eastIndices,
                northIndices : result.northIndices,
                westSkirtHeight : westSkirtHeight,
                southSkirtHeight : southSkirtHeight,
                eastSkirtHeight : eastSkirtHeight,
                northSkirtHeight : northSkirtHeight,
                childTileMask : 0,
                createdByUpsampling : true
            });
        });
    };

    var maxShort = 32767;
    var barycentricCoordinateScratch = new Cartesian3();

    /**
     * Computes the terrain height at a specified longitude and latitude.
     *
     * @memberof QuantizedMeshTerrainData
     *
     * @param {Extent} extent The extent covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the extent, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the extent.
     */
    QuantizedMeshTerrainData.prototype.interpolateHeight = function(extent, longitude, latitude) {
        var u = (longitude - extent.west) / (extent.east - extent.west);
        u *= maxShort;
        var v = (latitude - extent.south) / (extent.north - extent.south);
        v *= maxShort;

        var uBuffer = this._uValues;
        var vBuffer = this._vValues;
        var heightBuffer = this._heightValues;

        var indices = this._indices;
        for (var i = 0, len = indices.length; i < len; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var u0 = uBuffer[i0];
            var u1 = uBuffer[i1];
            var u2 = uBuffer[i2];

            var v0 = vBuffer[i0];
            var v1 = vBuffer[i1];
            var v2 = vBuffer[i2];

            var barycentric = Intersections2D.computeBarycentricCoordinates(u, v, u0, v0, u1, v1, u2, v2, barycentricCoordinateScratch);
            if (barycentric.x >= -1e-15 && barycentric.y >= -1e-15 && barycentric.z >= -1e-15) {
                var quantizedHeight = barycentric.x * heightBuffer[i0] +
                                      barycentric.y * heightBuffer[i1] +
                                      barycentric.z * heightBuffer[i2];
                return CesiumMath.lerp(this._minimumHeight, this._maximumHeight, quantizedHeight / maxShort);
            }
        }

        // Position does not lie in any triangle in this mesh.
        return undefined;
    };

    /**
     * Determines if a given child tile is available, based on the
     * {@link HeightmapTerrainData.childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     *
     * @memberof QuantizedMeshTerrainData
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    QuantizedMeshTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
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
     *  @memberof QuantizedMeshTerrainData
     *
     *  @returns {Uint8Array|Image|Canvas} The water mask, or undefined if no water mask is associated with this terrain data.
     */
    QuantizedMeshTerrainData.prototype.getWaterMask = function() {
        return this._waterMask;
    };

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
     *
     * @memberof QuantizedMeshTerrainData
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    QuantizedMeshTerrainData.prototype.wasCreatedByUpsampling = function() {
        return this._createdByUpsampling;
    };

    return QuantizedMeshTerrainData;
});