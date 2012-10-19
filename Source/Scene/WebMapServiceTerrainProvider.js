/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadArrayBuffer',
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
     * retrieved from a WMS server.
     *
     * @alias WebMapServiceTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the WMS service.
     * @param {String} description.layerName The name of the layer.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see TerrainProvider
     */
    function WebMapServiceTerrainProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        if (typeof description.layerName === 'undefined') {
            throw new DeveloperError('description.layerName is required.');
        }

        /**
         * The URL of the WMS server.
         * @type {String}
         */
        this.url = description.url;

        /**
         * The name of the layer.
         * @type {String}
         */
        this.layerName = description.layerName;

        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme();
        this.maxLevel = 18;

        this._proxy = description.proxy;

        // Create the copyright message.
        if (typeof description.copyrightText !== 'undefined') {
            // Create the copyright message.
            this._logo = writeTextToCanvas(description.copyrightText, {
                font : '12px sans-serif'
            });
        }

        this.ready = true;
    }

    function computeDesiredGranularity(tilingScheme, tile) {
        var ellipsoid = tilingScheme.ellipsoid;
        var level = tile.level;

        // The more vertices we use to tessellate the extent, the less geometric error
        // in the tile.  We only need to use enough vertices to be at or below the
        // geometric error expected for this level.
        var maxErrorMeters = tilingScheme.getLevelMaximumGeometricError(level);

        // Convert the max error in meters to radians at the equator.
        // TODO: we should take the latitude into account to avoid over-tessellation near the poles.
        var maxErrorRadians = maxErrorMeters / ellipsoid.getRadii().x;

        return maxErrorRadians;
    }

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
    WebMapServiceTerrainProvider.prototype.requestTileGeometry = function(tile) {
        if (requestsInFlight > 1) {
            tile.state = TileState.UNLOADED;
            return;
        }

        ++requestsInFlight;

        var nativeExtent = this.tilingScheme.tileXYToNativeExtent(tile.x, tile.y, tile.level);
        var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;
        var srs = 'EPSG:4326';
        var url = this.url + '?service=WMS&version=1.1.0&request=GetMap&layers=' + this.layerName + '&bbox=' + bbox + '&width=64&height=64&srs=' + srs + '&format=application%2Fbil16';
        if (this.token) {
            url += '&token=' + this.token;
        }

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        when(loadArrayBuffer(url), function(arrayBuffer) {
            var littleEndianBuffer = new ArrayBuffer(64 * 64 * 2);
            if (arrayBuffer.byteLength === littleEndianBuffer.byteLength) {
                var inView = new DataView(arrayBuffer);
                var outView = new DataView(littleEndianBuffer);
                for ( var i = 0; i < arrayBuffer.byteLength; i += 2) {
                    outView.setInt16(i, inView.getInt16(i, false), true);
                }
            }

            tile.geometry = new Int16Array(littleEndianBuffer);
            tile.state = TileState.RECEIVED;
            --requestsInFlight;
        }, function(e) {
            /*global console*/
            console.error('failed to load tile geometry: ' + e);
            tile.state = TileState.FAILED;
            --requestsInFlight;
        });
    };

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
    WebMapServiceTerrainProvider.prototype.transformGeometry = function(context, tile) {
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;

        var width = 64;
        var height = 64;

        var nativeExtent = tilingScheme.tileXYToNativeExtent(tile.x, tile.y, tile.level);
        tile.center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : tile.geometry,
            heightScale : 1.0,
            heightOffset : 0.0,
            stride : 1,
            width : width,
            height : height,
            extent : nativeExtent,
            relativeToCenter : tile.center,
            radiiSquared : ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : ellipsoid.getOneOverRadii().x,
            isGeographic : true
        }, [tile.geometry.buffer]);

        if (typeof verticesPromise === 'undefined') {
            //postponed
            tile.state = TileState.RECEIVED;
            return;
        }

        when(verticesPromise, function(result) {
            tile.geometry = undefined;
            tile.transformedGeometry = {
                vertices : result.vertices,
                statistics : result.statistics,
                indices : TerrainProvider.getRegularGridIndices(width, height)
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
    WebMapServiceTerrainProvider.prototype.createResources = function(context, tile) {
        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;

        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = buffers.statistics.maxHeight;
        tile.boundingSphere3D = BoundingSphere.fromPointsAsFlatArray(buffers.vertices, tile.center, 5);

        var ellipsoid = this.tilingScheme.ellipsoid;
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
     * @memberof WebMapServiceTerrainProvider
     */
    WebMapServiceTerrainProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return WebMapServiceTerrainProvider;
});