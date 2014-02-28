/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getImagePixels',
        '../Core/loadImage',
        '../Core/Math',
        '../Core/throttleRequestByServer',
        './Credit',
        './GeographicTilingScheme',
        './HeightmapTerrainData',
        './TerrainProvider',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        getImagePixels,
        loadImage,
        CesiumMath,
        throttleRequestByServer,
        Credit,
        GeographicTilingScheme,
        HeightmapTerrainData,
        TerrainProvider,
        when) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
     * retrieved from an ArcGIS ImageServer.
     *
     * @alias ArcGisImageServerTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS ImageServer service.
     * @param {String} [description.token] The authorization token to use to connect to the service.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @param {TilingScheme} [description.tilingScheme] The tiling scheme specifying how the terrain
     *                       is broken into tiles.  If this parameter is not provided, a {@link GeographicTilingScheme}
     *                       is used.
     * @param {Ellipsoid} [description.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead.
     *                    If neither parameter is specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [description.credit] The credit, which will is displayed on the canvas.
     *
     * @see TerrainProvider
     *
     * @example
     * var terrainProvider = new Cesium.ArcGisImageServerTerrainProvider({
     *   url : 'http://elevation.arcgisonline.com/ArcGIS/rest/services/WorldElevation/DTMEllipsoidal/ImageServer',
     *   token : 'KED1aF_I4UzXOHy3BnhwyBHU4l5oY6rO6walkmHoYqGp4XyIWUd5YZUC1ZrLAzvV40pR6gBXQayh0eFA8m6vPg..',
     *   proxy : new Cesium.DefaultProxy('/terrain/')
     * });
     * centralBody.terrainProvider = terrainProvider;
     */
    var ArcGisImageServerTerrainProvider = function ArcGisImageServerTerrainProvider(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description) || !defined(description.url)) {
            throw new DeveloperError('description.url is required.');
        }
        //>>includeEnd('debug');

        this._url = description.url;
        this._token = description.token;

        this._tilingScheme = description.tilingScheme;
        if (!defined(this._tilingScheme)) {
            this._tilingScheme = new GeographicTilingScheme({
                ellipsoid : defaultValue(description.ellipsoid, Ellipsoid.WGS84)
            });
        }

        this._heightmapWidth = 65;
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.ellipsoid, this._heightmapWidth, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        this._proxy = description.proxy;

        this._terrainDataStructure = {
            heightScale : 1.0 / 1000.0,
            heightOffset : -1000.0,
            elementsPerHeight : 3,
            stride : 4,
            elementMultiplier : 256.0,
            isBigEndian : true
        };

        this._errorEvent = new Event();

        var credit = description.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
    };

    defineProperties(ArcGisImageServerTerrainProvider.prototype, {
        /**
         * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
         * the source of the terrain.  This function should not be called before {@link ArcGisImageServerTerrainProvider#ready} returns true.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link ArcGisImageServerTerrainProvider#ready} returns true.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {GeographicTilingScheme}
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return true;
            }
        }
    });

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link ArcGisImageServerTerrainProvider#ready} returns true.  The result includes terrain
     * data and indicates that all child tiles are available.
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
        var extent = this._tilingScheme.tileXYToExtent(x, y, level);

        // Each pixel in the heightmap represents the height at the center of that
        // pixel.  So expand the extent by half a sample spacing in each direction
        // so that the first height is on the edge of the extent we need rather than
        // half a sample spacing into the extent.
        var xSpacing = (extent.east - extent.west) / (this._heightmapWidth - 1);
        var ySpacing = (extent.north - extent.south) / (this._heightmapWidth - 1);

        extent.west -= xSpacing * 0.5;
        extent.east += xSpacing * 0.5;
        extent.south -= ySpacing * 0.5;
        extent.north += ySpacing * 0.5;

        var bbox = CesiumMath.toDegrees(extent.west) + '%2C' + CesiumMath.toDegrees(extent.south) + '%2C' + CesiumMath.toDegrees(extent.east) + '%2C' + CesiumMath.toDegrees(extent.north);

        var url = this._url + '/exportImage?interpolation=RSP_BilinearInterpolation&format=tiff&f=image&size=' + this._heightmapWidth + '%2C' + this._heightmapWidth + '&bboxSR=4326&imageSR=4326&bbox=' + bbox;
        if (this._token) {
            url += '&token=' + this._token;
        }

        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        var promise = throttleRequestByServer(url, loadImage);
        if (!defined(promise)) {
            return undefined;
        }

        var that = this;
        return when(promise, function(image) {
            return new HeightmapTerrainData({
                buffer : getImagePixels(image),
                width : that._heightmapWidth,
                height : that._heightmapWidth,
                childTileMask : 15, // all children present
                structure : that._terrainDataStructure
            });
        });
    };

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof ArcGisImageServerTerrainProvider
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    ArcGisImageServerTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Gets a value indicating whether or not the provider includes a water mask.  The water mask
     * indicates which areas of the globe are water rather than land, so they can be rendered
     * as a reflective surface with animated waves.
     *
     * @memberof ArcGisImageServerTerrainProvider
     *
     * @returns {Boolean} True if the provider has a water mask; otherwise, false.
     */
    ArcGisImageServerTerrainProvider.prototype.hasWaterMask = function() {
        return false;
    };

    return ArcGisImageServerTerrainProvider;
});