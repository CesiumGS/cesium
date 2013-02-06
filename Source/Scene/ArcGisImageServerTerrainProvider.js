/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/getImagePixels',
        '../Core/throttleRequestByServer',
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
        './HeightmapTerrainData',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        loadImage,
        getImagePixels,
        throttleRequestByServer,
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
        HeightmapTerrainData,
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
        this.heightmapWidth = 65;
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.getEllipsoid(), this.heightmapWidth, this.tilingScheme.getNumberOfXTilesAtLevel(0));

        this._proxy = description.proxy;

        this._terrainDataStructure = {
                heightScale : 1.0 / 1000.0,
                heightOffset : -1000.0,
                elementsPerHeight : 3,
                stride : 4,
                elementMultiplier : 256.0,
                isBigEndian : true
            };

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

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#isReady} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     *
     * @memberof ArcGisImageServerTerrainProvider
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    ArcGisImageServerTerrainProvider.prototype.requestTileGeometry = function(x, y, level) {
        var extent = this.tilingScheme.tileXYToExtent(x, y, level);

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

        var proxy = this._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        var promise = throttleRequestByServer(url, loadImage);
        if (typeof promise === 'undefined') {
            return undefined;
        }

        var that = this;
        return when(promise, function(image) {
            var heightBuffer = getImagePixels(image);
            var childTileMask = 15;
            var waterMask;
            return new HeightmapTerrainData(heightBuffer, that.heightmapWidth, that.heightmapWidth, childTileMask, that._terrainDataStructure, false, waterMask);
        });
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