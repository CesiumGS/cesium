/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
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
        this.tilingScheme = new WebMercatorTilingScheme({
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2
        });
        this.maxLevel = 25;
        this.heightmapWidth = 64;
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.getEllipsoid(), this.heightmapWidth, this.tilingScheme.getNumberOfXTilesAtLevel(0));

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
                that._extentSouthwestInMeters = new Cartesian2(extentData.xmin, extentData.ymin);
                that._extentNortheastInMeters = new Cartesian2(extentData.xmax, extentData.ymax);
                that.tilingScheme = new WebMercatorTilingScheme({
                    extentSouthwestInMeters: that._extentSouthwestInMeters,
                    extentNortheastInMeters: that._extentNortheastInMeters
                });
            } if (extentData.spatialReference.wkid === 4326) {
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
            that._logo = writeTextToCanvas(data.copyrightText, {
                font : '12px sans-serif'
            });

            that.ready = true;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    }

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    ArcGisImageServerTerrainProvider.prototype.getLevelMaximumGeometricError = TerrainProvider.prototype.getLevelMaximumGeometricError;

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

        var extent = this.tilingScheme.tileXYToExtent(tile.x, tile.y, tile.level);

        // Each pixel in the heightmap represents the height at the center of that
        // pixel.  So expand the extent by half a sample spacing in each direction
        // so that the first height is on the edge of the extent we need rather than
        // half a sample spacing into the extent.
        var xSpacing = (extent.east - extent.west) / (this.heightmapWidth - 1);
        var ySpacing = (extent.north - extent.south) / (this.heightmapWidth - 1);

        extent.west -= xSpacing * 0.5;
        extent.east += xSpacing * 0.5;
        extent.south -= ySpacing * 0.5;
        extent.north += ySpacing * 0.5;

        var bbox = CesiumMath.toDegrees(extent.west) + '%2C' + CesiumMath.toDegrees(extent.south) + '%2C' + CesiumMath.toDegrees(extent.east) + '%2C' + CesiumMath.toDegrees(extent.north);
        var url = this.url + '/exportImage?interpolation=RSP_BilinearInterpolation&format=tiff&f=image&size=' + this.heightmapWidth + '%2C' + this.heightmapWidth + '&bboxSR=4326&imageSR=3857&bbox=' + bbox;
        if (this.token) {
            url += '&token=' + this.token;
        }

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        when(loadImage(url, true), function(image) {
            tile.geometry = image;
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
    ArcGisImageServerTerrainProvider.prototype.transformGeometry = function(context, tile) {
        // Get the height data from the image by copying it to a canvas.
        var image = tile.geometry;
        var width = image.width;
        var height = image.height;
        var pixels = getImagePixels(image);

        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.getEllipsoid();
        var extent = tile.extent;

        var projection = tilingScheme.getProjection();
        var southwest = projection.project(new Cartographic(extent.west, extent.south));
        var northeast = projection.project(new Cartographic(extent.east, extent.north));
        var webMercatorExtent = {
            west : southwest.x,
            south : southwest.y,
            east : northeast.x,
            north : northeast.y
        };

        tile.center = ellipsoid.cartographicToCartesian(extent.getCenter());

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : pixels,
            heightScale : 1000.0,
            heightOffset : 1000.0,
            bytesPerHeight : 3,
            stride : 4,
            width : width,
            height : height,
            extent : webMercatorExtent,
            relativeToCenter : tile.center,
            radiiSquared : ellipsoid.getRadiiSquared(),
            oneOverCentralBodySemimajorAxis : ellipsoid.getOneOverRadii().x,
            skirtHeight : Math.min(this.getLevelMaximumGeometricError(tile.level) * 10.0, 1000.0),
            isGeographic : false
        }, [pixels.buffer]);

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
    ArcGisImageServerTerrainProvider.prototype.createResources = function(context, tile) {
        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;

        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.maxHeight = buffers.statistics.maxHeight;
        tile.boundingSphere3D = BoundingSphere.fromPointsAsFlatArray(buffers.vertices, tile.center, 5);

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
     * @memberof ArcGisImageServerTerrainProvider
     */
    ArcGisImageServerTerrainProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return ArcGisImageServerTerrainProvider;
});