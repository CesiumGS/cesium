/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Extent',
        '../Core/Occluder',
        '../Core/TaskProcessor',
        './Projections',
        './TileState',
        './TerrainProvider',
        './GeographicTilingScheme',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        loadArrayBuffer,
        loadImage,
        getImagePixels,
        writeTextToCanvas,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Extent,
        Occluder,
        TaskProcessor,
        Projections,
        TileState,
        TerrainProvider,
        GeographicTilingScheme,
        WebMercatorTilingScheme,
        when) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces geometry by tessellating height maps
     * retrieved from a Tile Map Service (TMS) server.
     *
     * @alias CesiumTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the TMS service.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see TerrainProvider
     */
    function CesiumTerrainProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        /**
         * The URL of the ArcGIS ImageServer.
         * @type {String}
         */
        this.url = description.url;

        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 1
        });
        //this.maxLevel = 17;
        this.heightmapWidth = 65;
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.getEllipsoid(), this.heightmapWidth, this.tilingScheme.getNumberOfXTilesAtLevel(0));

        this._proxy = description.proxy;

        this.ready = true;
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    CesiumTerrainProvider.prototype.getLevelMaximumGeometricError = TerrainProvider.prototype.getLevelMaximumGeometricError;

    var requestsInFlight = 0;
    // Creating the geometry will require a request to the ImageServer, which will complete
    // asynchronously.  The question is, what do we do in the meantime?  The best thing to do is
    // to use terrain associated with the parent tile.  Ideally, we would be able to render
    // high-res imagery attached to low-res terrain.  In some ways, this is similar to the need
    // described in TerrainProvider of creating geometry for tiles at a higher level than
    // the terrain source actually provides.

    // In the short term, for simplicity:
    // 1. If a tile has geometry available but it has not yet been loaded, don't render the tile until
    //    the geometry has been loaded.
    // 2. If a tile does not have geometry available at all, do not render it or its siblings.
    // Longer term, #1 may be acceptable, but #2 won't be for the reasons described above.
    // To address #2, we can subdivide a mesh into its four children.  This will be fairly CPU
    // intensive, though, which is why we probably won't want to do it while waiting for the
    // actual data to load.  We could also potentially add fractal detail when subdividing.

    /**
     * Request the tile geometry from the remote server.  Once complete, the
     * tile state should be set to RECEIVED.  Alternatively, tile state can be set to
     * UNLOADED to indicate that the request should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Tile} The tile to request geometry for.
     */
    CesiumTerrainProvider.prototype.requestTileGeometry = function(tile) {
        // Is there data available for this tile?
        // All root tiles are expected to have data available.
        var parent = tile.parent;
        var dataAvailable = true;
        if (typeof parent !== 'undefined') {
            var childBits = parent.childTileBits;

            var bitNumber = 2; // northwest child
            if (tile.x !== parent.x * 2) {
                ++bitNumber; // east child
            }
            if (tile.y !== parent.y * 2) {
                bitNumber -= 2; // south child
            }

            dataAvailable = (childBits & (1 << bitNumber)) !== 0;
        }

        if (dataAvailable) {
            if (requestsInFlight > 6) {
                tile.state = TileState.UNLOADED;
                return;
            }

            ++requestsInFlight;

            var yTiles = this.tilingScheme.getNumberOfYTilesAtLevel(tile.level);

            var url = this.url + '/' + tile.level + '/' + tile.x + '/' + (yTiles - tile.y - 1) + '.terrain';

            if (typeof this._proxy !== 'undefined') {
                url = this._proxy.getURL(url);
            }

            when(loadArrayBuffer(url), function(buffer) {
                tile.geometry = buffer;
                tile.state = TileState.RECEIVED;
                --requestsInFlight;
            }, function(e) {
                /*global console*/
                // This shouldn't happen in the absence of network problems.  Log it and then use 0 heights.
                // TODO: retry?
                console.error('failed to load tile geometry: ' + e);
                tile.geometry = new Float32Array(65 * 65).buffer;
                tile.state = TileState.RECEIVED;
                --requestsInFlight;
            });
        } else {
            // Find the nearest ancestor with data.
            var levelDifference = 1;
            var sourceTile = parent;
            while (typeof sourceTile.geometry === 'undefined') {
                sourceTile = sourceTile.parent;
                ++levelDifference;
            }

            // Upsample (subset) the ancestor's data for use by this tile.
            var width = 65;
            var height = 65;

            // Compute the post indices of the corners of this tile within its own level.
            var leftPostIndex = tile.x * (width - 1);
            var rightPostIndex = leftPostIndex + width - 1;
            var topPostIndex = tile.y * (height - 1);
            var bottomPostIndex = topPostIndex + height - 1;

            // Transform the post indices to the ancestor's level.
            var twoToTheLevelDifference = 1 << levelDifference;
            leftPostIndex /= twoToTheLevelDifference;
            rightPostIndex /= twoToTheLevelDifference;
            topPostIndex /= twoToTheLevelDifference;
            bottomPostIndex /= twoToTheLevelDifference;

            // Adjust the indices to be relative to the northwest corner of the source tile.
            var sourceLeft = sourceTile.x * (width - 1);
            var sourceTop = sourceTile.y * (height - 1);
            leftPostIndex -= sourceLeft;
            rightPostIndex -= sourceLeft;
            topPostIndex -= sourceTop;
            bottomPostIndex -= sourceTop;

            var leftInteger = leftPostIndex | 0;
            var rightInteger = rightPostIndex | 0;
            var topInteger = topPostIndex | 0;
            var bottomInteger = bottomPostIndex | 0;

            var sourceHeights = new Float32Array(sourceTile.geometry, 0, (sourceTile.geometry.byteLength - 1) / 4);

            var buffer;
            var heights;

            // We can support the following level differences without interpolating:
            // 1 - 33x33 posts
            // 2 - 17x17 posts
            // 3 - 9x9 posts
            // 4 - 5x5 posts
            // 5 - 3x3 posts
            // 6 - 2x2 posts
            // Beyond that, let's use 2x2 interpolated posts
            if (levelDifference > 6) {
                // Interpolate the four posts
                if (leftInteger === rightInteger) {
                    ++rightInteger;
                }
                if (topInteger === bottomInteger) {
                    ++bottomInteger;
                }

                var southwestHeight = sourceHeights[bottomInteger * width + leftInteger];
                var southeastHeight = sourceHeights[bottomInteger * width + rightInteger];
                var northwestHeight = sourceHeights[topInteger * width + leftInteger];
                var northeastHeight = sourceHeights[topInteger * width + rightInteger];

                var westFraction = leftPostIndex - leftInteger;
                var southFraction = bottomInteger - bottomPostIndex;
                var eastFraction = rightPostIndex - leftInteger;
                var northFraction = bottomInteger - topPostIndex;

                var southwestResult = triangleInterpolateHeight(westFraction, southFraction, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
                var southeastResult = triangleInterpolateHeight(eastFraction, southFraction, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
                var northwestResult = triangleInterpolateHeight(westFraction, northFraction, southwestHeight, southeastHeight, northwestHeight, northeastHeight);
                var northeastResult = triangleInterpolateHeight(eastFraction, northFraction, southwestHeight, southeastHeight, northwestHeight, northeastHeight);

                buffer = new ArrayBuffer(4 * 4 + 1);
                heights = new Float32Array(buffer, 0, 4);
                heights[0] = northwestResult;
                heights[1] = northeastResult;
                heights[2] = southwestResult;
                heights[3] = southeastResult;
            } else {
                // Copy the relevant posts.
                var numberOfFloats = (rightInteger - leftInteger + 1) * (bottomInteger - topInteger + 1);
                buffer = new ArrayBuffer(numberOfFloats * 4 + 1);
                heights = new Float32Array(buffer, 0, numberOfFloats);

                var outputIndex = 0;
                for (var j = topInteger; j <= bottomInteger; ++j) {
                    for (var i = leftInteger; i <= rightInteger; ++i) {
                        heights[outputIndex++] = sourceHeights[j * width + i];
                    }
                }
            }

            // Missing tiles do not have any children.
            var childBitsArray = new Uint8Array(buffer, buffer.byteLength - 1, 1);
            childBitsArray[0] = 0;

            tile.geometry = buffer;
            tile.state = TileState.RECEIVED;
        }

    };

    function triangleInterpolateHeight(dX, dY, southwestHeight, southeastHeight, northwestHeight, northeastHeight) {
        // The HeightmapTessellator bisects the quad from southwest to northeast.
        if (dY < dX) {
            // Lower right triangle
            return southwestHeight + (dX * (southeastHeight - southwestHeight)) + (dY * (northeastHeight - southeastHeight));
        }

        // Upper left triangle
        return southwestHeight + (dX * (northeastHeight - northwestHeight)) + (dY * (northwestHeight - southwestHeight));
    }

    var taskProcessor = new TaskProcessor('createVerticesFromHeightmap');

    /**
     * Transform the tile geometry from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile
     * state should be set to TRANSFORMED.  Alternatively, tile state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Tile} tile The tile to transform geometry for.
     */
    CesiumTerrainProvider.prototype.transformGeometry = function(context, tile) {
        var pixels = new Float32Array(tile.geometry, 0, (tile.geometry.byteLength - 1) / 4);
        var width = Math.sqrt(pixels.length) | 0;
        var height = width;

        var childTileBits = new Uint8Array(tile.geometry, width * height * 4, 1);
        tile.childTileBits = childTileBits[0];

        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.getEllipsoid();
        var extent = tilingScheme.tileXYToNativeExtent(tile.x, tile.y, tile.level);

        tile.center = ellipsoid.cartographicToCartesian(tile.extent.getCenter());

        // If data is not available for any of this tile's children, keep the
        // raw geometry around because the no-data children will use it.
        var transfer = [];
        if (tile.childTileBits === 15 || pixels.length !== this.heightmapWidth * this.heightmapWidth) {
            transfer.push(pixels.buffer);
        }

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : pixels,
            heightScale : 1.0,
            heightOffset : 0.0,
            stride : 1,
            width : width,
            height : height,
            extent : extent,
            relativeToCenter : tile.center,
            radiiSquared : ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : ellipsoid.getOneOverRadii().x,
            skirtHeight : Math.min(this.getLevelMaximumGeometricError(tile.level) * 10.0, 1000.0),
            isGeographic : true
        }, transfer);

        if (typeof verticesPromise === 'undefined') {
            //postponed
            tile.state = TileState.RECEIVED;
            return;
        }

        var that = this;
        when(verticesPromise, function(result) {
            if (tile.childTileBits === 15 || pixels.length !== that.heightmapWidth * that.heightmapWidth) {
                tile.geometry = undefined;
            }
            tile.transformedGeometry = {
                vertices : result.vertices,
                statistics : result.statistics,
                indices : TerrainProvider.getRegularGridIndices(width + 2, height + 2)
            };
            tile.state = TileState.TRANSFORMED;
        }, function(e) {
            /*global console*/
            console.error('failed to transform geometry: ' + e);
            tile.state = TileState.FAILED;
        });
    };

    var scratch = new Cartesian3();

    /**
     * Create WebGL resources for the tile using whatever data the transformGeometry step produced.
     * Once complete, the tile state should be set to READY.  Alternatively, tile state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Tile} tile The tile to create resources for.
     */
    CesiumTerrainProvider.prototype.createResources = function(context, tile) {
        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;

        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = buffers.statistics.maxHeight;
        tile.boundingSphere3D = BoundingSphere.fromVertices(buffers.vertices, tile.center, 5);

        var ellipsoid = this.tilingScheme.getEllipsoid();
        var extent = tile.extent;
        tile.southwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSouthwest());
        tile.southeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getSoutheast());
        tile.northeastCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNortheast());
        tile.northwestCornerCartesian = ellipsoid.cartographicToCartesian(extent.getNorthwest());

        tile.westNormal = Cartesian3.UNIT_Z.cross(tile.southwestCornerCartesian.negate(scratch), scratch).normalize();
        tile.eastNormal = tile.northeastCornerCartesian.negate(scratch).cross(Cartesian3.UNIT_Z, scratch).normalize();
        tile.southNormal = ellipsoid.geodeticSurfaceNormal(tile.southeastCornerCartesian).cross(tile.southwestCornerCartesian.subtract(tile.southeastCornerCartesian, scratch)).normalize();
        tile.northNormal = ellipsoid.geodeticSurfaceNormal(tile.northwestCornerCartesian).cross(tile.northeastCornerCartesian.subtract(tile.northwestCornerCartesian, scratch)).normalize();

        // TODO: we need to take the heights into account when computing the occludee point.
        var occludeePoint = Occluder.computeOccludeePointFromExtent(tile.extent, ellipsoid);
        if (typeof occludeePoint !== 'undefined') {
            Cartesian3.multiplyComponents(occludeePoint, ellipsoid.getOneOverRadii(), occludeePoint);
        }
        tile.occludeePointInScaledSpace = occludeePoint;

        tile.state = TileState.READY;
    };

    /**
     * DOC_TBA
     * @memberof CesiumTerrainProvider
     */
    CesiumTerrainProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return CesiumTerrainProvider;
});