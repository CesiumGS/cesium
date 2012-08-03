/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Extent',
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
        loadImage,
        getImagePixels,
        DeveloperError,
        CesiumMath,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Extent,
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
        this.tilingScheme = new WebMercatorTilingScheme();
        this.projection = Projections.MERCATOR;
        this.maxLevel = 18;

        this._proxy = description.proxy;
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

    var requesting = 0;
    var received = 0;
    var transforming = 0;
    var transformed = 0;
    var creating = 0;
    var ready = 0;

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

        ++requesting;
        if ((requesting % 10) === 0) {
            console.log('requesting: ' + requesting);
        }

        var extent = this.tilingScheme.tileXYToNativeExtent(tile.x, tile.y, tile.level);
        var bbox = extent.west + '%2C' + extent.south + '%2C' + extent.east + '%2C' + extent.north;
        var url = this.url + '?service=WMS&version=1.1.0&request=GetMap&layers=' + this.layerName + '&bbox='  + bbox + '&width=256&height=256&srs=EPSG:3857&format=image%2Ftiff';
        if (this.token) {
            url += '&token=' + this.token;
        }
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        when(loadImage(url, true), function(image) {
            ++received;
            if ((received % 10) === 0) {
                console.log('received: ' + received);
            }
            tile.geometry = image;
            tile.state = TileState.RECEIVED;
            --requestsInFlight;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
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
        ++transforming;
        if ((transforming % 10) === 0) {
            console.log('transforming: ' + transforming);
        }

        // Get the height data from the image by copying it to a canvas.
        var image = tile.geometry;
        var width = image.width;
        var height = image.height;
        var pixels = getImagePixels(image);

        var southwest = this.tilingScheme.cartographicToWebMercator(tile.extent.west, tile.extent.south);
        var northeast = this.tilingScheme.cartographicToWebMercator(tile.extent.east, tile.extent.north);
        var webMercatorExtent = {
            west : southwest.x,
            south : southwest.y,
            east : northeast.x,
            north : northeast.y
        };

        tile.center = this.tilingScheme.ellipsoid.cartographicToCartesian(tile.extent.getCenter());

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : pixels,
            heightScale : 1000.0,
            heightOffset : 1000.0,
            bytesPerHeight : 3,
            strideBytes : 4,
            width : width,
            height : height,
            extent : webMercatorExtent,
            relativeToCenter : tile.center,
            radiiSquared : this.tilingScheme.ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : this.tilingScheme.ellipsoid.getOneOverRadii().x
        });

        if (typeof verticesPromise === 'undefined') {
            //postponed
            tile.state = TileState.RECEIVED;
            return;
        }

        when(verticesPromise, function(result) {
            ++transformed;
            if ((transformed % 10) === 0) {
                console.log('transformed: ' + transformed);
            }

            tile.geometry = undefined;
            tile.transformedGeometry = {
                vertices : result.vertices,
                statistics : result.statistics,
                indices : TerrainProvider.getRegularGridIndices(width, height)
            };
            tile.state = TileState.TRANSFORMED;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    };

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
        ++creating;
        if ((creating % 10) === 0) {
            console.log('creating: ' + creating);
        }

        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;
        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = buffers.statistics.maxHeight;
        tile._boundingSphere3D = BoundingSphere.fromFlatArray(buffers.vertices, tile.center, 5);

        var ellipsoid = this.tilingScheme.ellipsoid;
        tile.southwestCornerCartesian = ellipsoid.cartographicToCartesian(tile.extent.getSouthwest());
        tile.southeastCornerCartesian = ellipsoid.cartographicToCartesian(tile.extent.getSoutheast());
        tile.northeastCornerCartesian = ellipsoid.cartographicToCartesian(tile.extent.getNortheast());
        tile.northwestCornerCartesian = ellipsoid.cartographicToCartesian(tile.extent.getNorthwest());

        var scratch = new Cartesian3();
        tile.westNormal = Cartesian3.UNIT_Z.cross(tile.southwestCornerCartesian.negate(scratch), scratch).normalize();
        tile.eastNormal = tile.northeastCornerCartesian.negate(scratch).cross(Cartesian3.UNIT_Z, scratch).normalize();
        tile.southNormal = ellipsoid.geodeticSurfaceNormal(tile.southeastCornerCartesian).cross(tile.southwestCornerCartesian.subtract(tile.southeastCornerCartesian, scratch)).normalize();
        tile.northNormal = ellipsoid.geodeticSurfaceNormal(tile.northwestCornerCartesian).cross(tile.northeastCornerCartesian.subtract(tile.northwestCornerCartesian, scratch)).normalize();

        tile.state = TileState.READY;
        ++ready;
        if ((ready % 10) === 0) {
            console.log('ready: ' + ready);
        }
    };

    /**
     * Populates a {@link Tile} with plane-mapped surface geometry from this
     * tile provider.
     *
     * @memberof ArcGisImageServerTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @param {Projection} projection The map projection to use.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    WebMapServiceTerrainProvider.prototype.createTilePlaneGeometry = function(context, tile, projection) {
        throw new DeveloperError('Not supported yet.');
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