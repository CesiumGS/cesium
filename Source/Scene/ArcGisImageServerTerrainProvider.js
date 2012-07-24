/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
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
        Cartesian2,
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
     * retrieved from an ArcGIS ImageServer.
     *
     * @alias ArcGisImageServerTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS ImageServer service.
     * @param {String} [description.token] The authorization token to use to connect to the service.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see TerrainProvider
     */
    function ArcGisImageServerTerrainProvider(description) {
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
         * The authorization token to use to connect to the service.
         *
         * @type {String}
         */
        this.token = description.token;

        /**
         * The tiling scheme used to tile the surface.
         *
         * @type TilingScheme
         */
        this.tilingScheme = new WebMercatorTilingScheme();
        this.projection = Projections.MERCATOR;
        this.maxLevel = 25;

        this._proxy = description.proxy;

        // Grab the details of this ImageServer.
        var url = this.url;
        if (this.token) {
            url += '?token=' + this.token;
        }
        var metadata = jsonp(url, {
            parameters : {
                f : 'json'
            }
        });

        var that = this;
        when(metadata, function(data) {
            /*var extentData = data.extent;

            if (extentData.spatialReference.wkid === 102100) {
                that.projection = Projections.MERCATOR;
                that._extentSouthwestInMeters = new Cartesian2(extentData.xmin, extentData.ymin);
                that._extentNortheastInMeters = new Cartesian2(extentData.xmax, extentData.ymax);
                that.tilingScheme = new WebMercatorTilingScheme({
                    extentSouthwestInMeters: that._extentSouthwestInMeters,
                    extentNortheastInMeters: that._extentNortheastInMeters
                });
            } if (extentData.spatialReference.wkid === 4326) {
                that.projection = Projections.WGS84;
                var extent = new Extent(CesiumMath.toRadians(extentData.xmin),
                                        CesiumMath.toRadians(extentData.ymin),
                                        CesiumMath.toRadians(extentData.xmax),
                                        CesiumMath.toRadians(extentData.ymax));
                that.tilingScheme = new GeographicTilingScheme({
                    extent: extent
                });
            }

            // The server can pretty much provide any level we ask for by interpolating.
            that.maxLevel = 25;*/

            // Create the copyright message.
            var canvas = document.createElement('canvas');
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.font = '12px sans-serif';
            context.textBaseline = 'top';
            context.fillText(data.copyrightText, 0, 0);

            that._logo = canvas;
            that.ready = true;
        });
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
    ArcGisImageServerTerrainProvider.prototype.requestTileGeometry = function(tile) {
        if (requestsInFlight > 6) {
            tile.state = TileState.UNLOADED;
            return;
        }

        ++requestsInFlight;

        ++requesting;
        if ((requesting % 10) === 0) {
            console.log('requesting: ' + requesting);
        }

        var extent = this.tilingScheme.tileXYToExtent(tile.x, tile.y, tile.level);
        var bbox = CesiumMath.toDegrees(extent.west) + '%2C' + CesiumMath.toDegrees(extent.south) + '%2C' + CesiumMath.toDegrees(extent.east) + '%2C' + CesiumMath.toDegrees(extent.north);
        var url = this.url + '/exportImage?format=tiff&f=image&size=128%2C128&bboxSR=4326&imageSR=3857&bbox=' + bbox;
        if (this.token) {
            url += '&token=' + this.token;
        }
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }
        return when(loadImage(url, true), function(image) {
            ++received;
            if ((received % 10) === 0) {
                console.log('received: ' + received);
            }
            tile.geometry = image;
            tile.state = TileState.RECEIVED;
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
    ArcGisImageServerTerrainProvider.prototype.transformGeometry = function(context, tile) {
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

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : pixels,
            heightScale : 1000.0,
            heightOffset : 1000.0,
            bytesPerHeight : 3,
            strideBytes : 4,
            width : width,
            height : height,
            extent : webMercatorExtent,
            relativeToCenter : tile.get3DBoundingSphere().center,
            radiiSquared : this.tilingScheme.ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : this.tilingScheme.ellipsoid.getOneOverRadii().x
        });

        if (typeof verticesPromise === 'undefined') {
            //postponed
            tile.state = TileState.RECEIVED;
            return;
        }

        return when(verticesPromise, function(result) {
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
    ArcGisImageServerTerrainProvider.prototype.createResources = function(context, tile) {
        ++creating;
        if ((creating % 10) === 0) {
            console.log('creating: ' + creating);
        }

        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;
        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = buffers.statistics.maxHeight;
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
    ArcGisImageServerTerrainProvider.prototype.createTilePlaneGeometry = function(context, tile, projection) {
        throw new DeveloperError('Not supported yet.');
    };

    return ArcGisImageServerTerrainProvider;
});