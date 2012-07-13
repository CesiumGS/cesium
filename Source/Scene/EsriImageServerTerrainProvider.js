/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        './WebMercatorTilingScheme',
        '../Core/Cartographic3',
        '../Core/ExtentTessellator',
        './TerrainProvider',
        '../Core/PlaneTessellator',
        '../Core/Cartographic2',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/loadImage',
        '../ThirdParty/when',
        './Projections',
        '../Core/Extent',
        './GeographicTilingScheme',
        '../Core/HeightmapTessellator',
        '../Core/jsonp',
        './TileState'
    ], function(
        DeveloperError,
        defaultValue,
        WebMercatorTilingScheme,
        Cartographic3,
        ExtentTessellator,
        TerrainProvider,
        PlaneTessellator,
        Cartographic2,
        CesiumMath,
        Cartesian2,
        loadImage,
        when,
        Projections,
        Extent,
        GeographicTilingScheme,
        HeightmapTessellator,
        jsonp,
        TileState) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces geometry by tessellating height maps retrieved from an ESRI
     * ImageServer.
     *
     * @alias EsriImageServerTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS ImageServer service.
     * @param {String} [description.token] The authorization token to use to connect to the service.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see TerrainProvider
     */
    function EsriImageServerTerrainProvider(description) {
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

    var worker = new Worker('/Workerizer.js');
    worker.onmessage = function(event) {
        tasks[event.data.id](event.data.vertices);
        delete tasks[event.data.id];
    };
    var tasks = [];
    var nextTask = 0;

    var requestsInFlight = 0;

    EsriImageServerTerrainProvider.prototype.requestTileGeometry = function(tile) {
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
        var url = this.url + '/exportImage?format=tiff&f=image&size=256%2C256&bboxSR=4326&imageSR=4326&bbox=' + bbox;
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

    EsriImageServerTerrainProvider.prototype.transformGeometry = function(context, tile) {
        ++transforming;
        if ((transforming % 10) === 0) {
            console.log('transforming: ' + transforming);
        }

        var image = tile.geometry;
        var tilingScheme = this.tilingScheme;
        var ellipsoid = tilingScheme.ellipsoid;
        var extent = tile.extent;
        var center = tile.get3DBoundingSphere().center;

        // Get the height data from the image by copying it to a canvas.
        var width = image.width;
        var height = image.height;
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var context2d = canvas.getContext('2d');
        context2d.globalCompositeOperation = 'copy';
        context2d.drawImage(image, 0, 0);
        var pixels = context2d.getImageData(0, 0, width, height).data;

        var deferred = when.defer();
        var taskID = nextTask++;
        tasks[taskID] = deferred.resolve;

        worker.postMessage({
            id: taskID,
            heightmap: pixels,
            width: width,
            height: height,
            heightScale: 1000.0,
            heightOffset: 1000.0,
            bytesPerHeight: 3,
            strideBytes: 4,
            ellipsoid : ellipsoid,
            extent : extent,
            generateTextureCoords : true,
            interleave : true,
            relativeToCenter : center
        });

        return when(deferred, function(vertices) {
            ++transformed;
            if ((transformed % 10) === 0) {
                console.log('transformed: ' + transformed);
            }

            tile.geometry = undefined;
            tile.transformedGeometry = {vertices: vertices, indices: TerrainProvider.getRegularGridIndices(width, height)};
            tile.state = TileState.TRANSFORMED;
        });
    };

    EsriImageServerTerrainProvider.prototype.createResources = function(context, tile) {
        ++creating;
        if ((creating % 10) === 0) {
            console.log('creating: ' + creating);
        }

        var buffers = tile.transformedGeometry;
        tile.transformedGeometry = undefined;
        TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
        tile.state = TileState.READY;
        ++ready;
        if ((ready % 10) === 0) {
            console.log('ready: ' + ready);
        }
    };

    /**
     * Populates a {@link Tile} with ellipsoid-mapped surface geometry from this
     * tile provider.
     *
     * @memberof EsriImageServerTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EsriImageServerTerrainProvider.prototype.createTileEllipsoidGeometry = function(context, tile) {
        ++loading;
        if ((loading % 10) === 0) {
            console.log('loading: ' + loading);
        }
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

        var tilingScheme = this.tilingScheme;
        var level = tile.level;
        var tilesInXDirection = tilingScheme.numberOfLevelZeroTilesX << level;
        var tilesInYDirection = tilingScheme.numberOfLevelZeroTilesY << level;

        var xDelta = CesiumMath.TWO_PI / tilesInXDirection;
        var yDelta = CesiumMath.PI / tilesInYDirection;

        var tileY = tilesInYDirection - tile.y - 1;

        var xStart = -CesiumMath.PI + xDelta * tile.x;
        var xStop = -CesiumMath.PI + xDelta * (tile.x + 1);

        var yStart = -CesiumMath.PI_OVER_TWO + yDelta * tileY;
        var yStop = -CesiumMath.PI_OVER_TWO + yDelta * (tileY + 1);

        var bbox = CesiumMath.toDegrees(xStart) + '%2C' + CesiumMath.toDegrees(yStart) + '%2C' + CesiumMath.toDegrees(xStop) + '%2C' + CesiumMath.toDegrees(yStop);
        var url = this.url + '/exportImage?format=tiff&f=image&size=256%2C256&bboxSR=4326&imageSR=4326&bbox=' + bbox;
        if (this.token) {
            url += '&token=' + this.token;
        }
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }
        return when(loadImage(url, true), function(image) {
            var ellipsoid = tilingScheme.ellipsoid;
            var extent = tile.extent;
            var center = tile.get3DBoundingSphere().center;

            // Get the height data from the image by copying it to a canvas.
            var width = image.width;
            var height = image.height;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context2d = canvas.getContext('2d');
            context2d.globalCompositeOperation = 'copy';
            context2d.drawImage(image, 0, 0);
            var pixels = context2d.getImageData(0, 0, width, height).data;

            var deferred = when.defer();
            var taskID = nextTask++;
            tasks[taskID] = deferred.resolve;

            worker.postMessage({
                id: taskID,
                heightmap: pixels,
                width: width,
                height: height,
                heightScale: 1000.0,
                heightOffset: 1000.0,
                bytesPerHeight: 3,
                strideBytes: 4,
                ellipsoid : ellipsoid,
                extent : extent,
                generateTextureCoords : true,
                interleave : true,
                relativeToCenter : center
            });

            return when(deferred, function(buffers) {
                TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tile, buffers);
                ++loaded;
                if ((loaded % 10) === 0) {
                    console.log('loaded: ' + loaded);
                }
                return true;
            });
//            var buffers = HeightmapTessellator.computeBuffers({
//                heightmap: pixels,
//                width: width,
//                height: height,
//                heightScale: 1000.0,
//                heightOffset: 1000.0,
//                bytesPerHeight: 3,
//                strideBytes: 4,
//                ellipsoid : ellipsoid,
//                extent : extent,
//                generateTextureCoords : true,
//                interleave : true,
//                relativeToCenter : center
//            });
        });
    };

    /**
     * Populates a {@link Tile} with plane-mapped surface geometry from this
     * tile provider.
     *
     * @memberof EsriImageServerTerrainProvider
     *
     * @param {Context} context The rendered context to use to create renderer resources.
     * @param {Tile} tile The tile to populate with surface geometry.
     * @param {Projection} projection The map projection to use.
     * @returns {Boolean|Promise} A boolean value indicating whether the tile was successfully
     * populated with geometry, or a promise for such a value in the future.
     */
    EsriImageServerTerrainProvider.prototype.createTilePlaneGeometry = function(context, tile, projection) {
        throw new DeveloperError('Not supported yet.');
    };

    return EsriImageServerTerrainProvider;
});