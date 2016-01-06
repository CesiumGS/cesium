/*global define*/
define([
        '../ThirdParty/when',
        './Credit',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './Event',
        './GeographicTilingScheme',
        './getImagePixels',
        './HeightmapTerrainData',
        './loadImage',
        './Math',
        './TerrainProvider',
        './throttleRequestByServer'
    ], function(
        when,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        GeographicTilingScheme,
        getImagePixels,
        HeightmapTerrainData,
        loadImage,
        CesiumMath,
        TerrainProvider,
        throttleRequestByServer) {
    "use strict";

    /**
     * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
     * retrieved from an ArcGIS ImageServer.
     *
     * @alias ArcGisImageServerTerrainProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The URL of the ArcGIS ImageServer service.
     * @param {String} [options.token] The authorization token to use to connect to the service.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @param {TilingScheme} [options.tilingScheme] The tiling scheme specifying how the terrain
     *                       is broken into tiles.  If this parameter is not provided, a {@link GeographicTilingScheme}
     *                       is used.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead.
     *                    If neither parameter is specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] The credit, which will is displayed on the canvas.
     *
     *
     * @example
     * var terrainProvider = new Cesium.ArcGisImageServerTerrainProvider({
     *   url : '//elevation.arcgisonline.com/ArcGIS/rest/services/WorldElevation/DTMEllipsoidal/ImageServer',
     *   token : 'KED1aF_I4UzXOHy3BnhwyBHU4l5oY6rO6walkmHoYqGp4XyIWUd5YZUC1ZrLAzvV40pR6gBXQayh0eFA8m6vPg..',
     *   proxy : new Cesium.DefaultProxy('/terrain/')
     * });
     * viewer.terrainProvider = terrainProvider;
     * 
     *  @see TerrainProvider
     */
    function ArcGisImageServerTerrainProvider(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._url = options.url;
        this._token = options.token;

        this._tilingScheme = options.tilingScheme;
        if (!defined(this._tilingScheme)) {
            this._tilingScheme = new GeographicTilingScheme({
                ellipsoid : defaultValue(options.ellipsoid, Ellipsoid.WGS84)
            });
        }

        this._heightmapWidth = 65;
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.ellipsoid, this._heightmapWidth, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        this._proxy = options.proxy;

        this._terrainDataStructure = {
            heightScale : 1.0 / 1000.0,
            heightOffset : -1000.0,
            elementsPerHeight : 3,
            stride : 4,
            elementMultiplier : 256.0,
            isBigEndian : true
        };

        this._errorEvent = new Event();

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
        this._readyPromise = when.resolve(true);
    }

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
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets a value indicating whether or not the provider includes a water mask.  The water mask
         * indicates which areas of the globe are water rather than land, so they can be rendered
         * as a reflective surface with animated waves.  This function should not be
         * called before {@link ArcGisImageServerTerrainProvider#ready} returns true.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Boolean}
         */
        hasWaterMask : {
            get : function() {
                return false;
            }
        },

        /**
         * Gets a value indicating whether or not the requested tiles include vertex normals.
         * This function should not be called before {@link ArcGisImageServerTerrainProvider#ready} returns true.
         * @memberof ArcGisImageServerTerrainProvider.prototype
         * @type {Boolean}
         */
        hasVertexNormals : {
            get : function() {
                return false;
            }
        }
    });

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link ArcGisImageServerTerrainProvider#ready} returns true.  The result includes terrain
     * data and indicates that all child tiles are available.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    ArcGisImageServerTerrainProvider.prototype.requestTileGeometry = function(x, y, level) {
        var rectangle = this._tilingScheme.tileXYToRectangle(x, y, level);

        // Each pixel in the heightmap represents the height at the center of that
        // pixel.  So expand the rectangle by half a sample spacing in each direction
        // so that the first height is on the edge of the rectangle we need rather than
        // half a sample spacing into the rectangle.
        var xSpacing = (rectangle.east - rectangle.west) / (this._heightmapWidth - 1);
        var ySpacing = (rectangle.north - rectangle.south) / (this._heightmapWidth - 1);

        rectangle.west -= xSpacing * 0.5;
        rectangle.east += xSpacing * 0.5;
        rectangle.south -= ySpacing * 0.5;
        rectangle.north += ySpacing * 0.5;

        var bbox = CesiumMath.toDegrees(rectangle.west) + '%2C' + CesiumMath.toDegrees(rectangle.south) + '%2C' + CesiumMath.toDegrees(rectangle.east) + '%2C' + CesiumMath.toDegrees(rectangle.north);

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
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    ArcGisImageServerTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Determines whether data for a tile is available to be loaded.
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Boolean} Undefined if not supported, otherwise true or false.
     */
    ArcGisImageServerTerrainProvider.prototype.getTileDataAvailable = function(x, y, level) {
        return undefined;
    };

    return ArcGisImageServerTerrainProvider;
});
