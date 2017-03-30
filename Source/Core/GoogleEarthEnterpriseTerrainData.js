/*global define*/
define([
    '../ThirdParty/when',
    './Cartesian2',
    './Cartesian3',
    './defaultValue',
    './defined',
    './defineProperties',
    './DeveloperError',
    './GeographicTilingScheme',
    './HeightmapTessellator',
    './IndexDatatype',
    './Intersections2D',
    './Math',
    './Rectangle',
    './TaskProcessor',
    './TerrainEncoding',
    './TerrainMesh',
    './TerrainProvider'
], function(
    when,
    Cartesian2,
    Cartesian3,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    GeographicTilingScheme,
    HeightmapTessellator,
    IndexDatatype,
    Intersections2D,
    CesiumMath,
    Rectangle,
    TaskProcessor,
    TerrainEncoding,
    TerrainMesh,
    TerrainProvider) {
    'use strict';

    /**
     * Terrain data for a single tile from a Google Earth Enterprise server.
     *
     * @alias GoogleEarthEnterpriseTerrainData
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {ArrayBuffer} options.buffer The buffer containing terrain data.
     * @param {Number} [options.childTileMask=15] A bit mask indicating which of this tile's four children exist.
     *                 If a child's bit is set, geometry will be requested for that tile as well when it
     *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
     *                 instead upsampled from the parent.  The bit values are as follows:
     *                 <table>
     *                  <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
     *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *                  <tr><td>2</td><td>4</td><td>Northeast</td></tr>
     *                  <tr><td>3</td><td>8</td><td>Northwest</td></tr>
     *                 </table>
     * @param {Boolean} [options.createdByUpsampling=false] True if this instance was created by upsampling another instance;
     *                  otherwise, false.
     *
     *
     * @example
     * var buffer = ...
     * var childTileMask = ...
     * var terrainData = new Cesium.GoogleEarthEnterpriseTerrainData({
     *   buffer : heightBuffer,
     *   childTileMask : childTileMask
     * });
     *
     * @see TerrainData
     * @see HeightTerrainData
     * @see QuantizedMeshTerrainData
     */
    function GoogleEarthEnterpriseTerrainData(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.buffer)) {
            throw new DeveloperError('options.buffer is required.');
        }
        //>>includeEnd('debug');

        this._buffer = options.buffer;
        this._childTileMask = defaultValue(options.childTileMask, 15);

        this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);

        this._skirtHeight = undefined;
        this._bufferType = this._buffer.constructor;
        this._mesh = undefined;
    }

    defineProperties(GoogleEarthEnterpriseTerrainData.prototype, {
        /**
         * The water mask included in this terrain data, if any.  A water mask is a rectangular
         * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
         * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
         * @memberof GoogleEarthEnterpriseTerrainData.prototype
         * @type {Uint8Array|Image|Canvas}
         */
        waterMask : {
            get : function() {
                return undefined;
            }
        }
    });


    var taskProcessor = new TaskProcessor('createVerticesFromGoogleEarthEnterpriseBuffer');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @private
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @param {Number} [exaggeration=1.0] The scale used to exaggerate the terrain.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    GoogleEarthEnterpriseTerrainData.prototype.createMesh = function(tilingScheme, x, y, level, exaggeration) {
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
        exaggeration = defaultValue(exaggeration, 1.0);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        // 1024 was the initial size of the heightmap before decimation in GEE
        var levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, 1024, tilingScheme.getNumberOfXTilesAtLevel(0));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);
        this._skirtHeight = Math.min(thisLevelMaxError * 4.0, 1000.0);

        var verticesPromise = taskProcessor.scheduleTask({
            buffer : this._buffer,
            nativeRectangle : nativeRectangle,
            rectangle : rectangle,
            relativeToCenter : center,
            ellipsoid : ellipsoid,
            skirtHeight : this._skirtHeight,
            exaggeration : exaggeration
        });

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        var that = this;
        return when(verticesPromise, function(result) {
            that._mesh = new TerrainMesh(
                center,
                new Float32Array(result.vertices),
                new Uint16Array(result.indices),
                result.minimumHeight,
                result.maximumHeight,
                result.boundingSphere3D,
                result.occludeePointInScaledSpace,
                result.numberOfAttributes,
                result.orientedBoundingBox,
                TerrainEncoding.clone(result.encoding),
                exaggeration);

            // Free memory received from server after mesh is created.
            that._buffer = undefined;
            return that._mesh;
        });
    };

    var maxShort = 32767;

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
    GoogleEarthEnterpriseTerrainData.prototype.interpolateHeight = function(rectangle, longitude, latitude) {
        var u = CesiumMath.clamp((longitude - rectangle.west) / rectangle.width, 0.0, 1.0);
        u *= maxShort;
        var v = CesiumMath.clamp((latitude - rectangle.south) / rectangle.height, 0.0, 1.0);
        v *= maxShort;

        var heightSample;
        if (defined(this._mesh)) {
            heightSample = interpolateMeshHeight(this, u, v);
        }

        return heightSample;
    };

    //var upsampleTaskProcessor = new TaskProcessor('upsampleQuantizedTerrainMesh');

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
     * @returns {Promise.<HeightmapTerrainData>|undefined} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    GoogleEarthEnterpriseTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
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

        return undefined;

        // var mesh = this._mesh;
        // if (!defined(this._mesh)) {
        //     return undefined;
        // }
        //
        // var isEastChild = thisX * 2 !== descendantX;
        // var isNorthChild = thisY * 2 === descendantY;
        //
        // var ellipsoid = tilingScheme.ellipsoid;
        // var childRectangle = tilingScheme.tileXYToRectangle(descendantX, descendantY, descendantLevel);
        //
        // var upsamplePromise = upsampleTaskProcessor.scheduleTask({
        //     vertices : mesh.vertices,
        //     vertexCountWithoutSkirts : mesh.vertices.length / 3,
        //     indices : mesh.indices,
        //     skirtIndex : undefined,
        //     encoding : mesh.encoding,
        //     minimumHeight : this._minimumHeight,
        //     maximumHeight : this._maximumHeight,
        //     isEastChild : isEastChild,
        //     isNorthChild : isNorthChild,
        //     childRectangle : childRectangle,
        //     ellipsoid : ellipsoid,
        //     exaggeration : mesh.exaggeration
        // });
        //
        // if (!defined(upsamplePromise)) {
        //     // Postponed
        //     return undefined;
        // }
        //
        // // TODO: Skirt
        // // var shortestSkirt = Math.min(this._westSkirtHeight, this._eastSkirtHeight);
        // // shortestSkirt = Math.min(shortestSkirt, this._southSkirtHeight);
        // // shortestSkirt = Math.min(shortestSkirt, this._northSkirtHeight);
        // //
        // // var westSkirtHeight = isEastChild ? (shortestSkirt * 0.5) : this._westSkirtHeight;
        // // var southSkirtHeight = isNorthChild ? (shortestSkirt * 0.5) : this._southSkirtHeight;
        // // var eastSkirtHeight = isEastChild ? this._eastSkirtHeight : (shortestSkirt * 0.5);
        // // var northSkirtHeight = isNorthChild ? this._northSkirtHeight : (shortestSkirt * 0.5);
        //
        // return when(upsamplePromise, function(result) {
        //     var quantizedVertices = new Uint16Array(result.vertices);
        //     var indicesTypedArray = IndexDatatype.createTypedArray(quantizedVertices.length / 3, result.indices);
        //
        //     return new GoogleEarthEnterpriseTerrainData({
        //         quantizedVertices : quantizedVertices,
        //         indices : indicesTypedArray,
        //         minimumHeight : result.minimumHeight,
        //         maximumHeight : result.maximumHeight,
        //         boundingSphere : BoundingSphere.clone(result.boundingSphere),
        //         orientedBoundingBox : OrientedBoundingBox.clone(result.orientedBoundingBox),
        //         horizonOcclusionPoint : Cartesian3.clone(result.horizonOcclusionPoint),
        //         westIndices : result.westIndices,
        //         southIndices : result.southIndices,
        //         eastIndices : result.eastIndices,
        //         northIndices : result.northIndices,
        //         westSkirtHeight : 0,
        //         southSkirtHeight : 0,
        //         eastSkirtHeight : 0,
        //         northSkirtHeight : 0,
        //         childTileMask : 0,
        //         createdByUpsampling : true
        //     });
        // });
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
    GoogleEarthEnterpriseTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
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

        // Layout:
        // 3 2
        // 0 1
        var bitNumber = 0; // southwest child
        if (childY === thisY * 2) { // north child
            bitNumber += 2;
            if (childX === thisX * 2) {
                ++bitNumber; // west child
            }
        } else { // south child
            if (childX !== thisX * 2) {
                ++bitNumber; // east child
            }
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
    GoogleEarthEnterpriseTerrainData.prototype.wasCreatedByUpsampling = function() {
        return this._createdByUpsampling;
    };

    var texCoordScratch0 = new Cartesian2();
    var texCoordScratch1 = new Cartesian2();
    var texCoordScratch2 = new Cartesian2();
    var barycentricCoordinateScratch = new Cartesian3();
    function interpolateMeshHeight(terrainData, u, v) {
        var mesh = terrainData._mesh;
        var vertices = mesh.vertices;
        var encoding = mesh.encoding;
        var indices = mesh.indices;

        for (var i = 0, len = indices.length; i < len; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var uv0 = encoding.decodeTextureCoordinates(vertices, i0, texCoordScratch0);
            var uv1 = encoding.decodeTextureCoordinates(vertices, i1, texCoordScratch1);
            var uv2 = encoding.decodeTextureCoordinates(vertices, i2, texCoordScratch2);

            var barycentric = Intersections2D.computeBarycentricCoordinates(u, v, uv0.x, uv0.y, uv1.x, uv1.y, uv2.x, uv2.y, barycentricCoordinateScratch);
            if (barycentric.x >= -1e-15 && barycentric.y >= -1e-15 && barycentric.z >= -1e-15) {
                var h0 = encoding.decodeHeight(vertices, i0);
                var h1 = encoding.decodeHeight(vertices, i1);
                var h2 = encoding.decodeHeight(vertices, i2);
                return barycentric.x * h0 + barycentric.y * h1 + barycentric.z * h2;
            }
        }

        // Position does not lie in any triangle in this mesh.
        return undefined;
    }

    return GoogleEarthEnterpriseTerrainData;
});
